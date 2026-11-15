// 浄書の見た目チェック用：いろいろな楽譜を画像にする（印刷と同じ設定）
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 1400 }, deviceScaleFactor: 2 }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const out = process.argv[2] || 'tools';
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  const songs = {
    melody: { title: 'ふるさとの歌', bpm: 88, bars: 8, key: 0, tracks: [{ type: 'melody', inst: 'piano', notes: [[0, 67, 72], [72, 69, 24], [96, 71, 48], [144, 72, 48], [192, 74, 96], [288, 72, 48], [336, 71, 24], [360, 69, 24], [384, 67, 144], [528, 64, 48], [576, 65, 36], [612, 67, 12], [624, 69, 24], [648, 71, 24], [672, 72, 48], [720, 74, 48], [768, 76, 48], [816, 74, 24], [840, 72, 24], [864, 71, 48], [912, 69, 48], [960, 67, 96], [1056, 65, 48], [1104, 64, 48], [1152, 62, 72], [1224, 64, 24], [1248, 65, 48], [1296, 67, 48], [1344, 60, 192]].map(([s, p, l], i) => ({ s, p, l, ...(i === 0 ? { ly: 'う' } : i < 6 ? { ly: 'さぎ' [0] } : {}) })), dyn: [{ t: 0, v: 'mp' }, { t: 768, v: 'f' }], hairpins: [{ s: 576, e: 768, type: 'cresc' }], slurs: [{ s: 0, e: 144 }, { s: 576, e: 672 }] }, { type: 'chord', chords: [{ r: 0, q: 'M' }, { r: 5, q: 'M' }, { r: 0, q: 'M' }, { r: 7, q: '7' }, { r: 9, q: 'm' }, { r: 2, q: 'm7' }, { r: 7, q: '7' }, { r: 0, q: 'M' }] }] },
    rhythm: { title: 'リズムいろいろ', bpm: 120, bars: 4, key: 2, tracks: [{ type: 'melody', inst: 'flute', notes: [[0, 74, 12], [12, 76, 12], [24, 78, 24], [48, 79, 18], [66, 78, 6], [72, 76, 24], [96, 74, 16], [112, 76, 16], [128, 78, 16], [144, 81, 48], [192, 83, 6], [198, 81, 6], [204, 79, 6], [210, 78, 6], [216, 76, 24], [240, 74, 72], [312, 73, 24], [336, 71, 48], [384, 69, 36], [420, 71, 12], [432, 73, 12], [444, 74, 12], [456, 76, 24], [480, 78, 24], [504, 79, 24], [528, 81, 48], [576, 86, 96], [672, 74, 96]].map(([s, p, l]) => ({ s, p, l })) }] },
    piano: { title: 'ピアノ', bpm: 100, bars: 4, key: 3, tracks: [{ type: 'melody', inst: 'piano', clef: 'grand', notes: [[0, 75, 48], [0, 67, 48], [0, 63, 48], [48, 74, 48], [48, 65, 48], [96, 72, 96], [96, 68, 96], [96, 63, 96], [0, 39, 96], [96, 46, 96], [192, 77, 24], [216, 75, 24], [240, 74, 24], [264, 72, 24], [288, 70, 96], [192, 44, 48], [240, 51, 48], [288, 46, 96], [384, 63, 192], [384, 67, 192], [384, 70, 192], [384, 75, 192], [384, 39, 192], [384, 51, 192], [576, 79, 48], [624, 80, 48], [672, 82, 96], [576, 48, 192]].map(([s, p, l]) => ({ s, p, l })) }] },
  };
  let k = 0;
  for (const [name, sg] of Object.entries(songs)) {
    await p.evaluate((sg) => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); loadSong({ v: 2, ...sg }, { own: true }); }, sg);
    const svg = await p.evaluate(() => { const o = scoreOpts(song.tracks.map((t) => t.id), true); o.width = 780; return Notation.render(o); });
    await p.setContent(`<html><body style="margin:0;background:#fff">${svg}</body></html>`);
    const el = await p.$('svg'); await el.screenshot({ path: `${out}/pro_${name}.png` });
    await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(700);
    k++;
  }
  console.log('ok', errs); await b.close();
})();
