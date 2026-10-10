const test = require('node:test');
const assert = require('node:assert/strict');
const Calc = require('../src/shared/calc.js');
const Defaults = require('../src/shared/defaults.js');
const Plantillas = require('../src/shared/templates.js');

function datos(extra) {
  const d = Defaults.datosIniciales();
  d.perfil = Object.assign(d.perfil, { nombre: 'Técnico de Prueba', matricula: 'MAT 0-00000', cuil: '20-00000000-0', telefono: '0000-000000', ciudad: 'Córdoba' });
  d.clientes.push({ id: 'c1', razonSocial: 'Empresa Ejemplo S.A.', contacto: 'Área de Recursos Humanos' });
  const o = Defaults.nuevaObra(d, '2026-10-09');
  Object.assign(o, { clienteId: 'c1', comitente: 'Comitente S.A.', lugar: 'Planta', dotacion: '7' });
  o.calendario.inicio = '2026-10-14';
  Object.assign(o.presupuesto, extra || {});
  d.obras.push(o);
  return { d, o };
}
// Texto visible del HTML, sin etiquetas.
const texto = (html) => html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('presupuesto para el cliente: solo precios, sin total ni fechas de obra', () => {
  const { d, o } = datos();
  const r = Calc.calcular(o, d.feriados, { modo: 'presupuesto' });
  const t = texto(Plantillas.presupuestoCliente(d, o).html);
  for (const precio of ['13.000', '19.500', '26.000', '32.500', '156.000', '234.000', '312.000', '12.000']) {
    assert.ok(t.includes(`$ ${precio}`), `falta el precio ${precio}`);
  }
  assert.ok(t.includes('Disponibilidad inmediata'));
  assert.ok(!/total estimado/i.test(t), 'no debe mostrar el total estimado');
  assert.ok(!/total honorarios/i.test(t), 'no debe mostrar el total de honorarios');
  assert.ok(!t.includes(Calc.miles(r.total.total)), 'no debe aparecer el importe total');
  assert.ok(!t.includes(Calc.miles(r.total.honorarios)), 'no debe aparecer el total de honorarios');
  for (const m of r.meses) assert.ok(!t.includes(Calc.miles(m.total)), 'no debe aparecer la facturación mensual');
  assert.ok(!/14\/10|12\/12|Inicio /.test(t), 'no debe aparecer la fecha de inicio ni de fin');
  assert.ok(!/Turnos:|Feriados trabajados|Facturación mensual estimada/.test(t));
  assert.ok(!/\{\w+\}/.test(t), 'no deben quedar variables sin reemplazar');
});

test('la disponibilidad se puede editar y reemplaza a {disponibilidad} en las condiciones', () => {
  const { d, o } = datos({ disponibilidad: 'Disponible desde la semana próxima' });
  const t = texto(Plantillas.presupuestoCliente(d, o).html);
  assert.ok(t.includes('Disponible desde la semana próxima'));
  assert.ok(t.includes('Disponible desde la semana próxima. Matrícula'), 'la condición debe usar la disponibilidad');
});

test('un texto editado con {inicio} o {fin} no muestra fechas si no van los totales', () => {
  const { d, o } = datos();
  o.condiciones = ['**Inicio estimado:** {inicio}; fin {fin}.', '  **Inicio:** {inicio}. Matrícula al día.'];
  const t = texto(Plantillas.presupuestoCliente(d, o).html);
  assert.ok(!/\d{1,2}\/\d{1,2}/.test(t.replace(/\$ [\d.]+/g, '')), 'no debe aparecer ninguna fecha de obra');
  assert.ok(t.includes('Inicio estimado: disponibilidad inmediata; fin según el avance de la obra.'));
  const n = Defaults.normalizar({ obras: [{ condiciones: o.condiciones }] });
  assert.equal(n.obras[0].condiciones[1], '**{disponibilidad}.** Matrícula al día.');
});

