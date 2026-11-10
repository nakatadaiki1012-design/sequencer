const { chromium } = require('playwright');
const SP = __dirname;
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('dialog', (d) => d.accept());
  await p.goto('http://localhost:8765/?notour');
  await p.waitForTimeout(1000);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); });
  const out = {};
  for (const [bars, step, ntr] of [[16, 24, 5], [32, 24, 6], [64, 12, 6]]) {
    out[`${bars}bars_${ntr}mel_step${step}`] = await p.evaluate(async ([bars, step, ntr]) => {
      const s = newSong(); s.bars = bars; s.bpm = 120; s.tracks = [];
      for (let k = 0; k < ntr; k++) { const t = newTrack('melody', { name: 'M' + k, inst: 'piano', range: 'all' }); for (let x = 0; x < bars * 192; x += step) t.notes.push({ s: x, p: 40 + ((x / step + k * 3) % 36), l: step }); s.tracks.push(t); }
      const d = newTrack('drum'); d.grid = { kick: {}, hihat: {} }; for (let x = 0; x < bars * 192; x += 24) { d.grid.hihat[x] = 1; if (x % 96 === 0) d.grid.kick[x] = 2; } s.tracks.push(d);
      loadSong(s); selectTrack(0);
      await Sound.Samples.load('piano', audioCtx()).catch(() => {}); await Sound.Samples.loadDrums(audioCtx()).catch(() => {});
      const time = (f, n = 10) => { const t = performance.now(); for (let i = 0; i < n; i++) f(); return +((performance.now() - t) / n).toFixed(1); };
      const r = { notes: s.tracks.reduce((a, t) => a + (t.notes ? t.notes.length : 0), 0) };
      r.draw = time(() => draw()); r.drawOverview = time(() => drawOverview()); r.edit = time(() => edit(() => { track().notes[0].p++; }, 't'), 5);
      const ctx = ensureAudio(); await ctx.resume();
      const frames = []; let last = performance.now(); let run = true;
      const loop = (t) => { frames.push(t - last); last = t; if (run) requestAnimationFrame(loop); };
      const lead = []; const orig = Sound.playNote;
      Sound.playNote = function (c, o, i, m, t, ...a) { lead.push(t - c.currentTime); return orig.call(this, c, o, i, m, t, ...a); };
      let t0 = performance.now(); play(); r.playCallMs = +(performance.now() - t0).toFixed(0);
      requestAnimationFrame(loop);
      await new Promise((res) => setTimeout(res, 4000));
      run = false; stop(); Sound.playNote = orig;
      frames.sort((a, b) => a - b); lead.sort((a, b) => a - b);
      r.frameMedian = +frames[frames.length >> 1].toFixed(1); r.frameMax = +frames[frames.length - 1].toFixed(0);
      r.notesScheduled = lead.length; r.lateNotes = lead.filter((x) => x < 0).length; r.worstLateMs = +(lead[0] * 1000).toFixed(0);
      return r;
    }, [bars, step, ntr]);
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
