// 発表モードの歌詞（カラオケ）
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage({ viewport: { width: 1366, height: 768 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(800);
  await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    loadSong(sampleSong()); selectTrack(0);
    const ly = 'か え る の う た が き こ え て く る よ'.split(' ');
    edit(() => { track().notes.slice().sort((a, b) => a.s - b.s).forEach((n, i) => { if (ly[i]) n.ly = ly[i]; }); }, '歌詞');
    setPresent(true); play();
  });
  await p.waitForTimeout(1600);
  const r = { '歌詞が出る': await p.evaluate(() => document.querySelector('#karaoke').innerText.replace(/\s+/g, '')), '光っている字': await p.evaluate(() => (document.querySelector('#karaoke .now') || {}).textContent) };
  await p.screenshot({ path: `${OUT}/karaoke.png` });
  await p.evaluate(() => stop());
  r['止めたら消える'] = await p.evaluate(() => document.querySelector('#karaoke').hidden);
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
