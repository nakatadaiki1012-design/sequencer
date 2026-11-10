// パン：左にしたトラックは書き出しでも左から聞こえる
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 820 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  const r = await p.evaluate(async () => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    loadSong(sampleSong());
    song.bars = 2;
    song.tracks.forEach((t, i) => { if (i > 0) t.mute = true; t.real = false; });
    const energy = async () => { const buf = await renderSong(); const L = buf.getChannelData(0); const R = buf.getChannelData(1); let l = 0; let r = 0; for (let i = 0; i < L.length; i += 7) { l += L[i] * L[i]; r += R[i] * R[i]; } return l / (r || 1e-9); };
    const mid = await energy();
    song.tracks[0].pan = -1;
    const left = await energy();
    openPalette();
    const ui = document.querySelectorAll('#palBody input.pan').length;
    return { 'まん中（左÷右）': +mid.toFixed(2), '左にしたとき（左÷右）': +left.toFixed(1), 'ミキサーのつまみの数': ui };
  });
  r['エラー'] = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
