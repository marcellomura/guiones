// Renderiza cuadros con Chromium (Playwright) a JPG.
// uso: node render.cjs --from 0 --to 100 [--step 1] [--out frames] [--list 12,48,96] [--q 0.93]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map(s => { const [k, ...v] = s.trim().split(' '); return [k, v.join(' ') || true]; }));
(async () => {
  const out = path.resolve(args.out || 'frames'); fs.mkdirSync(out, { recursive: true });
  let list = [];
  if (args.list) list = String(args.list).split(',').map(Number);
  else { const step = +(args.step || 1); for (let f = +(args.from || 0); f < +(args.to || 1); f += step) list.push(f); }
  const q = +(args.q || 0.93);
  const browser = await chromium.launch({ args: ['--disable-gpu', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', m => { if (m.type() === 'error') console.error('PAGE:', m.text()); });
  page.on('pageerror', e => console.error('PAGEERROR:', e.message, e.stack));
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.waitForFunction('window.READY === true', null, { timeout: 60000 });
  const t0 = Date.now(); let n = 0;
  for (const f of list) {
    const data = await page.evaluate(([f, q]) => renderData(f, q), [f, q]);
    fs.writeFileSync(path.join(out, 'f_' + String(f).padStart(5, '0') + '.jpg'), Buffer.from(data.split(',')[1], 'base64'));
    n++; if (n % 100 === 0) console.log(`${n}/${list.length}  ${((Date.now() - t0) / n).toFixed(0)} ms/cuadro`);
  }
  console.log(`listo: ${n} cuadros en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
