const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext(devices['iPhone 13']); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(800);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); loadSong(sampleSong()); });
  await p.tap('#phoneNav [data-view="score"]'); await p.waitForTimeout(400);
  await p.tap('#phonePad .pp-more > summary'); await p.waitForTimeout(200);
  await p.tap('#phonePad [data-x="range"]'); await p.waitForTimeout(200);
  const heads = p.locator('#scoreEditView .nh');
  await heads.nth(0).tap(); await p.waitForTimeout(150); await heads.nth(3).tap(); await p.waitForTimeout(150);
  const n = await p.evaluate(() => ui.sc.sel.size);
  await p.tap('#phonePad .pp-more > summary'); await p.waitForTimeout(200);
  await p.tap('#phonePad [data-x="slur"]'); await p.waitForTimeout(200);
  console.log({ えらんだ数: n, スラー: await p.evaluate(() => (track().slurs || []).length) }, errs);
  await b.close();
})();
