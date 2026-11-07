'use strict';
/* ============================================================
   楽譜（五線譜）を作る部分
   打ち込んだ音（ノート）を、音符・休符・調号・拍子記号・歌詞・階名のある
   五線譜（SVG画像）に変換します。MusicXML書き出しにも同じ計算を使います。
   時間の単位：4分音符 = 48 ティック
   ============================================================ */
const Notation = (() => {
  const FONT = `"Noto Music","Bravura","Segoe UI Symbol","Apple Symbols","Noto Sans Symbols 2",serif`;
  const KEYSIG = { 0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 5: -1, 10: -2, 3: -3, 8: -4, 1: -5 };
  const SHARP_SP = { l: [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6], a: [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0] };
  const FLAT_SP = { l: [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6], a: [0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1, 0] };
  const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6];
  const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3];
  const ACC_CH = { 1: '♯', '-1': '♭', 0: '♮' };
  const TYPE_NAME = { 192: 'whole', 96: 'half', 48: 'quarter', 24: 'eighth', 12: '16th', 6: '32nd' };

  // 音符の長さ（ティック）：[長さ, 基本の長さ, 付点, 3連符]
  const VALUES = [
    [192, 192, 0, 0], [144, 96, 1, 0], [96, 96, 0, 0], [72, 48, 1, 0], [48, 48, 0, 0],
    [36, 24, 1, 0], [24, 24, 0, 0], [18, 12, 1, 0], [12, 12, 0, 0], [6, 6, 0, 0],
    [32, 48, 0, 1], [16, 24, 0, 1], [8, 12, 0, 1],
  ];

  const keyCount = (key, minor) => KEYSIG[minor ? (key + 3) % 12 : key];
  function spell(midi, kc) {
    const pc = ((midi % 12) + 12) % 12;
    const t = kc >= 0 ? SHARP_SP : FLAT_SP;
    const letter = t.l[pc];
    const acc = t.a[pc];
    const oct = Math.floor(midi / 12) - 1;
    return { letter, acc, oct, dn: oct * 7 + letter, step: 'CDEFGAB'[letter] };
  }
  function keyAccOf(kc) {
    const a = [0, 0, 0, 0, 0, 0, 0];
    if (kc > 0) for (let i = 0; i < kc; i++) a[SHARP_ORDER[i]] = 1;
    if (kc < 0) for (let i = 0; i < -kc; i++) a[FLAT_ORDER[i]] = -1;
    return a;
  }
  const beatOf = (meter) => (meter[1] === 8 && meter[0] % 3 === 0 && meter[0] > 3 ? 72 : 192 / meter[1]);

  function decompose(pos, len, beat) {
    const out = [];
    let guard = 0;
    while (len > 0 && guard++ < 64) {
      let chosen = null;
      for (const v of VALUES) {
        if (v[0] > len) continue;
        if (v[3]) { if (pos % v[0] !== 0) continue; } else if (pos % Math.min(v[1], beat) !== 0) continue;
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

  // ノートの列 → 小節ごとの「音符/休符」イベント（タイ・歌詞の位置つき）
  function buildEvents(notes, bars, barTicks, beat) {
    const total = bars * barTicks;
    const groups = new Map();
    for (const n of notes) {
      if (n.s >= total) continue;
      if (!groups.has(n.s)) groups.set(n.s, []);
      groups.get(n.s).push(n);
    }
    const starts = [...groups.keys()].sort((a, b) => a - b);
    const segs = [];
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
    let syll = 0;
    for (const sg of segs) {
      let s = sg.s;
      let first = true;
      while (s < sg.e) {
        const b = Math.floor(s / barTicks);
        const be = Math.min(sg.e, (b + 1) * barTicks);
        const isRest = !sg.pitches;
        if (isRest && s === b * barTicks && be === (b + 1) * barTicks) {
          perBar[b].push({ pos: 0, len: barTicks, rest: true, whole: true, base: 192 });
        } else {
          decompose(s - b * barTicks, be - s, beat).forEach((p) => {
            const ev = { ...p, rest: isRest, pitches: sg.pitches };
            if (!isRest && first) { ev.first = true; ev.syll = syll++; first = false; }
            perBar[b].push(ev);
          });
        }
        s = be;
      }
    }
    const flat = perBar.flat();
    for (let i = 0; i < flat.length - 1; i++) {
      const a = flat[i];
      const b = flat[i + 1];
      if (!a.rest && !b.rest && a.pitches === b.pitches) { a.tie = true; b.tieEnd = true; }
    }
    return perBar;
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  /* opts:
     parts: [{ name, notes, clef:'auto'|'treble'|'bass', lyrics:[...], perc:false }]
     bars, barTicks, meter, key, minor, title, bpm, chords, width
     meta: { subtitle, lyricist, composer }, nameOf: 音名をふる関数(なければふらない),
     perLine: 1段の小節数（0＝自動）, scale: 大きさ */
  function render(opts) {
    const { parts, bars, barTicks, meter, key, minor, title, bpm, chords, nameOf } = opts;
    const meta = opts.meta || {};
    const scale = opts.scale || 1;
    const OUTW = opts.width || 780;
    const width = OUTW / scale;
    const SP = 8;
    const kc = keyCount(key, minor);
    const keyAcc = keyAccOf(kc);
    const beat = beatOf(meter);
    const prepared = parts.map((p) => {
      let clef = p.clef || 'auto';
      if (p.perc) clef = 'perc';
      else if (clef === 'auto') { const avg = p.notes.length ? p.notes.reduce((a, n) => a + n.p, 0) / p.notes.length : 67; clef = avg < 57 ? 'bass' : 'treble'; }
      const lyr = p.lyrics || [];
      const hasLyr = lyr.some(Boolean);
      return { ...p, clef, lyrics: lyr, hasLyr, bars: buildEvents(p.notes, bars, barTicks, beat) };
    });
    const left = 16;
    const ksW = Math.abs(kc) * 8;
    const headW = 34 + ksW + 24;
    const maxDensity = Math.max(1, ...prepared.flatMap((p) => p.bars.map((b) => b.length)));
    const minBarW = Math.max(110, maxDensity * 24 + 28);
    let perLine = opts.perLine || Math.max(1, Math.min(6, Math.floor((width - left - headW - 12) / minBarW)));
    perLine = Math.min(perLine, bars);
    const chordRow = chords && chords.some(Boolean) ? 18 : 0;
    const staffH = (p) => (p.clef === 'perc' ? 7 : 10) * SP + (nameOf && !p.perc ? 16 : 0) + (p.hasLyr ? 18 : 0);
    const systemH = chordRow + prepared.reduce((a, p) => a + staffH(p), 0) + 14;
    const lines = Math.ceil(bars / perLine);
    const top = 64 + (meta.subtitle ? 18 : 0);
    const height = top + lines * systemH + 20;
    const o = [];
    o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${OUTW}" height="${height * scale}" viewBox="0 0 ${width} ${height}" font-family="sans-serif">`);
    o.push(`<rect width="100%" height="100%" fill="#fff"/>`);
    o.push(`<text x="${width / 2}" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="#111">${esc(title)}</text>`);
    if (meta.subtitle) o.push(`<text x="${width / 2}" y="50" text-anchor="middle" font-size="13" fill="#333">${esc(meta.subtitle)}</text>`);
    const credits = [meta.lyricist ? '作詞：' + meta.lyricist : '', meta.composer ? '作曲：' + meta.composer : ''].filter(Boolean);
    credits.forEach((c, i) => o.push(`<text x="${width - 16}" y="${top - 22 + i * 15}" text-anchor="end" font-size="12" fill="#222">${esc(c)}</text>`));
    o.push(`<text x="${left}" y="${top - 10}" font-size="13" fill="#111">♩ = ${bpm}</text>`);

    for (let line = 0; line < lines; line++) {
      const b0 = line * perLine;
      const b1 = Math.min(bars, b0 + perLine);
      const sysTop = top + line * systemH + chordRow;
      const hx = left + 34 + ksW + (line === 0 ? 22 : 4);
      const barW = (width - hx - 12) / perLine;
      o.push(`<text x="${left}" y="${sysTop - 2}" font-size="10" fill="#666">${b0 + 1}</text>`);
      let yAcc = sysTop;
      const staffTops = [];
      prepared.forEach((part, pi) => {
        const st = yAcc + 2 * SP;
        staffTops.push(st);
        yAcc += staffH(part);
        const perc = part.clef === 'perc';
        const yOf = (pos) => st + (8 - pos) * (SP / 2);
        const baseDn = part.clef === 'treble' ? 30 : 18;
        const xEnd = hx + barW * (b1 - b0);
        if (perc) o.push(`<line x1="${left}" x2="${xEnd}" y1="${yOf(4)}" y2="${yOf(4)}" stroke="#222"/>`);
        else for (let i = 0; i < 5; i++) o.push(`<line x1="${left}" x2="${xEnd}" y1="${st + i * SP}" y2="${st + i * SP}" stroke="#222" stroke-width="1"/>`);
        if (prepared.length > 1 && line === 0) o.push(`<text x="${left}" y="${st - 7}" font-size="10" fill="#555">${esc(part.name)}</text>`);
        if (perc) o.push(`<rect x="${left + 8}" y="${yOf(6)}" width="3" height="${SP * 2}" fill="#111"/><rect x="${left + 14}" y="${yOf(6)}" width="3" height="${SP * 2}" fill="#111"/>`);
        else if (part.clef === 'treble') o.push(`<text x="${left + 2}" y="${st + 3.1 * SP}" font-size="${4.4 * SP}" font-family='${FONT}' fill="#111">𝄞</text>`);
        else o.push(`<text x="${left + 3}" y="${st + 2.6 * SP}" font-size="${3.4 * SP}" font-family='${FONT}' fill="#111">𝄢</text>`);
        if (!perc) for (let i = 0; i < Math.abs(kc); i++) {
          let pos = (kc >= 0 ? [8, 5, 9, 6, 3, 7, 4] : [4, 7, 3, 6, 2, 5, 1])[i];
          if (part.clef === 'bass') pos -= 2;
          o.push(`<text x="${left + 34 + i * 8}" y="${yOf(pos) + (kc >= 0 ? 4 : 3)}" font-size="15" fill="#111">${kc >= 0 ? '♯' : '♭'}</text>`);
        }
        if (line === 0) {
          const tx = left + 36 + ksW;
          o.push(`<text x="${tx + 6}" y="${st + 1.9 * SP}" font-size="${2.2 * SP}" font-weight="bold" font-family="serif" text-anchor="middle" fill="#111">${meter[0]}</text>`);
          o.push(`<text x="${tx + 6}" y="${st + 3.9 * SP}" font-size="${2.2 * SP}" font-weight="bold" font-family="serif" text-anchor="middle" fill="#111">${meter[1]}</text>`);
        }
        const textY = st + 4 * SP + 2.6 * SP;
        let prevHead = null;
        for (let b = b0; b < b1; b++) {
          const bx = hx + (b - b0) * barW;
          const xOf = (p) => bx + 14 + (p / barTicks) * (barW - 22);
          const barAcc = {};
          const drawn = [];
          for (const ev of part.bars[b]) {
            const x = xOf(ev.pos);
            if (ev.rest) { drawRest(o, ev, ev.whole ? bx + barW / 2 - 5 : x, yOf); prevHead = null; continue; }
            const heads = perc ? [{ pos: 4, accTxt: null }] : ev.pitches.map((m) => {
              const sp = spell(m, kc);
              const pos = sp.dn - baseDn;
              const cur = sp.dn in barAcc ? barAcc[sp.dn] : keyAcc[sp.letter];
              let accTxt = null;
              if (cur !== sp.acc) { accTxt = ACC_CH[sp.acc]; barAcc[sp.dn] = sp.acc; }
              return { pos, accTxt };
            });
            const filled = ev.base < 96;
            const avgPos = heads.reduce((a, h) => a + h.pos, 0) / heads.length;
            const up = perc ? true : avgPos < 4;
            for (const h of heads) {
              const y = yOf(h.pos);
              if (!perc) {
                if (h.pos < -1) for (let lp = -2; lp >= h.pos; lp -= 2) o.push(`<line x1="${x - 8}" x2="${x + 8}" y1="${yOf(lp)}" y2="${yOf(lp)}" stroke="#222"/>`);
                if (h.pos > 9) for (let lp = 10; lp <= h.pos; lp += 2) o.push(`<line x1="${x - 8}" x2="${x + 8}" y1="${yOf(lp)}" y2="${yOf(lp)}" stroke="#222"/>`);
              }
              if (perc) o.push(`<path d="M${x - 4} ${y - 4} L${x + 4} ${y + 4} M${x - 4} ${y + 4} L${x + 4} ${y - 4}" stroke="#111" stroke-width="1.8"/>`);
              else o.push(`<ellipse cx="${x}" cy="${y}" rx="5.2" ry="3.7" transform="rotate(-20 ${x} ${y})" fill="${filled ? '#111' : '#fff'}" stroke="#111" stroke-width="${filled ? 0 : 1.6}"/>`);
              if (h.accTxt) o.push(`<text x="${x - 15}" y="${y + 4.5}" font-size="14" fill="#111">${h.accTxt}</text>`);
              if (ev.dot) { const dy = h.pos % 2 === 0 ? -SP / 2 : 0; o.push(`<circle cx="${x + 9}" cy="${y + dy}" r="1.7" fill="#111"/>`); }
            }
            // 階名・歌詞
            if (!perc && nameOf && ev.first) o.push(`<text x="${x}" y="${textY}" font-size="10" text-anchor="middle" fill="#2b6cb0">${esc(ev.pitches.map(nameOf).reverse().join('・'))}</text>`);
            if (part.hasLyr && ev.first && part.lyrics[ev.syll]) o.push(`<text x="${x}" y="${textY + (nameOf && !perc ? 16 : 0)}" font-size="12" text-anchor="middle" fill="#111">${esc(part.lyrics[ev.syll])}</text>`);
            const lo = Math.min(...heads.map((h) => h.pos));
            const hi = Math.max(...heads.map((h) => h.pos));
            const flags = ev.base <= 6 ? 3 : ev.base <= 12 ? 2 : ev.base <= 24 ? 1 : 0;
            const d = { x, up, lo, hi, flags, hasStem: ev.base < 192, ev, yOf, beatIdx: Math.floor(ev.pos / beat) };
            drawn.push(d);
            if (prevHead && prevHead.ev.tie) {
              const y = yOf(heads[0].pos) + (up ? 7 : -7);
              const x0 = prevHead.x + 6;
              const x1 = x - 6;
              o.push(`<path d="M${x0} ${y} Q${(x0 + x1) / 2} ${y + (up ? 6 : -6)} ${x1} ${y}" fill="none" stroke="#111" stroke-width="1.3"/>`);
            }
            prevHead = d;
          }
          drawStemsAndBeams(o, drawn, SP);
          drawTriplets(o, drawn, yOf, SP);
          const ex = bx + barW;
          const yTopL = perc ? yOf(6) : st;
          const yBotL = perc ? yOf(2) : st + 4 * SP;
          if (b === bars - 1) {
            o.push(`<line x1="${ex - 4}" x2="${ex - 4}" y1="${yTopL}" y2="${yBotL}" stroke="#222"/>`);
            o.push(`<line x1="${ex}" x2="${ex}" y1="${yTopL}" y2="${yBotL}" stroke="#222" stroke-width="3"/>`);
          } else o.push(`<line x1="${ex}" x2="${ex}" y1="${yTopL}" y2="${yBotL}" stroke="#222"/>`);
          if (pi === 0 && chords && chords[b]) o.push(`<text x="${bx + 10}" y="${st - 3.2 * SP}" font-size="13" font-weight="bold" fill="#c2410c">${esc(chords[b])}</text>`);
        }
      });
      if (prepared.length > 1) o.push(`<line x1="${left}" x2="${left}" y1="${staffTops[0]}" y2="${staffTops[staffTops.length - 1] + 4 * SP}" stroke="#222" stroke-width="2"/>`);
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
  function stemEnd(d, SP) {
    const len = 3.5 * SP;
    return d.up ? d.yOf(d.hi) - len : d.yOf(d.lo) + len;
  }
  function drawStemsAndBeams(o, drawn, SP) {
    const groups = [];
    let curG = null;
    for (const d of drawn) {
      if (d.flags > 0 && curG && curG[curG.length - 1].beatIdx === d.beatIdx && !!curG[0].ev.trip === !!d.ev.trip) curG.push(d);
      else if (d.flags > 0) { curG = [d]; groups.push(curG); } else curG = null;
    }
    const beamed = new Set();
    for (const g of groups) {
      if (g.length < 2) continue;
      const avg = g.reduce((a, d) => a + (d.lo + d.hi) / 2, 0) / g.length;
      const up = g[0].lo === 4 && g[0].hi === 4 && g.every((d) => d.lo === 4) ? true : avg < 4;
      g.forEach((d) => { d.up = up; beamed.add(d); });
      const ends = g.map((d) => stemEnd(d, SP));
      const y = up ? Math.min(...ends) : Math.max(...ends);
      const sx = (d) => (up ? d.x + 5 : d.x - 5);
      for (const d of g) o.push(`<line x1="${sx(d)}" x2="${sx(d)}" y1="${up ? d.yOf(d.lo) : d.yOf(d.hi)}" y2="${y}" stroke="#111" stroke-width="1.3"/>`);
      o.push(`<line x1="${sx(g[0]) - 0.6}" x2="${sx(g[g.length - 1]) + 0.6}" y1="${y}" y2="${y}" stroke="#111" stroke-width="4"/>`);
      for (let level = 2; level <= 3; level++) {
        const yy = y + (up ? 1 : -1) * (level - 1) * 6;
        for (let i = 0; i < g.length; i++) {
          if (g[i].flags < level) continue;
          if (i + 1 < g.length && g[i + 1].flags >= level) o.push(`<line x1="${sx(g[i])}" x2="${sx(g[i + 1])}" y1="${yy}" y2="${yy}" stroke="#111" stroke-width="4"/>`);
          else if (!(i > 0 && g[i - 1].flags >= level)) { const dir = i === g.length - 1 ? -1 : 1; o.push(`<line x1="${sx(g[i])}" x2="${sx(g[i]) + dir * 7}" y1="${yy}" y2="${yy}" stroke="#111" stroke-width="4"/>`); }
        }
      }
    }
    for (const d of drawn) {
      if (beamed.has(d) || !d.hasStem) continue;
      const x = d.up ? d.x + 5 : d.x - 5;
      const ye = stemEnd(d, SP);
      o.push(`<line x1="${x}" x2="${x}" y1="${d.up ? d.yOf(d.lo) : d.yOf(d.hi)}" y2="${ye}" stroke="#111" stroke-width="1.3"/>`);
      for (let i = 0; i < d.flags; i++) {
        const y = ye + (d.up ? 1 : -1) * i * 6;
        o.push(`<path d="M${x} ${y} q8 ${(d.up ? 1 : -1) * 6} 6 ${(d.up ? 1 : -1) * 15}" fill="none" stroke="#111" stroke-width="1.8"/>`);
      }
    }
  }
  function drawTriplets(o, drawn, yOf, SP) {
    let run = [];
    const flush = () => {
      if (!run.length) return;
      const x0 = run[0].x;
      const x1 = run[run.length - 1].x;
      const y = Math.min(yOf(10), ...run.map((d) => stemEnd(d, SP) - 6), ...run.map((d) => yOf(d.hi) - 12));
      o.push(`<text x="${(x0 + x1) / 2 + 3}" y="${y}" font-size="11" font-style="italic" text-anchor="middle" fill="#111">3</text>`);
      run = [];
    };
    for (const d of drawn) {
      if (d.ev.trip && (!run.length || d.beatIdx === run[0].beatIdx)) run.push(d);
      else { flush(); if (d.ev.trip) run.push(d); }
    }
    flush();
  }

  function single(midi, key, minor) {
    const SP = 8;
    const kc = keyCount(key, minor);
    const sp = spell(midi, kc);
    const clef = midi < 57 ? 'bass' : 'treble';
    const pos = sp.dn - (clef === 'treble' ? 30 : 18);
    const W = 92;
    const H = 64;
    const st = 18;
    const s = 0.85;
    const yOf = (p) => st + (8 - p) * (SP / 2) * s;
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

  // 歌詞の文字列 → 1音ずつの文字（小さい「ゃゅょっ」などは前の文字といっしょ）
  function splitLyrics(text) {
    if (!text) return [];
    // 英語などはスペースで区切った単語ごと、日本語は1文字ごと（スペース・改行は読みやすくするための区切り）
    // 1つの音に2文字以上入れたいときは ( ) でかこむ　れい：(ちょっ)と
    const out = [];
    const re = /\(([^)]*)\)|[A-Za-z0-9'’,.!?-]+|\S/g;
    let m;
    while ((m = re.exec(text))) {
      const tok = m[1] != null ? m[1] : m[0];
      if (m[1] == null && /^[ゃゅょぁぃぅぇぉっャュョァィゥェォッ゛゜]$/.test(tok) && out.length) out[out.length - 1] += tok;
      else out.push(tok);
    }
    return out;
  }

  // MusicXML（楽譜ソフト用のファイル）を作る
  function musicXML(opts) {
    const { parts, bars, barTicks, meter, key, minor, title, bpm, chords, meta = {} } = opts;
    const kc = keyCount(key, minor);
    const beat = beatOf(meter);
    const x = [];
    x.push('<?xml version="1.0" encoding="UTF-8" standalone="no"?>');
    x.push('<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">');
    x.push('<score-partwise version="3.1">');
    x.push(`<work><work-title>${esc(title)}</work-title></work>`);
    x.push('<identification>');
    if (meta.composer) x.push(`<creator type="composer">${esc(meta.composer)}</creator>`);
    if (meta.lyricist) x.push(`<creator type="lyricist">${esc(meta.lyricist)}</creator>`);
    x.push('<encoding><software>おとつみき</software></encoding></identification>');
    x.push('<part-list>');
    parts.forEach((p, i) => x.push(`<score-part id="P${i + 1}"><part-name>${esc(p.name)}</part-name></score-part>`));
    x.push('</part-list>');
    const HK = { M: 'major', m: 'minor', 7: 'dominant', M7: 'major-seventh', m7: 'minor-seventh', sus4: 'suspended-fourth', dim: 'diminished', aug: 'augmented' };
    parts.forEach((p, pi) => {
      let clef = p.clef || 'auto';
      if (p.perc) clef = 'perc';
      else if (clef === 'auto') { const avg = p.notes.length ? p.notes.reduce((a, n) => a + n.p, 0) / p.notes.length : 67; clef = avg < 57 ? 'bass' : 'treble'; }
      const evBars = buildEvents(p.notes, bars, barTicks, beat);
      const lyr = p.lyrics || [];
      x.push(`<part id="P${pi + 1}">`);
      for (let b = 0; b < bars; b++) {
        x.push(`<measure number="${b + 1}">`);
        if (b === 0) {
          x.push('<attributes><divisions>48</divisions>');
          if (clef !== 'perc') x.push(`<key><fifths>${kc}</fifths><mode>${minor ? 'minor' : 'major'}</mode></key>`);
          x.push(`<time><beats>${meter[0]}</beats><beat-type>${meter[1]}</beat-type></time>`);
          x.push(clef === 'perc' ? '<clef><sign>percussion</sign></clef>' : clef === 'bass' ? '<clef><sign>F</sign><line>4</line></clef>' : '<clef><sign>G</sign><line>2</line></clef>');
          x.push('</attributes>');
          if (pi === 0) x.push(`<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${bpm}</per-minute></metronome></direction-type><sound tempo="${bpm}"/></direction>`);
        }
        if (pi === 0 && chords && chords[b]) {
          const c = chords[b];
          const sp = spell(c.r + 60, kc);
          x.push(`<harmony><root><root-step>${sp.step}</root-step>${sp.acc ? `<root-alter>${sp.acc}</root-alter>` : ''}</root><kind>${HK[c.q] || 'major'}</kind></harmony>`);
        }
        for (const ev of evBars[b]) {
          const typeXml = (e) => `<type>${TYPE_NAME[e.base] || 'whole'}</type>${e.dot ? '<dot/>' : ''}${e.trip ? '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>' : ''}`;
          if (ev.rest) { x.push(`<note><rest${ev.whole ? ' measure="yes"' : ''}/><duration>${ev.len}</duration>${ev.whole ? '' : typeXml(ev)}</note>`); continue; }
          const ps = p.perc ? [null] : ev.pitches;
          ps.forEach((m, k) => {
            let pitch = '<unpitched><display-step>C</display-step><display-octave>5</display-octave></unpitched>';
            if (m != null) { const sp = spell(m, kc); pitch = `<pitch><step>${sp.step}</step>${sp.acc ? `<alter>${sp.acc}</alter>` : ''}<octave>${sp.oct}</octave></pitch>`; }
            const ties = (ev.tieEnd ? '<tie type="stop"/>' : '') + (ev.tie ? '<tie type="start"/>' : '');
            const tied = (ev.tieEnd ? '<tied type="stop"/>' : '') + (ev.tie ? '<tied type="start"/>' : '');
            const lyric = k === 0 && ev.first && lyr[ev.syll] ? `<lyric number="1"><syllabic>single</syllabic><text>${esc(lyr[ev.syll])}</text></lyric>` : '';
            x.push(`<note>${k > 0 ? '<chord/>' : ''}${pitch}<duration>${ev.len}</duration>${ties}${typeXml(ev)}${p.perc ? '<notehead>x</notehead>' : ''}${tied ? `<notations>${tied}</notations>` : ''}${lyric}</note>`);
          });
        }
        if (b === bars - 1) x.push('<barline location="right"><bar-style>light-heavy</bar-style></barline>');
        x.push('</measure>');
      }
      x.push('</part>');
    });
    x.push('</score-partwise>');
    return x.join('\n');
  }

  return { render, single, keyCount, buildEvents, spell, splitLyrics, musicXML };
})();
