// 楽譜を自動で整える：段のつり合い、歌詞の大きさをそろえる、間隔の広げ方（臨時記号の場所はのばさない）、
// 歌詞のある段の3連符は上、2度の和音の臨時記号が符頭にかさならない
const { chromium } = require('playwright');
const SONGS = require('./engrave_songs.js');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 860 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour');
  await p.waitForTimeout(900);
  const r = await p.evaluate(async (SONGS) => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const out = {};
    const render = (sg) => { loadSong(JSON.parse(JSON.stringify(sg)), { own: true }); const o = scoreOpts(song.tracks.map((t) => t.id), true); o.width = 780; const svg = Notation.render(o); return { svg, L: Notation.lastLayout }; };
    // 段のつり合い：さいごの段だけ2小節、のようにしない
    let { svg, L } = render(SONGS.song1);
    out['歌（9小節）の段ごとの小節の数'] = L.systems.map((s) => s.bars.length).join('+');
    out['どの段も右はしまで'] = L.systems.every((s) => Math.abs(s.bars[s.bars.length - 1].x1 - L.systems[0].bars[L.systems[0].bars.length - 1].x1) < 1);
    // 3連符：歌詞のある段は、数字が五線の上
    const t3 = [...svg.matchAll(/transform="translate\(([\d.]+) ([\d.]+)\) scale\(7\)"/g)].map((m) => +m[2]);
    out['3連符の数字が五線より上'] = t3.length + 'こ・' + (t3.length && t3.every((y) => y < L.systems[1].staves[0].top));
    // 歌詞の大きさ：1つの段の中では同じ
    ({ svg, L } = render(SONGS.song5));
    const sizes = [...svg.matchAll(/<text x="[\d.]+" y="([\d.]+)" font-size="([\d.]+)"[^>]*class="lyr"/g)];
    const byRow = {};
    for (const m of sizes) (byRow[m[1]] || (byRow[m[1]] = new Set())).add(m[2]);
    out['歌詞の大きさ（段ごとに1種類）'] = Object.values(byRow).map((s) => [...s].join('/')).join(' | ');
    out['横につめた歌詞はない'] = !/class="lyr"[^>]*textLength/.test(svg);
    // 間隔：臨時記号の多い和音があっても、同じ長さの音の間隔が大きくちがわない
    const q = (ps, s) => ps.map((pp) => ({ s, p: pp, l: 48 }));
    ({ svg, L } = render({ v: 2, title: 'acc', bpm: 100, bars: 2, tracks: [{ type: 'melody', inst: 'piano', notes: [...q([60], 0), ...q([62], 48), ...q([64], 96), ...q([61, 63, 66, 68, 70], 144), ...q([60], 192), ...q([62], 240), ...q([64], 288), ...q([65], 336)] }] }));
    const xs = L.systems[0].bars[0].xs;
    const gaps = xs.slice(1).map((x, i) => x - xs[i]);
    out['1小節目の間隔（さいごは臨時記号の分だけ広い）'] = gaps.map((g) => g.toFixed(0)).join(',');
    out['はじめの2つの間隔は同じ'] = Math.abs(gaps[0] - gaps[1]) < 0.5;
    out['臨時記号の分（5つの臨時記号。のばしても変わらない）'] = (gaps[2] - gaps[1]).toFixed(0);
    return out;
  }, SONGS);
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
