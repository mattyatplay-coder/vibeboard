# Provider Model Test Results - Dec 24, 2025

## Summary

Testing of Together AI and Civitai providers to determine which models are currently functional.

## Together AI - 2/6 Working

| Model | Model ID | Status | Time | Notes |
|-------|----------|--------|------|-------|
| Flux Schnell | `black-forest-labs/FLUX.1-schnell` | ✅ SUCCESS | 3.2s | Fast, good quality |
| Flux Dev | `black-forest-labs/FLUX.1-dev` | ✅ SUCCESS | 1.1s | Fastest |
| Flux Schnell Free | `black-forest-labs/FLUX.1-schnell-Free` | ❌ FAILED | - | Requires dedicated endpoint |
| RealVis XL | `SG161222/RealVisXL_V4.0` | ❌ FAILED | - | Not available (404) |
| Realistic Vision | `SG161222/Realistic_Vision_V3.0_VAE` | ❌ FAILED | - | Requires dedicated endpoint |
| Dreamshaper XL | `Lykon/dreamshaper-xl-v2-turbo` | ❌ FAILED | - | Not available (404) |

### Together AI Recommendations
- **Remove from registry**: `flux-schnell-free`, `realvis-xl`, `realistic-vision-together`, `dreamshaper-xl`
- **Keep in registry**: `flux-schnell`, `flux-dev` (these work)
- Together AI's free/community models require dedicated endpoints with paid tier

## Civitai - 0/5 Working (API Issues)

| Model | URN | Status | Notes |
|-------|-----|--------|-------|
| Auraflow | `urn:air:flux1:checkpoint:civitai:618692@691639` | ❌ Internal Error | Server-side error |
| SDXL 1.0 | `urn:air:sdxl:checkpoint:civitai:101055@128078` | ⚠️ Partial | Job ran, SDK parsing issue |
| SDXL Lightning | `urn:air:sdxl:checkpoint:civitai:413081@462695` | ❌ Gateway Timeout | 504 error |
| Pony Diffusion | `urn:air:pony:checkpoint:civitai:257749@290640` | ⚠️ Partial | Job ran, SDK parsing issue |
| Realistic Vision | `urn:air:sd1:checkpoint:civitai:4201@130072` | ⚠️ Partial | Job ran, SDK parsing issue |

### Civitai Observations
1. **API is experiencing issues**: Gateway timeouts and server errors suggest infrastructure problems
2. **Some models DID generate**: SDXL 1.0, Pony, Realistic Vision all returned `blobUrl` in responses
3. **SDK polling issue**: The Civitai SDK stops polling early, resulting in "No image URL" even when generation succeeded
4. **Recommendation**: Either fix SDK response handling or wait for Civitai API stabilization

### Civitai Raw Response Example (SDXL 1.0)
```json
{
  "token": "eyJKb2JzIjpbIjc0MDk3Y2Y4LTEwOTQtNDM1YS1hZTlkLWI4ZTljY2NjMzlkMiJdfQ==",
  "jobs": [{
    "jobId": "74097cf8-1094-435a-ae9d-b8e9cccc39d2",
    "cost": 2.56,
    "result": [{
      "blobKey": "D2C5F3EABA8C7A5894D91605145C0FC86D257555AA1C67CFD3AC6CC1709DBA97",
      "available": true,
      "blobUrl": "https://blobs-temp.sfo..."
    }]
  }]
}
```
The image WAS generated, but the SDK's response structure differs from what the test script expected.

## Registry Update Recommendations

### Remove these non-functional models:

```typescript
// Together AI - Remove these (require dedicated endpoints or 404)
{ id: 'flux-schnell-free', provider: 'together', ... }
{ id: 'realvis-xl', provider: 'together', ... }
{ id: 'realistic-vision-together', provider: 'together', ... }
{ id: 'dreamshaper-xl', provider: 'together', ... }
```

### Keep these working models:

```typescript
// Together AI - Keep these
{ id: 'flux-schnell', name: 'Flux Schnell', provider: 'together', ... }
{ id: 'flux-dev', name: 'Flux Dev', provider: 'together', ... }
```

### Civitai models: Keep but mark as unstable
The Civitai models appear to work but the API/SDK has issues. Consider:
1. Keeping them but adding a "may be unstable" warning
2. Updating the CivitaiAdapter to better handle the response format

## Files Created
- `test-together-models.ts` - Together AI test script
- `test-civitai-models.ts` - Civitai test script
- `together-model-test-results.json` - Raw Together AI results
- `civitai-model-test-results.json` - Raw Civitai results
