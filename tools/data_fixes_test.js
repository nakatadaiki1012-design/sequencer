// データの直し：こわれたファイルでも止まらない／MIDIで拍子が変わってもさいごの音まで・打楽器・同じ高さの音
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(1000);
  const r = await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const o = {};
    for (const [k, bad] of Object.entries({ scale: { scale: 'foo' }, keys: { keys: { 2: null } }, repeats: { repeats: { start: 5 } }, dyn: { dynBad: 1 }, eq: { eq: { low: 'x' }, master: 'y' } })) {
      const sg = { v: 2, bars: 4, title: k, ...bad, tracks: [{ type: 'melody', notes: [{ s: 0, p: 60, l: 48 }], ...(k === 'dyn' ? { dyn: [null], slurs: [null] } : {}) }] };
      try { loadSong(sg); eventList(); renderScoreEdit && setView('score'); setView('grid'); o[k] = 'ok'; } catch (e) { o[k] = e.message; }
    }
    loadSong({ v: 2, bars: 6, meters: { 2: [2, 4] }, tracks: [{ type: 'melody', notes: [{ s: 0, p: 60, l: 192 }, { s: 0, p: 60, l: 48, v: 2 }, { s: 672, p: 67, l: 96 }] }, { type: 'drum', kit: 'school', grid: { odaiko: { 0: 1 }, castanet: { 48: 1 } } }] });
    const back = importMidi(midiBytes(), 't.mid');
    o['MIDI 小節'] = back.bars;
    o['MIDI 同じ高さの音'] = back.tracks[0].notes.filter((n) => n.p === 60).map((n) => n.l).sort().join(',');
    const dr = back.tracks.find((t) => t.type === 'drum');
    o['MIDI 打楽器'] = Object.keys(dr.grid).sort().join(',') + ' / ' + dr.kit;
    return o;
  });
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
