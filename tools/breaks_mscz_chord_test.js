// 小節を入れる・消すと、楽譜の改行もいっしょにずれる／MuseScore に書き出すとき、音の始まらない拍のコードも消えない
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour');
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const out = {};
    loadSong({ v: 2, title: 'brk', bpm: 100, bars: 12, tracks: [{ type: 'melody', inst: 'piano', notes: [] }], score: { breaks: [4, 8] } }, { own: true });
    selectBars(0, 2, 3); insertBars(); // 3小節目の前に2小節
    out['2小節入れたあと（[6,10]）'] = JSON.stringify(song.score.breaks);
    selectBars(0, 6, 6); insertBars(); // ちょうど改行の小節（7小節目）の前に1小節
    out['改行の所に1小節入れたあと（[6,11]）'] = JSON.stringify(song.score.breaks);
    window.confirm = () => true;
    selectBars(0, 0, 1); deleteBars(); // 1〜2小節目を消す
    out['2小節消したあと（[4,9]）'] = JSON.stringify(song.score.breaks);
    selectBars(0, 4, 5); deleteBars(); // 改行の小節をふくめて消す
    out['改行の小節をふくめて消したあと（[4,7]）'] = JSON.stringify(song.score.breaks);
    // MuseScore：全音符の上に、1・2・3・4拍目のコード
    loadSong({ v: 2, title: 'chd', bpm: 100, bars: 2, tracks: [{ type: 'melody', inst: 'piano', notes: [{ s: 0, p: 60, l: 192 }, { s: 192, p: 64, l: 96 }, { s: 288, p: 65, l: 96 }] },
      { type: 'chord', inst: 'piano', chords: [{ r: 0, q: 'M', x: [{ o: 48, r: 5, q: 'M' }, { o: 96, r: 7, q: '7' }, { o: 144, r: 0, q: 'M' }] }, { r: 9, q: 'm', x: [{ o: 48, r: 2, q: 'm' }] }] }] }, { own: true });
    const ids = song.tracks.filter((t) => t.type !== 'chord').map((t) => t.id);
    const o = scoreOpts(ids, true); o.chords = o.chordObjs;
    const xml = MuseScoreExport.mscx(o);
    out['xmlが正しい'] = !new DOMParser().parseFromString(xml, 'application/xml').getElementsByTagName('parsererror').length;
    out['書いたコードの数（6）'] = (xml.match(/<Harmony>/g) || []).length;
    const back = MusicXMLImport.parseMscx(xml, 'x.mscx');
    const ct = back.tracks.find((t) => t.type === 'chord');
    const seg = (c) => (c ? [{ o: 0, r: c.r, q: c.q }, ...(c.x || [])].map((x) => x.o + ':' + x.r + x.q).join(' ') : '-');
    out['読みもどしたコード'] = ct ? ct.chords.map(seg).join(' | ') : 'なし';
    out['読みもどした音の数（3）'] = back.tracks.filter((t) => t.type === 'melody').reduce((a, t) => a + t.notes.length, 0);
    return out;
  });
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
