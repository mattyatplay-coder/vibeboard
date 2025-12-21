#!/bin/bash
# Test Script for Models Requiring Special Inputs
# These models need audio, motion videos, masks, or other special inputs

PROJECT_ID="fdb546a3-be53-49d8-83e7-77e809fff0ef"
API_BASE="http://localhost:3001/api/projects/$PROJECT_ID/generations"

# Sample assets (you'll need to provide actual URLs)
# Using a sample image from previous successful generation
SAMPLE_IMAGE="https://v3b.fal.media/files/b/0a86d132/YvPGLZQWutczdrcUC-yXd.jpg"

# Sample audio for avatar models (you need to provide a real audio URL)
# For testing, you can upload an MP3 to fal.ai storage first, or use a public URL
# Example: SAMPLE_AUDIO="https://example.com/speech.mp3"
SAMPLE_AUDIO=""

# Sample motion video for animation models (you need to provide a real video URL)
# Example: SAMPLE_MOTION_VIDEO="https://example.com/motion.mp4"
SAMPLE_MOTION_VIDEO=""

# Sample source video for editing models
SAMPLE_SOURCE_VIDEO=""

echo "=========================================="
echo "Special Models Test Script"
echo "=========================================="
echo ""
echo "NOTE: Many of these models require special inputs."
echo "Please set the following environment variables or edit this script:"
echo ""
echo "  SAMPLE_AUDIO - URL to an audio file (MP3, WAV, M4A) for avatar models"
echo "  SAMPLE_MOTION_VIDEO - URL to a motion reference video for animation"
echo "  SAMPLE_SOURCE_VIDEO - URL to a source video for editing/inpainting"
echo ""

# Check if we have required inputs
if [ -z "$SAMPLE_AUDIO" ]; then
    echo "WARNING: SAMPLE_AUDIO not set. Avatar/lipsync models will be skipped."
    echo ""
fi

if [ -z "$SAMPLE_MOTION_VIDEO" ]; then
    echo "WARNING: SAMPLE_MOTION_VIDEO not set. Animation models will be skipped."
    echo ""
fi

# ==========================================
# 1. IP-ADAPTER FACE ID (Image model, needs face reference)
# ==========================================
echo "Testing: fal-ai/ip-adapter-face-id"
echo "This model generates images with face identity preservation"
curl -s -X POST "$API_BASE" \
  -H "Content-Type: application/json" \
  -d '{
    "inputPrompt": "A professional headshot photo, studio lighting, business attire",
    "mode": "text_to_image",
    "falModel": "fal-ai/ip-adapter-face-id",
    "aspectRatio": "1:1",
    "variations": 1,
    "engine": "fal",
    "elementReferences": ["'"$SAMPLE_IMAGE"'"]
  }' | jq '{id, status: .status, error: .failureReason}'
echo ""

# ==========================================
# 2. CREATIFY AURORA (Avatar - needs image + audio)
# ==========================================
if [ -n "$SAMPLE_AUDIO" ]; then
    echo "Testing: fal-ai/creatify/aurora"
    echo "This model creates talking avatar videos"
    curl -s -X POST "$API_BASE" \
      -H "Content-Type: application/json" \
      -d '{
        "inputPrompt": "Natural talking head video",
        "mode": "avatar",
        "falModel": "fal-ai/creatify/aurora",
        "aspectRatio": "16:9",
        "variations": 1,
        "engine": "fal",
        "sourceImages": ["'"$SAMPLE_IMAGE"'"],
        "audioUrl": "'"$SAMPLE_AUDIO"'"
      }' | jq '{id, status: .status, error: .failureReason}'
    echo ""
else
    echo "SKIPPED: fal-ai/creatify/aurora (no audio provided)"
    echo ""
fi

# ==========================================
# 3. KLING AVATAR V2 PRO (needs image + audio)
# ==========================================
if [ -n "$SAMPLE_AUDIO" ]; then
    echo "Testing: fal-ai/kling-video/ai-avatar/v2/pro"
    echo "This model creates high-quality talking avatar videos"
    curl -s -X POST "$API_BASE" \
      -H "Content-Type: application/json" \
      -d '{
        "inputPrompt": "Professional talking head, clear speech",
        "mode": "avatar",
        "falModel": "fal-ai/kling-video/ai-avatar/v2/pro",
        "aspectRatio": "16:9",
        "variations": 1,
        "engine": "fal",
        "sourceImages": ["'"$SAMPLE_IMAGE"'"],
        "audioUrl": "'"$SAMPLE_AUDIO"'"
      }' | jq '{id, status: .status, error: .failureReason}'
    echo ""
