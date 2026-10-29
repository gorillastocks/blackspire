import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
def key(src, dst, size=512, solid=False):
    im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(np.float32)
    h, w, _ = a.shape
    border = np.concatenate([a[:6].reshape(-1,3), a[-6:].reshape(-1,3), a[:,:6].reshape(-1,3), a[:,-6:].reshape(-1,3)])
    bg = np.median(border, axis=0)
    d = np.sqrt(((a - bg) ** 2).sum(2))
    lo, hi = 28.0, 78.0
    al = np.clip((d - lo) / (hi - lo), 0, 1)
    if solid:  # muted backgrounds sit close to dark creature colours: everything not connected to the border is solid, only the rim is ramped
        lab0, n0 = ndi.label(d < 42); edge_labels = set(np.unique(np.concatenate([lab0[0], lab0[-1], lab0[:, 0], lab0[:, -1]]))) - {0}
        sz0 = ndi.sum(np.ones_like(lab0), lab0, range(1, n0 + 1)); big = {i + 1 for i, v in enumerate(sz0) if v > 3000}
        fgm = ~np.isin(lab0, list(edge_labels | big)); dist = ndi.distance_transform_edt(fgm)
        al = np.where(dist > 2.5, 1.0, np.clip((d - 20) / 50, 0, 1) * fgm)
    # keep only the biggest connected foreground blob(s) + anything touching: drop tiny specks of bg-like noise
    solid = al > 0.5
    lab, n = ndi.label(solid)
    if n > 1:
        sizes = ndi.sum(solid, lab, range(1, n + 1)); keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 400])
        keepd = ndi.binary_dilation(keep, iterations=6); al = al * keepd
    # shrink alpha by ~1px to eat the halo
    al = ndi.grey_erosion(al, size=(3, 3)); al = ndi.gaussian_filter(al, 0.6)
    # decontaminate: remove bg contribution from semi-transparent pixels
    A = np.clip(al, 1e-3, 1)[..., None]
    c = (a - (1 - A) * bg) / A; c = np.clip(c, 0, 255)
    edge = (al < 0.98)[..., None]
    if bg[1] > bg[0] and bg[1] > bg[2]:   # green key
        lim = np.maximum(c[..., 0], c[..., 2])[..., None]; g = np.minimum(c[..., 1:2], lim); c2 = np.concatenate([c[..., :1], g, c[..., 2:]], 2)
    else:                                  # magenta key
        g = c[..., 1:2]; r = np.minimum(c[..., :1], g + 25); b = np.minimum(c[..., 2:], g + 25); c2 = np.concatenate([r, g, b], 2)
    out = np.where(edge, c2, c)
    # global despill of leftover key-colour cast (wispy smoke/glow that blended with the background but kept alpha ~1)
    if bg[1] > bg[0] and bg[1] > bg[2]:
        m = np.maximum(out[..., 0], out[..., 2]); out[..., 1] = np.minimum(out[..., 1], m * 1.0 + 2)
    else:
        g = out[..., 1]; lim = g * 1.12 + 8; mask = (out[..., 0] > lim) & (out[..., 2] > lim)
        out[..., 0] = np.where(mask, lim, out[..., 0]); out[..., 2] = np.where(mask, lim, out[..., 2])
    rgba = np.concatenate([out, (al * 255)[..., None]], 2).astype(np.uint8)
    img = Image.fromarray(rgba, 'RGBA')
    bb = img.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox()
    img = img.crop(bb)
    s = min(size / img.height, 640 / img.width); img = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
    img.save(dst, 'WEBP', quality=76, method=6)
    return img.size
if __name__ == '__main__':
    print(key(sys.argv[1], sys.argv[2], solid='--solid' in sys.argv))
