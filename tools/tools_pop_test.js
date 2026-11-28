// 「道具」のポップアップ：横にスクロールする行に切りとられず、ぜんぶ見える
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); setView('score'); });
  await p.waitForTimeout(400);
  await p.click('details[data-pop="tools"] > summary'); await p.waitForTimeout(300);
  const r = await p.evaluate(() => { const pb = document.querySelector('details[data-pop="tools"] > .popbody'); const q = pb.getBoundingClientRect(); const last = [...pb.querySelectorAll('button')].pop(); const lr = last.getBoundingClientRect(); const top = document.elementFromPoint(lr.left + lr.width / 2, lr.top + lr.height / 2); return { h: Math.round(q.height), inView: q.bottom <= innerHeight, lastHit: !!top && (top === last || last.contains(top)) }; });
  console.log(JSON.stringify({ ...r, 'ぜんぶ見える（高さ 300 以上）': r.h > 300, errs }, null, 1)); await b.close();
})();
