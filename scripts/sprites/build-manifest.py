"""Build public/monsters/manifest.json from the keyed sprites in public/monsters/ (monster key -> file, elite title slug -> file).
Usage: python3 scripts/sprites/build-manifest.py   (run from the repo root)"""
import json, os
from PIL import Image
D = 'public/monsters'; man = {'v': 1, 'monsters': {}, 'elites': {}}
for f in sorted(os.listdir(D)):
    if not f.endswith('.webp'): continue
    w, h = Image.open(os.path.join(D, f)).size; n = f[:-5]
    if n.startswith('elite_'): man['elites'][n[6:].lower()] = {'f': f, 'w': w, 'h': h}
    else: man['monsters'][n] = {'f': f, 'w': w, 'h': h}
json.dump(man, open(os.path.join(D, 'manifest.json'), 'w'), separators=(',', ':'))
print(len(man['monsters']), 'monsters,', len(man['elites']), 'elites')
