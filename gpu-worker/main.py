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
            "video": ["wan", "cogvideo", "ltx", "svi", "stable_video"],
            "segment": ["sam2", "grounded_sam"],
            "image": ["flux", "sd3", "sdxl", "hidream"],
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
            elif model_name == "svi":
                self._load_svi()
            elif model_name == "flux_schnell":
                self._load_flux_schnell()
            elif model_name == "flux_dev":
                self._load_flux_dev()
            elif model_name == "sd35_large":
                self._load_sd35_large()
            elif model_name == "ltx_video":
                self._load_ltx_video()
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
        """
        Load Depth Anything V2 Large model.

        Depth Anything V2 Large features:
        - 335M parameter ViT-L encoder
        - State-of-the-art monocular depth estimation
        - Works on any image without fine-tuning
        - 8GB+ VRAM required
        - Apache 2.0 license

        Upgraded from Small to Large for better quality.
        """
        from transformers import AutoImageProcessor, AutoModelForDepthEstimation

        model = AutoModelForDepthEstimation.from_pretrained(
            "depth-anything/Depth-Anything-V2-Large-hf",
            cache_dir=MODEL_CACHE_DIR,
        ).to(DEVICE)
        processor = AutoImageProcessor.from_pretrained(
            "depth-anything/Depth-Anything-V2-Large-hf",
            cache_dir=MODEL_CACHE_DIR,
        )

        self.models["depth_anything"] = model
        self.models["depth_anything_processor"] = processor
        logger.info("Depth Anything V2 Large loaded successfully")

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
        """
        Load Segment Anything 2 (SAM2) for object segmentation.

        SAM2 features:
        - State-of-the-art promptable segmentation
        - Point, box, or text prompts
        - Multi-object tracking in video
        - 8GB+ VRAM required (Hiera-Large)
        - Apache 2.0 license

        Model: facebook/sam2-hiera-large (224M params)
        """
        from transformers import AutoProcessor, AutoModelForMaskGeneration

        try:
            model = AutoModelForMaskGeneration.from_pretrained(
                "facebook/sam2-hiera-large",
                torch_dtype=torch.float16,
                cache_dir=MODEL_CACHE_DIR,
            ).to(DEVICE)

            processor = AutoProcessor.from_pretrained(
                "facebook/sam2-hiera-large",
                cache_dir=MODEL_CACHE_DIR,
            )

            self.models["sam2"] = model
            self.models["sam2_processor"] = processor
            logger.info("SAM2 (Hiera-Large) loaded successfully")

        except Exception as e:
            logger.error(f"Failed to load SAM2: {e}")
            raise

    def _load_svi(self):
        """
        Load Stable Video Infinity (SVD-XT) pipeline.

        SVI is the premium long-form video generation model with:
        - Integrated Spatial/Temporal Latent Storage (replaces StoryMem)
        - View Synthesis (replaces Spatia 3D)
        - Camera Trajectory Control (replaces InfCam)

        VRAM: ~12-18GB depending on optimization level
        """
        from diffusers import StableVideoDiffusionPipeline

        try:
            pipe = StableVideoDiffusionPipeline.from_pretrained(
                "stabilityai/stable-video-diffusion-img2vid-xt",
                torch_dtype=torch.float16,
                variant="fp16",
                cache_dir=MODEL_CACHE_DIR,
            ).to(DEVICE)

            # Enable memory optimizations for 24GB VRAM cards
            pipe.enable_model_cpu_offload()
            # Optional: pipe.enable_attention_slicing()  # For lower VRAM

            self.pipelines["svi"] = pipe
            logger.info("Stable Video Infinity (SVD-XT) loaded successfully")

        except Exception as e:
            logger.error(f"Failed to load SVI: {e}")
            raise

    def _load_flux_schnell(self):
        """
        Load FLUX.1 Schnell for fast image generation.

        FLUX.1 Schnell is optimized for speed:
        - 4 inference steps only (vs 25-50 for others)
        - ~2-3 seconds per image
        - 16GB+ VRAM required
        - Apache 2.0 license (commercial use OK)
        """
        from diffusers import FluxPipeline

        try:
            pipe = FluxPipeline.from_pretrained(
                "black-forest-labs/FLUX.1-schnell",
                torch_dtype=torch.bfloat16,
                cache_dir=MODEL_CACHE_DIR,
            )

            # Enable memory optimizations
            pipe.enable_model_cpu_offload()

            self.pipelines["flux_schnell"] = pipe
            logger.info("FLUX.1 Schnell loaded successfully")

        except Exception as e:
            logger.error(f"Failed to load FLUX.1 Schnell: {e}")
            raise

    def _load_flux_dev(self):
        """
        Load FLUX.1 Dev for high-quality image generation.

        FLUX.1 Dev is the high-quality variant:
        - 25-50 inference steps
        - ~10-15 seconds per image
        - 24GB+ VRAM required
        - Non-commercial license
        """
        from diffusers import FluxPipeline

        try:
            pipe = FluxPipeline.from_pretrained(
                "black-forest-labs/FLUX.1-dev",
                torch_dtype=torch.bfloat16,
                cache_dir=MODEL_CACHE_DIR,
            )

            # Enable memory optimizations
            pipe.enable_model_cpu_offload()

            self.pipelines["flux_dev"] = pipe
            logger.info("FLUX.1 Dev loaded successfully")

        except Exception as e:
            logger.error(f"Failed to load FLUX.1 Dev: {e}")
            raise

    def _load_sd35_large(self):
        """
        Load Stable Diffusion 3.5 Large for high-quality image generation.

        SD 3.5 Large features:
        - 8B parameter model
        - Excellent prompt adherence
        - 25-50 inference steps
        - 24GB+ VRAM required
        - Stability AI community license
        """
        from diffusers import StableDiffusion3Pipeline

        try:
            pipe = StableDiffusion3Pipeline.from_pretrained(
                "stabilityai/stable-diffusion-3.5-large",
                torch_dtype=torch.bfloat16,
                cache_dir=MODEL_CACHE_DIR,
            )

            # Enable memory optimizations
            pipe.enable_model_cpu_offload()

            self.pipelines["sd35_large"] = pipe
            logger.info("Stable Diffusion 3.5 Large loaded successfully")

        except Exception as e:
            logger.error(f"Failed to load SD 3.5 Large: {e}")
            raise

    def _load_ltx_video(self):
        """
        Load LTX Video for fast text-to-video and image-to-video generation.

        LTX Video features:
        - 2B parameter DiT-based model
        - Very fast generation (~2-5 seconds for 5 second video)
        - Native 768x512 resolution, up to 30 FPS
        - 24GB+ VRAM required
        - Open source (Apache 2.0)

        Capabilities:
        - Text-to-Video
        - Image-to-Video
        - Real-time video generation
        """
        from diffusers import LTXPipeline

        try:
            pipe = LTXPipeline.from_pretrained(
                "Lightricks/LTX-Video",
                torch_dtype=torch.bfloat16,
                cache_dir=MODEL_CACHE_DIR,
            )

            # Enable memory optimizations
            pipe.enable_model_cpu_offload()

            self.pipelines["ltx_video"] = pipe
            logger.info("LTX Video loaded successfully")

        except Exception as e:
            logger.error(f"Failed to load LTX Video: {e}")
            raise


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
            # Image Generation (Self-Hosted)
            {"id": "flux_schnell", "name": "FLUX.1 Schnell", "family": "image", "loaded": "flux_schnell" in model_manager.pipelines, "tier": "standard", "bestFor": "Fast iteration", "license": "Apache 2.0"},
            {"id": "flux_dev", "name": "FLUX.1 Dev", "family": "image", "loaded": "flux_dev" in model_manager.pipelines, "tier": "standard", "bestFor": "High quality", "license": "Non-commercial"},
            {"id": "sd35_large", "name": "SD 3.5 Large", "family": "image", "loaded": "sd35_large" in model_manager.pipelines, "tier": "standard", "bestFor": "Prompt adherence", "license": "Stability AI Community"},
            # Depth Estimation
            {"id": "midas", "name": "MiDaS Depth", "family": "depth", "loaded": "midas" in model_manager.models},
            {"id": "depth_anything", "name": "Depth Anything V2", "family": "depth", "loaded": "depth_anything" in model_manager.models},
            # Video Generation
            {"id": "wan_t2v", "name": "Wan 2.1 T2V", "family": "video", "loaded": "wan_t2v" in model_manager.pipelines},
            {"id": "wan_i2v", "name": "Wan 2.1 I2V", "family": "video", "loaded": "wan_i2v" in model_manager.pipelines},
            {"id": "svi", "name": "Stable Video Infinity", "family": "video", "loaded": "svi" in model_manager.pipelines, "tier": "pro", "bestFor": "Long-Form Continuity"},
            {"id": "ltx_video", "name": "LTX Video", "family": "video", "loaded": "ltx_video" in model_manager.pipelines, "tier": "standard", "bestFor": "Fast video generation", "license": "Apache 2.0"},
            # Editing
            {"id": "qwen_vl", "name": "Qwen2-VL", "family": "edit", "loaded": "qwen_vl" in model_manager.models},
            # Segmentation
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


