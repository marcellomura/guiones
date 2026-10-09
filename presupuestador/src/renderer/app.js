/* Interfaz del Presupuestador HyS. */
'use strict';

const P = Calc.pesos;
const esc = Plantillas.esc;
const $ = (sel, el = document) => el.querySelector(sel);

const S = {
  datos: null, info: {}, vista: 'obras', obraId: null, tab: 'resumen', diaSel: null, clienteSel: null,
  anioFeriados: null, pendiente: false,
};

// ---------- Íconos (trazos simples) ----------
const I = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const ICON = {
  obras: I('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>'),
  perfil: I('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  clientes: I('<path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1"/>'),
  feriados: I('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h2M14 14h2M8 18h2"/>'),
  respaldo: I('<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>'),
  pdf: I('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'),
  mas: I('<path d="M12 5v14M5 12h14"/>'),
  copiar: I('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>'),
  borrar: I('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/>'),
  alerta: I('<path d="M12 3 2 20h20zM12 10v4M12 17h.01"/>'),
  ok: I('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'),
  info: I('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  casco: I('<path d="M3 17h18M5 17v-2a7 7 0 0 1 14 0v2M10 8V5h4v3"/>', 'stroke="#1C1C1E"'),
  importar: I('<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>'),
  exportar: I('<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>'),
  carpeta: I('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
};

// ---------- Utilidades ----------
function obra() { return S.datos.obras.find((o) => o.id === S.obraId) || null; }
function cliente(id) { return S.datos.clientes.find((c) => c.id === id) || null; }
function clon(x) { return JSON.parse(JSON.stringify(x)); }
function getPath(o, path) { return path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o); }
function setPath(o, path, v) {
  const ks = path.split('.');
  let a = o;
  for (let i = 0; i < ks.length - 1; i++) { if (a[ks[i]] == null || typeof a[ks[i]] !== 'object') a[ks[i]] = {}; a = a[ks[i]]; }
  a[ks[ks.length - 1]] = v;
}
function toast(msg, tipo = '') {
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), tipo === 'error' ? 7000 : 4000);
}

let timerGuardar = null;
function guardar(inmediato) {
  S.pendiente = true;
  pintarEstadoGuardado();
  clearTimeout(timerGuardar);
  const hacer = async () => {
    try { await api.guardarDatos(S.datos); S.pendiente = false; }
    catch (e) { toast('No se pudieron guardar los cambios: ' + e.message, 'error'); }
    pintarEstadoGuardado();
  };
  if (inmediato) return hacer();
  timerGuardar = setTimeout(hacer, 350);
}
function pintarEstadoGuardado() {
  const el = $('#estado-guardado');
  if (el) el.innerHTML = S.pendiente ? '<i class="punto pendiente"></i>Guardando…' : '<i class="punto"></i>Cambios guardados';
}

// ---------- Modal ----------
function modal(html, alAceptar) {
  const m = $('#modal');
  m.innerHTML = `<div class="modal-caja">${html}</div>`;
  m.hidden = false;
  const cerrar = () => { m.hidden = true; m.innerHTML = ''; };
  m.onclick = async (e) => {
    if (e.target === m || e.target.closest('[data-modal="cancelar"]')) cerrar();
    if (e.target.closest('[data-modal="aceptar"]')) { if ((await alAceptar(m)) !== false) cerrar(); }
  };
  const f = m.querySelector('input, select, textarea');
  if (f) f.focus();
}
function confirmar(titulo, texto, boton = 'Aceptar', peligro = false) {
  return new Promise((res) => {
    modal(`<h2>${titulo}</h2><p class="muted">${texto}</p><div class="pie">
      <button class="btn" data-modal="cancelar">Cancelar</button>
      <button class="btn ${peligro ? 'peligro' : 'primario'}" data-modal="aceptar">${boton}</button></div>`, () => res(true));
    const m = $('#modal');
    const prev = m.onclick;
    m.onclick = (e) => { if (e.target === m || e.target.closest('[data-modal="cancelar"]')) res(false); prev(e); };
  });
}

// ---------- Componentes de formulario ----------
function campo(etq, ruta, opts = {}) {
  const v = getPath(contexto(ruta.split(':')[0]), ruta.split(':')[1]);
  const val = v == null ? '' : v;
  const tipo = opts.tipo || 'text';
  const attrs = `data-campo="${ruta}" data-tipo="${opts.num ? 'num' : 'texto'}" ${opts.min != null ? `min="${opts.min}"` : ''} ${opts.step ? `step="${opts.step}"` : ''} ${opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : ''}`;
  let input = `<input type="${tipo}" value="${esc(val)}" ${attrs}>`;
  if (opts.sufijo) input = `<div class="con-sufijo">${input}<span>${opts.sufijo}</span></div>`;
  if (opts.prefijo) input = `<div class="con-prefijo">${input}<span>${opts.prefijo}</span></div>`;
  return `<div class="campo ${opts.cls || ''}"><label>${etq}</label>${input}${opts.ayuda ? `<div class="ayuda">${opts.ayuda}</div>` : ''}</div>`;
}
function selector(etq, ruta, opciones, opts = {}) {
  const v = getPath(contexto(ruta.split(':')[0]), ruta.split(':')[1]);
  const o = opciones.map(([val, txt]) => `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(txt)}</option>`).join('');
  return `<div class="campo ${opts.cls || ''}"><label>${etq}</label><select data-campo="${ruta}" data-tipo="texto">${o}</select>${opts.ayuda ? `<div class="ayuda">${opts.ayuda}</div>` : ''}</div>`;
}
function areaLineas(etq, ruta, ayuda) {
  const v = getPath(contexto(ruta.split(':')[0]), ruta.split(':')[1]) || [];
  return `<div class="campo"><label>${etq}</label><textarea rows="10" data-campo="${ruta}" data-tipo="lineas">${esc(v.join('\n'))}</textarea>${ayuda ? `<div class="ayuda">${ayuda}</div>` : ''}</div>`;
}
function casilla(etq, ruta) {
  const v = getPath(contexto(ruta.split(':')[0]), ruta.split(':')[1]);
  return `<label class="check"><input type="checkbox" data-campo="${ruta}" data-tipo="bool" ${v ? 'checked' : ''}>${etq}</label>`;
}

// Prefijo de ruta → objeto que se edita.
function contexto(pref) {
  if (pref === 'o') return obra();
  if (pref === 'p') return S.datos.perfil;
  if (pref === 'cl') return cliente(S.clienteSel);
  if (pref === 'l') { const o = obra(); o.liquidaciones = o.liquidaciones || {}; return o.liquidaciones; }
  if (pref === 'd') { const o = obra(); o.dias = o.dias || {}; return o.dias[S.diaSel] || {}; }
  return {};
}

