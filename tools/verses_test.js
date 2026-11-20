// 歌詞の2番・3番：1番の下の行に書く。楽譜の上で打つ（↑↓で番を切りかえ）、まとめて入れる、書き出し・読みもどし
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 860 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour');
  await p.waitForTimeout(900);
  const r = await p.evaluate(async () => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const out = {};
    const notes = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ s: i * 48, p: 60 + i, l: 48 }));
    loadSong({ v: 2, title: 'v', bpm: 100, bars: 2, tracks: [{ type: 'melody', inst: 'piano', notes }] }, { own: true });
    const tr = track();
    assignLyrics(tr, 'さいたさいたチュー', 1);
    const h1 = Notation.render(scoreOpts([tr.id], true)).match(/height="([\d.]+)"/)[1];
    assignLyrics(tr, 'ならんだならんだ', 2);
    assignLyrics(tr, 'Hap-py birth-day', 3);
    out['2番・3番は音に入る'] = tr.notes.map((n) => n.ly2).join('') + '／' + tr.notes.map((n) => n.ly3 || '').join(' ').trim();
    out['1番はそのまま'] = tr.notes.map((n) => n.ly).join('');
    const svg = Notation.render(scoreOpts([tr.id], true));
    const ys = [...svg.matchAll(/<text[^>]*y="([\d.]+)"[^>]*class="lyr( lyr\d)?"/g)].map((m) => +m[1]);
    const rows = [...new Set(ys)].sort((a, c) => a - c);
    out['歌詞の行は3つ（14ずつ下）'] = rows.length + '行・' + rows.slice(1).map((y, i) => (y - rows[i]).toFixed(0)).join(',');
    out['番号「1.」「2.」「3.」'] = (svg.match(/class="lyrno"/g) || []).length;
    out['段が高くなる（28）'] = (+svg.match(/height="([\d.]+)"/)[1] - +h1).toFixed(0);
    // 書き出し・読みもどし
    const rd = (x, name) => MusicXMLImport.readFile(new TextEncoder().encode(x).buffer, name);
    const a = await rd(Notation.musicXML(scoreOpts([tr.id], true)), 'a.musicxml');
    const c = await rd(MuseScoreExport.mscx(scoreOpts([tr.id], true)), 'a.mscx');
    const sig = (t) => t.notes.map((n) => [n.ly, n.ly2, n.ly3].map((x) => x || '').join('|')).join(' ');
    out['MusicXML で読みもどしても同じ'] = sig(a.tracks[0]) === sig(tr);
    out['MuseScore で読みもどしても同じ'] = sig(c.tracks[0]) === sig(tr) ? true : sig(c.tracks[0]);
    // 楽譜の上で打つ：↓で2番へ
    setView('score'); renderScoreEditNow();
    for (const n of tr.notes) { delete n.ly2; delete n.ly3; }
    lyrOpen(0);
    const inp = document.querySelector('#lyrEd input');
    const key = (k) => inp.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    key('ArrowDown');
    out['↓で2番（ボタンの字）'] = document.querySelector('#lyrEd .lyrv').textContent + '・欄は空 ' + (inp.value === '');
    inp.value = 'な'; key(' ');
    inp.value = 'ら'; key('Enter');
    out['打った2番'] = tr.notes.map((n) => n.ly2 || '').join('') + '・1番は ' + tr.notes.slice(0, 2).map((n) => n.ly).join('');
    undo();
    out['もどす（1つ消える）'] = tr === track() ? track().notes.map((n) => n.ly2 || '').join('') : track().notes.map((n) => n.ly2 || '').join('');
    return out;
  });
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await p.evaluate(() => { for (const n of track().notes) { n.ly2 = 'に'; } track().notes[0].ly3 = 'さん'; setView('score'); renderScoreEditNow(); });
  await p.screenshot({ path: process.argv[2] || 'tools/verses.png' });
  await b.close();
})();
