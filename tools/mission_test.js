// はじめてのミッション：音を3つ → 再生 → 送る で「クリア」（スマホ）
const { chromium, devices } = require('playwright');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext(devices['iPhone 13']);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(1000);
  await p.tap('.tpl >> nth=5'); await p.waitForTimeout(500);
  const r = {};
  r['ミッションが出る'] = await p.isVisible('#mission');
  r['読むツアーは出ない'] = !(await p.evaluate(() => !!document.querySelector('.tour')));
  await p.screenshot({ path: `${OUT}/mission_start.png` });
  const cdp = await ctx.newCDPSession(p); const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const box = await p.locator('#scroller').boundingBox();
  for (let i = 0; i < 3; i++) { const x = box.x + 90 + i * 50, y = box.y + 160 + i * 30; await T('touchStart', [{ x, y }]); await p.waitForTimeout(40); await T('touchEnd', []); await p.waitForTimeout(250); }
  r['1つ目クリア'] = await p.evaluate(() => mission.step);
  await p.tap('#btnPlay'); await p.waitForTimeout(400); await p.tap('#btnPlay');
  r['2つ目クリア'] = await p.evaluate(() => mission.step);
  await p.evaluate(() => shareDialog()); await p.waitForTimeout(600);
  r['3つ目クリア'] = await p.evaluate(() => mission.step);
  await p.evaluate(() => document.querySelector('#dlgShare').close());
  await p.screenshot({ path: `${OUT}/mission_done.png` });
  r['もう出ない（おぼえる）'] = await p.evaluate(() => localStorage.getItem('otsumiki-mission'));
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
