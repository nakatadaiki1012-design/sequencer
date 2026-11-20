// 楽器の持ちかえ：とちゅうから、ちがう楽器の音で鳴らす。楽譜には「○○ に持ちかえ」と出る
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1366, height: 860 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour');
  await p.waitForTimeout(900);
  await p.mouse.click(5, 400);
  const r = await p.evaluate(async () => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const out = {};
    const notes = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ s: i * 48, p: 72 + i, l: 48 }));
    loadSong({ v: 2, title: 'ic', bpm: 100, bars: 2, tracks: [{ type: 'melody', inst: 'flute', notes, instChg: [{ t: 192, inst: 'piccolo' }, { t: 9999, inst: 'nai-gakki' }] }] }, { own: true });
    const tr = track();
    out['読みこみ：ない楽器はすてる'] = JSON.stringify(tr.instChg);
    const insts = [];
    const o = Sound.playNote;
    Sound.playNote = (c, outN, inst) => insts.push(inst);
    ensureAudio();
    const g = { outs: {}, pans: {}, session: actx.createGain() };
    for (const e of eventList().filter((e) => e.kind === 'note')) scheduleEvent(actx, g, e, 1, false);
    Sound.playNote = o;
    out['鳴らす楽器（前の4つはフルート、あとの4つはピッコロ）'] = insts.join(',');
    const svg = Notation.render(scoreOpts([tr.id], true));
    out['楽譜のことば'] = (svg.match(/>([^<]*持ちかえ[^<]*)</) || [])[1];
    out['MusicXML にもことばが入る'] = /持ちかえ/.test(Notation.musicXML(scoreOpts([tr.id], true)));
    // MIDI：とちゅうで音色を切りかえる命令が入る
    const mb = midiBytes();
    let pc = 0; for (let i = 0; i < mb.length - 1; i++) if ((mb[i] & 0xf0) === 0xc0 && (mb[i + 1] === Sound.GM.piccolo)) pc++;
    out['MIDI：ピッコロへの切りかえ'] = pc >= 1;
    // 画面から：2小節目の頭をもとの楽器にもどす → 持ちかえが消える
    setView('score'); renderScoreEditNow();
    ui.sc.cursor = 192; ui.sc.sel = new Set();
    scInstChange();
    const dlg = document.querySelector('#dlgInstChg');
    out['窓がひらく・今の楽器がえらばれている'] = dlg.open + '・' + dlg.querySelector('#icSel').value;
    dlg.querySelector('#icSel').value = 'oboe';
    dlg.querySelector('#icOk').click();
    out['オーボエに変える'] = JSON.stringify(track().instChg);
    ui.sc.cursor = 192; scInstChange();
    document.querySelector('#icDel').click();
    out['消す'] = JSON.stringify(track().instChg || null);
    undo();
    out['もどす'] = JSON.stringify(track().instChg);
    // 小節を前に入れると、持ちかえの位置もずれる
    return out;
  });
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await p.screenshot({ path: process.argv[2] || 'tools/inst_change.png' });
  await b.close();
})();
