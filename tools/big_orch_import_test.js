// 大きなオーケストラ曲の読みこみ：MuseScore 3 形式（音符の中のスラー・作曲者・移調・打楽器の名前・同じ調/音部記号の書き直し）
// 640小節×34段の楽譜をその場で作って読みこみ、全部入るか・楽譜の画面が軽いかを調べる
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 900 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour');
  await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); });
  const r = await p.evaluate(async () => {
    const BARS = 640;
    const NSTAFF = 34;
    const inst = (i) => {
      if (i === 0) return '<Instrument><trackName>B♭ Clarinet</trackName><transposeDiatonic>-1</transposeDiatonic><transposeChromatic>-2</transposeChromatic><Channel><program value="71"/></Channel></Instrument>';
      if (i === 1) return '<Instrument><trackName>Viola</trackName><clef>C3</clef><Channel><program value="41"/></Channel></Instrument>';
      if (i === NSTAFF - 1) return '<Instrument><trackName>Cymbals</trackName><useDrumset>1</useDrumset><Drum pitch="59"><name>Concert Cymbal</name></Drum><Drum pitch="39"><name>Castanets</name></Drum></Instrument>';
      return `<Instrument><trackName>Part ${i + 1}</trackName><Channel><program value="0"/></Channel></Instrument>`;
    };
    let parts = '';
    let staves = '';
    for (let i = 0; i < NSTAFF; i++) {
      parts += `<Part><Staff id="${i + 1}">${i === NSTAFF - 1 ? '<StaffType group="percussion"/>' : ''}</Staff><trackName>${i === 0 ? 'B♭ Clarinet' : i === 1 ? 'Viola' : i === NSTAFF - 1 ? 'Cymbals' : 'Part ' + (i + 1)}</trackName>${inst(i)}</Part>`;
      let ms = '';
      for (let m = 0; m < BARS; m++) {
        let v = '';
        if (m === 0) v += '<TimeSig><sigN>2</sigN><sigD>4</sigD></TimeSig>';
        // 同じ調の書き直し（20小節ごと）と、見えない調号
        if (m === 0 || m % 20 === 0) v += '<KeySig><accidental>3</accidental></KeySig>';
        if (m === 300) v += '<KeySig><visible>0</visible><accidental>-1</accidental></KeySig>';
        if (m === 301) v += '<KeySig><accidental>-1</accidental></KeySig>';
        // 同じ音部記号の書き直し
        if (i === 1 && m % 50 === 0) v += '<Clef><concertClefType>C3</concertClefType></Clef>';
        if (i === NSTAFF - 1) v += `<Chord><durationType>quarter</durationType><Note><pitch>${m % 2 ? 39 : 59}</pitch></Note></Chord><Rest><durationType>quarter</durationType></Rest>`;
        else v += `<Chord><durationType>eighth</durationType>${m % 4 === 0 ? '<Spanner type="Slur"><Slur/><next><location><fractions>3/8</fractions></location></next></Spanner>' : ''}<Note><pitch>${60 + (i % 12)}</pitch></Note></Chord>`
          + '<Chord><durationType>eighth</durationType><Note><pitch>62</pitch></Note></Chord><Chord><durationType>eighth</durationType><Note><pitch>64</pitch></Note></Chord>'
          + `<Chord><durationType>eighth</durationType>${m % 4 === 0 ? '<Spanner type="Slur"><prev><location><fractions>-3/8</fractions></location></prev></Spanner>' : ''}<Note><pitch>65</pitch></Note></Chord>`;
        ms += `<Measure><voice>${v}</voice></Measure>`;
      }
      staves += `<Staff id="${i + 1}">${ms}</Staff>`;
    }
    const xml = `<?xml version="1.0"?><museScore version="3.01"><Score><Division>480</Division><metaTag name="composer">Test Composer</metaTag><metaTag name="workTitle">Big Orchestra</metaTag>${parts}${staves.replace('<Staff id="1">', '<Staff id="1"><VBox><Text><style>Subtitle</style><text>(Op. 1)</text></Text></VBox>')}</Score></museScore>`;
    const t0 = performance.now();
    const sg = await MusicXMLImport.readFile(new TextEncoder().encode(xml).buffer, 'big.mscx');
    const t1 = performance.now();
    loadSong(sg, { own: true });
    const out = {};
    out['読む秒'] = ((t1 - t0) / 1000).toFixed(1);
    out['小節（640）'] = song.bars;
    out['トラック（34）'] = song.tracks.length;
    out['音の数（33×640×4＝84480）'] = song.tracks.reduce((a, t) => a + (t.notes ? t.notes.length : 0), 0);
    out['スラー（33×160＝5280）'] = song.tracks.reduce((a, t) => a + (t.slurs ? t.slurs.length : 0), 0);
    out['調の変わり目（301小節目でヘ長調、320小節目でイ長調にもどる。書き直しは数えない）'] = JSON.stringify(song.keys);
    out['ビオラ：音部記号 alto・変化なし'] = song.tracks[1].clef + '・' + JSON.stringify(song.tracks[1].clefChg || {});
    out['クラリネットの移調（2）'] = song.tracks[0].trans;
    out['作曲・サブタイトル'] = song.score.composer + '・' + song.score.subtitle;
    out['フルスコアの書き方'] = !!song.score.orch;
    const dr = song.tracks.find((t) => t.type === 'drum');
    out['打楽器'] = dr.kit + ':' + Object.keys(dr.grid).sort().join(',');
    // 楽譜の画面：前後の小節だけ書くので軽い
    setView('score');
    const t2 = performance.now();
    renderScoreEditNow();
    out['楽譜を書く秒（1秒より少ない）'] = ((performance.now() - t2) / 1000).toFixed(2);
    out['ページ'] = document.querySelector('.scwin span') ? document.querySelector('.scwin span').textContent : 'なし';
    document.querySelector('.scwin button[data-w="1"]').click();
    out['次のページ'] = document.querySelector('.scwin span').textContent;
    out['楽譜の要素の数'] = document.querySelectorAll('#scoreEditView *').length;
    return out;
  });
  // 小さな曲では、ページの帯は出ない
  r['小さな曲でページの帯'] = await p.evaluate(() => {
    loadSong({ v: 2, title: 's', bars: 8, tracks: [{ type: 'melody', inst: 'piano', notes: [{ s: 0, p: 60, l: 48 }] }] }, { own: true });
    setView('score'); renderScoreEditNow();
    return !!document.querySelector('.scwin');
  });
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
