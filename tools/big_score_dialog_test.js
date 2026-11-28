// 大きな楽譜の「楽譜をつくる」画面：設定を変えても、はじめの数ページがすぐ出る。楽譜全体は裏で組み、できたら差しかえる。印刷はできてから
// 使い方：node tools/big_score_dialog_test.js [MuseScore のファイル]（なければ、その場で大きなオーケストラの曲を作る）
const { chromium } = require('playwright');
const fs = require('fs');
const F = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour');
  await p.waitForTimeout(900);
  const b64 = F && fs.existsSync(F) ? fs.readFileSync(F).toString('base64') : null;
  await p.evaluate(async (b64) => {
    const d = document.querySelector('#dlgStart');
    if (d.open) d.close();
    if (b64) {
      const bin = atob(b64);
      const u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      const sg = await MusicXMLImport.readFile(u.buffer, 'big.mscz');
      seatOrchestra(sg);
      loadSong(sg, { own: true });
    } else {
      const BARS = 300;
      const inst = ['piccolo', 'flute', 'oboe', 'clarinet', 'bassoon', 'horn', 'horn', 'trumpet', 'trombone', 'tuba', 'timpani', 'violin', 'violin', 'viola', 'cello', 'contrabass'];
      const N = (base) => Array.from({ length: BARS * 4 }, (_, i) => ({ s: i * 48, p: base + (i % 7), l: 48 }));
      loadSong({ v: 2, title: 'オケ', bpm: 100, bars: BARS, key: 0, score: { orch: true }, tracks: inst.map((x, i) => ({ type: 'melody', name: x + i, inst: x, notes: N(48 + (i % 4) * 7) })) }, { own: true });
    }
  }, b64);
  const out = {};
  const t0 = Date.now();
  await p.evaluate(() => openScore());
  await p.waitForFunction(() => document.querySelectorAll('#scoreView .pagebox, #scoreView svg').length > 0 && !document.querySelector('#scoreView.busy'), null, { timeout: 60000 });
  out['開いてから、はじめのページが出るまで（秒）'] = ((Date.now() - t0) / 1000).toFixed(1);
  out['組んでいる表示'] = await p.evaluate(() => !!document.querySelector('#scoreView .scbusy'));
  // 画面が止まっていない：組んでいるあいだに、ほかの処理がすぐ動く
  out['組んでいるあいだの画面の反応（ミリ秒）'] = await p.evaluate(() => new Promise((res) => { const t = performance.now(); setTimeout(() => res(Math.round(performance.now() - t)), 0); }));
  // 曲名を大きく（タップの調整）：すぐ出る
  const t1 = Date.now();
  await p.click('#scoreView [data-look="title"]');
  await p.click('#lyPop [data-sz="1"]');
  await p.waitForFunction(() => { const e = document.querySelector('#scoreView [data-look="title"]'); return e && +e.getAttribute('font-size') > 22.5 && !document.querySelector('#scoreView.busy'); }, null, { timeout: 60000 });
  out['曲名を大きくして、出るまで（秒）'] = ((Date.now() - t1) / 1000).toFixed(1);
  // 楽譜全体ができる
  await p.waitForFunction(() => scorePages.length > 0, null, { timeout: 180000 });
  out['全体ができるまで（秒）'] = ((Date.now() - t1) / 1000).toFixed(1);
  out['全体のページ数'] = await p.evaluate(() => scorePages.length);
  out['全体にも曲名の大きさが入る'] = await p.evaluate(() => { const m = scorePages[0].match(/font-size="([\d.]+)"[^>]*data-look="title"/); return !!m && Math.abs(+m[1] - 24.2) < 0.01; });
  out['ページの表示（全体）'] = await p.evaluate(() => $('#scFitInfo').textContent);
  // 印刷：組みおわっていれば、すぐ
  const html = await p.evaluate(() => { let h = ''; const keep = window.open; window.open = () => ({ document: { write: (x) => { h += x; }, open() {}, close() {}, body: {} } }); printScore(); window.open = keep; return h; });
  out['印刷にページが入る'] = (html.match(/class="pg"/g) || []).length;
  console.log(JSON.stringify({ ...out, errs }, null, 1));
  await b.close();
})();
