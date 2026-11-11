'use strict';
/* =====================================================================
   LA MÍNIMA — personajes
   Marionetas de perfil: esqueleto con cinemática inversa, ropa y cara
   dibujadas con el mismo trazo del motor (lápiz o crayón según la capa).
   Unidades de figura: una persona de pie mide ~95.
   ===================================================================== */

const CHARS = {
  tito: {
    name: 'tito', kind: 'tito', scale: 4.0, hunch: 0.55,
    dims: { leg: [19, 19], torso: 33, headS: 1.0, arm: [14.5, 13], belly: 12.5, chest: 8, legR: [4.7, 4.0, 3.2], armR: [3.7, 3.1, 2.5] },
  },
  elsa: {
    name: 'elsa', kind: 'elsa', scale: 4.0, hunch: 0.5,
    dims: { leg: [17.5, 17.5], torso: 30, headS: 0.96, arm: [13.5, 12], belly: 10.5, chest: 9.5, legR: [2.7, 2.3, 2.0], armR: [3.4, 2.9, 2.3] },
  },
  nena: {
    name: 'nena', kind: 'nena', scale: 4.0, hunch: 0,
    dims: { leg: [11.5, 11.5], torso: 19, headS: 0.9, arm: [9, 8.5], belly: 6.2, chest: 5.5, legR: [2.3, 2.0, 1.8], armR: [2.5, 2.2, 1.9] },
  },
};

function ik2(S, T, l1, l2, sign) {
  const dx = T[0] - S[0], dy = T[1] - S[1];
  const d = Math.hypot(dx, dy) || 1e-6;
  const maxd = l1 + l2 - 0.02, mind = Math.abs(l1 - l2) + 0.02;
  const dd = clamp(d, mind, maxd);
  const base = Math.atan2(dy, dx);
  const A = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
  const ea = base + sign * A;
  const Ej = [S[0] + Math.cos(ea) * l1, S[1] + Math.sin(ea) * l1];
  const End = [S[0] + Math.cos(base) * dd, S[1] + Math.sin(base) * dd];
  return [Ej, End];
}

function figScale(ch, P) { return ch.scale * (P.scale || 1); }
function figToWorld(ch, P, p) {
  const s = figScale(ch, P); let q = [p[0] * s * (P.face || 1) * (P.sx ?? 1), p[1] * s];
  if (P.rot) q = rot2(q, P.rot);
  return [P.x + q[0], P.y + q[1]];
}
function worldToFig(ch, P, w) {
  const s = figScale(ch, P); let q = [w[0] - P.x, w[1] - P.y];
  if (P.rot) q = rot2(q, -P.rot);
  const sx = (P.face || 1) * (P.sx ?? 1);
  return [q[0] / (s * (Math.abs(sx) < 1e-3 ? 1e-3 : sx)), q[1] / s];
}

function solveFigure(ch, P) {
  const d = ch.dims;
  const hunch = P.hunch ?? ch.hunch;
  const lean = P.lean ?? 0.06;
  const stand = d.leg[0] + d.leg[1] - 0.6 + 2.8;
  const hip = [0, -(P.hipH ?? stand) - (P.bob || 0)];
  const T = d.torso;
  const up = p => vadd(hip, rot2(p, lean));
  const neck = up([1 + hunch * 5, -T - 2.5]);
  const sh = up([-1 + hunch * 3.2, -T + 5.5]);
  const hNt = P.hNw ? worldToFig(ch, P, P.hNw) : vadd(sh, P.hN || [2.5, 25]);
  const hFt = P.hFw ? worldToFig(ch, P, P.hFw) : vadd(sh, P.hF || [0.5, 25]);
  const [eN, hN] = ik2(sh, hNt, d.arm[0], d.arm[1], P.elbN ?? 1);
  const [eF, hF] = ik2(sh, hFt, d.arm[0], d.arm[1], P.elbF ?? 1);
  const [kN, fN] = ik2(hip, P.fN || [2.5, -2.8], d.leg[0], d.leg[1], -1);
  const [kF, fF] = ik2(hip, P.fF || [-2.5, -2.8], d.leg[0], d.leg[1], -1);
  const headA = lean * 0.3 + (P.head || 0) + hunch * 0.1;
  return { hip, neck, sh, eN, hN, eF, hF, kN, fN, kF, fF, headA, lean, hunch, up };
}

