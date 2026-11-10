// だんだん遅く（rit.）：テンポが小節ごとに下がる・楽譜に rit.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 820 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(800);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); loadSong(sampleSong()); openBarDialog(4); });
  await p.selectOption('#barRamp', 'rit:4'); await p.click('#barOk'); await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    const o = scoreOpts(song.tracks.filter((t) => t.type === 'melody').map((t) => t.id), true); o.chords = o.chordObjs;
    const xml = Notation.musicXML(o);
    openScore();
    return { 'テンポ（5〜8小節）': [4, 5, 6, 7].map((b) => bpmAt(b)).join(' → '), 'MusicXMLにrit.': /rit\./.test(xml), '楽譜の絵にrit.': /rit\./.test(document.querySelector('#dlgScore .scoreview svg').textContent) };
  });
  await p.evaluate(() => { document.querySelector('#dlgScore').close(); openBarDialog(4); });
  await p.selectOption('#barRamp', '-'); await p.click('#barOk');
  r['やめると元のテンポ'] = await p.evaluate(() => bpmAt(7));
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
