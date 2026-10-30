"""Compose App Store frames: a title band (Cinzel, the game's logo gradient and palette) above a raw gameplay capture.
Usage: compose.py <device> <raw.png> <out.png> "<caption>"   device = iphone | ipad
Output is RGB (no alpha) at the exact App Store size."""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

DEV = {'iphone': dict(size=(1320, 2868), dpr=3, band=150), 'ipad': dict(size=(2064, 2752), dpr=2, band=200)}
FONT = '/usr/share/fonts/truetype/sand-box/google/Cinzel/Cinzel-VariableFont_wght.ttf'

def font(px):
    f = ImageFont.truetype(FONT, px)
    try: f.set_variation_by_axes([900])
    except Exception: pass
    return f

def wrap(draw, text, fnt, maxw):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=fnt) <= maxw: cur = t
        else: lines.append(cur); cur = w
    lines.append(cur); return lines

def band(dev, caption):
    d = DEV[dev]; W = d['size'][0]; H = d['band'] * d['dpr']
    img = Image.new('RGB', (W, H), '#0b0716')
    px = img.load()
    top, bot = (0x1c, 0x12, 0x38), (0x0b, 0x07, 0x16)
    g = Image.new('RGB', (1, H))
    for y in range(H):
        t = y / (H - 1); g.putpixel((0, y), tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    img = g.resize((W, H))
    # ember glow rising from the bottom edge
    glow = Image.new('L', (W, H), 0); ImageDraw.Draw(glow).ellipse((-W * .2, H * .55, W * 1.2, H * 1.9), fill=70)
    glow = glow.filter(ImageFilter.GaussianBlur(H * .18))
    img = Image.composite(Image.new('RGB', (W, H), (255, 90, 31)), img, glow)
    dr = ImageDraw.Draw(img)
    margin = int(W * 0.06); maxw = W - 2 * margin
    size = int(H * 0.40)
    while True:
        fnt = font(size); lines = wrap(dr, caption, fnt, maxw)
        lh = int(size * 1.18)
        if (len(lines) <= 2 and lh * len(lines) <= H * 0.74 and all(dr.textlength(l, font=fnt) <= maxw for l in lines)) or size < 20: break
        size -= 2
    if len(lines) == 1 and size >= int(H * 0.40) - 1: pass
    total = lh * len(lines); y0 = (H - total) // 2 - int(H * 0.02)
    text_mask = Image.new('L', (W, H), 0); md = ImageDraw.Draw(text_mask)
    for i, l in enumerate(lines):
        w = dr.textlength(l, font=fnt); md.text(((W - w) / 2, y0 + i * lh), l, font=fnt, fill=255)
    # logo gradient fill: cream -> amber -> ember (same stops as .panel h1.logo)
    grad = Image.new('RGB', (W, H)); gp = grad.load()
    stops = [(0, (255, 241, 214)), (.45, (255, 179, 71)), (.75, (255, 77, 31)), (1, (138, 18, 8))]
    ty0, ty1 = y0 + int(size * .1), y0 + total
    def col(y):
        t = min(1, max(0, (y - ty0) / max(1, ty1 - ty0)))
        for (a, ca), (b, cb) in zip(stops, stops[1:]):
            if a <= t <= b: u = (t - a) / (b - a); return tuple(int(ca[i] + (cb[i] - ca[i]) * u) for i in range(3))
        return stops[-1][1]
    for y in range(H):
        c = col(y)
        for x in range(0, W, 1): gp[x, y] = c
    halo = text_mask.filter(ImageFilter.GaussianBlur(size * .18)).point(lambda v: min(255, int(v * .9)))
    img = Image.composite(Image.new('RGB', (W, H), (255, 90, 31)), img, halo.point(lambda v: int(v * .55)))
    shadow = ImageChops.offset(text_mask, 0, max(2, size // 14)).filter(ImageFilter.GaussianBlur(max(1, size // 30)))
    img = Image.composite(Image.new('RGB', (W, H), (0, 0, 0)), img, shadow)
    img = Image.composite(grad, img, text_mask)
    # gold rule along the bottom edge
    dr = ImageDraw.Draw(img); r = max(3, d['dpr'] * 2)
    dr.rectangle((0, H - r, W, H), fill=(255, 162, 74)); dr.rectangle((0, H - r - 2, W, H - r), fill=(60, 30, 20))
    return img

def main(dev, raw, out, caption):
    d = DEV[dev]; W, Ht = d['size']; b = band(dev, caption)
    game = Image.open(raw).convert('RGB')
    gh = Ht - b.height
    if game.size != (W, gh): game = game.resize((W, gh), Image.LANCZOS) if abs(game.size[0] - W) < 2 else game.crop((0, 0, W, gh))
    f = Image.new('RGB', (W, Ht)); f.paste(b, (0, 0)); f.paste(game, (0, b.height)); f.save(out, 'PNG')

if __name__ == '__main__': main(*sys.argv[1:5])
