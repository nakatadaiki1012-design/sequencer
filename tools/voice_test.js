// じぶんの音：マイク（テスト用のにせマイク）で録って楽器にする、高さが変わる、書き出しにも入る、共有URLには入れない
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1366, height: 820 }, permissions: ['microphone'] });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); loadSong(sampleSong()); selectTrack(0); });
  await p.click('#trackList .track .instbtn');
  await p.waitForTimeout(300);
  await p.click('#mvRec');
  await p.waitForTimeout(4200);
  const r = {};
  r['録れた'] = await p.evaluate(() => !!song.voice && song.voice.data.length);
  r['えらばれた'] = await p.evaluate(() => picker.val);
  await p.screenshot({ path: `${OUT}/voice_picker.png` });
  r['書き出しで鳴る'] = await p.evaluate(async () => {
    song.tracks[0].inst = 'myvoice'; song.tracks.forEach((t, i) => { if (i) t.mute = true; }); song.bars = 2; version++;
    const buf = await renderSong(); const d = buf.getChannelData(0); let e = 0; for (let i = 0; i < d.length; i += 5) e += d[i] * d[i]; return e > 1;
  });
  r['共有URLには入れない'] = await p.evaluate(async () => { const z = await packSong(); const s2 = await unpackSong(z); return !s2.voice && s2.tracks[0].inst; });
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
