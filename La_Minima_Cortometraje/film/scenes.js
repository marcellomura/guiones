'use strict';
/* =====================================================================
   LA MÍNIMA — escenas (1): la cocina
   ===================================================================== */
const T_ = CHARS.tito, E_ = CHARS.elsa, N_ = CHARS.nena;
const TX = 800, EX = 1290;            // caderas en las sillas
const BEAT = 2 / 3, VALS0 = 18;       // el vals arranca a los 18 s; cada compás dura 2 s
const REST_T = { N: [930, 750], F: [912, 750] };
const REST_E = { N: [1196, 751], F: [1214, 751] };
const BL_T = [1000, 755], BL_E = [1070, 755];      // blísters
const TIN_Y = [968, 747], TIN_C = [1168, 748];     // latas

/* mano hacia un punto del mundo, con peso w */
function reach(ch, P, side, target, w) {
  if (w <= 0) return P;
  const J = solveFigure(ch, P);
  const rel = vsub(worldToFig(ch, P, target), J.sh);
  const cur = P['h' + side] || (side === 'N' ? [2.5, 25] : [0.5, 25]);
  P['h' + side] = vlerp(cur, rel, clamp(w));
  return P;
}
function handWorld(ch, P, side) { const J = solveFigure(ch, P); return figToWorld(ch, P, J['h' + side]); }
function headWorld(ch, P, off = [8, -4]) { const J = solveFigure(ch, P); return figToWorld(ch, P, vadd(J.neck, rot2(vmul(off, ch.dims.headS), J.headA))); }
function titoSit(o = {}) { const P = sitPose(T_, Object.assign({ x: TX, face: 1, cap: false }, o)); reach(T_, P, 'N', REST_T.N, 1); reach(T_, P, 'F', REST_T.F, 1); return P; }
function elsaSit(o = {}) { const P = sitPose(E_, Object.assign({ x: EX, face: -1 }, o)); reach(E_, P, 'N', REST_E.N, 1); reach(E_, P, 'F', REST_E.F, 1); return P; }
function eraseFn(path, prog, width, strength = 0.9) {
  if (prog <= 0) return null;
  const n = Math.max(2, Math.ceil(path.length * clamp(prog)));
  const sp = path.slice(0, n).map(TP); const wz = width * G.zoom;
  return ctx => eraseStroke(ctx, sp, wz, strength);
}
/* respiración / temblor */
function breathe(P, seed = 0, amp = 1) { P.lean = (P.lean || 0) + Math.sin(F.t * 1.3 + seed) * 0.008 * amp; return P; }
function tremble(P, k) { if (k > 0) { const s = Math.sin(F.tq * 31) * 0.35 * k; if (P.hN) P.hN = [P.hN[0] + s, P.hN[1] + s * .6]; } return P; }

/* cosas sobre la mesa */
function tableStuff(I = {}) {
  radioSet(866, 745, { on: I.radio || 0, dial: I.dial });
  if (I.mate !== null) { const m = I.mate || [1022, 743]; mateCup(m[0], m[1]); }
  if (I.bread !== null) {
    const b = I.bread || {};
    group({ alpha: 1, erase: b.erase || null }, () => { plate(1094, 743, 34); breadLoaf(1080, 741, 0.72); breadLoaf(1112, 741, 0.66); });
  }
  if (I.candle) candle(1040, 742);
  const ty = I.tinY || {}; tinYerba(TIN_Y[0] + (ty.dx || 0), TIN_Y[1] + (ty.dy || 0), ty);
  const tc = I.tinC || {}; tinCookie(TIN_C[0] + (tc.dx || 0), TIN_C[1] + (tc.dy || 0), tc);
  if (I.blT !== null) { const b = I.blT || { filled: 10 }; blister(BL_T[0], BL_T[1], 10, b.filled ?? 10, { key: 't', fade: b.fade }); }
  if (I.blE !== null) { const b = I.blE || { filled: 10 }; blister(BL_E[0], BL_E[1], 10, b.filled ?? 10, { key: 'e', fade: b.fade }); }
  if (I.extra) I.extra();
}

