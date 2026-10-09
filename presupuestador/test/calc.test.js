const test = require('node:test');
const assert = require('node:assert/strict');
const Calc = require('../src/shared/calc.js');
const Defaults = require('../src/shared/defaults.js');

function obraEjemplo(extra) {
  const o = Defaults.nuevaObra({ numeracion: { presupuesto: 1 } }, '2026-10-09');
  o.calendario.inicio = '2026-10-14';
  return Object.assign(o, extra || {});
}

test('jornada de 08:00 a 20:00 son 12 horas', () => {
  assert.equal(Calc.horasJornada({ horaInicio: '08:00', horaFin: '20:00' }), 12);
  assert.equal(Calc.horasJornada({ horaInicio: '20:00', horaFin: '08:00' }), 12);
  assert.equal(Calc.horasJornada({ horaInicio: '07:30', horaFin: '16:00' }), 8.5);
});

test('valores hora con recargos acumulables', () => {
  const T = Calc.tarifas(Defaults.TARIFAS);
  assert.deepEqual(T.hora, { lv: 13000, sab: 19500, dom: 26000, fer: 26000 });
  assert.deepEqual(T.horaNoct, { lv: 19500, sab: 26000, dom: 32500, fer: 32500 });
});

test('obra de 60 días desde el 14/10/2026 con diagrama 14 × 3 y feriados reales', () => {
  const r = Calc.calcular(obraEjemplo(), Defaults.FERIADOS, { modo: 'presupuesto' });
  assert.equal(r.fin, '2026-12-12');
  const c = Object.fromEntries(Calc.TIPOS.map((k) => [k, r.total.porTipo[k].jornadas]));
  assert.deepEqual(c, { lv: 32, sab: 8, dom: 7, fer: 4 });
  assert.equal(r.total.jornadas, 51);
  assert.equal(r.total.horas, 612);
  assert.equal(r.total.honorarios, 10296000);
  assert.equal(r.total.viatico, 612000);
  assert.equal(r.total.total, 10908000);
  assert.deepEqual(r.meses.map((m) => [m.mes, m.total]),
    [['2026-10', 3066000], ['2026-11', 5862000], ['2026-12', 1980000]]);
  assert.deepEqual(r.turnos.map((t) => [t.desde, t.hasta, t.jornadas]), [
    ['2026-10-14', '2026-10-27', 14], ['2026-10-31', '2026-11-13', 14],
    ['2026-11-17', '2026-11-30', 14], ['2026-12-04', '2026-12-12', 9]]);
  const fer = r.feriadosPeriodo.filter((f) => f.trabajado && f.tipo === 'feriado').map((f) => f.fecha);
  assert.deepEqual(fer, ['2026-11-09', '2026-11-10', '2026-11-23', '2026-12-08']);
});

test('si la empresa provee la comida no se cobra viático', () => {
  const o = obraEjemplo();
  o.tarifas.viaticoProveeEmpresa = true;
  const r = Calc.calcular(o, Defaults.FERIADOS, { modo: 'presupuesto' });
  assert.equal(r.total.viatico, 0);
  assert.equal(r.total.total, 10296000);
});

test('liquidación real: suspensiones, horas extra y feriado forzado', () => {
  const o = obraEjemplo();
  o.dias = {
    '2026-10-15': { estado: 'susp_aviso' },          // jueves: no se cobra
    '2026-10-16': { estado: 'susp_parcial' },        // viernes: 50 % + viático
    '2026-10-19': { horasExtra: 2 },                 // lunes: 2 h nocturnas a 19.500
    '2026-10-20': { tipo: 'feriado' },               // martes marcado feriado
    '2026-10-28': { estado: 'trabajado' },           // día de descanso trabajado (miércoles)
  };
  const real = Calc.calcular(o, Defaults.FERIADOS, { modo: 'real' });
  const oct = real.meses[0];
  // Octubre planificado: 3.066.000. Cambios:
  // −(156.000 + 12.000) suspendido con aviso; −78.000 por el 50 %; +39.000 extra;
  // +156.000 por feriado forzado; +168.000 por descanso trabajado.
  assert.equal(oct.total, 3066000 - 168000 - 78000 + 39000 + 156000 + 168000);
  assert.equal(oct.extraHoras, 2);
  assert.equal(oct.susp, 2);
  const plan = Calc.calcular(o, Defaults.FERIADOS, { modo: 'presupuesto' });
  assert.equal(plan.meses[0].extraHoras, 0);
});

test('importes en letras', () => {
  const casos = {
    10908000: 'diez millones novecientos ocho mil',
    3066000: 'tres millones sesenta y seis mil',
    1980000: 'un millón novecientos ochenta mil',
    21000: 'veintiún mil',
    31000: 'treinta y un mil',
    121000: 'ciento veintiún mil',
    101: 'ciento uno',
    100: 'cien',
    1001: 'mil uno',
    21000000: 'veintiún millones',
    500700: 'quinientos mil setecientos',
    0: 'cero',
  };
  for (const [n, txt] of Object.entries(casos)) assert.equal(Calc.enLetras(Number(n)), txt, n);
  assert.equal(Calc.pesosEnLetras(5862000), 'Son pesos cinco millones ochocientos sesenta y dos mil con 00/100');
});

test('formato de importes y fechas', () => {
  assert.equal(Calc.pesos(10908000), '$ 10.908.000');
  assert.equal(Calc.fechaLarga('2026-10-09'), '9 de octubre de 2026');
  assert.equal(Calc.diaYFecha('2026-11-23'), 'lunes 23/11');
  assert.equal(Calc.nombreMes('2026-12'), 'diciembre 2026');
  assert.ok(Calc.esFechaValida('2026-02-28'));
  assert.ok(!Calc.esFechaValida('2026-02-30'));
});

test('normalizar completa datos viejos sin perder lo cargado', () => {
  const d = Defaults.normalizar({ perfil: { nombre: 'Ana' }, obras: [{ id: 'x', nombre: 'A', tarifas: { valorHora: 20000 } }] });
  assert.equal(d.perfil.nombre, 'Ana');
  assert.equal(d.perfil.condicionFiscal, 'Monotributo');
  assert.equal(d.obras[0].tarifas.valorHora, 20000);
  assert.equal(d.obras[0].tarifas.recSabado, 50);
  assert.equal(d.obras[0].calendario.diasTrabajo, 14);
  assert.ok(d.feriados.length > 20);
});

test('turno tipo de 14 días', () => {
  const t = Calc.turnoTipo(obraEjemplo());
  assert.deepEqual(t.cantidad, { lv: 10, sab: 2, dom: 2 });
  assert.equal(t.honorarios, 2652000);
  assert.equal(t.gastos, 168000);
});