else
    echo "SKIPPED: fal-ai/kling-video/ai-avatar/v2/pro (no audio provided)"
    echo ""
fi

# ==========================================
# 4. KLING AVATAR V2 STANDARD (needs image + audio)
# ==========================================
if [ -n "$SAMPLE_AUDIO" ]; then
    echo "Testing: fal-ai/kling-video/ai-avatar/v2/standard"
    echo "This model creates talking avatar videos (standard tier)"
    curl -s -X POST "$API_BASE" \
      -H "Content-Type: application/json" \
      -d '{
        "inputPrompt": "Natural talking head video",
        "mode": "avatar",
        "falModel": "fal-ai/kling-video/ai-avatar/v2/standard",
        "aspectRatio": "16:9",
        "variations": 1,
        "engine": "fal",
        "sourceImages": ["'"$SAMPLE_IMAGE"'"],
        "audioUrl": "'"$SAMPLE_AUDIO"'"
      }' | jq '{id, status: .status, error: .failureReason}'
    echo ""
else
    echo "SKIPPED: fal-ai/kling-video/ai-avatar/v2/standard (no audio provided)"
    echo ""
fi

# ==========================================
# 5. ONE-TO-ALL ANIMATION (needs image + motion video)
# ==========================================
if [ -n "$SAMPLE_MOTION_VIDEO" ]; then
    echo "Testing: fal-ai/one-to-all-animation/14b"
    echo "This model transfers motion from a video to an image"
    curl -s -X POST "$API_BASE" \
      -H "Content-Type: application/json" \
      -d '{
        "inputPrompt": "Smooth animation, natural movement",
        "negativePrompt": "distorted, blurry, low quality",
        "mode": "image_to_video",
        "falModel": "fal-ai/one-to-all-animation/14b",
        "aspectRatio": "16:9",
        "variations": 1,
        "engine": "fal",
        "sourceImages": ["'"$SAMPLE_IMAGE"'"],
        "inputVideo": "'"$SAMPLE_MOTION_VIDEO"'"
      }' | jq '{id, status: .status, error: .failureReason}'
    echo ""
else
    echo "SKIPPED: fal-ai/one-to-all-animation/14b (no motion video provided)"
    echo ""
fi

# ==========================================
# 6. KLING O1 VIDEO-TO-VIDEO EDIT (needs source video)
# ==========================================
if [ -n "$SAMPLE_SOURCE_VIDEO" ]; then
    echo "Testing: fal-ai/kling-video/o1/video-to-video/edit"
    echo "This model edits existing videos"
    curl -s -X POST "$API_BASE" \
      -H "Content-Type: application/json" \
      -d '{
        "inputPrompt": "Add dramatic lighting and color grading",
        "mode": "video_editing",
        "falModel": "fal-ai/kling-video/o1/video-to-video/edit",
        "aspectRatio": "16:9",
        "variations": 1,
        "engine": "fal",
        "sourceVideoUrl": "'"$SAMPLE_SOURCE_VIDEO"'"
      }' | jq '{id, status: .status, error: .failureReason}'
    echo ""
else
    echo "SKIPPED: fal-ai/kling-video/o1/video-to-video/edit (no source video provided)"
    echo ""
fi

# ==========================================
# 7. WAN VACE INPAINTING (needs video + mask)
# Note: This is harder to test as it needs a mask
# ==========================================
echo "SKIPPED: fal-ai/wan-vace-14b/inpainting"
echo "  This model requires both a source video AND a mask."
echo "  It's typically used via the UI where you can draw a mask."
echo ""

echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""
echo "To test avatar/lipsync models, you need audio:"
echo "  1. Record or find a short audio clip (5-30 seconds)"
echo "  2. Upload it to a public URL or use fal.ai storage"
echo "  3. Set SAMPLE_AUDIO in this script"
echo ""
echo "To test animation models, you need a motion video:"
echo "  1. Record or find a short video with movement (dancing, walking, etc.)"
echo "  2. Upload it to a public URL or use fal.ai storage"
echo "  3. Set SAMPLE_MOTION_VIDEO in this script"
echo ""
echo "Quick way to upload to Fal storage using the API:"
echo '  curl -X POST "https://rest.fal.run/fal-ai/flux/dev" \'
echo '    -H "Authorization: Key $FAL_KEY" \'
echo '    -H "Content-Type: application/json" \'
echo '    -d "{\"prompt\": \"test\"}"'
echo ""