/* un cuadro de cocina: decorado + actores + mesa, en el orden correcto */
function kitchenFrame(o) {
  const rv = (o.K && o.K.rv) || (() => 1);
  kitchenBack(o.K || {});
  G.boil = Math.floor(F.frame / 6);
  revealObj('k/chairs', rv('chairs'), () => { chair(TX + 2, FLOOR, 1); chair(EX - 2, FLOOR, -1); });
  G.boil = null;
  if (o.back) o.back();
  const actors = [o.tito && Object.assign({ ch: T_ }, o.tito), o.elsa && Object.assign({ ch: E_ }, o.elsa)].filter(Boolean);
  const drawA = (a, part) => {
    const al = a.alpha ?? 1; if (al <= 0.004) return;
    const er = a.erase || null;
    const rvp = a.rev ?? 1;
    const body = () => {
      if (part === 'body') drawFigure(a.ch, Object.assign({}, a.P, { hideArmN: true, propN: null, propTop: null }));
      else if (part === 'arm') { if (a.prop) { const hw = handWorld(a.ch, a.P, 'N'); a.prop(hw); } drawNearArm(a.ch, a.P); }
      else { drawFigure(a.ch, Object.assign({}, a.P, { hideArmN: true })); if (a.prop) { const hw = handWorld(a.ch, a.P, 'N'); a.prop(hw); } drawNearArm(a.ch, a.P); }
    };
    group({ alpha: al, erase: er }, () => { if (rvp < 1) revealObj('act/' + a.ch.name + part, rvp, body); else body(); });
  };
  for (const a of actors) if (a.z !== 'front') drawA(a, 'body');
  G.boil = Math.floor(F.frame / 6);
  revealObj('k/table', rv('table'), () => tableSet());
  revealObj('k/stuff', rv('stuff'), () => tableStuff(o.items || {}));
  G.boil = null;
  for (const a of actors) if (a.z !== 'front') drawA(a, 'arm');
  if (o.mid) o.mid();
  const fr = actors.filter(a => a.z === 'front').sort((a, b) => (a.order || 0) - (b.order || 0));
  for (const a of fr) { floorShadow(a.P.x, 46 * (a.P.sx ?? 1) + 20, 0.22 * (a.alpha ?? 1)); drawA(a, 'all'); }
  if (o.front) o.front();
}

/* ---------- A. el mundo se dibuja solo (0–10) ---------- */
function sIntro(_, t) {
  const z = kf(t, [[0, 1.0], [10, 1.06, E.io]]);
  camera(960, 556, z);
  const win = (a, b) => k => 0;
  const R = { floor: [0.9, 2.5], window: [2.2, 3.7], table: [3.2, 4.5], chairs: [4.0, 5.1], fridge: [4.6, 5.9], lamp: [5.4, 6.3], cal: [5.9, 6.8], shelf: [6.3, 7.3], counter: [6.8, 7.9], door: [7.3, 8.4], stuff: [7.6, 9.0] };
  const rv = k => R[k] ? ramp(t, R[k][0], R[k][1], E.lin) : 1;
  const figT = ramp(t, 8.3, 9.9, E.lin), figE = ramp(t, 8.7, 10.0, E.lin);
  const lamp = ramp(t, 9.2, 10.0, E.out);
  kitchenFrame({
    K: { rv, lamp, rays: lamp, day: ramp(t, 3.4, 5), kidDrawing: ramp(t, 7.9, 9.2, E.lin), kettleSteam: ramp(t, 9, 10), flame: ramp(t, 9, 9.6) },
    tito: { P: breathe(titoSit({ mouth: .2 })), rev: figT },
    elsa: { P: breathe(elsaSit({ mouth: .2 }), 2), rev: figE },
    items: { radio: 0 },
  });
  POST.fadeBlack = 1 - ramp(t, 0, 1.4, E.out);
}

