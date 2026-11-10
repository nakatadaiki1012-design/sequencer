// 楽譜ダイアログ：曲を開きなおしてもからっぽにならない、iPad たてのならび
const { chromium, devices } = require('playwright');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch(); const r = {}; const errs = [];
  for (const [name, opt] of [['pc', { viewport: { width: 1366, height: 768 } }], ['ipad', devices['iPad (gen 7)']]]) {
    const ctx = await b.newContext(opt); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(name + ': ' + e.message));
    await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
    await p.click('.tpl >> nth=5'); await p.waitForTimeout(300);
    await p.evaluate(() => openScore()); await p.waitForTimeout(400);
    await p.evaluate(() => document.querySelector('#dlgScore').close());
    await p.evaluate(() => { edit(() => { for (let i = 0; i < 5; i++) track().notes.push({ s: i * 48, p: 60 + i * 2, l: 48 }); }, 't'); });
    await p.evaluate(() => openScore()); await p.waitForTimeout(500);
    r[name + ' 音を入れたあと：パートの数'] = await p.evaluate(() => scoreSel.size);
    await p.evaluate(() => document.querySelector('#dlgScore').close());
    await p.evaluate(() => loadSong(sampleSong()));
    await p.evaluate(() => openScore()); await p.waitForTimeout(600);
    r[name + ' サンプルを開いたあと：パートの数'] = await p.evaluate(() => scoreSel.size);
    r[name + ' 楽譜の絵がある'] = await p.evaluate(() => document.querySelectorAll('#dlgScore svg .nh, #dlgScore svg path, #dlgScore svg text').length > 20);
    r[name + ' 楽譜のはば'] = await p.evaluate(() => Math.round(document.querySelector('#dlgScore .scoreview').getBoundingClientRect().width) + ' / ' + Math.round(document.querySelector('#dlgScore').getBoundingClientRect().width));
    await p.screenshot({ path: `${OUT}/scoredlg_${name}.png` });
    await ctx.close();
  }
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
