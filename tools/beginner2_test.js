// 初心者向け2：「曲の地図」の名前、はじめてのミッションで次の場所が光る、たくさん消したら「もどす」ボタンつきのお知らせ
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 860 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  const out = process.argv[2] || 'tools';
  await p.goto('http://localhost:8765/');
  await p.waitForTimeout(900);
  const r = {};
  r['曲の地図の見出し'] = await p.evaluate(() => document.querySelector('.ovtools b').textContent);
  // はじめての人：テンプレートをえらぶとミッションが始まる
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.querySelector('.tpl').click(); });
  await p.waitForTimeout(600);
  r['ミッション'] = await p.evaluate(() => !!document.querySelector('#mission'));
  r['光っている場所1'] = await p.evaluate(() => [...document.querySelectorAll('.missionGlow')].map((e) => e.id).join(','));
  await p.screenshot({ path: out + '/m_glow.png' });
  await p.evaluate(() => { const tr = song.tracks.find((t) => t.type === 'melody'); edit(() => { for (let i = 0; i < 5; i++) tr.notes.push({ s: i * 48, p: 60 + i * 2, l: 48 }); }); });
  await p.waitForTimeout(300);
  r['光っている場所2'] = await p.evaluate(() => [...document.querySelectorAll('.missionGlow')].map((e) => e.id).join(','));
  // たくさん消す → もどすボタン
  const n0 = await p.evaluate(() => noteCount());
  await p.evaluate(() => { const tr = song.tracks.find((t) => t.type === 'melody'); edit(() => { tr.notes = []; }, 'ぜんぶ消す'); });
  await p.waitForTimeout(300);
  r['お知らせ'] = await p.evaluate(() => document.querySelector('#toast').textContent);
  await p.screenshot({ path: out + '/m_undo.png' });
  await p.click("#toast .toastbtn", { timeout: 3000 });
  await p.waitForTimeout(300);
  r['もどした後の音の数'] = n0 + ' → ' + (await p.evaluate(() => noteCount()));
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
