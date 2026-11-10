// 音の直し：全部の書き出しはループのはんいを使わない／弱起＋くり返しでメトロノームが重ならない／再生中に足したトラックも鳴る
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(1200);
  const r = await p.evaluate(async () => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const o = {};
    loadSong({ v: 2, bars: 3, bpm: 240, pickup: 48, repeats: { start: [0], end: [1], volta: {} }, tracks: [{ type: 'melody', inst: 'piano', real: false, notes: [{ s: 144, p: 60, l: 48 }] }] });
    const m = eventList().filter((e) => e.kind === 'metro').map((e) => e.t);
    o['メトロノームが重ならない'] = new Set(m).size === m.length;
    ui.loopOn = true; ui.loopRange = [0, 2]; version++;
    const buf = await renderSong(null, {});
    o['全部の書き出しはくり返しも（秒）'] = +buf.duration.toFixed(2) + ' ≥ ' + (absSec(816) + 3).toFixed(2);
    o['ループはそのまま'] = ui.loopOn === true;
    ui.loopOn = false; ui.loopRange = null; version++;
    loadSong({ v: 2, bars: 4, bpm: 120, tracks: [{ type: 'melody', inst: 'piano', real: false, notes: [] }] });
    const rec = []; const orig = Sound.playNote; Sound.playNote = function (...a) { rec.push(a[3]); return orig.apply(this, a); };
    play(); await new Promise((r) => setTimeout(r, 200));
    edit(() => { song.tracks.push({ id: 'zz', type: 'melody', inst: 'piano', real: false, vol: 0.8, notes: [{ s: 192, p: 72, l: 48 }] }); }, 't');
    await new Promise((r) => setTimeout(r, 2800));
    stop(); Sound.playNote = orig;
    o['再生中に足したトラックも鳴る'] = rec.includes(72);
    return o;
  });
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
