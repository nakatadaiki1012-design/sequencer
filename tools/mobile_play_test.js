// スマホでも再生がとぎれないように：同じ音の重ねを1つに、同時に鳴らす数の上限、エフェクトは使うときだけ、
// スマホ（遅い機械のまね）で再生しても音が遅れない
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ ...devices['Pixel 5'] });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour');
  await p.waitForTimeout(900);
  const r = await p.evaluate(async () => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const out = {};
    out['スマホとして動く'] = LOW_POWER;
    // 2つのパートが同じ音（ユニゾン）＋1つは別の音
    const mk = (p0) => { const n = []; for (let i = 0; i < 16; i++) n.push({ s: i * 48, p: p0 + (i % 5), l: 48 }); return n; };
    loadSong({ v: 2, title: 'u', bpm: 120, bars: 4, tracks: [{ type: 'melody', inst: 'flute', notes: mk(72) }, { type: 'melody', inst: 'flute', notes: mk(72) }, { type: 'melody', inst: 'oboe', notes: mk(72) }] }, { own: true });
    const L = eventList().filter((e) => e.kind === 'note');
    out['同じ楽器・同じ音は1つにまとめる（16×3 → 32）'] = L.length;
    out['まとめた音は少し大きく'] = (() => { const calls = []; const o = Sound.playNote; Sound.playNote = (c, outN, inst, m, t, dur, v) => calls.push(v); const g = { outs: {}, pans: {}, session: actx ? actx.createGain() : null }; ensureAudio(); g.session = actx.createGain(); scheduleEvent(actx, g, L.find((e) => e.alt), actx.currentTime + 1, false); Sound.playNote = o; return calls.length === 1 && calls[0] > L.find((e) => e.alt).v; })();
    // 消音：まとめたパートの1つを消しても、もう1つで鳴る。両方消すと鳴らない
    const count = () => { let n = 0; const o = Sound.playNote; Sound.playNote = () => n++; const g = { outs: {}, pans: {}, session: actx.createGain() }; for (const e of L) scheduleEvent(actx, g, e, actx.currentTime + 1, false); Sound.playNote = o; return n; };
    song.tracks[0].mute = true;
    const a = count();
    song.tracks[1].mute = true;
    const c = count();
    song.tracks[0].mute = song.tracks[1].mute = false;
    out['1つ消音しても鳴る（32）・2つ消音すると、のこりだけ（16）'] = a + '・' + c;
    // パートごとの書き出し：まとめた音も、そのパートの分は入る
    const only = () => { let n = 0; const o = Sound.playNote; Sound.playNote = () => n++; const g = { outs: {}, pans: {}, session: actx.createGain(), only: song.tracks[1].id }; for (const e of L) scheduleEvent(actx, g, e, actx.currentTime + 1, false); Sound.playNote = o; return n; };
    out['2つ目のパートだけ書き出す（16）'] = only();
    // 同時に鳴らす録音の数の上限（スマホは32）
    await Sound.Samples.load('flute', actx, [72]);
    const oc = new OfflineAudioContext(1, 44100, 44100);
    for (let i = 0; i < 80; i++) Sound.playNote(oc, oc.destination, 'flute', 72, 0.01 + i * 0.001, 0.5, 0.5, true);
    out['同時に鳴らすのは32まで'] = oc._voices.filter((v) => v.t <= 0.1 && v.stopAt > 0.1).length;
    // エフェクト（ディレイ・リバーブ）は使うときだけつなぐ
    play();
    const B = player.graph.base;
    const before = JSON.stringify(B._fxL || {});
    fxApply('reverb', 0.5, 0.5, true);
    const mid = JSON.stringify(B._fxL);
    fxApply('reverb', 0, 0, false);
    stop();
    out['エフェクト：はじめはつながず、使うとつなぐ'] = before + ' → ' + mid;
    return out;
  });
  // 大きな曲（30パート）をスマホの遅さで再生しても、音が遅れない
  const cdp = await ctx.newCDPSession(p);
  r['遅い機械で、遅れて鳴った音（0）'] = await p.evaluate(async () => {
    const tracks = [];
    for (let k = 0; k < 30; k++) { const notes = []; for (let i = 0; i < 400; i++) notes.push({ s: i * 12, p: 48 + ((i * 7 + k * 5) % 36), l: 24, art: i % 16 === 0 ? ['tr'] : undefined }); tracks.push({ type: 'melody', inst: k % 2 ? 'strings' : 'flute', notes }); }
    loadSong({ v: 2, title: 'big', bpm: 120, bars: 25, tracks }, { own: true });
    return true;
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  r['遅い機械で、遅れて鳴った音（0）'] = await p.evaluate(async () => {
    setView('score');
    await new Promise((res) => setTimeout(res, 1500));
    let late = 0;
    const o = Sound.playNote;
    Sound.playNote = function (c, outN, inst, m, t, ...a) { if (c === actx && t - c.currentTime < 0.003) late++; return o.call(this, c, outN, inst, m, t, ...a); };
    play();
    await new Promise((res) => setTimeout(res, 6000));
    stop();
    Sound.playNote = o;
    return late;
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
