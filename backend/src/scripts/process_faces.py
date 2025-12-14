
import os
import argparse
from pathlib import Path
from PIL import Image

def process_folder(input_dir, output_dir=None, bg_color=(128, 128, 128)):
    try:
        from rembg import remove
    except ImportError as e:
        print(f"Error importing rembg: {e}")
        return

    input_path = Path(input_dir)
    if not input_path.exists():
        print(f"Error: Directory not found: {input_dir}")
        return

    # Create output directory
    if output_dir:
        output_path = Path(output_dir)
    else:
        output_path = input_path / "Processed_Neutral"
    
    output_path.mkdir(parents=True, exist_ok=True)
    print(f"Output directory: {output_path}")

    # Supported extensions
    extensions = {'.jpg', '.jpeg', '.png', '.webp'}
    files = [f for f in input_path.iterdir() if f.suffix.lower() in extensions]

    print(f"Found {len(files)} images. Starting processing...")

    for i, file_path in enumerate(files):
        try:
            print(f"Processing [{i+1}/{len(files)}]: {file_path.name}")
            
            # Load and remove background
            with open(file_path, 'rb') as f:
                input_bytes = f.read()
                output_bytes = remove(input_bytes)
            
            # Convert bytes back to PIL Image
            from io import BytesIO
            foreground = Image.open(BytesIO(output_bytes)).convert("RGBA")
            
            # Create neutral background
            background = Image.new("RGBA", foreground.size, bg_color + (255,))
            
            # Composite
            final_image = Image.alpha_composite(background, foreground)
            
            # Save as PNG (to preserve quality, though background is solid) OR JPG
            # User wants "face reference photos". JPG is usually fine if background is solid.
            # But PNG is safer for references.
            save_name = f"{file_path.stem}_clean.png"
            final_image.save(output_path / save_name)

        except Exception as e:
            print(f"Failed to process {file_path.name}: {e}")

    print("\nDone! Images saved to 'Processed_Neutral' folder.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Batch remove background and add neutral background.")
    parser.add_argument("--input", "-i", type=str, required=True, help="Input directory containing images")
    parser.add_argument("--output", "-o", type=str, help="Output directory (optional)")
    
    args = parser.parse_args()
    
    process_folder(args.input, args.output)
