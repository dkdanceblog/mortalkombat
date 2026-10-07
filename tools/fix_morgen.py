"""Clean Morgenshtern frames: fill small holes, close edge notches, solid dark outline."""
import sys, glob, os
import numpy as np
from PIL import Image
from scipy import ndimage
OUT = sys.argv[1]
K8 = np.ones((3, 3), int)
def fix(path):
    a = np.array(Image.open(path).convert('RGBA')).astype(np.int32)
    op = a[:, :, 3] > 0
    def fill_from_neighbours(mask):
        # colour each pixel in mask with the mean of its opaque neighbours (iteratively inward)
        todo = mask.copy()
        for _ in range(12):
            if not todo.any(): break
            w = ndimage.convolve(op.astype(int), K8, mode='constant')
            ready = todo & (w > 0)
            for ch in range(3):
                s = ndimage.convolve(np.where(op, a[:, :, ch], 0), K8, mode='constant')
                a[:, :, ch] = np.where(ready, s // np.maximum(w, 1), a[:, :, ch])
            a[:, :, 3] = np.where(ready, 255, a[:, :, 3]); op[ready] = True; todo &= ~ready
    # 1. small enclosed holes (<= 20 px) -> filled
    holes = ndimage.binary_fill_holes(op) & ~op
    lab, n = ndimage.label(holes)
    if n:
        sizes = ndimage.sum(holes, lab, range(1, n + 1))
        small = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s <= 20])
        fill_from_neighbours(small)
    # 2. edge notches: transparent pixels hugged by >= 5 opaque neighbours (twice)
    for _ in range(2):
        nb = ndimage.convolve(op.astype(int), K8, mode='constant') - op
        notch = ~op & (nb >= 5)
        fill_from_neighbours(notch)
    # 3. lone spikes: opaque pixels with <= 2 opaque neighbours
    nb = ndimage.convolve(op.astype(int), K8, mode='constant') - op
    spike = op & (nb <= 2)
    a[spike, 3] = 0; op[spike] = False
    # 3b. light specks near the contour (leftover halo of the old background): replace with neighbour median
    depth = ndimage.distance_transform_edt(op)
    ring = op & (depth <= 3.5)
    lum = a[:, :, :3].mean(2)
    med = ndimage.median_filter(np.where(op, lum, 0), size=3)
    speck = ring & (lum > med + 60)
    if speck.any():
        for ch in range(3):
            m = ndimage.median_filter(a[:, :, ch], size=3)
            a[:, :, ch] = np.where(speck, m, a[:, :, ch])
    # 4. solid dark outline on the contour (like the other fighters)
    edge = op & ~ndimage.binary_erosion(op, structure=np.ones((3, 3)))
    lum = a[:, :, :3].mean(2)
    dark = np.array([22, 15, 20])
    sel = edge & (lum > 45)
    a[sel, :3] = dark
    im = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')
    return im, int(n), int(spike.sum())
for p in sorted(glob.glob('assets_png_full/sprites/morgen_*.png')):
    im, nh, ns = fix(p)
    im.save(os.path.join(OUT, os.path.basename(p)))
    print(os.path.basename(p), 'holes', nh, 'spikes', ns)
