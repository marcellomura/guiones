#!/usr/bin/env python3
"""Arreglo de cumbia folclorica argentina (epica) a partir del MIDI original.

Uso: python3 -I arrange.py <midi_original> <midi_salida> <dir_src>
"""
import sys, math, random
sys.path.insert(0, sys.argv[3])
import mido
from load import load

SRC, OUT = sys.argv[1], sys.argv[2]
random.seed(20261120)
TPB = 480
orig, OT = load(SRC)
OTPB = orig.ticks_per_beat
MEL, CHO, CEL, GTR = 3, 4, 5, 6   # pistas del original: verso, estribillo, puente (falsete), guitarra/arpegio

# ---------------------------------------------------------------- canales
SIK1, SIK2, QUENA, ACC, BAND, CHAR, GUIT, BASS, STR, DR, CHOIR, BOMBO, TIMP, HARP, CBD, OOHS = range(16)
SETUP = {  # ch: (nombre, bank, program, vol, pan, reverb, chorus)
    SIK1:  ('Sikus (flauta de pan) 1', 0, 75, 127, 60, 62, 0),
    SIK2:  ('Sikus (flauta de pan) 2 - octava', 0, 75, 104, 72, 62, 0),
    QUENA: ('Quena', 0, 73, 96, 86, 58, 0),
    ACC:   ('Acordeon', 8, 21, 120, 82, 42, 12),
    BAND:  ('Bandoneon', 0, 23, 127, 58, 52, 0),
    CHAR:  ('Charango', 8, 24, 64, 34, 40, 55),
    GUIT:  ('Guitarra criolla', 0, 24, 92, 94, 42, 0),
    BASS:  ('Bajo', 0, 33, 88, 64, 12, 0),
    STR:   ('Cuerdas', 0, 49, 84, 64, 78, 0),
    DR:    ('Percusion cumbia (guiro, tumbadoras, timbales)', 0, 0, 96, 64, 34, 0),
    CHOIR: ('Coro', 0, 52, 80, 64, 82, 0),
    BOMBO: ('Bombo leguero', 0, 116, 100, 64, 46, 0),
    TIMP:  ('Timbales sinfonicos', 0, 47, 80, 60, 62, 0),
    HARP:  ('Arpa', 0, 46, 90, 40, 72, 0),
    CBD:   ('Bombo leguero (parche)', 8, 116, 58, 64, 46, 0),
    OOHS:  ('Voces', 0, 53, 110, 48, 78, 0),
}

notes, ccs, progs = [], [], []

def N(ch, start, dur, pitch, vel, jit=0.0):
    if jit:
        start += random.gauss(0, jit)
    vel = int(max(1, min(127, round(vel + (random.uniform(-4, 4) if jit else 0)))))
    notes.append((ch, max(0.0, start), max(0.03, dur), int(pitch), vel))

def CC(ch, beat, ctl, val):
    ccs.append((ch, max(0.0, beat), ctl, int(max(0, min(127, round(val))))))

def ramp(ch, ctl, b0, b1, v0, v1, step=0.25):
    k = max(1, int(round((b1 - b0) / step)))
    for i in range(k + 1):
        CC(ch, b0 + (b1 - b0) * i / k, ctl, v0 + (v1 - v0) * i / k)

def B(bar, beat=0.0):
    return (bar - 1) * 4 + beat

# ---------------------------------------------------------------- armonia
CYCLE = ['G', 'B', 'C', 'Cm']
CHORD = {'G': [7, 11, 2], 'B': [11, 3, 6], 'C': [0, 4, 7], 'Cm': [0, 3, 7]}
ROOT = {'G': 7, 'B': 11, 'C': 0, 'Cm': 0}
SCALE = {'G': {7, 9, 11, 0, 2, 4, 6}, 'B': {11, 0, 3, 4, 6, 7, 9},
         'C': {0, 2, 4, 6, 7, 9, 11}, 'Cm': {0, 2, 3, 5, 7, 8, 10}}
LAST = 105

