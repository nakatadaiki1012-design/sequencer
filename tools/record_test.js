// 録音：カウントのあと、キーボードでひいた音がタイミングどおりに入る。元に戻すで1回でもどる
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1366, height: 820 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); loadSong({ title: 'rec', bpm: 120, bars: 4, tracks: [{ type: 'melody', notes: [] }, { type: 'drum', grid: {} }] }); selectTrack(0); ui.grid = 24; document.activeElement.blur(); });
  await p.click('#btnRec');
  // 120BPM：1拍=0.5秒、カウント4拍=2秒
  await p.waitForTimeout(2050);
  const keys = ['a', 'd', 'g', 'k']; // ド ミ ソ ド
  for (const k of keys) { await p.keyboard.down(k); await p.waitForTimeout(400); await p.keyboard.up(k); await p.waitForTimeout(100); }
  await p.waitForTimeout(200);
  const r = {};
  r['録音中の印'] = await p.evaluate(() => document.querySelector('#btnRec').classList.contains('on'));
  await p.click('#btnRec');
  r['入った音（はじまり/高さ/長さ）'] = await p.evaluate(() => track().notes.map((n) => `${n.s}/${n.p}/${n.l}`).join(' '));
  r['録音の印が消える'] = await p.evaluate(() => !document.querySelector('#btnRec').classList.contains('on'));
  await p.keyboard.press('Control+z');
  r['元に戻すで全部もどる'] = await p.evaluate(() => track().notes.length);
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
