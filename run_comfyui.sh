#!/bin/bash

# Run ComfyUI

cd ComfyUI
source venv/bin/activate
python main.py --listen 127.0.0.1 --port 8188
