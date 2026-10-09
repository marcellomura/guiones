// Prueba de punta a punta: abre la app, recorre las pantallas, edita datos y genera los PDF.
// Uso: xvfb-run -a node test/e2e.js [carpeta-salida]
// Con PRESUP_E2E_DATOS=archivo.json se precargan esos datos en lugar del ejemplo.
const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert/strict');
const { _electron: electron } = require('playwright');
const Defaults = require('../src/shared/defaults.js');

const RAIZ = path.join(__dirname, '..');
const SALIDA = path.resolve(process.argv[2] || path.join(RAIZ, 'test-output'));
const USERDATA = fs.mkdtempSync(path.join(os.tmpdir(), 'presup-e2e-'));
const PDFS = path.join(SALIDA, 'pdf');
fs.mkdirSync(PDFS, { recursive: true });

function datosEjemplo() {
  const d = Defaults.datosIniciales();
  d.perfil = Object.assign(d.perfil, { nombre: 'Técnico de Prueba', matricula: 'MAT 0-00000', cuil: '20-00000000-0',
    telefono: '0000-000000', ciudad: 'Córdoba' });
  d.clientes.push({ id: 'cli1', razonSocial: 'Empresa Ejemplo S.A.', cuit: '30-00000000-0', domicilio: 'Calle 123',
    localidad: 'Córdoba', contacto: 'Área de Recursos Humanos', email: '', telefono: '' });
  const o = Defaults.nuevaObra(d, '2026-10-09');
  Object.assign(o, { id: 'obra1', nombre: 'Obra de ejemplo', clienteId: 'cli1', tarea: 'Montaje de cañerías',
    lugar: 'Planta Ejemplo', comitente: 'Comitente S.A.', dotacion: '7' });
  o.calendario.inicio = '2026-10-14';
  d.obras.push(o);
  d.numeracion.presupuesto = 2;
  return d;
}

