// 印刷の自動調整：用紙と五線の大きさ。フルスコアは1段がページに入る大きさ（小さすぎるなら大きな紙）、ふつうの楽譜とパート譜は 7mm
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  const out = await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const o = {};
    const N = (base) => Array.from({ length: 64 }, (_, i) => ({ s: i * 48, p: base + (i % 5), l: 48 }));
    // ふつうの楽譜（1パート）
    loadSong({ v: 2, title: 'うた', bpm: 100, bars: 16, key: 0, tracks: [{ type: 'melody', inst: 'flute', notes: N(72) }] }, { own: true });
    let S = scoreSettings(); S.paper = 'auto'; S.size = 'auto';
    scoreSvg(song.tracks.map((t) => t.id));
    o['ふつうの楽譜：用紙・五線'] = printFit.paper + '・' + printFit.mm.toFixed(1) + 'mm';
    S.size = '1'; scoreSvg(song.tracks.map((t) => t.id));
    o['大きさを決めたとき（ふつう＝7.6mm）'] = printFit.mm.toFixed(1);
    S.size = 'auto'; S.paper = 'a4l'; scoreSvg(song.tracks.map((t) => t.id));
    o['A4よこ'] = printFit.paper + '・比 ' + pageRatio(printPaper).toFixed(2);
    // 大きなオーケストラ（24パート）
    const inst = ['piccolo', 'flute', 'oboe', 'clarinet', 'bassoon', 'horn', 'horn', 'trumpet', 'trombone', 'trombone', 'tuba', 'timpani', 'harp', 'violin', 'violin', 'viola', 'cello', 'contrabass', 'flute', 'oboe', 'clarinet', 'bassoon', 'horn', 'trumpet'];
    loadSong({ v: 2, title: 'オケ', bpm: 100, bars: 16, key: 0, score: { orch: true }, tracks: inst.map((x, i) => ({ type: 'melody', name: x + i, inst: x, notes: N(48 + (i % 4) * 7) })) }, { own: true });
    S = scoreSettings(); S.paper = 'auto'; S.size = 'auto';
    const svg = scoreSvg(song.tracks.map((t) => t.id));
    const L = Notation.lastLayout;
    const PHu = L.width * pageRatio(printPaper);
    o['フルスコア：用紙・五線'] = printFit.paper + '・' + printFit.mm.toFixed(1) + 'mm';
    o['フルスコア：五線は 3〜6mm'] = printFit.mm >= 3 && printFit.mm <= 6.05;
    o['フルスコア：どの段もページに入る'] = L.systems.every((sy, i) => sy.y1 - sy.y0 + 34 + (i === 0 ? L.systems[0].y0 : 46) <= PHu + 1);
    o['フルスコア：1段の小節数'] = L.systems.map((s) => s.bars.length).join(',');
    const pages = Notation.paginate(svg, L, pageRatio(printPaper));
    o['ページ数'] = pages.length;
    // パート譜：印刷の画面を横どりして、用紙と五線を見る
    let html = '';
    const keep = window.open;
    window.open = () => ({ document: { write: (h) => { html += h; }, close() {} } });
    openScore();
    scoreSel = new Set([song.tracks[3].id]);
    printParts();
    window.open = keep;
    $('#dlgScore').close();
    o['パート譜：用紙'] = (html.match(/@page\{size:([^;]+);/) || [])[1];
    o['パート譜：ページ'] = (html.match(/class="pg"/g) || []).length;
    return o;
  });
  console.log(JSON.stringify({ ...out, errs }, null, 1)); await b.close();
})();
