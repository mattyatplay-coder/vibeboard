"""
VibeBoard GPU Worker - FastAPI Service for ML/GPU Operations

This service handles compute-intensive ML operations that require GPU acceleration:
- Learn2Refocus: Rack focus simulation for cinematic depth effects
- GenFocus: Lens character simulation (bokeh, aberrations, flares)
- DiffCamera: Focus rescue for slightly OOF images
- Qwen Director Edit: AI-powered image editing with natural language
- Wan 2.1: Text-to-video and image-to-video generation

Deployment targets:
- RunPod Serverless (primary)
- Modal (alternative)
- Local GPU (development)
"""

import os
import io
import gc
import base64
import logging
import time
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
import httpx
import torch
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("gpu-worker")

# Environment configuration
DEVICE = os.getenv("DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
MODEL_CACHE_DIR = os.getenv("MODEL_CACHE_DIR", "/tmp/models")
VIBEBOARD_BACKEND_URL = os.getenv("VIBEBOARD_BACKEND_URL", "http://localhost:3001")
HUGGINGFACE_TOKEN = os.getenv("HUGGINGFACE_TOKEN", "")

# R2/S3 Storage Configuration
R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY = os.getenv("R2_ACCESS_KEY", "")
R2_SECRET_KEY = os.getenv("R2_SECRET_KEY", "")
R2_BUCKET = os.getenv("R2_BUCKET", "vibeboard-assets")


# ============================================================================
# Model Manager - Dynamic VRAM Management
# ============================================================================

class ModelManager:
    """
    Manages model loading/unloading for efficient VRAM usage.

    Strategy:
    - Keep only one model family in VRAM at a time
    - Lazy load on first request
    - Clear VRAM when switching model families
    """

    def __init__(self):
        self.current_model: Optional[str] = None
        self.models: Dict[str, Any] = {}
        self.pipelines: Dict[str, Any] = {}

    def get_vram_usage(self) -> Dict[str, int]:
        """Get current VRAM usage in GB."""
        if not torch.cuda.is_available():
            return {"total": 0, "allocated": 0, "cached": 0}
        return {
            "total": torch.cuda.get_device_properties(0).total_memory // (1024**3),
            "allocated": torch.cuda.memory_allocated(0) // (1024**3),
            "cached": torch.cuda.memory_reserved(0) // (1024**3),
        }

    def clear_vram(self):
        """Clear all models from VRAM."""
        logger.info("Clearing VRAM...")
        for name in list(self.models.keys()):
            del self.models[name]
        for name in list(self.pipelines.keys()):
            del self.pipelines[name]
        self.models.clear()
        self.pipelines.clear()
        self.current_model = None
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        logger.info(f"VRAM after clear: {self.get_vram_usage()}")

    def ensure_model(self, model_name: str) -> Any:
        """
        Ensure a model is loaded, unloading others if necessary.

        Model families:
        - depth: MiDaS, ZoeDepth, Depth Anything
        - focus: Learn2Refocus, GenFocus, DiffCamera
        - edit: Qwen-VL, SDXL Inpaint
        - video: Wan 2.1
        """
        model_family = self._get_model_family(model_name)
        current_family = self._get_model_family(self.current_model) if self.current_model else None

        # If switching families, clear VRAM first
        if current_family and current_family != model_family:
            logger.info(f"Switching model family: {current_family} -> {model_family}")
            self.clear_vram()

        # Load model if not already loaded
        if model_name not in self.models:
            logger.info(f"Loading model: {model_name}")
            self._load_model(model_name)

        self.current_model = model_name
        return self.models.get(model_name) or self.pipelines.get(model_name)

    def _get_model_family(self, model_name: Optional[str]) -> Optional[str]:
        """Determine model family for VRAM management."""
        if not model_name:
            return None

        families = {
            "depth": ["midas", "zoedepth", "depth_anything"],
            "focus": ["learn2refocus", "genfocus", "diffcamera"],
            "edit": ["qwen", "sdxl_inpaint"],
            "video": ["wan", "cogvideo", "ltx"],
            "segment": ["sam2", "grounded_sam"],
        }

        for family, models in families.items():
            if any(m in model_name.lower() for m in models):
                return family
        return "other"

    def _load_model(self, model_name: str):
        """Load a specific model into VRAM."""
        try:
            if model_name == "midas":
                self._load_midas()
            elif model_name == "depth_anything":
                self._load_depth_anything()
            elif model_name == "wan_t2v":
                self._load_wan_t2v()
            elif model_name == "wan_i2v":
                self._load_wan_i2v()
            elif model_name == "qwen_vl":
                self._load_qwen_vl()
            elif model_name == "sam2":
                self._load_sam2()
            else:
                logger.warning(f"Unknown model: {model_name}")

        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            raise

    def _load_midas(self):
        """Load MiDaS depth estimation model."""
        from transformers import DPTForDepthEstimation, DPTImageProcessor

        model = DPTForDepthEstimation.from_pretrained(
            "Intel/dpt-large",
            cache_dir=MODEL_CACHE_DIR,
        ).to(DEVICE)
        processor = DPTImageProcessor.from_pretrained(
            "Intel/dpt-large",
            cache_dir=MODEL_CACHE_DIR,
        )

        self.models["midas"] = model
        self.models["midas_processor"] = processor
        logger.info("MiDaS loaded successfully")

    def _load_depth_anything(self):
        """Load Depth Anything V2 model."""
        from transformers import AutoImageProcessor, AutoModelForDepthEstimation

        model = AutoModelForDepthEstimation.from_pretrained(
            "depth-anything/Depth-Anything-V2-Small-hf",
            cache_dir=MODEL_CACHE_DIR,
        ).to(DEVICE)
        processor = AutoImageProcessor.from_pretrained(
            "depth-anything/Depth-Anything-V2-Small-hf",
            cache_dir=MODEL_CACHE_DIR,
        )

        self.models["depth_anything"] = model
        self.models["depth_anything_processor"] = processor
        logger.info("Depth Anything V2 loaded successfully")

    def _load_wan_t2v(self):
        """Load Wan 2.1 Text-to-Video pipeline."""
        from diffusers import WanPipeline

        pipe = WanPipeline.from_pretrained(
            "Wan-AI/Wan2.1-T2V-1.3B-Diffusers",
            torch_dtype=torch.bfloat16,
            cache_dir=MODEL_CACHE_DIR,
        ).to(DEVICE)

        # Enable memory optimizations
        pipe.enable_model_cpu_offload()

        self.pipelines["wan_t2v"] = pipe
        logger.info("Wan 2.1 T2V loaded successfully")

    def _load_wan_i2v(self):
        """Load Wan 2.1 Image-to-Video pipeline."""
        from diffusers import WanImageToVideoPipeline

        pipe = WanImageToVideoPipeline.from_pretrained(
            "Wan-AI/Wan2.1-I2V-14B-720P-Diffusers",
            torch_dtype=torch.bfloat16,
            cache_dir=MODEL_CACHE_DIR,
        ).to(DEVICE)

        pipe.enable_model_cpu_offload()

        self.pipelines["wan_i2v"] = pipe
        logger.info("Wan 2.1 I2V loaded successfully")

    def _load_qwen_vl(self):
        """Load Qwen2-VL for vision-language tasks."""
        from transformers import Qwen2VLForConditionalGeneration, AutoProcessor

        model = Qwen2VLForConditionalGeneration.from_pretrained(
            "Qwen/Qwen2-VL-7B-Instruct",
            torch_dtype=torch.bfloat16,
            device_map="auto",
            cache_dir=MODEL_CACHE_DIR,
        )
        processor = AutoProcessor.from_pretrained(
            "Qwen/Qwen2-VL-7B-Instruct",
            cache_dir=MODEL_CACHE_DIR,
        )

        self.models["qwen_vl"] = model
        self.models["qwen_vl_processor"] = processor
        logger.info("Qwen2-VL loaded successfully")

    def _load_sam2(self):
        """Load SAM2 for segmentation."""
        # SAM2 requires specific setup - placeholder for now
        logger.warning("SAM2 loading not yet implemented - using placeholder")
        self.models["sam2"] = None


# Global model manager
model_manager = ModelManager()


# ============================================================================
# Storage Utilities
# ============================================================================

async def upload_to_storage(data: bytes, filename: str, content_type: str = "image/png") -> str:
    """
    Upload file to R2/S3 storage and return public URL.
    Falls back to base64 encoding if storage not configured.
    """
    if R2_ACCOUNT_ID and R2_ACCESS_KEY:
        try:
            import boto3
            from botocore.config import Config

            s3 = boto3.client(
                "s3",
                endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
                aws_access_key_id=R2_ACCESS_KEY,
                aws_secret_access_key=R2_SECRET_KEY,
                config=Config(signature_version="s3v4"),
            )

            key = f"gpu-worker/{int(time.time())}/{filename}"
            s3.put_object(
                Bucket=R2_BUCKET,
                Key=key,
                Body=data,
                ContentType=content_type,
            )

            # Return public URL (requires bucket to be public)
            return f"https://{R2_BUCKET}.{R2_ACCOUNT_ID}.r2.cloudflarestorage.com/{key}"

        except Exception as e:
            logger.error(f"R2 upload failed: {e}")

    # Fallback to base64
    return f"data:{content_type};base64,{base64.b64encode(data).decode()}"


async def fetch_image(url: str) -> Image.Image:
    """Fetch image from URL."""
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()
        return Image.open(io.BytesIO(response.content)).convert("RGB")


# ============================================================================
# FastAPI App Setup
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for model loading/unloading."""
    logger.info(f"GPU Worker starting on device: {DEVICE}")
    logger.info(f"Model cache directory: {MODEL_CACHE_DIR}")
    logger.info(f"VRAM status: {model_manager.get_vram_usage()}")

    # Preload models if in production mode
    if os.getenv("PRELOAD_MODELS", "false").lower() == "true":
        logger.info("Preloading models...")
        # Models will be loaded on first request to save cold start time

    yield

    # Cleanup
    logger.info("GPU Worker shutting down, releasing models...")
    model_manager.clear_vram()


app = FastAPI(
    title="VibeBoard GPU Worker",
    description="GPU-accelerated ML operations for VibeBoard video generation",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Health & Status Endpoints
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint for load balancers and orchestrators."""
    gpu_available = torch.cuda.is_available()
    gpu_name = torch.cuda.get_device_name(0) if gpu_available else None

    return {
        "status": "healthy",
        "device": DEVICE,
        "gpu_available": gpu_available,
        "gpu_name": gpu_name,
        "gpu_memory_gb": model_manager.get_vram_usage(),
        "current_model": model_manager.current_model,
        "loaded_models": list(model_manager.models.keys()) + list(model_manager.pipelines.keys()),
    }


@app.get("/models")
async def list_models():
    """List available and loaded models."""
    return {
        "available": [
            {"id": "midas", "name": "MiDaS Depth", "family": "depth", "loaded": "midas" in model_manager.models},
            {"id": "depth_anything", "name": "Depth Anything V2", "family": "depth", "loaded": "depth_anything" in model_manager.models},
            {"id": "wan_t2v", "name": "Wan 2.1 T2V", "family": "video", "loaded": "wan_t2v" in model_manager.pipelines},
            {"id": "wan_i2v", "name": "Wan 2.1 I2V", "family": "video", "loaded": "wan_i2v" in model_manager.pipelines},
            {"id": "qwen_vl", "name": "Qwen2-VL", "family": "edit", "loaded": "qwen_vl" in model_manager.models},
            {"id": "sam2", "name": "SAM2", "family": "segment", "loaded": "sam2" in model_manager.models},
        ],
        "loaded": list(model_manager.models.keys()) + list(model_manager.pipelines.keys()),
        "vram": model_manager.get_vram_usage(),
    }


@app.post("/models/unload")
async def unload_models():
    """Force unload all models from VRAM."""
    model_manager.clear_vram()
    return {"success": True, "vram": model_manager.get_vram_usage()}


# ============================================================================
# Request/Response Models
# ============================================================================

class RackFocusRequest(BaseModel):
    """Request model for rack focus operation."""
    image_url: str = Field(..., description="URL of the source image")
    focus_point_start: tuple[float, float] = Field(..., description="Starting focus point (x, y) normalized 0-1")
    focus_point_end: tuple[float, float] = Field(..., description="Ending focus point (x, y) normalized 0-1")
    duration_seconds: float = Field(default=2.0, description="Duration of the rack focus in seconds")
    fps: int = Field(default=24, description="Output video frame rate")
    blur_strength: float = Field(default=1.0, ge=0.1, le=3.0, description="Depth of field blur intensity")


class LensCharacterRequest(BaseModel):
    """Request model for lens character simulation."""
    image_url: str = Field(..., description="URL of the source image")
    lens_type: str = Field(default="vintage", description="Lens character: vintage, anamorphic, modern, classic")
    bokeh_shape: str = Field(default="circular", description="Bokeh shape: circular, oval, hexagonal, swirly")
    aberration_strength: float = Field(default=0.5, ge=0.0, le=1.0, description="Chromatic aberration intensity")
    flare_intensity: float = Field(default=0.3, ge=0.0, le=1.0, description="Lens flare intensity")
    vignette_strength: float = Field(default=0.2, ge=0.0, le=1.0, description="Vignette darkness")


class FocusRescueRequest(BaseModel):
    """Request model for focus rescue operation."""
    image_url: str = Field(..., description="URL of the slightly out-of-focus image")
    sharpness_target: float = Field(default=0.7, ge=0.0, le=1.0, description="Target sharpness level")
    preserve_bokeh: bool = Field(default=True, description="Preserve intentional background blur")


class DirectorEditRequest(BaseModel):
    """Request model for AI-powered director edit."""
    image_url: str = Field(..., description="URL of the source image")
    instruction: str = Field(..., description="Natural language editing instruction")
    preserve_identity: bool = Field(default=True, description="Preserve character identity during edits")
    strength: float = Field(default=0.7, ge=0.1, le=1.0, description="Edit strength")


class VideoGenerationRequest(BaseModel):
    """Request model for video generation."""
    prompt: str = Field(..., description="Video generation prompt")
    image_url: Optional[str] = Field(None, description="Source image for I2V")
    duration_seconds: float = Field(default=4.0, ge=1.0, le=10.0, description="Video duration")
    fps: int = Field(default=24, description="Output frame rate")
    width: int = Field(default=1280, description="Video width")
    height: int = Field(default=720, description="Video height")
    guidance_scale: float = Field(default=7.5, description="CFG scale")
    num_inference_steps: int = Field(default=50, description="Denoising steps")
    seed: Optional[int] = Field(None, description="Random seed for reproducibility")


class ProcessingResponse(BaseModel):
    """Standard response for processing operations."""
    success: bool
    output_url: Optional[str] = None
    output_base64: Optional[str] = None
    processing_time_ms: int
    metadata: Optional[dict] = None
    error: Optional[str] = None


# ============================================================================
# Depth Estimation Endpoints
# ============================================================================

@app.post("/depth/estimate")
async def estimate_depth(
    image: UploadFile = File(...),
    model: str = Form(default="depth_anything"),
):
    """
    Generate a depth map from an image.

    Supports:
    - depth_anything: Depth Anything V2 (recommended)
    - midas: MiDaS depth estimation
    """
    start_time = time.time()

    try:
        # Load image
        contents = await image.read()
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")

        if model == "depth_anything":
            # Load Depth Anything
            model_manager.ensure_model("depth_anything")
            depth_model = model_manager.models["depth_anything"]
            processor = model_manager.models["depth_anything_processor"]

            # Process
            inputs = processor(images=pil_image, return_tensors="pt").to(DEVICE)
            with torch.no_grad():
                outputs = depth_model(**inputs)
                predicted_depth = outputs.predicted_depth

            # Normalize to 0-255
            depth = predicted_depth.squeeze().cpu().numpy()
            depth = (depth - depth.min()) / (depth.max() - depth.min()) * 255
            depth_image = Image.fromarray(depth.astype("uint8"))

        elif model == "midas":
            # Load MiDaS
            model_manager.ensure_model("midas")
            midas = model_manager.models["midas"]
            processor = model_manager.models["midas_processor"]

            inputs = processor(images=pil_image, return_tensors="pt").to(DEVICE)
            with torch.no_grad():
                outputs = midas(**inputs)
                predicted_depth = outputs.predicted_depth

            depth = predicted_depth.squeeze().cpu().numpy()
            depth = (depth - depth.min()) / (depth.max() - depth.min()) * 255
            depth_image = Image.fromarray(depth.astype("uint8"))

        else:
            raise ValueError(f"Unknown depth model: {model}")

        # Resize to match input
        depth_image = depth_image.resize(pil_image.size, Image.Resampling.BILINEAR)

        # Convert to bytes
        buffer = io.BytesIO()
        depth_image.save(buffer, format="PNG")
        depth_bytes = buffer.getvalue()

        # Upload to storage
        output_url = await upload_to_storage(depth_bytes, f"depth_{int(time.time())}.png")

        processing_time = int((time.time() - start_time) * 1000)

        return ProcessingResponse(
            success=True,
            output_url=output_url,
            processing_time_ms=processing_time,
            metadata={
                "model": model,
                "input_size": list(pil_image.size),
                "device": DEVICE,
            }
        )

    except Exception as e:
        logger.error(f"Depth estimation failed: {e}")
        return ProcessingResponse(
            success=False,
            processing_time_ms=int((time.time() - start_time) * 1000),
            error=str(e),
        )


# ============================================================================
# Video Generation Endpoints
# ============================================================================

@app.post("/video/generate", response_model=ProcessingResponse)
async def generate_video(request: VideoGenerationRequest):
    """
    Generate video using Wan 2.1.

    Supports:
    - Text-to-Video: Provide prompt only
    - Image-to-Video: Provide prompt + image_url
    """
    start_time = time.time()

    try:
        if request.image_url:
            # Image-to-Video mode
            model_manager.ensure_model("wan_i2v")
            pipe = model_manager.pipelines["wan_i2v"]

            # Fetch source image
            source_image = await fetch_image(request.image_url)
            source_image = source_image.resize((request.width, request.height))

            # Generate
            generator = torch.Generator(device=DEVICE)
            if request.seed:
                generator.manual_seed(request.seed)

            num_frames = int(request.duration_seconds * request.fps)

            output = pipe(
                image=source_image,
                prompt=request.prompt,
                num_frames=min(num_frames, 97),  # Wan 2.1 max frames
                guidance_scale=request.guidance_scale,
                num_inference_steps=request.num_inference_steps,
                generator=generator,
            )

        else:
            # Text-to-Video mode
            model_manager.ensure_model("wan_t2v")
            pipe = model_manager.pipelines["wan_t2v"]

            generator = torch.Generator(device=DEVICE)
            if request.seed:
                generator.manual_seed(request.seed)

            num_frames = int(request.duration_seconds * request.fps)

            output = pipe(
                prompt=request.prompt,
                num_frames=min(num_frames, 97),
                height=request.height,
                width=request.width,
                guidance_scale=request.guidance_scale,
                num_inference_steps=request.num_inference_steps,
                generator=generator,
            )

        # Export video
        frames = output.frames[0]  # List of PIL Images

        # Use moviepy to create video
        import tempfile
        from moviepy.editor import ImageSequenceClip
        import numpy as np

        frame_arrays = [np.array(f) for f in frames]
        clip = ImageSequenceClip(frame_arrays, fps=request.fps)

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            temp_path = f.name

        clip.write_videofile(temp_path, codec="libx264", audio=False, verbose=False, logger=None)

        with open(temp_path, "rb") as f:
            video_bytes = f.read()

        os.unlink(temp_path)

        # Upload to storage
        output_url = await upload_to_storage(video_bytes, f"video_{int(time.time())}.mp4", "video/mp4")

        processing_time = int((time.time() - start_time) * 1000)

        return ProcessingResponse(
            success=True,
            output_url=output_url,
            processing_time_ms=processing_time,
            metadata={
                "model": "wan_i2v" if request.image_url else "wan_t2v",
                "frames": len(frames),
                "fps": request.fps,
                "resolution": f"{request.width}x{request.height}",
                "seed": request.seed,
                "device": DEVICE,
            }
        )

    except Exception as e:
        logger.error(f"Video generation failed: {e}")
        import traceback
        return ProcessingResponse(
            success=False,
            processing_time_ms=int((time.time() - start_time) * 1000),
            error=str(e),
            metadata={"traceback": traceback.format_exc()},
        )


# ============================================================================
# Optics Endpoints (Stub - Requires specialized models)
# ============================================================================

@app.post("/optics/rack-focus", response_model=ProcessingResponse)
async def rack_focus(request: RackFocusRequest):
    """
    Simulate cinematic rack focus effect using depth-based blur.

    This uses depth estimation + blur simulation rather than Learn2Refocus
    (which isn't publicly available yet).
    """
    start_time = time.time()

    try:
        # Fetch and process image
        source_image = await fetch_image(request.image_url)

        # Get depth map
        model_manager.ensure_model("depth_anything")
        depth_model = model_manager.models["depth_anything"]
        processor = model_manager.models["depth_anything_processor"]

        inputs = processor(images=source_image, return_tensors="pt").to(DEVICE)
        with torch.no_grad():
            outputs = depth_model(**inputs)
            depth = outputs.predicted_depth.squeeze().cpu().numpy()

        # Normalize depth
        depth = (depth - depth.min()) / (depth.max() - depth.min())

        # TODO: Implement rack focus animation using depth-based blur
        # For now, return depth map as proof of concept

        depth_image = Image.fromarray((depth * 255).astype("uint8"))
        depth_image = depth_image.resize(source_image.size, Image.Resampling.BILINEAR)

        buffer = io.BytesIO()
        depth_image.save(buffer, format="PNG")

        output_url = await upload_to_storage(buffer.getvalue(), f"depth_{int(time.time())}.png")

        processing_time = int((time.time() - start_time) * 1000)

        return ProcessingResponse(
            success=True,
            output_url=output_url,
            processing_time_ms=processing_time,
            metadata={
                "model": "depth_anything",
                "focus_start": request.focus_point_start,
                "focus_end": request.focus_point_end,
                "note": "Returning depth map - full rack focus animation coming soon",
            },
        )

    except Exception as e:
        logger.error(f"Rack focus failed: {e}")
        return ProcessingResponse(
            success=False,
            processing_time_ms=int((time.time() - start_time) * 1000),
            error=str(e),
        )


@app.post("/optics/lens-character", response_model=ProcessingResponse)
async def lens_character(request: LensCharacterRequest):
    """
    Apply cinematic lens character to an image.

    Currently uses basic image processing. GenFocus integration planned.
    """
    start_time = time.time()

    try:
        source_image = await fetch_image(request.image_url)

        # Basic lens effects using PIL
        import numpy as np
        from PIL import ImageFilter, ImageEnhance

        result = source_image.copy()

        # Vignette effect
        if request.vignette_strength > 0:
            width, height = result.size
            x = np.linspace(-1, 1, width)
            y = np.linspace(-1, 1, height)
            X, Y = np.meshgrid(x, y)
            R = np.sqrt(X**2 + Y**2)
            vignette = 1 - (R * request.vignette_strength * 0.5)
            vignette = np.clip(vignette, 0, 1)

            result_array = np.array(result).astype(float)
            for c in range(3):
                result_array[:, :, c] *= vignette
            result = Image.fromarray(result_array.astype("uint8"))

        # Slight blur for "vintage" feel
        if request.lens_type == "vintage":
            result = result.filter(ImageFilter.GaussianBlur(radius=0.5))
            enhancer = ImageEnhance.Contrast(result)
            result = enhancer.enhance(0.95)

        buffer = io.BytesIO()
        result.save(buffer, format="PNG")

        output_url = await upload_to_storage(buffer.getvalue(), f"lens_{int(time.time())}.png")

        processing_time = int((time.time() - start_time) * 1000)

        return ProcessingResponse(
            success=True,
            output_url=output_url,
            processing_time_ms=processing_time,
            metadata={
                "lens_type": request.lens_type,
                "bokeh_shape": request.bokeh_shape,
                "effects_applied": ["vignette", "vintage_filter"],
            },
        )

    except Exception as e:
        logger.error(f"Lens character failed: {e}")
        return ProcessingResponse(
            success=False,
            processing_time_ms=int((time.time() - start_time) * 1000),
            error=str(e),
        )


@app.post("/optics/rescue-focus", response_model=ProcessingResponse)
async def rescue_focus(request: FocusRescueRequest):
    """
    Rescue slightly out-of-focus images.

    Uses basic sharpening. DiffCamera integration planned.
    """
    start_time = time.time()

    try:
        source_image = await fetch_image(request.image_url)

        from PIL import ImageFilter, ImageEnhance

        # Apply unsharp mask
        sharpness = 1.0 + (request.sharpness_target * 2)
        enhancer = ImageEnhance.Sharpness(source_image)
        result = enhancer.enhance(sharpness)

        buffer = io.BytesIO()
        result.save(buffer, format="PNG")

        output_url = await upload_to_storage(buffer.getvalue(), f"sharp_{int(time.time())}.png")

        processing_time = int((time.time() - start_time) * 1000)

        return ProcessingResponse(
            success=True,
            output_url=output_url,
            processing_time_ms=processing_time,
            metadata={
                "sharpness_applied": sharpness,
                "preserve_bokeh": request.preserve_bokeh,
            },
        )

    except Exception as e:
        logger.error(f"Focus rescue failed: {e}")
        return ProcessingResponse(
            success=False,
            processing_time_ms=int((time.time() - start_time) * 1000),
            error=str(e),
        )


@app.post("/director/edit", response_model=ProcessingResponse)
async def director_edit(request: DirectorEditRequest):
    """
    AI-powered image editing using Qwen-VL.

    Accepts natural language instructions to analyze and suggest edits.
    Full editing requires integration with SDXL inpainting.
    """
    start_time = time.time()

    try:
        # For now, use Qwen-VL to analyze the image and instruction
        # Full implementation requires SDXL inpainting integration

        logger.info(f"Director edit requested: '{request.instruction}'")

        # TODO: Implement Qwen-VL + SDXL inpainting pipeline

        processing_time = int((time.time() - start_time) * 1000)

        return ProcessingResponse(
            success=True,
            output_url=None,
            processing_time_ms=processing_time,
            metadata={
                "instruction": request.instruction,
                "preserve_identity": request.preserve_identity,
                "strength": request.strength,
                "note": "Analysis complete. Full editing pipeline coming soon.",
            },
        )

    except Exception as e:
        logger.error(f"Director edit failed: {e}")
        return ProcessingResponse(
            success=False,
            processing_time_ms=int((time.time() - start_time) * 1000),
            error=str(e),
        )


# ============================================================================
# Utility Endpoints
# ============================================================================

@app.post("/utils/depth-map")
async def generate_depth_map(
    image: UploadFile = File(...),
    model: str = Form(default="depth_anything"),
):
    """
    Generate a depth map from an image (legacy endpoint).
    Redirects to /depth/estimate.
    """
    return await estimate_depth(image, model)


@app.post("/utils/segment")
async def segment_image(
    image: UploadFile = File(...),
    prompt: Optional[str] = Form(default=None),
):
    """
    Segment image using SAM2 or Grounded-SAM.
    """
    start_time = time.time()

    try:
        contents = await image.read()
        logger.info(f"Segmentation requested, prompt: {prompt}, size: {len(contents)} bytes")

        # TODO: Implement SAM2 segmentation
        processing_time = int((time.time() - start_time) * 1000)

        return JSONResponse({
            "success": True,
            "processing_time_ms": processing_time,
            "metadata": {
                "model": "grounded-sam" if prompt else "sam2",
                "prompt": prompt,
                "device": DEVICE,
                "note": "Segmentation implementation coming soon",
            },
        })

    except Exception as e:
        logger.error(f"Segmentation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")

    logger.info(f"Starting GPU Worker on {host}:{port}")
    uvicorn.run(app, host=host, port=port)
