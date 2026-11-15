// MuseScore のいいところ（2回目）：空の段をかくす・音域の色・Q/W・長い休みをまとめる・ペダル
const { chromium } = require('playwright');
const SHOT = process.argv[2];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); });
  const r = {};
  // 1. フルスコアで、休んでいるパートの段をかくす
  r['空の段をかくす'] = await p.evaluate(() => {
    loadSong({ v: 2, title: 'o', bpm: 100, bars: 16, tracks: ['flute', 'oboe', 'clarinet', 'violin', 'cello'].map((inst, i) => ({ type: 'melody', id: 'p' + i, name: inst, inst, notes: Array.from({ length: 16 }, (_, b2) => ({ s: b2 * 192, p: 60 + i, l: 192 })).filter((n) => i >= 3 || n.s < 192 * 4) })) }, { own: true });
    scoreSettings().orch = true;
    scoreSel = new Set(song.tracks.map((t) => t.id));
    scoreSvg([...scoreSel]);
    const on = Notation.lastLayout.systems.map((s) => s.staves.length).join(',');
    scoreSettings().hideEmpty = false; scoreSvg([...scoreSel]);
    const off = Notation.lastLayout.systems.map((s) => s.staves.length).join(',');
    scoreSettings().hideEmpty = true;
    return `${on}（かくさない：${off}）`;
  });
  // 2. 音域の外は色（オーケストラの書き方・編集画面だけ）
  r['音域の色'] = await p.evaluate(() => {
    edit(() => { song.tracks[0].notes = [{ s: 0, p: 50, l: 48 }, { s: 48, p: 95, l: 48 }, { s: 96, p: 72, l: 48 }]; }, 't');
    selectTrack(0); setView('score'); renderScoreEditNow();
    const fills = [...document.querySelectorAll('#scoreEditView .nh')].filter((e) => +e.dataset.pi === 0).map((e) => e.getAttribute('fill'));
    const print = scoreSvg([song.tracks[0].id]);
    return fills.join(' ') + ' / 印刷は黒：' + !/#e03131/.test(print);
  });
  // 3. Q・W
  r['Q W'] = await p.evaluate(() => { ui.sc.sel = new Set(['96:72']); ui.sc.selByInput = false; return true; });
  await p.keyboard.press('w');
  r['Q W'] = await p.evaluate(() => track().notes.find((n) => n.s === 96).l);
  await p.keyboard.press('q'); await p.keyboard.press('q');
  r['Q W'] += ' → ' + await p.evaluate(() => track().notes.find((n) => n.s === 96).l);
  await p.evaluate(() => { ui.sc.sel = new Set(); ui.sc.dur = 48; });
  await p.keyboard.press('q');
  r['Q W'] += ' / 次に入れる長さ ' + await p.evaluate(() => ui.sc.dur);
  // 4. パート譜で長い休みをまとめる
  r['長い休み'] = await p.evaluate(() => {
    openScore(); scoreSel = new Set([song.tracks[0].id]);
    let html = ''; const w0 = window.open; window.open = () => ({ document: { write: (h) => { html += h; }, close() {} } }); printParts(); window.open = w0;
    document.querySelector('#dlgScore').close();
    return (html.match(/class="mmrest"/g) || []).length + 'か所';
  });
  // 5. ペダル
  r['ペダル'] = await p.evaluate(() => {
    loadSong({ v: 2, title: 'pf', bpm: 100, bars: 2, tracks: [{ type: 'melody', id: 'pf', name: 'ピアノ', inst: 'piano', notes: [{ s: 0, p: 60, l: 24 }, { s: 24, p: 64, l: 24 }, { s: 48, p: 67, l: 24 }, { s: 192, p: 48, l: 48 }] }] }, { own: true });
    selectTrack(0); setView('score');
    ui.sc.sel = new Set(['0:60', '48:67']); ui.sc.selByInput = false;
    scPedal();
    const ped = JSON.stringify(track().pedals);
    const ev = eventList().filter((e) => e.kind === 'note' && e.t < 192).map((e) => e.l).join(',');
    const svg = scoreSvg(['pf']);
    const xml = Notation.musicXML(scoreOpts(['pf'], false));
    const back = MusicXMLImport.parse(xml, 'a.musicxml').tracks[0].pedals;
    const ms = MusicXMLImport.parseMscx(MuseScoreExport.mscx(scoreOpts(['pf'], true)), 'a.mscx').tracks[0].pedals;
    return `${ped} 再生の長さ ${ev} 楽譜に ${(svg.match(/class="ped"/g) || []).length} MusicXML ${JSON.stringify(back)} MuseScore ${JSON.stringify(ms)}`;
  });
  if (SHOT) { await p.waitForTimeout(300); await (await p.$('#scoreEditView svg')).screenshot({ path: SHOT + '_ped.png' }); }
  r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
