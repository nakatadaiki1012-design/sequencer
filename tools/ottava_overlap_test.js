// 8va・8vb の記号が音符・符尾・コードネームなどに重ならないか（記号と音のはこが重なる数をかぞえる）
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1300, height: 1000 }, deviceScaleFactor: 2 }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const out = process.argv[2] || 'tools';
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  const cases = {
    '高い音に8va': { notes: [84, 86, 88, 89, 91, 93, 95, 96].map((p, i) => ({ s: i * 48, p, l: 48 })), ottava: [{ s: 0, e: 384, k: 1 }] },
    '8分で上下': { notes: [79, 91, 84, 96, 88, 93, 86, 98, 91, 84, 96, 89, 93, 88, 95, 100].map((p, i) => ({ s: i * 24, p, l: 24 })), ottava: [{ s: 0, e: 384, k: 1 }] },
    '低い音に8vb': { notes: [43, 41, 40, 38, 36, 38, 40, 41].map((p, i) => ({ s: i * 48, p, l: 48 })), ottava: [{ s: 0, e: 384, k: -1 }], clef: 'bass' },
    '8va＋コード＋強弱＋スタッカート': { notes: [84, 88, 91, 96, 95, 91, 88, 84].map((p, i) => ({ s: i * 48, p, l: 48, ...(i % 2 ? { art: ['stac'] } : {}) })), ottava: [{ s: 0, e: 384, k: 1 }], dyn: [{ t: 0, v: 'f' }], chords: true },
    '途中から8va': { notes: [72, 74, 76, 77, 91, 93, 95, 96].map((p, i) => ({ s: i * 48, p, l: 48 })), ottava: [{ s: 192, e: 384, k: 1 }] },
  };
  const r = {};
  let k = 0;
  for (const [name, c] of Object.entries(cases)) {
    await p.evaluate((c) => {
      const d = document.querySelector('#dlgStart'); if (d.open) d.close();
      const tr = [{ type: 'melody', id: 'm', inst: c.clef === 'bass' ? 'cello' : 'flute', notes: c.notes, ottava: c.ottava, dyn: c.dyn || [] }];
      if (c.chords) tr.push({ type: 'chord', chords: [{ r: 0, q: 'M' }, { r: 7, q: '7' }] });
      loadSong({ v: 2, title: 'ott', bpm: 100, bars: 2, key: 0, tracks: tr }, { own: true });
      selectTrack(0); setView('score'); ui.sc.cursor = 999; renderScoreEditNow();
    }, c);
    await p.waitForTimeout(250);
    r[name] = await p.evaluate(() => {
      const v = document.querySelector('#scoreEditView');
      v.querySelector('.scpos')?.remove();
      const ott = [...v.querySelectorAll('text.ott')];
      const lines = ott.flatMap((t) => { const out = []; let n = t.nextElementSibling; while (n && n.tagName === 'line' && out.length < 2) { out.push(n); n = n.nextElementSibling; } return out; });
      const marks = [...ott, ...lines].map((e) => { const q = e.getBoundingClientRect(); return { left: q.left - 1, right: q.right + 1, top: q.top - 2, bottom: q.bottom + 2 }; });
      const others = [...v.querySelectorAll('svg *')].filter((e) => !e.classList.contains('ott') && !lines.includes(e) && ['path', 'text', 'ellipse', 'circle', 'line', 'polygon', 'use', 'rect'].includes(e.tagName) && !(e.tagName === 'rect' && (e.getAttribute('fill') === '#fff' || e.classList.contains('cursor'))) && !(e.tagName === 'line' && e.getBoundingClientRect().width > 300));
      const hits = [];
      for (const m of marks) for (const e of others) {
        const q = e.getBoundingClientRect();
        if (!q.width && !q.height) continue;
        const ov = Math.min(m.right, q.right) - Math.max(m.left, q.left) > 1 && Math.min(m.bottom, q.bottom) - Math.max(m.top, q.top) > 1;
        if (ov) hits.push(e.tagName + (e.getAttribute('class') ? '.' + e.getAttribute('class') : '') + (e.textContent ? '「' + e.textContent + '」' : ''));
      }
      return { 記号: ott.map((t) => t.textContent).join(','), 重なり: hits.length ? [...new Set(hits)].slice(0, 6) : 'なし' };
    });
    const el = await p.$('#scoreEditView svg'); await el.screenshot({ path: `${out}/ott_${k++}.png` });
  }
  r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
