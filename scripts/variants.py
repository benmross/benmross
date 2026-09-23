"""Make a 1200px-wide copy of every large image in public/media, for phones.

Run after adding or replacing an image:  uv run --with pillow python scripts/variants.py
Writes src/media-variants.json, which lib/media.ts reads to build srcset.
"""
import json, pathlib
from PIL import Image

root = pathlib.Path(__file__).resolve().parent.parent
media = root / 'public' / 'media'
out = {}
for f in sorted(media.rglob('*.webp')):
    if f.stem.endswith('-1200'):
        continue
    im = Image.open(f)
    if im.width <= 1400:
        continue
    small = f.with_name(f.stem + '-1200.webp')
    im.convert('RGB').resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS).save(small, 'WEBP', quality=80, method=6)
    out['/' + str(f.relative_to(root / 'public'))] = im.width
(root / 'src' / 'media-variants.json').write_text(json.dumps(out, indent=1) + '\n')
print(len(out), 'variants')
