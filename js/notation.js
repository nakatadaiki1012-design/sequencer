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
  // 楽譜フォント Bravura の形（js/glyphs.js）で記号を描く
  const G = (name, x, y, attrs = '', sp = SP) => Glyphs.svg(name, +x.toFixed(2), +y.toFixed(2), sp, attrs || 'fill="#111"');
  const GW = (name, sp = SP) => (Glyphs.g[name] ? Glyphs.g[name].w : 1) * sp;
  const ACC_G = { 1: 'accidentalSharp', '-1': 'accidentalFlat', 0: 'accidentalNatural', 2: 'accidentalDoubleSharp', '-2': 'accidentalDoubleFlat' };
  const DYN_G = { p: 'dynamicPiano', m: 'dynamicMezzo', f: 'dynamicForte', s: 'dynamicSforzando', z: 'dynamicZ', r: 'dynamicRinforzando' };
  const headName = (base, shape) => (shape === 1 ? 'noteheadXBlack' : shape === 2 ? 'noteheadCircleX' : base >= 192 ? 'noteheadWhole' : base >= 96 ? 'noteheadHalf' : 'noteheadBlack');
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
  let MINOR = false; // いま書いている曲が短調か（render / musicXML でセット）
  function spellPref(midi, kc, pref) {
    const pc = ((midi % 12) + 12) % 12;
    const keyAcc = keyAccOf(kc);
    // 調の中の音ならそのまま
    for (let l = 0; l < 7; l++) if ((LETTER_PC[l] + keyAcc[l] + 12) % 12 === pc) return mk(midi, l, keyAcc[l]);
    // 短調の「導音」（第7音を半音上げた音）と、上げた第6音は、調の音を半音上げて書く（ニ短調の C♯ を D♭ にしない）
    if (MINOR && !pref) {
      const mt = ((((kc * 7) % 12) + 12) % 12 + 9) % 12; // 短調の主音
      if (pc === (mt + 11) % 12 || pc === (mt + 9) % 12) {
        for (let l = 0; l < 7; l++) if ((LETTER_PC[l] + keyAcc[l] + 1 + 12) % 12 === pc) return mk(midi, l, keyAcc[l] + 1);
      }
    }
    // 調の主音からの距離で、よく使う書き方に（♭3・♭6・♭7 は♭、♯1・♯4 は♯）
    let want = pref || (kc < 0 ? -1 : 1);
    if (!pref) {
      const tonic = MINOR ? ((((kc * 7) % 12) + 12) % 12 + 9) % 12 : (((kc * 7) % 12) + 12) % 12;
      const rel = (pc - tonic + 12) % 12;
      if (MINOR ? rel === 1 : [3, 8, 10].includes(rel)) want = -1;
      else if (rel === 6 || (!MINOR && rel === 1)) want = 1;
    }
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
  function decompose(pos, len, beat, barTicks, meter, rest) {
    const out = [];
    const mid = meter[0] === 4 && meter[1] === 4 ? 96 : 0;
    let guard = 0;
    const compound = [36, 72, 144].includes(beat); // 6/8 などの複合拍子（1拍＝付点）
    while (len > 0 && guard++ < 64) {
      let chosen = null;
      // 3連符の位置・長さ（6でわりきれない）なら、まず3連符でさがす（16分＋32分…のように書かない）
      const trip = len % 6 !== 0 || pos % 6 !== 0;
      for (const pass of trip ? [1, 0] : [0]) {
        for (const v of VALUES) {
          if (pass && !v[3]) continue;
          // 休符：拍の頭以外からは付点にしない・拍をまたがない（2拍目からの付点2分休符 → 4分休符＋2分休符）
          if (rest && !compound && v[2] && pos % (v[1] * 2) !== 0) continue;
          if (rest && !compound && v[0] > (beat || 48) && pos % Math.min(v[0], 96) !== 0) continue;
          if (rest && compound && pos % beat !== 0 && (pos % beat) + v[0] > beat) continue; // 6/8 の休符は拍をまたがない
          if (v[0] > len) continue;
          if (v[3]) { if (pos % (v[0] / 2) !== 0) continue; } else if (compound ? (pos % beat) % Math.min(v[0], beat) !== 0 : pos % Math.min(v[1], beat) !== 0) continue;
          // 4/4拍子では、小節の頭から始まる音・2分音符以上で拍の頭から始まる音以外は、まん中（3拍目）をまたがない
          if (mid && pos < mid && pos + v[0] > mid && pos !== 0 && !(v[1] >= 96 && pos % 48 === 0)) continue;
          chosen = v;
          break;
        }
        if (chosen) break;
      }
      if (!chosen) chosen = [len, 6, 0, 0];
      out.push({ pos, len: chosen[0], base: chosen[1], dot: chosen[2], trip: chosen[3] });
      pos += chosen[0];
      len -= chosen[0];
    }
    return out;
  }

  // ノートの列 → 小節ごとの「音符/休符」（タイ・歌詞・アーティキュレーションつき）
  // geo（{ starts, meters }）を barTicks の代わりにわたすと、小節ごとに拍子を変えられます
  function geoOf(bars, barTicks, meter) {
    if (barTicks && typeof barTicks === 'object') return barTicks;
    return { starts: Array.from({ length: bars + 1 }, (_, i) => i * barTicks), meters: Array(bars).fill(meter || [4, 4]) };
  }
  function barIndex(starts, bars, t) {
    let lo = 0;
    let hi = bars - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= t) lo = mid; else hi = mid - 1; }
    return lo;
  }
  function buildEvents(notes, bars, barTicks, beat, meter) {
    const geo = geoOf(bars, barTicks, meter);
    const bst = geo.starts;
    const total = bst[bars];
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
        const b = barIndex(bst, bars, s);
        const a0 = bst[b];
        const bl = bst[b + 1] - a0;
        const m = geo.meters[b] || meter || [4, 4];
        const be = Math.min(sg.e, bst[b + 1]);
        const isRest = !sg.pitches;
        if (isRest && s === a0 && be === bst[b + 1]) {
          perBar[b].push({ pos: 0, len: bl, rest: true, whole: true, base: 192, abs: s });
        } else {
          decompose(s - a0, be - s, beatOf(m), bl, m, isRest).forEach((p) => {
            const ev = { ...p, rest: isRest, pitches: sg.pitches, abs: a0 + p.pos, src: sg.src, srcEnd: sg.e };
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
  let textW = (t) => [...String(t || '')].reduce((a, c) => a + (c.charCodeAt(0) > 255 ? 12 : 7), 0);
  const spaceFor = (d) => 11 + 9 * Math.log2(Math.max(d, 4) / 6);

  /* ------------------------------------------------------------
     render(opts) → SVG文字列（Notation.lastLayout に位置の地図）
     opts.parts: [{ id, name, notes, clef:'auto'|'treble'|'bass'|'grand', perc:bool(打楽器), transpose(半音),
                   lyrics(配列, 音にlyがないとき), dyn, hairpins, slurs }]
     ほか: bars, barTicks, meter, key, minor, title, bpm, tempoText, chords, meta, nameOf,
          perLine, scale, width, pickup, repeats, edit: { part, cursor, sel:Set('s:p'), grid }
     ------------------------------------------------------------ */
  const FINGERING = (() => {
    const base = {
      60: [1, 1, 1, 1, 1, 1, 1, 1], 62: [1, 1, 1, 1, 1, 1, 1, 0], 64: [1, 1, 1, 1, 1, 1, 0, 0],
      67: [1, 1, 1, 1, 0, 0, 0, 0], 69: [1, 1, 1, 0, 0, 0, 0, 0], 70: [1, 1, 0, 1, 1, 0, 0, 0], 71: [1, 1, 0, 0, 0, 0, 0, 0],
      72: [1, 0, 1, 0, 0, 0, 0, 0], 73: [0, 1, 1, 0, 0, 0, 0, 0], 74: [0, 0, 1, 0, 0, 0, 0, 0],
      76: [0.5, 1, 1, 1, 1, 1, 0, 0], 79: [0.5, 1, 1, 1, 0, 0, 0, 0], 81: [0.5, 1, 1, 0, 0, 0, 0, 0],
      83: [0.5, 1, 1, 0, 1, 1, 0, 0], 84: [0.5, 1, 0, 0, 1, 1, 0, 0],
    };
    return {
      baroque: { ...base, 65: [1, 1, 1, 1, 1, 0, 1, 1], 66: [1, 1, 1, 1, 0, 1, 1, 0], 77: [0.5, 1, 1, 1, 1, 0, 1, 0] },
      german: { ...base, 65: [1, 1, 1, 1, 1, 0, 0, 0], 77: [0.5, 1, 1, 1, 1, 0, 0, 0] },
    };
  })();
  // 指づかいの絵（上から：うら穴、1〜7。ぬりつぶし＝ふさぐ）
  function fingerSvg(x, y, f) {
    const r = 2.3;
    let s = `<g class="finger" stroke="#111" stroke-width="0.7">`;
    f.forEach((v, i) => {
      const cx = i === 0 ? x - 3.2 : x;
      const cy = y + (i === 0 ? 0 : 3 + i * 4.6 + (i >= 4 ? 1.6 : 0));
      if (v === 1) s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#111"/>`;
      else if (v === 0.5) s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/><path d="M${cx} ${cy - r}A${r} ${r} 0 0 0 ${cx} ${cy + r}Z" fill="#111"/>`;
      else s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/>`;
    });
    return s + '</g>';
  }
  function render(opts) {
    MINOR = !!opts.minor;
    const { parts, bars, barTicks, meter, key, minor, title, bpm, chords, nameOf } = opts;
    const meta = opts.meta || {};
    const BLANK = new Set(opts.blankBars || []); // 穴うめ：音符を書かない小節
    // ソプラノリコーダーの指づかい（いちばん低いド＝C4 として）。たしかなものだけ。[うら穴, 1〜7]（1＝ふさぐ、0.5＝半分）
    const FING = opts.finger ? FINGERING[opts.finger] : null;
    const scale = opts.scale || 1;
    const OUTW = opts.width || 780;
    const width = OUTW / scale;
    // 小節の表（途中で拍子・調が変わってもよい）
    const GEO = opts.geo || { starts: Array.from({ length: bars + 1 }, (_, i) => i * barTicks), meters: Array(bars).fill(meter), keys: Array(bars).fill({ key, minor }) };
    const bS = (b) => GEO.starts[Math.max(0, Math.min(bars, b))];
    const bL = (b) => bS(b + 1) - bS(b);
    const mAt = (b) => GEO.meters[Math.max(0, Math.min(bars - 1, b))] || meter;
    const barOfT = (t) => barIndex(GEO.starts, bars, t);
    const pickup = opts.pickup > 0 && opts.pickup < bL(0) ? opts.pickup : 0;
    const rep = opts.repeats || { start: [], end: [], volta: {} };
    const J = opts.jumps || {};
    const hasJ = (k) => J[k] != null && J[k] >= 0 && J[k] < bars;
    const anyJump = ['segno', 'coda', 'tocoda', 'fine', 'dc', 'ds'].some(hasJ);
    const edit = opts.edit || null;
    const SELC = (edit && edit.color) || '#1971c2';

    // ---- 段（五線）を用意する（大譜表は2段） ----
    const staves = [];
    parts.forEach((p, pi) => {
      const tr = p.transpose || 0;
      const kcs = GEO.keys.map((k) => keyCount(k.key + tr, k.minor));
      const kc = kcs[0];
      const all = tr ? p.notes.map((n) => ({ ...n, p: n.p + tr })) : p.notes;
      const common = { pi, part: p, kc, kcs, tr, lyrics: p.lyrics || [] };
      if (p.perc) {
        const pn = p.notes.map((n) => ({ ...n, p: 1000 + (DRUM_POS[n.id] || [5, 'n'])[0] * 10 + ((DRUM_POS[n.id] || [5, 'n'])[1] === 'x' ? 1 : (DRUM_POS[n.id] || [5, 'n'])[1] === 'o' ? 2 : 0) }));
        staves.push({ ...common, clef: 'perc', notes: pn, notes2: [], sub: 0, kc: 0, kcs: kcs.map(() => 0) });
        return;
      }
      // 声部：v:2 の音は「下の声部」（ぼうを下向き）
      const notes = all.filter((n) => n.v !== 2);
      const notes2 = all.filter((n) => n.v === 2);
      let clef = p.clef || 'auto';
      if (clef === 'grand') {
        staves.push({ ...common, clef: 'treble', notes: notes.filter((n) => n.p >= 60), notes2: notes2.filter((n) => n.p >= 60), sub: 0, grand: true });
        staves.push({ ...common, clef: 'bass', notes: notes.filter((n) => n.p < 60), notes2: notes2.filter((n) => n.p < 60), sub: 1, grand: true, lyrics: [] });
        return;
      }
      if (clef === 'auto') { const avg = all.length ? all.reduce((a, n) => a + n.p, 0) / all.length : 67; clef = avg < 57 ? 'bass' : 'treble'; }
      staves.push({ ...common, clef, notes, notes2, sub: 0 });
    });
    for (const st of staves) {
      // 声部2だけの小節は、ふつうの1声部として書く
      if (st.notes2.length) {
        const has1 = new Set(st.notes.map((n) => barOfT(Math.max(0, n.s))));
        const lone = new Set(st.notes2.filter((n) => !has1.has(barOfT(Math.max(0, n.s)))));
        if (lone.size) { st.notes = st.notes.concat([...lone]); st.notes2 = st.notes2.filter((n) => !lone.has(n)); }
      }
      st.bars = buildEvents(st.notes, bars, GEO, null, meter);
      st.bars2 = st.notes2.length ? buildEvents(st.notes2, bars, GEO, null, meter) : null;
      st.has2 = Array(bars).fill(false);
      for (const n of st.notes2) if (n.s >= 0 && n.s < bS(bars)) st.has2[barOfT(n.s)] = true;
      st.evAt = (b) => (st.has2[b] ? st.bars[b].concat(st.bars2[b]) : st.bars[b]);
      st.baseDn = st.clef === 'treble' ? 30 : st.clef === 'bass' ? 18 : 30;
      st.hasLyr = st.sub === 0 && (st.notes.some((n) => n.ly) || st.lyrics.some(Boolean));
      st.hasDyn = st.sub === (st.grand ? 1 : 0) && ((st.part.dyn || []).length || (st.part.hairpins || []).length);
      // 五線の外にはみ出す音（加線）の分だけ、段の上下をあける
      let lo = 0;
      let hi = 8;
      for (const n of st.notes.concat(st.notes2)) {
        const pos = st.clef === 'perc' ? Math.floor((n.p - 1000) / 10) : spell(n.p, st.kcs[barOfT(Math.max(0, n.s))] || 0).dn - st.baseDn;
        if (pos < lo) lo = pos;
        if (pos > hi) hi = pos;
      }
      st.above = Math.max(0, hi - 10) * (SP / 2) + (hi > 9 ? 6 : 0);
      st.below = Math.max(0, -2 - lo) * (SP / 2) + (lo < -1 ? 6 : 0);
    }

    // ---- 小節ごとの「音の始まる位置」と自然な幅 ----
    const barStartTick = (b) => (b === 0 && pickup ? bL(0) - pickup : 0);
    const barInfo = [];
    textW = (t) => [...String(t || '')].reduce((a, c) => a + (c.charCodeAt(0) > 255 ? 12 : 7), 0);
    for (let b = 0; b < bars; b++) {
      const set = new Set([barStartTick(b), bL(b)]);
      // 拍子・調が変わる小節は、頭に記号を書く場所をとる
      const keyChg = b > 0 && staves.some((st) => st.kcs[b] !== st.kcs[b - 1]);
      const mChg = b > 0 && String(mAt(b)) !== String(mAt(b - 1));
      let chgRoom = 0;
      if (keyChg) chgRoom += Math.max(1, ...staves.map((st) => Math.abs(st.kcs[b]) || Math.abs(st.kcs[b - 1]))) * 8.5 + 6;
      if (mChg) chgRoom += 20;
      let accRoom = 0;
      const need = new Map(); // 位置 → { w: 文字のはば, acc: 臨時記号がつくか }
      for (const st of staves) {
        const keyPcs = new Set([0, 2, 4, 5, 7, 9, 11].map((v, i) => (v + keyAccOf(st.kcs[b])[i] + 12) % 12));
        for (const ev of st.evAt(b)) {
          if (ev.pos < barStartTick(b)) continue;
          set.add(ev.pos);
          const n = need.get(ev.pos) || { w: 0, acc: false };
          if (ev.pitches && st.clef !== 'perc' && ev.pitches.some((p) => !keyPcs.has(((p % 12) + 12) % 12))) n.acc = true;
          if (ev.first && st.sub === 0) {
            const ly = ev.ly || (st.notes.some((x) => x.ly) ? '' : st.lyrics[ev.syll]);
            n.w = Math.max(n.w, textW(ly), nameOf && st.clef !== 'perc' && ev.pitches ? ev.pitches.length * 11 : 0);
          }
          need.set(ev.pos, n);
          if (ev.pitches && ev.pos === barStartTick(b) && n.acc) accRoom = 8;
        }
      }
      if (edit && edit.cursor != null && edit.cursor < bS(bars) && barOfT(edit.cursor) === b) set.add(edit.cursor - bS(b));
      const ticks = [...set].sort((a, c) => a - c);
      const segW = [];
      for (let i = 0; i < ticks.length - 1; i++) {
        const a = need.get(ticks[i]) || { w: 0 };
        const z = need.get(ticks[i + 1]) || { w: 0, acc: false };
        // 音の長さに合った間隔・歌詞が重ならない間隔・臨時記号の分
        segW.push(Math.max(spaceFor(ticks[i + 1] - ticks[i]), (a.w + z.w) / 2 + 5) + (z.acc ? 9 : 0));
      }
      const nat = 14 + chgRoom + accRoom + segW.reduce((a, w) => a + w, 0) + 6;
      barInfo.push({ ticks, segW, nat, accRoom, chgRoom, keyChg, mChg });
    }

    // ---- 段組み（1段に何小節入れるか） ----
    const left = 16;
    const kcMax = Math.max(0, ...staves.flatMap((s) => s.kcs.map(Math.abs)));
    const headW = (first) => 34 + kcMax * 8.5 + (first ? 26 : 6) + (staves.some((s) => s.grand) ? 10 : 0);
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
    if (!opts.perLine && lines.length > 1) {
      // 1段ごとの量を平均にそろえて、もう一度わける
      const total = barInfo.reduce((a, x) => a + x.nat, 0);
      const target = total / lines.length;
      const avail = width - left - headW(false) - 10;
      const even = [];
      let bb = 0;
      while (bb < bars) {
        let n = 0;
        let w = 0;
        while (bb + n < bars && (n === 0 || (w + barInfo[bb + n].nat <= Math.min(avail, target * 1.12) && even.length < lines.length - 1) || (even.length === lines.length - 1 && w + barInfo[bb + n].nat <= avail))) { w += barInfo[bb + n].nat; n++; }
        even.push([bb, bb + n]);
        bb += n;
      }
      if (even.length <= lines.length) lines.splice(0, lines.length, ...even);
    }

    const chordRow = chords && chords.some(Boolean) ? 16 : 0;
    const anyVolta = Object.keys(rep.volta || {}).length > 0;
    const topRow = chordRow + (anyVolta ? 16 : 0) + (anyJump ? 18 : 0);
    const staffH = (st) => (st.clef === 'perc' ? 9.5 : st.grand && st.sub === 0 ? 8.5 : 10.5) * SP + (nameOf && st.clef !== 'perc' ? 15 : 0) + (FING && st.clef !== 'perc' ? 42 : 0) + (st.hasLyr ? 18 : 0) + (st.hasDyn ? 18 : 0) + st.above + st.below;
    const systemH = topRow + staves.reduce((a, s) => a + staffH(s), 0) + 16;
    const NL = meta.nameLine ? 24 : 0; // 名前のらんのぶん、下げる
    const top = 70 + NL + (meta.subtitle ? 18 : 0);
    const height = top + lines.length * systemH + 24;
    const o = [];
    const layout = { systems: [], width, height, scale, barTicks, starts: GEO.starts };
    o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${OUTW}" height="${height * scale}" viewBox="0 0 ${width} ${height}" font-family="sans-serif">`);
    o.push(`<rect width="100%" height="100%" fill="#fff"/>`);
    o.push(`<text x="${width / 2}" y="${32 + NL}" text-anchor="middle" font-size="21" font-weight="bold" fill="#111">${esc(title)}</text>`);
    if (meta.subtitle) o.push(`<text x="${width / 2}" y="${52 + NL}" text-anchor="middle" font-size="13" fill="#333">${esc(meta.subtitle)}</text>`);
    const credits = [meta.lyricist ? '作詞：' + meta.lyricist : '', meta.composer ? '作曲：' + meta.composer : ''].filter(Boolean);
    // 名前を書くらん（プリント用）
    if (meta.nameLine) o.push(`<text x="${width - 340}" y="20" font-size="12" fill="#111">　年　　組　　番　名前</text><line x1="${width - 216}" y1="23" x2="${width - 16}" y2="23" stroke="#111" stroke-width="0.8"/>`);
    credits.forEach((c, i) => o.push(`<text x="${width - 16}" y="${top - 26 + i * 15}" text-anchor="end" font-size="12" fill="#222">${esc(c)}</text>`));
    {
      const tw = opts.tempoText ? textW(opts.tempoText) * 1.05 + 8 : 0;
      if (opts.tempoText) o.push(`<text x="${left}" y="${top - 12}" font-size="13" font-weight="bold" fill="#111">${esc(opts.tempoText)}</text>`);
      o.push(G('metNoteQuarterUp', left + tw, top - 12, 'fill="#111"', 6.5));
      o.push(`<text x="${left + tw + 11}" y="${top - 12}" font-size="13" fill="#111">= ${bpm}</text>`);
    }

    // 臨時記号は段ごと・小節ごとに覚える
    lines.forEach(([b0, b1], line) => {
      const sysTop = top + line * systemH + topRow;
      const hx = left + headW(line === 0);
      // 次の段の頭で調・拍子が変わるなら、この段の終わりに予告を書く場所をとる
      const nb = b1 < bars ? barInfo[b1] : null;
      const cautK = nb && nb.keyChg ? Math.max(1, ...staves.map((st) => Math.abs(st.kcs[b1]) || Math.abs(st.kcs[b1 - 1]))) * 8.5 + 6 : 0;
      const cautM = nb && nb.mChg ? 18 : 0;
      const caut = cautK || cautM ? cautK + cautM + 8 : 0;
      const avail = width - hx - 10 - caut;
      const natSum = barInfo.slice(b0, b1).reduce((a, x) => a + x.nat, 0);
      let stretch = avail / natSum;
      if (line === lines.length - 1 && lines.length > 1 && stretch > 1.8) stretch = 1.8;
      const sys = { y0: sysTop - topRow, y1: sysTop + systemH - topRow, bars: [], staves: [] };
      // 小節の x 位置
      let x = hx;
      for (let bb = b0; bb < b1; bb++) {
        const bi = barInfo[bb];
        const w = bi.nat * stretch;
        const k = (w - 20 - bi.accRoom - bi.chgRoom) / bi.segW.reduce((a, v) => a + v, 0);
        const xs = [];
        let cx = x + 14 + bi.chgRoom + bi.accRoom;
        bi.ticks.forEach((t, i) => { xs.push(cx); if (i < bi.segW.length) cx += bi.segW[i] * k; });
        sys.bars.push({ b: bb, x0: x, x1: x + w, ticks: bi.ticks, xs, keyChg: bi.keyChg, mChg: bi.mChg });
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
      if (anyJump) {
        const jy = sysTop - chordRow - (anyVolta ? 16 : 0) - 3;
        const al = hasJ('fine') ? ' al Fine' : hasJ('coda') ? ' al Coda' : '';
        for (const B of sys.bars) {
          if (hasJ('segno') && J.segno === B.b) o.push(G('segno', B.x0 + 3, jy + 1, 'fill="#111"', 5.5));
          if (hasJ('coda') && J.coda === B.b) o.push(G('coda', B.x0 + 3, jy + 1, 'fill="#111"', 5.5));
          const txt = [];
          if (hasJ('fine') && J.fine === B.b) txt.push('Fine');
          if (hasJ('tocoda') && J.tocoda === B.b) txt.push('To Coda');
          if (hasJ('dc') && J.dc === B.b) txt.push('D.C.' + al);
          else if (hasJ('ds') && J.ds === B.b) txt.push('D.S.' + al);
          if (txt.length) {
            const t = txt.join('　');
            const toc = hasJ('tocoda') && J.tocoda === B.b && txt.length === 1;
            o.push(`<text class="jump" x="${B.x1 - 4 - (toc ? 16 : 0)}" y="${jy}" text-anchor="end" font-size="12" font-style="italic" font-weight="bold" fill="#111">${esc(t)}</text>`);
            if (toc) o.push(G('coda', B.x1 - 17, jy + 1, 'fill="#111"', 5));
          }
        }
      }
      let yAcc = sysTop;
      staves.forEach((st, si) => {
        const stTop = yAcc + 2 * SP + st.above;
        yAcc += staffH(st);
        const perc = st.clef === 'perc';
        const yOf = (pos) => stTop + (8 - pos) * (SP / 2);
        sys.staves.push({ si, pi: st.pi, sub: st.sub, top: stTop, clef: st.clef, baseDn: st.baseDn, kc: st.kcs[b0], kcs: st.kcs, tr: st.tr, perc });
        for (let i = 0; i < 5; i++) o.push(`<line x1="${left}" x2="${xEnd + caut}" y1="${stTop + i * SP}" y2="${stTop + i * SP}" stroke="#222" stroke-width="0.9"/>`);
        if (line === 0 && (staves.length > 1) && st.sub === 0) o.push(`<text x="${left + (st.grand ? 10 : 0)}" y="${stTop - (Math.abs(st.kc) > 0 ? 15 : 7)}" font-size="10" fill="#555">${esc(st.part.name)}${st.tr ? `（in ${['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'][((-st.tr % 12) + 12) % 12]}）` : ''}</text>`);
        const cl = left + (st.grand ? 10 : 0);
        // ト音記号は第2線（ソ）、ヘ音記号は第4線（ファ）が原点
        if (perc) o.push(G('unpitchedPercussionClef1', cl + 7, yOf(4)));
        else if (st.clef === 'treble') o.push(G('gClef', cl + 4, yOf(2)));
        else o.push(G('fClef', cl + 4, yOf(6)));
        // 調号（nat=true で、取り消しのナチュラル）
        const keySig = (kc, x0, nat) => {
          for (let i = 0; i < Math.abs(kc); i++) {
            let pos = (kc >= 0 ? [8, 5, 9, 6, 3, 7, 4] : [4, 7, 3, 6, 2, 5, 1])[i];
            if (st.clef === 'bass') pos -= 2;
            o.push(G(nat ? 'accidentalNatural' : kc >= 0 ? 'accidentalSharp' : 'accidentalFlat', x0 + i * 8.5, yOf(pos)));
          }
        };
        const digits = (str, y, cx) => {
          const cs = [...String(str)];
          const tot = cs.reduce((a, c) => a + GW('timeSig' + c), 0);
          let xx = cx - tot / 2;
          for (const c of cs) { o.push(G('timeSig' + c, xx, y)); xx += GW('timeSig' + c); }
        };
        if (!perc) keySig(st.kcs[b0], cl + 30, false);
        if (line === 0) {
          const tx = cl + 34 + kcMax * 8.5;
          digits(mAt(0)[0], yOf(6), tx + 7);
          digits(mAt(0)[1], yOf(2), tx + 7);
        }
        const textY = stTop + 4 * SP + 2.7 * SP + st.below;
        const fOff = FING && !perc ? 42 : 0;
        const fingY = textY + (nameOf && !perc ? 15 : 0) - 4;
        const lyrY = textY + (nameOf && !perc ? 15 : 0) + fOff;
        const dynY = (st.hasLyr ? lyrY + 18 : textY + (nameOf && !perc ? 15 : 0) + fOff) + 2;
        const headsAt = new Map(); // abs tick → {x, ys[], up}（スラー用）
        const prevOf = { A: null, B: null };
        for (const B of sys.bars) {
          const bb = B.b;
          const kcB = st.kcs[bb];
          const keyAcc = keyAccOf(kcB);
          const barAcc = {};
          // 拍子・調が変わる小節の頭
          {
            let cx2 = B.x0 + 5;
            if (B.keyChg && !perc) {
              const nk = kcB;
              const ok = st.kcs[bb - 1];
              if (bb !== b0) { if (nk === 0) keySig(ok, cx2, true); else keySig(nk, cx2, false); }
              cx2 += Math.max(1, Math.abs(nk) || Math.abs(ok)) * 8.5 + 6;
            } else if (B.keyChg) cx2 += Math.max(1, ...staves.map((s2) => Math.abs(s2.kcs[bb]) || Math.abs(s2.kcs[bb - 1]))) * 8.5 + 6;
            if (B.mChg) { digits(mAt(bb)[0], yOf(6), cx2 + 6); digits(mAt(bb)[1], yOf(2), cx2 + 6); }
          }
          const notPick = (ev) => !(bb === 0 && pickup && ev.pos < bL(0) - pickup);
          // mode 0: 1声部だけ / 1: 上の声部（ぼう上） / 2: 下の声部（ぼう下）
          const drawEvs = (evs, mode, stream, allBars) => {
          const drawn = [];
          let prevHead = prevOf[stream];
          const yR = mode === 1 ? (q) => yOf(q + 4) : mode === 2 ? (q) => yOf(q - 4) : yOf;
          for (let ei = 0; ei < evs.length; ei++) {
            const ev = evs[ei];
            if (BLANK.has(bb)) { prevHead = null; continue; }
            const x0 = xAt(bb, ev.pos);
            if (ev.rest) {
              const rx = ev.whole ? (B.x0 + B.x1) / 2 - 5 : x0;
              drawRest(o, ev, rx, yR);
              prevHead = null;
              continue;
            }
            // 次の音（♯/♭の向きを決める）
            let nextP = null;
            for (let j = ei + 1; j < evs.length; j++) if (!evs[j].rest) { nextP = evs[j].pitches[evs[j].pitches.length - 1]; break; }
            if (nextP == null && allBars[bb + 1]) { const nx = allBars[bb + 1].find((e) => !e.rest); if (nx) nextP = nx.pitches[nx.pitches.length - 1]; }
            let heads;
            if (perc) {
              heads = ev.pitches.map((p) => ({ pos: Math.floor((p - 1000) / 10), shape: (p - 1000) % 10, accTxt: null, p }));
            } else {
              heads = ev.pitches.map((m) => {
                const top = ev.pitches[ev.pitches.length - 1];
                const pref = nextP == null ? 0 : nextP > top ? 1 : nextP < top ? -1 : 0;
                const sp = spellPref(m, kcB, pref);
                const pos = sp.dn - st.baseDn;
                const cur = sp.dn in barAcc ? barAcc[sp.dn] : keyAcc[sp.letter];
                let accTxt = null;
                if (cur !== sp.acc && !ev.tieEnd) { accTxt = ACC_CH[sp.acc]; barAcc[sp.dn] = sp.acc; }
                return { pos, accTxt, acc: sp.acc, p: m - st.tr };
              });
            }
            heads.sort((a, c) => a.pos - c.pos);
            const lo = heads[0].pos;
            const hi = heads[heads.length - 1].pos;
            const up = perc || mode === 1 ? true : mode === 2 ? false : !((hi - 4) > (4 - lo) || ((hi - 4) === (4 - lo) && hi >= 4));
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
              const hn = headName(ev.base, perc ? h.shape : 0);
              const hw = GW(hn) / 2;
              const le = hw + 0.4 * SP;
              if (h.pos < -1) for (let lp = -2; lp >= h.pos; lp -= 2) o.push(`<line x1="${x - le + Math.min(0, disp[i])}" x2="${x + le + Math.max(0, disp[i])}" y1="${yOf(lp)}" y2="${yOf(lp)}" stroke="#111" stroke-width="1.3"/>`);
              if (h.pos > 9) for (let lp = 10; lp <= h.pos; lp += 2) o.push(`<line x1="${x - le + Math.min(0, disp[i])}" x2="${x + le + Math.max(0, disp[i])}" y1="${yOf(lp)}" y2="${yOf(lp)}" stroke="#111" stroke-width="1.3"/>`);
              const isSel = sel && edit.sel.has(ev.src + ':' + h.p);
              const col = isSel ? SELC : '#111';
              const data = `class="nh" data-pi="${st.pi}" data-s="${ev.src}" data-e="${ev.srcEnd}" data-p="${h.p}"${stream === 'B' ? ' data-v="2"' : ''}`;
              // 符頭のまわりに、クリックしやすい透明な当たりを入れる
              o.push(`<rect ${data.replace('class="nh"', 'class="nhhit"')} x="${hx2 - hw - 2}" y="${y - 5}" width="${hw * 2 + 4}" height="10" fill="transparent"/>`);
              o.push(G(hn, hx2 - hw, y, `${data} fill="${col}"`));
              if (h.accTxt) {
                if (lastAccPos - h.pos < 6) accCol++; else accCol = 0;
                lastAccPos = h.pos;
                const an = ACC_G[h.acc] || 'accidentalNatural';
                o.push(G(an, x - hw - GW(an) - 2.5 - accCol * 9 + Math.min(0, disp[i]), y, `fill="${col}"`));
              }
              if (ev.dot) { const dy = h.pos % 2 === 0 ? -SP / 2 : 0; o.push(G('augmentationDot', x + hw + 3 + Math.max(0, ...disp), y + dy, `fill="${col}"`)); }
            }
            // 階名・歌詞
            if (!perc && nameOf && ev.first && stream === 'A') o.push(`<text x="${x}" y="${textY}" font-size="10.5" font-weight="600" text-anchor="middle" fill="#1e3a8a">${esc(heads.map((h) => nameOf(h.p)).reverse().join('・'))}</text>`);
            if (!perc && FING && ev.first && stream === 'A' && heads.length === 1) {
              const f = FING[heads[0].p];
              if (f) o.push(fingerSvg(x, fingY, f));
            }
            const lyr = ev.first ? (ev.ly || (st.notes.some((n) => n.ly) ? '' : st.lyrics[ev.syll])) : '';
            if (st.sub === 0 && lyr && stream === 'A') o.push(`<text x="${x}" y="${lyrY}" font-size="12" text-anchor="middle" fill="#111">${esc(lyr)}</text>`);
            const flags = ev.base <= 6 ? 3 : ev.base <= 12 ? 2 : ev.base <= 24 ? 1 : 0;
            const d = { x, up, lo, hi, flags, hasStem: ev.base < 192, ev, yOf, beatIdx: Math.floor(ev.pos / beatOf(mAt(bb))), heads, disp, forced: mode ? mode === 1 : null };
            drawn.push(d);
            if (!headsAt.has(ev.abs) || stream === 'A') headsAt.set(ev.abs, d);
            if (prevHead && prevHead.ev.tie) drawTie(o, prevHead, d, yOf);
            prevHead = d;
          }
          prevOf[stream] = prevHead;
          drawStemsAndBeams(o, drawn, mAt(bb));
          drawTriplets(o, drawn, yOf);
          return drawn;
          };
          const two = st.has2[bb];
          const drawn = drawEvs(st.bars[bb].filter(notPick), two ? 1 : 0, 'A', st.bars);
          if (two) drawn.push(...drawEvs(st.bars2[bb].filter(notPick), 2, 'B', st.bars2));
          else prevOf.B = null;
          // アーティキュレーション（符頭の、ぼうと反対がわ）
          for (const d of drawn) {
            const arts = d.ev.first ? d.ev.art || [] : [];
            let k = 0;
            for (const a of arts) {
              if (a === 'ferm') continue;
              const below = d.up;
              // 符頭から半スペース以上はなし、線の上にかからないように
              let yy = below ? d.yOf(d.lo) + 6 + k * 9 : d.yOf(d.hi) - 6 - k * 9;
              const nm = { stac: 'articStaccato', ten: 'articTenuto', acc: 'articAccent', marc: 'articMarcato' }[a] + (below ? 'Below' : 'Above');
              if (!Glyphs.g[nm]) continue;
              o.push(G(nm, d.x - GW(nm) / 2, yy));
              k++;
            }
            if (arts.includes('ferm')) {
              const yy = Math.min(d.yOf(9.5), d.yOf(d.hi) - 8, d.up ? stemEnd(d) - 4 : 99999);
              o.push(G('fermataAbove', d.x - GW('fermataAbove') / 2, yy));
            }
          }
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
          else if (bb === bars - 1 || (hasJ('fine') && J.fine === bb)) o.push(`<line x1="${ex - 5}" x2="${ex - 5}" y1="${yT}" y2="${yB}" stroke="#222"/><rect x="${ex - 3}" y="${yT}" width="3" height="${4 * SP}" fill="#222"/>`);
          else o.push(`<line x1="${ex}" x2="${ex}" y1="${yT}" y2="${yB}" stroke="#222"/>`);
          if (si === 0 && chords && chords[bb]) {
            const co = opts.chordObjs && opts.chordObjs[bb];
            const parts = String(chords[bb]).split('・');
            if (co && co.h && co.hAt && parts.length === 2) {
              o.push(`<text x="${B.xs[0] - 4}" y="${stTop - 2.9 * SP}" font-size="13" font-weight="bold" fill="#c2410c">${esc(parts[0])}</text>`);
              o.push(`<text x="${xAt(bb, co.hAt) - 4}" y="${stTop - 2.9 * SP}" font-size="13" font-weight="bold" fill="#c2410c">${esc(parts[1])}</text>`);
            } else o.push(`<text x="${B.xs[0] - 4}" y="${stTop - 2.9 * SP}" font-size="13" font-weight="bold" fill="#c2410c">${esc(chords[bb])}</text>`);
          }
          // rit. / accel. はコード名の上に（かさならないように）
          if (si === 0 && opts.words && opts.words[bb]) o.push(`<text x="${B.xs[0]}" y="${stTop - 2.9 * SP - (chords && chords[bb] ? 15 : 0)}" font-size="13" font-style="italic" font-weight="bold" fill="#111">${esc(opts.words[bb])}</text>`);
        }
        // 予告の調号・拍子（段の終わり）
        if (caut) {
          let cx3 = xEnd + 7;
          if (cautK && !perc) {
            const nk = st.kcs[b1];
            const ok = st.kcs[b1 - 1];
            if (nk !== ok) { if (nk === 0) keySig(ok, cx3, true); else keySig(nk, cx3, false); }
            cx3 += cautK;
          } else if (cautK) cx3 += cautK;
          if (cautM) { digits(mAt(b1)[0], yOf(6), cx3 + 6); digits(mAt(b1)[1], yOf(2), cx3 + 6); }
          o.push(`<line x1="${xEnd - 3}" x2="${xEnd - 3}" y1="${stTop}" y2="${stTop + 4 * SP}" stroke="#222"/>`);
        }
        // スラー
        for (const sl of st.part.slurs || []) {
          const a = headsAt.get(sl.s);
          const z = headsAt.get(sl.e);
          if (!a && !z) continue;
          const inSys = (t) => t >= bS(b0) && t < bS(b1);
          if (!inSys(sl.s) && !inSys(sl.e) && !(sl.s < bS(b0) && sl.e >= bS(b1))) continue;
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
          const tx = (t) => { if (t < 0 || t >= bS(bars)) return null; const bb = barOfT(t); if (bb < b0 || bb >= b1) return null; return xAt(bb, t - bS(bb)); };
          for (const dy of st.part.dyn || []) {
            let xx = tx(dy.t);
            if (xx == null) continue;
            xx -= 5;
            for (const c of dy.v) { const nm = DYN_G[c]; if (!nm) continue; o.push(G(nm, xx, dynY + 2)); xx += GW(nm) * 0.92; }
          }
          for (const hp of st.part.hairpins || []) {
            if (hp.e <= bS(b0) || hp.s >= bS(b1)) continue;
            const xa = hp.s >= bS(b0) ? tx(hp.s) + 18 : sys.bars[0].xs[0];
            const xz = hp.e < bS(b1) ? tx(hp.e) - 4 : xEnd - 6;
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
          const cb = edit.cursor >= bS(bars) ? bars : barOfT(edit.cursor);
          if (cb >= b0 && cb < b1) {
            const cxx = xAt(cb, edit.cursor - bS(cb));
            const grandH = st.grand ? staffH(st) : 0;
            o.push(`<rect class="cursor" x="${cxx - 7}" y="${stTop - 12}" width="${Math.max(14, (edit.curLen || 0) ? 14 : 14)}" height="${4 * SP + 24 + grandH}" rx="4" fill="${SELC}" fill-opacity=".14" stroke="${SELC}" stroke-width="1.2"/>`);
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
          o.push(G('brace', xm - 3, yZ, 'fill="#111"', (yZ - yA) / 4));
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
    const data = `class="rest" data-s="${ev.abs}" fill="#111"`;
    const nm = base >= 192 ? 'restWhole' : base >= 96 ? 'restHalf' : base >= 48 ? 'restQuarter' : base >= 24 ? 'rest8th' : base >= 12 ? 'rest16th' : 'rest32nd';
    // 全休符は第4線（上から2本目）からぶら下がる。ほかは中央の線
    const y = nm === 'restWhole' ? yOf(6) : yOf(4);
    o.push(G(nm, x - GW(nm) / 2, y, data));
    if (ev.dot) o.push(G('augmentationDot', x + GW(nm) / 2 + 3, yOf(5)));
  }
  // 符尾は符頭のはし（Bravura の stemUpSE / stemDownNW）
  const stemX = (d) => (d.up ? d.x + 4.25 : d.x - 4.25);
  function stemEnd(d) {
    const len = 3.5 * SP;
    let y = d.up ? d.yOf(d.hi) - len : d.yOf(d.lo) + len;
    // 加線の多い音はぼうを中央線までのばす
    if (d.up && y > d.yOf(4)) y = d.yOf(4);
    if (!d.up && y < d.yOf(4)) y = d.yOf(4);
    return y;
  }
  function drawStemsAndBeams(o, drawn, meter) {
    let groups = [];
    let curG = null;
    for (const d of drawn) {
      if (d.flags > 0 && curG && curG[curG.length - 1].beatIdx === d.beatIdx && !!curG[0].ev.trip === !!d.ev.trip) curG.push(d);
      else if (d.flags > 0) { curG = [d]; groups.push(curG); } else curG = null;
    }
    if (meter && meter[0] === 4 && meter[1] === 4) {
      const pure8 = (g) => g.length === 2 && g.every((d) => d.flags === 1 && !d.ev.trip && !d.ev.dot) && g[0].ev.pos % 48 === 0;
      const merged = [];
      for (let i = 0; i < groups.length; i++) {
        const a = groups[i];
        const z = groups[i + 1];
        if (z && pure8(a) && pure8(z) && a[0].beatIdx % 2 === 0 && z[0].beatIdx === a[0].beatIdx + 1) { merged.push([...a, ...z]); i++; } else merged.push(a);
      }
      groups = merged;
    }
    const beamed = new Set();
    for (const g of groups) {
      if (g.length < 2) continue;
      // 連桁の向き：いちばん中央線から遠い音で決める
      const far = g.reduce((a, d) => Math.max(a, Math.abs(d.hi - 4), Math.abs(d.lo - 4)), 0);
      const farHi = g.some((d) => d.hi - 4 === far);
      const up = g[0].forced != null ? g[0].forced : !(farHi && g.every((d) => !(4 - d.lo > far)));
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
      for (const d of g) o.push(`<line x1="${stemX(d)}" x2="${stemX(d)}" y1="${up ? d.yOf(d.lo) - 1.3 : d.yOf(d.hi) + 1.3}" y2="${by(d)}" stroke="#111" stroke-width="1"/>`);
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
      o.push(`<line x1="${x}" x2="${x}" y1="${d.up ? d.yOf(d.lo) - 1.3 : d.yOf(d.hi) + 1.3}" y2="${ye}" stroke="#111" stroke-width="1"/>`);
      if (d.flags) o.push(G(`flag${d.flags === 1 ? '8th' : d.flags === 2 ? '16th' : '32nd'}${d.up ? 'Up' : 'Down'}`, x - 0.5, ye));
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
      o.push(G('tuplet3', (x0 + x1) / 2 + (up ? 4 : -4) - GW('tuplet3', 7) / 2, y, 'fill="#111"', 7));
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
      const bLen = layout.starts ? layout.starts[B.b + 1] - layout.starts[B.b] : layout.barTicks;
      pos = Math.max(B.ticks[0], Math.min(bLen - 1, pos));
      const posLine = Math.round((st.top + 4 * SP - y) / (SP / 2));
      let pitch = null;
      if (!st.perc) {
        const dn = posLine + st.baseDn;
        const letter = ((dn % 7) + 7) % 7;
        const oct = Math.floor(dn / 7);
        pitch = 12 * (oct + 1) + LETTER_PC[letter] + keyAccOf(st.kcs ? st.kcs[B.b] : st.kc)[letter] - st.tr;
      }
      return { pi: st.pi, sub: st.sub, bar: B.b, tick: (layout.starts ? layout.starts[B.b] : B.b * layout.barTicks) + pos, pitch, staffPos: posLine, perc: st.perc };
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
    if (clef === 'treble') o.push(Glyphs.svg('gClef', 4, yOf(2), SP * s));
    else o.push(Glyphs.svg('fClef', 4, yOf(6), SP * s));
    const x = 60;
    const y = yOf(pos);
    if (pos < -1) for (let lp = -2; lp >= pos; lp -= 2) o.push(`<line x1="${x - 8}" x2="${x + 8}" y1="${yOf(lp)}" y2="${yOf(lp)}" stroke="currentColor"/>`);
    if (pos > 9) for (let lp = 10; lp <= pos; lp += 2) o.push(`<line x1="${x - 8}" x2="${x + 8}" y1="${yOf(lp)}" y2="${yOf(lp)}" stroke="currentColor"/>`);
    o.push(Glyphs.svg('noteheadBlack', x - GW('noteheadBlack', SP * s) / 2, y, SP * s));
    const keyAcc = keyAccOf(kc);
    if (sp.acc !== keyAcc[sp.letter]) { const an = ACC_G[sp.acc]; o.push(Glyphs.svg(an, x - GW('noteheadBlack', SP * s) / 2 - GW(an, SP * s) - 2, y, SP * s)); }
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
    MINOR = !!opts.minor;
    const { parts, bars, barTicks, meter, key, minor, title, bpm, chords, meta = {} } = opts;
    const rep = opts.repeats || { start: [], end: [], volta: {} };
    const GEO = opts.geo || { starts: Array.from({ length: bars + 1 }, (_, i) => i * barTicks), meters: Array(bars).fill(meter), keys: Array(bars).fill({ key, minor }) };
    const bL = (b) => GEO.starts[b + 1] - GEO.starts[b];
    const pickup = opts.pickup > 0 && opts.pickup < bL(0) ? opts.pickup : 0;
    const J = opts.jumps || {};
    const hasJ = (k) => J[k] != null && J[k] >= 0 && J[k] < bars;
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
      const kcs = GEO.keys.map((k) => keyCount(k.key + tr, k.minor));
      let kc = kcs[0];
      let clef = p.clef || 'auto';
      if (p.perc) clef = 'perc';
      const allN = p.perc ? p.notes.map((n) => ({ ...n, p: 1000 + (DRUM_POS[n.id] || [5, 'n'])[0] * 10 + ((DRUM_POS[n.id] || [5, 'n'])[1] !== 'n' ? 1 : 0) })) : tr ? p.notes.map((n) => ({ ...n, p: n.p + tr })) : p.notes;
      const notes = allN.filter((n) => n.v !== 2);
      const notes2 = allN.filter((n) => n.v === 2);
      if (clef === 'auto' || clef === 'grand') { const avg = allN.length ? allN.reduce((a, n) => a + n.p, 0) / allN.length : 67; clef = clef === 'grand' ? 'grand' : avg < 57 ? 'bass' : 'treble'; }
      const evBars = buildEvents(notes, bars, GEO, null, meter);
      const evBars2 = notes2.length ? buildEvents(notes2, bars, GEO, null, meter) : null;
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
        kc = kcs[b];
        const mB = GEO.meters[b] || meter;
        const kChg = b > 0 && kcs[b] !== kcs[b - 1] && clef !== 'perc';
        const mChg = b > 0 && String(mB) !== String(GEO.meters[b - 1]);
        if (b > 0 && (kChg || mChg)) x.push(`<attributes>${kChg ? `<key><fifths>${kc}</fifths><mode>${GEO.keys[b].minor ? 'minor' : 'major'}</mode></key>` : ''}${mChg ? `<time><beats>${mB[0]}</beats><beat-type>${mB[1]}</beat-type></time>` : ''}</attributes>`);
        if (pi === 0 && hasJ('segno') && J.segno === b) x.push('<direction placement="above"><direction-type><segno/></direction-type><sound segno="s1"/></direction>');
        if (pi === 0 && hasJ('coda') && J.coda === b) x.push('<direction placement="above"><direction-type><coda/></direction-type><sound coda="c1"/></direction>');
        if (b === 0) {
          x.push('<attributes><divisions>48</divisions>');
          if (clef !== 'perc') x.push(`<key><fifths>${kc}</fifths><mode>${GEO.keys[0].minor ? 'minor' : 'major'}</mode></key>`);
          x.push(`<time><beats>${mB[0]}</beats><beat-type>${mB[1]}</beat-type></time>`);
          if (tr) x.push(`<transpose><diatonic>${-Math.round(tr * 7 / 12)}</diatonic><chromatic>${-tr}</chromatic></transpose>`);
          x.push(clef === 'perc' ? '<clef><sign>percussion</sign></clef>' : clef === 'bass' ? '<clef><sign>F</sign><line>4</line></clef>' : '<clef><sign>G</sign><line>2</line></clef>');
          x.push('</attributes>');
          if (pi === 0) x.push(`<direction placement="above"><direction-type>${opts.tempoText ? `<words font-weight="bold">${esc(opts.tempoText)}</words></direction-type><direction-type>` : ''}<metronome><beat-unit>quarter</beat-unit><per-minute>${bpm}</per-minute></metronome></direction-type><sound tempo="${bpm}"/></direction>`);
        }
        if (pi === 0 && opts.words && opts.words[b]) x.push(`<direction placement="above"><direction-type><words font-style="italic">${esc(opts.words[b])}</words></direction-type></direction>`);
        if (pi === 0 && opts.soundTempos && opts.soundTempos[b] && b > 0 && !(opts.tempos && opts.tempos[b])) x.push(`<direction placement="above"><direction-type><words/></direction-type><sound tempo="${opts.soundTempos[b]}"/></direction>`);
        if (pi === 0 && opts.tempos) { const t = opts.tempos[b]; if (t && b > 0) x.push(`<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${t}</per-minute></metronome></direction-type><sound tempo="${t}"/></direction>`); }
        if (pi === 0 && chords && chords[b]) {
          const c = chords[b];
          const rootPref = (r) => ([1, 3, 6, 8, 10].includes(((r % 12) + 12) % 12) ? (kc > 0 || (r % 12 === 6 && kc >= 0) ? 1 : -1) : 0);
          const sp = spellPref(c.r + 60, kc, rootPref(c.r));
          x.push(`<harmony><root><root-step>${sp.step}</root-step>${sp.acc ? `<root-alter>${sp.acc}</root-alter>` : ''}</root><kind>${HK[c.q] || 'major'}</kind></harmony>`);
          if (c.h && c.hAt) {
            const sh = spellPref(c.h.r + 60, kc, rootPref(c.h.r));
            x.push(`<harmony><root><root-step>${sh.step}</root-step>${sh.acc ? `<root-alter>${sh.acc}</root-alter>` : ''}</root><kind>${HK[c.h.q] || 'major'}</kind><offset>${c.hAt}</offset></harmony>`);
          }
        }
        const dirAt = (t) => {
          for (const dy of p.dyn || []) if (dy.t === t && DYN.has(dy.v)) x.push(`<direction placement="below"><direction-type><dynamics><${dy.v}/></dynamics></direction-type></direction>`);
          for (const hp of p.hairpins || []) {
            if (hp.s === t) x.push(`<direction placement="below"><direction-type><wedge type="${hp.type === 'cresc' ? 'crescendo' : 'diminuendo'}"/></direction-type></direction>`);
            if (hp.e === t) x.push('<direction placement="below"><direction-type><wedge type="stop"/></direction-type></direction>');
          }
        };
        const notPick = (ev) => !(b === 0 && pickup && ev.pos < bL(0) - pickup);
        const voices = evBars2 && evBars2[b].some((ev) => !ev.rest) ? [evBars[b].filter(notPick), evBars2[b].filter(notPick)] : [evBars[b].filter(notPick)];
        voices.forEach((evs, vi) => {
        const vx = voices.length > 1 ? `<voice>${vi + 1}</voice>` : '';
        if (vi > 0) x.push(`<backup><duration>${voices[0].reduce((a, ev) => a + ev.len, 0)}</duration></backup>`);
        for (const ev of evs) {
          if (vi === 0) dirAt(ev.abs);
          const typeXml = (e) => `<type>${TYPE_NAME[e.base] || 'whole'}</type>${e.dot ? '<dot/>' : ''}${e.trip ? '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>' : ''}`;
          if (ev.rest) { x.push(`<note><rest${ev.whole ? ' measure="yes"' : ''}/><duration>${ev.len}</duration>${vx}${ev.whole ? '' : typeXml(ev)}</note>`); continue; }
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
            const ly = k === 0 && ev.first && vi === 0 ? (useNoteLy ? ev.ly : lyr[ev.syll]) : '';
            const lyric = ly ? `<lyric number="1"><syllabic>single</syllabic><text>${esc(ly)}</text></lyric>` : '';
            x.push(`<note>${k > 0 ? '<chord/>' : ''}${pitch}<duration>${ev.len}</duration>${ties}${vx}${typeXml(ev)}${p.perc && (m - 1000) % 10 ? '<notehead>x</notehead>' : ''}${nots ? `<notations>${nots}</notations>` : ''}${lyric}</note>`);
          });
        }
        });
        if (pi === 0) {
          const al = hasJ('fine') ? ' al Fine' : hasJ('coda') ? ' al Coda' : '';
          const words = (t, snd) => x.push(`<direction placement="above"><direction-type><words font-style="italic">${esc(t)}</words></direction-type><sound ${snd}/></direction>`);
          if (hasJ('fine') && J.fine === b) words('Fine', 'fine="yes"');
          if (hasJ('tocoda') && J.tocoda === b) words('To Coda', 'tocoda="c1"');
          if (hasJ('dc') && J.dc === b) words('D.C.' + al, 'dacapo="yes"');
          else if (hasJ('ds') && J.ds === b) words('D.S.' + al, 'dalsegno="s1"');
        }
        const isEnd = (rep.end || []).includes(b);
        const voltaEnd = rep.volta[b] && rep.volta[b + 1] !== rep.volta[b];
        const fin = b === bars - 1 || (hasJ('fine') && J.fine === b);
        if (isEnd || voltaEnd || fin) {
          x.push(`<barline location="right">${isEnd || fin ? '<bar-style>light-heavy</bar-style>' : ''}${voltaEnd ? `<ending number="${rep.volta[b]}" type="${isEnd ? 'stop' : 'discontinue'}"/>` : ''}${isEnd ? '<repeat direction="backward"/>' : ''}</barline>`);
        }
        x.push('</measure>');
      }
      x.push('</part>');
    });
    x.push('</score-partwise>');
    return x.join('\n');
  }

  // 印刷用：楽譜を A4 のページに分ける（段のとちゅうでは切らない）
  // ratio = ページの高さ ÷ はば（A4・よはく12mm で 273/186）
  function paginate(svg, layout, ratio = 273 / 186) {
    if (!layout || !layout.systems.length) return [svg];
    const W = layout.width;
    const PH = W * ratio;
    const sc = layout.scale || 1;
    const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    const sys = layout.systems;
    const cuts = [];
    let y0 = 0;
    let i = 0;
    while (i < sys.length) {
      let j = i;
      while (j < sys.length && sys[j].y1 + 4 - y0 <= PH - 20) j++;
      if (j === i) j = i + 1; // 1段がページより大きいとき
      const cut = j < sys.length ? sys[j].y0 - 2 : layout.height;
      cuts.push({ y0, cut });
      if (j < sys.length) y0 = sys[j].y0 - 16;
      i = j;
    }
    if (cuts.length === 1) return [svg];
    return cuts.map(({ y0: a, cut }, k) => `<svg xmlns="http://www.w3.org/2000/svg" class="page" width="${W * sc}" height="${PH * sc}" viewBox="0 ${a} ${W} ${PH}" overflow="hidden" font-family="sans-serif"><rect x="0" y="${a}" width="${W}" height="${PH}" fill="#fff"/>${inner}<rect x="0" y="${cut}" width="${W}" height="${Math.max(0, a + PH - cut) + 200}" fill="#fff"/><text x="${W / 2}" y="${a + PH - 8}" text-anchor="middle" font-size="10" fill="#666">${k + 1} / ${cuts.length}</text></svg>`);
  }

  return { render, paginate, single, hit, keyCount, buildEvents, spell, spellPref, splitLyrics, musicXML, DRUM_POS, lastLayout: null };
})();
