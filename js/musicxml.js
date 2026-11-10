// MusicXML（楽譜ソフトのファイル）を読みこんで、おとつみきの曲データにする
// 使い方：MusicXMLImport.readFile(arrayBuffer, fileName).then((song) => ...)
//         MusicXMLImport.parse(xmlText, fileName) → song
const MusicXMLImport = (() => {
  'use strict';

  const TPQ = 48; // 4分音符 = 48 tick
  const MAX_BARS = 128;
  const MAX_TRACKS = 8;

  // ---------- 小さな道具 ----------
  const kids = (el, name) => (el ? Array.from(el.children).filter((c) => c.localName === name) : []);
  const kid = (el, name) => {
    if (!el) return null;
    for (const c of el.children) if (c.localName === name) return c;
    return null;
  };
  const txt = (el, name) => {
    const k = name ? kid(el, name) : el;
    return k ? k.textContent.trim() : '';
  };
  const num = (s, d) => {
    const v = parseFloat(s);
    return Number.isFinite(v) ? v : d;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fail = (msg) => { throw new Error(msg); };

  const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  // ---------- 楽器（GM番号 0はじまり → 楽器ID） ----------
  const GM_INST = (() => {
    const t = new Array(128).fill('piano');
    const set = (a, b, id) => { for (let i = a; i <= b; i++) t[i] = id; };
    set(0, 3, 'piano'); t[4] = 'epiano'; t[5] = 'epiano2'; t[6] = 'harpsichord'; t[7] = 'clavinet';
    t[8] = 'celesta'; t[9] = 'glocken'; t[10] = 'musicbox'; t[11] = 'vibraphone'; t[12] = 'marimba'; t[13] = 'xylophone'; t[14] = 'tubularbell'; t[15] = 'kalimba';
    set(16, 18, 'organ'); set(19, 20, 'pipeorgan'); t[21] = 'accordion'; t[22] = 'kenhamo'; t[23] = 'accordion';
    t[24] = 'guitar'; t[25] = 'steelguitar'; set(26, 28, 'eguitar'); set(29, 31, 'rockguitar');
    t[32] = 'acbass'; set(33, 39, 'ebass');
    t[40] = 'violin'; set(41, 42, 'cello'); t[43] = 'contrabass'; t[44] = 'strings'; t[45] = 'pizz'; t[46] = 'harp'; t[47] = 'timpani';
    set(48, 51, 'strings'); set(52, 54, 'choir'); t[55] = 'strings';
    t[56] = 'trumpet'; t[57] = 'trombone'; t[58] = 'tuba'; t[59] = 'trumpet'; t[60] = 'horn'; set(61, 63, 'brassens');
    set(64, 67, 'sax'); set(68, 69, 'oboe'); t[70] = 'bassoon'; t[71] = 'clarinet';
    t[72] = 'piccolo'; t[73] = 'flute'; t[74] = 'recorder'; t[75] = 'flute'; t[76] = 'flute'; t[77] = 'shakuhachi'; t[78] = 'flute'; t[79] = 'ocarina';
    set(80, 87, 'lead1'); set(88, 103, 'synth1');
    t[104] = 'shamisen'; t[105] = 'steelguitar'; t[106] = 'shamisen'; t[107] = 'koto'; t[108] = 'kalimba'; t[109] = 'bagpipe';
    t[110] = 'violin'; t[111] = 'oboe'; t[112] = 'glocken'; t[113] = 'marimba'; t[114] = 'steeldrum'; t[115] = 'marimba';
    set(116, 118, 'taikodrum');
    return t;
  })();

  // パート名から楽器をあてる（上から順にしらべる）
  const NAME_INST = [
    [/piccolo|ピッコロ/i, 'piccolo'],
    [/recorder|リコーダー|たて笛|縦笛/i, 'recorder'],
    [/flute|フルート|fl\./i, 'flute'],
    [/ocarina|オカリナ/i, 'ocarina'],
    [/shakuhachi|尺八/i, 'shakuhachi'],
    [/oboe|オーボエ/i, 'oboe'],
    [/clarinet|クラリネット/i, 'clarinet'],
    [/bassoon|fagott|ファゴット|バスーン/i, 'bassoon'],
    [/sax|サックス|サクソフォ/i, 'sax'],
    [/trumpet|トランペット|cornet|コルネット/i, 'trumpet'],
    [/trombone|トロンボーン/i, 'trombone'],
    [/tuba|チューバ|euphonium|ユーフォ/i, 'tuba'],
    [/horn|ホルン/i, 'horn'],
    [/violin|バイオリン|ヴァイオリン/i, 'violin'],
    [/viola|ビオラ|ヴィオラ|cello|チェロ/i, 'cello'],
    [/contrabass|double bass|コントラバス/i, 'contrabass'],
    [/string|ストリングス|弦楽/i, 'strings'],
    [/harp|ハープ/i, 'harp'],
    [/timpani|ティンパニ/i, 'timpani'],
    [/kenban|melodica|pianica|鍵盤ハーモニカ|ピアニカ|メロディオン/i, 'kenhamo'],
    [/accordion|アコーディオン/i, 'accordion'],
    [/e\.?\s*piano|electric piano|エレピ|エレクトリックピアノ/i, 'epiano'],
    [/harpsichord|cembalo|チェンバロ/i, 'harpsichord'],
    [/pipe organ|パイプオルガン/i, 'pipeorgan'],
    [/organ|オルガン/i, 'organ'],
    [/celesta|チェレスタ/i, 'celesta'],
    [/glocken|鉄琴|グロッケン/i, 'glocken'],
    [/vibraphone|ビブラフォン/i, 'vibraphone'],
    [/marimba|マリンバ/i, 'marimba'],
    [/xylophone|木琴|シロフォン/i, 'xylophone'],
    [/koto|琴|箏/i, 'koto'],
    [/shamisen|三味線/i, 'shamisen'],
    [/sanshin|三線/i, 'sanshin'],
    [/bass guitar|electric bass|エレキベース|ベースギター|e\.?\s*bass/i, 'ebass'],
    [/e\.?\s*guitar|electric guitar|エレキ/i, 'eguitar'],
    [/guitar|ギター/i, 'guitar'],
    [/ukulele|ウクレレ/i, 'ukulele'],
    [/^\s*(bass|ベース)\s*\d*\s*$/i, 'ebass'],
    [/choir|chorus|コーラス|合唱/i, 'choir'],
    [/piano|ピアノ|pf\.?$/i, 'piano'],
    [/soprano|alto|tenor|voice|vocal|melody|ソプラノ|アルト|テノール|メロディ|歌|ボーカル|うた/i, 'recorder'],
  ];

  function guessInst(program, name) {
    if (program != null && program >= 1 && program <= 128) return GM_INST[program - 1];
    for (const [re, id] of NAME_INST) if (re.test(name || '')) return id;
    return 'piano';
  }

  // ---------- ドラム（GMキー番号 → ドラムID） ----------
  const GM_DRUM = {
    35: 'kick', 36: 'kick', 37: 'fuchi', 38: 'snare', 40: 'snare', 39: 'clap',
    41: 'tomL', 43: 'tomL', 45: 'tomL', 47: 'tomL', 48: 'tomH', 50: 'tomH',
    42: 'hihat', 44: 'hihat', 46: 'ohat', 49: 'crash', 52: 'crash', 55: 'crash', 57: 'crash',
    51: 'ride', 53: 'ride', 59: 'ride', 54: 'tamb', 56: 'cowbell', 60: 'bongoH', 61: 'bongoL',
    62: 'congaM', 63: 'congaH', 64: 'congaL', 69: 'maracas', 70: 'maracas', 73: 'guiro', 74: 'guiro',
    75: 'clave', 76: 'woodH', 77: 'woodL', 80: 'triMute', 81: 'triangle', 67: 'agogoH', 68: 'agogoL',
  };

  // ふつうのドラム譜の位置 → ドラムID（xは×の符頭）
  function drumByStaff(step, oct, head) {
    const k = `${step}${oct}`;
    const x = /^(x|cross|circle-x|diamond)$/.test(head || '');
    switch (k) {
      case 'D4': return x ? 'hihat' : 'kick';
      case 'E4': case 'F4': return 'kick';
      case 'G4': case 'A4': case 'B4': return 'tomL';
      case 'C5': return 'snare';
      case 'D5': return 'tomL';
      case 'E5': return 'tomH';
      case 'F5': return x ? 'ride' : 'tomH';
      case 'G5': return head === 'circle-x' ? 'ohat' : 'hihat';
      case 'A5': case 'B5': case 'C6': return 'crash';
      default: return 'snare';
    }
  }

  const ART = { staccato: 'stac', staccatissimo: 'stac', spiccato: 'stac', accent: 'acc', tenuto: 'ten', 'strong-accent': 'marc' };
  const DYN = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sf', 'sfz', 'fp'];
  const HARM = { major: 'M', minor: 'm', dominant: '7', 'major-seventh': 'M7', 'minor-seventh': 'm7', 'suspended-fourth': 'sus4', diminished: 'dim', augmented: 'aug' };
  const TEMPO_WORD = /grave|largo|larghetto|lento|adagio|andante|andantino|moderato|allegretto|allegro|vivace|vivo|presto|prestissimo|maestoso|tempo|ゆっくり|ゆったり|おだやか|はやく|速く|速さ|元気|軽やか|かろやか|歩く|おちついて|落ち着いて/i;

  // ---------- 1つのパートを小節ごとに読む ----------
  // 時間は小節の中の tick（小数のまま）で記録し、あとで小節の位置を足す
  function readPart(partEl) {
    let divisions = 1;
    let beats = 4;
    let beatType = 4;
    const info = { perc: false, key: null, time: null, hasPitched: false, hasUnpitched: false };
    const measures = [];
    for (const m of kids(partEl, 'measure')) {
      const M = { items: [], len: 0, implicit: m.getAttribute('implicit') === 'yes', declared: 0, barlines: [] };
      let cur = 0; // 小節の中の位置（tick）
      let maxPos = 0;
      let lastStart = 0;
      const toT = (d) => (num(d, 0) * TPQ) / divisions;
      const at = () => cur;
      for (const el of m.children) {
        const tag = el.localName;
        if (tag === 'attributes') {
          const dv = num(txt(el, 'divisions'), 0);
          if (dv > 0) divisions = dv;
          const tm = kid(el, 'time');
          if (tm && kid(tm, 'beats')) {
            // 「3+2」のような書き方にも対応
            const b = txt(tm, 'beats').split('+').reduce((a, s) => a + num(s, 0), 0);
            const bt = num(txt(tm, 'beat-type'), 4);
            if (b > 0 && bt > 0) { beats = b; beatType = bt; }
            if (!info.time) info.time = [beats, beatType];
            M.time = [beats, beatType];
          }
          const ky = kid(el, 'key');
          if (ky && kid(ky, 'fifths') && !info.key) info.key = { fifths: Math.round(num(txt(ky, 'fifths'), 0)), mode: txt(ky, 'mode') };
          if (ky && kid(ky, 'fifths')) M.key = { fifths: Math.round(num(txt(ky, 'fifths'), 0)), mode: txt(ky, 'mode') };
          for (const c of kids(el, 'clef')) if (txt(c, 'sign') === 'percussion') info.perc = true;
        } else if (tag === 'backup') {
          cur = Math.max(0, cur - toT(txt(el, 'duration')));
        } else if (tag === 'forward') {
          cur += toT(txt(el, 'duration'));
          maxPos = Math.max(maxPos, cur);
        } else if (tag === 'note') {
          const isChord = !!kid(el, 'chord');
          const grace = !!kid(el, 'grace');
          const cue = !!kid(el, 'cue');
          const dur = grace ? 0 : toT(txt(el, 'duration'));
          const start = isChord ? lastStart : cur;
          if (!isChord) { lastStart = cur; cur += dur; maxPos = Math.max(maxPos, cur); }
          if (grace || cue || kid(el, 'rest')) continue;
          const pitchEl = kid(el, 'pitch');
          const unp = kid(el, 'unpitched');
          if (!pitchEl && !unp) continue;
          const n = { kind: 'note', t: start, d: dur, voice: txt(el, 'voice') || '1', staff: txt(el, 'staff') || '1' };
          if (pitchEl) {
            info.hasPitched = true;
            const st = STEP[txt(pitchEl, 'step').toUpperCase()];
            if (st == null) continue;
            n.p = (Math.round(num(txt(pitchEl, 'octave'), 4)) + 1) * 12 + st + Math.round(num(txt(pitchEl, 'alter'), 0));
          } else {
            info.hasUnpitched = true;
            n.dstep = txt(unp, 'display-step').toUpperCase();
            n.doct = txt(unp, 'display-octave');
            n.head = txt(el, 'notehead');
          }
          const ins = kid(el, 'instrument');
          if (ins) n.inst = ins.getAttribute('id');
          n.dynAttr = num(el.getAttribute('dynamics'), 0);
          // タイ
          for (const tie of kids(el, 'tie')) {
            if (tie.getAttribute('type') === 'start') n.tieStart = true;
            if (tie.getAttribute('type') === 'stop') n.tieStop = true;
          }
          const art = [];
          n.slurStart = [];
          n.slurStop = [];
          for (const nt of kids(el, 'notations')) {
            for (const td of kids(nt, 'tied')) {
              const ty = td.getAttribute('type');
              if (ty === 'start' || ty === 'continue') n.tieStart = true;
              if (ty === 'stop' || ty === 'continue') n.tieStop = true;
            }
            for (const a of kids(nt, 'articulations')) {
              for (const c of a.children) {
                const v = ART[c.localName];
                if (v && !art.includes(v)) art.push(v);
              }
            }
            if (kid(nt, 'fermata') && !art.includes('ferm')) art.push('ferm');
            for (const s of kids(nt, 'slur')) {
              const no = s.getAttribute('number') || '1';
              const ty = s.getAttribute('type');
              if (ty === 'start') n.slurStart.push(no);
              else if (ty === 'stop') n.slurStop.push(no);
            }
            for (const dy of kids(nt, 'dynamics')) {
              for (const c of dy.children) if (DYN.includes(c.localName)) M.items.push({ kind: 'dyn', t: start, v: c.localName });
            }
          }
          if (art.length) n.art = art;
          // 歌詞（1番、なければ最初のもの）
          const lys = kids(el, 'lyric');
          const ly = lys.find((l) => (l.getAttribute('number') || '1') === '1') || lys[0];
          if (ly) {
            const s = kids(ly, 'text').map((t) => t.textContent).join('').trim();
            if (s) n.ly = s;
          }
          M.items.push(n);
        } else if (tag === 'direction') {
          const t = at() + (kid(el, 'offset') ? toT(txt(el, 'offset')) : 0);
          let gotTempo = false;
          const snd = kid(el, 'sound');
          if (snd && snd.getAttribute('tempo')) {
            const bpm = num(snd.getAttribute('tempo'), 0);
            if (bpm > 0) { M.items.push({ kind: 'tempo', t, bpm }); gotTempo = true; }
          }
          if (snd) for (const [attr, type] of [['segno', 'segno'], ['coda', 'coda'], ['tocoda', 'tocoda'], ['fine', 'fine'], ['dacapo', 'dc'], ['dalsegno', 'ds']]) if (snd.hasAttribute(attr)) M.items.push({ kind: 'jump', type });
          for (const dt of kids(el, 'direction-type')) {
            for (const dy of kids(dt, 'dynamics')) {
              for (const c of dy.children) if (DYN.includes(c.localName)) M.items.push({ kind: 'dyn', t, v: c.localName });
            }
            for (const w of kids(dt, 'wedge')) {
              M.items.push({ kind: 'wedge', t, type: w.getAttribute('type'), no: w.getAttribute('number') || '1' });
            }
            for (const w of kids(dt, 'words')) {
              const s = w.textContent.trim();
              if (s) M.items.push({ kind: 'words', t, s });
            }
            const met = kid(dt, 'metronome');
            if (met && !gotTempo && kid(met, 'per-minute')) {
              const pm = num(txt(met, 'per-minute').replace(/[^0-9.]/g, ''), 0);
              const unit = { whole: 4, half: 2, quarter: 1, eighth: 0.5, '16th': 0.25 }[txt(met, 'beat-unit')] || 1;
              const dots = kids(met, 'beat-unit-dot').length;
              const mul = unit * (dots === 1 ? 1.5 : dots === 2 ? 1.75 : 1);
              if (pm > 0) { M.items.push({ kind: 'tempo', t, bpm: pm * mul }); gotTempo = true; }
            }
          }
        } else if (tag === 'sound') {
          const bpm = num(el.getAttribute('tempo'), 0);
          if (bpm > 0) M.items.push({ kind: 'tempo', t: at(), bpm });
          // D.C.・D.S.・Fine・セーニョ・コーダ
          for (const [attr, type] of [['segno', 'segno'], ['coda', 'coda'], ['tocoda', 'tocoda'], ['fine', 'fine'], ['dacapo', 'dc'], ['dalsegno', 'ds']]) if (el.hasAttribute(attr)) M.items.push({ kind: 'jump', type });
        } else if (tag === 'harmony') {
          const root = kid(el, 'root');
          if (root) {
            const st = STEP[txt(root, 'root-step').toUpperCase()];
            if (st != null) {
              const r = (((st + Math.round(num(txt(root, 'root-alter'), 0))) % 12) + 12) % 12;
              const t = at() + (kid(el, 'offset') ? toT(txt(el, 'offset')) : 0);
              M.items.push({ kind: 'harm', t, r, q: HARM[txt(el, 'kind')] || 'M' });
            }
          }
        } else if (tag === 'barline') {
          const rp = kid(el, 'repeat');
          if (rp) M.barlines.push({ repeat: rp.getAttribute('direction') });
          const en = kid(el, 'ending');
          if (en) {
            const no = parseInt(en.getAttribute('number') || '1', 10);
            M.barlines.push({ ending: en.getAttribute('type'), no: Number.isFinite(no) ? no : 1 });
          }
        }
      }
      M.len = maxPos;
      M.declared = (beats * 4 * TPQ) / beatType;
      measures.push(M);
    }
    return { measures, info };
  }

  // ---------- 本体：XMLの文字 → 曲データ ----------
  function parse(xmlText, fileName) {
    if (typeof xmlText !== 'string' || !xmlText.trim()) fail('MusicXMLの形式がちがいます');
    let doc;
    try {
      doc = new DOMParser().parseFromString(xmlText.replace(/^﻿/, ''), 'application/xml');
    } catch (e) {
      fail('MusicXMLの形式がちがいます');
    }
    if (!doc || doc.getElementsByTagName('parsererror').length) fail('MusicXMLの形式がちがいます（ファイルがこわれているかもしれません）');
    const root = doc.documentElement;
    if (root.localName === 'score-timewise') fail('この形式（score-timewise）のMusicXMLは読みこめません。楽譜ソフトで「partwise」形式で保存しなおしてください');
    if (root.localName !== 'score-partwise') fail('MusicXMLの形式がちがいます');

    const baseName = String(fileName || '').replace(/^.*[\\/]/, '').replace(/\.[^.]*$/, '');
    const workTitle = txt(kid(root, 'work'), 'work-title');
    const mvTitle = txt(root, 'movement-title');
    const title = (workTitle || mvTitle || baseName || '').trim();
    const ident = kid(root, 'identification');
    const score = { subtitle: workTitle && mvTitle && mvTitle !== workTitle ? mvTitle : '', lyricist: '', composer: '' };
    for (const c of kids(ident, 'creator')) {
      const ty = c.getAttribute('type');
      if ((ty === 'composer' || ty === 'lyricist') && !score[ty]) score[ty] = c.textContent.trim();
    }

    // パートの情報（名前、楽器）
    const partInfo = {};
    for (const sp of kids(kid(root, 'part-list'), 'score-part')) {
      const id = sp.getAttribute('id');
      const pi = { name: txt(sp, 'part-name') || txt(sp, 'part-abbreviation'), program: null, perc: false, unpitched: {}, instName: {} };
      for (const si of kids(sp, 'score-instrument')) pi.instName[si.getAttribute('id')] = txt(si, 'instrument-name');
      for (const mi of kids(sp, 'midi-instrument')) {
        const ch = txt(mi, 'midi-channel');
        if (ch === '10') pi.perc = true;
        const pg = txt(mi, 'midi-program');
        if (pg && pi.program == null) pi.program = Math.round(num(pg, 1));
        const un = txt(mi, 'midi-unpitched');
        if (un) pi.unpitched[mi.getAttribute('id')] = Math.round(num(un, 0)) - 1; // MusicXML は1から、GM は0から
      }
      partInfo[id] = pi;
    }

    const partEls = kids(root, 'part');
    if (!partEls.length) fail('MusicXMLの中に楽譜（パート）がありません');
    const parts = partEls.map((pe) => {
      const r = readPart(pe);
      r.id = pe.getAttribute('id');
      r.meta = partInfo[r.id] || { name: '', program: null, perc: false, unpitched: {} };
      r.isPerc = r.info.perc || r.meta.perc || (r.info.hasUnpitched && !r.info.hasPitched);
      return r;
    });

    // 拍子・調
    const firstTime = (parts.find((p) => p.info.time) || { info: {} }).info.time || [4, 4];
    let meterD = Math.round(firstTime[1]);
    if (![2, 4, 8].includes(meterD)) meterD = 4;
    const meter = [clamp(Math.round(firstTime[0]), 1, 12), meterD];
    const barTicks = (meter[0] * 192) / meter[1];
    const keyInfo = (parts.find((p) => p.info.key && !p.isPerc) || parts.find((p) => p.info.key) || { info: {} }).info.key || { fifths: 0, mode: 'major' };
    const minor = /minor|aeolian/i.test(keyInfo.mode || '');
    const fifths = clamp(keyInfo.fifths, -7, 7);
    const key = (((fifths * 7 + (minor ? 9 : 0)) % 12) + 12) % 12;

    // 小節の位置（全パートで共通）
    const nMeas = Math.max(...parts.map((p) => p.measures.length));
    const lenOf = (i) => Math.max(0, ...parts.map((p) => (p.measures[i] ? p.measures[i].len : 0)));
    const implicitOf = (i) => parts.some((p) => p.measures[i] && p.measures[i].implicit);
    const declOf = (i) => {
      for (const p of parts) if (p.measures[i]) return p.measures[i].declared;
      return barTicks;
    };
    let pickup = 0;
    const starts = [];
    const len0 = Math.round(lenOf(0));
    if (nMeas > 1 && len0 > 0 && len0 < barTicks && (implicitOf(0) || len0 < Math.round(declOf(0)) - 1)) pickup = len0;
    let pos = 0;
    for (let i = 0; i < nMeas; i++) {
      if (i === 0 && pickup) {
        starts.push(barTicks - pickup);
        pos = barTicks;
        continue;
      }
      starts.push(pos);
      const content = lenOf(i);
      pos += implicitOf(i) && content > 0 ? content : Math.max(content, declOf(i));
    }
    const songEnd = pos;
    // 曲のとちゅうの拍子・調の変化
    const fixMeter = (t) => { let d = Math.round(t[1]); if (![2, 4, 8].includes(d)) d = 4; return [clamp(Math.round(t[0]), 1, 12), d]; };
    const keyOf = (k) => { const mi = /minor|aeolian/i.test(k.mode || ''); const f = clamp(k.fifths, -7, 7); return { key: (((f * 7 + (mi ? 9 : 0)) % 12) + 12) % 12, minor: mi }; };
    const meters = {};
    const keys = {};
    {
      let pm = meter;
      let pk = { key, minor };
      for (let i = 1; i < nMeas; i++) {
        const tp = parts.find((p) => p.measures[i] && p.measures[i].time);
        if (tp) { const m = fixMeter(tp.measures[i].time); if (String(m) !== String(pm)) { meters[i] = m; pm = m; } }
        const kp = parts.find((p) => !p.isPerc && p.measures[i] && p.measures[i].key);
        if (kp) { const k = keyOf(kp.measures[i].key); if (k.key !== pk.key || k.minor !== pk.minor) { keys[i] = k; pk = k; } }
      }
    }
    const varMeter = Object.keys(meters).length > 0;
    const bars = clamp(varMeter ? nMeas : Math.max(nMeas, Math.ceil(Math.round(songEnd) / barTicks)), 1, MAX_BARS);
    let limit = bars * barTicks;
    if (varMeter) {
      let m = meter;
      limit = 0;
      for (let i = 0; i < bars; i++) { if (meters[i]) m = meters[i]; limit += (m[0] * 192) / m[1]; }
      for (const b in meters) if (+b >= bars) delete meters[b];
    }
    for (const b in keys) if (+b >= bars) delete keys[b];
    const absT = (i, t) => Math.round(starts[i] + t);

    // テンポ・速さのことば・コード・くり返し
    const tempoEv = [];
    let tempoText = '';
    const chords = new Array(bars).fill(null);
    let hasHarmony = false;
    const jumps = {};
    const rStart = new Set();
    const rEnd = new Set();
    const volta = {};
    parts.forEach((p) => {
      let openEnding = null;
      p.measures.forEach((M, i) => {
        for (const it of M.items) {
          if (it.kind === 'tempo') tempoEv.push({ tick: absT(i, it.t), bar: i, bpm: it.bpm });
          else if (it.kind === 'jump') { if (jumps[it.type] == null) jumps[it.type] = i; }
          else if (it.kind === 'words' && !tempoText && TEMPO_WORD.test(it.s)) tempoText = it.s.slice(0, 40);
          else if (it.kind === 'harm') {
            hasHarmony = true;
            if (i < bars && !chords[i]) chords[i] = { r: it.r, q: it.q };
            else if (i < bars && chords[i] && !chords[i].h && it.t > 0 && (chords[i].r !== it.r || chords[i].q !== it.q)) chords[i].h = { r: it.r, q: it.q }; // 小節の後半のコード
          }
        }
        if (i >= bars) return;
        for (const b of M.barlines) {
          if (b.repeat === 'forward') rStart.add(i);
          else if (b.repeat === 'backward') rEnd.add(i);
          if (b.ending === 'start') openEnding = clamp(b.no, 1, 2);
          if (b.ending && openEnding != null && volta[i] == null) volta[i] = openEnding;
          if (b.ending === 'stop' || b.ending === 'discontinue') openEnding = null;
        }
        if (openEnding != null && volta[i] == null) volta[i] = openEnding;
      });
    });
    tempoEv.sort((a, b) => a.tick - b.tick);
    const fixBpm = (v) => clamp(Math.round(v), 30, 240);
    const bpm = tempoEv.length ? fixBpm(tempoEv[0].bpm) : 100;
    const tempos = {};
    tempoEv.slice(1).forEach((e) => {
      if (e.bar > 0 && e.bar < bars && tempos[e.bar] == null) tempos[e.bar] = fixBpm(e.bpm);
    });

    // トラックを作る
    const tracks = [];
    for (const p of parts) {
      const name = (p.meta.name || '').replace(/\s+/g, ' ').trim().slice(0, 20);
      if (p.isPerc) tracks.push(makeDrum(p, name, absT, limit));
      else tracks.push(makeMelody(p, name, absT, limit));
    }
    let out = tracks;
    const room = hasHarmony ? MAX_TRACKS - 1 : MAX_TRACKS;
    if (out.length > room) {
      // メロディを先にのこす
      const mel = out.filter((t) => t.type === 'melody');
      const dr = out.filter((t) => t.type !== 'melody');
      const keep = new Set(mel.concat(dr).slice(0, room));
      out = out.filter((t) => keep.has(t));
    }
    if (hasHarmony) out.push({ type: 'chord', name: 'コード伴奏', inst: 'piano', pattern: 'whole', bassOn: true, chords });

    return {
      v: 2,
      title,
      bpm,
      meter,
      bars,
      key,
      scale: minor ? 'minor' : 'major',
      tempos,
      meters,
      keys,
      pickup,
      jumps,
      repeats: {
        start: Array.from(rStart).sort((a, b) => a - b),
        end: Array.from(rEnd).sort((a, b) => a - b),
        volta,
      },
      tempoText,
      score,
      tracks: out,
    };
  }

  function makeMelody(p, name, absT, limit) {
    const notes = [];
    const dyn = [];
    const hairpins = [];
    const slurs = [];
    const openTie = {}; // 音の高さ → つながっている音
    const openSlur = {};
    const openWedge = {};
    // 声部：同じ段の中で2番目以降の声部は「声部2」
    const firstVoice = {};
    p.measures.forEach((M) => { for (const it of M.items) if (it.kind === 'note' && it.p != null) { const v = +it.voice || 1; if (firstVoice[it.staff] == null || v < firstVoice[it.staff]) firstVoice[it.staff] = v; } });
    p.measures.forEach((M, i) => {
      for (const it of M.items) {
        if (it.kind === 'note' && it.p != null) {
          const s = absT(i, it.t);
          const e = Math.max(s + 1, absT(i, it.t + it.d));
          let n = null;
          if (it.tieStop && openTie[it.p]) {
            const prev = openTie[it.p];
            if (Math.abs(prev.s + prev.l - s) <= 3 || prev.s < s) {
              n = prev;
              n.l = Math.max(n.l, e - n.s);
              // つながった音のフェルマータは長い音につける
              if (it.art && it.art.includes('ferm')) n.art = (n.art || []).filter((a) => a !== 'ferm').concat('ferm');
            }
          }
          if (!n) {
            n = { s, l: e - s, p: it.p };
            if ((+it.voice || 1) !== firstVoice[it.staff]) n.v = 2;
            if (it.art) n.art = it.art.slice();
            if (it.ly) n.ly = it.ly;
            if (it.dynAttr > 0 && Math.abs(it.dynAttr - 100) > 5) n.vel = Math.min(1.25, Math.max(0.25, Math.round((it.dynAttr / 100) * 4) / 4)); // 音ごとの強さ
            notes.push(n);
          }
          if (it.tieStart) openTie[it.p] = n;
          else delete openTie[it.p];
          for (const no of it.slurStop) {
            if (openSlur[no] != null) {
              if (s >= openSlur[no]) slurs.push({ s: openSlur[no], e: s });
              delete openSlur[no];
            }
          }
          for (const no of it.slurStart) openSlur[no] = s;
        } else if (it.kind === 'dyn') {
          dyn.push({ t: Math.max(0, absT(i, it.t)), v: it.v });
        } else if (it.kind === 'wedge') {
          const t = Math.max(0, absT(i, it.t));
          if (it.type === 'crescendo' || it.type === 'diminuendo') openWedge[it.no] = { s: t, type: it.type === 'crescendo' ? 'cresc' : 'dim' };
          else if (it.type === 'stop' && openWedge[it.no]) {
            const w = openWedge[it.no];
            if (t > w.s) hairpins.push({ s: w.s, e: t, type: w.type });
            delete openWedge[it.no];
          }
        }
      }
    });
    // 曲の長さの外に出た音はけずる
    const kept = notes.filter((n) => n.s >= 0 && n.s < limit);
    kept.forEach((n) => { if (n.s + n.l > limit) n.l = limit - n.s; });
    kept.sort((a, b) => a.s - b.s || a.p - b.p);
    dyn.sort((a, b) => a.t - b.t);
    // おなじ位置の同じ強弱は1つに
    const dyn2 = dyn.filter((d, k) => d.t < limit && !(k && dyn[k - 1].t === d.t && dyn[k - 1].v === d.v));
    let range = 'soprano';
    if (kept.length) {
      const ps = kept.map((n) => n.p);
      const avg = ps.reduce((a, b) => a + b, 0) / ps.length;
      const span = Math.max(...ps) - Math.min(...ps);
      range = avg >= 60 ? 'soprano' : avg >= 55 ? 'alto' : avg >= 48 ? 'tenor' : 'bass';
      if (span > 60) range = 'all';
      else if (span > 26) range = 'wide';
    }
    return {
      type: 'melody',
      name: name || 'メロディ',
      inst: guessInst(p.meta.program, p.meta.name),
      range,
      notes: kept,
      dyn: dyn2,
      hairpins: hairpins.filter((h) => h.s < limit),
      slurs: slurs.filter((s) => s.s < limit),
    };
  }

  function makeDrum(p, name, absT, limit) {
    const grid = {};
    const unp = p.meta.unpitched || {};
    const unpIds = Object.keys(unp);
    p.measures.forEach((M, i) => {
      for (const it of M.items) {
        if (it.kind !== 'note' || it.tieStop) continue;
        let id = null;
        let gm = null;
        // おつみきで書き出した楽譜は、楽器の名前がそのままドラムの名前
        const nm = it.inst && p.meta.instName ? p.meta.instName[it.inst] : null;
        if (nm && typeof Sound !== 'undefined' && Sound.DRUMS[nm]) id = nm;
        else if (it.inst && unp[it.inst] != null) gm = unp[it.inst];
        else if (!it.inst && unpIds.length === 1) gm = unp[unpIds[0]];
        if (id) { /* 名前でわかった */ } else if (gm != null) id = GM_DRUM[gm] || 'snare';
        else if (it.dstep) id = drumByStaff(it.dstep, it.doct, it.head);
        else if (it.p != null) id = GM_DRUM[it.p] || 'snare'; // 音の高さで書かれたドラム
        else id = 'snare';
        const t = absT(i, it.t);
        if (t < 0 || t >= limit) continue;
        const v = (it.art && (it.art.includes('acc') || it.art.includes('marc'))) || it.dynAttr > 100 ? 2 : 1;
        if (!grid[id]) grid[id] = {};
        grid[id][t] = Math.max(grid[id][t] || 0, v);
      }
    });
    return { type: 'drum', name: name || 'ドラム', kit: 'drums', grid };
  }

  // ---------- ファイルを読む（.musicxml / .xml / .mxl） ----------
  function decodeText(bytes) {
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2));
    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2));
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return new TextDecoder('utf-8').decode(bytes.subarray(3));
    // BOMなしのUTF-16
    if (bytes.length >= 4 && bytes[0] === 0x3c && bytes[1] === 0x00 && bytes[2] === 0x3f) return new TextDecoder('utf-16le').decode(bytes);
    if (bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x3c && bytes[3] === 0x3f) return new TextDecoder('utf-16be').decode(bytes);
    // <?xml encoding="Shift_JIS"?> など
    const head = String.fromCharCode.apply(null, Array.from(bytes.subarray(0, 200)));
    const m = /^<\?xml[^>]*encoding\s*=\s*["']([A-Za-z0-9_.:-]+)["']/.exec(head);
    if (m && !/^utf-?8$/i.test(m[1])) {
      try { return new TextDecoder(m[1]).decode(bytes); } catch (e) { /* しらない文字コードはUTF-8で */ }
    }
    return new TextDecoder('utf-8').decode(bytes);
  }

  async function inflateRaw(data) {
    if (typeof DecompressionStream === 'undefined') fail('このブラウザでは .mxl ファイルを開けません');
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  // zipの中身の一覧を読む
  function zipEntries(bytes) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let eocd = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) fail('.mxl ファイルがこわれています');
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const utf8 = new TextDecoder('utf-8');
    const list = [];
    for (let k = 0; k < count; k++) {
      if (p + 46 > bytes.length || dv.getUint32(p, true) !== 0x02014b50) fail('.mxl ファイルがこわれています');
      const method = dv.getUint16(p + 10, true);
      const csize = dv.getUint32(p + 20, true);
      const usize = dv.getUint32(p + 24, true);
      const nlen = dv.getUint16(p + 28, true);
      const xlen = dv.getUint16(p + 30, true);
      const clen = dv.getUint16(p + 32, true);
      const off = dv.getUint32(p + 42, true);
      const name = utf8.decode(bytes.subarray(p + 46, p + 46 + nlen));
      list.push({ name, method, csize, usize, off });
      p += 46 + nlen + xlen + clen;
    }
    return list;
  }

  async function zipRead(bytes, ent) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (dv.getUint32(ent.off, true) !== 0x04034b50) fail('.mxl ファイルがこわれています');
    const start = ent.off + 30 + dv.getUint16(ent.off + 26, true) + dv.getUint16(ent.off + 28, true);
    const data = bytes.subarray(start, start + ent.csize);
    if (ent.method === 0) return data;
    if (ent.method === 8) return inflateRaw(data);
    fail('.mxl ファイルの圧縮形式に対応していません');
  }

  async function readMxl(bytes, fileName) {
    const ents = zipEntries(bytes);
    const byName = (n) => ents.find((e) => e.name === n) || ents.find((e) => e.name.toLowerCase() === n.toLowerCase());
    let target = null;
    const cont = byName('META-INF/container.xml');
    if (cont) {
      try {
        const cdoc = new DOMParser().parseFromString(decodeText(await zipRead(bytes, cont)), 'application/xml');
        const rfs = Array.from(cdoc.getElementsByTagName('rootfile'));
        const rf = rfs.find((r) => !r.getAttribute('media-type') || /musicxml/.test(r.getAttribute('media-type'))) || rfs[0];
        if (rf) target = byName((rf.getAttribute('full-path') || '').replace(/^\//, ''));
      } catch (e) { target = null; }
    }
    if (!target) target = ents.find((e) => !/^META-INF\//i.test(e.name) && /\.(xml|musicxml)$/i.test(e.name));
    if (!target) fail('.mxl ファイルの中に楽譜が見つかりません');
    return parse(decodeText(await zipRead(bytes, target)), fileName);
  }

  async function readFile(arrayBuffer, fileName) {
    const bytes = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
    const isZip = /\.mxl$/i.test(fileName || '') || (bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4);
    if (isZip) return readMxl(bytes, fileName);
    return parse(decodeText(bytes), fileName);
  }

  return { parse, readFile };
})();
