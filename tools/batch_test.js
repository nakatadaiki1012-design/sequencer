// まとめて採点：お手本と3人ぶんのファイル → 一覧・CSV
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 820 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(800);
  // 3人ぶんのファイルを作る（そのまま・2音ちがう・こわれたファイル）
  const files = await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    loadSong(sampleSong());
    const a = snapshot();
    const s2 = JSON.parse(a); s2.title = 'Bさん'; s2.tracks[0].notes.splice(0, 2); s2.tracks[0].notes.push({ s: 0, p: 90, l: 48 });
    refSong = sanitizeSong(migrate(JSON.parse(a)));
    updateCompare();
    return { a: JSON.parse(a), b: s2 };
  });
  const dir = path.join(OUT, 'class'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '01_Aさん.json'), JSON.stringify({ ...files.a, title: 'Aさん' }));
  fs.writeFileSync(path.join(dir, '02_Bさん.json'), JSON.stringify(files.b));
  fs.writeFileSync(path.join(dir, '03_Cさん.json'), '{こわれた');
  const fc = p.waitForEvent('filechooser');
  await p.click('#cmpBatch');
  const ch = await fc;
  await ch.setFiles(['01_Aさん.json', '02_Bさん.json', '03_Cさん.json'].map((f) => ({ name: f, mimeType: 'application/json', buffer: fs.readFileSync(path.join(dir, f)) })));
  await p.waitForTimeout(800);
  const r = { '一覧': await p.evaluate(() => [...document.querySelectorAll('#batchBody tbody tr')].map((tr) => tr.innerText.replace(/\s+/g, ' ').trim())) };
  await p.screenshot({ path: `${OUT}/batch.png` });
  await p.click('#batchBody tr[data-i="1"]'); await p.waitForTimeout(300);
  r['行をおすとその曲が開く'] = await p.evaluate(() => song.title + ' / ' + document.querySelector('#cmpText').textContent);
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
