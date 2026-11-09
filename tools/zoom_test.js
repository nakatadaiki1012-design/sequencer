// マス目の大きさ：2本指・Ctrl＋ホイール・－／ぴったり／＋・キーボード・おぼえる
const { chromium, devices } = require('playwright');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch();
  const r = {}; const errs = [];
  const prep = (p) => p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); edit(() => { song.bars = 16; track().notes = [60, 64, 67, 72, 71, 69].map((pp, i) => ({ s: i * 96, p: pp, l: 48 })); }, 'テスト'); });
  // 画面上の点 → 曲の位置（tick・行）
  const at = (p, x, y) => p.evaluate(([x, y]) => { const a = zoomAnchor(x, y); return { tick: +a.tick.toFixed(1), row: +a.row.toFixed(2), zoom: ui.zoom, rh: ui.rh }; }, [x, y]);

  // ---------- パソコン ----------
  {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 820 } });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('pc: ' + e.message));
    await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900); await prep(p); await p.waitForTimeout(300);
    const box = await p.locator('#scroller').boundingBox();
    const mx = box.x + 700, my = box.y + 300;
    await p.mouse.move(mx, my);
    const before = await at(p, mx, my);
    await p.keyboard.down('Control'); for (let i = 0; i < 3; i++) { await p.mouse.wheel(0, -100); await p.waitForTimeout(60); } await p.keyboard.up('Control');
    await p.waitForTimeout(150);
    const after = await at(p, mx, my);
    r['PC Ctrl+ホイールで横に大きく'] = `${before.zoom} → ${after.zoom}`;
    r['PC マウスの所の位置がずれない(tick)'] = `${before.tick} → ${after.tick}`;
    await p.keyboard.down('Alt'); for (let i = 0; i < 3; i++) { await p.mouse.wheel(0, -100); await p.waitForTimeout(60); } await p.keyboard.up('Alt');
    const av = await at(p, mx, my);
    r['PC Alt+ホイールでたてに大きく'] = `${after.rh} → ${av.rh}`;
    r['PC たて：マウスの所の行がずれない'] = `${after.row} → ${av.row}`;
    await p.screenshot({ path: `${OUT}/zoom_pc_in.png` });
    await p.click('#zFit'); await p.waitForTimeout(300);
    r['PC ぴったり：曲全体が入る'] = await p.evaluate(() => { const sc = document.querySelector('#scroller'); return sc.scrollWidth <= sc.clientWidth + 70; });
    r['PC ぴったりの表示'] = await p.evaluate(() => ({ zoom: ui.zoom, rh: ui.rh, on: document.querySelector('#zFit').classList.contains('on') }));
    await p.screenshot({ path: `${OUT}/zoom_pc_fit.png` });
    await p.click('#zFit'); await p.waitForTimeout(300);
    r['PC もう一度おすと元に'] = await p.evaluate(() => ({ zoom: ui.zoom, rh: ui.rh }));
    const k0 = await p.evaluate(() => ui.zoom);
    await p.keyboard.press('-'); await p.keyboard.press('-');
    r['PC キー − で小さく'] = `${k0} → ${await p.evaluate(() => ui.zoom)}`;
    await p.click('#zIn'); await p.waitForTimeout(200);
    const saved = await p.evaluate(() => ({ zoom: ui.zoom, rh: ui.rh }));
    await p.waitForTimeout(600);
    await p.reload(); await p.waitForTimeout(900);
    r['PC 開きなおしても同じ大きさ'] = JSON.stringify(saved) === JSON.stringify(await p.evaluate(() => ({ zoom: ui.zoom, rh: ui.rh })));
    await ctx.close();
  }
  // ---------- スマホ ----------
  {
    const ctx = await b.newContext(devices['iPhone 13']);
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('phone: ' + e.message));
    await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900); await prep(p); await p.waitForTimeout(300);
    const cdp = await ctx.newCDPSession(p);
    const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ ...q, id: i })) });
    const box = await p.locator('#scroller').boundingBox();
    const cx = box.x + box.width * 0.6, cy = box.y + box.height * 0.5;
    // 横にひろげる
    const b1 = await at(p, cx, cy);
    await T('touchStart', [{ x: cx - 40, y: cy }, { x: cx + 40, y: cy }]);
    for (let i = 1; i <= 10; i++) { await T('touchMove', [{ x: cx - 40 - i * 6, y: cy }, { x: cx + 40 + i * 6, y: cy }]); await p.waitForTimeout(16); }
    await T('touchEnd', []); await p.waitForTimeout(200);
    const a1 = await at(p, cx, cy);
    r['スマホ 横にひろげる→横だけ大きく'] = `zoom ${b1.zoom}→${a1.zoom} / rh ${b1.rh}→${a1.rh}`;
    r['スマホ 指のまん中の位置がずれない'] = `${b1.tick} → ${a1.tick}`;
    // たてにつまむ
    await T('touchStart', [{ x: cx, y: cy - 80 }, { x: cx, y: cy + 80 }]);
    for (let i = 1; i <= 10; i++) { await T('touchMove', [{ x: cx, y: cy - 80 + i * 4 }, { x: cx, y: cy + 80 - i * 4 }]); await p.waitForTimeout(16); }
    await T('touchEnd', []); await p.waitForTimeout(200);
    const a2 = await at(p, cx, cy);
    r['スマホ たてにつまむ→たてだけ小さく'] = `zoom ${a1.zoom}→${a2.zoom} / rh ${a1.rh}→${a2.rh}`;
    r['スマホ 音は増えない'] = await p.evaluate(() => track().notes.length);
    await p.screenshot({ path: `${OUT}/zoom_phone.png` });
    await p.click('#zFit'); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/zoom_phone_fit.png` });
    // 「いつも画面を動かす」でも1本指で動く
    await p.evaluate(() => { ui.touchMode = 'scroll'; ui.touchEdit = false; });
    await p.click('#zFit'); await p.waitForTimeout(300);
    const s0 = await p.evaluate(() => document.querySelector('#scroller').scrollLeft);
    await T('touchStart', [{ x: cx, y: cy }]);
    for (let i = 1; i <= 6; i++) { await T('touchMove', [{ x: cx - i * 20, y: cy }]); await p.waitForTimeout(16); }
    await T('touchEnd', []); await p.waitForTimeout(100);
    r['スマホ 画面を動かすモードで1本指'] = `${Math.round(s0)} → ${Math.round(await p.evaluate(() => document.querySelector('#scroller').scrollLeft))}`;
    await ctx.close();
  }
  r['エラー'] = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
