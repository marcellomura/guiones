'use strict';
/* =====================================================================
   LA MÍNIMA — escenas (2): la calle, el secreto, la borrada, sola
   ===================================================================== */
function walkTo(ch, q, t0, t1, x0, x1, o = {}) {
  const k = inv(q, t0, t1); const x = lerp(x0, x1, k);
  const stride = o.stride ?? 8; const cyc = 2 * stride * ch.scale;
  const ph = Math.abs(x - x0) / cyc + (o.ph0 || 0);
  const face = x1 >= x0 ? 1 : -1;
  const W_ = walkPose(ch, ph, Object.assign({ x, face, stride }, o.pose || {}));
  const S_ = standPose(ch, Object.assign({ x, face: o.endFace ?? face }, o.pose || {}));
  const edge = clamp(1 - Math.min(k, 1 - k) * 7);
  const P = (k <= 0 || k >= 1) ? S_ : mix(W_, S_, edge * edge);
  P.face = (k >= 1 && o.endFace) ? o.endFace : face;
  for (const key of ['cap', 'shawl']) if (o.pose && key in o.pose) P[key] = o.pose[key];
  return P;
}

/* ---------- F. la calle y el precio (48–60) ---------- */
function fmtPrice(v) { const s = String(Math.round(v / 100) * 100); return '$ ' + (s.length > 3 ? s.slice(0, -3) + '.' + s.slice(-3) : s); }
function streetBack(t) {
  G.boil = Math.floor(F.frame / 6);
  { const ctx = L.w.ctx; ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = 'rgba(190,198,210,1)'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  obj('street', () => {
    stroke([[-300, FLOOR], [2400, FLOOR]], { w: 1.5, a: .7, slow: 1.6 });
    stroke([[-300, FLOOR + 56], [2400, FLOOR + 60]], { w: 1.3, a: .45, slow: 1.6 });
    stroke([[-300, FLOOR + 70], [2400, FLOOR + 75]], { w: 1.0, a: .25, slow: 1.6 });
    // casa de la izquierda: puerta y persiana
    stroke(pRect(-60, 470, 150, 430), { w: 1.4, a: .7 }); stroke(pRect(-40, 492, 110, 180), { w: 1, a: .5 });
    stroke(pRect(150, 500, 190, 230), { w: 1.4, a: .7 });
    for (let i = 0; i < 9; i++) stroke([[156, 516 + i * 24], [334, 516 + i * 24]], { w: 1, a: .45 });
    // farol
    stroke([[452, FLOOR], [452, 330]], { w: 2, a: .8 }); stroke(pQuad([452, 330], [456, 292], [506, 292], 8), { w: 1.8, a: .8 });
    shape(pSpline([[494, 292], [500, 312], [536, 312], [542, 292]], false, 4).concat([[494, 292]]), { stroke: { w: 1.4, a: .8 } });
    stroke([[440, FLOOR], [464, FLOOR]], { w: 3, a: .8 });
    // farmacia
    stroke(pRect(1090, 380, 600, 76), { w: 1.6, a: .85 });
    strokeText('FARMACIA', 1150, 398, 40, { track: 0.3, seed: 'farm', stroke: { w: 2.0, a: .8, jit: .8 } });
    stroke(pRect(1110, 500, 350, 320), { w: 1.5, a: .8 }); stroke(pRect(1122, 512, 326, 296), { w: 1, a: .5 });
    stroke([[1122, 612], [1448, 612]], { w: 1, a: .6 }); stroke([[1122, 712], [1448, 712]], { w: 1, a: .6 });
    const r = mulberry32(5);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) { const bw = 26 + r() * 18, bh = 30 + r() * 34; const bx = 1134 + i * 52 + r() * 6, by = [612, 712, 806][j]; stroke(pRect(bx, by - bh, bw, bh), { w: 1, a: .55 }); if (r() < .6) stroke([[bx + 4, by - bh * .6], [bx + bw - 4, by - bh * .6]], { w: .9, a: .4 }); }
    stroke(pRect(1510, 480, 150, 420), { w: 1.5, a: .8 }); stroke(pRect(1528, 500, 114, 250), { w: 1, a: .5 }); stroke([[1528, 640], [1560, 640]], { w: 2, a: .8 });
    // la cruz
    stroke([[1090, 330], [1040, 330]], { w: 1.6, a: .8 });
    const cx = 1010, cy = 330, a = 13, b = 36;
    const cross = [[cx - a, cy - b], [cx + a, cy - b], [cx + a, cy - a], [cx + b, cy - a], [cx + b, cy + a], [cx + a, cy + a], [cx + a, cy + b], [cx - a, cy + b], [cx - a, cy + a], [cx - b, cy + a], [cx - b, cy - a], [cx - a, cy - a], [cx - a, cy - b]];
    shape(cross, { hatch: { gap: 3, a: .5, angle: 0.8 }, stroke: { w: 1.6, a: .9 } });
  });
  G.boil = null;
}
function pricePoster(t) {
  const q = F.tq;
  let v = 12400 + (96800 - 12400) * E.io(inv(q, 50.0, 54.0));
  if (q >= 57.6) v += 3900; if (q >= 58.6) v += 4200;
  const rolling = q > 50.0 && q < 54.0;
  obj('poster', () => {
    G.boil = Math.floor(F.frame / 6);
    shape(pRect(660, 400, 330, 300), { stroke: { w: 1.7, a: .9 } });
    stroke(pRect(672, 412, 306, 276), { w: 1, a: .4 });
    for (const [x, y] of [[668, 408], [982, 408], [668, 692], [982, 692]]) stroke(pCircle(x, y, 3, 6), { w: 1.4, a: .7 });
    G.boil = null;
    // el blíster, grande
    mPush(); mTranslate(722, 548); mScale(3.4); blister(0, 0, 10, 10, { key: 'poster', skew: 6 }); mPop();
    const txt = fmtPrice(v);
    const size = 62; const tw = textWidth(txt, size, 0.16);
    const jy = rolling ? Math.sin(q * 40) * 3 : 0;
    strokeText(txt, 825 - tw / 2, 598 + jy, size, { track: 0.16, seed: rolling ? 'pr' + Math.floor(q * 12) : 'pr' + txt, stroke: { w: 3.0, a: .95, jit: 1.0 } });
    if (q >= 57.6) stroke([[700, 676], [950, 672]], { w: 2.4, a: .8, seed: 'under' });
  });
}
const PASSERS = [
  { t0: 47.2, x0: -160, v: 250, seed: 11 }, { t0: 48.6, x0: 1900, v: -280, seed: 12 }, { t0: 51.0, x0: -160, v: 262, seed: 13, arm: 'fwd' },
  { t0: 52.4, x0: 1900, v: -250, seed: 14 }, { t0: 54.2, x0: -160, v: 285, seed: 15 }, { t0: 55.4, x0: 1900, v: -265, seed: 16, arm: 'fwd' }, { t0: 56.6, x0: -160, v: 255, seed: 17 },
];
function sStreet(_, t) {
  const q = F.tq;
  camera(kf(t, [[48, 740], [60, 800]]), 640, 1.22);
  streetBack(t);
  pricePoster(t);
  // la pareja, del brazo
  const stopK = ramp(q, 50.6, 51.4), goK = ramp(q, 56.6, 57.2);
  let x;
  if (q < 51.4) x = lerp(330, 520, inv(q, 48, 51.4)); else if (q < 56.6) x = 520; else x = lerp(520, 700, inv(q, 56.6, 60));
  const moving = q < 51.2 || q > 56.8;
  const ph = moving ? (x - 330) / 64 : 0;
  let tp = moving ? walkPose(T_, ph, { x, stride: 8, lean: 0.14 }) : standPose(T_, { x, lean: 0.08 });
  let ep = moving ? walkPose(E_, ph + 0.5, { x: x + 62, stride: 8, lean: 0.14, shawl: true }) : standPose(E_, { x: x + 62, lean: 0.08, shawl: true });
  ep.shawl = true;
  const look = bump(q, 51.2, 52.0, 53.6, 54.4);
  tp.head = (tp.head || 0) - 0.34 * look; ep.head = (ep.head || 0) - 0.3 * look;
  tp.brow = ramp(q, 52, 54) * .8; ep.brow = ramp(q, 52, 54) * .8; tp.mouth = -.3 * ramp(q, 52, 54); ep.mouth = -.3 * ramp(q, 52, 54);
  // la billetera
  const wal = bump(q, 53.6, 54.4, 56.0, 56.6);
  const walletAt = [x + 46, 716];
  if (wal > 0) { reach(T_, tp, 'N', walletAt, wal); reach(T_, tp, 'F', [walletAt[0] - 8, walletAt[1] + 6], wal); tp.head = (tp.head || 0) + 0.3 * wal; }
  // ella lo toma del brazo
  const J = solveFigure(T_, tp); const elbowW = figToWorld(T_, tp, J.eN);
  reach(E_, ep, 'F', [elbowW[0] + 6, elbowW[1] + 4], 0.9);
  if (wal > 0.5) reach(E_, ep, 'N', [walletAt[0] + 12, walletAt[1] + 14], ramp(q, 55.2, 55.9) * (1 - ramp(q, 56.2, 56.7)));
  const al = 0.6;
  floorShadow(x + 30, 80, .14);
  group({ alpha: al }, () => drawFigure(E_, ep));
  group({ alpha: al }, () => {
    drawFigure(T_, Object.assign({}, tp, { hideArmN: true }));
    if (wal > 0.35) { const hw = handWorld(T_, tp, 'N'); obj('wallet', () => { shape(pRect(hw[0] - 4, hw[1] - 12, 30, 20), { stroke: { w: 1.4, a: .9 } }); stroke([[hw[0] - 4, hw[1] - 2], [hw[0] + 26, hw[1] - 2]], { w: 1, a: .6 }); }); }
    drawNearArm(T_, tp);
  });
  // la gente pasa a través de ellos
  for (const p of PASSERS) {
    const dt = t - p.t0; if (dt < 0) continue;
    const px = p.x0 + p.v * dt; if (px < -260 || px > 2000) continue;
    const u = 340 / 95;
    drawSimpleFig(px, FLOOR + 4, { seed: p.seed, h: 340, face: p.v > 0 ? 1 : -1, young: true, walk: Math.abs(p.v * dt) / (2 * 12 * u), stride: 12, knock: 1, hatch: true, hatchGap: 3.4, a: .95, w: 1.7, passes: 2, arm: p.arm || 'down', lean: 0.12 });
  }
}

