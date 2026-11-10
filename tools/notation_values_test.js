// 楽譜の音価：3連符・6/8 の付点4分音符が正しく書かれる
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const xmlOf = (sg) => { loadSong(sg); const o = scoreOpts([song.tracks[0].id], false); o.chords = o.chordObjs; return Notation.musicXML(o); };
    const types = (xml) => [...xml.matchAll(/<note>([\s\S]*?)<\/note>/g)].slice(0, 6).map((m) => { const t = (m[1].match(/<type>(\w+)<\/type>/) || [])[1] || 'whole'; return (/<rest/.test(m[1]) ? 'rest:' : '') + t + (/<dot\/>/.test(m[1]) ? '.' : '') + (/<time-modification>/.test(m[1]) ? '³' : '') + (/<tie type="start"/.test(m[1]) ? '~' : ''); }).join(' ');
    const out = {};
    out['8分3連（頭から）'] = types(xmlOf({ v: 2, bars: 1, tracks: [{ type: 'melody', notes: [{ s: 0, p: 60, l: 16 }, { s: 16, p: 62, l: 16 }, { s: 32, p: 64, l: 16 }, { s: 48, p: 65, l: 144 }] }] }));
    out['4分3連（2拍目から）'] = types(xmlOf({ v: 2, bars: 1, tracks: [{ type: 'melody', notes: [{ s: 0, p: 60, l: 48 }, { s: 48, p: 62, l: 32 }, { s: 80, p: 64, l: 32 }, { s: 112, p: 65, l: 32 }, { s: 144, p: 67, l: 48 }] }] }));
    out['6/8 付点4分×2'] = types(xmlOf({ v: 2, bars: 1, meter: [6, 8], tracks: [{ type: 'melody', notes: [{ s: 0, p: 60, l: 72 }, { s: 72, p: 62, l: 72 }] }] }));
    out['6/8 4分＋8分×2'] = types(xmlOf({ v: 2, bars: 1, meter: [6, 8], tracks: [{ type: 'melody', notes: [{ s: 0, p: 60, l: 48 }, { s: 48, p: 62, l: 24 }, { s: 72, p: 64, l: 48 }, { s: 120, p: 65, l: 24 }] }] }));
    out['4/4 ふつう'] = types(xmlOf({ v: 2, bars: 1, tracks: [{ type: 'melody', notes: [{ s: 0, p: 60, l: 72 }, { s: 72, p: 62, l: 24 }, { s: 96, p: 64, l: 96 }] }] }));
    return out;
  });
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
