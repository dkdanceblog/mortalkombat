"""Rebuild fighter sprites: remap mislabeled poses, normalize scale,
generate missing frames (walk cycle, crouch, hurt, KO), crop and emit anchors."""
import json, os, math
from PIL import Image, ImageEnhance

SRC = 'orig/assets/sprites'
OUT = 'game/assets/sprites'
os.makedirs(OUT, exist_ok=True)

def load(name):
    return Image.open(f'{SRC}/{name}.png').convert('RGBA')

def binarize(im):
    a = im.getchannel('A').point(lambda v: 255 if v >= 128 else 0)
    im = im.copy(); im.putalpha(a); return im

# A "frame" = (image, ax, ay): anchor = feet centre on the ground.
def frame(im, ax=128, ay=None):
    if ay is None:
        ay = im.getchannel('A').getbbox()[3]
    return [im, ax, ay]

def scale_about(fr, s):
    im, ax, ay = fr
    w, h = im.size
    big = im.resize((round(w * s), round(h * s)), Image.NEAREST)
    return [big, ax * s, ay * s]

def rotate_about_feet(fr, deg, pivot_dx=0):
    """Rotate around the anchor (feet). Positive = counter-clockwise."""
    im, ax, ay = fr
    pad = 200
    c = Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0))
    c.alpha_composite(im, (pad, pad))
    px, py = ax + pad + pivot_dx, ay + pad
    r = c.rotate(deg, resample=Image.NEAREST, center=(px, py))
    return [r, ax + pad, ay + pad]

def shift(fr, dx=0, dy=0):
    im, ax, ay = fr
    return [im, ax - dx, ay - dy]

def body_rows(im):
    bb = im.getchannel('A').getbbox()
    return bb[1], bb[3]

def legs_transform(fr, fn_offset, lift=0, hip_frac=0.56):
    """Remap leg rows. fn_offset(t, side) -> dx, t in [0,1] from hip to floor,
    side = -1 for back (left) leg, +1 for front (right) leg."""
    im, ax, ay = fr
    top, bot = body_rows(im)
    hip = int(top + (bot - top) * hip_frac)
    src = im.load()
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    o = out.load()
    w, h = im.size
    # upper body lifted
    for y in range(0, hip):
        ny = y - lift
        if 0 <= ny < h:
            for x in range(w):
                p = src[x, y]
                if p[3]: o[x, ny] = p
    # legs: draw back leg first, then front leg on top
    cx = int(ax)
    for side in (-1, 1):
        for y in range(hip, h):
            t = (y - hip) / max(1, bot - hip)
            dx = round(fn_offset(t, side))
            ny = y - lift
            xs = range(0, cx) if side < 0 else range(cx, w)
            for x in xs:
                p = src[x, y]
                if p[3]:
                    nx = x + dx
                    if 0 <= nx < w and 0 <= ny < h:
                        o[nx, ny] = p
    # fill 1px vertical tears created by lift
    return [out, ax, ay]

def squat(fr, k=0.74, widen=1.16, hip_frac=0.52):
    """Compress legs vertically (and splay them) to fake a crouch."""
    im, ax, ay = fr
    top, bot = body_rows(im)
    hip = int(top + (bot - top) * hip_frac)
    upper = im.crop((0, 0, im.width, hip))
    legs = im.crop((0, hip, im.width, im.height))
    nl_h = round(legs.height * k)
    nl_w = round(legs.width * widen)
    legs2 = legs.resize((nl_w, nl_h), Image.NEAREST)
    drop = legs.height - nl_h
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    lx = round(ax - ax * widen)
    out.alpha_composite(legs2.crop((max(0, -lx), 0, min(nl_w, im.width - lx), nl_h)), (max(0, lx), hip + drop))
    # torso leans slightly forward and sinks
    up2 = upper.rotate(-6, resample=Image.NEAREST, center=(ax, hip))
    out.alpha_composite(up2, (4, drop))
    return [out, ax, ay]

def lie_down(fr):
    """KO pose: body flat on the floor, head behind (to the left)."""
    im, ax, ay = fr
    bb = im.getchannel('A').getbbox()
    body = im.crop(bb)
    r = body.rotate(90, resample=Image.NEAREST, expand=True)  # head to the left
    r = ImageEnhance.Brightness(r).enhance(0.85)
    return [r, r.width / 2, r.height]

