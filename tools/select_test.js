// 音をえらぶ：Shift＋ドラッグで囲む・まとめて移動・コピー/貼りつけ・複製・矢印・消す・元に戻す、スマホのえらぶモード
const { chromium, devices } = require('playwright');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch();
  const r = {}; const errs = [];
  const prep = (p) => p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); selectTrack(0); edit(() => { song.bars = 8; track().notes = [60, 62, 64, 65, 67, 69, 71, 72].map((pp, i) => ({ s: i * 48, p: pp, l: 48 })); }, 'テスト'); document.querySelector('#scroller').scrollLeft = 0; scrollToNotes(); });
  const ns = (p) => p.evaluate(() => track().notes.map((n) => `${n.s}:${n.p}`).sort().join(' '));
  // 曲の位置 → 画面の点
  const pt = (p, t, pitch) => p.evaluate(([t, pitch]) => { const sc = document.querySelector('#scroller'); const r = sc.getBoundingClientRect(); const rows = rowsFor(track()); const i = rows.findIndex((x) => x.p === pitch); return { x: r.left + LW + t * ppt() - sc.scrollLeft + 3, y: r.top + RH + (i + 0.5) * rowH(track()) - sc.scrollTop }; }, [t, pitch]);
  {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 820 } });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('pc: ' + e.message));
    await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900); await prep(p); await p.waitForTimeout(300);
    const before = await ns(p);
    // Shift＋ドラッグで最初の4音を囲む
    const a = await pt(p, 0, 65); const z = await pt(p, 4 * 48 - 6, 60);
    await p.keyboard.down('Shift');
    await p.mouse.move(a.x - 2, a.y - 8); await p.mouse.down(); await p.mouse.move(z.x, z.y + 8, { steps: 6 }); await p.mouse.up();
    await p.keyboard.up('Shift');
    r['囲んでえらんだ数'] = await p.evaluate(() => nsel.size);
    r['音の数は同じ（囲んでも置かない）'] = (await ns(p)) === before;
    r['操作バーが出る'] = await p.isVisible('#selBar');
    await p.screenshot({ path: `${OUT}/sel_pc.png` });
    // まとめて右へ2拍ドラッグ
    const g = await pt(p, 48 + 10, 62); const g2 = await pt(p, 48 + 10 + 96, 62);
    await p.mouse.move(g.x, g.y); await p.mouse.down(); await p.mouse.move(g2.x, g2.y, { steps: 6 }); await p.mouse.up();
    r['まとめて移動後'] = await ns(p);
    await p.keyboard.press('Control+z');
    r['元に戻す'] = (await ns(p)) === before;
    // Ctrl+A → Ctrl+C → 4小節目に貼りつけ
    await p.keyboard.press('Control+a'); r['Ctrl+A'] = await p.evaluate(() => nsel.size);
    await p.keyboard.press('Control+c');
    await p.evaluate(() => { ui.startTick = barStart(4); });
    await p.keyboard.press('Control+v'); await p.keyboard.press('Control+v');
    r['2回貼りつけ（8→24）'] = await p.evaluate(() => track().notes.length);
    r['2回目はうしろにつながる（最後の音）'] = await p.evaluate(() => Math.max(...track().notes.map((n) => n.s)));
    // ↑ で1つ上の音、Delete で消す
    const top = await p.evaluate(() => [...nsel].map((n) => n.p).sort((a, b) => a - b)[0]);
    await p.keyboard.press('ArrowUp');
    r['↑ で高さが上がる'] = `${top} → ${await p.evaluate(() => [...nsel].map((n) => n.p).sort((a, b) => a - b)[0])}`;
    await p.keyboard.press('Delete');
    r['Delete で消す（24→16）'] = await p.evaluate(() => track().notes.length);
    // Ctrl+D 複製
    await prep(p);
    await p.evaluate(() => { nsel = new Set(track().notes.slice(0, 2)); updateSelBar(); });
    await p.keyboard.press('Control+d');
    r['Ctrl+D 複製（8→10）'] = await p.evaluate(() => track().notes.length);
    // ふつうのクリックは今までどおり（置く・消す）
    await p.keyboard.press('Escape');
    const e1 = await pt(p, 576, 60);
    await p.mouse.click(e1.x + 4, e1.y); r['ふつうのクリックで置く'] = await p.evaluate(() => track().notes.length);
    await p.mouse.click(e1.x + 4, e1.y); r['もう一度で消す'] = await p.evaluate(() => track().notes.length);
    await ctx.close();
  }
  {
    const ctx = await b.newContext(devices['iPhone 13']);
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('phone: ' + e.message));
    await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900); await prep(p); await p.waitForTimeout(300);
    await p.tap('#btnSelTool');
    const cdp = await ctx.newCDPSession(p);
    const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
    const a = await pt(p, 0, 64); const z = await pt(p, 2 * 48 + 20, 60);
    await T('touchStart', [{ x: a.x - 2, y: a.y - 6 }]);
    for (let i = 1; i <= 6; i++) await T('touchMove', [{ x: a.x + (z.x - a.x) * i / 6, y: a.y + (z.y + 6 - a.y) * i / 6 }]);
    await T('touchEnd', []); await p.waitForTimeout(200);
    r['スマホ えらぶモードで囲む'] = await p.evaluate(() => nsel.size);
    await p.screenshot({ path: `${OUT}/sel_phone.png` });
    await p.waitForTimeout(300); await p.tap('#selDup'); await p.waitForTimeout(200); r['スマホ 複製ボタン'] = await p.evaluate(() => track().notes.length);
    await p.tap('#selDel'); r['スマホ 消すボタン'] = await p.evaluate(() => track().notes.length);
    await ctx.close();
  }
  r['エラー'] = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