// ---------- Barra lateral ----------
function renderSidebar() {
  const nav = [['obras', 'Obras y presupuestos', ICON.obras], ['perfil', 'Mi perfil', ICON.perfil], ['clientes', 'Clientes', ICON.clientes],
    ['feriados', 'Feriados', ICON.feriados], ['respaldo', 'Respaldo y ayuda', ICON.respaldo]];
  const activa = S.vista === 'obra' ? 'obras' : S.vista;
  $('#sidebar').innerHTML = `
    <div class="logo-app"><div class="ico">${ICON.casco}</div><div><b>Presupuestador</b><span>Higiene y Seguridad</span></div></div>
    ${nav.map(([v, t, ic], i) => `${i === 1 ? '<div class="nav-sep"></div>' : ''}<button class="nav-item ${activa === v ? 'activo' : ''}" data-accion="ir" data-vista="${v}">${ic}${t}</button>`).join('')}
    <div class="side-pie"><div class="estado" id="estado-guardado"></div><div>Versión ${esc(S.info.version || '')}</div></div>`;
  pintarEstadoGuardado();
}

// ---------- Vista: obras ----------
function vistaObras() {
  const obras = S.datos.obras.slice().sort((a, b) => String(b.presupuesto.fecha || '').localeCompare(String(a.presupuesto.fecha || '')));
  const sinPerfil = !S.datos.perfil.nombre;
  let h = `<div class="pagina"><div class="encabezado"><div><h1>Obras y presupuestos</h1>
    <p>Cada obra tiene su presupuesto, su calendario y sus liquidaciones mensuales.</p></div>
    <div class="acciones"><button class="btn primario" data-accion="nueva-obra">${ICON.mas}Nueva obra</button></div></div>`;
  if (sinPerfil) {
    h += `<div class="aviso">${ICON.alerta}<div><b>Completá tu perfil</b> (nombre, matrícula, CUIL y logo) para que aparezca en los PDF.
      <a href="#" data-accion="ir" data-vista="perfil">Ir a mi perfil</a> · o <a href="#" data-accion="importar">importá un archivo de datos</a>.</div></div>`;
  }
  if (!obras.length) {
    return h + `<div class="tarjeta vacio">${ICON.obras}<h2>Todavía no hay obras</h2><p>Creá la primera para armar el presupuesto.</p>
      <div class="fila" style="justify-content:center;margin-top:14px"><button class="btn primario" data-accion="nueva-obra">${ICON.mas}Nueva obra</button>
      <button class="btn" data-accion="importar">${ICON.importar}Importar datos</button></div></div></div>`;
  }
  h += '<div class="obras">';
  for (const o of obras) {
    const r = Calc.calcular(o, S.datos.feriados, { modo: 'presupuesto' });
    const c = cliente(o.clienteId);
    h += `<div class="obra-card" data-accion="abrir-obra" data-id="${o.id}">
      <div class="fila"><span class="etiqueta">N° ${esc(o.presupuesto.numero)}</span><span class="espaciador"></span>
        ${r.inicio ? `<span class="muted num">${Calc.fechaNum(r.inicio)} al ${Calc.fechaNum(r.fin)}</span>` : ''}</div>
      <h3>${esc(o.nombre || 'Obra sin nombre')}</h3>
      <div class="meta">${esc(c ? c.razonSocial : 'Sin cliente')}${o.lugar ? ` · ${esc(o.lugar)}` : ''}<br>
        ${r.total.jornadas} jornadas · ${r.total.horas} h · ${P(r.T.base)} la hora base</div>
      <div class="monto">${P(r.total.total)}</div>
      <div class="pie"><button class="btn chico" data-accion="duplicar-obra" data-id="${o.id}">${ICON.copiar}Duplicar</button>
        <button class="btn chico peligro" data-accion="borrar-obra" data-id="${o.id}">${ICON.borrar}Eliminar</button></div></div>`;
  }
  return h + '</div></div>';
}

// ---------- Vista: obra ----------
const TABS = [['resumen', 'Resumen y PDF'], ['datos', 'Datos de la obra'], ['tarifas', 'Tarifas'], ['calendario', 'Calendario y feriados'],
  ['liquidaciones', 'Liquidaciones mensuales'], ['textos', 'Servicios y condiciones']];

function vistaObra() {
  const o = obra();
  if (!o) { S.vista = 'obras'; return vistaObras(); }
  const tab = { resumen: tabResumen, datos: tabDatos, tarifas: tabTarifas, calendario: tabCalendario, liquidaciones: tabLiquidaciones, textos: tabTextos }[S.tab] || tabResumen;
  return `<div class="pagina"><div class="encabezado"><div>
      <div class="migas"><a data-accion="ir" data-vista="obras">Obras</a> / N° ${esc(o.presupuesto.numero)}</div>
      <h1 data-vivo="titulo-obra">${esc(o.nombre || 'Obra sin nombre')}</h1></div>
      <div class="acciones"><button class="btn" data-accion="pdf" data-doc="detallado">${ICON.pdf}PDF detallado (interno)</button>
      <button class="btn primario" data-accion="pdf" data-doc="cliente">${ICON.pdf}PDF para el cliente</button></div></div>
    <div class="pestanas">${TABS.map(([k, t]) => `<button class="pestana ${S.tab === k ? 'activa' : ''}" data-accion="tab" data-tab="${k}">${t}</button>`).join('')}</div>
    ${tab(o)}</div>`;
}

function faltantes(o) {
  const p = S.datos.perfil, f = [];
  if (!p.nombre) f.push('tu nombre (Mi perfil)');
  if (!p.matricula) f.push('tu matrícula (Mi perfil)');
  if (!p.cuil) f.push('tu CUIL (Mi perfil)');
  if (!o.clienteId || !cliente(o.clienteId)) f.push('el cliente (Datos de la obra)');
  if (!Calc.esFechaValida(o.calendario.inicio)) f.push('la fecha de inicio (Calendario)');
  if (!(Calc.num(o.tarifas.valorHora) > 0)) f.push('el valor hora (Tarifas)');
  return f;
}

function tablaTarifasUI(r, o) {
  const fila = (k, nm) => `<tr><td><b>${nm}</b></td><td class="r precio-grande">${P(r.T.hora[k])}</td><td class="r precio-grande">${P(r.T.horaNoct[k])}</td><td class="r">${P(r.jornada[k])}</td></tr>`;
  return `<table class="t"><thead><tr><th>Día</th><th class="r">Hora diurna (${esc(o.calendario.horaInicio)} a ${esc(o.calendario.horaFin)})</th>
    <th class="r">Hora nocturna / fuera de horario</th><th class="r">Jornada de ${r.H} h</th></tr></thead><tbody>
    ${fila('lv', 'Lunes a viernes')}${fila('sab', 'Sábados')}${fila('dom', 'Domingos y feriados')}</tbody></table>`;
}

