#!/usr/bin/env python3
"""Convierte el material generado con ElevenLabs en los assets del juego.

Uso:  python3 build_assets.py RAW_DIR
  RAW_DIR contiene scenes/, sheets/, ui/, voz/, musica/, sfx/ con lo descargado.

Genera, dentro de ../assets:
  img/scenes/<id>.webp           fondos de escena (2048x1152)
  img/scenes/<id>_postal.webp    postales para el rompecabezas
  img/objects/<id>.webp          atlas de objetos con transparencia
  img/ui/*.webp                  logo, cartel, título, mapa, retratos, dorso
  audio/voz, audio/musica, audio/sfx  (mp3 optimizados)
  ../js/atlas.js                 rectángulos de cada objeto en su atlas
"""
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from extract_sprites import build_alpha, extract  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ASSETS = os.path.join(ROOT, 'assets')

# variante elegida de cada escena y de su postal
SCENES = {
    'caminito': ('caminito_a', 'caminito_d'),
    'santelmo': ('santelmo_a', 'santelmo_c'),
    'cafe': ('cafe_c', 'cafe_a'),
    'colon': ('colon_a', 'colon_d'),
    'libreria': ('libreria_c', 'libreria_a'),
    'madero': ('madero_a', 'madero_c'),
    'palermo': ('palermo_a', 'palermo_c'),
    'corrientes': ('corrientes_d', 'corrientes_c'),
}
SHEETS = {k: f'{k}_a' for k in SCENES}


def save_webp(img, path, quality=82, **kw):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, 'WEBP', quality=quality, method=6, **kw)
    return os.path.getsize(path)


def pack(sprites, pad=2, width=1024):
    """Empaquetado por estantes: devuelve (W, H, posiciones)."""
    order = sorted(range(len(sprites)), key=lambda i: -sprites[i].height)
    x = y = shelf = 0
    pos = [None] * len(sprites)
    for i in order:
        w, h = sprites[i].size
        if x + w + pad > width:
            x, y, shelf = 0, y + shelf + pad, 0
        pos[i] = (x, y)
        x += w + pad
        shelf = max(shelf, h)
    return width, y + shelf, pos


