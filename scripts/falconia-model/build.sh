#!/bin/bash
# Rebuild public/media/falconia/model/{terrain,wire}.glb from the Scaniverse OBJ.
set -e
export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH"
SITE="$(cd "$(dirname "$0")/../.." && pwd)"
W=/home/benmross/herald/projects/falconia-model-src/work

python3 "$SITE/scripts/falconia-model/prep.py" | grep -v '^\[' | head -8
mkdir -p "$W" && cd "$W" && [ -d node_modules/@gltf-transform ] || npm i --silent @gltf-transform/core@4.5.1 @gltf-transform/extensions@4.5.1 @gltf-transform/functions@4.5.1 meshoptimizer
cd "$W"
G="npx -y @gltf-transform/cli@4.5.1"
npx -y obj2gltf@3.2.0 -i terrain.obj -o terrain-raw.glb --unlit >/dev/null
$G weld terrain-raw.glb a.glb >/dev/null
$G simplify a.glb b.glb --ratio 0.55 --error 0.0004 >/dev/null
$G resize b.glb c.glb --width 4096 --height 4096 >/dev/null
$G webp c.glb d.glb --quality 82 >/dev/null
$G meshopt d.glb terrain.glb --level high >/dev/null
$G simplify a.glb w1.glb --ratio 0.09 --error 0.004 >/dev/null
$G meshopt w1.glb wire.glb --level high >/dev/null
cp "$SITE/scripts/falconia-model/strip.mjs" . && node strip.mjs wire.glb wire-geo.glb >/dev/null
cp terrain.glb "$SITE/src/assets/models/falconia-terrain.glb"
cp wire-geo.glb "$SITE/src/assets/models/falconia-wire.glb"
ls -la "$SITE/src/assets/models"
