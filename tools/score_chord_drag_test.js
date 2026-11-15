// コード入力パネル・音符の上下ドラッグ・拍の中の位置・連桁の中の休符
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const N = [60, 64, 67, 65, 64, 62, 60, 62].map((p, i) => ({ s: i * 48, p, l: 48 }));
    N.push({ s: 384, p: 79, l: 12 }, { s: 408, p: 81, l: 12 }, { s: 420, p: 83, l: 12 });
    loadSong({ v: 2, title: 'chd', bpm: 100, bars: 4, key: 0, tracks: [{ type: 'melody', id: 'a', name: 'うた', inst: 'piano', notes: N }] }, { own: true });
    selectTrack(0); setView('score'); ui.sc.input = false; ui.sc.cursor = 0; document.activeElement.blur(); });
  await p.waitForTimeout(300);
  const r = {};
  const chords = () => p.evaluate(() => { const ct = song.tracks.find((t) => t.type === 'chord'); return ct ? ct.chords.map((c) => (c ? chordLabel(c) : '·')).join(' ') : 'なし'; });
  const head = () => p.evaluate(() => document.querySelector('#chdEd .chdhead b').textContent);
  // Ctrl+K → パネル。ボタンで C → 次の小節へ → 打って Am7 → スペース → 前半/後半
  await p.keyboard.press('Control+k'); await p.waitForTimeout(150);
  r['パネル'] = await p.evaluate(() => !document.querySelector('#chdEd').hidden) + ' ' + await head();
  await p.click('#chdEd .chordbtn[data-i="0"]'); await p.waitForTimeout(100);
  r['ボタンでC→次へ'] = (await chords()) + ' / ' + await head();
  await p.click('#chdEd input'); await p.keyboard.type('Am7'); await p.keyboard.press('Space'); await p.waitForTimeout(100);
  r['打ってAm7'] = await chords();
  await p.click('#chdEd [data-h="1"]'); await p.click('#chdEd .chordbtn[data-i="1"]'); await p.waitForTimeout(80);
  await p.click('#chdEd .chordbtn[data-i="3"]'); await p.waitForTimeout(80);
  r['前半F・後半G7'] = await chords();
  await p.click('#chdEd .chdmore summary'); await p.click('#chdEd [data-r="10"]'); await p.click('#chdEd [data-q="M7"]'); await p.waitForTimeout(80);
  r['根音B♭→M7'] = await chords();
  await p.screenshot({ path: 'tools/score_chord.png', clip: { x: 0, y: 120, width: 1000, height: 420 } });
  await p.keyboard.press('Escape'); await p.waitForTimeout(80);
  r['Escでとじる'] = await p.evaluate(() => document.querySelector('#chdEd').hidden);
  // 楽譜のコードネームをクリック → その小節
  await p.evaluate(() => renderScoreEditNow());
  await p.click('#scoreEditView .chd[data-b="1"]'); await p.waitForTimeout(100);
  r['コード名クリック'] = await head();
  await p.keyboard.press('Escape');
  // 上下ドラッグ：ド（0）を2つ上へ → ミ
  await p.evaluate(() => renderScoreEditNow());
  const h = await p.$('#scoreEditView .nh[data-s="0"]'); const bb = await h.boundingBox();
  const step = await p.evaluate(() => { const v = document.querySelector('#scoreEditView'); const svg = v.querySelector('svg'); return 4 * svg.getBoundingClientRect().height / v._layout.height; });
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2 - step * 2, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(100);
  r['ドラッグで2つ上'] = await p.evaluate(() => track().notes.find((n) => n.s === 0).p);
  await p.keyboard.press('Control+z'); await p.waitForTimeout(80);
  r['元にもどす'] = await p.evaluate(() => track().notes.find((n) => n.s === 0).p);
  // 拍の中の位置
  r['位置の表示'] = await p.evaluate(() => [0, 24, 36, 16, 60, 198].map((t) => beatPos(t).text).join(' / '));
  await p.evaluate(() => { ui.sc.cursor = 396; renderScoreEditNow(); });
  r['ステータス'] = await p.evaluate(() => document.querySelector('#scStatus').textContent);
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1)); await b.close();
})();
