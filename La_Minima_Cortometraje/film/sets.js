'use strict';
/* =====================================================================
   LA MÍNIMA — decorados y utilería
   ===================================================================== */
const FLOOR = 900;
const OCRE = 'rgba(232,160,52,1)';
const C_PILL = '#e08a1e';

/* ---------- utilería chica ---------- */
function pillDot(x, y, r = 3.2, a = 1) {
  if (a <= 0.01) return;
  const ctx = L.c.ctx; const p = TP([x, y]); const rr = r * G.zoom;
  ctx.save(); ctx.globalAlpha = clamp(a); ctx.fillStyle = C_PILL; ctx.beginPath(); ctx.arc(p[0], p[1], rr, 0, 7); ctx.fill();
  ctx.globalAlpha = clamp(a * 0.55); ctx.fillStyle = '#fff3c9'; ctx.beginPath(); ctx.arc(p[0] - rr * 0.28, p[1] - rr * 0.3, rr * 0.38, 0, 7); ctx.fill();
  ctx.restore();
  const pa = G.alphaMul; G.alphaMul = pa * a;
  stroke(pCircle(x, y, r, 10), { w: 1.0, a: 0.75, jit: 0.4, seed: 'pill' + Math.round(x * 7 + y * 13) });
  G.alphaMul = pa;
}
/* blíster: tira de pastillas. filled = cuántas quedan (de n) */
function blister(x, y, n, filled, o = {}) {
  const cols = n / 2, cw = 9, w = cols * cw + 6, h = 17;
  obj('blister' + (o.key || ''), () => {
    const sk = o.skew ?? 5;
    const pts = [[x + sk, y - h], [x + sk + w, y - h], [x + w, y], [x, y], [x + sk, y - h]];
    shape(pts, { stroke: { w: 1.2, a: .85 } });
    let k = 0;
    for (let j = 0; j < 2; j++) for (let i = 0; i < cols; i++) {
      const px = x + 6 + i * cw + (j === 0 ? sk * 0.75 : sk * 0.25), py = y - h + 4.6 + j * 7.6;
      const has = k < filled; const fa = o.fade ? o.fade(k) : 1;
      if (has) pillDot(px, py, 2.6, fa);
      if (!has || fa < 1) stroke(pCircle(px, py, 2.5, 8), { w: 0.8, a: 0.4, jit: 0.3 });
      k++;
    }
  });
}
function mateCup(x, y, o = {}) {
  obj('mate', () => {
    const b = pSpline([[x - 7, y - 16], [x - 9.5, y - 8], [x - 7, y - 1], [x, y + 0.5], [x + 7, y - 1], [x + 9.5, y - 8], [x + 7, y - 16]], false, 5);
    const poly = b.concat([[x - 7, y - 16]]);
    shape(poly, { hatch: { gap: 2.6, a: .5, angle: 0.4, cross: true }, stroke: { w: 1.4, a: .9 } });
    stroke(pArc(x, y - 16, 7, 1.8, 0, Math.PI * 2, 10), { w: 1.1, a: .8 });
    stroke([[x + 2, y - 15], [x + 9 + (o.bx || 0), y - 31]], { w: 1.5, a: .9 });   // bombilla
  });
}
function tinYerba(x, y, o = {}) {
  // lata cilíndrica alta. x = centro de la base
  obj('tinY' + (o.key || ''), () => {
    const w = 23, h = 62;
    const body = [[x - w, y - h], [x + w, y - h], [x + w, y], [x - w, y], [x - w, y - h]];
    shape(body, { stroke: { w: 1.4, a: .9 } });
    hatch([[x + 6, y - h], [x + w, y - h], [x + w, y], [x + 6, y]], { gap: 3, a: .34, angle: 1.57 });
    stroke(pRect(x - 15, y - 44, 30, 24), { w: 1, a: .6 });
    // hojita de yerba
    stroke(pSpline([[x - 8, y - 26], [x, y - 39], [x + 8, y - 33], [x - 8, y - 26]], false, 4), { w: 1, a: .6 });
    stroke([[x - 8, y - 26], [x + 5, y - 35]], { w: .8, a: .5 });
    if (o.lid !== false) {
      const ly = y - h + (o.lidDy || 0), lx = x + (o.lidDx || 0);
      shape([[lx - w - 2, ly - 9], [lx + w + 2, ly - 9], [lx + w + 2, ly + 1], [lx - w - 2, ly + 1], [lx - w - 2, ly - 9]], { hatch: { gap: 2.4, a: .45, angle: 0 }, stroke: { w: 1.4, a: .9 } });
    } else {
      stroke(pArc(x, y - h, w, 4.5, 0, Math.PI * 2, 14), { w: 1.1, a: .8 });
    }
  });
}
function tinCookie(x, y, o = {}) {
  // lata redonda de galletitas (el costurero). x = centro de la base
  obj('tinC' + (o.key || ''), () => {
    const w = 42, h = 30;
    const body = pRoundRect(x - w, y - h, w * 2, h, 5);
    shape(body, { stroke: { w: 1.4, a: .9 } });
    for (let i = 0; i < 7; i++) stroke(pArc(x - w + 8 + i * 12, y - h * 0.5, 4.5, 6, -Math.PI, 0, 5), { w: .9, a: .5 });
    stroke([[x - w + 3, y - 7], [x + w - 3, y - 7]], { w: .9, a: .5 });
    if (o.lid !== false) {
      const ly = y - h + (o.lidDy || 0), lx = x + (o.lidDx || 0);
      mPush(); mTranslate(lx, ly); if (o.lidRot) mRotate(o.lidRot);
      shape(pRoundRect(-w - 3, -11, w * 2 + 6, 13, 4), { hatch: { gap: 2.6, a: .4, angle: 0 }, stroke: { w: 1.4, a: .9 } });
      stroke(pArc(0, -11, 9, 3.5, Math.PI, Math.PI * 2, 6), { w: 1.1, a: .7 });
      mPop();
    } else {
      stroke(pArc(x, y - h, w - 1, 5, 0, Math.PI * 2, 16), { w: 1.1, a: .8 });
    }
  });
}
function radioSet(x, y, o = {}) {
  obj('radio', () => {
    const w = 72, h = 48;
    shape(pRoundRect(x, y - h, w, h, 7), { stroke: { w: 1.5, a: .9 } });
    const sp = pCircle(x + 24, y - h / 2, 15, 16);
    hatch(sp, { gap: 3, a: .5, angle: 0 }); stroke(sp, { w: 1.2, a: .85 });
    stroke(pCircle(x + 54, y - 31, 6.5, 10), { w: 1.2, a: .85 });
    stroke([[x + 54, y - 31], [x + 54 + Math.cos(o.dial || -1) * 6, y - 31 + Math.sin(o.dial || -1) * 6]], { w: 1.2, a: .85 });
    stroke([[x + 46, y - 12], [x + 63, y - 12]], { w: 1, a: .6 });
    stroke([[x + 60, y - h], [x + 86, y - h - 44]], { w: 1.2, a: .85 });   // antena
    stroke([[x + 8, y], [x + 8, y + 3]], { w: 1.5, a: .8 }); stroke([[x + w - 8, y], [x + w - 8, y + 3]], { w: 1.5, a: .8 });
    if (o.on) {
      // onditas de sonido
      const k = o.on;
      for (let i = 0; i < 3; i++) {
        const ph = (F.t * 0.9 + i / 3) % 1;
        const R = 22 + ph * 26;
        G.alphaMul *= (1 - ph) * k;
        stroke(pArc(x + 24, y - h / 2, R, R, -2.4, -0.7, 8), { w: 1.1, a: .55, seed: 'rw' + i });
        G.alphaMul /= ((1 - ph) * k) || 1;
      }
    }
  });
}
function breadLoaf(x, y, k = 1, half = false) {
  obj('bread' + Math.round(x), () => {
    const w = 26 * k, h = 15 * k;
    let pts = pSpline([[x - w, y], [x - w * 0.9, y - h * 0.75], [x - w * 0.3, y - h * 1.05], [x + w * 0.4, y - h], [x + w * 0.95, y - h * 0.6], [x + w, y]], false, 5);
    if (half) pts = pts.filter(p => p[0] <= x + 2).concat([[x + 2, y]]);
    const poly = pts.concat([[pts[0][0], pts[0][1]]]);
    shape(poly, { hatch: { gap: 3.4, a: .3, angle: -0.8 }, stroke: { w: 1.4, a: .9 } });
    for (let i = 0; i < (half ? 1 : 3); i++) stroke(pQuad([x - w * 0.55 + i * w * 0.5, y - h * 0.85], [x - w * 0.42 + i * w * 0.5, y - h * 0.55], [x - w * 0.5 + i * w * 0.5, y - h * 0.3], 4), { w: 1, a: .6 });
  });
}
function plate(x, y, w = 38) { obj('plate' + Math.round(x), () => { stroke(pArc(x, y, w, 4.5, 0, Math.PI, 12), { w: 1.2, a: .8 }); stroke([[x - w, y], [x + w, y]], { w: 1.2, a: .8 }); }); }
function kettle(x, y, o = {}) {
  obj('kettle', () => {
    const b = pSpline([[x - 26, y], [x - 30, y - 20], [x - 18, y - 40], [x, y - 44], [x + 18, y - 40], [x + 30, y - 20], [x + 26, y]], false, 5);
    shape(b.concat([[x - 26, y]]), { hatch: { gap: 4, a: .3, angle: 1.2 }, stroke: { w: 1.5, a: .9 } });
    stroke(pSpline([[x + 26, y - 22], [x + 40, y - 30], [x + 47, y - 46]], false, 5), { w: 2.2, a: .9 });      // pico
    stroke(pSpline([[x - 16, y - 41], [x - 10, y - 62], [x + 10, y - 62], [x + 16, y - 41]], false, 5), { w: 1.6, a: .9 });  // asa
    stroke(pCircle(x, y - 46, 3, 8), { w: 1.2, a: .9 });
    if (o.steam) for (let i = 0; i < 3; i++) {
      const ph = (F.t * 0.45 + i / 3) % 1; const yy = y - 50 - ph * 60;
      G.alphaMul *= (1 - ph) * o.steam;
      stroke(pSpline([[x + 46 + Math.sin(ph * 6 + i) * 5, yy], [x + 50 + Math.sin(ph * 6 + i + 1) * 7, yy - 14], [x + 45 + Math.sin(ph * 6 + i + 2) * 6, yy - 28]], false, 5), { w: 1.2, a: .5, seed: 'st' + i });
      G.alphaMul /= ((1 - ph) * o.steam) || 1;
    }
  });
}
function candle(x, y, o = {}) {
  obj('candle', () => {
    shape(pRect(x - 5, y - 30, 10, 30), { stroke: { w: 1.2, a: .85 } });
    stroke(pArc(x, y, 13, 3, 0, Math.PI * 2, 10), { w: 1.1, a: .7 });
    stroke([[x, y - 30], [x, y - 35]], { w: 1.1, a: .9 });
    const fl = 1 + Math.sin(F.t * 9) * 0.08 + Math.sin(F.t * 23) * 0.05;
    const fp = pSpline([[x, y - 34], [x - 4 * fl, y - 41], [x + Math.sin(F.t * 5) * 1.5, y - 52 * (0.94 + 0.06 * fl)], [x + 4 * fl, y - 41]], true, 5);
    stroke(fp, { w: 1.1, a: .8 });
    const ctx = L.c.ctx; const sp = fp.map(TP); ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = '#f0a22c'; tracePath(ctx, sp); ctx.fill(); ctx.restore();
  });
}
function chair(x, y, face = 1) {
  // x = centro del asiento. face = hacia dónde mira quien se sienta
  obj('chair' + Math.round(x), () => {
    mPush(); mTranslate(x, y); mScale(face, 1);
    const sh = -82;
    shape([[-40, sh - 4], [40, sh - 4], [40, sh + 5], [-40, sh + 5], [-40, sh - 4]], { stroke: { w: 1.5, a: .9 } });
    stroke([[-36, sh + 5], [-38, 0]], { w: 2, a: .9 }); stroke([[36, sh + 5], [38, 0]], { w: 2, a: .9 });
    stroke([[-36, sh + 40], [36, sh + 40]], { w: 1.2, a: .7 });
    // respaldo
    stroke([[-37, sh - 4], [-46, sh - 128]], { w: 2.2, a: .9 });
    stroke([[-30, sh - 4], [-38, sh - 126]], { w: 1.3, a: .7 });
    stroke([[-48, sh - 128], [-34, sh - 128]], { w: 2.4, a: .9 });
    stroke([[-42, sh - 70], [-34, sh - 70]], { w: 1.2, a: .7 });
    mPop();
  });
}
function tableSet(o = {}) {
  obj('table', () => {
    const top = [[864, 736], [1216, 736], [1232, 752], [848, 752], [864, 736]];
    shape(top, { stroke: { w: 1.5, a: .9 } });
    shape([[848, 752], [1232, 752], [1232, 765], [848, 765], [848, 752]], { hatch: { gap: 4, a: .3, angle: 0 }, stroke: { w: 1.5, a: .9 } });
    shape([[888, 765], [900, 765], [898, FLOOR], [890, FLOOR], [888, 765]], { stroke: { w: 1.3, a: .9 } });
    shape([[1180, 765], [1192, 765], [1190, FLOOR], [1182, FLOOR], [1180, 765]], { stroke: { w: 1.3, a: .9 } });
    stroke([[900, 790], [1180, 790]], { w: 1.1, a: .55 });
  });
}
function floorShadow(x, w, a = 0.3) {
  hatch(pEllipse(x, FLOOR + 6, w, 7, 0, 14), { gap: 3.2, a, angle: 0.08, noBoil: true, seed: 'sh' + Math.round(x) });
}

