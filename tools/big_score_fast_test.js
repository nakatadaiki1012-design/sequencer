// 大きな曲の楽譜：部品をまとめて軽く（ぼう・加線・連桁を段ごとに1つの図形に）。見た目・音符を押す操作は今までどおり
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
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
  // 変わった段だけ入れかえる：いろいろな操作のあと、全部作りなおした絵と同じか
  out['変わった段だけ入れかえても、全部作りなおしたときと同じ'] = await p.evaluate(async () => {
    const box = document.querySelector('#scoreEditView');
    const same = () => { const a = box.innerHTML; box._frame = null; renderScoreEditNow(); return a === box.innerHTML; };
    const res = [];
    let replaced = 0;
    const mo = new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeName === 'g') replaced++; });
    mo.observe(box, { subtree: true, childList: true });
    const tr = track();
    // 音を入れる・高さを変える
    edit(() => { tr.notes.push({ s: 12, p: 70, l: 12 }); }, 't'); renderScoreEditNow(); res.push(same());
    edit(() => { tr.notes[5].p += 2; }, 't'); renderScoreEditNow(); res.push(same());
    // えらぶ・カーソルを動かす
    ui.sc.sel = new Set([tr.notes[20].s + ':' + tr.notes[20].p]); renderScoreEditNow(); res.push(same());
    ui.sc.cursor = barStart(9); renderScoreEditNow(); res.push(same());
    // もどす
    undo(); renderScoreEditNow(); res.push(same());
    // 歌詞（段の高さが変わる → 全部作りなおしになる）
    edit(() => { track().notes[0].ly = 'あ'; }, 't'); renderScoreEditNow(); res.push(same());
    // べつのトラックをえらぶ
    selectTrack(3); renderScoreEditNow(); res.push(same());
    await new Promise((r) => setTimeout(r, 50));
    mo.disconnect();
    const total = box.querySelectorAll('svg > g.sys').length;
    return res.every(Boolean) ? `同じ（${res.length}回）・段は${total}こ` : JSON.stringify(res);
  });
  out['1音変えたとき、入れかえる段は1つだけ'] = await p.evaluate(async () => {
    const box = document.querySelector('#scoreEditView');
    renderScoreEditNow();
    let replaced = 0;
    const mo = new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeName === 'g') replaced++; });
    mo.observe(box, { subtree: true, childList: true });
    ui.sc.sel = new Set(); ui.sc.cursor = 0; renderScoreEditNow();
    await new Promise((r) => setTimeout(r, 30)); replaced = 0;
    edit(() => { track().notes[2].p += 1; }, 't'); renderScoreEditNow();
    await new Promise((r) => setTimeout(r, 30));
    mo.disconnect();
    return replaced;
  });
  // 再生：光っている音符が、止めたあとにのこらない
  out['再生して止めると、光った音符はのこらない'] = await p.evaluate(async () => {
    cheer = () => {};
    ui.startTick = 0; play();
    await new Promise((r) => setTimeout(r, 900));
    edit(() => { track().notes[3].p += 1; }, 't'); renderScoreEditNow();
    await new Promise((r) => setTimeout(r, 500));
    stop();
    await new Promise((r) => setTimeout(r, 300));
    return document.querySelectorAll('#scoreEditView .nh.playing').length === 0 && !document.querySelector('#playCur:not([hidden])');
  });
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
