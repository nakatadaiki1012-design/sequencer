// おまかせ作曲：和声（コードに合う）・対位法（ほかのパートとぶつからない・平行5度8度なし）・旋律のきまり
// 何回も作って、きまりをやぶった数を数える
const { chromium } = require('playwright');
const N = +process.argv[3] || 40;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 820 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(800);
  const r = await p.evaluate((N) => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const CH = (r, q) => ({ r, q });
    const prog = [CH(0, 'M'), CH(9, 'm'), CH(5, 'M'), CH(7, 'M'), CH(0, 'M'), CH(5, 'M'), CH(7, '7'), CH(0, 'M')];
    // 下のパート（お手本の定旋律ふう：全音符と2分音符）
    const low = [48, 45, 41, 43, 48, 53, 55, 48].map((pp, i) => ({ s: i * 192, p: pp + 12, l: 192 }));
    const alto = [[64, 67], [64, 60], [65, 69], [67, 62], [67, 64], [65, 69], [65, 62], [64, 64]].flatMap((x, i) => [{ s: i * 192, p: x[0], l: 96 }, { s: i * 192 + 96, p: x[1], l: 96 }]);
    const songs = {
      コードあり: { v: 2, title: 'a', bars: 8, tracks: [{ type: 'melody', range: 'soprano', notes: [] }, { type: 'chord', chords: prog }] },
      コードとほかのパート: { v: 2, title: 'b', bars: 8, tracks: [{ type: 'melody', range: 'soprano', notes: [] }, { type: 'melody', range: 'alto', notes: alto }, { type: 'melody', range: 'bass', notes: low.map((n) => ({ ...n, p: n.p - 12 })) }, { type: 'chord', chords: prog }] },
      コードなしでほかのパート: { v: 2, title: 'c', bars: 8, tracks: [{ type: 'melody', range: 'soprano', notes: [] }, { type: 'melody', range: 'alto', notes: low }] },
      なにもなし: { v: 2, title: 'd', bars: 8, tracks: [{ type: 'melody', range: 'soprano', notes: [] }] },
      短調: { v: 2, title: 'e', bars: 8, key: 9, scale: 'minor', tracks: [{ type: 'melody', range: 'soprano', notes: [] }, { type: 'chord', chords: [CH(9, 'm'), CH(2, 'm'), CH(4, 'm'), CH(9, 'm'), CH(5, 'M'), CH(2, 'm'), CH(4, 'm'), CH(9, 'm')] }] },
      ヨナ抜き: { v: 2, title: 'f', bars: 8, scale: 'penta', tracks: [{ type: 'melody', range: 'soprano', notes: [] }, { type: 'melody', range: 'alto', notes: low }] },
      '3拍子': { v: 2, title: 'g', bars: 8, meter: [3, 4], tracks: [{ type: 'melody', range: 'alto', notes: [] }, { type: 'chord', chords: prog }] },
    };
    const out = {};
    for (const name in songs) {
      const S = { 回数: N, 音の数: 0, 音階の外: 0, 主音で終わらない: 0, 小節の頭がコードの外: 0, 強い拍がコードの外: 0, 拍の頭がコードの外: 0, 拍の頭の数: 0, とんで入るコードの外: 0, 長いコードの外: 0, 'ほかのパートと強拍でぶつかる': 0, 'ほかのパートと重なる拍': 0, '平行5度・8度': 0, '増4度・7度のとび': 0, 'オクターブより大きいとび': 0, '大きいとびのあと同じ向き': 0, '同じ音3回': 0, 声部の交差: 0, 順次進行の割合: 0, ms: 0 };
      let steps = 0, moves = 0;
      for (let it = 0; it < N; it++) {
        loadSong(JSON.parse(JSON.stringify(songs[name])));
        const tr = song.tracks[0];
        const t0 = performance.now(); autoCompose(tr); S.ms += performance.now() - t0;
        const ns = [...tr.notes].sort((a, z) => a.s - z.s);
        const pcs = scalePcs(); const ct = song.tracks.find((t) => t.type === 'chord');
        const chordAt = (t) => { if (!ct) return null; const bb = barOf(t); const sg = chordSegs(ct.chords[bb], bb); let c = null; for (const x of sg) if (x.o <= t - barStart(bb)) c = x.c; return c ? new Set(CHORD_Q[c.q].iv.map((x) => (c.r + x) % 12)) : null; };
        const others = song.tracks.filter((t, i) => i > 0 && t.type === 'melody');
        const snd = (t2, t) => { const n = t2.notes.find((n) => n.s <= t && t < n.s + n.l); return n ? n.p : null; };
        const sc = []; for (let m = 0; m < 128; m++) if (pcs.has(m % 12)) sc.push(m);
        const deg = (m) => sc.indexOf(m);
        S.音の数 += ns.length;
        if (!ns.length || ns[ns.length - 1].p % 12 !== song.key) S.主音で終わらない++;
        ns.forEach((n, i) => {
          if (!pcs.has(n.p % 12)) S.音階の外++;
          const bb = barOf(n.s); const off = n.s - barStart(bb); const beat = beatAt(bb); const onBeat = off % beat === 0;
          const cp = chordAt(n.s); const out = cp && !cp.has(n.p % 12);
          if (onBeat) S.拍の頭の数++;
          if (out && off === 0) S.小節の頭がコードの外++;
          if (out && onBeat) S.拍の頭がコードの外++;
          if (out && (off === 0 || (barLen(bb) / beat === 4 && off === 2 * beat))) S.強い拍がコードの外++;
          if (out && n.l >= 72) S.長いコードの外++;
          const pv = ns[i - 1], nx = ns[i + 1];
          const d1 = pv ? deg(n.p) - deg(pv.p) : 0, d2 = nx ? deg(nx.p) - deg(n.p) : 0;
          if (out && ((pv && Math.abs(d1) !== 1) || (nx && Math.abs(d2) !== 1))) S.とんで入るコードの外++;
          if (pv) {
            moves++; if (Math.abs(d1) <= 1) steps++;
            const sem = Math.abs(n.p - pv.p);
            if ([6, 10, 11].includes(sem)) S['増4度・7度のとび']++;
            if (sem > 12) S['オクターブより大きいとび']++;
            if (nx && Math.abs(d1) >= 3 && Math.sign(d2) === Math.sign(d1) && pv.s + pv.l === n.s) S['大きいとびのあと同じ向き']++;
            if (nx && pv.p === n.p && nx.p === n.p) S['同じ音3回']++;
          }
          for (const o of others) {
            const q = snd(o, n.s); if (q == null) continue;
            const ic = Math.abs(n.p - q) % 12;
            if (onBeat && (off === 0 || n.l >= 48 || (barLen(bb) / beat === 4 && off === 2 * beat))) { S['ほかのパートと重なる拍']++; if ([1, 2, 6, 10, 11].includes(ic)) S['ほかのパートと強拍でぶつかる']++; }
            if (n.p < q) S.声部の交差++;
            if (pv) { const q0 = snd(o, pv.s); if (q0 != null && q0 !== q && pv.p !== n.p) { const i0 = Math.abs(pv.p - q0) % 12; if (i0 === ic && (ic === 0 || ic === 7)) S['平行5度・8度']++; } }
          }
        });
      }
      S.順次進行の割合 = Math.round((steps / Math.max(1, moves)) * 100) + '%';
      S.ms = Math.round(S.ms / N) + 'ms/回';
      out[name] = S;
    }
    return out;
  }, N);
  console.log(JSON.stringify(r, null, 1)); console.log('エラー:', errs.length ? errs : 'なし');
  await b.close();
})();
