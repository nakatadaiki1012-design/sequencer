// 拍子・調のとちゅう変化／2声部／D.C.・コーダ のテスト
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', (d) => d.accept());
  await p.goto('http://localhost:8765/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d && d.open) d.close(); });
  const r = {};
  Object.assign(r, await p.evaluate(() => {
    const o = {};
    edit(() => {
      song.bars = 4; song.meter = [4, 4]; song.meters = { 2: [3, 4] }; song.keys = { 2: { key: 7, minor: false } }; song.jumps = { dc: 3, fine: 1 };
      song.repeats = { start: [], end: [], volta: {} }; song.pickup = 0;
      const tr = song.tracks.find((t) => t.type === 'melody');
      tr.notes = [
        { s: 0, p: 72, l: 96 }, { s: 96, p: 74, l: 96 },
        { s: 0, p: 60, l: 48, v: 2 }, { s: 48, p: 62, l: 48, v: 2 }, { s: 96, p: 64, l: 96, v: 2 },
        { s: 384, p: 66, l: 48 }, { s: 432, p: 67, l: 96 }, { s: 528, p: 69, l: 144 },
      ];
    });
    o['全体の長さ(672)'] = totalTicks();
    o['再生順(0,1,2,3,0,1)'] = playOrder().join(',');
    o['3小節目の長さ(144)'] = barLen(2);
    o['tick 400 は何小節目(2)'] = barOf(400);
    const ev = eventList();
    o['メトロノームの数(4+4+3+3+4+4=22)'] = ev.filter((e) => e.kind === 'metro').length;
    // 楽譜
    const opts = scoreOpts(song.tracks.filter((t) => t.type === "melody").map((t) => t.id));
    const svg = Notation.render(opts);
    o['D.C. al Fine の文字'] = svg.includes('D.C. al Fine');
    o['Fine の文字'] = svg.includes('>Fine<');
    o['声部2の音符'] = (svg.match(/data-v="2"/g) || []).length;
    const L = Notation.lastLayout;
    const B = L.systems[0].bars.find((x) => x.b === 2);
    o['3小節目のクリック位置→tick(384)'] = Math.round(Notation.hit(L, B.xs[0] + 0.5, L.systems[0].staves[0].top + 16).tick);
    // ト長調の小節で「ファ」の線をクリック → ファ♯
    const st = L.systems[0].staves[0];
    const fLine = st.top + 0; // 第5線＝ファ
    o['ト長調の小節：上のファ線→78(F#5)'] = Notation.hit(L, B.xs[0] + 1, fLine).pitch;
    // MusicXML 往復
    const xml = Notation.musicXML(opts);
    const back = MusicXMLImport.parse(xml, 'x.musicxml');
    o['MusicXML往復：拍子の変化'] = JSON.stringify(back.meters);
    o['MusicXML往復：調の変化'] = JSON.stringify(back.keys);
    o['MusicXML往復：声部2の音'] = back.tracks[0].notes.filter((n) => n.v === 2).length;
    o['MusicXML: D.C.'] = xml.includes('dacapo="yes"') && xml.includes('fine="yes"');
    // 小節を入れる → 変化の位置もずれる
    edit(() => shiftAll(1, 1));
    song.bars++;
    o['1小節入れたあと：拍子(3から)'] = JSON.stringify(song.meters);
    o['1小節入れたあと：D.C.(4)'] = song.jumps.dc;
    o['1小節入れたあと：3/4の音(576)'] = song.tracks.find((t) => t.type === 'melody').notes.find((n) => n.p === 66).s;
    undo();
    o['もとにもどす：拍子'] = JSON.stringify(song.meters);
    return o;
  }));
  // 小節ダイアログ
  await p.evaluate(() => openBarDialog(1));
  await p.selectOption('#barMeterN', '6'); await p.selectOption('#barMeterD', '8');
  await p.selectOption('#barJump', 'segno');
  await p.click('#barOk');
  Object.assign(r, await p.evaluate(() => ({ 'ダイアログ：2小節目から6/8': JSON.stringify(song.meters[1]), 'ダイアログ：セーニョ': song.jumps.segno })));
  await p.evaluate(() => undo()); await p.evaluate(() => undo());
  // 楽譜画面で声部2を入力
  await p.evaluate(() => { setView('score'); });
  await p.waitForTimeout(300);
  Object.assign(r, await p.evaluate(() => {
    ui.sc.cursor = 192; ui.sc.dur = 96; ui.sc.voice = 2; scInsert([57]); ui.sc.voice = 1; ui.sc.cursor = 192; ui.sc.dur = 96; scInsert([69]);
    const tr = track();
    return { '楽譜：声部1と2を同じ所に入力': tr.notes.filter((n) => n.s === 192).map((n) => n.p + (n.v === 2 ? 'v2' : '')).sort().join(',') };
  }));
  await p.waitForTimeout(300);
  await p.screenshot({ path: process.argv[2] || '/tmp/structure.png' });
  console.log(JSON.stringify(r, null, 1));
  console.log('errors', errs);
  await b.close();
})();
