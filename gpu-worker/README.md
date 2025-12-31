# VibeBoard GPU Worker

GPU-accelerated ML operations for VibeBoard video generation platform.

## Features

### Video Generation Module

- **Text-to-Video** (`/video/generate`) - Generate video from text prompt using Wan 2.1
- **Image-to-Video** (`/video/generate` with `image_url`) - Animate a source image

### Optics Module

- **Rack Focus** (`/optics/rack-focus`) - Simulate cinematic rack focus from a single image
- **Lens Character** (`/optics/lens-character`) - Apply vintage/anamorphic lens characteristics
- **Focus Rescue** (`/optics/rescue-focus`) - Sharpen slightly out-of-focus images

### Director Module

- **Director Edit** (`/director/edit`) - AI-powered natural language image editing

### Utilities

- **Depth Map** (`/depth/estimate`) - Generate depth maps using Depth Anything V2 or MiDaS
- **Segmentation** (`/utils/segment`) - SAM2-based automatic/text-guided segmentation

## Architecture

The GPU worker uses a **Model Manager** for efficient VRAM usage:

```
Model Families:
- depth: MiDaS, Depth Anything V2
- video: Wan 2.1 T2V, Wan 2.1 I2V
- edit: Qwen2-VL, SDXL Inpaint
- segment: SAM2, Grounded-SAM
```

Only one model family is loaded at a time. When switching families, VRAM is cleared first.

## Deployment Options

### Local Development (CPU/GPU)

```bash
cd gpu-worker
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### Docker (CPU Mode)

```bash
# From project root
docker-compose --profile gpu up gpu-worker
```

### RunPod Serverless (GPU - Production)

1. Build and push Docker image:
```bash
docker build -f Dockerfile.serverless -t your-registry/vibeboard-gpu-worker:latest .
docker push your-registry/vibeboard-gpu-worker:latest
```

2. Create RunPod Serverless endpoint pointing to your image

3. Configure in backend `.env`:
```env
GPU_WORKER_MODE=runpod
RUNPOD_API_KEY=your_api_key
RUNPOD_ENDPOINT_ID=your_endpoint_id
```

## API Reference

### Health Check

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "device": "cuda",
  "gpu_available": true,
  "gpu_name": "NVIDIA GeForce RTX 4090",
  "gpu_memory_gb": { "total": 24, "allocated": 0, "cached": 0 },
  "current_model": null,
  "loaded_models": []
}
```

### Video Generation (Text-to-Video)

```bash
curl -X POST http://localhost:8000/video/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A cinematic shot of a sunset over the ocean",
    "duration_seconds": 4.0,
    "width": 1280,
    "height": 720,
    "guidance_scale": 7.5,
    "num_inference_steps": 50
  }'
```

### Video Generation (Image-to-Video)

```bash
curl -X POST http://localhost:8000/video/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "The camera slowly pushes in",
    "image_url": "https://example.com/image.jpg",
    "duration_seconds": 4.0
  }'
```

### Rack Focus

```bash
curl -X POST http://localhost:8000/optics/rack-focus \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/image.jpg",
    "focus_point_start": [0.3, 0.5],
    "focus_point_end": [0.7, 0.5],
    "duration_seconds": 2.0,
    "fps": 24
  }'
```

### Lens Character

```bash
curl -X POST http://localhost:8000/optics/lens-character \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/image.jpg",
    "lens_type": "vintage",
    "bokeh_shape": "swirly",
    "aberration_strength": 0.5
  }'
```

### Director Edit

```bash
curl -X POST http://localhost:8000/director/edit \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/image.jpg",
    "instruction": "change the lighting to golden hour",
    "strength": 0.7
  }'
```

### Depth Estimation

```bash
curl -X POST http://localhost:8000/depth/estimate \
  -F "image=@/path/to/image.jpg" \
  -F "model=depth_anything"
```

## Environment Variables

| Variable                | Default                 | Description                      |
| ----------------------- | ----------------------- | -------------------------------- |
| `DEVICE`                | `cuda`                  | Compute device (`cuda` or `cpu`) |
| `PORT`                  | `8000`                  | Server port                      |
| `MODEL_CACHE_DIR`       | `/tmp/models`           | Model weights cache directory    |
| `PRELOAD_MODELS`        | `false`                 | Preload models on startup        |
| `VIBEBOARD_BACKEND_URL` | `http://localhost:3001` | VibeBoard backend URL            |
| `R2_ACCOUNT_ID`         |                         | Cloudflare R2 account ID         |
| `R2_ACCESS_KEY`         |                         | Cloudflare R2 access key         |
| `R2_SECRET_KEY`         |                         | Cloudflare R2 secret key         |
| `R2_BUCKET`             | `vibeboard-assets`      | R2 bucket name                   |

## Models Used

| Feature        | Model               | VRAM Required | License    |
| -------------- | ------------------- | ------------- | ---------- |
| Text-to-Video  | Wan 2.1 T2V 1.3B    | ~8GB          | Apache 2.0 |
| Image-to-Video | Wan 2.1 I2V 14B     | ~20GB         | Apache 2.0 |
| Depth Map      | Depth Anything V2   | ~2GB          | Apache 2.0 |
| Depth Map      | MiDaS DPT-Large     | ~2GB          | MIT        |
| Director Edit  | Qwen2-VL 7B         | ~16GB         | Apache 2.0 |
| Segmentation   | SAM 2               | ~4GB          | Apache 2.0 |

## Cost Comparison

| Provider    | Video Gen (4s) | Cost/Video | Monthly (500 videos) |
| ----------- | -------------- | ---------- | -------------------- |
| Fal.ai      | Managed        | ~$0.50     | ~$250                |
| RunPod A6000| Self-hosted    | ~$0.02     | ~$10                 |

**Savings: 96%** with self-hosted GPU worker.

## RunPod Job Format

When using RunPod Serverless, jobs are submitted as:

```json
{
  "input": {
    "operation": "video_generate",
    "params": {
      "prompt": "Your video prompt",
      "duration_seconds": 4.0,
      "width": 1280,
      "height": 720
    }
  }
}
```

Available operations:
- `health` - Check GPU status
- `models` - List available models
- `unload` - Clear VRAM
- `video_generate` - Generate video
- `rack_focus` - Rack focus effect
- `lens_character` - Lens character effect
- `rescue_focus` - Sharpen image
- `director_edit` - AI image editing
