const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(800);
  console.log(await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const types = (sg) => { loadSong(sg); const o = scoreOpts([song.tracks[0].id], false); const x = Notation.musicXML(o); return [...x.matchAll(/<note>([\s\S]*?)<\/note>/g)].map((m) => { const t = (m[1].match(/<type>(\w+)<\/type>/) || [])[1] || 'whole'; return (/<rest/.test(m[1]) ? 'R' : '') + t + (/<dot\/>/.test(m[1]) ? '.' : ''); }).join(' '); };
    const one = (s, l) => types({ v: 2, bars: 1, tracks: [{ type: 'melody', notes: [{ s, p: 60, l }] }] });
    return { '1拍目だけ': one(0, 48), '2拍目だけ': one(48, 48), '3拍目だけ': one(96, 48), '4拍目だけ': one(144, 48), '8分（1拍裏）': one(24, 24), '6/8 1つめだけ': types({ v: 2, bars: 1, meter: [6, 8], tracks: [{ type: 'melody', notes: [{ s: 0, p: 60, l: 24 }] }] }) };
  }), errs);
  await b.close();
})();
