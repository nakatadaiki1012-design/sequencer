'use strict';
/* ============================================================
   楽譜（五線譜）エンジン
   打ち込んだ音（ノート）を清書した五線譜（SVG）にします。
   - 調号・臨時記号（前後の流れで ♯/♭ を決める）・連桁（かたむき付き）・タイ・3連符
   - アーティキュレーション・強弱記号・クレッシェンド・スラー・フェルマータ
   - くり返し記号・1番/2番かっこ・弱起・大譜表・打楽器譜・移調楽器・歌詞・階名
   - 楽譜の上で編集するための「位置の地図」（layout）も作ります
   時間の単位：4分音符 = 48 ティック
   ============================================================ */
const Notation = (() => {
  const FONT = `"Noto Music","Bravura","Segoe UI Symbol","Apple Symbols","Noto Sans Symbols 2",serif`;
  const SP = 8; // 五線の間隔
  const KEYSIG = { 0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 5: -1, 10: -2, 3: -3, 8: -4, 1: -5 };
  const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6];
  const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3];
  const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
  const ACC_CH = { 1: '♯', '-1': '♭', 0: '♮', 2: '𝄪', '-2': '𝄫' };
  const TYPE_NAME = { 192: 'whole', 96: 'half', 48: 'quarter', 24: 'eighth', 12: '16th', 6: '32nd' };
  const VALUES = [
    [192, 192, 0, 0], [144, 96, 1, 0], [96, 96, 0, 0], [72, 48, 1, 0], [48, 48, 0, 0],
    [36, 24, 1, 0], [24, 24, 0, 0], [18, 12, 1, 0], [12, 12, 0, 0], [6, 6, 0, 0],
    [32, 48, 0, 1], [16, 24, 0, 1], [8, 12, 0, 1],
  ];
  // 打楽器の五線上の位置（0＝第1線）と符頭
  const DRUM_POS = {
    kick: [1, 'n'], kick808: [1, 'n'], odaiko: [1, 'n'], chodaiko: [1, 'n'], taiko: [1, 'n'],
    tomL: [3, 'n'], okedo: [3, 'n'], tomE: [3, 'n'], congaL: [3, 'n'], bongoL: [3, 'n'],
    snare: [5, 'n'], kodaiko: [5, 'n'], snareE: [5, 'n'], shime: [5, 'n'], roll: [5, 'n'],
    tomH: [6, 'n'], congaH: [6, 'n'], congaM: [6, 'x'], bongoH: [6, 'n'], otsuzumi: [6, 'n'], kotsuzumi: [6, 'n'],
    clap: [4, 'x'], clapE: [4, 'x'], fuchi: [5, 'x'], hyoshigi: [7, 'x'], clave: [7, 'x'], castanet: [7, 'x'], woodH: [8, 'n'], woodL: [7, 'n'],
    hihat: [9, 'x'], hihatE: [9, 'x'], ohat: [9, 'o'], ohatE: [9, 'o'], ride: [8, 'x'], crash: [10, 'x'], crashE: [10, 'x'], awase: [10, 'x'], cymbal: [10, 'x'],
    tamb: [7, 'x'], maracas: [8, 'x'], shaker: [8, 'x'], guiro: [7, 'x'], cowbell: [7, 'x'], agogoH: [9, 'n'], agogoL: [8, 'n'],
    triangle: [10, 'x'], triMute: [10, 'x'], suzu: [9, 'x'], kane: [9, 'x'], gong: [10, 'x'],
  };

  const keyCount = (key, minor) => KEYSIG[(((minor ? key + 3 : key) % 12) + 12) % 12];
  const beatOf = (meter) => (meter[1] === 8 && meter[0] % 3 === 0 && meter[0] > 3 ? 72 : 192 / meter[1]);
  function keyAccOf(kc) {
    const a = [0, 0, 0, 0, 0, 0, 0];
    if (kc > 0) for (let i = 0; i < kc; i++) a[SHARP_ORDER[i]] = 1;
    if (kc < 0) for (let i = 0; i < -kc; i++) a[FLAT_ORDER[i]] = -1;
    return a;
  }
  // 音の高さ → 音名（letter 0=C..6=B）と臨時記号。pref: +1=♯で書きたい, -1=♭で書きたい, 0=調に合わせる
  function spellPref(midi, kc, pref) {
    const pc = ((midi % 12) + 12) % 12;
    const keyAcc = keyAccOf(kc);
    // 調の中の音ならそのまま
    for (let l = 0; l < 7; l++) if ((LETTER_PC[l] + keyAcc[l] + 12) % 12 === pc) return mk(midi, l, keyAcc[l]);
    const want = pref || (kc < 0 ? -1 : 1);
    for (const acc of [0, want, -want]) {
      for (let l = 0; l < 7; l++) if ((LETTER_PC[l] + acc + 12) % 12 === pc) return mk(midi, l, acc);
    }
    return mk(midi, 0, 0);
  }
  function mk(midi, letter, acc) {
    const oct = Math.floor((midi - acc - LETTER_PC[letter]) / 12) - 1;
    return { letter, acc, oct, dn: oct * 7 + letter, step: 'CDEFGAB'[letter] };
  }
  const spell = (midi, kc) => spellPref(midi, kc, 0);

  // 長さを読みやすい音符の組み合わせに分ける（拍や小節のまん中をかくさない）
  function decompose(pos, len, beat, barTicks, meter) {
    const out = [];
    const mid = meter[0] === 4 && meter[1] === 4 ? 96 : 0;
    let guard = 0;
    while (len > 0 && guard++ < 64) {
      let chosen = null;
      for (const v of VALUES) {
        if (v[0] > len) continue;
        if (v[3]) { if (pos % v[0] !== 0) continue; } else if (pos % Math.min(v[1], beat) !== 0) continue;
        // 4/4拍子では、小節の頭から始まる音・2分音符以上で拍の頭から始まる音以外は、まん中（3拍目）をまたがない
        if (mid && pos < mid && pos + v[0] > mid && pos !== 0 && !(v[1] >= 96 && pos % 48 === 0)) continue;
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

  // ノートの列 → 小節ごとの「音符/休符」（タイ・歌詞・アーティキュレーションつき）
  function buildEvents(notes, bars, barTicks, beat, meter) {
    meter = meter || [4, 4];
    const total = bars * barTicks;
    const groups = new Map();
    for (const n of notes) {
      if (n.s >= total || n.s < 0) continue;
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
      const art = [...new Set(g.flatMap((n) => n.art || []))];
      const ly = (g.find((n) => n.ly) || {}).ly || '';
      segs.push({ s, e: end, pitches: [...new Set(g.map((n) => n.p))].sort((a, b) => a - b), art, ly, src: s });
      t = Math.max(t, end);
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
          perBar[b].push({ pos: 0, len: barTicks, rest: true, whole: true, base: 192, abs: s });
        } else {
          decompose(s - b * barTicks, be - s, beat, barTicks, meter).forEach((p) => {
            const ev = { ...p, rest: isRest, pitches: sg.pitches, abs: b * barTicks + p.pos, src: sg.src, srcEnd: sg.e };
            if (!isRest && first) { ev.first = true; ev.syll = syll++; ev.art = sg.art; ev.ly = sg.ly; first = false; }
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
  const spaceFor = (d) => 11 + 9 * Math.log2(Math.max(d, 4) / 6);

  /* ------------------------------------------------------------
     render(opts) → SVG文字列（Notation.lastLayout に位置の地図）
     opts.parts: [{ id, name, notes, clef:'auto'|'treble'|'bass'|'grand', perc:bool(打楽器), transpose(半音),
                   lyrics(配列, 音にlyがないとき), dyn, hairpins, slurs }]
     ほか: bars, barTicks, meter, key, minor, title, bpm, tempoText, chords, meta, nameOf,
          perLine, scale, width, pickup, repeats, edit: { part, cursor, sel:Set('s:p'), grid }
     ------------------------------------------------------------ */
  function render(opts) {
    const { parts, bars, barTicks, meter, key, minor, title, bpm, chords, nameOf } = opts;
    const meta = opts.meta || {};
    const scale = opts.scale || 1;
    const OUTW = opts.width || 780;
    const width = OUTW / scale;
    const beat = beatOf(meter);
    const pickup = opts.pickup > 0 && opts.pickup < barTicks ? opts.pickup : 0;
    const rep = opts.repeats || { start: [], end: [], volta: {} };
    const edit = opts.edit || null;

    // ---- 段（五線）を用意する（大譜表は2段） ----
    const staves = [];
    parts.forEach((p, pi) => {
      const tr = p.transpose || 0;
      const kc = keyCount(key + tr, minor);
      const notes = tr ? p.notes.map((n) => ({ ...n, p: n.p + tr })) : p.notes;
      const common = { pi, part: p, kc, tr, lyrics: p.lyrics || [] };
      if (p.perc) {
        const pn = p.notes.map((n) => ({ ...n, p: 1000 + (DRUM_POS[n.id] || [5, 'n'])[0] * 10 + ((DRUM_POS[n.id] || [5, 'n'])[1] === 'x' ? 1 : (DRUM_POS[n.id] || [5, 'n'])[1] === 'o' ? 2 : 0) }));
        staves.push({ ...common, clef: 'perc', notes: pn, sub: 0, kc: 0 });
        return;
      }
      let clef = p.clef || 'auto';
      if (clef === 'grand') {
        staves.push({ ...common, clef: 'treble', notes: notes.filter((n) => n.p >= 60), sub: 0, grand: true });
        staves.push({ ...common, clef: 'bass', notes: notes.filter((n) => n.p < 60), sub: 1, grand: true, lyrics: [] });
        return;
      }
      if (clef === 'auto') { const avg = notes.length ? notes.reduce((a, n) => a + n.p, 0) / notes.length : 67; clef = avg < 57 ? 'bass' : 'treble'; }
      staves.push({ ...common, clef, notes, sub: 0 });
    });
    for (const st of staves) {
      st.bars = buildEvents(st.notes, bars, barTicks, beat, meter);
      st.baseDn = st.clef === 'treble' ? 30 : st.clef === 'bass' ? 18 : 30;
      st.hasLyr = st.sub === 0 && (st.notes.some((n) => n.ly) || st.lyrics.some(Boolean));
      st.hasDyn = st.sub === (st.grand ? 1 : 0) && ((st.part.dyn || []).length || (st.part.hairpins || []).length);
    }

    // ---- 小節ごとの「音の始まる位置」と自然な幅 ----
    const barStartTick = (b) => (b === 0 && pickup ? barTicks - pickup : 0);
    const barInfo = [];
    for (let b = 0; b < bars; b++) {
      const set = new Set([barStartTick(b), barTicks]);
      let accRoom = 0;
      for (const st of staves) for (const ev of st.bars[b]) if (ev.pos >= barStartTick(b)) { set.add(ev.pos); if (ev.pitches && ev.pos === barStartTick(b)) accRoom = 8; }
      if (edit && edit.cursor != null && Math.floor(edit.cursor / barTicks) === b) set.add(edit.cursor - b * barTicks);
      const ticks = [...set].sort((a, c) => a - c);
      const segW = [];
      for (let i = 0; i < ticks.length - 1; i++) segW.push(spaceFor(ticks[i + 1] - ticks[i]));
      const nat = 14 + accRoom + segW.reduce((a, w) => a + w, 0) + 6;
      barInfo.push({ ticks, segW, nat, accRoom });
    }

    // ---- 段組み（1段に何小節入れるか） ----
    const left = 16;
    const kcMax = Math.max(0, ...staves.map((s) => Math.abs(s.kc)));
    const headW = (first) => 34 + kcMax * 8 + (first ? 24 : 6) + (staves.some((s) => s.grand) ? 10 : 0);
    const lines = [];
    let b = 0;
    while (b < bars) {
      const avail = width - left - headW(lines.length === 0) - 10;
      let n = 0;
      let w = 0;
      if (opts.perLine) n = Math.min(opts.perLine, bars - b);
      else {
        while (b + n < bars && (n === 0 || w + barInfo[b + n].nat <= avail)) { w += barInfo[b + n].nat; n++; }
      }
      lines.push([b, b + n]);
      b += n;
    }

    const chordRow = chords && chords.some(Boolean) ? 16 : 0;
    const anyVolta = Object.keys(rep.volta || {}).length > 0;
    const topRow = chordRow + (anyVolta ? 16 : 0);
    const staffH = (st) => (st.clef === 'perc' ? 9.5 : st.grand && st.sub === 0 ? 8.5 : 10.5) * SP + (nameOf && st.clef !== 'perc' ? 15 : 0) + (st.hasLyr ? 18 : 0) + (st.hasDyn ? 18 : 0);
    const systemH = topRow + staves.reduce((a, s) => a + staffH(s), 0) + 16;
    const top = 70 + (meta.subtitle ? 18 : 0);
    const height = top + lines.length * systemH + 24;
    const o = [];
    const layout = { systems: [], width, height, scale, barTicks };
    o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${OUTW}" height="${height * scale}" viewBox="0 0 ${width} ${height}" font-family="sans-serif">`);
    o.push(`<rect width="100%" height="100%" fill="#fff"/>`);
    o.push(`<text x="${width / 2}" y="32" text-anchor="middle" font-size="21" font-weight="bold" fill="#111">${esc(title)}</text>`);
    if (meta.subtitle) o.push(`<text x="${width / 2}" y="52" text-anchor="middle" font-size="13" fill="#333">${esc(meta.subtitle)}</text>`);
    const credits = [meta.lyricist ? '作詞：' + meta.lyricist : '', meta.composer ? '作曲：' + meta.composer : ''].filter(Boolean);
    credits.forEach((c, i) => o.push(`<text x="${width - 16}" y="${top - 26 + i * 15}" text-anchor="end" font-size="12" fill="#222">${esc(c)}</text>`));
    o.push(`<text x="${left}" y="${top - 12}" font-size="13" font-weight="bold" fill="#111">${opts.tempoText ? esc(opts.tempoText) + '  ' : ''}<tspan font-weight="normal">♩ = ${bpm}</tspan></text>`);

    // 臨時記号は段ごと・小節ごとに覚える
    lines.forEach(([b0, b1], line) => {
      const sysTop = top + line * systemH + topRow;
      const hx = left + headW(line === 0);
      const avail = width - hx - 10;
      const natSum = barInfo.slice(b0, b1).reduce((a, x) => a + x.nat, 0);
      const stretch = avail / natSum;
      const sys = { y0: sysTop - topRow, y1: sysTop + systemH - topRow, bars: [], staves: [] };
      // 小節の x 位置
      let x = hx;
      for (let bb = b0; bb < b1; bb++) {
        const bi = barInfo[bb];
        const w = bi.nat * stretch;
        const k = (w - 20 - bi.accRoom) / bi.segW.reduce((a, v) => a + v, 0);
        const xs = [];
        let cx = x + 14 + bi.accRoom;
        bi.ticks.forEach((t, i) => { xs.push(cx); if (i < bi.segW.length) cx += bi.segW[i] * k; });
        sys.bars.push({ b: bb, x0: x, x1: x + w, ticks: bi.ticks, xs });
        x += w;
      }
      const barOf = (bb) => sys.bars[bb - b0];
      const xAt = (bb, pos) => {
        const B = barOf(bb);
        if (pos <= B.ticks[0]) return B.xs[0];
        for (let i = 0; i < B.ticks.length - 1; i++) if (pos <= B.ticks[i + 1]) return B.xs[i] + ((pos - B.ticks[i]) / (B.ticks[i + 1] - B.ticks[i])) * (B.xs[i + 1] - B.xs[i]);
        return B.xs[B.xs.length - 1];
      };
      const xEnd = sys.bars[sys.bars.length - 1].x1;
      // 小節番号
      const num = (bb) => (pickup ? bb : bb + 1);
      if (!(pickup && b0 === 0)) o.push(`<text x="${left}" y="${sysTop - 3}" font-size="10" fill="#666">${num(b0)}</text>`);
      // 1番/2番かっこ
      if (anyVolta) {
        for (const B of sys.bars) {
          const v = rep.volta[B.b];
          if (!v) continue;
          const prev = rep.volta[B.b - 1];
          const next = rep.volta[B.b + 1];
          const y = sysTop - chordRow - 6;
          o.push(`<path d="M${B.x0 + 2} ${prev === v && B.b !== b0 ? y : y + 12} V${y} H${B.x1 - 4}${next !== v ? ` V${y + 12}` : ''}" fill="none" stroke="#222"/>`);
          if (prev !== v || B.b === b0) o.push(`<text x="${B.x0 + 6}" y="${y + 11}" font-size="11" fill="#111">${v}.</text>`);
        }
      }
      let yAcc = sysTop;
      staves.forEach((st, si) => {
        const stTop = yAcc + 2 * SP;
        yAcc += staffH(st);
        const perc = st.clef === 'perc';
        const yOf = (pos) => stTop + (8 - pos) * (SP / 2);
        sys.staves.push({ si, pi: st.pi, sub: st.sub, top: stTop, clef: st.clef, baseDn: st.baseDn, kc: st.kc, tr: st.tr, perc });
        for (let i = 0; i < 5; i++) o.push(`<line x1="${left}" x2="${xEnd}" y1="${stTop + i * SP}" y2="${stTop + i * SP}" stroke="#222" stroke-width="0.9"/>`);
        if (line === 0 && (staves.length > 1) && st.sub === 0) o.push(`<text x="${left + (st.grand ? 10 : 0)}" y="${stTop - 7}" font-size="10" fill="#555">${esc(st.part.name)}${st.tr ? `（in ${['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'][((-st.tr % 12) + 12) % 12]}）` : ''}</text>`);
        const cl = left + (st.grand ? 10 : 0);
        if (perc) o.push(`<rect x="${cl + 8}" y="${yOf(6)}" width="3" height="${SP * 2}" fill="#111"/><rect x="${cl + 14}" y="${yOf(6)}" width="3" height="${SP * 2}" fill="#111"/>`);
        else if (st.clef === 'treble') o.push(`<text x="${cl + 2}" y="${stTop + 3.1 * SP}" font-size="${4.4 * SP}" font-family='${FONT}' fill="#111">𝄞</text>`);
        else o.push(`<text x="${cl + 3}" y="${stTop + 2.6 * SP}" font-size="${3.4 * SP}" font-family='${FONT}' fill="#111">𝄢</text>`);
        if (!perc) for (let i = 0; i < Math.abs(st.kc); i++) {
          let pos = (st.kc >= 0 ? [8, 5, 9, 6, 3, 7, 4] : [4, 7, 3, 6, 2, 5, 1])[i];
          if (st.clef === 'bass') pos -= 2;
          o.push(`<text x="${cl + 32 + i * 8}" y="${yOf(pos) + (st.kc >= 0 ? 4 : 3)}" font-size="15" fill="#111">${st.kc >= 0 ? '♯' : '♭'}</text>`);
        }
        if (line === 0) {
          const tx = cl + 36 + kcMax * 8;
          o.push(`<text x="${tx + 6}" y="${stTop + 1.9 * SP}" font-size="${2.2 * SP}" font-weight="bold" font-family="serif" text-anchor="middle" fill="#111">${meter[0]}</text>`);
          o.push(`<text x="${tx + 6}" y="${stTop + 3.9 * SP}" font-size="${2.2 * SP}" font-weight="bold" font-family="serif" text-anchor="middle" fill="#111">${meter[1]}</text>`);
        }
        const textY = stTop + 4 * SP + 2.7 * SP;
        const lyrY = textY + (nameOf && !perc ? 15 : 0);
        const dynY = (st.hasLyr ? lyrY + 18 : nameOf && !perc ? textY + 15 : textY) + 2;
        const keyAcc = keyAccOf(st.kc);
        const headsAt = new Map(); // abs tick → {x, ys[], up}（スラー用）
        let prevHead = null;
        for (const B of sys.bars) {
          const bb = B.b;
          const barAcc = {};
          const drawn = [];
          const evs = st.bars[bb].filter((ev) => !(bb === 0 && pickup && ev.pos < barTicks - pickup));
          for (let ei = 0; ei < evs.length; ei++) {
            const ev = evs[ei];
            const x0 = xAt(bb, ev.pos);
            if (ev.rest) {
              const rx = ev.whole ? (B.x0 + B.x1) / 2 - 5 : x0;
              drawRest(o, ev, rx, yOf);
              prevHead = null;
              continue;
            }
            // 次の音（♯/♭の向きを決める）
            let nextP = null;
            for (let j = ei + 1; j < evs.length; j++) if (!evs[j].rest) { nextP = evs[j].pitches[evs[j].pitches.length - 1]; break; }
            if (nextP == null && st.bars[bb + 1]) { const nx = st.bars[bb + 1].find((e) => !e.rest); if (nx) nextP = nx.pitches[nx.pitches.length - 1]; }
            let heads;
            if (perc) {
              heads = ev.pitches.map((p) => ({ pos: Math.floor((p - 1000) / 10), shape: (p - 1000) % 10, accTxt: null, p }));
            } else {
              heads = ev.pitches.map((m) => {
                const top = ev.pitches[ev.pitches.length - 1];
                const pref = nextP == null ? 0 : nextP > top ? 1 : nextP < top ? -1 : 0;
                const sp = spellPref(m, st.kc, pref);
                const pos = sp.dn - st.baseDn;
                const cur = sp.dn in barAcc ? barAcc[sp.dn] : keyAcc[sp.letter];
                let accTxt = null;
                if (cur !== sp.acc && !ev.tieEnd) { accTxt = ACC_CH[sp.acc]; barAcc[sp.dn] = sp.acc; }
                return { pos, accTxt, p: m - st.tr };
              });
            }
            heads.sort((a, c) => a.pos - c.pos);
            const lo = heads[0].pos;
            const hi = heads[heads.length - 1].pos;
            const up = perc ? true : !((hi - 4) > (4 - lo) || ((hi - 4) === (4 - lo) && hi >= 4));
            // 2度の音は符頭を横にずらす
            const disp = new Array(heads.length).fill(0);
            if (up) { for (let i = 1; i < heads.length; i++) if (heads[i].pos - heads[i - 1].pos === 1 && !disp[i - 1]) disp[i] = 10.5; }
            else { for (let i = heads.length - 2; i >= 0; i--) if (heads[i + 1].pos - heads[i].pos === 1 && !disp[i + 1]) disp[i] = -10.5; }
            const x = x0;
            const filled = ev.base < 96;
            const sel = edit && edit.sel && edit.part === st.pi;
            let accCol = 0;
            let lastAccPos = 99;
            const ysAll = [];
            for (let i = heads.length - 1; i >= 0; i--) {
              const h = heads[i];
              const hx2 = x + disp[i];
              const y = yOf(h.pos);
              ysAll.push(y);
              if (!perc || true) {
                if (h.pos < -1) for (let lp = -2; lp >= h.pos; lp -= 2) o.push(`<line x1="${x - 8}" x2="${x + 8 + Math.max(0, disp[i])}" y1="${yOf(lp)}" y2="${yOf(lp)}" stroke="#222"/>`);
                if (h.pos > 9) for (let lp = 10; lp <= h.pos; lp += 2) o.push(`<line x1="${x - 8 + Math.min(0, disp[i])}" x2="${x + 8}" y1="${yOf(lp)}" y2="${yOf(lp)}" stroke="#222"/>`);
              }
              const isSel = sel && edit.sel.has(ev.src + ':' + h.p);
              const col = isSel ? '#1971c2' : '#111';
              const data = `class="nh" data-pi="${st.pi}" data-s="${ev.src}" data-e="${ev.srcEnd}" data-p="${h.p}"`;
              if (perc && h.shape === 1) o.push(`<path ${data} d="M${hx2 - 4} ${y - 4} L${hx2 + 4} ${y + 4} M${hx2 - 4} ${y + 4} L${hx2 + 4} ${y - 4}" stroke="${col}" stroke-width="1.8"/>`);
              else if (perc && h.shape === 2) o.push(`<g ${data}><path d="M${hx2 - 4} ${y - 4} L${hx2 + 4} ${y + 4} M${hx2 - 4} ${y + 4} L${hx2 + 4} ${y - 4}" stroke="${col}" stroke-width="1.6"/><circle cx="${hx2}" cy="${yOf(11)}" r="3" fill="none" stroke="${col}"/></g>`);
              else o.push(`<ellipse ${data} cx="${hx2}" cy="${y}" rx="5.2" ry="3.7" transform="rotate(-20 ${hx2} ${y})" fill="${filled ? col : '#fff'}" stroke="${col}" stroke-width="${filled ? 0 : 1.6}"/>`);
              if (h.accTxt) {
                if (lastAccPos - h.pos < 6) accCol++; else accCol = 0;
                lastAccPos = h.pos;
                o.push(`<text x="${x - 15 - accCol * 8 + Math.min(0, disp[i])}" y="${y + 4.5}" font-size="14" fill="${col}">${h.accTxt}</text>`);
              }
              if (ev.dot) { const dy = h.pos % 2 === 0 ? -SP / 2 : 0; o.push(`<circle cx="${x + 9 + Math.max(0, ...disp)}" cy="${y + dy}" r="1.7" fill="${col}"/>`); }
            }
            // 階名・歌詞
            if (!perc && nameOf && ev.first) o.push(`<text x="${x}" y="${textY}" font-size="10" text-anchor="middle" fill="#2b6cb0">${esc(heads.map((h) => nameOf(h.p)).reverse().join('・'))}</text>`);
            const lyr = ev.first ? (ev.ly || (st.notes.some((n) => n.ly) ? '' : st.lyrics[ev.syll])) : '';
            if (st.sub === 0 && lyr) o.push(`<text x="${x}" y="${lyrY}" font-size="12" text-anchor="middle" fill="#111">${esc(lyr)}</text>`);
            const flags = ev.base <= 6 ? 3 : ev.base <= 12 ? 2 : ev.base <= 24 ? 1 : 0;
            const d = { x, up, lo, hi, flags, hasStem: ev.base < 192, ev, yOf, beatIdx: Math.floor(ev.pos / beat), heads, disp };
            drawn.push(d);
            if (!headsAt.has(ev.abs)) headsAt.set(ev.abs, d);
            if (prevHead && prevHead.ev.tie) drawTie(o, prevHead, d, yOf);
            prevHead = d;
          }
          drawStemsAndBeams(o, drawn);
          // アーティキュレーション（符頭の、ぼうと反対がわ）
          for (const d of drawn) {
            const arts = d.ev.first ? d.ev.art || [] : [];
            let k = 0;
            for (const a of arts) {
              if (a === 'ferm') continue;
              const below = d.up;
              const yy = below ? d.yOf(d.lo) + 11 + k * 8 : d.yOf(d.hi) - 11 - k * 8;
              const xx = d.x;
              if (a === 'stac') o.push(`<circle cx="${xx}" cy="${yy}" r="1.9" fill="#111"/>`);
              else if (a === 'ten') o.push(`<line x1="${xx - 5}" x2="${xx + 5}" y1="${yy}" y2="${yy}" stroke="#111" stroke-width="1.6"/>`);
              else if (a === 'acc') o.push(`<path d="M${xx - 5} ${yy - 3} L${xx + 5} ${yy} L${xx - 5} ${yy + 3}" fill="none" stroke="#111" stroke-width="1.3"/>`);
              else if (a === 'marc') o.push(below ? `<path d="M${xx - 4} ${yy - 4} L${xx} ${yy + 4} L${xx + 4} ${yy - 4}" fill="none" stroke="#111" stroke-width="1.6"/>` : `<path d="M${xx - 4} ${yy + 4} L${xx} ${yy - 4} L${xx + 4} ${yy + 4}" fill="none" stroke="#111" stroke-width="1.6"/>`);
              k++;
            }
            if (arts.includes('ferm')) {
              const yy = Math.min(d.yOf(10), d.yOf(d.hi) - 12, d.up ? d.yOf(d.hi) - 3.5 * SP - 6 : 99999);
              o.push(`<path d="M${d.x - 8} ${yy} Q${d.x} ${yy - 11} ${d.x + 8} ${yy}" fill="none" stroke="#111" stroke-width="1.6"/><circle cx="${d.x}" cy="${yy - 2}" r="1.6" fill="#111"/>`);
            }
          }
          drawTriplets(o, drawn, yOf);
          // 小節線（くり返し記号つき）
          const yT = stTop;
          const yB = stTop + 4 * SP;
          const isStart = (rep.start || []).includes(bb);
          const isEnd = (rep.end || []).includes(bb);
          if (isStart) {
            const xs0 = B.x0 + (bb === b0 ? 0 : 0);
            o.push(`<rect x="${xs0 + 1}" y="${yT}" width="3" height="${4 * SP}" fill="#222"/><line x1="${xs0 + 7}" x2="${xs0 + 7}" y1="${yT}" y2="${yB}" stroke="#222"/><circle cx="${xs0 + 11}" cy="${yOf(5)}" r="1.8" fill="#222"/><circle cx="${xs0 + 11}" cy="${yOf(3)}" r="1.8" fill="#222"/>`);
          }
          const ex = B.x1;
          if (isEnd) o.push(`<circle cx="${ex - 11}" cy="${yOf(5)}" r="1.8" fill="#222"/><circle cx="${ex - 11}" cy="${yOf(3)}" r="1.8" fill="#222"/><line x1="${ex - 7}" x2="${ex - 7}" y1="${yT}" y2="${yB}" stroke="#222"/><rect x="${ex - 4}" y="${yT}" width="3" height="${4 * SP}" fill="#222"/>`);
          else if (bb === bars - 1) o.push(`<line x1="${ex - 5}" x2="${ex - 5}" y1="${yT}" y2="${yB}" stroke="#222"/><rect x="${ex - 3}" y="${yT}" width="3" height="${4 * SP}" fill="#222"/>`);
          else o.push(`<line x1="${ex}" x2="${ex}" y1="${yT}" y2="${yB}" stroke="#222"/>`);
          if (si === 0 && chords && chords[bb]) o.push(`<text x="${B.xs[0] - 4}" y="${stTop - 2.9 * SP}" font-size="13" font-weight="bold" fill="#c2410c">${esc(chords[bb])}</text>`);
        }
        // スラー
        for (const sl of st.part.slurs || []) {
          const a = headsAt.get(sl.s);
          const z = headsAt.get(sl.e);
          if (!a && !z) continue;
          const inSys = (t) => t >= b0 * barTicks && t < b1 * barTicks;
          if (!inSys(sl.s) && !inSys(sl.e) && !(sl.s < b0 * barTicks && sl.e >= b1 * barTicks)) continue;
          const above = !(a || z).up;
          const xa = a ? a.x : sys.bars[0].xs[0] - 6;
          const xz = z ? z.x : xEnd - 6;
          const ya = a ? (above ? a.yOf(a.hi) - 8 : a.yOf(a.lo) + 8) : (above ? yOf(9) : yOf(-1));
          const yz = z ? (above ? z.yOf(z.hi) - 8 : z.yOf(z.lo) + 8) : ya;
          const yA = ya;
          const lift = Math.min(18, 6 + (xz - xa) / 14) * (above ? -1 : 1);
          o.push(`<path d="M${xa} ${yA} C${xa + (xz - xa) / 3} ${yA + lift} ${xa + (2 * (xz - xa)) / 3} ${yz + lift} ${xz} ${yz} C${xa + (2 * (xz - xa)) / 3} ${yz + lift * 0.8} ${xa + (xz - xa) / 3} ${yA + lift * 0.8} ${xa} ${yA}" fill="#111" stroke="#111" stroke-width="0.6"/>`);
        }
        // 強弱記号・クレッシェンド
        if (st.hasDyn) {
          const tx = (t) => { const bb = Math.floor(t / barTicks); if (bb < b0 || bb >= b1) return null; return xAt(bb, t - bb * barTicks); };
          for (const dy of st.part.dyn || []) { const xx = tx(dy.t); if (xx != null) o.push(`<text x="${xx - 4}" y="${dynY}" font-size="15" font-style="italic" font-weight="bold" font-family="serif" fill="#111">${esc(dy.v)}</text>`); }
          for (const hp of st.part.hairpins || []) {
            if (hp.e <= b0 * barTicks || hp.s >= b1 * barTicks) continue;
            const xa = hp.s >= b0 * barTicks ? tx(hp.s) + 18 : sys.bars[0].xs[0];
            const xz = hp.e < b1 * barTicks ? tx(hp.e) - 4 : xEnd - 6;
            if (xz - xa < 8) continue;
            const yy = dynY - 5;
            const open = hp.type === 'cresc';
            const wa = open ? 0 : 5;
            const wz = open ? 5 : 0;
            o.push(`<path d="M${xz} ${yy - wz} L${xa} ${yy - wa} L${xz} ${yy + wz}" fill="none" stroke="#111" stroke-width="1.1"/>`);
            if (!open) o.push(`<path d="M${xa} ${yy - wa} L${xz} ${yy}" fill="none" stroke="none"/>`);
          }
        }
        // 編集カーソル
        if (edit && edit.part === st.pi && st.sub === 0 && edit.cursor != null) {
          const cb = Math.floor(edit.cursor / barTicks);
          if (cb >= b0 && cb < b1) {
            const cxx = xAt(cb, edit.cursor - cb * barTicks);
            const grandH = st.grand ? staffH(st) : 0;
            o.push(`<rect class="cursor" x="${cxx - 7}" y="${stTop - 12}" width="${Math.max(14, (edit.curLen || 0) ? 14 : 14)}" height="${4 * SP + 24 + grandH}" rx="4" fill="rgba(25,113,194,.14)" stroke="#1971c2" stroke-width="1.2"/>`);
          }
        }
      });
      // 段をつなぐ線・大譜表のかっこ
      const tops = sys.staves.map((s) => s.top);
      if (staves.length > 1) o.push(`<line x1="${left}" x2="${left}" y1="${tops[0]}" y2="${tops[tops.length - 1] + 4 * SP}" stroke="#222" stroke-width="2"/>`);
      staves.forEach((st, si) => {
        if (st.grand && st.sub === 0) {
          const yA = tops[si];
          const yZ = tops[si + 1] + 4 * SP;
          const xm = left + 5;
          o.push(`<path d="M${xm + 3} ${yA} Q${xm - 5} ${yA + (yZ - yA) / 4} ${xm} ${(yA + yZ) / 2 - 4} Q${xm - 3} ${(yA + yZ) / 2} ${xm} ${(yA + yZ) / 2 + 4} Q${xm - 5} ${yZ - (yZ - yA) / 4} ${xm + 3} ${yZ}" fill="none" stroke="#111" stroke-width="2"/>`);
          o.push(`<line x1="${left + 10}" x2="${left + 10}" y1="${yA}" y2="${yZ}" stroke="#222"/>`);
          for (const B of sys.bars) o.push(`<line x1="${B.x1}" x2="${B.x1}" y1="${yA + 4 * SP}" y2="${tops[si + 1]}" stroke="#222"/>`);
        }
      });
      layout.systems.push(sys);
    });
    o.push('</svg>');
    Notation.lastLayout = layout;
    return o.join('');
  }

  function drawTie(o, a, b, yOf) {
    for (let i = 0; i < Math.min(a.heads.length, b.heads.length); i++) {
      const up = a.heads.length > 1 ? i >= a.heads.length / 2 : !a.up;
      const y0 = yOf(a.heads[i].pos) + (up ? -6 : 6);
      const y1 = yOf(b.heads[i].pos) + (up ? -6 : 6);
      const x0 = a.x + 6;
      const x1 = b.x - 6;
      const c = up ? -6 : 6;
      o.push(`<path d="M${x0} ${y0} Q${(x0 + x1) / 2} ${y0 + c} ${x1} ${y1} Q${(x0 + x1) / 2} ${y0 + c * 0.6} ${x0} ${y0}" fill="#111" stroke="#111" stroke-width="0.8"/>`);
    }
  }
  function drawRest(o, ev, x, yOf) {
    const base = ev.whole ? 192 : ev.base;
    const c = '#111';
    const data = `class="rest" data-s="${ev.abs}"`;
    if (base >= 192) o.push(`<rect ${data} x="${x - 5}" y="${yOf(6)}" width="11" height="4.5" fill="${c}"/>`);
    else if (base >= 96) o.push(`<rect ${data} x="${x - 5}" y="${yOf(4) - 4.5}" width="11" height="4.5" fill="${c}"/>`);
    else if (base >= 48) {
      const y = yOf(6);
      o.push(`<path ${data} d="M${x - 2} ${y - 2} L${x + 3} ${y + 5} L${x - 2} ${y + 11} L${x + 3} ${y + 17} Q${x - 5} ${y + 14} ${x} ${y + 22}" fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round"/>`);
    } else {
      const n = base <= 6 ? 3 : base <= 12 ? 2 : 1;
      const y = yOf(5);
      o.push(`<line x1="${x + 4}" y1="${y - 1}" x2="${x - 2}" y2="${y + 8 + n * 7}" stroke="${c}" stroke-width="1.6"/>`);
      for (let i = 0; i < n; i++) o.push(`<circle cx="${x - 2 - i * 1.5}" cy="${y + 2 + i * 7}" r="2.6" fill="${c}"/><path d="M${x - 2 - i * 1.5} ${y + 4 + i * 7} Q${x + 1} ${y + 5 + i * 7} ${x + 4 - i * 1.5} ${y - 1 + i * 7}" stroke="${c}" stroke-width="1.4" fill="none"/>`);
    }
    if (ev.dot) o.push(`<circle cx="${x + 10}" cy="${yOf(5)}" r="1.7" fill="${c}"/>`);
  }
  const stemX = (d) => (d.up ? d.x + 5 : d.x - 5);
  function stemEnd(d) {
    const len = 3.5 * SP;
    let y = d.up ? d.yOf(d.hi) - len : d.yOf(d.lo) + len;
    // 加線の多い音はぼうを中央線までのばす
    if (d.up && y > d.yOf(4)) y = d.yOf(4);
    if (!d.up && y < d.yOf(4)) y = d.yOf(4);
    return y;
  }
  function drawStemsAndBeams(o, drawn) {
    const groups = [];
    let curG = null;
    for (const d of drawn) {
      if (d.flags > 0 && curG && curG[curG.length - 1].beatIdx === d.beatIdx && !!curG[0].ev.trip === !!d.ev.trip) curG.push(d);
      else if (d.flags > 0) { curG = [d]; groups.push(curG); } else curG = null;
    }
    const beamed = new Set();
    for (const g of groups) {
      if (g.length < 2) continue;
      // 連桁の向き：いちばん中央線から遠い音で決める
      const far = g.reduce((a, d) => Math.max(a, Math.abs(d.hi - 4), Math.abs(d.lo - 4)), 0);
      const farHi = g.some((d) => d.hi - 4 === far);
      const up = !(farHi && g.every((d) => !(4 - d.lo > far)));
      g.forEach((d) => { d.up = up; beamed.add(d); });
      // かたむき：最初と最後の音の高さの差（最大で1間）
      const f = g[0];
      const l = g[g.length - 1];
      const yF = up ? f.yOf(f.hi) : f.yOf(f.lo);
      const yL = up ? l.yOf(l.hi) : l.yOf(l.lo);
      const dx = stemX(l) - stemX(f) || 1;
      let slope = (yL - yF) / dx;
      const maxS = SP / dx;
      slope = Math.max(-maxS, Math.min(maxS, slope)) * 0.5;
      // すべてのぼうが短くなりすぎないように平行移動
      let off = up ? Infinity : -Infinity;
      for (const d of g) {
        const need = up ? d.yOf(d.hi) - 3.25 * SP : d.yOf(d.lo) + 3.25 * SP;
        const lineY = slope * (stemX(d) - stemX(f));
        off = up ? Math.min(off, need - lineY) : Math.max(off, need - lineY);
      }
      const by = (d) => off + slope * (stemX(d) - stemX(f));
      for (const d of g) o.push(`<line x1="${stemX(d)}" x2="${stemX(d)}" y1="${up ? d.yOf(d.lo) : d.yOf(d.hi)}" y2="${by(d)}" stroke="#111" stroke-width="1.3"/>`);
      const beam = (xa, xz, lvl) => {
        const dy = (up ? 1 : -1) * (lvl - 1) * 6;
        o.push(`<path d="M${xa} ${by({ x: xa - (up ? 5 : -5), up }) + dy} L${xz} ${by({ x: xz - (up ? 5 : -5), up }) + dy} L${xz} ${by({ x: xz - (up ? 5 : -5), up }) + dy + (up ? 4 : -4)} L${xa} ${by({ x: xa - (up ? 5 : -5), up }) + dy + (up ? 4 : -4)} Z" fill="#111"/>`);
      };
      beam(stemX(f) - 0.6, stemX(l) + 0.6, 1);
      for (let level = 2; level <= 3; level++) {
        for (let i = 0; i < g.length; i++) {
          if (g[i].flags < level) continue;
          if (i + 1 < g.length && g[i + 1].flags >= level) beam(stemX(g[i]), stemX(g[i + 1]), level);
          else if (!(i > 0 && g[i - 1].flags >= level)) { const dir = i === g.length - 1 ? -1 : 1; beam(Math.min(stemX(g[i]), stemX(g[i]) + dir * 7), Math.max(stemX(g[i]), stemX(g[i]) + dir * 7), level); }
        }
      }
    }
    for (const d of drawn) {
      if (beamed.has(d) || !d.hasStem) continue;
      const x = stemX(d);
      const ye = stemEnd(d) + (d.up ? -1 : 1) * Math.max(0, d.flags - 1) * 4;
      o.push(`<line x1="${x}" x2="${x}" y1="${d.up ? d.yOf(d.lo) : d.yOf(d.hi)}" y2="${ye}" stroke="#111" stroke-width="1.3"/>`);
      for (let i = 0; i < d.flags; i++) {
        const y = ye + (d.up ? 1 : -1) * i * 7;
        const s = d.up ? 1 : -1;
        o.push(`<path d="M${x} ${y} c1 ${s * 7} 9 ${s * 8} 6 ${s * 17} c1 ${-s * 6} -2 ${-s * 9} -6 ${-s * 12} Z" fill="#111"/>`);
      }
    }
  }
  function drawTriplets(o, drawn, yOf) {
    let run = [];
    const flush = () => {
      if (!run.length) return;
      const x0 = run[0].x;
      const x1 = run[run.length - 1].x;
      const up = run[0].up;
      const y = up ? Math.min(yOf(10), ...run.map((d) => stemEnd(d) - 7)) : Math.max(yOf(-2), ...run.map((d) => stemEnd(d) + 14));
      o.push(`<text x="${(x0 + x1) / 2 + (up ? 5 : -5)}" y="${y}" font-size="11" font-style="italic" font-weight="bold" text-anchor="middle" fill="#111">3</text>`);
      run = [];
    };
    for (const d of drawn) {
      if (d.ev.trip && (!run.length || d.beatIdx === run[0].beatIdx)) run.push(d);
      else { flush(); if (d.ev.trip) run.push(d); }
    }
    flush();
  }

  // 楽譜の上のクリック位置 → { part, tick, pitch }（編集用）
  function hit(layout, x, y) {
    if (!layout) return null;
    for (const sys of layout.systems) {
      if (y < sys.y0 - 10 || y > sys.y1 + 10) continue;
      let best = null;
      for (const st of sys.staves) {
        const mid = st.top + 2 * SP;
        const dist = Math.abs(y - mid);
        if (!best || dist < best.dist) best = { st, dist };
      }
      if (!best) return null;
      const st = best.st;
      const B = sys.bars.find((bb) => x >= bb.x0 && x < bb.x1) || (x < sys.bars[0].x0 ? sys.bars[0] : sys.bars[sys.bars.length - 1]);
      let pos = B.ticks[0];
      if (x >= B.xs[B.xs.length - 1]) pos = B.ticks[B.ticks.length - 1] - 1;
      else for (let i = 0; i < B.xs.length - 1; i++) if (x < B.xs[i + 1]) { pos = B.ticks[i] + ((x - B.xs[i]) / (B.xs[i + 1] - B.xs[i])) * (B.ticks[i + 1] - B.ticks[i]); break; }
      pos = Math.max(B.ticks[0], Math.min(layout.barTicks - 1, pos));
      const posLine = Math.round((st.top + 4 * SP - y) / (SP / 2));
      let pitch = null;
      if (!st.perc) {
        const dn = posLine + st.baseDn;
        const letter = ((dn % 7) + 7) % 7;
        const oct = Math.floor(dn / 7);
        pitch = 12 * (oct + 1) + LETTER_PC[letter] + keyAccOf(st.kc)[letter] - st.tr;
      }
      return { pi: st.pi, sub: st.sub, bar: B.b, tick: B.b * layout.barTicks + pos, pitch, staffPos: posLine, perc: st.perc };
    }
    return null;
  }

  function single(midi, key, minor) {
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
    const keyAcc = keyAccOf(kc);
    if (sp.acc !== keyAcc[sp.letter]) o.push(`<text x="${x - 14}" y="${y + 4}" font-size="13" fill="currentColor">${ACC_CH[sp.acc]}</text>`);
    o.push('</svg>');
    return o.join('');
  }

  function splitLyrics(text) {
    if (!text) return [];
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
    const beat = beatOf(meter);
    const rep = opts.repeats || { start: [], end: [], volta: {} };
    const pickup = opts.pickup > 0 && opts.pickup < barTicks ? opts.pickup : 0;
    const x = [];
    x.push('<?xml version="1.0" encoding="UTF-8" standalone="no"?>');
    x.push('<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">');
    x.push('<score-partwise version="3.1">');
    x.push(`<work><work-title>${esc(title)}</work-title></work>`);
    if (meta.subtitle) x.push(`<movement-title>${esc(meta.subtitle)}</movement-title>`);
    x.push('<identification>');
    if (meta.composer) x.push(`<creator type="composer">${esc(meta.composer)}</creator>`);
    if (meta.lyricist) x.push(`<creator type="lyricist">${esc(meta.lyricist)}</creator>`);
    x.push('<encoding><software>おとつみき</software></encoding></identification>');
    x.push('<part-list>');
    parts.forEach((p, i) => x.push(`<score-part id="P${i + 1}"><part-name>${esc(p.name)}</part-name>${p.gm != null ? `<score-instrument id="P${i + 1}-I1"><instrument-name>${esc(p.name)}</instrument-name></score-instrument><midi-instrument id="P${i + 1}-I1">${p.perc ? '<midi-channel>10</midi-channel>' : ''}<midi-program>${(p.gm || 0) + 1}</midi-program></midi-instrument>` : ''}</score-part>`));
    x.push('</part-list>');
    const HK = { M: 'major', m: 'minor', 7: 'dominant', M7: 'major-seventh', m7: 'minor-seventh', sus4: 'suspended-fourth', dim: 'diminished', aug: 'augmented' };
    const DYN = new Set(['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sf', 'sfz', 'fp']);
    parts.forEach((p, pi) => {
      const tr = p.transpose || 0;
      const kc = keyCount(key + tr, minor);
      let clef = p.clef || 'auto';
      if (p.perc) clef = 'perc';
      const notes = p.perc ? p.notes.map((n) => ({ ...n, p: 1000 + (DRUM_POS[n.id] || [5, 'n'])[0] * 10 + ((DRUM_POS[n.id] || [5, 'n'])[1] !== 'n' ? 1 : 0) })) : tr ? p.notes.map((n) => ({ ...n, p: n.p + tr })) : p.notes;
      if (clef === 'auto' || clef === 'grand') { const avg = notes.length ? notes.reduce((a, n) => a + n.p, 0) / notes.length : 67; clef = clef === 'grand' ? 'grand' : avg < 57 ? 'bass' : 'treble'; }
      const evBars = buildEvents(notes, bars, barTicks, beat, meter);
      const lyr = p.lyrics || [];
      const useNoteLy = p.notes.some((n) => n.ly);
      const slurStarts = new Map((p.slurs || []).map((s, i) => [s.s, i + 1]));
      const slurEnds = new Map((p.slurs || []).map((s, i) => [s.e, i + 1]));
      x.push(`<part id="P${pi + 1}">`);
      for (let b = 0; b < bars; b++) {
        x.push(`<measure number="${pickup ? b : b + 1}"${pickup && b === 0 ? ' implicit="yes"' : ''}>`);
        if ((rep.start || []).includes(b) || rep.volta[b] && rep.volta[b - 1] !== rep.volta[b]) {
          x.push(`<barline location="left">${(rep.start || []).includes(b) ? '<bar-style>heavy-light</bar-style>' : ''}${rep.volta[b] && rep.volta[b - 1] !== rep.volta[b] ? `<ending number="${rep.volta[b]}" type="start"/>` : ''}${(rep.start || []).includes(b) ? '<repeat direction="forward"/>' : ''}</barline>`);
        }
        if (b === 0) {
          x.push('<attributes><divisions>48</divisions>');
          if (clef !== 'perc') x.push(`<key><fifths>${kc}</fifths><mode>${minor ? 'minor' : 'major'}</mode></key>`);
          x.push(`<time><beats>${meter[0]}</beats><beat-type>${meter[1]}</beat-type></time>`);
          if (tr) x.push(`<transpose><diatonic>${-Math.round(tr * 7 / 12)}</diatonic><chromatic>${-tr}</chromatic></transpose>`);
          x.push(clef === 'perc' ? '<clef><sign>percussion</sign></clef>' : clef === 'bass' ? '<clef><sign>F</sign><line>4</line></clef>' : '<clef><sign>G</sign><line>2</line></clef>');
          x.push('</attributes>');
          if (pi === 0) x.push(`<direction placement="above"><direction-type>${opts.tempoText ? `<words font-weight="bold">${esc(opts.tempoText)}</words></direction-type><direction-type>` : ''}<metronome><beat-unit>quarter</beat-unit><per-minute>${bpm}</per-minute></metronome></direction-type><sound tempo="${bpm}"/></direction>`);
        }
        if (pi === 0 && opts.tempos) { const t = opts.tempos[b]; if (t && b > 0) x.push(`<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${t}</per-minute></metronome></direction-type><sound tempo="${t}"/></direction>`); }
        if (pi === 0 && chords && chords[b]) {
          const c = chords[b];
          const sp = spell(c.r + 60, kc);
          x.push(`<harmony><root><root-step>${sp.step}</root-step>${sp.acc ? `<root-alter>${sp.acc}</root-alter>` : ''}</root><kind>${HK[c.q] || 'major'}</kind></harmony>`);
        }
        const dirAt = (t) => {
          for (const dy of p.dyn || []) if (dy.t === t && DYN.has(dy.v)) x.push(`<direction placement="below"><direction-type><dynamics><${dy.v}/></dynamics></direction-type></direction>`);
          for (const hp of p.hairpins || []) {
            if (hp.s === t) x.push(`<direction placement="below"><direction-type><wedge type="${hp.type === 'cresc' ? 'crescendo' : 'diminuendo'}"/></direction-type></direction>`);
            if (hp.e === t) x.push('<direction placement="below"><direction-type><wedge type="stop"/></direction-type></direction>');
          }
        };
        const evs = evBars[b].filter((ev) => !(b === 0 && pickup && ev.pos < barTicks - pickup));
        for (const ev of evs) {
          dirAt(ev.abs);
          const typeXml = (e) => `<type>${TYPE_NAME[e.base] || 'whole'}</type>${e.dot ? '<dot/>' : ''}${e.trip ? '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>' : ''}`;
          if (ev.rest) { x.push(`<note><rest${ev.whole ? ' measure="yes"' : ''}/><duration>${ev.len}</duration>${ev.whole ? '' : typeXml(ev)}</note>`); continue; }
          ev.pitches.forEach((m, k) => {
            let pitch;
            if (p.perc) pitch = `<unpitched><display-step>${'CDEFGAB'[(Math.floor((m - 1000) / 10) + 2) % 7]}</display-step><display-octave>${4 + Math.floor((Math.floor((m - 1000) / 10) + 2) / 7)}</display-octave></unpitched>`;
            else { const sp = spell(m, kc); pitch = `<pitch><step>${sp.step}</step>${sp.acc ? `<alter>${sp.acc}</alter>` : ''}<octave>${sp.oct}</octave></pitch>`; }
            const ties = (ev.tieEnd ? '<tie type="stop"/>' : '') + (ev.tie ? '<tie type="start"/>' : '');
            let nots = (ev.tieEnd ? '<tied type="stop"/>' : '') + (ev.tie ? '<tied type="start"/>' : '');
            if (k === 0 && ev.first) {
              if (slurStarts.has(ev.abs)) nots += `<slur type="start" number="${slurStarts.get(ev.abs) % 6 + 1}"/>`;
              if (slurEnds.has(ev.abs)) nots += `<slur type="stop" number="${slurEnds.get(ev.abs) % 6 + 1}"/>`;
              const arts = (ev.art || []).filter((a) => a !== 'ferm').map((a) => ({ stac: '<staccato/>', acc: '<accent/>', ten: '<tenuto/>', marc: '<strong-accent/>' }[a])).join('');
              if (arts) nots += `<articulations>${arts}</articulations>`;
              if ((ev.art || []).includes('ferm')) nots += '<fermata type="upright"/>';
            }
            const ly = k === 0 && ev.first ? (useNoteLy ? ev.ly : lyr[ev.syll]) : '';
            const lyric = ly ? `<lyric number="1"><syllabic>single</syllabic><text>${esc(ly)}</text></lyric>` : '';
            x.push(`<note>${k > 0 ? '<chord/>' : ''}${pitch}<duration>${ev.len}</duration>${ties}${typeXml(ev)}${p.perc && (m - 1000) % 10 ? '<notehead>x</notehead>' : ''}${nots ? `<notations>${nots}</notations>` : ''}${lyric}</note>`);
          });
        }
        const isEnd = (rep.end || []).includes(b);
        const voltaEnd = rep.volta[b] && rep.volta[b + 1] !== rep.volta[b];
        if (isEnd || voltaEnd || b === bars - 1) {
          x.push(`<barline location="right">${isEnd || b === bars - 1 ? '<bar-style>light-heavy</bar-style>' : ''}${voltaEnd ? `<ending number="${rep.volta[b]}" type="${isEnd ? 'stop' : 'discontinue'}"/>` : ''}${isEnd ? '<repeat direction="backward"/>' : ''}</barline>`);
        }
        x.push('</measure>');
      }
      x.push('</part>');
    });
    x.push('</score-partwise>');
    return x.join('\n');
  }

  return { render, single, hit, keyCount, buildEvents, spell, spellPref, splitLyrics, musicXML, DRUM_POS, lastLayout: null };
})();
