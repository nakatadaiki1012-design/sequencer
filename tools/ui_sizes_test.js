// いろいろな画面サイズで撮影＋はみ出し・文字切れ・小さすぎる部品を測る
const { chromium } = require('playwright');
const OUT = process.argv[2];
const SIZES = [
  ['p360', 360, 640, true], ['p390', 390, 844, true], ['p430', 430, 932, true],
  ['t768', 768, 1024, true], ['t1024', 1024, 768, true], ['l1280', 1280, 720, false], ['l1366', 1366, 768, false], ['d1920', 1920, 1080, false],
];
(async () => {
  const b = await chromium.launch();
  const report = {};
  for (const [name, w, h, touch] of SIZES) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch && w < 700, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { try { localStorage.setItem('otsumiki-tour', '1'); } catch (e) {} });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(1200);
    await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); });
    await p.waitForTimeout(300);
    const measure = () => p.evaluate(() => {
      const r = { hscroll: document.documentElement.scrollWidth > innerWidth + 1, offscreen: [], clipped: [], tiny: [], overlap: [] };
      const vis = (el) => { const s = getComputedStyle(el); const b = el.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && b.width > 0 && b.height > 0 && !el.closest('[hidden],dialog:not([open]),details:not([open]) > :not(summary)'); };
      const name = (el) => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '')) + ' ' + (el.textContent || el.title || '').trim().slice(0, 14);
      const ctrls = [...document.querySelectorAll('button, summary, select, input, label.tempo')].filter(vis);
      for (const el of ctrls) {
        const bx = el.getBoundingClientRect();
        if (bx.right > innerWidth + 1 || bx.left < -1) r.offscreen.push(name(el));
        if (el.scrollWidth > el.clientWidth + 2 && el.tagName !== 'SELECT' && el.tagName !== 'INPUT') r.clipped.push(name(el));
        if (Math.min(bx.width, bx.height) < 28 && el.type !== 'checkbox' && el.type !== 'range') r.tiny.push(name(el) + ` ${Math.round(bx.width)}x${Math.round(bx.height)}`);
      }
      // ボタン同士の重なり
      for (let i = 0; i < ctrls.length; i++) for (let j = i + 1; j < ctrls.length; j++) {
        const a = ctrls[i].getBoundingClientRect(), c = ctrls[j].getBoundingClientRect();
        if (ctrls[i].contains(ctrls[j]) || ctrls[j].contains(ctrls[i])) continue;
        const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left), oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
        if (ox > 4 && oy > 4) r.overlap.push(name(ctrls[i]) + ' × ' + name(ctrls[j]));
      }
      const cv = document.querySelector('#editorWrap'); const cb = cv && cv.getBoundingClientRect();
      r.editorArea = cb ? Math.round((cb.width * Math.max(0, Math.min(cb.bottom, innerHeight) - cb.top)) / (innerWidth * innerHeight) * 100) + '%' : '-';
      return r;
    });
    const rep = {};
    await p.screenshot({ path: `${OUT}/${name}_1grid.png` });
    rep.grid = await measure();
    await p.evaluate(() => { if (isPhone) setPhoneView('score'); else setView('score'); }); await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/${name}_2score.png` });
    rep.score = await measure();
    if (w < 700) {
      for (const v of ['tracks', 'canvas', 'more']) { await p.evaluate((v) => setPhoneView(v), v); await p.waitForTimeout(350); await p.screenshot({ path: `${OUT}/${name}_3${v}.png` }); rep[v] = await measure(); }
      await p.evaluate(() => setPhoneView('edit'));
    } else {
      await p.evaluate(() => setView('grid'));
      await p.evaluate(() => document.querySelector('[data-pop="menu"]').open = true); await p.waitForTimeout(200);
      await p.screenshot({ path: `${OUT}/${name}_3menu.png` }); rep.menu = await measure();
      await p.evaluate(() => closePops());
    }
    await p.evaluate(() => openScore()); await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/${name}_4print.png` }); rep.print = await measure();
    await p.evaluate(() => document.querySelector('#dlgScore').close());
    await p.evaluate(() => openBarDialog(2)); await p.waitForTimeout(200);
    await p.screenshot({ path: `${OUT}/${name}_5bar.png` }); rep.bar = await measure();
    await p.evaluate(() => document.querySelector('#dlgBar').close());
    await p.evaluate(() => openPicker ? openPicker() : null).catch(() => {});
    rep.errs = errs;
    report[name] = rep;
    await ctx.close();
  }
  require('fs').writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
  for (const [k, v] of Object.entries(report)) {
    console.log('==', k);
    for (const [view, r] of Object.entries(v)) if (view !== 'errs') console.log(`  ${view}: hscroll=${r.hscroll} area=${r.editorArea} off=${r.offscreen.length} clip=${r.clipped.length} tiny=${r.tiny.length} overlap=${r.overlap.length}`);
    if (v.errs.length) console.log('  ERR', v.errs);
  }
  await b.close();
})();
