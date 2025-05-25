# Gallery Management Scripts

This directory contains scripts to help manage the photography gallery with optimized performance.

## Scripts

### `generate_thumbnails.py`

Generates optimized thumbnail versions of gallery images for better web performance.

**Usage:**
```bash
python3 scripts/generate_thumbnails.py [options]
```

**Options:**
- `--input-dir`: Directory containing original images (default: `assets/img/gallery`)
- `--output-dir`: Directory to save thumbnails (default: `assets/img/gallery/thumbs`)
- `--max-size WIDTH HEIGHT`: Maximum thumbnail dimensions (default: 400 400)
- `--quality`: JPEG quality 1-100 (default: 85)

**Example:**
```bash
# Generate thumbnails with default settings
python3 scripts/generate_thumbnails.py

# Generate smaller thumbnails with lower quality
python3 scripts/generate_thumbnails.py --max-size 300 300 --quality 75
```

### `update_gallery.py`

Automatically updates the gallery when new images are added. This script will:
1. Detect new images in the gallery directory
2. Generate thumbnails for all images
3. Update `_data/gallery.yml` with new entries

**Usage:**
```bash
python3 scripts/update_gallery.py
```

**Workflow for adding new images:**
1. Copy new images to `assets/img/gallery/`
2. Run `python3 scripts/update_gallery.py`
3. Optionally add captions to new entries in `_data/gallery.yml`
4. Commit and deploy

## Performance Benefits

The thumbnail system provides significant performance improvements:

- **98.8% size reduction**: Original images (36MB total) → Thumbnails (0.4MB total)
- **Faster page loads**: Gallery preview loads much faster
- **Better user experience**: Immediate preview with high-quality lightbox on click
- **Mobile-friendly**: Smaller images for mobile devices
- **Bandwidth savings**: Especially important for users on slower connections

## Image Specifications

### Original Images
- Used for: Lightbox full-size view
- Format: Any (JPG, PNG, WebP)
- Size: No limit (but consider reasonable file sizes)

### Thumbnails
- Used for: Gallery grid preview
- Format: JPEG (optimized)
- Max dimensions: 400x400px (maintains aspect ratio)
- Quality: 85% (good balance of quality vs. size)
- Location: `assets/img/gallery/thumbs/`

## Requirements

- Python 3.6+
- Pillow (PIL): `pip install Pillow`
- PyYAML: `pip install PyYAML`

## Gallery Data Structure

The `_data/gallery.yml` file uses this structure:

```yaml
- url: /assets/img/gallery/image.jpg
  thumbnail_url: /assets/img/gallery/thumbs/image.jpg
  caption: "Optional image caption"
```

- `url`: Path to the full-size image (required)
- `thumbnail_url`: Path to the thumbnail (auto-generated)
- `caption`: Optional caption displayed in lightbox

## Troubleshooting

### Missing thumbnails
If thumbnails aren't displaying:
1. Check that `assets/img/gallery/thumbs/` directory exists
2. Run `python3 scripts/generate_thumbnails.py` to regenerate
3. Verify file permissions

### New images not appearing
1. Ensure images are in `assets/img/gallery/`
2. Run `python3 scripts/update_gallery.py`
3. Check that `_data/gallery.yml` was updated
4. Rebuild the Jekyll site

### Performance issues
- Ensure thumbnails are being used (check browser dev tools)
- Consider reducing thumbnail quality or size for even better performance
- Enable browser caching for static assets 