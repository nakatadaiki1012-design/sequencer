// 歌詞を楽譜の上で打つ（MuseScore・Dorico と同じ）
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const ns = [60, 62, 64, 65, 67, 67, 67, 65].map((p, i) => ({ s: i * 48, p, l: 48, v: 1 })); ns.push({ s: 384, p: 64, l: 96 }, { s: 480, p: 62, l: 48 }, { s: 528, p: 60, l: 48 });
    loadSong({ v: 2, title: 'lyr', bpm: 100, bars: 4, key: 0, tracks: [{ type: 'melody', id: 'a', name: 'うた', inst: 'piano', notes: ns }] }, { own: true });
    selectTrack(0); setView('score'); ui.sc.input = false; ui.sc.cursor = 0; document.activeElement.blur(); });
  await p.waitForTimeout(200);
  const ly = () => p.evaluate(() => track().notes.slice().sort((a, b) => a.s - b.s).map((n) => n.ly || '·').join(' '));
  const r = {};
  await p.keyboard.press('l'); await p.waitForTimeout(100);
  r['入力欄が出る'] = await p.evaluate(() => { const b = document.querySelector('#lyrEd'); return !!b && !b.hidden && document.activeElement === b.querySelector('input'); });
  for (const w of ['Hap', '-', 'py', ' ', 'birth', '-', 'day', ' ', 'to', ' ', 'you', ' ', ' ', 'ha', ' ']) { if (w === '-' || w === ' ') await p.keyboard.press(w === ' ' ? 'Space' : 'Minus'); else await p.keyboard.type(w); await p.waitForTimeout(40); }
  r['打ったあと'] = await ly();
  await p.keyboard.press('Shift+Space'); await p.keyboard.press('Shift+Space'); await p.waitForTimeout(50);
  r['Shift+スペースで戻る位置'] = await p.evaluate(() => ui.sc.lyr && ui.sc.lyr.t);
  await p.keyboard.type('ら'); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  r['Enterでおわる'] = await p.evaluate(() => document.querySelector('#lyrEd').hidden) + ' ' + await ly();
  r['ハイフンの線'] = await p.evaluate(() => document.querySelectorAll('#scoreEditView .lyhy').length);
  r['のばし線'] = await p.evaluate(() => [...document.querySelectorAll('#scoreEditView line')].filter((l) => l.getAttribute('stroke-width') === '1.1' && !l.classList.contains('lyhy')).length);
  r['画面の歌詞'] = await p.evaluate(() => [...document.querySelectorAll('#scoreEditView .lyr')].map((t) => t.textContent).join(' '));
  const x = await p.evaluate(() => Notation.musicXML(scoreOpts(['a'], false)));
  r['MusicXML'] = [...x.matchAll(/<syllabic>(\w+)<\/syllabic><text>([^<]*)/g)].map((m) => m[2] + ':' + m[1]).join(' ');
  r['読みこみなおし'] = await p.evaluate((xml) => { const s = MusicXMLImport.parse(xml); return s.tracks[0].notes.filter((n) => n.ly).map((n) => n.ly).join(' '); }, x);
  const m = await p.evaluate(() => MuseScoreExport.mscx(scoreOpts(['a'], false)));
  r['MuseScore'] = [...m.matchAll(/<Lyrics>(?:<syllabic>(\w+)<\/syllabic>)?<text>([^<]*)/g)].map((q) => q[2] + ':' + (q[1] || 'single')).join(' ');
  r['MuseScore読みこみ'] = await p.evaluate((t) => { const s = MusicXMLImport.parseMscx(t); return s.tracks[0].notes.filter((n) => n.ly).map((n) => n.ly).join(' '); }, m);
  r['まとめ入力 Hap-py'] = await p.evaluate(() => Notation.splitLyrics('Hap-py birth-day さいた').join('|'));
  // 歌詞がまだない曲でも、入力欄が歌詞の高さに出る／ボタンで次へ
  await p.evaluate(() => { for (const n of track().notes) delete n.ly; renderScoreEditNow(); ui.sc.sel = new Set(['96:64']); ui.sc.selByInput = false; });
  await p.keyboard.press('l'); await p.waitForTimeout(100);
  r['位置'] = await p.evaluate(() => { const b = document.querySelector('#lyrEd').getBoundingClientRect(); const h = document.querySelector('#scoreEditView .nh[data-s="96"]').getBoundingClientRect(); return `欄の上 ${Math.round(b.top - h.bottom)}px下・横ずれ ${Math.round((b.left + b.right) / 2 - (h.left + h.right) / 2)}`; });
  await p.keyboard.type('み'); await p.click('#lyrEd [data-d="1"]'); await p.keyboard.type('ふぁ'); await p.click('#lyrEd [data-d="0"]'); await p.waitForTimeout(100);
  r['ボタン'] = await ly();
  await p.screenshot({ path: 'tools/lyric_input.png', clip: { x: 0, y: 150, width: 900, height: 330 } });
  await p.keyboard.press('Control+z'); await p.waitForTimeout(50);
  r['元にもどす'] = await ly();
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1)); await b.close();
})();
