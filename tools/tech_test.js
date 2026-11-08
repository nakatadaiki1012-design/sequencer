// ハイテク感：ビジュアライザー・光のしっぽ・テーマ「ネオン」
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const r = {};
  const errs = [];
  for (const [name, vp] of [['pc', { width: 1366, height: 820 }], ['phone', { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: name === 'phone', isMobile: name === 'phone' });
    await ctx.addInitScript(() => localStorage.setItem('otsumiki-theme', 'neon'));
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(name + ': ' + e.message));
    await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(1000); await p.click('.tpl >> nth=0'); await p.waitForTimeout(500);
    r[name + ' テーマ'] = await p.evaluate(() => document.documentElement.dataset.theme);
    r[name + ' 背景色'] = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await p.evaluate(() => { edit(() => { for (let i = 0; i < 32; i++) track().notes.push({ s: i * 24, p: 60 + [0, 4, 7, 12, 7, 4][i % 6], l: 24 }); }, 'テスト'); });
    await p.click('#btnPlay'); await p.waitForTimeout(1500);
    r[name + ' 光の柱が動く'] = await p.evaluate(() => {
      const c = document.querySelector('#viz'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n > 50;
    });
    await p.screenshot({ path: `${OUT}/tech_${name}_neon.png` });
    await p.click('#btnPlay'); await p.waitForTimeout(2500);
    r[name + ' 止めたら消える'] = await p.evaluate(() => vizFadeRaf === 0);
    await ctx.close();
  }
  // ふつうのテーマでも動く（明るい画面）
  const ctx = await b.newContext({ viewport: { width: 1366, height: 820 } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('light: ' + e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(1000); await p.click('.tpl >> nth=0'); await p.waitForTimeout(500);
  await p.click('#btnPlay'); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/tech_pc_lavender.png` });
  await p.click('#btnPlay');
  await p.evaluate(() => openTheme()); await p.waitForTimeout(300);
  r['テーマの数'] = await p.locator('#themeGrid .themebtn').count();
  await p.click('#themeGrid [data-t="neon"]'); await p.waitForTimeout(300);
  r['ネオンで明るさボタンは休み'] = await p.evaluate(() => document.querySelector('#modeSeg').classList.contains('dis'));
  await p.screenshot({ path: `${OUT}/tech_theme_dialog.png` });
  await b.close();
  r['エラー'] = errs;
  console.log(JSON.stringify(r, null, 1));
})();