def build_images(raw):
    total = 0
    for sid, (main, postal) in SCENES.items():
        im = Image.open(os.path.join(raw, 'scenes', main + '.png')).convert('RGB')
        total += save_webp(im, os.path.join(ASSETS, 'img/scenes', sid + '.webp'), 80)
        pc = Image.open(os.path.join(raw, 'scenes', postal + '.png')).convert('RGB').resize((1600, 900), Image.LANCZOS)
        total += save_webp(pc, os.path.join(ASSETS, 'img/scenes', sid + '_postal.webp'), 80)

    atlas = {}
    tmp = os.path.join(raw, '_sprites')
    for sid, sheet in SHEETS.items():
        names = extract(os.path.join(raw, 'sheets', sheet + '.png'), 4, 4, os.path.join(tmp, sid), sid + '_', 260)
        sprites = [Image.open(os.path.join(tmp, sid, n)) for n in names]
        W, H, pos = pack(sprites)
        sheet_img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        rects = {}
        for n, s, (x, y) in zip(names, sprites, pos):
            sheet_img.paste(s, (x, y))
            rects[n[:-4]] = [x, y, s.width, s.height]
        total += save_webp(sheet_img, os.path.join(ASSETS, 'img/objects', sid + '.webp'), 88, exact=True)
        atlas[sid] = {'size': [W, H], 'rects': rects}
        print(f'  atlas {sid}: {W}x{H}, {len(names)} objetos')

    js = 'window.BAE_ATLAS = ' + json.dumps(atlas, separators=(',', ':')) + ';\n'
    with open(os.path.join(ROOT, 'js', 'atlas.js'), 'w') as f:
        f.write('// Generado por tools/build_assets.py — rectángulos [x, y, ancho, alto] de cada objeto.\n' + js)

    ui = os.path.join(raw, 'ui')
    # logo: cartel negro sobre fondo blanco -> recorte con transparencia
    logo = Image.open(os.path.join(ui, 'logo_a.png')).convert('RGB')
    rgb = np.asarray(logo).astype(np.float32)
    obj = build_alpha(rgb)
    from scipy import ndimage
    alpha = ndimage.gaussian_filter(ndimage.binary_erosion(obj, iterations=1).astype(np.float32), 0.9)
    rgba = np.dstack([rgb, np.clip(alpha * 1.1, 0, 1) * 255]).astype(np.uint8)
    ys, xs = np.where(alpha > 0.05)
    crop = Image.fromarray(rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA')
    crop.thumbnail((1400, 1400), Image.LANCZOS)
    total += save_webp(crop, os.path.join(ASSETS, 'img/ui/logo.webp'), 90, exact=True)

    def plain(src, dst, size=None, q=82):
        im = Image.open(os.path.join(ui, src)).convert('RGB')
        if size:
            im = im.resize(size, Image.LANCZOS)
        return save_webp(im, os.path.join(ASSETS, 'img/ui', dst), q)

    total += plain('cartel_a.png', 'cartel.webp', (1600, 800), 86)
    total += plain('titulo_a.png', 'titulo.webp', None, 80)
    total += plain('mapa_c.png', 'mapa.webp', None, 80)
    total += plain('flor_a.png', 'flor.webp', (512, 512), 84)
    total += plain('ernesto_c.png' if os.path.exists(os.path.join(ui, 'ernesto_c.png')) else 'ernesto_a.png', 'ernesto.webp', (512, 512), 84)
    total += plain('dorso_a.png', 'dorso.webp', (400, 400), 84)
    print(f'  imágenes: {total / 1e6:.1f} MB')


def ff(args):
    subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'error', '-y'] + args, check=True, stdin=subprocess.DEVNULL, timeout=120)


def build_audio(raw):
    out = os.path.join(ASSETS, 'audio')
    for d in ('voz', 'musica', 'sfx'):
        os.makedirs(os.path.join(out, d), exist_ok=True)
    trim = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05'
    tmp = os.path.join(raw, '_tmp.wav')
    for f in sorted(os.listdir(os.path.join(raw, 'voz'))):
        src = os.path.join(raw, 'voz', f)
        # en dos pasadas: silenceremove + loudnorm encadenados a veces cuelgan a ffmpeg
        ff(['-i', src, '-af', trim, '-ac', '1', '-ar', '44100', tmp])
        ff(['-i', tmp, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ac', '1', '-ar', '44100', '-b:a', '64k',
            os.path.join(out, 'voz', f)])
    if os.path.exists(tmp):
        os.remove(tmp)
    for f in sorted(os.listdir(os.path.join(raw, 'musica'))):
        ff(['-i', os.path.join(raw, 'musica', f), '-af', 'loudnorm=I=-20:TP=-2:LRA=11', '-ar', '44100', '-b:a', '112k',
            os.path.join(out, 'musica', f)])
    sfx = {'encontrado': 'encontrado', 'error': 'error', 'pista': 'pista', 'nivel_a': 'nivel', 'carta': 'carta',
           'pieza': 'pieza', 'tranvia': 'tranvia', 'papel': 'papel'}
    for src, dst in sfx.items():
        ff(['-i', os.path.join(raw, 'sfx', src + '.mp3'), '-af', 'loudnorm=I=-18:TP=-1.5:LRA=11', '-ac', '1',
            '-ar', '44100', '-b:a', '96k', os.path.join(out, 'sfx', dst + '.mp3')])
    size = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(out) for f in fs)
    print(f'  audio: {size / 1e6:.1f} MB')


if __name__ == '__main__':
    raw = sys.argv[1]
    os.makedirs(os.path.join(ROOT, 'js'), exist_ok=True)
    what = sys.argv[2] if len(sys.argv) > 2 else 'all'
    if what in ('all', 'img'):
        build_images(raw)
    if what in ('all', 'audio'):
        build_audio(raw)
