"""Five-floor overview: tiles the game's own automap renders (B1-B5, from the real level data) on the game's dark palette.
Usage: overview.py <device> <rawdir>   -> <rawdir>/floors.png (the game area below the title band)"""
import sys, json
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from compose import DEV, font

def mono(px):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf'):
        try: return ImageFont.truetype(p, px)
        except Exception: pass
    return ImageFont.load_default()

def main(dev, raw):
    d = DEV[dev]; W = d['size'][0]; H = d['size'][1] - d['band'] * d['dpr']
    info = json.load(open(f'{raw}/floors.json'))
    img = Image.new('RGB', (W, H), '#0b0716')
    g = Image.new('RGB', (1, H))
    for y in range(H): t = y / H; g.putpixel((0, y), tuple(int(a + (b - a) * t) for a, b in zip((0x14, 0x0e, 0x26), (0x0b, 0x07, 0x16))))
    img = g.resize((W, H)); dr = ImageDraw.Draw(img)
    pad = int(W * .05); gap = int(W * .04)
    if dev == 'iphone':
        cw = (W - 2 * pad - gap) // 2; lab = int(cw * .17); ch = cw + lab; top = (H - (3 * ch + 2 * gap)) // 2
        cells = [(pad, top), (pad + cw + gap, top), (pad, top + ch + gap), (pad + cw + gap, top + ch + gap), ((W - cw) // 2, top + 2 * (ch + gap))]
    else:
        cw = (W - 2 * pad - 2 * gap) // 3; lab = int(cw * .17); ch = cw + lab; top = (H - (2 * ch + gap)) // 2 + int(H * .03)
        x0 = pad; r2 = (W - (2 * cw + gap)) // 2
        cells = [(x0, top), (x0 + cw + gap, top), (x0 + 2 * (cw + gap), top), (r2, top + ch + gap), (r2 + cw + gap, top + ch + gap)]
        ft = font(int(cw * .085)); dr.text((W / 2, top - int(H * .06)), 'From the Rat-Warrens to the Thunder-Lizard Vault', font=ft, fill=(240, 216, 192), anchor='mm')
    for i, (x, y) in enumerate(cells):
        m = Image.open(f'{raw}/floor{i + 1}.png').convert('RGB').resize((cw, cw), Image.LANCZOS)
        panel = (x - 6, y - 6, x + cw + 6, y + ch + 6)
        dr.rounded_rectangle(panel, radius=int(cw * .04), fill=(20, 14, 38), outline=(59, 45, 107), width=3)
        img.paste(m, (x, y))
        name = info[i]['name']; code, title = name.split(': ', 1)
        f1 = font(int(lab * .50)); f2 = mono(int(lab * .27))
        s = f"{code}  {title}"
        while dr.textlength(s, font=f1) > cw - 10 and f1.size > 12: f1 = font(f1.size - 2)
        dr.text((x + cw / 2, y + cw + lab * .30), s, font=f1, fill=(255, 211, 77), anchor='mm')
        boss = info[i]['boss']
        while dr.textlength(boss, font=f2) > cw - 10 and f2.size > 10: f2 = mono(f2.size - 1)
        dr.text((x + cw / 2, y + cw + lab * .74), boss, font=f2, fill=(255, 162, 74), anchor='mm')
    img.save(f'{raw}/floors.png')

if __name__ == '__main__': main(*sys.argv[1:3])
