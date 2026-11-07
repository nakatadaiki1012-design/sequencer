'use strict';
/* ============================================================
   楽譜（五線譜）を作る部分
   打ち込んだ音（ノート）を、音符・休符・調号・拍子記号のある
   五線譜（SVG画像）に変換します。
   時間の単位：4分音符 = 48 ティック
   ============================================================ */
const Notation = (() => {
  const SP = 8; // 五線の線の間隔(px)
  const FONT = `"Noto Music","Bravura","Segoe UI Symbol","Apple Symbols","Noto Sans Symbols 2",serif`;

  const KEYSIG = { 0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 5: -1, 10: -2, 3: -3, 8: -4, 1: -5 };
  const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6];
  const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3];
  const SHARP_SP = { l: [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6], a: [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0] };
  const FLAT_SP = { l: [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6], a: [0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1, 0] };
  const ACC_CH = { 1: '♯', '-1': '♭', 0: '♮' };

  // 音符の長さ（ティック）：[長さ, 基本の長さ, 付点, 3連符]
  const VALUES = [
    [192, 192, 0, 0], [144, 96, 1, 0], [96, 96, 0, 0], [72, 48, 1, 0], [48, 48, 0, 0],
    [36, 24, 1, 0], [24, 24, 0, 0], [18, 12, 1, 0], [12, 12, 0, 0], [6, 6, 0, 0],
    [32, 48, 0, 1], [16, 24, 0, 1], [8, 12, 0, 1],
  ];

  function keyCount(key, minor) {
    return KEYSIG[minor ? (key + 3) % 12 : key];
  }

  function spell(midi, kc) {
    const pc = ((midi % 12) + 12) % 12;
    const t = kc >= 0 ? SHARP_SP : FLAT_SP;
    const letter = t.l[pc];
    const acc = t.a[pc];
    const oct = Math.floor(midi / 12) - 1;
    return { letter, acc, dn: oct * 7 + letter };
  }
  function keyAccOf(kc) {
    const a = [0, 0, 0, 0, 0, 0, 0];
    if (kc > 0) for (let i = 0; i < kc; i++) a[SHARP_ORDER[i]] = 1;
    if (kc < 0) for (let i = 0; i < -kc; i++) a[FLAT_ORDER[i]] = -1;
    return a;
  }

  // 長さを音符の組み合わせに分ける
  function decompose(pos, len, beat) {
    const out = [];
    let guard = 0;
    while (len > 0 && guard++ < 64) {
      let chosen = null;
      for (const v of VALUES) {
        if (v[0] > len) continue;
        if (v[3]) {
          if (pos % v[0] !== 0) continue;
        } else {
          const unit = Math.min(v[1], beat);
          if (pos % unit !== 0) continue;
        }
        chosen = v;
        break;
      }
      if (!chosen) chosen = [len, 6, 0, 0];
      out.push({ pos, len: chosen[0], base: chosen[1], dot: chosen[2], trip: chosen[3] });
      pos += chosen[0];
      len -= chosen[0];
    }
    return out;
  }

  // ノートの列 → 小節ごとの「音符/休符」イベント
  function buildEvents(notes, bars, barTicks, beat) {
    const total = bars * barTicks;
    const groups = new Map();
    for (const n of notes) {
      if (n.s >= total) continue;
      if (!groups.has(n.s)) groups.set(n.s, []);
      groups.get(n.s).push(n);
    }
    const starts = [...groups.keys()].sort((a, b) => a - b);
    const segs = []; // {s, e, pitches}
    let t = 0;
    starts.forEach((s, i) => {
      const g = groups.get(s);
      const next = i + 1 < starts.length ? starts[i + 1] : total;
      const end = Math.min(Math.max(...g.map((n) => n.s + n.l)), next, total);
      if (s > t) segs.push({ s: t, e: s, pitches: null });
      segs.push({ s, e: end, pitches: [...new Set(g.map((n) => n.p))].sort((a, b) => a - b) });
      t = end;
    });
    if (t < total) segs.push({ s: t, e: total, pitches: null });

    const perBar = Array.from({ length: bars }, () => []);
    for (const sg of segs) {
      let s = sg.s;
      while (s < sg.e) {
        const b = Math.floor(s / barTicks);
        const be = Math.min(sg.e, (b + 1) * barTicks);
        const isRest = !sg.pitches;
        if (isRest && s === b * barTicks && be === (b + 1) * barTicks) {
          perBar[b].push({ pos: 0, len: barTicks, rest: true, whole: true });
        } else {
          const parts = decompose(s - b * barTicks, be - s, beat);
          parts.forEach((p) => perBar[b].push({ ...p, rest: isRest, pitches: sg.pitches }));
        }
        s = be;
      }
    }
    // タイ（同じ音が続く）の印
    const flat = perBar.flat();
    for (let i = 0; i < flat.length - 1; i++) {
      const a = flat[i];
      const b = flat[i + 1];
      if (!a.rest && !b.rest && a.pitches === b.pitches) a.tie = true;
    }
    return perBar;
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function render(opts) {
    const { parts, bars, barTicks, meter, key, minor, title, bpm, chords, width = 780 } = opts;
    const kc = keyCount(key, minor);
    const keyAcc = keyAccOf(kc);
    const beat = meter[1] === 8 && meter[0] % 3 === 0 && meter[0] > 3 ? 72 : (192 / meter[1]);
    const prepared = parts.map((p) => {
      const avg = p.notes.length ? p.notes.reduce((a, n) => a + n.p, 0) / p.notes.length : 67;
      const clef = avg < 57 ? 'bass' : 'treble';
      return { ...p, clef, bars: buildEvents(p.notes, bars, barTicks, beat) };
    });
    const maxDensity = Math.max(1, ...prepared.flatMap((p) => p.bars.map((b) => b.length)));
    const barsPerLine = maxDensity > 14 ? 1 : maxDensity > 7 ? 2 : meter[0] / meter[1] > 1 ? 3 : 4;
    const left = 16;
    const staffGap = 11 * SP;
    const chordRow = chords && chords.some(Boolean) ? 18 : 0;
    const systemH = chordRow + prepared.length * staffGap + 10;
    const lines = Math.ceil(bars / barsPerLine);
    const top = 70;
    const height = top + lines * systemH + 20;
    const o = [];
    o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="sans-serif">`);
    o.push(`<rect width="100%" height="100%" fill="#fff"/>`);
    o.push(`<text x="${width / 2}" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="#111">${esc(title)}</text>`);
    o.push(`<text x="${left}" y="56" font-size="13" fill="#111">♩ = ${bpm}</text>`);

    for (let line = 0; line < lines; line++) {
      const b0 = line * barsPerLine;
      const b1 = Math.min(bars, b0 + barsPerLine);
      const sysTop = top + line * systemH + chordRow;
      const ksW = Math.abs(kc) * 8;
      const hx = left + 34 + ksW + (line === 0 ? 22 : 4);
      const barW = (width - hx - 12) / barsPerLine;
      o.push(`<text x="${left}" y="${sysTop - 4}" font-size="10" fill="#666">${b0 + 1}</text>`);

      prepared.forEach((part, pi) => {
        const st = sysTop + pi * staffGap + 2 * SP;
        const yOf = (pos) => st + (8 - pos) * (SP / 2);
        const baseDn = part.clef === 'treble' ? 30 : 18;
        // 五線
        for (let i = 0; i < 5; i++) o.push(`<line x1="${left}" x2="${hx + barW * (b1 - b0)}" y1="${st + i * SP}" y2="${st + i * SP}" stroke="#222" stroke-width="1"/>`);
        o.push(`<line x1="${left}" x2="${left}" y1="${st}" y2="${st + 4 * SP}" stroke="#222"/>`);
        if (prepared.length > 1 && line === 0) o.push(`<text x="${left}" y="${st - 6}" font-size="10" fill="#555">${esc(part.name)}</text>`);
        // 音部記号
        if (part.clef === 'treble') o.push(`<text x="${left + 2}" y="${st + 3.1 * SP}" font-size="${4.4 * SP}" font-family='${FONT}' fill="#111">𝄞</text>`);
        else o.push(`<text x="${left + 3}" y="${st + 2.6 * SP}" font-size="${3.4 * SP}" font-family='${FONT}' fill="#111">𝄢</text>`);
        // 調号
        for (let i = 0; i < Math.abs(kc); i++) {
          let pos = (kc >= 0 ? [8, 5, 9, 6, 3, 7, 4] : [4, 7, 3, 6, 2, 5, 1])[i];
          if (part.clef === 'bass') pos -= 2;
          o.push(`<text x="${left + 34 + i * 8}" y="${yOf(pos) + (kc >= 0 ? 4 : 3)}" font-size="15" fill="#111">${kc >= 0 ? '♯' : '♭'}</text>`);
        }
        // 拍子記号
        if (line === 0) {
          const tx = left + 36 + ksW;
          o.push(`<text x="${tx + 6}" y="${st + 1.9 * SP}" font-size="${2.2 * SP}" font-weight="bold" font-family="serif" text-anchor="middle" fill="#111">${meter[0]}</text>`);
          o.push(`<text x="${tx + 6}" y="${st + 3.9 * SP}" font-size="${2.2 * SP}" font-weight="bold" font-family="serif" text-anchor="middle" fill="#111">${meter[1]}</text>`);
        }

        let prevHead = null; // タイ用
        for (let b = b0; b < b1; b++) {
          const bx = hx + (b - b0) * barW;
          const xOf = (p) => bx + 14 + (p / barTicks) * (barW - 22);
          const barAcc = {}; // 小節内の臨時記号
          const evs = part.bars[b];
          const drawn = [];
          for (const ev of evs) {
            const x = xOf(ev.pos);
            if (ev.rest) {
              drawRest(o, ev, ev.whole ? bx + barW / 2 - 5 : x, yOf);
              prevHead = null;
              continue;
            }
            const heads = ev.pitches.map((m) => {
              const sp = spell(m, kc);
              const pos = sp.dn - baseDn;
              const k = sp.dn;
              const cur = k in barAcc ? barAcc[k] : keyAcc[sp.letter];
              let accTxt = null;
              if (cur !== sp.acc) { accTxt = ACC_CH[sp.acc]; barAcc[k] = sp.acc; }
              return { pos, accTxt };
            });
            const filled = ev.base < 96;
            const hasStem = ev.base < 192;
            const avgPos = heads.reduce((a, h) => a + h.pos, 0) / heads.length;
            const up = avgPos < 4;
            for (const h of heads) {
              const y = yOf(h.pos);
              // 加線
              if (h.pos < -1) for (let lp = -2; lp >= h.pos; lp -= 2) o.push(`<line x1="${x - 8}" x2="${x + 8}" y1="${yOf(lp)}" y2="${yOf(lp)}" stroke="#222"/>`);
              if (h.pos > 9) for (let lp = 10; lp <= h.pos; lp += 2) o.push(`<line x1="${x - 8}" x2="${x + 8}" y1="${yOf(lp)}" y2="${yOf(lp)}" stroke="#222"/>`);
              o.push(`<ellipse cx="${x}" cy="${y}" rx="5.2" ry="3.7" transform="rotate(-20 ${x} ${y})" fill="${filled ? '#111' : '#fff'}" stroke="#111" stroke-width="${filled ? 0 : 1.6}"/>`);
              if (h.accTxt) o.push(`<text x="${x - 15}" y="${y + 4.5}" font-size="14" fill="#111">${h.accTxt}</text>`);
              if (ev.dot) { const dy = h.pos % 2 === 0 ? -SP / 2 : 0; o.push(`<circle cx="${x + 9}" cy="${y + dy}" r="1.7" fill="#111"/>`); }
            }
            const lo = Math.min(...heads.map((h) => h.pos));
            const hi = Math.max(...heads.map((h) => h.pos));
            const flags = ev.base <= 6 ? 3 : ev.base <= 12 ? 2 : ev.base <= 24 ? 1 : 0;
            const d = { x, up, lo, hi, flags, hasStem, ev, yOf, beatIdx: Math.floor(ev.pos / beat) };
            drawn.push(d);
            if (prevHead && prevHead.ev.tie) {
              const y = yOf(heads[0].pos) + (up ? 7 : -7);
              const x0 = prevHead.x + 6;
              const x1 = x - 6;
              const cy = y + (up ? 6 : -6);
              o.push(`<path d="M${x0} ${y} Q${(x0 + x1) / 2} ${cy} ${x1} ${y}" fill="none" stroke="#111" stroke-width="1.3"/>`);
            }
            prevHead = d;
          }
          drawStemsAndBeams(o, drawn);
          drawTriplets(o, drawn, yOf);
          // 小節線
          const ex = bx + barW;
          const isLast = b === bars - 1;
          if (isLast) {
            o.push(`<line x1="${ex - 4}" x2="${ex - 4}" y1="${st}" y2="${st + 4 * SP}" stroke="#222" stroke-width="1"/>`);
            o.push(`<line x1="${ex}" x2="${ex}" y1="${st}" y2="${st + 4 * SP}" stroke="#222" stroke-width="3"/>`);
          } else o.push(`<line x1="${ex}" x2="${ex}" y1="${st}" y2="${st + 4 * SP}" stroke="#222" stroke-width="1"/>`);
          // コードネーム
          if (pi === 0 && chords && chords[b]) o.push(`<text x="${bx + 10}" y="${st - 3.2 * SP}" font-size="13" font-weight="bold" fill="#c2410c">${esc(chords[b])}</text>`);
        }
      });
      if (prepared.length > 1) {
        const yTop = sysTop + 2 * SP;
        const yBot = sysTop + (prepared.length - 1) * staffGap + 6 * SP;
        o.push(`<line x1="${left}" x2="${left}" y1="${yTop}" y2="${yBot}" stroke="#222" stroke-width="2"/>`);
      }
    }
    o.push('</svg>');
    return o.join('');
  }

  function drawRest(o, ev, x, yOf) {
    const base = ev.whole ? 192 : ev.base;
    const c = '#111';
    if (base >= 192) o.push(`<rect x="${x - 5}" y="${yOf(6)}" width="11" height="4.5" fill="${c}"/>`);
    else if (base >= 96) o.push(`<rect x="${x - 5}" y="${yOf(4) - 4.5}" width="11" height="4.5" fill="${c}"/>`);
    else if (base >= 48) {
      const y = yOf(6);
      o.push(`<path d="M${x - 2} ${y - 2} L${x + 3} ${y + 5} L${x - 2} ${y + 11} L${x + 3} ${y + 17} Q${x - 5} ${y + 14} ${x} ${y + 22}" fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round"/>`);
    } else {
      const n = base <= 6 ? 3 : base <= 12 ? 2 : 1;
      const y = yOf(5);
      o.push(`<line x1="${x + 4}" y1="${y - 1}" x2="${x - 2}" y2="${y + 8 + n * 7}" stroke="${c}" stroke-width="1.6"/>`);
      for (let i = 0; i < n; i++) o.push(`<circle cx="${x - 2 - i * 1.5}" cy="${y + 2 + i * 7}" r="2.6" fill="${c}"/><path d="M${x - 2 - i * 1.5} ${y + 4 + i * 7} Q${x + 1} ${y + 5 + i * 7} ${x + 4 - i * 1.5} ${y - 1 + i * 7}" stroke="${c}" stroke-width="1.4" fill="none"/>`);
    }
    if (ev.dot) o.push(`<circle cx="${x + 10}" cy="${yOf(5)}" r="1.7" fill="${c}"/>`);
  }

  function stemEnd(d, len = 3.5 * SP) {
    const yHi = d.yOf(d.hi);
    const yLo = d.yOf(d.lo);
    return d.up ? yHi - len : yLo + len;
  }
  function drawStemsAndBeams(o, drawn) {
    // 同じ拍の中の旗つき音符を連桁でつなぐ
    const groups = [];
    let curG = null;
    for (const d of drawn) {
      if (d.flags > 0 && !d.ev.trip === !(curG && curG[0].ev.trip) && curG && curG[curG.length - 1].beatIdx === d.beatIdx) curG.push(d);
      else if (d.flags > 0) { curG = [d]; groups.push(curG); }
      else curG = null;
    }
    const beamed = new Set();
    for (const g of groups) {
      if (g.length < 2) continue;
      const avg = g.reduce((a, d) => a + (d.lo + d.hi) / 2, 0) / g.length;
      const up = avg < 4;
      g.forEach((d) => { d.up = up; beamed.add(d); });
      const ends = g.map((d) => stemEnd(d));
      let y = up ? Math.min(...ends) : Math.max(...ends);
      const sx = (d) => (up ? d.x + 5 : d.x - 5);
      for (const d of g) {
        const yh = up ? d.yOf(d.lo) : d.yOf(d.hi);
        o.push(`<line x1="${sx(d)}" x2="${sx(d)}" y1="${yh}" y2="${y}" stroke="#111" stroke-width="1.3"/>`);
      }
      o.push(`<line x1="${sx(g[0]) - 0.6}" x2="${sx(g[g.length - 1]) + 0.6}" y1="${y}" y2="${y}" stroke="#111" stroke-width="4"/>`);
      for (let level = 2; level <= 3; level++) {
        const yy = y + (up ? 1 : -1) * (level - 1) * 6;
        for (let i = 0; i < g.length; i++) {
          if (g[i].flags < level) continue;
          if (i + 1 < g.length && g[i + 1].flags >= level) {
            o.push(`<line x1="${sx(g[i])}" x2="${sx(g[i + 1])}" y1="${yy}" y2="${yy}" stroke="#111" stroke-width="4"/>`);
          } else if (!(i > 0 && g[i - 1].flags >= level)) {
            const dir = i === g.length - 1 ? -1 : 1;
            o.push(`<line x1="${sx(g[i])}" x2="${sx(g[i]) + dir * 7}" y1="${yy}" y2="${yy}" stroke="#111" stroke-width="4"/>`);
          }
        }
      }
    }
    for (const d of drawn) {
      if (beamed.has(d) || !d.hasStem) continue;
      const x = d.up ? d.x + 5 : d.x - 5;
      const yh = d.up ? d.yOf(d.lo) : d.yOf(d.hi);
      const ye = stemEnd(d);
      o.push(`<line x1="${x}" x2="${x}" y1="${yh}" y2="${ye}" stroke="#111" stroke-width="1.3"/>`);
      for (let i = 0; i < d.flags; i++) {
        const y = ye + (d.up ? 1 : -1) * i * 6;
        const dy = d.up ? 1 : -1;
        o.push(`<path d="M${x} ${y} q8 ${dy * 6} 6 ${dy * 15}" fill="none" stroke="#111" stroke-width="1.8"/>`);
      }
    }
  }
  function drawTriplets(o, drawn, yOf) {
    let run = [];
    const flush = () => {
      if (!run.length) return;
      const x0 = run[0].x;
      const x1 = run[run.length - 1].x;
      const y = Math.min(yOf(10), ...run.map((d) => stemEnd(d) - 6), ...run.map((d) => yOf(d.hi) - 12));
      o.push(`<text x="${(x0 + x1) / 2 + 3}" y="${y}" font-size="11" font-style="italic" text-anchor="middle" fill="#111">3</text>`);
      run = [];
    };
    for (const d of drawn) {
      if (d.ev.trip && (!run.length || d.beatIdx === run[0].beatIdx)) run.push(d);
      else { flush(); if (d.ev.trip) run.push(d); }
    }
    flush();
  }

  // 1つの音だけを小さな五線に書く（ミニディスプレイ用）
  function single(midi, key, minor) {
    const kc = keyCount(key, minor);
    const sp = spell(midi, kc);
    const clef = midi < 57 ? 'bass' : 'treble';
    const pos = sp.dn - (clef === 'treble' ? 30 : 18);
    const W = 92;
    const H = 64;
    const st = 18;
    const yOf = (p) => st + (8 - p) * (SP / 2) * 0.85;
    const s = 0.85;
    const o = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`];
    for (let i = 0; i < 5; i++) o.push(`<line x1="2" x2="${W - 2}" y1="${st + i * SP * s}" y2="${st + i * SP * s}" stroke="currentColor" stroke-width="0.8"/>`);
    if (clef === 'treble') o.push(`<text x="3" y="${st + 3.1 * SP * s}" font-size="${4.4 * SP * s}" font-family='${FONT}' fill="currentColor">𝄞</text>`);
    else o.push(`<text x="4" y="${st + 2.6 * SP * s}" font-size="${3.4 * SP * s}" font-family='${FONT}' fill="currentColor">𝄢</text>`);
    const x = 60;
    const y = yOf(pos);
    if (pos < -1) for (let lp = -2; lp >= pos; lp -= 2) o.push(`<line x1="${x - 8}" x2="${x + 8}" y1="${yOf(lp)}" y2="${yOf(lp)}" stroke="currentColor"/>`);
    if (pos > 9) for (let lp = 10; lp <= pos; lp += 2) o.push(`<line x1="${x - 8}" x2="${x + 8}" y1="${yOf(lp)}" y2="${yOf(lp)}" stroke="currentColor"/>`);
    o.push(`<ellipse cx="${x}" cy="${y}" rx="4.6" ry="3.3" transform="rotate(-20 ${x} ${y})" fill="currentColor"/>`);
    if (sp.acc) o.push(`<text x="${x - 14}" y="${y + 4}" font-size="13" fill="currentColor">${ACC_CH[sp.acc]}</text>`);
    o.push('</svg>');
    return o.join('');
  }

  return { render, single, keyCount };
})();
