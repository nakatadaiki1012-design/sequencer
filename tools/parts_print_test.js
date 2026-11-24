// パート譜の印刷：フルスコア用の設定を引きつがず、演奏する人のために組む
//   長い休みをまとめる（コードがあっても）・ふつうの大きさの五線・自動の改行・移調楽器はその調で・さいごのページに1〜2段だけ残さない
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 820 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const R = (seed) => { let x = seed; return () => (x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; };
    const mel = (seed, base, bars, restBars) => {
      const r = R(seed); const ns = []; let pp = base; const sc = [0, 2, 4, 5, 7, 9, 11];
      for (let bb = 0; bb < bars; bb++) {
        if (restBars.includes(bb)) continue;
        let t = 0;
        while (t < 192) { const l = [48, 48, 24, 24, 96, 72][Math.floor(r() * 6)]; const ll = Math.min(l, 192 - t); pp += [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(r() * 8)]; pp = Math.max(base - 5, Math.min(base + 9, pp)); const dg = ((pp % 7) + 7) % 7; ns.push({ s: bb * 192 + t, p: 12 * Math.floor(pp / 7) + sc[dg], l: ll }); t += ll; }
      }
      return ns;
    };
    const bars = 48; const rng = (a, z) => Array.from({ length: z - a }, (_, i) => a + i);
    const mk = (extra) => {
      loadSong({ v: 2, title: 'パート譜のテスト', bpm: 96, bars, key: 5, rehearsal: { 8: 'A', 16: 'B', 32: 'C' }, tracks: [
        { type: 'melody', name: 'フルート', inst: 'flute', range: 'high', notes: mel(1, 42, bars, [...rng(8, 16), 30, 31]) },
        { type: 'melody', name: 'クラリネット', inst: 'clarinet', range: 'soprano', notes: mel(2, 38, bars, [...rng(0, 7), ...rng(20, 24)]) },
        { type: 'melody', name: 'ホルン', inst: 'horn', range: 'alto', notes: mel(3, 33, bars, [...rng(0, 15), ...rng(24, 31), ...rng(40, 44)]) },
        { type: 'chord', name: 'コード伴奏', chords: Array.from({ length: bars }, (_, i) => [{ r: 5, q: 'M' }, { r: 0, q: '7' }, { r: 2, q: 'm' }, { r: 10, q: 'M' }][i % 4]) },
      ] });
      Object.assign(scoreSettings(), extra);
      scoreSel = new Set(song.tracks.map((t) => t.id));
      let html = ''; const w0 = window.open; window.open = () => ({ document: { write: (h) => { html += h; }, close() {} } }); printParts(); window.open = w0;
      const box = document.createElement('div'); box.innerHTML = html.replace(/<script>[\s\S]*?<\/script>/, '');
      // パートごとに、ページをまとめる（パート名のわくが出てくるページが、そのパートの1ページ目）
      const parts = [];
      for (const pg of box.querySelectorAll('.pg')) {
        const hd = pg.querySelector('rect[rx="4"] + text');
        if (hd) parts.push({ name: hd.textContent, pages: [] });
        parts[parts.length - 1].pages.push(pg);
      }
      return parts;
    };
    const info = (pt) => {
      const txt = (pg) => [...pg.querySelectorAll('text:not(.reh)')].map((t) => t.textContent);
      const all = pt.pages.flatMap(txt);
      const svg0 = pt.pages[0].querySelector('svg');
      // 五線の線と線のあいだ（紙のはばを 780 としたとき）。ふつうの大きさ＝8
      const vb = svg0.viewBox.baseVal; const wAttr = parseFloat(svg0.getAttribute('width'));
      return {
        ページ数: pt.pages.length,
        // 段の数：ページに分けたときは段ごとの <g>、1ページだけのときは小節番号つきの段の頭（ト音記号などの数）で数える
        段の数: pt.pages.map((pg) => pg.querySelectorAll('g[transform^="translate(0"]').length || [...pg.querySelectorAll('text[font-size="10"][fill="#666"]')].filter((t) => /^\d+$/.test(t.textContent)).length + 1),
        倍率: Math.round((wAttr / vb.width) * 100) / 100,
        コード名: all.filter((t) => /^[A-G][♯♭]?(m|7|M7|m7)?$/.test(t)).slice(0, 4).join(' '),
        まとめた休み: pt.pages.reduce((a, pg) => a + pg.querySelectorAll('rect.mmrest').length, 0),
        リハーサル記号: [...pt.pages.flatMap((pg) => [...pg.querySelectorAll('text.reh')])].map((t) => t.textContent).join(''),
        '2ページ目の見出し': pt.pages[1] ? txt(pt.pages[1]).find((t) => t.includes('パート譜のテスト')) || '' : '（1ページ）',
        全休符の数: pt.pages.reduce((a, pg) => a + (pg.innerHTML.match(/restWhole|class="rest whole"/g) || []).length, 0),
      };
    };
    const out = {};
    // ① ふつうの設定（コードあり）
    let P = mk({});
    out.パートの数 = P.length + '（コードのトラックは入れない）';
    out.フルート = info(P[0]); out.クラリネット = info(P[1]); out.ホルン = info(P[2]);
    // ② フルスコア用の設定：小さな五線・3小節ごとの改行・実音
    P = mk({ orch: true, scale: 0.7, breaks: [3, 6, 9, 12, 15, 18, 21], concert: true });
    out.フルスコア設定_フルート = info(P.find((x) => x.name === 'フルート'));
    out.フルスコア設定_クラリネット = info(P.find((x) => x.name === 'クラリネット'));
    // 実音のままになっていない：フルスコアを「実音で書く」にしていても、パート譜はその楽器の調で書く（実音の設定なしのときと同じ楽譜になる）
    { const withC = P.find((x) => x.name === 'クラリネット').pages.map((pg) => pg.innerHTML).join('');
      const keep = [scoreSettings().concert, scoreSettings().scale, scoreSettings().breaks.length];
      const P2 = mk({ orch: true, scale: 0.7, breaks: [3, 6, 9, 12, 15, 18, 21], concert: false });
      out.クラリネットは移調して書く = withC === P2.find((x) => x.name === 'クラリネット').pages.map((pg) => pg.innerHTML).join('');
      Object.assign(scoreSettings(), { concert: true }); out._keep = keep; }
    out.設定を書きかえない = JSON.stringify([scoreSettings().concert, scoreSettings().scale, scoreSettings().breaks.length]);
    // ③ 短い曲は1ページにおさまる
    loadSong({ v: 2, title: 'みじかい', bars: 8, tracks: [{ type: 'melody', name: 'リコーダー', inst: 'recorder', notes: mel(5, 38, 8, []) }] });
    scoreSel = new Set(song.tracks.map((t) => t.id));
    { let html = ''; const w0 = window.open; window.open = () => ({ document: { write: (h) => { html += h; }, close() {} } }); printParts(); window.open = w0; out.短い曲のページ数 = (html.match(/class="pg"/g) || []).length; }
    return out;
  });
  // きまりのチェック
  const chk = {
    長い休みがまとまる: r.フルート.まとめた休み >= 2 && r.ホルン.まとめた休み >= 3,
    コードは移調楽器の調で: r.クラリネット.コード名.startsWith('C G D7 Em') || r.クラリネット.コード名.includes('G D7 Em'),
    フルートのコードはそのまま: /F C7 Dm B♭|B♭ F C7/.test(r.フルート.コード名),
    フルスコアの小さな五線を引きつがない: r.フルスコア設定_フルート.倍率 === 1,
    フルスコアの改行を引きつがない: r.フルスコア設定_フルート.段の数.reduce((a, x) => a + x, 0) <= 13,
    オーケストラのパート譜にコードなし: r.フルスコア設定_フルート.コード名 === '',
    さいごのページに1から2段だけ残さない: [r.フルート, r.クラリネット, r.ホルン, r.フルスコア設定_フルート, r.フルスコア設定_クラリネット].every((x) => x.ページ数 === 1 || x.段の数[x.段の数.length - 1] >= 3),
    '2ページ目の見出しにパート名': [r.フルート, r.フルスコア設定_フルート].every((x) => x.ページ数 === 1 || x['2ページ目の見出し'].includes('フルート')),
    リハーサル記号がのこる: r.フルート.リハーサル記号 === 'ABC',
    実音の設定でも移調して書く: r.クラリネットは移調して書く === true,
    設定を書きかえない: r.設定を書きかえない === '[true,0.7,7]',
  };
  console.log(JSON.stringify(r, null, 1)); console.log(JSON.stringify(chk, null, 1));
  console.log('きまり:', Object.values(chk).every(Boolean) ? 'ぜんぶOK' : 'NG ' + Object.keys(chk).filter((k) => !chk[k]).join('・'));
  console.log('エラー:', errs.length ? errs : 'なし');
  await b.close();
})();
