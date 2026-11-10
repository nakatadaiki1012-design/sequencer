// MIDI：書き出して読みこむと、楽器・とちゅうのテンポ・拍子がもどる
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    loadSong(sampleSong());
    song.tracks[0].inst = 'flute'; song.tracks[1].inst = 'kenhamo';
    song.tempos = { 4: 140 }; song.meters = { 6: [3, 4] }; version++;
    const back = importMidi(midiBytes(), 'test.mid');
    return { 楽器: back.tracks.filter((t) => t.type === 'melody').map((t) => t.inst), テンポ: back.tempos, 拍子: back.meters, 小節: back.bars };
  });
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
