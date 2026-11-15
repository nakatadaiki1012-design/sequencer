// MuseScore（.mscz/.mscx）：書き出して読みもどすと、同じ音・記号になる。MuseScore の見本ファイル（2.x・3.x）も読める
const { chromium } = require('playwright');
const SONGS = require('./engrave_songs.js');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); });
  const r = {};
  // 記号いっぱいの曲も足す
  SONGS.marks = { v: 2, title: '記号', bpm: 90, bars: 4, meter: [4, 4], key: 7, scale: 'major', rehearsal: { 0: 'A', 2: 'B' }, tempos: { 2: 70 },
    tracks: [{ type: 'melody', id: 'm', name: 'Flute', inst: 'flute', texts: [{ t: 0, x: 'dolce' }], dyn: [{ t: 0, v: 'p' }, { t: 384, v: 'f' }], hairpins: [{ s: 192, e: 384, type: 'cresc' }], slurs: [{ s: 0, e: 144 }],
      notes: [{ s: 0, p: 74, l: 48, art: ['stac'], ly: 'ら' }, { s: 48, p: 76, l: 48, art: ['tr'], fg: '2' }, { s: 96, p: 78, l: 48, gr: 79 }, { s: 144, p: 79, l: 96 }, { s: 240, p: 81, l: 144, art: ['ferm'] }, { s: 384, p: 67, l: 32 }, { s: 416, p: 69, l: 32 }, { s: 448, p: 71, l: 32 }, { s: 480, p: 72, l: 96, art: ['acc'] }, { s: 576, p: 74, l: 192 }, { s: 576, p: 62, l: 192, v: 2 }] },
      { type: 'drum', name: 'Drums', kit: 'drums', grid: { kick: { 0: 2, 96: 1 }, snare: { 48: 1, 144: 1 }, hihat: { 0: 1, 24: 1, 48: 1 } } }] };
  for (const [name, sg] of Object.entries(SONGS)) {
    r[name] = await p.evaluate((sg) => {
      loadSong(JSON.parse(JSON.stringify(sg)), { own: true });
      const before = JSON.parse(JSON.stringify(song));
      const ids = song.tracks.filter((t) => t.type !== 'chord').map((t) => t.id);
      const o = scoreOpts(ids, true); o.chords = o.chordObjs;
      const xml = MuseScoreExport.mscx(o);
      const ok = !new DOMParser().parseFromString(xml, 'application/xml').getElementsByTagName('parsererror').length;
      const back = MusicXMLImport.parseMscx(xml, 'x.mscx');
      const diff = [];
      const key = (n) => `${n.s}/${n.p}/${n.l}${n.v === 2 ? 'v' : ''}`;
      const mel = before.tracks.filter((t) => t.type === 'melody');
      const mb = back.tracks.filter((t) => t.type === 'melody');
      mel.forEach((t, i) => {
        const TOT = barStart(before.bars);
        const a = t.notes.filter((n) => n.s < TOT).map((n) => ({ ...n, l: Math.min(n.l, TOT - n.s) })).map(key).sort().join(' ');
        const z = (mb[i] || { notes: [] }).notes.map(key).sort().join(' ');
        // 同じ声部で音が重なっている（楽譜に書けない）トラックは、音のくらべはとばす
        const ov = t.notes.some((n) => t.notes.some((m) => m !== n && (m.v === 2) === (n.v === 2) && m.s > n.s && m.s < n.s + n.l));
        if (a !== z && !ov) diff.push(`${t.name}: ${a.slice(0, 120)} ≠ ${z.slice(0, 120)}`);
        const marks = (ns) => ns.map((n) => [(n.art || []).sort().join('+'), n.ly || '', n.fg || '', n.gr || ''].join(',')).filter((x) => x !== ',,,').sort().join(' ');
        if (mb[i] && marks(t.notes.filter((n) => n.s < TOT)) !== marks(mb[i].notes)) diff.push(`記号 ${marks(t.notes)} ≠ ${marks(mb[i].notes)}`);
        if (mb[i] && JSON.stringify((t.dyn || []).filter((d) => d.t < TOT).map((d) => d.v)) !== JSON.stringify((mb[i].dyn || []).map((d) => d.v))) diff.push('強弱'); // 音のない所の強弱は次の音へ
        if (mb[i] && (t.slurs || []).length !== (mb[i].slurs || []).length) diff.push('スラー');
        if (mb[i] && (t.hairpins || []).length !== (mb[i].hairpins || []).length) diff.push('クレッシェンド');
        if (mb[i] && (t.texts || []).length !== (mb[i].texts || []).length) diff.push('テキスト');
      });
      const drA = before.tracks.find((t) => t.type === 'drum');
      const drB = back.tracks.find((t) => t.type === 'drum');
      if (drA && JSON.stringify(Object.keys(drA.grid).sort().map((k) => k + Object.keys(drA.grid[k]).join())) !== JSON.stringify(Object.keys(drB.grid).sort().map((k) => k + Object.keys(drB.grid[k]).join()))) diff.push('ドラム ' + JSON.stringify(drB && drB.grid));
      const ch = before.tracks.find((t) => t.type === 'chord');
      if (ch) { const cb = back.tracks.find((t) => t.type === 'chord'); const n1 = (c) => (c ? 1 + (c.h ? 1 : 0) : 0); const lost = ch.chords.slice(0, before.bars).reduce((a, c, k) => a + n1(c) - n1(cb && cb.chords[k]), 0); if (!cb || ch.chords.slice(0, before.bars).some((c, k) => c && (!cb.chords[k] || cb.chords[k].r !== c.r || cb.chords[k].q !== c.q)) || lost > 1) diff.push('コード ' + JSON.stringify(cb && cb.chords)); } // 全音符のとちゅうのコードは書けない（1つまで）
      for (const k of ['bpm', 'key', 'scale', 'pickup', 'bars']) if (before[k] !== back[k]) diff.push(`${k}: ${before[k]} ≠ ${back[k]}`);
      if (JSON.stringify(before.meter) !== JSON.stringify(back.meter)) diff.push('拍子');
      if (JSON.stringify(before.tempos || {}) !== JSON.stringify(back.tempos || {})) diff.push('テンポ ' + JSON.stringify(back.tempos));
      if (JSON.stringify(before.rehearsal || {}) !== JSON.stringify(back.rehearsal || {})) diff.push('リハーサル');
      if (JSON.stringify((before.repeats || {}).start || []) !== JSON.stringify(back.repeats.start) || JSON.stringify((before.repeats || {}).end || []) !== JSON.stringify(back.repeats.end)) diff.push('くり返し');
      return ok ? (diff.length ? diff : true) : 'XMLがこわれている';
    }, sg);
  }
  // .mscz（zip）として読む
  r['mscz（zip）を読む'] = await p.evaluate(async () => {
    const o = scoreOpts(song.tracks.map((t) => t.id), true);
    const enc = new TextEncoder();
    const blob = makeZip([{ name: 'META-INF/container.xml', data: enc.encode('<container><rootfiles><rootfile full-path="score.mscx"/></rootfiles></container>') }, { name: 'score.mscx', data: enc.encode(MuseScoreExport.mscx(o)) }]);
    const s = await MusicXMLImport.readFile(new Uint8Array(await blob.arrayBuffer()), 'a.mscz');
    return s.tracks.length + 'トラック ' + s.tracks[0].notes.length + '音';
  });
  // MuseScore 4 の書き方（KeySig の concertKey・eid など）
  r['MuseScore 4 の形式'] = await p.evaluate(() => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><museScore version="4.20"><programVersion>4.2.1</programVersion><Score><eid>1</eid><Division>480</Division><metaTag name="workTitle">四の曲</metaTag>
      <Part id="1"><Staff id="1"><StaffType group="pitched"><name>stdNormal</name></StaffType></Staff><trackName>Clarinet in B♭</trackName><Instrument id="bb-clarinet"><longName>Clarinet in B♭</longName><transposeDiatonic>-1</transposeDiatonic><transposeChromatic>-2</transposeChromatic><Channel><program value="71"/></Channel></Instrument></Part>
      <Staff id="1"><Measure><voice><KeySig><concertKey>-1</concertKey><actualKey>1</actualKey></KeySig><TimeSig><sigN>3</sigN><sigD>4</sigD></TimeSig><Tempo><tempo>2</tempo><followText>1</followText><text>Allegro</text></Tempo>
        <Chord><eid>9</eid><durationType>half</durationType><Note><pitch>65</pitch><tpc>13</tpc><tpc2>15</tpc2></Note></Chord><Rest><durationType>quarter</durationType></Rest></voice></Measure>
        <Measure><voice><Chord><dots>1</dots><durationType>half</durationType><Note><pitch>70</pitch><tpc>12</tpc></Note></Chord></voice></Measure></Staff></Score></museScore>`;
    const s = MusicXMLImport.parseMscx(xml, 'b.mscz');
    return `${s.title} ${s.meter.join('/')} key=${s.key} bpm=${s.bpm} ${s.tempoText} ${s.tracks[0].inst} ${s.tracks[0].notes.map((n) => n.s + '/' + n.p + '/' + n.l).join(' ')}`;
  });
  // 画面から：オーケストラ → 印刷の画面の「MuseScore」ボタンで保存 → そのファイルを開く
  await p.evaluate(() => { if (!document.querySelector('#dlgStart').open) openStart(false); });
  await p.click('.tpl[data-t="orch"]'); await p.waitForTimeout(400);
  await p.evaluate(() => { edit(() => { song.tracks.forEach((t, i) => { t.notes = [{ s: 0, p: 60 + i, l: 96 }, { s: 96, p: 62 + i, l: 96 }]; }); }, 't'); openScore(); });
  await p.waitForTimeout(300);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#btnMsczScore')]);
  const path = await dl.path();
  r['ボタンで保存'] = dl.suggestedFilename();
  await p.evaluate(() => document.querySelector('#dlgScore').close());
  await p.setInputFiles('#fileIn', { name: 'orch.mscz', mimeType: 'application/octet-stream', buffer: require('fs').readFileSync(path) });
  await p.waitForTimeout(800);
  r['開きなおす'] = await p.evaluate(() => song.tracks.length + 'トラック ' + song.tracks.map((t) => t.name + ':' + t.inst).slice(0, 4).join(',') + '… ' + song.tracks.reduce((a, t) => a + (t.notes || []).length, 0) + '音');
  r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
