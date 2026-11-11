'use strict';
/* =====================================================================
   LA MÍNIMA — motor de dibujo
   Todo lo que se ve en el corto se dibuja acá, cuadro por cuadro:
   trazo de grafito, tramado, tinta, crayón, papel, goma de borrar.
   ===================================================================== */
const W = 1920, H = 1080, FPS = 24;
const F = { t: 0, frame: 0, boil: 0 };

/* ---------- utilidades ---------- */
function clamp(x, a = 0, b = 1) { return x < a ? a : x > b ? b : x; }
function lerp(a, b, k) { return a + (b - a) * k; }
function inv(t, a, b) { return clamp((t - a) / (b - a)); }
const E = {
  lin: x => x,
  in: x => x * x,
  out: x => 1 - (1 - x) * (1 - x),
  io: x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2,
  io3: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  out3: x => 1 - Math.pow(1 - x, 3),
  in3: x => x * x * x,
  sm: x => x * x * (3 - 2 * x),
  back: x => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
};
function ramp(t, a, b, e = E.io) { return e(inv(t, a, b)); }
/* sube entre a..b y baja entre c..d */
function bump(t, a, b, c, d, e = E.io) { return Math.min(ramp(t, a, b, e), 1 - ramp(t, c, d, e)); }
function mix(a, b, k) {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * k;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => mix(v, b[i], k));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const o = {};
    for (const key in a) o[key] = (key in b) ? mix(a[key], b[key], k) : a[key];
    for (const key in b) if (!(key in o)) o[key] = b[key];
    return o;
  }
  return k < 0.5 ? a : b;
}
/* cuadros clave: [[t, valor, ease?], ...] — la ease de una clave rige la llegada a ella */
function kf(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1][1];
  for (let i = 0; i < n - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t >= a[0] && t <= b[0]) {
      const e = b[2] || E.io;
      return mix(a[1], b[1], e(inv(t, a[0], b[0])));
    }
  }
  return keys[n - 1][1];
}

/* ---------- azar determinista ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function hashInt(a, b) {
  let h = (a | 0) ^ Math.imul((b | 0) + 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h ^= h >>> 12;
  return h >>> 0;
}
function rnd(a, b) { return hashInt(a, b) / 4294967296; }
function n1(x, seed) { const i = Math.floor(x), f = x - i; const a = rnd(i, seed), b = rnd(i + 1, seed); const u = f * f * (3 - 2 * f); return a + (b - a) * u; }
function sn1(x, seed) { return n1(x, seed) * 2 - 1; }
function n2(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const h = (i, j) => rnd(i * 73856093 ^ j * 19349663, seed);
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/* ---------- vectores ---------- */
function vadd(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
function vsub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
function vmul(a, k) { return [a[0] * k, a[1] * k]; }
function vlen(a) { return Math.hypot(a[0], a[1]); }
function vlerp(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
function rot2(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; }

/* ---------- pila de matrices (transformo yo, no el canvas) ---------- */
const MS = { m: [1, 0, 0, 1, 0, 0], stack: [] };
function mPush() { MS.stack.push(MS.m.slice()); }
function mPop() { MS.m = MS.stack.pop(); }
function mReset() { MS.m = [1, 0, 0, 1, 0, 0]; MS.stack.length = 0; }
function mMul(a, b, c, d, e, f) {
  const m = MS.m;
  MS.m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]];
}
function mTranslate(x, y) { mMul(1, 0, 0, 1, x, y); }
function mScale(sx, sy) { mMul(sx, 0, 0, sy === undefined ? sx : sy, 0, 0); }
function mRotate(a) { const c = Math.cos(a), s = Math.sin(a); mMul(c, s, -s, c, 0, 0); }
function TP(p) { const m = MS.m; return [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]]; }
function withT(x, y, fn, rot = 0, sx = 1, sy) { mPush(); mTranslate(x, y); if (rot) mRotate(rot); if (sx !== 1 || sy !== undefined) mScale(sx, sy === undefined ? sx : sy); try { fn(); } finally { mPop(); } }

