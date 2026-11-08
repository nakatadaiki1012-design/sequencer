// スマホのトラック画面（中身の帯）と、横向きスマホ
const { chromium, devices } = require('playwright');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch();
  const r = {};
  {
    const ctx = await b.newContext(devices['iPhone 13']); const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(1000);
    await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); });
    await p.locator('#phoneNav [data-view="tracks"]').tap(); await p.waitForTimeout(400);
    r['帯の数'] = await p.locator('.tstrip svg').count();
    r['メロディの音の印'] = await p.locator('.track >> nth=0').locator('.tstrip rect[fill]').count();
    await p.screenshot({ path: `${OUT}/ptv_tracks.png` });
    // 2つ目のトラックの3小節目をタップ → 打ち込みへ
    const st = p.locator('.track >> nth=1').locator('.tstrip');
    const bx = await st.boundingBox();
    const bw = await p.evaluate(() => stripBW());
    await p.touchscreen.tap(bx.x + bw * 2.5, bx.y + bx.height / 2); await p.waitForTimeout(500);
    r['タップ後'] = await p.evaluate(() => ({ view: document.body.dataset.view, track: cur, bar: ui.sel.b0 }));
    await p.screenshot({ path: `${OUT}/ptv_after.png` });
    r.errs = errs;
    await ctx.close();
  }
  {
    const ctx = await b.newContext(devices['iPhone 13 landscape']); const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(1000);
    await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); });
    r['横向き：スマホ画面'] = await p.evaluate(() => isPhone);
    await p.screenshot({ path: `${OUT}/ptv_land.png` });
    await p.locator('#phoneNav [data-view="tracks"]').tap(); await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/ptv_land_tracks.png` });
    r.errsLand = errs;
    await ctx.close();
  }
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
