// 打楽器ひとつずつの絵：全部の打楽器に絵がある・マス目の左・楽器えらび・スマホのパッドに出る
const { chromium, devices } = require('playwright');
const OUT = process.argv[2] || '.';
const SONG = { v: 2, title: 'beat', bars: 4, tracks: [{ type: 'melody', notes: [{ s: 0, p: 60, l: 48 }] }, { type: 'drum', grid: { kick: { 0: 1, 96: 1 }, snare: { 48: 1, 144: 1 }, hihat: { 0: 1, 24: 1, 48: 1, 72: 1 } } }] };
(async () => {
  const b = await chromium.launch(); const r = {}; const errs = [];
  // --- パソコン ---
  const p = await b.newPage({ viewport: { width: 1366, height: 820 } }); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(800);
  r.全部に絵 = await p.evaluate(() => Object.keys(Sound.DRUMS).filter((id) => !InstIcons.hasDrum(id)));
  r.絵がちがう = await p.evaluate(() => new Set(['kick', 'snare', 'hihat', 'ohat', 'tomL', 'tomH', 'ride', 'crash'].map((id) => InstIcons.drum(id))).size);
  await p.evaluate((s) => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); loadSong(s); selectTrack(1); }, SONG);
  await p.waitForTimeout(500);
  // マス目の左の列に絵が描かれた（絵のない場合とくらべて、色のついた点がふえる）
  r.マス目に絵 = await p.evaluate(() => { const im = drumIcon('snare'); return !!im; });
  r.左の列のこい点 = await p.evaluate(() => {
    const c = document.querySelector('#cv'); const dpr = devicePixelRatio || 1; const g = c.getContext('2d');
    const d = g.getImageData(0, Math.round(RH * dpr), Math.round(28 * dpr), Math.round(200 * dpr)).data; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 300) n++; return n > 150;
  });
  await p.screenshot({ path: OUT + '/drum_icons_grid.png' });
  await p.click('.track.sel .instbtn, .track.on .instbtn, .instbtn >> nth=1').catch(() => {});
  await p.waitForTimeout(400);
  r.えらぶ画面の絵 = await p.evaluate(() => document.querySelectorAll('#instBody .pad .pic svg').length);
  r.名前も出る = await p.evaluate(() => [...document.querySelectorAll('#instBody .pad .padname')].some((e) => e.textContent === 'スネア'));
  r.はみ出さない = await p.evaluate(() => [...document.querySelectorAll('#instBody .pad')].every((e) => e.scrollHeight <= e.clientHeight + 1 && e.scrollWidth <= e.clientWidth + 1));
  await p.screenshot({ path: OUT + '/drum_icons_picker.png' });
  await p.close();
  // --- スマホ ---
  const c2 = await b.newContext({ ...devices['iPhone 13'] }); const q = await c2.newPage(); q.on('pageerror', (e) => errs.push(e.message));
  await q.goto('http://localhost:8765/?notour'); await q.waitForTimeout(800);
  await q.evaluate((s) => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); loadSong(s); selectTrack(1); if (typeof setView === 'function') setView('edit'); ui.stepRec = true; renderPhoneKbd(); draw(); }, SONG);
  await q.waitForTimeout(500);
  r.スマホのパッドの絵 = await q.evaluate(() => document.querySelectorAll('#phoneKbd .pkpad .pic svg').length);
  r.スマホではみ出さない = await q.evaluate(() => [...document.querySelectorAll('#phoneKbd .pkpad')].every((e) => e.scrollHeight <= e.clientHeight + 1));
  await q.screenshot({ path: OUT + '/drum_icons_phone.png' });
  console.log(JSON.stringify(r, null, 1)); console.log('エラー:', errs.length ? errs : 'なし');
  await b.close();
})();
