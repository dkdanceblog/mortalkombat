"""Import Maybe Baby's generated sprites (ChatGPT, ~1200px) into the game:
clean alpha, scale to the game's sprite size, align frames by the hips, add the
same dark outline as the other fighters, and measure the hair root for the whip."""
import json
import numpy as np
from PIL import Image
from scipy import ndimage

import sys
CFG = {
 'maybe': dict(src='maybe_gen', target_h=242, portrait='14', lower_crouch=True,
   frames={'idle':'10','walk_1':'01','walk_2':'05','walk_3':'08','walk_4':'09','crouch':'06','jump':'07','light':'04','heavy':'03','special':'02','hurt':'11','win':'12','ko':'13'}),
 'chip': dict(src='chip_gen', target_h=238, portrait=None, lower_crouch=False,
   frames={'idle':'idle','walk_1':'walk_a','walk_2':'idle','walk_3':'walk_b','walk_4':'idle','crouch':'crouch','jump':'jump','light_0':'light_0','light':'light','heavy_0':'heavy_0','heavy':'heavy','special':'special','hurt':'hurt','win':'win','ko':'ko','lose':'lose'}),
 'face': dict(src='face_gen', target_h=236, portrait='05', lower_crouch=False,
   frames={'idle':'01','walk_1':'14','walk_2':'02','walk_3':'14','walk_4':'13','crouch':'12','jump':'11','light':'10','heavy':'09','special':'08','hurt':'07','win':'06','ko':'04'}),
 'korzh': dict(src='korzh_gen', target_h=236, portrait='03', lower_crouch=False,
   frames={'idle':'01','walk_1':'12','walk_2':'13','walk_3':'02','walk_4':'13','crouch':'11','jump':'09','light':'10','heavy':'08','special':'07','hurt':'06','win':'05','ko':'04'}),
 'atl': dict(src='atl_gen', target_h=244, portrait='04', lower_crouch=False,
   frames={'idle':'00','walk_1':'14','walk_2':'15','walk_3':'01','walk_4':'16','crouch':'13','jump':'12','light':'11','heavy':'10','special':'02','hurt':'07','win':'08','ko':'06'}, fix={'special':1.33}),
 'slava': dict(src='slava_gen', target_h=234, portrait='06', lower_crouch=False,
   frames={'idle':'00','walk_1':'15','walk_2':'00','walk_3':'16','walk_4':'00','crouch':'14','jump':'13','light':'12','heavy':'11','special':'10','hurt':'09','win':'08','ko':'07'}),
 'kreed': dict(src='kreed_gen', target_h=236, portrait='04', lower_crouch=False,
   frames={'idle':'01','walk_1':'12','walk_2':'01','walk_3':'13','walk_4':'01','crouch':'11','jump':'10','light':'09','heavy':'08','special':'07','hurt':'06','win':'05','ko':'03'}),
}
CID = sys.argv[1] if len(sys.argv) > 1 else 'maybe'
C = CFG[CID]
SRC = C['src']
OUT = 'game/assets/sprites'
OUTLINE = (22, 12, 34, 255)

FRAMES = C['frames']
TARGET_H = C['target_h']

def clean(path):
    im = Image.open(path).convert('RGBA')
    a = np.array(im)
    # chroma key: generated on a bright green background
    c = a[2, 2]
    if c[3] > 200 and c[1] > 200 and c[0] < 80 and c[2] < 80:
        r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
        green = (g > 150) & (g > r + 60) & (g > b + 60)
        a[..., 3] = np.where(green, 0, a[..., 3])
        spill = (g > r + 15) & (g > b + 15) & ~green
        a[..., 1] = np.where(spill, np.maximum(r, b), g).astype(np.uint8)
    solid = a[..., 3] > 150
    lab, n = ndimage.label(solid)
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if s > 600]          # body + detached nails/hair tips
    mask = np.isin(lab, keep)
    mask = ndimage.binary_fill_holes(mask) & (a[..., 3] > 60) | mask
    a[..., 3] = np.where(mask, 255, 0)
    # kill the reddish/dark halo left by background removal: pull edge colours from the interior
    edge = mask & ~ndimage.binary_erosion(mask, iterations=3)
    interior = ndimage.binary_erosion(mask, iterations=3)
    if interior.any():
        idx = ndimage.distance_transform_edt(~interior, return_distances=False, return_indices=True)
        for c in range(3):
            ch = a[..., c]
            ch[edge] = ch[idx[0][edge], idx[1][edge]]
    img = Image.fromarray(a, 'RGBA')
    return img.crop(img.getbbox())

