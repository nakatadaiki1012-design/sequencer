// MuseScore のファイル（.mscz）を書き出す。中身は MuseScore 3（3.02 形式）の .mscx を zip に入れたもの（MuseScore 3・4 で開けます）
// 使い方：MuseScoreExport.mscx(opts) → XML 文字列（opts は楽譜の書き出しと同じ：parts・geo・key・bpm…）
const MuseScoreExport = (() => {
  'use strict';
  const DIV = 480; // MuseScore の4分音符
  const TPQ = 48;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a) || 1);
  // tick（4分＝48）→ 全音符を1とした分数「1/4」
  const frac = (t) => { const n = Math.round(t); const d = 192; const g = gcd(n, d); return `${n / g}/${d / g}`; };
  const TYPE = { 192: 'whole', 96: 'half', 48: 'quarter', 24: 'eighth', 12: '16th', 6: '32nd', 3: '64th' };
  const ART = { stac: 'articStaccatoAbove', stacc2: 'articStaccatissimoAbove', ten: 'articTenutoAbove', acc: 'articAccentAbove', marc: 'articMarcatoAbove', tr: 'ornamentTrill', prall: 'ornamentShortTrill', mord: 'ornamentMordent', turn: 'ornamentTurn', iturn: 'ornamentTurnInverted', upb: 'stringsUpBow', dnb: 'stringsDownBow', harm: 'stringsHarmonic', open: 'brassMuteOpen', stop: 'brassMuteClosed', snap: 'pluckedSnapPizzicatoAbove' };
  const ACCSUB = { 1: 'accidentalSharp', '-1': 'accidentalFlat', 0: 'accidentalNatural' };
  const CLEF = { treble: 'G', bass: 'F', alto: 'C3', treble8: 'G8vb', perc: 'PERC' };
  const LETTER_FIFTHS = [0, 2, 4, -1, 1, 3, 5]; // C D E F G A B（C=0 を基準にした5度の数）
  const HNAME = { M: '', m: 'm', 7: '7', M7: 'Maj7', m7: 'm7', dim: 'dim', aug: 'aug', sus4: 'sus4', 6: '6', m6: 'm6', add9: 'add9', 9: '9', M9: 'Maj9', m9: 'm9', '7sus4': '7sus4', m7b5: 'm7b5', dim7: 'dim7', mM7: 'mMaj7', '7b9': '7b9', '7s9': '7#9' };
  // 音名（Notation.spell の結果）→ MuseScore の tpc（C=14、G=15、F=13…）
  const tpcOf = (sp) => 14 + LETTER_FIFTHS['CDEFGAB'.indexOf(sp.step)] + 7 * sp.acc;

  function mscx(opts) {
    const N = Notation;
    const G = opts.geo;
    const bars = opts.bars;
    const pickup = opts.pickup || 0;
    const bS = (b) => G.starts[b];
    const bL = (b) => G.starts[b + 1] - G.starts[b];
    const kcOf = (b, tr = 0) => N.keyCount(((G.keys[b].key + tr) % 12 + 12) % 12, G.keys[b].minor);
    const x = [];
    x.push('<?xml version="1.0" encoding="UTF-8"?>');
    x.push('<museScore version="3.02">');
    x.push('<programVersion>3.6.2</programVersion>');
    x.push('<Score>');
    x.push(`<Division>${DIV}</Division>`);
    x.push(`<metaTag name="workTitle">${esc(opts.title || '')}</metaTag>`);
    x.push(`<metaTag name="composer">${esc((opts.meta || {}).composer || '')}</metaTag>`);
    x.push(`<metaTag name="lyricist">${esc((opts.meta || {}).lyricist || '')}</metaTag>`);
    const parts = opts.parts.map((p) => ({ ...p, dyn: (p.dyn || []).map((d) => ({ ...d })), texts: (p.texts || []).map((t) => ({ ...t })) }));
    // ---- パート（楽器） ----
    parts.forEach((p, i) => {
      const tr = p.transpose || 0;
      x.push('<Part>');
      x.push(`<Staff id="${i + 1}"><StaffType group="${p.perc ? 'percussion' : 'pitched'}"><name>${p.perc ? 'perc5Line' : 'stdNormal'}</name></StaffType></Staff>`);
      x.push(`<trackName>${esc(p.name)}</trackName>`);
      x.push('<Instrument>');
      x.push(`<longName>${esc(p.name)}</longName><shortName>${esc(p.short || p.name)}</shortName><trackName>${esc(p.name)}</trackName>`);
      if (tr && !p.perc) x.push(`<transposeDiatonic>${-Math.round((tr * 7) / 12)}</transposeDiatonic><transposeChromatic>${-tr}</transposeChromatic>`);
      if (p.perc) x.push('<useDrumset>1</useDrumset>');
      x.push(`<Channel>${p.perc ? '<controller ctrl="0" value="1"/>' : ''}<program value="${p.perc ? 0 : p.gm || 0}"/></Channel>`);
      x.push('</Instrument>');
      x.push('</Part>');
    });
    // ---- コードは「その時に音が始まるパート」に書く（どこにもなければ、近い音の所） ----
    const evCache = parts.map((p) => {
      const src = p.perc ? p.notes.map((n) => ({ ...n, p: (opts.drumGm || {})[n.id] || 38 })) : p.notes;
      return N.buildEvents(src.filter((n) => n.v !== 2), bars, G, null, opts.meter);
    });
    const harm = []; // { part, at, c, b }
    if (opts.chords) {
      for (let b = 0; b < bars; b++) {
        const c = opts.chords[b];
        if (!c) continue;
        const want = [[c, b === 0 && pickup ? bS(0) + bL(0) - pickup : bS(b)]];
        if (c.segs) { for (const sg of c.segs) if (sg.o > 0) want.push([{ r: sg.r, q: sg.q }, bS(b) + sg.o]); }
        else if (c.h && c.hAt) want.push([c.h, bS(b) + c.hAt]);
        for (const [cc, t] of want) {
          let pi = evCache.findIndex((ev) => ev[b].some((e) => e.abs === t));
          let at = t;
          // その時にどのパートも音が始まらない：見えない休符の声部を足して、そこにコードを書く
          if (pi < 0 && !(b === 0 && pickup)) { if (!harm.some((h) => h.part === 0 && h.at === t)) harm.push({ part: 0, at: t, c: cc, b, own: true }); continue; }
          if (pi < 0) { pi = 0; const st = evCache[0][b].map((e) => e.abs).filter((a) => a >= bS(b) + (b === 0 && pickup ? bL(0) - pickup : 0)); at = st.find((a) => a >= t) ?? st[st.length - 1]; }
          if (at != null && !harm.some((h) => h.part === pi && h.at === at)) harm.push({ part: pi, at, c: cc, b });
        }
      }
    }
    // 見えない休符の声部（コードを書くためだけ）：コードの位置で区切った休符
    const ownBars = new Set(harm.filter((h) => h.own).map((h) => h.b));
    let ownEv = null;
    if (ownBars.size) {
      const fake = [];
      for (const b of ownBars) {
        const pts = [...new Set([bS(b), ...harm.filter((h) => h.b === b && (h.own || h.part === 0)).map((h) => h.at)])].sort((p1, p2) => p1 - p2);
        pts.forEach((a, i) => fake.push({ s: a, p: 60, l: (pts[i + 1] ?? bS(b + 1)) - a }));
      }
      ownEv = N.buildEvents(fake, bars, G, null, opts.meter);
    }
    const harmXml = (c, b) => `<Harmony><root>${tpcOf(N.spellPref(c.r + 60, kcOf(b), [1, 3, 6, 8, 10].includes(c.r) ? (kcOf(b) >= 0 ? 1 : -1) : 0))}</root>${HNAME[c.q] ? `<name>${HNAME[c.q]}</name>` : ''}</Harmony>`;
    // ---- 段（音） ----
    parts.forEach((p, pi) => {
      let hyOpen = false; // まえの歌詞がハイフンでつづいている
      const hyV = {}; // 2番・3番
      const tr = p.perc ? 0 : p.transpose || 0;
      let clef = p.perc ? 'perc' : p.clef || 'auto';
      if (clef === 'auto' || clef === 'grand') clef = N.autoClef(tr ? p.notes.map((n) => ({ ...n, p: n.p + tr })) : p.notes, p.name);
      // 打楽器は、ドラムの名前 → GM の音の番号
      const src = p.perc ? p.notes.map((n) => ({ ...n, p: (opts.drumGm || {})[n.id] || 38 })) : p.notes;
      const notes1 = src.filter((n) => n.v !== 2);
      const notes2 = src.filter((n) => n.v === 2);
      const ev1 = evCache[pi];
      const ev2 = notes2.length ? N.buildEvents(notes2, bars, G, null, opts.meter) : null;
      // タイのつながる先・もとの位置
      for (const arr of [ev1, ev2]) {
        if (!arr) continue;
        const flat = arr.flat();
        flat.forEach((e, i) => { if (e.tie && flat[i + 1]) e._nextAbs = flat[i + 1].abs; if (e.tieEnd && flat[i - 1]) e._prevAbs = flat[i - 1].abs; });
        // グリッサンド：つぎの音（休符でない）へ
        flat.forEach((e, i) => { if (e.first && !e.rest && (e.art || []).includes('gliss')) { const nx = flat.slice(i + 1).find((f2) => !f2.rest && f2.first); if (nx) { e._nextNote = nx.abs; nx._glissFrom = e.abs; } } });
      }
      // スパナー（スラー・クレッシェンド）：始まり・終わりの位置
      const spans = [];
      for (const sl of p.slurs || []) if (sl.e > sl.s) spans.push({ type: 'Slur', s: sl.s, e: sl.e });
      for (const hp of p.hairpins || []) if (hp.e > hp.s) spans.push({ type: 'HairPin', s: hp.s, e: hp.e, sub: hp.type === 'dim' ? 1 : 0 });
      for (const pd of p.pedals || []) if (pd.e > pd.s) spans.push({ type: 'Pedal', s: pd.s, e: pd.e });
      for (const q of p.trills || []) if (q.e > q.s) spans.push({ type: 'Trill', s: q.s, e: q.e, a: q.a });
      for (const q of p.ottava || []) if (q.e > q.s) spans.push({ type: 'Ottava', s: q.s, e: q.e, sub: { 1: '8va', '-1': '8vb', 2: '15ma', '-2': '15mb' }[q.k] || '8va' });
      // おわりの位置は、その時に始まる音（なければ曲のおわり）
      const starts1 = new Set(ev1.flat().map((e) => e.abs));
      const endAt = (e) => { for (let t = e; t < bS(bars); t++) if (starts1.has(t)) return t; return bS(bars); };
      const barOf = (t) => { let b = 0; while (b < bars - 1 && G.starts[b + 1] <= t) b++; return b; };
      const loc = (from, to) => { const bf = barOf(from); const bt = barOf(to); const fr = (to - bS(bt)) - (from - bS(bf)); return `<location>${bt !== bf ? `<measures>${bt - bf}</measures>` : ''}${fr ? `<fractions>${frac(fr)}</fractions>` : ''}</location>`; };
      x.push(`<Staff id="${pi + 1}">`);
      if (pi === 0) x.push(`<VBox><height>10</height><Text><style>Title</style><text>${esc(opts.title || '')}</text></Text>${(opts.meta || {}).composer ? `<Text><style>Composer</style><text>${esc(opts.meta.composer)}</text></Text>` : ''}</VBox>`);
      for (let b = 0; b < bars; b++) {
        const isPick = b === 0 && pickup > 0;
        x.push(isPick ? `<Measure len="${frac(pickup)}">` : '<Measure>');
        if ((opts.repeats.start || []).includes(b)) x.push('<startRepeat/>');
        if ((opts.repeats.end || []).includes(b)) x.push('<endRepeat>2</endRepeat>');
        // 小節のくり返し記号（前の小節と同じとき）
        const sig = (bb) => p.notes.filter((n) => n.s >= bS(bb) && n.s < bS(bb + 1)).map((n) => `${n.s - bS(bb)}/${n.p}/${n.l}/${n.v || 1}`).sort().join(',');
        if (b > 0 && p.mrep && p.mrep[b] && !p.perc && bL(b) === bL(b - 1) && sig(b) && sig(b) === sig(b - 1)) {
          x.push(`<voice><MeasureRepeat><subtype>1</subtype><durationType>measure</durationType><duration>${frac(bL(b))}</duration></MeasureRepeat></voice>`);
          x.push('</Measure>');
          continue;
        }
        const voices = ev2 && ev2[b].some((e) => !e.rest) ? [ev1[b], ev2[b]] : [ev1[b]];
        voices.forEach((evs, vi) => {
          x.push('<voice>');
          if (vi === 0) {
            if (b === 0) x.push(`<Clef><concertClefType>${CLEF[clef] || 'G'}</concertClefType><transposingClefType>${CLEF[clef] || 'G'}</transposingClefType></Clef>`);
            else if (!p.perc && p.clefChg && p.clefChg[b] && CLEF[p.clefChg[b]]) x.push(`<Clef><concertClefType>${CLEF[p.clefChg[b]]}</concertClefType><transposingClefType>${CLEF[p.clefChg[b]]}</transposingClefType></Clef>`);
            if (!p.perc && (b === 0 || G.keys[b].key !== G.keys[b - 1].key || G.keys[b].minor !== G.keys[b - 1].minor)) x.push(`<KeySig><accidental>${kcOf(b)}</accidental>${G.keys[b].minor ? '<mode>minor</mode>' : ''}</KeySig>`);
            const m = G.meters[b];
            if (b === 0 || String(m) !== String(G.meters[b - 1])) x.push(`<TimeSig><sigN>${m[0]}</sigN><sigD>${m[1]}</sigD></TimeSig>`);
            if (pi === 0) {
              const t = b === 0 ? opts.bpm : opts.tempos && opts.tempos[b];
              if (t) x.push(`<Tempo><tempo>${+(t / 60).toFixed(6)}</tempo><followText>1</followText><text>${b === 0 && opts.tempoText ? esc(opts.tempoText) + ' ' : ''}<sym>metNoteQuarterUp</sym> = ${t}</text></Tempo>`);
              if (opts.rehearsal && opts.rehearsal[b]) x.push(`<RehearsalMark><text>${esc(opts.rehearsal[b])}</text></RehearsalMark>`);
            }
          }
          const skip = isPick ? bL(0) - pickup : 0;
          let tup = null; // いま開いている3連符：{ end }
          const list = evs.filter((e) => e.pos >= skip);
          N.tripGroups(list);
          for (const ev of list) {
            const at = ev.abs;
            if (vi === 0) {
              // 小節の頭・とちゅうのコード（いちばん上のパートだけ）
              for (const h of harm) if (h.part === pi && h.at === at) x.push(harmXml(h.c, h.b));
              // 強弱・テキストは、その時に音が始まらなければ次の音の所に
              for (const d of p.dyn || []) if (!d._w && d.t <= at && /^(ppp|pp|p|mp|mf|f|ff|fff|sf|sfz|fp)$/.test(d.v)) { d._w = 1; x.push(`<Dynamic><subtype>${d.v}</subtype></Dynamic>`); }
              for (const t of p.texts || []) if (!t._w && t.t <= at && t.x) { t._w = 1; x.push(`<StaffText><text>${esc(t.x)}</text></StaffText>`); }
              // スラー・クレッシェンドのおわり（この音の所）と、はじまり
              for (const sp of spans) if (sp.st != null && !sp.done && sp.e <= at) { sp.done = true; x.push(`<Spanner type="${sp.type}"><prev>${loc(at, sp.st)}</prev></Spanner>`); }
              for (const sp of spans) if (sp.st == null && sp.s <= at && sp.e > at) { sp.st = at; sp.en = Math.max(at + 1, sp.e); x.push(`<Spanner type="${sp.type}">${sp.type === 'HairPin' ? `<HairPin><subtype>${sp.sub}</subtype></HairPin>` : sp.type === 'Ottava' ? `<Ottava><subtype>${sp.sub}</subtype></Ottava>` : sp.type === 'Pedal' ? '<Pedal><beginText><sym>keyboardPedalPed</sym></beginText><endText><sym>keyboardPedalUp</sym></endText><lineVisible>0</lineVisible></Pedal>' : sp.type === 'Trill' ? `<Trill><subtype>trill</subtype>${sp.a != null ? `<Accidental><subtype>${ACCSUB[sp.a]}</subtype></Accidental>` : ''}</Trill>` : '<Slur></Slur>'}<next>${loc(at, endAt(sp.e))}</next></Spanner>`); }
            }
            // 3連符
            if (ev.trip && !tup) { const g = ev._tg; tup = { g, end: ev.abs + ev.base * 2 }; x.push(`<Tuplet><normalNotes>2</normalNotes><actualNotes>3</actualNotes><baseNote>${TYPE[g ? g.total / 2 : ev.base] || TYPE[ev.base] || 'eighth'}</baseNote><Number><style>Tuplet</style><text>3</text></Number></Tuplet>`); }
            const dur = ev.whole ? '<durationType>measure</durationType>' + `<duration>${frac(ev.len)}</duration>` : `${ev.dot ? '<dots>1</dots>' : ''}<durationType>${TYPE[ev.base] || 'quarter'}</durationType>`;
            if (ev.rest) x.push(`<Rest>${dur}</Rest>`);
            else {
              const A = ev.first ? ev.art || [] : [];
              // MuseScore は 8va の中の音を「書いた高さ」でしまう（鳴らすときに 8va の分を足す）
              const oq = p.perc ? null : (p.ottava || []).find((o) => ev.abs >= o.s && ev.abs < o.e);
              const oSh = oq ? 12 * oq.k : 0;
              if (A.includes('ferm')) x.push('<Fermata><subtype>fermataAbove</subtype></Fermata>');
              // 装飾音符
              if (ev.first && ev.gr != null && !p.perc) {
                const gl = Array.isArray(ev.gr) ? ev.gr : [ev.gr];
                const kind = gl.length === 1 ? (ev.grl ? 'appoggiatura' : 'acciaccatura') : 'grace16';
                for (const gp of gl) { const gs = N.spell(gp, kcOf(b)); x.push(`<Chord><${kind}/><durationType>${gl.length > 1 ? '16th' : 'eighth'}</durationType><Note><pitch>${gp - oSh}</pitch><tpc>${tpcOf(gs)}</tpc></Note></Chord>`); }
              }
              x.push('<Chord>');
              x.push(dur);
              if (ev.first && ev.ly && vi === 0) { const [lt, sy] = N.sylOf(ev.ly, hyOpen); hyOpen = /.-$/.test(ev.ly); x.push(`<Lyrics>${sy !== 'single' ? `<syllabic>${sy}</syllabic>` : ''}<text>${esc(lt)}</text></Lyrics>`); }
              if (ev.first && vi === 0) for (const [key, no] of [['ly2', 1], ['ly3', 2]]) { const v = ev[key]; if (v) { const [lt, sy] = N.sylOf(v, hyV[no]); hyV[no] = /.-$/.test(v); x.push(`<Lyrics><no>${no}</no>${sy !== 'single' ? `<syllabic>${sy}</syllabic>` : ''}<text>${esc(lt)}</text></Lyrics>`); } }
              for (const a of A) if (ART[a]) x.push(`<Articulation><subtype>${ART[a]}</subtype>${a === 'tr' && ev.tra != null ? `<Accidental><subtype>${ACCSUB[ev.tra]}</subtype></Accidental>` : ''}</Articulation>`);
              const TRS = { 1: '8', 2: '16', 3: '32' };
              if (A.includes('trem')) x.push(`<Tremolo><subtype>r${TRS[ev.trs] || '32'}</subtype></Tremolo>`);
              if (A.includes('trem2')) x.push(`<Tremolo><subtype>c${TRS[ev.trs] || '32'}</subtype></Tremolo>`);
              if (A.includes('arp') && ev.pitches.length > 1) x.push('<Arpeggio><subtype>0</subtype></Arpeggio>');
              ev.pitches.forEach((m, k) => {
                const pitch = m - oSh;
                x.push('<Note>');
                if (ev.tieEnd && ev._prevAbs != null) x.push(`<Spanner type="Tie"><prev>${loc(at, ev._prevAbs)}</prev></Spanner>`);
                if (k === ev.pitches.length - 1 && ev.first && A.includes('gliss') && ev._nextNote != null) x.push(`<Spanner type="Glissando"><Glissando><subtype>0</subtype></Glissando><next>${loc(at, ev._nextNote)}</next></Spanner>`);
                if (k === ev.pitches.length - 1 && ev._glissFrom != null) x.push(`<Spanner type="Glissando"><prev>${loc(at, ev._glissFrom)}</prev></Spanner>`);
                if (ev.tie && ev._nextAbs != null) x.push(`<Spanner type="Tie"><Tie></Tie><next>${loc(at, ev._nextAbs)}</next></Spanner>`);
                if (ev.first && ev.fg && !p.perc) { const fc = String(ev.fg)[ev.pitches.length - 1 - k]; if (fc) x.push(`<Fingering><text>${esc(fc)}</text></Fingering>`); }
                const sp = ev.enh ? N.spellPref(pitch, kcOf(b), ev.enh) : N.spell(pitch, kcOf(b));
                x.push(`<pitch>${pitch}</pitch><tpc>${tpcOf(sp)}</tpc>`);
                if (ev.nhs && ev.nhs[m]) x.push(`<head>${ev.nhs[m] === 'x' ? 'cross' : 'diamond'}</head>`);
                if (tr) x.push(`<tpc2>${tpcOf(N.spell(pitch + tr, kcOf(b, tr)))}</tpc2>`);
                x.push('</Note>');
              });
              x.push('</Chord>');
              if (A.includes('breath') || A.includes('caes')) x.push(`<Breath><symbol>${A.includes('caes') ? 'caesura' : 'breathMarkComma'}</symbol></Breath>`);
            }
            if (tup && (tup.g ? tup.g.evs[tup.g.evs.length - 1] === ev : ev.abs + ev.len >= tup.end - 0.5)) { x.push('<endTuplet/>'); tup = null; }
          }
          if (tup) x.push('<endTuplet/>');
          // 小節のおわりで終わるスパナー（つぎの音がない所）
          if (vi === 0 && b === bars - 1) for (const sp of spans) if (sp.st != null && !sp.done) { sp.done = true; x.push(`<Spanner type="${sp.type}"><prev>${loc(bS(bars), sp.st)}</prev></Spanner>`); }
          x.push('</voice>');
        });
        if (pi === 0 && ownEv && ownBars.has(b)) {
          x.push('<voice>');
          for (const ev of ownEv[b]) {
            if (ev.first) for (const h of harm) if (h.own && h.at === ev.abs) x.push(harmXml(h.c, h.b));
            const dur = ev.whole ? '<durationType>measure</durationType>' + `<duration>${frac(ev.len)}</duration>` : `${ev.dot ? '<dots>1</dots>' : ''}<durationType>${TYPE[ev.base] || 'quarter'}</durationType>`;
            x.push(`<Rest><visible>0</visible>${dur}</Rest>`);
          }
          x.push('</voice>');
        }
        x.push('</Measure>');
      }
      x.push('</Staff>');
    });
    x.push('</Score>');
    x.push('</museScore>');
    return x.join('\n');
  }
  return { mscx };
})();
if (typeof module !== 'undefined') module.exports = MuseScoreExport;
