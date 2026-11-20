// 大きな曲の楽譜：部品をまとめて軽く（ぼう・加線・連桁を段ごとに1つの図形に）。見た目・音符を押す操作は今までどおり
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 860 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour');
  await p.waitForTimeout(900);
  const mk = (bars) => { const tracks = []; for (let k = 0; k < 30; k++) { const notes = []; for (let i = 0; i < bars * 8; i++) notes.push({ s: i * 24, p: 55 + ((i * 7 + k * 5) % 30), l: 24 }); tracks.push({ type: 'melody', name: 'P' + k, inst: ['flute', 'violin', 'cello'][k % 3], notes }); } return { v: 2, title: 'big', bpm: 120, bars, tracks }; };
  const out = {};
  const info = async (sg) => p.evaluate(async (sg) => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    loadSong(sg, { own: true }); setView('score'); renderScoreEditNow();
    await new Promise((r) => setTimeout(r, 300));
    const v = document.querySelector('#scoreEditView');
    const t0 = performance.now(); renderScoreEditNow(); const ms = performance.now() - t0;
    return { els: v.querySelectorAll('svg *').length, heads: v.querySelectorAll('.nh').length, hits: v.querySelectorAll('.nhhit').length, win: v._layout.window, ms: Math.round(ms) };
  }, sg);
  const big = await info(mk(100));
  out['大きな曲：部品の数は音符の2.5倍より少ない'] = big.els < big.heads * 2.5 ? true : `${big.els} / ${big.heads}`;
  out['大きな曲：一度に書く小節'] = JSON.stringify(big.win);
  out['大きな曲：書きなおし0.5秒より少ない'] = big.ms < 500 ? true : big.ms;
  // 音符を押すと、えらべる（当たりの四角がなくても）
  const pt = await p.evaluate(() => { const el = document.querySelectorAll('#scoreEditView .nh')[40]; el.scrollIntoView({ block: 'center' }); const q = el.getBoundingClientRect(); ui.sc.input = false; return { x: q.left + q.width / 2, y: q.top + q.height / 2, s: el.dataset.s, p: el.dataset.p, pi: +el.dataset.pi }; });
  await p.mouse.click(pt.x, pt.y);
  await p.waitForTimeout(300);
  out['音符のまん中を押すとえらべる'] = await p.evaluate((pt) => ui.sc.sel.has(pt.s + ':' + pt.p) && scoreParts.indexOf(track()) === pt.pi, pt);
  const pt2 = await p.evaluate(() => { const el = document.querySelectorAll('#scoreEditView .nh')[90]; el.scrollIntoView({ block: 'center' }); const q = el.getBoundingClientRect(); return { x: q.left + 1, y: q.top + q.height / 2, s: el.dataset.s, p: el.dataset.p }; });
  await p.mouse.click(pt2.x, pt2.y);
  await p.waitForTimeout(300);
  out['音符のはしを押してもえらべる'] = await p.evaluate((pt) => ui.sc.sel.has(pt.s + ':' + pt.p), pt2);
  await p.screenshot({ path: process.argv[2] || 'tools/big_score.png' });
  // 小さな曲は今までどおり（当たりの四角・1本ずつの線）
  const small = await info(mk(4));
  out['小さな曲：今までどおり'] = small.hits === small.heads && small.win === null;
  // まとめた絵と、まとめない絵が同じ見た目か（同じ曲を両方で描いて、黒い点の数をくらべる）
  out['まとめても見た目は同じ'] = await p.evaluate(async (sg) => {
    loadSong(sg, { own: true });
    const o = scoreOpts(song.tracks.map((t) => t.id), true); o.width = 1100; o.scale = 1; o.window = [0, 8];
    const draw = async (svg) => { const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }); const c = document.createElement('canvas'); c.width = 1100; c.height = 1600; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1100, 1600); g.drawImage(img, 0, 0); return g.getImageData(0, 0, 1100, 1600).data; };
    const a = await draw(Notation.render({ ...o, edit: null }));
    const z = await draw(Notation.render({ ...o, edit: { part: -1, cursor: null, sel: new Set(), color: '#00f' } }));
    let diff = 0, dark = 0; for (let i = 0; i < a.length; i += 4) { if (a[i] < 128) dark++; if (Math.abs(a[i] - z[i]) > 60) diff++; }
    return dark > 5000 && diff / dark < 0.01 ? true : `ちがう点 ${diff} / 黒い点 ${dark}`;
  }, mk(8));
  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
