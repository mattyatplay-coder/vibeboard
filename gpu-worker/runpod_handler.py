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
    estimate_depth,
    RackFocusRequest,
    LensCharacterRequest,
    FocusRescueRequest,
    DirectorEditRequest,
    VideoGenerationRequest,
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
                {"id": "midas", "name": "MiDaS Depth", "family": "depth"},
                {"id": "depth_anything", "name": "Depth Anything V2", "family": "depth"},
                {"id": "wan_t2v", "name": "Wan 2.1 T2V", "family": "video"},
                {"id": "wan_i2v", "name": "Wan 2.1 I2V", "family": "video"},
                {"id": "qwen_vl", "name": "Qwen2-VL", "family": "edit"},
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


def handler(job: dict) -> dict:
    """
    Synchronous wrapper for RunPod serverless.
    RunPod expects a synchronous handler that returns a dict.

    IMPORTANT: Always use asyncio.run() to create a fresh event loop.
    Do NOT try to reuse an existing loop - it causes deadlocks with RunPod's worker.
    """
    import asyncio

    # Always create a fresh event loop - RunPod's internal loop should not be reused
    return asyncio.run(process_job_async(job))


if __name__ == "__main__":
    # Start the RunPod serverless worker
    logger.info("Starting RunPod serverless worker...")
    runpod.serverless.start({"handler": handler})