/* ---------- G. el secreto (60–84) ---------- */
function calDay(i) {
  const names = ['LUNES', 'MARTES', 'MI´ERCOLES', 'JUEVES', 'VIERNES', 'S´ABADO', 'DOMINGO'];
  return { name: names[((i % 7) + 7) % 7], num: String(3 + i) };
}
function pillFall(x0, y0, x1, y1, k, r = 3.2) {   // pastilla cayendo en arco
  if (k <= 0 || k >= 1) return;
  pillDot(lerp(x0, x1, k), lerp(y0, y1, k * k) - Math.sin(k * Math.PI) * 6, r);
}
function plinkMarks(x, y, k) {    // rayitas del "plink"
  if (k <= 0 || k >= 1) return;
  G.alphaMul *= (1 - k);
  for (let i = 0; i < 3; i++) { const a = -2.2 + i * 0.65; stroke([[x + Math.cos(a) * (10 + k * 8), y + Math.sin(a) * (10 + k * 8)], [x + Math.cos(a) * (18 + k * 14), y + Math.sin(a) * (18 + k * 14)]], { w: 1.2, a: .7, seed: 'pk' + i }); }
  G.alphaMul /= (1 - k);
}
/* gesto de sacar la pastilla y llevarla a la boca; devuelve si la pastilla está a la vista en la mano */
function popPill(ch, P, bl, mouth, q, t0, fake) {
  const wB = bump(q, t0, t0 + 0.55, t0 + 0.85, t0 + 1.4), wM = bump(q, t0 + 0.85, t0 + 1.5, t0 + 2.0, t0 + 2.6);
  reach(ch, P, 'N', [bl[0] + 28, bl[1] - 14], wB * (1 - wM)); reach(ch, P, 'N', mouth, wM);
  P.head = (P.head || 0) - 0.15 * bump(q, t0 + 1.4, t0 + 1.8, t0 + 2.1, t0 + 2.6);
  if (fake && q >= t0 + 1.2) P.handN = 'fist';
  return q >= t0 + 0.65 && q < t0 + (fake ? 1.2 : 1.65);
}
function sSecret1(_, t) {
  const q = F.tq;
  const z = kf(t, [[60, 1.9], [64.2, 1.9], [66.0, 3.3, E.io], [68.4, 3.3], [70, 2.3, E.io]]);
  const cx = kf(t, [[60, 1045], [64.2, 1045], [66.0, 948, E.io], [68.4, 948], [70, 1010, E.io]]), cy = kf(t, [[60, 650], [64.2, 650], [66.0, 706, E.io], [68.4, 706], [70, 670, E.io]]);
  camera(cx, cy, z);
  const tp = titoSit({ mouth: 0 }), ep = elsaSit({ mouth: 0 });
  const shT = popPill(T_, tp, BL_T, [858, 672], q, 60.4, true);
  const shE = popPill(E_, ep, BL_E, [1234, 688], q, 60.7, false);
  // el puño de Tito baja a la mesa, cerca de la lata
  if (q >= 62.6) { tp.hN = null; const b = titoSit({}); tp.hN = b.hN; reach(T_, tp, 'N', [1012, 742], 1); tp.handN = q < 65.3 ? 'fist' : (q < 67.2 ? 'open' : 'mitt'); }
  // Elsa se levanta y va a la pava
  let eP = ep, eFront = false, kettleHeld = false;
  if (q >= 63.0) {
    const up = ramp(q, 63.0, 64.0);
    const st = standPose(E_, { x: 1300, face: -1, lean: 0.08 });
    if (q < 64.0) { eP = mix(ep, st, up); eP.face = -1; }
    else if (q < 66.0) { eP = walkTo(E_, q, 64.0, 66.0, 1300, 1436, { stride: 7 }); }
    else if (q < 68.0) { eP = standPose(E_, { x: 1436, face: 1, lean: 0.12 }); reach(E_, eP, 'N', [1512, 664], ramp(q, 66.0, 66.7)); reach(E_, eP, 'F', [1500, 690], ramp(q, 66.2, 66.9)); }
    else { eP = walkTo(E_, q, 68.0, 69.8, 1436, 1318, { stride: 7 }); kettleHeld = true; }
    eFront = q >= 63.6;
  }
  // Tito: abre la mano, mira, levanta la tapa, deja caer la pastilla
  const openK = ramp(q, 65.3, 65.9);
  if (q >= 65.3 && q < 67.2) { reach(T_, tp, 'N', [1006, 716], openK * (1 - ramp(q, 66.6, 67.0))); reach(T_, tp, 'N', [976, 672], ramp(q, 66.6, 67.0)); tp.wristN = 0.5 * ramp(q, 66.9, 67.2); }
  tp.head = (tp.head || 0) + 0.2 * bump(q, 65.4, 65.9, 67.4, 67.9);
  tp.brow = 0.7 * bump(q, 65.2, 65.8, 68.2, 68.8); tp.mouth = 0.5 * ramp(q, 68.6, 69.4);
  const lidK = bump(q, 66.1, 66.6, 67.7, 68.2);
  reach(T_, tp, 'F', [TIN_Y[0] - 4, TIN_Y[1] - 76 - lidK * 16], ramp(q, 65.9, 66.4) * (1 - ramp(q, 68.2, 68.8)));
  const pillInHand = (q >= 61.6 && q < 62.0) ? false : (q >= 65.3 && q < 67.15);
  const dropK = inv(q, 67.15, 67.5);
  kitchenFrame({
    K: { lamp: 0, cold: .3, flame: 0, kettle: !kettleHeld, calDay: calDay(1) },
    tito: { P: tp, prop: shT ? (hw => pillDot(hw[0] + 9, hw[1] - 3, 3.2)) : (pillInHand ? (hw => pillDot(hw[0] + 12, hw[1] - 4, 3.2)) : null) },
    elsa: { P: eP, z: eFront ? 'front' : 'back', prop: shE ? (hw => pillDot(hw[0] - 9, hw[1] - 3, 3.2)) : (kettleHeld ? (hw => withT(hw[0], hw[1] + 62, () => kettle(0, 0, {}))) : null) },
    items: { radio: 0, dial: .6, mate: [1040, 743], bread: null, blT: { filled: q >= 61.1 ? 8 : 9 }, blE: { filled: q >= 61.4 ? 8 : 9 }, tinY: { lidDy: -16 * lidK, lidDx: -8 * lidK } },
    front: () => { pillFall(986, 668, 972, 690, dropK); plinkMarks(968, 676, inv(q, 67.5, 68.0)); },
  });
}
function sSecret2(_, t) {
  const q = F.tq;
  const z = kf(t, [[70, 1.9], [72.6, 1.9], [74.0, 3.2, E.io], [75.9, 3.2], [77, 2.2, E.io]]);
  const cx = kf(t, [[70, 1045], [72.6, 1045], [74.0, 1150, E.io], [75.9, 1150], [77, 1070, E.io]]), cy = kf(t, [[70, 650], [72.6, 650], [74.0, 706, E.io], [75.9, 706], [77, 670, E.io]]);
  camera(cx, cy, z);
  const tp = titoSit({ mouth: 0.1 }), ep = elsaSit({ mouth: 0.1 });
  const shT = popPill(T_, tp, BL_T, [858, 672], q, 70.3, true);
  const shE = popPill(E_, ep, BL_E, [1234, 688], q, 70.5, true);
  // él se inclina sobre la radio
  const rad = bump(q, 72.4, 73.2, 76.0, 76.7);
  if (q >= 72.4) { tp.handN = 'fist'; reach(T_, tp, 'F', [922, 714], rad); tp.lean = 0.03 + 0.2 * rad; tp.head = 0.3 * rad; }
  // ella abre la mano, lo mira, levanta la tapa de su lata y la deja caer
  if (q >= 72.6) { const b = elsaSit({}); ep.hN = b.hN; reach(E_, ep, 'N', [1118, 742], 1); ep.handN = q < 73.4 ? 'fist' : (q < 75.3 ? 'open' : 'mitt'); }
  if (q >= 73.4 && q < 75.3) { reach(E_, ep, 'N', [1112, 718], ramp(q, 73.4, 74.0) * (1 - ramp(q, 74.7, 75.1))); reach(E_, ep, 'N', [1150, 700], ramp(q, 74.7, 75.1)); ep.wristN = 0.5 * ramp(q, 75.0, 75.3); }
  ep.head = (ep.head || 0) + 0.18 * bump(q, 73.5, 74.0, 75.4, 75.9); ep.brow = 0.7 * bump(q, 73.3, 73.9, 76.0, 76.5); ep.mouth = 0.5 * ramp(q, 76.2, 76.9); tp.mouth = 0.1 + 0.4 * ramp(q, 76.4, 77);
  const lidK = bump(q, 74.1, 74.6, 75.7, 76.2);
  reach(E_, ep, 'F', [TIN_C[0] + 8, TIN_C[1] - 46 - lidK * 18], ramp(q, 73.9, 74.4) * (1 - ramp(q, 76.2, 76.8)));
  const pillInHand = q >= 73.4 && q < 75.25;
  const dropK = inv(q, 75.25, 75.6);
  kitchenFrame({
    K: { lamp: 0, cold: .3, flame: 0, calDay: calDay(2) },
    tito: { P: tp, prop: shT ? (hw => pillDot(hw[0] + 9, hw[1] - 3, 3.2)) : null },
    elsa: { P: ep, prop: shE ? (hw => pillDot(hw[0] - 9, hw[1] - 3, 3.2)) : (pillInHand ? (hw => pillDot(hw[0] - 12, hw[1] - 4, 3.2)) : null) },
    items: { radio: rad > 0.8 ? 0.6 : 0, dial: .6 + rad * Math.sin(q * 7) * .8, mate: [1040, 743], bread: null, blT: { filled: q >= 71.0 ? 7 : 8 }, blE: { filled: q >= 71.2 ? 7 : 8 }, tinC: { lidDy: -18 * lidK, lidDx: 10 * lidK, lidRot: 0.25 * lidK } },
    front: () => { pillFall(1140, 696, 1160, 716, dropK); plinkMarks(1166, 704, inv(q, 75.6, 76.1)); },
  });
}
/* montaje: los días pasan, los dos esconden, la goma los va gastando */
const MONT = { t0: 77, cyc: 1.4, n: 5 };
function montageAlpha(t) {
  // cada pasada de goma los deja más pálidos
  let aT = 1, aE = 1;
  for (let c = 0; c < MONT.n; c++) { const ts = MONT.t0 + c * MONT.cyc + 0.75; const k = ramp(t, ts, ts + 0.5, E.lin); aT -= 0.125 * k; aE -= 0.105 * k; }
  return [aT, aE];
}
function sMontage(_, t) {
  const q = F.tq;
  camera(1045, 622, kf(t, [[77, 2.2], [78, 1.72, E.io], [84, 1.66]]));
  const c = Math.min(MONT.n - 1, Math.floor((t - MONT.t0) / MONT.cyc)); const u = ((t - MONT.t0) / MONT.cyc) - c;
  const uq = ((q - MONT.t0) / MONT.cyc) - c;
  const tp = titoSit({ mouth: 0 }), ep = elsaSit({ mouth: 0 });
  // 0–.28 a la boca (mentira) | .3–.55 Tito a la lata | .5–.75 Elsa a la lata
  const wM = bump(uq, 0.0, 0.1, 0.2, 0.3);
  reach(T_, tp, 'N', [858, 672], wM); reach(E_, ep, 'N', [1234, 688], wM);
  const wT = bump(uq, 0.3, 0.4, 0.5, 0.6), wE = bump(uq, 0.5, 0.6, 0.7, 0.8);
  reach(T_, tp, 'N', [976, 672], wT); reach(E_, ep, 'N', [1150, 700], wE);
  tp.handN = (uq > 0.1 && uq < 0.45) ? 'fist' : 'mitt'; ep.handN = (uq > 0.1 && uq < 0.65) ? 'fist' : 'mitt';
  reach(T_, tp, 'F', [TIN_Y[0] - 4, TIN_Y[1] - 86], wT); reach(E_, ep, 'F', [TIN_C[0] + 8, TIN_C[1] - 58], wE);
  const [aT, aE] = montageAlpha(t);
  const hun = (t - 77) / 7;
  tp.hunch = 0.55 + hun * 0.25; ep.hunch = 0.5 + hun * 0.25; tp.brow = hun * .6; ep.brow = hun * .6;
  const night = bump(u, 0.8, 0.9, 0.98, 1.06) * 0.5 + (u < 0.08 ? (1 - u / 0.08) * 0.5 * (c > 0 ? 1 : 0) : 0);
  // goma: barrida diagonal por arriba de ellos, una por día
  const sw = inv(u, 0.52, 0.9); const overT = c % 2 === 0;
  const p0 = overT ? [640, 520] : [1420, 520], p1 = overT ? [900, 860] : [1180, 860];
  kitchenFrame({
    K: { lamp: 0, cold: .3, flame: 0, calDay: calDay(3 + c), night, day: 1 - night * 1.6 },
    tito: { P: tremble(tp, hun * .6), alpha: aT }, elsa: { P: tremble(ep, hun * .5), alpha: aE },
    items: { radio: 0, dial: .6, mate: [1040, 743], bread: null, blT: { filled: Math.max(0, 7 - c - (uq > 0.05 ? 1 : 0)) }, blE: { filled: Math.max(0, 7 - c - (uq > 0.05 ? 1 : 0)) }, tinY: { lidDy: -16 * wT, lidDx: -8 * wT }, tinC: { lidDy: -18 * wE, lidDx: 10 * wE, lidRot: .25 * wE } },
    front: () => {
      pillFall(986, 668, 972, 690, inv(uq, 0.44, 0.56)); plinkMarks(968, 676, inv(uq, 0.56, 0.8));
      pillFall(1140, 696, 1160, 716, inv(uq, 0.64, 0.76)); plinkMarks(1166, 704, inv(uq, 0.76, 1.0));
      if (sw > 0 && sw < 1) { const p = vlerp(p0, p1, E.io(sw)); const zig = Math.sin(sw * 26) * 46; eraserObj(p[0] + zig + 60, p[1] - 40, overT ? -0.35 : 0.35, { size: 0.9 }); }
      const pth = resample([p0, p1], 14);
      crumbs(pth, sw > 0 ? Math.min(1, sw) : 0, { seed: 'cm' + c, n: 18, spread: 90, fall: 60, h: 20 });
    },
  });
}

