/* Datos iniciales y normalización del archivo de datos del Presupuestador HyS. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Defaults = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 2: las condiciones usan {disponibilidad} en lugar de la fecha de inicio.
  const VERSION_DATOS = 2;

  // Feriados de Argentina. Los trasladables de 2027 se publican por decreto: agregarlos cuando salgan.
  const FERIADOS = [
    ['2026-01-01', 'Año Nuevo', 'feriado', 'Nacional'],
    ['2026-02-16', 'Carnaval', 'feriado', 'Nacional'],
    ['2026-02-17', 'Carnaval', 'feriado', 'Nacional'],
    ['2026-03-23', 'Día no laborable con fines turísticos', 'no_laborable', 'Nacional'],
    ['2026-03-24', 'Día Nacional de la Memoria por la Verdad y la Justicia', 'feriado', 'Nacional'],
    ['2026-04-02', 'Día del Veterano y de los Caídos en Malvinas', 'feriado', 'Nacional'],
    ['2026-04-03', 'Viernes Santo', 'feriado', 'Nacional'],
    ['2026-05-01', 'Día del Trabajador', 'feriado', 'Nacional'],
    ['2026-05-25', 'Revolución de Mayo', 'feriado', 'Nacional'],
    ['2026-06-15', 'Paso a la Inmortalidad de Güemes (trasladado)', 'feriado', 'Nacional'],
    ['2026-06-20', 'Paso a la Inmortalidad de Belgrano', 'feriado', 'Nacional'],
    ['2026-07-09', 'Día de la Independencia', 'feriado', 'Nacional'],
    ['2026-07-10', 'Día no laborable con fines turísticos', 'no_laborable', 'Nacional'],
    ['2026-08-17', 'Paso a la Inmortalidad de San Martín', 'feriado', 'Nacional'],
    ['2026-10-12', 'Día del Respeto a la Diversidad Cultural', 'feriado', 'Nacional'],
    ['2026-11-09', 'Visita del Papa León XIV (Decreto 1103/2026)', 'feriado', 'Nacional'],
    ['2026-11-10', 'Visita del Papa León XIV (Decreto 1103/2026)', 'feriado', 'Córdoba y CABA'],
    ['2026-11-23', 'Día de la Soberanía Nacional (trasladado del 20/11)', 'feriado', 'Nacional'],
    ['2026-12-07', 'Día no laborable con fines turísticos', 'no_laborable', 'Nacional'],
    ['2026-12-08', 'Inmaculada Concepción de María', 'feriado', 'Nacional'],
    ['2026-12-25', 'Navidad', 'feriado', 'Nacional'],
    ['2027-01-01', 'Año Nuevo', 'feriado', 'Nacional'],
    ['2027-02-08', 'Carnaval', 'feriado', 'Nacional'],
    ['2027-02-09', 'Carnaval', 'feriado', 'Nacional'],
    ['2027-03-24', 'Día Nacional de la Memoria por la Verdad y la Justicia', 'feriado', 'Nacional'],
    ['2027-03-26', 'Viernes Santo', 'feriado', 'Nacional'],
    ['2027-04-02', 'Día del Veterano y de los Caídos en Malvinas', 'feriado', 'Nacional'],
    ['2027-05-01', 'Día del Trabajador', 'feriado', 'Nacional'],
    ['2027-05-25', 'Revolución de Mayo', 'feriado', 'Nacional'],
    ['2027-06-20', 'Paso a la Inmortalidad de Belgrano', 'feriado', 'Nacional'],
    ['2027-07-09', 'Día de la Independencia', 'feriado', 'Nacional'],
    ['2027-12-08', 'Inmaculada Concepción de María', 'feriado', 'Nacional'],
    ['2027-12-25', 'Navidad', 'feriado', 'Nacional'],
  ].map(([fecha, nombre, tipo, ambito]) => ({ fecha, nombre, tipo, ambito }));

  const SERVICIOS = [
    'Presencia permanente en obra todo el diagrama.',
    '**Supervisión de las tareas en campo:** métodos y condiciones seguras.',
    'Documentación de ingreso, inducción y charlas diarias.',
    'ATS y permisos de trabajo (caliente, altura, izaje).',
    'Control de riesgo eléctrico y distancias de seguridad.',
    'Prevención de incendios en trabajos en caliente.',
    'Inspección de herramientas, equipos de izaje y EPP.',
    'Investigación de incidentes y gestión ante la ART.',
    'Acompañamiento en inspecciones del comitente y de la ART.',
    'Parte diario, informe semanal y legajo de obra.',
  ];

  const CONDICIONES = [
    '**Facturación mensual** con comprobante C (Factura o Recibo C) por las horas trabajadas en el mes, según el parte de asistencia. Pago por transferencia a 7 días.',
    '**Viático de comida:** {viatico} por jornada; no se cobra si la empresa provee la comida. Movilidad: sin cargo.',
    '**Jornadas:** los descansos no se facturan. Suspensión por causas ajenas al profesional: sin cargo con aviso el día anterior; 50% en las primeras 4 h; completa después.',
    '**Precio fijo** durante 60 días corridos; luego se actualiza en la misma proporción que el valor módulo COPHISEC.',
    '**{disponibilidad}.** Matrícula, póliza de accidentes personales a favor de {comitente} y Monotributo al día antes del ingreso.',
    '**No incluye:** EPP, extintores, señalización ni botiquín del personal de la empresa, ni mediciones de higiene.',
  ];

  const TARIFAS = {
    valorHora: 13000, recSabado: 50, recDomFer: 100, recNocturno: 50,
    viatico: 12000, viaticoProveeEmpresa: false, movilidad: 0, valorReferencia: 14300,
  };

  function perfilVacio() {
    return { nombre: '', titulo: 'Técnico en Higiene y Seguridad en el Trabajo', matricula: '', cuil: '',
      condicionFiscal: 'Monotributo', telefono: '', email: '', domicilio: '', ciudad: '', logo: '' };
  }

  function nuevoId() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

  function nuevaObra(datos, hoy) {
    const anio = (hoy || '').slice(0, 4) || String(new Date().getFullYear());
    const n = (datos && datos.numeracion && datos.numeracion.presupuesto) || 1;
    return {
      id: nuevoId(), nombre: 'Nueva obra', clienteId: '', creada: hoy || '',
      servicio: 'Servicio de Higiene y Seguridad con presencia permanente en obra',
      tarea: '', lugar: '', comitente: '', dotacion: '',
      presupuesto: { numero: `${String(n).padStart(4, '0')}-${anio}`, fecha: hoy || '', validezDias: 15,
        disponibilidad: 'Disponibilidad inmediata', mostrarTotales: false },
      calendario: { inicio: hoy || '', diasTrabajo: 14, diasDescanso: 3, duracionDias: 60, horaInicio: '08:00', horaFin: '20:00' },
      tarifas: Object.assign({}, TARIFAS),
      servicios: SERVICIOS.slice(), condiciones: CONDICIONES.slice(),
      dias: {}, liquidaciones: {},
    };
  }

  function datosIniciales() {
    return { version: VERSION_DATOS, perfil: perfilVacio(), clientes: [], obras: [],
      feriados: FERIADOS.map((f) => Object.assign({}, f)), numeracion: { presupuesto: 1 } };
  }

  // Versiones anteriores ponían la fecha de inicio en las condiciones; ahora va la disponibilidad.
  function migrarCondicion(texto) {
    return String(texto).replace(/^\s*\*\*Inicio:\*\*\s*\{inicio\}\.\s*/i, '**{disponibilidad}.** ');
  }

  // Completa campos faltantes (archivos viejos o importados) sin pisar lo existente.
  function normalizar(d) {
    const base = datosIniciales();
    if (!d || typeof d !== 'object') return base;
    const out = Object.assign({}, base, d);
    out.version = VERSION_DATOS;
    out.perfil = Object.assign(perfilVacio(), d.perfil || {});
    out.clientes = Array.isArray(d.clientes) ? d.clientes.map((c) => Object.assign(
      { id: nuevoId(), razonSocial: '', cuit: '', domicilio: '', localidad: '', contacto: '', email: '', telefono: '' }, c)) : [];
    out.feriados = Array.isArray(d.feriados) ? d.feriados.filter((f) => f && f.fecha) : base.feriados;
    out.numeracion = Object.assign({ presupuesto: 1 }, d.numeracion || {});
    const migrar = !(Number(d.version) >= 2); // una sola vez: después se respeta lo que escriba el usuario
    out.obras = Array.isArray(d.obras) ? d.obras.map((o) => {
      const plantilla = nuevaObra(out, '');
      const ob = Object.assign({}, plantilla, o);
      ob.id = o.id || nuevoId();
      ob.presupuesto = Object.assign({}, plantilla.presupuesto, o.presupuesto || {});
      ob.calendario = Object.assign({}, plantilla.calendario, o.calendario || {});
      ob.tarifas = Object.assign({}, TARIFAS, o.tarifas || {});
      ob.servicios = Array.isArray(o.servicios) ? o.servicios : SERVICIOS.slice();
      ob.condiciones = Array.isArray(o.condiciones) ? (migrar ? o.condiciones.map(migrarCondicion) : o.condiciones) : CONDICIONES.slice();
      ob.dias = o.dias && typeof o.dias === 'object' ? o.dias : {};
      ob.liquidaciones = o.liquidaciones && typeof o.liquidaciones === 'object' ? o.liquidaciones : {};
      return ob;
    }) : [];
    return out;
  }

  return { VERSION_DATOS, FERIADOS, SERVICIOS, CONDICIONES, TARIFAS, perfilVacio, nuevoId, nuevaObra, datosIniciales, normalizar };
});
