// 段組み：1段の小節数・詰まり具合・段の幅・改行・横に1列／楽譜を四角でかこんでえらぶ
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const out = process.argv[2] || 'tools';
  await p.goto('http://localhost:8765/?notour'); await p.evaluate(() => localStorage.removeItem('otsumiki-layout')); await p.reload(); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const N = []; for (let i = 0; i < 16 * 4; i++) N.push({ s: i * 48, p: 60 + [0, 2, 4, 5, 7, 9, 11, 12][i % 8], l: 48 });
    const V = N.map((n) => ({ ...n, p: n.p - 12 }));
    loadSong({ v: 2, title: '段組み', bpm: 100, bars: 16, key: 0, tracks: [{ type: 'melody', inst: 'flute', notes: N }, { type: 'melody', inst: 'cello', notes: V }] }, { own: true });
    selectTrack(0); setView('score'); ui.sc.input = false; ui.sc.cursor = 0; renderScoreEditNow(); });
  await p.waitForTimeout(300);
  const r = {};
  const sys = () => p.evaluate(() => document.querySelector('#scoreEditView')._layout.systems.map((s) => s.bars.length).join(','));
  r['はじめ（自動）'] = await sys();
  await p.click('#scLayoutB'); await p.waitForTimeout(150);
  await p.click('#layPop [data-per="4"]'); await p.waitForTimeout(200);
  r['1段4小節'] = await sys();
  await p.click('#layPop [data-per="0"]'); await p.waitForTimeout(150);
  await p.evaluate(() => { const s = document.querySelector('#lpSpc'); s.value = 0.6; s.dispatchEvent(new Event('input')); s.dispatchEvent(new Event('change')); }); await p.waitForTimeout(250);
  r['つめる'] = await sys();
  await p.evaluate(() => { const s = document.querySelector('#lpSpc'); s.value = 1.8; s.dispatchEvent(new Event('input')); s.dispatchEvent(new Event('change')); }); await p.waitForTimeout(250);
  r['ゆったり'] = await sys();
  await p.click('#layPop [data-spc="1"]'); await p.waitForTimeout(150);
  // 段の幅をせまく
  await p.evaluate(() => { const s = document.querySelector('#lpW'); s.value = 600; s.dispatchEvent(new Event('input')); s.dispatchEvent(new Event('change')); }); await p.waitForTimeout(250);
  r['段の幅600'] = (await sys()) + ' svgはば=' + await p.evaluate(() => Math.round(document.querySelector('#scoreEditView svg').getBoundingClientRect().width));
  await p.click('#layPop [data-w="fit"]'); await p.waitForTimeout(200);
  // 6小節目の前で改行
  await p.evaluate(() => { ui.sc.cursor = barStart(5); renderScoreEditNow(); document.querySelector('#layPop')._render(); }); await p.waitForTimeout(150);
  await p.click('#layPop [data-brk="1"]'); await p.waitForTimeout(250);
  r['6小節の前で改行'] = (await sys()) + ' 段の頭=' + await p.evaluate(() => document.querySelector('#scoreEditView')._layout.systems.map((s) => s.bars[0].b + 1).join(','));
  // 横に1列
  await p.click('#layPop [data-flow="h"]'); await p.waitForTimeout(300);
  r['横に1列'] = (await sys()) + ' 横スクロール=' + await p.evaluate(() => { const v = document.querySelector('#scoreEditView'); return v.scrollWidth > v.clientWidth + 50; });
  await p.evaluate(() => { ui.sc.cursor = barStart(14); ui.sc.scrollTo = true; renderScoreEditNow(); }); await p.waitForTimeout(200);
  r['カーソルの所まで横にスクロール'] = await p.evaluate(() => Math.round(document.querySelector('#scoreEditView').scrollLeft) > 300);
  await p.screenshot({ path: out + '/flow_h.png', clip: { x: 280, y: 80, width: 1086, height: 520 } });
  await p.click('#layPop [data-flow="wrap"]'); await p.waitForTimeout(250);
  await p.click('#layPop [data-x="close"]');
  // 四角でかこんでえらぶ：1段目の 2〜3小節（上のパート）
  await p.evaluate(() => { const v = document.querySelector('#scoreEditView'); v.scrollTop = 0; v.scrollLeft = 0; ui.sc.sel = new Set(); renderScoreEditNow(); }); await p.waitForTimeout(200);
  const box = await p.evaluate(() => {
    const v = document.querySelector('#scoreEditView'); const L = v._layout; const R = v.querySelector('svg').getBoundingClientRect(); const k = R.width / L.width;
    const s0 = L.systems[0]; const st = s0.staves[0]; const B1 = s0.bars[1]; const B2 = s0.bars[2];
    return { x0: R.left + (B1.x0 + 3) * k, y0: R.top + (st.top - 30) * k, x1: R.left + (B2.x1 - 3) * k, y1: R.top + (st.top + 60) * k };
  });
  await p.mouse.move(box.x0, box.y0); await p.mouse.down(); await p.mouse.move(box.x1, box.y1, { steps: 8 });
  await p.screenshot({ path: out + '/band.png', clip: { x: 280, y: 280, width: 1086, height: 360 } });
  await p.mouse.up(); await p.waitForTimeout(250);
  r['四角でえらぶ'] = await p.evaluate(() => track().name + ' ' + ui.sc.sel.size + '個 ' + [...ui.sc.sel].map((k) => +k.split(':')[0] / 48).sort((a, b) => a - b).join(','));
  // えらんだ音にスラー
  await p.keyboard.press('s'); await p.waitForTimeout(150);
  r['そのままスラー'] = await p.evaluate(() => JSON.stringify(track().slurs));
  // 印刷の楽譜にも改行が入る
  r['印刷の楽譜も'] = await p.evaluate(() => { const o = scoreOpts(scoreEditIds(), true); o.width = 780; Notation.render(o); return Notation.lastLayout.systems.map((s) => s.bars[0].b + 1).join(','); });
  r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
