#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LA MÍNIMA — banda sonora, sintetizada entera con numpy.

El vals tiene dos voces: Elsa (cuerda pulsada + cajita) canta las notas largas,
Tito (lengüeta, como un bandoneón) contesta en el tercer tiempo y la sostiene
por debajo. Cuando a él lo borran, la melodía queda con agujeros. Al final,
los agujeros los llena una voz nueva: la de la nena.

uso: python3 audio.py salida.wav
"""
import sys, wave
import numpy as np

SR = 48000
DUR = 224.75
N = int(SR * DUR)
rng = np.random.default_rng(1212)

# ------------------------------------------------------------ utilidades
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def hz(name):
    n = NOTE[name[0]]; i = 1
    while name[i] in '#b': n += 1 if name[i] == '#' else -1; i += 1
    return 440.0 * 2 ** ((n + 12 * (int(name[i:]) + 1) - 69) / 12)

def ramp(t, a, b):
    return np.clip((t - a) / (b - a), 0, 1)

def fft_filter(x, fn):
    """filtro de fase cero: fn(frecuencias) -> ganancia"""
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X * fn(f), len(x))

def bandpass(x, lo, hi, order=2):
    return fft_filter(x, lambda f: 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order)) / np.sqrt(1 + (f / hi) ** (2 * order)))
def lowpass(x, fc, order=2):
    return fft_filter(x, lambda f: 1 / np.sqrt(1 + (f / fc) ** (2 * order)))
def highpass(x, fc, order=2):
    return fft_filter(x, lambda f: 1 / np.sqrt(1 + (fc / np.maximum(f, 1e-3)) ** (2 * order)))

class Bus:
    def __init__(self): self.L = np.zeros(N); self.R = np.zeros(N)
    def add(self, sig, t, gain=1.0, pan=0.0):
        i = int(round(t * SR))
        if i >= N or len(sig) == 0: return
        if i < 0: sig = sig[-i:]; i = 0
        n = min(len(sig), N - i)
        a = (pan + 1) * np.pi / 4
        self.L[i:i + n] += sig[:n] * gain * np.cos(a)
        self.R[i:i + n] += sig[:n] * gain * np.sin(a)
    def stereo(self): return np.stack([self.L, self.R])

def noise(n): return rng.standard_normal(n)

# ------------------------------------------------------------ instrumentos
def pluck(f, dur=2.4, bright=1.0, pos=0.21, decay=1.0):
    """cuerda de nylon pulsada (síntesis aditiva)"""
    n = int(SR * dur); t = np.arange(n) / SR
    y = np.zeros(n)
    nh = int(min(26, 8500 / f))
    for k in range(1, nh + 1):
        a = np.sin(np.pi * k * pos) / k ** 1.55 * bright ** (0.25 * (k - 1))
        fk = f * k * np.sqrt(1 + 0.00010 * k * k)
        d = (1.7 + 0.30 * k ** 1.45) * (f / 220) ** 0.32 / decay
        y += a * np.exp(-d * t) * np.sin(2 * np.pi * fk * t + rng.uniform(0, 0.3))
    y *= 1 - np.exp(-t / 0.0018)
    nb = int(0.006 * SR); y[:nb] += bandpass(noise(nb), 600, 4000) * np.linspace(1, 0, nb) * 0.10
    y[-200:] *= np.linspace(1, 0, 200)
    return y

def reed(f, dur, swell=0.15):
    """lengüeta doble, tipo bandoneón"""
    n = int(SR * (dur + 0.3)); t = np.arange(n) / SR
    y = np.zeros(n)
    for det, g in ((-4.0, 1.0), (4.5, 0.9), (1200.0, 0.32)):
        ff = f * 2 ** (det / 1200)
        nh = int(min(22, 7000 / ff))
        for k in range(1, nh + 1):
            a = g / k ** 1.05 * (1 + 0.9 * np.exp(-((k * ff - 1500) / 800) ** 2))
            y += a * np.sin(2 * np.pi * k * ff * t + rng.uniform(0, 6.28))
    env = np.minimum(1, t / 0.075) * (1 + swell * np.sin(np.pi * np.minimum(t / max(dur, 1e-3), 1)))
    rel = np.clip((dur + 0.3 - t) / 0.3, 0, 1)
    env *= np.where(t > dur, rel, 1)
    y *= env * (1 + 0.035 * np.sin(2 * np.pi * 5.2 * t))
    y += bandpass(noise(n), 2000, 7000) * env * 0.012
    return y * 0.16

def bell(f, dur=2.2, bright=1.0):
    """cajita de música / glockenspiel"""
    n = int(SR * dur); t = np.arange(n) / SR
    y = np.zeros(n)
    for ratio, a, d in ((1, 1.0, 2.0), (2.0, 0.22, 3.4), (2.76, 0.30 * bright, 4.6), (5.4, 0.10 * bright, 8.0), (8.93, 0.04 * bright, 12.0)):
        if f * ratio < 14000:
            y += a * np.exp(-d * t) * np.sin(2 * np.pi * f * ratio * t)
    y *= 1 - np.exp(-t / 0.0012)
    y[-300:] *= np.linspace(1, 0, 300)
    return y * 0.5

def choir(f, dur, voices=7):
    """coro tarareando 'mmm/ooo'"""
    n = int(SR * (dur + 0.5)); t = np.arange(n) / SR
    y = np.zeros(n)
    for v in range(voices):
        ff = f * 2 ** (rng.uniform(-14, 14) / 1200)
        vib = 1 + 0.006 * np.sin(2 * np.pi * rng.uniform(4.6, 5.8) * t + rng.uniform(0, 6.28)) * np.minimum(1, t / 0.5)
        ph = 2 * np.pi * np.cumsum(ff * vib) / SR
        nh = int(min(16, 3200 / ff))
        for k in range(1, nh + 1):
            fr = k * ff
            a = (np.exp(-((fr - 330) / 300) ** 2) + 0.38 * np.exp(-((fr - 850) / 320) ** 2) + 0.06 * np.exp(-((fr - 2500) / 600) ** 2)) / k ** 0.5
            y += a * np.sin(k * ph + rng.uniform(0, 6.28))
    env = np.minimum(1, t / 0.22) * np.where(t > dur, np.clip((dur + 0.5 - t) / 0.5, 0, 1), 1)
    return y * env * 0.05

def bombo(strong=True):
    n = int(SR * 0.9); t = np.arange(n) / SR
    f = 58 + 44 * np.exp(-t / 0.045)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.26 if strong else 0.16))
    y += lowpass(noise(n), 500) * np.exp(-t / 0.05) * 0.5
    y += bandpass(noise(n), 900, 3000) * np.exp(-t / 0.008) * 0.25
    return y * (1.0 if strong else 0.55)

def rim():
    n = int(SR * 0.12); t = np.arange(n) / SR
    y = bandpass(noise(n), 900, 3200) * np.exp(-t / 0.012) + 0.5 * np.sin(2 * np.pi * 1650 * t) * np.exp(-t / 0.02)
    return y * 0.5

def plink(base=1250.0, bounce=True):
    """pastilla que cae en una lata"""
    def one(g, fb):
        n = int(SR * 0.9); t = np.arange(n) / SR; y = np.zeros(n)
        for ratio, a, d in ((1, 1, 7), (1.51, .7, 9), (2.33, .55, 11), (3.42, .35, 14), (4.9, .22, 18), (6.7, .12, 24)):
            y += a * np.exp(-d * t) * np.sin(2 * np.pi * fb * ratio * t + rng.uniform(0, 6.28))
        y += bandpass(noise(n), 2500, 9000) * np.exp(-t / 0.004) * 0.6
        return y * g
    y = np.zeros(int(SR * 1.3))
    for dt, g, fb in ((0, 1, base), (0.11, 0.42, base * 1.03), (0.17, 0.2, base * 0.99)) if bounce else ((0, 1, base),):
        s = one(g, fb); i = int(dt * SR); y[i:i + len(s)] += s[:len(y) - i]
    return y * 0.22

def tick(f=2100.0, g=1.0):
    n = int(SR * 0.06); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006) + bandpass(noise(n), 1500, 6000) * np.exp(-t / 0.003) * 0.5) * g

def scratch(dur, lo=1600, hi=7500, strokes=None, rough=30.0):
    """lápiz (o crayón) sobre papel: ruido con el ritmo de la mano"""
    n = int(SR * dur); t = np.arange(n) / SR
    x = bandpass(noise(n), lo, hi)
    env = np.zeros(n)
    k = 0.0
    while k < dur:
        d = rng.uniform(0.16, 0.5) if strokes is None else strokes
        i0, i1 = int(k * SR), min(n, int((k + d) * SR))
        if i1 > i0:
            u = np.linspace(0, 1, i1 - i0)
            env[i0:i1] = np.sin(np.pi * u) ** 0.6 * rng.uniform(0.6, 1.0)
        k += d + rng.uniform(0.02, 0.12)
    r = 0.7 + 0.3 * np.sin(2 * np.pi * rough * t + 3 * np.sin(2 * np.pi * 3.1 * t))
    return x * env * r

def rub(dur, sweeps):
    """goma de borrar: ida y vuelta"""
    n = int(SR * dur); t = np.arange(n) / SR
    x = bandpass(noise(n), 220, 1500) * 1.4 + bandpass(noise(n), 1500, 4200) * 0.35
    ph = t / dur * sweeps
    env = np.abs(np.sin(np.pi * ph)) ** 0.7
    tone = 1 + 0.25 * np.sign(np.sin(np.pi * ph))
    sq = np.sin(2 * np.pi * np.cumsum(620 + 240 * np.abs(np.sin(np.pi * ph))) / SR) * env ** 3 * 0.035   # chirrido de goma
    return (x * env * tone * (0.75 + 0.25 * np.sin(2 * np.pi * 47 * t)) * 0.5 + sq)

def sip(dur=0.8):
    n = int(SR * dur); t = np.arange(n) / SR
    x = noise(n)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR)
    y = np.fft.irfft(X * np.exp(-((f - 2600) / 1500) ** 2), n)
    env = np.sin(np.pi * t / dur) ** 0.5 * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 34 * t)))
    return y * env * 0.5

def footstep(soft=True):
    n = int(SR * 0.16); t = np.arange(n) / SR
    y = bandpass(noise(n), 180, 1400 if soft else 2600) * np.exp(-t / (0.035 if soft else 0.02))
    return y

# ------------------------------------------------------------ buses
music = Bus()      # seco
mrev = Bus()       # envío a reverberación
radio = Bus()      # música "de la radio" (se filtra después)
sfx = Bus()
srev = Bus()

BAR = 2.0; BEAT = BAR / 3
def M(sig, t, g=1.0, pan=0.0, rev=0.3, bus=None):
    (bus or music).add(sig, t, g, pan); mrev.add(sig, t, g * rev, pan)
def S(sig, t, g=1.0, pan=0.0, rev=0.08):
    sfx.add(sig, t, g, pan); srev.add(sig, t, g * rev, pan)

CH = {
    'Am': ['A2', 'E3', 'A3', 'C4', 'E4', 'C4'], 'Dm': ['D3', 'A3', 'D4', 'F4', 'D4', 'A3'], 'G7': ['G2', 'D3', 'G3', 'B3', 'F4', 'B3'],
    'C': ['C3', 'G3', 'C4', 'E4', 'C4', 'G3'], 'F': ['F2', 'C3', 'F3', 'A3', 'C4', 'A3'], 'E7': ['E2', 'B2', 'E3', 'G#3', 'D4', 'G#3'],
    'A': ['A2', 'E3', 'A3', 'C#4', 'E4', 'C#4'], 'D': ['D3', 'A3', 'D4', 'F#4', 'D4', 'A3'],
}
# (nota larga de Elsa, respuesta de Tito en el 3er tiempo, tercera sostenida de Tito, acorde)
MINOR = [
    ('E5', 'F5', 'C5', 'Am'), ('E5', 'C5', 'C5', 'Am'), ('D5', 'E5', 'A4', 'Dm'), ('D5', None, 'A4', 'Dm'),
    ('D5', 'E5', 'B4', 'G7'), ('D5', 'B4', 'B4', 'G7'), ('C5', 'D5', 'G4', 'C'), ('C5', None, 'G4', 'C'),
    ('C5', 'D5', 'A4', 'F'), ('C5', 'A4', 'A4', 'Dm'), ('B4', 'C5', 'G#4', 'E7'), ('B4', None, 'G#4', 'E7'),
    ('E5', 'D5', 'C5', 'Am'), ('C5', 'B4', 'G#4', 'E7'), ('A4', None, 'E4', 'Am'), ('A4', None, 'E4', 'Am'),
]
MAJOR = [
    ('E5', 'F#5', 'C#5', 'A'), ('E5', 'C#5', 'C#5', 'A'), ('D5', 'E5', 'A4', 'D'), ('D5', None, 'A4', 'D'),
    ('D5', 'E5', 'B4', 'E7'), ('D5', 'B4', 'G#4', 'E7'), ('C#5', 'D5', 'A4', 'A'), ('C#5', None, 'E4', 'A'),
    ('E5', 'D5', 'C#5', 'A'), ('C#5', 'B4', 'G#4', 'E7'), ('A4', None, 'E4', 'A'), ('A4', None, 'E4', 'A'),
]

def bar_notes(t, spec, o):
    """un compás del vals. o: qué capas suenan y con cuánta fuerza"""
    el, ti, th, chd = spec
    long_d = 3 if ti is None else 2
    bus = o.get('bus')
    if o.get('elsa', 1) > 0:
        g = o.get('elsa', 1)
        M(pluck(hz(el), 2.6, bright=1.25, decay=1.1), t, 0.50 * g, 0.18, 0.4, bus)
        M(bell(hz(el) * 2, 2.0), t + 0.004, 0.10 * g, 0.22, 0.5, bus)
    if o.get('tito', 1) > 0:
        g = o.get('tito', 1)
        if ti: M(reed(hz(ti), BEAT * 0.92), t + 2 * BEAT, 0.9 * g, -0.2, 0.35, bus)
        if th and o.get('third', 1) > 0: M(reed(hz(th) / 2, BEAT * long_d * 0.96, swell=0.25), t, 0.55 * g * o.get('third', 1), -0.28, 0.35, bus)
    if o.get('nena', 0) > 0 and ti:
        M(bell(hz(ti), 2.4, bright=1.3), t + 2 * BEAT, 0.34 * o['nena'], -0.15, 0.5, bus)
        M(bell(hz(ti) * 2, 1.6, bright=1.2), t + 2 * BEAT, 0.10 * o['nena'], -0.15, 0.5, bus)
    gtr = o.get('gtr', 1)
    if gtr > 0:
        ns = CH[chd]
        pat = o.get('pat', 6)
        for i in range(6):
            if pat == 1 and i > 0: break
            if pat == 3 and i % 2: continue
            M(pluck(hz(ns[i]), 2.2, bright=0.95), t + i * BEAT / 2 + rng.uniform(-0.006, 0.006), (0.36 if i == 0 else 0.22) * gtr, -0.05 + 0.08 * (i % 3), 0.3, bus)
    if o.get('bass', 1) > 0:
        M(pluck(hz(CH[chd][0]) / (2 if hz(CH[chd][0]) > 100 else 1), 2.4, bright=0.7, decay=1.4), t, 0.5 * o.get('bass', 1), 0.0, 0.15, bus)
    if o.get('pad', 0) > 0:
        for nn in CH[chd][2:5]:
            M(reed(hz(nn), BAR * 0.97, swell=0.1), t, 0.2 * o['pad'], 0.3, 0.5, bus)
    if o.get('strum', 0) > 0:
        for b in (1, 2):
            for j, nn in enumerate(CH[chd][1:5]):
                M(pluck(hz(nn), 1.2, bright=1.1), t + b * BEAT + j * 0.014, 0.16 * o['strum'], 0.35, 0.3, bus)
    if o.get('bombo', 0) > 0:
        M(bombo(True), t, 0.5 * o['bombo'], 0, 0.2, bus)
        M(rim(), t + BEAT, 0.16 * o['bombo'], 0.2, 0.2, bus); M(rim(), t + 2 * BEAT, 0.16 * o['bombo'], -0.2, 0.2, bus)
    if o.get('choir', 0) > 0:
        M(choir(hz(el) / 2, BEAT * long_d * 0.98), t, 0.8 * o['choir'], 0, 0.6, bus)
        M(choir(hz(el) / 4, BEAT * long_d * 0.98, voices=5), t, 0.55 * o['choir'], 0, 0.6, bus)
        if ti: M(choir(hz(ti) / 2, BEAT * 0.9, voices=5), t + 2 * BEAT, 0.7 * o['choir'], 0, 0.6, bus)

print('música...', flush=True)
# ---- 18–22: la radio arranca: dos compases de guitarra
for b in range(2):
    ns = CH['Am']
    for i in range(6):
        radio.add(pluck(hz(ns[i]), 2.2, bright=0.95), 18 + b * BAR + i * BEAT / 2, 0.36 if i == 0 else 0.22, 0.0)
        mrev.add(pluck(hz(ns[i]), 2.2, bright=0.95), 18 + b * BAR + i * BEAT / 2, 0.05, 0.0)
# ---- 22–54: el vals entero; la goma le va sacando capas
for b in range(16):
    t = 22 + b * BAR
    o = dict(elsa=1, tito=1, gtr=1, bass=1, pad=0.8)
    if t >= 39.3: o['bass'] = 0            # borraron el pan: se va el bajo
    if t >= 42.6: o['pad'] = 0             # borraron el fuego: se va el colchón
    if t >= 44: o['pat'] = 3
    if t >= 46: o.update(pat=1, gtr=0.7, third=0.0, elsa=0.8, tito=0.75)   # borraron la luz
    if t >= 50: o.update(gtr=0.5, elsa=0.6, tito=0.5)
    bar_notes(t, MINOR[b], o)
# ---- 60–77: el secreto: notas sueltas, bajas
for t, nn, g in ((60, 'A2', .5), (60, 'E4', .4), (62, 'E4', .3), (64, 'D3', .45), (64, 'D4', .4), (66, 'D4', .25), (68.6, 'A3', .3),
                 (70, 'G2', .5), (70, 'D4', .4), (72, 'D4', .3), (74, 'C3', .45), (74, 'C4', .4), (76.4, 'G3', .3)):
    M(pluck(hz(nn), 3.0, bright=0.8, decay=1.4), t, g * 0.8, 0, 0.6)
# ---- 77–84: montaje: bajo que desciende, un paso por día
for c, nn in enumerate(('A2', 'G2', 'F2', 'E2', 'E2')):
    M(pluck(hz(nn), 2.0, bright=0.8, decay=1.2), 77 + c * 1.4, 0.55, 0, 0.4)
    M(pluck(hz(nn) * 3, 1.4, bright=0.9), 77 + c * 1.4 + 0.7, 0.16, 0.2, 0.4)
# ---- 84–94: bailan a la luz de la vela: el vals, mínimo, por la radio
for b in range(5):
    spec = MINOR[b] if b < 4 else ('D5', None, None, 'G7')
    el, ti, th, chd = spec
    t = 84 + b * BAR
    radio.add(bell(hz(el), 2.4), t, 0.5, 0.1); mrev.add(bell(hz(el), 2.4), t, 0.12, 0.1)
    if ti: radio.add(reed(hz(ti), BEAT * 0.9), t + 2 * BEAT, 0.7, -0.1); mrev.add(reed(hz(ti), BEAT * 0.9), t + 2 * BEAT, 0.15, -0.1)
    radio.add(pluck(hz(CH[chd][0]), 2.2, bright=0.8), t, 0.3, 0)
# ---- 100.8–105.4: lo borran: su voz, una sola nota que se apaga
tn = reed(hz('C4'), 4.5, swell=0.0)
env = 1 - ramp(np.arange(len(tn)) / SR, 0.3, 4.6) ** 0.8
M(tn * env, 100.9, 1.0, -0.25, 0.7)
tn2 = reed(hz('A3'), 3.0, swell=0.0); M(tn2 * (1 - ramp(np.arange(len(tn2)) / SR, 0.2, 3.2)), 101.6, 0.6, -0.3, 0.7)
# ---- 114–127: sola: la melodía con agujeros (faltan las notas de él)
for b in range(7):
    el = MINOR[b][0]; t = 114 + b * BAR
    M(pluck(hz(el), 3.0, bright=1.2, decay=1.2), t, 0.42, 0.18, 0.9)
    M(bell(hz(el) * 2, 2.2), t, 0.08, 0.2, 0.9)
# ---- 131, 137.6: las dos latas
M(pluck(hz('A2'), 4.0, bright=0.7, decay=1.6), 132.9, 0.6, 0, 0.8)
M(pluck(hz('E2'), 4.5, bright=0.7, decay=1.6), 138.4, 0.7, 0, 0.8)
# ---- 139.6–141.6: las tres notas de él llegan tarde, de lejos
for i, nn in enumerate(('F5', 'C5', 'E5')):
    s = lowpass(reed(hz(nn), 0.85, swell=0.3), 2400)
    music.add(s, 139.6 + i * 0.95, 0.22, -0.3); mrev.add(s, 139.6 + i * 0.95, 0.55, -0.3)
# ---- 196–220: en mayor. Los agujeros los llena la nena; después, todos
for b in range(12):
    t = 196 + b * BAR
    if b < 4: o = dict(elsa=0.9, tito=0, nena=1.0, gtr=0.55 if b >= 1 else 0, pat=3 if b < 3 else 6, bass=0.5 if b >= 2 else 0)
    elif b < 8: o = dict(elsa=1, tito=0, nena=1.0, gtr=1, bass=1, pad=0.7, strum=0.8, bombo=0.9, choir=0.7 + 0.3 * (b - 4) / 3)
    else: o = dict(elsa=1, tito=0, nena=1.0, gtr=1, bass=1, pad=0.8, strum=1.0, bombo=1.0, choir=1.0)
    if b == 9: o = dict(elsa=0.8, tito=0, nena=0.9, gtr=0.3, pat=1, bass=0)      # la goma borra el título: se achica
    bar_notes(t, MAJOR[b], o)
# acorde final
for j, nn in enumerate(('A2', 'E3', 'A3', 'C#4', 'E4', 'A4')):
    M(pluck(hz(nn), 5.0, bright=1.1, decay=1.8), 220 + j * 0.03, 0.34, -0.2 + j * 0.08, 0.5)
M(bombo(True), 220, 0.5, 0, 0.3)
M(choir(hz('A3'), 3.2), 220, 0.9, 0, 0.7); M(choir(hz('E4'), 3.2), 220, 0.6, 0.2, 0.7); M(choir(hz('C#4'), 3.2), 220, 0.6, -0.2, 0.7)
for j, nn in enumerate(('A5', 'C#6', 'E6', 'A6')):
    M(bell(hz(nn), 3.0), 220.2 + j * 0.16, 0.2, 0.1 * j - 0.1, 0.7)

print('efectos...', flush=True)
# ------------------------------------------------------------ efectos
# intro: el mundo se dibuja
R = {'floor': (0.9, 2.5), 'window': (2.2, 3.7), 'table': (3.2, 4.5), 'chairs': (4.0, 5.1), 'fridge': (4.6, 5.9), 'lamp': (5.4, 6.3), 'cal': (5.9, 6.8),
     'shelf': (6.3, 7.3), 'counter': (6.8, 7.9), 'door': (7.3, 8.4), 'stuff': (7.6, 9.0), 'figs': (8.3, 10.0)}
for k, (a, b) in R.items():
    S(scratch(b - a, strokes=(b - a) if k == 'floor' else None), a, 0.16 if k != 'figs' else 0.2, rng.uniform(-0.4, 0.4), 0.05)
S(scratch(1.3, 500, 2600, rough=18), 7.9, 0.2, -0.6, 0.05)            # el crayón de la nieta
S(tick(900, 1.0), 9.2, 0.25, 0.1)                                     # se prende la luz
# pava
kn = int(SR * 34); kt = np.arange(kn) / SR
kh = bandpass(noise(kn), 2500, 9000) * 0.012 * ramp(kt, 0, 1.5) * (1 - ramp(kt, 31.4, 33.2))
S(kh, 9.0, 1.0, 0.55, 0.1)
# mate
for t0 in (11.5, 15.4, 97.6): S(sip(0.75), t0, 0.12, -0.2 if t0 < 14 else 0.2, 0.1)
# radio: clic y estática
S(tick(1400, 1.2), 16.0, 0.3, -0.25)
st = bandpass(noise(int(SR * 2.4)), 700, 3200); stt = np.arange(len(st)) / SR
S(st * (0.5 + 0.5 * np.sin(2 * np.pi * 0.9 * stt + 2 * np.sin(2 * np.pi * 3.3 * stt))) * ramp(stt, 0, 0.1) * (1 - ramp(stt, 1.4, 2.4)), 16.05, 0.07, -0.25)
# blísters
for t0, p in ((18.95, -0.2), (19.35, 0.2), (60.95, -0.2), (61.25, 0.2), (70.85, -0.2), (71.05, 0.2)): S(tick(3200, 0.7), t0, 0.16, p)
# la goma (primera vez)
for a, b, sw, pan in ((37.2, 39.3, 4, 0.1), (40.4, 42.6, 6, 0.55), (43.6, 46.0, 4, 0.05)):
    S(rub(b - a, sw), a, 0.5, pan, 0.06)
# la luz se va
S(tick(700, 1.0), 44.5, 0.2, 0.05)
# calle: fondo, pasos de la gente, el precio
cn = int(SR * 12.4); ct = np.arange(cn) / SR
city = lowpass(noise(cn), 220) * 0.9 + bandpass(noise(cn), 300, 1200) * 0.05
S(city * ramp(ct, 0, 0.5) * (1 - ramp(ct, 11.6, 12.4)), 47.8, 0.2, 0, 0.0)
for p in ((47.2, 250), (48.6, -280), (51.0, 262), (52.4, -250), (54.2, 285), (55.4, -265), (56.6, 255)):
    t0, v = p
    for k in range(18):
        ts = t0 + k * 0.33
        if 48 <= ts < 60:
            x = (-160 if v > 0 else 1900) + v * (ts - t0)
            S(footstep(False), ts, 0.07, float(np.clip((x - 760) / 760, -1, 1)), 0.1)
tt = 50.0
while tt < 54.0:
    u = (tt - 50.0) / 4.0
    S(tick(1700 + 500 * u, 0.8), tt, 0.13, 0.05)
    tt += 0.05 + 0.16 * (2 * abs(u - 0.5)) ** 2
for t0 in (54.0, 57.6, 58.6): S(tick(520, 1.6), t0, 0.3, 0.05); S(tick(2300, 1.0), t0 + 0.012, 0.2, 0.05)
# reloj de la cocina en los silencios
for a, b in ((60, 77), (94, 100.6), (106.2, 114), (128, 142), (142, 145.6)):
    k = 0
    tt = a + 0.3
    while tt < b - 0.2:
        S(tick(1900 if k % 2 == 0 else 1500, 0.5), tt, 0.035, 0.6, 0.3)
        tt += 1.0; k += 1
# pastillas a la lata
PL_T, PL_E = 1180.0, 1640.0
S(plink(PL_T), 67.5, 1.0, -0.15, 0.3); S(plink(PL_E), 75.6, 1.0, 0.25, 0.3)
for c in range(5):
    t0 = 77 + c * 1.4
    S(plink(PL_T * (1 + 0.012 * c)), t0 + 0.56 * 1.4, 0.8, -0.2, 0.3); S(plink(PL_E * (1 + 0.012 * c)), t0 + 0.76 * 1.4, 0.8, 0.25, 0.3)
    S(rub(0.38 * 1.4, 3), t0 + 0.52 * 1.4, 0.34, -0.3 if c % 2 == 0 else 0.3, 0.06)
    S(tick(1900, 0.6), t0, 0.05, 0.6); S(tick(1500, 0.6), t0 + 0.7, 0.05, 0.6)
# la goma sobre Tito
S(rub(105.4 - 100.8, 10), 100.8, 0.6, -0.25, 0.08)
# pasos de Elsa
for ts in (100.3, 100.9, 101.5, 102.0, 111.0, 111.8, 112.4): S(footstep(True), ts, 0.1, 0.3, 0.1)
# las latas
S(tick(600, 1.0), 129.2, 0.14, 0.1); S(tick(700, 1.0), 135.0, 0.14, 0.25)
for i in range(9): S(plink(PL_T * rng.uniform(1.5, 2.2), bounce=False), 130.9 + i * 0.2 + 0.4, 0.3, -0.05, 0.3); S(tick(2600, 0.5), 130.9 + i * 0.2 + 0.42, 0.1, -0.05)
for i in range(8): S(plink(PL_E * rng.uniform(1.4, 2.0), bounce=False), 136.5 + i * 0.2 + 0.4, 0.3, 0.12, 0.3); S(tick(2600, 0.5), 136.5 + i * 0.2 + 0.42, 0.1, 0.12)
# almanaque
rip = bandpass(noise(int(SR * 0.4)), 1200, 8000); rt = np.arange(len(rip)) / SR
S(rip * np.exp(-rt / 0.12) * (0.6 + 0.4 * np.sin(2 * np.pi * 60 * rt)), 143.0, 0.22, 0.1, 0.1)
# puerta
S(tick(450, 1.5), 151.2, 0.2, 0.5); S(lowpass(noise(int(SR * 0.3)), 300) * np.exp(-np.arange(int(SR * 0.3)) / SR / 0.06), 151.9, 0.5, 0.5, 0.2)
# bombo: de lejos (143) a la plaza (152–168)
for t0, g in ((143.6, 0.12), (145.6, 0.18), (147.1, 0.24), (148.6, 0.3), (149.6, 0.34), (150.6, 0.4), (151.35, 0.46)):
    S(lowpass(bombo(True), 260), t0, g, -0.2, 0.5)
PB = 0.75
tt = 152.0; k = 0
while tt < 168.2:
    g = 0.5 + 0.4 * float(ramp(tt, 152, 162))
    S(bombo(True), tt, g, -0.1, 0.25)
    S(rim(), tt + PB / 2, 0.22 * g, 0.25, 0.2); S(rim(), tt + PB * 0.75, 0.16 * g, -0.2, 0.2)
    tt += PB; k += 1
# guitarra rasgueada: Am G F E
strum = {'Am': ['A2', 'E3', 'A3', 'C4', 'E4'], 'G': ['G2', 'D3', 'G3', 'B3', 'D4'], 'F': ['F2', 'C3', 'F3', 'A3', 'C4'], 'E': ['E2', 'B2', 'E3', 'G#3', 'B3']}
tt = 155.0; k = 0
while tt < 168.2:
    chd = ('Am', 'G', 'F', 'E')[(k // 4) % 4]
    g = 0.5 + 0.5 * float(ramp(tt, 155, 163))
    for j, nn in enumerate(strum[chd]): M(pluck(hz(nn), 1.3, bright=1.15), tt + j * 0.012, 0.2 * g, 0.3, 0.3)
    for j, nn in enumerate(reversed(strum[chd][1:])): M(pluck(hz(nn), 0.7, bright=1.2), tt + PB / 2 + j * 0.01, 0.1 * g, 0.3, 0.3)
    tt += PB; k += 1
# murmullo de multitud
def murmur(dur, nv=26):
    n = int(SR * dur); t = np.arange(n) / SR; out = np.zeros(n)
    for v in range(nv):
        f0 = rng.uniform(95, 215)
        ph = 2 * np.pi * np.cumsum(f0 * (1 + 0.03 * np.sin(2 * np.pi * rng.uniform(0.3, 1.1) * t + rng.uniform(0, 6)))) / SR
        y = np.zeros(n)
        for kk in range(1, 14): y += np.sin(kk * ph + rng.uniform(0, 6.28)) / kk
        f1, f2 = rng.uniform(380, 780), rng.uniform(1000, 2100)
        y = fft_filter(y, lambda f: np.exp(-((f - f1) / 160) ** 2) + 0.5 * np.exp(-((f - f2) / 260) ** 2))
        syl = np.zeros(n); tt_ = rng.uniform(0, 0.4)
        while tt_ < dur:
            d = rng.uniform(0.12, 0.34); i0, i1 = int(tt_ * SR), min(n, int((tt_ + d) * SR))
            if i1 > i0: syl[i0:i1] = np.sin(np.pi * np.linspace(0, 1, i1 - i0)) * rng.uniform(0.3, 1)
            tt_ += d + rng.uniform(0.02, 0.5)
        out += y * syl * rng.uniform(0.5, 1)
    return out / nv
mm = murmur(22.5); mt = np.arange(len(mm)) / SR
menv = ramp(mt, 0, 9) * (1 - 0.75 * ramp(mt, 12.4, 16.4)) * (1 - ramp(mt, 21, 22.5))
S(mm * menv, 152.0, 2.6, -0.3, 0.4)
mm2 = murmur(22.5, 20); S(mm2 * menv, 152.0, 2.2, 0.35, 0.4)
# cacerolas y silbatos
tt = 156.0
while tt < 167.8:
    S(plink(rng.uniform(900, 1500), bounce=False) * 0.8, tt, 0.25 * float(ramp(tt, 156, 162)), rng.uniform(-0.8, 0.5), 0.3)
    tt += rng.uniform(0.18, 0.55)
for t0 in (158.2, 160.9, 163.4, 165.2):
    n = int(SR * 0.5); t = np.arange(n) / SR
    wsl = np.sin(2 * np.pi * np.cumsum(2500 + 160 * np.sin(2 * np.pi * 38 * t)) / SR) * np.minimum(1, t / 0.02) * (1 - ramp(t, 0.35, 0.5))
    S(wsl, t0, 0.05, rng.uniform(-0.7, 0.3), 0.4)
# la tinta: un zumbido grave que llega
dn = int(SR * 17); dt_ = np.arange(dn) / SR
drone = (np.sin(2 * np.pi * 43 * dt_) + 0.6 * np.sin(2 * np.pi * 64.6 * dt_ + 1) + 0.35 * np.sin(2 * np.pi * 86.3 * dt_)) * (1 + 0.15 * np.sin(2 * np.pi * 0.7 * dt_))
drone += lowpass(noise(dn), 140) * 1.5
S(drone * ramp(dt_, 0, 4.2) * (1 - ramp(dt_, 9.5, 17)), 164.0, 0.3, 0.5, 0.1)
# botas
for k in range(10): S(lowpass(bombo(False), 400), 164.3 + k * 0.4, 0.22 * (0.4 + 0.06 * k), 0.6, 0.2); S(tick(300, 1.2), 164.3 + k * 0.4, 0.07, 0.6, 0.2)
# sus tres pasos
for ts in (168.9, 169.75, 170.6): S(footstep(True), ts, 0.2, 0.3, 0.3)
# gases: disparo, vuelo, siseo
for tl, x in ((171.9, 1180), (172.4, 820), (173.0, 500)):
    pan = float(np.clip((x - 960) / 900, -1, 1))
    n = int(SR * 0.5); t = np.arange(n) / SR
    pop = np.sin(2 * np.pi * np.cumsum(140 * np.exp(-t / 0.05) + 50) / SR) * np.exp(-t / 0.07) + lowpass(noise(n), 900) * np.exp(-t / 0.03)
    S(pop, tl - 0.95, 0.75, 0.7, 0.4)
    n = int(SR * 0.95); t = np.arange(n) / SR
    wh = bandpass(noise(n), 1800, 5200) * np.sin(np.pi * t / 0.95) * 0.3
    S(wh, tl - 0.95, 0.25, pan * 0.5 + 0.3, 0.3)
    S(tick(380, 1.6), tl, 0.4, pan, 0.3)
    n = int(SR * 7.5); t = np.arange(n) / SR
    hiss = bandpass(noise(n), 2800, 11000) * (ramp(t, 0, 0.25) * (1 - ramp(t, 1.5, 7.5)) ** 1.4) * (0.8 + 0.2 * np.sin(2 * np.pi * 7 * t))
    S(hiss, tl, 0.26, pan, 0.25)
# el desbande: bombo roto, una cacerola que cae
for ts, g in ((172.2, 0.7), (172.75, 0.5), (173.5, 0.6), (174.0, 0.35), (174.9, 0.3)): S(bombo(True), ts, g, rng.uniform(-0.6, 0.3), 0.3)
for ts in (173.1, 173.22, 173.31, 173.38, 173.9, 174.6, 174.7): S(plink(rng.uniform(700, 1100), bounce=False), ts, 0.5, rng.uniform(-0.6, 0.4), 0.4)
mm3 = murmur(5.0, 22); m3t = np.arange(len(mm3)) / SR
S(highpass(mm3, 500) * ramp(m3t, 0, 0.3) * (1 - ramp(m3t, 2.2, 5.0)), 172.0, 4.2, -0.2, 0.5)
# la boina cae
S(footstep(True), 176.3, 0.2, 0.2, 0.3)
# pasitos de la nena
tt = 185.2; k = 0
while tt < 189.6:
    S(footstep(False), tt, 0.11 * float(ramp(tt, 185.0, 187)), -0.6 + 0.6 * (tt - 185.2) / 4.4, 0.4)
    tt += 0.3; k += 1
for ts in (192.2, 192.5, 192.8, 193.1, 193.4): S(footstep(False), ts, 0.11, -0.05, 0.4)
# se tocan las manos / la vuelven a dibujar
S(bell(hz('E6'), 3.0), 195.5, 0.2, 0.1, 0.8); S(bell(hz('A5'), 3.0), 195.52, 0.14, 0.1, 0.8)
S(scratch(3.0, strokes=None), 195.55, 0.2, 0.2, 0.1)
# los pibes llegan, redibujan
S(scratch(6.2, 500, 2600, rough=18), 201.2, 0.11, -0.3, 0.1); S(scratch(5.6, 1600, 7500), 202.4, 0.1, 0.3, 0.1)
# pasos de la marcha
tt = 206.9
while tt < 210.2:
    S(footstep(True), tt, 0.14, rng.uniform(-0.5, 0.5), 0.3); S(footstep(False), tt + 0.17, 0.08, rng.uniform(-0.5, 0.5), 0.3)
    tt += 0.36
# título: lápiz, goma, crayón, goma que no puede
S(scratch(0.8, strokes=0.36), 210.6, 0.2, -0.3, 0.1); S(scratch(1.8, strokes=0.24), 211.5, 0.2, 0.1, 0.1)
S(rub(2.0, 4), 214.2, 0.5, 0.2, 0.08)
S(scratch(2.4, 500, 2600, strokes=0.26, rough=18), 216.8, 0.26, 0.15, 0.1)
S(rub(1.15, 7), 219.82, 0.42, 0.15, 0.08)

# zumbido en los oídos
tn_ = int(SR * 13); tt_ = np.arange(tn_) / SR
tin = (np.sin(2 * np.pi * 3420 * tt_) + 0.5 * np.sin(2 * np.pi * 5130 * tt_ + 1) + 0.25 * np.sin(2 * np.pi * 3432 * tt_)) * ramp(tt_, 0, 3.2) * (1 - ramp(tt_, 6.5, 13)) ** 1.5
tinn = Bus(); tinn.add(tin, 174.4, 0.022, 0.0)

print('mezcla...', flush=True)
# ------------------------------------------------------------ mezcla
def reverb(st, rt=2.6, seed=7):
    r = np.random.default_rng(seed)
    n = int(SR * rt * 1.2); t = np.arange(n) / SR
    out = []
    for ch in range(2):
        ir = r.standard_normal(n) * np.exp(-6.9 * t / rt)
        ir = fft_filter(ir, lambda f: 1 / np.sqrt(1 + (f / 4200) ** 2) / np.sqrt(1 + (160 / np.maximum(f, 1e-3)) ** 2))
        ir[:int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
        ir /= np.sqrt(np.sum(ir ** 2))
        m = len(st[ch]) + n; nfft = 1 << int(np.ceil(np.log2(m)))
        y = np.fft.irfft(np.fft.rfft(st[ch], nfft) * np.fft.rfft(ir, nfft), nfft)[:len(st[ch])]
        out.append(y)
    return np.stack(out)

tl = np.arange(N) / SR
# la radio: banda angosta que se abre (18–24) hasta fundirse con la música
rs = radio.stereo()
rs_nar = np.stack([bandpass(rs[0], 420, 2600, 3), bandpass(rs[1], 420, 2600, 3)])
openk = ramp(tl, 20.0, 24.0)
radio_mix = rs_nar * (1 - openk) * 1.5 + rs * openk
radio_mix[:, int(84 * SR):int(96 * SR)] = rs_nar[:, int(84 * SR):int(96 * SR)] * 1.35     # la vela: siempre radio chiquita

mus = music.stereo() + radio_mix
# la goma apaga la luz: la música pierde brillo (46–56)
dark = ramp(tl, 45.4, 46.4) * (1 - ramp(tl, 56, 58))
mus_lp = np.stack([lowpass(mus[0], 1500), lowpass(mus[1], 1500)])
mus = mus * (1 - dark * 0.75) + mus_lp * dark * 0.75

base = mus * 0.9 + reverb(mrev.stereo(), 2.8, 7) * 0.85 + sfx.stereo() + reverb(srev.stereo(), 1.5, 9) * 0.8
base += np.stack([lowpass(noise(N), 400), lowpass(noise(N), 400)]) * 0.0012        # ruido de sala, apenas
# el gas: todo se ensordece (174–181), queda el zumbido, y después vuelve a abrirse
muf = ramp(tl, 174.2, 177.0) * (1 - ramp(tl, 181.5, 185.0))
base_lp = np.stack([lowpass(base[0], 380), lowpass(base[1], 380)])
mix = base * (1 - muf) + base_lp * muf
mix *= 1 - ramp(tl, 176.5, 180.5) * (1 - ramp(tl, 181.5, 184.5))
mix += tinn.stereo()
# fundidos de entrada y salida
mix *= ramp(tl, 0.0, 0.6) * (1 - ramp(tl, 223.4, 224.7))
# limitador suave y normalización
peak = np.max(np.abs(mix)); print('pico antes:', round(float(peak), 3))
mix = np.tanh(mix / 0.82) * 0.82
mix = mix / np.max(np.abs(mix)) * 0.89
pcm = (mix.T * 32767).astype(np.int16)
out = sys.argv[1] if len(sys.argv) > 1 else 'la_minima.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('listo:', out, round(len(pcm) / SR, 2), 's')
