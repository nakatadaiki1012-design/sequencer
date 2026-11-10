// 2回目の検証で見つかった問題が直っているか（データ・音楽）
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 820 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', (d) => d.accept());
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const out = {};
    localStorage.removeItem('otsumiki-songs');
    // 先生の曲 → 生徒の曲を22回開いても、先生の曲はマイ曲にのこる
    loadSong(sampleSong()); song.title = '先生の曲'; edit(() => track().notes.push({ s: 0, p: 90, l: 48 }), 't');
    for (let i = 0; i < 22; i++) { const sg = sampleSong(); sg.title = '生徒' + i; sg.tracks[0].notes.push({ s: 48, p: 70 + (i % 10), l: 48 }); loadSong(sg, { keep: !studentOpen }); studentOpen = true; }
    out['先生の曲がのこる'] = Object.keys(savedList()).includes('先生の曲');
    studentOpen = false;
    // 同じ名前の曲を何曲しまっても上書きしない
    localStorage.removeItem('otsumiki-songs');
    for (let i = 0; i < 4; i++) { const sg = sampleSong(); sg.title = 'うた'; sg.tracks[0].notes.push({ s: 0, p: 80 + i, l: 48 }); keepSong(JSON.parse(JSON.stringify(sg))); }
    out['同じ名前4曲'] = Object.keys(savedList()).length;
    // トラックを消したら、えらんでいた音はやめる
    loadSong({ v: 2, bars: 2, tracks: [{ type: 'drum', grid: { kick: { 0: 1, 96: 1 } } }, { type: 'drum', grid: { kick: { 0: 1, 96: 1 } } }] });
    selectTrack(0); selAll(); edit(() => { song.tracks.splice(0, 1); cur = 0; }, 'トラックを消す');
    out['消したあとのえらび'] = nsel.size;
    // 調を変える：後半のコード・とちゅうの調も
    loadSong({ v: 2, bars: 2, key: 0, keys: { 1: { key: 7, minor: false } }, tracks: [{ type: 'chord', chords: [{ r: 0, q: 'M', h: { r: 7, q: 'M' } }, { r: 7, q: 'M' }] }] });
    changeKey(2, false, true);
    out['移調：コード・とちゅうの調'] = chordLabel(song.tracks[0].chords[0]) + ' / ' + song.keys[1].key;
    // 小節を入れると rit. も動く
    loadSong(sampleSong()); song.ramps = { 4: { type: 'rit', n: 2 } }; song.tempos = { 4: 85, 5: 70 };
    shiftBarMarks(2, 2);
    out['rit.も動く'] = JSON.stringify(song.ramps);
    // 答え合わせ：とちゅうまでなら100%にしない
    loadSong({ v: 2, bars: 4, tracks: [{ type: 'melody', notes: [0, 1, 2, 3].map((i) => ({ s: i * 192, p: 60, l: 48 })) }] });
    refSong = sanitizeSong({ v: 2, bars: 8, tracks: [{ type: 'melody', notes: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ s: i * 192, p: 60, l: 48 })) }] });
    updateCompare(); out['とちゅうの答え合わせ'] = document.querySelector('#cmpText').textContent.split('　')[0];
    refSong = null; updateCompare();
    // ループの範囲が曲の外 → ループをやめる
    ui.loopOn = true; ui.loopRange = [6, 8]; out['外のループ'] = JSON.stringify(loopBounds()) + ' loopOn=' + ui.loopOn;
    // スウィング：5/8 の小節のあとでも、頭はずれない
    loadSong({ v: 2, bars: 2, meters: { 0: [5, 8] }, meter: [5, 8], swing: 1, swingUnit: 24, tracks: [{ type: 'melody', notes: [] }] });
    song.meters = { 1: [4, 4] }; version++;
    out['スウィング（2小節目の頭）'] = +swingSec(barStart(1)).toFixed(3);
    // 自動のコード：とちゅうでホ長調
    loadSong({ v: 2, bars: 4, key: 0, keys: { 2: { key: 4, minor: false } }, tracks: [{ type: 'melody', notes: [[60, 64, 67, 72], [65, 69, 72, 77], [64, 68, 71, 76], [71, 75, 78, 83]].flatMap((ar, b) => ar.map((pp, i) => ({ s: b * 192 + i * 48, p: pp, l: 48 }))) }, { type: 'chord', chords: [] }] });
    out['自動コード（3小節目からホ長調）'] = harmonize(false).map(chordLabel).join(' ');
    // ボサノバの5度・ストロークの速さ・7の和音
    loadSong({ v: 2, bars: 1, tracks: [{ type: 'chord', pattern: 'bossa', bassOn: true, chords: [{ r: 11, q: 'dim' }] }] });
    out['ボサノバ Bdim の5度'] = [...new Set(chordEvents(song.tracks[0]).filter((e) => e.p < 52).map((e) => e.p % 12))].sort((a, c) => a - c).join(',');
    song.tracks[0].pattern = 'strum'; song.tracks[0].chords = [{ r: 0, q: 'M', h: { r: 7, q: 'M' } }]; version++;
    out['ストローク（2つのコード）のはじまり'] = [...new Set(chordEvents(song.tracks[0]).map((e) => Math.round(e.s / 24) * 24))].join(',');
    song.tracks[0].pattern = 'arp'; song.tracks[0].bassOn = false; song.tracks[0].chords = [{ r: 7, q: '7' }]; version++;
    out['分散和音 G7 の音'] = [...new Set(chordEvents(song.tracks[0]).map((e) => e.p % 12))].sort((a, c) => a - c).join(',');
    // MIDI：調と左右の位置
    loadSong(sampleSong()); song.key = 7; song.tracks[0].pan = -0.6; version++;
    const back = importMidi(midiBytes(), 'x.mid');
    out['MIDIの調・パン'] = back.key + ' / ' + back.tracks[0].pan;
    return out;
  });
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
