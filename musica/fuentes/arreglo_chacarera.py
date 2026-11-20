#!/usr/bin/env python3
"""Version chacarera (6/8): guitarras criollas + bombo leguero.

Uso: python3 -I chacarera.py <midi_original> <midi_salida> <dir_src>
Unidad interna: "pulso" = negra con puntillo = un tiempo del original (el tempo se conserva).
"""
import sys, math, random
sys.path.insert(0, sys.argv[3])
import mido
from load import load

SRC, OUT = sys.argv[1], sys.argv[2]
random.seed(1977)
orig, OT = load(SRC)
OTPB = orig.ticks_per_beat
MEL, CHO, CEL = 3, 4, 5

TPQ = 480
PULSE = 720          # ticks por negra con puntillo
BPM_DOTTED = 93.0
PRE = 8.0            # 4 compases de 6/8 antes del compas 1 del original
E = [0, 1 / 3, 2 / 3, 1, 4 / 3, 5 / 3]   # corcheas del compas de 6/8 (en pulsos)

G1, G2, G3, BORD, DR, BOMBO, CBD = 0, 1, 2, 3, 9, 10, 11
SETUP = {  # ch: (nombre, bank, program, vol, pan, reverb)
    G1:    ('Guitarra criolla 1 - rasguido', 0, 24, 66, 36, 36),
    G2:    ('Guitarra criolla 2 - melodia (punteo)', 0, 24, 127, 66, 44),
    G3:    ('Guitarra criolla 3 - segunda voz', 0, 24, 104, 92, 44),
    BORD:  ('Guitarra criolla 1 - bordones', 0, 24, 80, 50, 30),
    DR:    ('Bombo leguero (aro), chasquido y palmas', 0, 0, 90, 64, 30),
    BOMBO: ('Bombo leguero (parche)', 0, 116, 96, 64, 40),
    CBD:   ('Bombo leguero (parche, cuerpo)', 8, 116, 64, 64, 40),
}
notes, ccs = [], []

def N(ch, p, dur, pitch, vel, jit=0.0):
    if jit:
        p += random.gauss(0, jit)
    vel = int(max(1, min(127, round(vel + (random.uniform(-4, 4) if jit else 0)))))
    notes.append((ch, max(0.0, p), max(0.02, dur), int(pitch), vel))

# ---------------------------------------------------------------- armonia
CYCLE = ['G', 'B', 'C', 'Cm']
CHORD = {'G': [7, 11, 2], 'B': [11, 3, 6], 'C': [0, 4, 7], 'Cm': [0, 3, 7]}
SCALE = {'G': {7, 9, 11, 0, 2, 4, 6}, 'B': {11, 0, 3, 4, 6, 7, 9},
         'C': {0, 2, 4, 6, 7, 9, 11}, 'Cm': {0, 2, 3, 5, 7, 8, 10}}
VOI = {  # acordes reales de guitarra en primera posicion
    'G': [43, 47, 50, 55, 59, 67],     # 320003
    'B': [47, 54, 59, 63, 66],         # x24442
    'C': [48, 52, 55, 60, 64],         # x32010
    'Cm': [48, 55, 60, 63, 67],        # x35543
}
FIFTH = {'G': 50, 'B': 42, 'C': 43, 'Cm': 43}

