// 楽譜をつくる画面：楽譜の上をおして、曲名・テンポ・パート名・段の大きさ・改行・段のあいだ・余白を変える
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour');
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    const d = document.querySelector('#dlgStart');
    if (d.open) d.close();
    const N = (base) => Array.from({ length: 64 }, (_, i) => ({ s: i * 48, p: base + (i % 5), l: 48 }));
    loadSong({ v: 2, title: 'テスト曲', bpm: 100, bars: 16, key: 0, tempoText: 'Allegro', score: { composer: '作曲者' }, tracks: [{ type: 'melody', name: 'フルート', inst: 'flute', notes: N(72) }, { type: 'melody', name: 'クラリネット', inst: 'clarinet', notes: N(60) }] }, { own: true });
    openScore();
  });
  await p.waitForTimeout(800);
  const out = {};
  const attr = (sel) => p.evaluate((s) => { const e = document.querySelector(s); return e ? e.getAttribute('font-size') || e.getAttribute('transform') : null; }, sel);
  const pop = () => p.evaluate(() => { const x = document.querySelector('#lyPop'); return x && !x.hidden ? x.textContent.replace(/\s+/g, ' ').slice(0, 30) : 'なし'; });
  // 1. 曲名：大きく・下へ
  out['曲名の大きさ（前）'] = await attr('#scoreView [data-look="title"]');
  await p.click('#scoreView [data-look="title"]');
  await p.waitForTimeout(300);
  out['パネル（曲名）'] = await pop();
  await p.click('#lyPop [data-sz="1"]');
  await p.waitForTimeout(300);
  await p.click('#lyPop [data-sz="1"]');
  await p.waitForTimeout(300);
  await p.click('#lyPop [data-mv="0,1"]');
  await p.waitForTimeout(300);
  out['曲名の大きさ（後：26.4）'] = await attr('#scoreView [data-look="title"]');
  out['保存された'] = await p.evaluate(() => JSON.stringify(scoreSettings().look.title));
  // 2. テンポ
  await p.click('#scoreView [data-look="tempo"] rect');
  await p.waitForTimeout(300);
  out['パネル（テンポ）'] = await pop();
  await p.click('#lyPop [data-mv="1,0"]');
  await p.waitForTimeout(300);
  out['テンポが右へ'] = await attr('#scoreView [data-look="tempo"]');
  // 3. パート名
  await p.click('#scoreView .pname');
  await p.waitForTimeout(300);
  await p.click('#lyPop [data-pn="1"]');
  await p.waitForTimeout(300);
  out['パート名の大きさ（12.1）'] = await attr('#scoreView .pname');
  // 4. 段：2つ目の段を小さく
  const sys = await p.$$('#scoreView .syss');
  out['段の数'] = sys.length;
  const bb = await sys[1].boundingBox();
  await p.mouse.click(bb.x + bb.width * 0.6, bb.y + bb.height * 0.5);
  await p.waitForTimeout(300);
  out['パネル（段）'] = await pop();
  await p.click('#lyPop [data-ss="-1"]');
  await p.waitForTimeout(300);
  await p.click('#lyPop [data-ss="-1"]');
  await p.waitForTimeout(300);
  out['段の大きさ'] = await p.evaluate(() => JSON.stringify(scoreSettings().look.sysScale));
  out['段ごとの大きさ'] = await p.evaluate(() => [...document.querySelectorAll('#scoreView .syss')].map((e) => e.dataset.s).join(','));
  out['段の右はし（そろう）'] = await p.evaluate(() => [...document.querySelectorAll('#scoreView .syss')].map((e) => Math.round(e.getBoundingClientRect().right)).join(','));
  // 5. 改行：1つ目の段の、右のほうの小節の前で
  const s0 = (await p.$$('#scoreView .syss'))[0];
  const bb2 = await s0.boundingBox();
  await p.mouse.click(bb2.x + bb2.width * 0.75, bb2.y + bb2.height * 0.5);
  await p.waitForTimeout(300);
  const brk = await p.$('#lyPop [data-brk]');
  if (brk) { await brk.click(); await p.waitForTimeout(300); }
  out['改行'] = await p.evaluate(() => JSON.stringify(scoreSettings().breaks || []));
  // 6. 段のあいだ・余白
  await p.selectOption('#scoreSide [data-s="gapSel"]', '40');
  await p.waitForTimeout(300);
  out['段のあいだ'] = await p.evaluate(() => scoreSettings().look.gap);
  await p.selectOption('#scoreSide [data-s="margin"]', '20');
  await p.waitForTimeout(300);
  out['余白で紙の比がかわる（A4・20mm＝1.51）'] = await p.evaluate(() => pageRatio(printPaper).toFixed(2));
  // 7. 印刷の画面に、余白と段の大きさが入る
  const html = await p.evaluate(() => {
    let h = '';
    const keep = window.open;
    window.open = () => ({ document: { write: (x) => { h += x; }, close() {} } });
    printScore();
    window.open = keep;
    return h;
  });
  out['印刷：余白 20mm'] = /margin:20mm/.test(html);
  out['印刷：段の大きさが入る'] = /scale\(0\.9\)/.test(html);
  // 8. もとにもどす
  await p.click('#lookReset');
  await p.waitForTimeout(300);
  out['もとにもどす'] = await p.evaluate(() => !scoreSettings().look && !scoreSettings().breaks);
  out['曲名の大きさ（もどった：22）'] = await attr('#scoreView [data-look="title"]');
  console.log(JSON.stringify({ ...out, errs }, null, 1));
  await b.close();
})();
