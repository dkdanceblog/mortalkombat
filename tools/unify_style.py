"""Unify the look of the original four fighters with the newer ones:
1px dark outline on every frame that lacks it, light sharpening, and Morgen scaled to the common height."""
import json
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
OUT = (22, 12, 34, 255)
meta = json.load(open('sprite_meta.json'))

def edge_lum(im):
    a = np.array(im).astype(float); m = a[..., 3] > 0
    e = m & ~ndimage.binary_erosion(m)
    return ((a[..., :3][e] / 255) @ [0.299, 0.587, 0.114]).mean()

def outline(im):
    a = np.array(im); m = a[..., 3] > 0
    pad = np.pad(m, 1)
    ring = ndimage.binary_dilation(pad, structure=[[0, 1, 0], [1, 1, 1], [0, 1, 0]]) & ~pad
    big = np.zeros((m.shape[0] + 2, m.shape[1] + 2, 4), np.uint8)
    big[1:-1, 1:-1] = a
    big[ring] = OUT
    return Image.fromarray(big, 'RGBA')

def sharpen(im):
    rgb = im.convert('RGB').filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
    out = Image.merge('RGBA', (*rgb.split(), im.split()[3]))
    return out

for cid in ['guf', 'noize', 'oxxxy', 'morgen']:
    k = 237 / 226 if cid == 'morgen' else 1.0
    for pose, m in meta[cid].items():
        path = 'game/' + m['src']
        im = Image.open(path).convert('RGBA')
        changed = False
        if k != 1.0 and not m.get('_scaled'):
            w, h = im.size
            a = np.array(im).astype(np.float32); a[..., :3] *= a[..., 3:4] / 255
            sm = Image.fromarray(a.astype(np.uint8), 'RGBA').resize((round(w * k), round(h * k)), Image.LANCZOS)
            s2 = np.array(sm).astype(np.float32); al = s2[..., 3:4]
            rgb = np.where(al > 0, s2[..., :3] * 255 / np.maximum(al, 1), 0)
            im = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), np.where(al > 110, 255, 0)]).astype(np.uint8), 'RGBA')
            m['ax'] = round(m['ax'] * k); m['ay'] = round(m['ay'] * k); m['_scaled'] = True
            changed = True
        if edge_lum(im) > 0.1:
            im = outline(sharpen(im)); m['ax'] += 1; m['ay'] += 1; changed = True
        if changed:
            im.save(path, optimize=True)
            print(cid, pose, im.size)
    for m in meta[cid].values(): m.pop('_scaled', None)
# lose/ko share files in some cases: make anchors consistent with the file actually written
json.dump(meta, open('sprite_meta.json', 'w'), indent=1)
