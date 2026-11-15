// MuseScore のいいところ（3回目）：オクターブ記号（8va）・グリッサンド・とちゅうの音部記号
const { chromium } = require('playwright');
const SHOT = process.argv[2];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); });
  const r = {};
  await p.evaluate(() => {
    loadSong({ v: 2, title: '8va・gliss・音部記号', bpm: 100, bars: 4, meter: [4, 4], key: 0, tracks: [{ type: 'melody', id: 'm', name: 'ピアノ', inst: 'piano', range: 'all',
      notes: [{ s: 0, p: 84, l: 48 }, { s: 48, p: 88, l: 48 }, { s: 96, p: 91, l: 48 }, { s: 144, p: 96, l: 48 }, { s: 192, p: 60, l: 96, art: ['gliss'] }, { s: 288, p: 72, l: 96 }, { s: 384, p: 48, l: 96 }, { s: 480, p: 43, l: 96 }, { s: 576, p: 50, l: 192 }] }] }, { own: true });
    selectTrack(0); setView('score');
  });
  // 8va：はじめの小節の高い音
  r['8va'] = await p.evaluate(() => {
    const ledgers = () => document.querySelectorAll('#scoreEditView line[stroke-width="1.3"]').length;
    const before = ledgers();
    ui.sc.sel = new Set(['0:84', '144:96']); ui.sc.selByInput = false;
    scOttava(1); renderScoreEditNow();
    const after = ledgers();
    return { 加線: `${before}→${after}`, 記号: [...document.querySelectorAll('#scoreEditView .ott')].map((t) => t.textContent).join(','), data: JSON.stringify(track().ottava), 選択はそのまま: document.querySelectorAll('#scoreEditView .nh[data-p="84"]').length };
  });
  // 8va の中をクリックすると、鳴る高さ（書いてある高さ＋オクターブ）
  r['8vaの中でクリック'] = await p.evaluate(() => {
    const L = document.querySelector('#scoreEditView')._layout; const st = L.systems[0].staves[0]; const B = L.systems[0].bars[0];
    const svg = document.querySelector('#scoreEditView svg'); const rc = svg.getBoundingClientRect(); const k = rc.width / L.width;
    const y = st.top + 4 * 8 - 6 * 4; // 第4線の上のあたり
    const h = Notation.hit(L, B.xs[1], y);
    return h ? h.pitch : null;
  });
  // グリッサンド
  r['グリッサンド'] = await p.evaluate(() => {
    const line = document.querySelectorAll('#scoreEditView .gliss').length;
    const ev = eventList().filter((e) => e.kind === 'note' && e.t >= 192 && e.t < 288).map((e) => e.p).join(' ');
    const xml = Notation.musicXML(scoreOpts(['m'], false));
    const back = MusicXMLImport.parse(xml, 'a.musicxml').tracks[0].notes.find((n) => n.s === 192);
    const ms = MusicXMLImport.parseMscx(MuseScoreExport.mscx(scoreOpts(['m'], true)), 'a.mscx').tracks[0].notes.find((n) => n.s === 192);
    return `線${line} 再生 ${ev} MusicXML ${JSON.stringify(back.art)} MuseScore ${JSON.stringify(ms.art)}`;
  });
  // 3小節目からヘ音記号
  r['音部記号'] = await p.evaluate(() => {
    ui.sc.cursor = 384; ui.sc.sel = new Set();
    scClefChange('bass'); renderScoreEditNow();
    const small = document.querySelectorAll('#scoreEditView .clefchg').length;
    const xml = Notation.musicXML(scoreOpts(['m'], false));
    const ms = MusicXMLImport.parseMscx(MuseScoreExport.mscx(scoreOpts(['m'], true)), 'a.mscx').tracks[0];
    // ヘ音記号の段で、第2線をクリック → B2（47）
    const L = document.querySelector('#scoreEditView')._layout; const st = L.systems[0].staves[0]; const B = L.systems[0].bars.find((x) => x.b === 2);
    const h = Notation.hit(L, B.xs[0] + 2, st.top + 3 * 8);
    return `小さい記号${small} クリック=${h && h.pitch} MusicXML ${/<attributes><clef><sign>F<\/sign>/.test(xml)} MuseScore ${JSON.stringify(ms.clefChg)} 保存 ${JSON.stringify(track().clefChg)}`;
  });
  r['元に戻す'] = await p.evaluate(() => { undo(); return JSON.stringify(track().clefChg || null); });
  await p.evaluate(() => { redo(); renderScoreEditNow(); });
  if (SHOT) { await p.waitForTimeout(200); await (await p.$('#scoreEditView svg')).screenshot({ path: SHOT + '_r3.png' }); }
  r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
