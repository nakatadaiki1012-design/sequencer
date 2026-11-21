// 楽譜：クリック・ドラッグ・タップで何が起きるかを、はっきり決める
//  入力モード：クリック＝音を置く／ドラッグ＝範囲をえらぶ（音は入らない）／おす前に音符の影が出る
//  選択モード：クリックでは音は入らない／ドラッグ＝範囲をえらぶ
//  指：動かしたらスクロール（音は入らない）。タップしたときだけ。音をえらぶと「ここから範囲でえらぶ」が出る
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const out = {};
  const song = { v: 2, title: 'm', bpm: 100, bars: 4, tracks: [{ type: 'melody', inst: 'piano', notes: [0, 1, 2, 3, 4, 5].map((i) => ({ s: i * 48, p: 60 + i * 2, l: 48 })) }] };
  // ---- パソコン（マウス）
  {
    const p = await b.newPage({ viewport: { width: 1366, height: 860 } });
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
    await p.evaluate((sg) => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); loadSong(sg, { own: true }); setView('score'); ui.sc.input = true; renderScoreEditNow(); }, song);
    await p.waitForTimeout(300);
    const geo = () => p.evaluate(() => { const v = document.querySelector('#scoreEditView'); const L = v._layout; const r = v.querySelector('svg').getBoundingClientRect(); const k = r.width / L.width; const sys = L.systems[0]; const st = sys.staves[0]; const B = (i) => sys.bars[i]; return { x3: r.left + (B(2).x0 + B(2).x1) / 2 * k, xa: r.left + (B(0).x0 + 8) * k, xz: r.left + (B(1).x1 - 4) * k, yMid: r.top + (st.top + 16) * k, yTop: r.top + (st.top - 30) * k, yBot: r.top + (st.top + 60) * k }; });
    const n = () => p.evaluate(() => track().notes.length);
    let g = await geo();
    const n0 = await n();
    // 影
    await p.mouse.move(g.x3, g.yMid); await p.waitForTimeout(100);
    out['PC 入力：おす前に、音符の影と音の名前が出る'] = await p.evaluate(() => { const q = document.querySelector('#scGhost'); return !!q && !q.hidden && q.textContent.length > 0 ? q.textContent : false; });
    // ドラッグ＝範囲（音は入らない）
    await p.mouse.move(g.xa, g.yTop); await p.mouse.down(); await p.mouse.move(g.xa + 40, g.yMid, { steps: 4 }); await p.mouse.move(g.xz, g.yBot, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(300);
    out['PC 入力：五線の上をドラッグ → 範囲をえらぶ・音は入らない'] = (await p.evaluate(() => ui.sc.sel.size)) + '音・音の数 ' + (await n() - n0);
    // クリック＝音を置く
    g = await geo();
    await p.mouse.click(g.x3, g.yMid); await p.waitForTimeout(300);
    out['PC 入力：クリック → 音が1つ入る'] = (await n()) - n0;
    // 選択モード
    await p.evaluate(() => { ui.sc.input = false; renderScorePal(); renderScoreEditNow(); });
    g = await geo();
    const n1 = await n();
    await p.mouse.move(g.x3 + 30, g.yMid); await p.waitForTimeout(100);
    out['PC 選択：影は出ない'] = await p.evaluate(() => { const q = document.querySelector('#scGhost'); return !q || q.hidden; });
    await p.mouse.click(g.x3 + 30, g.yMid); await p.waitForTimeout(200);
    out['PC 選択：クリックしても音は入らない'] = (await n()) === n1;
    await p.mouse.move(g.xa, g.yTop); await p.mouse.down(); await p.mouse.move(g.xz, g.yBot, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(300);
    out['PC 選択：ドラッグ → 範囲をえらぶ'] = await p.evaluate(() => ui.sc.sel.size);
    out['PC 下の説明に、今のモードが出る'] = await p.evaluate(() => document.querySelector('#scStatus').textContent.slice(0, 22));
    out['PC errs'] = errs;
    await p.close();
  }
  // ---- 指（タブレットのつもり：入力モード）
  {
    const ctx = await b.newContext({ ...devices['iPad (gen 7) landscape'] });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
    await p.evaluate((sg) => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); loadSong(sg, { own: true }); setView('score'); ui.sc.input = true; renderScoreEditNow(); }, song);
    await p.waitForTimeout(300);
    const cdp = await ctx.newCDPSession(p);
    const g = await p.evaluate(() => { const v = document.querySelector('#scoreEditView'); const L = v._layout; const r = v.querySelector('svg').getBoundingClientRect(); const k = r.width / L.width; const sys = L.systems[0]; const st = sys.staves[0]; return { x: r.left + (sys.bars[2].x0 + sys.bars[2].x1) / 2 * k, y: r.top + (st.top + 16) * k }; });
    const n = () => p.evaluate(() => track().notes.length);
    const n0 = await n();
    const touch = async (pts) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pts[0]] }); for (const q of pts.slice(1)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [q] }); await p.waitForTimeout(20); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(300); };
    await touch([{ x: g.x, y: g.y }, { x: g.x, y: g.y - 20 }, { x: g.x, y: g.y - 50 }, { x: g.x, y: g.y - 80 }]);
    out['指 入力：なぞる（スクロール）→ 音は入らない'] = (await n()) === n0;
    await touch([{ x: g.x, y: g.y }]);
    out['指 入力：タップ → 音が1つ入る'] = (await n()) - n0;
    // 音をえらぶ → 範囲ボタン → さいごの音
    const hp = await p.evaluate(() => { ui.sc.input = false; renderScoreEditNow(); const hs = [...document.querySelectorAll('#scoreEditView .nh')].map((el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); return [hs[0], hs[4]]; });
    await touch([hp[0]]);
    out['指 選択：音をタップ → 「ここから範囲でえらぶ」が出る'] = await p.evaluate(() => { const q = document.querySelector('#scoreEditView .scrange'); return q ? q.textContent : false; });
    await p.evaluate(() => document.querySelector('#scoreEditView .scrange').click());
    await p.waitForTimeout(300);
    const hp2 = await p.evaluate(() => { const el = document.querySelectorAll('#scoreEditView .nh')[4]; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await touch([hp2]);
    out['指 選択：さいごの音をタップ → その間を全部えらぶ（5）'] = await p.evaluate(() => ui.sc.sel.size);
    out['指 errs'] = errs;
    await p.screenshot({ path: process.argv[2] || 'tools/score_modes.png' });
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
