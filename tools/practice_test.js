// 練習：カウント・ゆっくり再生（曲の速さ・書き出しは変わらない）、送るダイアログ
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1366, height: 820 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const r = {};
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); loadSong(sampleSong()); });
  // カウント1小節
  await p.click('#popPractice > summary'); await p.click('#countSeg [data-c="1"]');
  await p.screenshot({ path: `${OUT}/practice_pop.png` });
  await p.evaluate(() => { document.querySelector('#popPractice').open = false; });
  const clicks = [];
  await p.exposeFunction('logClick', (t) => clicks.push(t));
  await p.evaluate(() => { const o = Sound.click; Sound.click = function (c, out, when, acc, k) { window.logClick(+(when - c.currentTime).toFixed(2)); return o.apply(this, arguments); }; });
  await p.evaluate(() => play());
  await p.waitForTimeout(500);
  r['カウントの数（4/4で4つ）'] = clicks.length;
  r['カウント中の数字'] = await p.evaluate(() => document.querySelector('#countHud').textContent);
  r['カウント中は再生の線が出ない'] = await p.evaluate(() => playheadTick() == null);
  await p.screenshot({ path: `${OUT}/practice_count.png` });
  await p.waitForTimeout(2600);
  r['カウントのあと再生が進む'] = await p.evaluate(() => playheadTick() > 0);
  await p.evaluate(() => stop());
  // ゆっくり 50%
  const secFull = await p.evaluate(() => absSec(playTotal()));
  await p.click('#popPractice > summary'); await p.click('#speedPre [data-s="0.5"]'); await p.evaluate(() => { document.querySelector('#popPractice').open = false; });
  await p.evaluate(() => play()); await p.waitForTimeout(300);
  r['50%で長さが2倍'] = (await p.evaluate(() => absSec(playTotal()))) / secFull;
  r['表示'] = await p.evaluate(() => document.querySelector('#miniBpm').textContent);
  r['曲の速さは変わらない'] = await p.evaluate(() => song.bpm);
  await p.evaluate(() => stop());
  r['止めたら元の時間'] = (await p.evaluate(() => absSec(playTotal()))) === secFull;
  // 送る
  await p.evaluate(() => shareDialog()); await p.waitForTimeout(300);
  r['送るのリンクに ?notour が入らない'] = !(await p.inputValue('#shareUrl')).includes('notour');
  await p.screenshot({ path: `${OUT}/share_dialog.png` });
  r['エラー'] = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
