"""
RunPod Serverless Handler for VibeBoard GPU Worker

This module provides the serverless handler interface for RunPod deployment.
It wraps the FastAPI endpoints for serverless execution.

Usage:
    Deploy this with the Dockerfile to RunPod Serverless.
    The handler will receive jobs and route them to the appropriate endpoint.
"""

import os
import runpod
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("runpod-handler")

# Import the FastAPI app for direct calls (more efficient than HTTP)
from main import (
    rack_focus,
    lens_character,
    rescue_focus,
    director_edit,
    generate_video,
    generate_svi_video,
    generate_flux_image,
    generate_sd35_image,
    generate_ltx_video,
    generate_depth_anything,
    generate_sam2_segment,
    estimate_depth,
    RackFocusRequest,
    LensCharacterRequest,
    FocusRescueRequest,
    DirectorEditRequest,
    VideoGenerationRequest,
    SVIGenerationRequest,
    FluxImageRequest,
    SD35ImageRequest,
    LTXVideoRequest,
    DepthAnythingRequest,
    SAM2SegmentRequest,
    model_manager,
)

# Operation handlers - mapping operation names to (handler_fn, request_model)
HANDLERS = {
    "rack_focus": (rack_focus, RackFocusRequest),
    "lens_character": (lens_character, LensCharacterRequest),
    "rescue_focus": (rescue_focus, FocusRescueRequest),
    "director_edit": (director_edit, DirectorEditRequest),
    "video_generate": (generate_video, VideoGenerationRequest),
    "video_t2v": (generate_video, VideoGenerationRequest),
    "video_i2v": (generate_video, VideoGenerationRequest),
    # SVI - Stable Video Infinity (Premium long-form continuity)
    "svi_generate": (generate_svi_video, SVIGenerationRequest),
    "stable_video_infinity": (generate_svi_video, SVIGenerationRequest),
    "video_svi": (generate_svi_video, SVIGenerationRequest),
    # FLUX - Self-hosted image generation (Apache 2.0 / Non-commercial)
    "flux_generate": (generate_flux_image, FluxImageRequest),
    "flux_schnell": (generate_flux_image, FluxImageRequest),
    "flux_dev": (generate_flux_image, FluxImageRequest),
    "image_flux": (generate_flux_image, FluxImageRequest),
    # SD 3.5 Large - Self-hosted high-quality image generation
    "sd35_generate": (generate_sd35_image, SD35ImageRequest),
    "sd35_large": (generate_sd35_image, SD35ImageRequest),
    "image_sd35": (generate_sd35_image, SD35ImageRequest),
    # LTX Video - Self-hosted fast video generation (Apache 2.0)
    "ltx_generate": (generate_ltx_video, LTXVideoRequest),
    "ltx_video": (generate_ltx_video, LTXVideoRequest),
    "video_ltx": (generate_ltx_video, LTXVideoRequest),
    # Depth Anything V2 Large - Self-hosted depth estimation (Apache 2.0)
    "depth_anything": (generate_depth_anything, DepthAnythingRequest),
    "depth_anything_v2": (generate_depth_anything, DepthAnythingRequest),
    "depth_estimate": (generate_depth_anything, DepthAnythingRequest),
    # SAM2 - Self-hosted segmentation (Apache 2.0)
    "sam2_segment": (generate_sam2_segment, SAM2SegmentRequest),
    "sam2": (generate_sam2_segment, SAM2SegmentRequest),
    "segment": (generate_sam2_segment, SAM2SegmentRequest),
}


async def process_job_async(job: dict) -> dict:
    """
    Process a single job from RunPod queue (async version).

    Job format:
    {
        "id": "job-uuid",
        "input": {
            "operation": "rack_focus|lens_character|rescue_focus|director_edit|video_generate|health",
            "params": { ... operation-specific parameters ... }
        }
    }
    """
    job_input = job.get("input", {})
    operation = job_input.get("operation")
    params = job_input.get("params", {})

    logger.info(f"Processing job: {job.get('id')}, operation: {operation}")

    # Health check - special case
    if operation == "health":
        import torch
        return {
            "success": True,
            "status": "healthy",
            "device": "cuda" if torch.cuda.is_available() else "cpu",
            "gpu_available": torch.cuda.is_available(),
            "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
            "gpu_memory_gb": model_manager.get_vram_usage(),
            "loaded_models": list(model_manager.models.keys()) + list(model_manager.pipelines.keys()),
        }

    # Models list - special case
    if operation == "models":
        return {
            "success": True,
            "available": [
                # Image Generation (Self-Hosted)
                {"id": "flux_schnell", "name": "FLUX.1 Schnell", "family": "image", "tier": "standard", "bestFor": "Fast iteration", "license": "Apache 2.0"},
                {"id": "flux_dev", "name": "FLUX.1 Dev", "family": "image", "tier": "standard", "bestFor": "High quality", "license": "Non-commercial"},
                {"id": "sd35_large", "name": "SD 3.5 Large", "family": "image", "tier": "standard", "bestFor": "Prompt adherence", "license": "Stability AI Community"},
                # Depth (Self-Hosted)
                {"id": "midas", "name": "MiDaS Depth", "family": "depth", "tier": "standard", "license": "MIT"},
                {"id": "depth_anything", "name": "Depth Anything V2 Large", "family": "depth", "tier": "standard", "bestFor": "High-quality depth maps", "license": "Apache 2.0"},
                # Video
                {"id": "wan_t2v", "name": "Wan 2.1 T2V", "family": "video"},
                {"id": "wan_i2v", "name": "Wan 2.1 I2V", "family": "video"},
                {"id": "svi", "name": "Stable Video Infinity", "family": "video", "tier": "pro", "bestFor": "Long-Form Continuity"},
                {"id": "ltx_video", "name": "LTX Video", "family": "video", "tier": "standard", "bestFor": "Fast video generation", "license": "Apache 2.0"},
                # Edit
                {"id": "qwen_vl", "name": "Qwen2-VL", "family": "edit"},
                # Segmentation (Self-Hosted)
                {"id": "sam2", "name": "SAM2 Hiera-Large", "family": "segment", "tier": "standard", "bestFor": "Object segmentation", "license": "Apache 2.0"},
            ],
            "loaded": list(model_manager.models.keys()) + list(model_manager.pipelines.keys()),
            "vram": model_manager.get_vram_usage(),
        }

    # Unload models - special case
    if operation == "unload":
        model_manager.clear_vram()
        return {
            "success": True,
            "vram": model_manager.get_vram_usage(),
        }

    if operation not in HANDLERS:
        return {
            "success": False,
            "error": f"Unknown operation: {operation}. Available: {list(HANDLERS.keys()) + ['health', 'models', 'unload']}",
        }

    handler_fn, request_model = HANDLERS[operation]

    try:
        # Validate and create request
        request = request_model(**params)

        # Call the handler directly (it's an async function)
        result = await handler_fn(request)

        # Convert Pydantic model to dict
        return result.model_dump()

    except Exception as e:
        logger.error(f"Job failed: {e}")
        import traceback
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
        }


async def handler(job: dict) -> dict:
    """
    Async handler for RunPod serverless.
    RunPod 1.8+ supports async handlers natively.
    """
    return await process_job_async(job)


if __name__ == "__main__":
    # Start the RunPod serverless worker
    logger.info("Starting RunPod serverless worker...")
    runpod.serverless.start({"handler": handler})