def scale(img, s):
    w, h = img.size
    # premultiplied downscale so edges don't pick up transparent colour
    arr = np.array(img).astype(np.float32)
    arr[..., :3] *= arr[..., 3:4] / 255
    pm = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    small = pm.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    sa = np.array(small).astype(np.float32)
    alpha = sa[..., 3:4]
    rgb = np.where(alpha > 0, sa[..., :3] * 255 / np.maximum(alpha, 1), 0)
    out = np.dstack([np.clip(rgb, 0, 255), np.where(alpha > 110, 255, 0)]).astype(np.uint8)
    return outline(Image.fromarray(out, 'RGBA'))

def outline(img):
    a = np.array(img)
    m = a[..., 3] > 0
    pad = np.pad(m, 1)
    ring = ndimage.binary_dilation(pad, structure=[[0, 1, 0], [1, 1, 1], [0, 1, 0]]) & ~pad
    big = np.zeros((m.shape[0] + 2, m.shape[1] + 2, 4), np.uint8)
    big[1:-1, 1:-1] = a
    big[ring] = OUTLINE
    return Image.fromarray(big, 'RGBA')

def anchor(img, lying=False):
    a = np.array(img)[..., 3] > 0
    h, w = a.shape
    rows = np.where(a.any(axis=1))[0]
    bottom = rows.max() + 1
    if lying:
        cols = np.where(a.any(axis=0))[0]
        return (cols.min() + cols.max()) / 2, bottom
    # x: centre of the hips (skirt band ~ 52–62% down the figure) so frames don't jump sideways
    top = rows.min()
    y0 = int(top + (bottom - top) * 0.50)
    y1 = int(top + (bottom - top) * 0.60)
    xs = np.where(a[y0:y1].any(axis=0))[0]
    return (xs.min() + xs.max()) / 2, bottom

def head_center(img):
    """Mean position of skin pixels in the top part of the figure."""
    a = np.array(img).astype(int)
    m = a[..., 3] > 0
    rows = np.where(m.any(axis=1))[0]
    top, bot = rows.min(), rows.max()
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    skin = m & (r > 150) & (g > 90) & (g < 190) & (b < 160) & (r - b > 40)
    skin[int(top + (bot - top) * 0.3):] = False
    ys, xs = np.nonzero(skin)
    return float(xs.mean()), float(ys.mean())


def lower_stance(img, hip=0.50, k=0.66, widen=1.12):
    """The generated 'crouch' is a wide guard at almost full height; sink it into a real crouch
    by compressing and spreading the legs (the in-game crouch hurtbox is ~140px tall)."""
    w, h = img.size
    a = np.array(img)[..., 3] > 0
    rows = np.where(a.any(axis=1))[0]
    top, bot = rows.min(), rows.max() + 1
    y = int(top + (bot - top) * hip)
    upper = img.crop((0, 0, w, y))
    legs = img.crop((0, y, w, h))
    nl = legs.resize((round(w * widen), max(1, round(legs.height * k))), Image.NEAREST)
    out_w = max(w, nl.width)
    out = Image.new('RGBA', (out_w, upper.height + nl.height), (0, 0, 0, 0))
    out.alpha_composite(nl, ((out_w - nl.width) // 2, upper.height))
    out.alpha_composite(upper, ((out_w - w) // 2, 0))
    return out

cleaned = {k: clean(f'{SRC}/{v}.png') for k, v in FRAMES.items()}
s = TARGET_H / cleaned['idle'].height
meta = {}
for pose, img in cleaned.items():
    lying = pose == 'ko'
    k = s * (0.76 if lying else 1.0)
    k *= C.get('fix', {}).get(pose, 1.0)   # some generated poses draw the figure at a different size        # the lying image is drawn at a larger scale
    sm = scale(img, k)
    if pose == 'crouch' and C['lower_crouch']:
        sm = lower_stance(sm)
    ax, ay = anchor(sm, lying)
    sm.save(f'{OUT}/{CID}_{pose}.png', optimize=True)
    meta[pose] = {'src': f'assets/sprites/{CID}_{pose}.png', 'ax': round(ax), 'ay': round(ay)}
    if pose == 'special':
        hx, hy = head_center(sm)
        meta['_whip_root'] = {'x': round(hx - ax - 4), 'y': round(hy - ay - 10)}
meta.setdefault('lose', dict(meta['ko']))
print('scale', round(s, 4), {k: (v.get('ax'), v.get('ay')) for k, v in meta.items()})

# portrait: head and shoulders, 192x192 like the others
if C['portrait'] is None:
    json.dump(meta, open(f'{CID}_meta.json', 'w'), indent=1); sys.exit(0)
p = clean(f'{SRC}/{C["portrait"]}.png')
side = max(p.size)
sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
sq.alpha_composite(p, ((side - p.width) // 2, side - p.height))
por = scale(sq, 190 / side)
por = por.resize((192, 192), Image.NEAREST) if por.size != (192, 192) else por
por.save(f'game/assets/portraits/{CID}_portrait.png', optimize=True)

json.dump(meta, open(f'{CID}_meta.json', 'w'), indent=1)