/* ---------- caminos (listas de puntos en coordenadas locales) ---------- */
function pLine(x1, y1, x2, y2) { return [[x1, y1], [x2, y2]]; }
function pPoly(pts, closed = false) { const o = pts.map(p => [p[0], p[1]]); if (closed) o.push([pts[0][0], pts[0][1]]); return o; }
function pRect(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]; }
function pArc(cx, cy, rx, ry, a0, a1, n) {
  n = n || Math.max(6, Math.ceil(Math.abs(a1 - a0) * 6));
  const o = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return o;
}
function pCircle(cx, cy, r, n) { return pArc(cx, cy, r, r, 0, Math.PI * 2, n || 20); }
function pEllipse(cx, cy, rx, ry, rot = 0, n = 22) {
  const o = [];
  for (let i = 0; i <= n; i++) { const a = Math.PI * 2 * i / n; const p = rot2([Math.cos(a) * rx, Math.sin(a) * ry], rot); o.push([cx + p[0], cy + p[1]]); }
  return o;
}
function pBez(p0, p1, p2, p3, n = 14) {
  const o = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return o;
}
function pQuad(p0, p1, p2, n = 12) {
  const o = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]); }
  return o;
}
/* spline Catmull-Rom que pasa por los puntos */
function pSpline(pts, closed = false, seg = 7) {
  const n = pts.length; const o = [];
  const get = i => closed ? pts[(i % n + n) % n] : pts[clamp(i, 0, n - 1)];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let j = 0; j < seg; j++) {
      const t = j / seg, t2 = t * t, t3 = t2 * t;
      o.push([
        0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  o.push(closed ? [pts[0][0], pts[0][1]] : [pts[n - 1][0], pts[n - 1][1]]);
  return o;
}
function pRoundRect(x, y, w, h, r) {
  const q = Math.PI / 2;
  return [].concat(pArc(x + w - r, y + r, r, r, -q, 0, 4), pArc(x + w - r, y + h - r, r, r, 0, q, 4), pArc(x + r, y + h - r, r, r, q, 2 * q, 4), pArc(x + r, y + r, r, r, 2 * q, 3 * q, 4), [[x + w - r, y]]);
}
function pOff(pts, dx, dy) { return pts.map(p => [p[0] + dx, p[1] + dy]); }
function pathLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
function pointAt(pts, k) {
  const L = pathLen(pts) * clamp(k); let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + d >= L) { const u = d ? (L - acc) / d : 0; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u]; }
    acc += d;
  }
  return pts[pts.length - 1].slice();
}
function resample(pts, step) {
  const out = [pts[0]]; let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const x0 = pts[i - 1][0], y0 = pts[i - 1][1], x1 = pts[i][0], y1 = pts[i][1];
    const d = Math.hypot(x1 - x0, y1 - y0); if (d === 0) continue;
    let pos = step - acc;
    while (pos <= d) { const k = pos / d; out.push([x0 + (x1 - x0) * k, y0 + (y1 - y0) * k]); pos += step; }
    acc = d - (pos - step);
  }
  const last = pts[pts.length - 1], lo = out[out.length - 1];
  if (Math.hypot(last[0] - lo[0], last[1] - lo[1]) > 0.05) out.push(last);
  return out;
}

