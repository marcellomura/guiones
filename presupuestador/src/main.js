// Proceso principal: ventana, guardado de datos y generación de PDF.
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Permite usar una carpeta de datos alternativa (pruebas automáticas).
if (process.env.PRESUP_USERDATA) app.setPath('userData', process.env.PRESUP_USERDATA);
// Fechas dd/mm/aaaa y horas de 24 h en toda la interfaz.
app.commandLine.appendSwitch('lang', 'es-ES');

const ASSETS = path.join(__dirname, '..', 'assets');
const archivoDatos = () => path.join(app.getPath('userData'), 'datos.json');
const archivoRespaldo = () => path.join(app.getPath('userData'), 'datos-respaldo.json');
let ventana = null;

// ---------- Datos ----------
function leerJSON(ruta) { return JSON.parse(fs.readFileSync(ruta, 'utf8')); }

function leerDatos() {
  try {
    return { datos: leerJSON(archivoDatos()) };
  } catch (e) {
    if (e.code === 'ENOENT') return { datos: null };
    // Archivo dañado: se intenta con el respaldo de la última apertura.
    try { return { datos: leerJSON(archivoRespaldo()), aviso: 'Se recuperaron los datos desde el respaldo automático.' }; }
    catch { return { datos: null, aviso: 'No se pudo leer el archivo de datos. Se empezó con datos nuevos.' }; }
  }
}

function guardarDatos(datos) {
  const f = archivoDatos();
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(datos, null, 1), 'utf8');
  fs.renameSync(tmp, f);
}

function respaldoAlAbrir() {
  try { if (fs.existsSync(archivoDatos())) fs.copyFileSync(archivoDatos(), archivoRespaldo()); } catch { /* sin respaldo */ }
}

// ---------- PDF ----------
let cssFuentes = null;
function fuentes() {
  if (cssFuentes) return cssFuentes;
  const pesos = { Regular: 400, Medium: 500, SemiBold: 600, Bold: 700, ExtraBold: 800 };
  cssFuentes = '<style>' + Object.entries(pesos).map(([n, w]) => {
    const b64 = fs.readFileSync(path.join(ASSETS, 'fonts', `Inter-${n}.woff2`)).toString('base64');
    return `@font-face{font-family:Inter;font-weight:${w};src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
  }).join('') + '</style>';
  return cssFuentes;
}

async function imprimir(html, pie, destino) {
  const tmp = path.join(os.tmpdir(), `presupuestador-${process.pid}-${Date.now()}.html`);
  fs.writeFileSync(tmp, html.replace('<!--FUENTES-->', fuentes()), 'utf8');
  const win = new BrowserWindow({ show: false, width: 1000, height: 1400, webPreferences: { sandbox: true } });
  try {
    await win.loadFile(tmp);
    await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
    const pdf = await win.webContents.printToPDF({
      pageSize: 'A4', printBackground: true, preferCSSPageSize: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      displayHeaderFooter: true, headerTemplate: '<div></div>', footerTemplate: pie || '<div></div>',
    });
    fs.writeFileSync(destino, pdf);
  } finally {
    win.destroy();
    fs.rm(tmp, { force: true }, () => {});
  }
}

// ---------- Ventana ----------
function crearVentana() {
  ventana = new BrowserWindow({
    width: 1320, height: 860, minWidth: 1080, minHeight: 680, show: false,
    title: 'Presupuestador HyS', backgroundColor: '#F4F4F6',
    icon: path.join(ASSETS, 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  ventana.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  ventana.once('ready-to-show', () => { ventana.maximize(); ventana.show(); });
  // Los enlaces externos se abren en el navegador.
  ventana.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  ventana.webContents.on('will-navigate', (e) => e.preventDefault());
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (ventana) { if (ventana.isMinimized()) ventana.restore(); ventana.focus(); } });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    respaldoAlAbrir();
    registrarIPC();
    crearVentana();
  });
  app.on('window-all-closed', () => app.quit());
}

function registrarIPC() {
  ipcMain.handle('datos:leer', () => leerDatos());
  ipcMain.handle('datos:guardar', (e, datos) => { guardarDatos(datos); return true; });
  ipcMain.on('datos:guardar-sync', (e, datos) => { try { guardarDatos(datos); e.returnValue = true; } catch { e.returnValue = false; } });
  ipcMain.handle('app:info', () => ({ version: app.getVersion(), carpetaDatos: app.getPath('userData') }));

  ipcMain.handle('pdf:generar', async (e, { html, pie, nombre }) => {
    let destino;
    if (process.env.PRESUP_PDF_DIR) {
      destino = path.join(process.env.PRESUP_PDF_DIR, nombre);
    } else {
      const r = await dialog.showSaveDialog(ventana, {
        title: 'Guardar PDF', defaultPath: path.join(app.getPath('documents'), nombre),
        filters: [{ name: 'Documento PDF', extensions: ['pdf'] }],
      });
      if (r.canceled || !r.filePath) return { ok: false, cancelado: true };
      destino = r.filePath.toLowerCase().endsWith('.pdf') ? r.filePath : r.filePath + '.pdf';
    }
    try {
      await imprimir(html, pie, destino);
    } catch (err) {
      const msg = err.code === 'EBUSY' || err.code === 'EPERM'
        ? 'No se pudo guardar: el archivo está abierto en otro programa. Cerralo e intentá de nuevo.'
        : 'No se pudo generar el PDF: ' + err.message;
      return { ok: false, error: msg };
    }
    if (!process.env.PRESUP_PDF_DIR) shell.openPath(destino);
    return { ok: true, ruta: destino };
  });

  ipcMain.handle('respaldo:exportar', async (e, datos) => {
    const fecha = new Date().toISOString().slice(0, 10);
    const r = await dialog.showSaveDialog(ventana, {
      title: 'Exportar respaldo', defaultPath: path.join(app.getPath('documents'), `Respaldo Presupuestador ${fecha}.json`),
      filters: [{ name: 'Respaldo', extensions: ['json'] }],
    });
    if (r.canceled || !r.filePath) return { ok: false };
    fs.writeFileSync(r.filePath, JSON.stringify(datos, null, 1), 'utf8');
    return { ok: true, ruta: r.filePath };
  });

  ipcMain.handle('respaldo:importar', async () => {
    const r = await dialog.showOpenDialog(ventana, {
      title: 'Importar datos', properties: ['openFile'], filters: [{ name: 'Respaldo', extensions: ['json'] }],
    });
    if (r.canceled || !r.filePaths.length) return { ok: false };
    try {
      return { ok: true, datos: leerJSON(r.filePaths[0]) };
    } catch {
      return { ok: false, error: 'El archivo no es un respaldo válido.' };
    }
  });

  ipcMain.handle('logo:elegir', async () => {
    const r = await dialog.showOpenDialog(ventana, {
      title: 'Elegir logo', properties: ['openFile'], filters: [{ name: 'Imagen', extensions: ['png', 'jpg', 'jpeg'] }],
    });
    if (r.canceled || !r.filePaths.length) return { ok: false };
    const f = r.filePaths[0];
    const buf = fs.readFileSync(f);
    if (buf.length > 3 * 1024 * 1024) return { ok: false, error: 'La imagen supera los 3 MB. Usá una más liviana.' };
    const tipo = /\.png$/i.test(f) ? 'image/png' : 'image/jpeg';
    return { ok: true, logo: `data:${tipo};base64,${buf.toString('base64')}` };
  });

  ipcMain.handle('carpeta:abrir', () => shell.openPath(app.getPath('userData')));
}