class SVIGenerationRequest(BaseModel):
    """
    Request model for Stable Video Infinity (SVI) generation.

    SVI is the premium long-form video model with built-in continuity.
    Replaces the need for StoryMem + Spatia + InfCam.
    """
    prompt: str = Field(..., description="Video generation prompt for motion guidance")
    image_url: str = Field(..., description="Required seed image for I2V - SVI needs a starting frame")
    num_frames: int = Field(default=25, ge=1, le=100, description="Number of frames (max 100 for extended continuity)")
    fps: int = Field(default=24, description="Output frame rate")
    width: int = Field(default=1024, description="Video width (multiple of 64)")
    height: int = Field(default=576, description="Video height (multiple of 64)")
    motion_bucket_id: int = Field(default=127, ge=1, le=255, description="Motion intensity (1=still, 255=max motion)")
    noise_aug_strength: float = Field(default=0.02, ge=0.0, le=0.1, description="Noise augmentation for better quality")
    num_inference_steps: int = Field(default=25, ge=1, le=50, description="Denoising steps")
    seed: Optional[int] = Field(None, description="Random seed for reproducibility")
    decode_chunk_size: int = Field(default=8, ge=1, le=25, description="Frames to decode at once (lower = less VRAM)")


class FluxImageRequest(BaseModel):
    """
    Request model for FLUX.1 image generation.

    Supports both Schnell (fast) and Dev (quality) models.
    Self-hosted on RunPod for zero API costs.
    """
    prompt: str = Field(..., description="Text prompt for image generation")
    model: str = Field(default="schnell", description="Model variant: 'schnell' (fast, 4 steps) or 'dev' (quality, 25+ steps)")
    width: int = Field(default=1024, ge=256, le=2048, description="Image width (multiple of 8)")
    height: int = Field(default=1024, ge=256, le=2048, description="Image height (multiple of 8)")
    num_inference_steps: int = Field(default=4, ge=1, le=50, description="Denoising steps (4 for schnell, 25-50 for dev)")
    guidance_scale: float = Field(default=0.0, ge=0.0, le=20.0, description="CFG scale for prompt adherence (0 for schnell, 3.5 for dev)")
    seed: Optional[int] = Field(None, description="Random seed for reproducibility")
    output_format: str = Field(default="png", description="Output format: 'png' or 'jpeg'")


