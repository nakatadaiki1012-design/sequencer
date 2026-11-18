// 穴あき課題：先生が小節を空けた課題ファイルを書き出す → 生徒が開くと、わくと「答え合わせ」が出る → 空けた小節だけで採点
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 860 }, acceptDownloads: true });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  const out = process.argv[2] || 'tools';
  await p.goto('http://localhost:8765/?notour');
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const notes = [];
    for (let i = 0; i < 16; i++) notes.push({ s: i * 48, p: [60, 62, 64, 65, 67, 65, 64, 62][i % 8], l: 48 });
    loadSong({ v: 2, title: 'かだい', bpm: 100, bars: 4, tracks: [{ type: 'melody', inst: 'piano', notes }, { type: 'drum', kit: 'drums', grid: {} }] }, { own: true });
  });
  const r = {};
  // 先生：先生用設定から、2〜3小節目を空けて書き出す
  await p.click('[data-pop="menu"] > summary');
  await p.click('#btnTeach');
  await p.fill('#tkBars', '2-3');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#tkMake')]);
  r['ファイル名'] = dl.suggestedFilename();
  const fs = require('fs');
  const txt = fs.readFileSync(await dl.path(), 'utf8');
  const task = JSON.parse(txt);
  r['課題ファイルの音の数（16-8=8）'] = task.tracks[0].notes.length;
  r['いまの曲はそのまま（16）'] = await p.evaluate(() => song.tracks[0].notes.length);
  await p.evaluate(() => document.querySelector('#dlgTeach').close());
  // 生徒：課題ファイルを開く
  await p.evaluate((t) => loadSong(JSON.parse(t), { own: true }), txt);
  await p.waitForTimeout(400);
  r['課題のバー'] = await p.evaluate(() => (document.querySelector('#taskBar') || {}).textContent || 'なし');
  await p.screenshot({ path: out + '/task_open.png' });
  // 半分だけ正しく入れる
  await p.evaluate(() => edit(() => { const tr = song.tracks[0]; for (let i = 4; i < 8; i++) tr.notes.push({ s: i * 48, p: [60, 62, 64, 65, 67, 65, 64, 62][i % 8], l: 48 }); tr.notes.push({ s: 8 * 48, p: 72, l: 48 }); }));
  await p.click('#taskCheck');
  await p.waitForTimeout(300);
  r['答え合わせ（半分）'] = await p.evaluate(() => document.querySelector('#cmpText').textContent);
  await p.screenshot({ path: out + '/task_check.png' });
  // 全部正しく
  await p.evaluate(() => edit(() => { const tr = song.tracks[0]; tr.notes = tr.notes.filter((n) => n.p !== 72); for (let i = 8; i < 12; i++) tr.notes.push({ s: i * 48, p: [60, 62, 64, 65, 67, 65, 64, 62][i % 8], l: 48 }); }));
  await p.click('#taskCheck');
  await p.waitForTimeout(300);
  r['答え合わせ（ぜんぶ）'] = await p.evaluate(() => document.querySelector('#cmpText').textContent);
  // ふつうの曲を開くと、課題のバーは消える
  await p.evaluate(() => loadSong({ v: 2, title: 'x', bars: 2, tracks: [{ type: 'melody', inst: 'piano', notes: [] }] }, { own: true }));
  r['ふつうの曲で課題のバー'] = await p.evaluate(() => !!document.querySelector('#taskBar'));
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
