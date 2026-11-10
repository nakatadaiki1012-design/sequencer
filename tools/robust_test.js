// こわれたデータに強い：おかしな曲ファイル・共有URL・MIDI、元に戻す、楽譜画面のキー、スペースキー、Esc
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const r = {}; const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1366, height: 820 } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', (d) => d.accept());
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); loadSong(sampleSong()); });
  const bad = [
    { v: 2, tracks: [{ type: 'melody', notes: 'x' }] },
    { tracks: [{ type: 'drum', grid: null }] },
    { tracks: [{ type: 'weird' }] },
    { bars: -5, tracks: [{ type: 'melody', notes: [{ s: 'a', p: 60, l: 48 }, { s: 0, p: 60, l: 48 }] }] },
    { bars: 100000, tracks: [{ type: 'chord', chords: [{ r: 99, q: 'zz' }, 5, null] }] },
  ];
  const res = [];
  for (const s of bad) {
    res.push(await p.evaluate((s) => { try { loadSong(s); draw(); drawOverview(); return 'ok bars=' + song.bars + ' tracks=' + song.tracks.length; } catch (e) { draw(); return 'ことわった: ' + e.message; } }, s));
  }
  r['おかしな曲データ'] = res;
  r['そのあとも動く（音を置ける）'] = await p.evaluate(() => { loadSong(sampleSong()); edit(() => track().notes.push({ s: 0, p: 70, l: 48 }), 't'); draw(); return track().notes.length > 0; });
  // MIDI：長さがおかしい
  r['こわれたMIDI（すぐ終わる）'] = await p.evaluate(() => {
    const t0 = performance.now();
    const bytes = new Uint8Array([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, 1, 0, 96, 0x4d, 0x54, 0x72, 0x6b, 0xff, 0xff, 0xff, 0xff, 0, 0x90, 60]);
    try { importMidi(bytes, 'x.mid'); } catch (e) { /* ことわってよい */ }
    return Math.round(performance.now() - t0) + 'ms';
  });
  // トラックを足して元に戻す
  r['トラック追加→元に戻す'] = await p.evaluate(() => { addTrack('melody'); const di = document.querySelector('#dlgInst'); if (di.open) di.close(); const n = song.tracks.length; undo(); return `${n}→${song.tracks.length} cur=${cur}`; });
  // 楽譜画面：コードのトラックで矢印
  await p.evaluate(() => { selectTrack(song.tracks.findIndex((t) => t.type === 'chord')); setView('score'); });
  await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowLeft');
  await p.evaluate(() => { setView('grid'); selectTrack(0); });
  // スペース：キーボードでボタンにいるときはそのボタン
  await p.evaluate(() => { stop(); document.querySelector('#trackList .track .mute').focus(); });
  await p.keyboard.press('Tab'); await p.keyboard.press('Shift+Tab');
  await p.keyboard.press('Space');
  r['ボタンの上のスペースはそのボタン（ミュート）'] = await p.evaluate(() => ({ mute: song.tracks[0].mute, play: player.on }));
  await p.evaluate(() => { song.tracks[0].mute = false; document.activeElement.blur(); });
  await p.keyboard.press('Space'); r['ふつうのスペースは再生'] = await p.evaluate(() => player.on); await p.evaluate(() => stop());
  // Esc でメニューがとじる
  await p.click('#popPractice > summary'); await p.keyboard.press('Escape');
  r['Esc でメニューがとじる'] = await p.evaluate(() => !document.querySelector('#popPractice').open);
  // 共有URLを開いたままのタブにはりつける
  const url = await p.evaluate(async () => location.origin + location.pathname + '?notour#song=' + await packSong());
  await p.evaluate(() => loadSong({ tracks: [{ type: 'melody', notes: [] }], title: 'から' }));
  await p.goto(url); await p.waitForTimeout(800);
  r['開いたタブにはりつけても開く'] = await p.evaluate(() => song.title);
  // こわれた共有URL
  await p.goto('http://localhost:8765/?notour#song=zzzz'); await p.waitForTimeout(1000);
  r['こわれたURLは消える'] = await p.evaluate(() => location.hash === '');
  r['エラー'] = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
