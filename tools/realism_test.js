// 本物らしい音（重くしない）と、再生中の現在地
// ・オーケストラを読みこむと、舞台のように左右にならぶ（左右を決めてあれば、そのまま）
// ・長い音にビブラート（弦・フルートなど）、スラーの中はやわらかい出だし、強さに少しのばらつき（時間はずらさない）
// ・再生中：小節と拍、経過時間／曲の長さ、すすみぐあいの線。曲の地図も鳴っている所まで動く
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
    // 左右のならび
    const names = ['Flute', 'Oboe', 'Clarinet in B♭', 'Bassoon', 'Horn in F', 'Trumpet', 'Violin 1', 'Violin 2', 'Viola', 'Violoncello', 'Contrabass'];
    const sg = { tracks: names.map((n) => ({ type: 'melody', name: n, inst: 'strings', notes: [] })) };
    seatOrchestra(sg);
    out['ならび（Vn1 左・Vn2 少し左・Va 少し右・Vc 右・Cb もっと右）'] = sg.tracks.slice(6).map((t) => t.name + ' ' + t.pan).join(', ');
    const sg2 = { tracks: names.map((n, i) => ({ type: 'melody', name: n, inst: 'strings', notes: [], pan: i === 0 ? 0.5 : 0 })) };
    seatOrchestra(sg2);
    out['左右を決めてあれば、そのまま'] = sg2.tracks.every((t, i) => t.pan === (i === 0 ? 0.5 : 0));
    // 鳴らし方を調べる
    await Sound.Samples.load('violin', actx || ensureAudio(), [72]);
    const oc = new OfflineAudioContext(1, 44100 * 3, 44100);
    const P = AudioParam.prototype;
    const orig = P.setValueCurveAtTime;
    let curves = 0;
    P.setValueCurveAtTime = function (...a) { curves++; return orig.apply(this, a); };
    Sound.playNote(oc, oc.destination, 'violin', 72, 0, 2, 0.8, true);
    Sound.playNote(oc, oc.destination, 'violin', 72, 0, 0.3, 0.8, true);
    Sound.playNote(oc, oc.destination, 'clarinet', 72, 0, 2, 0.8, false);
    P.setValueCurveAtTime = orig;
    out['ビブラート：長いヴァイオリンの音だけ（1）'] = curves;
    // 強さのばらつき（毎回同じ）・時間はずらさない
    loadSong({ v: 2, title: 'h', bpm: 120, bars: 2, tracks: [{ type: 'melody', inst: 'piano', notes: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ s: i * 48, p: 60 + i, l: 48 })) }] }, { own: true });
    const calls = [];
    const o = Sound.playNote;
    Sound.playNote = (c, outN, inst, m, t, dur, v, real, leg) => calls.push([t, v]);
    const g = { outs: {}, pans: {}, session: ensureAudio().createGain() };
    const L = eventList().filter((e) => e.kind === 'note');
    for (const e of L) scheduleEvent(actx, g, e, 1 + absSec(e.t), false);
    const first = calls.map((c) => c[1].toFixed(4)).join();
    calls.length = 0;
    for (const e of L) scheduleEvent(actx, g, e, 1 + absSec(e.t), false);
    Sound.playNote = o;
    out['強さのばらつき：±4%の中・毎回同じ'] = calls.every((c, i) => Math.abs(c[1] / L[i].v - 1) <= 0.041) && calls.map((c) => c[1].toFixed(4)).join() === first;
    out['時間はずらさない'] = calls.every((c, i) => Math.abs(c[0] - (1 + absSec(L[i].t))) < 1e-9);
    // 響き（ホールの響き）：左右でちがう
    const rv = Sound.makeReverb(new OfflineAudioContext(2, 100, 44100), 1.4).buffer;
    const l = rv.getChannelData(0), rr = rv.getChannelData(1);
    let diff = 0; for (let i = 0; i < l.length; i++) diff += Math.abs(l[i] - rr[i]);
    out['響き：左右でちがう'] = diff > 1;
    // 再生中の現在地
    const notes = []; for (let i = 0; i < 400; i++) notes.push({ s: i * 48, p: 60 + (i % 12), l: 48 });
    loadSong({ v: 2, title: 'pos', bpm: 240, bars: 100, tracks: [{ type: 'melody', inst: 'piano', notes }, { type: 'melody', inst: 'flute', notes }] }, { own: true });
    setView('grid');
    ui.startTick = barStart(40);
    play();
    await new Promise((res) => setTimeout(res, 1200));
    const mini = document.querySelector('#miniInfo').innerText.replace(/\s+/g, ' ');
    const prog = document.querySelector('#miniProg').style.transform;
    const ovx = document.querySelector('#ovScroller').scrollLeft;
    stop();
    out['表示（41小節…と、0:40 / 1:40 のような時間）'] = mini;
    out['時間の形'] = /\d+小節 \d拍.*\d:\d\d \/ \d:\d\d/.test(mini);
    out['すすみぐあいの線（4割くらい）'] = prog;
    out['曲の地図が鳴っている所まで動く'] = ovx > 0;
    out['止めると時間は消える'] = getComputedStyle(document.querySelector('#miniTime')).display === 'none';
    return out;
  });
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
