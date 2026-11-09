#!/usr/bin/env python3
"""Recorta los objetos de una hoja de sprites (fondo blanco, grilla N x M)
y los guarda con transparencia.

Uso:
  python3 extract_sprites.py HOJA.png FILAS COLUMNAS CARPETA_SALIDA PREFIJO [--max 300]

Pasos:
  1. Marca como fondo el blanco conectado al borde y los "agujeros" blancos
     planos (el hueco de un asa, el aro de un ancla).
  2. Erosiona 1 px, suaviza el borde y copia el color del interior al borde
     para que no quede halo blanco al componer sobre la escena.
  3. Agrupa los componentes por celda de la grilla y recorta cada objeto.
"""
import argparse
import os

import numpy as np
from PIL import Image
from scipy import ndimage


def build_alpha(rgb):
    d = 255.0 - rgb.min(axis=2)  # cuánto se aleja del blanco el canal más oscuro
    near_white = d < 16
    lab, n = ndimage.label(near_white)
    if n == 0:
        return np.ones(d.shape, bool)
    idx = np.arange(1, n + 1)
    area = ndimage.sum(np.ones_like(d), lab, idx)
    mean_d = ndimage.mean(d, lab, idx)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    border.discard(0)
    is_bg = np.zeros(n + 1, bool)
    for i, a, m in zip(idx, area, mean_d):
        if i in border or (a > 250 and m < 5.0):
            is_bg[i] = True
    bg = is_bg[lab]
    obj = ~bg
    # quitar motas sueltas
    lab2, n2 = ndimage.label(obj)
    if n2:
        areas = ndimage.sum(np.ones_like(d), lab2, np.arange(1, n2 + 1))
        small = np.zeros(n2 + 1, bool)
        small[1:] = areas < 400
        obj[small[lab2]] = False
    return obj


def extract(path, rows, cols, outdir, prefix, max_side=300):
    im = Image.open(path).convert('RGB')
    rgb = np.asarray(im).astype(np.float32)
    H, W, _ = rgb.shape
    obj = build_alpha(rgb)

    core = ndimage.binary_erosion(obj, iterations=1)
    alpha = ndimage.gaussian_filter(core.astype(np.float32), sigma=0.9)
    alpha = np.clip(alpha * 1.15, 0, 1)
    alpha[~ndimage.binary_dilation(obj, iterations=1)] = 0

    # color del borde = color del pixel interior más cercano (sin halo blanco)
    _, (iy, ix) = ndimage.distance_transform_edt(~core, return_indices=True)
    fixed = rgb[iy, ix]
    rgba = np.dstack([fixed, alpha * 255]).astype(np.uint8)

    lab, n = ndimage.label(alpha > 0.05, structure=np.ones((3, 3)))
    objs = ndimage.find_objects(lab)
    cells = {}
    cw, ch = W / cols, H / rows
    for i, sl in enumerate(objs, start=1):
        if sl is None:
            continue
        ys, xs = sl
        cy = (ys.start + ys.stop) / 2
        cx = (xs.start + xs.stop) / 2
        r = min(rows - 1, int(cy // ch))
        c = min(cols - 1, int(cx // cw))
        area = int((lab[sl] == i).sum())
        cells.setdefault((r, c), []).append((sl, i, area))

    os.makedirs(outdir, exist_ok=True)
    out = []
    for r in range(rows):
        for c in range(cols):
            parts = cells.get((r, c), [])
            if not parts:
                print(f'  celda {r},{c}: vacía')
                continue
            big = max(p[2] for p in parts)
            parts = [p for p in parts if p[2] > big * 0.02]
            y0 = min(p[0][0].start for p in parts)
            y1 = max(p[0][0].stop for p in parts)
            x0 = min(p[0][1].start for p in parts)
            x1 = max(p[0][1].stop for p in parts)
            keep = np.zeros(lab.shape, bool)
            for sl, i, _ in parts:
                keep[sl] |= lab[sl] == i
            pad = 3
            y0, x0 = max(0, y0 - pad), max(0, x0 - pad)
            y1, x1 = min(H, y1 + pad), min(W, x1 + pad)
            crop = rgba[y0:y1, x0:x1].copy()
            crop[..., 3] = np.where(keep[y0:y1, x0:x1], crop[..., 3], 0)
            sprite = Image.fromarray(crop, 'RGBA')
            s = max_side / max(sprite.size)
            if s < 1:
                sprite = sprite.resize((max(1, round(sprite.width * s)), max(1, round(sprite.height * s))), Image.LANCZOS)
            k = r * cols + c + 1
            name = f'{prefix}{k:02d}.png'
            sprite.save(os.path.join(outdir, name))
            out.append(name)
    return out


def contact(outdir, names, dest, label_prefix=''):
    from PIL import ImageDraw
    tiles = [Image.open(os.path.join(outdir, n)) for n in names]
    S = 180
    cols = 8
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * S, rows * (S + 18)), (70, 90, 80))
    dr = ImageDraw.Draw(sheet)
    for i, t in enumerate(tiles):
        x, y = (i % cols) * S, (i // cols) * (S + 18)
        # tablero para ver bordes
        for yy in range(0, S, 20):
            for xx in range(0, S, 20):
                if (xx // 20 + yy // 20) % 2:
                    dr.rectangle([x + xx, y + yy, x + xx + 19, y + yy + 19], fill=(95, 115, 105))
        t2 = t.copy()
        t2.thumbnail((S - 10, S - 10))
        sheet.paste(t2, (x + (S - t2.width) // 2, y + (S - t2.height) // 2), t2)
        dr.text((x + 4, y + S + 2), label_prefix + names[i], fill='white')
    sheet.save(dest, quality=88)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('sheet')
    ap.add_argument('rows', type=int)
    ap.add_argument('cols', type=int)
    ap.add_argument('outdir')
    ap.add_argument('prefix')
    ap.add_argument('--max', type=int, default=300)
    ap.add_argument('--contact')
    a = ap.parse_args()
    names = extract(a.sheet, a.rows, a.cols, a.outdir, a.prefix, a.max)
    print(len(names), 'sprites')
    if a.contact:
        contact(a.outdir, names, a.contact)
