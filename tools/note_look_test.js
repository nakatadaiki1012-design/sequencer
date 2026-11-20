// 音符ごとの見た目：ぼうの向き・小さい音符・色（記号パレットの「符頭・奏法」）
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
    // ラ（ぼうは自動で上）・高いミ（自動で下）
    loadSong({ v: 2, title: 'look', bpm: 100, bars: 1, tracks: [{ type: 'melody', inst: 'piano', notes: [{ s: 0, p: 69, l: 48 }, { s: 48, p: 76, l: 48 }, { s: 96, p: 72, l: 48 }, { s: 96, p: 76, l: 48 }, { s: 144, p: 71, l: 48 }] }] }, { own: true });
    setView('score'); renderScoreEditNow();
    const tr = track();
    const stems = () => { const L = Notation.lastLayout; const svg = document.querySelector('#scoreEditView svg').outerHTML; return svg; };
    const stemDir = () => { // 符頭の高さと、ぼうの先の高さをくらべる
      const svg = Notation.render(scoreOpts([tr.id], true));
      return svg;
    };
    const pick = (s, ps) => { ui.sc.sel = new Set(ps.map((x) => s + ':' + x)); };
    const base = Notation.render(scoreOpts([tr.id], true));
    pick(0, [69]); noteLook('dn');
    pick(48, [76]); noteLook('up');
    out['ぼうの向き（ラ＝下 -1、高いミ＝上 1）'] = tr.notes[0].sd + ',' + tr.notes[1].sd;
    out['楽譜が変わる'] = Notation.render(scoreOpts([tr.id], true)) !== base;
    pick(96, [72]); noteLook('up');
    out['和音は、いっしょに変わる'] = tr.notes.filter((n) => n.s === 96).map((n) => n.sd).join(',');
    pick(0, [69]); noteLook('dn');
    out['もう一度おすと自動にもどる'] = tr.notes[0].sd === undefined;
    pick(144, [71]); noteLook('sm'); noteLook('col:red');
    const svg = Notation.render(scoreOpts([tr.id], true));
    out['小さい音符（0.72倍）'] = /scale\(5\.76\)[^>]*data-s="144"/.test(svg);
    out['赤い音符'] = /data-s="144"[^>]*fill="#e03131"/.test(svg);
    pick(96, [76]); noteLook('col:blue');
    out['和音の1つだけ青'] = tr.notes.filter((n) => n.s === 96).map((n) => n.col || '黒').join(',');
    const xml = Notation.musicXML(scoreOpts([tr.id], true));
    out['MusicXML：ぼうの向きと色'] = (xml.match(/<stem>up<\/stem>/g) || []).length + '・' + (xml.match(/color="#/g) || []).length;
    const a = await MusicXMLImport.readFile(new TextEncoder().encode(xml).buffer, 'a.musicxml');
    out['読みもどした色'] = a.tracks[0].notes.map((n) => n.col || '-').join(',');
    const sg = JSON.parse(JSON.stringify(song)); sg.tracks[0].notes[0].col = 'pink'; sg.tracks[0].notes[0].sd = 5;
    loadSong(sg, { own: true });
    out['へんな値はすてる'] = track().notes[0].col === undefined && track().notes[0].sd === undefined;
    return out;
  });
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await p.evaluate(() => { ui.sc.sel = new Set(); renderScoreEditNow(); });
  await p.screenshot({ path: process.argv[2] || 'tools/note_look.png' });
  await b.close();
})();