/* ---------- capas ---------- */
function mk(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const L = {};      // capas: main, g (grafito), k (tinta), c (crayón), w (aguada), s (esfumado), o (encima)
const TEX = {};    // texturas
const G = {
  ctx: null, style: null, color: '#24252a', alphaMul: 1, zoom: 1,
  mask: null, bbox: null, rev: null, seedBase: 1, sc: 0, layer: 'g', boil: null,
};
function initLayers() {
  for (const k of ['main', 'g', 'k', 'c', 'w', 's', 'o', 'tmp', 'mask', 'tmp2']) {
    const c = mk(); L[k] = { c, ctx: c.getContext('2d', { willReadFrequently: false }) };
  }
}
function clearLayers() {
  for (const k of ['g', 'k', 'c', 'w', 's', 'o']) L[k].ctx.clearRect(0, 0, W, H);
}
function setLayer(name) {
  G.layer = name; G.ctx = L[name].ctx;
  G.style = name === 'c' ? ST.crayon : name === 'k' ? ST.ink : ST.pencil;
  G.color = name === 'k' ? '#0b0b0d' : '#24252a';
}
function onLayer(name, fn) { const pl = G.layer, pc = G.ctx, ps = G.style, pcol = G.color; setLayer(name); try { fn(); } finally { G.layer = pl; G.ctx = pc; G.style = ps; G.color = pcol; } }

/* ---------- semillas por objeto ---------- */
function obj(key, fn) {
  const pb = G.seedBase, pc = G.sc; G.seedBase = hashStr(key); G.sc = 0;
  try { fn(); } finally { G.seedBase = pb; G.sc = pc; }
}
function nextSeed() { return hashInt(G.seedBase, G.sc++); }

/* ---------- "se dibuja solo": revela los trazos de un objeto en orden ---------- */
const REV_CACHE = {};
function revealObj(key, p, fn) {
  if (p <= 0) return;
  if (p >= 1) { obj(key, fn); return; }
  if (!(key in REV_CACHE)) { const r = { i: 0, counting: true }; const prev = G.rev; G.rev = r; obj(key, fn); G.rev = prev; REV_CACHE[key] = r.i; }
  const prev = G.rev; G.rev = { i: 0, n: REV_CACHE[key], p, counting: false };
  try { obj(key, fn); } finally { G.rev = prev; }
}
function revFrac() {
  const r = G.rev; if (!r) return 1;
  const i = r.i++; if (r.counting) return 0;
  const n = Math.max(1, r.n);
  const wdw = Math.min(1, 2.2 / n);
  const s = (n > 1 ? i / (n - 1) : 0) * (1 - wdw);
  return clamp((r.p - s) / wdw);
}

/* ---------- estilos de trazo ---------- */
function bboxAdd(sp, pad) {
  const b = G.bbox; if (!b) return;
  for (let i = 0; i < sp.length; i++) {
    const x = sp[i][0], y = sp[i][1];
    if (x - pad < b[0]) b[0] = x - pad; if (y - pad < b[1]) b[1] = y - pad;
    if (x + pad > b[2]) b[2] = x + pad; if (y + pad > b[3]) b[3] = y + pad;
  }
}
function texStroke(ctx, sp, o, P) {
  const seed = (o.seed !== undefined ? (typeof o.seed === 'string' ? hashStr(o.seed) : o.seed >>> 0) : nextSeed());
  const zs = Math.pow(G.zoom, 0.42);
  const w = (o.w ?? 1.5) * P.wMul * zs;
  const a = (o.a ?? 0.85) * P.aMul * G.alphaMul;
  if (a <= 0.003) return;
  const jit = (o.jit ?? 1) * P.jitMul * (0.75 + 0.25 * zs);
  const passes = o.passes ?? P.passes;
  let rp = resample(sp, P.step);
  const reveal = o.reveal ?? 1;
  if (reveal < 1) { if (reveal <= 0) return; rp = rp.slice(0, Math.max(2, Math.ceil(rp.length * reveal))); }
  const n = rp.length; if (n < 2) return;
  const boil = o.noBoil ? 0 : ((G.boil ?? F.boil) + (o.boilOff || 0));
  ctx.lineCap = P.cap; ctx.lineJoin = 'round'; ctx.strokeStyle = o.color || G.color;
  const CH = P.chunk;
  for (let p = 0; p < passes; p++) {
    const s = hashInt(seed + p * 7919, boil * 31 + 7);
    const r = mulberry32(s);
    const ph = r() * 1000, ph2 = r() * 1000;
    const wob = jit * (0.6 + 0.8 * r());
    const lw = w * (0.7 + 0.6 * r());
    const base = a * (0.62 + 0.38 * r());
    const f1 = P.freq;
    const slow = (o.slow ?? 1) * Math.min(2.6, n * 0.03) * (0.75 + 0.25 * zs);
    for (let c = 0; c < n - 1; c += CH) {
      const e = Math.min(n - 1, c + CH);
      ctx.beginPath();
      for (let i = c; i <= e; i++) {
        const u = i * f1;
        const x = rp[i][0] + sn1(u + ph, s) * wob + sn1(i * 0.83 + ph, s + 1) * wob * 0.22 + sn1(i * 0.021 + ph, seed + 11) * slow;
        const y = rp[i][1] + sn1(u + ph2, s + 2) * wob + sn1(i * 0.83 + ph2, s + 3) * wob * 0.22 + sn1(i * 0.021 + ph2, seed + 12) * slow;
        if (i === c) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      const press = 0.62 + 0.38 * n1(c * 0.06 + ph, s + 5);
      let tp = 1;
      if (o.taper !== false && n > CH * 2) { const d = Math.min(c, n - 1 - e) / CH; if (d < 1) tp = 0.55 + 0.45 * d; }
      ctx.globalAlpha = Math.min(1, base * press);
      ctx.lineWidth = Math.max(0.45, lw * tp * (0.8 + 0.4 * press));
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}
const ST = {
  pencil: { wMul: 1, aMul: 1, jitMul: 1, passes: 2, step: 5, chunk: 6, cap: 'butt', freq: 0.11, hatchW: 1 },
  crayon: { wMul: 2.9, aMul: 0.9, jitMul: 1.7, passes: 3, step: 5, chunk: 8, cap: 'round', freq: 0.09, hatchW: 2.2 },
  ink: { wMul: 2.2, aMul: 1.15, jitMul: 0.8, passes: 2, step: 5, chunk: 10, cap: 'round', freq: 0.08, hatchW: 1.6 },
};

/* ---------- operaciones de dibujo ---------- */
function stroke(pts, o = {}) {
  if (!pts || pts.length < 2) return;
  let rv = 1;
  if (G.rev) { rv = revFrac(); if (G.rev.counting || rv <= 0) return; }
  const sp = new Array(pts.length);
  for (let i = 0; i < pts.length; i++) sp[i] = TP(pts[i]);
  bboxAdd(sp, 18);
  if (rv < 1) o = Object.assign({}, o, { reveal: (o.reveal ?? 1) * rv });
  texStroke(G.ctx, sp, o, G.style);
}
function tracePath(ctx, sp) { ctx.beginPath(); ctx.moveTo(sp[0][0], sp[0][1]); for (let i = 1; i < sp.length; i++) ctx.lineTo(sp[i][0], sp[i][1]); ctx.closePath(); }
/* "knock": tapa lo que hay detrás (como si la figura fuera papel opaco) */
function knock(pts, alpha = 1) {
  if (!pts || pts.length < 3) return;
  if (G.rev) { if (G.rev.counting) return; alpha *= clamp(G.rev.p * 2); }
  const sp = pts.map(TP); bboxAdd(sp, 4);
  const ctx = G.ctx;
  ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = clamp(alpha); tracePath(ctx, sp); ctx.fill(); ctx.restore();
  if (G.mask) { const m = G.mask; m.save(); m.globalAlpha = clamp(alpha); m.fillStyle = '#000'; tracePath(m, sp); m.fill(); m.restore(); }
}
function fill(pts, color, alpha = 1) {
  if (!pts || pts.length < 3) return;
  if (G.rev) { if (G.rev.counting) return; alpha *= clamp(G.rev.p * 1.5 - 0.3); }
  const sp = pts.map(TP); bboxAdd(sp, 4);
  const ctx = G.ctx;
  ctx.save(); ctx.globalAlpha = clamp(alpha * G.alphaMul); ctx.fillStyle = color; tracePath(ctx, sp); ctx.fill(); ctx.restore();
}
/* tramado a lápiz recortado a un polígono */
function hatch(pts, o = {}) {
  if (!pts || pts.length < 3) return;
  let rv = 1;
  if (G.rev) { rv = revFrac(); if (G.rev.counting || rv <= 0) return; }
  const sp = pts.map(TP); bboxAdd(sp, 4);
  const ctx = G.ctx;
  const seed = (o.seed !== undefined ? (typeof o.seed === 'string' ? hashStr(o.seed) : o.seed >>> 0) : nextSeed());
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of sp) { if (p[0] < x0) x0 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[0] > x1) x1 = p[0]; if (p[1] > y1) y1 = p[1]; }
  if (x1 < 0 || y1 < 0 || x0 > W || y0 > H) return;
  const zs = Math.pow(G.zoom, 0.5);
  const ang = o.angle ?? -0.95;
  const gap = Math.max(2.2, (o.gap ?? 6) * zs);
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const R = Math.hypot(x1 - x0, y1 - y0) / 2 + 4;
  const boil = o.noBoil ? 0 : Math.floor((G.boil ?? F.boil) / 2);
  const r = mulberry32(hashInt(seed, boil * 17 + 3));
  ctx.save(); tracePath(ctx, sp); ctx.clip();
  const P = G.style;
  const total = Math.ceil(2 * R / gap);
  const lim = rv < 1 ? Math.ceil(total * rv) : total;
  let cnt = 0;
  const sub = { w: (o.w ?? 1.1) * P.hatchW / P.wMul, a: o.a ?? 0.5, jit: o.jit ?? 0.9, passes: 1, taper: false, color: o.color, noBoil: true };
  for (let k = -R; k < R; k += gap * (0.72 + 0.56 * r())) {
    if (cnt++ >= lim) break;
    const l0 = -R * (0.92 + 0.08 * r()), l1 = R * (0.92 + 0.08 * r());
    const skew = (r() - 0.5) * 0.06;
    const ax = cx + nx * k + dx * l0, ay = cy + ny * k + dy * l0;
    const bx = cx + nx * (k + skew * R) + dx * l1, by = cy + ny * (k + skew * R) + dy * l1;
    sub.seed = hashInt(seed, cnt * 131 + boil);
    sub.a = (o.a ?? 0.5) * (0.7 + 0.5 * r());
    texStroke(ctx, [[ax, ay], [bx, by]], sub, P);
  }
  ctx.restore();
  if (o.cross) hatch(pts, Object.assign({}, o, { cross: false, angle: ang + (o.crossAngle ?? 1.2), seed: seed + 991, a: (o.a ?? 0.5) * 0.8 }));
}
/* forma completa: tapa + tramado + contorno */
function shape(pts, o = {}) {
  if (o.knock !== false) knock(pts, o.knock ?? 1);
  if (o.fill) fill(pts, o.fill, o.fillA ?? 1);
  if (o.hatch) hatch(pts, o.hatch);
  if (o.stroke !== false) stroke(pts, o.stroke || {});
}

/* ---------- grupos: opacidad de conjunto + goma de borrar ---------- */
function group(o, fn) {
  const alpha = o.alpha ?? 1;
  if (alpha <= 0.004) return;
  const parent = G.ctx, pmask = G.mask, pbbox = G.bbox;
  const tmp = L.tmp, mask = L.mask;
  G.ctx = tmp.ctx; G.mask = mask.ctx; G.bbox = [1e9, 1e9, -1e9, -1e9];
  if (G._gb) { tmp.ctx.clearRect(G._gb[0], G._gb[1], G._gb[2], G._gb[3]); mask.ctx.clearRect(G._gb[0], G._gb[1], G._gb[2], G._gb[3]); }
  else { tmp.ctx.clearRect(0, 0, W, H); mask.ctx.clearRect(0, 0, W, H); }
  try { fn(); } finally { G.ctx = parent; G.mask = pmask; }
  const b = G.bbox; G.bbox = pbbox;
  let bx = Math.max(0, Math.floor(b[0]) - 6), by = Math.max(0, Math.floor(b[1]) - 6);
  let bw = Math.min(W, Math.ceil(b[2]) + 6) - bx, bh = Math.min(H, Math.ceil(b[3]) + 6) - by;
  G._gb = null;
  if (bw <= 0 || bh <= 0) return;
  G._gb = [bx, by, bw, bh];
  if (o.erase) { o.erase(tmp.ctx); o.erase(mask.ctx); }
  parent.save();
  parent.globalCompositeOperation = 'destination-out';
  parent.globalAlpha = clamp(alpha * (o.knock ?? 1));
  parent.drawImage(mask.c, bx, by, bw, bh, bx, by, bw, bh);
  parent.globalCompositeOperation = 'source-over';
  parent.globalAlpha = clamp(alpha);
  parent.drawImage(tmp.c, bx, by, bw, bh, bx, by, bw, bh);
  parent.restore();
  if (pbbox) { if (b[0] < pbbox[0]) pbbox[0] = b[0]; if (b[1] < pbbox[1]) pbbox[1] = b[1]; if (b[2] > pbbox[2]) pbbox[2] = b[2]; if (b[3] > pbbox[3]) pbbox[3] = b[3]; }
}
/* pasada de goma: borra a lo largo de un camino (en pantalla), deja ~10% de fantasma */
function eraseStroke(ctx, sp, width, strength = 0.9) {
  if (sp.length < 2) return;
  ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000';
  const pass = (w, a) => { ctx.globalAlpha = a; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(sp[0][0], sp[0][1]); for (let i = 1; i < sp.length; i++) ctx.lineTo(sp[i][0], sp[i][1]); ctx.stroke(); };
  pass(width, strength * 0.45); pass(width * 0.8, strength * 0.82);
  ctx.restore();
}

/* ---------- cámara ---------- */
function camera(cx, cy, zoom, rot = 0) {
  mReset(); mTranslate(W / 2, H / 2); if (rot) mRotate(rot); mScale(zoom); mTranslate(-cx, -cy); G.zoom = zoom;
}

/* ---------- aguadas (luz, color) y esfumados ---------- */
function washRadial(x, y, r, color, a = 1, layer = 'w') {
  const ctx = L[layer].ctx; const p = TP([x, y]); const z = G.zoom; const rr = r * z;
  const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], rr);
  g.addColorStop(0, color); g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  ctx.save(); ctx.globalAlpha = clamp(a); ctx.fillStyle = g; ctx.fillRect(p[0] - rr, p[1] - rr, rr * 2, rr * 2); ctx.restore();
}
function washPoly(pts, color, a = 1, blur = 0, layer = 'w') {
  const ctx = L[layer].ctx; const sp = pts.map(TP);
  ctx.save(); if (blur) ctx.filter = `blur(${blur}px)`; ctx.globalAlpha = clamp(a); ctx.fillStyle = color; tracePath(ctx, sp); ctx.fill(); ctx.restore();
}

