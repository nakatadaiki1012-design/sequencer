// 対位法れんしゅう：はじめる → 正しい対旋律でエラーなし／平行5度・不協和を見つける／楽譜とピアノロールに印
const { chromium } = require('playwright');
const SHOT = process.argv[2];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(1000);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); });
  // メニューから はじめる
  await p.click('#btnMenu, .menu > summary').catch(() => {});
  await p.evaluate(() => document.querySelector('#btnCp').click());
  await p.waitForTimeout(200);
  const r = {};
  r['ダイアログ'] = await p.evaluate(() => document.querySelector('#dlgCp').open && document.querySelectorAll('#cpCf option').length);
  await p.click('#cpGo'); await p.waitForTimeout(300);
  r['はじめた'] = await p.evaluate(() => ({ title: song.title, tracks: song.tracks.map((t) => t.name + (t.locked ? '🔒' : '')).join(','), cur: track().name, grid: ui.grid, bar: document.querySelector('#cpText').textContent }));
  // Fux の模範解答（上・第1類）
  r['模範解答'] = await p.evaluate(() => {
    const t = track();
    edit(() => { t.notes = [69, 69, 67, 69, 71, 72, 72, 71, 74, 73, 74].map((p, i) => ({ s: i * 192, p, l: 192 })); }, 'cp');
    const res = cpResult();
    return res.issues.filter((x) => x.level !== 'hint').length + ' / ' + document.querySelector('#cpText').textContent;
  });
  await p.waitForTimeout(100);
  r['できました表示'] = await p.evaluate(() => document.querySelector('#cpBar').classList.contains('perfect'));
  // わざと平行5度と不協和
  r['まちがい'] = await p.evaluate(() => {
    const t = track();
    edit(() => { t.notes[1].p = 72; t.notes[2].p = 71; t.notes[4].p = 72; }, 'cp');
    return cpResult().issues.filter((x) => x.level === 'err').map((x) => x.rule).join(',');
  });
  await p.waitForTimeout(100);
  r['一覧'] = await p.evaluate(() => { document.querySelector('#cpList').click(); return document.querySelectorAll('.cplist li').length; });
  await p.evaluate(() => document.querySelector('#dlgCp').close());
  if (SHOT) await p.screenshot({ path: SHOT + '_grid.png' });
  await p.evaluate(() => setView('score')); await p.waitForTimeout(400);
  r['楽譜に印'] = await p.evaluate(() => [...document.querySelectorAll('#scoreEditView text')].filter((t) => t.getAttribute('fill') === '#e03131').length);
  r['楽譜に音程の数字'] = await p.evaluate(() => [...document.querySelectorAll('#scoreEditView text')].filter((t) => t.getAttribute('fill') === '#1e3a8a').map((t) => t.textContent).join(' '));
  if (SHOT) await p.screenshot({ path: SHOT + '_score.png' });
  // 第2類・下で はじめなおす
  await p.evaluate(() => { cpStart('c', 2, false); });
  r['第2類・下'] = await p.evaluate(() => ({ grid: ui.grid, order: song.tracks.map((t) => t.name).join(','), text: document.querySelector('#cpText').textContent }));
  // 第4類・上：掛留の模範（2分音符2つで書く）→ まちがい0、数字は「6→7」の形
  await p.evaluate(() => { cpStart('d', 4, true); });
  r['第4類'] = await p.evaluate(() => {
    const t = track();
    const ps = [69, 74, 72, 71, 74, 81, 77, 76, 74, 73, 74];
    edit(() => { t.notes = []; ps.forEach((q, b) => { if (b === 10) t.notes.push({ s: 1920, p: q, l: 192 }); else { t.notes.push({ s: b * 192 + 96, p: q, l: 96 }); if (b < 9) t.notes.push({ s: (b + 1) * 192, p: q, l: 96 }); } }); }, 'cp');
    const tied = t.notes.map((n) => ({ ...n }));
    const r1 = cpResult().issues.filter((x) => x.level !== 'hint').length;
    edit(() => { t.notes = ps.map((q, b) => (b === 10 ? { s: 1920, p: q, l: 192 } : { s: b * 192 + 96, p: q, l: b === 9 ? 96 : 192 })); }, 'cp');
    const lab = cpLabel(t.notes[1], t.notes);
    return { grid: ui.grid, split: r1, tied: cpResult().issues.filter((x) => x.level !== 'hint').length, label: lab, text: document.querySelector('#cpText').textContent, n: tied.length };
  });
  if (SHOT) { await p.evaluate(() => setView('score')); await p.waitForTimeout(400); await p.screenshot({ path: SHOT + '_s4.png' }); }
  await p.evaluate(() => { cpStart('c', 3, true); });
  r['第3類'] = await p.evaluate(() => ({ grid: ui.grid, dur: ui.sc.dur, text: document.querySelector('#cpText').textContent }));
  // おわる
  await p.evaluate(() => document.querySelector('#cpClose').click()); await p.waitForTimeout(100);
  r['おわる'] = await p.evaluate(() => document.querySelector('#cpBar').hidden);
  // 保存して開きなおしても続く
  r['保存'] = await p.evaluate(() => { song.cp.on = true; const j = JSON.parse(JSON.stringify(song)); loadSong(j); return cpOn(); });
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
