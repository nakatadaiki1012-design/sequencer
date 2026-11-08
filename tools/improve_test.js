// 改善：からっぽの案内・きらっ・自動保存の印・マイ曲・書き出しのようす・楽譜の色・予告の調号
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 820 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', (d) => d.accept('テスト曲'));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(1000);
  const r = {};
  // からっぽの曲
  await p.click('.tpl >> nth=5'); await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/imp_empty.png` });
  r['新しい曲の音の数'] = await p.evaluate(() => track().notes.length);
  // マス目をクリック → きらっ
  const box = await p.locator('#cv').boundingBox();
  await p.mouse.click(box.x + 300, box.y + 300); await p.waitForTimeout(120);
  r['置いた直後のきらっ'] = await p.evaluate(() => fxNotes.size);
  await p.waitForTimeout(600);
  r['0.6秒後（消える）'] = await p.evaluate(() => fxNotes.size);
  r['自動保存の印'] = await p.getAttribute('#saveMark', 'data-st');
  // マイ曲
  await p.evaluate(() => { edit(() => { for (let i = 0; i < 12; i++) track().notes.push({ s: i * 48, p: 60 + (i * 3) % 12, l: 48 }); }, 'テスト'); });
  await p.evaluate(() => saveToBrowser());
  await p.evaluate(() => openDialog()); await p.waitForTimeout(300);
  r['マイ曲の絵'] = await p.locator('.openthumb svg rect').count();
  await p.screenshot({ path: `${OUT}/imp_mysongs.png` });
  await p.evaluate(() => document.querySelector('#dlgOpen').close());
  // 書き出しのようす（MP3）
  const saw = [];
  await p.exposeFunction('note', (x) => saw.push(x));
  await p.evaluate(() => { window.download = () => {}; const o = exportProgress; window.exportProgress = (l, v) => { if (l) note(Math.round(v * 100)); o(l, v); }; });
  // exportProgress は関数宣言なので上書きして見る
  const blob = await p.evaluate(async () => { const bl = await exportMp3(); return bl ? bl.size : 0; });
  r['MP3の大きさ'] = blob;
  r['進みぐあいの表示が出た'] = await p.evaluate(() => !!document.querySelector('#expBar'));
  // やめるボタン
  await p.evaluate(() => { edit(() => { song.bars = 32; }, '長く'); });
  const pr = p.evaluate(async () => { try { await exportMp3(); return 'done'; } catch (e) { return 'err ' + e.message; } });
  await p.waitForTimeout(250);
  r['書き出し中の画面'] = await p.evaluate(() => document.querySelector('#dlgExport').open);
  await p.screenshot({ path: `${OUT}/imp_export.png` });
  await p.click('#expCancel');
  r['やめた後'] = await pr;
  r['画面が閉じた'] = await p.evaluate(() => !document.querySelector('#dlgExport').open);
  // 楽譜：カーソルの色と予告の調号
  await p.evaluate(() => {
    localStorage.setItem('otsumiki-theme', 'sakura'); applyTheme();
    edit(() => { song.bars = 8; song.keys = { 4: { key: 2, minor: false } }; song.meters = { 4: [3, 4] }; scoreSettings().perLine = 4; }, 'テスト');
    setView('score');
  });
  await p.waitForTimeout(500);
  r['カーソルの色'] = await p.evaluate(() => document.querySelector('#scoreEditView .cursor').getAttribute('stroke'));
  await p.screenshot({ path: `${OUT}/imp_score.png` });
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