function resumenHTML(o) {
  const r = Calc.calcular(o, S.datos.feriados, { modo: 'presupuesto' });
  const t = o.tarifas;
  const sinComida = !t.viaticoProveeEmpresa && r.total.viatico > 0 ? r.total.total - r.total.viatico : null;
  let h = `<div class="kpis">
    <div class="kpi destacado"><div class="l">Total estimado</div><div class="v">${P(r.total.total)}</div><div class="s">${sinComida != null ? `${P(sinComida)} si proveen la comida` : 'Honorarios y gastos'}</div></div>
    <div class="kpi"><div class="l">Jornadas</div><div class="v">${r.total.jornadas}</div><div class="s">${r.total.horas} horas${r.inicio ? ` · ${Calc.fechaCorta(r.inicio)} al ${Calc.fechaCorta(r.fin)}` : ''}</div></div>
    <div class="kpi"><div class="l">Promedio por hora</div><div class="v">${P(r.promedioHora)}</div><div class="s">${Calc.num(t.valorReferencia) > 0 ? `Referencia ${P(Calc.num(t.valorReferencia))}` : 'Con recargos incluidos'}</div></div>
    <div class="kpi"><div class="l">Feriados trabajados</div><div class="v">${r.total.porTipo.fer.jornadas}</div><div class="s">${r.total.porTipo.dom.jornadas} domingos · ${r.total.porTipo.sab.jornadas} sábados</div></div></div>`;
  h += `<div class="grid g2"><div class="tarjeta"><h3>Honorarios por hora</h3>${tablaTarifasUI(r, o)}</div>
    <div class="tarjeta"><h3>Jornadas y total</h3><table class="t"><thead><tr><th>Jornada</th><th class="c">Cantidad</th><th class="r">Subtotal</th></tr></thead><tbody>
    ${Calc.TIPOS.map((k) => `<tr><td>${Calc.TIPO_PLURAL[k]}</td><td class="c">${r.total.porTipo[k].jornadas}</td><td class="r">${P(r.total.porTipo[k].honorarios)}</td></tr>`).join('')}
    ${r.total.viatico ? `<tr><td>Viático de comida</td><td class="c">${r.total.jornadas}</td><td class="r">${P(r.total.viatico)}</td></tr>` : ''}
    ${r.total.movilidad ? `<tr><td>Movilidad</td><td class="c">${r.total.jornadas}</td><td class="r">${P(r.total.movilidad)}</td></tr>` : ''}
    <tr class="total"><td>Total</td><td class="c">${r.total.jornadas}</td><td class="r">${P(r.total.total)}</td></tr></tbody></table></div></div>`;
  h += `<div class="tarjeta mt"><h3>Facturación mensual estimada</h3><table class="t"><thead><tr><th>Mes</th><th class="c">L a V</th><th class="c">Sábados</th>
    <th class="c">Domingos</th><th class="c">Feriados</th><th class="c">Jornadas</th><th class="r">Total del mes</th></tr></thead><tbody>
    ${r.meses.map((m) => `<tr><td style="text-transform:capitalize">${Calc.nombreMes(m.mes)}</td>${Calc.TIPOS.map((k) => `<td class="c">${m.porTipo[k].jornadas}</td>`).join('')}
      <td class="c">${m.jornadas}</td><td class="r"><b>${P(m.total)}</b></td></tr>`).join('') || '<tr><td colspan="7" class="muted">Cargá la fecha de inicio en Calendario.</td></tr>'}
    </tbody></table></div>`;
  return h;
}

function tabResumen(o) {
  const f = faltantes(o);
  const aviso = f.length
    ? `<div class="aviso">${ICON.alerta}<div><b>Antes de enviar el presupuesto, completá:</b><ul>${f.map((x) => `<li>${x}</li>`).join('')}</ul></div></div>`
    : `<div class="aviso ok">${ICON.ok}<div>Todo listo para generar el presupuesto. Los feriados del período ya están aplicados según la lista de <b>Feriados</b>.</div></div>`;
  return `${aviso}<div data-vivo="resumen">${resumenHTML(o)}</div>
    <div class="tarjeta mt"><h3>Documentos</h3><p class="sub">Los PDF se guardan donde elijas y se abren automáticamente.</p>
    <div class="fila"><button class="btn primario" data-accion="pdf" data-doc="cliente">${ICON.pdf}Presupuesto para el cliente (1 hoja)</button>
    <button class="btn" data-accion="pdf" data-doc="detallado">${ICON.pdf}Presupuesto detallado (uso interno)</button>
    <button class="btn" data-accion="tab" data-tab="liquidaciones">${ICON.pdf}Liquidaciones mensuales…</button></div></div>`;
}

function tabDatos(o) {
  const opciones = [['', 'Elegí un cliente…'], ...S.datos.clientes.map((c) => [c.id, c.razonSocial || '(sin nombre)']), ['__nuevo', '+ Nuevo cliente…']];
  return `<div class="tarjeta"><h2>Obra</h2><p class="sub">Estos datos aparecen en el encabezado del presupuesto.</p><div class="grid g2">
    ${campo('Nombre interno de la obra', 'o:nombre', { ayuda: 'Solo para identificarla en la lista.' })}
    ${selector('Cliente (empresa que contrata)', 'o:clienteId', opciones)}
    ${campo('Servicio', 'o:servicio', { cls: 'col-todo' })}
    ${campo('Tarea u obra', 'o:tarea', { placeholder: 'Ej.: Fabricación y montaje de sistema contra incendio' })}
    ${campo('Lugar', 'o:lugar', { placeholder: 'Ej.: Planta industrial, estación transformadora…' })}
    ${campo('Comitente', 'o:comitente', { placeholder: 'Ej.: empresa dueña de la obra' })}
    ${campo('Dotación (operarios)', 'o:dotacion', { placeholder: 'Ej.: 7' })}
    </div></div>
    <div class="tarjeta"><h2>Presupuesto</h2><div class="grid g3">
    ${campo('Número', 'o:presupuesto.numero')}
    ${campo('Fecha de emisión', 'o:presupuesto.fecha', { tipo: 'date' })}
    ${campo('Validez de la oferta', 'o:presupuesto.validezDias', { tipo: 'number', num: true, min: 0, sufijo: 'días' })}
    ${campo('Disponibilidad', 'o:presupuesto.disponibilidad', { cls: 'col-2', placeholder: 'Disponibilidad inmediata', ayuda: 'Va en el presupuesto en lugar de la fecha de inicio.' })}
    <div class="col-todo">${casilla('Mostrar en el presupuesto para el cliente las cantidades de jornadas, el total estimado y las fechas de la obra', 'o:presupuesto.mostrarTotales')}
      <div class="ayuda muted" style="font-size:11.5px">Apagado: el presupuesto muestra solo los precios por hora, por jornada y el viático.</div></div>
    </div></div>`;
}

function tabTarifas(o) {
  return `<div class="grid g2"><div class="tarjeta"><h2>Valor hora y recargos</h2><p class="sub">Los recargos se suman: un domingo nocturno lleva el recargo del domingo más el nocturno.</p>
    <div class="grid g2">
    ${campo('Valor hora base (lunes a viernes, diurna)', 'o:tarifas.valorHora', { tipo: 'number', num: true, min: 0, step: 100, prefijo: '$', cls: 'col-todo' })}
    ${campo('Recargo sábados', 'o:tarifas.recSabado', { tipo: 'number', num: true, min: 0, sufijo: '%' })}
    ${campo('Recargo domingos y feriados', 'o:tarifas.recDomFer', { tipo: 'number', num: true, min: 0, sufijo: '%' })}
    ${campo('Recargo hora nocturna o fuera de horario', 'o:tarifas.recNocturno', { tipo: 'number', num: true, min: 0, sufijo: '%', ayuda: 'Se aplica a cada hora cargada como "hora nocturna" en el calendario.' })}
    ${campo('Valor hora de referencia (COPHISEC)', 'o:tarifas.valorReferencia', { tipo: 'number', num: true, min: 0, step: 100, prefijo: '$', ayuda: 'Solo para comparar en el PDF detallado. 0 = no mostrar.' })}
    </div></div>
    <div class="tarjeta"><h2>Gastos por jornada</h2><p class="sub">Se cobran por cada jornada trabajada.</p><div class="grid g2">
    ${campo('Viático de comida', 'o:tarifas.viatico', { tipo: 'number', num: true, min: 0, step: 500, prefijo: '$' })}
    ${campo('Movilidad', 'o:tarifas.movilidad', { tipo: 'number', num: true, min: 0, step: 500, prefijo: '$', ayuda: '0 = sin cargo.' })}
    <div class="col-todo">${casilla('La empresa provee la comida (no se cobra viático)', 'o:tarifas.viaticoProveeEmpresa')}</div>
    </div></div></div>
    <div class="tarjeta mt"><h3>Así quedan los valores</h3><div data-vivo="tarifas">${tablaTarifasUI(Calc.calcular(o, S.datos.feriados, { modo: 'presupuesto' }), o)}</div></div>`;
}

