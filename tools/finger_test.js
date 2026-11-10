// リコーダーの指づかい：楽譜の下に絵が出る
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 820 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); loadSong(sampleSong()); openScore(); });
  await p.waitForTimeout(300);
  await p.selectOption('#dlgScore [data-s="finger"]', 'baroque'); await p.waitForTimeout(500);
  const r = { '指の絵の数': await p.evaluate(() => document.querySelectorAll('#dlgScore .scoreview svg g.finger').length), '音符の数': await p.evaluate(() => song.tracks[0].notes.length) };
  await p.screenshot({ path: `${OUT}/finger.png` });
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