def walk_cycle(fr, amp=18, lift=0):
    f = []
    # frame 1: front leg swings in (towards centre), back leg holds
    f.append(legs_transform(fr, lambda t, s: (-amp if s > 0 else amp * 0.35) * t, lift=lift))
    f.append(legs_transform(fr, lambda t, s: (-amp * 1.4 if s > 0 else amp * 1.4) * t, lift=lift))
    f.append(legs_transform(fr, lambda t, s: (-amp * 0.35 if s > 0 else amp) * t, lift=lift))
    f.append(fr)
    return f

def crop(fr, pad=2):
    im, ax, ay = fr
    im = binarize(im)
    bb = im.getchannel('A').getbbox()
    l, t, r, b = max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad)
    return [im.crop((l, t, r, b)), ax - l, ay - t]

frames = {}

# ---------------- GUF ----------------
g_idle = frame(load('guf_idle'))
g_punch = frame(load('guf_hurt'))          # mislabeled: actually a jab
g_smoke = frame(load('guf_light_attack'))  # smaller-scale smoke breath
g_smoke = scale_about(g_smoke, 238 / 186)
frames['guf'] = {
    'idle': g_idle,
    'walk': walk_cycle(g_idle),
    'crouch': squat(g_idle),
    'jump': frame(load('guf_crouch')),     # mislabeled: actually airborne knee-up
    'light': g_punch,
    'heavy': frame(load('guf_heavy_attack')),
    'special': g_smoke,
    'hurt': rotate_about_feet(g_idle, 11, pivot_dx=-20),
    'win': g_idle,
    'ko': lie_down(g_idle),
}

# ---------------- NOIZE ----------------
n_idle = frame(load('noize_idle'))
n_guitar = scale_about(frame(load('noize_special')), 238 / 186)
frames['noize'] = {
    'idle': n_idle,
    'walk': walk_cycle(n_idle),
    'crouch': squat(n_idle),
    'jump': frame(load('noize_crouch')),   # mislabeled: actually airborne
    'light': frame(load('noize_light_attack')),
    'heavy': frame(load('noize_heavy_attack')),
    'special': n_guitar,
    'hurt': rotate_about_feet(n_idle, 11, pivot_dx=-20),
    'win': n_guitar,                       # rocking the guitar = victory
    'ko': lie_down(n_idle),
}

# ---------------- OXXXY ----------------
o_idle = frame(load('oxxxy_idle'))
o_sp = frame(load('oxxxy_special'), ax=96)
frames['oxxxy'] = {
    'idle': o_idle,
    'walk': walk_cycle(o_idle, amp=12),
    'crouch': frame(load('oxxxy_crouch')),
    'jump': frame(load('oxxxy_jump')),
    'light': frame(load('oxxxy_light_attack')),
    'heavy': frame(load('oxxxy_heavy_attack')),
    'special': o_sp,
    'hurt': frame(load('oxxxy_hurt')),
    'win': o_idle,
    'ko': lie_down(o_idle),
}

# ---------------- MORGEN ----------------
m_idle = frame(load('morgen_idle'))
m_w1, m_w2 = frame(load('morgen_walk_1')), frame(load('morgen_walk_2'))
frames['morgen'] = {
    'idle': m_idle,
    'walk': [m_w1, m_idle, m_w2, m_idle],
    'crouch': frame(load('morgen_crouch')),
    'jump': frame(load('morgen_jump')),
    'light': frame(load('morgen_light_attack')),
    'heavy': frame(load('morgen_heavy_attack')),
    'special': frame(load('morgen_win')),  # finger up: "calling the Cadillac"
    'hurt': frame(load('morgen_hurt')),
    'win': frame(load('morgen_win')),
    'ko': lie_down(m_idle),
    'lose': frame(load('morgen_lose')),
}

meta = {}
for cid, states in frames.items():
    meta[cid] = {}
    if 'lose' not in states:
        states['lose'] = states['ko']
    for st, fr in states.items():
        lst = fr if st == 'walk' else [fr]
        for i, f in enumerate(lst):
            name = f'{st}_{i + 1}' if st == 'walk' else st
            im, ax, ay = crop(f)
            path = f'{OUT}/{cid}_{name}.png'
            im.save(path, optimize=True)
            meta[cid][name] = {'src': f'assets/sprites/{cid}_{name}.png', 'ax': round(ax), 'ay': round(ay)}

json.dump(meta, open('sprite_meta.json', 'w'), indent=1)
print('ok', sum(len(v) for v in meta.values()), 'frames')