test('con la casilla activada vuelven el total y las fechas', () => {
  const { d, o } = datos({ mostrarTotales: true });
  const r = Calc.calcular(o, d.feriados, { modo: 'presupuesto' });
  const t = texto(Plantillas.presupuestoCliente(d, o).html);
  assert.ok(/total estimado/i.test(t));
  assert.ok(t.includes(Calc.miles(r.total.total)));
  assert.ok(t.includes('14/10/2026'));
});

test('condición vieja con la fecha de inicio se convierte a disponibilidad', () => {
  const vieja = '**Inicio:** {inicio}. Matrícula, póliza de AP a favor de EPEC S.A.U. y Monotributo al día antes del ingreso.';
  const n = Defaults.normalizar({ obras: [{ condiciones: [vieja] }] });
  assert.equal(n.obras[0].condiciones[0], '**{disponibilidad}.** Matrícula, póliza de AP a favor de EPEC S.A.U. y Monotributo al día antes del ingreso.');
  assert.equal(n.obras[0].presupuesto.disponibilidad, 'Disponibilidad inmediata');
  assert.equal(n.obras[0].presupuesto.mostrarTotales, false);
});

test('el presupuesto detallado interno y la liquidación siguen mostrando totales', () => {
  const { d, o } = datos();
  const r = Calc.calcular(o, d.feriados, { modo: 'presupuesto' });
  assert.ok(texto(Plantillas.presupuestoDetallado(d, o).html).includes(Calc.miles(r.total.total)));
  const liq = texto(Plantillas.liquidacion(d, o, '2026-10').html);
  assert.ok(/Total del período/i.test(liq));
});

test('la migración corre una sola vez: con datos versión 2 se respeta el texto del usuario', () => {
  const propia = '**Inicio:** {inicio}. Matrícula al día.';
  const n = Defaults.normalizar({ version: 2, obras: [{ condiciones: [propia] }] });
  assert.equal(n.obras[0].condiciones[0], propia);
  assert.equal(Defaults.normalizar({ obras: [{ condiciones: [propia] }] }).version, 2, 'los datos migrados quedan en versión 2');
});

test('la disponibilidad no duplica el punto ni rompe la negrita, y respeta siglas', () => {
  const { d, o } = datos({ disponibilidad: '**Disponible desde el lunes.** ' });
  o.condiciones = ['**{disponibilidad}.** Matrícula al día.', 'Inicio: {inicio}.'];
  const html = Plantillas.presupuestoCliente(d, o).html;
  const t = texto(html);
  assert.ok(t.includes('Disponible desde el lunes. Matrícula al día.'));
  assert.ok(!t.includes('..') && !t.includes('*'), 'sin punto doble ni asteriscos sueltos');
  assert.ok(t.includes('Inicio: disponible desde el lunes.'));
  const sigla = datos({ disponibilidad: 'ART y matrícula al día' });
  sigla.o.condiciones = ['Inicio: {inicio}.'];
  assert.ok(texto(Plantillas.presupuestoCliente(sigla.d, sigla.o).html).includes('Inicio: ART y matrícula al día.'));
  const corta = datos({ disponibilidad: 'A convenir con la empresa' });
  corta.o.condiciones = ['Inicio: {inicio}.'];
  assert.ok(texto(Plantillas.presupuestoCliente(corta.d, corta.o).html).includes('Inicio: a convenir con la empresa.'));
});

test('las horas con decimales se muestran con coma', () => {
  const { d, o } = datos();
  Object.assign(o.calendario, { horaInicio: '08:00', horaFin: '17:30' });
  const t = texto(Plantillas.presupuestoCliente(d, o).html);
  assert.ok(t.includes('Honorarios por jornada de 9,5 horas'));
  assert.ok(t.includes('9,5 h × $ 13.000'));
  assert.ok(!/\d\.\d h/.test(t));
  const det = texto(Plantillas.presupuestoDetallado(d, o).html);
  assert.ok(!/\d\.\d+ h\b/.test(det), 'el detallado usa el mismo formato en todas las horas');
  assert.equal(Calc.horas(424.9999999999997), '425');
  assert.equal(Calc.horas(8.333333), '8,33');
});
