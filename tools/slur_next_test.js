// スラー：音符1つ＋S でつぎの音まで、つづけて S でのばす、入力中は次に入れる音まで
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const N = [60, 62, 64, 65, 67, 65, 64, 62].map((p, i) => ({ s: i * 48, p, l: 48 }));
    loadSong({ v: 2, title: 's', bpm: 100, bars: 4, key: 0, tracks: [{ type: 'melody', id: 'a', name: 'うた', inst: 'piano', notes: N }] }, { own: true });
    selectTrack(0); setView('score'); ui.sc.input = false; ui.sc.sel = new Set(['0:60']); renderScoreEditNow(); document.activeElement.blur(); });
  const sl = () => p.evaluate(() => JSON.stringify(track().slurs));
  const r = {};
  await p.keyboard.press('s'); await p.waitForTimeout(80); r['1つ＋S'] = await sl();
  await p.keyboard.press('s'); await p.waitForTimeout(80); r['もう一度S'] = await sl();
  await p.keyboard.press('s'); await p.waitForTimeout(80); r['さらにS'] = await sl();
  await p.keyboard.press('Control+z'); await p.waitForTimeout(80); r['元にもどす'] = await sl();
  await p.evaluate(() => { ui.sc.sel = new Set(['192:67', '336:62']); });
  await p.keyboard.press('s'); await p.waitForTimeout(80); r['範囲'] = await sl();
  // 入力中：新しい曲で ド → S → レ
  await p.evaluate(() => { loadSong({ v: 2, title: 's2', bpm: 100, bars: 2, key: 0, tracks: [{ type: 'melody', id: 'a', name: 'うた', inst: 'piano', notes: [] }] }, { own: true }); selectTrack(0); setView('score'); ui.sc.input = true; ui.sc.cursor = 0; renderScoreEditNow(); document.activeElement.blur(); });
  await p.keyboard.press('c'); await p.keyboard.press('s'); await p.keyboard.press('d'); await p.keyboard.press('s'); await p.keyboard.press('e'); await p.waitForTimeout(100);
  r['入力中 ド S レ S ミ'] = await sl();
  const el = await p.$('#scoreEditView svg'); await el.screenshot({ path: 'tools/slur_next.png' });
  r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