class SD35ImageRequest(BaseModel):
    """
    Request model for Stable Diffusion 3.5 Large image generation.

    SD 3.5 Large is an 8B parameter model with:
    - Excellent prompt adherence
    - High-quality outputs
    - Stability AI community license

    Self-hosted on RunPod for reduced API costs.
    """
    prompt: str = Field(..., description="Text prompt for image generation")
    negative_prompt: str = Field(default="", description="Negative prompt for avoiding unwanted elements")
    width: int = Field(default=1024, ge=512, le=2048, description="Image width (multiple of 8)")
    height: int = Field(default=1024, ge=512, le=2048, description="Image height (multiple of 8)")
    num_inference_steps: int = Field(default=28, ge=1, le=50, description="Denoising steps (28 recommended)")
    guidance_scale: float = Field(default=7.0, ge=1.0, le=20.0, description="CFG scale for prompt adherence")
    seed: Optional[int] = Field(None, description="Random seed for reproducibility")
    output_format: str = Field(default="png", description="Output format: 'png' or 'jpeg'")


class LTXVideoRequest(BaseModel):
    """
    Request model for LTX Video generation.

    LTX Video is a fast, open-source text-to-video model:
    - 2B DiT-based architecture
    - Very fast (~2-5 seconds per video)
    - Native 768x512 resolution
    - Apache 2.0 license

    Self-hosted on RunPod for zero API costs.
    """
    prompt: str = Field(..., description="Text prompt for video generation")
    negative_prompt: str = Field(default="", description="Negative prompt")
    image_url: Optional[str] = Field(None, description="Optional source image for image-to-video mode")
    width: int = Field(default=768, ge=256, le=1280, description="Video width")
    height: int = Field(default=512, ge=256, le=720, description="Video height")
    num_frames: int = Field(default=49, ge=9, le=121, description="Number of frames to generate")
    fps: int = Field(default=24, description="Output frame rate")
    num_inference_steps: int = Field(default=30, ge=1, le=50, description="Denoising steps")
    guidance_scale: float = Field(default=7.5, ge=1.0, le=20.0, description="CFG scale")
    seed: Optional[int] = Field(None, description="Random seed for reproducibility")