// ---------- Calendario ----------
function clasesDia(d, hoy) {
  const c = ['dia'];
  if (d.factor > 0) c.push(d.tipo); else c.push('descanso');
  if (d.estado.startsWith('susp_')) c.push(d.factor > 0 ? 'susp' : 'susp-cero');
  if (d.fecha === S.diaSel) c.push('sel');
  if (d.fecha === hoy) c.push('hoy');
  return c.join(' ');
}
function etiquetaDia(d) {
  if (d.estado === 'susp_aviso') return 'SUSP';
  if (d.estado === 'susp_parcial') return '50%';
  if (d.estado === 'susp_total') return 'SUSP';
  if (d.factor === 0) return 'desc.';
  if (d.tipo === 'fer') return 'FER';
  return d.feriado && d.feriado.tipo === 'no_laborable' ? 'no lab.' : '';
}
function mesesHTML(o) {
  const r = Calc.calcular(o, S.datos.feriados, { modo: 'real' });
  if (!r.dias.length) return '<div class="tarjeta vacio">Cargá la fecha de inicio y la duración para ver el calendario.</div>';
  const info = Object.fromEntries(r.dias.map((d) => [d.fecha, d]));
  const hoy = Calc.hoyISO();
  const meses = [...new Set(r.dias.map((d) => d.fecha.slice(0, 7)))];
  let h = '<div class="meses">';
  for (const m of meses) {
    const [y, mm] = m.split('-').map(Number);
    const nDias = new Date(Date.UTC(y, mm, 0)).getUTCDate();
    const primero = (Calc.diaSemana(`${m}-01`) + 6) % 7; // lunes = 0
    const res = r.meses.find((x) => x.mes === m);
    h += `<div class="mes"><h4>${Calc.nombreMes(m)}<small>${res.jornadas} jornadas · ${P(res.total)}</small></h4>
      <div class="semana">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((x) => `<div>${x}</div>`).join('')}</div><div class="dias">`;
    for (let i = 0; i < primero; i++) h += '<div></div>';
    for (let d = 1; d <= nDias; d++) {
      const f = `${m}-${String(d).padStart(2, '0')}`;
      const di = info[f];
      if (!di) { h += `<button class="dia fuera" disabled>${d}</button>`; continue; }
      const et = etiquetaDia(di);
      h += `<button class="${clasesDia(di, hoy)}" data-accion="dia" data-fecha="${f}" title="${esc(di.feriado ? di.feriado.nombre : Calc.TIPO_NOMBRE[di.tipo])}">
        ${d}${et ? `<small>${et}</small>` : di.extraHoras ? `<small>+${di.extraHoras} h</small>` : ''}${di.extraHoras ? '<span class="extra"></span>' : ''}</button>`;
    }
    h += '</div></div>';
  }
  return h + '</div>';
}
function resumenCal(o) {
  const r = Calc.calcular(o, S.datos.feriados, { modo: 'real' });
  const p = r.total.porTipo;
  const desc = r.dias.filter((d) => d.factor === 0).length;
  return `<div class="chips">
    <span class="chip"><i style="background:#1C1C1E"></i>${p.lv.jornadas} lunes a viernes</span>
    <span class="chip"><i style="background:#6B6C75"></i>${p.sab.jornadas} sábados</span>
    <span class="chip"><i style="background:#F7CD2A"></i>${p.dom.jornadas} domingos</span>
    <span class="chip"><i style="background:#C0392B"></i>${p.fer.jornadas} feriados</span>
    <span class="chip"><i style="background:#E9EAEE"></i>${desc} sin trabajo</span>
    ${r.total.susp ? `<span class="chip">${r.total.susp} suspendidos</span>` : ''}
    ${r.total.extraHoras ? `<span class="chip">${r.total.extraHoras} h nocturnas</span>` : ''}
    <span class="chip">Total real ${P(r.total.total)}</span></div>`;
}
function panelDia(o) {
  if (!S.diaSel) {
    return `<div class="tarjeta panel-dia"><h3>Editar un día</h3><p class="muted">Tocá un día del calendario para marcarlo como feriado, cargar una suspensión,
      sumar horas nocturnas o cambiar un descanso por día trabajado.</p></div>`;
  }
  const r = Calc.calcular(o, S.datos.feriados, { modo: 'real' });
  const d = r.dias.find((x) => x.fecha === S.diaSel);
  if (!d) { S.diaSel = null; return panelDia(o); }
  const aj = (o.dias || {})[S.diaSel] || {};
  const estadoPlan = d.plan ? 'trabajado' : 'descanso';
  const estado = aj.estado || estadoPlan;
  const radios = Object.entries(Calc.ESTADOS).map(([k, t]) => `<label class="radio ${estado === k ? 'sel' : ''}"><input type="radio" name="estado" value="${k}"
    data-campo="d:estado" data-tipo="texto" ${estado === k ? 'checked' : ''}>${t}${k === estadoPlan ? ' <span class="muted">(según diagrama)</span>' : ''}</label>`).join('');
  const autoTxt = d.feriado && d.feriado.tipo === 'feriado' ? `Automático: feriado` : `Automático: ${Calc.TIPO_NOMBRE[d.tipoSemana].toLowerCase()}`;
  return `<div class="tarjeta panel-dia">
    <div class="fecha">${Calc.DIAS[Calc.diaSemana(d.fecha)]} ${Calc.fechaNum(d.fecha)}</div>
    <p class="muted">Turno ${d.turno}${d.feriado ? ` · ${esc(d.feriado.nombre)}${d.feriado.tipo === 'no_laborable' ? ' (no laborable, se cobra como hábil)' : ''}` : ''}</p>
    <div class="campo"><label>Estado del día</label><div class="radios">${radios}</div></div>
    <div class="grid g2 mt">
    ${selector('Tipo de día', 'd:tipo', [['', autoTxt], ['feriado', 'Feriado'], ['normal', 'Día común (ignorar feriado)']], { cls: 'col-todo' })}
    ${campo('Horas nocturnas o extra', 'd:horasExtra', { tipo: 'number', num: true, min: 0, step: 0.5, sufijo: 'h' })}
    ${campo('Nota', 'd:nota', { cls: 'col-todo', placeholder: 'Ej.: lluvia, corte de energía…' })}</div>
    <div class="mt" data-vivo="importe-dia">${importeDiaHTML(o)}</div>
    <div class="fila mt"><button class="btn chico" data-accion="reset-dia">Restablecer día</button><span class="espaciador"></span>
    <button class="btn chico texto" data-accion="cerrar-dia">Cerrar</button></div></div>`;
}
function importeDiaHTML(o) {
  const r = Calc.calcular(o, S.datos.feriados, { modo: 'real' });
  const d = r.dias.find((x) => x.fecha === S.diaSel);
  if (!d) return '';
  const det = [];
  if (d.honorarios) det.push(`${d.horas} h × ${P(d.valorHora)}`);
  if (d.extraImporte) det.push(`${d.extraHoras} h × ${P(d.valorHoraNoct)}`);
  if (d.viatico) det.push(`viático ${P(d.viatico)}`);
  if (d.movilidad) det.push(`movilidad ${P(d.movilidad)}`);
  return `<div class="muted" style="font-size:12px">Importe del día</div><div class="importe">${P(d.total)}</div><div class="muted" style="font-size:12px">${det.join(' + ') || 'No se cobra'}</div>`;
}
function tabCalendario(o) {
  const c = o.calendario;
  return `<div class="tarjeta"><div class="grid g4">
    ${campo('Fecha de inicio', 'o:calendario.inicio', { tipo: 'date' })}
    ${campo('Duración de la obra', 'o:calendario.duracionDias', { tipo: 'number', num: true, min: 1, sufijo: 'días', ayuda: '<span data-vivo="fin-obra"></span>' })}
    ${campo('Días de trabajo', 'o:calendario.diasTrabajo', { tipo: 'number', num: true, min: 1, sufijo: 'días' })}
    ${campo('Días de descanso', 'o:calendario.diasDescanso', { tipo: 'number', num: true, min: 0, sufijo: 'días' })}
    ${campo('Hora de inicio', 'o:calendario.horaInicio', { tipo: 'time' })}
    ${campo('Hora de fin', 'o:calendario.horaFin', { tipo: 'time', ayuda: `Jornada de <span data-vivo="horas">${Calc.horasJornada(c)}</span> h` })}
    </div></div>
    <div class="leyenda mt"><span><i style="background:#1C1C1E"></i>Lunes a viernes</span><span><i style="background:#6B6C75"></i>Sábado</span>
      <span><i style="background:#F7CD2A"></i>Domingo</span><span><i style="background:#C0392B"></i>Feriado</span><span><i style="background:#E9EAEE"></i>Descanso</span>
      <span><i style="background:#fff;border:1.5px dashed #C0392B"></i>Suspendido</span><span><i style="background:#4C8DF6"></i>Horas nocturnas</span></div>
    <div data-vivo="cal-resumen" style="margin-bottom:14px">${resumenCal(o)}</div>
    <div class="cal-layout"><div data-vivo="cal-meses">${mesesHTML(o)}</div><div data-vivo="panel-dia">${panelDia(o)}</div></div>`;
}

