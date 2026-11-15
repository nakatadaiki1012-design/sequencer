// トラックをドラッグで並べかえ → 楽譜の順番も変わる・区切りをドラッグして大きさを変える
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const out = process.argv[2] || 'tools';
  await p.goto('http://localhost:8765/?notour'); await p.evaluate(() => localStorage.removeItem('otsumiki-layout')); await p.reload(); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const mk = (id, name, inst, base) => ({ type: 'melody', id, name, inst, notes: [0, 1, 2, 3].map((i) => ({ s: i * 48, p: base + i * 2, l: 48 })) });
    loadSong({ v: 2, title: 'order', bpm: 100, bars: 2, key: 0, tracks: [mk('a', 'フルート', 'flute', 76), mk('b', 'バイオリン', 'violin', 67), mk('c', 'チェロ', 'cello', 48)] }, { own: true });
    selectTrack(0); setView('score'); });
  await p.waitForTimeout(300);
  const r = {};
  const names = () => p.evaluate(() => song.tracks.map((t) => t.name).join(' / '));
  const parts = () => p.evaluate(() => scoreOpts(scoreEditIds(), true).parts.map((x) => x.name).join(' / '));
  r['はじめ'] = (await names()) + ' ｜楽譜: ' + (await parts());
  // チェロ（3番目）のつまみを、いちばん上へドラッグ
  const g = await p.$$('#trackList .track .tgrip'); const gb = await g[2].boundingBox(); const top = await (await p.$$('#trackList .track'))[0].boundingBox();
  await p.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await p.mouse.down();
  await p.mouse.move(gb.x + gb.width / 2, top.y + 5, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(200);
  r['チェロを1番へ'] = (await names()) + ' ｜楽譜: ' + (await parts());
  r['えらんでいるトラック'] = await p.evaluate(() => track().name);
  // マウスでカード（あいている所）をつかんで、フルートを下へ
  const cards = await p.$$('#trackList .track'); const cb = await cards[1].boundingBox(); const last = await cards[2].boundingBox();
  await p.mouse.move(cb.x + cb.width - 30, cb.y + cb.height - 8); await p.mouse.down();
  await p.mouse.move(cb.x + cb.width - 30, last.y + last.height - 4, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(200);
  r['フルートを下へ'] = (await names()) + ' ｜楽譜: ' + (await parts());
  await p.keyboard.press('Control+z'); await p.waitForTimeout(150);
  r['元にもどす'] = await names();
  // オーケストラ設定でも自分の順
  await p.evaluate(() => { scoreSettings().orch = true; });
  r['オーケストラ（並べかえる前）'] = await parts();
  await p.evaluate(() => moveTrackTo(2, 0));
  r['オーケストラ（並べかえた後）'] = await parts();
  await p.evaluate(() => { scoreSettings().orch = false; setView('grid'); });
  await p.waitForTimeout(200);
  const W = () => p.evaluate(() => Math.round(document.querySelector('.main > .tracks').getBoundingClientRect().width));
  // 区切り：トラックのはば
  const w0 = await W();
  const st = await (await p.$('#splitTracks')).boundingBox();
  await p.mouse.move(st.x + 3, st.y + 200); await p.mouse.down(); await p.mouse.move(st.x + 123, st.y + 200, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(150);
  r['トラックのはば'] = w0 + ' → ' + (await W());
  // 区切り：キャンバスの高さ
  const H = () => p.evaluate(() => Math.round(document.querySelector('#ovWrap').getBoundingClientRect().height));
  const h0 = await H();
  const so = await (await p.$('#splitOv')).boundingBox();
  await p.mouse.move(so.x + 300, so.y + 3); await p.mouse.down(); await p.mouse.move(so.x + 300, so.y + 63, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(150);
  r['キャンバスの高さ'] = h0 + ' → ' + (await H());
  // 下の楽譜
  await p.evaluate(() => { const c = document.querySelector('#btnScorePanel'); if (!c.checked) c.click(); });
  await p.waitForTimeout(300);
  const S = () => p.evaluate(() => Math.round(document.querySelector('#scorePanel').getBoundingClientRect().height));
  const s0 = await S();
  const ss = await (await p.$('#splitScore')).boundingBox();
  if (ss) { await p.mouse.move(ss.x + 300, ss.y + 3); await p.mouse.down(); await p.mouse.move(ss.x + 300, ss.y - 97, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(150); }
  r['下の楽譜の高さ'] = s0 + ' → ' + (await S());
  await p.screenshot({ path: out + '/layout_resize.png' });
  // 読みこみ直しても大きさをおぼえている
  await p.reload(); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d && d.open) d.close(); });
  r['読みこみ直し後のはば'] = await W();
  // ダブルクリックで元へ
  await p.dblclick('#splitTracks'); await p.waitForTimeout(150);
  r['ダブルクリックで元へ'] = await W();
  r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
