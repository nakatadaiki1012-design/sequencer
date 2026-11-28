// クレッシェンドの長さ調整：長い曲の後ろのほう（楽譜の画面で、とちゅうのページ）のクレッシェンドを押しても、その記号が選ばれる
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  const out = await p.evaluate(async () => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const BARS = 400;
    const notes = []; for (let b = 0; b < BARS; b++) notes.push({ s: b * 192, p: 72, l: 192 });
    // 多くのクレッシェンド（前のページにもたくさん）
    const hairpins = []; for (let b = 0; b < BARS; b += 5) hairpins.push({ s: b * 192, e: b * 192 + 96, type: b % 10 ? 'dim' : 'cresc' });
    loadSong({ v: 2, title: 't', bpm: 120, bars: BARS, key: 0, tracks: Array.from({ length: 12 }, (_, i) => ({ type: 'melody', name: 'P' + i, inst: 'flute', notes, hairpins })) }, { own: true });
    setView('score');
    await new Promise((r) => setTimeout(r, 600));
    ui.sc.cursor = 385 * 192; renderScoreEditNow();
    await new Promise((r) => setTimeout(r, 600));
    const rects = [...document.querySelectorAll('#scoreEditView .hp')];
    const target = rects.find((r) => +r.dataset.s === 385 * 192) || rects[rects.length - 1];
    const o = { 'ページのはじめ': ui.sc.win, 'クレッシェンドの数（画面）': rects.length, 'ねらい': target && target.dataset.s };
    const r = target.getBoundingClientRect();
    target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 4, clientY: r.top + 4, pointerId: 1, isPrimary: true }));
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + 4, clientY: r.top + 4 }));
    await new Promise((r2) => setTimeout(r2, 300));
    const pop = document.querySelector('#dynPop:not([hidden])');
    o['パネルの見出し'] = pop ? pop.textContent.replace(/\s+/g, ' ').slice(0, 40) : 'なし';
    return o;
  });
  console.log(JSON.stringify({ ...out, errs }, null, 1)); await b.close();
})();
