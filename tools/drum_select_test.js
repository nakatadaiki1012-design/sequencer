// リズムのトラックでも、囲んでえらぶ・コピー・貼りつけ・移動・強く・消す
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 820 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(800);
  await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    loadSong({ v: 2, title: 'beat', bars: 4, tracks: [{ type: 'melody', notes: [{ s: 0, p: 60, l: 48 }] }, { type: 'drum', grid: { kick: { 0: 1, 96: 1 }, snare: { 48: 1, 144: 1 }, hihat: { 0: 1, 24: 1, 48: 1, 72: 1 } } }] });
    selectTrack(1); document.querySelector('#scroller').scrollLeft = 0; document.querySelector('#scroller').scrollTop = 0;
  });
  await p.waitForTimeout(300);
  const cnt = () => p.evaluate(() => { let n = 0; for (const id in track().grid) n += Object.keys(track().grid[id]).length; return n; });
  const r = {};
  // Shift＋ドラッグで1小節目を全部囲む
  const box = await p.locator('#scroller').boundingBox();
  const geo = await p.evaluate(() => ({ LW, RH, k: ppt(), rh: rowH(track()), rows: rowsFor(track()).length }));
  await p.keyboard.down('Shift');
  await p.mouse.move(box.x + geo.LW + 2, box.y + geo.RH + 2); await p.mouse.down();
  await p.mouse.move(box.x + geo.LW + 190 * geo.k, box.y + geo.RH + geo.rows * geo.rh - 4, { steps: 6 }); await p.mouse.up();
  await p.keyboard.up('Shift');
  r['囲んだ数'] = await p.evaluate(() => nsel.size + ' ' + [...nsel].join(',') + ' sc=' + document.querySelector('#scroller').scrollLeft + ',' + document.querySelector('#scroller').scrollTop);
  r['はじめの数'] = await cnt();
  await p.screenshot({ path: `${OUT}/drum_select.png` });
  await p.keyboard.press('Control+c');
  await p.evaluate(() => { ui.startTick = barStart(1); });
  await p.keyboard.press('Control+v');
  r['貼りつけ後（8→16）'] = await cnt();
  await p.click('#selLoud');
  r['強くした'] = await p.evaluate(() => prSel().every((h) => h.v === 2));
  await p.keyboard.press('ArrowRight');
  r['→で動く（2小節目の頭がうしろへ）'] = await p.evaluate(() => Math.min(...prSel().map((h) => h.s)));
  await p.keyboard.press('Delete');
  r['消す（16→8）'] = await cnt();
  await p.keyboard.press('Control+z'); await p.keyboard.press('Control+z');
  r['元に戻す'] = await cnt();
  // メロディのコピーはリズムに貼れない
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
