// スマホ：2本指で広げる・つまむ（ピンチ）。楽譜の画面は楽譜が大きく・小さく、トラックの画面は小節のはばが広く・せまく
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 5'] });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour');
  await p.waitForTimeout(900);
  const cdp = await ctx.newCDPSession(p);
  const pinch = async (cx, cy, d0, d1) => {
    const pts = (d) => [{ x: cx - d / 2, y: cy, id: 0 }, { x: cx + d / 2, y: cy, id: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(d0).slice(0, 1) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(d0) });
    for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(d0 + ((d1 - d0) * i) / 8) }); await p.waitForTimeout(30); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(400);
  };
  const out = {};
  await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const tracks = []; for (let k = 0; k < 6; k++) { const notes = []; for (let i = 0; i < 64; i++) notes.push({ s: i * 48, p: 60 + ((i + k) % 12), l: 48 }); tracks.push({ type: 'melody', name: 'パート' + (k + 1), inst: 'flute', notes }); }
    loadSong({ v: 2, title: 'pinch', bpm: 100, bars: 16, tracks }, { own: true });
    setView('score'); renderScoreEditNow();
  });
  await p.waitForTimeout(500);
  const box = await p.evaluate(() => { const r = document.querySelector('#scoreEditView').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const st = () => p.evaluate(() => ({ z: ui.sc.zoom, w: Math.round(document.querySelector('#scoreEditView svg .nh').getBoundingClientRect().width * 10) / 10, n: song.tracks.reduce((a, t) => a + t.notes.length, 0), u: undoStack.length }));
  const a = await st();
  await pinch(box.x, box.y, 80, 200);
  const z1 = await st();
  out['楽譜：広げると大きく'] = `${a.z}→${z1.z}・音符の玉のはば ${a.w}→${z1.w}`;
  await pinch(box.x, box.y, 240, 60);
  const z2 = await st();
  out['楽譜：つまむと小さく'] = `${z1.z}→${z2.z}・音符の玉のはば ${z1.w}→${z2.w}`;
  out['楽譜：音は入っていない・変わっていない'] = z2.n === a.n && z2.u === a.u;
  out['楽譜：絵ののばしは、のこっていない'] = await p.evaluate(() => !document.querySelector('#scoreEditView svg').style.transform);
  // トラックの画面
  await p.evaluate(() => setPhoneView('tracks'));
  await p.waitForTimeout(400);
  const sb = await p.evaluate(() => { const r = document.querySelector('#trackList .tstrip').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const bw = () => p.evaluate(() => stripBW());
  const b0 = await bw();
  await pinch(sb.x, sb.y, 80, 220);
  const b1 = await bw();
  out['トラック：広げると小節が広く'] = `${b0}→${b1}`;
  await pinch(sb.x, sb.y, 260, 50);
  const b2 = await bw();
  out['トラック：つまむと小節がせまく'] = `${b1}→${b2}`;
  out['トラック：えらんだ小節・曲は変わっていない'] = await p.evaluate((n) => song.tracks.reduce((a, t) => a + t.notes.length, 0) === n, a.n);
  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
