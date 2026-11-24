// 移調楽器（B♭ トランペット）の曲を MuseScore・MusicXML に書き出したとき
//   調号は「書く音」の調（MuseScore の決まり）＋実音の調、コードネームも楽器の調、作詞者の名前も入る
//   読みこみなおすと、もとの曲（実音の調・コード）にもどる
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(700);
  const r = await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const SONG = { v: 2, title: 'あたらしい曲', bpm: 133, bars: 4, key: 0, minor: true, tracks: [
      { type: 'melody', name: 'トランペット', inst: 'trumpet', notes: [{ s: 0, p: 64, l: 48 }, { s: 48, p: 67, l: 48 }, { s: 96, p: 69, l: 96 }, { s: 192, p: 66, l: 96 }, { s: 288, p: 68, l: 96 }, { s: 384, p: 70, l: 192 }, { s: 576, p: 68, l: 96 }] },
      { type: 'chord', name: 'コード', chords: [{ r: 9, q: 'm' }, { r: 7, q: 'M' }, { r: 5, q: 'M' }, { r: 4, q: 'M' }] },
    ] };
    loadSong(SONG);
    Object.assign(scoreSettings(), { composer: 'あああ', lyricist: 'ああ', orch: false, concert: false });
    scoreSel = new Set(song.tracks.map((t) => t.id));
    const out = {};
    // 画面の楽譜：トランペットだけなら、コードネームもトランペットの調
    const so = scoreOpts([...scoreSel], true);
    out.画面のコード = so.chords.join(' ');
    // 書き出し（MuseScore）
    let blob = null; const dl = window.download; window.download = (bb) => { blob = bb; };
    const o = scoreOpts([...scoreSel], true); if (o.chordShift) Object.assign(o, chordOptsFor(song.tracks.find((t) => t.type === 'chord'), 0)); o.chords = o.chordObjs;
    const xml = MuseScoreExport.mscx(o);
    window.download = dl;
    out.調号 = (xml.match(/<KeySig>.*?<\/KeySig>/) || [''])[0];
    out.コード = [...xml.matchAll(/<Harmony><root>(\d+)<\/root>(?:<name>([^<]*)<\/name>)?/g)].map((m) => m[1] + (m[2] || '')).join(' ');
    out.作詞 = /<style>Lyricist<\/style><text>ああ</.test(xml);
    out.作曲 = /<style>Composer<\/style><text>あああ</.test(xml);
    // 読みこみなおす
    const back = MusicXMLImport.parseMscx(xml, 'a.mscx');
    out.読みこみ_調 = back.key + (back.minor ? 'm' : '');
    const ct = back.tracks.find((t) => t.type === 'chord');
    out.読みこみ_コード = ct ? ct.chords.map((c) => c && c.r + c.q).join(' ') : '';
    out.読みこみ_音 = back.tracks.find((t) => t.type === 'melody').notes.map((n) => n.p).join(' ');
    // MusicXML
    const o2 = scoreOpts([...scoreSel], true); if (o2.chordShift) Object.assign(o2, chordOptsFor(song.tracks.find((t) => t.type === 'chord'), 0)); o2.chords = o2.chordObjs;
    const mx = Notation.musicXML(o2);
    out.MusicXML_調 = (mx.match(/<fifths>(-?\d+)<\/fifths>/) || [])[1];
    out.MusicXML_コード = [...mx.matchAll(/<root-step>([A-G])<\/root-step>(?:<root-alter>(-?\d)<\/root-alter>)?<\/root><kind[^>]*>([a-z-]+)/g)].map((m) => m[1] + (m[2] === '1' ? '#' : m[2] === '-1' ? 'b' : '') + (m[3] === 'minor' ? 'm' : '')).join(' ');
    const back2 = MusicXMLImport.parse(mx);
    const ct2 = back2.tracks.find((t) => t.type === 'chord');
    out.MusicXML読みこみ_調 = back2.key;
    out.MusicXML読みこみ_コード = ct2 ? ct2.chords.map((c) => c && c.r + c.q).join(' ') : '';
    return out;
  });
  const chk = {
    画面のコードは楽器の調: r.画面のコード === 'Bm A G F♯' || r.画面のコード.startsWith('Bm A G F'),
    調号は書く音の調と実音の調: r.調号.includes('<accidental>2</accidental>') && r.調号.includes('<concertKey>0</concertKey>'),
    コードは楽器の調: r.コード === '19m 17 15 20',
    作詞と作曲: r.作詞 && r.作曲,
    読みこみで実音にもどる: r.読みこみ_調 === '0m' || r.読みこみ_調 === '0',
    読みこみのコード: r.読みこみ_コード === '9m 7M 5M 4M',
    読みこみの音: r.読みこみ_音 === '64 67 69 66 68 70 68',
    MusicXMLの調号: r.MusicXML_調 === '2',
    MusicXMLのコード: r.MusicXML_コード === 'Bm A G F#',
    MusicXML読みこみ: r.MusicXML読みこみ_調 === 0 && r.MusicXML読みこみ_コード === '9m 7M 5M 4M',
  };
  console.log(JSON.stringify(r, null, 1)); console.log(JSON.stringify(chk, null, 1));
  console.log('きまり:', Object.values(chk).every(Boolean) ? 'ぜんぶOK' : 'NG ' + Object.keys(chk).filter((k) => !chk[k]).join('・'));
  console.log('エラー:', errs.length ? errs : 'なし');
  await b.close();
})();
