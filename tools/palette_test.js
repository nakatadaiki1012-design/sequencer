// 記号パレット（MuseScore のような記号）：楽譜に出る・音に出る・MusicXML に出る・パレットとキーで入れられる
const { chromium } = require('playwright');
const SHOT = process.argv[2];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(1000);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); });
  const r = {};
  await p.evaluate(() => {
    loadSong({ v: 2, title: '記号テスト', bpm: 100, bars: 4, meter: [4, 4], key: 0, scale: 'major', rehearsal: { 0: 'A', 2: 'B' },
      tracks: [{ type: 'melody', id: 'm1', name: 'ピアノ', inst: 'piano', range: 'soprano', vol: 0.8,
        texts: [{ t: 0, x: 'dolce' }, { t: 384, x: 'pizz.' }],
        notes: [
          { s: 0, p: 72, l: 96, art: ['tr'], fg: '3' }, { s: 96, p: 74, l: 48, art: ['prall'] }, { s: 144, p: 76, l: 48, art: ['mord', 'stacc2'] },
          { s: 192, p: 77, l: 96, art: ['turn'], gr: 79 }, { s: 288, p: 60, l: 96, art: ['arp'] }, { s: 288, p: 64, l: 96, art: ['arp'] }, { s: 288, p: 67, l: 96, art: ['arp'], fg: '5' },
          { s: 384, p: 72, l: 96, art: ['trem', 'dnb'] }, { s: 480, p: 71, l: 96, art: ['breath', 'upb'] }, { s: 576, p: 72, l: 192, art: ['ferm', 'caes'] },
        ] }] }, { own: true });
    setView('score');
  });
  await p.waitForTimeout(500);
  r['楽譜'] = await p.evaluate(() => {
    const v = document.querySelector('#scoreEditView');
    return { reh: [...v.querySelectorAll('.reh')].map((t) => t.textContent).join(','), txt: [...v.querySelectorAll('.stxt')].map((t) => t.textContent).join(','), fing: [...v.querySelectorAll('.fing')].map((t) => t.textContent).join(','), grace: v.querySelectorAll('.grace').length, paths: v.querySelectorAll('path').length };
  });
  r['音の数（トリルなどで増える）'] = await p.evaluate(() => {
    const ev = eventList().filter((e) => e.kind === 'note');
    const at = (a, z) => ev.filter((e) => e.t >= a && e.t < z).map((e) => e.p).join(' ');
    return { trill: at(0, 96), prall: at(96, 144), mord: at(144, 192), turn: at(192, 288), arp: ev.filter((e) => e.t >= 288 && e.t < 384).map((e) => e.t - 288).join(' '), trem: ev.filter((e) => e.t >= 384 && e.t < 480).length };
  });
  r['MusicXML'] = await p.evaluate(() => {
    const o = scoreOpts(['m1'], false);
    const x = Notation.musicXML(o);
    return ['trill-mark', 'inverted-mordent', '<mordent', '<turn', 'tremolo', 'arpeggiate', 'breath-mark', 'caesura', 'up-bow', 'down-bow', 'fingering>3', 'grace slash', 'staccatissimo', 'rehearsal', '<words>dolce'].filter((k) => !x.includes(k)).join(',') || 'ぜんぶある';
  });
  if (SHOT) await p.screenshot({ path: SHOT + '_marks.png' });
  r['MusicXML を読みなおす'] = await p.evaluate(() => {
    const x = Notation.musicXML(scoreOpts(['m1'], false));
    const j = MusicXMLImport.parse(x, 't.musicxml');
    const ns = j.tracks[0].notes;
    const f = (s) => ns.filter((n) => n.s === s).map((n) => (n.art || []).join('+') + (n.fg ? ' f' + n.fg : '') + (n.gr != null ? ' g' + n.gr : '')).join('|');
    return { a: [0, 96, 144, 192, 288, 384, 480, 576].map(f).join(' / '), reh: JSON.stringify(j.rehearsal), texts: JSON.stringify(j.tracks[0].texts) };
  });
  // パレットから入れる
  await p.evaluate(() => { ui.sc.sel = new Set(['480:71']); ui.sc.selByInput = false; selectTrack(0); scPalette(); });
  await p.waitForTimeout(200);
  r['パレット'] = await p.evaluate(() => document.querySelector('#dlgSym').open && document.querySelectorAll('#dlgSym .palb').length);
  await p.click('#dlgSym [data-art="tr"]');
  await p.click('#dlgSym [data-fg="2"]');
  await p.click('#dlgSym [data-gr="-1"]');
  r['パレットでつけた'] = await p.evaluate(() => { const n = track().notes.find((x) => x.s === 480); return JSON.stringify({ art: n.art, fg: n.fg, gr: n.gr }); });
  // パレットを開いたままキー：Alt+3 で3度上
  await p.evaluate(() => { ui.sc.sel = new Set(['576:72']); });
  await p.keyboard.press('Alt+Digit3');
  r['Alt+3'] = await p.evaluate(() => track().notes.filter((x) => x.s === 576).map((x) => x.p).sort().join(','));
  await p.keyboard.press('Alt+Digit8');
  r['Alt+8'] = await p.evaluate(() => track().notes.filter((x) => x.s === 576).map((x) => x.p).sort((a, c) => a - c).join(','));
  // リハーサル記号：3小節目に入れると A,B,C に ふりなおす
  await p.evaluate(() => { ui.sc.sel = new Set(); ui.sc.cursor = 192; });
  await p.keyboard.press('Alt+KeyM');
  r['リハーサル'] = await p.evaluate(() => JSON.stringify(song.rehearsal));
  // 保存して読みなおしても残る・こわれたデータは消える
  r['保存'] = await p.evaluate(() => { const j = JSON.parse(JSON.stringify(song)); j.tracks[0].notes.push({ s: 0, p: 60, l: 48, art: ['xx', 'tr'], fg: 'abc9', gr: 999 }); loadSong(j); const n = track().notes.find((x) => x.s === 0 && x.p === 60); return JSON.stringify({ art: n.art, fg: n.fg, gr: n.gr, reh: song.rehearsal, texts: track().texts.length }); });
  // 小節を前に入れると、記号もずれる
  r['小節を入れる'] = await p.evaluate(() => { shiftAll(0, 1); song.bars++; return JSON.stringify({ reh: song.rehearsal, t: track().texts.map((x) => x.t) }); });
  if (SHOT) { await p.waitForTimeout(300); await p.screenshot({ path: SHOT + '_pal.png' }); }
  // パート譜：パートごとにページを分けて印刷
  r['パート譜'] = await p.evaluate(() => {
    edit(() => { song.tracks.push(newTrack('melody', { name: 'フルート', inst: 'flute', notes: [{ s: 0, p: 76, l: 192 }] })); }, 't');
    openScore();
    scoreSel = new Set(song.tracks.filter((t) => t.type === 'melody').map((t) => t.id));
    let html = '';
    const w0 = window.open;
    window.open = () => ({ document: { write: (h) => { html += h; }, close() {} } });
    printParts();
    window.open = w0;
    document.querySelector('#dlgScore').close();
    return { pages: (html.match(/class="pg"/g) || []).length, heads: [...html.matchAll(/class="parthead">([^<]*)</g)].map((m) => m[1]).join(',') };
  });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(400);
  r['スマホ'] = await p.evaluate(() => { const d = document.querySelector('#dlgSym'); const rc = d.getBoundingClientRect(); return d.open ? `${Math.round(rc.left)}-${Math.round(rc.right)}` : 'closed'; });
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