function smudgeAlong(path, prog, width, alpha, blur = 14) {
  if (prog <= 0 || alpha <= 0) return;
  const n = Math.max(2, Math.ceil(path.length * clamp(prog))); const sp = path.slice(0, n).map(TP);
  const ctx = L.s.ctx; ctx.save(); ctx.filter = `blur(${blur * G.zoom}px)`; ctx.globalAlpha = alpha; ctx.strokeStyle = 'rgb(70,70,78)'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = width * G.zoom;
  ctx.beginPath(); ctx.moveTo(sp[0][0], sp[0][1]); for (let i = 1; i < sp.length; i++) ctx.lineTo(sp[i][0], sp[i][1]); ctx.stroke(); ctx.restore();
}
function nightWash(alpha, lx, ly, radius, glow = 1) {
  const ctx = L.w.ctx; const p = TP([lx, ly]); const R = radius * G.zoom;
  const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], R);
  g.addColorStop(0, `rgba(86,92,124,${alpha * (1 - 0.82 * glow)})`); g.addColorStop(0.45, `rgba(86,92,124,${alpha * (1 - 0.4 * glow)})`); g.addColorStop(1, `rgba(86,92,124,${alpha})`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  if (glow > 0) { washRadial(lx, ly, radius * 0.75, 'rgba(244,170,60,0.55)', glow); washRadial(lx, ly - 10, radius * 0.16, 'rgba(255,214,110,0.8)', glow); }
}
/* ---------- texturas: papel y "diente" del papel ---------- */
function makeTextures() {
  // papel
  const pc = mk(), px = pc.getContext('2d'); const id = px.createImageData(W, H); const d = id.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const lo = n2(x / 520, y / 520, 11) * 0.6 + n2(x / 170, y / 170, 12) * 0.4;
    const mid = n2(x / 23, y / 23, 13);
    const hi = rnd(x + y * 1921, 14);
    const fib = n2(x / 3.1, y / 46, 15);
    const v = (lo - .5) * 11 + (mid - .5) * 4 + (hi - .5) * 6.5 + (fib - .5) * 1.6;
    d[i] = 239 + v; d[i + 1] = 233 + v; d[i + 2] = 219 + v * 0.92; d[i + 3] = 255;
  }
  px.putImageData(id, 0, 0);
  const r = mulberry32(77);
  for (let k = 0; k < 2600; k++) {      // fibras
    const x = r() * W, y = r() * H, a = r() * 6.28, l = 6 + r() * 26;
    px.strokeStyle = r() < 0.5 ? 'rgba(120,105,80,0.05)' : 'rgba(255,252,240,0.09)'; px.lineWidth = 0.6 + r() * 0.7;
    px.beginPath(); px.moveTo(x, y); px.quadraticCurveTo(x + Math.cos(a) * l * .5 + (r() - .5) * 8, y + Math.sin(a) * l * .5 + (r() - .5) * 8, x + Math.cos(a) * l, y + Math.sin(a) * l); px.stroke();
  }
  TEX.paper = pc;
  // diente: dónde el grafito NO agarra
  const mkTooth = (thr, gain, seed, coarse, maxA) => {
    const c = mk(), cx = c.getContext('2d'); const im = cx.createImageData(W, H); const q = im.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const a = rnd(x + y * 1921, seed);
      const b = rnd((x >> 1) + (y >> 1) * 977, seed + 1);
      const c2 = n2(x / coarse, y / coarse, seed + 2);
      const v = a * 0.42 + b * 0.33 + c2 * 0.25;
      q[i] = 0; q[i + 1] = 0; q[i + 2] = 0; q[i + 3] = clamp((v - thr) * gain) * maxA * 255;
    }
    cx.putImageData(im, 0, 0); return c;
  };
  TEX.tooth = mkTooth(0.47, 4.2, 21, 5, 0.86);
  TEX.toothCrayon = mkTooth(0.43, 5, 31, 7, 0.95);
  TEX.toothInk = mkTooth(0.66, 6, 41, 9, 0.7);
  // viñeta
  const vc = mk(), vx = vc.getContext('2d');
  const g = vx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 1.08);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(196,186,168,1)');
  vx.fillStyle = g; vx.fillRect(0, 0, W, H);
  TEX.vignette = vc;
}
function applyTooth(layer, tex, a = 1) {
  const ctx = layer.ctx; ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = a; ctx.drawImage(tex, 0, 0); ctx.restore();
}

