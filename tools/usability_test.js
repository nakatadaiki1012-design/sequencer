// 使いやすさ：元に戻すの説明・ショートカット一覧・楽譜のツアー
const { chromium, devices } = require('playwright');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch();
  const r = {};
  // パソコン
  {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 820 } });
    await ctx.addInitScript(() => localStorage.setItem('otsumiki-tour', '1'));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(1000);
    await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); });
    await p.evaluate(() => edit(() => { song.bpm = 120; }, 'テンポを120に'));
    r['元に戻すの説明'] = await p.getAttribute('#btnUndo', 'title');
    await p.keyboard.press('Control+z'); await p.waitForTimeout(150);
    r['元に戻したときの知らせ'] = await p.textContent('#toast');
    r['やり直すの説明'] = await p.getAttribute('#btnRedo', 'title');
    await p.keyboard.press('Shift+?'); await p.waitForTimeout(300);
    r['?キーで一覧'] = await p.evaluate(() => document.querySelector('#dlgKeys').open);
    await p.screenshot({ path: `${OUT}/keys_pc.png` });
    await p.keyboard.press('Escape');
    await p.evaluate(() => setView('score')); await p.waitForTimeout(1100);
    r['はじめて楽譜→ツアー'] = await p.locator('.tour').count();
    r['楽譜ツアーのステップ'] = await p.textContent('.tour-step');
    await p.locator('.tour-next').click(); await p.locator('.tour-next').click(); await p.waitForTimeout(350);
    await p.screenshot({ path: `${OUT}/tour_score_pc.png` });
    while (await p.locator('.tour').count()) await p.locator('.tour-next').click();
    await p.evaluate(() => { setView('grid'); setView('score'); }); await p.waitForTimeout(1000);
    r['2回目は出ない'] = await p.locator('.tour').count() === 0;
    r.errsPC = errs;
    await ctx.close();
  }
  // スマホ
  {
    const ctx = await b.newContext(devices['iPhone 13']);
    await ctx.addInitScript(() => localStorage.setItem('otsumiki-tour', '1'));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(1000);
    await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); });
    await p.locator('#phoneNav [data-view="score"]').tap(); await p.waitForTimeout(1100);
    r['スマホ：楽譜ツアー'] = await p.textContent('.tour-step');
    await p.locator('.tour-next').tap(); await p.waitForTimeout(350);
    await p.screenshot({ path: `${OUT}/tour_score_phone.png` });
    r.errsPhone = errs;
    await ctx.close();
  }
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
