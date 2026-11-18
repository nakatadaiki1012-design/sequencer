// 印刷のページ：段をページの下までそろえる・2ページ目からの見出しとページ番号
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 900, height: 1300 }, deviceScaleFactor: 1 }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const out = process.argv[2] || 'tools';
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  const pages = await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const N = []; for (let i = 0; i < 40 * 4; i++) N.push({ s: i * 48, p: 60 + [0, 4, 7, 12, 11, 7, 5, 2][i % 8] + (i % 3 === 0 ? 2 : 0), l: i % 5 === 0 ? 24 : 48 });
    const M = N.filter((n) => n.l === 48);
    loadSong({ v: 2, title: 'ながい曲', bpm: 100, bars: 40, key: 0, tracks: [{ type: 'melody', inst: 'flute', notes: M, dyn: [{ t: 0, v: 'mf' }] }, { type: 'melody', inst: 'cello', notes: M.map((n) => ({ ...n, p: n.p - 24 })) }] }, { own: true });
    const o = combineParts(scoreOpts(song.tracks.map((t) => t.id), true)); o.width = 780; const svg = Notation.render(o);
    return Notation.paginate(svg, Notation.lastLayout);
  });
  const r = { ページ数: pages.length };
  const v = await b.newPage({ viewport: { width: 900, height: 1300 }, deviceScaleFactor: 1 }); // ページを見るのは別のタブで（アプリの画面を消さない）
  for (let k = 0; k < Math.min(3, pages.length); k++) {
    await v.setContent(`<html><body style="margin:0;background:#888">${pages[k]}</body></html>`);
    const el = await v.$('svg');
    const info = await v.evaluate(() => { const s = document.querySelector('svg'); const R = s.getBoundingClientRect(); const gs = [...s.querySelectorAll(':scope > g')].map((g) => g.getBoundingClientRect()); return { 段: gs.length, 上: Math.round(gs[0].top - R.top), 下のあき: Math.round(R.bottom - gs[gs.length - 1].bottom), 見出し: [...s.querySelectorAll(':scope > text')].map((t) => t.textContent).join(' | ') }; });
    r['p' + (k + 1)] = info;
    await el.screenshot({ path: `${out}/page${k + 1}.png` });
  }
  r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
