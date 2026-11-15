// 3連符の入力（Ctrl+3：MuseScore・Finale と同じ）と、まとまりの表示・書き出し
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    loadSong({ v: 2, title: 'tup', bpm: 100, bars: 4, key: 0, tracks: [{ type: 'melody', id: 'a', name: 'うた', inst: 'piano', notes: [{ s: 288, p: 67, l: 96 }] }] }, { own: true });
    selectTrack(0); setView('score'); ui.sc.input = true; ui.sc.cursor = 0; ui.sc.dur = 48; document.activeElement.blur(); });
  await p.waitForTimeout(200);
  const key = async (s) => { for (const k of s.split(' ')) { await p.keyboard.press(k); await p.waitForTimeout(30); } };
  const notes = () => p.evaluate(() => track().notes.slice().sort((a, b) => a.s - b.s).map((n) => `${n.s}:${n.l}`).join(' '));
  const threes = () => p.evaluate(() => (document.querySelector('#scoreEditView').innerHTML.match(/M\.488-\.828/g) || []).length);
  const r = {};
  await key('Control+Digit3');
  r['Ctrl+3 のあと'] = await p.evaluate(() => `長さ${ui.sc.dur} 3連${ui.sc.trip}`);
  await key('c d e f');
  r['♩のところに♪3つ→つぎはふつうの♩'] = await notes();
  r['もとの長さ'] = await p.evaluate(() => `長さ${ui.sc.dur} 3連${ui.sc.trip}`);
  // えらんだ2分音符（288）を3連符に
  await p.evaluate(() => { ui.sc.input = false; ui.sc.sel = new Set(['288:67']); ui.sc.selByInput = false; renderScoreEditNow(); });
  await key('Control+Digit3');
  r['えらんだ2分音符→'] = (await notes()) + ' / カーソル' + await p.evaluate(() => ui.sc.cursor);
  await key('a b');
  r['のこり2つを入れる'] = await notes();
  r['「3」の数'] = await threes();
  // ハネるリズム（♩♪の3連）、休符からはじまる3連
  await p.evaluate(() => { const t = track(); t.notes = [{ s: 0, p: 60, l: 32 }, { s: 32, p: 62, l: 16 }, { s: 48, p: 64, l: 32 }, { s: 80, p: 65, l: 16 }, { s: 112, p: 67, l: 16 }, { s: 128, p: 69, l: 16 }, { s: 144, p: 71, l: 48 }]; renderScoreEditNow(); });
  r['♩♪×2＋休符はじまり：「3」の数'] = await threes();
  r['休符はじまりのかぎ'] = await p.evaluate(() => document.querySelectorAll('#scoreEditView path[stroke-width="0.9"]').length);
  const x = await p.evaluate(() => Notation.musicXML(scoreOpts(['a'], false)));
  r['MusicXML かぎ'] = `start ${(x.match(/tuplet type="start"/g) || []).length} stop ${(x.match(/tuplet type="stop"/g) || []).length}`;
  r['MusicXML 読みこみ'] = await p.evaluate((xml) => MusicXMLImport.parse(xml).tracks[0].notes.map((n) => `${n.s}:${n.l}`).join(' '), x);
  const m = await p.evaluate(() => MuseScoreExport.mscx(scoreOpts(['a'], false)));
  r['MuseScore'] = [...m.matchAll(/<baseNote>(\w+)<\/baseNote>/g)].map((q) => q[1]).join(',') + ` / おわり${(m.match(/<endTuplet\/>/g) || []).length}`;
  r['MuseScore 読みこみ'] = await p.evaluate((t) => MusicXMLImport.parseMscx(t).tracks[0].notes.map((n) => `${n.s}:${n.l}`).join(' '), m);
  const svg = await p.$('#scoreEditView svg'); const bb = await svg.boundingBox();
  await p.screenshot({ path: 'tools/tuplet_input.png', clip: { x: bb.x, y: bb.y + 40, width: Math.min(900, bb.width), height: 150 } });
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1)); await b.close();
})();