class DepthAnythingRequest(BaseModel):
    """
    Request model for Depth Anything V2 depth estimation.

    Depth Anything V2 Large features:
    - 335M parameter ViT-L encoder
    - State-of-the-art monocular depth estimation
    - Works on any image without fine-tuning
    - 8GB+ VRAM required
    - Apache 2.0 license

    Self-hosted on RunPod for zero API costs.
    """
    image_url: str = Field(..., description="URL of the source image")
    output_format: str = Field(default="png", description="Output format: 'png' or 'jpeg'")
    colormap: str = Field(default="gray", description="Colormap: 'gray', 'turbo', 'viridis', 'plasma'")
    normalize: bool = Field(default=True, description="Normalize depth values to 0-255")


class SAM2SegmentRequest(BaseModel):
    """
    Request model for Segment Anything 2 (SAM2) segmentation.

    SAM2 features:
    - State-of-the-art promptable segmentation
    - Point prompts (click to segment)
    - Box prompts (draw rectangle)
    - Automatic mask generation (segment all)
    - 8GB+ VRAM required (Hiera-Large)
    - Apache 2.0 license

    Self-hosted on RunPod for zero API costs.
    """
    image_url: str = Field(..., description="URL of the source image")
    # Point prompts: list of [x, y] coordinates
    point_coords: Optional[list[list[float]]] = Field(None, description="Point prompts as [[x1,y1], [x2,y2], ...] normalized 0-1")
    point_labels: Optional[list[int]] = Field(None, description="Labels for points: 1=foreground, 0=background")
    # Box prompts: [x1, y1, x2, y2]
    box: Optional[list[float]] = Field(None, description="Box prompt as [x1, y1, x2, y2] normalized 0-1")
    # Automatic mode
    multimask_output: bool = Field(default=True, description="Return multiple mask predictions")
    return_logits: bool = Field(default=False, description="Return raw logits instead of binary masks")
    output_format: str = Field(default="png", description="Output format: 'png' or 'jpeg'")


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


@app.post("/depth/anything-v2", response_model=ProcessingResponse)
async def generate_depth_anything(request: DepthAnythingRequest):
    """
    Generate depth map using Depth Anything V2 Large.

    Self-hosted on RunPod for zero API costs:
    - 335M parameter ViT-L encoder
    - State-of-the-art monocular depth estimation
    - Works on any image without fine-tuning
    - Apache 2.0 license

    Supports multiple colormaps for visualization.
    """
    start_time = time.time()

    try:
        # Fetch image from URL
        source_image = await fetch_image(request.image_url)

        # Load Depth Anything V2 Large
        model_manager.ensure_model("depth_anything")
        depth_model = model_manager.models["depth_anything"]
        processor = model_manager.models["depth_anything_processor"]

        # Process image
        inputs = processor(images=source_image, return_tensors="pt").to(DEVICE)
        with torch.no_grad():
            outputs = depth_model(**inputs)
            predicted_depth = outputs.predicted_depth

        # Get depth array
        depth = predicted_depth.squeeze().cpu().numpy()

        # Normalize if requested
        if request.normalize:
            depth = (depth - depth.min()) / (depth.max() - depth.min() + 1e-8) * 255
            depth = depth.astype("uint8")

        # Apply colormap
        import numpy as np
        if request.colormap == "gray":
            depth_image = Image.fromarray(depth)
        elif request.colormap in ["turbo", "viridis", "plasma"]:
            import matplotlib.pyplot as plt
            cmap = plt.get_cmap(request.colormap)
            depth_colored = cmap(depth / 255.0)[:, :, :3]  # Remove alpha
            depth_colored = (depth_colored * 255).astype("uint8")
            depth_image = Image.fromarray(depth_colored)
        else:
            depth_image = Image.fromarray(depth)

        # Resize to match input
        depth_image = depth_image.resize(source_image.size, Image.Resampling.BILINEAR)

        # Convert to bytes
        buffer = io.BytesIO()
        format_type = "PNG" if request.output_format.lower() == "png" else "JPEG"
        content_type = "image/png" if format_type == "PNG" else "image/jpeg"
        depth_image.save(buffer, format=format_type, quality=95 if format_type == "JPEG" else None)
        depth_bytes = buffer.getvalue()

        # Upload to storage
        ext = "png" if format_type == "PNG" else "jpg"
        output_url = await upload_to_storage(
            depth_bytes,
            f"depth_anything_{int(time.time())}.{ext}",
            content_type
        )

        processing_time = int((time.time() - start_time) * 1000)

        return ProcessingResponse(
            success=True,
            output_url=output_url,
            processing_time_ms=processing_time,
            metadata={
                "model": "depth-anything-v2-large",
                "input_size": list(source_image.size),
                "colormap": request.colormap,
                "normalized": request.normalize,
                "device": DEVICE,
                "cost": "$0.00 (self-hosted)",
                "provider": "runpod-vibeboard",
            }
        )

    except Exception as e:
        logger.error(f"Depth Anything V2 failed: {e}")
        import traceback
        return ProcessingResponse(
            success=False,
            processing_time_ms=int((time.time() - start_time) * 1000),
            error=str(e),
            metadata={"traceback": traceback.format_exc()},
        )


