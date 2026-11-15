// 浄書の自動チェック：いろいろな曲（歌・ピアノ・合唱・移調楽器・英語の歌詞）を描いて、文字どうし・文字と記号の重なり、右はしのはみ出しをさがす
// 使い方：node tools/engrave_audit_test.js [画面のはば] [曲の名前]
// 曲を描いて、画像と「重なり・はみ出し」の自動チェック
const { chromium } = require('playwright');
const SONGS = require('./engrave_songs.js');
const OUT = process.env.OUT || '/tmp/';
const W = +(process.argv[2] || 1366);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(1000);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); });
  const res = {};
  for (const [name, sg] of Object.entries(SONGS)) {
    if (process.argv[3] && process.argv[3] !== name) continue;
    await p.evaluate((sg) => { loadSong(JSON.parse(JSON.stringify(sg)), { own: true }); const S = scoreSettings(); S.accomp = false; if (sg.title.includes('ピアノ')) { /* 右手・左手 */ } if (sg.tracks.some((t) => t.inst === 'trumpet')) { S.trans = S.trans || {}; S.trans[sg.tracks[0].id] = 2; } setView('score'); }, sg);
    await p.waitForTimeout(500);
    const el = await p.$('#scoreEditView svg');
    await el.screenshot({ path: `${OUT}e_${name}_${W}.png` });
    // 重なりのチェック：文字（text）どうし、文字と記号（path）・はみ出し
    res[name] = await p.evaluate(() => {
      const svg = document.querySelector('#scoreEditView svg');
      const vb = svg.viewBox.baseVal;
      const items = [];
      for (const el of svg.querySelectorAll('text, path')) {
        const bb = el.getBBox();
        if (!bb.width || !bb.height) continue;
        let r;
        try { const m = el.getCTM(); const svgm = svg.getCTM(); const inv = svgm.inverse().multiply(m); const pt = (x, y) => { const q = svg.createSVGPoint(); q.x = x; q.y = y; return q.matrixTransform(inv); }; const a = pt(bb.x, bb.y); const z = pt(bb.x + bb.width, bb.y + bb.height); r = { x: Math.min(a.x, z.x), y: Math.min(a.y, z.y), w: Math.abs(z.x - a.x), h: Math.abs(z.y - a.y) }; } catch (e) { continue; }
        const isText = el.tagName === 'text';
        const fill = el.getAttribute('fill');
        const cls = el.getAttribute('class') || '';
        if (!isText && (el.getAttribute('stroke') && el.getAttribute('fill') === 'none')) continue; // 線（スラー以外の線・波）
        items.push({ el, r, isText, label: isText ? 'T:' + el.textContent.slice(0, 12) : 'G' + (cls ? ':' + cls : ''), cls });
      }
      const out = { overflow: [], textText: [], textGlyph: [] };
      for (const it of items) { const r = it.r; if (r.x < vb.x - 1 || r.x + r.w > vb.x + vb.width + 1) out.overflow.push(it.label + '@' + Math.round(r.x) + '+' + Math.round(r.w)); }
      const ov = (a, c, pad = 0.5) => a.x + pad < c.x + c.w && c.x + pad < a.x + a.w && a.y + pad < c.y + c.h && c.y + pad < a.y + a.h;
      const texts = items.filter((i) => i.isText);
      for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) if (ov(texts[i].r, texts[j].r, 1)) out.textText.push(texts[i].label + ' × ' + texts[j].label + ' @' + Math.round(texts[i].r.x) + ',' + Math.round(texts[i].r.y));
      // 文字と記号（符頭・記号）。大きい path（連桁・五線）はのぞく
      const glyphs = items.filter((i) => !i.isText && i.r.w < 40 && i.r.h < 60);
      for (const t of texts) for (const g of glyphs) if (ov(t.r, g.r, 1.5)) out.textGlyph.push(t.label + ' × ' + g.label + ' @' + Math.round(g.r.x) + ',' + Math.round(g.r.y));
      out.textGlyph = [...new Set(out.textGlyph)].slice(0, 25);
      out.textText = out.textText.slice(0, 25);
      return out;
    });
  }
  res.errs = errs; console.log(JSON.stringify(res, null, 1)); await b.close();
})();
