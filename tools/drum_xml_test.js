const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(800);
  console.log(await p.evaluate(async () => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    loadSong({ v: 2, bars: 1, tracks: [{ type: 'melody', notes: [{ s: 0, p: 60, l: 192 }] }, { type: 'drum', grid: { kick: { 0: 2 }, ohat: { 24: 1 }, hihat: { 48: 1 }, tomH: { 72: 1 }, cowbell: { 96: 1 }, congaH: { 120: 1 }, snare: { 144: 1 } } }] });
    const o = scoreOpts(song.tracks.map((t) => t.id), true); o.chords = o.chordObjs;
    const xml = Notation.musicXML(o);
    const sg = await MusicXMLImport.readFile(new TextEncoder().encode(xml).buffer, 'x.musicxml');
    const dt = sg.tracks.find((t) => t.type === 'drum');
    return { もどった: dt ? Object.keys(dt.grid).sort().join(',') : 'なし', midi: (xml.match(/<midi-unpitched>\d+/g) || []).join(' ') };
  }), errs);
  await b.close();
})();
