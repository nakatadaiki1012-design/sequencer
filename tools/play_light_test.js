// 再生中の画面の書きかえを軽く：変わっていない文字は書かない、マス目はとっておいた絵＋動く線、トラックの帯は部品を少なく
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext(devices['Pixel 5']);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour');
  await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); cheer = () => {}; });
  await p.mouse.click(5, 300).catch(() => {});
  const r = await p.evaluate(async () => {
    const out = {};
    const tracks = [];
    for (let k = 0; k < 10; k++) { const notes = []; for (let i = 0; i < 400; i++) notes.push({ s: i * 48, p: 55 + ((i + k) % 12), l: 48 }); tracks.push({ type: 'melody', name: 'P' + k, inst: 'piano', notes }); }
    loadSong({ v: 2, title: 'light', bpm: 60, bars: 100, tracks }, { own: true });
    setView('grid');
    await new Promise((res) => setTimeout(res, 400));
    out['トラックの帯の部品（4000音でも少ない）'] = document.querySelectorAll('#trackList .tstrip svg *').length < 3000;
    // トラックをえらびなおしても、帯の絵を作りなおすのは、変わった2つだけ
    { const ob = trackStripBuild; let n = 0; trackStripBuild = (...a) => { n++; return ob(...a); };
      renderTracksNow(); n = 0; selectTrack(3); renderTracksNow();
      const a1 = n; n = 0;
      edit(() => { song.tracks[5].notes[0].p += 1; }, 't'); renderTracksNow();
      const a2 = n; trackStripBuild = ob;
      out['えらびなおし：作りなおす帯は2つまで・1つのトラックを変えたら1つだけ'] = a1 <= 2 && a2 === 1 ? true : a1 + '・' + a2;
      out['帯の絵は、音を変えると変わる'] = document.querySelectorAll('#trackList .tstrip svg').length === 10;
      selectTrack(0); }
    // 再生中2秒の、文字の書きかえの回数
    const cnt = {};
    const mo = new MutationObserver((ms) => { for (const m of ms) { const t = m.target.nodeType === 1 ? m.target : m.target.parentElement; const id = t && t.id; if (id) cnt[id] = (cnt[id] || 0) + 1; } });
    mo.observe(document.querySelector('.mini-display'), { subtree: true, childList: true, characterData: true });
    let fills = 0; const fr = g2.fillRect.bind(g2); g2.fillRect = (...a) => { fills++; return fr(...a); };
    let frames = 0; const od = draw; draw = (...a) => { if (a[1]) frames++; return od(...a); };
    ui.startTick = 0; play();
    await new Promise((res) => setTimeout(res, 2200));
    mo.disconnect(); g2.fillRect = fr; draw = od;
    out['変わらない文字（曲名・調・拍子・テンポ）は書きかえない'] = !cnt.miniTitle && !cnt.miniKey && !cnt.miniMeter && !cnt.miniBpm;
    out['小節・拍の文字は、変わったときだけ（2秒で数回）'] = (cnt.miniPos || 0) <= 6;
    out['マス目：1コマあたりの塗りの回数が少ない（全部描くと数百回）'] = Math.round(fills / Math.max(1, frames)) < 60;
    // 再生中に音を足すと、すぐ絵に出る（とっておいた絵が古いままにならない）
    const before = cv.toDataURL().length;
    const pos = playheadTick();
    edit(() => { for (let i = 0; i < 6; i++) track().notes.push({ s: Math.round(pos / 48) * 48 + 48 + i * 48, p: 72, l: 48 }); }, 't');
    await new Promise((res) => setTimeout(res, 300));
    out['再生中に足した音が絵に出る'] = cv.toDataURL().length !== before;
    stop();
    return out;
  });
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