def chord_bar(bar):
    return 'G' if bar >= LAST else CYCLE[((bar - 1) // 2) % 4]

def chord_beat(b):
    return chord_bar(int(b // 4) + 1)

def section(bar):
    for lim, name in ((8, 'PRE'), (16, 'INTRO'), (32, 'V1'), (40, 'C1'), (56, 'V2'), (64, 'C2'),
                      (72, 'B1'), (78, 'B2'), (80, 'BRK'), (88, 'Q'), (94, 'F'), (95, 'FBRK'),
                      (96, 'FBLD'), (104, 'CODA')):
        if bar <= lim:
            return name
    return 'END'

# ---------------------------------------------------------------- melodias del original
def ob(n): return n['s'] / OTPB
def od(n): return n['d'] / OTPB

def clean(lst):
    lst.sort()
    out = []
    for s, d, p in lst:
        if d < 0.06:
            continue
        if out and abs(s - out[-1][0]) < 0.05:
            if d > out[-1][1]:
                out[-1] = [s, d, p]
            continue
        out.append([s, d, p])
    for i in range(len(out) - 1):
        out[i][1] = min(out[i][1], out[i + 1][0] - out[i][0] - 0.04)
    return out

def take(track, from_bar, from_beat, to_bar, shift_bars, clip_at=None):
    lo, hi = B(from_bar, from_beat), B(to_bar)
    res = [[ob(n) + shift_bars * 4, od(n), n['p']] for n in OT[track] if lo <= ob(n) < hi]
    res = clean(res)
    if clip_at is not None:
        for r in res:
            if r[0] < clip_at:
                r[1] -= clip_at - r[0]
                r[0] = clip_at
    return [r for r in res if r[1] > 0.05]

def third_below(p, ch):
    cands = (p - 3, p - 4)
    for c in cands:
        if c % 12 in CHORD[ch]:
            return c
    for c in cands:
        if c % 12 in SCALE[ch]:
            return c
    return p - 3

def breath_vibrato(ch, s, d, base=112, depth=8, rate_hz=5.2, delay=0.4):
    """vibrato de soplido (expresion CC11) en notas largas de vientos andinos"""
    if d < 1.2:
        CC(ch, s, 11, base)
        return
    CC(ch, s, 11, base)
    bpm = 93.0
    t = s + delay
    while t < s + d - 0.1:
        sec = (t - s) * 60.0 / bpm
        CC(ch, t, 11, base + depth * math.sin(2 * math.pi * rate_hz * sec))
        t += 0.0625
    CC(ch, s + d, 11, base)

def play_lead(ch, lst, vel, jit=0.006, grace=False, vib=True, octave=0, vel_long=8, vib_depth=8):
    for s, d, p in lst:
        v = vel + (vel_long if d >= 1.0 else 0) - (8 if d < 0.25 else 0)
        if grace and d >= 1.5:
            sc = sorted(x for x in range(p + 1, p + 4) if x % 12 in SCALE[chord_beat(s)])
            if sc:
                N(ch, s - 0.09, 0.08, sc[0] + octave, v - 14)
        N(ch, s, d, p + octave, v, jit)
        if vib:
            breath_vibrato(ch, s, d, depth=vib_depth)

def play_thirds(ch, lst, vel, with_melody=False, mvel=None, jit=0.008):
    for s, d, p in lst:
        h = third_below(p, chord_beat(s))
        N(ch, s, d, h, vel + (6 if d >= 1.0 else 0), jit)
        if with_melody:
            N(ch, s, d, p, (mvel or vel) + (6 if d >= 1.0 else 0), jit)

# --- tramos melodicos (compases del original -> compases nuevos)
pre_cel   = take(CEL, 64, 3.9, 73, -64, clip_at=0.0)          # 1-8   "ruuun" (puente) como llamado epico
intro_cho = take(CHO, 24, 1.5, 32, -16)                       # 8-16  estribillo instrumental (acordeon)
v1_mel    = take(MEL, 8, 1.5, 24, 8)                          # 16-32 verso 1 (sikus)
c1_cho    = take(CHO, 24, 1.5, 32, 8)                         # 32-40 estribillo 1
v2_mel    = take(MEL, 32, 1.5, 48, 8)                         # 40-56 verso 2 (acordeon a dos voces)
c2_cho    = take(CHO, 48, 1.5, 57, 8)                         # 56-64 estribillo 2
br_cel    = take(CEL, 57, 0.0, 73, 8)                         # 65-80 puente (sikus en octavas)
q_mel     = take(MEL, 72, 1.0, 81, 8)                         # 80-88 verso tranquilo (bandoneon)
f_cho     = take(CHO, 80, 1.5, 90, 8)                         # 88-97 estribillo final
coda_cel  = take(CEL, 64, 3.9, 73, 32)                        # 96-104 coda: "ruuun" triunfal
coda_cho  = take(CHO, 81, 0.0, 90, 16)                        # 97-105 coda: estribillo de contracanto

# ================================================================= MELODIAS
# Preintro: sikus en octava (tropa), con adornos de soplido
for n in pre_cel:  # crescendo a lo largo de la preintro
    bar = int(n[0] // 4) + 1
    play_lead(SIK1, [n], 64 + 5 * bar, grace=True)
    play_lead(SIK2, [n], 50 + 5 * bar, grace=False, octave=-12, vib_depth=6)
# Intro: acordeon a dos voces con el estribillo
play_thirds(ACC, intro_cho, 80, with_melody=True, mvel=96)
# Verso 1: sikus
play_lead(SIK1, v1_mel, 92)
# Estribillo 1: sikus + quena una octava arriba + acordeon en terceras
play_lead(SIK1, c1_cho, 104)
play_lead(QUENA, c1_cho, 70, octave=12, vib_depth=6)
play_thirds(ACC, c1_cho, 82)
# Verso 2: acordeon lleva la melodia a dos voces
play_thirds(ACC, v2_mel, 80, with_melody=True, mvel=98)
# Estribillo 2
play_lead(SIK1, c2_cho, 106)
play_lead(QUENA, [n for n in c2_cho if n[2] <= 72], 72, octave=12, vib_depth=6)
play_thirds(ACC, c2_cho, 84)
# Puente: sikus en octavas, con adornos
play_lead(SIK1, br_cel, 112, grace=True, vib_depth=9)
play_lead(SIK2, br_cel, 92, octave=-12, vib_depth=7)
# Verso tranquilo: bandoneon
for s, d, p in q_mel:
    v = 108 + (10 if d >= 1.0 else 0)
    N(BAND, s, d, p, v, 0.006)
    CC(BAND, s, 11, 100)
    if d >= 1.5:
        ramp(BAND, 11, s + 0.3, s + d - 0.05, 100, 120, step=0.25)
# Estribillo final: sikus hasta el "I don't belong", despues pasan al vuelo de la coda
f_split = B(96, 3.4)
f_sik = [n for n in f_cho if n[0] < f_split]
f_end = [n for n in f_cho if n[0] >= f_split]          # B4 + G4 final ("here")
play_lead(SIK1, f_sik, 112)
play_lead(QUENA, [n for n in f_sik if n[0] < B(96, 2.4)], 74, octave=12, vib_depth=6)
play_thirds(ACC, f_sik, 88)
for s, d, p in f_sik:
    N(OOHS, s, d, p - 12, 90, 0.006)
for s, d, p in f_end:
    play_thirds(ACC, [[s, d, p]], 88, with_melody=True, mvel=104)
    N(OOHS, s, d, p - 12, 94, 0.006)
# Coda: sikus en octavas con el "ruuun" + acordeon y voces con el estribillo (contracanto)
play_lead(SIK1, coda_cel, 116, grace=True, vib_depth=9)
play_lead(SIK2, coda_cel, 96, octave=-12, vib_depth=7)
coda_body = [n for n in coda_cho if n[0] < B(LAST)]
coda_last = [n for n in coda_cho if n[0] >= B(LAST)]
play_thirds(ACC, coda_body, 86, with_melody=True, mvel=102)
for s, d, p in coda_body:
    N(OOHS, s, d, p - 12, 92, 0.006)

# ================================================================= PERCUSION (canal 10)
KICK, SIDE, CRASH, CRASH2, MCONGA, OCONGA, LCONGA, HTIMB, LTIMB, MARACA, SGUIRO, LGUIRO, LWOOD = \
    36, 37, 49, 57, 62, 63, 64, 65, 66, 70, 73, 74, 77

def D(beat, key, vel, dur=0.2, jit=0.008):
    N(DR, beat, dur, key, vel, jit)

def guiro_bar(bar, lvl):
    for bt in range(4):
        b = B(bar, bt)
        D(b, LGUIRO, 76 * lvl, 0.4)
        D(b + 0.5, SGUIRO, 58 * lvl, 0.15)
        D(b + 0.75, SGUIRO, 64 * lvl, 0.15)

def conga_bar(bar, lvl, full):
    for half in (0, 2):
        b = B(bar, half)
        D(b, MCONGA, 50 * lvl)
        D(b + 0.5, OCONGA, 84 * lvl)
        D(b + 1.0, MCONGA, 46 * lvl)
        D(b + 1.5, OCONGA, 80 * lvl)
        if full:
            D(b + 1.75, LCONGA, 68 * lvl)

def kick_bar(bar, lvl, four=False):
    for bt in ((0, 1, 2, 3) if four else (0, 2)):
        D(B(bar, bt), KICK, (96 if bt == 0 else 86) * lvl, 0.3)

def maraca_bar(bar, lvl):
    for i in range(8):
        D(B(bar, i * 0.5), MARACA, (44 if i % 2 == 0 else 62) * lvl, 0.1)

def timb_fill(bar, start, v0=60, v1=112, end=4.0):
    k = int(round((end - start) * 4))
    pat = (HTIMB, HTIMB, LTIMB, LTIMB)
    for i in range(k):
        D(B(bar, start + i * 0.25), pat[i % 4], v0 + (v1 - v0) * i / max(1, k - 1), 0.15, 0.005)

def crash(bar, vel=104, both=False):
    D(B(bar), CRASH, vel, 2.0, 0.0)
    if both:
        D(B(bar) + 0.01, CRASH2, vel - 8, 2.0, 0.0)

# ================================================================= BOMBO LEGUERO
def bombo(beat, vel, aro=False):
    if aro:
        D(beat, LWOOD, vel * 0.85, 0.12, 0.006)
    else:
        N(BOMBO, beat, 1.2, 43, vel, 0.006)
        N(CBD, beat, 1.0, 40, vel * 0.72, 0.006)

def bombo_bar(bar, style):
    b = B(bar)
    if style == 'heart':
        bombo(b, 100); bombo(b + 0.5, 72); bombo(b + 2, 92); bombo(b + 2.5, 66)
    elif style == 'heart_aro':
        bombo(b, 102); bombo(b + 0.5, 74); bombo(b + 1.5, 52, True)
        bombo(b + 2, 94); bombo(b + 2.5, 68); bombo(b + 3.5, 56, True)
    elif style == 'light':
        bombo(b, 78); bombo(b + 1.5, 46, True); bombo(b + 2, 62); bombo(b + 3.5, 48, True)
    elif style == 'full':
        bombo(b, 98); bombo(b + 1.5, 58, True); bombo(b + 1.75, 70); bombo(b + 2, 90)
        bombo(b + 3.5, 60, True)
        if bar % 2 == 0:
            bombo(b + 3.75, 66)
    elif style == 'tresillo':
        bombo(b, 112); bombo(b + 0.75, 52, True); bombo(b + 1.5, 96); bombo(b + 2.25, 52, True)
        bombo(b + 3, 100)
        if bar % 2 == 0:
            bombo(b + 3.5, 80)
    elif style == 'soft':
        bombo(b, 56); bombo(b + 0.5, 40)

def bombo_roll(b0, b1, v0, v1, step=0.25):
    k = int(round((b1 - b0) / step))
    for i in range(k):
        bombo(b0 + i * step, v0 + (v1 - v0) * i / max(1, k - 1))

# ================================================================= BAJO
BASSRF = {'G': (31, 38), 'B': (35, 30), 'C': (36, 31), 'Cm': (36, 31)}

def bass_walk(bar, lvl=1.0):
    b = B(bar)
    for off, p, v in ((0, 36, 100), (1, 38, 92), (2, 39, 96), (3, 41, 94), (3.5, 38, 90)):
        N(BASS, b + off, 0.45 if off < 3 else 0.42, p, v * lvl, 0.006)

def bass_bar(bar, style):
    ch = chord_bar(bar)
    nxt = chord_bar(bar + 1)
    r, f = BASSRF[ch]
    b = B(bar)
    if style in ('full', 'light') and bar % 8 == 0:
        bass_walk(bar, 1.0 if style == 'full' else 0.85)
        return
    approach = None
    if nxt != ch and ROOT[nxt] != ROOT[ch]:
        approach = BASSRF[nxt][0] - 1
    if style == 'full':
        seq = [(0, r, 0.55, 100), (1, f, 0.45, 86), (1.5, f, 0.38, 74), (2, r, 0.55, 96), (3, f, 0.45, 86),
               (3.5, approach if approach else f, 0.4, 80)]
    elif style == 'light':
        seq = [(0, r, 0.9, 88), (1, f, 0.45, 74), (2, r, 0.9, 84), (3, f, 0.45, 74)]
        if approach:
            seq.append((3.5, approach, 0.4, 70))
    elif style == 'quiet':
        seq = [(0, r, 1.9, 60), (2, f, 1.9, 52)]
    else:
        seq = []
    for off, p, d, v in seq:
        N(BASS, b + off, d, p, v, 0.006)

# ================================================================= CHARANGO (rasguido)
def voicing(ch, lo=62, hi=76, n=4):
    ps = [p for p in range(lo, hi + 1) if p % 12 in CHORD[ch]]
    return ps[-n:]

def strum(beat, vel, dur, up=False, ch_name=None, spread=0.014, chan=CHAR):
    chn = ch_name or chord_beat(beat + 0.01)
    v = voicing(chn)
    order = v[::-1][:3] if up else v
    for i, p in enumerate(order):
        N(chan, beat + i * spread, dur, p, vel - (2 * i if up else 0), 0.004)

def charango_bar(bar, style, lvl=1.0):
    b = B(bar)
    if style == 'rasg':
        for bt in range(4):
            x = b + bt
            strum(x, 66 * lvl, 0.22)
            strum(x + 0.25, 46 * lvl, 0.2, up=True)
            strum(x + 0.5, 90 * lvl, 0.22)
            strum(x + 0.75, 56 * lvl, 0.2, up=True)
    elif style == 'chop':
        for bt in range(4):
            x = b + bt
            strum(x + 0.5, 80 * lvl, 0.16)
            strum(x + 0.75, 48 * lvl, 0.12, up=True)

def charango_trem(b0, b1, v0, v1, step=0.25):
    k = int(round((b1 - b0) / step))
    for i in range(k):
        x = b0 + i * step
        strum(x, v0 + (v1 - v0) * i / max(1, k - 1), step * 1.05, up=(i % 2 == 1))

# ================================================================= GUITARRA CRIOLLA (arpegio del original)
GTR_LVL = {'PRE': 0.62, 'INTRO': 0.8, 'V1': 1.0, 'C1': 0.55, 'V2': 0.95, 'C2': 0.5, 'B1': 0.45, 'B2': 0.45,
           'BRK': 0.8, 'Q': 0.8, 'F': 0.45, 'FBRK': 0.6, 'FBLD': 0.5, 'CODA': 0.45}

def guitar_from(orig_from, orig_to, shift_bars):
    for n in OT[GTR]:
        s = ob(n)
        if B(orig_from) <= s < B(orig_to):
            ns = s + shift_bars * 4
            bar = int(ns // 4) + 1
            lvl = GTR_LVL.get(section(bar), 0.5)
            if section(bar) == 'PRE':
                lvl = 0.5 + 0.035 * bar
            N(GUIT, ns, min(od(n), 2.0), n['p'], n['v'] * lvl, 0.006)

# ================================================================= PADS (cuerdas / coro)
def pad_voicing(ch, root_lo=43, lo=55, hi=71):
    root = next(p for p in range(root_lo, root_lo + 12) if p % 12 == ROOT[ch])
    return [root] + [p for p in range(lo, hi + 1) if p % 12 in CHORD[ch]]

def choir_voicing(ch):
    return [p for p in range(55, 72) if p % 12 in CHORD[ch]]

def pad_block(chan, bar, vel, voices, length=7.9):
    for p in voices:
        N(chan, B(bar), length, p, vel, 0.01)

# ================================================================= TIMBALES SINFONICOS / ARPA
TIMP_P = {'G': 43, 'B': 47, 'C': 48, 'Cm': 48}

def timp_hit(beat, ch, vel):
    N(TIMP, beat, 1.6, TIMP_P[ch], vel, 0.004)

def timp_roll(b0, b1, pitch, v0, v1, step=0.125):
    k = int(round((b1 - b0) / step))
    for i in range(k):
        N(TIMP, b0 + i * step, step * 0.95, pitch, v0 + (v1 - v0) * i / max(1, k - 1), 0.003)

def harp_gliss(beat, dur, ch, lo=43, hi=79, v0=45, v1=85):
    ps = [p for p in range(lo, hi + 1) if p % 12 in CHORD[ch]]
    for i, p in enumerate(ps):
        N(HARP, beat + dur * i / len(ps), 1.6, p, v0 + (v1 - v0) * i / len(ps), 0.002)

# ================================================================= ARMADO POR SECCIONES
# ---------- PREINTRO (1-8): llamado epico
harp_gliss(B(1), 2.0, 'G', 43, 79, 40, 80)
guitar_from(1, 9, 0)
for bar in (1, 3, 5, 7):
    pad_block(STR, bar, 70, pad_voicing(chord_bar(bar)))
ramp(STR, 11, B(1), B(8, 3.5), 34, 118, step=0.5)
for bar in range(3, 7):
    bombo_bar(bar, 'heart' if bar < 5 else 'heart_aro')
bombo_bar(7, 'heart_aro')
bombo(B(8), 104); bombo(B(8, 0.5), 76); bombo(B(8, 1), 80); bombo(B(8, 1.5), 84)
bombo_roll(B(8, 2), B(9), 70, 118)
charango_trem(B(3), B(9), 26, 92)
for bar in (5, 7):
    pad_block(CHOIR, bar, 72, choir_voicing(chord_bar(bar)))
ramp(CHOIR, 11, B(5), B(8, 3.5), 40, 116, step=0.5)
for bar in (5, 6, 7):
    N(BASS, B(bar), 3.9, 36, 66 + 6 * (bar - 5), 0.004)
bass_walk(8, 0.95)
timp_roll(B(8), B(9), 38, 34, 112)
harp_gliss(B(8, 3), 1.0, 'Cm', 48, 79, 50, 90)

# ---------- cuerpo con ritmo de cumbia
def groove(bar, sec):
    ch = chord_bar(bar)
    if sec in ('INTRO', 'C1', 'C2', 'F'):
        lvl = {'INTRO': 0.92, 'C1': 1.0, 'C2': 1.03, 'F': 1.06}[sec]
        guiro_bar(bar, lvl); conga_bar(bar, lvl, True); kick_bar(bar, lvl); maraca_bar(bar, lvl)
        bass_bar(bar, 'full'); charango_bar(bar, 'rasg', lvl)
        bombo_bar(bar, 'full')
    elif sec in ('V1', 'V2'):
        lvl = 0.8 if sec == 'V1' else 0.86
        guiro_bar(bar, lvl); conga_bar(bar, lvl, False); kick_bar(bar, lvl * 0.85)
        if sec == 'V2':
            maraca_bar(bar, 0.6)
        bass_bar(bar, 'light'); charango_bar(bar, 'chop', 0.95)
        bombo_bar(bar, 'light')
    elif sec in ('B1', 'B2', 'CODA'):
        guiro_bar(bar, 1.05); conga_bar(bar, 1.05, True); kick_bar(bar, 1.0, four=True); maraca_bar(bar, 1.0)
        bass_bar(bar, 'full'); charango_bar(bar, 'rasg', 1.06)
        bombo_bar(bar, 'tresillo')
        # acordeon: golpes a contratiempo (rol de teclado cumbiero)
        for bt in (range(4) if sec != 'CODA' else ()):
            for p in voicing(ch, 55, 67, 3):
                N(ACC, B(bar, bt + 0.5), 0.2, p, 66, 0.006)
    elif sec == 'Q':
        if bar == 88:
            bass_walk(88, 0.8)
        else:
            bass_bar(bar, 'quiet')
        bombo_bar(bar, 'soft')

for bar in range(9, 105):
    groove(bar, section(bar))

guitar_from(1, 89, 8)          # arpegio original de guitarra -> guitarra criolla (9-96)
guitar_from(65, 73, 32)        # coda (97-104)

# --- intro
pad_block(STR, 9, 60, pad_voicing('G')); pad_block(STR, 11, 60, pad_voicing('B'))
pad_block(STR, 13, 60, pad_voicing('C')); pad_block(STR, 15, 60, pad_voicing('Cm'))
CC(STR, B(9), 11, 70)
crash(9, 112, both=True)
timp_hit(B(9), 'G', 116)
timb_fill(16, 3.0, 60, 100)

# --- verso 1: rellenos de acordeon entre frases
def onsets(lst):
    return sorted(n[0] for n in lst)

def held_pitch(lst, beat):
    for s, d, p in lst:
        if s <= beat < s + d:
            return p
    return None

def fill_motif(chan, b0, ch, top, variant, vel, lo=50):
    tones = [p for p in range(lo, top + 1) if p % 12 in CHORD[ch]][-5:]
    sc = [p for p in range(lo, top + 1) if p % 12 in SCALE[ch]]
    if len(tones) < 4:
        return
    if variant == 0:
        seq = [(0, tones[0]), (0.5, tones[1]), (1.0, tones[2]), (1.5, tones[3]), (2.0, tones[-1])]
    elif variant == 1:
        seq = [(0, tones[-1]), (0.5, tones[-2]), (1.0, tones[-3]), (1.5, tones[-4]), (2.0, tones[-3])]
    else:
        run = [p for p in sc if p >= tones[1]][:4]
        seq = [(i * 0.25, p) for i, p in enumerate(run)] + [(1.0, tones[-1]), (1.5, tones[-2]), (2.0, tones[-3])]
    for i, (off, p) in enumerate(seq):
        last = i == len(seq) - 1
        N(chan, b0 + off, 0.7 if last else (0.22 if off % 0.5 else 0.45), p, vel + 4 * (i / len(seq)), 0.006)

CHUNK_A, CHUNK_B = (2.0, 2.25), (0.5, 0.75, 3.0, 3.25, 3.5)

def fills_for(lead, bars, chan, above, vel):
    ons = onsets(lead)
    k = 0
    for bar in bars:
        if bar in (31, 32, 55, 56):
            continue
        w0, w1 = B(bar, 1.0), B(bar, 3.4)
        if any(w0 <= o < w1 for o in ons):
            continue
        hp = held_pitch(lead, B(bar, 1.5)) or 67
        ch = chord_bar(bar)
        if above:
            fill_motif(chan, B(bar, 1.0), ch, min(88, hp + 19), k % 3, vel, lo=hp + 3)
        else:
            fill_motif(chan, B(bar, 1.0), ch, hp - 3, k % 3, vel)
        k += 1

fills_for(v1_mel, range(17, 33), ACC, False, 74)
fills_for(v2_mel, range(41, 57), SIK1, True, 82)

# --- "ka-chunk" del original -> golpes de toda la banda
def chunk(bar_a):
    for bar, offs in ((bar_a, CHUNK_A), (bar_a + 1, CHUNK_B)):
        ch = chord_bar(bar)
        for o in offs:
            x = B(bar, o)
            D(x, LTIMB, 108, 0.15, 0.004); D(x, SIDE, 96, 0.1, 0.004)
            strum(x, 104, 0.12)
            bombo(x, 92)
            for p in voicing(ch, 55, 67, 3):
                N(ACC, x, 0.14, p, 92, 0.004)

chunk(31)
chunk(55)

# --- estribillo 1
crash(33, 108, both=True)
timp_hit(B(33), 'G', 108)
harp_gliss(B(32, 3), 1.0, 'Cm', 48, 79, 45, 85)
for bar in (33, 35, 37, 39):
    pad_block(STR, bar, 72, pad_voicing(chord_bar(bar)))
CC(STR, B(33), 11, 88)
timb_fill(40, 2.0, 55, 104)

# --- verso 2
crash(41, 82)
for bar in (49, 51, 53, 55):
    pad_block(STR, bar, 58, pad_voicing(chord_bar(bar)))
CC(STR, B(49), 11, 64)
timb_fill(48, 3.5, 70, 96)

# --- estribillo 2
crash(57, 110, both=True)
timp_hit(B(57), 'G', 110)
for bar in (57, 59, 61, 63):
    pad_block(STR, bar, 76, pad_voicing(chord_bar(bar)))
    pad_block(CHOIR, bar, 66, choir_voicing(chord_bar(bar)))
CC(STR, B(57), 11, 96); CC(CHOIR, B(57), 11, 80)
# remate hacia el puente (en el original, redoble del compas 56)
timb_fill(64, 0.0, 50, 118)
timp_roll(B(64), B(65), 43, 40, 118)
harp_gliss(B(64, 2.5), 1.5, 'Cm', 43, 84, 50, 95)

# --- puente (65-78): cuerdas en tremolo, coro, timbales sinfonicos
progs.append((STR, B(64, 3.9), 0, 44))
crash(65, 118, both=True)
for bar in range(65, 79, 2):
    ch = chord_bar(bar)
    timp_hit(B(bar), ch, 116 if bar in (65, 73) else 100)
    pad_block(STR, bar, 84, pad_voicing(ch), length=7.9 if bar < 77 else 11.9)
    pad_block(CHOIR, bar, 80, choir_voicing(ch), length=7.9 if bar < 77 else 11.9)
CC(STR, B(65), 11, 108); CC(CHOIR, B(65), 11, 104)
CC(STR, B(73), 11, 118); CC(CHOIR, B(73), 11, 116)
# crescendo de los compases 71-72 (redoble del original)
for i in range(8):
    D(B(71, i * 0.5), OCONGA, 70 + 4 * i, 0.15, 0.004)
timb_fill(72, 0.0, 60, 120)
bombo_roll(B(72, 2), B(73), 84, 118)
timp_roll(B(72), B(73), 38, 50, 118)
harp_gliss(B(72, 3), 1.0, 'Cm', 48, 84, 50, 95)
crash(73, 120, both=True)
timb_fill(78, 2.0, 70, 112)

# ---------- corte (79-80): queda el aire
crash(79, 112, both=True)
bombo(B(79), 116)
timp_hit(B(79), 'Cm', 112)
N(BASS, B(79), 3.9, 36, 92, 0.004)
N(BASS, B(80), 1.9, 36, 76, 0.004)
ramp(STR, 11, B(79, 0.5), B(80, 3.5), 118, 40)
ramp(CHOIR, 11, B(79, 0.5), B(80, 3.0), 116, 30)
charango_trem(B(79, 0.5), B(80, 2.0), 70, 24)

# ---------- verso tranquilo (81-88): bandoneon, guitarra criolla, bombo latiendo
progs.append((STR, B(80, 3.9), 0, 49))
for bar in (81, 83, 85, 87):
    pad_block(STR, bar, 54, pad_voicing(chord_bar(bar)))
CC(STR, B(81), 11, 52)
# subida al estribillo final
ramp(STR, 11, B(88), B(88, 3.8), 52, 116)
timp_roll(B(88), B(89), 38, 30, 116)
bombo_roll(B(88, 2), B(89), 64, 116)
timb_fill(88, 3.0, 66, 108)
harp_gliss(B(88, 3), 1.0, 'Cm', 48, 84, 50, 95)

# ---------- estribillo final (89-96)
crash(89, 122, both=True)
for bar in (89, 91, 93, 95):
    ch = chord_bar(bar)
    timp_hit(B(bar), ch, 116)
    pad_block(STR, bar, 86, pad_voicing(ch))
    pad_block(CHOIR, bar, 84, choir_voicing(ch))
CC(STR, B(89), 11, 100); CC(CHOIR, B(89), 11, 96)
# 95: corte dramatico ("...here")
crash(95, 110)
bombo(B(95), 118)
N(BASS, B(95), 3.9, 36, 98, 0.004)
for p in voicing('Cm', 55, 67, 3):
    N(ACC, B(95), 3.6, p, 80, 0.004)
charango_trem(B(95, 0.5), B(96, 2.0), 46, 64)
# 96: subida a la coda
timb_fill(96, 2.0, 60, 122)
bombo_roll(B(96, 2), B(97), 76, 120)
timp_roll(B(96, 2), B(97), 38, 50, 120)
bass_walk(96, 1.05)
harp_gliss(B(96, 3), 1.0, 'Cm', 48, 84, 55, 100)
guiro_bar(96, 0.9)
conga_bar(96, 0.9, True)

# ---------- coda (97-104)
progs.append((STR, B(96, 3.9), 0, 44))
crash(97, 124, both=True)
for bar in (97, 99, 101, 103):
    ch = chord_bar(bar)
    timp_hit(B(bar), ch, 118)
    pad_block(STR, bar, 88, pad_voicing(ch))
    pad_block(CHOIR, bar, 88, choir_voicing(ch))
CC(STR, B(97), 11, 120); CC(CHOIR, B(97), 11, 120)
# cierre: ritardando + redoble
timb_fill(104, 2.0, 66, 124)
bombo_roll(B(104, 2), B(105), 80, 124)
timp_roll(B(104, 2), B(105), 38, 56, 124)
harp_gliss(B(104, 3), 1.0, 'Cm', 48, 84, 55, 105)

# ---------- acorde final (105-106)
FIN = 8.0
crash(105, 127, both=True)
bombo(B(105), 127)
timp_roll(B(105, 0.25), B(106, 3.5), 43, 110, 40)
N(BASS, B(105), FIN, 31, 112, 0); N(BASS, B(105), FIN, 43, 96, 0)
for p in pad_voicing('G'):
    N(STR, B(105), FIN, p, 96, 0.004)
for p in choir_voicing('G'):
    N(CHOIR, B(105), FIN, p, 96, 0.004)
for p in (55, 59, 62, 67):
    N(ACC, B(105), FIN, p, 98, 0.004)
for p in (55, 59, 62):
    N(BAND, B(105), FIN, p, 90, 0.004)
for i, p in enumerate((43, 50, 55, 59, 62, 67)):
    N(GUIT, B(105) + i * 0.03, FIN, p, 86, 0)
charango_trem(B(105), B(106, 3.5), 96, 30)
harp_gliss(B(105), 1.0, 'G', 43, 91, 60, 100)
for s, d, p in coda_last:  # "here" final del contracanto
    N(OOHS, B(105), FIN, p - 12, 84, 0)
# sikus: trino andino y nota larga
for i in range(8):
    N(SIK1, B(105) + i * 0.125, 0.12, 79 if i % 2 == 0 else 81, 104, 0)
N(SIK1, B(105, 1.0), FIN - 1.0, 79, 112, 0)
breath_vibrato(SIK1, B(105, 1.0), FIN - 1.0, depth=9)
N(SIK2, B(105), FIN, 67, 96, 0)
N(QUENA, B(105, 1.0), FIN - 1.0, 86, 70, 0)
ramp(STR, 11, B(105, 4), B(106, 3.9), 120, 70)
ramp(CHOIR, 11, B(105, 4), B(106, 3.9), 120, 70)

# ================================================================= ESCRITURA MIDI
def to_tick(b):
    return int(round(b * TPB))

# quitar duplicados exactos (misma nota, mismo inicio)
seen, uniq = set(), []
for n in notes:
    key = (n[0], to_tick(n[1]), n[3])
    if key in seen:
        continue
    seen.add(key)
    uniq.append(n)

mf = mido.MidiFile(type=1, ticks_per_beat=TPB)
cond = mido.MidiTrack()
mf.tracks.append(cond)
cond.append(mido.MetaMessage('track_name', name='Cumbia folclorica epica', time=0))
cond.append(mido.MetaMessage('time_signature', numerator=4, denominator=4, time=0))
cond.append(mido.MetaMessage('key_signature', key='G', time=0))
tempos = [(0.0, 93.0), (B(104, 2.0), 88.0), (B(104, 3.0), 82.0), (B(104, 3.5), 76.0), (B(105), 70.0)]
last = 0
for b, bpm in tempos:
    t = to_tick(b)
    cond.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(bpm), time=t - last))
    last = t
cond.append(mido.MetaMessage('end_of_track', time=0))

for ch in range(16):
    name, bank, prog, vol, pan, rev, cho = SETUP[ch]
    ev = []  # (tick, order, msg)
    ev.append((0, 0, mido.MetaMessage('track_name', name=name)))
    if ch != DR:
        ev.append((0, 1, mido.Message('control_change', channel=ch, control=0, value=bank)))
        ev.append((0, 1, mido.Message('control_change', channel=ch, control=32, value=0)))
    ev.append((0, 2, mido.Message('program_change', channel=ch, program=prog)))
    for ctl, val in ((7, vol), (10, pan), (91, rev), (93, cho), (11, 127 if ch not in (STR, CHOIR) else 90)):
        ev.append((0, 3, mido.Message('control_change', channel=ch, control=ctl, value=val)))
    for c, b, pr_bank, pr in [(p[0], p[1], p[2], p[3]) for p in progs if p[0] == ch]:
        t = to_tick(b)
        ev.append((t, 1, mido.Message('control_change', channel=ch, control=0, value=pr_bank)))
        ev.append((t, 2, mido.Message('program_change', channel=ch, program=pr)))
    for c, b, ctl, val in ccs:
        if c == ch:
            ev.append((to_tick(b), 3, mido.Message('control_change', channel=ch, control=ctl, value=val)))
    chn = sorted([n for n in uniq if n[0] == ch], key=lambda n: (n[1], n[3]))
    # evitar notas iguales superpuestas en el mismo canal
    open_end = {}
    spans = []
    for (c, s, d, p, v) in chn:
        st, en = to_tick(s), to_tick(s + d)
        spans.append([st, en, p, v])
    spans.sort()
    last_by_pitch = {}
    for sp in spans:
        prev = last_by_pitch.get(sp[2])
        if prev is not None and prev[1] > sp[0]:
            prev[1] = max(prev[0] + 1, sp[0] - 1)
        last_by_pitch[sp[2]] = sp
    for st, en, p, v in spans:
        ev.append((st, 5, mido.Message('note_on', channel=ch, note=p, velocity=v)))
        ev.append((en, 4, mido.Message('note_off', channel=ch, note=p, velocity=0)))
    ev.sort(key=lambda e: (e[0], e[1]))
    tr = mido.MidiTrack()
    lt = 0
    for t, o, msg in ev:
        tr.append(msg.copy(time=t - lt))
        lt = t
    tr.append(mido.MetaMessage('end_of_track', time=0))
    mf.tracks.append(tr)

mf.save(OUT)
tot = sum(1 for n in uniq)
print('notas:', tot, '| duracion (s):', round(mido.MidiFile(OUT).length, 1))
for ch in range(16):
    ns = [n for n in uniq if n[0] == ch]
    if ns:
        print(f"  {SETUP[ch][0]:48s} {len(ns):5d} notas  rango {min(n[3] for n in ns)}-{max(n[3] for n in ns)}")
