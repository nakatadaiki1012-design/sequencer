// 浄書の見た目チェック 2：むずかしめの楽譜（声部2つ・3連符・タイ・休符・装飾音符・くり返し・フルスコア・ページ）
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 1400 }, deviceScaleFactor: 2 });
  const out = process.argv[2] || 'tools';
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  const N = (arr, extra = {}) => arr.map(([s, p, l, x]) => ({ s, p, l, ...extra, ...(x || {}) }));
  const songs = {
    voices: { title: '2つの声部とタイ', bpm: 90, bars: 4, key: 7, tracks: [{ type: 'melody', inst: 'flute', notes: [
      ...N([[0, 79, 96], [96, 78, 48], [144, 76, 72], [216, 74, 24], [240, 76, 96], [336, 78, 48], [384, 79, 288], [672, 81, 96]]),
      ...N([[0, 71, 48], [48, 72, 48], [96, 74, 96], [192, 71, 96], [288, 72, 96], [384, 74, 192], [576, 71, 96], [672, 74, 96]], { v: 2 }),
    ], ties: [] }] },
    tuplets: { title: '3連符と休符', bpm: 100, bars: 4, key: 0, meter: [3, 4], tracks: [{ type: 'melody', inst: 'violin', notes: N([[0, 72, 16], [16, 74, 16], [32, 76, 16], [48, 77, 48], [120, 79, 24], [144, 81, 32], [176, 79, 16], [208, 77, 16], [224, 76, 16], [240, 74, 48], [288, 72, 12], [312, 74, 12], [324, 76, 12], [336, 77, 48], [384, 79, 48, { gr: 81 }], [432, 76, 24, { art: ['stac'] }], [456, 77, 24, { art: ['stac'] }], [480, 79, 48, { art: ['acc'] }], [528, 84, 48, { art: ['ferm'] }]]), dyn: [{ t: 0, v: 'p' }, { t: 288, v: 'mf' }] }] },
    orch: { title: 'フルスコア', bpm: 120, bars: 4, key: 0, score: { orch: true }, tracks: [
      ['フルート', 'flute', 84], ['クラリネット', 'clarinet', 72], ['トランペット', 'trumpet', 72], ['ホルン', 'horn', 65], ['バイオリンⅠ', 'violin', 79], ['バイオリンⅡ', 'violin', 74], ['ビオラ', 'viola', 67], ['チェロ', 'cello', 48],
    ].map(([name, inst, base]) => ({ type: 'melody', name, inst, notes: N([[0, base, 48], [48, base + 2, 48], [96, base + 4, 96], [192, base + 5, 24], [216, base + 4, 24], [240, base + 2, 48], [288, base, 96], [384, base + 7, 192], [576, base, 192]]), dyn: [{ t: 0, v: 'mf' }] })) },
    repeat: { title: 'くり返し', bpm: 100, bars: 6, key: 5, repeats: { start: [0], end: [3], volta: { 2: 1, 3: 2 } }, tracks: [{ type: 'melody', inst: 'piano', notes: N([[0, 65, 48], [48, 69, 48], [96, 72, 96], [192, 70, 96], [288, 69, 96], [384, 67, 192], [576, 72, 96], [672, 70, 96], [768, 69, 192], [960, 65, 192]]), lyrics: 'ひ ら い た ひ ら い た な ん の は な' }] },
  };
  for (const [name, sg] of Object.entries(songs)) {
    const svg = await p.evaluate((sg) => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); loadSong({ v: 2, ...sg }, { own: true }); const o = combineParts(scoreOpts(song.tracks.map((t) => t.id), true)); o.width = 780; return Notation.render(o); }, sg);
    await p.setContent(`<html><body style="margin:0;background:#fff">${svg}</body></html>`);
    const el = await p.$('svg'); await el.screenshot({ path: `${out}/pro2_${name}.png` });
    await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(600);
  }
  console.log('ok'); await b.close();
})();
