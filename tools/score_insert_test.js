const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(800);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); loadSong({ v: 2, bars: 2, tracks: [{ type: 'melody', notes: [60, 62, 64, 65].map((pp, i) => ({ s: i * 48, p: pp, l: 48 })) }] }); selectTrack(0); setView('score'); ui.sc.cursor = 48; ui.sc.dur = 48; ui.sc.sel = new Set(); renderScoreEdit(); document.activeElement.blur(); });
  await p.keyboard.press('i'); await p.keyboard.press('g');
  const a = await p.evaluate(() => track().notes.slice().sort((x, y) => x.s - y.s).map((n) => n.s + ':' + n.p).join(' '));
  await p.keyboard.press('i'); await p.keyboard.press('a');
  const c = await p.evaluate(() => track().notes.slice().sort((x, y) => x.s - y.s).map((n) => n.s + ':' + n.p).join(' '));
  console.log({ 挿入: a, '上書き（つぎ）': c }, errs); await b.close();
})();