/* ---------- H. bailan a la luz de la vela (84–94) ---------- */
function sCandle(_, t) {
  camera(kf(t, [[84, 760], [94, 700]]), kf(t, [[84, 640], [94, 650]]), kf(t, [[84, 1.45], [94, 1.72]]));
  const D = dancePose(t, { cx: 640, amp: 0.45, turns: [89.0], turnDur: 2.2 });
  D.tp.hunch = 0.75; D.ep.hunch = 0.7; D.tp.mouth = .2; D.ep.mouth = .2;
  kitchenFrame({
    K: { lamp: 0, flame: 0, night: 0.62, day: 0, candleAt: [1040, 700], candleR: 760, candleGlow: 0.92 + Math.sin(t * 9) * 0.04, calDay: calDay(8) },
    tito: { P: D.tp, z: 'front', order: 1, alpha: 0.4 }, elsa: { P: D.ep, z: 'front', order: 0, alpha: 0.48 },
    items: { radio: .5, dial: .6, mate: [1040 - 50, 743], bread: null, candle: true, blT: { filled: 2 }, blE: { filled: 2 } },
    front: () => { group({ alpha: 0.48 }, () => drawNearArm(E_, D.ep)); },
  });
  POST.fadePaper = 0;
}

/* ---------- I. lo borran (94–108) ---------- */
const ER_T = scrubPath(712, 600, 916, 906, 9);
function titoGhost() { const p = titoSit({ mouth: 0, brow: .6, hunch: .8 }); return p; }
function sTito(_, t) {
  const q = F.tq;
  camera(kf(t, [[94, 1045], [99, 1045], [101.5, 930, E.io], [105.6, 930], [108, 1060, E.io]]), kf(t, [[94, 650], [108, 650]]), kf(t, [[94, 1.8], [99, 1.8], [101.5, 2.15, E.io], [105.6, 2.15], [108, 1.65, E.io]]));
  const tp = titoSit({ mouth: 0, brow: .5, hunch: .8 }), ep = elsaSit({ mouth: 0.1, hunch: .7 });
  // él le alcanza el mate con la mano temblando
  const pass = bump(q, 94.4, 95.6, 97.0, 97.8);
  reach(T_, tp, 'N', [1050, 708], pass); tp.lean = 0.03 + 0.12 * pass;
  const take = bump(q, 96.2, 97.0, 97.4, 98.0), sip = bump(q, 97.4, 98.0, 98.6, 99.2);
  reach(E_, ep, 'N', [1062, 708], take * (1 - sip)); reach(E_, ep, 'N', [1230, 690], sip); ep.lean = 0.03 + 0.14 * take * (1 - sip);
  const mateIn = q < 94.9 ? null : (q < 97.0 ? 'T' : (q < 99.0 ? 'E' : null));
  // ella se levanta y va a la pava, de espaldas
  let eP = ep, eFront = false;
  if (q >= 99.0) {
    const st = standPose(E_, { x: 1300, face: -1, lean: 0.1, hunch: .7 });
    if (q < 100.0) { eP = mix(ep, st, ramp(q, 99.0, 100.0)); eP.face = -1; }
    else if (q < 102.2) eP = walkTo(E_, q, 100.0, 102.2, 1300, 1436, { stride: 6.5, pose: { hunch: .7 } });
    else if (q < 106.3) { eP = standPose(E_, { x: 1436, face: 1, lean: 0.14, hunch: .7 }); reach(E_, eP, 'N', [1512, 664], ramp(q, 102.2, 103)); reach(E_, eP, 'F', [1498, 690], ramp(q, 102.4, 103.2)); }
    else { eP = standPose(E_, { x: 1436, face: -1, lean: 0.04, hunch: .7, brow: ramp(q, 106.8, 107.4), mouth: 0.4 * (1 - ramp(q, 106.7, 107.2)) - 0.3 * ramp(q, 107, 107.6) }); eP.sx = Math.max(0.12, Math.abs(Math.cos(inv(q, 106.3, 106.9) * Math.PI))); eP.face = inv(q, 106.3, 106.9) < 0.5 ? 1 : -1; reach(E_, eP, 'N', [1436 - 70, 730 + 40 * ramp(q, 107.2, 108)], 0.8); }
    eFront = q >= 99.6;
  }
  // la goma
  const pE = ramp(t, 100.8, 105.4, E.lin);
  let epos;
  if (t < 100.8) epos = vlerp([520, -140], ER_T[0], ramp(t, 99.3, 100.8, E.io));
  else if (t < 105.4) epos = pointAt(ER_T, pE);
  else epos = vlerp(ER_T[ER_T.length - 1], [380, -160], ramp(t, 105.4, 107.0, E.in));
  // Tito se mira las manos, la busca, estira la mano
  const aware = ramp(q, 100.9, 101.8);
  tp.head = 0.25 * bump(q, 100.9, 101.5, 102.2, 102.8) - 0.08 * ramp(q, 102.6, 103.4);
  reach(T_, tp, 'N', [1010, 716], ramp(q, 102.8, 104.2) * 0.9); tp.lean += 0.14 * ramp(q, 102.8, 104.2); tp.mouth = -0.4 * aware; tp.brow = .5 + .5 * aware;
  kitchenFrame({
    K: { lamp: 0, cold: .34, flame: 0, calDay: calDay(8) },
    tito: { P: tremble(tp, 1), alpha: 0.4, erase: eraseFn(ER_T, pE, 64, 0.7), prop: mateIn === 'T' ? (hw => withT(hw[0] + 2, hw[1] + 4, () => mateCup(0, 0))) : null },
    elsa: { P: eP, z: eFront ? 'front' : 'back', alpha: 0.5, prop: mateIn === 'E' ? (hw => withT(hw[0] - 2, hw[1] + 4, () => mateCup(0, 0))) : null },
    items: { radio: 0, dial: .6, mate: mateIn ? null : (q >= 99.0 ? [1100, 743] : [1022, 743]), bread: null, blT: { filled: 0 }, blE: { filled: 0 } },
    front: () => {
      smudgeAlong(ER_T, pE, 90, 0.05, 26);
      crumbs(ER_T, pE, { seed: 'ct', n: 60, spread: 70, fall: 40, h: 10 });
      if (t >= 99.3 && t < 107.0) eraserObj(epos[0] + 64, epos[1] - 46, -0.35 + Math.sin(t * 30) * 0.05);
    },
  });
}

