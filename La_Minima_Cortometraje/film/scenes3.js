'use strict';
/* =====================================================================
   LA MÍNIMA — escenas (3): la plaza, la tinta, el gas, el crayón, el título
   ===================================================================== */
const CRAYONS = ['#d2552b', '#2f62a8', '#3f8f4a', '#e0a01c', '#8a4fa0', '#d2457a', '#1f8a8a'];

function congreso(a = 0.5) {
  G.boil = Math.floor(F.frame / 8);
  const pa = G.alphaMul; G.alphaMul = pa * a;
  obj('congreso', () => {
    const S = { w: 1.3, a: .9 };
    // escalinata
    for (let i = 0; i < 3; i++) stroke([[400 + i * 24, 884 - i * 16], [1560 - i * 24, 884 - i * 16]], S);
    // cuerpo
    stroke([[470, 836], [470, 610], [1490, 610], [1490, 836]], S);
    stroke([[440, 610], [1520, 610]], { w: 1.6, a: .9 }); stroke([[456, 596], [1504, 596]], S);
    // pórtico
    stroke([[760, 596], [980, 520], [1200, 596]], { w: 1.5, a: .9 }); stroke([[790, 590], [980, 538], [1170, 590]], { w: 1, a: .6 });
    for (let i = 0; i <= 8; i++) { const x = 780 + i * 50; stroke([[x, 612], [x, 836]], S); stroke([[x + 9, 612], [x + 9, 836]], { w: 1, a: .6 }); }
    // alas con ventanas
    for (let j = 0; j < 2; j++) for (let i = 0; i < 5; i++) { const x = (j === 0 ? 500 : 1236) + i * 50; stroke(pRect(x, 650, 24, 50), { w: 1, a: .7 }); stroke(pRect(x, 740, 24, 60), { w: 1, a: .7 }); }
    // tambor y cúpula
    stroke([[890, 520], [890, 400], [1070, 400], [1070, 520]], S);
    for (let i = 0; i <= 6; i++) stroke([[900 + i * 26.6, 404], [900 + i * 26.6, 516]], { w: 1, a: .6 });
    stroke([[876, 400], [1084, 400]], { w: 1.5, a: .9 });
    stroke(pSpline([[892, 400], [900, 300], [940, 212], [980, 180], [1020, 212], [1060, 300], [1068, 400]], false, 7), { w: 1.6, a: .95 });
    for (const k of [-0.5, 0, 0.5]) stroke(pSpline([[980 + k * 150, 400], [980 + k * 120, 290], [980 + k * 40, 196]], false, 6), { w: 1, a: .5 });
    stroke(pRect(966, 140, 28, 40), S); stroke([[980, 140], [980, 96]], S); stroke(pCircle(980, 132, 5, 6), { w: 1, a: .7 });
    // faroles
    for (const x of [300, 1660]) { stroke([[x, FLOOR], [x, 560]], { w: 1.6, a: .8 }); stroke(pCircle(x, 548, 12, 10), { w: 1.3, a: .8 }); stroke([[x - 22, 580], [x + 22, 580]], { w: 1.2, a: .7 }); }
  });
  G.alphaMul = pa; G.boil = null;
  stroke([[-400, FLOOR], [2500, FLOOR]], { w: 1.5, a: .7, slow: 1.6, seed: 'plazafloor' });
}