/* ---------- composición final del cuadro ---------- */
const POST = { fadePaper: 0, fadeBlack: 0, look: 'grafito' };
function compose() {
  const m = L.main.ctx;
  m.globalCompositeOperation = 'source-over'; m.globalAlpha = 1; m.filter = 'none';
  m.drawImage(TEX.paper, 0, 0);
  m.globalCompositeOperation = 'multiply';
  m.drawImage(L.w.c, 0, 0);
  m.drawImage(L.s.c, 0, 0);
  applyTooth(L.g, TEX.tooth, 1); m.drawImage(L.g.c, 0, 0);
  applyTooth(L.k, TEX.toothInk, 1); m.drawImage(L.k.c, 0, 0);
  applyTooth(L.c, TEX.toothCrayon, 1); m.drawImage(L.c.c, 0, 0);
  m.globalCompositeOperation = 'source-over';
  m.drawImage(L.o.c, 0, 0);
  m.globalCompositeOperation = 'multiply'; m.drawImage(TEX.vignette, 0, 0);
  m.globalCompositeOperation = 'source-over';
  if (POST.fadePaper > 0) { m.globalAlpha = clamp(POST.fadePaper); m.drawImage(TEX.paper, 0, 0); m.globalCompositeOperation = 'multiply'; m.drawImage(TEX.vignette, 0, 0); m.globalCompositeOperation = 'source-over'; m.globalAlpha = 1; }
  if (POST.fadeBlack > 0) { m.globalAlpha = clamp(POST.fadeBlack); m.fillStyle = '#0c0b0a'; m.fillRect(0, 0, W, H); m.globalAlpha = 1; }
}

