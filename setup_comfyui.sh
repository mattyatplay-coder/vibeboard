#!/bin/bash

# Setup ComfyUI for VibeBoard

echo "🎨 Setting up ComfyUI..."

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.10 or higher."
    exit 1
fi

# Clone ComfyUI if not exists
if [ ! -d "ComfyUI" ]; then
    echo "📦 Cloning ComfyUI repository..."
    git clone https://github.com/comfyanonymous/ComfyUI.git
else
    echo "✅ ComfyUI directory already exists."
fi

cd ComfyUI

# Create Virtual Environment
if [ ! -d "venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install dependencies
echo "⬇️ Installing dependencies..."
pip install torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cu121 # For CUDA (Linux/Windows)
# For Mac (MPS), standard pip install torch usually works, but let's be safe
if [[ "$OSTYPE" == "darwin"* ]]; then
    pip install torch torchvision torchaudio
    pip install -r requirements.txt
else
    pip install -r requirements.txt
fi

echo "
✅ ComfyUI Setup Complete!

⚠️  IMPORTANT: You need to download the models manually!

1. **Flux Dev Model:**
   Download \`flux1-dev.safetensors\` and place it in:
   \`ComfyUI/models/unet/\`
   Link: https://huggingface.co/black-forest-labs/FLUX.1-dev/blob/main/flux1-dev.safetensors

2. **VAE:**
   Download \`ae.safetensors\` and place it in:
   \`ComfyUI/models/vae/\`
   Link: https://huggingface.co/black-forest-labs/FLUX.1-dev/blob/main/ae.safetensors

3. **CLIP Models:**
   Download \`clip_l.safetensors\` and \`t5xxl_fp16.safetensors\` and place them in:
   \`ComfyUI/models/clip/\`
   Link: https://huggingface.co/comfyanonymous/flux_text_encoders/tree/main

4. **Run ComfyUI:**
   Execute: \`./run_comfyui.sh\` (I will create this script for you)
"
