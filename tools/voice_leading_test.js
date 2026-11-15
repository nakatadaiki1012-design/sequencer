// コード伴奏の音のえらび方：和声法のきまり（連続5度・8度なし、導音→主音、7度は下がる、なめらか）
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  const res = await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const C = (r, q = 'M') => ({ r, q });
    const progs = {
      'C Am F G7 C': [C(0), C(9, 'm'), C(5), C(7, '7'), C(0)],
      'C F G C': [C(0), C(5), C(7), C(0)],
      'C Dm G7 C': [C(0), C(2, 'm'), C(7, '7'), C(0)],
      'カノン C G Am Em F C F G': [C(0), C(7), C(9, 'm'), C(4, 'm'), C(5), C(0), C(5), C(7)],
      'Am Dm E Am（短調）': [C(9, 'm'), C(2, 'm'), C(4), C(9, 'm')],
    };
    const NM = ['ド', 'ド#', 'レ', 'ミ♭', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'シ♭', 'シ'];
    const nm = (m) => NM[m % 12] + (Math.floor(m / 12) - 1);
    const out = {};
    for (const [name, chords] of Object.entries(progs)) {
      song.key = name.includes('短調') ? 9 : 0;
      let prev = null;
      const vs = [];
      for (const c of chords) { const v = harmonyVoicing(c, prev); vs.push([v.bass, ...v]); prev = v; }
      const probs = [];
      for (let i = 1; i < vs.length; i++) {
        const A = vs[i - 1]; const Z = vs[i];
        const n = Math.min(A.length, Z.length);
        const a = [A[0], ...A.slice(1).slice(-(n - 1))]; const z = [Z[0], ...Z.slice(1).slice(-(n - 1))];
        for (let x = 0; x < n; x++) for (let y = x + 1; y < n; y++) {
          const i0 = (a[y] - a[x] + 120) % 12; const i1 = (z[y] - z[x] + 120) % 12;
          if (a[x] !== z[x] && a[y] !== z[y] && Math.sign(z[x] - a[x]) === Math.sign(z[y] - a[y]) && i0 === i1 && (i0 === 7 || i0 === 0)) probs.push(`${i}: 連続${i0 === 7 ? 5 : 8}度`);
        }
        // 上の声のうごき（半音いくつ）
      }
      const moves = vs.slice(1).map((v, i) => { const a = vs[i].slice(1); const z = v.slice(1); const n = Math.min(a.length, z.length); let s = 0; for (let k = 0; k < n; k++) s += Math.abs(z[z.length - n + k] - a[a.length - n + k]); return s; });
      out[name] = { 和音: vs.map((v) => v.map(nm).join(' ')), 上の声のうごき合計: moves.join(','), まちがい: probs.length ? probs : 'なし' };
    }
    song.key = 0;
    return out;
  });
  console.log(JSON.stringify(res, null, 1), errs); await b.close();
})();