/* ---------- B. la mañana: mate, radio, pastillas (10–22) ---------- */
function sMorning(_, t) {
  const q = F.tq;
  const z = kf(t, [[10, 1.06], [13.5, 1.8, E.io], [22, 1.9, E.io]]);
  const cx = kf(t, [[10, 960], [13.5, 1045, E.io], [22, 1045]]), cy = kf(t, [[10, 556], [13.5, 640, E.io], [22, 646]]);
  camera(cx, cy, z);
  // Tito toma un mate (10.6–13.2), se lo pasa a Elsa (13.2–14.6), ella toma (14.8–16.4) y lo deja
  const tMouth = [862, 676], eMouth = [1230, 690], midPass = [1060, 705];
  const tp = titoSit({ mouth: .25 }), ep = elsaSit({ mouth: .25 });
  const wT1 = bump(q, 10.4, 11.2, 12.8, 13.4), wTpass = bump(q, 13.2, 14.2, 14.8, 15.6);
  let matePos = [1022, 743], mateIn = null;
  // mano de Tito
  const tHold = q >= 10.4 && q < 14.6;
  if (q < 13.3) { reach(T_, tp, 'N', [1014, 732], ramp(q, 10.2, 10.8) * (1 - ramp(q, 10.8, 11.4))); reach(T_, tp, 'N', tMouth, wT1); }
  else reach(T_, tp, 'N', midPass, wTpass);
  tp.head = -0.1 * wT1; tp.blink = wT1 > 0.9 ? 1 : 0;
  // mano de Elsa
  const wEtake = bump(q, 13.8, 14.6, 16.6, 17.4), wEm = bump(q, 14.9, 15.6, 16.2, 16.8);
  reach(E_, ep, 'N', midPass, wEtake * (1 - wEm)); reach(E_, ep, 'N', eMouth, wEm);
  ep.head = -0.08 * wEm; ep.blink = wEm > 0.9 ? 1 : 0;
  ep.lean = 0.03 + 0.14 * bump(q, 13.8, 14.6, 14.9, 15.6); tp.lean = 0.03 + 0.12 * wTpass;
  if (q >= 10.9 && q < 14.5) mateIn = 'T'; else if (q >= 14.5 && q < 16.9) mateIn = 'E';
  // radio: Tito la prende a los 16
  const wRadio = bump(q, 15.2, 15.9, 16.3, 17.0);
  reach(T_, tp, 'F', [922, 714], wRadio); tp.lean += 0.05 * wRadio;
  const radioOn = ramp(t, 16.0, 16.5);
  // pastillas: 18.4–21.6
  const pill = (ch, P, bl, mouth, t0) => {
    const wB = bump(q, t0, t0 + 0.6, t0 + 0.9, t0 + 1.5), wM = bump(q, t0 + 0.9, t0 + 1.6, t0 + 2.1, t0 + 2.8);
    reach(ch, P, 'N', [bl[0] + 30, bl[1] - 14], wB * (1 - wM)); reach(ch, P, 'N', mouth, wM);
    P.head = (P.head || 0) - 0.16 * bump(q, t0 + 1.5, t0 + 1.9, t0 + 2.3, t0 + 2.8);
    return (q >= t0 + 0.7 && q < t0 + 1.75);
  };
  const pT = pill(T_, tp, BL_T, [858, 672], 18.4), pE = pill(E_, ep, BL_E, [1234, 688], 18.8);
  const tinyM = (hw) => { withT(hw[0] + 2, hw[1] + 4, () => mateCup(0, 0)); };
  kitchenFrame({
    K: { kettleSteam: 1, flame: 1 },
    tito: { P: breathe(tp), prop: mateIn === 'T' ? tinyM : (pT ? (hw => pillDot(hw[0] + 9, hw[1] - 3, 3.2)) : null) },
    elsa: { P: breathe(ep, 2), prop: mateIn === 'E' ? (hw => withT(hw[0] - 2, hw[1] + 4, () => mateCup(0, 0))) : (pE ? (hw => pillDot(hw[0] - 9, hw[1] - 3, 3.2)) : null) },
    items: { radio: radioOn, dial: -1 + radioOn * 1.6, mate: mateIn ? null : (q >= 16.9 ? [1040, 743] : [1022, 743]), blT: { filled: q >= 19.1 ? 9 : 10 }, blE: { filled: q >= 19.5 ? 9 : 10 } },
  });
}

