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
      ジャズ251: { v: 2, title: 'j1', bars: 8, tracks: [{ type: 'melody', range: 'soprano', notes: [] }, { type: 'chord', chords: [CH(2, 'm7'), CH(7, '7'), CH(0, 'M7'), CH(5, 'M7'), CH(11, 'm7b5'), CH(4, '7'), CH(9, 'm7'), CH(9, 'm7')] }] },
      都会の夜: { v: 2, title: 'j2', bars: 8, tracks: [{ type: 'melody', range: 'soprano', notes: [] }, { type: 'chord', chords: [CH(5, 'M7'), CH(4, '7'), CH(9, 'm7'), { r: 7, q: 'm7', h: CH(0, '7') }, CH(5, 'M7'), CH(4, '7'), CH(9, 'm7'), CH(0, 'M7')] }] },
      裏コードとdim: { v: 2, title: 'j3', bars: 8, tracks: [{ type: 'melody', range: 'soprano', notes: [] }, { type: 'chord', chords: [CH(0, 'M7'), CH(1, 'dim7'), CH(2, 'm7'), CH(1, '7'), CH(0, 'M9'), CH(5, 'm6'), CH(2, 'm9'), { r: 7, q: '7b9', h: CH(0, '6') }] }] },
      短調のジャズ: { v: 2, title: 'j4', bars: 8, key: 9, scale: 'minor', tracks: [{ type: 'melody', range: 'soprano', notes: [] }, { type: 'chord', chords: [CH(11, 'm7b5'), CH(4, '7b9'), CH(9, 'm7'), CH(9, 'mM7'), CH(2, 'm7'), CH(7, '7'), CH(11, 'm7b5'), { r: 4, q: '7', h: CH(9, 'm6') }] }] },
      '3拍子': { v: 2, title: 'g', bars: 8, meter: [3, 4], tracks: [{ type: 'melody', range: 'alto', notes: [] }, { type: 'chord', chords: prog }] },
    };
    const out = {};
    // コード・スケールが理論どおりか（ハ長調で）
    { loadSong({ v: 2, title: 't', bars: 1, tracks: [{ type: 'melody', notes: [] }] }); const kp = scalePcs(); const NN = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
      const show = (r, q) => { const c = chordScale({ r, q }, kp); return c.id + '｜' + [...c.kind.entries()].sort((a, z) => ((a[0] - r + 12) % 12) - ((z[0] - r + 12) % 12)).map(([pc, k]) => NN[pc] + ['', '+', '×'][k]).join(' '); };
      out.コードスケール = { CM7: show(0, 'M7'), Dm7: show(2, 'm7'), Em7: show(4, 'm7'), FM7: show(5, 'M7'), G7: show(7, '7'), Am7: show(9, 'm7'), 'Bm7(♭5)': show(11, 'm7b5'), E7: show(4, '7'), A7: show(9, '7'), D7: show(2, '7'), 'D♭7': show(1, '7'), 'B♭7': show(10, '7'), F7: show(5, '7'), Fm6: show(5, 'm6'), 'C♯dim7': show(1, 'dim7'), 'A♭M7': show(8, 'M7'), 'G7(♭9)': show(7, '7b9'), G7sus4: show(7, '7sus4'), Fm7: show(5, 'm7') }; }
    for (const name in songs) {
      const S = { 回数: N, 'コード・スケールの外': 0, 'すべりこまない半音の音': 0, '強い拍のアボイド': 0, '長いアボイド': 0, '強い拍のテンション': 0, 'コードの3度の変化音を使った': 0, '7度が解決しない': 0, '7度の数': 0, 音の数: 0, 音階の外: 0, 主音で終わらない: 0, 小節の頭がコードの外: 0, 強い拍がコードの外: 0, 拍の頭がコードの外: 0, 拍の頭の数: 0, とんで入るコードの外: 0, 長いコードの外: 0, 'ほかのパートと強拍でぶつかる': 0, 'ほかのパートと重なる拍': 0, '平行5度・8度': 0, '増4度・7度のとび': 0, 'オクターブより大きいとび': 0, '大きいとびのあと同じ向き': 0, '同じ音3回': 0, 声部の交差: 0, 順次進行の割合: 0, ms: 0 };
      let steps = 0, moves = 0;
      for (let it = 0; it < N; it++) {
        loadSong(JSON.parse(JSON.stringify(songs[name])));
        const tr = song.tracks[0];
        const t0 = performance.now(); autoCompose(tr); S.ms += performance.now() - t0;
        const ns = [...tr.notes].sort((a, z) => a.s - z.s);
        const pcs = scalePcs(); const ct = song.tracks.find((t) => t.type === 'chord');
        const chObj = (t) => { if (!ct) return null; const bb = barOf(t); let c = null; for (const x of chordSegs(ct.chords[bb], bb)) if (x.o <= t - barStart(bb)) c = x.c; return c; };
        const hept = SCALES[song.scale].steps.length === 7;
        const chordAt = (t) => { if (!ct) return null; const bb = barOf(t); const sg = chordSegs(ct.chords[bb], bb); let c = null; for (const x of sg) if (x.o <= t - barStart(bb)) c = x.c; return c ? new Set(CHORD_Q[c.q].iv.map((x) => (c.r + x) % 12)) : null; };
        const others = song.tracks.filter((t, i) => i > 0 && t.type === 'melody');
        const snd = (t2, t) => { const n = t2.notes.find((n) => n.s <= t && t < n.s + n.l); return n ? n.p : null; };
        const sc = []; for (let m = 0; m < 128; m++) if (pcs.has(m % 12)) sc.push(m);
        const SD = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6, 7];
        const deg = (m) => sc.indexOf(m);
        const dst = (a, z) => (hept && ct ? Math.sign(z - a) * (SD[Math.abs(z - a)] ?? 9) : deg(z) - deg(a));
        S.音の数 += ns.length;
        { const lastC = ns.length ? chordAt(ns[ns.length - 1].s) : null; const lp = ns.length ? ns[ns.length - 1].p % 12 : -1; if (!ns.length || (lastC && !lastC.has(song.key) ? !lastC.has(lp) : lp !== song.key)) S.主音で終わらない++; }
        ns.forEach((n, i) => {
          const co = chObj(n.s); const csx = co && hept ? chordScale(co, pcs) : null;
          const kd = csx ? (csx.pcs.has(n.p % 12) ? csx.kind.get(n.p % 12) : 3) : null;
          const nx0 = ns[i + 1];
          const strongB = (n.s - barStart(barOf(n.s))) === 0 || (barLen(barOf(n.s)) / beatAt(barOf(n.s)) === 4 && (n.s - barStart(barOf(n.s))) === 2 * beatAt(barOf(n.s)));
          if (kd === 3) { S['コード・スケールの外']++; if (!nx0 || Math.abs(nx0.p - n.p) !== 1) S['すべりこまない半音の音']++; }
          if (kd === 2 && strongB) S['強い拍のアボイド']++;
          if (kd === 2 && n.l >= 72) S['長いアボイド']++;
          if (kd === 1 && strongB) S['強い拍のテンション']++;
          if (co && !pcs.has(n.p % 12) && kd === 0) S['コードの3度の変化音を使った']++;
          if (co && nx0) { const iv = CHORD_Q[co.q].iv; const c2 = chObj(nx0.s); if (iv.length > 3 && iv[3] >= 9 && iv[3] <= 11 && n.p % 12 === (co.r + iv[3]) % 12 && c2 && (c2.r !== co.r || c2.q !== co.q)) { S['7度の数']++; const dd = nx0.p - n.p; if (!(dd === -1 || dd === -2 || dd === 0)) S['7度が解決しない']++; } }
          if (!csx && !pcs.has(n.p % 12)) S.音階の外++;
          const bb = barOf(n.s); const off = n.s - barStart(bb); const beat = beatAt(bb); const onBeat = off % beat === 0;
          const cp = chordAt(n.s); const out = cp && !cp.has(n.p % 12) && !(kd === 1 && CHORD_Q[co.q].iv.length > 3) && kd !== 3;
          if (onBeat) S.拍の頭の数++;
          if (out && off === 0) S.小節の頭がコードの外++;
          if (out && onBeat) S.拍の頭がコードの外++;
          if (out && (off === 0 || (barLen(bb) / beat === 4 && off === 2 * beat))) S.強い拍がコードの外++;
          if (out && n.l >= 72) S.長いコードの外++;
          const pv = ns[i - 1], nx = ns[i + 1];
          const d1 = pv ? dst(pv.p, n.p) : 0, d2 = nx ? dst(n.p, nx.p) : 0;
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
