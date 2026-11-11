// Exporta biblia.html a PDF (A4 apaisado) con Chromium.
// Uso: node exportar_biblia.js [salida.pdf] [--capturas=carpeta]
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const args = process.argv.slice(2);
  const out = args.find(a => !a.startsWith('--')) ||
    path.join(__dirname, '..', 'Te_estabamos_esperando_-_Biblia.pdf');
  const shots = (args.find(a => a.startsWith('--capturas=')) || '').split('=')[1];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1123, height: 794 } });
  await page.goto('file://' + path.join(__dirname, 'biblia.html'));
  await page.evaluate(() => document.fonts.ready);
  // Avisa si algún bloque de texto se sale de su página.
  const desbordes = await page.evaluate(() => {
    const r = [];
    document.querySelectorAll('.page').forEach((p, i) => {
      const pb = p.getBoundingClientRect();
      const pie = p.querySelector('.pie');
      const limite = pie ? pie.getBoundingClientRect().top - 4 : pb.bottom - 20;
      let max = 0;
      p.querySelectorAll('p,li,h1,h2,.giro,.secreto,.tex,.verdad,.ev').forEach(e => {
        if (e.closest('.pie')) return;
        max = Math.max(max, e.getBoundingClientRect().bottom);
      });
      if (max > limite) r.push(`página ${i + 1}: sobra ${Math.round(max - limite)} px`);
    });
    return r;
  });
  console.log(desbordes.length ? desbordes.join('\n') : 'sin desbordes');
  await page.pdf({ path: out, width: '297mm', height: '210mm', printBackground: true, preferCSSPageSize: true });
  if (shots) {
    const n = await page.locator('.page').count();
    for (let i = 0; i < n; i++) {
      await page.locator('.page').nth(i).screenshot({ path: path.join(shots, `b${String(i + 1).padStart(2, '0')}.png`) });
    }
  }
  await browser.close();
  console.log('PDF:', out);
})();
