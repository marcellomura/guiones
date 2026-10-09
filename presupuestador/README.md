# Presupuestador HyS

App de escritorio para Windows que arma presupuestos y liquidaciones mensuales en PDF para técnicos en Higiene y Seguridad que trabajan con presencia permanente en obra.

## Qué hace

- **Presupuesto para el cliente** en una hoja, con logo, honorarios por hora, jornadas por tipo de día, viático, total y condiciones.
- **Presupuesto detallado** de uso interno: cómo se calcula cada número, calendario por colores, turnos, feriados y ejemplos.
- **Liquidación mensual** día por día, con suspensiones, horas nocturnas, total en letras y datos del comprobante C.
- **Calendario por diagrama** (por ejemplo 14 × 3): arma los turnos solo, aplica feriados y permite marcar cada día (feriado, suspensión con aviso, suspensión parcial o total, descanso trabajado, horas nocturnas).
- **Tarifas**: valor hora base y recargos acumulables para sábados, domingos y feriados y horas nocturnas o fuera de horario; viático y movilidad por jornada.
- Perfil con logo, clientes, lista de feriados editable y respaldo/importación de datos.

Los datos se guardan en la carpeta de datos de usuario de Windows (`%APPDATA%\Presupuestador HyS\datos.json`), con un respaldo automático cada vez que se abre la app.

## Instalar

1. Descargar `Presupuestador-HyS-Instalador-<versión>.exe`.
2. Ejecutarlo. Como el instalador no tiene firma digital, Windows puede mostrar **"Windows protegió su PC"**: elegir **Más información → Ejecutar de todas formas**.
3. Queda un acceso directo en el escritorio y en el menú Inicio.

## Desarrollo

```bash
npm install
npm start            # abre la app
npm test             # pruebas del cálculo
npm run test:e2e     # prueba de punta a punta (Linux: xvfb-run -a npm run test:e2e)
npm run dist:win     # instalador para Windows (en Windows, o en Linux con Wine)
```

Cada cambio en `presupuestador/` dispara el flujo **Presupuestador HyS · instalador Windows** de GitHub Actions, que prueba y arma el instalador en una máquina Windows y lo deja como artefacto descargable.

## Estructura

- `src/main.js`: ventana, guardado de datos y generación de PDF.
- `src/shared/calc.js`: calendario, tarifas, totales y montos en letras.
- `src/shared/templates.js`: diseño de los PDF.
- `src/shared/defaults.js`: feriados, textos y tarifas iniciales.
- `src/renderer/`: interfaz.

La fuente Inter se distribuye bajo la licencia SIL Open Font License 1.1 (`assets/fonts/OFL.txt`).
