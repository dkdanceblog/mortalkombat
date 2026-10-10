"""Replace weak poses of the original fighters (Oxxxy, Morgen) with new generated art.
Each pose is scaled to a target height derived from the existing idle sprite so the
new frames match the old ones in size."""
import sys, json, types
from PIL import Image
src = open('build_gen.py').read().split("cleaned = {k:")[0].replace("CID = sys.argv[1] if len(sys.argv) > 1 else 'maybe'", "CID = 'maybe'")
mod = types.ModuleType('bg'); exec(src, mod.__dict__)
clean, scale, anchor = mod.clean, mod.scale, mod.anchor

CID, SRC = sys.argv[1], sys.argv[2]
FR = json.loads(sys.argv[3])          # pose -> file stem
idle = Image.open(f'game/assets/sprites/{CID}_idle.png')
bb = idle.getbbox(); IH = bb[3] - bb[1] - 2
TARGET = {'walk': 1.0, 'hurt': 0.97, 'win': 1.02, 'lose': 0.66}
meta = json.load(open('sprite_meta.json'))
for pose, stem in FR.items():
    img = clean(f'{SRC}/{stem}.png')
    lying = pose == 'ko'
    if lying:
        k = IH * 1.05 / img.width
    else:
        k = IH * TARGET.get(pose.split('_')[0], 1.0) * FR.get('_fix', {}).get(pose, 1.0) / img.height if False else IH * TARGET.get(pose.split('_')[0], 1.0) / img.height
    sm = scale(img, k)
    ax, ay = anchor(sm, lying)
    sm.save(f'game/assets/sprites/{CID}_{pose}.png', optimize=True)
    meta[CID][pose] = {'src': f'assets/sprites/{CID}_{pose}.png', 'ax': round(ax), 'ay': round(ay)}
    print(pose, sm.size, round(ax), round(ay))
json.dump(meta, open('sprite_meta.json', 'w'), indent=1)