// ---------- Liquidaciones ----------
function tabLiquidaciones(o) {
  const r = Calc.calcular(o, S.datos.feriados, { modo: 'real' });
  if (!r.meses.length) return '<div class="tarjeta vacio">Cargá la fecha de inicio en Calendario para ver los meses a liquidar.</div>';
  let h = `<div class="aviso info">${ICON.info}<div>Antes de liquidar un mes, marcá en <a href="#" data-accion="tab" data-tab="calendario">Calendario y feriados</a>
    las suspensiones, los días de descanso trabajados y las horas nocturnas. La liquidación acompaña al comprobante C que emitís en ARCA.</div></div>`;
  for (const m of r.meses) {
    const pre = `l:${m.mes}`;
    o.liquidaciones = o.liquidaciones || {};
    if (!o.liquidaciones[m.mes]) o.liquidaciones[m.mes] = {};
    h += `<div class="tarjeta"><div class="liq">
      <div><div class="mesnom">${Calc.nombreMes(m.mes)}</div><div class="muted">${m.jornadas} jornadas · ${m.horas} h${m.extraHoras ? ` · ${m.extraHoras} h nocturnas` : ''}${m.susp ? ` · ${m.susp} suspendidos` : ''}</div>
        <div class="tot">${P(m.total)}</div></div>
      <div class="grid g3">
        ${campo('Fecha de emisión', `${pre}.fechaEmision`, { tipo: 'date', ayuda: 'Vacío = fecha del día.' })}
        ${campo('Comprobante C N°', `${pre}.comprobante`, { placeholder: 'Ej.: 00002-00000015' })}
        ${campo('Fecha de pago', `${pre}.fechaPago`, { tipo: 'date' })}
        ${campo('Forma de pago', `${pre}.formaPago`, { placeholder: 'Transferencia bancaria' })}
        ${campo('Observaciones', `${pre}.observaciones`, { cls: 'col-2' })}
      </div>
      <div><button class="btn primario" data-accion="pdf" data-doc="liquidacion" data-mes="${m.mes}">${ICON.pdf}Generar PDF</button></div>
    </div></div>`;
  }
  return h;
}

function tabTextos(o) {
  const vars = '<code>{disponibilidad}</code> <code>{viatico}</code> <code>{valorHora}</code> <code>{movilidad}</code> <code>{comitente}</code> <code>{cliente}</code> <code>{validez}</code> <code>{inicio}</code> <code>{fin}</code>';
  return `<div class="grid g2"><div class="tarjeta">${areaLineas('El servicio incluye (una línea por ítem)', 'o:servicios', 'Usá **texto** para poner en negrita.')}
      <div class="fila mt"><button class="btn chico" data-accion="restaurar-textos" data-cual="servicios">Restaurar textos por defecto</button></div></div>
    <div class="tarjeta">${areaLineas('Condiciones comerciales (una línea por ítem)', 'o:condiciones', `Variables que se reemplazan solas: ${vars}`)}
      <div class="fila mt"><button class="btn chico" data-accion="restaurar-textos" data-cual="condiciones">Restaurar textos por defecto</button></div></div></div>`;
}

// ---------- Perfil ----------
function vistaPerfil() {
  const p = S.datos.perfil;
  return `<div class="pagina"><div class="encabezado"><div><h1>Mi perfil</h1><p>Tus datos aparecen en todos los PDF.</p></div></div>
    <div class="grid" style="grid-template-columns: 1fr 340px"><div class="tarjeta"><div class="grid g2">
    ${campo('Nombre y apellido', 'p:nombre')}
    ${campo('Título', 'p:titulo')}
    ${campo('Matrícula', 'p:matricula', { placeholder: 'Ej.: COPHISEC THST 1-00000' })}
    ${campo('CUIL / CUIT', 'p:cuil')}
    ${selector('Condición fiscal', 'p:condicionFiscal', [['Monotributo', 'Monotributo'], ['Responsable Inscripto', 'Responsable Inscripto'], ['Exento', 'Exento']])}
    ${campo('Teléfono', 'p:telefono')}
    ${campo('Correo electrónico', 'p:email')}
    ${campo('Ciudad (para la fecha del presupuesto)', 'p:ciudad', { placeholder: 'Ej.: Córdoba' })}
    ${campo('Domicilio', 'p:domicilio', { cls: 'col-todo' })}
    </div></div>
    <div class="tarjeta"><h3>Logo</h3><div class="logo-prev" data-vivo="logo">${p.logo ? `<img src="${p.logo}" alt="Logo">` : '<span>Sin logo: se muestra tu nombre</span>'}</div>
    <div class="fila mt"><button class="btn" data-accion="elegir-logo">Elegir imagen…</button>${p.logo ? '<button class="btn peligro" data-accion="quitar-logo">Quitar</button>' : ''}</div>
    <p class="muted" style="font-size:12px">PNG con fondo transparente o blanco. Se usa en el encabezado de los PDF.</p></div></div></div>`;
}

