// クレッシェンドの長さをえらぶ・マス目の強弱レーン（見せる・おして入れる・はしをドラッグ）
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const out = process.argv[2] || 'tools';
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const N = []; for (let i = 0; i < 16; i++) N.push({ s: i * 48, p: 60 + [0, 2, 4, 5, 7, 5, 4, 2][i % 8], l: 48 });
    loadSong({ v: 2, title: '強弱', bpm: 100, bars: 4, key: 0, tracks: [{ type: 'melody', inst: 'piano', notes: N, dyn: [{ t: 0, v: 'p' }], hairpins: [{ s: 48, e: 192, type: 'cresc' }] }] }, { own: true });
    selectTrack(0); setView('score'); ui.sc.input = false; ui.sc.cursor = 192; ui.sc.sel = new Set(['192:67']); renderScoreEditNow(); document.activeElement.blur(); });
  await p.waitForTimeout(300);
  const r = {};
  const hps = () => p.evaluate(() => JSON.stringify(track().hairpins.map((h) => [h.type, h.s, h.e])));
  // 楽譜：音符1つで cresc → パネル → 長さ「2小節」
  await p.keyboard.press('Shift+Comma'); await p.waitForTimeout(250);
  r['1つの音から cresc'] = (await hps()) + ' パネル=' + await p.evaluate(() => !document.querySelector('#dynPop').hidden);
  await p.screenshot({ path: out + '/hp_pop.png', clip: { x: 0, y: 200, width: 1366, height: 450 } });
  await p.click('#dynPop [data-len="384"]'); await p.waitForTimeout(150);
  r['長さ2小節'] = await hps();
  await p.click('#dynPop [data-nudge="-1"]'); await p.waitForTimeout(150);
  r['1拍みじかく'] = (await hps()) + ' ' + await p.evaluate(() => document.querySelector('#dynPop .dplen b').textContent);
  await p.keyboard.press('Escape'); await p.evaluate(() => dynPopClose());
  // 楽譜のクレッシェンドをおす → パネル
  await p.evaluate(() => renderScoreEditNow()); await p.waitForTimeout(150);
  await p.click('#scoreEditView .hp[data-i="0"]'); await p.waitForTimeout(150);
  r['楽譜のクレッシェンドをおす'] = await p.evaluate(() => document.querySelector('#dynPop .dplen b')?.textContent || 'パネルなし');
  await p.evaluate(() => dynPopClose());
  // マス目：強弱のレーン
  await p.evaluate(() => setView('grid')); await p.waitForTimeout(300);
  r['レーン'] = await p.evaluate(() => { const l = document.querySelector('#dynLane'); return (l && !l.hidden) + ' 強弱=' + [...l.querySelectorAll('.dldyn')].map((x) => x.textContent).join(',') + ' クレッシェンド=' + l.querySelectorAll('.dlhp').length; });
  await p.screenshot({ path: out + '/dyn_lane.png', clip: { x: 280, y: 560, width: 1086, height: 340 } });
  // レーンの何もない所（3小節目の頭あたり）をおす → f を入れる
  const lane = await (await p.$('#dynLane')).boundingBox();
  const x3 = await p.evaluate(() => { const sc = document.querySelector('#scroller'); return 624 * ppt() - sc.scrollLeft; });
  await p.mouse.click(lane.x + x3 + 2, lane.y + 15); await p.waitForTimeout(150);
  await p.click('#dynPop [data-v="f"]'); await p.waitForTimeout(200);
  r['レーンで f'] = await p.evaluate(() => JSON.stringify(track().dyn));
  // クレッシェンドの右はしをドラッグして長さを変える
  const end = await (await p.$('#dynLane .dlhp[data-i="0"] .dlend')).boundingBox();
  const before = await hps();
  await p.mouse.move(end.x + end.width / 2, end.y + 10); await p.mouse.down();
  await p.mouse.move(end.x + end.width / 2 + 48 * (await p.evaluate(() => ppt())), end.y + 10, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(200);
  r['はしをドラッグ'] = before + ' → ' + (await hps());
  await p.keyboard.press('Control+z'); await p.waitForTimeout(150);
  r['元にもどす'] = await hps();
  // 再生の音の大きさにも反映（だんだん大きく）
  r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