/* ---------- J. sola (108–142) ---------- */
function ghostTito() {
  // lo que quedó de él en la silla
  group({ alpha: 0.4, erase: eraseFn(ER_T, 1, 64, 0.7) }, () => drawFigure(T_, (() => { const p = titoSit({ mouth: -.4, brow: 1, hunch: .8 }); reach(T_, p, 'N', [1010, 716], 0.9); p.lean += 0.14; return p; })()));
  smudgeAlong(ER_T, 1, 90, 0.05, 26);
}
function pilePos(i, base, dir = 1) {  // montoncito de pastillas
  const rows = [[0, 1, 2, 3], [0.5, 1.5, 2.5], [1, 2]];
  let k = 0; for (let r = 0; r < rows.length; r++) for (const c of rows[r]) { if (k === i) return [base[0] + dir * c * 8.2, base[1] - 3.4 - r * 6.4]; k++; }
  return base;
}
function sAlone(_, t) {
  const q = F.tq;
  if (t < 112.5) {
    // 1. ella en la mesada, mirando la silla
    camera(kf(t, [[108, 1060], [112.5, 1100]]), 650, kf(t, [[108, 1.65], [112.5, 1.5]]));
    let eP = standPose(E_, { x: 1436, face: -1, lean: 0.04, hunch: .7, brow: 1, mouth: -.3 });
    reach(E_, eP, 'N', [1366, 770], 0.8 * (1 - ramp(q, 109.6, 110.6)));
    if (q >= 110.8) { eP = walkTo(E_, q, 110.8, 113.2, 1436, 1350, { stride: 5, pose: { hunch: .7, brow: 1, mouth: -.3 } }); }
    kitchenFrame({
      K: { lamp: 0, cold: .34, flame: 0, calDay: calDay(8) }, back: ghostTito,
      elsa: { P: eP, z: 'front', alpha: 0.5 },
      items: { radio: 0, mate: [1100, 743], bread: null, blT: { filled: 0 }, blE: { filled: 0 } },
    });
  } else if (t < 118) {
    // 2. la mano en el respaldo de la silla de él
    camera(kf(t, [[112.5, 800], [118, 780]]), 676, kf(t, [[112.5, 2.2], [118, 2.4]]));
    const eP = standPose(E_, { x: 690, face: 1, lean: 0.1, hunch: .72, brow: 1, mouth: -.3, head: 0.1 + 0.16 * ramp(q, 114.5, 116.5) });
    reach(E_, eP, 'N', [754, 696], ramp(q, 112.9, 114.2)); eP.blink = q > 115.4 ? 1 : 0;
    kitchenFrame({
      K: { lamp: 0, cold: .34, flame: 0, calDay: calDay(8) }, back: ghostTito,
      elsa: { P: eP, z: 'front', alpha: 0.5 },
      items: { radio: 0, mate: [1100, 743], bread: null, blT: { filled: 0 }, blE: { filled: 0 } },
    });
  } else if (t < 128) {
    // 3. baila con nadie
    camera(kf(t, [[118, 700], [128, 660]]), 650, kf(t, [[118, 1.5], [128, 1.72]]));
    const up = ramp(q, 119.2, 121.0), down = ramp(q, 126.0, 127.6);
    const k = up * (1 - down);
    const D = dancePose(t, { cx: 600, amp: 0.5 * ramp(q, 120.6, 121.6) * (1 - ramp(q, 125.2, 126.2)), turns: [] });
    let eP = D.ep; eP.hunch = .72; eP.mouth = 0.25 * k - 0.3 * (1 - k); eP.brow = 1 - 0.5 * k; eP.blink = k > 0.6 ? 1 : 0; eP.head = 0.14 * k + 0.2 * down;
    const st = standPose(E_, { x: eP.x, face: -1, lean: 0.08, hunch: .72, brow: 1, mouth: -.3 });
    const hN = eP.hN, hF = eP.hF;
    eP.hN = vlerp(st.hN, hN, k); eP.hF = vlerp(st.hF, hF, k);
    kitchenFrame({
      K: { lamp: 0, cold: .34, flame: 0, calDay: calDay(8) }, back: ghostTito,
      elsa: { P: eP, z: 'front', alpha: 0.5 },
      items: { radio: 0, mate: [1100, 743], bread: null, blT: { filled: 0 }, blE: { filled: 0 } },
    });
  } else {
    // 4. las dos latas
    camera(kf(t, [[128, 1140], [138, 1140], [142, 1150]]), kf(t, [[128, 676], [142, 686]]), kf(t, [[128, 2.2], [138, 2.3], [142, 2.75, E.io]]));
    const eP = elsaSit({ mouth: -.2, hunch: .72, brow: .8 });
    const ty = [1098, 748];           // la lata de yerba, ya de su lado
    const tc = [1224, 748];
    // abre la de yerba (128.6–130), la inclina (130.4–133)
    const lidY = ramp(q, 128.8, 129.8);
    const tiltY = bump(q, 130.2, 131.0, 133.0, 133.8);
    const lidC = ramp(q, 134.6, 135.4);
    const tiltC = bump(q, 135.8, 136.6, 138.2, 139.0);
    // manos
    reach(E_, eP, 'N', [ty[0] + 20, ty[1] - 40 - tiltY * 26], (1 - ramp(q, 133.8, 134.6)));
    reach(E_, eP, 'F', [ty[0] + 4, ty[1] - 70 - lidY * 10], bump(q, 128.2, 128.8, 129.8, 130.3));
    if (q >= 134.2) { reach(E_, eP, 'N', [tc[0] - 6, tc[1] - 22 - tiltC * 30], ramp(q, 134.2, 135.0) * (1 - ramp(q, 139.0, 139.6))); reach(E_, eP, 'F', [tc[0] + 16, tc[1] - 44 - lidC * 8], bump(q, 134.4, 135.0, 135.4, 135.9)); }
    // se da cuenta
    const real1 = ramp(q, 131.6, 133.0), real2 = ramp(q, 137.2, 138.6);
    eP.head = 0.18 * real1 - 0.06 * bump(q, 133.6, 134.2, 134.8, 135.4) + 0.12 * real2 + 0.2 * ramp(q, 140.2, 141.6);
    eP.brow = 0.8 + 0.2 * real1; eP.mouth = -.2 - .3 * real2;
    // mano a la boca
    const cry = ramp(q, 139.4, 140.4);
    reach(E_, eP, 'N', [1236, 692], cry); eP.lean = 0.03 + 0.1 * cry + Math.sin(q * 13) * 0.012 * ramp(q, 140.4, 141.2); eP.blink = q > 140.2 ? 1 : 0;
    const nY = 9, nC = 8;
    const baseY = [1026, 750], baseC = [1142, 750];
    kitchenFrame({
      K: { lamp: 0, cold: .34, flame: 0, calDay: calDay(8) }, back: ghostTito,
      elsa: { P: tremble(eP, .5), alpha: 0.5 },
      items: {
        radio: 0, mate: [1068 - 80, 743], bread: null, blT: null, blE: null,
        tinY: { dx: 99999 }, tinC: { dx: 99999 },
        extra: () => {
          // lata de yerba, inclinada hacia la izquierda
          withT(ty[0], ty[1] - tiltY * 26, () => tinYerba(0, 0, { lid: lidY < 0.5, key: 'p' }), -1.75 * tiltY);
          if (lidY >= 0.5) withT(ty[0] + 46, ty[1], () => { shape([[-25, -9], [25, -9], [25, 1], [-25, 1], [-25, -9]], { hatch: { gap: 2.4, a: .45, angle: 0 }, stroke: { w: 1.4, a: .9 } }); });
          withT(tc[0], tc[1] - tiltC * 30, () => tinCookie(0, 0, { lid: lidC < 0.5, key: 'p' }), -1.9 * tiltC);
          if (lidC >= 0.5) withT(tc[0] + 36, tc[1] - 34, () => { shape(pRoundRect(-45, -11, 90, 13, 4), { hatch: { gap: 2.6, a: .4, angle: 0 }, stroke: { w: 1.4, a: .9 } }); }, 0.3);
          // pastillas cayendo y apilándose
          for (let i = 0; i < nY; i++) {
            const ts = 130.9 + i * 0.2; const k = inv(q, ts, ts + 0.42); if (k <= 0) continue;
            const end = pilePos(i, baseY, 1); const st = [ty[0] - 44, ty[1] - 66];
            if (k < 1) pillDot(lerp(st[0], end[0], k), lerp(st[1], end[1], k * k), 3.3); else pillDot(end[0], end[1], 3.3);
          }
          for (let i = 0; i < nC; i++) {
            const ts = 136.5 + i * 0.2; const k = inv(q, ts, ts + 0.42); if (k <= 0) continue;
            const end = pilePos(i, baseC, 1); const st = [tc[0] - 62, tc[1] - 50];
            if (k < 1) pillDot(lerp(st[0], end[0], k), lerp(st[1], end[1], k * k), 3.3); else pillDot(end[0], end[1], 3.3);
          }
        },
      },
    });
  }
}

