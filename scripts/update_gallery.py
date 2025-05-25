#!/usr/bin/env python3
"""
Script to automatically update the gallery when new images are added.
This script will:
1. Generate thumbnails for any new images
2. Update the _data/gallery.yml file with new entries
3. Maintain existing captions and metadata
"""

import os
import sys
import yaml
from pathlib import Path
import subprocess

def load_gallery_data(gallery_file):
    """Load existing gallery data from YAML file."""
    try:
        with open(gallery_file, 'r') as f:
            return yaml.safe_load(f) or []
    except FileNotFoundError:
        return []

def save_gallery_data(gallery_file, data):
    """Save gallery data to YAML file."""
    with open(gallery_file, 'w') as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)

def get_image_files(directory):
    """Get list of image files in directory."""
    image_extensions = {'.jpg', '.jpeg', '.png', '.webp'}
    return [f for f in os.listdir(directory) 
            if os.path.splitext(f.lower())[1] in image_extensions]

def generate_thumbnails():
    """Generate thumbnails using the existing script."""
    script_path = Path(__file__).parent / 'generate_thumbnails.py'
    try:
        result = subprocess.run([sys.executable, str(script_path)], 
                              capture_output=True, text=True, check=True)
        print("Thumbnails generated successfully:")
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error generating thumbnails: {e}")
        print(e.stdout)
        print(e.stderr)
        return False
    return True

def main():
    # Paths
    gallery_dir = Path('assets/img/gallery')
    gallery_file = Path('_data/gallery.yml')
    thumbs_dir = gallery_dir / 'thumbs'
    
    # Check if gallery directory exists
    if not gallery_dir.exists():
        print(f"Error: Gallery directory '{gallery_dir}' does not exist")
        sys.exit(1)
    
    # Load existing gallery data
    existing_data = load_gallery_data(gallery_file)
    existing_urls = {item['url'] for item in existing_data if 'url' in item}
    
    # Get current image files
    image_files = get_image_files(gallery_dir)
    
    # Find new images
    new_images = []
    for image_file in image_files:
        image_url = f'/assets/img/gallery/{image_file}'
        if image_url not in existing_urls:
            new_images.append(image_file)
    
    if not new_images:
        print("No new images found. Gallery is up to date.")
        return
    
    print(f"Found {len(new_images)} new images: {', '.join(new_images)}")
    
    # Generate thumbnails for all images (including new ones)
    print("Generating thumbnails...")
    if not generate_thumbnails():
        print("Failed to generate thumbnails. Aborting.")
        sys.exit(1)
    
    # Add new images to gallery data
    for image_file in new_images:
        name_without_ext = os.path.splitext(image_file)[0]
        new_entry = {
            'url': f'/assets/img/gallery/{image_file}',
            'thumbnail_url': f'/assets/img/gallery/thumbs/{name_without_ext}.jpg'
        }
        existing_data.append(new_entry)
        print(f"Added: {image_file}")
    
    # Save updated gallery data
    save_gallery_data(gallery_file, existing_data)
    print(f"Updated {gallery_file} with {len(new_images)} new entries")
    
    # Show summary
    print(f"\nGallery now contains {len(existing_data)} images total")
    print("Don't forget to add captions to new images in _data/gallery.yml if desired!")

if __name__ == "__main__":
    main() 