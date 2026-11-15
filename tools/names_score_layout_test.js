// トラック名＝楽器の名前（同じ楽器は 1・2…）／楽譜の画面で、トラック欄をせまく・キャンバスをたたむ
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const out = process.argv[2] || 'tools';
  await p.goto('http://localhost:8765/?notour'); await p.evaluate(() => localStorage.removeItem('otsumiki-layout')); await p.reload(); await p.waitForTimeout(900);
  const r = {};
  const names = () => p.evaluate(() => song.tracks.map((t) => t.name).join(' / '));
  const parts = () => p.evaluate(() => scoreOpts(scoreEditIds(), true).parts.map((x) => x.name).join(' / '));
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const mk = (name, inst, base) => ({ type: 'melody', name, inst, notes: [0, 1, 2, 3].map((i) => ({ s: i * 48, p: base + i * 2, l: 48 })) });
    loadSong({ v: 2, title: 'names', bpm: 100, bars: 2, key: 0, tracks: [mk('メロディ1', 'trumpet', 72), mk('メロディ2', 'trumpet', 67), mk('歌', 'choir', 72), mk('メロディ3', 'horn', 60)] }, { own: true });
    selectTrack(0); setView('score'); });
  await p.waitForTimeout(300);
  r['読みこみ'] = await names();
  r['楽譜のパート'] = await parts();
  // トラックを足す → 楽器をえらぶ前はリコーダー
  await p.evaluate(() => { addTrack('melody'); document.querySelector('#dlgInst').close(); });
  r['足した'] = await names();
  // 足したトラックをトランペットに → トランペット3
  await p.evaluate(() => edit(() => { song.tracks[4].inst = 'trumpet'; }, '楽器'));
  r['トランペットに'] = await names();
  // 1つ目のトランペットをホルンに → 番号がつめられる
  await p.evaluate(() => edit(() => { song.tracks[0].inst = 'horn'; }, '楽器'));
  r['1つ目をホルンに'] = await names();
  // 自分でつけた名前はそのまま・空にすると楽器名へ
  p.once('dialog', (d) => d.accept('ソロ'));
  await p.evaluate(() => { document.querySelectorAll('#trackList .track')[1].querySelector('[data-a="rename"]').click(); });
  await p.waitForTimeout(150);
  r['名前を「ソロ」に'] = await names();
  p.once('dialog', (d) => d.accept(''));
  await p.evaluate(() => { document.querySelectorAll('#trackList .track')[1].querySelector('[data-a="rename"]').click(); });
  await p.waitForTimeout(150);
  r['名前を空に'] = await names();
  // 並べかえると番号も上から
  await p.evaluate(() => moveTrackTo(4, 0));
  r['並べかえ'] = await names();
  // オーケストラのひな形：バイオリンⅠ・Ⅱ はそのまま
  r['バイオリンⅠⅡ'] = await p.evaluate(() => { loadSong({ v: 2, title: 'o', bars: 1, tracks: [{ type: 'melody', name: 'バイオリンⅠ', inst: 'violin', notes: [] }, { type: 'melody', name: 'バイオリンⅡ', inst: 'violin', notes: [] }, { type: 'melody', name: 'Trumpet in B♭', inst: 'trumpet', notes: [] }] }, { own: true }); return song.tracks.map((t) => t.name).join(' / '); });
  // 楽譜の画面：トラック欄をせまく・キャンバスをたたむ
  await p.evaluate(() => { loadSong({ v: 2, title: 'wide', bpm: 100, bars: 8, key: 0, tracks: [{ type: 'melody', name: '', inst: 'trumpet', notes: [{ s: 0, p: 72, l: 96 }] }, { type: 'melody', name: '', inst: 'trumpet', notes: [{ s: 0, p: 67, l: 96 }] }, { type: 'chord', chords: [{ r: 0, q: 'M' }] }] }, { own: true }); setView('score'); });
  await p.waitForTimeout(300);
  const sv0 = await p.evaluate(() => { const r = document.querySelector('#scoreEditView').getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); });
  const st = await (await p.$('#splitTracks')).boundingBox();
  await p.mouse.move(st.x + 3, st.y + 300); await p.mouse.down(); await p.mouse.move(st.x - 230, st.y + 300, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(150);
  r['トラック欄をせまく'] = await p.evaluate(() => { const s = document.querySelector('.main > .tracks'); return Math.round(s.getBoundingClientRect().width) + ' narrow=' + s.classList.contains('narrow'); });
  const so = await (await p.$('#splitOv')).boundingBox();
  await p.mouse.move(so.x + 400, so.y + 3); await p.mouse.down(); await p.mouse.move(so.x + 400, so.y - 200, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(250);
  r['キャンバスをたたむ'] = await p.evaluate(() => document.querySelector('.canvas-area').classList.contains('folded') + ' ' + Math.round(document.querySelector('.canvas-area').getBoundingClientRect().height));
  const sv1 = await p.evaluate(() => { const r = document.querySelector('#scoreEditView').getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); });
  r['楽譜の広さ'] = sv0 + ' → ' + sv1;
  await p.screenshot({ path: out + '/score_wide.png' });
  // せまいトラック欄でもドラッグで並べかえ
  const cards = await p.$$('#trackList .track'); const c1 = await cards[1].boundingBox(); const c0 = await cards[0].boundingBox();
  await p.mouse.move(c1.x + c1.width / 2, c1.y + c1.height / 2); await p.mouse.down(); await p.mouse.move(c0.x + c0.width / 2, c0.y + 3, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(200);
  r['せまい欄で並べかえ'] = await p.evaluate(() => song.tracks.map((t) => t.name).join(' / '));
  // ボタンでひらく
  await p.click('#ovFold'); await p.waitForTimeout(200);
  r['ひらく'] = await p.evaluate(() => document.querySelector('.canvas-area').classList.contains('folded'));
  r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
