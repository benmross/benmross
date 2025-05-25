#!/usr/bin/env python3
"""
Script to generate thumbnail versions of gallery images for better web performance.
Creates smaller, optimized versions for gallery previews while keeping originals for lightbox.
"""

import os
import sys
from PIL import Image, ImageOps
import argparse

def create_thumbnail(input_path, output_path, max_size=(400, 400), quality=85):
    """
    Create a thumbnail version of an image.
    
    Args:
        input_path: Path to the original image
        output_path: Path where thumbnail should be saved
        max_size: Maximum dimensions (width, height) for thumbnail
        quality: JPEG quality (1-100, higher is better quality but larger file)
    """
    try:
        with Image.open(input_path) as img:
            # Convert to RGB if necessary (handles RGBA, etc.)
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Create thumbnail maintaining aspect ratio
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save with optimization
            img.save(output_path, 'JPEG', quality=quality, optimize=True)
            
            # Get file sizes for comparison
            original_size = os.path.getsize(input_path)
            thumbnail_size = os.path.getsize(output_path)
            compression_ratio = (1 - thumbnail_size / original_size) * 100
            
            print(f"✓ {os.path.basename(input_path)}: {original_size//1024}KB → {thumbnail_size//1024}KB ({compression_ratio:.1f}% smaller)")
            
    except Exception as e:
        print(f"✗ Error processing {input_path}: {e}")

def main():
    parser = argparse.ArgumentParser(description='Generate thumbnails for gallery images')
    parser.add_argument('--input-dir', default='assets/img/gallery', 
                       help='Directory containing original images')
    parser.add_argument('--output-dir', default='assets/img/gallery/thumbs',
                       help='Directory to save thumbnails')
    parser.add_argument('--max-size', type=int, nargs=2, default=[400, 400],
                       help='Maximum thumbnail dimensions (width height)')
    parser.add_argument('--quality', type=int, default=85,
                       help='JPEG quality (1-100)')
    
    args = parser.parse_args()
    
    input_dir = args.input_dir
    output_dir = args.output_dir
    max_size = tuple(args.max_size)
    quality = args.quality
    
    # Check if input directory exists
    if not os.path.exists(input_dir):
        print(f"Error: Input directory '{input_dir}' does not exist")
        sys.exit(1)
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Get list of image files
    image_extensions = {'.jpg', '.jpeg', '.png', '.webp'}
    image_files = [f for f in os.listdir(input_dir) 
                   if os.path.splitext(f.lower())[1] in image_extensions]
    
    if not image_files:
        print(f"No image files found in '{input_dir}'")
        sys.exit(1)
    
    print(f"Generating thumbnails for {len(image_files)} images...")
    print(f"Max size: {max_size[0]}x{max_size[1]}, Quality: {quality}")
    print(f"Input: {input_dir}")
    print(f"Output: {output_dir}")
    print("-" * 50)
    
    total_original_size = 0
    total_thumbnail_size = 0
    
    for image_file in sorted(image_files):
        input_path = os.path.join(input_dir, image_file)
        
        # Change extension to .jpg for thumbnails (for consistency)
        name_without_ext = os.path.splitext(image_file)[0]
        output_file = f"{name_without_ext}.jpg"
        output_path = os.path.join(output_dir, output_file)
        
        # Skip if thumbnail already exists and is newer than original
        if (os.path.exists(output_path) and 
            os.path.getmtime(output_path) > os.path.getmtime(input_path)):
            print(f"⏭ {image_file}: thumbnail already up to date")
            continue
        
        create_thumbnail(input_path, output_path, max_size, quality)
        
        # Track total sizes
        if os.path.exists(output_path):
            total_original_size += os.path.getsize(input_path)
            total_thumbnail_size += os.path.getsize(output_path)
    
    # Summary
    if total_original_size > 0:
        total_compression = (1 - total_thumbnail_size / total_original_size) * 100
        print("-" * 50)
        print(f"Summary:")
        print(f"Total original size: {total_original_size//1024//1024}MB")
        print(f"Total thumbnail size: {total_thumbnail_size//1024//1024}MB")
        print(f"Total space saved: {total_compression:.1f}%")

if __name__ == "__main__":
    main() 