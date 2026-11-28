// ポップアップにした窓（曲の地図・トラック）を、右上の ✕ で閉じる（もとの場所にもどる）
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); setView('score'); });
  await p.waitForTimeout(400);
  const out = {};
  for (const [k, sel] of [['canvas', '.canvas-area'], ['tracks', '.main > .tracks']]) {
    await p.click(sel + ' .floatbtn'); await p.waitForTimeout(400);
    out[k + ':floating'] = await p.evaluate((s) => document.querySelector(s).classList.contains('floating'), sel);
    const box = await (await p.$(sel + ' > .floatx')).boundingBox();
    out[k + ':x'] = box && [Math.round(box.x), Math.round(box.y)].join(',');
    if (k === 'canvas') 
    await p.click(sel + ' > .floatx'); await p.waitForTimeout(400);
    out[k + ':after ✕'] = await p.evaluate((s) => document.querySelector(s).classList.contains('floating'), sel);
  }
  console.log(out, errs); await b.close();
})();
