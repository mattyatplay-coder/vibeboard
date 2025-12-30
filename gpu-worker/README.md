# VibeBoard GPU Worker

GPU-accelerated ML operations for VibeBoard video generation platform.

## Features

### Optics Module

- **Rack Focus** (`/optics/rack-focus`) - Simulate cinematic rack focus from a single image
- **Lens Character** (`/optics/lens-character`) - Apply vintage/anamorphic lens characteristics
- **Focus Rescue** (`/optics/rescue-focus`) - Sharpen slightly out-of-focus images

### Director Module

- **Director Edit** (`/director/edit`) - AI-powered natural language image editing

### Utilities

- **Depth Map** (`/utils/depth-map`) - Generate depth maps for 2.5D effects
- **Segmentation** (`/utils/segment`) - SAM2-based automatic/text-guided segmentation

## Deployment Options

### Local Development (CPU)

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

1. Build and push Docker image
2. Create RunPod Serverless endpoint
3. Configure `RUNPOD_API_KEY` and `RUNPOD_ENDPOINT_ID` in backend `.env`

## API Reference

### Health Check

```bash
curl http://localhost:8000/health
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

## Environment Variables

| Variable                | Default                 | Description                      |
| ----------------------- | ----------------------- | -------------------------------- |
| `DEVICE`                | `cuda`                  | Compute device (`cuda` or `cpu`) |
| `PORT`                  | `8000`                  | Server port                      |
| `MODEL_CACHE_DIR`       | `/tmp/models`           | Model weights cache directory    |
| `PRELOAD_MODELS`        | `false`                 | Preload models on startup        |
| `VIBEBOARD_BACKEND_URL` | `http://localhost:3001` | VibeBoard backend URL            |

## Models Used

| Feature        | Model             | License    |
| -------------- | ----------------- | ---------- |
| Rack Focus     | Learn2Refocus     | Research   |
| Lens Character | GenFocus          | Research   |
| Focus Rescue   | DiffCamera        | Research   |
| Director Edit  | Qwen2-VL          | Apache 2.0 |
| Depth Map      | Depth Anything V2 | Apache 2.0 |
| Segmentation   | SAM 2             | Apache 2.0 |