def orig_bar_of(p):
    return int((p - PRE) // 4) + 1

def chord_p(p):
    if p < PRE:
        return 'G'
    ob_ = orig_bar_of(p)
    return 'G' if ob_ >= 89 else CYCLE[((ob_ - 1) // 2) % 4]

def sec_c(c):
    p = 2 * c
    if p < PRE:
        return 'PRE'
    ob_ = orig_bar_of(p)
    for lim, name in ((8, 'INTRO'), (24, 'V1'), (32, 'C1'), (48, 'V2'), (56, 'C2'), (70, 'BR'),
                      (72, 'BRK'), (80, 'Q'), (88, 'F')):
        if ob_ <= lim:
            return name
    return 'END'

def block_pos(c):  # 0..3: compas dentro del bloque de 4 compases de un mismo acorde
    return int(((2 * c - PRE) % 8) // 2)

def block_idx(c):  # 0 G, 1 B, 2 C, 3 Cm
    return int(((2 * c - PRE) // 8) % 4)

# ---------------------------------------------------------------- melodias (binario -> ternario)
def ob(n): return n['s'] / OTPB
def od(n): return n['d'] / OTPB

def ob2p(b):
    q = round(b * 4) / 4
    w = math.floor(q)
    f = round(q - w, 2)
    return w + {0.0: 0.0, 0.25: 1 / 3, 0.5: 2 / 3, 0.75: 5 / 6}[f] + PRE

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

def take(track, fb, fx, tb, shift=0):
    lo, hi = (fb - 1) * 4 + fx, (tb - 1) * 4
    raw = clean([[ob(n) + shift * 4, od(n), n['p']] for n in OT[track] if lo <= ob(n) < hi])
    out = []
    for s, d, p in raw:
        ps, pe = ob2p(s), ob2p(s + d)
        if out and ps <= out[-1][0] + 1e-6:
            ps = out[-1][0] + 1 / 6
        out.append([ps, max(1 / 6, pe - ps), p])
    for i in range(len(out) - 1):
        out[i][1] = max(0.1, min(out[i][1], out[i + 1][0] - out[i][0] - 0.02))
    return out

def third_below(p, ch):
    for c in (p - 3, p - 4):
        if c % 12 in CHORD[ch]:
            return c
    for c in (p - 3, p - 4):
        if c % 12 in SCALE[ch]:
            return c
    return p - 3

def lower_neighbor(p, ch):
    for c in (p - 2, p - 1):
        if c % 12 in SCALE[ch]:
            return c
    return p - 2

def melody(ch, lst, vel, restrike=True, grace=True, octave=0, thirds_ch=None, tvel=None):
    for i, (s, d, p) in enumerate(lst):
        v = vel + (6 if d >= 1.0 else 0) - (6 if d < 0.3 else 0)
        pp = p + octave
        if grace and d >= 1.0 and i % 3 == 0:          # ligado ascendente (hammer-on)
            N(ch, s - 1 / 12, 1 / 12, lower_neighbor(pp, chord_p(s)), v - 22)
        N(ch, s, d, pp, v, 0.004)
        if thirds_ch is not None:
            N(thirds_ch, s, d, third_below(pp, chord_p(s)), tvel or v - 14, 0.004)
        if restrike and d >= 2.5:                      # la guitarra repica la nota larga en cada compas
            t = math.floor((s + 0.01) / 2) * 2 + 2
            while t < s + d - 0.5:
                N(ch, t, min(2.0, s + d - t), pp, v - 20, 0.004)
                if thirds_ch is not None:
                    N(thirds_ch, t, min(2.0, s + d - t), third_below(pp, chord_p(t)), (tvel or v - 14) - 18, 0.004)
                t += 2

def tremolo(ch, lst, vel, octave=0, step=1 / 6):
    """tremolo de guitarra (p-a-m-i) para las notas largas del puente"""
    for s, d, p in lst:
        pp = p + octave
        if d < 0.75:
            N(ch, s, d, pp, vel, 0.004)
            continue
        k = int((d - 0.05) / step)
        for i in range(max(1, k)):
            acc = 8 if i % 6 == 0 else (0 if i % 2 else -6)
            N(ch, s + i * step, step * 1.6, pp, vel + acc, 0.003)

# --- tramos melodicos (mismos compases del original, ahora en 6/8)
intro_cho = take(CHO, 24, 1.5, 32, -24)
v1_mel = take(MEL, 8, 1.5, 24)
c1_cho = take(CHO, 24, 1.5, 32)
v2_mel = take(MEL, 32, 1.5, 48)
c2_cho = take(CHO, 48, 1.5, 57)
br_cel = take(CEL, 57, 0.0, 73)
q_mel = take(MEL, 72, 1.0, 81)
f_cho = take(CHO, 80, 1.5, 90)
END_P = ob2p((89 - 1) * 4)            # pulso del "here" final (acorde final)
f_body = [n for n in f_cho if n[0] < END_P - 0.01]

melody(G2, intro_cho, 110, thirds_ch=G3)
melody(G2, v1_mel, 108)
melody(G2, c1_cho, 114, thirds_ch=G3)
melody(G2, v2_mel, 108)
melody(G2, c2_cho, 116, thirds_ch=G3)
tremolo(G2, br_cel, 98)
melody(G3, br_cel, 92, grace=False, octave=-12)
melody(G2, q_mel, 96, grace=True)
melody(G2, f_body, 118, thirds_ch=G3)

# ---------------------------------------------------------------- guitarra: rasguido de chacarera
def strum(p, vel, dur, up=False, ch=None, spread=0.045, muted=False, chan=G1, skip_bass=False):
    chn = ch or chord_p(p + 0.01)
    v = VOI[chn][1:] if skip_bass else VOI[chn]
    order = v[::-1][:4] if up else v
    sp = spread * (0.6 if up else 1.0)
    for i, x in enumerate(order):
        N(chan, p + i * sp / len(order), (0.025 if muted else dur), x,
          vel - (2 * i if up else (0 if i < 2 else 3)), 0.003)

AROK, SIDE, CABASA, CLAP = 77, 37, 69, 39

def chasquido(p, vel=100):
    strum(p, vel, 0, muted=True, spread=0.03)
    N(DR, p, 0.08, CABASA, vel * 0.62, 0.003)
    N(DR, p + 0.004, 0.06, SIDE, vel * 0.36, 0.003)

def bordon(p, pitch, vel):
    N(BORD, p, 0.9, pitch, vel, 0.003)

def rasguido_bar(c, lvl, hem=False):
    p0 = 2 * c
    ch = chord_p(p0 + 0.01)
    d = 1 / 3 - 0.02
    if not hem:
        strum(p0 + E[0], 88 * lvl, d, skip_bass=True)
        bordon(p0 + E[0], VOI[ch][0], 96 * lvl)
        strum(p0 + E[1], 54 * lvl, d, up=True)
        strum(p0 + E[2], 66 * lvl, d)
        chasquido(p0 + E[3], 100 * lvl)
        strum(p0 + E[4], 58 * lvl, d, up=True)
        strum(p0 + E[5], 72 * lvl, d + 0.1)
    else:   # hemiola de 3/4 al cerrar la frase
        for i, x in enumerate(E):
            if i % 2 == 0:
                strum(p0 + x, 90 * lvl, d, skip_bass=(i in (0, 4)))
            else:
                strum(p0 + x, 50 * lvl, d, up=True)
        bordon(p0 + E[0], VOI[ch][0], 96 * lvl)
        bordon(p0 + E[4], FIFTH[ch], 86 * lvl)

def arpegio_bar(c, lvl):
    p0 = 2 * c
    v = VOI[chord_p(p0 + 0.01)]
    seq = [v[0], v[-3], v[-2], v[-1], v[-2], v[-3]]
    for i, x in enumerate(seq):
        N(G1, p0 + E[i], 1.0 if i else 1.8, x, (74 if i == 0 else 60 + (4 if i == 3 else 0)) * lvl, 0.004)

# ---------------------------------------------------------------- bombo leguero: "tun-pa tu-tun-pa"
def parche(p, vel):
    N(BOMBO, p, 1.0, 43, vel, 0.004)
    N(CBD, p, 0.9, 40, vel * 0.72, 0.004)

def aro(p, vel):
    N(DR, p, 0.1, AROK, vel, 0.004)
    N(DR, p + 0.003, 0.08, SIDE, vel * 0.42, 0.004)

def bombo_bar(c, lvl, style='base'):
    p0 = 2 * c
    if style == 'base':          # tun . pa | tu tun pa
        parche(p0 + E[0], 104 * lvl); aro(p0 + E[2], 74 * lvl)
        parche(p0 + E[3], 80 * lvl); parche(p0 + E[4], 102 * lvl); aro(p0 + E[5], 76 * lvl)
    elif style == 'base2':       # variante: cierra con parche
        parche(p0 + E[0], 104 * lvl); aro(p0 + E[2], 74 * lvl)
        parche(p0 + E[3], 80 * lvl); parche(p0 + E[4], 100 * lvl); parche(p0 + E[5], 90 * lvl)
    elif style == 'hem':         # 3/4: tun pa tun pa tun pa
        for i, x in enumerate(E):
            (parche if i % 2 == 0 else aro)(p0 + x, (100 if i % 2 == 0 else 66) * lvl)
    elif style == 'repique':     # redoble para entrar a la parte siguiente
        parche(p0 + E[0], 104 * lvl); aro(p0 + E[1], 66 * lvl); aro(p0 + E[2], 72 * lvl)
        for i in range(6):
            parche(p0 + 1 + i / 6, (70 + 9 * i) * lvl)
    elif style == 'latido':      # verso tranquilo
        parche(p0 + E[0], 70 * lvl); parche(p0 + E[3], 50 * lvl)

def palmas_bar(c, vel):
    p0 = 2 * c
    for x in (E[0], E[3]):
        for k in range(3):
            N(DR, p0 + x + 0.008 * k, 0.1, CLAP, vel - 8 * k, 0.006)

# ---------------------------------------------------------------- armado por compas de 6/8
LVL = {'PRE': 0.82, 'INTRO': 0.88, 'V1': 0.8, 'C1': 0.9, 'V2': 0.84, 'C2': 0.93, 'BR': 0.97, 'F': 0.98}
NBARS = int(END_P // 2)            # compases antes del final
BUILD = set(range(int(ob2p((63 - 1) * 4) // 2), int(ob2p((65 - 1) * 4) // 2)))  # subida del puente

def is_hem(c):
    return block_pos(c) == 3 and block_idx(c) in (1, 3)

def last_of_section(c):
    return sec_c(c) != sec_c(c + 1)

for c in range(NBARS):
    sec = sec_c(c)
    if sec == 'PRE':
        bombo_bar(c, 0.86)
        if c >= 2:
            rasguido_bar(c, 0.8)
        continue
    if sec in ('BRK',):
        continue
    if sec == 'Q':
        arpegio_bar(c, 0.9)
        if last_of_section(c):
            bombo_bar(c, 0.9, 'repique')
        else:
            bombo_bar(c, 0.9, 'latido')
        continue
    lvl = LVL[sec]
    hem = is_hem(c)
    rasguido_bar(c, lvl, hem)
    if c in BUILD:
        bombo_bar(c, 1.1, 'repique' if c % 2 == 1 else 'hem')
    elif last_of_section(c) and sec in ('INTRO', 'V1', 'C1', 'V2', 'C2'):
        bombo_bar(c, lvl, 'repique')
    elif hem:
        bombo_bar(c, lvl, 'hem')
    elif sec in ('C1', 'C2', 'BR', 'F') and c % 2 == 1:
        bombo_bar(c, lvl, 'base2')
    else:
        bombo_bar(c, lvl, 'base')
    if sec in ('INTRO', 'F'):
        palmas_bar(c, 58 if sec == 'INTRO' else 66)

# --- golpes del original ("ka-chunk") -> chasquidos con aro
for ob_bar_a in (23, 47):
    for bar, offs in ((ob_bar_a, (2.0, 2.25)), (ob_bar_a + 1, (0.5, 0.75, 3.0, 3.25, 3.5))):
        for o in offs:
            p = ob2p((bar - 1) * 4 + o)
            chasquido(p, 112)
            aro(p, 96)


# --- corte (compases 71-72 del original): rasguido abierto y silencio
p_brk = ob2p((71 - 1) * 4)
strum(p_brk, 104, 3.5, spread=0.08)
bordon(p_brk, 48, 100)
parche(p_brk, 112); aro(p_brk, 90)

# --- relleno de la tercera guitarra en el verso 2 (bordoneo entre frases)
def onsets(lst):
    return sorted(n[0] for n in lst)

ons = onsets(v2_mel)
for ob_bar in range(33, 47):
    w0, w1 = ob2p((ob_bar - 1) * 4 + 1.0), ob2p((ob_bar - 1) * 4 + 3.4)
    if any(w0 <= o < w1 for o in ons):
        continue
    ch = chord_p(w0 + 0.01)
    run = sorted([x for x in range(45, 60) if x % 12 in SCALE[ch]], reverse=True)[:5]
    for i, x in enumerate(run):
        N(G3, w0 + i / 3, 0.32 if i < len(run) - 1 else 0.9, x, 80 - 2 * i, 0.004)

# --- final: rasguido "abanico" + bombo, y el ultimo golpe
fin = END_P
for k, (o, up) in enumerate(((0.0, False), (1 / 12, True), (1 / 6, False))):
    strum(fin + o, 112 - 8 * k, 2.6, up=up, spread=0.06)
bordon(fin, 43, 112)
parche(fin, 124); aro(fin, 110)
N(G2, fin, 2.8, 67, 112, 0); N(G3, fin, 2.8, 59, 100, 0)
chasquido(fin + 1.0, 118)
aro(fin + 1.0, 118); parche(fin + 1.0, 120)

# ---------------------------------------------------------------- escritura MIDI (6/8)
def T(p):
    return int(round(p * PULSE))

mf = mido.MidiFile(type=1, ticks_per_beat=TPQ)
cond = mido.MidiTrack()
mf.tracks.append(cond)
cond.append(mido.MetaMessage('track_name', name='Chacarera', time=0))
cond.append(mido.MetaMessage('time_signature', numerator=6, denominator=8, clocks_per_click=36,
                             notated_32nd_notes_per_beat=8, time=0))
cond.append(mido.MetaMessage('key_signature', key='G', time=0))
cond.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(BPM_DOTTED * 1.5), time=0))
cond.append(mido.MetaMessage('end_of_track', time=0))

for ch, (name, bank, prog, vol, pan, rev) in SETUP.items():
    ev = [(0, 0, mido.MetaMessage('track_name', name=name))]
    if ch != DR:
        ev.append((0, 1, mido.Message('control_change', channel=ch, control=0, value=bank)))
        ev.append((0, 1, mido.Message('control_change', channel=ch, control=32, value=0)))
    ev.append((0, 2, mido.Message('program_change', channel=ch, program=prog)))
    for ctl, val in ((7, vol), (10, pan), (91, rev), (93, 0), (11, 127)):
        ev.append((0, 3, mido.Message('control_change', channel=ch, control=ctl, value=val)))
    spans = sorted([[T(s), T(s + d), p, v] for (c, s, d, p, v) in notes if c == ch])
    last = {}
    for sp in spans:
        prev = last.get(sp[2])
        if prev is not None and prev[1] > sp[0]:
            prev[1] = max(prev[0] + 1, sp[0] - 1)
        last[sp[2]] = sp
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
print('notas:', len(notes), '| duracion (s):', round(mido.MidiFile(OUT).length, 1), '| compases 6/8:', NBARS + 2)
for ch, (name, *_r) in SETUP.items():
    ns = [n for n in notes if n[0] == ch]
    print(f"  {name:42s} {len(ns):5d} notas  rango {min(n[3] for n in ns)}-{max(n[3] for n in ns)}")
