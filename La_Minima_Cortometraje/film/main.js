'use strict';
/* LA MÍNIMA — bucle de cuadro */
function renderFrame(frame) {
  F.frame = frame; F.t = frame / FPS; F.boil = Math.floor(frame / 3);
  F.tq = Math.floor(frame / 2) * 2 / FPS;            // animación "en doses"
  clearLayers(); mReset(); setLayer('g'); G.alphaMul = 1; G._gb = null; G.boil = null; G.zoom = 1;
  POST.fadePaper = 0; POST.fadeBlack = 0;
  const t = F.t;
  for (const s of SCENES) if (t >= s.a && t < s.b) { s.fn(t - s.a, t, s); break; }
  compose();
}
function renderData(frame, q) { renderFrame(frame); return L.main.c.toDataURL('image/jpeg', q || 0.93); }
window.addEventListener('load', () => {
  initLayers(); makeTextures();
  document.body.appendChild(L.main.c);
  window.READY = true;
  const m = location.hash.match(/f=(\d+)/); if (m) renderFrame(+m[1]);
});
