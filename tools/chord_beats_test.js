// コードを拍ごとに入れる・位置ラベル（○●）
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 860 }, deviceScaleFactor: 2 }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const out = process.argv[2] || 'tools';
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const N = [[0,60,48],[48,62,24],[72,64,12],[84,65,12],[96,67,48],[144,64,48],[192,72,192],[384,67,96],[480,65,96]].map(([s,p,l]) => ({ s, p, l }));
    loadSong({ v: 2, title: 'beats', bpm: 100, bars: 4, key: 0, tracks: [{ type: 'melody', id: 'a', name: 'うた', inst: 'piano', notes: N }] }, { own: true });
    selectTrack(0); setView('score'); ui.sc.input = false; ui.sc.cursor = 0; ui.chdPer = 1; renderScoreEditNow(); document.activeElement.blur(); });
  await p.waitForTimeout(200);
  const r = {};
  const chords = () => p.evaluate(() => { const ct = song.tracks.find((t) => t.type === 'chord'); return ct ? ct.chords.map((c) => (c ? chordLabel(c) : '·')).join(' | ') : 'なし'; });
  await p.keyboard.press('Control+k'); await p.waitForTimeout(150);
  await p.click('#chdEd [data-per="b"]'); await p.waitForTimeout(60);
  // 1小節目：拍ごとに C Am F G7
  for (const i of [0, 5, 3, 4]) { await p.click(`#chdEd .chordbtn[data-i="${i}"]`); await p.waitForTimeout(60); }
  r['拍ごと4つ'] = await chords();
  r['つぎは'] = await p.evaluate(() => JSON.stringify({ bar: ui.chd.bar, o: ui.chd.o }));
  // 2小節目：1拍目 C、3拍目だけ G（2拍目はつづき）
  await p.click('#chdEd .chordbtn[data-i="0"]'); await p.click('#chdEd .chdpos [data-o="96"]'); await p.click('#chdEd .chordbtn[data-i="4"]'); await p.waitForTimeout(60);
  r['1拍目と3拍目'] = await chords();
  // 3小節目：1つ
  await p.click('#chdEd [data-nav="1"]'); await p.click('#chdEd [data-per="1"]'); await p.click('#chdEd .chordbtn[data-i="3"]'); await p.waitForTimeout(60);
  r['まるごと'] = await chords();
  // 4小節目：前の小節のつづきから、2拍目だけ Dm
  await p.click('#chdEd [data-per="b"]'); await p.click('#chdEd .chdpos [data-o="48"]'); await p.click('#chdEd .chordbtn[data-i="1"]'); await p.waitForTimeout(60);
  r['頭はつづき'] = await chords();
  await p.evaluate(() => { ui.chd.bar = 1; ui.chd.o = 0; chordPickShow(); }); await p.waitForTimeout(150);
  await (await p.$('#chdEd')).screenshot({ path: out + '/chord_beats_panel.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  // 楽譜のコード名（3拍目の G）をおす → そこが開く
  r["楽譜のコード名"] = await p.evaluate(() => [...document.querySelectorAll("#scoreEditView .chd")].map((e) => e.dataset.b + ":" + (e.dataset.o || "-") + "=" + e.textContent).join(" "));
  await p.click(`#scoreEditView .chd[data-b="1"][data-o="96"]`); await p.waitForTimeout(100);
  r['コード名クリック'] = await p.evaluate(() => JSON.stringify({ bar: ui.chd.bar, o: ui.chd.o, per: ui.chd.per }));
  await p.keyboard.press('Escape');
  // 再生される伴奏（コードの区切り）
  r['鳴るコード(1小節目)'] = await p.evaluate(() => { const ct = song.tracks.find((t) => t.type === 'chord'); return chordEvents(ct).filter((e) => (e.t ?? e.s) < 192).map((e) => Math.floor((e.t ?? e.s) / 48) + ':' + (e.p ?? e.m ?? e.n)).join(' '); });
  // 位置ラベル
  await p.evaluate(() => { ui.sc.cursor = 84; ui.sc.sel = new Set(['84:65']); renderScoreEditNow(); }); await p.waitForTimeout(150);
  r['ラベル16分'] = await p.evaluate(() => document.querySelector('#scoreEditView .scpos').textContent);
  const el = await p.$('#scoreEditView'); await el.screenshot({ path: out + '/chord_beats_score.png' });
  await p.evaluate(() => { ui.sc.cursor = 96; ui.sc.sel = new Set(['96:67']); renderScoreEditNow(); }); await p.waitForTimeout(150);
  r['ラベル4分'] = await p.evaluate(() => document.querySelector('#scoreEditView .scpos').textContent);
  // 保存して読みこみ直しても同じ・MusicXML に書き出して読みもどす
  r['保存→読みこみ'] = await p.evaluate(() => { const j = JSON.parse(JSON.stringify(song)); loadSong(j, { own: true }); const ct = song.tracks.find((t) => t.type === 'chord'); return ct.chords.map((c) => (c ? chordLabel(c) : '·')).join(' | '); });
  r['MusicXML往復'] = await p.evaluate(() => { const o = scoreOpts(song.tracks.map((t) => t.id), false); o.chords = o.chordObjs; const xml = Notation.musicXML(o); if (!xml) return 'no export fn'; const res = MusicXMLImport.parse(xml, 'x.musicxml'); const ct = (res.tracks || res).find((t) => t.type === 'chord'); return ct ? ct.chords.map((c) => (c ? chordLabel(c) : '·')).join(' | ') : 'コードなし'; });
  r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
