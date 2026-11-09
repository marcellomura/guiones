/* Buenos Aires Escondida — motor del juego.
   Objetos ocultos + acertijos por ocho barrios porteños. Sin dependencias. */
(function () {
  'use strict';
  const C = window.BAE_CONTENT;
  const ATLAS = window.BAE_ATLAS;
  const LOCS = C.locations;
  const W = 2048, H = 1152; // tamaño lógico de cada escena
  const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const TACTIL = !!(window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches);

  // ---------- utilidades ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    if (props) for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) if (k != null && k !== false) n.append(k.nodeType ? k : document.createTextNode(String(k)));
    return n;
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const nf = n => Math.round(n).toLocaleString('es-AR');
  const ORD = ['Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto', 'Sexto', 'Séptimo', 'Último'];

  const ICON = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    sonido: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    mudo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6M21 9l-5 6"/></svg>',
    lupa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>',
    mas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    menos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  };

  // ---------- guardado (solo comodidad local; el juego funciona sin él) ----------
  const CLAVE = 'bae.partida.v1';
  const nuevaPartida = (aj) => ({ etapa: 0, intro: false, piezas: [], puntos: 0, barrios: {}, fin: false, ajustes: aj || { musica: true, voces: true, efectos: true } });
  function leerPartida() {
    try { const s = JSON.parse(localStorage.getItem(CLAVE)); if (s && typeof s === 'object') return Object.assign(nuevaPartida(), s); } catch (e) { /* sin almacenamiento */ }
    return nuevaPartida();
  }
  let S = leerPartida();
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(S)); } catch (e) { /* sin almacenamiento */ } }

  // ---------- imágenes y objetos ----------
  const IMG = {};
  function cargarImg(src) {
    if (IMG[src]) return IMG[src];
    IMG[src] = new Promise((res, rej) => {
      const i = new Image();
      i.decoding = 'async';
      i.onload = () => res(i);
      i.onerror = () => { delete IMG[src]; rej(new Error('No se pudo cargar ' + src)); };
      i.src = src;
    });
    return IMG[src];
  }
  const SPR = {}; // id -> {c, w, h, mask, loc}
  async function cargarAtlas(loc) {
    const img = await cargarImg(`assets/img/objects/${loc}.webp`);
    for (const [id, r] of Object.entries(ATLAS[loc].rects)) {
      const [x, y, w, h] = r;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, x, y, w, h, 0, 0, w, h);
      let mask;
      try {
        const d = g.getImageData(0, 0, w, h).data;
        mask = new Uint8Array(w * h);
        for (let i = 0; i < w * h; i++) mask[i] = d[i * 4 + 3];
      } catch (e) { mask = null; }
      SPR[id] = { c, w, h, mask, loc };
      if (mask) rellenar(SPR[id]);
    }
  }
  // Máscara "llena": la silueta con sus huecos interiores tapados (el centro de un collar
  // o de un salvavidas también cuenta como tocar el objeto) y un punto interior de referencia.
  function rellenar(s) {
    const { w, h, mask } = s;
    const n = w * h;
    const ext = new Uint8Array(n);
    const cola = new Int32Array(n);
    let qh = 0, qt = 0;
    const meter = i => { if (mask[i] <= 40 && !ext[i]) { ext[i] = 1; cola[qt++] = i; } };
    for (let x = 0; x < w; x++) { meter(x); meter((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { meter(y * w); meter(y * w + w - 1); }
    while (qh < qt) {
      const i = cola[qh++], x = i % w;
      if (x > 0) meter(i - 1);
      if (x < w - 1) meter(i + 1);
      if (i >= w) meter(i - w);
      if (i < n - w) meter(i + w);
    }
    const lleno = new Uint8Array(n);
    let mejor = -1, md = Infinity;
    for (let i = 0; i < n; i++) {
      if (ext[i]) continue;
      lleno[i] = 1;
      const x = i % w, y = (i / w) | 0;
      const d = (x - w / 2) ** 2 + (y - h / 2) ** 2;
      if (d < md) { md = d; mejor = i; }
    }
    s.lleno = lleno;
    s.interno = mejor >= 0 ? [mejor % w, (mejor / w) | 0] : [w / 2, h / 2];
  }
  function copia(id, maxW, maxH, color) {
    const s = SPR[id];
    const k = Math.min(maxW / s.w, maxH / s.h);
    const c = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.max(1, Math.round(s.w * k * dpr));
    c.height = Math.max(1, Math.round(s.h * k * dpr));
    c.style.width = Math.round(s.w * k) + 'px';
    c.style.height = Math.round(s.h * k) + 'px';
    const g = c.getContext('2d');
    g.drawImage(s.c, 0, 0, c.width, c.height);
    if (color) { g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height); }
    return c;
  }
  const TINTES = {};
  function tenido(id, shade) {
    const k = id + '|' + shade.join(',');
    if (TINTES[k]) return TINTES[k];
    const s = SPR[id];
    const c = document.createElement('canvas');
    c.width = s.w; c.height = s.h;
    const g = c.getContext('2d');
    g.drawImage(s.c, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    // velo neutro: baja un poco la saturación para que el objeto se funda con la pintura
    g.fillStyle = 'rgba(122,112,100,0.10)';
    g.fillRect(0, 0, s.w, s.h);
    const [r, gg, b, a, dark] = shade;
    if (a) { g.fillStyle = `rgba(${r},${gg},${b},${a})`; g.fillRect(0, 0, s.w, s.h); }
    if (dark) { g.fillStyle = `rgba(0,0,0,${dark})`; g.fillRect(0, 0, s.w, s.h); }
    return (TINTES[k] = c);
  }

  // Objetos que se parecen entre sí no se piden juntos en la misma escena.
  const FAMILIAS = {
    sombrero: ['caminito_03', 'cafe_14', 'libreria_11', 'palermo_10', 'madero_10'],
    luz: ['caminito_10', 'santelmo_16', 'libreria_08', 'libreria_04', 'santelmo_10', 'corrientes_09'],
    papel: ['libreria_06', 'libreria_07', 'libreria_09', 'cafe_05', 'colon_03', 'libreria_15'],
    anteojos: ['cafe_07', 'palermo_06'],
    optica: ['santelmo_09', 'madero_05', 'colon_06'],
    barco: ['caminito_14', 'madero_09', 'caminito_15', 'madero_02'],
    flor: ['caminito_04', 'caminito_07', 'colon_15', 'palermo_16'],
    ave: ['madero_04', 'palermo_15', 'palermo_12'],
    taza: ['cafe_01', 'cafe_08', 'santelmo_11'],
    tiempo: ['santelmo_05', 'libreria_02', 'colon_16', 'santelmo_13'],
    cuerdas: ['colon_02', 'caminito_08'],
    mascara: ['colon_01', 'libreria_10'],
    vehiculo: ['santelmo_14', 'corrientes_04', 'corrientes_05', 'madero_16'],
    escritura: ['cafe_11', 'libreria_12', 'libreria_03', 'santelmo_12', 'caminito_06', 'colon_09'],
    campana: ['cafe_12', 'madero_14'],
    dulce: ['cafe_03', 'corrientes_12', 'cafe_16', 'palermo_11'],
    masa: ['corrientes_01', 'corrientes_02', 'corrientes_03', 'cafe_10', 'cafe_02', 'cafe_09'],
    pintura: ['caminito_05', 'caminito_16'],
    vientos: ['colon_10', 'colon_14', 'corrientes_08'],
    pluma: ['colon_12', 'libreria_03'],
    jardin: ['palermo_13', 'palermo_14', 'caminito_12', 'madero_07'],
    sonido: ['santelmo_02', 'santelmo_08', 'corrientes_07', 'libreria_13', 'santelmo_07'],
    cine: ['corrientes_13', 'corrientes_14', 'santelmo_03'],
    cuello: ['colon_11', 'libreria_14', 'corrientes_10'],
    redondo: ['palermo_04', 'madero_11', 'madero_01', 'palermo_08'],
    cana: ['caminito_13', 'madero_06', 'madero_08', 'cafe_15'],
  };
  const FAM_DE = {};
  for (const [f, ids] of Object.entries(FAMILIAS)) for (const id of ids) (FAM_DE[id] = FAM_DE[id] || []).push(f);
  const famsDe = id => FAM_DE[id] || [id];

  function elegir(ids, n, usadas) {
    const out = [];
    for (const id of ids) {
      if (out.length >= n) break;
      const fs = famsDe(id);
      if (fs.some(f => usadas.has(f))) continue;
      fs.forEach(f => usadas.add(f));
      out.push(id);
    }
    return out;
  }

  function solape(a, b) {
    const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]));
    const iy = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
    const amin = Math.min((a[2] - a[0]) * (a[3] - a[1]), (b[2] - b[0]) * (b[3] - b[1]));
    return (ix * iy) / amin;
  }
  function colocar(zonas, ids, previos, opts) {
    opts = opts || {};
    const out = [];
    const areaZ = z => (z[2] - z[0]) * (z[3] - z[1]);
    const total = zonas.reduce((s, z) => s + areaZ(z), 0);
    for (const id of ids) {
      const s = SPR[id];
      let mejor = null;
      for (let t = 0; t < 140; t++) {
        let r = Math.random() * total, z = zonas[0];
        for (const zz of zonas) { r -= areaZ(zz); if (r <= 0) { z = zz; break; } }
        const lado = rnd(opts.min || 98, opts.max || 134);
        const k = lado / Math.max(s.w, s.h);
        const w = s.w * k, h = s.h * k;
        const rot = Math.random() < 0.85 ? rnd(-0.3, 0.3) : rnd(-0.85, 0.85);
        const x = rnd(z[0] * W, z[2] * W), y = rnd(z[1] * H, z[3] * H);
        const ca = Math.abs(Math.cos(rot)), sa = Math.abs(Math.sin(rot));
        const bw = w * ca + h * sa, bh = w * sa + h * ca;
        const box = [x - bw / 2, y - bh / 2, x + bw / 2, y + bh / 2];
        if (box[0] < 14 || box[1] < 14 || box[2] > W - 14 || box[3] > H - 14) continue;
        let peor = 0;
        for (const o of previos.concat(out)) peor = Math.max(peor, solape(box, o.box));
        const cand = { id, x, y, w, h, rot, flip: Math.random() < 0.5, box, peor };
        if (peor <= (opts.solape == null ? 0.05 : opts.solape)) { mejor = cand; break; }
        if (!mejor || peor < mejor.peor) mejor = cand;
      }
      if (mejor) out.push(mejor);
    }
    return out;
  }
  function dibujarObjeto(g, o, img, extra) {
    g.save();
    g.translate(o.x, o.y);
    g.rotate(o.rot);
    const sc = (extra && extra.escala) || 1;
    g.scale(o.flip ? -sc : sc, sc);
    g.shadowColor = 'rgba(0,0,0,0.42)';
    g.shadowBlur = 9;
    g.shadowOffsetX = 3;
    g.shadowOffsetY = 5;
    g.drawImage(img, -o.w / 2, -o.h / 2, o.w, o.h);
    g.restore();
  }

  // ---------- audio ----------
  const VOL = { musica: 0.32, voz: 1, sfx: 0.75 };
  let musicaEl = null, temaActual = null, vozEl = null;
  const TEMAS = { principal: 'assets/audio/musica/tema_principal.mp3', busqueda: 'assets/audio/musica/tema_busqueda.mp3' };
  function fundido(a, a1, ms, fin) {
    if (!a) return;
    const a0 = a.volume, t0 = performance.now();
    clearInterval(a._fade);
    a._fade = setInterval(() => {
      const k = clamp((performance.now() - t0) / ms, 0, 1);
      try { a.volume = clamp(a0 + (a1 - a0) * k, 0, 1); } catch (e) { /* iOS */ }
      if (k >= 1) { clearInterval(a._fade); if (fin) fin(); }
    }, 40);
  }
  function volMusica() { return vozEl ? VOL.musica * 0.35 : VOL.musica; }
  function musica(nombre) {
    if (nombre && temaActual === nombre && musicaEl) {
      if (S.ajustes.musica && musicaEl.paused) musicaEl.play().then(() => fundido(musicaEl, volMusica(), 600)).catch(() => {});
      return;
    }
    const prev = musicaEl;
    if (prev) fundido(prev, 0, 700, () => prev.pause());
    temaActual = nombre || null;
    musicaEl = null;
    if (!nombre) return;
    const a = new Audio(TEMAS[nombre]);
    a.loop = true; a.preload = 'auto'; a.volume = 0;
    musicaEl = a;
    if (S.ajustes.musica) a.play().then(() => fundido(a, volMusica(), 1200)).catch(() => {});
  }
  const SFX = ['encontrado', 'error', 'pista', 'nivel', 'carta', 'pieza', 'tranvia', 'papel'];
  const sfxPool = {};
  function sfx(n, vol) {
    if (!S.ajustes.efectos) return;
    const pool = sfxPool[n] || (sfxPool[n] = []);
    let a = pool.find(x => x.paused || x.ended);
    if (!a) {
      if (pool.length >= 4) a = pool[0];
      else { a = new Audio(`assets/audio/sfx/${n}.mp3`); a.preload = 'auto'; pool.push(a); }
    }
    a.volume = clamp((vol == null ? 1 : vol) * VOL.sfx, 0, 1);
    try { a.currentTime = 0; } catch (e) { /* aún cargando */ }
    a.play().catch(() => {});
  }
  function callar() {
    if (vozEl) { vozEl.onended = null; vozEl.pause(); vozEl = null; }
    if (musicaEl && !musicaEl.paused) fundido(musicaEl, volMusica(), 500);
  }
  function hablar(clave) {
    callar();
    if (!S.ajustes.voces) return Promise.resolve();
    const a = new Audio(`assets/audio/voz/${clave}.mp3`);
    vozEl = a;
    if (musicaEl && !musicaEl.paused) fundido(musicaEl, VOL.musica * 0.35, 300);
    return new Promise(res => {
      const fin = () => { if (vozEl === a) { vozEl = null; if (musicaEl && !musicaEl.paused) fundido(musicaEl, volMusica(), 700); } res(); };
      a.onended = fin; a.onerror = fin;
      a.play().catch(fin);
    });
  }
  function aplicarAjustes() {
    if (musicaEl) {
      if (S.ajustes.musica) musicaEl.play().then(() => fundido(musicaEl, volMusica(), 500)).catch(() => {});
      else musicaEl.pause();
    }
    if (!S.ajustes.voces) callar();
    const todo = S.ajustes.musica || S.ajustes.voces || S.ajustes.efectos;
    $$('[data-accion="sonido"]').forEach(b => { b.innerHTML = todo ? ICON.sonido : ICON.mudo; b.setAttribute('aria-pressed', String(todo)); b.setAttribute('aria-label', todo ? 'Silenciar' : 'Activar sonido'); });
    guardar();
  }

  // ---------- estructura de pantallas ----------
  const app = $('#app');
  let pantallaActual = null;
  const limpiezas = new Set();
  function limpiar() { for (const f of Array.from(limpiezas)) { try { f(); } catch (e) { /* nada */ } } limpiezas.clear(); }

  function barra(titulo, sub, marcadores) {
    return el('header', { class: 'barra' },
      el('div', { class: 'titulo' }, el('strong', { 'data-titulo': '' , text: titulo }), el('span', { 'data-sub': '', text: sub })),
      el('div', { class: 'marcador' }, marcadores.map(([k, label]) => el('div', null, el('b', { [`data-${k}`]: '', text: '0' }), el('small', { text: label })))),
      el('button', { class: 'icono', 'data-accion': 'sonido', 'aria-label': 'Silenciar', 'aria-pressed': 'true', html: ICON.sonido, onclick: alternarSonido }),
      el('button', { class: 'icono', 'aria-label': 'Menú', html: ICON.menu, onclick: menu }),
    );
  }
  function alternarSonido() {
    const todo = S.ajustes.musica || S.ajustes.voces || S.ajustes.efectos;
    S.ajustes = { musica: !todo, voces: !todo, efectos: !todo };
    aplicarAjustes();
  }

  const P = {};
  function construir() {
    app.innerHTML = '';
    P.titulo = el('section', { class: 'pantalla', id: 'p-titulo' });
    P.mapa = el('section', { class: 'pantalla', id: 'p-mapa', hidden: true });
    P.escena = el('section', { class: 'pantalla', id: 'p-escena', hidden: true });
    P.mini = el('section', { class: 'pantalla', id: 'p-mini', hidden: true });
    P.capa = el('div', { id: 'capa' });
    app.append(P.titulo, P.mapa, P.escena, P.mini, P.capa);
  }
  function mostrar(nombre) {
    for (const [k, p] of Object.entries(P)) if (k !== 'capa') p.hidden = k !== nombre;
    pantallaActual = nombre;
    requestAnimationFrame(alRedimensionar);
  }
  let alRedimensionarPantalla = null;
  function alRedimensionar() { if (alRedimensionarPantalla) alRedimensionarPantalla(); }
  new ResizeObserver(() => alRedimensionar()).observe(app);

  function encajar(caja, marco, ratio) {
    const r = marco.getBoundingClientRect();
    const angosto = window.innerWidth <= 640 || r.height < 40;
    let w = r.width, h = w / ratio;
    if (!angosto && h > r.height) { h = r.height; w = h * ratio; }
    caja.style.width = Math.floor(w) + 'px';
    caja.style.height = Math.floor(h) + 'px';
    return { w: Math.floor(w), h: Math.floor(h) };
  }

  // ---------- capa: diálogos, modales, avisos ----------
  const RETRATO = { flor: 'assets/img/ui/flor.webp', ernesto: 'assets/img/ui/ernesto.webp' };
  const NOMBRE = { flor: 'Flor', ernesto: 'Don Ernesto' };
  function dialogo(clave) {
    return new Promise(resolve => {
      const [quien, texto] = C.lines[clave];
      const velo = el('div', { class: 'velo' });
      const p = el('p', { class: 'texto', 'aria-live': 'polite' });
      const seguir = el('button', { class: 'boton' }, 'Seguir');
      const repetir = el('button', { class: 'icono', 'aria-label': 'Escuchar de nuevo', html: ICON.play, onclick: () => hablar(clave) });
      const caja = el('div', { class: 'dialogo', role: 'dialog', 'aria-label': NOMBRE[quien] },
        el('div', { class: 'retrato', style: { backgroundImage: `url(${RETRATO[quien]})` } }),
        el('div', { class: 'cuerpo' }, el('div', { class: 'quien', text: NOMBRE[quien] }), p, el('div', { class: 'acciones' }, repetir, seguir)));
      P.capa.append(velo, caja);
      hablar(clave);
      let i = 0, escribiendo = !RM;
      const paso = Math.max(1, Math.round(texto.length / 140));
      const timer = setInterval(() => {
        if (!escribiendo) return;
        i += paso;
        p.textContent = texto.slice(0, i);
        if (i >= texto.length) { escribiendo = false; clearInterval(timer); }
      }, 24);
      if (RM) p.textContent = texto;
      const cerrar = () => {
        if (escribiendo) { escribiendo = false; clearInterval(timer); p.textContent = texto; return; }
        clearInterval(timer);
        callar();
        velo.remove(); caja.remove();
        resolve();
      };
      seguir.addEventListener('click', cerrar);
      setTimeout(() => seguir.focus({ preventScroll: true }), 30);
    });
  }
  function modal(contenido, opts) {
    opts = opts || {};
    const tarjeta = el('div', { class: 'tarjeta', role: 'dialog', 'aria-modal': 'true' });
    const fondo = el('div', { class: 'modal' }, tarjeta);
    P.capa.append(fondo);
    const cerrar = () => fondo.remove();
    contenido(tarjeta, cerrar);
    const foco = tarjeta.querySelector('button');
    if (foco) setTimeout(() => foco.focus({ preventScroll: true }), 30);
    return cerrar;
  }
  function aviso(texto) {
    const t = el('div', { class: 'toast', role: 'status', text: texto });
    P.capa.append(t);
    setTimeout(() => t.remove(), 2300);
  }
  function flotante(x, y, texto) {
    const f = el('div', { class: 'flotante', text: texto, style: { left: x + 'px', top: (y - 16) + 'px' } });
    document.body.append(f);
    setTimeout(() => f.remove(), 1000);
  }
  function estrellasHtml(n) {
    return [1, 2, 3].map(i => `<span class="${i <= n ? '' : 'apagada'}">★</span>`).join('');
  }

  function comoSeJuega() {
    modal((t, cerrar) => {
      t.append(
        el('h2', { class: 'letrero', text: 'Cómo se juega' }),
        el('div', { style: { textAlign: 'left', display: 'grid', gap: '8px' } },
          el('p', { style: { margin: 0 } }, el('b', null, 'El mapa. '), 'Don Ernesto te deja un acertijo. Tocá el barrio que describe.'),
          el('p', { style: { margin: 0 } }, el('b', null, 'Objetos ocultos. '), 'Buscá en la escena lo que pide la lista: a veces son palabras, a veces siluetas y a veces acertijos.'),
          el('p', { style: { margin: 0 } }, el('b', null, 'La lupa. '), 'Marca un objeto y se recarga sola. Si hacés clic a lo loco, la escena se traba unos segundos.'),
          el('p', { style: { margin: 0 } }, el('b', null, 'Zoom. '), 'Con dos dedos, la rueda del mouse o los botones + y −.'),
          el('p', { style: { margin: 0 } }, el('b', null, 'Desafíos. '), 'Después de cada escena viene una postal rota, unas diferencias o un memotest, y una pregunta porteña.'),
          el('p', { style: { margin: 0 } }, el('b', null, 'El premio. '), 'Cada barrio te da un pedazo del cartel. Con los ocho, lo armás.')),
        el('button', { class: 'boton', onclick: cerrar }, 'Entendido'));
    });
  }

  function menu() {
    modal((t, cerrar) => {
      const enNivel = pantallaActual === 'escena' || pantallaActual === 'mini';
      const fila = (txt, clave) => {
        const b = el('button', { class: 'opcion', 'aria-pressed': String(S.ajustes[clave]) });
        const pint = () => { b.textContent = `${txt}: ${S.ajustes[clave] ? 'sí' : 'no'}`; b.setAttribute('aria-pressed', String(S.ajustes[clave])); };
        b.addEventListener('click', () => { S.ajustes[clave] = !S.ajustes[clave]; pint(); aplicarAjustes(); });
        pint();
        return b;
      };
      const reiniciar = el('button', { class: 'opcion' }, 'Empezar de nuevo');
      reiniciar.addEventListener('click', () => {
        if (reiniciar.dataset.confirmar) { cerrar(); limpiar(); callar(); S = nuevaPartida(S.ajustes); guardar(); pantallaTitulo(); return; }
        reiniciar.dataset.confirmar = '1';
        reiniciar.textContent = 'Tocá otra vez para borrar el progreso';
      });
      t.append(
        el('h2', { class: 'letrero', text: 'Pausa' }),
        el('div', { class: 'opciones' },
          el('button', { class: 'opcion', onclick: cerrar }, 'Seguir jugando'),
          enNivel ? el('button', { class: 'opcion', onclick: () => { cerrar(); limpiar(); callar(); pantallaMapa(); } }, 'Abandonar y volver al mapa') : null,
          !enNivel && pantallaActual !== 'titulo' ? el('button', { class: 'opcion', onclick: () => { cerrar(); limpiar(); pantallaTitulo(); } }, 'Ir a la portada') : null,
          el('button', { class: 'opcion', onclick: () => { cerrar(); comoSeJuega(); } }, 'Cómo se juega'),
          fila('Música', 'musica'), fila('Voces', 'voces'), fila('Efectos', 'efectos'),
          reiniciar));
    });
  }

  // ---------- portada ----------
  function pantallaTitulo() {
    limpiar();
    mostrar('titulo');
    alRedimensionarPantalla = null;
    const hay = S.intro && (S.etapa > 0 || S.fin);
    P.titulo.innerHTML = '';
    P.titulo.append(
      el('div', { class: 'titulo-fondo', style: { backgroundImage: 'url(assets/img/ui/titulo.webp)' } }),
      el('div', { class: 'titulo-caja' },
        el('h1', { style: { margin: 0 } }, el('img', { class: 'logo', src: 'assets/img/ui/logo.webp', alt: 'Buenos Aires Escondida', width: 1400, height: 640 })),
        el('p', { text: 'Un viejo fileteador cortó su último cartel en ocho pedazos y los escondió por la ciudad. Resolvé sus acertijos, encontrá los objetos ocultos y armalo de nuevo.' }),
        el('div', { class: 'titulo-botones' },
          hay ? el('button', { class: 'boton', onclick: () => empezar(false) }, S.fin ? 'Seguir paseando' : 'Seguir la aventura') : el('button', { class: 'boton', onclick: () => empezar(true) }, 'Jugar'),
          hay ? el('button', { class: 'boton sobrio', onclick: () => empezar(true) }, 'Empezar de nuevo') : null,
          el('button', { class: 'boton sobrio', onclick: comoSeJuega }, 'Cómo se juega')),
        el('p', { class: 'creditos-mini', text: 'Arte, voces, música y sonidos creados con ElevenLabs. Hecho en clave porteña.' })));
  }

  async function empezar(nuevo) {
    musica('principal');
    if (!(await asegurarCarga())) return;
    if (nuevo) { S = nuevaPartida(S.ajustes); guardar(); }
    pantallaMapa();
    if (!S.intro) {
      await sleep(250);
      await dialogo('flor_intro1');
      await dialogo('ernesto_intro');
      await dialogo('flor_intro2');
      S.intro = true; guardar();
      if (pantallaActual === 'mapa') leerAcertijo();
    }
  }

  // ---------- mapa ----------
  function leerAcertijo() {
    if (S.etapa < LOCS.length) hablar('acertijo_' + LOCS[S.etapa].id);
  }
  function pantallaMapa() {
    limpiar();
    callar();
    musica('principal');
    mostrar('mapa');
    P.mapa.innerHTML = '';
    const lienzo = el('div', { class: 'mapa-lienzo', style: { backgroundImage: 'url(assets/img/ui/mapa.webp)' }, role: 'group', 'aria-label': 'Mapa de Buenos Aires' });
    const marco = el('div', { class: 'mapa-marco' }, lienzo);
    LOCS.forEach((loc, i) => {
      const hecho = S.barrios[loc.id];
      const pin = el('button', {
        class: 'pin' + (hecho ? ' hecho' : ''), style: { left: loc.map[0] * 100 + '%', top: loc.map[1] * 100 + '%' },
        'aria-label': rotulo(loc) + (hecho ? ' (completado)' : ''), onclick: () => tocarPin(i, pin),
      },
      el('span', { class: 'medalla', style: { backgroundImage: `url(assets/img/scenes/${loc.id}_mini.webp)` } }),
      el('span', { class: 'nombre', text: rotulo(loc) }),
      hecho ? el('span', { class: 'estrellas', text: '★'.repeat(hecho.estrellas) + '☆'.repeat(3 - hecho.estrellas) }) : null);
      lienzo.append(pin);
    });
    const lado = el('aside', { class: 'mapa-lado' });
    const fin = S.etapa >= LOCS.length;
    if (!fin) {
      const loc = LOCS[S.etapa];
      lado.append(el('div', { class: 'tarjeta' },
        el('div', { class: 'acertijo-cab' }, el('div', { class: 'retrato', style: { backgroundImage: `url(${RETRATO.ernesto})` } }),
          el('div', null, el('div', { class: 'etiqueta', text: 'Acertijo de Don Ernesto' }), el('strong', { style: { fontFamily: 'var(--f-display)' }, text: `${ORD[S.etapa]} pedazo` }))),
        el('p', { class: 'acertijo-texto', text: C.lines['acertijo_' + loc.id][1].replace(/^[^.]+\.\s*/, '') }),
        el('button', { class: 'boton sobrio', onclick: leerAcertijo }, 'Escuchar acertijo')));
    } else {
      lado.append(el('div', { class: 'tarjeta' },
        el('div', { class: 'etiqueta', text: S.fin ? 'Cartel terminado' : '¡Los ocho pedazos!' }),
        el('p', { class: 'acertijo-texto', text: S.fin ? 'Ya armaste el cartel. Podés volver a cualquier barrio para jugar otra vez.' : 'Ya juntaste todo el cartel de Don Ernesto. Falta armarlo.' }),
        el('button', { class: 'boton verde', onclick: armarCartel }, S.fin ? 'Ver el cartel otra vez' : 'Armar el cartel')));
    }
    // en pantallas angostas los pines quedan chicos: también se puede elegir desde una lista
    const pines = $$('.pin', lienzo);
    lado.append(el('div', { class: 'tarjeta lugares-tarjeta' }, el('div', { class: 'etiqueta', text: 'Lugares del mapa' }),
      el('div', { class: 'lugares' }, LOCS.map((loc, i) => el('button', { class: 'lugar' + (S.barrios[loc.id] ? ' hecho' : ''), onclick: () => tocarPin(i, pines[i]) },
        el('span', { class: 'medalla', style: { backgroundImage: `url(assets/img/scenes/${loc.id}_mini.webp)` } }), el('span', { text: rotulo(loc) }))))));
    const progreso = el('div', { class: 'cartel-progreso', 'aria-label': `${S.piezas.length} de 8 pedazos` });
    for (let i = 0; i < 8; i++) progreso.append(el('i', { class: S.piezas.includes(i) ? 'ok' : '', style: piezaFondo(i) }));
    lado.append(el('div', { class: 'tarjeta' }, el('div', { class: 'etiqueta', text: 'El cartel de Don Ernesto' }), progreso,
      el('p', { class: 'nota', text: fin ? 'Tocá un barrio con ✓ para volver a jugarlo.' : 'Cada barrio esconde un pedazo. Los barrios con ✓ se pueden repetir.' })));
    P.mapa.append(barra('Mapa de Buenos Aires', fin ? 'Volvé a cualquier barrio' : 'Leé el acertijo y tocá el lugar correcto', [['puntos', 'Puntos'], ['piezas', 'Pedazos']]),
      el('div', { class: 'mapa-zona' }, marco, lado));
    $('[data-puntos]', P.mapa).textContent = nf(S.puntos);
    $('[data-piezas]', P.mapa).textContent = `${S.piezas.length}/8`;
    aplicarAjustes();
    alRedimensionarPantalla = () => encajar(lienzo, marco, 16 / 9);
    alRedimensionar();
  }
  function rotulo(loc) {
    return { caminito: 'La Boca', santelmo: 'San Telmo', cafe: 'Avenida de Mayo', colon: 'Plaza Lavalle', libreria: 'Avenida Santa Fe', madero: 'Puerto Madero', palermo: 'Palermo', corrientes: 'Avenida Corrientes' }[loc.id];
  }
  function piezaFondo(i) {
    const c = i % 4, r = Math.floor(i / 4);
    return { backgroundImage: 'url(assets/img/ui/cartel.webp)', backgroundPosition: `${(c / 3) * 100}% ${r * 100}%` };
  }
  function tocarPin(i, pin) {
    const loc = LOCS[i];
    if (!S.intro) return;
    if (i === S.etapa && S.etapa < LOCS.length) { viajar(i, false); return; }
    if (S.barrios[loc.id]) {
      modal((t, cerrar) => {
        t.append(el('h2', { class: 'letrero', text: loc.name }),
          el('p', { style: { margin: 0 }, text: 'Ya conseguiste el pedazo de este barrio. ¿Querés volver a buscar objetos? Cada vez aparecen otros.' }),
          el('div', { class: 'titulo-botones' }, el('button', { class: 'boton', onclick: () => { cerrar(); viajar(i, true); } }, 'Jugar de nuevo'),
            el('button', { class: 'boton sobrio', onclick: cerrar }, 'Quedarme en el mapa')));
      });
      return;
    }
    sfx('error', 0.6);
    pin.classList.remove('sacude'); void pin.offsetWidth; pin.classList.add('sacude');
    aviso('Mmm… no creo que sea por acá.');
    hablar('flor_mapa_error');
  }

  async function viajar(i, repetir) {
    const loc = LOCS[i];
    callar();
    sfx('tranvia', 0.7);
    const cortina = el('div', { class: 'modal' }, el('div', { class: 'tarjeta' },
      el('div', { class: 'etiqueta', text: 'Viajando a' }), el('h2', { class: 'letrero', text: loc.barrio }),
      el('p', { class: 'nota', text: 'Cargando la escena…' })));
    P.capa.append(cortina);
    try {
      await Promise.all([cargarImg(`assets/img/scenes/${loc.id}.webp`), sleep(900)]);
    } catch (e) {
      cortina.remove();
      aviso('No se pudo cargar la escena. Probá de nuevo.');
      return;
    }
    cortina.remove();
    jugarBarrio(i, repetir);
  }

  async function jugarBarrio(i, repetir) {
    const loc = LOCS[i];
    const token = {};
    juegoActual = token;
    const vivo = () => juegoActual === token;
    const r1 = await objetosOcultos(loc, { primera: i === 0 && !repetir && !S.barrios[loc.id] });
    if (!vivo()) return;
    if (repetir) {
      const prev = S.barrios[loc.id];
      if (prev && r1.estrellas > prev.estrellas) { prev.estrellas = r1.estrellas; guardar(); }
      pantallaMapa();
      return;
    }
    const r2 = await minijuego(loc);
    if (!vivo()) return;
    const r3 = await pregunta(loc);
    if (!vivo()) return;
    await dialogo('dato_' + loc.id);
    if (!vivo()) return;
    const total = r1.puntos + r2.puntos + r3.puntos;
    S.barrios[loc.id] = { puntos: total, estrellas: r1.estrellas };
    S.puntos += total;
    if (!S.piezas.includes(i)) S.piezas.push(i);
    S.etapa = Math.max(S.etapa, i + 1);
    guardar();
    await piezaObtenida(i, total);
    if (!vivo()) return;
    pantallaMapa();
    if (S.etapa < LOCS.length) setTimeout(() => { if (pantallaActual === 'mapa') leerAcertijo(); }, 600);
  }
  let juegoActual = null;

  // ---------- escena de objetos ocultos ----------
  const MODOS = {
    palabras: { sub: 'Encontrá los objetos de la lista', intro: 'Buscá en la escena los objetos de la lista.' },
    siluetas: { sub: 'Encontrá las siluetas', intro: 'Esta vez la lista muestra solo siluetas. ¡Mirá bien las formas!' },
    acertijos: { sub: 'Cada objeto es un acertijo', intro: 'Cada objeto se esconde detrás de un acertijo. Leé, pensá y buscá.' },
  };

  function objetosOcultos(loc, opts) {
    return new Promise(async resolve => {
      limpiar();
      musica('busqueda');
      mostrar('escena');
      const modo = loc.mode;
      const n = modo === 'acertijos' ? 9 : (opts.primera ? 10 : 12);
      const fondo = await cargarImg(`assets/img/scenes/${loc.id}.webp`);

      // elegir objetos: la mitad del barrio, el resto de toda la ciudad
      const excl = new Set(loc.exclude);
      const todos = Object.keys(SPR).filter(id => !excl.has(id));
      const usadas = new Set();
      const propios = shuffle(todos.filter(id => SPR[id].loc === loc.id));
      const ajenos = shuffle(todos.filter(id => SPR[id].loc !== loc.id));
      const metas = elegir(propios, Math.ceil(n / 2), usadas);
      metas.push(...elegir(ajenos, n - metas.length, usadas));
      // dificultad progresiva: en los barrios posteriores, objetos más chicos y más relleno
      const nivel = Math.max(0, LOCS.indexOf(loc));
      const chico = nivel * 3.5;
      const relleno = elegir(shuffle(todos.filter(id => !metas.includes(id))), 8 + nivel, usadas);
      const objs = colocar(loc.zones, metas, [], { solape: 0.04, min: 98 - chico, max: 134 - chico }).map(o => Object.assign(o, { meta: true }));
      const extras = colocar(loc.zones, relleno, objs, { solape: 0.22, min: 90 - chico, max: 128 - chico });
      const dibujo = extras.concat(objs);
      for (const o of dibujo) o.img = tenido(o.id, loc.shade);

      const st = {
        loc, objs, dibujo, encontrados: 0, puntos: 0, combo: 0, ultimo: 0, pistas: 0, errores: 0,
        clics: [], bloqueo: 0, cam: { z: 1, x: 0, y: 0 }, efectos: [], carga: 1, t0: 0, pausa: 0, fin: false,
      };

      // composición fija (fondo + objetos) que se rehace al encontrar algo
      const comp = document.createElement('canvas');
      comp.width = W; comp.height = H;
      const cg = comp.getContext('2d');
      function componer() {
        cg.drawImage(fondo, 0, 0, W, H);
        for (const o of st.dibujo) if (!o.encontrado) dibujarObjeto(cg, o, o.img);
      }
      componer();

      // ---- DOM ----
      P.escena.innerHTML = '';
      const cv = el('canvas', { 'aria-label': `Escena: ${loc.name}. Tocá los objetos de la lista.`, role: 'img' });
      const caja = el('div', { class: 'lienzo-caja' }, cv,
        el('div', { class: 'zoom-botones solo-tactil' },
          el('button', { class: 'icono', 'aria-label': 'Acercar', html: ICON.mas, onclick: () => zoomEn(st.cam.z * 1.5) }),
          el('button', { class: 'icono', 'aria-label': 'Alejar', html: ICON.menos, onclick: () => zoomEn(st.cam.z / 1.5) })));
      const marco = el('div', { class: 'lienzo-marco' }, caja);
      const lista = el('div', { class: 'lista' + (modo === 'acertijos' ? ' acertijos' : ''), role: 'list', 'aria-label': 'Objetos para encontrar' });
      const lupa = el('button', { class: 'lupa', 'aria-label': 'Usar una pista' }, el('span', { class: 'aro' }, el('span', { html: ICON.lupa })), el('small', { text: 'Pista' }));
      P.escena.append(barra(loc.name, MODOS[modo].sub, [['puntos', 'Puntos'], ['tiempo', 'Tiempo'], ['faltan', 'Faltan']]),
        el('div', { class: 'escena-zona' }, marco, el('div', { class: 'panel' }, lista, lupa)));
      aplicarAjustes();
      const ctx = cv.getContext('2d');

      // lista
      for (const o of objs) {
        const [nombre, acertijo] = C.objects[o.id];
        const txt = el('span', { class: 'txt' });
        const it = el('div', { class: 'item', role: 'listitem' });
        if (modo === 'siluetas') {
          const s = el('span', { class: 'sil' }, copia(o.id, 42, 34, '#f4e7c9'));
          txt.textContent = '';
          it.append(s, el('span', { class: 'txt', text: '?' , 'aria-label': 'Objeto por descubrir' }));
          o.sil = s;
        } else if (modo === 'acertijos') {
          txt.textContent = acertijo;
          it.append(txt);
        } else {
          txt.textContent = nombre;
          it.append(txt);
        }
        it.title = modo === 'acertijos' ? acertijo : (modo === 'palabras' ? nombre : '');
        o.item = it;
        lista.append(it);
      }
      const marcar = () => {
        $('[data-puntos]', P.escena).textContent = nf(st.puntos);
        $('[data-faltan]', P.escena).textContent = String(objs.length - st.encontrados);
      };
      marcar();

      // ---- tamaño y cámara ----
      let dpr = 1;
      function ajustar() {
        const { w, h } = encajar(caja, marco, 16 / 9);
        dpr = Math.min(2.5, window.devicePixelRatio || 1);
        cv.width = Math.max(1, Math.round(w * dpr));
        cv.height = Math.max(1, Math.round(h * dpr));
        acotar();
        pedirDibujo();
      }
      alRedimensionarPantalla = ajustar;
      function acotar() {
        const z = st.cam.z = clamp(st.cam.z, 1, 3.2);
        st.cam.x = clamp(st.cam.x, 0, W - W / z);
        st.cam.y = clamp(st.cam.y, 0, H - H / z);
        cv.style.touchAction = z > 1.01 ? 'none' : 'pan-y';
      }
      function zoomEn(z, cx, cy) {
        const r = cv.getBoundingClientRect();
        const fx = cx == null ? 0.5 : (cx - r.left) / r.width;
        const fy = cy == null ? 0.5 : (cy - r.top) / r.height;
        const px = st.cam.x + fx * W / st.cam.z, py = st.cam.y + fy * H / st.cam.z;
        st.cam.z = clamp(z, 1, 3.2);
        st.cam.x = px - fx * W / st.cam.z;
        st.cam.y = py - fy * H / st.cam.z;
        acotar();
        pedirDibujo();
      }
      function aEscena(cx, cy) {
        const r = cv.getBoundingClientRect();
        return { x: st.cam.x + ((cx - r.left) / r.width) * (W / st.cam.z), y: st.cam.y + ((cy - r.top) / r.height) * (H / st.cam.z), r };
      }
      function aPantalla(x, y) {
        const r = cv.getBoundingClientRect();
        return { x: r.left + ((x - st.cam.x) / (W / st.cam.z)) * r.width, y: r.top + ((y - st.cam.y) / (H / st.cam.z)) * r.height, k: (r.width / W) * st.cam.z };
      }

      // ---- dibujo ----
      let pedido = false;
      function pedirDibujo() { if (!pedido) { pedido = true; requestAnimationFrame(dibujar); } }
      function dibujar(now) {
        pedido = false;
        if (st.fin && !st.efectos.length && st.cerrado) return;
        const k = (cv.width / W) * st.cam.z;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.setTransform(k, 0, 0, k, -st.cam.x * k, -st.cam.y * k);
        ctx.drawImage(comp, 0, 0);
        const t = performance.now();
        st.efectos = st.efectos.filter(e => t - e.t0 < e.dur);
        for (const e of st.efectos) e.dibujar(ctx, (t - e.t0) / e.dur, k);
        if (st.efectos.length) pedirDibujo();
      }
      function chispas(x, y, color) {
        const parts = Array.from({ length: 18 }, () => ({ a: rnd(0, Math.PI * 2), v: rnd(60, 190), r: rnd(3, 7) }));
        st.efectos.push({ t0: performance.now(), dur: 750, dibujar(g, p) {
          g.save();
          for (const q of parts) {
            const d = q.v * p;
            g.globalAlpha = 1 - p;
            g.fillStyle = color || '#ffd86b';
            g.beginPath(); g.arc(x + Math.cos(q.a) * d, y + Math.sin(q.a) * d, q.r * (1 - p * 0.6), 0, Math.PI * 2); g.fill();
          }
          g.restore();
        } });
        pedirDibujo();
      }
      function cruz(x, y) {
        st.efectos.push({ t0: performance.now(), dur: 500, dibujar(g, p, k) {
          const s = 16 / k * 1.6;
          g.save(); g.globalAlpha = 1 - p; g.strokeStyle = '#ff5b4a'; g.lineWidth = 4 / k * 1.6; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x - s, y - s); g.lineTo(x + s, y + s); g.moveTo(x + s, y - s); g.lineTo(x - s, y + s); g.stroke(); g.restore();
        } });
        pedirDibujo();
      }
      function aro(o) {
        st.efectos.push({ t0: performance.now(), dur: 3800, dibujar(g, p) {
          const pulso = 0.5 + 0.5 * Math.sin(p * Math.PI * 9);
          const r = Math.max(o.w, o.h) * (0.75 + 0.15 * pulso);
          g.save();
          g.globalAlpha = p > 0.85 ? (1 - p) / 0.15 : 1;
          g.strokeStyle = '#ffd86b'; g.lineWidth = 6; g.shadowColor = '#ffd86b'; g.shadowBlur = 20;
          g.beginPath(); g.arc(o.x, o.y, r, 0, Math.PI * 2); g.stroke();
          g.restore();
        } });
        pedirDibujo();
      }

      // ---- reloj y pista ----
      st.t0 = performance.now();
      const reloj = setInterval(() => {
        if (st.fin) return;
        const seg = (performance.now() - st.t0 - st.pausa) / 1000;
        $('[data-tiempo]', P.escena).textContent = fmt(seg);
        if (st.carga < 1) { st.carga = Math.min(1, st.carga + 0.25 / 30); }
        lupa.style.setProperty('--carga', st.carga.toFixed(3));
        lupa.disabled = st.carga < 1;
      }, 250);
      limpiezas.add(() => clearInterval(reloj));
      limpiezas.add(() => { st.fin = true; st.cerrado = true; });

      function usarPista() {
        if (st.carga < 1 || st.fin) return;
        const quedan = objs.filter(o => !o.encontrado);
        if (!quedan.length) return;
        const o = quedan.find(q => !q.pistado) || pick(quedan);
        o.pistado = true;
        st.carga = 0; st.pistas++;
        sfx('pista', 0.8);
        if (st.cam.z > 1.01) {
          st.cam.x = o.x - W / st.cam.z / 2; st.cam.y = o.y - H / st.cam.z / 2; acotar();
        }
        aro(o);
        o.item.classList.remove('pista-activa'); void o.item.offsetWidth; o.item.classList.add('pista-activa');
        if (modo === 'acertijos' && !o.item.querySelector('.resp')) o.item.querySelector('.txt').append(el('span', { class: 'resp', text: C.objects[o.id][0] }));
        if (modo === 'siluetas') o.item.querySelector('.txt').textContent = C.objects[o.id][0];
      }
      lupa.addEventListener('click', usarPista);

      // ---- clics ----
      function golpe(o, p, tol) {
        const s = SPR[o.id];
        const dx = p.x - o.x, dy = p.y - o.y;
        const cs = Math.cos(-o.rot), sn = Math.sin(-o.rot);
        let lx = dx * cs - dy * sn;
        const ly = dx * sn + dy * cs;
        if (o.flip) lx = -lx;
        const kx = s.w / o.w;
        const px = (lx + o.w / 2) * kx, py = (ly + o.h / 2) * kx;
        const t = tol * kx;
        if (px < -t || py < -t || px > s.w + t || py > s.h + t) return false;
        if (!s.lleno) return true;
        const pasos = [[0, 0], [t, 0], [-t, 0], [0, t], [0, -t], [t * 0.7, t * 0.7], [-t * 0.7, t * 0.7], [t * 0.7, -t * 0.7], [-t * 0.7, -t * 0.7], [t * 0.5, 0], [-t * 0.5, 0], [0, t * 0.5], [0, -t * 0.5]];
        for (const [ox, oy] of pasos) {
          const ix = Math.round(px + ox), iy = Math.round(py + oy);
          if (ix >= 0 && iy >= 0 && ix < s.w && iy < s.h && s.lleno[iy * s.w + ix]) return true;
        }
        return false;
      }
      // punto de la escena que cae seguro dentro del objeto (para pruebas automáticas)
      function interno(o) {
        const s = SPR[o.id];
        const k = o.w / s.w;
        const [ix, iy] = s.interno || [s.w / 2, s.h / 2];
        let lx = ix * k - o.w / 2;
        const ly = iy * k - o.h / 2;
        if (o.flip) lx = -lx;
        return { x: o.x + lx * Math.cos(o.rot) - ly * Math.sin(o.rot), y: o.y + lx * Math.sin(o.rot) + ly * Math.cos(o.rot) };
      }
      function tocar(cx, cy) {
        if (st.fin) return;
        if (performance.now() < st.bloqueo) return;
        const p = aEscena(cx, cy);
        const tol = (TACTIL ? 16 : 7) * (W / st.cam.z) / p.r.width;
        const candidatos = objs.filter(o => !o.encontrado && golpe(o, p, tol));
        if (candidatos.length) { encontrar(candidatos[candidatos.length - 1], cx, cy); return; }
        // clic errado
        st.errores++;
        st.puntos = Math.max(0, st.puntos - 10);
        marcar();
        sfx('error', 0.45);
        cruz(p.x, p.y);
        const ahora = performance.now();
        st.clics = st.clics.filter(t => ahora - t < 3000);
        st.clics.push(ahora);
        if (st.clics.length >= 6) { st.clics = []; bloquear(); }
      }
      function bloquear() {
        const dur = 6;
        st.bloqueo = performance.now() + dur * 1000;
        const b = el('div', { class: 'bloqueo' }, el('div', null, el('b', { text: '¡Pará, pará!' }), el('p', { style: { margin: '6px 0 0' } }, 'Tomate un mate y seguí en ', el('span', { text: String(dur) }), '…')));
        caja.append(b);
        const span = b.querySelector('span');
        let q = dur;
        const iv = setInterval(() => { q--; span.textContent = String(q); if (q <= 0) { clearInterval(iv); b.remove(); } }, 1000);
        limpiezas.add(() => clearInterval(iv));
      }
      function encontrar(o, cx, cy) {
        o.encontrado = true;
        st.encontrados++;
        const ahora = performance.now();
        st.combo = ahora - st.ultimo < 5000 ? Math.min(st.combo + 1, 5) : 0;
        st.ultimo = ahora;
        const pts = 100 + st.combo * 50;
        st.puntos += pts;
        marcar();
        sfx('encontrado', 0.9);
        flotante(cx, cy, st.combo ? `+${pts} ¡combo x${st.combo + 1}!` : `+${pts}`);
        chispas(o.x, o.y);
        // vuelo del objeto hacia la lista
        const sp = aPantalla(o.x, o.y);
        const fw = o.w * sp.k, fh = o.h * sp.k;
        const vuelo = copia(o.id, fw, fh);
        vuelo.className = 'vuelo';
        Object.assign(vuelo.style, { left: (sp.x - fw / 2) + 'px', top: (sp.y - fh / 2) + 'px', transform: `rotate(${o.rot}rad) scale(1.25)` });
        document.body.append(vuelo);
        const destino = o.item.getBoundingClientRect();
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const dx = destino.left + 24 - sp.x, dy = destino.top + destino.height / 2 - sp.y;
          vuelo.style.transform = `translate(${dx}px, ${dy}px) scale(0.35)`;
          vuelo.style.opacity = '0.2';
        }));
        setTimeout(() => {
          vuelo.remove();
          o.item.classList.add('encontrado');
          if (modo === 'siluetas') { o.sil.innerHTML = ''; o.sil.append(copia(o.id, 42, 34)); o.item.querySelector('.txt').textContent = C.objects[o.id][0]; }
          if (modo === 'acertijos' && !o.item.querySelector('.resp')) o.item.querySelector('.txt').append(el('span', { class: 'resp', text: C.objects[o.id][0] }));
        }, RM ? 10 : 760);
        componer();
        pedirDibujo();
        if (st.encontrados === objs.length) terminar();
      }

      // gestos: tocar, arrastrar con zoom, pellizcar, rueda
      const punteros = new Map();
      let gesto = null;
      cv.addEventListener('pointerdown', e => {
        cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
        punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (punteros.size === 1) gesto = { tipo: 'toque', x0: e.clientX, y0: e.clientY, cx: st.cam.x, cy: st.cam.y, movido: false };
        else if (punteros.size === 2) {
          const [a, b] = Array.from(punteros.values());
          gesto = { tipo: 'pellizco', d0: Math.hypot(a.x - b.x, a.y - b.y), z0: st.cam.z, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
        }
      });
      cv.addEventListener('pointermove', e => {
        if (!punteros.has(e.pointerId)) return;
        punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (!gesto) return;
        if (gesto.tipo === 'toque') {
          const dx = e.clientX - gesto.x0, dy = e.clientY - gesto.y0;
          if (!gesto.movido && Math.hypot(dx, dy) > 8) gesto.movido = true;
          if (gesto.movido && st.cam.z > 1.01) {
            const r = cv.getBoundingClientRect();
            st.cam.x = gesto.cx - dx * (W / st.cam.z) / r.width;
            st.cam.y = gesto.cy - dy * (H / st.cam.z) / r.height;
            acotar(); pedirDibujo();
          }
        } else if (gesto.tipo === 'pellizco' && punteros.size >= 2) {
          const [a, b] = Array.from(punteros.values());
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          zoomEn(gesto.z0 * d / Math.max(20, gesto.d0), gesto.mx, gesto.my);
        }
      });
      const soltar = e => {
        if (!punteros.has(e.pointerId)) return;
        punteros.delete(e.pointerId);
        if (gesto && gesto.tipo === 'toque' && !gesto.movido && e.type === 'pointerup') tocar(e.clientX, e.clientY);
        if (punteros.size === 0) gesto = null;
        else if (gesto && gesto.tipo === 'pellizco') gesto = { tipo: 'nada' };
      };
      cv.addEventListener('pointerup', soltar);
      cv.addEventListener('pointercancel', soltar);
      cv.addEventListener('wheel', e => { e.preventDefault(); zoomEn(st.cam.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY); }, { passive: false });
      cv.addEventListener('dblclick', e => { e.preventDefault(); zoomEn(st.cam.z > 1.5 ? 1 : 2, e.clientX, e.clientY); });

      async function terminar() {
        st.fin = true;
        const seg = (performance.now() - st.t0 - st.pausa) / 1000;
        const par = objs.length * 25;
        const bono = Math.max(0, Math.round((par - seg) * 4));
        st.puntos += bono;
        marcar();
        let estrellas = 1;
        if (st.pistas <= 1 && st.errores <= 6 && seg <= par * 1.2) estrellas = 3;
        else if (st.pistas <= 3 && seg <= par * 2) estrellas = 2;
        await sleep(RM ? 100 : 900);
        sfx('nivel', 0.8);
        hablar(pick(['flor_bien1', 'flor_bien2', 'flor_bien3', 'flor_bien4', 'flor_bien5']));
        modal((t, cerrar) => {
          t.append(el('div', { class: 'etiqueta', text: loc.name }),
            el('h2', { class: 'letrero', text: '¡Escena completa!' }),
            el('div', { class: 'estrellas-grandes', html: estrellasHtml(estrellas), 'aria-label': `${estrellas} de 3 estrellas` }),
            el('div', { class: 'resumen' },
              el('div', null, el('b', { text: fmt(seg) }), el('small', { text: 'Tiempo' })),
              el('div', null, el('b', { text: String(st.pistas) }), el('small', { text: 'Pistas' })),
              el('div', null, el('b', { text: nf(st.puntos) }), el('small', { text: 'Puntos' }))),
            bono ? el('p', { class: 'nota', text: `Incluye ${nf(bono)} puntos por rapidez.` }) : null,
            el('button', { class: 'boton', onclick: () => { cerrar(); limpiar(); resolve({ puntos: st.puntos, estrellas }); } }, 'Seguir'));
        });
      }

      // ---- arranque ----
      ajustar();
      if (window.BAE_TEST) window.BAE_TEST.escena = { objs, aPantalla, interno, st };
      await new Promise(r => modal((t, cerrar) => {
        t.append(el('div', { class: 'etiqueta', text: loc.barrio }),
          el('h2', { class: 'letrero', text: loc.name }),
          el('p', { style: { margin: 0 }, text: MODOS[modo].intro }),
          el('p', { class: 'nota', text: `${objs.length} objetos escondidos.` }),
          el('button', { class: 'boton', onclick: () => { cerrar(); r(); } }, '¡A buscar!'));
      }));
      if (opts.primera) {
        const t = performance.now();
        await dialogo('flor_tutorial');
        st.pausa += performance.now() - t;
      }
      st.t0 = performance.now() - 0; st.pausa = 0;
      pedirDibujo();
    });
  }

  // ---------- minijuegos ----------
  function minijuego(loc) {
    if (loc.game === 'postal') return postal(loc);
    if (loc.game === 'diferencias') return diferencias(loc);
    return memotest(loc);
  }
  function pantallaMini(loc, titulo, sub, marcadores) {
    limpiar();
    mostrar('mini');
    alRedimensionarPantalla = null;
    P.mini.innerHTML = '';
    const zona = el('div', { class: 'mini-zona' });
    P.mini.append(barra(titulo, sub, marcadores), zona);
    aplicarAjustes();
    return zona;
  }
  function presentar(titulo, texto) {
    return new Promise(r => modal((t, cerrar) => {
      t.append(el('div', { class: 'etiqueta', text: 'Desafío' }), el('h2', { class: 'letrero', text: titulo }),
        el('p', { style: { margin: 0 }, text: texto }), el('button', { class: 'boton', onclick: () => { cerrar(); r(); } }, 'Empezar'));
    }));
  }
  function cierreMini(titulo, puntos, extra) {
    return new Promise(r => {
      sfx('nivel', 0.8);
      modal((t, cerrar) => {
        t.append(el('h2', { class: 'letrero', text: titulo }), extra ? el('p', { style: { margin: 0 }, text: extra }) : null,
          el('div', { class: 'resumen', style: { gridTemplateColumns: '1fr' } }, el('div', null, el('b', { text: '+' + nf(puntos) }), el('small', { text: 'Puntos' }))),
          el('button', { class: 'boton', onclick: () => { cerrar(); r(); } }, 'Seguir'));
      });
    });
  }

  // Postal rota: intercambiar fichas hasta reconstruir la imagen.
  async function postal(loc) {
    const cols = loc.id === 'caminito' ? 4 : 5, filas = loc.id === 'caminito' ? 3 : 4;
    const src = `assets/img/scenes/${loc.id}_postal.webp`;
    await cargarImg(src).catch(() => {});
    const zona = pantallaMini(loc, 'Postal rota', 'Tocá dos fichas para cambiarlas de lugar', [['movidas', 'Movidas'], ['bien', 'En su lugar']]);
    await presentar('Postal rota', 'Una postal de ' + loc.barrio + ' se rompió en pedazos. Tocá dos fichas para intercambiarlas hasta que la imagen quede entera.');
    return new Promise(resolve => {
      const total = cols * filas;
      let orden;
      do { orden = shuffle([...Array(total).keys()]); } while (orden.filter((p, i) => p === i).length > Math.floor(total / 5));
      const tablero = el('div', { class: 'postal', style: { gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${filas}, 1fr)` } });
      const fichas = [];
      let elegida = null, movidas = 0;
      const pintar = () => {
        let bien = 0;
        fichas.forEach((f, i) => {
          const p = orden[i], c = p % cols, r = Math.floor(p / cols);
          f.style.backgroundImage = `url(${src})`;
          f.style.backgroundSize = `${cols * 100}% ${filas * 100}%`;
          f.style.backgroundPosition = `${(c / (cols - 1)) * 100}% ${(r / (filas - 1)) * 100}%`;
          const ok = p === i;
          f.classList.toggle('bien', ok);
          f.disabled = ok;
          f.setAttribute('aria-label', ok ? 'Ficha en su lugar' : `Ficha ${i + 1}`);
          if (ok) bien++;
        });
        $('[data-movidas]', P.mini).textContent = String(movidas);
        $('[data-bien]', P.mini).textContent = `${bien}/${total}`;
        return bien;
      };
      for (let i = 0; i < total; i++) {
        const f = el('button', { class: 'ficha' });
        f.addEventListener('click', () => {
          if (elegida === null) { elegida = i; f.classList.add('elegida'); sfx('carta', 0.5); return; }
          if (elegida === i) { f.classList.remove('elegida'); elegida = null; return; }
          const a = elegida;
          fichas[a].classList.remove('elegida');
          elegida = null;
          [orden[a], orden[i]] = [orden[i], orden[a]];
          movidas++;
          const antes = fichas.filter(x => x.classList.contains('bien')).length;
          const bien = pintar();
          if (bien > antes) sfx('pieza', 0.8); else sfx('carta', 0.5);
          if (bien === total) {
            tablero.classList.add('completa');
            const puntos = Math.max(100, 600 - Math.max(0, movidas - total) * 15);
            setTimeout(() => cierreMini('¡Postal restaurada!', puntos, `Lo lograste en ${movidas} movidas.`).then(() => resolve({ puntos })), 900);
          }
        });
        fichas.push(f);
        tablero.append(f);
      }
      zona.append(el('p', { class: 'mini-intro', text: 'Las fichas con borde dorado ya están en su lugar.' }), tablero);
      pintar();
      if (window.BAE_TEST) window.BAE_TEST.postal = { orden };
    });
  }

  // Diferencias: dos versiones de la escena con 7 cambios.
  async function diferencias(loc) {
    const fondo = await cargarImg(`assets/img/scenes/${loc.id}.webp`);
    const zona = pantallaMini(loc, 'Encontrá las diferencias', 'Tocá los cambios en cualquiera de las dos imágenes', [['puntos', 'Puntos'], ['dif', 'Diferencias']]);
    await presentar('Siete diferencias', 'Las dos imágenes parecen iguales, pero hay 7 cambios. Tocalos en cualquiera de las dos.');
    return new Promise(resolve => {
      const usadas = new Set();
      const ids = elegir(shuffle(Object.keys(SPR)), 14, usadas);
      const base = colocar(loc.zones, ids.slice(0, 10), [], { solape: 0.06, min: 110, max: 150 });
      const agregados = colocar(loc.zones, ids.slice(10, 12), base, { solape: 0.04, min: 110, max: 150 });
      const tipos = shuffle(['quitar', 'quitar', 'color', 'color', 'grande']);
      const difs = [];
      shuffle(base).slice(0, 5).forEach((o, i) => { o.cambio = tipos[i]; difs.push(o); });
      agregados.forEach(o => { o.cambio = 'agregar'; difs.push(o); });
      const COLORES = ['rgba(40,120,255,0.62)', 'rgba(30,190,90,0.62)', 'rgba(170,60,220,0.6)'];
      const componerLado = derecha => {
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const g = c.getContext('2d');
        g.drawImage(fondo, 0, 0, W, H);
        for (const o of base.concat(agregados)) {
          if (!derecha && o.cambio === 'agregar') continue;
          if (derecha && o.cambio === 'quitar') continue;
          let img = tenido(o.id, loc.shade);
          if (derecha && o.cambio === 'color') {
            const t = document.createElement('canvas');
            t.width = img.width; t.height = img.height;
            const tg = t.getContext('2d');
            tg.drawImage(img, 0, 0);
            tg.globalCompositeOperation = 'source-atop';
            tg.fillStyle = o.colorCambio || (o.colorCambio = pick(COLORES));
            tg.fillRect(0, 0, t.width, t.height);
            img = t;
          }
          dibujarObjeto(g, o, img, derecha && o.cambio === 'grande' ? { escala: 1.45 } : null);
        }
        return c;
      };
      const izq = componerLado(false), der = componerLado(true);
      const cvs = [el('canvas', { 'aria-label': 'Imagen original' }), el('canvas', { 'aria-label': 'Imagen con cambios' })];
      const cajas = cvs.map((c, i) => el('div', { class: 'dif-caja' }, el('span', { class: 'rotulo etiqueta', text: i ? 'Con cambios' : 'Original' }), c));
      const puntosDots = el('div', { class: 'contador-dif', 'aria-hidden': 'true' }, difs.map(() => el('i')));
      const pista = el('button', { class: 'boton sobrio' }, 'Pista');
      zona.append(el('div', { class: 'diferencias' }, cajas), el('div', { style: { display: 'flex', gap: '16px', alignItems: 'center' } }, puntosDots, pista));
      let puntos = 0, halladas = 0, marcas = [], cargaPista = 1;
      const marcador = () => {
        $('[data-puntos]', P.mini).textContent = nf(puntos);
        $('[data-dif]', P.mini).textContent = `${halladas}/${difs.length}`;
        Array.from(puntosDots.children).forEach((d, i) => d.classList.toggle('ok', i < halladas));
      };
      marcador();
      function dibujar() {
        cvs.forEach((c, i) => {
          const r = c.getBoundingClientRect();
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
          if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
          const g = c.getContext('2d');
          const k = w / W;
          g.setTransform(k, 0, 0, k, 0, 0);
          g.drawImage(i ? der : izq, 0, 0);
          for (const m of marcas) {
            g.save();
            g.strokeStyle = m.ok ? '#ffd86b' : '#ff5b4a';
            g.globalAlpha = m.alpha == null ? 1 : m.alpha;
            g.lineWidth = 7; g.shadowColor = '#000'; g.shadowBlur = 8;
            g.beginPath(); g.arc(m.x, m.y, m.r, 0, Math.PI * 2); g.stroke(); g.restore();
          }
        });
      }
      alRedimensionarPantalla = () => dibujar();
      requestAnimationFrame(dibujar);
      if (window.BAE_TEST) window.BAE_TEST.dif = { difs, cvs, W, H };
      const radio = o => Math.max(o.w, o.h) * (o.cambio === 'grande' ? 0.85 : 0.62) + 14;
      cvs.forEach(c => c.addEventListener('click', e => {
        if (halladas >= difs.length) return;
        const r = c.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
        const tol = (TACTIL ? 22 : 10) * W / r.width;
        const d = difs.find(o => !o.hallada && Math.hypot(o.x - x, o.y - y) < radio(o) + tol);
        if (d) {
          d.hallada = true; halladas++; puntos += 100;
          marcas.push({ x: d.x, y: d.y, r: radio(d), ok: true });
          sfx('encontrado', 0.9);
          flotante(e.clientX, e.clientY, '+100');
          marcador(); dibujar();
          if (halladas === difs.length) {
            limpiar();
            setTimeout(() => cierreMini('¡Las encontraste todas!', puntos + 200).then(() => resolve({ puntos: puntos + 200 })), 700);
          }
        } else {
          puntos = Math.max(0, puntos - 15);
          sfx('error', 0.45);
          const m = { x, y, r: 22 * W / r.width, ok: false, alpha: 1 };
          marcas.push(m); dibujar();
          setTimeout(() => { marcas = marcas.filter(q => q !== m); dibujar(); }, 450);
          marcador();
        }
      }));
      const recarga = setInterval(() => {
        cargaPista = Math.min(1, cargaPista + 0.25 / 20);
        pista.disabled = cargaPista < 1;
        pista.textContent = cargaPista < 1 ? `Pista (${Math.ceil((1 - cargaPista) * 20)} s)` : 'Pista';
      }, 250);
      limpiezas.add(() => clearInterval(recarga));
      pista.addEventListener('click', () => {
        if (cargaPista < 1) return;
        const d = difs.find(o => !o.hallada);
        if (!d) return;
        cargaPista = 0;
        sfx('pista', 0.8);
        const m = { x: d.x, y: d.y, r: radio(d) * 1.3, ok: true, alpha: 0.9 };
        marcas.push(m); dibujar();
        setTimeout(() => { marcas = marcas.filter(q => q !== m); dibujar(); }, 1600);
      });
    });
  }

  // Memotest: seis pares de objetos del barrio.
  async function memotest(loc) {
    const zona = pantallaMini(loc, 'Memotest porteño', 'Encontrá los pares', [['movidas', 'Movidas'], ['pares', 'Pares']]);
    await presentar('Memotest porteño', 'Dá vuelta dos cartas por vez y encontrá los seis pares de objetos.');
    return new Promise(resolve => {
      const ids = elegir(shuffle(Object.keys(SPR).filter(id => SPR[id].loc === loc.id)), 6, new Set());
      const cartas = shuffle(ids.concat(ids));
      const grilla = el('div', { class: 'memo' });
      let abiertas = [], pares = 0, movidas = 0, ocupado = false;
      const marcador = () => {
        $('[data-movidas]', P.mini).textContent = String(movidas);
        $('[data-pares]', P.mini).textContent = `${pares}/6`;
      };
      marcador();
      cartas.forEach(id => {
        const dibujoCarta = copia(id, 120, 120);
        dibujoCarta.style.width = ''; dibujoCarta.style.height = ''; // el CSS lo encaja sin deformar
        const cara = el('div', { class: 'cara' }, dibujoCarta);
        const b = el('button', { class: 'carta', 'aria-label': 'Carta boca abajo' }, el('div', { class: 'dorso', style: { backgroundImage: 'url(assets/img/ui/dorso.webp)' } }), cara);
        b.addEventListener('click', () => {
          if (ocupado || b.classList.contains('vuelta')) return;
          b.classList.add('vuelta');
          b.setAttribute('aria-label', C.objects[id][0]);
          sfx('carta', 0.7);
          abiertas.push({ b, id });
          if (abiertas.length < 2) return;
          movidas++;
          const [x, y] = abiertas;
          abiertas = [];
          if (x.id === y.id) {
            pares++;
            setTimeout(() => { x.b.classList.add('par'); y.b.classList.add('par'); sfx('encontrado', 0.8); }, 300);
            marcador();
            if (pares === 6) {
              const puntos = Math.max(100, 600 - Math.max(0, movidas - 6) * 25);
              setTimeout(() => cierreMini('¡Memotest completo!', puntos, `Lo resolviste en ${movidas} movidas.`).then(() => resolve({ puntos })), 900);
            }
          } else {
            ocupado = true;
            marcador();
            setTimeout(() => {
              x.b.classList.remove('vuelta'); y.b.classList.remove('vuelta');
              x.b.setAttribute('aria-label', 'Carta boca abajo'); y.b.setAttribute('aria-label', 'Carta boca abajo');
              ocupado = false;
            }, 950);
          }
        });
        grilla.append(b);
      });
      zona.append(grilla);
      if (window.BAE_TEST) window.BAE_TEST.memo = { cartas };
    });
  }

  // ---------- pregunta porteña ----------
  function pregunta(loc) {
    return new Promise(resolve => {
      const correcta = loc.quiz.a[0];
      sfx('papel', 0.8);
      modal((t, cerrar) => {
        const opciones = el('div', { class: 'opciones' });
        const nota = el('p', { class: 'nota', 'aria-live': 'polite' });
        const seguir = el('button', { class: 'boton', hidden: true }, 'Seguir');
        let puntos = 0;
        for (const op of shuffle(loc.quiz.a)) {
          const b = el('button', { class: 'opcion', text: op });
          b.addEventListener('click', () => {
            $$('.opcion', opciones).forEach(x => { x.disabled = true; if (x.textContent === correcta) x.classList.add('bien'); });
            if (op === correcta) { puntos = 200; sfx('encontrado', 0.9); nota.textContent = '¡Correcto! +200 puntos.'; }
            else { b.classList.add('mal'); sfx('error', 0.6); nota.textContent = 'Casi. La respuesta está marcada en verde.'; }
            seguir.hidden = false; seguir.focus();
          });
          opciones.append(b);
        }
        seguir.addEventListener('click', () => { cerrar(); resolve({ puntos }); });
        t.append(el('div', { class: 'etiqueta', text: 'Pregunta porteña' }), el('h2', { class: 'letrero', style: { fontSize: 'clamp(1.2rem, 3.2vw, 1.6rem)' }, text: loc.quiz.q }), opciones, nota, seguir);
      });
    });
  }

  function piezaObtenida(i, puntos) {
    return new Promise(resolve => {
      const ultima = S.piezas.length >= 8;
      sfx('pieza', 0.9);
      modal((t, cerrar) => {
        t.append(el('div', { class: 'etiqueta', text: `Pedazo ${S.piezas.length} de 8` }),
          el('h2', { class: 'letrero', text: '¡Un pedazo del cartel!' }),
          el('div', { class: 'pieza-img', style: piezaFondo(i), role: 'img', 'aria-label': 'Pedazo del cartel fileteado' }),
          el('p', { style: { margin: 0 }, text: `Sumaste ${nf(puntos)} puntos en ${LOCS[i].barrio}.` }),
          el('button', { class: 'boton', onclick: () => { cerrar(); callar(); resolve(); } }, ultima ? 'Armar el cartel' : 'Volver al mapa'));
      });
      hablar(ultima ? 'flor_final_previo' : 'flor_pieza');
    });
  }

  // ---------- final: armar el cartel ----------
  function armarCartel() {
    limpiar();
    callar();
    musica('principal');
    const zona = pantallaMini(null, 'El cartel de Don Ernesto', 'Llevá cada pedazo a su lugar', [['puntos', 'Puntos'], ['puestas', 'Pedazos']]);
    $('[data-puntos]', P.mini).textContent = nf(S.puntos);
    const marco = el('div', { class: 'cartel-marco', 'aria-label': 'Marco del cartel' });
    const huecos = [];
    for (let i = 0; i < 8; i++) { const h = el('div', { class: 'hueco', 'data-i': String(i) }); huecos.push(h); marco.append(h); }
    const bandeja = el('div', { class: 'bandeja' });
    let puestas = 0, elegida = null;
    const contar = () => { $('[data-puestas]', P.mini).textContent = `${puestas}/8`; };
    contar();
    const poner = (pieza, i) => {
      const h = huecos[i];
      if (Number(pieza.dataset.i) !== i || h.classList.contains('lleno')) {
        sfx('error', 0.5);
        pieza.animate && pieza.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 260 });
        return false;
      }
      Object.assign(h.style, piezaFondo(i));
      h.classList.add('lleno');
      pieza.remove();
      puestas++;
      contar();
      sfx('pieza', 0.9);
      if (puestas === 8) completo();
      return true;
    };
    shuffle([...Array(8).keys()]).forEach(i => {
      const p = el('button', { class: 'pieza', 'data-i': String(i), style: piezaFondo(i), 'aria-label': `Pedazo ${i + 1}` });
      let arr = null;
      p.addEventListener('pointerdown', e => {
        arr = { x0: e.clientX, y0: e.clientY, fantasma: null, id: e.pointerId };
        p.setPointerCapture && p.setPointerCapture(e.pointerId);
      });
      p.addEventListener('pointermove', e => {
        if (!arr || arr.id !== e.pointerId) return;
        if (!arr.fantasma && Math.hypot(e.clientX - arr.x0, e.clientY - arr.y0) > 8) {
          const r = p.getBoundingClientRect();
          arr.fantasma = p.cloneNode(true);
          arr.fantasma.classList.add('arrastrando');
          Object.assign(arr.fantasma.style, { width: r.width + 'px', height: r.height + 'px' });
          document.body.append(arr.fantasma);
          p.style.opacity = '0.3';
        }
        if (arr.fantasma) {
          const r = arr.fantasma.getBoundingClientRect();
          arr.fantasma.style.left = (e.clientX - r.width / 2) + 'px';
          arr.fantasma.style.top = (e.clientY - r.height / 2) + 'px';
          huecos.forEach(h => h.classList.remove('destino'));
          const debajo = document.elementFromPoint(e.clientX, e.clientY);
          if (debajo && debajo.classList.contains('hueco')) debajo.classList.add('destino');
        }
      });
      const fin = e => {
        if (!arr || arr.id !== e.pointerId) return;
        const a = arr; arr = null;
        huecos.forEach(h => h.classList.remove('destino'));
        if (a.fantasma) {
          a.fantasma.remove();
          p.style.opacity = '';
          const debajo = document.elementFromPoint(e.clientX, e.clientY);
          if (debajo && debajo.classList.contains('hueco')) poner(p, Number(debajo.dataset.i));
          return;
        }
        if (e.type !== 'pointerup') return;
        $$('.pieza', bandeja).forEach(x => x.classList.remove('elegida'));
        elegida = elegida === p ? null : p;
        if (elegida) p.classList.add('elegida');
      };
      p.addEventListener('pointerup', fin);
      p.addEventListener('pointercancel', fin);
      bandeja.append(p);
    });
    huecos.forEach((h, i) => h.addEventListener('click', () => {
      if (!elegida) return;
      if (poner(elegida, i)) elegida = null;
    }));
    zona.append(el('div', { class: 'armado' }, el('p', { class: 'mini-intro', text: 'Arrastrá cada pedazo a su lugar, o tocá un pedazo y después el hueco.' }), marco, bandeja));

    async function completo() {
      marco.classList.add('listo');
      sfx('nivel', 0.9);
      await sleep(1600);
      await dialogo('ernesto_final');
      await dialogo('flor_final');
      const primera = !S.fin;
      S.fin = true; guardar();
      const total = LOCS.reduce((s, l) => s + ((S.barrios[l.id] && S.barrios[l.id].estrellas) || 0), 0);
      modal((t, cerrar) => {
        t.append(el('div', { class: 'etiqueta', text: primera ? 'Aventura completa' : 'El cartel, otra vez' }),
          el('h2', { class: 'letrero', text: 'El que busca, encuentra' }),
          el('div', { class: 'resumen' },
            el('div', null, el('b', { text: nf(S.puntos) }), el('small', { text: 'Puntos' })),
            el('div', null, el('b', { text: `${total}/24` }), el('small', { text: 'Estrellas' })),
            el('div', null, el('b', { text: '8/8' }), el('small', { text: 'Barrios' }))),
          el('p', { class: 'creditos', html: '<b>Buenos Aires Escondida</b> es un juego original. Ilustraciones, voces de Flor y Don Ernesto, música de tango y efectos de sonido creados con <b>ElevenLabs</b>. Los datos curiosos son reales; los personajes y los acertijos, inventados.' }),
          el('div', { class: 'titulo-botones' },
            el('button', { class: 'boton', onclick: () => { cerrar(); pantallaMapa(); } }, 'Volver al mapa'),
            el('button', { class: 'boton sobrio', onclick: () => { cerrar(); pantallaTitulo(); } }, 'Portada')));
      });
    }
  }

  // ---------- arranque ----------
  // Primero lo justo para la portada; el resto (objetos, mapa, retratos) sigue en segundo plano.
  async function precargaInicial() {
    const carga = el('div', { class: 'carga' }, el('div', null, el('div', { class: 'barra-carga' }, el('i')), el('p', { text: 'Cargando Buenos Aires…' })));
    app.append(carga);
    const barraI = $('i', carga);
    let hechas = 0;
    const tareas = ['logo', 'titulo'].map(n => cargarImg(`assets/img/ui/${n}.webp`));
    await Promise.all(tareas.map(p => p.then(() => { hechas++; barraI.style.width = (hechas / tareas.length) * 100 + '%'; })));
    carga.remove();
  }
  let cargaCompleta = false, cargaResto = null;
  function precargaResto() {
    return Promise.all([
      ...Object.keys(ATLAS).map(l => cargarAtlas(l)),
      ...['mapa', 'flor', 'ernesto', 'cartel', 'dorso'].map(n => cargarImg(`assets/img/ui/${n}.webp`)),
      ...LOCS.map(l => cargarImg(`assets/img/scenes/${l.id}_mini.webp`).catch(() => {})),
    ]).then(() => { cargaCompleta = true; });
  }
  async function asegurarCarga() {
    if (cargaCompleta) return true;
    let cerrar = null;
    const espera = setTimeout(() => { cerrar = modal(t => t.append(el('h2', { class: 'letrero', text: 'Un momento…' }), el('p', { class: 'nota', text: 'Estamos terminando de cargar la ciudad.' }))); }, 150);
    try { await cargaResto; return true; }
    catch (e) { aviso('No se pudieron cargar las imágenes. Revisá la conexión y recargá la página.'); return false; }
    finally { clearTimeout(espera); if (cerrar) cerrar(); }
  }

  async function iniciar(datos) {
    if (datos && datos.partida) S = Object.assign(nuevaPartida(), datos.partida);
    construir();
    try {
      await precargaInicial();
    } catch (e) {
      app.innerHTML = '';
      app.append(el('div', { class: 'carga' }, el('p', { text: 'No se pudieron cargar las imágenes del juego. Revisá la conexión y recargá la página.' })));
      return;
    }
    cargaResto = precargaResto();
    cargaResto.catch(() => {});
    pantallaTitulo();
  }

  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(() => ({ partida: S }));
  if (hot && hot.ready) hot.ready(iniciar);
  else iniciar((hot && hot.data) || {});
})();
