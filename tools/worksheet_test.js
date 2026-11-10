// プリント：名前のらん・穴うめの小節
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 820 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); loadSong(sampleSong()); openScore(); });
  await p.waitForTimeout(400);
  const heads = () => p.evaluate(() => document.querySelectorAll('#dlgScore .scoreview svg [data-s]').length);
  const before = await heads();
  await p.check('#dlgScore [data-c="nameLine"]');
  await p.fill('#dlgScore [data-k="blank"]', '2-3'); await p.press('#dlgScore [data-k="blank"]', 'Enter'); await p.dispatchEvent('#dlgScore [data-k="blank"]', 'change');
  await p.waitForTimeout(500);
  const r = { '音符の数（前→穴うめ後）': `${before} → ${await heads()}`, '名前のらん': await p.evaluate(() => /名前/.test(document.querySelector('#dlgScore .scoreview svg').textContent)), '穴うめの小節': await p.evaluate(() => parseBars(song.score.blank)) };
  await p.screenshot({ path: `${OUT}/worksheet.png` });
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
