// MuseScore のいいところ（4回目）：再生カーソル・小節のくり返し記号・TAB譜・スラッシュ
const { chromium } = require('playwright');
const SHOT = process.argv[2];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); });
  const r = {};
  await p.evaluate(() => {
    loadSong({ v: 2, title: 'ギターとコード', bpm: 100, bars: 4, meter: [4, 4], key: 7, tracks: [
      { type: 'melody', id: 'g', name: 'ギター', inst: 'guitar', range: 'wide', notes: [{ s: 0, p: 55, l: 48 }, { s: 0, p: 59, l: 48 }, { s: 0, p: 62, l: 48 }, { s: 48, p: 64, l: 48 }, { s: 96, p: 67, l: 48 }, { s: 144, p: 40, l: 48 }, { s: 192, p: 55, l: 48 }, { s: 192, p: 59, l: 48 }, { s: 192, p: 62, l: 48 }, { s: 240, p: 64, l: 48 }, { s: 288, p: 67, l: 48 }, { s: 336, p: 40, l: 48 }] },
      { type: 'chord', name: 'コード', inst: 'piano', pattern: 'whole', chords: [{ r: 7, q: 'M' }, { r: 7, q: 'M' }, { r: 0, q: 'M' }, { r: 2, q: '7' }] }] }, { own: true });
    selectTrack(0); setView('score');
  });
  // 小節のくり返し：2小節目は1小節目と同じ → 記号を入れる
  r['くり返し記号'] = await p.evaluate(() => {
    ui.sc.cursor = 192; scMeasureRepeat(); renderScoreEditNow();
    const sign = document.querySelectorAll('#scoreEditView .mrep').length;
    ui.sc.cursor = 384; scMeasureRepeat(); renderScoreEditNow();
    const sign2 = document.querySelectorAll('#scoreEditView .mrep').length;
    const notes3 = track().notes.filter((n) => n.s >= 384 && n.s < 576).length;
    // 3小節目を変えると、ふつうの音符にもどる
    edit(() => { track().notes.find((n) => n.s === 384 + 48).p = 66; }, 't'); renderScoreEditNow();
    const sign3 = document.querySelectorAll('#scoreEditView .mrep').length;
    const ms = MusicXMLImport.parseMscx(MuseScoreExport.mscx(scoreOpts(['g'], true)), 'a.mscx').tracks[0];
    return `記号${sign}→${sign2}（3小節目の音${notes3}）→ 変えたら${sign3} MuseScore ${JSON.stringify(ms.mrep)} 音${ms.notes.length}/${track().notes.length}`;
  });
  // TAB譜
  r['TAB譜'] = await p.evaluate(() => {
    openScore();
    const sel = document.querySelector('.stab[data-id="g"]'); sel.value = 'both'; sel.onchange();
    const v = document.querySelector('#scoreView');
    const frets = [...v.querySelectorAll('.fret')].slice(0, 6).map((t) => t.textContent).join(',');
    const tab = v.querySelectorAll('.tabclef').length;
    sel.value = 'only'; sel.onchange();
    const only = document.querySelectorAll('#scoreView .tabclef').length + '/' + document.querySelectorAll('#scoreView .nh').length;
    sel.value = ''; sel.onchange();
    return `TAB ${tab} フレット ${frets} TABだけ ${only}`;
  });
  // スラッシュ
  r['スラッシュ'] = await p.evaluate(() => {
    const S = scoreSettings(); S.accomp = true; S.accompStyle = 'slash';
    const svg = scoreSvg(['g', song.tracks[1].id]);
    const d = document.createElement('div'); d.innerHTML = svg;
    const slashes = [...d.querySelectorAll('path.nh')].length;
    const chordNames = [...d.querySelectorAll('text')].filter((t) => /^(G|C|D7)$/.test(t.textContent)).length;
    document.querySelector('#dlgScore').close();
    S.accomp = false;
    return `／${slashes} コード名${chordNames}`;
  });
  // 再生カーソル
  r['再生カーソル'] = await p.evaluate(async () => {
    setView('score'); renderScoreEditNow(); ui.sc.cursor = 0; play();
    await new Promise((res) => setTimeout(res, 900));
    const c = document.querySelector('#playCur');
    const x1 = c && !c.hidden ? c.getBoundingClientRect().left : null;
    await new Promise((res) => setTimeout(res, 700));
    const x2 = c && !c.hidden ? c.getBoundingClientRect().left : null;
    stop();
    await new Promise((res) => setTimeout(res, 100));
    return `動く ${x2 > x1} とまると消える ${document.querySelector('#playCur').hidden}`;
  });
  if (SHOT) {
    await p.evaluate(() => { const S = scoreSettings(); S.tab = { g: 'both' }; S.accomp = true; S.accompStyle = 'slash'; setView('score'); renderScoreEditNow(); });
    await p.waitForTimeout(300); await (await p.$('#scoreEditView svg')).screenshot({ path: SHOT + '_r4.png' });
  }
  r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
