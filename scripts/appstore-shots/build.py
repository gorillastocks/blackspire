"""Build every App Store frame for one device from the raw captures. Usage: build.py iphone|ipad"""
import sys, os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import compose, overview
dev = sys.argv[1]; raw = f'/workspace/appstore-raw/{dev}'
out = f"/workspace/appstore/{compose.DEV[dev].get('dir', 'iphone-6.9' if dev == 'iphone' else 'ipad-13')}"
out = '/workspace/appstore/iphone-6.9' if dev == 'iphone' else '/workspace/appstore/ipad-13'
os.makedirs(out, exist_ok=True)
FRAMES = [  # (file name, raw capture, caption)
    ('01-descend.png', 'corridor', 'Descend into Blackspire.'),
    ('02-gorvax.png', 'gorvax-0' if os.path.exists(f'{raw}/gorvax-0.png') else 'elowen', 'Save her before the town falls.'),
    ('03-battle.png', 'battle', 'One price. No gacha.'),
    ('04-automap.png', 'automap', 'Old-school grid crawling, with an automap'),
    ('05-floors.png', 'floors', '5 deadly floors. One epic quest.'),
    ('06-classes.png', 'create', '12 classes'),
    ('07-town.png', 'town', 'Rest, shop and recruit in Emberhollow.'),
    ('08-camp.png', 'camp', 'Bond with your companions at camp.'),
]
if os.path.exists(f'{raw}/floor5.png'): overview.main(dev, raw)
for name, src, cap in FRAMES:
    p = f'{raw}/{src}.png'
    if not os.path.exists(p): print('skip', name); continue
    compose.main(dev, p, f'{out}/{name}', cap); print('built', name)