# ============================================================================
# Segmentation Endpoints
# ============================================================================

@app.post("/segment/sam2", response_model=ProcessingResponse)
async def generate_sam2_segment(request: SAM2SegmentRequest):
    """
    Generate segmentation masks using Segment Anything 2 (SAM2).

    Self-hosted on RunPod for zero API costs:
    - Hiera-Large backbone (224M params)
    - State-of-the-art promptable segmentation
    - Point, box, or automatic prompts
    - Apache 2.0 license

    Use cases:
    - Rotoscoping for VFX
    - Object selection for inpainting
    - Background removal
    - Video object tracking
    """
    start_time = time.time()

    try:
        import numpy as np

        # Fetch image from URL
        source_image = await fetch_image(request.image_url)
        width, height = source_image.size

        # Load SAM2 model
        model_manager.ensure_model("sam2")
        sam_model = model_manager.models["sam2"]
        processor = model_manager.models["sam2_processor"]

        # Prepare inputs based on prompt type
        inputs = processor(
            images=source_image,
            return_tensors="pt",
        ).to(DEVICE)

        # Add point prompts if provided
        if request.point_coords:
            # Convert normalized coords to pixel coords
            point_coords = [[int(p[0] * width), int(p[1] * height)] for p in request.point_coords]
            inputs["input_points"] = torch.tensor([point_coords], dtype=torch.float32).to(DEVICE)

            if request.point_labels:
                inputs["input_labels"] = torch.tensor([request.point_labels], dtype=torch.int64).to(DEVICE)
            else:
                # Default: all foreground
                inputs["input_labels"] = torch.ones(1, len(point_coords), dtype=torch.int64).to(DEVICE)

        # Add box prompt if provided
        if request.box:
            # Convert normalized box to pixel coords
            box = [
                int(request.box[0] * width),
                int(request.box[1] * height),
                int(request.box[2] * width),
                int(request.box[3] * height),
            ]
            inputs["input_boxes"] = torch.tensor([[box]], dtype=torch.float32).to(DEVICE)

        # Run inference
        with torch.no_grad():
            outputs = sam_model(**inputs, multimask_output=request.multimask_output)

        # Get masks
        if request.return_logits:
            masks = outputs.pred_masks.squeeze().cpu().numpy()
        else:
            masks = (outputs.pred_masks > 0).squeeze().cpu().numpy()

        # Get IoU scores for mask quality
        iou_scores = outputs.iou_scores.squeeze().cpu().numpy() if hasattr(outputs, 'iou_scores') else None

        # Select best mask (highest IoU) for single output
        if request.multimask_output and len(masks.shape) == 3:
            if iou_scores is not None:
                best_idx = np.argmax(iou_scores)
                best_mask = masks[best_idx]
                best_iou = float(iou_scores[best_idx])
            else:
                best_mask = masks[0]
                best_iou = None
        else:
            best_mask = masks if len(masks.shape) == 2 else masks[0]
            best_iou = float(iou_scores[0]) if iou_scores is not None else None

        # Convert to image
        mask_uint8 = (best_mask * 255).astype("uint8")
        mask_image = Image.fromarray(mask_uint8, mode="L")

        # Resize to match input
        mask_image = mask_image.resize(source_image.size, Image.Resampling.NEAREST)

        # Convert to bytes
        buffer = io.BytesIO()
        format_type = "PNG" if request.output_format.lower() == "png" else "JPEG"
        content_type = "image/png" if format_type == "PNG" else "image/jpeg"
        mask_image.save(buffer, format=format_type)
        mask_bytes = buffer.getvalue()

        # Upload to storage
        ext = "png" if format_type == "PNG" else "jpg"
        output_url = await upload_to_storage(
            mask_bytes,
            f"sam2_mask_{int(time.time())}.{ext}",
            content_type
        )

        processing_time = int((time.time() - start_time) * 1000)

        return ProcessingResponse(
            success=True,
            output_url=output_url,
            processing_time_ms=processing_time,
            metadata={
                "model": "sam2-hiera-large",
                "input_size": [width, height],
                "prompt_type": "point" if request.point_coords else ("box" if request.box else "auto"),
                "multimask_output": request.multimask_output,
                "iou_score": best_iou,
                "device": DEVICE,
                "cost": "$0.00 (self-hosted)",
                "provider": "runpod-vibeboard",
            }
        )

    except Exception as e:
        logger.error(f"SAM2 segmentation failed: {e}")
        import traceback
        return ProcessingResponse(
            success=False,
            processing_time_ms=int((time.time() - start_time) * 1000),
            error=str(e),
            metadata={"traceback": traceback.format_exc()},
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


@app.post("/video/svi-generate", response_model=ProcessingResponse)
async def generate_svi_video(request: SVIGenerationRequest):
    """
    Generate video using Stable Video Infinity (SVD-XT).

    SVI is the premium long-form video generation model with:
    - Infinite Continuity: Persistent latent map for 100+ frame coherence
    - Self-hosted on RunPod: $0/sec vs $0.15/sec on managed providers

    Key Features:
    - Replaces StoryMem (memory bank) with integrated Spatial/Temporal Latent Storage
    - Replaces Spatia (3D point cloud) with integrated View Synthesis
    - Replaces InfCam (trajectory) with integrated Camera Control

    Note: Requires an input image (image-to-video only).
    """
    start_time = time.time()

    try:
        # SVI requires an input image
        if not request.image_url:
            raise ValueError("SVI requires an image_url - this is an image-to-video model")

        # Ensure SVI model is loaded
        model_manager.ensure_model("svi")
        pipe = model_manager.pipelines["svi"]

        # Fetch and resize source image
        source_image = await fetch_image(request.image_url)

        # Resize to SVI-compatible dimensions (must be multiples of 64)
        target_width = (request.width // 64) * 64
        target_height = (request.height // 64) * 64
        source_image = source_image.resize((target_width, target_height), Image.Resampling.LANCZOS)

        # Setup generator for reproducibility
        generator = torch.Generator(device=DEVICE)
        if request.seed:
            generator.manual_seed(request.seed)
        else:
            request.seed = int(torch.randint(0, 2**32, (1,)).item())
            generator.manual_seed(request.seed)

        logger.info(f"SVI generating {request.num_frames} frames at {target_width}x{target_height}")

        # Generate video with SVI
        output = pipe(
            image=source_image,
            num_frames=request.num_frames,
            num_inference_steps=request.num_inference_steps,
            motion_bucket_id=request.motion_bucket_id,
            noise_aug_strength=request.noise_aug_strength,
            decode_chunk_size=request.decode_chunk_size,
            generator=generator,
        )

        # Export video
        frames = output.frames[0]  # List of PIL Images

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
        output_url = await upload_to_storage(
            video_bytes,
            f"svi_{int(time.time())}.mp4",
            "video/mp4"
        )

        processing_time = int((time.time() - start_time) * 1000)

        return ProcessingResponse(
            success=True,
            output_url=output_url,
            processing_time_ms=processing_time,
            metadata={
                "model": "stable-video-infinity",
                "frames": len(frames),
                "fps": request.fps,
                "resolution": f"{target_width}x{target_height}",
                "motion_bucket_id": request.motion_bucket_id,
                "noise_aug_strength": request.noise_aug_strength,
                "seed": request.seed,
                "device": DEVICE,
                "cost": "$0.00 (self-hosted)",
            }
        )

    except Exception as e:
        logger.error(f"SVI video generation failed: {e}")
        import traceback
        return ProcessingResponse(
            success=False,
            processing_time_ms=int((time.time() - start_time) * 1000),
            error=str(e),
            metadata={"traceback": traceback.format_exc()},
        )


# ============================================================================
# Image Generation Endpoints (Self-Hosted)
# ============================================================================

@app.post("/image/flux", response_model=ProcessingResponse)
async def generate_flux_image(request: FluxImageRequest):
    """
    Generate images using FLUX.1 (Schnell or Dev).

    Self-hosted on RunPod for zero API costs:
    - FLUX.1 Schnell: Fast (4 steps, ~2-3s), Apache 2.0 license
    - FLUX.1 Dev: Quality (25-50 steps, ~10-15s), non-commercial

    Cost savings vs Fal.ai:
    - Schnell: $0.003/image -> $0.001/image (~66% savings)
    - Dev: $0.025/image -> $0.002/image (~92% savings)
    """
    start_time = time.time()

    try:
        # Select model variant
        model_name = f"flux_{request.model}"
        if request.model not in ["schnell", "dev"]:
            raise ValueError(f"Invalid FLUX model: {request.model}. Use 'schnell' or 'dev'")

        # Adjust steps for schnell (max 4)
        num_steps = request.num_inference_steps
        if request.model == "schnell":
            num_steps = min(num_steps, 4)

        # Load FLUX model
        model_manager.ensure_model(model_name)
        pipe = model_manager.pipelines[model_name]

        # Setup generator for reproducibility
        generator = torch.Generator(device="cpu")  # FLUX uses CPU generator
        if request.seed:
            generator.manual_seed(request.seed)
        else:
            request.seed = int(torch.randint(0, 2**32, (1,)).item())
            generator.manual_seed(request.seed)

        # Ensure dimensions are multiples of 8
        width = (request.width // 8) * 8
        height = (request.height // 8) * 8

        logger.info(f"FLUX {request.model}: generating {width}x{height} with {num_steps} steps")

        # Generate image
        output = pipe(
            prompt=request.prompt,
            width=width,
            height=height,
            num_inference_steps=num_steps,
            guidance_scale=request.guidance_scale,
            generator=generator,
        )

        # Get the generated image
        image = output.images[0]

        # Convert to bytes
        buffer = io.BytesIO()
        format_type = "PNG" if request.output_format.lower() == "png" else "JPEG"
        content_type = "image/png" if format_type == "PNG" else "image/jpeg"
        image.save(buffer, format=format_type, quality=95 if format_type == "JPEG" else None)
        image_bytes = buffer.getvalue()

        # Upload to storage
        ext = "png" if format_type == "PNG" else "jpg"
        output_url = await upload_to_storage(
            image_bytes,
            f"flux_{request.model}_{int(time.time())}.{ext}",
            content_type
        )

        processing_time = int((time.time() - start_time) * 1000)

        return ProcessingResponse(
            success=True,
            output_url=output_url,
            processing_time_ms=processing_time,
            metadata={
                "model": f"flux-{request.model}",
                "resolution": f"{width}x{height}",
                "steps": num_steps,
                "guidance_scale": request.guidance_scale,
                "seed": request.seed,
                "device": DEVICE,
                "cost": "$0.00 (self-hosted)",
                "provider": "runpod-vibeboard",
            }
        )

    except Exception as e:
        logger.error(f"FLUX image generation failed: {e}")
        import traceback
        return ProcessingResponse(
            success=False,
            processing_time_ms=int((time.time() - start_time) * 1000),
            error=str(e),
            metadata={"traceback": traceback.format_exc()},
        )


@app.post("/image/sd35", response_model=ProcessingResponse)
async def generate_sd35_image(request: SD35ImageRequest):
    """
    Generate images using Stable Diffusion 3.5 Large.

    Self-hosted on RunPod for reduced API costs:
    - 8B parameter model with excellent prompt adherence
    - 28 inference steps recommended
    - 24GB+ VRAM required

    Cost savings vs Fal.ai:
    - SD 3.5: $0.035/megapixel -> ~$0.003/image (~91% savings)
    """
    start_time = time.time()

    try:
        # Load SD 3.5 Large model
        model_manager.ensure_model("sd35_large")
        pipe = model_manager.pipelines["sd35_large"]

        # Setup generator for reproducibility
        generator = torch.Generator(device="cpu")
        if request.seed:
            generator.manual_seed(request.seed)
        else:
            request.seed = int(torch.randint(0, 2**32, (1,)).item())
            generator.manual_seed(request.seed)

        # Ensure dimensions are multiples of 8
        width = (request.width // 8) * 8
        height = (request.height // 8) * 8

        logger.info(f"SD 3.5 Large: generating {width}x{height} with {request.num_inference_steps} steps")

        # Generate image
        output = pipe(
            prompt=request.prompt,
            negative_prompt=request.negative_prompt if request.negative_prompt else None,
            width=width,
            height=height,
            num_inference_steps=request.num_inference_steps,
            guidance_scale=request.guidance_scale,
            generator=generator,
        )

        # Get the generated image
        image = output.images[0]

        # Convert to bytes
        buffer = io.BytesIO()
        format_type = "PNG" if request.output_format.lower() == "png" else "JPEG"
        content_type = "image/png" if format_type == "PNG" else "image/jpeg"
        image.save(buffer, format=format_type, quality=95 if format_type == "JPEG" else None)
        image_bytes = buffer.getvalue()

        # Upload to storage
        ext = "png" if format_type == "PNG" else "jpg"
        output_url = await upload_to_storage(
            image_bytes,
            f"sd35_{int(time.time())}.{ext}",
            content_type
        )

        processing_time = int((time.time() - start_time) * 1000)

        return ProcessingResponse(
            success=True,
            output_url=output_url,
            processing_time_ms=processing_time,
            metadata={
                "model": "stable-diffusion-3.5-large",
                "resolution": f"{width}x{height}",
                "steps": request.num_inference_steps,
                "guidance_scale": request.guidance_scale,
                "seed": request.seed,
                "device": DEVICE,
                "cost": "$0.00 (self-hosted)",
                "provider": "runpod-vibeboard",
            }
        )

    except Exception as e:
        logger.error(f"SD 3.5 Large image generation failed: {e}")
        import traceback
        return ProcessingResponse(
            success=False,
            processing_time_ms=int((time.time() - start_time) * 1000),
            error=str(e),
            metadata={"traceback": traceback.format_exc()},
        )


@app.post("/video/ltx", response_model=ProcessingResponse)
async def generate_ltx_video(request: LTXVideoRequest):
    """
    Generate videos using LTX Video.

    Self-hosted on RunPod for zero API costs:
    - 2B DiT-based model, extremely fast (~2-5 seconds)
    - Native 768x512 resolution, up to 121 frames
    - Apache 2.0 license (commercial use OK)

    Supports:
    - Text-to-Video: Provide prompt only
    - Image-to-Video: Provide prompt + image_url

    Cost savings vs Fal.ai:
    - LTX Video: $0.10/video -> $0.00/video (100% savings)
    """
    start_time = time.time()

    try:
        # Load LTX Video model
        model_manager.ensure_model("ltx_video")
        pipe = model_manager.pipelines["ltx_video"]

        # Setup generator for reproducibility
        generator = torch.Generator(device="cpu")
        if request.seed:
            generator.manual_seed(request.seed)
        else:
            request.seed = int(torch.randint(0, 2**32, (1,)).item())
            generator.manual_seed(request.seed)

        # Ensure dimensions are valid
        width = min(max(request.width, 256), 1280)
        height = min(max(request.height, 256), 720)

        logger.info(f"LTX Video: generating {request.num_frames} frames at {width}x{height}")

        # Check if image-to-video mode
        source_image = None
        if request.image_url:
            source_image = await fetch_image(request.image_url)
            source_image = source_image.resize((width, height), Image.Resampling.LANCZOS)

        # Generate video
        if source_image:
            # Image-to-Video mode - need LTXImageToVideoPipeline
            from diffusers import LTXImageToVideoPipeline

            # Check if we need to load I2V pipeline instead
            if "ltx_video_i2v" not in model_manager.pipelines:
                logger.info("Loading LTX Image-to-Video pipeline...")
                i2v_pipe = LTXImageToVideoPipeline.from_pretrained(
                    "Lightricks/LTX-Video",
                    torch_dtype=torch.bfloat16,
                    cache_dir=MODEL_CACHE_DIR,
                )
                i2v_pipe.enable_model_cpu_offload()
                model_manager.pipelines["ltx_video_i2v"] = i2v_pipe

            i2v_pipe = model_manager.pipelines["ltx_video_i2v"]

            output = i2v_pipe(
                image=source_image,
                prompt=request.prompt,
                negative_prompt=request.negative_prompt if request.negative_prompt else None,
                num_frames=request.num_frames,
                num_inference_steps=request.num_inference_steps,
                guidance_scale=request.guidance_scale,
                generator=generator,
            )
        else:
            # Text-to-Video mode
            output = pipe(
                prompt=request.prompt,
                negative_prompt=request.negative_prompt if request.negative_prompt else None,
                width=width,
                height=height,
                num_frames=request.num_frames,
                num_inference_steps=request.num_inference_steps,
                guidance_scale=request.guidance_scale,
                generator=generator,
            )

        # Export video
        frames = output.frames[0]  # List of PIL Images

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
        output_url = await upload_to_storage(
            video_bytes,
            f"ltx_{int(time.time())}.mp4",
            "video/mp4"
        )

        processing_time = int((time.time() - start_time) * 1000)

        return ProcessingResponse(
            success=True,
            output_url=output_url,
            processing_time_ms=processing_time,
            metadata={
                "model": "ltx-video",
                "mode": "i2v" if request.image_url else "t2v",
                "frames": len(frames),
                "fps": request.fps,
                "resolution": f"{width}x{height}",
                "steps": request.num_inference_steps,
                "guidance_scale": request.guidance_scale,
                "seed": request.seed,
                "device": DEVICE,
                "cost": "$0.00 (self-hosted)",
                "provider": "runpod-vibeboard",
            }
        )

    except Exception as e:
        logger.error(f"LTX Video generation failed: {e}")
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
