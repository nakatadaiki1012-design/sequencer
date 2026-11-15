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
  // 五線の上に書く記号（装飾記号・弓）。'ferm' はべつに書く
  const ABOVE_ART = new Set(['tr', 'prall', 'mord', 'turn', 'upb', 'dnb', 'ferm']);
  const ORN_G = { tr: 'ornamentTrill', prall: 'ornamentShortTrill', mord: 'ornamentMordent', turn: 'ornamentTurn', upb: 'stringsUpBow', dnb: 'stringsDownBow' };
  // 弦の開放の音（低い弦から）
  const TUNING = { guitar: [40, 45, 50, 55, 59, 64], ukulele: [67, 60, 64, 69], bass: [28, 33, 38, 43] };
  // 和音のそれぞれの音を、どの弦の何フレットで弾くか（手の位置 pos の近くを、えらぶ）
  function fretsFor(pitches, tun, pos) {
    // 和音ぜんぶで、いちばん弾きやすい組み合わせをさがす（開放弦は楽、手のはばは4フレットまで、手の位置の近く）
    const ps = pitches.slice().sort((a, b) => b - a).slice(0, tun.length);
    let best = null;
    const pick = [];
    const go = (i, used) => {
      if (i === ps.length) {
        const fr = pick.map((q) => q.f).filter((f) => f > 0);
        const span = fr.length ? Math.max(...fr) - Math.min(...fr) : 0;
        if (span > 4) return;
        const cost = pick.reduce((a, q) => a + (q.f === 0 ? 0 : 1 + Math.abs(q.f - pos) * 0.8 + Math.max(0, q.f - 7) * 0.3), 0) + span * 0.3;
        if (!best || cost < best.cost) best = { cost, list: pick.slice() };
        return;
      }
      tun.forEach((o, si) => {
        if (used & (1 << si)) return;
        const f = ps[i] - o;
        if (f < 0 || f > 20) return;
        pick.push({ si, f });
        go(i + 1, used | (1 << si));
        pick.pop();
      });
    };
    go(0, 0);
    if (best) return best.list;
    // 弾けない組み合わせ（はばが広い）は、1音ずつ近い所
    const used = new Set();
    const out = [];
    for (const p of ps) {
      let b2 = null;
      tun.forEach((o, si) => { const f = p - o; if (used.has(si) || f < 0 || f > 20) return; const c = Math.abs(f - pos); if (!b2 || c < b2.c) b2 = { si, f, c }; });
      if (b2) { used.add(b2.si); out.push({ si: b2.si, f: b2.f }); }
    }
    return out;
  }
  const CLEF_BASE = { treble: 30, treble8: 23, alto: 24, bass: 18 };
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

  // 変ホ短調（E♭m）は♭6つ（平行調の G♭ 長調）。KEYSIG の F♯ 長調（♯6）を使わない
  const keyCount = (key, minor) => { const pc = (((minor ? key + 3 : key) % 12) + 12) % 12; return minor && pc === 6 ? -6 : KEYSIG[pc]; };
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
  // 音部記号を自動でえらぶ：加線がいちばん少ないもの。テノールのパートは「ト音記号の8つ下」
  function autoClef(notes, name) {
    if (!notes.length) return 'treble';
    if (/テノール|テナー|tenor/i.test(name || '') && !/サックス|sax|トロンボーン|trombone|チューバ|tuba/i.test(name || '')) return 'treble8';
    const ledg = (base) => notes.reduce((a, n) => { const pos = Math.round(((n.p - base) * 7) / 12); return a + Math.max(0, pos - 9) + Math.max(0, -1 - pos); }, 0);
    // 第1線（ト音：ミ4=64、ヘ音：ソ2=43）からの、だいたいの線の位置
    const t = ledg(64);
    const bs = ledg(43);
    return bs < t * 0.8 ? 'bass' : 'treble';
  }

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
          // 6/8 などで、拍の中の「8分＋4分」（♪♩）は、4分音符のまま書く（拍のおわりまで）
          const fillBeat = compound && !rest && !v[2] && (pos % beat) + v[0] === beat;
          if (v[3]) { if (pos % (v[0] / 2) !== 0) continue; } else if (!fillBeat && (compound ? (pos % beat) % Math.min(v[0], beat) !== 0 : pos % Math.min(v[1], beat) !== 0)) continue;
          // 拍のとちゅうから始まる音は、次の拍の頭をまたがない（付点8分＋16分ではなく、8分＋8分のタイ）
          if (!compound && !v[3] && beat && pos % beat !== 0 && pos + v[0] > (Math.floor(pos / beat) + 1) * beat) continue;
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
      const fg = g.filter((n) => n.fg).sort((a, b) => b.p - a.p).map((n) => n.fg).join('');
      const gr = (g.find((n) => n.gr != null) || {}).gr;
      const enh = (g.find((n) => n.enh) || {}).enh || 0; // J で入れかえた ♯・♭ の書き方
      segs.push({ s, e: end, pitches: [...new Set(g.map((n) => n.p))].sort((a, b) => a - b), art, ly, fg, gr, enh, src: s, vel: Math.max(...g.map((n) => n.vel || 1)) });
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
            const ev = { ...p, rest: isRest, pitches: sg.pitches, abs: a0 + p.pos, src: sg.src, srcEnd: sg.e, vel: sg.vel, enh: sg.enh };
            if (!isRest && first) { ev.first = true; ev.syll = syll++; ev.art = sg.art; ev.ly = sg.ly; ev.fg = sg.fg; ev.gr = sg.gr; first = false; }
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
      // オクターブ記号（8va・8vb）：その間の音は1オクターブずらして書く（鳴る音はそのまま）
      const ott = (p.ottava || []).filter((q) => q.e > q.s && q.k);
      const ottAt = (t) => { const q = ott.find((o2) => t >= o2.s && t < o2.e); return q ? q.k : 0; };
      const common = { pi, part: p, kc, kcs, tr, lyrics: p.lyrics || [], ott, ottAt };
      if (p.perc) {
        const pn = p.notes.map((n) => ({ ...n, p: 1000 + (DRUM_POS[n.id] || [5, 'n'])[0] * 10 + ((DRUM_POS[n.id] || [5, 'n'])[1] === 'x' ? 1 : (DRUM_POS[n.id] || [5, 'n'])[1] === 'o' ? 2 : 0) }));
        staves.push({ ...common, clef: 'perc', notes: pn, notes2: [], sub: 0, kc: 0, kcs: kcs.map(() => 0) });
        return;
      }
      // 声部：v:2 の音は「下の声部」（ぼうを下向き）
      const allO = ott.length ? all.map((n) => { const k = ottAt(n.s); return k ? { ...n, p: n.p - 12 * k } : n; }) : all;
      const notes = allO.filter((n) => n.v !== 2);
      const notes2 = allO.filter((n) => n.v === 2);
      let clef = p.clef || 'auto';
      if (clef === 'grand') {
        staves.push({ ...common, clef: 'treble', notes: notes.filter((n) => n.p >= 60), notes2: notes2.filter((n) => n.p >= 60), sub: 0, grand: true });
        staves.push({ ...common, clef: 'bass', notes: notes.filter((n) => n.p < 60), notes2: notes2.filter((n) => n.p < 60), sub: 1, grand: true, lyrics: [] });
        return;
      }
      if (clef === 'auto') clef = autoClef(all, p.name);
      // TAB譜（ギター・ウクレレ・ベース）：'both' は五線の下に、'only' はTABだけ
      const tun = p.tab ? TUNING[p.tabTuning] || TUNING.guitar : null;
      if (p.tab !== 'only') staves.push({ ...common, clef, notes, notes2, sub: 0 });
      if (tun) staves.push({ ...common, clef: 'tab', tab: tun, notes: allO.slice(), notes2: [], sub: p.tab === 'only' ? 0 : 2, tabOf: p.tab !== 'only' });
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
      // とちゅうで音部記号が変わる（小節の頭で）
      st.clef0 = st.clef;
      const chg = st.clef !== 'perc' && !st.grand ? st.part.clefChg || {} : {};
      st.clefChg = chg;
      st.clefAt = (b) => { let c = st.clef0; for (let i = 1; i <= b; i++) if (chg[i] && CLEF_BASE[chg[i]] != null) c = chg[i]; return c; };
      st.baseAt = (b) => CLEF_BASE[st.clefAt(b)] != null ? CLEF_BASE[st.clefAt(b)] : 30;
      st.baseDn = st.baseAt(0);
      st.hasLyr = st.sub === 0 && (st.notes.some((n) => n.ly) || st.lyrics.some(Boolean) || (opts.ivPart && st.part.id === opts.ivPart));
      st.hasDyn = st.sub === (st.grand ? 1 : 0) && ((st.part.dyn || []).length || (st.part.hairpins || []).length);
      st.dynAbove = !!(st.hasDyn && st.sub === 0 && !st.grand && (st.notes.some((n) => n.ly) || st.lyrics.some(Boolean)));
      // 五線の外にはみ出す音（加線）の分だけ、段の上下をあける
      let lo = 0;
      let hi = 8;
      for (const n of st.notes.concat(st.notes2)) {
        const pos = st.clef === 'perc' ? Math.floor((n.p - 1000) / 10) : spell(n.p, st.kcs[barOfT(Math.max(0, n.s))] || 0).dn - st.baseAt(barOfT(Math.max(0, n.s)));
        if (pos < lo) lo = pos;
        if (pos > hi) hi = pos;
      }
      st.above = Math.max(0, hi - 10) * (SP / 2) + (hi > 9 ? 6 : 0);
      // 装飾記号・指番号・弓の記号・譜表テキストの分も、上をあける
      let stack = 0;
      for (const n of st.notes) stack = Math.max(stack, (n.art || []).filter((a) => ABOVE_ART.has(a)).length * 1.3 + (n.fg ? String(n.fg).length : 0));
      st.orn = stack;
      st.textRoom = st.sub === 0 && (st.part.texts || []).length ? 16 : 0;
      st.above += stack * 11 + st.textRoom;
      st.below = Math.max(0, -2 - lo) * (SP / 2) + (lo < -1 ? 6 : 0);
      // ピアノのペダル（Ped. ＊）：大譜表は下の段の下、ふつうは五線の下
      st.hasPed = (st.part.pedals || []).length > 0 && (st.grand ? st.sub === 1 : st.sub === 0);
      if (st.hasPed) st.below += 16;
      // 小節のくり返し記号：前の小節とまったく同じなら、記号で書く
      const mr = st.part.mrep || {};
      const sig = (b) => { const a = bS(b); const z = bS(b + 1); return st.notes.concat(st.notes2).filter((n) => n.s >= a && n.s < z).map((n) => `${n.s - a}/${n.p}/${Math.min(n.l, z - n.s)}/${n.v || 1}`).sort().join(','); };
      st.mrepSame = (b) => !!(b > 0 && mr[b] && String(mAt(b)) === String(mAt(b - 1)) && sig(b) && sig(b) === sig(b - 1) && !st.notes.concat(st.notes2).some((n) => n.s < bS(b) && n.s + n.l > bS(b)) && !st.notes.concat(st.notes2).some((n) => n.s < bS(b + 1) && n.s + n.l > bS(b + 1)));
      st.ottUp = st.ott && st.ott.some((q) => q.k > 0) && st.sub === 0;
      st.ottDn = st.ott && st.ott.some((q) => q.k < 0) && (st.grand ? st.sub === 1 : true);
      if (st.ottUp) st.above += 14;
      if (st.ottDn) st.below += 14;
      if (st.clef === 'tab') { st.above = 0; st.below = 0; st.hasPed = false; st.ottUp = st.ottDn = false; st.textRoom = 0; st.orn = 0; st.hasLyr = false; st.hasDyn = false; st.dynAbove = false; st.mrepSame = () => false; }
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
      const clefChg = b > 0 && staves.some((st) => st.clefChg && st.clefChg[b] && st.clefAt(b) !== st.clefAt(b - 1));
      if (clefChg) chgRoom += 22;
      if (mChg) chgRoom += 20;
      let accRoom = 0;
      const need = new Map(); // 位置 → { w: 文字のはば, acc: 臨時記号がつくか }
      for (const st of staves) {
        const keyPcs = new Set([0, 2, 4, 5, 7, 9, 11].map((v, i) => (v + keyAccOf(st.kcs[b])[i] + 12) % 12));
        for (const ev of st.evAt(b)) {
          if (ev.pos < barStartTick(b)) continue;
          set.add(ev.pos);
          const n = need.get(ev.pos) || { w: 0, acc: false, pre: 0 };
          if (ev.pitches && st.clef !== 'perc' && !st.part.slash && ev.pitches.some((p) => !keyPcs.has(((p % 12) + 12) % 12))) n.acc = true;
          // 装飾音符・アルペジオは、音の前に場所をとる
          if (ev.first && ev.pitches) n.pre = Math.max(n.pre || 0, (ev.gr != null ? 15 : 0) + ((ev.art || []).includes('arp') ? 9 : 0));
          if (ev.first && st.sub === 0) {
            const ly = ev.ly || (st.notes.some((x) => x.ly) ? '' : st.lyrics[ev.syll]);
            n.w = Math.max(n.w, textW(ly), nameOf && st.clef !== 'perc' && ev.pitches ? ev.pitches.length * 11 : 0);
          }
          need.set(ev.pos, n);
          if (ev.pitches && ev.pos === barStartTick(b) && (n.acc || n.pre)) accRoom = Math.max(accRoom, (n.acc ? 8 : 0) + (n.pre || 0));
        }
      }
      if (edit && edit.cursor != null && edit.cursor < bS(bars) && barOfT(edit.cursor) === b) set.add(edit.cursor - bS(b));
      const ticks = [...set].sort((a, c) => a - c);
      const segW = [];
      for (let i = 0; i < ticks.length - 1; i++) {
        const a = need.get(ticks[i]) || { w: 0 };
        const z = need.get(ticks[i + 1]) || { w: 0, acc: false };
        // 音の長さに合った間隔・歌詞が重ならない間隔・臨時記号の分
        segW.push(Math.max(spaceFor(ticks[i + 1] - ticks[i]), (a.w + z.w) / 2 + 5) + (z.acc ? 9 : 0) + (z.pre || 0));
      }
      const nat = 14 + chgRoom + accRoom + segW.reduce((a, w) => a + w, 0) + 6;
      barInfo.push({ ticks, segW, nat, accRoom, chgRoom, keyChg, mChg, clefChg });
    }

    // ---- 段組み（1段に何小節入れるか） ----
    const left = 16;
    const kcMax = Math.max(0, ...staves.flatMap((s) => s.kcs.map(Math.abs)));
    const partLabel = (st) => st.part.name + (st.tr % 12 ? `（in ${['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'][((-st.tr % 12) + 12) % 12]}）` : '');
    // 2段目からは短い名前（Fl.・Vn. など）
    const partShort = (st) => st.part.short || ([...st.part.name].length <= 4 ? st.part.name : [...st.part.name].slice(0, 3).join('') + '.');
    // パートの仲間（木管・金管・弦…）のかっこ
    const BRK = new Set(['ww', 'br', 'perc', 'vo', 'str']);
    const groupsOf = (list) => {
      const gs = [];
      list.forEach((st, si) => {
        const fam = st.part.family;
        const g = gs[gs.length - 1];
        if (fam && BRK.has(fam) && g && g.fam === fam && g.z === si - 1) g.z = si;
        else if (fam && BRK.has(fam)) gs.push({ fam, a: si, z: si });
      });
      return gs;
    };
    const groups = groupsOf(staves);
    const brk = groups.some((g) => g.z > g.a) ? 9 : 0;
    const nameW = staves.length > 1 ? Math.min(110, Math.max(0, ...staves.filter((st) => st.sub === 0).map((st) => textW(partLabel(st)) * 0.85)) + 10) + brk : 0;
    const nameW2 = staves.length > 1 && !opts.noShortNames ? Math.min(60, Math.max(0, ...staves.filter((st) => st.sub === 0).map((st) => textW(partShort(st)) * 0.85)) + 10) + brk : brk;
    const headW = (first) => 34 + kcMax * 8.5 + (first ? 26 + nameW : 6 + nameW2) + (staves.some((s) => s.grand) ? 10 : 0);
    // 全部の段が「くり返し記号」の小節は、せまくする
    for (let b = 1; b < bars; b++) {
      if (staves.length && staves.every((st) => st.mrepSame && st.mrepSame(b))) {
        const bi = barInfo[b];
        bi.mr = true;
        bi.ticks = [barStartTick(b), bL(b)];
        bi.segW = [60];
        bi.accRoom = 0;
        bi.nat = 14 + bi.chgRoom + 60 + 6;
      }
    }
    // 長い休みをまとめる（パート譜）：休みだけの小節が2つ以上つづいたら、1つの小節に「太い線と数字」
    if (opts.mmRest) {
      const quiet = (b) => staves.every((st) => !st.notes.concat(st.notes2).some((n) => n.s < bS(b + 1) && n.s + n.l > bS(b)) && !(st.part.dyn || []).some((d) => d.t >= bS(b) && d.t < bS(b + 1)) && !(st.part.texts || []).some((t) => t.t >= bS(b) && t.t < bS(b + 1)));
      const plain = (b) => !barInfo[b].keyChg && !barInfo[b].mChg && !(opts.rehearsal && opts.rehearsal[b]) && !(opts.tempos && opts.tempos[b]) && !(opts.words && opts.words[b]) && !(rep.start || []).includes(b) && !rep.volta[b] && !(chords && chords[b]) && !['segno', 'coda'].some((k) => hasJ(k) && J[k] === b);
      const breakAfter = (b) => (rep.end || []).includes(b) || ['fine', 'tocoda', 'dc', 'ds'].some((k) => hasJ(k) && J[k] === b);
      for (let r0 = pickup ? 1 : 0; r0 < bars; r0++) {
        if (!quiet(r0) || (r0 > 0 && breakAfter(r0 - 1) && false)) continue;
        let r1 = r0 + 1;
        while (r1 < bars && quiet(r1) && plain(r1) && !breakAfter(r1 - 1)) r1++;
        if (r1 - r0 >= 2) {
          barInfo[r0].mm = r1 - r0;
          barInfo[r0].nat = Math.max(90, 14 + barInfo[r0].chgRoom + 70);
          for (let r = r0 + 1; r < r1; r++) { barInfo[r].hide = true; barInfo[r].nat = 0; }
          r0 = r1 - 1;
        }
      }
    }
    const lines = [];
    let b = 0;
    while (b < bars) {
      const avail = width - left - headW(lines.length === 0) - 10;
      let n = 0;
      let w = 0;
      if (opts.perLine) n = Math.min(opts.perLine, bars - b);
      else {
        while (b + n < bars && (n === 0 || barInfo[b + n].hide || w + barInfo[b + n].nat <= avail)) { w += barInfo[b + n].nat; n++; }
      }
      lines.push([b, b + n]);
      b += n;
    }
    if (!opts.perLine && lines.length > 1) {
      // 1段ごとの量を平均にそろえて、もう一度わける
      const total = barInfo.reduce((a, x) => a + x.nat, 0);
      const target = total / lines.length;
      const availOf = (i) => width - left - headW(i === 0) - 10;
      const even = [];
      let bb = 0;
      while (bb < bars) {
        let n = 0;
        let w = 0;
        while (bb + n < bars && (n === 0 || barInfo[bb + n].hide || (w + barInfo[bb + n].nat <= Math.min(availOf(even.length), target * 1.12) && even.length < lines.length - 1) || (even.length === lines.length - 1 && w + barInfo[bb + n].nat <= availOf(even.length)))) { w += barInfo[bb + n].nat; n++; }
        even.push([bb, bb + n]);
        bb += n;
      }
      if (even.length <= lines.length) lines.splice(0, lines.length, ...even);
    }

    if (!opts.perLine && lines.length > 1) {
      const L = lines[lines.length - 1];
      const P = lines[lines.length - 2];
      if (L[1] - L[0] === 1 && P[1] - P[0] >= 3 && !barInfo[L[0]].hide && !barInfo[L[0] - 1].hide && !barInfo[L[0] - 1].mm) { P[1]--; L[0]--; }
    }
    const chordRow = chords && chords.some(Boolean) ? 16 : 0;
    const anyVolta = Object.keys(rep.volta || {}).length > 0;
    const anyReh = !!(opts.rehearsal && Object.keys(opts.rehearsal).some((k) => +k < bars));
    const topRow = chordRow + (anyVolta ? 16 : 0) + (anyJump ? 18 : 0) + (opts.marks ? 16 : 0) + (anyReh ? 22 : 0);
    const staffH = (st) => st.clef === 'tab' ? (st.tab.length - 1) * 12 + 24 + (st.sub === 0 ? 8 : 0) : (st.clef === 'perc' ? 9.5 : st.grand && st.sub === 0 ? 8.5 : 10.5) * SP + (nameOf && st.clef !== 'perc' ? 15 : 0) + (FING && st.clef !== 'perc' ? 42 : 0) + (st.hasLyr ? 18 : 0) + (st.hasDyn ? 18 : 0) + st.above + st.below;
    const dynRoom = (st) => (st.dynAbove ? 18 : 0); // 上に強弱を書くぶん
    // 空の段をかくす（フルスコア）：2段目からは、その段で音のないパートを書かない
    const busy = (st, a, z) => st.notes.concat(st.notes2).some((n) => n.s < z && n.s + n.l > a) || (st.part.dyn || []).some((d) => d.t >= a && d.t < z);
    const vis = lines.map(([b0, b1], line) => {
      if (line === 0 || !opts.hideEmpty || staves.length < 3) return staves;
      const a = bS(b0);
      const z = bS(b1);
      const keep = new Set(staves.filter((st) => busy(st, a, z)).map((st) => st.pi));
      const v = staves.filter((st) => keep.has(st.pi));
      return v.length ? v : staves.slice(0, 1);
    });
    const sysHOf = (line) => topRow + vis[line].reduce((a, s) => a + staffH(s), 0) + 16;
    const lineTop = [];
    { let y = 0; lines.forEach((_, i) => { lineTop.push(y); y += sysHOf(i); }); }
    const systemH = sysHOf(0);
    const NL = meta.nameLine ? 24 : 0; // 名前のらんのぶん、下げる
    const top = 70 + NL + (meta.subtitle ? 18 : 0);
    const height = top + lines.reduce((a, _, i) => a + sysHOf(i), 0) + 24;
    const o = [];
    const layout = { systems: [], width, height, scale, barTicks, starts: GEO.starts };
    o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${OUTW}" height="${height * scale}" viewBox="0 0 ${width} ${height}" font-family="sans-serif">`);
    o.push(`<rect width="100%" height="100%" fill="#fff"/>`);
    o.push(`<text x="${width / 2}" y="${32 + NL}" text-anchor="middle" font-size="21" font-weight="bold" fill="#111">${esc(title)}</text>`);
    if (meta.subtitle) o.push(`<text x="${width / 2}" y="${52 + NL}" text-anchor="middle" font-size="13" fill="#333">${esc(meta.subtitle)}</text>`);
    // パート譜：左上にパートの名前
    if (opts.partHeader) o.push(`<rect x="14" y="${12 + NL}" width="${textW(opts.partHeader) * 1.05 + 14}" height="22" rx="4" fill="none" stroke="#111" stroke-width="1"/><text x="21" y="${28 + NL}" font-size="13.5" font-weight="bold" fill="#111" class="parthead">${esc(opts.partHeader)}</text>`);
    const credits = [meta.lyricist ? '作詞：' + meta.lyricist : '', meta.composer ? '作曲：' + meta.composer : ''].filter(Boolean);
    // 名前を書くらん（プリント用）
    if (meta.nameLine) o.push(`<text x="${width - 340}" y="20" font-size="12" fill="#111">　年　　組　　番　名前</text><line x1="${width - 216}" y1="23" x2="${width - 16}" y2="23" stroke="#111" stroke-width="0.8"/>`);
    credits.forEach((c, i) => o.push(`<text x="${width - 16}" y="${top - 26 + i * 15}" text-anchor="end" font-size="12" fill="#222">${esc(c)}</text>`));
    {
      const tw = opts.tempoText ? textW(opts.tempoText) * 1.05 + 8 : 0;
      if (opts.tempoText) o.push(`<text x="${left}" y="${top - 12}" font-size="13" font-weight="bold" fill="#111">${esc(opts.tempoText)}</text>`);
      const m0 = mAt(0);
      const compound = m0[1] === 8 && m0[0] % 3 === 0 && m0[0] > 3;
      o.push(G('metNoteQuarterUp', left + tw, top - 12, 'fill="#111"', 6.5));
      if (compound) o.push(G('metAugmentationDot', left + tw + 9, top - 12, 'fill="#111"', 6.5));
      o.push(`<text x="${left + tw + (compound ? 15 : 11)}" y="${top - 12}" font-size="13" fill="#111">= ${compound ? Math.round(bpm / 1.5) : bpm}</text>`);
    }

    let prevStretch = 1.2;
    // 臨時記号は段ごと・小節ごとに覚える
    lines.forEach(([b0, b1], line) => {
      const sysTop = top + lineTop[line] + topRow;
      const VS = vis[line];
      const hx = left + headW(line === 0);
      const L = left + (line === 0 ? nameW : nameW2); // 段の左はし（パート名のぶん右へ。2段目からは短い名前）
      // 次の段の頭で調・拍子が変わるなら、この段の終わりに予告を書く場所をとる
      const nb = b1 < bars ? barInfo[b1] : null;
      const cautK = nb && nb.keyChg ? Math.max(1, ...staves.map((st) => Math.abs(st.kcs[b1]) || Math.abs(st.kcs[b1 - 1]))) * 8.5 + 6 : 0;
      const cautM = nb && nb.mChg ? 18 : 0;
      const caut = cautK || cautM ? cautK + cautM + 8 : 0;
      const avail = width - hx - 10 - caut;
      const natSum = barInfo.slice(b0, b1).reduce((a, x) => a + x.nat, 0);
      let stretch = avail / natSum;
      if (line === lines.length - 1 && lines.length > 1 && natSum * prevStretch < avail * 0.67) stretch = prevStretch;
      if (line < lines.length - 1) prevStretch = stretch;
      const sys = { y0: sysTop - topRow, y1: sysTop + sysHOf(line) - topRow, bars: [], staves: [] };
      // 小節の x 位置
      let x = hx;
      for (let bb = b0; bb < b1; bb++) {
        const bi = barInfo[bb];
        const w = bi.nat * stretch;
        const k = bi.hide ? 0 : (w - 20 - bi.accRoom - bi.chgRoom) / bi.segW.reduce((a, v) => a + v, 0);
        const xs = [];
        let cx = x + 14 + bi.chgRoom + bi.accRoom;
        bi.ticks.forEach((t, i) => { xs.push(cx); if (i < bi.segW.length) cx += bi.segW[i] * k; });
        sys.bars.push({ b: bb, x0: x, x1: x + w, ticks: bi.ticks, xs, keyChg: bi.keyChg, mChg: bi.mChg, clefChg: bi.clefChg });
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
      if (line > 0) o.push(`<text x="${left}" y="${sysTop - 3}" font-size="10" fill="#666">${num(b0)}</text>`);
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
      VS.forEach((st, si) => {
        const stTop = yAcc + 2 * SP + st.above + dynRoom(st);
        yAcc += staffH(st);
        if (st.clef !== 'perc' && st.clefAt) { st.clef = st.clefAt(b0); st.baseDn = st.baseAt(b0); }
        const perc = st.clef === 'perc';
        const yOf = (pos) => stTop + (8 - pos) * (SP / 2);
        if (st.clef === 'tab') {
          // ---- TAB譜：弦の線・「TAB」・小節線・フレットの数字 ----
          const n = st.tab.length;
          const gap = 12;
          const yS = (si2) => stTop + (n - 1 - si2) * gap; // 低い弦が下
          sys.staves.push({ si, pi: st.pi, sub: st.sub, top: stTop, clef: 'tab', perc: true, baseDn: 30, kc: 0, kcs: st.kcs, tr: 0, tabH: (n - 1) * gap });
          for (let i = 0; i < n; i++) o.push(`<line x1="${L}" x2="${xEnd}" y1="${stTop + i * gap}" y2="${stTop + i * gap}" stroke="#222" stroke-width="0.9"/>`);
          'TAB'.split('').forEach((c, i) => o.push(`<text x="${L + 12}" y="${stTop + ((n - 1) * gap) / 2 - 11 + i * 12}" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#111" font-family="serif" class="tabclef">${c}</text>`));
          if (staves.length > 1 && st.sub === 0) o.push(`<text x="${L - 6 - brk}" y="${stTop + ((n - 1) * gap) / 2 + 3.5}" text-anchor="end" font-size="10" fill="#333" class="pname">${esc(line === 0 ? partLabel(st) : partShort(st))}</text>`);
          let handPos = 2;
          for (const B of sys.bars) {
            const bb = B.b;
            o.push(`<line x1="${B.x1}" x2="${B.x1}" y1="${stTop}" y2="${stTop + (n - 1) * gap}" stroke="#222"/>`);
            if (barInfo[bb].hide || barInfo[bb].mm) continue;
            for (const ev of st.bars[bb]) {
              if (ev.rest || !ev.first || (bb === 0 && pickup && ev.pos < bL(0) - pickup)) continue;
              const x = xAt(bb, ev.pos);
              const fr = fretsFor(ev.pitches.map((m) => m - st.tr + 12 * st.ottAt(ev.abs)), st.tab, handPos);
              const nz = fr.filter((q) => q.f > 0);
              if (nz.length) handPos = nz.reduce((a, q) => a + q.f, 0) / nz.length;
              for (const q of fr) {
                const y = yS(q.si);
                const t = String(q.f);
                const w = t.length * 6.5 + 3;
                o.push(`<rect x="${x - w / 2}" y="${y - 6}" width="${w}" height="12" fill="#fff"/><text x="${x}" y="${y + 4}" font-size="11" text-anchor="middle" fill="#111" class="fret">${t}</text>`);
              }
            }
          }
          return;
        }
        sys.staves.push({ si, pi: st.pi, sub: st.sub, top: stTop, clef: st.clef, baseDn: st.baseDn, baseAt: st.baseAt, kc: st.kcs[b0], kcs: st.kcs, tr: st.tr, perc });
        for (let i = 0; i < 5; i++) o.push(`<line x1="${L}" x2="${xEnd + caut}" y1="${stTop + i * SP}" y2="${stTop + i * SP}" stroke="#222" stroke-width="1.05"/>`);
        if (staves.length > 1 && st.sub === 0 && (line === 0 || !opts.noShortNames)) o.push(`<text x="${L - 6 - brk}" y="${stTop + (st.grand ? 4 * SP + 10 : 2 * SP + 3.5)}" text-anchor="end" font-size="10" fill="#333" class="pname">${esc(line === 0 ? partLabel(st) : partShort(st))}</text>`);
        const cl = L + (st.grand ? 10 : 0);
        // ト音記号は第2線（ソ）、ヘ音記号は第4線（ファ）が原点
        if (perc) o.push(G('unpitchedPercussionClef1', cl + 7, yOf(4)));
        else if (st.clef === 'treble') o.push(G('gClef', cl + 4, yOf(2)));
        else if (st.clef === 'alto') o.push(G('cClef', cl + 4, yOf(4)));
        else if (st.clef === 'treble8') { o.push(G('gClef', cl + 4, yOf(2))); o.push(`<text x="${cl + 4 + GW('gClef') / 2}" y="${yOf(-4) + 2}" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#111" font-family="serif">8</text>`); }
        else o.push(G('fClef', cl + 4, yOf(6)));
        // 調号（nat=true で、取り消しのナチュラル）
        const keySig = (kc, x0, nat) => {
          for (let i = 0; i < Math.abs(kc); i++) {
            let pos = (kc >= 0 ? [8, 5, 9, 6, 3, 7, 4] : [4, 7, 3, 6, 2, 5, 1])[i];
            if (st.clef === 'bass') pos -= 2;
            if (st.clef === 'alto') pos -= 1;
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
        const dynY = st.dynAbove ? stTop - st.above - 2 * SP + 2 : (st.hasLyr ? lyrY + 18 : textY + (nameOf && !perc ? 15 : 0) + fOff) + 2;
        const headsAt = new Map(); // abs tick → {x, ys[], up}（スラー用）
        // 1つの音節を何音かでのばすとき（メリスマ）は、歌詞のあとに横線をひく
        const lyOwn = st.sub === 0 && st.notes.some((n) => n.ly);
        const lastLy = lyOwn ? Math.max(...st.notes.filter((n) => n.ly).map((n) => n.s)) : -1;
        const inSlur = (a, z) => (st.part.slurs || []).some((sl) => sl.s <= a && sl.e >= z);
        let mel = null;
        const lyrBuf = []; // 歌詞は段ごとにまとめて書く（せまいときは、となりと重ならないように小さく）
        const melFlush = () => {
          if (mel && mel.last != null && mel.last + 5 > mel.x0 + 4) o.push(`<line x1="${mel.x0}" x2="${mel.last + 5}" y1="${lyrY + 1}" y2="${lyrY + 1}" stroke="#111" stroke-width="1.1"/>`);
          mel = null;
        };
        const prevOf = { A: null, B: null };
        for (const B of sys.bars) {
          const bb = B.b;
          if (barInfo[bb].hide) continue; // まとめた休みの2つ目から
          const kcB = st.kcs[bb];
          const keyAcc = keyAccOf(kcB);
          const barAcc = {};
          // 拍子・調が変わる小節の頭
          {
            let cx2 = B.x0 + 5;
            // 音部記号が変わる（小さく書く）
            if (B.clefChg) {
              if (!perc && st.clefAt && bb > 0 && st.clefAt(bb) !== st.clefAt(bb - 1)) {
                st.clef = st.clefAt(bb);
                st.baseDn = st.baseAt(bb);
                if (bb !== b0) {
                  const sp2 = SP * 0.78;
                  if (st.clef === 'bass') o.push(G('fClef', cx2 + 2, yOf(6), 'class="clefchg" fill="#111"', sp2));
                  else if (st.clef === 'alto') o.push(G('cClef', cx2 + 2, yOf(4), 'class="clefchg" fill="#111"', sp2));
                  else o.push(G('gClef', cx2 + 2, yOf(2), 'class="clefchg" fill="#111"', sp2));
                }
              }
              cx2 += 22;
            }
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
              if (stream === 'A') melFlush();
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
                const sp = spellPref(m, kcB, ev.enh || pref);
                const pos = sp.dn - st.baseDn;
                const cur = sp.dn in barAcc ? barAcc[sp.dn] : keyAcc[sp.letter];
                let accTxt = null;
                if (cur !== sp.acc && !ev.tieEnd) { accTxt = ACC_CH[sp.acc]; barAcc[sp.dn] = sp.acc; }
                return { pos, accTxt, acc: sp.acc, p: m - st.tr + 12 * st.ottAt(ev.abs) };
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
            // 装飾音符（小さな8分音符・斜線つき）
            if (!perc && ev.first && ev.gr != null) {
              const gs = spellPref(ev.gr + st.tr - 12 * st.ottAt(ev.abs), kcB, 0);
              const gpos = gs.dn - st.baseDn;
              const gy = yOf(gpos);
              const SPg = SP * 0.62;
              const anyAcc = heads.some((h) => h.accTxt);
              const gx = x - GW('noteheadBlack') / 2 - (anyAcc ? 11 : 0) - ((ev.art || []).includes('arp') ? 9 : 0) - 11;
              const gw = GW('noteheadBlack', SPg);
              for (let lp = -2; lp >= gpos; lp -= 2) o.push(`<line x1="${gx - gw / 2 - 2}" x2="${gx + gw / 2 + 2}" y1="${yOf(lp)}" y2="${yOf(lp)}" stroke="#111" stroke-width="1"/>`);
              for (let lp = 10; lp <= gpos; lp += 2) o.push(`<line x1="${gx - gw / 2 - 2}" x2="${gx + gw / 2 + 2}" y1="${yOf(lp)}" y2="${yOf(lp)}" stroke="#111" stroke-width="1"/>`);
              o.push(G('noteheadBlack', gx - gw / 2, gy, 'class="grace" fill="#111"', SPg));
              const sx2 = gx + gw / 2 - 0.4;
              const sy2 = gy - 2.6 * SP;
              o.push(`<line x1="${sx2}" x2="${sx2}" y1="${gy - 1}" y2="${sy2}" stroke="#111" stroke-width="0.8"/>`);
              o.push(G('flag8thUp', sx2 - 0.4, sy2, 'fill="#111"', SPg));
              o.push(`<line x1="${sx2 - 4}" x2="${sx2 + 5}" y1="${sy2 + 11}" y2="${sy2 + 4}" stroke="#111" stroke-width="0.9"/>`);
              const gcur = gs.dn in barAcc ? barAcc[gs.dn] : keyAcc[gs.letter];
              if (gcur !== gs.acc) { const an = ACC_G[gs.acc] || 'accidentalNatural'; o.push(G(an, gx - gw / 2 - GW(an, SPg) - 1.5, gy, 'fill="#111"', SPg)); barAcc[gs.dn] = gs.acc; }
            }
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
              // 楽器の音域の外（画面で書いているときだけ）：赤＝出せない、オレンジ＝むずかしい
              const R = edit && st.part.range;
              const outP = R && (h.p < R[0] || h.p > R[1]);
              const outA = R && !outP && (h.p < R[2] || h.p > R[3]);
              const col = isSel ? SELC : outP ? '#e03131' : outA ? '#d9480f' : '#111';
              const data = `class="nh" data-pi="${st.pi}" data-s="${ev.src}" data-e="${ev.srcEnd}" data-p="${h.p}"${stream === 'B' ? ' data-v="2"' : ''}`;
              // 符頭のまわりに、クリックしやすい透明な当たりを入れる
              o.push(`<rect ${data.replace('class="nh"', 'class="nhhit"')} x="${hx2 - hw - 2}" y="${y - 5}" width="${hw * 2 + 4}" height="10" fill="transparent"/>`);
              if (st.part.slash) o.push(`<path ${data} d="M${hx2 - 6} ${y + 6} L${hx2 + 2} ${y - 6} L${hx2 + 6} ${y - 6} L${hx2 - 2} ${y + 6} Z" fill="${col}"/>`); // スラッシュ（コードのリズム）
              else o.push(G(hn, hx2 - hw, y, `${data} fill="${col}"`));
              if (h.accTxt && !st.part.slash) {
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
            if (st.sub === 0 && lyr && stream === 'A') lyrBuf.push({ x, t: lyr });
            // 対位法：定旋律との音程の数字
            if (opts.ivNums && st.part.id === opts.ivPart && ev.first && stream === 'A' && opts.ivNums[ev.src] != null) o.push(`<text x="${x}" y="${lyrY}" font-size="11.5" font-weight="600" text-anchor="middle" fill="#1e3a8a">${esc(opts.ivNums[ev.src])}</text>`);
            if (lyOwn && stream === 'A') {
              if (lyr) { melFlush(); mel = { x0: x + textW(lyr) / 2 + 2, last: null, s: ev.abs }; }
              else if (mel && (!ev.first || ev.abs < lastLy || inSlur(mel.s, ev.abs))) mel.last = x;
              else melFlush();
            }
            const flags = ev.base <= 6 ? 3 : ev.base <= 12 ? 2 : ev.base <= 24 ? 1 : 0;
            const d = { x, up, lo, hi, flags: st.part.slash ? 0 : flags, hasStem: ev.base < 192 && !st.part.slash, ev, yOf, beatIdx: Math.floor(ev.pos / beatOf(mAt(bb))), heads, disp, forced: mode ? mode === 1 : null };
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
          const MM = barInfo[bb].mm;
          if (MM) {
            // まとめた休み：五線のまん中に太い線、上に小節の数
            const xa = B.x0 + 14 + barInfo[bb].chgRoom;
            const xz = B.x1 - 10;
            o.push(`<rect class="mmrest" x="${xa}" y="${yOf(4) - SP * 0.45}" width="${xz - xa}" height="${SP * 0.9}" fill="#111"/><line x1="${xa}" x2="${xa}" y1="${yOf(6)}" y2="${yOf(2)}" stroke="#111" stroke-width="1.3"/><line x1="${xz}" x2="${xz}" y1="${yOf(6)}" y2="${yOf(2)}" stroke="#111" stroke-width="1.3"/>`);
            digits(MM, yOf(12), (xa + xz) / 2);
          }
          const MR = !MM && st.mrepSame && st.mrepSame(bb);
          if (MR) {
            // 小節のくり返し記号（％のような形）
            const cx = (B.x0 + 14 + barInfo[bb].chgRoom + B.x1) / 2;
            o.push(`<path class="mrep" d="M${cx - 9} ${yOf(2) + 1} L${cx + 5} ${yOf(6) - 1} L${cx + 9} ${yOf(6) - 1} L${cx - 5} ${yOf(2) + 1} Z" fill="#111"/><circle cx="${cx - 7}" cy="${yOf(5)}" r="2.1" fill="#111"/><circle cx="${cx + 7}" cy="${yOf(3)}" r="2.1" fill="#111"/>`);
          }
          const two = !MM && !MR && st.has2[bb];
          const drawn = MM || MR ? [] : drawEvs(st.bars[bb].filter(notPick), two ? 1 : 0, 'A', st.bars);
          if (two) drawn.push(...drawEvs(st.bars2[bb].filter(notPick), 2, 'B', st.bars2));
          else prevOf.B = null;
          // アーティキュレーション（符頭の、ぼうと反対がわ）
          for (const d of drawn) {
            const arts = d.ev.first ? d.ev.art || [] : [];
            let k = 0;
            let artTop = Infinity; // 符頭の上に書いた記号のいちばん上
            for (const a of arts) {
              if (ABOVE_ART.has(a) || !['stac', 'ten', 'acc', 'marc', 'stacc2'].includes(a)) continue;
              const below = d.up;
              // 符頭から半スペース以上はなし、線の上にかからないように
              let yy = below ? d.yOf(d.lo) + 6 + k * 9 : d.yOf(d.hi) - 6 - k * 9;
              const nm = { stac: 'articStaccato', ten: 'articTenuto', acc: 'articAccent', marc: 'articMarcato', stacc2: 'articStaccatissimo' }[a] + (below ? 'Below' : 'Above');
              if (!Glyphs.g[nm]) continue;
              o.push(G(nm, d.x - GW(nm) / 2, yy));
              if (!below) artTop = Math.min(artTop, yy - (a === 'marc' ? 11 : 9));
              k++;
            }
            let yy = Math.min(d.yOf(9.5), d.yOf(d.hi) - 8, d.up && d.hasStem ? stemEnd(d) - 4 : 99999, artTop - 2);
            // スラーのはし（上がわ）の音なら、装飾記号・フェルマータはスラーの外へ
            if (!d.up && (st.part.slurs || []).some((sl) => sl.s === d.ev.src || sl.e === d.ev.src) && arts.some((a) => ORN_G[a] || a === 'ferm')) yy -= 9;
            if (arts.includes('ferm')) {
              o.push(G('fermataAbove', d.x - GW('fermataAbove') / 2, yy));
              yy -= 14;
            }
            // 指番号（音にいちばん近く）
            if (d.ev.first && d.ev.fg) {
              const fs = String(d.ev.fg);
              fs.split('').forEach((c) => { o.push(`<text x="${d.x}" y="${yy}" font-size="10.5" font-weight="600" text-anchor="middle" fill="#111" class="fing">${esc(c)}</text>`); yy -= 10; });
              yy -= 3;
            }
            // 装飾記号・弓の記号（その上へ、積み重ねる）
            for (const a of arts) {
              const nm = ORN_G[a];
              if (!nm || !Glyphs.g[nm]) continue;
              const bb2 = Glyphs.g[nm].bbox;
              const bot = bb2 ? bb2[3] * SP : 0;
              o.push(G(nm, d.x - GW(nm) / 2, yy - bot));
              yy -= (bb2 ? (bb2[3] - bb2[1]) * SP : 12) + 3;
            }
            // トレモロ（ぼうの上に斜線3本）
            if (arts.includes('trem')) {
              if (d.hasStem) {
                const sx3 = stemX(d);
                const ym = d.up ? d.yOf(d.hi) - 2 * SP : d.yOf(d.lo) + 2 * SP;
                o.push(G('tremolo3', sx3, ym));
              } else o.push(G('tremolo3', d.x, d.yOf(d.hi) - 2 * SP));
            }
            // アルペジオ（和音の左に波線）
            if (arts.includes('arp')) {
              const ax = d.x - 6 - (d.heads.some((h) => h.accTxt) ? 11 : 0) - 8;
              const ya = d.yOf(d.hi) - 6;
              const yz = d.yOf(d.lo) + 6;
              let pth = `M${ax} ${yz}`;
              for (let yv = yz, k2 = 0; yv > ya; yv -= 4, k2++) pth += ` Q${ax + (k2 % 2 ? -2.6 : 2.6)} ${yv - 2} ${ax} ${yv - 4}`;
              o.push(`<path d="${pth}" fill="none" stroke="#111" stroke-width="1.1"/>`);
            }
            // ブレス（息つぎ）・カエスーラ（区切り）
            if (arts.includes('breath')) o.push(G('breathMarkComma', d.x + 12, d.yOf(9.5)));
            if (arts.includes('caes')) o.push(G('caesura', d.x + 12, d.yOf(8)));
          }
          // 小節線（くり返し記号つき）
          const yT = stTop;
          const yB = stTop + 4 * SP;
          const isStart = (rep.start || []).includes(bb);
          const bEnd = MM ? bb + MM - 1 : bb; // まとめた休みは、さいごの小節の線
          const isEnd = (rep.end || []).includes(bEnd);
          if (isStart) {
            const xs0 = B.x0 + (bb === b0 ? 0 : 0);
            o.push(`<rect x="${xs0 + 1}" y="${yT}" width="3" height="${4 * SP}" fill="#222"/><line x1="${xs0 + 7}" x2="${xs0 + 7}" y1="${yT}" y2="${yB}" stroke="#222"/><circle cx="${xs0 + 11}" cy="${yOf(5)}" r="1.8" fill="#222"/><circle cx="${xs0 + 11}" cy="${yOf(3)}" r="1.8" fill="#222"/>`);
          }
          const ex = B.x1;
          if (isEnd) o.push(`<circle cx="${ex - 11}" cy="${yOf(5)}" r="1.8" fill="#222"/><circle cx="${ex - 11}" cy="${yOf(3)}" r="1.8" fill="#222"/><line x1="${ex - 7}" x2="${ex - 7}" y1="${yT}" y2="${yB}" stroke="#222"/><rect x="${ex - 4}" y="${yT}" width="3" height="${4 * SP}" fill="#222"/>`);
          else if (bEnd === bars - 1 || (hasJ('fine') && J.fine === bEnd)) o.push(`<line x1="${ex - 5}" x2="${ex - 5}" y1="${yT}" y2="${yB}" stroke="#222"/><rect x="${ex - 3}" y="${yT}" width="3" height="${4 * SP}" fill="#222"/>`);
          else o.push(`<line x1="${ex}" x2="${ex}" y1="${yT}" y2="${yB}" stroke="#222"/>`);
          if (si === 0 && chords && chords[bb]) {
            const co = opts.chordObjs && opts.chordObjs[bb];
            const parts = String(chords[bb]).split('・');
            if (co && co.h && co.hAt && parts.length === 2) {
              o.push(`<text x="${B.xs[0] - 4}" y="${stTop - 2.9 * SP - dynRoom(st) - st.above}" font-size="13" font-weight="bold" fill="#c2410c">${esc(parts[0])}</text>`);
              o.push(`<text x="${xAt(bb, co.hAt) - 4}" y="${stTop - 2.9 * SP - dynRoom(st) - st.above}" font-size="13" font-weight="bold" fill="#c2410c">${esc(parts[1])}</text>`);
            } else o.push(`<text x="${B.xs[0] - 4}" y="${stTop - 2.9 * SP - dynRoom(st) - st.above}" font-size="13" font-weight="bold" fill="#c2410c">${esc(chords[bb])}</text>`);
          }
          // 対位法のチェックの印（赤＝まちがい、オレンジ＝注意）
          if (si === 0 && opts.marks && opts.marks[bb]) {
            let mx = B.xs[0] - 4;
            const my = stTop - 2.9 * SP - dynRoom(st) - st.above - (chords && chords[bb] ? 15 : 0) - (opts.words && opts.words[bb] ? 15 : 0);
            for (const m of opts.marks[bb]) { o.push(`<text x="${mx}" y="${my}" font-size="11" font-weight="bold" fill="${m.err ? '#e03131' : '#e67700'}">${esc(m.t)}</text>`); mx += textW(m.t) * 0.95 + 6; }
          }
          // リハーサル記号（四角でかこんだ文字）：段のいちばん上
          if (si === 0 && anyReh && opts.rehearsal[bb] != null && opts.rehearsal[bb] !== '') {
            const t = String(opts.rehearsal[bb]);
            const ry = sys.y0 + 4;
            const rw = textW(t) * 1.15 + 10;
            const rx = B.x0 + (bb === b0 ? 0 : -2);
            o.push(`<rect x="${rx}" y="${ry}" width="${rw}" height="18" fill="#fff" stroke="#111" stroke-width="1.3"/><text x="${rx + rw / 2}" y="${ry + 14}" font-size="14" font-weight="bold" text-anchor="middle" fill="#111" class="reh">${esc(t)}</text>`);
          }
          // rit. / accel. はコード名の上に（かさならないように）
          if (si === 0 && opts.words && opts.words[bb]) o.push(`<text x="${B.xs[0]}" y="${stTop - 2.9 * SP - dynRoom(st) - st.above - (chords && chords[bb] ? 15 : 0)}" font-size="13" font-style="italic" font-weight="bold" fill="#111">${esc(opts.words[bb])}</text>`);
          // とちゅうのテンポの変化（♩ = 80）
          if (si === 0 && bb > 0 && opts.tempos && opts.tempos[bb]) {
            const ty = stTop - 2.9 * SP - dynRoom(st) - st.above - (chords && chords[bb] ? 15 : 0);
            const tx = B.xs[0] + (opts.words && opts.words[bb] ? textW(opts.words[bb]) + 10 : 0);
            const mm = mAt(bb);
            const cmp = mm[1] === 8 && mm[0] % 3 === 0 && mm[0] > 3;
            o.push(G('metNoteQuarterUp', tx, ty, 'class="tempo" fill="#111"', 6.5));
            if (cmp) o.push(G('metAugmentationDot', tx + 9, ty, 'fill="#111"', 6.5));
            o.push(`<text x="${tx + (cmp ? 15 : 11)}" y="${ty}" font-size="13" fill="#111" class="tempo">= ${cmp ? Math.round(opts.tempos[bb] / 1.5) : opts.tempos[bb]}</text>`);
          }
        }
        melFlush();
        lyrBuf.sort((a, c) => a.x - c.x).forEach((L, i) => {
          const prev = lyrBuf[i - 1];
          const next = lyrBuf[i + 1];
          const room = Math.min(prev ? L.x - prev.x : 1e9, next ? next.x - L.x : 1e9) - 4;
          const w = textW(L.t);
          let fs = 12;
          let fit = '';
          if (w > room) {
            fs = Math.max(8.5, (12 * room) / w);
            if ((w * fs) / 12 > room) fit = ` textLength="${Math.max(8, room).toFixed(1)}" lengthAdjust="spacingAndGlyphs"`;
          }
          o.push(`<text x="${L.x}" y="${lyrY}" font-size="${+fs.toFixed(1)}" text-anchor="middle" fill="#111" class="lyr"${fit}>${esc(L.t)}</text>`);
        });
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
          const above = (a || z).forced != null ? (a || z).forced : !(a || z).up;
          const xa = a ? a.x : sys.bars[0].xs[0] - 6;
          const xz = z ? z.x : xEnd - 6;
          const ya = a ? (above ? a.yOf(a.hi) - 8 : a.yOf(a.lo) + 8) : (above ? yOf(9) : yOf(-1));
          const yz = z ? (above ? z.yOf(z.hi) - 8 : z.yOf(z.lo) + 8) : ya;
          const yA = ya;
          const lift = Math.min(18, 6 + (xz - xa) / 14) * (above ? -1 : 1);
          o.push(`<path d="M${xa} ${yA} C${xa + (xz - xa) / 3} ${yA + lift} ${xa + (2 * (xz - xa)) / 3} ${yz + lift} ${xz} ${yz} C${xa + (2 * (xz - xa)) / 3} ${yz + lift * 0.8} ${xa + (xz - xa) / 3} ${yA + lift * 0.8} ${xa} ${yA}" fill="#111" stroke="#111" stroke-width="0.6"/>`);
        }
        // グリッサンド：その音から、つぎの音への線
        for (const n of st.notes.concat(st.notes2)) {
          if (!(n.art || []).includes('gliss') || n.s < bS(b0) || n.s >= bS(b1)) continue;
          const a = headsAt.get(n.s);
          if (!a) continue;
          const pool = (n.v === 2 ? st.notes2 : st.notes).filter((m) => m.s > n.s).sort((p1, p2) => p1.s - p2.s);
          const nx = pool[0];
          if (!nx) continue;
          const z = headsAt.get(nx.s);
          const ya = a.yOf(a.hi);
          const xa = a.x + 9;
          const xz = z && nx.s < bS(b1) ? z.x - 9 - (z.heads.some((h) => h.accTxt) ? 10 : 0) : xEnd - 4;
          const yz = z && nx.s < bS(b1) ? z.yOf(z.hi) : ya + (nx.p > n.p ? -10 : 10);
          o.push(`<line class="gliss" x1="${xa}" y1="${ya}" x2="${xz}" y2="${yz}" stroke="#111" stroke-width="1.3"/>`);
          if (xz - xa > 46) { const ang = (Math.atan2(yz - ya, xz - xa) * 180) / Math.PI; o.push(`<text x="${(xa + xz) / 2}" y="${(ya + yz) / 2 - 3}" font-size="9" font-style="italic" text-anchor="middle" fill="#111" transform="rotate(${ang.toFixed(1)} ${(xa + xz) / 2} ${(ya + yz) / 2})">gliss.</text>`); }
        }
        // オクターブ記号：「8va- - - -┐」（上）・「8vb- - - -┘」（下）
        if (st.ottUp || st.ottDn) {
          const ox = (t) => { if (t >= bS(bars)) return xEnd - 6; const bb = barOfT(t); return xAt(bb, t - bS(bb)); };
          for (const q of st.ott) {
            if (q.e <= bS(b0) || q.s >= bS(b1)) continue;
            const up = q.k > 0;
            if (up ? !st.ottUp : !st.ottDn) continue;
            const y = up ? stTop - st.above + st.textRoom + 11 : stTop + 4 * SP + st.below - (st.hasPed ? 16 : 0) - 2;
            const xa = q.s >= bS(b0) ? ox(q.s) - 6 : sys.bars[0].xs[0] - 8;
            const lastStart = Math.max(q.s, ...st.notes.filter((n) => n.s >= q.s && n.s < q.e).map((n) => n.s));
            const xz = q.e <= bS(b1) ? ox(lastStart) + 8 : xEnd - 4;
            const lab = Math.abs(q.k) === 2 ? (up ? '15ma' : '15mb') : (up ? '8va' : '8vb');
            o.push(`<text x="${xa}" y="${y}" font-size="12" font-style="italic" font-weight="bold" fill="#111" font-family="serif" class="ott">${lab}</text>`);
            const lx = xa + textW(lab) * 0.9 + 2;
            if (xz > lx + 4) {
              o.push(`<line x1="${lx}" x2="${xz}" y1="${y - 4}" y2="${y - 4}" stroke="#111" stroke-width="0.9" stroke-dasharray="4 3"/>`);
              if (q.e <= bS(b1)) o.push(`<line x1="${xz}" x2="${xz}" y1="${y - 4}" y2="${up ? y + 4 : y - 12}" stroke="#111" stroke-width="0.9"/>`);
            }
          }
        }
        // ペダル：ふむ所に「Ped.」、はなす所に「＊」
        if (st.hasPed) {
          const pedY = textY - 10;
          const px = (t) => { const bb = barOfT(Math.min(t, bS(bars) - 1)); return t >= bS(bars) ? xEnd - 8 : xAt(bb, t - bS(bb)); };
          for (const pd of st.part.pedals) {
            if (pd.e <= bS(b0) || pd.s >= bS(b1) || pd.e <= pd.s) continue;
            if (pd.s >= bS(b0)) o.push(G('keyboardPedalPed', px(pd.s) - 6, pedY, 'class="ped" fill="#111"'));
            if (pd.e <= bS(b1)) o.push(G('keyboardPedalUp', px(pd.e) - 10, pedY, 'fill="#111"'));
          }
        }
        // 譜表テキスト（音の上に書くことば）
        if (st.textRoom) {
          for (const tx2 of st.part.texts || []) {
            if (tx2.t < bS(b0) || tx2.t >= bS(b1) || !tx2.x) continue;
            const bb2 = barOfT(tx2.t);
            // 加線・装飾記号より上、コード名などより上。リハーサル記号にはかからない
            const tyA = stTop - 2 * SP - st.above - dynRoom(st) + 12;
            const tyB = stTop - 2.9 * SP - dynRoom(st) - st.above - (si === 0 && chords && chords[bb2] ? 15 : 0) - (si === 0 && opts.words && opts.words[bb2] ? 15 : 0) - (si === 0 && opts.marks && opts.marks[bb2] ? 15 : 0);
            const ty = Math.max(si === 0 ? sys.y0 + (anyReh ? 24 : 0) + 12 : -1e9, Math.min(tyA, tyB));
            o.push(`<text x="${xAt(bb2, tx2.t - bS(bb2)) - 4}" y="${ty}" font-size="12.5" fill="#111" class="stxt">${esc(tx2.x)}</text>`);
          }
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
            o.push(`<rect class="cursor" pointer-events="none" x="${cxx - 7}" y="${stTop - 12}" width="${Math.max(14, (edit.curLen || 0) ? 14 : 14)}" height="${4 * SP + 24 + grandH}" rx="4" fill="${SELC}" fill-opacity=".14" stroke="${SELC}" stroke-width="1.2"/>`);
            // いま入れる長さを、カーソルの上に小さく
            if (edit.curLabel) o.push(`<text pointer-events="none" x="${cxx}" y="${stTop - 15}" text-anchor="middle" font-size="13" fill="${SELC}">${esc(edit.curLabel)}</text>`);
          }
        }
      });
      // 段をつなぐ線・大譜表のかっこ
      const tops = sys.staves.map((s) => s.top);
 if (staves.length > 1) o.push(`<line x1="${L}" x2="${L}" y1="${tops[0]}" y2="${tops[tops.length - 1] + (sys.staves[sys.staves.length - 1].tabH || 4 * SP)}" stroke="#222" stroke-width="2"/>`);
      // パートの仲間ごとの角かっこと、その中をつなぐ小節線
      // 段と段のあいだをつなぐ小節線（おわりの線・くり返しの線は太い線も）
      const conn = (B, y1, y2) => {
        const ex = B.x1;
        if (y2 <= y1) return '';
        if ((rep.end || []).includes(B.b)) return `<line x1="${ex - 7}" x2="${ex - 7}" y1="${y1}" y2="${y2}" stroke="#222"/><rect x="${ex - 4}" y="${y1}" width="3" height="${y2 - y1}" fill="#222"/>`;
        if (B.b === bars - 1 || (hasJ('fine') && J.fine === B.b)) return `<line x1="${ex - 5}" x2="${ex - 5}" y1="${y1}" y2="${y2}" stroke="#222"/><rect x="${ex - 3}" y="${y1}" width="3" height="${y2 - y1}" fill="#222"/>`;
        return `<line x1="${ex}" x2="${ex}" y1="${y1}" y2="${y2}" stroke="#222"/>`;
      };
      // 五線とその TAB譜は、小節線をつなぐ
      VS.forEach((st, si) => { if (st.tabOf && si > 0 && VS[si - 1].pi === st.pi) for (const B of sys.bars) o.push(conn(B, tops[si - 1] + 4 * SP, tops[si])); });
      for (const g of groupsOf(VS)) {
        if (g.z === g.a) continue;
        const yA = tops[g.a] - 4;
        const yZ = tops[g.z] + 4 * SP + 4;
        const bx = L - 6;
        o.push(`<path class="bracket" d="M${bx + 1.6} ${yA} V${yZ}" stroke="#111" stroke-width="3.2"/><path d="M${bx} ${yA + 0.6} q5 0 8 -4.5 M${bx} ${yZ - 0.6} q5 0 8 4.5" fill="none" stroke="#111" stroke-width="1.4"/>`);
        for (let si = g.a; si < g.z; si++) for (const B of sys.bars) o.push(conn(B, tops[si] + 4 * SP, tops[si + 1]));
      }
      VS.forEach((st, si) => {
        if (st.grand && st.sub === 0 && VS[si + 1]) {
          const yA = tops[si];
          const yZ = tops[si + 1] + 4 * SP;
          const xm = L + 5;
          o.push(G('brace', xm - 3, yZ, 'fill="#111"', (yZ - yA) / 4));
          o.push(`<line x1="${L + 10}" x2="${L + 10}" y1="${yA}" y2="${yZ}" stroke="#222"/>`);
          for (const B of sys.bars) o.push(conn(B, yA + 4 * SP, tops[si + 1]));
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
      // 2声部のときは、上の声部のタイは上、下の声部のタイは下
      const up = a.forced != null ? a.forced : a.heads.length > 1 ? i >= a.heads.length / 2 : !a.up;
      const y0 = yOf(a.heads[i].pos) + (up ? -6 : 6);
      const y1 = yOf(b.heads[i].pos) + (up ? -6 : 6);
      // ぼうの側にかけるタイは、ぼう・旗をよけて少し右から
      const x0 = a.x + (up === a.up && a.hasStem ? 9 : 6);
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
    if (meter && meter[1] === 4 && (meter[0] === 2 || meter[0] === 3)) {
      const pure8 = (g) => g.length === 2 && g.every((d) => d.flags === 1 && !d.ev.trip && !d.ev.dot) && g[0].ev.pos % 48 === 0;
      const n = meter[0];
      const idx = groups.findIndex((g) => pure8(g) && g[0].beatIdx === 0);
      if (idx >= 0 && groups.length >= idx + n && groups.slice(idx, idx + n).every((g, i) => pure8(g) && g[0].beatIdx === i)) {
        groups.splice(idx, n, groups.slice(idx, idx + n).flat());
      }
    }
    const beamed = new Set();
    for (const g of groups) {
      if (g.length < 2) continue;
      // 連桁の向き：いちばん中央線から遠い音で決める
      const far = g.reduce((a, d) => Math.max(a, Math.abs(d.hi - 4), Math.abs(d.lo - 4)), 0);
      const farHi = g.some((d) => d.hi - 4 === far);
      const up = g[0].forced != null ? g[0].forced : !(farHi && g.every((d) => !(4 - d.lo > far)));
      g.forEach((d) => { d.up = up; d.bg = g; beamed.add(d); });
      // かたむき：最初と最後の音の高さの差（最大で1間）
      const f = g[0];
      const l = g[g.length - 1];
      const yF = up ? f.yOf(f.hi) : f.yOf(f.lo);
      const yL = up ? l.yOf(l.hi) : l.yOf(l.lo);
      const dx = stemX(l) - stemX(f) || 1;
      const rise = Math.max(-SP, Math.min(SP, (yL - yF) * 0.5));
      let slope = rise / dx;
      // 内がわの音が、両はしの音より連桁がわに出ている（へこんだ形）なら水平に
      const tip = (d) => (up ? d.yOf(d.hi) : d.yOf(d.lo));
      const inner = g.slice(1, -1);
      if (inner.length && inner.some((d) => (up ? tip(d) < Math.min(yF, yL) : tip(d) > Math.max(yF, yL)))) slope = 0;
      // せまい2音でかたむきすぎないように（はば の1/4まで）
      if (Math.abs(slope) > 0.25) slope = Math.sign(slope) * 0.25;
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
  // 3連符：1つの「3」の組（2拍ぶんなど）ごとに数字を1つ。連桁でまとまっていなければ、かぎ（ブラケット）をつける（浄書のきまり）
  function drawTriplets(o, drawn, yOf) {
    const groups = [];
    let g = null;
    for (const d of drawn) {
      if (!d.ev.trip) { g = null; continue; }
      const span = d.ev.base * 2; // 3つで、もとの音符2つぶん
      const ws = Math.floor(d.ev.pos / span) * span;
      if (g && g.ws === ws && g.span === span) g.list.push(d);
      else if (g && d.ev.pos >= g.ws && d.ev.pos < g.ws + g.span) g.list.push(d);
      else { g = { ws, span, list: [d] }; groups.push(g); }
    }
    for (const { list } of groups) {
      const up = list.filter((d) => d.up).length * 2 >= list.length;
      const x0 = list[0].x;
      const x1 = list[list.length - 1].x;
      const edge = list.map((d) => (d.hasStem && d.up === up ? stemEnd(d) : up ? d.yOf(d.hi) - 6 : d.yOf(d.lo) + 6));
      const beamedAll = list[0].bg && list.every((d) => d.bg === list[0].bg) && list[0].bg.length === list.length;
      let y = up ? Math.min(yOf(10), ...edge.map((e) => e - 7)) : Math.max(yOf(-2), ...edge.map((e) => e + 14));
      const cx = beamedAll ? (stemX(list[0]) + stemX(list[list.length - 1])) / 2 : (x0 + x1) / 2;
      const nw = GW('tuplet3', 7);
      if (!beamedAll) {
        // かぎ：はしは符頭のはばまで。まん中は数字のぶんあける
        const ya = up ? y - 5 : y - 4;
        const xa = x0 - 6;
        const xz = x1 + 6;
        const hook = up ? 4 : -4;
        o.push(`<path d="M${xa} ${ya + hook} L${xa} ${ya} L${cx - nw / 2 - 2} ${ya} M${cx + nw / 2 + 2} ${ya} L${xz} ${ya} L${xz} ${ya + hook}" stroke="#111" stroke-width="0.9" fill="none"/>`);
        y = ya + 3.5;
      }
      o.push(G('tuplet3', cx - nw / 2, y, 'fill="#111"', 7));
    }
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
        const dn = posLine + (st.baseAt ? st.baseAt(B.b) : st.baseDn);
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
    const drumIds = parts.map((p) => (p.perc ? [...new Set(p.notes.map((n) => n.id))] : null));
    parts.forEach((p, i) => x.push(p.perc && drumIds[i].length ? `<score-part id="P${i + 1}"><part-name>${esc(p.name)}</part-name>${drumIds[i].map((id, k) => `<score-instrument id="P${i + 1}-I${k + 1}"><instrument-name>${esc(id)}</instrument-name></score-instrument>`).join('')}${drumIds[i].map((id, k) => `<midi-instrument id="P${i + 1}-I${k + 1}"><midi-channel>10</midi-channel><midi-unpitched>${((opts.drumGm || {})[id] || 38) + 1}</midi-unpitched></midi-instrument>`).join('')}</score-part>` : `<score-part id="P${i + 1}"><part-name>${esc(p.name)}</part-name>${p.gm != null ? `<score-instrument id="P${i + 1}-I1"><instrument-name>${esc(p.name)}</instrument-name></score-instrument><midi-instrument id="P${i + 1}-I1">${p.perc ? '<midi-channel>10</midi-channel>' : ''}<midi-program>${(p.gm || 0) + 1}</midi-program></midi-instrument>` : ''}</score-part>`));
    x.push('</part-list>');
    const HK = { M: 'major', m: 'minor', 7: 'dominant', M7: 'major-seventh', m7: 'minor-seventh', sus4: 'suspended-fourth', dim: 'diminished', aug: 'augmented' };
    const DYN = new Set(['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sf', 'sfz', 'fp']);
    parts.forEach((p, pi) => {
      const tr = p.transpose || 0;
      const kcs = GEO.keys.map((k) => keyCount(k.key + tr, k.minor));
      let kc = kcs[0];
      let clef = p.clef || 'auto';
      if (p.perc) clef = 'perc';
      const dIds = drumIds[pi] || [];
      const allN = p.perc ? p.notes.map((n) => ({ ...n, p: 2000 + dIds.indexOf(n.id) })) : tr ? p.notes.map((n) => ({ ...n, p: n.p + tr })) : p.notes;
      const notes = allN.filter((n) => n.v !== 2);
      const notes2 = allN.filter((n) => n.v === 2);
      if (clef === 'auto') clef = autoClef(allN, p.name);
      const evBars = buildEvents(notes, bars, GEO, null, meter);
      const evBars2 = notes2.length ? buildEvents(notes2, bars, GEO, null, meter) : null;
      const lyr = p.lyrics || [];
      const useNoteLy = p.notes.some((n) => n.ly);
      const slurStarts = new Map((p.slurs || []).map((s, i) => [s.s, i + 1]));
      const glissOpen = [false, false]; // グリッサンドの始まりが出ている（声部ごと）
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
        const cChg = b > 0 && clef !== 'perc' && p.clefChg && p.clefChg[b];
        if (cChg) x.push(`<attributes>${({ treble: '<clef><sign>G</sign><line>2</line></clef>', bass: '<clef><sign>F</sign><line>4</line></clef>', alto: '<clef><sign>C</sign><line>3</line></clef>', treble8: '<clef><sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change></clef>' })[p.clefChg[b]] || ''}</attributes>`);
        if (b > 0 && (kChg || mChg)) x.push(`<attributes>${kChg ? `<key><fifths>${kc}</fifths><mode>${GEO.keys[b].minor ? 'minor' : 'major'}</mode></key>` : ''}${mChg ? `<time><beats>${mB[0]}</beats><beat-type>${mB[1]}</beat-type></time>` : ''}</attributes>`);
        if (pi === 0 && hasJ('segno') && J.segno === b) x.push('<direction placement="above"><direction-type><segno/></direction-type><sound segno="s1"/></direction>');
        if (pi === 0 && hasJ('coda') && J.coda === b) x.push('<direction placement="above"><direction-type><coda/></direction-type><sound coda="c1"/></direction>');
        if (b === 0) {
          x.push('<attributes><divisions>48</divisions>');
          if (clef !== 'perc') x.push(`<key><fifths>${kc}</fifths><mode>${GEO.keys[0].minor ? 'minor' : 'major'}</mode></key>`);
          x.push(`<time><beats>${mB[0]}</beats><beat-type>${mB[1]}</beat-type></time>`);
          if (tr) x.push(`<transpose><diatonic>${-Math.round(tr * 7 / 12)}</diatonic><chromatic>${-tr}</chromatic></transpose>`);
          x.push(clef === 'perc' ? '<clef><sign>percussion</sign></clef>' : clef === 'bass' ? '<clef><sign>F</sign><line>4</line></clef>' : clef === 'treble8' ? '<clef><sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change></clef>' : clef === 'alto' ? '<clef><sign>C</sign><line>3</line></clef>' : '<clef><sign>G</sign><line>2</line></clef>');
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
        if (pi === 0 && opts.rehearsal && opts.rehearsal[b]) x.push(`<direction placement="above"><direction-type><rehearsal enclosure="square">${esc(opts.rehearsal[b])}</rehearsal></direction-type></direction>`);
        const dirAt = (t) => {
          for (const pd of p.pedals || []) { if (pd.s === t) x.push('<direction placement="below"><direction-type><pedal type="start" line="no"/></direction-type></direction>'); if (pd.e === t) x.push('<direction placement="below"><direction-type><pedal type="stop" line="no"/></direction-type></direction>'); }
          for (const tx of p.texts || []) if (tx.t === t && tx.x) x.push(`<direction placement="above"><direction-type><words>${esc(tx.x)}</words></direction-type></direction>`);
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
            const did = p.perc ? dIds[m - 2000] : null;
            const dpos = p.perc ? (DRUM_POS[did] || [5, 'n']) : null;
            if (p.perc) pitch = `<unpitched><display-step>${'CDEFGAB'[(dpos[0] + 2) % 7]}</display-step><display-octave>${4 + Math.floor((dpos[0] + 2) / 7)}</display-octave></unpitched>`;
            else { const sp = ev.enh ? spellPref(m, kc, ev.enh) : spell(m, kc); pitch = `<pitch><step>${sp.step}</step>${sp.acc ? `<alter>${sp.acc}</alter>` : ''}<octave>${sp.oct}</octave></pitch>`; }
            const ties = (ev.tieEnd ? '<tie type="stop"/>' : '') + (ev.tie ? '<tie type="start"/>' : '');
            let nots = (ev.tieEnd ? '<tied type="stop"/>' : '') + (ev.tie ? '<tied type="start"/>' : '');
            if (k === 0 && ev.first) {
              if (slurStarts.has(ev.abs)) nots += `<slur type="start" number="${slurStarts.get(ev.abs) % 6 + 1}"/>`;
              if (slurEnds.has(ev.abs)) nots += `<slur type="stop" number="${slurEnds.get(ev.abs) % 6 + 1}"/>`;
              const A = ev.art || [];
              const arts = A.map((a) => ({ stac: '<staccato/>', acc: '<accent/>', ten: '<tenuto/>', marc: '<strong-accent type="up"/>', stacc2: '<staccatissimo/>', breath: '<breath-mark/>', caes: '<caesura/>' }[a] || '')).join('');
              if (arts) nots += `<articulations>${arts}</articulations>`;
              const orn = A.map((a) => ({ tr: '<trill-mark/>', prall: '<inverted-mordent/>', mord: '<mordent/>', turn: '<turn/>', trem: '<tremolo type="single">3</tremolo>' }[a] || '')).join('');
              if (orn) nots += `<ornaments>${orn}</ornaments>`;
              const tech = A.map((a) => ({ upb: '<up-bow/>', dnb: '<down-bow/>' }[a] || '')).join('');
              if (tech) nots += `<technical>${tech}</technical>`;
              if (A.includes('ferm')) nots += '<fermata type="upright"/>';
            }
            if (ev.first && (ev.art || []).includes('arp') && ev.pitches.length > 1) nots += '<arpeggiate/>';
            if (k === 0 && ev.first && glissOpen[vi]) { nots += '<glissando type="stop" number="1"/>'; if (k === ev.pitches.length - 1 || true) glissOpen[vi] = false; }
            if (k === 0 && ev.first && (ev.art || []).includes('gliss')) { nots += '<glissando type="start" number="1" line-type="solid">gliss.</glissando>'; glissOpen[vi] = true; }
            if (ev.first && ev.fg && !p.perc) {
              const fc = String(ev.fg)[ev.pitches.length - 1 - k] || (ev.pitches.length === 1 ? String(ev.fg)[0] : '');
              if (fc) nots += `<technical><fingering>${esc(fc)}</fingering></technical>`;
            }
            // 装飾音符（前打音）は、主音符の前に
            if (k === 0 && ev.first && ev.gr != null && !p.perc) { const gs = spell(ev.gr, kc); x.push(`<note><grace slash="yes"/><pitch><step>${gs.step}</step>${gs.acc ? `<alter>${gs.acc}</alter>` : ''}<octave>${gs.oct}</octave></pitch>${vx}<type>eighth</type><stem>up</stem></note>`); }
            const ly = k === 0 && ev.first && vi === 0 ? (useNoteLy ? ev.ly : lyr[ev.syll]) : '';
            const lyric = ly ? `<lyric number="1"><syllabic>single</syllabic><text>${esc(ly)}</text></lyric>` : '';
            x.push(`<note${!p.perc && ev.vel && ev.vel !== 1 ? ` dynamics="${Math.round(ev.vel * 100)}"` : ''}>${k > 0 ? '<chord/>' : ''}${pitch}<duration>${ev.len}</duration>${ties}${p.perc ? `<instrument id="P${pi + 1}-I${m - 2000 + 1}"/>` : ''}${vx}${typeXml(ev)}${p.perc && dpos[1] !== 'n' ? `<notehead>${dpos[1] === 'o' ? 'circle-x' : 'x'}</notehead>` : ''}${nots ? `<notations>${nots}</notations>` : ''}${lyric}</note>`);
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
      const cut = j < sys.length ? sys[j].y0 - 15 : layout.height; // 次の段の小節番号は次のページへ
      cuts.push({ y0, cut });
      if (j < sys.length) y0 = sys[j].y0 - 16;
      i = j;
    }
    if (cuts.length === 1) return [svg];
    return cuts.map(({ y0: a, cut }, k) => `<svg xmlns="http://www.w3.org/2000/svg" class="page" width="${W * sc}" height="${PH * sc}" viewBox="0 ${a} ${W} ${PH}" overflow="hidden" font-family="sans-serif"><rect x="0" y="${a}" width="${W}" height="${PH}" fill="#fff"/>${inner}<rect x="0" y="${cut}" width="${W}" height="${Math.max(0, a + PH - cut) + 200}" fill="#fff"/><text x="${W / 2}" y="${a + PH - 8}" text-anchor="middle" font-size="10" fill="#666">${k + 1} / ${cuts.length}</text></svg>`);
  }

  return { render, paginate, single, hit, keyCount, buildEvents, spell, spellPref, splitLyrics, musicXML, autoClef, DRUM_POS, lastLayout: null };
})();