/* ---------- letras de un solo trazo (título, almanaque, precios) ---------- */
const GLYPH = {
  A: { w: .8, s: [[[0, 1], [.4, 0], [.8, 1]], [[.15, .64], [.65, .64]]] },
  C: { w: .78, s: [{ sp: [[.74, .2], [.52, .02], [.26, .03], [.06, .25], [0, .5], [.06, .76], [.26, .97], [.52, .98], [.74, .8]] }] },
  D: { w: .78, s: [[[0, 1], [0, 0]], { sp: [[0, 0], [.4, .02], [.7, .25], [.74, .5], [.7, .76], [.4, .98], [0, 1]] }] },
  E: { w: .64, s: [[[.6, 0], [0, 0], [0, 1], [.6, 1]], [[0, .5], [.46, .5]]] },
  I: { w: .22, s: [[[.1, 0], [.1, 1]]] },
  L: { w: .6, s: [[[0, 0], [0, 1], [.55, 1]]] },
  M: { w: .96, s: [[[0, 1], [0, 0], [.45, .72], [.9, 0], [.9, 1]]] },
  N: { w: .76, s: [[[0, 1], [0, 0], [.7, 1], [.7, 0]]] },
  O: { w: .8, s: [{ sp: [[.37, 0], [.1, .14], [0, .5], [.1, .86], [.37, 1], [.64, .86], [.74, .5], [.64, .14]], closed: true }] },
  R: { w: .72, s: [[[0, 1], [0, 0]], { sp: [[0, 0], [.4, .0], [.62, .13], [.62, .37], [.4, .5], [0, .5]] }, [[.3, .5], [.66, 1]]] },
  S: { w: .66, s: [{ sp: [[.6, .15], [.4, .0], [.15, .05], [.05, .25], [.2, .44], [.45, .56], [.6, .75], [.5, .95], [.25, 1.0], [.02, .85]] }] },
  T: { w: .7, s: [[[0, 0], [.66, 0]], [[.33, 0], [.33, 1]]] },
  U: { w: .76, s: [{ sp: [[0, 0], [0, .65], [.12, .92], [.35, 1], [.58, .92], [.7, .65], [.7, 0]] }] },
  B: { w: .7, s: [[[0, 1], [0, 0]], { sp: [[0, 0], [.4, 0], [.56, .12], [.56, .36], [.4, .48], [0, .48]] }, { sp: [[0, .48], [.45, .5], [.62, .64], [.62, .86], [.45, 1], [0, 1]] }] },
  F: { w: .62, s: [[[.58, 0], [0, 0], [0, 1]], [[0, .5], [.44, .5]]] },
  G: { w: .8, s: [{ sp: [[.72, .2], [.5, .02], [.26, .03], [.06, .25], [0, .5], [.06, .76], [.26, .97], [.5, .98], [.72, .8], [.72, .55]] }, [[.72, .55], [.42, .55]]] },
  J: { w: .6, s: [{ sp: [[.5, 0], [.5, .7], [.4, .93], [.2, 1], [.04, .86]] }] },
  V: { w: .8, s: [[[0, 0], [.38, 1], [.76, 0]]] },
  '´': { w: 0, s: [[[.02, -.14], [.26, -.34]]] },
  ' ': { w: .42, s: [] },
  '0': { w: .6, s: [{ sp: [[.27, 0], [.06, .16], [0, .5], [.06, .84], [.27, 1], [.48, .84], [.54, .5], [.48, .16]], closed: true }] },
  '1': { w: .42, s: [[[.04, .22], [.28, 0], [.28, 1]]] },
  '2': { w: .6, s: [{ sp: [[.03, .2], [.2, .02], [.42, .04], [.52, .24], [.4, .5], [.02, 1]] }, [[.02, 1], [.56, 1]]] },
  '3': { w: .6, s: [{ sp: [[.04, .1], [.28, 0], [.5, .14], [.46, .38], [.24, .48]] }, { sp: [[.24, .48], [.5, .6], [.52, .84], [.3, 1], [.03, .9]] }] },
  '4': { w: .62, s: [[[.44, 1], [.44, 0], [0, .68], [.6, .68]]] },
  '5': { w: .6, s: [[[.5, 0], [.1, 0], [.05, .44]], { sp: [[.05, .44], [.3, .38], [.52, .56], [.5, .84], [.3, 1], [.03, .9]] }] },
  '6': { w: .6, s: [{ sp: [[.48, .05], [.2, .2], [.04, .6], [.14, .92], [.34, .99], [.5, .82], [.48, .58], [.3, .48], [.07, .62]] }] },
  '7': { w: .58, s: [[[.02, 0], [.54, 0], [.2, 1]]] },
  '8': { w: .6, s: [{ sp: [[.27, .47], [.08, .34], [.1, .1], [.27, 0], [.44, .1], [.46, .34], [.27, .47], [.05, .64], [.07, .9], [.27, 1], [.47, .9], [.49, .64]], closed: true }] },
  '9': { w: .6, s: [{ sp: [[.47, .4], [.24, .52], [.06, .4], [.05, .16], [.24, .01], [.42, .1], [.5, .4], [.4, .8], [.1, .97]] }] },
  '$': { w: .66, s: [{ sp: [[.56, .2], [.4, .08], [.16, .1], [.06, .28], [.2, .45], [.42, .55], [.56, .73], [.46, .9], [.24, .94], [.03, .82]] }, [[.3, -.06], [.3, 1.08]]] },
  '.': { w: .24, s: [[[.08, .96], [.1, 1]]] },
};
function textWidth(str, size, track = 0.16) { let x = 0; for (const ch of str) { const g = GLYPH[ch]; if (!g) continue; x += (g.w + (g.w ? track : 0)) * size; } return x - track * size; }
/* escribe texto de trazos; p = progreso 0..1 de escritura; devuelve ancho */
function strokeText(str, x, y, size, o = {}) {
  const track = o.track ?? 0.16; let cx = x;
  const strokes = [];
  for (const ch of str) {
    const g = GLYPH[ch]; if (!g) continue;
    for (const s of g.s) {
      let pts = Array.isArray(s) ? s : pSpline(s.sp, !!s.closed, 6);
      strokes.push(pts.map(p => [cx + p[0] * size, y + p[1] * size]));
    }
    cx += (g.w + (g.w ? track : 0)) * size;
  }
  const p = o.p ?? 1; const n = strokes.length;
  strokes.forEach((pts, i) => {
    const wdw = Math.min(1, 1.6 / n); const s0 = (n > 1 ? i / (n - 1) : 0) * (1 - wdw);
    const rv = clamp((p - s0) / wdw); if (rv <= 0) return;
    stroke(pts, Object.assign({ w: 2.2, a: 0.9, jit: 1.1 }, o.stroke || {}, { reveal: rv, seed: hashInt(hashStr(o.seed || str), i), color: o.colors ? o.colors[i % o.colors.length] : (o.stroke && o.stroke.color) }));
  });
  return cx - x;
}