/* contorno de un "tubo" (brazo, pierna) a partir de su línea central */
function tube(cl, rfn, cap = true) {
  const n = cl.length; const Lf = [], Rt = [];
  for (let i = 0; i < n; i++) {
    const a = cl[Math.max(0, i - 1)], b = cl[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const r = rfn(i / (n - 1));
    Lf.push([cl[i][0] - ty * r, cl[i][1] + tx * r]);
    Rt.push([cl[i][0] + ty * r, cl[i][1] - tx * r]);
  }
  let capPts = [];
  if (cap) {
    const a = cl[n - 2], b = cl[n - 1]; const ang = Math.atan2(b[1] - a[1], b[0] - a[0]); const r = rfn(1);
    for (let i = 1; i < 6; i++) { const t = ang + Math.PI / 2 - Math.PI * i / 6; capPts.push([b[0] + Math.cos(t) * r, b[1] + Math.sin(t) * r]); }
  }
  const poly = Lf.concat(capPts, Rt.slice().reverse()); poly.push(Lf[0]);
  return { left: Lf, right: Rt, cap: [Lf[n - 1]].concat(capPts, [Rt[n - 1]]), poly };
}

function drawHand(Hn, dir, kind, far) {
  const a = far ? 0.7 : 0.88;
  withT(Hn[0], Hn[1], () => {
    if (kind === 'open') {
      shape(pSpline([[-1.4, -1.3], [2.2, -1.9], [5.2, -1.4], [5.7, 0.2], [2.2, 1.5], [-1.4, 1.4]], true, 5), { stroke: { w: 1.3, a } });
      stroke([[2.2, -1.8], [1.6, -3.3], [0.4, -3.2]], { w: 1.1, a: a * .8 });
    } else if (kind === 'fist') {
      shape(pEllipse(1.9, 0, 2.9, 2.6, 0, 14), { stroke: { w: 1.3, a } });
      stroke(pArc(2.3, 0.1, 1.5, 1.5, -1.2, 1.3, 5), { w: 1, a: a * .55 });
    } else if (kind === 'none') {
      /* nada */
    } else {
      shape(pEllipse(2.1, 0, 3.1, 2.25, 0, 14), { stroke: { w: 1.3, a } });
      stroke([[1.0, -2.0], [2.1, -3.4], [3.3, -2.6]], { w: 1.1, a: a * .8 });
    }
  }, dir);
}

function drawArm(ch, J, side, P) {
  const d = ch.dims, S = J.sh, Ej = J['e' + side], Hn = J['h' + side];
  const far = side === 'F';
  obj(ch.name + '/arm' + side, () => {
    const cl = pSpline([S, Ej, Hn], false, 6);
    const r = d.armR;
    const tb = tube(cl, u => u < 0.5 ? lerp(r[0], r[1], u * 2) : lerp(r[1], r[2], (u - 0.5) * 2));
    const sl = ch.kind === 'tito' ? { gap: 3.6, a: far ? .34 : .44, angle: 0.5 } : ch.kind === 'elsa' ? { gap: 4.2, a: far ? .26 : .34, angle: -0.6 } : null;
    shape(tb.poly, { hatch: sl, stroke: false });
    stroke(tb.left, { w: 1.45, a: far ? .7 : .88 }); stroke(tb.right, { w: 1.45, a: far ? .7 : .88 });
    const dir = Math.atan2(Hn[1] - Ej[1], Hn[0] - Ej[0]) + (P['wrist' + side] || 0);
    drawHand(Hn, dir, P['hand' + side] || 'mitt', far);
  });
}

function drawShoe(A, ang, kind) {
  withT(A[0], A[1], () => {
    const pts = kind === 'slipper'
      ? pSpline([[-2.4, -1.4], [1.0, -2.3], [5.8, -0.5], [6.4, 1.8], [-2.6, 2.0]], true, 4)
      : kind === 'kid' ? pSpline([[-2.2, -1.6], [1.2, -2.2], [5.0, -0.4], [5.4, 1.8], [-2.4, 2.0]], true, 4)
        : pSpline([[-3.0, -2.4], [1.6, -3.0], [7.3, -0.3], [7.9, 2.0], [-3.2, 2.2]], true, 4);
    shape(pts, { hatch: kind === 'kid' ? { gap: 2.6, a: .6, angle: -0.5 } : { gap: 2.3, a: .7, angle: -0.5, cross: kind !== 'slipper' }, stroke: { w: 1.5, a: .9 } });
  }, ang || 0);
}

function drawLeg(ch, J, side, P) {
  const d = ch.dims, hip = J.hip, K = J['k' + side], A = J['f' + side];
  const far = side === 'F';
  obj(ch.name + '/leg' + side, () => {
    const cl = pSpline([hip, K, A], false, 6);
    const r = d.legR;
    const tb = tube(cl, u => u < 0.5 ? lerp(r[0], r[1], u * 2) : lerp(r[1], r[2], (u - 0.5) * 2), false);
    const hz = ch.kind === 'tito' ? { gap: 4.4, a: far ? .3 : .4, angle: 1.2 } : null;
    shape(tb.poly, { hatch: hz, stroke: false });
    stroke(tb.left, { w: 1.45, a: far ? .7 : .88 }); stroke(tb.right, { w: 1.45, a: far ? .7 : .88 });
    drawShoe(A, P['foot' + side] || 0, ch.kind === 'elsa' ? 'slipper' : ch.kind === 'nena' ? 'kid' : 'shoe');
  });
}

function drawSkirt(ch, J, P) {
  obj(ch.name + '/skirt', () => {
    const hip = J.hip;
    const kf = J.kN[0] > J.kF[0] ? J.kN : J.kF, kb = J.kN[0] > J.kF[0] ? J.kF : J.kN;
    const kid = ch.kind === 'nena';
    const wd = kid ? 6.2 : 8.6, hem = kid ? 3.2 : 6.5;
    const pts = pSpline([vadd(hip, [-wd, -4]), vadd(hip, [wd + .3, -3]), vadd(kf, [kid ? 4 : 5.5, kid ? -2 : 0]), vadd(kf, [kid ? 3.4 : 4.5, hem]), vadd(kb, [kid ? -3.6 : -4.5, hem]), vadd(kb, [kid ? -4.4 : -6, kid ? -2 : 0])], true, 5);
    shape(pts, { hatch: kid ? null : { gap: 5.2, a: .36, angle: 1.35 }, stroke: { w: 1.5, a: .88 } });
  });
}

function torsoPts(ch, J) {
  const T = ch.dims.torso, h = J.hunch, b = ch.dims.belly, c = ch.dims.chest;
  const kid = ch.kind === 'nena';
  const loc = kid
    ? [[-5.6, 3], [-6.2, -6], [-5.6, -T * 0.6], [-4.4, -T * 0.93], [-1.6, -T - 2.6], [2.6, -T - 1.8], [c, -T * 0.75], [b, -T * 0.38], [b - .6, -3], [5, 3]]
    : [[-7.5, 3], [-9.2, -7], [-8.2 - h * 3.5, -T * 0.6], [-5.5 + h * 1, -T * 0.93], [-1.8 + h * 5, -T - 2.6], [3.2 + h * 5, -T - 1.6], [c * 0.78 + h * 3, -T * 0.78], [b, -T * 0.4], [b - 1.8, -4], [5.5, 3]];
  return pSpline(loc.map(J.up), true, 6);
}
function drawTorso(ch, J, P) {
  obj(ch.name + '/torso', () => {
    const pts = torsoPts(ch, J);
    const hz = ch.kind === 'tito' ? { gap: 3.7, a: .46, angle: 0.55, cross: true, crossAngle: 1.25 }
      : ch.kind === 'elsa' ? { gap: 4.3, a: .36, angle: -0.6 } : null;
    shape(pts, { hatch: hz, stroke: { w: 1.6, a: .9 } });
    if (ch.kind === 'nena') {          // mochila
      const bp = pSpline([[-5, -ch.dims.torso * 0.95], [-10.5, -ch.dims.torso * 0.9], [-11.5, -ch.dims.torso * 0.35], [-6, -ch.dims.torso * 0.28]].map(J.up), true, 5);
      shape(bp, { hatch: { gap: 2.6, a: .7, angle: 0.4, color: P.packColor || '#2f62a8' }, stroke: { w: 1.4, a: .9, color: P.packColor || '#2f62a8' } });
    }
    if (ch.kind === 'elsa' && P.shawl) {   // manta sobre los hombros
      const T = ch.dims.torso;
      const sp = pSpline([[-9.5 - J.hunch * 3, -T * 0.5], [-7 + J.hunch, -T * 0.98], [0 + J.hunch * 5, -T - 3], [6 + J.hunch * 5, -T - 1], [10.5 + J.hunch * 2, -T * 0.6], [7, -T * 0.42], [-3, -T * 0.5]].map(J.up), true, 5);
      shape(sp, { hatch: { gap: 3, a: .5, angle: 0.2, cross: true }, stroke: { w: 1.5, a: .9 } });
    }
  });
}

function capShape(dx = 0, dy = 0, k = 1) {
  return pSpline([[-10.6, -13.4], [-11.8, -18.8], [-6.5, -23.8], [2.5, -25.0], [9.5, -22.6], [14.0, -18.6], [9.6, -17.3], [2, -16.5], [-5.5, -15.1]].map(p => [p[0] * k + dx, p[1] * k + dy]), true, 5);
}
function drawCap(dx = 0, dy = 0, k = 1) {
  shape(capShape(dx, dy, k), { hatch: { gap: 2.2, a: .72, angle: 0.3, cross: true, crossAngle: 1.3 }, stroke: { w: 1.7, a: .95 } });
  stroke([[0.5 * k + dx, -25 * k + dy], [1.3 * k + dx, -27.2 * k + dy]], { w: 1.6, a: .9 });
}

function drawHead(ch, J, P) {
  const S = ch.dims.headS;
  mPush(); mTranslate(J.neck[0], J.neck[1]); mRotate(J.headA); mScale(S);
  obj(ch.name + '/head', () => {
    const kid = ch.kind === 'nena';
    const nose = ch.kind === 'tito' ? 2.3 : kid ? -1.6 : 0.5;
    const hp = pSpline([[-5.5, 1], [-9.8, -6.5], [-9.4, -14.5], [-3.5, -20.3], [3.8, -19.6], [8.2, -14.6], [8.9, -11.6], [12.2 + nose, -8.2], [9.6, -6.6], [9.9, -4.6], [9.0, -2.9], [9.4, -1.0], [7.0, 2.2], [2.0, 3.2], [-2.2, 2.0]], true, 5);
    shape(hp, { stroke: { w: 1.55, a: .92 } });
    // oreja
    stroke(pArc(-2.4, -9.6, 1.9, 2.7, -1.9, 1.9, 6), { w: 1.1, a: .7 });
    // ojo
    const blink = P.blink || 0;
    if (blink > 0.5) stroke(pQuad([4.4, -11.3], [5.6, -10.5], [6.8, -11.3], 4), { w: 1.3, a: .9 });
    else stroke([[5.5, -11.7], [6.0, -11.4]], { w: 2.5, a: 1, jit: 0.2, taper: false });
    // ceja (brow>0 = triste)
    const br = P.brow || 0;
    stroke([[3.4, -14.9 + br * 0.9], [7.6, -14.5 - br * 1.1]], { w: ch.kind === 'tito' ? 2.2 : 1.3, a: .85 });
    // boca (mouth>0 = sonrisa)
    const mo = P.mouth || 0;
    stroke(pQuad([9.0, -3.1], [7.4, -3.1 + mo * 1.3], [5.9, -3.3 - mo * 1.6], 5), { w: 1.25, a: .85 });
    if (ch.kind === 'elsa') {
      const hair = pSpline([[4.6, -19.9], [-3.5, -21.2], [-10.2, -15], [-10.4, -6.5], [-6, 0.8], [-4.2, -5], [-3, -11], [1, -15.6]], true, 5);
      shape(hair, { knock: false, hatch: { gap: 2.5, a: .42, angle: 0.75 }, stroke: { w: 1.2, a: .7 } });
      shape(pCircle(P.cap ? -11.8 : -11.4, P.cap ? -10.6 : -15.6, 4.5, 14), { hatch: { gap: 2.2, a: .46, angle: -0.5 }, stroke: { w: 1.4, a: .85 } });
      stroke(pCircle(6.5, -11.5, 2.9, 12), { w: 1.2, a: .85 });
      stroke([[3.7, -12.0], [-2, -11.2]], { w: 1.0, a: .7 });
      // arruguita
      stroke(pQuad([6.2, -7.6], [7.0, -6.3], [6.6, -5.0], 4), { w: 0.9, a: .4 });
      if (P.cap) drawCap(0.6, 0.6, 1.06);
    } else if (ch.kind === 'tito') {
      // bigote
      shape(pSpline([[9.0, -7.0], [12.9, -6.6], [12.5, -4.3], [8.4, -4.5]], true, 4), { knock: false, hatch: { gap: 1.6, a: .8, angle: 1.2 }, stroke: { w: 1.2, a: .8 } });
      stroke(pQuad([6.0, -7.8], [6.9, -6.4], [6.4, -5.0], 4), { w: 0.9, a: .4 });
      if (P.cap === false) {
        // pelado: unos pelos atrás
        for (let i = 0; i < 5; i++) stroke([[-9.6 + i * 0.5, -12.5 + i * 2.3], [-11.2 + i * 0.4, -10.8 + i * 2.4]], { w: 1.1, a: .6 });
        stroke(pQuad([-1, -20.6], [1.5, -22], [4, -20.4], 4), { w: 0.9, a: .4 });
      } else {
        for (let i = 0; i < 3; i++) stroke([[-9.8 + i * 0.4, -9.5 + i * 2.5], [-11.4 + i * 0.4, -7.8 + i * 2.6]], { w: 1.1, a: .6 });
        drawCap();
      }
    } else if (kid) {
      // pelo y colita
      const hc = P.hairColor || G.color;
      const hair = pSpline([[6.5, -17.5], [1, -21.4], [-6, -20.6], [-10.6, -14], [-10.2, -5], [-6.5, -3], [-5.5, -10], [-1, -15], [4, -15.4]], true, 5);
      shape(hair, { knock: false, hatch: { gap: 1.9, a: .8, angle: 0.9, color: hc }, stroke: { w: 1.2, a: .8, color: hc } });
      const sw = (P.pony || 0);
      stroke(pSpline([[-10, -15], [-15.5, -14 + sw], [-17.5, -7 + sw * 2], [-15.5, -1 + sw * 2]], false, 5), { w: 2.2, a: .9, color: hc });
      stroke(pSpline([[-10, -13.6], [-14, -11 + sw], [-15.6, -5 + sw * 2], [-13.6, -0.5 + sw * 2]], false, 5), { w: 2.0, a: .8, color: hc });
    }
  });
  mPop();
}

/* dibuja la figura completa; devuelve las articulaciones (coords. de figura) */
function drawFigure(ch, P) {
  const J = solveFigure(ch, P);
  const s = figScale(ch, P);
  mPush(); mTranslate(P.x, P.y); if (P.rot) mRotate(P.rot); mScale(s * (P.face || 1) * (P.sx ?? 1), s);
  drawArm(ch, J, 'F', P);
  drawLeg(ch, J, 'F', P);
  drawLeg(ch, J, 'N', P);
  if (ch.kind === 'elsa' || ch.kind === 'nena') drawSkirt(ch, J, P);
  drawTorso(ch, J, P);
  drawHead(ch, J, P);
  if (P.propN) obj(ch.name + '/prop', () => P.propN(J));
  if (!P.hideArmN) drawArm(ch, J, 'N', P);
  if (P.propTop) obj(ch.name + '/propTop', () => P.propTop(J));
  mPop();
  return J;
}
/* sólo el brazo cercano (para volver a dibujarlo encima de la mesa, etc.) */
function drawNearArm(ch, P) {
  const J = solveFigure(ch, P); const s = figScale(ch, P);
  mPush(); mTranslate(P.x, P.y); if (P.rot) mRotate(P.rot); mScale(s * (P.face || 1) * (P.sx ?? 1), s);
  if (P.propN) obj(ch.name + '/prop', () => P.propN(J));
  drawArm(ch, J, 'N', P);
  if (P.propTop) obj(ch.name + '/propTop', () => P.propTop(J));
  mPop(); return J;
}

/* ---------- poses base ---------- */
function standPose(ch, o = {}) {
  return Object.assign({ x: 0, y: 900, face: 1, hipH: ch.dims.leg[0] + ch.dims.leg[1] - 0.6 + 2.8, lean: 0.07, head: 0, hN: [2.5, 25], hF: [0.5, 25], fN: [2.5, -2.8], fF: [-2.5, -2.8] }, o);
}
function sitPose(ch, o = {}) {
  const seat = (o.seatH ?? 82) / ch.scale;
  return Object.assign({ x: 0, y: 900, face: 1, hipH: seat + 2, lean: 0.03, head: 0, hN: [12, 16], hF: [10, 17], fN: [15.5, -2.8], fF: [12, -2.8] }, o);
}
/* ciclo de caminata: ph en vueltas (1 = dos pasos) */
function walkPose(ch, ph, o = {}) {
  const stride = o.stride ?? 9, lift = o.lift ?? 2.2;
  const foot = (p) => {
    const u = ((p % 1) + 1) % 1;
    if (u < 0.55) { const k = u / 0.55; return [stride * (0.5 - k), -2.8]; }
    const k = (u - 0.55) / 0.45; return [stride * (-0.5 + k), -2.8 - Math.sin(k * Math.PI) * lift];
  };
  const stand = ch.dims.leg[0] + ch.dims.leg[1] - 0.6 + 2.8;
  const bob = Math.abs(Math.sin(ph * Math.PI * 2)) * (o.bobA ?? 0.7);
  const sw = Math.sin(ph * Math.PI * 2) * (o.swing ?? 3);
  return Object.assign({
    y: 900, face: 1, hipH: stand - 0.9 + bob, lean: o.lean ?? 0.12,
    fN: foot(ph), fF: foot(ph + 0.5), hN: [2.5 - sw, 24.5], hF: [0.5 + sw, 24.5], head: 0.02,
  }, o);
}

/* ---------- figura simple (multitud, transeúntes, pibes): pocos trazos ---------- */
function drawSimpleFig(x, y, o = {}) {
  const seed = o.seed || 1; const r = mulberry32(seed * 2654435761 >>> 0);
  const h = o.h || 300; const u = h / 95; const face = o.face || 1;
  const young = !!o.young;
  const wide = 0.85 + r() * 0.4, hun = (young ? 0.04 : 0.35 + r() * 0.5), skirt = r() < (young ? 0.3 : 0.5), hat = Math.floor(r() * 5);
  const pack = young && r() < 0.45, stripes = young && r() < 0.4;
  const lean = (o.lean ?? 0.08) + hun * 0.08;
  const a = o.a ?? 0.85, w = o.w ?? 1.3, ps = o.passes ?? 1;
  const ph = o.walk ?? null;
  const S = { w, a, passes: ps, color: o.color };
  mPush(); mTranslate(x, y); if (o.rot) mRotate(o.rot); mScale(u * face, u);
  obj('sf' + seed, () => {
    const hipH = young ? 43 : 37 - hun * 2;
    const hip = [0, -hipH]; const T = young ? 27 : 31;
    const up = p => vadd(hip, rot2(p, lean));
    // piernas
    let f1 = [2.5, 0], f2 = [-2.5, 0];
    if (ph !== null) { const st = o.stride ?? 8; const fp = p => { const q = ((p % 1) + 1) % 1; return q < 0.55 ? [st * (0.5 - q / 0.55), 0] : [st * (-0.5 + (q - 0.55) / 0.45), -Math.sin((q - 0.55) / 0.45 * Math.PI) * 2.4]; }; f1 = fp(ph); f2 = fp(ph + 0.5); }
    if (o.fall) { f1 = [6, 0]; f2 = [9, -1]; }
    const legW = young ? w * 1.5 : w;
    if (!skirt || young) {
      const k1 = [(hip[0] + f1[0]) / 2 + 3, (hip[1] + f1[1]) / 2], k2 = [(hip[0] + f2[0]) / 2 + 2, (hip[1] + f2[1]) / 2];
      stroke(pSpline([vadd(hip, [-2, 0]), k2, [f2[0] - 1, f2[1]], [f2[0] + 5, f2[1]]], false, 4), Object.assign({}, S, { w: legW, a: a * .85 }));
      stroke(pSpline([vadd(hip, [2.5, 0]), k1, [f1[0], f1[1]], [f1[0] + 6, f1[1]]], false, 4), Object.assign({}, S, { w: legW }));
    } else {
      stroke([[f2[0], -15], [f2[0], f2[1]], [f2[0] + 4, f2[1]]], S);
      stroke([[f1[0], -15], [f1[0], f1[1]], [f1[0] + 4, f1[1]]], S);
    }
    // cuerpo
    let body;
    if (young) {
      body = [[-5, 3], [-6, -9], [-6.4, -T * 0.72], [-4, -T * 0.97], [1, -T - 2], [5.6, -T * 0.9], [6.4, -T * 0.5], [5.6, 3]].map(up);
      if (skirt) { body[0] = vadd(hip, [-8, 15]); body[body.length - 1] = vadd(hip, [8.5, 15]); }
    } else {
      const b = 8 * wide;
      body = [[-6 * wide, 2], [-7.5 * wide, -8], [-7 * wide - hun * 4, -T * 0.6], [-4 + hun, -T * 0.95], [1 + hun * 5, -T - 2], [5 + hun * 4, -T * 0.8], [b, -T * 0.4], [b - 1, 0]].map(up);
      if (skirt) { body[0] = vadd(hip, [-8 * wide, 20]); body[body.length - 1] = vadd(hip, [8.5 * wide, 20]); }
    }
    const bp = pSpline(body, true, 4);
    if (pack) { const pk = pSpline([[-5, -T * 0.95], [-11, -T * 0.88], [-11.5, -T * 0.3], [-5.5, -T * 0.25]].map(up), true, 4); if (o.knock) knock(pk, o.knock); stroke(pk, S); if (o.hatch) hatch(pk, { gap: 2.6, a: a * .6, angle: 0.3, color: o.color }); }
    if (o.knock) knock(bp, o.knock);
    stroke(bp, S);
    if (o.hatch) hatch(bp, { gap: stripes ? (o.hatchGap || 5) * 1.5 : (o.hatchGap || 5), a: a * (stripes ? 0.7 : 0.45), w: stripes ? 2.2 : 1.1, angle: stripes ? 1.57 + lean : 0.4 + r() * 1.2, color: o.color });
    // cabeza
    const nk = up([1 + hun * 5, -T - 2.5]);
    const hr = young ? 7.2 : 8.2;
    const hc = [nk[0] + 1.5, nk[1] - hr - 0.4];
    const head = pEllipse(hc[0], hc[1], hr, hr + 1, 0.1, 14);
    if (o.knock) knock(head, o.knock);
    stroke(head, S);
    stroke([[hc[0] + hr - .2, hc[1] + 0.5], [hc[0] + hr + 2.1, hc[1] + 2.2], [hc[0] + hr - .2, hc[1] + 3.2]], Object.assign({}, S, { w: w * .9 }));
    if (!young) {
      if (hat === 0) { stroke(pSpline([[hc[0] - 9, hc[1] - 3], [hc[0] - 7, hc[1] - 10], [hc[0] + 3, hc[1] - 11], [hc[0] + 11, hc[1] - 5], [hc[0] - 9, hc[1] - 3]], false, 4), S); }
      else if (hat === 1) { stroke(pCircle(hc[0] - 8.5, hc[1] - 6, 3.6, 10), S); }
      else if (hat === 2) { stroke(pSpline([[hc[0] + 6, hc[1] - 7], [hc[0] - 2, hc[1] - 11], [hc[0] - 9, hc[1] - 4], [hc[0] - 8, hc[1] + 6], [hc[0] - 3, hc[1] + 10], [hc[0] + 5, hc[1] + 9]], false, 4), S); }
      else if (hat === 3) { stroke([[hc[0] - 11, hc[1] - 5], [hc[0] + 11, hc[1] - 5]], S); stroke(pSpline([[hc[0] - 6, hc[1] - 5], [hc[0] - 5, hc[1] - 12], [hc[0] + 5, hc[1] - 12], [hc[0] + 6, hc[1] - 5]], false, 4), S); }
    } else {
      const HW = Object.assign({}, S, { w: w * 1.7 });
      if (hat === 0) stroke(pSpline([[hc[0] + 6.5, hc[1] - 4.5], [hc[0], hc[1] - 9.4], [hc[0] - 7.4, hc[1] - 4.5], [hc[0] - 7.8, hc[1] + 3]], false, 4), HW);
      else if (hat === 1) { stroke(pSpline([[hc[0] + 6.5, hc[1] - 4.5], [hc[0], hc[1] - 9.4], [hc[0] - 7.4, hc[1] - 4]], false, 4), HW); stroke(pSpline([[hc[0] - 7, hc[1] - 5], [hc[0] - 13, hc[1] - 3], [hc[0] - 14, hc[1] + 6]], false, 4), HW); }
      else if (hat === 2) { stroke(pSpline([[hc[0] + 6.5, hc[1] - 4.5], [hc[0], hc[1] - 9.4], [hc[0] - 8, hc[1] - 3], [hc[0] - 9, hc[1] + 8], [hc[0] - 7, hc[1] + 15]], false, 4), HW); }
      else if (hat === 3) { stroke(pSpline([[hc[0] + 8.2, hc[1] - 2.6], [hc[0] + 5, hc[1] - 9], [hc[0] - 3, hc[1] - 10.4], [hc[0] - 8, hc[1] - 5], [hc[0] - 8.2, hc[1] - 1.5]], false, 4), HW); stroke([[hc[0] - 8.4, hc[1] - 2], [hc[0] + 11.5, hc[1] - 2.6]], S); }
      else { for (let i = 0; i < 5; i++) stroke(pCircle(hc[0] - 6 + i * 3, hc[1] - 7.6 + Math.abs(i - 2) * 1.5, 2.3, 7), S); }
    }
    // brazos
    const sh = up([hun * 3, -T + 6]);
    const arm = o.arm || 'down';
    let hand;
    if (arm === 'up') hand = vadd(sh, [9, -19]);
    else if (arm === 'fwd') hand = vadd(sh, [15, -3]);
    else if (arm === 'help') hand = vadd(sh, [16, 9]);
    else hand = vadd(sh, [young ? 3 + (ph !== null ? Math.sin(ph * 6.28) * 6 : 0) : 6, 22]);
    const el = [(sh[0] + hand[0]) / 2 - 2 + (arm === 'up' ? 5 : 0), (sh[1] + hand[1]) / 2 + 3];
    stroke(pSpline([sh, el, hand], false, 5), Object.assign({}, S, { w: young ? w * 1.4 : w }));
    if (young && arm === 'help') { const h2 = vadd(sh, [14, 15]); stroke(pSpline([sh, [(sh[0] + h2[0]) / 2 - 3, (sh[1] + h2[1]) / 2 + 4], h2], false, 5), Object.assign({}, S, { a: a * .8 })); }
    if (arm === 'fwd') stroke(pRect(hand[0], hand[1] - 5, 3.2, 6), Object.assign({}, S, { w: w * .8 }));   // el celular
    if (o.cane) stroke([hand, [hand[0] + 5, 0]], Object.assign({}, S, { w: w * 1.2 }));
    if (o.sign) {
      const sx = hand[0] + 1;
      stroke([[sx, hand[1] + 4], [sx, -122]], S);
      const sg = pRect(sx - 16, -150, 32, 26);
      stroke(sg, S);
      for (let i = 0; i < 3; i++) stroke([[sx - 12, -144 + i * 7], [sx - 12 + 8 + r() * 14, -144 + i * 7 + r() * 2]], Object.assign({}, S, { w: w * .8, a: a * .7 }));
    }
  });
  mPop();
}
