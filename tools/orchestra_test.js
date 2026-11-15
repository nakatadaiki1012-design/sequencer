// オーケストラのフルスコア：テンプレート（13パート）→ 音を入れる → 印刷の画面（仲間のかっこ・短い名前・移調・ハ音記号・1段1ページ）→ MusicXML → 再生
const { chromium } = require('playwright');
const OUT = process.argv[2] || '/tmp/';
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(1000);
// テンプレートから「オーケストラ」
await p.evaluate(() => { if (!document.querySelector('#dlgStart').open) openStart(false); });
await p.selectOption('#tplKey', '2:0'); await p.selectOption('#tplBars', '16');
await p.click('.tpl[data-t="orch"]'); await p.waitForTimeout(600);
const r = {};
r['トラック'] = await p.evaluate(() => song.tracks.map((t) => t.name).join(','));
// 音を入れる（ニ長調のコラール風：和音を各パートに）
r['入力'] = await p.evaluate(() => {
  const prog = [[62, 66, 69], [67, 71, 74], [69, 73, 76], [62, 66, 69], [71, 74, 78], [67, 71, 74], [69, 73, 76], [62, 66, 69]];
  const pick = (ch, oct, k) => ch[k % 3] + oct * 12;
  const spec = { 'フルート': [1, 2], 'オーボエ': [1, 1], 'クラリネット': [0, 2], 'ファゴット': [-1, 0], 'ホルン': [0, 1], 'トランペット': [0, 2], 'トロンボーン': [-1, 1], 'ティンパニ': [-1, 0], 'バイオリンⅠ': [1, 2], 'バイオリンⅡ': [1, 0], 'ビオラ': [0, 1], 'チェロ': [-1, 0], 'コントラバス': [-2, 0] };
  edit(() => {
    for (const t of song.tracks) {
      const [oct, k] = spec[t.name];
      t.notes = [];
      for (let bar = 0; bar < 16; bar++) {
        const ch = prog[bar % 8];
        if (t.name.startsWith('バイオリンⅠ')) { for (let i = 0; i < 4; i++) t.notes.push({ s: bar * 192 + i * 48, p: pick(ch, oct, k + i), l: 48 }); }
        else if (t.name === 'ティンパニ') { if (bar % 4 === 0) t.notes.push({ s: bar * 192, p: [50, 45][(bar / 4) % 2], l: 96, art: ['trem'] }); }
        else if (t.name === 'トランペット' && bar % 2) continue;
        else t.notes.push({ s: bar * 192, p: pick(ch, oct, k), l: bar % 8 === 7 ? 192 : 96 }, { s: bar * 192 + 96, p: pick(ch, oct, k + 1), l: 96 });
      }
      t.notes = t.notes.filter((n, i, a) => !a.some((m, j) => j < i && m.s === n.s));
    }
    song.tracks[0].dyn = [{ t: 0, v: 'mf' }];
  }, 'orch');
  return song.tracks.reduce((a, t) => a + t.notes.length, 0) + '音';
});
r['楽譜の画面'] = await p.evaluate(() => ({ view: ui.view, orch: !!scoreSettings().orch }));
await p.waitForTimeout(500);
await (await p.$('#scoreEditView')).screenshot({ path: OUT + 'o_edit.png' });
// 印刷の画面
const t0 = Date.now();
await p.evaluate(() => openScore()); await p.waitForTimeout(500);
r['印刷の画面までの時間ms'] = Date.now() - t0;
r['ページ'] = await p.evaluate(() => scorePages.length + 'ページ / 段ごとの小節 ' + Notation.lastLayout.systems.map((s) => s.bars.length).join(','));
r['名前'] = await p.evaluate(() => [...new Set([...document.querySelectorAll('#scoreView .pname')].map((t) => t.textContent))].join(' '));
r['かっこ'] = await p.evaluate(() => document.querySelectorAll('#scoreView .bracket').length);
const pg = await p.evaluate(() => scorePages[0]);
const q = await b.newPage({ viewport: { width: 800, height: 1130 } });
await q.setContent(`<body style="margin:0;background:#888"><div style="width:794px;height:1123px;background:#fff">${pg.replace('<svg', '<svg style="width:794px;height:1123px"')}</div></body>`);
await q.screenshot({ path: OUT + 'o_page1.png' });
const pg2 = await p.evaluate(() => scorePages[1] || '');
if (pg2) { await q.setContent(`<body style="margin:0;background:#888"><div style="width:794px;height:1123px;background:#fff">${pg2.replace('<svg', '<svg style="width:794px;height:1123px"')}</div></body>`); await q.screenshot({ path: OUT + 'o_page2.png' }); }
// MusicXML
r['MusicXML'] = await p.evaluate(() => { const o = scoreOpts([...scoreSel], true); const x = Notation.musicXML(o); return ['<sign>C</sign><line>3</line>', '<chromatic>-2</chromatic>', '<chromatic>-7</chromatic>', '<chromatic>-12</chromatic>'].map((k) => k + ':' + x.includes(k)).join(' '); });
// 再生（13パート）
r['再生'] = await p.evaluate(async () => { document.querySelector('#dlgScore').close(); play(); await new Promise((res) => setTimeout(res, 1500)); const on = player.on; stop(); return on; });
r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close(); })();
