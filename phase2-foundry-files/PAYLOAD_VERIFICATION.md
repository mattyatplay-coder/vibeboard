# Phase 2 Payload Verification

## ✅ CONFIRMED: Payload Structure is Correct

The TypeScript/Node.js `GPUWorkerClient` correctly maps to the Python worker's expected format.

### How It Works

```
GPUWorkerClient.generatePerformance(params)
        ↓
executeOperation('flash_portrait', { image_url, audio_url, ... })
        ↓
executeRunPod(operation, params)
        ↓
POST /run with body:
{
    "input": {
        "task": "flash_portrait",      // ← Maps operation → task
        "payload": {                   // ← Maps params → payload
            "image_url": "https://...",
            "audio_url": "https://...",
            "driver_video_url": null,
            "enhance_face": true,
            "lip_sync_strength": 0.8
        }
    }
}
```

### Key Code (GPUWorkerClient.ts lines 291-302)

```typescript
private async executeRunPod(
  operation: string,
  params: Record<string, unknown>
): Promise<ProcessingResult> {
  // Submit job
  // NOTE: Python worker expects 'task' and 'payload' keys, not 'operation' and 'params'
  const runResponse = await this.client.post('/run', {
    input: {
      task: operation,      // ✅ 'flash_portrait'
      payload: params,      // ✅ The actual parameters
    },
  });
```

### Python Worker Handler Should Expect

```python
def handler(event):
    input_data = event.get("input", {})
    task = input_data.get("task")        # 'flash_portrait'
    payload = input_data.get("payload")  # { image_url, audio_url, ... }

    if task == "flash_portrait":
        return flash_portrait_handler(payload)
```

### Endpoint Mapping (line 337)

```typescript
const endpoints: Record<string, string> = {
  rack_focus: '/optics/rack-focus',
  lens_character: '/optics/lens-character',
  rescue_focus: '/optics/rescue-focus',
  director_edit: '/director/edit',
  video_generate: '/video/generate',
  video_t2v: '/video/generate',
  video_i2v: '/video/generate',
  flash_portrait: '/performance/flash-portrait',  // ← Phase 2
};
```

## Phase 2 Status: 🟢 GREEN
