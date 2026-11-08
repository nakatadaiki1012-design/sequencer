// スマホのマス目：なぞると横に動く（いきおいつき）・タップで置く・長おしで長い音
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(devices['iPhone 13']); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(1000);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); edit(() => { track().notes = []; song.bars = 16; }, 'テスト'); });
  await p.waitForTimeout(300);
  const cdp = await ctx.newCDPSession(p);
  const box = await p.locator('#scroller').boundingBox();
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const sl = () => p.evaluate(() => ({ x: Math.round(document.querySelector('#scroller').scrollLeft), y: Math.round(document.querySelector('#scroller').scrollTop), n: track().notes.length }));
  const r = {};
  const x0 = box.x + box.width * 0.75, y0 = box.y + box.height * 0.5;
  r['はじめ'] = await sl();
  // 1本指で左へすばやくなぞる（少しななめ）
  await T('touchStart', [{ x: x0, y: y0 }]);
  for (let i = 1; i <= 8; i++) { await T('touchMove', [{ x: x0 - i * 25, y: y0 + i * 3 }]); await p.waitForTimeout(12); }
  await T('touchEnd', []);
  r['なぞった直後'] = await sl();
  await p.waitForTimeout(700);
  r['いきおいで流れた後'] = await sl();
  // タップで音を置く
  await T('touchStart', [{ x: x0, y: y0 }]); await p.waitForTimeout(60); await T('touchEnd', []); await p.waitForTimeout(200);
  r['タップ後の音の数'] = (await sl()).n;
  // 同じ所をもう一度タップ → 消える
  await T('touchStart', [{ x: x0, y: y0 }]); await p.waitForTimeout(60); await T('touchEnd', []); await p.waitForTimeout(200);
  r['もう一度タップ'] = (await sl()).n;
  // 長おししてから右へ → 長い音
  const y1 = y0 + 40;
  await T('touchStart', [{ x: box.x + 120, y: y1 }]); await p.waitForTimeout(400);
  for (let i = 1; i <= 6; i++) { await T('touchMove', [{ x: box.x + 120 + i * 25, y: y1 }]); await p.waitForTimeout(20); }
  await T('touchEnd', []); await p.waitForTimeout(200);
  r['長おしで書いた音'] = await p.evaluate(() => track().notes.map((n) => ({ l: n.l })));
  r['画面は動かない'] = await sl();
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
