/* Plantillas HTML de los PDF: presupuesto para el cliente, presupuesto detallado y liquidación mensual.
 * El proceso principal reemplaza <!--FUENTES--> por las fuentes embebidas antes de imprimir. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./calc.js') : root.Calc);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Plantillas = api;
})(typeof self !== 'undefined' ? self : this, function (Calc) {
  'use strict';

  const CSS = `
@page { size: A4; margin: 11mm 13mm 15mm 13mm; }
:root { --navy:#1C1C1E; --navy-2:#3A3A40; --amber:#F7CD2A; --ink:#222226; --gray:#6B6C75; --line:#DEDFE3; --soft:#F4F4F6; --soft-amber:#FEF8E0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: Inter, 'Segoe UI', Arial, sans-serif; color: var(--ink); font-size: 8.5pt; line-height: 1.3;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
.head { display: flex; justify-content: space-between; align-items: center; padding-bottom: 6px; border-bottom: 2px solid var(--navy); }
.brand img { height: 64px; max-width: 70mm; object-fit: contain; }
.brand .nm { font-weight: 800; font-size: 15pt; letter-spacing: 1.6px; color: var(--navy); line-height: 1.05; text-transform: uppercase; }
.brand .bar { height: 3px; width: 40px; background: var(--amber); border-radius: 2px; margin: 6px 0 5px; }
.brand .tt { font-weight: 600; font-size: 6.8pt; letter-spacing: 1.4px; color: var(--gray); text-transform: uppercase; }
.doc-meta { text-align: right; font-size: 8.6pt; color: var(--gray); line-height: 1.5; }
.doc-meta .kind { font-weight: 800; font-size: 15pt; letter-spacing: 3px; color: var(--navy); line-height: 1.1; }
.doc-meta b { color: var(--ink); font-weight: 600; }
.tag { display: inline-block; background: var(--amber); color: var(--navy); font-weight: 800; font-size: 7pt; letter-spacing: 1.4px; padding: 2px 7px; border-radius: 3px; }
.title { background: var(--navy); color: #fff; border-radius: 6px; padding: 7px 14px; margin: 7px 0 6px; }
.title h1 { margin: 0; font-size: 13.5pt; font-weight: 700; letter-spacing: .2px; }
.title p { margin: 3px 0 0; font-size: 9pt; color: #C8C8CE; }
.title p b { color: var(--amber); font-weight: 600; }
.cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.card { border: 1px solid var(--line); border-radius: 6px; padding: 8px 12px; }
.card h3 { margin: 0 0 4px; font-size: 7.6pt; letter-spacing: 1.6px; text-transform: uppercase; color: var(--gray); font-weight: 700; }
.who4 { font-size: 8.4pt; line-height: 1.45; } .who4 b { color: var(--navy); }
h2 { font-size: 10.2pt; color: var(--navy); margin: 8px 0 4px; padding-bottom: 4px; border-bottom: 1px solid var(--line);
  display: flex; align-items: center; gap: 8px; break-after: avoid; }
h2 .n { background: var(--amber); color: var(--navy); font-size: 8.4pt; font-weight: 800; border-radius: 4px; min-width: 20px;
  padding: 0 4px; height: 20px; display: inline-flex; align-items: center; justify-content: center; }
p { margin: 0 0 6px; }
.muted { color: var(--gray); } .small { font-size: 8.1pt; }
ul { margin: 0; padding-left: 14px; } li { margin: 0 0 2.5px; break-inside: avoid; } li::marker { color: var(--amber); }
table { width: 100%; border-collapse: collapse; font-size: 8.6pt; break-inside: auto; }
tr { break-inside: avoid; }
th { background: var(--soft); color: var(--navy); text-align: left; font-weight: 700; font-size: 7.8pt; text-transform: uppercase;
  letter-spacing: .6px; padding: 5px 8px; border-bottom: 1.5px solid var(--navy); }
td { padding: 3px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
td.r, th.r { text-align: right; } td.c, th.c { text-align: center; }
tr.sum td { font-weight: 800; color: var(--navy); background: var(--soft-amber); }
tr.hl td { background: var(--soft-amber); }
tr.off td { color: var(--gray); }
.note { background: var(--soft); border-left: 3px solid var(--amber); padding: 7px 10px; border-radius: 0 5px 5px 0;
  font-size: 8.2pt; margin: 7px 0 0; break-inside: avoid; }
.totbox { display: flex; justify-content: space-between; align-items: center; background: var(--navy); color: #fff;
  border-radius: 6px; padding: 6px 14px; margin-top: 5px; break-inside: avoid; }
.totbox .l { font-size: 8pt; text-transform: uppercase; letter-spacing: 1.2px; color: #C8C8CE; font-weight: 600; }
.totbox .l small { display: block; text-transform: none; letter-spacing: 0; font-weight: 400; font-size: 7.8pt; margin-top: 2px; }
.totbox .l small b { color: #fff; }
.totbox .v { font-size: 17pt; font-weight: 800; white-space: nowrap; }
.cols2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10px; }
.conds li { margin-bottom: 1.5px; } .conds b { color: var(--navy); }
.sign { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8px; break-inside: avoid; }
.sign .closing { max-width: 56%; font-size: 8.8pt; }
.sign .who { text-align: center; width: 78mm; white-space: nowrap; }
.sign .line { border-top: 1px solid var(--ink); padding-top: 5px; font-size: 8.6pt; line-height: 1.45; }
.sign .line b { font-size: 9.6pt; color: var(--navy); }
table.rate td, table.rate th { text-align: center; } table.rate td:first-child, table.rate th:first-child { text-align: left; }
table.rate td.big { font-size: 10.5pt; font-weight: 800; color: var(--navy); }
table.rate td small { display: block; color: var(--gray); font-size: 7pt; font-weight: 500; }
.step { border: 1px solid var(--line); border-radius: 6px; padding: 8px 12px; margin: 0 0 7px; break-inside: avoid; }
.step h3 { margin: 0 0 4px; font-size: 9.4pt; color: var(--navy); }
.fx { background: var(--soft); border-radius: 4px; padding: 5px 9px; margin: 4px 0 2px; font-variant-numeric: tabular-nums; }
.fx b { color: var(--navy); }
.cal { display: grid; grid-template-columns: 70px repeat(31, 1fr); gap: 2px; font-size: 6.1pt; margin: 4px 0 2px; break-inside: avoid; }
.cal div { text-align: center; border-radius: 2px; padding: 2px 0; line-height: 1.15; }
.cal .lv { background: #1C1C1E; color: #fff; } .cal .sab { background: #6B6C75; color: #fff; }
.cal .dom { background: #F7CD2A; color: #1C1C1E; font-weight: 700; } .cal .fer { background: #C0392B; color: #fff; font-weight: 700; }
.cal .f { background: #E4E5E9; color: #8A8B93; } .cal .x { background: none; color: #C4C5CB; }
.cal .lb { background: none; text-align: left; font-weight: 700; color: var(--navy); font-size: 7.2pt; text-transform: capitalize; }
.leg span { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin: 0 4px -1px 10px; }
table.det { font-size: 7.6pt; } table.det td, body.compacto table.det td { padding: 1.8px 5px; } table.det th { padding: 4px 5px; font-size: 6.9pt; }
.pago { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 6px; }
.pago div { border: 1px solid var(--line); border-radius: 6px; padding: 6px 10px; font-size: 8.4pt; }
.pago span { display: block; font-size: 7pt; text-transform: uppercase; letter-spacing: 1px; color: var(--gray); font-weight: 700; }
.letras { margin-top: 5px; font-size: 8.6pt; font-weight: 600; color: var(--navy); }
body.compacto td { padding: 2.4px 8px; } body.compacto h2 { margin: 7px 0 3px; } body.compacto .sign { margin-top: 6px; }
body.compacto .title { margin: 6px 0 5px; } body.compacto .conds li { margin-bottom: 1px; }
.cierre { break-inside: avoid; } table.mes th { white-space: nowrap; }
`;

  const P = Calc.pesos;
  const fe = Calc.fechaCorta;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  // Texto con **negrita** → HTML seguro.
  function md(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }

  function hora(hhmm) { const [h, m] = String(hhmm || '').split(':'); return m && m !== '00' ? `${h}:${m}` : h; }
  function tituloCorto(t) { return String(t || '').replace('Higiene y Seguridad', 'HyS'); }
  function textoIVA(perfil) {
    if (perfil.condicionFiscal === 'Monotributo') return 'Monotributo: no corresponde IVA.';
    if (perfil.condicionFiscal === 'Responsable Inscripto') return 'Importes sin IVA.';
    return '';
  }
  function clienteDe(datos, obra) { return (datos.clientes || []).find((c) => c.id === obra.clienteId) || {}; }
  function lista(items) {
    if (items.length <= 1) return items.join('');
    return items.slice(0, -1).join(', ') + ' y ' + items[items.length - 1];
  }
  function variables(datos, obra, r) {
    const cli = clienteDe(datos, obra);
    const t = obra.tarifas;
    return {
      viatico: P(Calc.num(t.viatico)), valorHora: P(Calc.num(t.valorHora)), movilidad: P(Calc.num(t.movilidad)),
      inicio: r.inicio ? Calc.diaYFecha(r.inicio) : '', fin: r.fin ? Calc.diaYFecha(r.fin) : '',
      comitente: obra.comitente || cli.razonSocial || 'el comitente', cliente: cli.razonSocial || '',
      validez: `${Calc.num(obra.presupuesto.validezDias)} días`,
      disponibilidad: disponibilidad(obra),
    };
  }
  function disponibilidad(obra) { return String((obra.presupuesto || {}).disponibilidad || '').trim() || 'Disponibilidad inmediata'; }
  function conVariables(texto, vars) {
    return String(texto).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  }

  function marca(perfil) {
    if (perfil.logo) return `<div class="brand"><img src="${perfil.logo}" alt=""></div>`;
    return `<div class="brand"><div class="nm">${esc(perfil.nombre || 'Profesional')}</div><div class="bar"></div><div class="tt">${esc(perfil.titulo)}</div></div>`;
  }
  function encabezado(perfil, kind, lineas) {
    return `<div class="head">${marca(perfil)}<div class="doc-meta"><div class="kind">${kind}</div>${lineas.join('<br>')}</div></div>`;
  }
  function tituloObra(obra) {
    const sub = [obra.tarea, [obra.lugar, obra.comitente].filter(Boolean).join(' – ')].filter(Boolean);
    const p = sub.length === 2 ? `${esc(sub[0])} · <b>${esc(sub[1])}</b>` : sub.length ? `<b>${esc(sub[0])}</b>` : '';
    return `<div class="title"><h1>${esc(obra.servicio)}</h1>${p ? `<p>${p}</p>` : ''}</div>`;
  }
  function tarjetaProfesional(perfil) {
    const l1 = [`<b>${esc(perfil.nombre)}</b>`, esc(tituloCorto(perfil.titulo))].filter(Boolean).join(' · ');
    const l2 = [perfil.matricula && `Mat. ${esc(perfil.matricula)}`, perfil.cuil && `CUIL ${esc(perfil.cuil)}`].filter(Boolean).join(' · ');
    const cond = perfil.condicionFiscal === 'Monotributo' ? 'Monotributo (comprobante C)' : esc(perfil.condicionFiscal);
    const l3 = [cond, perfil.telefono && `Tel. ${esc(perfil.telefono)}`].filter(Boolean).join(' · ');
    return `<div class="card"><h3>Profesional</h3><div class="who4">${[l1, l2, l3].filter(Boolean).join('<br>')}</div></div>`;
  }
  function firma(perfil, texto) {
    const l = [`<b>${esc(perfil.nombre)}</b>`, esc(perfil.titulo),
      [perfil.matricula && `Mat. ${esc(perfil.matricula)}`, perfil.telefono && `Tel. ${esc(perfil.telefono)}`].filter(Boolean).join(' · ')];
    return `<div class="sign"><div class="closing"><p>${texto}</p><p class="muted">Atentamente,</p></div>
      <div class="who"><div class="line">${l.filter(Boolean).join('<br>')}</div></div></div>`;
  }
  function pie(perfil, derecha) {
    const izq = [perfil.nombre, perfil.titulo, perfil.matricula && `Mat. ${perfil.matricula}`, perfil.telefono && `Tel. ${perfil.telefono}`]
      .filter(Boolean).map(esc).join(' · ');
    return `<div style="width:100%;padding:0 13mm;font-family:'Segoe UI',Arial,sans-serif;font-size:7pt;color:#6B6C75;display:flex;justify-content:space-between;">
      <span>${izq}</span><span>${derecha}</span></div>`;
  }
  const PAGINAS = 'Página <span class="pageNumber"></span> de <span class="totalPages"></span>';
  function documento(titulo, cuerpo, clase) {
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title><!--FUENTES--><style>${CSS}</style></head><body class="${clase || ''}">${cuerpo}</body></html>`;
  }
  function nombreArchivo(s) { return String(s).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().replace(/\.+$/, '') + '.pdf'; }

  function tablaTarifas(r, obra, detalle) {
    const T = r.T;
    const filas = [['lv', 'Lunes a viernes'], ['sab', 'Sábados'], ['dom', 'Domingos y feriados']].map(([k, nm]) => {
      const a = detalle ? `<small>${T.rec[k] ? Calc.porcentaje(T.rec[k] * 100) : 'valor base'}</small>` : '';
      const b = detalle ? `<small>${Calc.porcentaje((T.rec[k] + T.noct) * 100)}</small>` : '';
      return `<tr><td><b>${nm}</b></td><td class="big">${P(T.hora[k])}${a}</td><td class="big">${P(T.horaNoct[k])}${b}</td></tr>`;
    }).join('');
    const c = obra.calendario;
    return `<table class="rate"><thead><tr><th style="width:28%">Día</th><th style="width:34%">Hora diurna · ${esc(c.horaInicio)} a ${esc(c.horaFin)}</th>
      <th>Hora nocturna · después de las ${esc(c.horaFin)}</th></tr></thead><tbody>${filas}</tbody></table>`;
  }

  function filasJornadas(r, obra) {
    const H = r.H;
    const filas = Calc.TIPOS.filter((k) => k === 'lv' || r.total.porTipo[k].jornadas > 0).map((k) => {
      const pt = r.total.porTipo[k];
      return `<tr><td><b>${Calc.TIPO_PLURAL[k]}</b></td><td>${H} h × ${P(r.T.hora[k])}</td><td class="r">${P(r.jornada[k])}</td>
        <td class="c">${pt.jornadas}</td><td class="r">${P(pt.honorarios)}</td></tr>`;
    });
    filas.push(`<tr class="sum"><td>Total honorarios</td><td>${r.total.horas} h</td><td></td><td class="c">${r.total.jornadas}</td><td class="r">${P(r.total.honorarios)}</td></tr>`);
    const t = obra.tarifas;
    if (Calc.num(t.viatico) > 0) {
      filas.push(t.viaticoProveeEmpresa
        ? `<tr><td><b>Viático de comida</b></td><td>Provisto por la empresa</td><td class="r">${P(0)}</td><td class="c">${r.total.jornadas}</td><td class="r">${P(0)}</td></tr>`
        : `<tr><td><b>Viático de comida</b></td><td>Sin cargo si la empresa la provee</td><td class="r">${P(r.viaticoJornada)}</td><td class="c">${r.total.jornadas}</td><td class="r">${P(r.total.viatico)}</td></tr>`);
    }
    if (r.movilidadJornada > 0) {
      filas.push(`<tr><td><b>Movilidad</b></td><td>Por jornada</td><td class="r">${P(r.movilidadJornada)}</td><td class="c">${r.total.jornadas}</td><td class="r">${P(r.total.movilidad)}</td></tr>`);
    }
    return `<table><thead><tr><th style="width:24%">Jornada</th><th>Cálculo</th><th class="r" style="width:15%">Por jornada</th>
      <th class="c" style="width:11%">Jornadas</th><th class="r" style="width:17%">Subtotal</th></tr></thead><tbody>${filas.join('')}</tbody></table>`;
  }

  function preciosJornada(r, obra) {
    const t = obra.tarifas;
    const filas = [['lv', 'Lunes a viernes'], ['sab', 'Sábados'], ['dom', 'Domingos y feriados']].map(([k, nm]) =>
      `<tr><td><b>${nm}</b></td><td>${r.H} h × ${P(r.T.hora[k])}</td><td class="r"><b>${P(r.jornada[k])}</b></td></tr>`);
    if (Calc.num(t.viatico) > 0) {
      filas.push(`<tr><td><b>Viático de comida</b></td><td>Por jornada trabajada · ${t.viaticoProveeEmpresa ? 'la empresa provee la comida' : 'sin cargo si la empresa provee la comida'}</td>
        <td class="r"><b>${t.viaticoProveeEmpresa ? 'Sin cargo' : P(Calc.num(t.viatico))}</b></td></tr>`);
    }
    if (r.movilidadJornada > 0) filas.push(`<tr><td><b>Movilidad</b></td><td>Por jornada trabajada</td><td class="r"><b>${P(r.movilidadJornada)}</b></td></tr>`);
    return `<table><thead><tr><th style="width:28%">Concepto</th><th>Detalle</th><th class="r" style="width:20%">Valor</th></tr></thead><tbody>${filas.join('')}</tbody></table>`;
  }

  // =====================================================================
  // Presupuesto para el cliente (una hoja)
  // =====================================================================
  function presupuestoCliente(datos, obra) {
    const perfil = datos.perfil;
    const r = Calc.calcular(obra, datos.feriados, { modo: 'presupuesto' });
    const cli = clienteDe(datos, obra);
    const c = obra.calendario;
    const conTotales = !!obra.presupuesto.mostrarTotales;
    const vars = variables(datos, obra, r);
    // Sin totales no se muestran fechas de obra, aunque un texto editado use {inicio} o {fin}.
    if (!conTotales) Object.assign(vars, { inicio: vars.disponibilidad.charAt(0).toLowerCase() + vars.disponibilidad.slice(1), fin: 'según el avance de la obra' });
    let h = encabezado(perfil, 'PRESUPUESTO', [
      `N° <b>${esc(obra.presupuesto.numero)}</b>`,
      `${esc(perfil.ciudad ? perfil.ciudad + ', ' : '')}<b>${obra.presupuesto.fecha ? Calc.fechaLarga(obra.presupuesto.fecha) : ''}</b>`,
      `Validez de la oferta: <b>${Calc.num(obra.presupuesto.validezDias)} días corridos</b>`]);
    h += tituloObra(obra);
    const d1 = [cli.razonSocial && `<b>${esc(cli.razonSocial)}</b>`, cli.contacto && esc(cli.contacto)].filter(Boolean).join(' · ');
    const d2 = [obra.comitente && `Comitente: ${esc(obra.comitente)}`, obra.dotacion && `${esc(obra.dotacion)} operarios`].filter(Boolean).join(' · ');
    const cuando = conTotales && r.inicio ? `Inicio <b>${Calc.DIAS[Calc.diaSemana(r.inicio)]} ${Calc.fechaNum(r.inicio)}</b>` : `<b>${esc(disponibilidad(obra))}</b>`;
    const d3 = `${cuando} · diagrama ${c.diasTrabajo} × ${c.diasDescanso} · ${hora(c.horaInicio)} a ${hora(c.horaFin)} h`;
    h += `<div class="cards">${tarjetaProfesional(perfil)}<div class="card"><h3>Destinatario y obra</h3><div class="who4">${[d1, d2, d3].filter(Boolean).join('<br>')}</div></div></div>`;
    h += `<h2>Honorarios por hora</h2>${tablaTarifas(r, obra, false)}`;
    h += `<p class="small muted" style="margin:3px 0 0">Toda hora fuera del horario de ${esc(c.horaInicio)} a ${esc(c.horaFin)} se factura con el valor nocturno del día. Días no laborables: se cobran como día hábil.</p>`;
    if (conTotales) {
      h += `<h2>Honorarios por jornada de ${r.H} horas${r.inicio ? ` · calendario real desde el ${fe(r.inicio)}` : ''}</h2>${filasJornadas(r, obra)}`;
      const t = obra.tarifas;
      const sinViatico = !t.viaticoProveeEmpresa && r.total.viatico > 0
        ? `Con viático de comida. Si la empresa provee la comida: <b>${P(r.total.total - r.total.viatico)}</b>. ` : '';
      h += `<div class="totbox"><div class="l">Total estimado · ${r.total.jornadas} jornadas${r.inicio ? ` · ${fe(r.inicio)} al ${fe(r.fin)}` : ''}
        <small>${sinViatico}${textoIVA(perfil)}</small></div><div class="v num">${P(r.total.total)}</div></div>`;
      const turnos = r.turnos.map((tr) => `T${tr.numero}: ${fe(tr.desde)} al ${fe(tr.hasta)}`).join(' · ');
      const fer = r.feriadosPeriodo.filter((f) => f.trabajado && f.cobraComo === 'fer').map((f) => Calc.diaYFecha(f.fecha));
      const meses = r.meses.filter((m) => m.total > 0).map((m) => `${Calc.MESES[Number(m.mes.slice(5)) - 1]} ${P(m.total)}`).join(' · ');
      h += `<p class="small muted" style="margin:5px 0 0">${turnos ? `<b>Turnos:</b> ${turnos}. ` : ''}${fer.length ? `<b>Feriados trabajados:</b> ${lista(fer)}. ` : ''}${meses ? `<b>Facturación mensual estimada:</b> ${meses}.` : ''}</p>`;
    } else {
      h += `<h2>Honorarios por jornada de ${r.H} horas y gastos</h2>${preciosJornada(r, obra)}`;
      const iva = textoIVA(perfil);
      h += `<p class="small muted" style="margin:3px 0 0">Se factura mensualmente según las jornadas y horas efectivamente trabajadas, de acuerdo con el parte de asistencia.${iva ? ` ${iva}` : ''}</p>`;
    }
    const sv = (obra.servicios || []).filter((s) => String(s).trim());
    if (sv.length) {
      const mitad = Math.ceil(sv.length / 2);
      h += `<h2>El servicio incluye</h2><div class="cols2"><ul>${sv.slice(0, mitad).map((s) => `<li>${md(s)}</li>`).join('')}</ul><ul>${sv.slice(mitad).map((s) => `<li>${md(s)}</li>`).join('')}</ul></div>`;
    }
    const cd = (obra.condiciones || []).filter((s) => String(s).trim());
    if (cd.length) h += `<h2>Condiciones comerciales</h2><ul class="conds">${cd.map((s) => `<li>${md(conVariables(s, vars))}</li>`).join('')}</ul>`;
    h += firma(perfil, 'Quedo a disposición para ampliar cualquier punto de la propuesta.');
    return {
      html: documento(`Presupuesto ${obra.presupuesto.numero}`, h, 'compacto'),
      pie: pie(perfil, perfil.cuil ? `CUIL ${esc(perfil.cuil)}` : PAGINAS),
      nombre: nombreArchivo(`Presupuesto ${obra.presupuesto.numero} - ${cli.razonSocial || obra.nombre}`),
    };
  }

  // =====================================================================
  // Presupuesto detallado (uso interno)
  // =====================================================================
  function calendarioHTML(r) {
    const info = {};
    for (const d of r.dias) info[d.fecha] = d;
    const meses = [...new Set(r.dias.map((d) => d.fecha.slice(0, 7)))];
    let out = '';
    for (const m of meses) {
      const [y, mm] = m.split('-').map(Number);
      const nDias = new Date(Date.UTC(y, mm, 0)).getUTCDate();
      out += `<div class="lb">${Calc.MESES[mm - 1]}</div>`;
      for (let d = 1; d <= 31; d++) {
        if (d > nDias) { out += '<div class="x"></div>'; continue; }
        const f = `${m}-${String(d).padStart(2, '0')}`;
        const letra = Calc.DIAS_LETRA[Calc.diaSemana(f)];
        const di = info[f];
        const cls = !di ? 'x' : di.factor > 0 ? di.tipo : 'f';
        out += `<div class="${cls}">${letra}<br>${d}</div>`;
      }
    }
    return `<div class="cal">${out}</div><p class="leg small muted"><span style="background:#1C1C1E;margin-left:0"></span>Lunes a viernes
      <span style="background:#6B6C75"></span>Sábado <span style="background:#F7CD2A"></span>Domingo <span style="background:#C0392B"></span>Feriado
      <span style="background:#E4E5E9"></span>Descanso</p>`;
  }

  function presupuestoDetallado(datos, obra) {
    const perfil = datos.perfil;
    const r = Calc.calcular(obra, datos.feriados, { modo: 'presupuesto' });
    const cli = clienteDe(datos, obra);
    const c = obra.calendario, t = obra.tarifas, T = r.T;
    let h = encabezado(perfil, 'PRESUPUESTO DETALLADO', ['<span class="tag">USO INTERNO</span>',
      `${obra.presupuesto.fecha ? Calc.fechaLarga(obra.presupuesto.fecha) : ''}`, `Base del presupuesto N° ${esc(obra.presupuesto.numero)}`]);
    h += `<div class="title"><h1>Cómo se arma el presupuesto</h1><p>${esc(obra.servicio)}${cli.razonSocial ? ` para <b>${esc(cli.razonSocial)}</b>` : ''}${obra.lugar ? ` · ${esc(obra.lugar)}` : ''}</p></div>`;

    h += `<h2><span class="n">1</span>Lo que se acordó</h2><table><thead><tr><th style="width:20%">Tema</th><th>Criterio</th></tr></thead><tbody>
      <tr><td><b>Inicio y plazo</b></td><td>${r.inicio ? `${Calc.diaYFecha(r.inicio)}/${r.inicio.slice(0, 4)}; ${c.duracionDias} días corridos hasta el ${Calc.diaYFecha(r.fin)}/${r.fin.slice(0, 4)}.` : 'Sin fecha de inicio.'}</td></tr>
      <tr><td><b>Valor base</b></td><td>${P(T.base)} por hora diurna de lunes a viernes, de ${esc(c.horaInicio)} a ${esc(c.horaFin)} (jornada de ${r.H} h).</td></tr>
      <tr><td><b>Recargos</b></td><td>Sábado ${Calc.porcentaje(T.rec.sab * 100)}; domingo y feriado ${Calc.porcentaje(T.rec.dom * 100)}; hora nocturna o fuera de horario ${Calc.porcentaje(T.noct * 100)}. Los recargos se suman.</td></tr>
      <tr><td><b>Viático</b></td><td>${Calc.num(t.viatico) > 0 ? `${P(Calc.num(t.viatico))} por jornada para comida${t.viaticoProveeEmpresa ? ': <b>la empresa provee la comida</b>, no se cobra' : '; no se cobra si la empresa la provee'}.` : 'No se cobra.'}</td></tr>
      <tr><td><b>Movilidad</b></td><td>${r.movilidadJornada > 0 ? `${P(r.movilidadJornada)} por jornada.` : 'No se cobra.'}</td></tr>
      <tr><td><b>Diagrama</b></td><td>${c.diasTrabajo} días de trabajo y ${c.diasDescanso} de descanso. Los descansos no se cobran.</td></tr>
      </tbody></table>`;

    h += `<h2><span class="n">2</span>Cuadro de honorarios por hora</h2>${tablaTarifas(r, obra, true)}
      <div class="step"><h3>Cómo se calculan</h3><ul>
      <li><b>Hora diurna:</b> valor base × (1 + recargo del día). Sábado ${Calc.porcentaje(T.rec.sab * 100)}; domingo y feriado ${Calc.porcentaje(T.rec.dom * 100)}.</li>
      <li><b>Hora nocturna o fuera de horario:</b> se suma ${Calc.porcentaje(T.noct * 100)} al recargo del día. Ejemplo: domingo nocturno = ${Calc.porcentaje((T.rec.dom + T.noct) * 100)} = ${P(T.horaNoct.dom)}.</li>
      <li>Criterio de referencia: Ley de Contrato de Trabajo (horas extra al 50 % en días hábiles y al 100 % en sábados después de las 13 h, domingos y feriados).</li>
      </ul></div>`;

    h += `<h2><span class="n">3</span>Calendario${r.inicio ? ` desde el ${Calc.fechaNum(r.inicio)}` : ''}</h2>${calendarioHTML(r)}`;
    if (r.turnos.length) {
      h += `<table><thead><tr><th style="width:18%">Turno</th><th style="width:22%">Desde</th><th style="width:22%">Hasta</th><th class="c" style="width:12%">Jornadas</th><th></th></tr></thead><tbody>
        ${r.turnos.map((tr) => `<tr><td>Turno ${tr.numero}${tr.completo ? '' : ' (parcial)'}</td><td>${Calc.diaYFecha(tr.desde)}</td><td>${Calc.diaYFecha(tr.hasta)}</td><td class="c">${tr.jornadas}</td><td></td></tr>`).join('')}</tbody></table>`;
    }
    if (r.feriadosPeriodo.length) {
      h += `<table><thead><tr><th style="width:18%">Fecha</th><th>Qué es</th><th style="width:14%">¿Se trabaja?</th><th style="width:22%">Cómo se cobra</th></tr></thead><tbody>
        ${r.feriadosPeriodo.map((f) => `<tr><td>${Calc.diaYFecha(f.fecha)}</td><td>${esc(f.nombre)}${f.tipo === 'no_laborable' ? ' (no laborable)' : ''}</td><td>${f.trabajado ? 'Sí' : 'No'}</td>
          <td>${f.trabajado ? `${Calc.TIPO_NOMBRE[f.cobraComo]}: ${P(r.jornada[f.cobraComo])}` : '—'}</td></tr>`).join('')}</tbody></table>`;
    }

    h += `<h2><span class="n">4</span>Honorarios por jornada y facturación mensual</h2>${filasJornadas(r, obra)}`;
    h += `<table class="mes"><thead><tr><th style="width:17%">Mes</th><th class="c">L a V</th><th class="c">Sáb.</th><th class="c">Dom.</th><th class="c">Fer.</th><th class="c">Jornadas</th>
      <th class="r">Honorarios</th><th class="r">Viático y movilidad</th><th class="r">Total del mes</th></tr></thead><tbody>
      ${r.meses.map((m) => `<tr><td style="text-transform:capitalize">${Calc.nombreMes(m.mes)}</td>${Calc.TIPOS.map((k) => `<td class="c">${m.porTipo[k].jornadas}</td>`).join('')}
        <td class="c">${m.jornadas}</td><td class="r">${P(m.honorarios)}</td><td class="r">${P(m.viatico + m.movilidad)}</td><td class="r"><b>${P(m.total)}</b></td></tr>`).join('')}
      <tr class="sum"><td>Total</td>${Calc.TIPOS.map((k) => `<td class="c">${r.total.porTipo[k].jornadas}</td>`).join('')}<td class="c">${r.total.jornadas}</td>
        <td class="r">${P(r.total.honorarios)}</td><td class="r">${P(r.total.viatico + r.total.movilidad)}</td><td class="r">${P(r.total.total)}</td></tr></tbody></table>`;

    const tt = Calc.turnoTipo(obra);
    const ejemplos = [
      ['2 h extra un día hábil', `2 × ${P(T.horaNoct.lv)}`, P(2 * T.horaNoct.lv)],
      ['2 h extra un sábado', `2 × ${P(T.horaNoct.sab)}`, P(2 * T.horaNoct.sab)],
      ['2 h extra un domingo o feriado', `2 × ${P(T.horaNoct.dom)}`, P(2 * T.horaNoct.dom)],
      ['Trabajar un día de descanso', 'Según el tipo de día + gastos', `${P(r.jornada.lv + r.viaticoJornada + r.movilidadJornada)} a ${P(r.jornada.dom + r.viaticoJornada + r.movilidadJornada)}`],
      ['Suspensión con aviso el día anterior', 'No se cobra', P(0)],
      ['Suspensión en las primeras 4 h (día hábil)', '50 % de la jornada + gastos', P(r.jornada.lv / 2 + r.viaticoJornada + r.movilidadJornada)],
      [`Un turno más de ${tt.jornadas} días`, `${tt.cantidad.lv} hábiles, ${tt.cantidad.sab} sábados, ${tt.cantidad.dom} domingos + gastos`, P(tt.total)],
    ];
    h += `<h2><span class="n">5</span>Qué pasa si…</h2><table><thead><tr><th style="width:44%">Situación</th><th>Cómo se cobra</th><th class="r" style="width:20%">Importe</th></tr></thead><tbody>
      ${ejemplos.map((e) => `<tr><td>${e[0]}</td><td>${e[1]}</td><td class="r">${e[2]}</td></tr>`).join('')}</tbody></table>`;

    const ref = Calc.num(t.valorReferencia);
    h += `<h2><span class="n">6</span>Control</h2><div class="note">El <b>promedio por hora de la obra es ${P(r.promedioHora)}</b> (${P(r.total.honorarios)} ÷ ${r.total.horas} h)${ref > 0 ? `, ${r.promedioHora >= ref ? 'por encima' : 'por debajo'} del valor de referencia de ${P(ref)} por hora` : ''}.
      ${!t.viaticoProveeEmpresa && r.total.viatico > 0 ? ` Si la empresa provee la comida, el total baja a ${P(r.total.total - r.total.viatico)}.` : ''}</div>`;
    return {
      html: documento(`Presupuesto detallado ${obra.presupuesto.numero}`, h),
      pie: pie(perfil, PAGINAS),
      nombre: nombreArchivo(`Presupuesto detallado ${obra.presupuesto.numero} - ${cli.razonSocial || obra.nombre}`),
    };
  }

  // =====================================================================
  // Liquidación mensual
  // =====================================================================
  function liquidacion(datos, obra, mes) {
    const perfil = datos.perfil;
    const r = Calc.calcular(obra, datos.feriados, { modo: 'real' });
    const m = r.meses.find((x) => x.mes === mes);
    if (!m) throw new Error('El mes no pertenece a la obra');
    const cli = clienteDe(datos, obra);
    const liq = (obra.liquidaciones || {})[mes] || {};
    const emision = liq.fechaEmision || Calc.hoyISO();
    const desde = m.primerTrabajado || m.desde, hasta = m.ultimoTrabajado || m.hasta;
    let h = encabezado(perfil, 'LIQUIDACIÓN', [
      `Período <b style="text-transform:capitalize">${Calc.nombreMes(mes)}</b>`,
      `Presupuesto N° <b>${esc(obra.presupuesto.numero)}</b>`,
      `Emitida el <b>${Calc.fechaNum(emision)}</b>`]);
    h += `<div class="title"><h1>Liquidación mensual de honorarios · <span style="text-transform:capitalize">${Calc.nombreMes(mes)}</span></h1>
      <p>${esc(obra.servicio)}${obra.lugar ? ` · <b>${esc([obra.lugar, obra.comitente].filter(Boolean).join(' – '))}</b>` : ''}</p></div>`;
    const cl = [cli.razonSocial && `<b>${esc(cli.razonSocial)}</b>`, cli.cuit && `CUIT ${esc(cli.cuit)}`].filter(Boolean).join(' · ');
    const c2 = [cli.domicilio, cli.localidad].filter(Boolean).map(esc).join(', ');
    const c3 = `Días trabajados del ${fe(desde)} al ${fe(hasta)} · jornada ${hora(obra.calendario.horaInicio)} a ${hora(obra.calendario.horaFin)} h`;
    h += `<div class="cards">${tarjetaProfesional(perfil)}<div class="card"><h3>Cliente</h3><div class="who4">${[cl || '—', c2, c3].filter(Boolean).join('<br>')}</div></div></div>`;

    const filas = m.dias.filter((d) => d.factor > 0 || d.estado.startsWith('susp_')).map((d) => {
      const est = { trabajado: '', susp_aviso: 'susp. con aviso', susp_parcial: 'susp. · 50 %', susp_total: 'susp. · 100 %' }[d.estado] || '';
      const tipo = Calc.TIPO_NOMBRE[d.tipo].replace('Lunes a viernes', 'Hábil');
      return `<tr class="${d.factor === 0 ? 'off' : ''}"><td>${Calc.fechaNum(d.fecha)}</td><td style="text-transform:capitalize">${Calc.DIAS[Calc.diaSemana(d.fecha)]}</td>
        <td>${tipo}${est ? ` <span class="muted">(${est})</span>` : ''}</td><td class="c">${d.horas || '—'}</td><td class="r">${P(d.valorHora)}</td>
        <td class="r">${P(d.honorarios)}</td><td class="c">${d.extraHoras || '—'}</td><td class="r">${d.extraImporte ? P(d.extraImporte) : '—'}</td>
        <td class="r">${d.viatico + d.movilidad ? P(d.viatico + d.movilidad) : '—'}</td><td class="r"><b>${P(d.total)}</b></td></tr>`;
    }).join('');
    h += `<h2>Detalle de jornadas</h2><table class="det"><thead><tr><th>Fecha</th><th>Día</th><th>Tipo</th><th class="c">Horas</th><th class="r">Valor hora</th>
      <th class="r">Honorarios</th><th class="c">Hs noct.</th><th class="r">Nocturnas</th><th class="r">Gastos</th><th class="r">Total</th></tr></thead><tbody>${filas ||
      '<tr><td colspan="10" class="c muted">Sin jornadas en el período</td></tr>'}</tbody></table>`;

    const res = Calc.TIPOS.filter((k) => m.porTipo[k].jornadas > 0).map((k) => {
      const pt = m.porTipo[k];
      return `<tr><td>${Calc.TIPO_PLURAL[k]}</td><td class="c">${pt.jornadas}</td><td class="c">${pt.horas}</td><td class="r">${P(r.T.hora[k])}</td><td class="r">${P(pt.honorarios)}</td></tr>`;
    });
    if (m.extraHoras) res.push(`<tr><td>Horas nocturnas o fuera de horario</td><td class="c">—</td><td class="c">${m.extraHoras}</td><td class="r">—</td><td class="r">${P(m.extraImporte)}</td></tr>`);
    if (m.viatico) res.push(`<tr><td>Viático de comida</td><td class="c">${m.jornadas}</td><td class="c">—</td><td class="r">${P(r.viaticoJornada)}</td><td class="r">${P(m.viatico)}</td></tr>`);
    if (m.movilidad) res.push(`<tr><td>Movilidad</td><td class="c">${m.jornadas}</td><td class="c">—</td><td class="r">${P(r.movilidadJornada)}</td><td class="r">${P(m.movilidad)}</td></tr>`);
    h += `<h2>Resumen del período</h2><table><thead><tr><th>Concepto</th><th class="c" style="width:12%">Jornadas</th><th class="c" style="width:10%">Horas</th>
      <th class="r" style="width:17%">Valor</th><th class="r" style="width:18%">Importe</th></tr></thead><tbody>${res.join('')}</tbody></table>`;
    h += `<div class="cierre"><div class="totbox"><div class="l">Total del período<small>${textoIVA(perfil)}</small></div><div class="v num">${P(m.total)}</div></div>
      <div class="letras">${Calc.pesosEnLetras(m.total)}.</div>`;
    h += `<div class="pago"><div><span>Comprobante C N°</span>${esc(liq.comprobante) || '&nbsp;'}</div><div><span>Fecha de pago</span>${liq.fechaPago ? Calc.fechaNum(liq.fechaPago) : '&nbsp;'}</div>
      <div><span>Forma de pago</span>${esc(liq.formaPago || 'Transferencia bancaria')}</div></div>`;
    if (liq.observaciones) h += `<p class="small" style="margin-top:6px"><b>Observaciones:</b> ${esc(liq.observaciones)}</p>`;
    h += `<p class="small muted" style="margin:5px 0 0">Detalle de horas y jornadas según el parte de asistencia. Acompaña al comprobante C emitido en ARCA y no lo reemplaza.</p>`;
    h += firma(perfil, 'Quedo a disposición ante cualquier consulta sobre esta liquidación.') + '</div>';
    return {
      html: documento(`Liquidación ${Calc.nombreMes(mes)}`, h, 'compacto'),
      pie: pie(perfil, PAGINAS),
      nombre: nombreArchivo(`Liquidación ${Calc.nombreMes(mes)} - ${cli.razonSocial || obra.nombre}`),
    };
  }

  return { CSS, esc, md, presupuestoCliente, presupuestoDetallado, liquidacion };
});
