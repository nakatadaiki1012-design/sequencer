// 入力のしやすさ（MuseScore・Finale・Dorico のショートカット）
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    loadSong({ v: 2, title: 'keys', bpm: 100, bars: 4, key: 0, tracks: [{ type: 'melody', id: 'a', name: '上', inst: 'piano', notes: [] }, { type: 'melody', id: 'b', name: '下', inst: 'piano', notes: [] }] }, { own: true });
    selectTrack(0); setView('score'); ui.sc.cursor = 0; ui.sc.dur = 48; document.activeElement.blur(); });
  const key = async (s) => { for (const k of s.split(' ')) { await p.keyboard.press(k); await p.waitForTimeout(15); } };
  const notes = () => p.evaluate(() => track().notes.slice().sort((a, b) => a.s - b.s || a.p - b.p).map((n) => `${n.s}:${n.p}:${n.l}${n.enh ? 'e' + n.enh : ''}`).join(' '));
  const r = {};
  await key('c e');
  await key('r'); // ミ をくり返す
  r['R くり返し'] = await notes();
  await p.evaluate(() => { ui.sc.sel = new Set(['0:60']); ui.sc.selByInput = false; });
  await key('r'); // えらんだ ド をうしろへ
  r['R えらんだ音'] = await notes();
  // J：♯⇔♭
  await p.evaluate(() => { ui.sc.cursor = 192; ui.sc.lastIns = null; ui.sc.sel = new Set(); });
  await key('c');
  await p.evaluate(() => { edit(() => { track().notes.find((n) => n.s === 192).p = 61; }, 't'); ui.sc.sel = new Set(['192:61']); ui.sc.selByInput = false; renderScoreEditNow(); });
  const spellAt = () => p.evaluate(() => { const x = Notation.musicXML(scoreOpts(['a'], false)); const m = x.match(/<note><pitch><step>([A-G])<\/step><alter>(-?1)<\/alter>/); return m ? m[1] + (m[2] === '1' ? '♯' : '♭') : '?'; });
  const before = await spellAt();
  await key('j');
  r['J'] = `${before} → ${await spellAt()}`;
  // Alt+Shift+3：3度下
  await p.evaluate(() => { ui.sc.sel = new Set(['48:60']); ui.sc.selByInput = false; });
  await key('Alt+Shift+Digit3');
  r['Alt+Shift+3（3度下）'] = await p.evaluate(() => track().notes.filter((n) => n.s === 48).map((n) => n.p).sort().join(','));
  // Alt+↑↓：和音の中
  await key('Alt+ArrowUp');
  r['Alt+↑（和音の上の音）'] = await p.evaluate(() => [...ui.sc.sel].join());
  // Ctrl+Alt+↓：下のパートへ
  await key('Control+Alt+ArrowDown');
  r['Ctrl+Alt+↓'] = await p.evaluate(() => track().name);
  await key('Control+Alt+ArrowUp');
  // Ctrl+→・Home・End
  await p.evaluate(() => { ui.sc.cursor = 0; ui.sc.sel = new Set(); });
  await key('Control+ArrowRight Control+ArrowRight');
  r['Ctrl+→ 2回'] = await p.evaluate(() => ui.sc.cursor);
  await key('Control+End');
  r['Ctrl+End'] = await p.evaluate(() => ui.sc.cursor);
  await key('Control+Home');
  r['Ctrl+Home'] = await p.evaluate(() => ui.sc.cursor);
  // Ctrl+B
  await key('Control+b');
  r['Ctrl+B'] = await p.evaluate(() => song.bars);
  // 高さだけ入れなおす
  await p.evaluate(() => { ui.sc.cursor = 0; ui.sc.sel = new Set(); });
  await key('Control+Shift+I g a b');
  r['高さだけ入れなおす'] = await notes();
  await key('Control+Shift+I');
  // 鍵盤（MIDI）で入力・和音
  r['鍵盤で入力'] = await p.evaluate(async () => {
    ui.sc.cursor = 576; ui.sc.lastIns = null;
    noteOn(72); noteOn(76); // いっしょ＝和音
    await new Promise((res) => setTimeout(res, 150));
    noteOn(79);
    return track().notes.filter((n) => n.s >= 576).map((n) => `${n.s}:${n.p}`).join(' ');
  });
  // Esc で選択モード、Enter で入力モード
  await p.evaluate(() => { ui.sc.sel = new Set(); });
  await key('Escape');
  const m1 = await p.evaluate(() => ui.sc.input);
  await key('Enter');
  r['Esc・Enter'] = `${m1} → ${await p.evaluate(() => ui.sc.input)}`;
  // MuseScore 式の数字キー
  await p.evaluate(() => { localStorage.setItem('otsumiki-durkeys', 'musescore'); ui.sc.sel = new Set(); });
  await key('5');
  const d5 = await p.evaluate(() => ui.sc.dur);
  await key('7');
  r['MuseScore式 5・7'] = `${d5}・${await p.evaluate(() => ui.sc.dur)}`;
  await p.evaluate(() => localStorage.removeItem('otsumiki-durkeys'));
  r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
