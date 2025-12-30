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
    RackFocusRequest,
    LensCharacterRequest,
    FocusRescueRequest,
    DirectorEditRequest,
)

# Operation handlers - now using synchronous wrappers
HANDLERS = {
    "rack_focus": (rack_focus, RackFocusRequest),
    "lens_character": (lens_character, LensCharacterRequest),
    "rescue_focus": (rescue_focus, FocusRescueRequest),
    "director_edit": (director_edit, DirectorEditRequest),
}


async def process_job_async(job: dict) -> dict:
    """
    Process a single job from RunPod queue (async version).

    Job format:
    {
        "id": "job-uuid",
        "input": {
            "operation": "rack_focus|lens_character|rescue_focus|director_edit|health",
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
        }

    if operation not in HANDLERS:
        return {
            "success": False,
            "error": f"Unknown operation: {operation}. Available: {list(HANDLERS.keys()) + ['health']}",
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


# RunPod supports async handlers directly
handler = process_job_async


if __name__ == "__main__":
    # Start the RunPod serverless worker
    logger.info("Starting RunPod serverless worker...")
    runpod.serverless.start({"handler": handler})