/* ---------- C. "¿bailamos?" (22–26) ---------- */
function sInvite(_, t) {
  const q = F.tq;
  camera(kf(t, [[22, 1045], [26, 1030]]), kf(t, [[22, 646], [26, 626]]), kf(t, [[22, 1.9], [26, 1.7]]));
  const up = ramp(q, 22.2, 23.5);
  const tp = mix(titoSit({ mouth: .5 }), standPose(T_, { x: 812, cap: false, lean: 0.1, mouth: .7, hN: [3, 25], hF: [1, 25] }), up);
  tp.cap = false;
  const off = ramp(q, 23.6, 24.8);
  tp.lean = lerp(tp.lean, 0.3, off * (1 - ramp(q, 25.4, 26)) * 0.8 + 0);
  reach(T_, tp, 'N', [1010, 690], off);
  tp.head = -0.06 * off;
  const ep = elsaSit({ mouth: .3 });
  const laugh = bump(q, 24.2, 24.7, 25.2, 25.6);
  ep.head = -0.14 * laugh + Math.sin(q * 16) * 0.03 * laugh; ep.mouth = .3 + .6 * ramp(q, 24.2, 24.8); ep.blink = laugh > 0.5 ? 1 : 0;
  reach(E_, ep, 'N', [1050, 696], ramp(q, 25.0, 25.9)); ep.lean = 0.03 + 0.2 * ramp(q, 25.0, 25.9);
  kitchenFrame({
    K: { kettleSteam: 1, flame: 1 },
    tito: { P: tp, z: up > 0.5 ? 'back' : 'back' }, elsa: { P: breathe(ep, 2) },
    items: { radio: 1, dial: .6, mate: [1040, 743], blT: { filled: 9 }, blE: { filled: 9 } },
  });
}

/* pareja bailando: devuelve poses */
function dancePose(t, o = {}) {
  const q = o.cont ? t : F.tq;
  const bar = (q - VALS0) / 2, bt = (q - VALS0) / BEAT;
  const amp = o.amp ?? 1;
  let cx = (o.cx ?? 610) + Math.sin(bar * Math.PI) * 54 * amp;
  const st = bt % 1; const bob = Math.sin(st * Math.PI) * 0.8 * amp;
  const bi = Math.floor(bt);
  let sx = 1;
  for (const tt of (o.turns || [])) { const k = inv(q, tt, tt + (o.turnDur || 1.3)); if (k > 0 && k < 1) sx = Math.cos(E.io(k) * Math.PI * 2); }
  const s = sx >= 0 ? 1 : -1, ax = Math.max(0.1, Math.abs(sx));
  const sep = 45;
  const tilt = Math.sin(bar * Math.PI) * 0.035 * amp;
  const lift = (odd) => ((bi % 2 === 0) === odd ? Math.sin(st * Math.PI) * 1.6 * amp : 0);
  const tp = standPose(T_, { x: cx - sep * sx, face: s, sx: ax, cap: false, lean: 0.1 + tilt * s, bob, mouth: .6, blink: 1, head: 0.04, fN: [2.5, -2.8 - lift(true)], fF: [-2.5, -2.8 - lift(false)] });
  const ep = standPose(E_, { x: cx + sep * sx, face: -s, sx: ax, lean: 0.12 - tilt * s, bob, mouth: .6, blink: 1, head: 0.14, fN: [2.5, -2.8 - lift(false)], fF: [-2.5, -2.8 - lift(true)] });
  const yb = -bob * 4;
  reach(T_, tp, 'N', [ep.x + 30 * s * ax, 694 + yb], 1); reach(T_, tp, 'F', [cx + 2 * s, 676 + yb], 1);
  reach(E_, ep, 'N', [tp.x - 6 * s * ax, 640 + yb], 1); reach(E_, ep, 'F', [cx - 2 * s, 676 + yb], 1);
  return { tp, ep, cx, s };
}

