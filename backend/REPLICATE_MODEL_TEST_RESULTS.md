# Replicate Model Test Results - Dec 24, 2025

## Summary

Comprehensive testing of all Replicate models registered in VibeBoard.

### Results: 9/9 Successful (after fixes)

## Image Generation Models

| Model | Endpoint | Status | Time | Notes |
|-------|----------|--------|------|-------|
| Flux Schnell | `black-forest-labs/flux-schnell` | ✅ SUCCESS | 1.0s | Fastest |
| Flux Dev | `black-forest-labs/flux-dev` | ✅ SUCCESS | 1.7s | |
| Flux 1.1 Pro | `black-forest-labs/flux-1.1-pro` | ✅ SUCCESS | 3.7s | |
| Flux 1.1 Pro Ultra | `black-forest-labs/flux-1.1-pro-ultra` | ✅ SUCCESS | 7.8s | Highest quality |
| SDXL | `stability-ai/sdxl` | ✅ SUCCESS | 42.6s | Supports negative prompt |
| Juggernaut XL v9 | `lucataco/juggernaut-xl-v9` | ✅ SUCCESS | 57.1s | Uncensored |

## Character Consistency Models

| Model | Endpoint | Status | Time | Notes |
|-------|----------|--------|------|-------|
| Consistent Character | `fofr/consistent-character` | ✅ SUCCESS | 12.8s | **Fixed** - updated version hash |

## Video Generation Models

| Model | Endpoint | Status | Time | Notes |
|-------|----------|--------|------|-------|
| LTX Video | `fofr/ltx-video` | ✅ SUCCESS | 77.3s | |
| AnimateDiff | `lucataco/animate-diff` | ✅ SUCCESS | 297.2s | **Fixed** - updated version hash |

## Fixes Applied

### 1. Consistent Character Version Hash
**Issue**: Old version hash `1e6e9ed2880c22a82a8ee72a8dd0c5a4c11da1cf5e4e246d825cef7ff1f87e09` was invalid.

**Fix**: Updated to current version:
```typescript
// Old (broken)
"fofr/consistent-character:1e6e9ed2880c22a82a8ee72a8dd0c5a4c11da1cf5e4e246d825cef7ff1f87e09"

// New (working)
"fofr/consistent-character:9c77a3c2f884193fcee4d89645f02a0b9def9434f9e03cb98460456b831c8772"
```

### 2. AnimateDiff Version Hash
**Issue**: Old version hash had typo in last characters (`...e48571` instead of `...e48a9f`).

**Fix**: Updated to current version:
```typescript
// Old (broken)
"lucataco/animate-diff:beecf59c4aee8d81bf04f0381033dfa10dc16e845b4ae00d281e2fa377e48571"

// New (working)
"lucataco/animate-diff:beecf59c4aee8d81bf04f0381033dfa10dc16e845b4ae00d281e2fa377e48a9f"
```

## Performance Tiers

### Fast (< 10 seconds)
- Flux Schnell: 1.0s
- Flux Dev: 1.7s
- Flux 1.1 Pro: 3.7s
- Flux 1.1 Pro Ultra: 7.8s

### Medium (10-60 seconds)
- Consistent Character: 12.8s
- SDXL: 42.6s
- Juggernaut XL v9: 57.1s

### Slow (> 60 seconds)
- LTX Video: 77.3s
- AnimateDiff: 297.2s (~5 min)

## Output Formats

Replicate models return various output formats:

| Format | Models | Handling |
|--------|--------|----------|
| ReadableStream | Flux 1.1 Pro, Flux 1.1 Pro Ultra | Binary image data - save to file |
| FileOutput (function) | Flux Schnell, Flux Dev, SDXL, etc. | Call `.url()` to get URL |
| Array of URLs | Consistent Character | Direct URL strings |
| Object with video | LTX Video, AnimateDiff | `output.url` or `output[0]` |

## Rate Limits

Replicate has tiered rate limits based on account credit:

| Credit Balance | Rate Limit | Burst |
|----------------|------------|-------|
| < $5 | 6 requests/min | 1 |
| $5+ | Standard limits | Higher |

**Note**: Add 12+ second delays between tests when running on low-credit accounts.

## Test Configuration

```typescript
TEST_PROMPT = "A majestic golden retriever standing in a sunlit meadow, professional photography, detailed fur, golden hour lighting"
TEST_NEGATIVE = "low quality, blurry, distorted, ugly, deformed"
TEST_IMAGE_URL = "https://images.pexels.com/photos/58997/pexels-photo-58997.jpeg?auto=compress&w=1024"
```

## Running Tests

```bash
cd backend
npx ts-node test-replicate-models.ts
```

For quick verification of specific models:
```bash
npx ts-node test-replicate-quick.ts
```

## Model Version Discovery

To get the latest version hash for a Replicate model:
```bash
curl -s "https://api.replicate.com/v1/models/{owner}/{model}" \
  -H "Authorization: Bearer $REPLICATE_API_TOKEN" | jq '.latest_version.id'
```

## Recommendations by Use Case

| Use Case | Recommended Model | Reason |
|----------|-------------------|--------|
| Quick iterations | Flux Schnell | 1.0s, good quality |
| High quality images | Flux 1.1 Pro Ultra | Best Flux quality |
| Uncensored content | Juggernaut XL v9 | No safety filter |
| Character consistency | Consistent Character | Multi-pose generation |
| Text-to-video | LTX Video | Fast video generation |
| Animation from image | AnimateDiff | Smooth motion |
