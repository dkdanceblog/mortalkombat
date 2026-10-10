"""Circus and apartment-yard stages: backgrounds, babushkas, circus bulb positions."""
import json, types
import numpy as np
from PIL import Image
from scipy import ndimage
src = open('build_gen.py').read().split("cleaned = {k:")[0].replace("CID = sys.argv[1] if len(sys.argv) > 1 else 'maybe'", "CID = 'maybe'")
mod = types.ModuleType('bg'); exec(src, mod.__dict__)
clean, scale = mod.clean, mod.scale

def cover(path, out):
    bg = Image.open(path).convert('RGB')
    s = max(1280 / bg.width, 720 / bg.height)
    bg = bg.resize((round(bg.width * s), round(bg.height * s)), Image.LANCZOS)
    l = (bg.width - 1280) // 2; t = (bg.height - 720) // 2
    bg = bg.crop((l, t, l + 1280, t + 720))
    bg.save(out, quality=88)
    return bg

cover('st2_gen/yard.png', 'game/assets/backgrounds/yard.webp')
circ = cover('st2_gen/circus.png', 'game/assets/backgrounds/circus.webp')

# garland bulbs: small bright warm blobs in the upper part of the tent
a = np.asarray(circ).astype(int)
lum = a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11
mask = (lum > 215) & (a[..., 0] > 200)
mask[470:] = False
lab, n = ndimage.label(mask)
bulbs = []
for i, sl in enumerate(ndimage.find_objects(lab)):
    area = (lab[sl] == i + 1).sum()
    if 2 <= area <= 80:
        cy, cx = ndimage.center_of_mass(lab == i + 1) if False else ((sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2)
        bulbs.append([round(cx), round(cy), int(min(10, 2 + area ** 0.5))])
print('bulbs', len(bulbs))

meta = {}
for who in ['A', 'B']:
    calm = clean(f'st2_gen/bab{who}_idle.png')
    k = 150 / calm.width
    for pose in ['idle', 'cheer', 'shock']:
        im = clean(f'st2_gen/bab{who}_{pose}.png')
        sm = scale(im, k)
        al = np.array(sm)[..., 3] > 0
        rows = np.where(al.any(axis=1))[0]
        bottom = rows.max() + 1
        legs = al[int(bottom - (bottom - rows.min()) * 0.08):bottom]
        xs = np.where(legs.any(axis=0))[0]
        meta[f'{who}_{pose}'] = {'ax': round((xs.min() + xs.max()) / 2), 'ay': int(bottom)}
        sm.save(f'game/assets/stage_yard/bab{who}_{pose}.png', optimize=True)
        print(who, pose, sm.size, meta[f'{who}_{pose}'])
json.dump({'babushka': meta, 'bulbs': bulbs}, open('stages2_meta.json', 'w'))
