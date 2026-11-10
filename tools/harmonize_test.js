// メロディにコードをつける：サンプル曲のコードとくらべる、かえるの合唱
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 820 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    loadSong(sampleSong());
    const ct = song.tracks.find((t) => t.type === 'chord');
    const orig = ct.chords.slice(0, song.bars).map(chordLabel);
    const got = harmonize(true).map(chordLabel);
    const same = orig.filter((c, i) => c && got[i] && got[i].split('・')[0] === c.split('・')[0]).length;
    // かえるの合唱（ドレミファミレド・ミファソラソファミ）
    loadSong({ tracks: [{ type: 'melody', notes: [60, 62, 64, 65, 64, 62, 60].map((p, i) => ({ s: i * 48, p, l: i === 6 ? 96 : 48 })).concat([64, 65, 67, 69, 67, 65, 64].map((p, i) => ({ s: 384 + i * 48, p, l: i === 6 ? 96 : 48 }))) }, { type: 'chord', chords: [] }], bars: 4 });
    const kaeru = harmonize(true).map(chordLabel);
    autoChords();
    return { 'サンプル（もとのコード）': orig.join(' '), 'サンプル（自動）': got.join(' '), '前半が同じ小節': `${same}/${orig.filter(Boolean).length}`, 'かえるの合唱': kaeru.join(' '), 'ボタンで入った': chordLabel(song.tracks[1].chords[0]) };
  });
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
