// Puente seguro entre la interfaz y el proceso principal.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  leerDatos: () => ipcRenderer.invoke('datos:leer'),
  guardarDatos: (datos) => ipcRenderer.invoke('datos:guardar', datos),
  guardarDatosSync: (datos) => ipcRenderer.sendSync('datos:guardar-sync', datos),
  info: () => ipcRenderer.invoke('app:info'),
  generarPDF: (doc) => ipcRenderer.invoke('pdf:generar', doc),
  exportar: (datos) => ipcRenderer.invoke('respaldo:exportar', datos),
  importar: () => ipcRenderer.invoke('respaldo:importar'),
  elegirLogo: () => ipcRenderer.invoke('logo:elegir'),
  abrirCarpetaDatos: () => ipcRenderer.invoke('carpeta:abrir'),
});