(async () => {
  const datos = process.env.PRESUP_E2E_DATOS ? JSON.parse(fs.readFileSync(process.env.PRESUP_E2E_DATOS, 'utf8')) : datosEjemplo();
  fs.writeFileSync(path.join(USERDATA, 'datos.json'), JSON.stringify(datos));

  const app = await electron.launch({
    executablePath: require('electron'),
    args: ['--no-sandbox', RAIZ],
    env: Object.assign({}, process.env, { PRESUP_USERDATA: USERDATA, PRESUP_PDF_DIR: PDFS }),
  });
  const win = await app.firstWindow();
  await win.setViewportSize({ width: 1440, height: 900 });
  await win.waitForSelector('.obra-card');
  const errores = [];
  win.on('pageerror', (e) => errores.push(e.message));
  win.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  const foto = (n) => win.screenshot({ path: path.join(SALIDA, `${n}.png`) });

  await foto('01-obras');
  await win.click('.obra-card');
  await win.waitForSelector('.kpis');
  await foto('02-resumen');
  const total = await win.textContent('.kpi.destacado .v');
  console.log('Total en pantalla:', total.replace(/ /g, ' '));

  for (const [tab, n] of [['datos', '03-datos'], ['tarifas', '04-tarifas'], ['calendario', '05-calendario'],
    ['liquidaciones', '07-liquidaciones'], ['textos', '08-textos']]) {
    await win.click(`[data-tab="${tab}"]`);
    await win.waitForTimeout(150);
    if (tab === 'calendario') {
      await foto(n);
      // Marcar una suspensión y horas extra en un día y verificar que cambia el total real.
      await win.click('[data-fecha="2026-10-16"]');
      await win.check('input[name="estado"][value="susp_parcial"]');
      await win.click('[data-fecha="2026-10-19"]');
      await win.fill('[data-campo="d:horasExtra"]', '2');
      await win.waitForTimeout(150);
      await foto('06-calendario-dia');
    } else {
      await foto(n);
    }
  }

  // Cambiar el valor hora y comprobar que el resumen se actualiza.
  await win.click('[data-tab="tarifas"]');
  await win.fill('[data-campo="o:tarifas.valorHora"]', '14000');
  await win.click('[data-tab="resumen"]');
  const total2 = await win.textContent('.kpi.destacado .v');
  assert.notEqual(total2, total, 'el total debería cambiar con el valor hora');
  await win.click('[data-tab="tarifas"]');
  await win.fill('[data-campo="o:tarifas.valorHora"]', '13000');

  // PDF
  await win.click('[data-tab="resumen"]');
  await win.click('.acciones [data-doc="cliente"]');
  await win.waitForSelector('.toast.ok');
  await win.click('.acciones [data-doc="detallado"]');
  await win.waitForTimeout(1500);
  await win.click('[data-tab="liquidaciones"]');
  await win.fill('[data-campo="l:2026-10.comprobante"]', '00002-00000015');
  for (const b of await win.$$('[data-doc="liquidacion"]')) { await b.click(); await win.waitForTimeout(1200); }

  // Obra nueva desde cero, con un cliente dado de alta desde la ventana emergente.
  await win.click('[data-vista="obras"]');
  await win.click('.encabezado [data-accion="nueva-obra"]');
  await win.fill('[data-campo="o:nombre"]', 'Obra nueva de prueba');
  await win.selectOption('[data-campo="o:clienteId"]', '__nuevo');
  await win.fill('#nc-rs', 'Cliente Nuevo S.R.L.');
  await win.click('[data-modal="aceptar"]');
  await win.waitForSelector('#modal[hidden]', { state: 'attached' });
  await win.click('[data-tab="calendario"]');
  await win.fill('[data-campo="o:calendario.inicio"]', '2026-11-02');
  await win.click('[data-tab="resumen"]');
  const totalNueva = await win.textContent('.kpi.destacado .v');
  assert.match(totalNueva, /\$\s?[\d.]+/, 'la obra nueva debería tener total');
  await foto('13-obra-nueva');
  await win.click('[data-vista="obras"]');
  assert.equal(await win.locator('.obra-card').count(), 2, 'deberían verse dos obras');

  for (const [v, n] of [['perfil', '09-perfil'], ['clientes', '10-clientes'], ['feriados', '11-feriados'], ['respaldo', '12-respaldo']]) {
    await win.click(`[data-vista="${v}"]`);
    await win.waitForTimeout(150);
    if (v === 'clientes') { const f = await win.$('[data-accion="sel-cliente"]'); if (f) await f.click(); }
    await foto(n);
  }

  // Los cambios quedaron guardados en disco.
  await win.waitForTimeout(600);
  const guardado = JSON.parse(fs.readFileSync(path.join(USERDATA, 'datos.json'), 'utf8'));
  const ob = guardado.obras[0];
  const nueva = guardado.obras.find((o) => o.nombre === 'Obra nueva de prueba');
  assert.ok(nueva, 'la obra nueva no se guardó');
  assert.equal(guardado.clientes.find((c) => c.id === nueva.clienteId).razonSocial, 'Cliente Nuevo S.R.L.');
  assert.equal(nueva.calendario.inicio, '2026-11-02');
  assert.equal(ob.dias['2026-10-16'].estado, 'susp_parcial');
  assert.equal(ob.dias['2026-10-19'].horasExtra, 2);
  assert.equal(ob.liquidaciones['2026-10'].comprobante, '00002-00000015');
  assert.equal(ob.tarifas.valorHora, 13000);

  await app.close();
  const pdfs = fs.readdirSync(PDFS);
  console.log('PDF generados:', pdfs);
  assert.ok(pdfs.length >= 5, 'faltan PDF');
  if (errores.length) { console.error('Errores en la interfaz:', errores); process.exit(1); }
  console.log('OK: prueba de punta a punta completa. Capturas en', SALIDA);
})().catch((e) => { console.error(e); process.exit(1); });