/* ---------- D. el vals (26–36) y E. la goma (36–48) ---------- */
const ER1 = {
  bread: scrubPath(1052, 716, 1108, 744, 3), flame: scrubPath(1476, 628, 1590, 734, 5), lamp: scrubPath(968, 352, 1076, 424, 3),
};
function eraser1State(t) {
  // tiempos de cada pasada
  const pB = ramp(t, 37.2, 39.3, E.lin), pF = ramp(t, 40.4, 42.6, E.lin), pL = ramp(t, 43.6, 46.0, E.lin);
  let pos, rot = -0.35;
  const wig = Math.sin(t * 30) * 0.05;
  const A = [1500, -120], B0 = pointAt(ER1.bread, 0), B1 = pointAt(ER1.bread, 1), F0 = pointAt(ER1.flame, 0), F1 = pointAt(ER1.flame, 1), L0 = pointAt(ER1.lamp, 0), L1 = pointAt(ER1.lamp, 1);
  const off = [70, -52];   // la goma apoya una punta
  if (t < 37.2) pos = vlerp(A, B0, ramp(t, 36.0, 37.2, E.io));
  else if (t < 39.3) pos = pointAt(ER1.bread, pB);
  else if (t < 40.4) pos = vlerp(B1, F0, ramp(t, 39.3, 40.4, E.io));
  else if (t < 42.6) pos = pointAt(ER1.flame, pF);
  else if (t < 43.6) pos = vlerp(F1, L0, ramp(t, 42.6, 43.6, E.io));
  else if (t < 46.0) pos = pointAt(ER1.lamp, pL);
  else pos = vlerp(L1, [760, -160], ramp(t, 46.0, 47.4, E.in));
  return { pB, pF, pL, pos: vadd(pos, off), rot: rot + wig, on: t >= 36.0 && t < 47.4 };
}
function sDance(_, t) {
  const q = F.tq;
  const inE = t >= 36;
  const z = kf(t, [[26, 1.9], [31, 1.75], [35.2, 1.75], [37.4, 1.0, E.io], [44.2, 1.0], [47.6, 1.08, E.io]]);
  const cx = kf(t, [[26, 640], [35.2, 650], [37.4, 960, E.io], [48, 960]]), cy = kf(t, [[26, 660], [35.2, 660], [37.4, 556, E.io], [48, 556]]);
  camera(cx, cy, z);
  const S = eraser1State(t);
  const stop = ramp(q, 44.4, 45.6);
  const D = dancePose(t, { turns: [29.0, 33.0, 39.0], amp: 1 - stop });
  let tp = D.tp, ep = D.ep;
  if (stop > 0) {
    // se quedan quietos mirando la lámpara que ya no alumbra
    const a = standPose(T_, { x: D.cx - 62, cap: false, lean: 0.06, head: -0.32, brow: .6, mouth: -.2, hN: [3, 25], hF: [1, 25] });
    const b = standPose(E_, { x: D.cx + 62, face: -1, lean: 0.06, head: -0.3, brow: .6, mouth: -.2, hN: [3, 24], hF: [1, 24] });
    reach(E_, b, 'N', [D.cx + 2, 690], 1); reach(T_, a, 'N', [D.cx + 4, 692], 1);     // siguen de la mano
    tp = mix(tp, a, stop); ep = mix(ep, b, stop); tp.cap = false; tp.blink = stop > .3 ? 0 : 1; ep.blink = stop > .3 ? 0 : 1; tp.face = 1; ep.face = -1;
  }
  const lamp = 1 - (S.pL < 0.34 ? S.pL * 0.9 : S.pL < 0.67 ? 0.31 + (S.pL - 0.34) * 1.0 : 0.64 + (S.pL - 0.67) * 1.1);
  kitchenFrame({
    K: { kettleSteam: 1 - ramp(S.pF, 0, 0.55), flame: 1 - ramp(S.pF, 0.5, 1), lamp: clamp(lamp), rays: 1 - ramp(S.pL, 0, 0.5), cold: 0.12 * ramp(S.pL, 0.3, 1) },
    tito: { P: tp, z: 'front', order: 1 }, elsa: { P: ep, z: 'front', order: 0 },
    items: { radio: 1, dial: .6, mate: [1040, 743], blT: { filled: 9 }, blE: { filled: 9 }, bread: { erase: eraseFn(ER1.bread, S.pB, 30) } },
    front: () => {
      // el brazo de ella por encima del hombro de él
      group({ alpha: 1 }, () => drawNearArm(E_, ep));
      if (inE) {
        crumbs(ER1.bread, S.pB, { seed: 'c1', n: 26, spread: 50, fall: 14, h: 6 });
        crumbs(ER1.flame, S.pF, { seed: 'c2', n: 34, spread: 60, fall: 30, h: 60 });
        crumbs(ER1.lamp, S.pL, { seed: 'c3', n: 30, spread: 80, fall: 300, h: 30 });
        if (S.on) eraserObj(S.pos[0], S.pos[1], S.rot);
      }
    },
  });
}
