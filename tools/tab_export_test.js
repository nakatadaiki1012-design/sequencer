// TAB譜の書き出し・読みこみ（ギター）
//   MuseScore：五線と、それにつながった（リンクした）TAB譜の段。音に弦とフレット。読みこむと同じ曲・同じTAB譜の設定・自分でえらんだ弦
//   MusicXML：五線＋TAB譜の2段（TAB譜の段は同じ音）。読みこむと音が2重にならない
//   TAB譜だけ、ウクレレ（4本の弦）も
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(700);
  const r = await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const NOTES = [{ s: 0, p: 64, l: 48, str: 4 }, { s: 48, p: 67, l: 48 }, { s: 96, p: 48, l: 96 }, { s: 96, p: 52, l: 96 }, { s: 192, p: 60, l: 96, ly: 'あ' }, { s: 288, p: 62, l: 32 }, { s: 320, p: 64, l: 32 }, { s: 352, p: 65, l: 32 }];
    const SONG = (inst) => ({ v: 2, title: 'G', bpm: 100, bars: 2, key: 0, tracks: [{ type: 'melody', name: 'ギター', inst, notes: NOTES.map((n) => ({ ...n })) }, { type: 'chord', name: 'c', chords: [{ r: 0, q: 'M' }, { r: 7, q: 'M' }] }] });
    const sig = (t) => t.notes.map((n) => `${n.s}/${n.p}/${n.l}${n.str != null ? '@' + n.str : ''}`).sort().join(' ');
    const out = {};
    const run = (inst, mode, key) => {
      loadSong(SONG(inst));
      setTabMode(song.tracks[0], mode);
      const want = sig(song.tracks[0]);
      // 画面の TAB譜の数字
      const o0 = scoreOpts(song.tracks.map((t) => t.id), true);
      const svg = Notation.render({ ...o0, width: 900 });
      const shown = [...svg.matchAll(/class="nh tabn"[^>]*data-s="(\d+)"[^>]*data-p="(\d+)" data-str="(\d)"/g)].map((m) => `${m[1]}:${m[2]}@${m[3]}`).sort().join(' ');
      const o = scoreOpts(song.tracks.map((t) => t.id), true); o.chords = o.chordObjs;
      const xml = MuseScoreExport.mscx(o);
      const mx = Notation.musicXML(o);
      const b1 = MusicXMLImport.parseMscx(xml, 'a.mscx');
      const b2 = MusicXMLImport.parse(mx);
      loadSong(b1); const t1 = song.tracks.find((t) => t.type === 'melody'); const tab1 = (song.score.tab || {})[t1.id];
      const s1 = sig(t1); const n1 = song.tracks.filter((t) => t.type === 'melody').length;
      loadSong(b2); const t2 = song.tracks.find((t) => t.type === 'melody'); const tab2 = (song.score.tab || {})[t2.id];
      const s2 = sig(t2); const n2 = song.tracks.filter((t) => t.type === 'melody').length;
      // MuseScore の弦（0＝高い弦）と、MusicXML の弦（1＝高い弦）
      const mStr = [...xml.matchAll(/<fret>(\d+)<\/fret><string>(\d+)<\/string>/g)].map((m) => m[1] + '/' + m[2]);
      const xStr = [...mx.matchAll(/<string>(\d+)<\/string><fret>(\d+)<\/fret>/g)].map((m) => m[2] + '/' + m[1]);
      out[key] = { want, shown, s1, s2, tab1, tab2, n1, n2,
        linked: (xml.match(/<linkedTo>1<\/linkedTo>/g) || []).length, tabStaff: (xml.match(/group="tablature"/g) || []).length,
        mainLinks: (xml.match(/<linkedMain\/>/g) || []).length, copyLinks: (xml.match(/<linked><location>/g) || []).length,
        mStr: mStr.join(' '), xStr: xStr.join(' '), staves2: /<staves>2<\/staves>/.test(mx), tabClef: /<sign>TAB<\/sign>/.test(mx), staff2: (mx.match(/<staff>2<\/staff>/g) || []).length,
        tab4: /tab4StrCommon/.test(xml) && /<staff-lines>4<\/staff-lines>/.test(mx),
        lyricsOnce: (xml.match(/<Lyrics>/g) || []).length, harmOnce: (xml.match(/<Harmony>/g) || []).length };
    };
    run('guitar', 'both', 'ギター五線＋TAB');
    run('guitar', 'only', 'ギターTABだけ');
    run('ukulele', 'both', 'ウクレレ');
    return out;
  });
  const g = r['ギター五線＋TAB'], o = r['ギターTABだけ'], u = r['ウクレレ'];
  const chk = {
    画面に全部の数字: g.shown.split(' ').length === 8,
    画面の弦は自分でえらんだ弦: g.shown.includes('0:64@4'),
    MuseScoreつながったTAB段: g.linked === 1 && g.tabStaff === 1,
    MuseScore音ごとのつながり: g.mainLinks > 0 && g.mainLinks === g.copyLinks,
    MuseScore歌詞とコードは1回: g.lyricsOnce === 1 && g.harmOnce === 2,
    MuseScore弦とフレット: g.mStr.split(' ').length === 16 && g.mStr.startsWith('5/1 3/0'),
    MuseScore読みこみで同じ音: g.s1 === g.want && g.n1 === 1,
    MuseScore読みこみでTAB設定: g.tab1 === 'both',
    MusicXML2段: g.staves2 && g.tabClef && g.staff2 === 8,
    MusicXML弦とフレット: g.xStr.split(' ').length === 16 && g.xStr.startsWith('5/2'),
    MusicXML読みこみで同じ音: g.s2 === g.want && g.n2 === 1,
    MusicXML読みこみでTAB設定: g.tab2 === 'both',
    TABだけ_MuseScore: o.linked === 0 && o.tabStaff === 1 && o.s1 === o.want && o.tab1 === 'only',
    TABだけ_MusicXML: !o.staves2 && o.tabClef && o.s2 === o.want && o.tab2 === 'only',
    // ウクレレ：低い音（ド4より下）は弾けないので数字なし。4本目より上の弦（@4）はないので、読みこむと自動の弦
    ウクレレ: u.s1 === u.want.replace(/@\d/g, '') && u.s2 === u.s1 && u.tab1 === 'both' && u.tab2 === 'both' && u.shown.split(' ').length === 6 && u.tab4,
  };
  console.log(JSON.stringify(r, null, 1));
  console.log(JSON.stringify(chk, null, 1));
  const bad = Object.keys(chk).filter((k) => !chk[k]);
  console.log('きまり:', bad.length ? 'NG ' + bad.join('・') : 'ぜんぶOK');
  console.log('エラー:', errs.length ? errs : 'なし');
  await b.close();
})();
