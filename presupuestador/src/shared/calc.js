/* Cálculos del Presupuestador HyS.
 * Funciona en Node (pruebas y proceso principal) y en el navegador (interfaz).
 * Las fechas se manejan como texto "AAAA-MM-DD" y se calculan en UTC para evitar
 * corrimientos por zona horaria. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Calc = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TIPOS = ['lv', 'sab', 'dom', 'fer'];
  const TIPO_NOMBRE = { lv: 'Lunes a viernes', sab: 'Sábado', dom: 'Domingo', fer: 'Feriado' };
  const TIPO_PLURAL = { lv: 'Lunes a viernes', sab: 'Sábados', dom: 'Domingos', fer: 'Feriados' };
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const DIAS_LETRA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'];

  // Estado de cada día y qué porción de la jornada se cobra.
  const ESTADOS = {
    trabajado: 'Trabajado',
    descanso: 'Descanso',
    susp_aviso: 'Suspendido con aviso previo',
    susp_parcial: 'Suspendido en las primeras 4 h',
    susp_total: 'Suspendido después de 4 h',
  };
  const FACTOR = { trabajado: 1, descanso: 0, susp_aviso: 0, susp_parcial: 0.5, susp_total: 1 };

  // ---------- Fechas ----------
  function parse(iso) {
    const [y, m, d] = String(iso).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  function iso(date) { return date.toISOString().slice(0, 10); }
  function sumarDias(fecha, n) { const d = parse(fecha); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
  function diaSemana(fecha) { return parse(fecha).getUTCDay(); } // 0 = domingo
  function esFechaValida(fecha) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(fecha)) && iso(parse(fecha)) === fecha;
  }
  function fechaCorta(fecha) { const [, m, d] = fecha.split('-'); return `${d}/${m}`; }
  function fechaNum(fecha) { const [y, m, d] = fecha.split('-'); return `${d}/${m}/${y}`; }
  function fechaLarga(fecha) {
    const d = parse(fecha);
    return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
  }
  function diaYFecha(fecha) { return `${DIAS[diaSemana(fecha)]} ${fechaCorta(fecha)}`; }
  function nombreMes(mes) { // "2026-10" → "octubre 2026"
    const [y, m] = mes.split('-').map(Number);
    return `${MESES[m - 1]} ${y}`;
  }
  function hoyISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ---------- Números ----------
  function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  function miles(n) {
    const neg = n < 0;
    const s = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '−' : '') + s;
  }
  function pesos(n) { return (n < 0 ? '− ' : '') + '$ ' + miles(Math.abs(n)); }
  // Horas con hasta dos decimales y coma decimal: 12 → '12', 9.5 → '9,5'.
  function horas(h) { return String(Math.round(num(h) * 100) / 100).replace('.', ','); }
  function porcentaje(x) { return (x > 0 ? '+' : '') + String(Math.round(x * 10) / 10).replace('.', ',') + ' %'; }

  const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
    'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
    'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete',
    'veintiocho', 'veintinueve'];
  const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos',
    'setecientos', 'ochocientos', 'novecientos'];

  function menorMil(n) {
    if (n === 0) return '';
    if (n === 100) return 'cien';
    const c = Math.floor(n / 100), r = n % 100;
    let s = CENTENAS[c];
    if (r) {
      const t = r < 30 ? UNIDADES[r] : DECENAS[Math.floor(r / 10)] + (r % 10 ? ' y ' + UNIDADES[r % 10] : '');
      s += (s ? ' ' : '') + t;
    }
    return s;
  }
  // "uno" delante de "mil" o "millones" se apocopa: "veintiún mil", "treinta y un millones".
  function apocopar(s) { return s.replace(/veintiuno$/, 'veintiún').replace(/(^|\s)uno$/, '$1un'); }

  function enLetras(n) {
    n = Math.floor(Math.abs(n));
    if (n === 0) return 'cero';
    const partes = [];
    const millones = Math.floor(n / 1e6), milesN = Math.floor((n % 1e6) / 1000), resto = n % 1000;
    if (millones) partes.push(millones === 1 ? 'un millón' : apocopar(enLetras(millones)) + ' millones');
    if (milesN) partes.push(milesN === 1 ? 'mil' : apocopar(menorMil(milesN)) + ' mil');
    if (resto) partes.push(menorMil(resto));
    return partes.join(' ');
  }
  function pesosEnLetras(monto) {
    const entero = Math.floor(Math.round(monto * 100) / 100);
    const cent = Math.round((monto - entero) * 100);
    return `Son pesos ${enLetras(entero)} con ${String(cent).padStart(2, '0')}/100`;
  }

  // ---------- Tarifas ----------
  function minutos(hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
    return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
  }
  function horasJornada(cal) {
    const a = minutos(cal.horaInicio), b = minutos(cal.horaFin);
    if (Number.isNaN(a) || Number.isNaN(b)) return 0;
    let d = b - a;
    if (d <= 0) d += 24 * 60;
    return d / 60;
  }

  // Recargos acumulables sobre el valor base: tipo de día + horario nocturno.
  function tarifas(t) {
    const base = num(t.valorHora);
    const rec = { lv: 0, sab: num(t.recSabado) / 100, dom: num(t.recDomFer) / 100, fer: num(t.recDomFer) / 100 };
    const noct = num(t.recNocturno) / 100;
    const hora = {}, horaNoct = {};
    for (const k of TIPOS) {
      hora[k] = Math.round(base * (1 + rec[k]));
      horaNoct[k] = Math.round(base * (1 + rec[k] + noct));
    }
    return { base, rec, noct, hora, horaNoct };
  }

  // ---------- Feriados ----------
  function indiceFeriados(feriados) {
    const idx = {};
    for (const f of feriados || []) {
      if (!f || !esFechaValida(f.fecha)) continue;
      const prev = idx[f.fecha];
      if (!prev || (prev.tipo !== 'feriado' && f.tipo === 'feriado')) idx[f.fecha] = f;
    }
    return idx;
  }

  // ---------- Días de la obra ----------
  function construirDias(obra, feriados) {
    const c = obra.calendario || {};
    const trabajo = Math.max(1, Math.floor(num(c.diasTrabajo)));
    const descanso = Math.max(0, Math.floor(num(c.diasDescanso)));
    const duracion = Math.max(0, Math.min(1500, Math.floor(num(c.duracionDias))));
    if (!esFechaValida(c.inicio)) return [];
    const ciclo = trabajo + descanso;
    const idx = indiceFeriados(feriados);
    const ajustes = obra.dias || {};
    const dias = [];
    for (let i = 0; i < duracion; i++) {
      const fecha = sumarDias(c.inicio, i);
      const plan = (i % ciclo) < trabajo;
      const aj = ajustes[fecha] || {};
      const estado = ESTADOS[aj.estado] ? aj.estado : (plan ? 'trabajado' : 'descanso');
      const feriado = idx[fecha] || null;
      const ds = diaSemana(fecha);
      const tipoSemana = ds === 0 ? 'dom' : ds === 6 ? 'sab' : 'lv';
      let tipo;
      if (aj.tipo === 'feriado') tipo = 'fer';
      else if (aj.tipo === 'normal') tipo = tipoSemana;
      else tipo = feriado && feriado.tipo === 'feriado' ? 'fer' : tipoSemana;
      dias.push({
        fecha, indice: i, turno: Math.floor(i / ciclo) + 1, plan, estado, tipo, tipoSemana,
        feriado, ajustado: !!(aj.estado || aj.tipo || num(aj.horasExtra) || aj.nota),
        tipoForzado: aj.tipo || '', horasExtra: Math.max(0, num(aj.horasExtra)), nota: aj.nota || '',
      });
    }
    return dias;
  }

  function vacio() {
    const porTipo = {};
    for (const k of TIPOS) porTipo[k] = { jornadas: 0, horas: 0, honorarios: 0 };
    return { porTipo, jornadas: 0, horas: 0, honorarios: 0, extraHoras: 0, extraImporte: 0, viatico: 0,
      movilidad: 0, total: 0, susp: 0 };
  }
  function acumular(a, d) {
    if (d.factor > 0) {
      a.porTipo[d.tipo].jornadas += 1;
      a.porTipo[d.tipo].horas += d.horas;
      a.porTipo[d.tipo].honorarios += d.honorarios;
      a.jornadas += 1;
      a.horas += d.horas;
    }
    if (d.estado.startsWith('susp_')) a.susp += 1;
    a.honorarios += d.honorarios;
    a.extraHoras += d.extraHoras;
    a.extraImporte += d.extraImporte;
    a.viatico += d.viatico;
    a.movilidad += d.movilidad;
    a.total += d.total;
    return a;
  }

  /* modo "presupuesto": plan de trabajo (las suspensiones cuentan como trabajadas y no hay horas extra).
   * modo "real": lo cargado en el calendario, para las liquidaciones mensuales. */
  function calcular(obra, feriados, opciones) {
    const modo = (opciones && opciones.modo) || 'real';
    const H = horasJornada(obra.calendario || {});
    const T = tarifas(obra.tarifas || {});
    const t = obra.tarifas || {};
    const viat = t.viaticoProveeEmpresa ? 0 : num(t.viatico);
    const mov = num(t.movilidad);
    const dias = construirDias(obra, feriados).map((d) => {
      let estado = d.estado, horasExtra = d.horasExtra;
      if (modo === 'presupuesto') {
        if (estado.startsWith('susp_')) estado = 'trabajado';
        horasExtra = 0;
      }
      const factor = FACTOR[estado] || 0;
      const honorarios = Math.round(T.hora[d.tipo] * H * factor);
      const extraHoras = estado === 'trabajado' ? horasExtra : 0;
      const extraImporte = Math.round(extraHoras * T.horaNoct[d.tipo]);
      const viatico = factor > 0 ? viat : 0;
      const movilidad = factor > 0 ? mov : 0;
      return Object.assign({}, d, {
        estado, factor, horas: H * factor, valorHora: T.hora[d.tipo], valorHoraNoct: T.horaNoct[d.tipo],
        honorarios, extraHoras, extraImporte, viatico, movilidad,
        total: honorarios + extraImporte + viatico + movilidad,
      });
    });

    const total = dias.reduce(acumular, vacio());
    const mapaMeses = {};
    for (const d of dias) {
      const m = d.fecha.slice(0, 7);
      if (!mapaMeses[m]) mapaMeses[m] = Object.assign(vacio(), { mes: m, desde: d.fecha, hasta: d.fecha, dias: [] });
      const r = mapaMeses[m];
      acumular(r, d);
      r.hasta = d.fecha;
      r.dias.push(d);
      if (d.factor > 0) { r.primerTrabajado = r.primerTrabajado || d.fecha; r.ultimoTrabajado = d.fecha; }
    }
    const meses = Object.keys(mapaMeses).sort().map((k) => mapaMeses[k]);

    const turnos = [];
    for (const d of dias) {
      if (!d.plan) continue;
      let tr = turnos[turnos.length - 1];
      if (!tr || tr.numero !== d.turno) { tr = { numero: d.turno, desde: d.fecha, hasta: d.fecha, jornadas: 0 }; turnos.push(tr); }
      tr.hasta = d.fecha;
      tr.jornadas += 1;
    }
    const diasTrabajo = Math.max(1, Math.floor(num((obra.calendario || {}).diasTrabajo)));
    for (const tr of turnos) tr.completo = tr.jornadas >= diasTrabajo;

    const feriadosPeriodo = dias.filter((d) => d.feriado || d.tipoForzado === 'feriado').map((d) => ({
      fecha: d.fecha, nombre: d.feriado ? d.feriado.nombre : 'Feriado marcado en la obra',
      tipo: d.tipoForzado === 'feriado' ? 'feriado' : d.feriado.tipo, trabajado: d.factor > 0, cobraComo: d.tipo,
    }));

    return {
      modo, H, T, viaticoJornada: viat, movilidadJornada: mov, dias, total, meses, turnos, feriadosPeriodo,
      inicio: dias.length ? dias[0].fecha : null, fin: dias.length ? dias[dias.length - 1].fecha : null,
      promedioHora: total.horas ? total.honorarios / total.horas : 0,
      jornada: Object.fromEntries(TIPOS.map((k) => [k, Math.round(T.hora[k] * H)])),
    };
  }

  // Valor de un turno típico completo (días hábiles, sábados y domingos sin feriados).
  function turnoTipo(obra) {
    const H = horasJornada(obra.calendario || {});
    const T = tarifas(obra.tarifas || {});
    const n = Math.max(1, Math.floor(num((obra.calendario || {}).diasTrabajo)));
    const c = { lv: 0, sab: 0, dom: 0 };
    for (let i = 0; i < n; i++) { const r = i % 7; c[r < 5 ? 'lv' : r === 5 ? 'sab' : 'dom'] += 1; }
    const honorarios = c.lv * T.hora.lv * H + c.sab * T.hora.sab * H + c.dom * T.hora.dom * H;
    const t = obra.tarifas || {};
    const gastos = n * ((t.viaticoProveeEmpresa ? 0 : num(t.viatico)) + num(t.movilidad));
    return { cantidad: c, jornadas: n, honorarios: Math.round(honorarios), gastos, total: Math.round(honorarios) + gastos };
  }

  return {
    TIPOS, TIPO_NOMBRE, TIPO_PLURAL, DIAS, DIAS_LETRA, MESES, ESTADOS, FACTOR,
    parse, iso, sumarDias, diaSemana, esFechaValida, fechaCorta, fechaNum, fechaLarga, diaYFecha, nombreMes, hoyISO,
    num, miles, pesos, horas, porcentaje, enLetras, pesosEnLetras,
    horasJornada, tarifas, indiceFeriados, construirDias, calcular, turnoTipo,
  };
});