/* ---------- la cocina ---------- */
/* K: { rv(key)->0..1, sun, lamp, night, capOnHook, calDay, kidDrawing, kettleSteam, door } */
function kitchenBack(K) {
  const rv = K.rv || (() => 1);
  G.boil = Math.floor(F.frame / 6);
  // luz
  const lamp = K.lamp ?? 1, day = K.day ?? 1;
  if (K.night) { if (K.candleAt) nightWash(K.night, K.candleAt[0], K.candleAt[1], K.candleR || 640, K.candleGlow ?? 1); else { const ctx = L.w.ctx; ctx.save(); ctx.globalAlpha = K.night; ctx.fillStyle = 'rgba(96,104,132,1)'; ctx.fillRect(0, 0, W, H); ctx.restore(); } }
  if (K.cold) { const ctx = L.w.ctx; ctx.save(); ctx.globalAlpha = K.cold; ctx.fillStyle = 'rgba(196,204,214,1)'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  if (day > 0) washPoly([[484, 294], [706, 294], [706, 516], [484, 516]], 'rgba(246,214,140,1)', 0.5 * day, 3);
  if (lamp > 0) {
    washRadial(940, 640, 820, 'rgba(240,180,78,0.42)', lamp);
    washPoly([[968, 348], [1072, 348], [1330, 1000], [700, 1000]], 'rgba(244,188,84,1)', 0.2 * lamp, 34);
    washRadial(1020, 362, 120, 'rgba(252,206,96,0.75)', lamp);
  }
  // piso
  revealObj('k/floor', rv('floor'), () => {
    stroke([[-200, FLOOR], [2200, FLOOR]], { w: 1.5, a: .7, jit: 1.5, slow: 1.6 });
    stroke([[-200, FLOOR + 62], [2200, FLOOR + 66]], { w: 1.0, a: .28, jit: 1.6 });
    stroke([[-200, FLOOR + 150], [2200, FLOOR + 158]], { w: 1.0, a: .18, jit: 1.8 });
  });
  // ventana
  revealObj('k/window', rv('window'), () => {
    stroke(pRect(470, 280, 250, 250), { w: 1.8, a: .9 });
    stroke(pRect(482, 292, 226, 226), { w: 1.1, a: .6 });
    stroke([[595, 292], [595, 518]], { w: 1.4, a: .8 }); stroke([[482, 405], [708, 405]], { w: 1.4, a: .8 });
    shape([[458, 530], [732, 530], [736, 543], [454, 543], [458, 530]], { stroke: { w: 1.4, a: .9 } });
    // afuera: la ciudad lejos, con la cúpula
    const a = 0.42;
    stroke([[484, 500], [520, 500], [520, 472], [548, 472], [548, 490], [580, 490], [580, 462], [594, 462]], { w: 1, a });
    stroke([[596, 482], [612, 482], [612, 466]], { w: 1, a });
    stroke(pSpline([[612, 466], [616, 446], [630, 434], [644, 446], [648, 466]], false, 5), { w: 1.1, a: a + .15 });
    stroke([[630, 434], [630, 420]], { w: 1, a: a + .15 });
    stroke([[648, 466], [648, 484], [676, 484], [676, 468], [706, 468]], { w: 1, a });
    if (K.night) { /* luna */ stroke(pArc(672, 330, 12, 12, 0.6, 4.4, 10), { w: 1.2, a: .6 }); }
  });
  // heladera
  revealObj('k/fridge', rv('fridge'), () => {
    shape(pRoundRect(200, 462, 170, FLOOR - 462 - 8, 14), { stroke: { w: 1.7, a: .9 } });
    stroke([[202, 590], [368, 590]], { w: 1.3, a: .8 });
    stroke([[354, 520], [354, 566]], { w: 2.2, a: .9 }); stroke([[354, 616], [354, 690]], { w: 2.2, a: .9 });
    stroke([[214, FLOOR - 8], [214, FLOOR]], { w: 2, a: .8 }); stroke([[356, FLOOR - 8], [356, FLOOR]], { w: 2, a: .8 });
    hatch([[330, 470], [368, 470], [368, FLOOR - 10], [330, FLOOR - 10]], { gap: 5, a: .2, angle: 1.57 });
    // papelito del dibujo
    stroke([[236, 628], [320, 622], [326, 722], [242, 728], [236, 628]], { w: 1.1, a: .75 });
    stroke(pCircle(280, 624, 3.5, 8), { w: 1.6, a: .9 });
  });
  if ((K.kidDrawing ?? 1) > 0) kidDrawing(K.kidDrawing ?? 1);
  // lámpara
  revealObj('k/lamp', rv('lamp'), () => {
    stroke([[1020, -60], [1020, 300]], { w: 1.2, a: .8 });
    shape([[992, 300], [1048, 300], [1076, 346], [964, 346], [992, 300]], { hatch: { gap: 4, a: .3, angle: 1.2 }, stroke: { w: 1.6, a: .9 } });
    stroke(pArc(1020, 348, 11, 13, 0, Math.PI, 8), { w: 1.2, a: .8 });
    if ((K.rays ?? K.lamp ?? 1) > 0.02) for (let i = 0; i < 5; i++) { const an = 0.5 + i * 0.53; stroke([[1020 + Math.cos(an) * 26, 356 + Math.sin(an) * 22], [1020 + Math.cos(an) * 44, 356 + Math.sin(an) * 40]], { w: 1, a: .45 * (K.rays ?? K.lamp ?? 1) }); }
  });
  // almanaque
  revealObj('k/cal', rv('cal'), () => calendar(K));
  // estante
  revealObj('k/shelf', rv('shelf'), () => {
    shape([[1430, 480], [1642, 480], [1642, 489], [1430, 489], [1430, 480]], { stroke: { w: 1.4, a: .9 } });
    stroke([[1452, 489], [1452, 512], [1436, 489]], { w: 1.1, a: .7 }); stroke([[1620, 489], [1620, 512], [1636, 489]], { w: 1.1, a: .7 });
    // frascos
    shape(pRoundRect(1452, 430, 34, 50, 6), { stroke: { w: 1.2, a: .8 } }); stroke([[1456, 440], [1482, 440]], { w: 1, a: .6 });
    hatch([[1454, 452], [1484, 452], [1484, 478], [1454, 478]], { gap: 3.5, a: .3, angle: 0.3 });
    shape(pRoundRect(1500, 442, 30, 38, 5), { stroke: { w: 1.2, a: .8 } });
    shape(pRoundRect(1548, 420, 26, 60, 5), { stroke: { w: 1.2, a: .8 } }); stroke([[1553, 420], [1553, 410], [1569, 410], [1569, 420]], { w: 1.1, a: .8 });
    // platos parados
    stroke(pArc(1608, 480, 22, 30, Math.PI, Math.PI * 2, 10), { w: 1.2, a: .75 }); stroke(pArc(1614, 480, 22, 30, Math.PI * 1.1, Math.PI * 2, 10), { w: 1.1, a: .6 });
  });
  // mesada y pava
  revealObj('k/counter', rv('counter'), () => {
    shape([[1450, 742], [1672, 742], [1672, FLOOR], [1450, FLOOR], [1450, 742]], { stroke: { w: 1.7, a: .9 } });
    shape([[1442, 730], [1680, 730], [1680, 742], [1442, 742], [1442, 730]], { stroke: { w: 1.4, a: .9 } });
    stroke(pRect(1466, 764, 86, 116), { w: 1.1, a: .65 }); stroke(pRect(1570, 764, 86, 116), { w: 1.1, a: .65 });
    stroke(pCircle(1542, 822, 3, 6), { w: 1.4, a: .8 }); stroke(pCircle(1580, 822, 3, 6), { w: 1.4, a: .8 });
    hatch([[1640, 744], [1670, 744], [1670, FLOOR - 2], [1640, FLOOR - 2]], { gap: 5, a: .22, angle: 1.57 });
    stroke([[1490, 730], [1490, 724], [1550, 724], [1550, 730]], { w: 1.2, a: .8 });  // hornalla
  });
  if (K.kettle !== false) revealObj('k/kettle', rv('counter'), () => kettle(1520, 724, { steam: K.kettleSteam || 0 }));
  if ((K.flame ?? 0) > 0.02) stoveFlame(K.flame);
  // puerta y perchero
  revealObj('k/door', rv('door'), () => {
    stroke([[1740, FLOOR], [1740, 330], [1900, 330], [1900, FLOOR]], { w: 1.8, a: .9 });
    stroke(pRect(1762, 356, 116, 220), { w: 1.1, a: .6 }); stroke(pRect(1762, 606, 116, 262), { w: 1.1, a: .6 });
    stroke(pCircle(1760, 628, 6, 10), { w: 1.5, a: .9 });
    stroke([[1664, 404], [1716, 404]], { w: 2.2, a: .9 });
    stroke([[1690, 404], [1690, 414], [1696, 420]], { w: 1.6, a: .9 });
  });
  if (K.capOnHook ?? true) revealObj('k/cap', rv('door'), () => hangingCap(1692, 418));
  G.boil = null;
}
function stoveFlame(a) {
  const ctx = L.c.ctx;
  for (let i = 0; i < 5; i++) {
    const x = 1498 + i * 11, fl = 1 + Math.sin(F.t * 11 + i * 1.7) * 0.18;
    const fp = pSpline([[x - 4, 730], [x - 3, 724], [x, 730 - 13 * fl], [x + 3, 724], [x + 4, 730]], false, 4);
    const sp = fp.map(TP); ctx.save(); ctx.globalAlpha = 0.85 * a; ctx.fillStyle = '#ec9a26'; tracePath(ctx, sp); ctx.fill(); ctx.restore();
    G.alphaMul *= a; stroke(fp, { w: 1, a: .6, seed: 'fl' + i }); G.alphaMul /= a;
  }
}
function hangingCap(x, y, rot = 1.25) {
  mPush(); mTranslate(x, y); mRotate(rot); mScale(4.0); mTranslate(9, 19);
  drawCap();
  mPop();
}
function calendar(K) {
  const x = 1290, y = 320, w = 84, h = 122;
  shape(pRect(x, y, w, h), { stroke: { w: 1.4, a: .9 } });
  shape(pRect(x, y, w, 22), { hatch: { gap: 2.4, a: .55, angle: 0 }, stroke: { w: 1.2, a: .9 } });
  stroke(pCircle(x + w / 2, y - 6, 3, 6), { w: 1.2, a: .8 });
  const d = K.calDay || { name: 'LUNES', num: '3' };
  const tw = textWidth(d.name, 9.5, 0.2);
  strokeText(d.name, x + (w - tw) / 2, y + 30, 9.5, { track: 0.2, seed: 'cd' + d.name, stroke: { w: 1.0, a: .8, jit: 0.4 } });
  const nw = textWidth(d.num, 50, 0.14);
  strokeText(d.num, x + (w - nw) / 2, y + 54, 50, { track: 0.14, seed: 'cn' + d.num, stroke: { w: 2.4, a: .9, jit: 0.8 } });
}
/* el dibujo de la nieta en la heladera (crayón: no se borra) */
function kidDrawing(p = 1) {
  onLayer('c', () => {
    G.boil = Math.floor(F.frame / 8);
    revealObj('k/kiddraw', p, () => {
      const o1 = '#d2552b', b1 = '#2f62a8', y1 = '#e2a21c', g1 = '#4f9a4a';
      const fig = (x, col, skirt) => {
        stroke(pCircle(x, 654, 6.5, 10), { w: 1.0, color: col, jit: .7 });
        if (skirt) stroke([[x, 661], [x - 9, 690], [x + 9, 690], [x, 661]], { w: 1.0, color: col, jit: .7 });
        else stroke([[x, 661], [x, 688]], { w: 1.0, color: col, jit: .7 });
        stroke([[x - 9, 672], [x + 9, 672]], { w: 1.0, color: col, jit: .7 });
        stroke([[x - 3, 690], [x - 5, 708]], { w: 1.0, color: col, jit: .7 }); stroke([[x + 3, 690], [x + 5, 708]], { w: 1.0, color: col, jit: .7 });
      };
      fig(264, b1, false); fig(296, o1, true);
      stroke(pCircle(306, 638, 5, 8), { w: 1.0, color: y1, jit: .7 });
      stroke([[244, 712], [318, 708]], { w: 1.0, color: g1, jit: .9 });
    });
    G.boil = null;
  });
}

/* ---------- la goma de borrar (bicolor, de escuela) ---------- */
function eraserObj(x, y, rot = 0, o = {}) {
  const ctx = L.o.ctx; const z = G.zoom;
  const p = TP([x, y]); const s = (o.size || 1) * z;
  ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(rot); ctx.scale(s, s);
  const w = 210, h = 74, sk = 26;
  // sombra
  ctx.save(); ctx.translate(10, 16); ctx.globalAlpha = 0.16; ctx.fillStyle = '#3a3026'; ctx.filter = 'blur(8px)';
  ctx.beginPath(); ctx.moveTo(-w / 2 + sk, -h / 2); ctx.lineTo(w / 2 + sk, -h / 2); ctx.lineTo(w / 2 - sk, h / 2); ctx.lineTo(-w / 2 - sk, h / 2); ctx.closePath(); ctx.fill(); ctx.restore();
  const para = (x0, x1, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0 + sk, -h / 2); ctx.lineTo(x1 + sk, -h / 2); ctx.lineTo(x1 - sk, h / 2); ctx.lineTo(x0 - sk, h / 2); ctx.closePath(); ctx.fill(); };
  ctx.lineJoin = 'round';
  para(-w / 2, w * 0.16, '#c7604f'); para(w * 0.16, w / 2, '#4f6f9c');
  // desgaste en la punta
  ctx.globalAlpha = 0.35; para(-w / 2, -w / 2 + 16, '#e9d9c6'); ctx.globalAlpha = 1;
  // textura
  ctx.globalAlpha = 0.5; ctx.globalCompositeOperation = 'source-atop';
  ctx.restore();
  // contorno a lápiz
  const pl = G.layer, pc = G.ctx, ps = G.style, pcol = G.color; setLayer('o'); G.style = ST.pencil; G.color = '#2a2526';
  mPush(); mTranslate(x, y); mRotate(rot); mScale(o.size || 1);
  obj('eraser', () => {
    stroke([[-w / 2 + sk, -h / 2], [w / 2 + sk, -h / 2], [w / 2 - sk, h / 2], [-w / 2 - sk, h / 2], [-w / 2 + sk, -h / 2]], { w: 1.8, a: .85, jit: 1.2 });
    stroke([[w * 0.16 + sk, -h / 2], [w * 0.16 - sk, h / 2]], { w: 1.3, a: .7 });
    hatch([[-w / 2 - sk, h / 2], [-w / 2 - sk + 40, h / 2], [-w / 2 + sk + 40, -h / 2], [-w / 2 + sk, -h / 2]], { gap: 5, a: .25, angle: 0.9 });
  });
  mPop();
  G.layer = pl; G.ctx = pc; G.style = ps; G.color = pcol;
}
/* miguitas de goma que quedan después de borrar */
function crumbs(pathPts, prog, o = {}) {
  const n = o.n || 40; const seed = hashStr(o.seed || 'cr');
  const ctx = L.g.ctx;
  for (let i = 0; i < n; i++) {
    const u = (i + rnd(i, seed)) / n; if (u > prog) continue;
    const age = (prog - u) * (o.dur || 4);
    const p0 = pointAt(pathPts, u);
    const dx = (rnd(i, seed + 1) - .5) * (o.spread || 60), dy = (rnd(i, seed + 2)) * (o.fall || 40);
    const k = clamp(age * 2.5);
    const life = o.life ? clamp(1 - (F.t - o.t0 - u * (o.dur || 4)) / o.life) : 1;
    if (life <= 0) continue;
    const p = TP([p0[0] + dx * k, p0[1] + dy * E.out(k) + (o.h || 0)]);
    const an = rnd(i, seed + 3) * 3.14, l = (2 + rnd(i, seed + 4) * 5) * G.zoom;
    ctx.save(); ctx.globalAlpha = 0.5 * life; ctx.strokeStyle = '#3a3534'; ctx.lineWidth = 1.6 * Math.pow(G.zoom, .5); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + Math.cos(an) * l, p[1] + Math.sin(an) * l * 0.5); ctx.stroke(); ctx.restore();
  }
}
/* camino en zigzag de la goma sobre un rectángulo (mundo) */
function scrubPath(x0, y0, x1, y1, rows = 4, amp = 0) {
  const pts = [];
  for (let i = 0; i <= rows; i++) { const y = lerp(y0, y1, i / rows); const lft = i % 2 === 0; pts.push([lft ? x0 : x1, y - amp]); pts.push([lft ? x1 : x0, y + amp]); }
  return resample(pts, 12);
}