/* ---------- K. miércoles (142–152) ---------- */
function sWednesday(_, t) {
  const q = F.tq;
  if (t < 145.6) {
    // el almanaque
    camera(1332, 384, kf(t, [[142, 4.3], [145.6, 4.7]]));
    const tear = inv(q, 143.0, 144.0);
    kitchenBack({ lamp: 0, cold: .34, flame: 0, calDay: tear > 0 ? { name: 'MI´ERCOLES', num: '12' } : calDay(8) });
    if (tear > 0 && tear < 1) {
      // la hoja vieja se despega y cae
      const k = E.in(tear);
      withT(1290 + 42 + k * 30, 320 + 22 + k * 260, () => {
        obj('oldpage', () => {
          shape(pRect(-42, 0, 84, 100), { stroke: { w: 1.4, a: .9 } });
          const d = calDay(8); const nw = textWidth(d.num, 50, 0.14);
          strokeText(d.name, -42 + (84 - textWidth(d.name, 9.5, .2)) / 2, 8, 9.5, { track: .2, seed: 'op1', stroke: { w: 1, a: .8, jit: .4 } });
          strokeText(d.num, -nw / 2, 32, 50, { track: .14, seed: 'op2', stroke: { w: 2.4, a: .9, jit: .8 } });
        });
      }, k * 0.9);
    }
  } else if (t < 147.6) {
    // por la ventana, lejos, la cúpula
    camera(kf(t, [[145.6, 600], [147.6, 622]]), kf(t, [[145.6, 430], [147.6, 446]]), kf(t, [[145.6, 3.0], [147.6, 3.5]]));
    kitchenBack({ lamp: 0, cold: .3, flame: 0, calDay: { name: 'MI´ERCOLES', num: '12' } });
  } else {
    // la boina
    camera(kf(t, [[147.6, 1560], [152, 1600]]), 640, kf(t, [[147.6, 1.6], [152, 1.75]]));
    let eP = standPose(E_, { x: 1630, face: 1, lean: 0.08, hunch: .72, brow: .7, mouth: -.2 });
    const takeK = bump(q, 147.9, 148.7, 148.9, 149.5), chest = bump(q, 148.9, 149.5, 150.3, 150.9), on = ramp(q, 150.3, 151.0);
    reach(E_, eP, 'N', [1694, 440], takeK * (1 - chest)); reach(E_, eP, 'N', [1648, 720], chest * (1 - on));
    const hdW = headWorld(E_, eP, [0, -20]);
    reach(E_, eP, 'N', [hdW[0] + 10, hdW[1] + 10], on * (1 - ramp(q, 151.0, 151.5)));
    eP.head = 0.22 * chest; eP.blink = chest > 0.6 ? 1 : 0;
    const capHeld = q >= 148.7 && q < 150.9, capOn = q >= 150.9;
    eP.cap = capOn; if (capOn) { eP.brow = .3; eP.mouth = 0; }
    const door = ramp(q, 151.1, 151.8);
    if (q >= 151.2) { const w = walkTo(E_, q, 151.2, 153.5, 1630, 1790, { stride: 7, pose: { hunch: .7, cap: true } }); eP = w; eP.cap = true; }
    kitchenFrame({
      K: { lamp: 0, cold: .3, flame: 0, calDay: { name: 'MI´ERCOLES', num: '12' }, capOnHook: q < 148.7 },
      elsa: { P: eP, z: 'front', alpha: lerp(0.5, 0.56, on), prop: capHeld ? (hw => { withT(hw[0], hw[1], () => { mScale(4); mTranslate(-2, 19); drawCap(); }); }) : null },
      items: { radio: 0, mate: [988, 743], bread: null, blT: null, blE: null },
    });
    POST.fadePaper = ramp(t, 151.4, 152, E.in);
  }
}
