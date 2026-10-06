"""Bar 1703 stage: background, two crowd layers and the host (4 poses)."""
import json, types
from PIL import Image
src = open('build_gen.py').read().split("cleaned = {k:")[0].replace("CID = sys.argv[1] if len(sys.argv) > 1 else 'maybe'", "CID = 'maybe'")
mod = types.ModuleType('bg'); exec(src, mod.__dict__)
clean, scale, anchor = mod.clean, mod.scale, mod.anchor
D = 'game/assets/stage_bar'
import os; os.makedirs(D, exist_ok=True)

bg = Image.open('bar_gen/bg.png').convert('RGB')
s = max(1280 / bg.width, 720 / bg.height)
bg = bg.resize((round(bg.width * s), round(bg.height * s)), Image.LANCZOS)
l = (bg.width - 1280) // 2; t = (bg.height - 720) // 2
bg.crop((l, t, l + 1280, t + 720)).save('game/assets/backgrounds/bar_1703.webp', quality=88)

for k in ['calm', 'hype']:
    c = clean(f'bar_gen/crowd_{k}.png')
    print(k, c.size)
    c = scale(c, 1400 / c.width)
    c.save(f'{D}/crowd_{k}.png', optimize=True)

meta = {}
base = clean('bar_gen/host_idle.png')
k0 = 196 / base.height
for pose, extra in [('idle', 1), ('point', 1), ('shock', 1), ('win', 1)]:
    im = clean(f'bar_gen/host_{pose}.png')
    sm = scale(im, k0 * extra)
    ax, ay = anchor(sm)
    sm.save(f'{D}/host_{pose}.png', optimize=True)
    meta[pose] = {'ax': round(ax), 'ay': round(ay)}
    print(pose, sm.size, meta[pose])
json.dump(meta, open('host_meta.json', 'w'))
