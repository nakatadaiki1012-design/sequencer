// 音ごとの強さ：弱く・強く、再生の大きさ、MIDI 往復
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 820 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    loadSong(sampleSong()); selectTrack(0);
    const n = track().notes.slice().sort((a, b) => a.s - b.s);
    nsel = new Set(n.slice(0, 2)); selVelocity(-1); selVelocity(-1);
    nsel = new Set(n.slice(2, 4)); selVelocity(1);
    const v = (x) => eventList().find((e) => e.kind === 'note' && e.tr === track() && e.p === x.p && e.t === x.s);
    const out = { '弱くした音の強さ': n[0].vel, '強くした音の強さ': n[2].vel, '再生の大きさ（弱・ふつう・強）': [v(n[0]).v, v(n[5]).v, v(n[2]).v].map((x) => +x.toFixed(2)) };
    const back = importMidi(midiBytes(), 'x.mid');
    const bn = back.tracks[0].notes.slice().sort((a, b) => a.s - b.s);
    out['MIDI往復の強さ'] = [bn[0].vel || 1, bn[2].vel || 1, bn[5].vel || 1];
    nsel = new Set(); updateSelBar(); draw();
    return out;
  });
  await p.screenshot({ path: `${OUT}/velocity.png`, clip: { x: 280, y: 300, width: 700, height: 500 } });
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