// ---------- Clientes ----------
function vistaClientes() {
  const cs = S.datos.clientes;
  if (S.clienteSel && !cliente(S.clienteSel)) S.clienteSel = null;
  const c = cliente(S.clienteSel);
  const lista = cs.length ? `<table class="t"><thead><tr><th>Razón social</th><th>CUIT</th><th>Localidad</th></tr></thead><tbody>
    ${cs.map((x) => `<tr class="clic" data-accion="sel-cliente" data-id="${x.id}" style="${x.id === S.clienteSel ? 'background:#FEF8E0' : ''}">
      <td><b>${esc(x.razonSocial || '(sin nombre)')}</b></td><td>${esc(x.cuit)}</td><td>${esc(x.localidad)}</td></tr>`).join('')}</tbody></table>`
    : '<p class="muted">Todavía no cargaste clientes.</p>';
  const form = c ? `<div class="tarjeta"><h2>${esc(c.razonSocial || 'Cliente nuevo')}</h2><div class="grid g2" style="margin-top:12px">
    ${campo('Razón social', 'cl:razonSocial', { cls: 'col-todo' })}
    ${campo('CUIT', 'cl:cuit')}
    ${campo('Contacto / área', 'cl:contacto', { placeholder: 'Ej.: Área de Recursos Humanos' })}
    ${campo('Domicilio', 'cl:domicilio')}
    ${campo('Localidad', 'cl:localidad')}
    ${campo('Correo', 'cl:email')}
    ${campo('Teléfono', 'cl:telefono')}</div>
    <div class="fila mt"><span class="espaciador"></span><button class="btn peligro" data-accion="borrar-cliente">${ICON.borrar}Eliminar cliente</button></div></div>`
    : '<div class="tarjeta muted">Elegí un cliente de la lista o creá uno nuevo.</div>';
  return `<div class="pagina"><div class="encabezado"><div><h1>Clientes</h1><p>Empresas a las que les presupuestás.</p></div>
    <div class="acciones"><button class="btn primario" data-accion="nuevo-cliente">${ICON.mas}Nuevo cliente</button></div></div>
    <div class="grid g2"><div class="tarjeta">${lista}</div>${form}</div></div>`;
}

