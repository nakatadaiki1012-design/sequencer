// 楽譜で編集：[ ] で強弱を1段ずつ、< > でクレッシェンド・デクレッシェンド
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = []; const r = {};
  const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(800);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); loadSong({ v: 2, bars: 2, tracks: [{ type: 'melody', notes: [0, 48, 96, 144].map((s) => ({ s, p: 60, l: 48 })) }] }); selectTrack(0); setView('score'); document.activeElement.blur(); ui.sc.sel = new Set(); ui.sc.cursor = 0; });
  await p.keyboard.press(']');
  r['] で f'] = await p.evaluate(() => JSON.stringify(track().dyn));
  await p.keyboard.press('['); await p.keyboard.press('[');
  r['[ [ で mp'] = await p.evaluate(() => JSON.stringify(track().dyn));
  await p.evaluate(() => { ui.sc.sel = new Set(['0:60', '48:60', '96:60']); });
  await p.keyboard.press('<');
  r['< でクレッシェンド'] = await p.evaluate(() => JSON.stringify(track().hairpins));
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
