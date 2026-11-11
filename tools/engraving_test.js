// 浄書のきまり：3連符のかぎ・歌の強弱は上・1段目は小節番号なし・3/4 の8分6つは1本・6/8 のテンポは付点4分・最後の段が1小節にならない・メリスマの線
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(1000);
  const r = await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const N = (s, p, l, x = {}) => ({ s, p, l, ...x });
    const svgOf = (sg) => { loadSong(sg); const div = document.createElement('div'); div.innerHTML = scoreSvg(song.tracks.filter((t) => t.type === 'melody').map((t) => t.id)); return div; };
    const o = {};
    // 4分の3連符：数字は1つ、かぎつき
    let v = svgOf({ v: 2, bars: 1, tracks: [{ type: 'melody', notes: [N(0, 64, 32), N(32, 65, 32), N(64, 67, 32), N(96, 69, 96)] }] });
    o['4分3連：かぎ'] = v.querySelectorAll('path[stroke-width="0.9"]').length === 1;
    // 歌の強弱は五線の上（五線が下がって、上に強弱の場所ができる）
    const topLine = (vv) => Math.min(...[...vv.querySelectorAll('line')].filter((l) => +l.getAttribute('x2') - +l.getAttribute('x1') > 300).map((l) => +l.getAttribute('y1')));
    const inst = svgOf({ v: 2, bars: 1, tracks: [{ type: 'melody', dyn: [{ t: 0, v: 'f' }], notes: [N(0, 64, 192)] }] });
    v = svgOf({ v: 2, bars: 1, tracks: [{ type: 'melody', dyn: [{ t: 0, v: 'f' }], notes: [N(0, 64, 192, { ly: 'あ' })] }] });
    o['歌の強弱は上'] = topLine(v) - topLine(inst) === 18;
    // 1段目に小節番号「1」を書かない
    o['1段目は小節番号なし'] = ![...v.querySelectorAll('text')].some((t) => t.textContent === '1' && t.getAttribute('font-size') === '10');
    // 3/4 の8分6つは1本の連桁
    v = svgOf({ v: 2, bars: 1, meter: [3, 4], tracks: [{ type: 'melody', notes: [0, 1, 2, 3, 4, 5].map((i) => N(i * 24, 64 + i, 24)) }] });
    o['3/4 の8分6つは連桁1本'] = (v.innerHTML.match(/<path d="M[^"]*Z" fill="#111">/g) || []).length === 1;
    // 6/8 のテンポは付点4分（90 → 60）
    v = svgOf({ v: 2, bars: 1, bpm: 90, meter: [6, 8], tracks: [{ type: 'melody', notes: [N(0, 64, 144)] }] });
    o['6/8 は付点4分＝60'] = [...v.querySelectorAll('text')].some((t) => t.textContent === '= 60');
    // メリスマ：歌詞のあとにのばす線
    v = svgOf({ v: 2, bars: 2, tracks: [{ type: 'melody', notes: [N(0, 64, 48, { ly: 'あ' }), N(48, 65, 48), N(96, 67, 96), N(192, 64, 192, { ly: 'い' })] }] });
    o['メリスマの線'] = v.querySelectorAll('line[stroke-width="1.1"]').length === 1;
    // 最後の段が1小節だけにならない
    loadSong({ v: 2, bars: 9, tracks: [{ type: 'melody', notes: Array.from({ length: 9 * 4 }, (_, i) => N(i * 48, 60 + (i % 8), 48)) }] });
    scoreSvg(song.tracks.map((t) => t.id));
    const sys = Notation.lastLayout.systems;
    o['最後の段が1小節だけにならない'] = sys.map((x) => x.bars.length).join('+') + ' ' + (sys.length < 2 || sys[sys.length - 1].bars.length >= 2);
    return o;
  });
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