// ---------- Feriados ----------
function vistaFeriados() {
  const fs = S.datos.feriados.slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
  const anios = [...new Set(fs.map((f) => f.fecha.slice(0, 4)))];
  const actual = String(new Date().getFullYear());
  if (!S.anioFeriados || !anios.includes(S.anioFeriados)) S.anioFeriados = anios.includes(actual) ? actual : anios[anios.length - 1];
  const delAnio = fs.filter((f) => f.fecha.startsWith(S.anioFeriados || ''));
  return `<div class="pagina"><div class="encabezado"><div><h1>Feriados</h1><p>Se aplican automáticamente en todas las obras. Revisá los trasladables cuando se publique el decreto de cada año.</p></div>
    <div class="acciones"><button class="btn" data-accion="restaurar-feriados">Restaurar lista original</button></div></div>
    <div class="tarjeta"><h3>Agregar feriado o día no laborable</h3><div class="grid" style="grid-template-columns: 170px 1fr 230px 170px auto; align-items:end">
      <div class="campo"><label>Fecha</label><input type="date" id="nf-fecha"></div>
      <div class="campo"><label>Motivo</label><input id="nf-nombre" placeholder="Ej.: Feriado provincial"></div>
      <div class="campo"><label>Tipo</label><select id="nf-tipo"><option value="feriado">Feriado</option><option value="no_laborable">No laborable (se cobra hábil)</option></select></div>
      <div class="campo"><label>Ámbito</label><input id="nf-ambito" placeholder="Nacional, Córdoba…"></div>
      <button class="btn primario" data-accion="agregar-feriado">${ICON.mas}Agregar</button></div></div>
    <div class="tarjeta"><div class="fila" style="margin-bottom:12px">${anios.map((a) => `<button class="btn chico ${a === S.anioFeriados ? 'oscuro' : ''}" data-accion="anio-feriados" data-anio="${a}">${a}</button>`).join('')}</div>
    <table class="t"><thead><tr><th>Fecha</th><th>Día</th><th>Motivo</th><th>Tipo</th><th>Ámbito</th><th></th></tr></thead><tbody>
    ${delAnio.map((f) => `<tr><td class="num">${Calc.fechaNum(f.fecha)}</td><td style="text-transform:capitalize">${Calc.DIAS[Calc.diaSemana(f.fecha)]}</td><td>${esc(f.nombre)}</td>
      <td>${f.tipo === 'feriado' ? '<span class="etiqueta warn">Feriado</span>' : '<span class="etiqueta">No laborable</span>'}</td><td>${esc(f.ambito || '')}</td>
      <td class="r"><button class="btn chico peligro" data-accion="borrar-feriado" data-fecha="${f.fecha}" data-nombre="${esc(f.nombre)}">${ICON.borrar}</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Sin feriados cargados.</td></tr>'}
    </tbody></table></div></div>`;
}

// ---------- Respaldo ----------
function vistaRespaldo() {
  return `<div class="pagina"><div class="encabezado"><div><h1>Respaldo y ayuda</h1><p>Tus datos se guardan solos en esta computadora.</p></div></div>
    <div class="grid g3">
      <div class="tarjeta"><h3>Exportar respaldo</h3><p class="sub">Guarda un archivo con todas tus obras, clientes, perfil y feriados. Copialo a un pendrive o a la nube.</p>
        <button class="btn primario" data-accion="exportar">${ICON.exportar}Exportar…</button></div>
      <div class="tarjeta"><h3>Importar datos</h3><p class="sub">Carga un respaldo o el archivo de datos inicial. <b>Reemplaza</b> los datos actuales.</p>
        <button class="btn" data-accion="importar">${ICON.importar}Importar…</button></div>
      <div class="tarjeta"><h3>Carpeta de datos</h3><p class="sub" style="word-break:break-all">${esc(S.info.carpetaDatos || '')}</p>
        <button class="btn" data-accion="abrir-carpeta">${ICON.carpeta}Abrir carpeta</button></div></div>
    <div class="tarjeta mt"><h2>Cómo se usa</h2><ol style="line-height:1.8;margin:10px 0 0">
      <li><b>Mi perfil:</b> cargá tus datos y tu logo una sola vez.</li>
      <li><b>Clientes:</b> agregá la empresa que te contrata.</li>
      <li><b>Nueva obra:</b> completá los datos, las tarifas y la fecha de inicio. El calendario arma los turnos y aplica los feriados.</li>
      <li><b>Resumen y PDF:</b> revisá los números y generá el presupuesto para el cliente.</li>
      <li><b>Durante la obra:</b> en el calendario marcá suspensiones, descansos trabajados y horas nocturnas.</li>
      <li><b>A fin de mes:</b> en Liquidaciones mensuales cargá el número del comprobante C de ARCA y generá la liquidación en PDF.</li></ol></div></div>`;
}

// ---------- Render ----------
const VISTAS = { obras: vistaObras, obra: vistaObra, perfil: vistaPerfil, clientes: vistaClientes, feriados: vistaFeriados, respaldo: vistaRespaldo };
function render() {
  renderSidebar();
  const scroll = $('#main').scrollTop;
  $('#main').innerHTML = (VISTAS[S.vista] || vistaObras)();
  $('#main').scrollTop = scroll;
  refrescarVivos();
}
const VIVOS = {
  'titulo-obra': () => esc(obra().nombre || 'Obra sin nombre'),
  resumen: () => resumenHTML(obra()),
  tarifas: () => tablaTarifasUI(Calc.calcular(obra(), S.datos.feriados, { modo: 'presupuesto' }), obra()),
  'cal-meses': () => mesesHTML(obra()),
  'cal-resumen': () => resumenCal(obra()),
  'importe-dia': () => importeDiaHTML(obra()),
  'panel-dia': () => panelDia(obra()),
  horas: () => String(Calc.horasJornada(obra().calendario)),
  'fin-obra': () => {
    const r = Calc.calcular(obra(), S.datos.feriados, { modo: 'presupuesto' });
    return r.fin ? `Termina el ${Calc.diaYFecha(r.fin)}/${r.fin.slice(0, 4)}` : '';
  },
  logo: () => (S.datos.perfil.logo ? `<img src="${S.datos.perfil.logo}" alt="Logo">` : '<span>Sin logo: se muestra tu nombre</span>'),
};
function refrescarVivos(excepto) {
  document.querySelectorAll('[data-vivo]').forEach((el) => {
    const k = el.dataset.vivo;
    if (k !== excepto && VIVOS[k]) { try { el.innerHTML = VIVOS[k](); } catch { /* vista sin obra */ } }
  });
}

// ---------- Edición de campos ----------
function limpiarDia() {
  const o = obra();
  const aj = o.dias[S.diaSel];
  if (!aj) return;
  const d = Calc.construirDias(o, S.datos.feriados).find((x) => x.fecha === S.diaSel);
  const plan = d && d.plan ? 'trabajado' : 'descanso';
  if (aj.estado === plan) delete aj.estado;
  if (!aj.tipo) delete aj.tipo;
  if (!Calc.num(aj.horasExtra)) delete aj.horasExtra;
  if (!aj.nota) delete aj.nota;
  if (!Object.keys(aj).length) delete o.dias[S.diaSel];
}

function alCambiar(e) {
  const el = e.target.closest('[data-campo]');
  if (!el) return;
  const [pref, ruta] = el.dataset.campo.split(':');
  let v;
  if (el.dataset.tipo === 'bool') v = el.checked;
  else if (el.dataset.tipo === 'num') v = el.value === '' ? 0 : Number(el.value);
  else if (el.dataset.tipo === 'lineas') v = el.value.split('\n').map((x) => x.trim()).filter(Boolean);
  else v = el.value;
  if (el.type === 'radio' && !el.checked) return;

  if (pref === 'o' && ruta === 'clienteId' && v === '__nuevo') { nuevoClienteModal(); return; }
  if (pref === 'd') {
    const o = obra();
    o.dias = o.dias || {};
    o.dias[S.diaSel] = o.dias[S.diaSel] || {};
    setPath(o.dias[S.diaSel], ruta, v);
    limpiarDia();
    if (el.type === 'radio') { document.querySelectorAll('.radio').forEach((r) => r.classList.toggle('sel', r.querySelector('input').checked)); }
    refrescarVivos('panel-dia');
  } else {
    const ctx = contexto(pref);
    if (!ctx) return;
    setPath(ctx, ruta, v);
    if (pref === 'l') { /* liquidaciones: sin vista previa */ }
    if (pref === 'cl' && ruta === 'razonSocial') { const h = $('.tarjeta h2'); if (h) h.textContent = v || 'Cliente nuevo'; }
    refrescarVivos();
  }
  guardar();
}

function nuevoClienteModal() {
  modal(`<h2>Nuevo cliente</h2><p class="muted">Podés completar el resto después en Clientes.</p><div class="grid g2" style="margin-top:12px">
    <div class="campo col-todo"><label>Razón social</label><input id="nc-rs" placeholder="Ej.: Empresa S.A."></div>
    <div class="campo"><label>CUIT</label><input id="nc-cuit"></div><div class="campo"><label>Contacto / área</label><input id="nc-contacto" placeholder="Área de Recursos Humanos"></div>
    <div class="campo"><label>Domicilio</label><input id="nc-dom"></div><div class="campo"><label>Localidad</label><input id="nc-loc"></div></div>
    <div class="pie"><button class="btn" data-modal="cancelar">Cancelar</button><button class="btn primario" data-modal="aceptar">Guardar cliente</button></div>`, (m) => {
    const rs = m.querySelector('#nc-rs').value.trim();
    if (!rs) { toast('Escribí la razón social.', 'error'); return false; }
    const c = { id: Defaults.nuevoId(), razonSocial: rs, cuit: m.querySelector('#nc-cuit').value.trim(), contacto: m.querySelector('#nc-contacto').value.trim(),
      domicilio: m.querySelector('#nc-dom').value.trim(), localidad: m.querySelector('#nc-loc').value.trim(), email: '', telefono: '' };
    S.datos.clientes.push(c);
    if (obra()) obra().clienteId = c.id;
    guardar();
    render();
    return true;
  });
  // Si se cancela, el selector vuelve al valor anterior.
  const m = $('#modal');
  const prev = m.onclick;
  m.onclick = async (e) => { await prev(e); if (m.hidden) render(); };
}

// ---------- Acciones ----------
const ACCIONES = {
  ir: (el) => { S.vista = el.dataset.vista; S.diaSel = null; render(); },
  tab: (el) => { S.tab = el.dataset.tab; render(); $('#main').scrollTop = 0; },
  'abrir-obra': (el, e) => { if (e.target.closest('button')) return; S.obraId = el.dataset.id; S.vista = 'obra'; S.tab = 'resumen'; S.diaSel = null; render(); $('#main').scrollTop = 0; },
  'nueva-obra': () => {
    const o = Defaults.nuevaObra(S.datos, Calc.hoyISO());
    S.datos.numeracion.presupuesto = (S.datos.numeracion.presupuesto || 1) + 1;
    S.datos.obras.push(o);
    S.obraId = o.id; S.vista = 'obra'; S.tab = 'datos';
    guardar(); render();
    toast('Obra creada. Completá los datos, las tarifas y la fecha de inicio.');
  },
  'duplicar-obra': (el) => {
    const src = S.datos.obras.find((o) => o.id === el.dataset.id);
    const o = clon(src);
    const n = S.datos.numeracion.presupuesto || 1;
    o.id = Defaults.nuevoId();
    o.nombre = `${src.nombre} (copia)`;
    o.presupuesto.numero = `${String(n).padStart(4, '0')}-${Calc.hoyISO().slice(0, 4)}`;
    o.presupuesto.fecha = Calc.hoyISO();
    o.dias = {}; o.liquidaciones = {};
    S.datos.numeracion.presupuesto = n + 1;
    S.datos.obras.push(o);
    guardar(); render(); toast('Obra duplicada con un número de presupuesto nuevo.', 'ok');
  },
  'borrar-obra': async (el) => {
    const o = S.datos.obras.find((x) => x.id === el.dataset.id);
    if (!(await confirmar('Eliminar obra', `Se va a eliminar <b>${esc(o.nombre)}</b> con su calendario y liquidaciones. No se puede deshacer.`, 'Eliminar', true))) return;
    S.datos.obras = S.datos.obras.filter((x) => x.id !== o.id);
    guardar(); render(); toast('Obra eliminada.');
  },
  dia: (el) => { S.diaSel = el.dataset.fecha; refrescarVivos(); },
  'cerrar-dia': () => { S.diaSel = null; refrescarVivos(); },
  'reset-dia': () => { const o = obra(); delete o.dias[S.diaSel]; guardar(); refrescarVivos(); },
  pdf: async (el) => {
    const o = obra();
    const doc = el.dataset.doc;
    const f = faltantes(o);
    if (f.length && !(await confirmar('Faltan datos', `Falta completar: ${f.join(', ')}. ¿Generar el PDF igual?`, 'Generar igual'))) return;
    let d;
    try {
      d = doc === 'cliente' ? Plantillas.presupuestoCliente(S.datos, o)
        : doc === 'detallado' ? Plantillas.presupuestoDetallado(S.datos, o)
          : Plantillas.liquidacion(S.datos, o, el.dataset.mes);
    } catch (err) { toast('No se pudo armar el documento: ' + err.message, 'error'); return; }
    el.disabled = true;
    const r = await api.generarPDF(d);
    el.disabled = false;
    if (r.ok) toast(`PDF guardado: ${r.ruta.split(/[\\/]/).pop()}`, 'ok');
    else if (r.error) toast(r.error, 'error');
  },
  'restaurar-textos': async (el) => {
    const cual = el.dataset.cual;
    if (!(await confirmar('Restaurar textos', 'Se reemplazan los textos de esta lista por los originales.', 'Restaurar'))) return;
    obra()[cual] = (cual === 'servicios' ? Defaults.SERVICIOS : Defaults.CONDICIONES).slice();
    guardar(); render();
  },
  'elegir-logo': async () => {
    const r = await api.elegirLogo();
    if (r.ok) { S.datos.perfil.logo = r.logo; guardar(); render(); toast('Logo actualizado.', 'ok'); } else if (r.error) toast(r.error, 'error');
  },
  'quitar-logo': () => { S.datos.perfil.logo = ''; guardar(); render(); },
  'nuevo-cliente': () => {
    const c = { id: Defaults.nuevoId(), razonSocial: '', cuit: '', domicilio: '', localidad: '', contacto: '', email: '', telefono: '' };
    S.datos.clientes.push(c); S.clienteSel = c.id; guardar(); render();
    const f = $('[data-campo="cl:razonSocial"]'); if (f) f.focus();
  },
  'sel-cliente': (el) => { S.clienteSel = el.dataset.id; render(); },
  'borrar-cliente': async () => {
    const c = cliente(S.clienteSel);
    const usadas = S.datos.obras.filter((o) => o.clienteId === c.id).length;
    if (!(await confirmar('Eliminar cliente', `Se va a eliminar <b>${esc(c.razonSocial || 'este cliente')}</b>.${usadas ? ` Lo usan ${usadas} obra(s), que van a quedar sin cliente.` : ''}`, 'Eliminar', true))) return;
    S.datos.clientes = S.datos.clientes.filter((x) => x.id !== c.id);
    S.datos.obras.forEach((o) => { if (o.clienteId === c.id) o.clienteId = ''; });
    S.clienteSel = null; guardar(); render();
  },
  'anio-feriados': (el) => { S.anioFeriados = el.dataset.anio; render(); },
  'agregar-feriado': () => {
    const fecha = $('#nf-fecha').value, nombre = $('#nf-nombre').value.trim();
    if (!Calc.esFechaValida(fecha) || !nombre) { toast('Completá la fecha y el motivo.', 'error'); return; }
    S.datos.feriados.push({ fecha, nombre, tipo: $('#nf-tipo').value, ambito: $('#nf-ambito').value.trim() });
    S.anioFeriados = fecha.slice(0, 4);
    guardar(); render(); toast('Feriado agregado. Ya se aplica en todas las obras.', 'ok');
  },
  'borrar-feriado': (el) => {
    const i = S.datos.feriados.findIndex((f) => f.fecha === el.dataset.fecha && f.nombre === el.dataset.nombre);
    if (i >= 0) S.datos.feriados.splice(i, 1);
    guardar(); render();
  },
  'restaurar-feriados': async () => {
    if (!(await confirmar('Restaurar feriados', 'Se agregan los feriados originales que falten. Los que agregaste vos se mantienen.', 'Restaurar'))) return;
    const clave = (f) => `${f.fecha}|${f.nombre}`;
    const hay = new Set(S.datos.feriados.map(clave));
    Defaults.FERIADOS.forEach((f) => { if (!hay.has(clave(f))) S.datos.feriados.push(Object.assign({}, f)); });
    guardar(); render(); toast('Lista de feriados restaurada.', 'ok');
  },
  exportar: async () => { const r = await api.exportar(S.datos); if (r.ok) toast(`Respaldo guardado: ${r.ruta.split(/[\\/]/).pop()}`, 'ok'); },
  importar: async () => {
    const r = await api.importar();
    if (!r.ok) { if (r.error) toast(r.error, 'error'); return; }
    const hayDatos = S.datos.obras.length || S.datos.perfil.nombre;
    if (hayDatos && !(await confirmar('Importar datos', 'Los datos actuales se van a reemplazar por los del archivo. Si querés conservarlos, exportá un respaldo antes.', 'Reemplazar', true))) return;
    S.datos = Defaults.normalizar(r.datos);
    S.obraId = null; S.vista = 'obras';
    await guardar(true); render(); toast('Datos importados correctamente.', 'ok');
  },
  'abrir-carpeta': () => api.abrirCarpetaDatos(),
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-accion]');
  if (!el) return;
  if (el.tagName === 'A') e.preventDefault();
  const fn = ACCIONES[el.dataset.accion];
  if (fn) fn(el, e);
});
document.addEventListener('input', (e) => { if (e.target.matches('input:not([type=radio]):not([type=checkbox]), textarea')) alCambiar(e); });
document.addEventListener('change', (e) => { if (e.target.matches('select, input[type=radio], input[type=checkbox], input[type=date], input[type=time]')) alCambiar(e); });
window.addEventListener('beforeunload', () => { if (S.pendiente) { clearTimeout(timerGuardar); api.guardarDatosSync(S.datos); } });

// Acceso para pruebas automáticas.
window.App = { S, render, ACCIONES };

(async function iniciar() {
  const r = await api.leerDatos();
  S.info = await api.info();
  S.datos = Defaults.normalizar(r.datos);
  if (!r.datos) await guardar(true);
  if (r.aviso) toast(r.aviso, 'error');
  render();
})();
