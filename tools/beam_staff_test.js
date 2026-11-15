// 連桁と五線：五線の中の連桁のはしが、線に「のる・ぶらさがる・またがる」か（線とのあいだに細いすきま＝くさびがないか）
// 3連符の数字・かぎが五線の線にかからないか、オクターブの点線が音符・加線にかからないか
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1300, height: 1000 }, deviceScaleFactor: 3 }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const out = process.argv[2] || 'tools';
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    // いろいろな高さ・かたむきの8分・16分の連桁と、3連符
    const notes = [];
    const pats = [[64, 67], [65, 69], [67, 71], [69, 72], [71, 74], [72, 76], [74, 77], [76, 72], [77, 74], [71, 67], [62, 65], [60, 64], [72, 71], [67, 69], [74, 76], [65, 64]];
    let t = 0;
    for (const [a, z] of pats) { notes.push({ s: t, p: a, l: 24 }, { s: t + 24, p: z, l: 24 }); t += 48; }
    for (const [a, z] of pats.slice(0, 8)) { notes.push({ s: t, p: a, l: 12 }, { s: t + 12, p: z, l: 12 }, { s: t + 24, p: a + 2, l: 12 }, { s: t + 36, p: z - 1, l: 12 }); t += 48; }
    for (const [a, z] of pats.slice(0, 8)) { notes.push({ s: t, p: a, l: 16 }, { s: t + 16, p: z, l: 16 }, { s: t + 32, p: a + 1, l: 16 }); t += 48; }
    const hi = [88, 91, 93, 86, 84, 89, 91, 95];
    hi.forEach((p, i) => notes.push({ s: t + i * 24, p, l: 24 }));
    const bars = Math.ceil((t + 192) / 192);
    loadSong({ v: 2, title: 'beam', bpm: 100, bars, key: 0, tracks: [{ type: 'melody', inst: 'flute', notes, ottava: [{ s: t, e: t + 192, k: 1 }] }] }, { own: true });
    const o = scoreOpts(song.tracks.map((x) => x.id), true); o.width = 1100;
    const svg = Notation.render(o);
    document.body.insertAdjacentHTML('beforeend', `<div id="bt" style="position:fixed;left:0;top:0;background:#fff;z-index:99999">${svg}</div>`);
    const root = document.querySelector('#bt svg');
    const L = Notation.lastLayout;
    const k = root.getBoundingClientRect().width / L.width;
    // 五線の線の y（SVG の座標）
    const staffLines = L.systems.flatMap((s) => s.staves.flatMap((st) => [0, 1, 2, 3, 4].map((i) => st.top + i * 8)));
    const sysOf = (y) => L.systems.flatMap((s) => s.staves).find((st) => y >= st.top - 2 && y <= st.top + 34);
    let edges = 0, wedges = 0;
    const wedgeList = [];
    // 連桁の形（太さ4の四角）を集めて、x がつながるものを1つの連桁のまとまりにする
    const segs = [];
    for (const path of root.querySelectorAll('path[fill="#111"]')) {
      const m = path.getAttribute('d').match(/^M([\d.]+) ([\d.-]+) L([\d.]+) ([\d.-]+) L[\d.]+ ([\d.-]+) L[\d.]+ ([\d.-]+) Z$/);
      if (!m) continue;
      const [, x1, y1, x2, y2, y3, y4] = m.map(Number);
      if (Math.abs(y3 - y2) < 3.5 || Math.abs(y3 - y2) > 4.5) continue;
      const st0 = sysOf(y1) || sysOf(y2) || sysOf(y3);
      segs.push({ x1, x2, top: st0 ? st0.top : Math.round(y1 / 100) * 1e4, ends: [[x1, y1], [x1, y4], [x2, y2], [x2, y3]] });
    }
    segs.sort((a, z) => a.top - z.top || a.x1 - z.x1);
    const groups = [];
    for (const sg of segs) { const g = groups[groups.length - 1]; if (g && g.top === sg.top && sg.x1 <= g.x2 + 0.5 && sg.x1 >= g.x1 - 0.5) { g.x2 = Math.max(g.x2, sg.x2); g.segs.push(sg); } else groups.push({ x1: sg.x1, x2: sg.x2, top: sg.top, segs: [sg] }); }
    // はし（いちばん左・右）の y だけを見る（かたむいた連桁のとちゅうが線をまたぐのは、ふつうのこと）
    for (const g of groups) for (const sg of g.segs) for (const [x, yy] of sg.ends) {
      if (Math.abs(x - g.x1) > 1.5 && Math.abs(x - g.x2) > 1.5) continue;
      const st = sysOf(yy);
      if (!st) continue;
      edges++;
      for (const ly of staffLines) { const dd = Math.abs(yy - ly); if (dd > 0.35 && dd < 1.65) { wedges++; wedgeList.push(Math.round(x) + ':' + (yy - st.top).toFixed(2)); } }
    }
    // 3連符の数字・かぎ、オクターブの点線と、五線の線
    const tup = [...root.querySelectorAll('path')].filter((pp) => /stroke-width="0.9"/.test(pp.outerHTML) && /L/.test(pp.getAttribute('d')) && pp.getAttribute('fill') === 'none');
    const hitLine = (y) => staffLines.some((ly) => Math.abs(y - ly) < 1.2);
    let tupHits = 0;
    for (const pp of tup) { const ys = [...pp.getAttribute('d').matchAll(/[ML]([\d.]+) ([\d.-]+)/g)].map((q) => +q[2]); if (ys.some((y) => hitLine(y) && sysOf(y))) tupHits++; }
    const dash = [...root.querySelectorAll('line[stroke-dasharray]')];
    const heads = [...root.querySelectorAll('.nh')].map((e) => e.getBoundingClientRect());
    const ledgers = [...root.querySelectorAll('line[stroke-width="1.3"]')].map((e) => e.getBoundingClientRect());
    let dashHits = 0;
    for (const dl of dash) { const q = dl.getBoundingClientRect(); for (const h of heads.concat(ledgers)) if (h.right > q.left && h.left < q.right && Math.abs((h.top + h.bottom) / 2 - q.top) < h.height / 2 + 3) dashHits++; }
    return { 連桁: segs.length + "本・まとまり" + groups.length, 連桁のはし: edges, くさび: wedges, くさびの場所x: wedgeList.slice(0, 10), 連符のかぎが線の上: tupHits, オクターブ点線が音符や加線にかかる: dashHits };
  });
  await (await p.$('#bt svg')).screenshot({ path: out + '/beams.png' });
  r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