const CROWD = (() => {
  const r = mulberry32(20261111); const a = [];
  for (let i = 0; i < 150; i++) {
    const row = r();
    const xt = 190 + Math.pow(r(), 0.85) * 1070;
    const fromLeft = r() < 0.78; const there = r() < 0.32;
    const sp = 60 + r() * 45;
    const x0 = there ? xt : (fromLeft ? -140 - r() * 520 : 2060 + r() * 260);
    const tArr = there ? 150 : 154 + r() * 8.5;
    a.push({ i, row, xt, x0, tArr, sp, seed: 100 + i, cane: r() < 0.28, sign: r() < 0.17, falls: r() < 0.2, fdir: r() < 0.5 ? 1 : -1, up: r() < 0.3, ph: r() });
  }
  return a.sort((p, q) => p.row - q.row);
})();
const CANS = [{ tl: 171.9, x: 1180 }, { tl: 172.4, x: 820 }, { tl: 173.0, x: 500 }];
function cloudR(c, t) { return t < c.tl ? 0 : 50 + 470 * E.out(inv(t, c.tl, c.tl + 6)); }
function crowdState(f, t) {
  // posición y reacción de cada viejo
  const dur = Math.abs(f.xt - f.x0) / f.sp;
  const k = dur > 0 ? inv(t, f.tArr - dur, f.tArr) : 1;
  let x = lerp(f.x0, f.xt, k); const walking = k > 0 && k < 1;
  let hit = 0, dir = 1;
  for (const c of CANS) { const R = cloudR(c, t) * 0.92; const d = Math.abs(f.xt - c.x); const h = clamp((R - d) / 110); if (h > hit) { hit = h; dir = f.xt >= c.x ? 1 : -1; } }
  x += dir * 44 * E.out(hit);
  const rot = f.falls ? f.fdir * 1.42 * E.io(clamp(hit * 1.3 - 0.2)) : -dir * 0.34 * E.out(hit) * (f.xt < 0 ? 1 : 1);
  return { x, walking, k, hit, rot, dist: Math.abs(x - f.x0) };
}
function drawCrowd(t, o = {}) {
  const bt = (t - 152) / 0.75;         // pulso del bombo
  for (const f of CROWD) {
    const s = crowdState(f, o.freeze ?? t);
    const y = 874 + f.row * 86, h = 262 + f.row * 74;
    const gather = ramp(t, 158, 165);
    let a = (o.alpha ?? (0.22 + 0.2 * gather)) * (0.75 + 0.5 * f.row);
    const rv = o.rev ? o.rev(f) : null;
    if (rv && rv.a !== undefined) a = rv.a;
    if (a <= 0.01) continue;
    const bob = (!s.walking && s.hit <= 0 && !o.still) ? Math.max(0, Math.sin((bt + f.ph * 0.3) * Math.PI * 2)) * 3 * gather : 0;
    const rot = rv && rv.rot !== undefined ? rv.rot : s.rot;
    const xx = s.x + (rv && rv.dx || 0);
    const opt = { seed: f.seed, h, face: (s.walking && f.x0 > f.xt) ? -1 : 1, a, w: 1.25, cane: f.cane && Math.abs(rot) < 0.3, sign: f.sign && Math.abs(rot) < 0.3, walk: (s.walking || (rv && rv.walk !== undefined)) ? (rv && rv.walk !== undefined ? rv.walk : s.dist / (16 * h / 95)) + f.ph : null, rot, arm: (f.up && gather > 0.6 && s.hit <= 0 && !o.still) ? 'up' : 'down', fall: Math.abs(rot) > 0.9 };
    if (rv && rv.p !== undefined && rv.p < 1) { if (rv.p > 0) revealObj('cr' + f.seed, rv.p, () => drawSimpleFig(xx, y - bob, opt)); }
    else drawSimpleFig(xx, y - bob, opt);
  }
}
/* la tinta: escudos, cascos, el camión */
function inkLine(front, t) {
  onLayer('k', () => {
    mPush(); mTranslate(front, 912); mScale(1.3); mTranslate(-front, -912);
    const ctx = G.ctx;
    const wob = (x, y, s) => [x + sn1(y * 0.02 + F.boil * 0.7, s) * 3, y + sn1(x * 0.02 + F.boil * 0.7, s + 1) * 3];
    // masa de atrás y camión
    const mass = [[front + 40, 912], [front + 30, 700]];
    for (let x = front + 30; x < 2500; x += 46) { mass.push(wob(x + 12, 676 + sn1(x * 0.05, 9) * 8, 3)); mass.push(wob(x + 34, 690 + sn1(x * 0.05, 8) * 8, 4)); }
    mass.push([2500, 912]);
    fill(mass, '#0b0b0d', 1);
    const tr = front + 300;
    fill([[tr, 700], [tr + 20, 520], [tr + 150, 500], [tr + 170, 430], [tr + 520, 430], [tr + 540, 700]].map((p, i) => wob(p[0], p[1], 20 + i)), '#0b0b0d', 1);
    fill([[tr + 190, 430], [tr + 60, 380], [tr + 64, 366], [tr + 210, 408]].map((p, i) => wob(p[0], p[1], 40 + i)), '#0b0b0d', 1);   // cañón
    // primera fila: cascos y escudos
    for (let i = 0; i < 9; i++) {
      const x = front + i * 62 + sn1(i * 3.1, 5) * 6; const st = Math.sin(t * 2.2 + i) * 2;
      fill(pEllipse(x + 30, 664 + st, 27, 29, 0, 16).map((p, j) => wob(p[0], p[1], 60 + i)), '#0b0b0d', 1);
      fill(pRoundRect(x, 720 + st, 54, 190, 12).map((p, j) => wob(p[0], p[1], 80 + i)), '#0b0b0d', 1);
      // visor: una rendija de papel
      const v = [[x + 12, 660 + st], [x + 38, 658 + st], [x + 38, 665 + st], [x + 12, 667 + st]].map(TP);
      ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = 0.85; tracePath(ctx, v); ctx.fill(); ctx.restore();
      const sl = [[x + 8, 760 + st], [x + 46, 760 + st], [x + 46, 764 + st], [x + 8, 764 + st]].map(TP);
      ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = 0.5; tracePath(ctx, sl); ctx.fill(); ctx.restore();
    }
    // salpicaduras
    const r = mulberry32(77);
    for (let i = 0; i < 26; i++) { const x = front - 10 - r() * 60, y = 700 + r() * 210, rr = 1 + r() * 4; fill(pCircle(x, y, rr, 6), '#0b0b0d', 0.9); }
    mPop();
  });
}
function gasClouds(t) {
  const sx = L.s.ctx, gx = L.g.ctx;
  for (let ci = 0; ci < CANS.length; ci++) {
    const c = CANS[ci]; const R = cloudR(c, t); if (R <= 0) continue;
    const age = t - c.tl;
    // esfumado gris
    for (let j = 0; j < 7; j++) {
      const an = j * 0.9 + ci, rr = R * (0.45 + 0.3 * rnd(j, ci + 5));
      const px = c.x + Math.cos(an + age * 0.12) * R * 0.42 - age * 10, py = 800 - R * 0.28 + Math.sin(an * 1.3 + age * 0.1) * R * 0.3 - age * 6;
      const p = TP([px, py]); const z = G.zoom;
      const g = sx.createRadialGradient(p[0], p[1], 0, p[0], p[1], rr * z);
      g.addColorStop(0, 'rgba(128,128,134,0.2)'); g.addColorStop(0.55, 'rgba(140,140,146,0.13)'); g.addColorStop(1, 'rgba(150,150,156,0)');
      sx.fillStyle = g; sx.fillRect(p[0] - rr * z, p[1] - rr * z, rr * 2 * z, rr * 2 * z);
    }
    // borra el grafito
    const p = TP([c.x - age * 8, 800 - R * 0.2]); const z = G.zoom;
    const g = gx.createRadialGradient(p[0], p[1], 0, p[0], p[1], R * z);
    g.addColorStop(0, 'rgba(0,0,0,0.9)'); g.addColorStop(0.62, 'rgba(0,0,0,0.86)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    gx.save(); gx.globalCompositeOperation = 'destination-out'; gx.fillStyle = g; gx.fillRect(p[0] - R * z, p[1] - R * z, R * 2 * z, R * 2 * z); gx.restore();
  }
}
function canisters(t) {
  for (const c of CANS) {
    const k = inv(t, c.tl - 0.95, c.tl); if (k <= 0) continue;
    const x0 = 1760, y0 = 600; const path = [];
    for (let i = 0; i <= 24; i++) { const u = i / 24; path.push([lerp(x0, c.x, u), lerp(y0, 880, u) - Math.sin(u * Math.PI) * 430]); }
    const n = Math.max(2, Math.ceil(path.length * k));
    const fade = 1 - ramp(t, c.tl + 0.3, c.tl + 1.8);
    if (fade > 0) { G.alphaMul *= fade; for (let i = 0; i < n - 1; i += 2) stroke([path[i], path[i + 1]], { w: 1.6, a: .7, seed: 'cn' + c.x + i, noBoil: true }); G.alphaMul /= fade; smudgeAlong(path, k, 12, 0.14 * fade, 8); }
    if (k < 1) { const p = path[n - 1]; onLayer('k', () => fill(pEllipse(p[0], p[1], 9, 5, k * 9, 8), '#0b0b0d', 1)); }
  }
}
function kneelPose(o = {}) { return Object.assign({ y: FLOOR, face: -1, hipH: 6, lean: 0.34, hunch: .8, fN: [31, -2.8], fF: [27, -3.4], hN: [13, 21], hF: [9, 22], head: 0.34, brow: 1, mouth: -.4, cap: false }, o); }
function capOnGround(x, y = FLOOR, rot = 0) { withT(x, y - 4, () => { mScale(4); mTranslate(0, 20); drawCap(); }, rot); }

/* ---------- L+M. la plaza (152–182) ---------- */
function sPlaza(_, t) {
  const q = F.tq;
  const z = kf(t, [[152, 1.7], [156.5, 1.7], [160.5, 1.0, E.io], [167, 1.0], [171, 1.12, E.io], [176, 1.0, E.io], [182, 1.0]]);
  const ex0 = lerp(700, 1290, inv(q, 152, 163));
  const cx = kf(t, [[152, 780], [156.5, 930], [160.5, 960, E.io], [167, 960], [171, 1060, E.io], [176, 960, E.io], [182, 960]]);
  const cy = kf(t, [[152, 690], [156.5, 690], [160.5, 560, E.io], [167, 560], [171, 600, E.io], [176, 560, E.io], [182, 560]]);
  camera(cx, cy, z);
  { const ctx = L.w.ctx; ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = 'rgba(196,204,214,1)'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  congreso(0.5);
  drawCrowd(t);
  canisters(t);
  gasClouds(t);
  // Elsa
  let eP;
  const front = kf(t, [[164, 2200], [168.2, 1520, E.out], [182, 1520]]);
  if (q < 163) { eP = walkPose(E_, (ex0 - 700) / 54, { x: ex0, stride: 6.8, lean: 0.14, hunch: .7, cap: true, brow: .4 }); }
  else if (q < 168.6) { eP = standPose(E_, { x: 1290, lean: 0.08, hunch: .7, cap: true, brow: .4 + .4 * ramp(q, 165, 167), head: -0.12 * ramp(q, 165, 167) }); }
  else if (q < 172.3) {      // da tres pasos al frente, sola
    const xx = lerp(1290, 1392, inv(q, 168.6, 171.2));
    const mv = q < 171.2;
    eP = mv ? walkPose(E_, (xx - 1290) / 50, { x: xx, stride: 6.2, lean: 0.1, hunch: .68, cap: true, brow: .8, head: -0.14 }) : standPose(E_, { x: xx, lean: 0.04, hunch: .6, cap: true, brow: .8, head: -0.2 });
  } else {
    // el gas: se tapa la cara, retrocede, cae
    const back = ramp(q, 172.5, 174.4), fall = ramp(q, 174.4, 175.8, E.in);
    const xx = 1392 - 70 * back;
    const st = standPose(E_, { x: xx, face: 1, lean: -0.1 * back, hunch: .8, cap: true, brow: 1, mouth: -.4, head: 0.3 * back });
    reach(E_, st, 'N', headWorld(E_, st, [9, -10]), ramp(q, 172.4, 173.0)); reach(E_, st, 'F', headWorld(E_, st, [8, -5]), ramp(q, 172.6, 173.2));
    const turn = inv(q, 173.6, 174.3);
    const kn = kneelPose({ x: 1312 });
    st.x = lerp(xx, 1312, turn);
    eP = mix(st, kn, fall); eP.face = turn < 0.5 ? 1 : -1; eP.sx = Math.max(0.12, Math.abs(Math.cos(turn * Math.PI))); eP.cap = q < 175.0; eP.blink = 1;
  }
  const eA = lerp(0.56, 0.72, ramp(t, 158, 165)) * (1 - 0.55 * ramp(t, 173, 177));
  floorShadow(eP.x, 60, .12);
  group({ alpha: eA }, () => drawFigure(E_, eP));
  if (q >= 175.0) { const k = inv(q, 175.0, 176.3); capOnGround(lerp(eP.x - 30, 1062, k) , FLOOR - Math.sin(k * Math.PI) * 60 * (1 - k * .3), k * 5.2); }
  if (t >= 164) inkLine(front, t);
  POST.fadePaper = Math.max(1 - ramp(t, 152, 152.9, E.out), 0.93 * ramp(t, 175.8, 180, E.io));
}

/* ---------- N. vuelven a dibujarlos (182–210) ---------- */
const HELPERS = (() => {
  const r = mulberry32(99); const a = []; const used = new Set();
  const cand = CROWD.filter(f => f.row > 0.2 && (f.xt < 1060));
  for (let j = 0; j < 24; j++) {
    let f; do { f = cand[Math.floor(r() * cand.length)]; } while (used.has(f.i)); used.add(f.i);
    const fromLeft = f.xt < 640 ? r() < 0.85 : r() < 0.3; const sp = 250 + r() * 70;
    const x0 = fromLeft ? -220 : 2160; const ts = 201.0 + r() * 3.4;
    a.push({ f, col: CRAYONS[(j + 1) % CRAYONS.length], fromLeft, x0, ts, ta: ts + Math.abs(f.xt - x0) / sp, seed: 500 + j, sp });
  }
  return a;
})();
const HELPED = new Map(HELPERS.map(h => [h.f.i, h]));
function sHope(_, t) {
  const q = F.tq;
  const z = kf(t, [[182, 1.36], [200.5, 1.5], [204.0, 1.0, E.io], [206.4, 1.0], [210.2, 1.42, E.io]]);
  const cx = kf(t, [[182, 1110], [200.5, 1180], [204.0, 960, E.io], [206.4, 960], [210.2, 1330, E.io]]), cy = kf(t, [[182, 690], [200.5, 680], [204.0, 560, E.io], [206.4, 560], [210.2, 690, E.io]]);
  camera(cx, cy, z);
  { const ctx = L.w.ctx; ctx.save(); ctx.globalAlpha = 0.1; ctx.fillStyle = 'rgba(196,204,214,1)'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  // el papel quedó sucio
  const sx = L.s.ctx; const r = mulberry32(31);
  for (let i = 0; i < 9; i++) { const p = TP([200 + r() * 1500, 560 + r() * 380]); const rr = (180 + r() * 260) * G.zoom; const g = sx.createRadialGradient(p[0], p[1], 0, p[0], p[1], rr); g.addColorStop(0, 'rgba(100,100,106,0.16)'); g.addColorStop(1, 'rgba(110,110,116,0)'); sx.fillStyle = g; sx.fillRect(p[0] - rr, p[1] - rr, rr * 2, rr * 2); }
  const warm = ramp(t, 195.5, 206);
  if (warm > 0) washRadial(1180, 700, 1100, 'rgba(240,186,90,0.30)', warm);
  congreso(0.16 + 0.3 * ramp(t, 203, 208));
  const march = ramp(q, 206.6, 207.6);
  const mdx = Math.max(0, q - 206.8) * 34;
  // los viejos: fantasmas, y los que alguien vuelve a dibujar
  drawCrowd(t, {
    freeze: 181, still: true, alpha: 0.1,
    rev: (f) => {
      const h = HELPED.get(f.i); if (!h) return null;
      const p = inv(q, h.ta, h.ta + 1.7);
      if (p <= 0) return null;
      const st = crowdState(f, 181);
      return { a: 0.62, p, rot: st.rot * (1 - ramp(q, h.ta + 0.6, h.ta + 1.9)), dx: mdx, walk: march > 0 ? mdx / 60 : undefined };
    },
  });
  // fantasmas debajo de los redibujados (queda la huella)
  // los pibes, en crayón
  onLayer('c', () => {
    for (const h of HELPERS) {
      const st = crowdState(h.f, 181);
      const y = 874 + h.f.row * 86, hh = (262 + h.f.row * 74) * 1.04;
      const side = h.fromLeft ? -1 : 1;
      const xt = st.x + side * 62, x0 = h.x0;
      const k = inv(q, h.ts, h.ta);
      if (k <= 0) continue;
      const x = lerp(x0, xt, k) + mdx;
      const walking = k < 1 || march > 0;
      G.color = h.col;
      drawSimpleFig(x, y, { seed: h.seed, h: hh, face: march > 0 ? 1 : -side, young: true, color: h.col, a: .9, w: 1.25, passes: 2, walk: walking ? (k < 1 ? Math.abs(x - x0) / (22 * hh / 95) : mdx / 60 + h.seed * .37) : null, stride: 11, arm: (k >= 1 && march <= 0) ? 'help' : 'down', lean: 0.06, hatch: true, hatchGap: 7 });
    }
  });
  // Elsa
  const touch = 195.5;
  let eP = kneelPose({ x: 1312, face: -1 });
  const lookUp = ramp(q, 193.0, 194.4);
  eP.head = 0.3 - 0.42 * lookUp; eP.brow = 1 - .5 * ramp(q, 196, 199); eP.mouth = -.4 + .7 * ramp(q, 197, 200);
  const gx = kf(q, [[183, 420], [189.6, 1030, E.lin], [192.0, 1030], [193.6, 1132, E.io], [206.8, 1132], [215, 1132 + 8.2 * 34, E.lin]]);
  const handPt = [1196, 768];
  reach(E_, eP, 'N', handPt, ramp(q, 194.4, 195.5));
  const stand = ramp(q, 198.6, 200.4);
  const sP = standPose(E_, { x: 1272, face: -1, lean: 0.06, hunch: .55, brow: .3, mouth: .4, head: 0 });
  const HOLD = [gx + 66, 728];
  reach(E_, sP, 'N', HOLD, 1);
  if (stand > 0) { eP = mix(eP, sP, stand); eP.face = -1; }
  // la boina vuelve a su cabeza
  const capGive = bump(q, 200.6, 201.3, 201.6, 202.2), capUp = ramp(q, 201.6, 202.4);
  if (q >= 200.6 && q < 203.2) {
    const hd = headWorld(E_, eP, [0, -20]);
    reach(E_, eP, 'F', [gx + 60, 690], capGive * (1 - capUp)); reach(E_, eP, 'F', [hd[0] - 8, hd[1] + 8], capUp * (1 - ramp(q, 202.5, 203.1)));
    eP.head = (eP.head || 0) + 0.2 * bump(q, 201.6, 202.2, 202.6, 203.1);
  }
  const capOn = q >= 202.4;
  eP.cap = capOn; eP.blink = (q > 201.8 && q < 202.6) ? 1 : 0;
  if (march > 0) {     // marchan
    const wp = walkPose(E_, mdx / 54, { x: 1272 + mdx, stride: 6.8, lean: 0.1, hunch: .55, cap: true, mouth: .4, brow: .2 });
    eP = mix(eP, wp, march); eP.face = march > 0.5 ? 1 : -1; eP.sx = Math.max(0.12, Math.abs(Math.cos(march * Math.PI))); eP.cap = true;
    reach(E_, eP, 'F', HOLD, march);
  }
  const redraw = inv(q, touch, touch + 3.0);
  // fantasma (lo que dejó el gas) + redibujo
  const gA = 0.3 * ramp(t, 182, 184);
  if (redraw < 1) group({ alpha: gA * (1 - redraw * 0.6) }, () => drawFigure(E_, eP));
  if (redraw > 0) group({ alpha: 1 }, () => { if (redraw < 1) revealObj('elsaRedraw', redraw, () => drawFigure(E_, eP)); else drawFigure(E_, eP); });
  // el fantasma de Tito camina a su lado
  if (march > 0) { const tg = walkPose(T_, mdx / 60 + .3, { x: 1272 + mdx + 92, stride: 7.5, lean: 0.1, cap: false }); group({ alpha: 0.13 * march, knock: 0 }, () => drawFigure(T_, tg)); }
  // la boina en el piso / en la mano de la nena
  const pick = q >= 191.0;
  if (!pick) capOnGround(1062, FLOOR, 5.2);
  // la nena
  onLayer('c', () => {
    const col = CRAYONS[0]; G.color = col;
    let nP;
    const bend = bump(q, 189.8, 190.9, 191.4, 192.0);
    if (q < 189.6) nP = walkPose(N_, (gx - 420) / 62, { x: gx, stride: 7.8, lean: 0.1, pony: Math.sin(q * 9) * 1.2 });
    else if (q < 192) { nP = standPose(N_, { x: gx, lean: 0.06 + 0.8 * bend, head: 0.2 * bend }); reach(N_, nP, 'N', [1058, FLOOR - 18], bend); }
    else if (q < 193.6) nP = walkPose(N_, (gx - 1030) / 62, { x: gx, stride: 7.8, lean: 0.08 });
    else if (march <= 0) { nP = standPose(N_, { x: gx, lean: 0.05, head: -0.1 }); reach(N_, nP, 'N', [handPt[0] - 4, handPt[1]], ramp(q, 193.8, 194.8) * (1 - ramp(q, 198.4, 199.4))); if (q >= 199.4) reach(N_, nP, 'N', HOLD, ramp(q, 199.4, 200.2)); }
    else { nP = walkPose(N_, mdx / 62, { x: gx, stride: 7.8, lean: 0.08, pony: Math.sin(q * 9) * 1.2 }); reach(N_, nP, 'N', HOLD, 1); }
    nP.mouth = .5; nP.packColor = '#2f62a8'; nP.hairColor = '#5a3a22';
    // la boina en su otra mano
    const capHeld = pick && q < 201.4;
    nP.hF = capHeld ? [6 + 6 * capGive, 9 - 10 * capGive] : (nP.hF || [0.5, 20]);
    floorShadow(gx, 40, .12);
    drawFigure(N_, nP);
    if (capHeld) { const hw = handWorld(N_, nP, 'F'); onLayer('g', () => withT(hw[0], hw[1], () => { mScale(4); mTranslate(-2, 19); drawCap(); })); }
    else if (q >= 201.4 && !capOn) { const hw = handWorld(E_, eP, 'F'); onLayer('g', () => withT(hw[0], hw[1], () => { mScale(4); mTranslate(-2, 19); drawCap(); })); }
  });
  // chispita donde se tocan las manos
  const sp = inv(q, touch, touch + 0.8);
  if (sp > 0 && sp < 1) onLayer('c', () => { G.alphaMul = 1 - sp; for (let i = 0; i < 7; i++) { const a = i * 0.9; stroke([[handPt[0] + Math.cos(a) * (10 + sp * 14), handPt[1] + Math.sin(a) * (10 + sp * 14)], [handPt[0] + Math.cos(a) * (18 + sp * 30), handPt[1] + Math.sin(a) * (18 + sp * 30)]], { w: 1, color: CRAYONS[i % 7], seed: 'sp' + i }); } G.alphaMul = 1; });
  POST.fadePaper = Math.max(0.93 * (1 - ramp(t, 182, 184.5, E.io)), ramp(t, 209.2, 210.2, E.in));
}

/* ---------- O. título (210–224.6) ---------- */
const ER_TITLE = scrubPath(872, 430, 1520, 590, 3);
function sTitle(_, t) {
  camera(960, 540, 1);
  const size = 170;
  const wLA = textWidth('LA', size, 0.18), wM = textWidth('M´INIMA', size, 0.18), gap = size * 0.5;
  const x0 = 960 - (wLA + gap + wM) / 2, y0 = 420;
  G.boil = Math.floor(F.frame / 4);
  strokeText('LA', x0, y0, size, { track: 0.18, p: inv(t, 210.6, 211.4), seed: 'tLA', stroke: { w: 3.4, a: .95, jit: 1.6, passes: 3 } });
  const xm = x0 + wLA + gap;
  const pE = ramp(t, 214.2, 216.2, E.lin);
  group({ alpha: 1, erase: eraseFn(ER_TITLE.map(p => [p[0] - 872 + xm - 16, p[1]]), pE, 76, 0.9) }, () => {
    strokeText('M´INIMA', xm, y0, size, { track: 0.18, p: inv(t, 211.5, 213.3), seed: 'tMIN', stroke: { w: 3.4, a: .95, jit: 1.6, passes: 3 } });
  });
  G.boil = null;
  const path = ER_TITLE.map(p => [p[0] - 872 + xm - 16, p[1]]);
  smudgeAlong(path, pE, 80, 0.06, 20);
  crumbs(path, pE, { seed: 'ctt', n: 50, spread: 80, fall: 70, h: 40 });
  // la vuelven a escribir en crayón
  const pC = inv(t, 216.8, 219.2);
  if (pC > 0) onLayer('c', () => { G.boil = Math.floor(F.frame / 4); strokeText('M´INIMA', xm + 4, y0 + 3, size, { track: 0.18, p: pC, seed: 'tCR', colors: CRAYONS, stroke: { w: 2.5, a: .95, jit: 1.4 } }); G.boil = null; });
  // la goma: borra, espera, vuelve a intentar sobre el crayón y no puede
  let ep = null, rot = -0.35;
  if (t >= 213.4 && t < 214.2) ep = vlerp([2100, 200], path[0], ramp(t, 213.4, 214.2, E.io));
  else if (t >= 214.2 && t < 216.2) ep = pointAt(path, pE);
  else if (t >= 216.2 && t < 219.4) ep = vlerp(path[path.length - 1], [1640, 760], ramp(t, 216.2, 217.0, E.io));
  else if (t >= 219.4 && t < 221.0) { const k = inv(t, 219.4, 221.0); const a = vlerp([1640, 760], [1500, 520], ramp(t, 219.4, 219.8, E.io)); ep = [a[0] - (k > 0.25 ? Math.sin((k - 0.25) * 22) * 190 * (1 - k * .3) + 250 * Math.min(1, (k - .25) * 3) : 0), a[1] + (k > .25 ? Math.sin((k - .25) * 9) * 30 : 0)]; }
  else if (t >= 221.0 && t < 222.2) ep = vlerp([1250, 530], [2200, 300], ramp(t, 221.0, 222.2, E.in));
  if (ep) eraserObj(ep[0] + 64, ep[1] - 46, rot + Math.sin(t * 30) * 0.05);
  // dedicatoria
  const dA = ramp(t, 219.0, 220.6) * (1 - ramp(t, 223.2, 224.2));
  if (dA > 0) {
    const ctx = L.g.ctx; ctx.save(); ctx.globalAlpha = dA * 0.82; ctx.fillStyle = '#24252a'; ctx.textAlign = 'center';
    ctx.font = 'italic 46px "Bitstream Charter", "Liberation Serif", serif';
    ctx.fillText('a las viejas y los viejos que marchan todos los miércoles', 960, 742);
    ctx.font = '27px "Bitstream Charter", "Liberation Serif", serif'; ctx.globalAlpha = dA * 0.6;
    ctx.fillText('Argentina  ·  2026  ·  dibujado y animado con código', 960, 800);
    ctx.restore();
  }
  POST.fadePaper = 1 - ramp(t, 210, 210.6);
  POST.fadeBlack = ramp(t, 223.4, 224.5, E.io);
}
