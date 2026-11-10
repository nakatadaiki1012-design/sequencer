// 1小節に2つのコード：入れ方（前半→後半→次の小節）、鳴り方、MusicXML の書き出し→読みこみ
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 820 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  const r = {};
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); loadSong(sampleSong()); selectTrack(song.tracks.findIndex((t) => t.type === 'chord')); selectBars(cur, 0, 0); renderEditorTools(); draw(); });
  await p.click('.halfseg [data-h="1"]');
  await p.click('#chordPalette .chordbtn[data-i="0"]'); // C
  r['前半を入れたら後半へ'] = await p.evaluate(() => ui.chordHalf + ' / 小節' + (ui.selBar + 1));
  await p.click('#chordPalette .chordbtn[data-i="2"]'); // G
  r['後半を入れたら次の小節へ'] = await p.evaluate(() => ui.chordHalf + ' / 小節' + (ui.selBar + 1));
  r['1小節目のコード'] = await p.evaluate(() => chordLabel(track().chords[0]));
  r['鳴る音の根音（前半・後半）'] = await p.evaluate(() => { const ev = chordEvents(track()).filter((e) => e.s < barStart(1)); const lo = (a) => Math.min(...a.map((e) => e.p % 12)); return [ev.filter((e) => e.s < chordHalf(0)).map((e) => e.p % 12).sort((a, b) => a - b).join(','), ev.filter((e) => e.s >= chordHalf(0)).map((e) => e.p % 12).sort((a, b) => a - b).join(',')]; });
  await p.evaluate(() => { selectBars(cur, 0, 0); ui.chordHalf = 0; renderEditorTools(); draw(); });
  await p.screenshot({ path: `${OUT}/chord_half.png` });
  r['MusicXML 往復'] = await p.evaluate(async () => {
    const o = scoreOpts(song.tracks.filter((t) => t.type === 'melody').map((t) => t.id), true); o.chords = o.chordObjs; const xml = Notation.musicXML(o);
    const sg = await MusicXMLImport.readFile(new TextEncoder().encode(xml).buffer, 'x.musicxml');
    const ct = sg.tracks.find((t) => t.type === 'chord');
    return ct ? chordLabel(ct.chords[0]) : 'コードなし';
  }).catch((e) => 'ERR ' + e.message);
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
