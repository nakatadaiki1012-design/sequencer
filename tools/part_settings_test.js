// パートの設定：楽譜のパート名をダブルクリック → 名前・短い名前・音部記号・移調・音域
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    loadSong({ v: 2, title: 't', bpm: 100, bars: 2, key: 0, tracks: [{ type: 'melody', name: 'クラリネット', inst: 'clarinet', notes: [{ s: 0, p: 60, l: 96 }, { s: 96, p: 100, l: 96 }, { s: 192, p: 45, l: 96 }] }, { type: 'melody', name: 'フルート', inst: 'flute', notes: [{ s: 0, p: 72, l: 192 }] }] }, { own: true });
    setView('score'); });
  await p.waitForTimeout(800);
  const el = await p.$('#scoreEditView .pname[data-id]');
  const out = { 'パート名に印': !!el };
  await el.dblclick(); await p.waitForTimeout(300);
  out['設定がひらく'] = await p.evaluate(() => !!document.querySelector('#dlgPart') && document.querySelector('#dlgPart').open);
  out['いまの書き方'] = await p.evaluate(() => document.querySelector('#dlgPart').textContent.match(/いまの書き方：([^\n]*?)\s/)?.[1]);
  await p.fill('#ptName', 'Clarinet 1'); await p.fill('#ptShort', 'Cl. 1');
  await p.selectOption('#ptTrans', '3'); await p.selectOption('#ptClef', 'treble'); await p.selectOption('#ptRng', 'own');
  out['自分で決めるで下限・上限が出る'] = await p.evaluate(() => !document.querySelector('#ptOwn').hidden);
  await p.selectOption('#ptP0', '50'); await p.selectOption('#ptP1', '91'); await p.selectOption('#ptE0', '55'); await p.selectOption('#ptE1', '84');
  await p.click('#ptOk'); await p.waitForTimeout(600);
  const r = await p.evaluate(() => { const t = song.tracks[0]; const S = scoreSettings(); return { name: t.name, short: t.short, rng: t.rng, trans: S.trans[t.id], clef: S.clefs[t.id], eff: partClefTrans(t).trans,
    names: [...document.querySelectorAll('#scoreEditView .pname')].map((e) => e.textContent).join('|'),
    red: [...document.querySelectorAll('#scoreEditView .nh')].filter((e) => e.getAttribute('fill') === '#e03131').map((e) => e.dataset.p).join(','),
    orange: [...document.querySelectorAll('#scoreEditView .nh')].filter((e) => e.getAttribute('fill') === '#d9480f').map((e) => e.dataset.p).join(',') }; });
  Object.assign(out, r);
  await p.evaluate(() => undo()); await p.waitForTimeout(300);
  out['もどすで元に'] = await p.evaluate(() => song.tracks[0].name === 'クラリネット' && song.tracks[0].rng == null && scoreSettings().trans[song.tracks[0].id] == null);
  out['保存しても残る'] = await p.evaluate(() => { redo(); const s = JSON.parse(snapshot()); return JSON.stringify(s.tracks[0].rng); });
  console.log(JSON.stringify({ ...out, errs }, null, 1)); await b.close();
})();
