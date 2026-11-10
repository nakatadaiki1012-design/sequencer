// 楽譜で編集の直し：スマホの「…」パネル、タイのあとの→、カーソルの上をクリック、カーソルから再生、付点のリセット、Delete
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const r = {}; const errs = [];
  {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(800);
    await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); loadSong({ v: 2, bars: 4, tracks: [{ type: 'melody', notes: [{ s: 0, p: 64, l: 96 }, { s: 96, p: 64, l: 48 }] }] }); selectTrack(0); setView('score'); });
    await p.waitForTimeout(300);
    // タイのあとの →
    r['タイのあとの→'] = await p.evaluate(() => { ui.sc.sel = new Set(['0:64']); scTie ? scTie() : null; const n = track().notes; ui.sc.sel = new Set([n[0].s + ':' + n[0].p]); scMove(1); return `音 ${n.map((x) => x.s + '/' + x.l).join(' ')} → カーソル ${ui.sc.cursor}`; });
    // 付点のリセット
    await p.evaluate(() => { document.activeElement.blur(); ui.sc.sel = new Set(); });
    await p.keyboard.press('4'); await p.keyboard.press('.'); await p.keyboard.press('3');
    r['長さを変えたら付点が切れる'] = await p.evaluate(() => ui.sc.dot === false);
    // Delete（何もえらんでいない）は消さない
    const n0 = await p.evaluate(() => track().notes.length);
    await p.evaluate(() => { ui.sc.sel = new Set(); ui.sc.cursor = 192; });
    await p.keyboard.press('Delete');
    r['えらんでいないDeleteは消さない'] = (await p.evaluate(() => track().notes.length)) === n0;
    // カーソルから再生
    await p.evaluate(() => { ui.sc.cursor = 384; play(); });
    await p.waitForTimeout(400);
    r['カーソルの小節から再生'] = await p.evaluate(() => { const t = playheadTick(); stop(); return t >= 384; });
    // カーソルの四角はクリックをじゃましない
    r['カーソルはクリックを通す'] = await p.evaluate(() => { const c = document.querySelector('#scoreEditView rect.cursor'); return !c || c.getAttribute('pointer-events') === 'none'; });
    await ctx.close();
  }
  {
    const ctx = await b.newContext(devices['iPhone 13']); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(800);
    await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); loadSong(sampleSong()); });
    await p.tap('#phoneNav [data-view="score"]'); await p.waitForTimeout(400);
    await p.tap('#phonePad .pp-more > summary'); await p.waitForTimeout(300);
    r['スマホ「…」が画面の中'] = await p.evaluate(() => { const b2 = document.querySelector('#phonePad .pp-more .popbody'); if (!b2) return 'なし'; const x = b2.getBoundingClientRect(); return x.left >= 0 && x.right <= innerWidth + 1 && x.width > 0; });
    await ctx.close();
  }
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
