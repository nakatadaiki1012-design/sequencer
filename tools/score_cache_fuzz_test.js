// 大きな曲の楽譜：段ごとの絵のとりおき。でたらめな編集をくり返して、毎回「とりおきを全部すてて作りなおした絵」と同じかをたしかめる
const { chromium } = require('playwright');
(async () => {
  const N = +(process.argv[2] || 60);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 860 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', (d) => d.accept());
  if (process.env.LOG) p.on('console', (m) => { if (m.text().startsWith('#')) console.log(m.text()); });
  await p.goto('http://localhost:8765/?notour');
  await p.waitForTimeout(900);
  const r = await p.evaluate(async ([N, SEED, SMALL]) => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    let seed = SEED; const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    const tracks = [];
    const NT = SMALL ? 5 : 24, NB = SMALL ? 24 : 120;
    for (let k = 0; k < NT; k++) { const notes = []; for (let i = 0; i < NB * 8; i++) if ((i + k) % 5) notes.push({ s: i * 24, p: 58 + ((i * 7 + k * 5) % 16), l: (i + k) % 7 === 0 ? 48 : 24 }); tracks.push({ type: 'melody', name: 'P' + k, inst: ['flute', 'violin', 'cello', 'clarinet'][k % 4], notes }); }
    tracks.push({ type: 'drum', grid: { kick: { 0: 2, 96: 1 } } });
    loadSong({ v: 2, title: 'fuzz', bpm: 120, bars: NB, tracks }, { own: true });
    setView('score'); renderScoreEditNow();
    const box = document.querySelector('#scoreEditView');
    const bad = [];
    let reused = 0, drawn = 0;
    const ops = [
      ['高さ', (tr) => { const n = tr.notes[rnd(tr.notes.length)]; n.p = Math.max(36, Math.min(100, n.p + rnd(15) - 7)); }],
      ['とても高い・低い音', (tr) => { const n = tr.notes[rnd(tr.notes.length)]; n.p = rnd(2) ? 96 + rnd(8) : 30 + rnd(8); }],
      ['長さ', (tr) => { const n = tr.notes[rnd(tr.notes.length)]; n.l = [6, 12, 24, 36, 48, 96, 192, 400][rnd(8)]; }],
      ['足す', (tr) => { tr.notes.push({ s: rnd(NB * 192 / 12) * 12, p: 55 + rnd(30), l: [12, 24, 48][rnd(3)] }); }],
      ['消す', (tr) => { tr.notes.splice(rnd(tr.notes.length), 1 + rnd(3)); }],
      ['記号', (tr) => { const n = tr.notes[rnd(tr.notes.length)]; n.art = [['stac'], ['acc'], ['ferm'], ['tr'], undefined][rnd(5)]; if (!n.art) delete n.art; }],
      ['歌詞', (tr) => { const n = tr.notes[rnd(tr.notes.length)]; if (rnd(2)) n.ly = 'ら'; else delete n.ly; }],
      ['声部2', (tr) => { const n = tr.notes[rnd(tr.notes.length)]; if (rnd(2)) n.v = 2; else delete n.v; }],
      ['色・ぼう・小さく', (tr) => { const n = tr.notes[rnd(tr.notes.length)]; const k = rnd(3); if (k === 0) n.col = 'red'; else if (k === 1) n.sd = rnd(2) ? 1 : -1; else n.sm = true; }],
      ['強弱', (tr) => { tr.dyn = [{ t: rnd(NB - 4) * 192, v: ['p', 'f', 'mf'][rnd(3)] }]; }],
      ['スラー', (tr) => { const a = rnd(NB - 6) * 192; tr.slurs = [{ s: a, e: a + 96 + rnd(600) }]; }],
      ['カーソル', () => { ui.sc.cursor = rnd(NB * 192 / 12) * 12; }],
      ['えらぶ', (tr) => { const s2 = new Set(); for (let i = 0; i < 1 + rnd(3); i++) { const n = tr.notes[rnd(tr.notes.length)]; s2.add(n.s + ':' + n.p); } ui.sc.sel = s2; }],
      ['えらびをやめる', () => { ui.sc.sel = new Set(); }],
      ['トラックをかえる', () => { selectTrack(rnd(NT)); }],
      ['小節を入れる・消す', () => { if (rnd(2)) song.bars = Math.min(NB + 4, song.bars + 1); else song.bars = Math.max(NB - 4, song.bars - 1); }],
      ['調・拍子', () => { if (rnd(2)) song.key = rnd(12); else song.meters = rnd(2) ? { [4 + rnd(NB - 10)]: [3, 4] } : {}; }],
      ['ページ', () => { ui.sc.cursor = barStart(rnd(song.bars)); }],
      ['もどす', () => { undo(); }],
    ];
    const oc = Notation.clearCache;
    for (let i = 0; i < N; i++) {
      const [name, fn] = ops[rnd(ops.length)];
      console.log('#' + i + ' ' + name + ' ' + Math.round(performance.now()));
      const tr = song.tracks[rnd(NT)];
      try {
        if (name === 'カーソル' || name === 'えらぶ' || name === 'えらびをやめる' || name === 'トラックをかえる' || name === 'ページ' || name === 'もどす') fn(track());
        else edit(() => fn(name === '歌詞' || name === '強弱' || name === 'スラー' ? track() : tr), 't');
      } catch (e) { bad.push(i + ':' + name + ' 例外 ' + e.message); continue; }
      renderScoreEditNow();
      const a = box.innerHTML;
      const before = box.querySelectorAll('svg > g.sys').length;
      Notation.clearCache(); box._frame = null; renderScoreEditNow();
      if (a !== box.innerHTML) { bad.push(i + ':' + name); if (bad.length > 8) break; }
    }
    return { 回数: N, 大きな曲として書いている: !!box._layout.window, 段ごとに分けて書いている: box.querySelectorAll('svg > g.sys').length > 0, ちがった回: bad.length ? bad : 'なし' };
  }, [N, +(process.argv[3] || 12345), process.argv[4] === 'small']);
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
