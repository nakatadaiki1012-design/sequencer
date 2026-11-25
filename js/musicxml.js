// MusicXML（楽譜ソフトのファイル）を読みこんで、ソラノートの曲データにする
// 使い方：MusicXMLImport.readFile(arrayBuffer, fileName).then((song) => ...)
//         MusicXMLImport.parse(xmlText, fileName) → song
const MusicXMLImport = (() => {
  'use strict';

  const TPQ = 48; // 4分音符 = 48 tick
  const MAX_BARS = 1000;
  const MAX_TRACKS = 48;

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
  // 小節の本当の長さ（tick）に合う拍子。カデンツァのような「拍子どおりでない小節」も、あとの小節線がずれないように
  // 書いてある拍子で合えばそれ。合わなければ、ちょうどの長さの拍子（分母32まで）。それも無理なら少しだけ長くする（うしろに短い休み）
  function fitMeter(len, ts) {
    const n0 = Math.round(ts[0]);
    const d0 = Math.round(ts[1]);
    if ([2, 4, 8, 16, 32].includes(d0) && n0 >= 1 && n0 <= 32 && Math.abs((n0 * 192) / d0 - len) <= 1) return [n0, d0];
    const t = Math.max(6, Math.round(len));
    for (const d of [4, 8, 16, 32]) { const n = (t * d) / 192; if (Number.isInteger(n) && n >= 1 && n <= 32) return [n, d]; }
    for (const d of [32, 16, 8, 4, 2]) { const n = Math.ceil((t * d) / 192); if (n <= 32) return [Math.max(1, n), d]; }
    return [32, 2];
  }
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
    t[40] = 'violin'; t[41] = 'viola'; t[42] = 'cello'; t[43] = 'contrabass'; t[44] = 'strings'; t[45] = 'pizz'; t[46] = 'harp'; t[47] = 'timpani';
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
    [/viola|ビオラ|ヴィオラ/i, 'viola'],
    [/cello|チェロ/i, 'cello'],
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

  // 打楽器の名前 → ドラムID（オーケストラの打楽器は、音楽室キットの音に）
  function drumByName(nm) {
    const n = String(nm || '').toLowerCase();
    if (!n) return null;
    if (/castan/.test(n)) return 'castanet';
    if (/tambourine|tamburin/.test(n)) return 'tamb';
    if (/triangle/.test(n)) return /mute|closed/.test(n) ? 'triMute' : 'triangle';
    if (/concert cymbal|clash|piatti|crash cymbals|^cymbals?$/.test(n)) return 'awase';
    if (/sleigh|jingle/.test(n)) return 'suzu';
    if (/concert bass drum|gran cassa|grosse caisse/.test(n)) return 'odaiko';
    if (/concert snare|tamburo|caisse claire|side drum/.test(n)) return 'kodaiko';
    if (/tam-?tam|gong/.test(n)) return 'gong';
    return null;
  }
  // ドラムの音がぜんぶ入るキット（なければドラムキット）
  function kitFor(grid) {
    const ids = Object.keys(grid);
    if (!ids.length || typeof Sound === 'undefined') return 'drums';
    const k = Sound.KITS.find((x) => ids.every((id) => x.list.includes(id)));
    return k ? k.id : 'drums';
  }

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

  // 小節のとちゅうでコードが変わる：c.x ＝ [{ o: 小節の頭からの位置, r, q }]（前と同じコードなら入れない）
  const addChordAt = (c, o, n) => {
    if (!(o > 0)) return;
    const x = c.x || (c.x = []);
    const last = x.filter((y) => y.o < o).pop() || c;
    if (last.r === n.r && last.q === n.q) return;
    if (!x.some((y) => y.o === o) && x.length < 16) { x.push({ o, r: n.r, q: n.q }); x.sort((a, z) => a.o - z.o); }
  };
  const ART = { staccato: 'stac', staccatissimo: 'stacc2', spiccato: 'stacc2', accent: 'acc', tenuto: 'ten', 'strong-accent': 'marc', 'breath-mark': 'breath', caesura: 'caes' };
  const ORN = { 'trill-mark': 'tr', 'inverted-mordent': 'prall', mordent: 'mord', turn: 'turn', 'delayed-turn': 'turn', 'inverted-turn': 'iturn', 'delayed-inverted-turn': 'iturn' };
  const ACC_MARK = { sharp: 1, flat: -1, natural: 0 };
  const DYN = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sf', 'sfz', 'fp'];
  const HARM = { major: 'M', minor: 'm', dominant: '7', 'major-seventh': 'M7', 'minor-seventh': 'm7', 'suspended-fourth': 'sus4', diminished: 'dim', augmented: 'aug', 'major-sixth': '6', 'minor-sixth': 'm6', 'dominant-ninth': '9', 'major-ninth': 'M9', 'minor-ninth': 'm9', 'half-diminished': 'm7b5', 'diminished-seventh': 'dim7', 'major-minor': 'mM7' };
  const HARM_TEXT = { add9: 'add9', '7sus4': '7sus4', '7b9': '7b9', '7#9': '7s9' };
  const TEMPO_WORD = /grave|largo|larghetto|lento|adagio|andante|andantino|moderato|allegretto|allegro|vivace|vivo|presto|prestissimo|maestoso|tempo|ゆっくり|ゆったり|おだやか|はやく|速く|速さ|元気|軽やか|かろやか|歩く|おちついて|落ち着いて/i;

  // ---------- 1つのパートを小節ごとに読む ----------
  // 時間は小節の中の tick（小数のまま）で記録し、あとで小節の位置を足す
  function readPart(partEl) {
    let divisions = 1;
    let beats = 4;
    let beatType = 4;
    const info = { perc: false, key: null, time: null, hasPitched: false, hasUnpitched: false };
    const measures = [];
    let tpNow = 0; // いまの移調（書いた音＋tpNow＝鳴る音）
    for (const m of kids(partEl, 'measure')) {
      const M = { items: [], len: 0, implicit: m.getAttribute('implicit') === 'yes', declared: 0, barlines: [] };
      let cur = 0; // 小節の中の位置（tick）
      let maxPos = 0;
      let lastStart = 0;
      let pendingGrace = null;
      const toT = (d) => (num(d, 0) * TPQ) / divisions;
      const at = () => cur;
      for (const el of m.children) {
        const tag = el.localName;
        if (tag === 'attributes') {
          const dv = num(txt(el, 'divisions'), 0);
          if (dv > 0) divisions = dv;
          // 移調楽器（MusicXML は「書いた音＋chromatic（＋オクターブ）＝鳴る音」）。調号より先に読む（調号も書いた調なので、鳴る調になおす）
          const tp = kid(el, 'transpose');
          if (tp) {
            tpNow = Math.round(num(txt(tp, 'chromatic'), 0)) + 12 * Math.round(num(txt(tp, 'octave-change'), 0));
            if (info.trans == null) info.trans = -tpNow;
          }
          const kfix = (fx) => { if (!tpNow) return fx; let d = (((tpNow * 7) % 12) + 12) % 12; if (d > 6) d -= 12; let r = fx + d; if (r > 7) r -= 12; if (r < -7) r += 12; return r; };
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
          if (ky && kid(ky, 'fifths') && !info.key) info.key = { fifths: kfix(Math.round(num(txt(ky, 'fifths'), 0))), mode: txt(ky, 'mode') };
          if (ky && kid(ky, 'fifths')) M.key = { fifths: kfix(Math.round(num(txt(ky, 'fifths'), 0))), mode: txt(ky, 'mode') };
          for (const c of kids(el, 'clef')) {
            if (txt(c, 'sign') === 'percussion') info.perc = true;
            // TAB譜の段：その段の音は、ほかの段（五線）と同じなので読まない（TAB譜しかないときは読む）
            if (txt(c, 'sign') === 'TAB') { info.tabStaff = c.getAttribute('number') || '1'; continue; }
            // 1段目の音部記号（とちゅうの変化も読む）
            if ((c.getAttribute('number') || '1') !== '1') continue;
            const sg = txt(c, 'sign');
            const ln = txt(c, 'line');
            const oc = Math.round(num(txt(c, 'clef-octave-change'), 0));
            const cl = sg === 'G' ? (oc === -1 ? 'treble8' : 'treble') : sg === 'F' && (ln === '' || ln === '4') ? 'bass' : sg === 'C' && (ln === '' || ln === '3') ? 'alto' : null;
            if (cl) M.clef = cl;
          }
          if (kid(el, 'staves')) info.staves = Math.round(num(txt(el, 'staves'), 1));
          // 弦の楽器：開放弦の高さ（line 1＝いちばん下の線＝低い弦）
          for (const sd of kids(el, 'staff-details')) {
            const tl = kids(sd, 'staff-tuning').map((t) => ({ line: +t.getAttribute('line') || 0, p: (Math.round(num(txt(t, 'tuning-octave'), 4)) + 1) * 12 + (STEP[txt(t, 'tuning-step').toUpperCase()] ?? 0) + Math.round(num(txt(t, 'tuning-alter'), 0)) })).sort((a, b) => a.line - b.line);
            if (tl.length >= 4 && tl.length <= 8 && !info.tun) info.tun = tl.map((t) => t.p);
          }
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
          // 装飾音符は、次の音につける（前打音）
          if (grace && kid(el, 'pitch') && !isChord) {
            const gp = kid(el, 'pitch');
            const gs = STEP[txt(gp, 'step').toUpperCase()];
            // いくつも続く装飾音符は、まとめて次の音に。斜線のないもの（1つだけ）は長前打音
            if (gs != null) {
              const gpch = (Math.round(num(txt(gp, 'octave'), 4)) + 1) * 12 + gs + Math.round(num(txt(gp, 'alter'), 0)) + tpNow;
              if (!pendingGrace) pendingGrace = { ps: [], long: kid(el, 'grace').getAttribute('slash') !== 'yes' };
              pendingGrace.ps.push(gpch);
              if (kid(el, 'grace').getAttribute('slash') === 'yes') pendingGrace.long = false;
            }
            continue;
          }
          if (grace || cue || kid(el, 'rest')) continue;
          const pitchEl = kid(el, 'pitch');
          const unp = kid(el, 'unpitched');
          if (!pitchEl && !unp) continue;
          const n = { kind: 'note', t: start, d: dur, voice: txt(el, 'voice') || '1', staff: txt(el, 'staff') || '1' };
          if (info.tabStaff && info.staves > 1 && n.staff === info.tabStaff) continue; // 五線＋TAB譜：TAB譜の段は同じ音
          if (pitchEl) {
            info.hasPitched = true;
            const st = STEP[txt(pitchEl, 'step').toUpperCase()];
            if (st == null) continue;
            n.p = (Math.round(num(txt(pitchEl, 'octave'), 4)) + 1) * 12 + st + Math.round(num(txt(pitchEl, 'alter'), 0)) + tpNow;
          } else {
            info.hasUnpitched = true;
            n.dstep = txt(unp, 'display-step').toUpperCase();
            n.doct = txt(unp, 'display-octave');
            n.head = txt(el, 'notehead');
          }
          const ins = kid(el, 'instrument');
          if (ins) n.inst = ins.getAttribute('id');
          // 符頭の形（ひし形＝ハーモニクス・×）
          { const cl = (el.getAttribute('color') || '').toLowerCase().replace(/^#ff(?=[0-9a-f]{6}$)/, '#'); const ck = { '#e03131': 'red', '#1971c2': 'blue', '#2f9e44': 'green', '#e8590c': 'orange', '#7048e8': 'purple' }[cl]; if (ck) n.col = ck; }
          if (pitchEl) { const nhd = txt(el, 'notehead'); if (/diamond/.test(nhd)) n.nh = 'diamond'; else if (/^(x|cross)$/.test(nhd)) n.nh = 'x'; }
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
            for (const o of kids(nt, 'ornaments')) {
              for (const c of o.children) {
                if (c.localName === 'tremolo') {
                  // トレモロ：single＝1つの音・start＝2つの音（つぎの音と交互に）。中の数字＝斜線の数
                  const ty = c.getAttribute('type') || 'single';
                  const k = Math.max(1, Math.min(3, Math.round(num(c.textContent, 3))));
                  if (ty === 'single' && !art.includes('trem')) { art.push('trem'); if (k !== 3) n.trs = k; }
                  if (ty === 'start' && !art.includes('trem2')) { art.push('trem2'); if (k !== 3) n.trs = k; }
                  continue;
                }
                if (c.localName === 'wavy-line') { M.items.push({ kind: 'wavy', t: start, type: c.getAttribute('type'), no: c.getAttribute('number') || '1' }); continue; }
                if (c.localName === 'accidental-mark' && art.includes('tr')) { const v2 = ACC_MARK[c.textContent.trim()]; if (v2 != null) n.tra = v2; continue; }
                const v = ORN[c.localName];
                if (v && !art.includes(v)) art.push(v);
              }
            }
            for (const tq of kids(nt, 'technical')) {
              for (const c of tq.children) {
                if (c.localName === 'up-bow' && !art.includes('upb')) art.push('upb');
                if (c.localName === 'harmonic' && !art.includes('harm')) art.push('harm');
                if (c.localName === 'open-string' && !art.includes('open')) art.push('open');
                if (c.localName === 'stopped' && !art.includes('stop')) art.push('stop');
                if (c.localName === 'snap-pizzicato' && !art.includes('snap')) art.push('snap');
                if (c.localName === 'down-bow' && !art.includes('dnb')) art.push('dnb');
                if (c.localName === 'fingering') { const f = c.textContent.replace(/[^0-5]/g, '').slice(0, 1); if (f) n.fg = f; }
                if (c.localName === 'string') { const v = Math.round(num(c.textContent, 0)); if (v > 0) n.strNo = v; }
              }
            }
            if (kid(nt, 'arpeggiate') && !art.includes('arp')) art.push('arp');
            if ([...kids(nt, 'glissando'), ...kids(nt, 'slide')].some((g) => g.getAttribute('type') === 'start') && !art.includes('gliss')) art.push('gliss');
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
          if (pendingGrace != null) { n.gr = pendingGrace.ps.length === 1 ? pendingGrace.ps[0] : pendingGrace.ps.slice(0, 8); if (pendingGrace.long && pendingGrace.ps.length === 1) n.grl = true; pendingGrace = null; }
          // 歌詞（1番、なければ最初のもの）
          const lys = kids(el, 'lyric');
          const ly = lys.find((l) => (l.getAttribute('number') || '1') === '1') || lys[0];
          if (ly) {
            const s = kids(ly, 'text').map((t) => t.textContent).join('').trim();
            const sy = txt(ly, 'syllabic');
            if (s) n.ly = s + (sy === 'begin' || sy === 'middle' ? '-' : '');
          }
          // 2番・3番
          for (const no of [2, 3]) {
            const l2 = lys.find((l) => l.getAttribute('number') === String(no));
            if (!l2 || l2 === ly) continue;
            const s2 = kids(l2, 'text').map((t) => t.textContent).join('').trim();
            const sy2 = txt(l2, 'syllabic');
            if (s2) n['ly' + no] = (s2 + (sy2 === 'begin' || sy2 === 'middle' ? '-' : '')).slice(0, 20);
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
            for (const pd of kids(dt, 'pedal')) M.items.push({ kind: 'pedal', t, type: pd.getAttribute('type') });
            // 8va・8vb（down＝高く演奏する 8va、up＝低く演奏する 8vb）
            for (const os of kids(dt, 'octave-shift')) M.items.push({ kind: 'oct', t, type: os.getAttribute('type'), size: Math.round(num(os.getAttribute('size'), 8)), no: os.getAttribute('number') || '1' });
            for (const w of kids(dt, 'rehearsal')) {
              const s = w.textContent.trim();
              if (s) M.items.push({ kind: 'reh', s: s.slice(0, 8) });
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
              // 移調楽器のパートのコードネームは「書く音」：鳴る音になおす
              const r = (((st + Math.round(num(txt(root, 'root-alter'), 0)) + tpNow) % 12) + 24) % 12;
              const t = at() + (kid(el, 'offset') ? toT(txt(el, 'offset')) : 0);
              M.items.push({ kind: 'harm', t, r, q: HARM_TEXT[(kid(el, 'kind') && kid(el, 'kind').getAttribute('text')) || ''] || HARM[txt(el, 'kind')] || 'M' });
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
    // 1ページ目の上の文字（credit）：サブタイトル・作曲・作詞
    for (const cr of kids(root, 'credit')) {
      if ((cr.getAttribute('page') || '1') !== '1') continue;
      const ty = txt(cr, 'credit-type').toLowerCase();
      const ws = kids(cr, 'credit-words');
      const v = ws.map((w) => w.textContent).join('').replace(/\s+/g, ' ').trim().slice(0, 60);
      if (!v || v === title) continue;
      const just = ws[0] ? ws[0].getAttribute('justify') || '' : '';
      if ((ty === 'subtitle' || (!ty && just === 'center')) && !score.subtitle) score.subtitle = v;
      else if ((ty === 'composer' || (!ty && just === 'right')) && !score.composer) score.composer = v;
      else if ((ty === 'lyricist' || ty === 'poet') && !score.lyricist) score.lyricist = v;
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
    // 小節ごとの拍子は、その小節の本当の長さから決める（とちゅうの拍子の変化・カデンツァ・くり返しで切れた小節も）
    const meters = {};
    let pos = 0;
    {
      let ts = firstTime;
      let pm = meter;
      for (let i = 0; i < nMeas; i++) {
        const tp = parts.find((p) => p.measures[i] && p.measures[i].time);
        if (tp) ts = tp.measures[i].time;
        if (i === 0) {
          starts.push(pickup ? barTicks - pickup : 0);
          pos = barTicks;
          continue;
        }
        starts.push(pos);
        const content = lenOf(i);
        const m = fitMeter(implicitOf(i) && content > 0 ? content : Math.max(content, declOf(i)), ts);
        if (String(m) !== String(pm)) { meters[i] = m; pm = m; }
        pos += (m[0] * 192) / m[1];
      }
    }
    const songEnd = pos;
    // 曲のとちゅうの調の変化
    const keyOf = (k) => { const mi = /minor|aeolian/i.test(k.mode || ''); const f = clamp(k.fifths, -7, 7); return { key: (((f * 7 + (mi ? 9 : 0)) % 12) + 12) % 12, minor: mi }; };
    const keys = {};
    {
      let pk = { key, minor };
      for (let i = 1; i < nMeas; i++) {
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
    const rehearsal = {};
    parts.forEach((p) => {
      let openEnding = null;
      p.measures.forEach((M, i) => {
        for (const it of M.items) {
          if (it.kind === 'tempo') tempoEv.push({ tick: absT(i, it.t), bar: i, bpm: it.bpm });
          else if (it.kind === 'jump') { if (jumps[it.type] == null) jumps[it.type] = i; }
          else if (it.kind === 'words' && !tempoText && TEMPO_WORD.test(it.s)) tempoText = it.s.slice(0, 40);
          else if (it.kind === 'reh' && i < bars && rehearsal[i] == null) rehearsal[i] = it.s;
          else if (it.kind === 'harm') {
            hasHarmony = true;
            if (i < bars && !chords[i]) chords[i] = { r: it.r, q: it.q };
            else if (i < bars && chords[i] && it.t > 0) addChordAt(chords[i], Math.round(it.t), { r: it.r, q: it.q }); // 小節のとちゅうのコード
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
      ...(Object.keys(rehearsal).length ? { rehearsal } : {}),
      score: { ...score, ...(out.filter((t) => t.type === 'melody').length >= 6 ? { orch: true, ordered: true } : {}) },
      tracks: out,
    };
  }

  function makeMelody(p, name, absT, limit) {
    const notes = [];
    const dyn = [];
    const hairpins = [];
    const slurs = [];
    const texts = [];
    const pedals = [];
    let pedOpen = null;
    const ottava = [];
    const openOct = {};
    const trills = [];
    const openWavy = {};
    const clefChg = {};
    let lastClef = null;
    const openTie = {}; // 音の高さ → つながっている音
    const openSlur = {};
    const openWedge = {};
    // 声部：同じ段の中で2番目以降の声部は「声部2」
    const firstVoice = {};
    p.measures.forEach((M) => { for (const it of M.items) if (it.kind === 'note' && it.p != null) { const v = +it.voice || 1; if (firstVoice[it.staff] == null || v < firstVoice[it.staff]) firstVoice[it.staff] = v; } });
    p.measures.forEach((M, i) => {
      if (M.clef) { if (i > 0 && lastClef && M.clef !== lastClef) clefChg[i] = M.clef; lastClef = M.clef; }
      for (const it of M.items) {
        if (it.kind === 'note' && it.p != null) {
          const s = absT(i, it.t);
          const e = Math.max(s + 1, absT(i, it.t + it.d));
          let n = null;
          // タイは「段・声部・高さ」ごとに。同じ高さの音がほかの声部にあっても切れないように（声部をまたぐタイも、終わりがぴったりならつなぐ）
          const tk = it.staff + ':' + (it.voice || '1') + ':' + it.p;
          let ok = tk;
          if (it.tieStop && !openTie[ok]) ok = Object.keys(openTie).find((k) => k.startsWith(it.staff + ':') && k.endsWith(':' + it.p) && Math.abs(openTie[k].s + openTie[k].l - s) <= 3);
          if (it.tieStop && ok && openTie[ok]) {
            const prev = openTie[ok];
            if (ok !== tk) delete openTie[ok];
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
            if (it.ly2) n.ly2 = it.ly2;
            if (it.col) n.col = it.col;
            if (it.ly3) n.ly3 = it.ly3;
            if (it.fg) n.fg = it.fg;
            if (it.gr != null) n.gr = it.gr;
            for (const k of ['grl', 'tra', 'trs', 'nh']) if (it[k] != null) n[k] = it[k];
            // 弦（MusicXML は 1＝いちばん高い弦 → ソラノートは 0＝いちばん低い弦）
            const tunX = p.info.tun;
            if (tunX && it.strNo && it.strNo <= tunX.length) { const si = tunX.length - it.strNo; const fr = it.p - tunX[si]; if (fr >= 0 && fr <= 24) n.str = si; }
            if (it.dynAttr > 0 && Math.abs(it.dynAttr - 100) > 5) n.vel = Math.min(1.25, Math.max(0.25, Math.round((it.dynAttr / 100) * 4) / 4)); // 音ごとの強さ
            notes.push(n);
          }
          if (it.tieStart) openTie[tk] = n;
          else delete openTie[tk];
          for (const no of it.slurStop) {
            if (openSlur[no] != null) {
              if (s >= openSlur[no]) slurs.push({ s: openSlur[no], e: s });
              delete openSlur[no];
            }
          }
          for (const no of it.slurStart) openSlur[no] = s;
        } else if (it.kind === 'words' && !TEMPO_WORD.test(it.s) && !/^(rit|rall|accel|a tempo|D\.?C|D\.?S|Fine|To Coda)/i.test(it.s)) {
          texts.push({ t: Math.max(0, absT(i, it.t)), x: it.s.slice(0, 80) });
        } else if (it.kind === 'pedal') {
          const t = Math.max(0, absT(i, it.t));
          if (it.type === 'start') pedOpen = t;
          else if ((it.type === 'stop' || it.type === 'change') && pedOpen != null) { if (t > pedOpen) pedals.push({ s: pedOpen, e: t }); pedOpen = it.type === 'change' ? t : null; }
        } else if (it.kind === 'wavy') {
          // トリルの波線
          const t = Math.max(0, absT(i, it.t));
          if (it.type === 'start') openWavy[it.no] = t;
          else if (it.type === 'stop' && openWavy[it.no] != null) {
            // おわりの音の長さは、あとで（音がそろってから）決める
            trills.push({ s: openWavy[it.no], stopAt: t });
            delete openWavy[it.no];
          }
        } else if (it.kind === 'oct') {
          const t = Math.max(0, absT(i, it.t));
          if (it.type === 'down' || it.type === 'up') openOct[it.no] = { s: t, k: (it.type === 'down' ? 1 : -1) * (it.size >= 15 ? 2 : 1) };
          else if (it.type === 'stop' && openOct[it.no]) { const o = openOct[it.no]; if (t > o.s) ottava.push({ s: o.s, e: t, k: o.k }); delete openOct[it.no]; }
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
    // トリルの波線：さいごの音の終わりまで。はじめの音の tr と ♯・♭ は、線のほうへ
    for (const q of trills) {
      const last = notes.filter((m) => m.s <= q.stopAt && m.s >= q.s).sort((a, z) => z.s - a.s)[0];
      q.e = Math.max(q.stopAt, last ? last.s + last.l : q.stopAt);
      delete q.stopAt;
      for (const m of notes.filter((m2) => m2.s === q.s)) {
        if (m.tra != null) { q.a = m.tra; delete m.tra; }
        if (m.art) { m.art = m.art.filter((a) => a !== 'tr'); if (!m.art.length) delete m.art; }
      }
    }
    // 曲の長さの外に出た音はけずる
    const kept = notes.filter((n) => n.s >= 0 && n.s < limit);
    kept.forEach((n) => { if (n.s + n.l > limit) n.l = limit - n.s; });
    kept.sort((a, b) => a.s - b.s || a.p - b.p);
    dyn.sort((a, b) => a.t - b.t);
    // おなじ位置の同じ強弱は1つに
    const dyn2 = dyn.filter((d, k) => d.t < limit && !(k && dyn[k - 1].t === d.t && dyn[k - 1].v === d.v));
    // 弦：自動でえらぶのと同じなら、おぼえない（自分でえらんだ弦だけのこす）
    const tunM = p.info.tun;
    if (tunM && kept.some((n) => n.str != null) && typeof Notation !== 'undefined' && Notation.tabFrets) {
      const nb = Math.max(1, Math.ceil(limit / 48));
      const geo = { starts: Array.from({ length: nb + 1 }, (_, i) => Math.min(limit, i * 48)), meters: Array(nb).fill([1, 4]), keys: Array(nb).fill({ key: 0, minor: false }) };
      const auto = Notation.tabFrets(kept.map((n) => { const { str, ...o } = n; return o; }), tunM, nb, geo, [1, 4]);
      for (const n of kept) if (n.str != null) { const q = auto.get(n.s + ':' + n.p); if (q && q.si === n.str) delete n.str; }
    }
    const tabView = tunM && p.info.tabStaff ? (p.info.staves > 1 ? 'both' : 'only') : '';
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
      ...(tabView ? { tabView } : {}),
      range,
      notes: kept,
      dyn: dyn2,
      hairpins: hairpins.filter((h) => h.s < limit),
      slurs: slurs.filter((s) => s.s < limit),
      ...(texts.some((x) => x.t < limit) ? { texts: texts.filter((x) => x.t < limit) } : {}),
      ...(pedals.length ? { pedals: pedals.filter((x) => x.s < limit) } : {}),
      ...(ottava.length ? { ottava: ottava.filter((x) => x.s < limit) } : {}),
      ...(trills.some((x) => x.e > x.s) ? { trills: trills.filter((x) => x.s < limit && x.e > x.s) } : {}),
      ...(p.measures[0] && p.measures[0].clef && !(p.info.staves > 1) ? { clef: p.measures[0].clef } : {}),
      ...(p.info.trans ? { trans: p.info.trans } : {}),
      ...(Object.keys(clefChg).length ? { clefChg } : {}),
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
        else if (nm && drumByName(nm)) id = drumByName(nm);
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
    return { type: 'drum', name: name || 'ドラム', kit: kitFor(grid), grid };
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

  // ============================================================
  // MuseScore のファイル（.mscz ＝ zip の中に .mscx、.mscx ＝ MuseScore の XML）
  // MuseScore 2（2.xx）・3（3.xx）・4（4.xx）の形式を読む
  // ============================================================
  const DUR_Q = { long: 16, breve: 8, whole: 4, half: 2, quarter: 1, eighth: 0.5, '16th': 0.25, '32nd': 0.125, '64th': 0.0625, '128th': 0.03125, '256th': 0.015625 };
  const tpcPc = (tpc) => ((((+tpc - 14) * 7) % 12) + 12) % 12;
  const fracVal = (s) => { const m = /^\s*(-?\d+)\s*\/\s*(\d+)\s*$/.exec(String(s || '')); return m && +m[2] ? +m[1] / +m[2] : 0; };
  const ARTMAP = [
    [/staccatissimo/i, 'stacc2'], [/staccato/i, 'stac'], [/tenuto/i, 'ten'], [/marcato/i, 'marc'], [/accent|sforzato/i, 'acc'],
    [/fermata/i, 'ferm'], [/shorttrill|prall|tremblement/i, 'prall'], [/trill/i, 'tr'], [/mordent/i, 'mord'], [/turn/i, 'turn'],
    [/upbow/i, 'upb'], [/downbow/i, 'dnb'], [/harmonic/i, 'harm'], [/brassMuteOpen|^open/i, 'open'], [/brassMuteClosed|stopped|^plus/i, 'stop'], [/snapPizzicato/i, 'snap'],
  ];
  // MuseScore の記号の名前（ターンの逆はターンより先にしらべる）
  const artsOf = (sub) => {
    const x = String(sub || '');
    if (/TurnInverted|reverseturn/i.test(x)) return ['iturn'];
    if (/AccentStaccato/i.test(x)) return ['acc', 'stac'];
    if (/MarcatoStaccato/i.test(x)) return ['marc', 'stac'];
    if (/StaccatissimoWedge|StaccatissimoStroke/i.test(x)) return ['stacc2'];
    const a = artOf(x);
    return a ? [a] : [];
  };
  const artOf = (sub) => { for (const [re, a] of ARTMAP) if (re.test(sub || '')) return a; return null; };
  const HQ = (name) => {
    const n = String(name || '').replace(/[()\s]/g, '');
    if (n === '' || /^(maj|M)?$/.test(n)) return 'M';
    if (/^(m|mi|min|-)$/.test(n)) return 'm';
    if (/^(maj7|Maj7|MAJ7|M7|Ma7|\^7|\^|Δ7?|j7)$/.test(n)) return 'M7';
    if (/^(m7b5|m7♭5|mi7b5|min7b5|-7b5|ø7?|0)$/.test(n)) return 'm7b5';
    if (/^(dim7|o7|°7)$/.test(n)) return 'dim7';
    if (/^(mMaj7|mM7|mmaj7|m\^7|-\^7|mΔ7?)$/.test(n)) return 'mM7';
    if (/^(maj9|Maj9|M9|\^9|Δ9)$/.test(n)) return 'M9';
    if (/^(m9|mi9|min9|-9)$/.test(n)) return 'm9';
    if (/^(m6|mi6|min6|-6)$/.test(n)) return 'm6';
    if (/^6$/.test(n)) return '6';
    if (/^(add9|add2|2)$/.test(n)) return 'add9';
    if (/^9$/.test(n)) return '9';
    if (/^7sus4?$/.test(n)) return '7sus4';
    if (/^7(b9|♭9)$/.test(n)) return '7b9';
    if (/^7(#9|♯9)$/.test(n)) return '7s9';
    if (/^(m7|mi7|min7|-7)$/.test(n)) return 'm7';
    if (/^7/.test(n)) return '7';
    if (/sus/.test(n)) return 'sus4';
    if (/^(dim|o|°)/.test(n)) return 'dim';
    if (/^(aug|\+)/.test(n)) return 'aug';
    if (/^m/.test(n)) return 'm';
    return 'M';
  };
  const plain = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

  function parseMscx(xmlText, fileName) {
    let doc;
    try { doc = new DOMParser().parseFromString(String(xmlText).replace(/^﻿/, ''), 'application/xml'); } catch (e) { fail('MuseScore のファイルの形式がちがいます'); }
    if (!doc || doc.getElementsByTagName('parsererror').length) fail('MuseScore のファイルがこわれているかもしれません');
    const root = doc.documentElement;
    if (root.localName !== 'museScore') fail('MuseScore のファイルの形式がちがいます');
    const ver = parseFloat(root.getAttribute('version') || '3');
    if (ver < 2) fail('MuseScore 1 の古いファイルは読めません。MuseScore で開いて保存しなおしてください');
    const score = kid(root, 'Score');
    if (!score) fail('MuseScore のファイルに楽譜が見つかりません');
    const D = num(txt(score, 'Division'), 480); // 4分音符の長さ
    const T = (d) => (d * TPQ) / D; // MuseScore の長さ → ソラノートの tick

    // ---- 曲名 ----
    let title = '';
    for (const mt of kids(score, 'metaTag')) if (mt.getAttribute('name') === 'workTitle' && mt.textContent.trim()) title = mt.textContent.trim();
    if (!title) for (const vb of Array.from(score.getElementsByTagName('VBox'))) for (const t of kids(vb, 'Text')) if (/title/i.test(txt(t, 'style')) && !title) title = plain(kid(t, 'text'));
    if (!title) title = String(fileName || '').replace(/^.*[\\/]/, '').replace(/\.[^.]*$/, '') || 'MuseScore の曲';
    // サブタイトル・作曲・作詞（上の枠の文字、または曲の情報）
    const credit = { subtitle: '', lyricist: '', composer: '' };
    for (const mt of kids(score, 'metaTag')) { const nm = mt.getAttribute('name'); if ((nm === 'composer' || nm === 'lyricist') && mt.textContent.trim()) credit[nm] = mt.textContent.trim().slice(0, 60); }
    for (const vb of Array.from(score.getElementsByTagName('VBox'))) for (const t of kids(vb, 'Text')) {
      const st = txt(t, 'style').toLowerCase();
      const v = plain(kid(t, 'text')).slice(0, 60);
      if (!v) continue;
      if (st === 'subtitle' && !credit.subtitle) credit.subtitle = v;
      else if (st === 'composer' && !credit.composer) credit.composer = v;
      else if ((st === 'lyricist' || st === 'poet') && !credit.lyricist) credit.lyricist = v;
    }

    // ---- パート（楽器）と段 ----
    const staffInfo = {}; // 段の id → { part, idx, perc }
    const parts = [];
    for (const pe of kids(score, 'Part')) {
      const inst = kid(pe, 'Instrument');
      const name = plain(kid(pe, 'trackName')) || plain(kid(inst, 'longName')) || plain(kid(inst, 'trackName')) || 'パート';
      const ch = kid(inst, 'Channel');
      const prg = ch && kid(ch, 'program') ? +kid(ch, 'program').getAttribute('value') : null;
      const staves = kids(pe, 'Staff');
      const perc = staves.some((s) => (kid(s, 'StaffType') || { getAttribute: () => '' }).getAttribute('group') === 'percussion') || txt(inst, 'useDrumset') === '1' || !!kid(inst, 'Drum');
      // 移調楽器（MuseScore は「鳴る音＝書いた音＋transposeChromatic」）と、楽器の音部記号
      const tc = Math.round(num(txt(inst, 'transposeChromatic'), 0));
      const iclef = {};
      for (const c of kids(inst, 'clef')) { const m = { G: 'treble', G8va: 'treble', G15ma: 'treble', G8vb: 'treble8', F: 'bass', F8vb: 'bass', F15mb: 'bass', C3: 'alto' }[c.textContent.trim()]; if (m) iclef[c.getAttribute('staff') || '1'] = m; }
      const drumName = {};
      for (const d of kids(inst, 'Drum')) drumName[d.getAttribute('pitch')] = txt(d, 'name');
      // 弦の楽器（ギターなど）：開放弦の高さ（低い弦から）。TAB譜の段は、五線につながっている（linkedTo）なら読まない（同じ音）
      const sd = kid(inst, 'StringData');
      const tun = sd ? kids(sd, 'string').map((e) => Math.round(num(e.textContent, NaN))).filter((v) => Number.isFinite(v)) : [];
      const part = { name: name.slice(0, 30), prg, perc, staves: [], trans: tc ? -tc : 0, iclef, drumName, tun: tun.length >= 4 && tun.length <= 8 ? tun : null, tabView: '' };
      const isTab = (st) => (kid(st, 'StaffType') || { getAttribute: () => '' }).getAttribute('group') === 'tablature';
      const allTab = staves.length > 0 && staves.every(isTab);
      staves.forEach((st) => {
        const id = st.getAttribute('id');
        if (txt(st, 'linkedTo') && staves.length > 1) { staffInfo[id] = { part, idx: 0, skip: true }; if (isTab(st)) part.tabView = 'both'; return; }
        staffInfo[id] = { part, idx: part.staves.length, tab: isTab(st) };
        part.staves.push(id);
      });
      if (allTab) part.tabView = 'only';
      parts.push(part);
    }

    // ---- 小節の長さ（最初の段で決める） ----
    const staffEls = kids(score, 'Staff');
    if (!staffEls.length) fail('MuseScore のファイルに音符が見つかりません');
    const voicesOf = (m) => { const v = kids(m, 'voice'); return v.length ? v : [m]; };
    const measuresOf = (st) => kids(st, 'Measure').slice(0, MAX_BARS);
    const m0 = measuresOf(staffEls[0]);
    const nBars = Math.max(1, m0.length);
    let sig = [4, 4];
    const meters = {};
    const barLen = [];
    m0.forEach((m, i) => {
      for (const v of voicesOf(m)) for (const ts of kids(v, 'TimeSig')) { const n = +txt(ts, 'sigN'); const d = +txt(ts, 'sigD'); if (n > 0 && d > 0) { if (i > 0 && (n !== sig[0] || d !== sig[1])) meters[i] = [n, d]; sig = [n, d]; } }
      if (i === 0) meters[0] = sig.slice();
      const nominal = (sig[0] * 4 * D) / sig[1];
      const len = m.getAttribute('len') ? fracVal(m.getAttribute('len')) * 4 * D : nominal;
      barLen.push({ len, nominal, sig: sig.slice() });
    });
    // 小節ごとの拍子は、その小節の本当の長さ（len）から決める（カデンツァ・くり返しで切れた小節も、あとの小節線がずれないように）
    for (const b in meters) if (+b > 0) delete meters[b];
    const startDiv = [0];
    {
      let pm = meters[0];
      for (let i = 0; i < nBars; i++) {
        let step = barLen[i].len;
        if (i > 0) {
          const mt = fitMeter(T(barLen[i].len), barLen[i].sig);
          if (String(mt) !== String(pm)) { meters[i] = mt; pm = mt; }
          step = (mt[0] * 4 * D) / mt[1];
        }
        startDiv.push(startDiv[i] + step);
      }
    }
    // 1小節目が短い＝弱起。ソラノートでは、1小節目を「全部の長さ」として、うしろにつめて書く
    const pickupDiv = barLen[0].len < barLen[0].nominal - 1 ? barLen[0].len : 0;
    const shift = pickupDiv ? barLen[0].nominal - pickupDiv : 0;
    const absT = (div) => Math.round(T(div + shift));

    // ---- 曲全体のもの（テンポ・調・くり返し・コード・記号） ----
    let bpm = 0;
    let tempoText = '';
    const tempos = {};
    const keys = {};
    let key0 = null;
    const rStart = [];
    const rEnd = [];
    const volta = {};
    const jumps = {};
    const rehearsal = {};
    const chords = new Array(nBars).fill(null);
    let hasHarm = false;

    // 位置（relative location）→ 絶対位置（div）
    const locTo = (spanner, mi, posDiv) => {
      const nx = kid(spanner, 'next');
      const loc = nx && kid(nx, 'location');
      if (!loc) return null;
      const dm = Math.round(num(txt(loc, 'measures'), 0));
      const fr = fracVal(txt(loc, 'fractions')) * 4 * D;
      const tm = clamp(mi + dm, 0, nBars);
      return (dm ? startDiv[tm] + (posDiv - startDiv[mi]) : posDiv) + fr;
    };

    // ---- 段ごとに音を読む ----
    const concertPitch = txt(kid(score, 'Style'), 'concertPitch') === '1';
    const keyStaffEl = staffEls.find((e) => { const inf = staffInfo[e.getAttribute('id')]; return inf && !inf.skip && !inf.part.perc && !inf.part.trans; }) || staffEls[0];
    const tracks = [];
    const drumTracks = new Map();
    for (const stEl of staffEls) {
      const info = staffInfo[stEl.getAttribute('id')] || { part: { name: 'パート', prg: null, perc: false, staves: [stEl.getAttribute('id')] }, idx: 0 };
      if (info.skip) continue; // 五線につながったTAB譜（同じ音）
      const part = info.part;
      const isFirstStaff = stEl === staffEls[0];
      // 調号は、移調しない楽器の段から読む（なければ最初の段から、実音になおして）
      const isKeyStaff = stEl === keyStaffEl;
      // 移調楽器の段の調号・コードネームは「書く音」で入っている（実音で表示して保存した楽譜はそのまま）。実音にもどす半音の数
      const wSh = !part.perc && part.trans && !concertPitch ? part.trans : 0;
      const notes = [];
      const dyn = [];
      const hairpins = [];
      const slurs = [];
      const texts = [];
      const pedals = [];
      const ottava = [];
      const trills = [];
      const clefChg = {};
      let curClef = null; // いまの音部記号（同じ記号の書き直しは、変化にしない）
      let clef0 = null; // はじめの音部記号
      const mrep = {};
      const grid = {};
      const openTie = {}; // `${voice}:${pitch}` → note
      const slur2 = {}; // MuseScore 2 のスラー id → 始まり
      measuresOf(stEl).forEach((m, mi) => {
        if (mi >= nBars) return;
        const mStart = startDiv[mi];
        if (isFirstStaff) {
          if (kid(m, 'startRepeat')) rStart.push(mi);
          if (kid(m, 'endRepeat')) rEnd.push(mi);
        }
        const vs = voicesOf(m);
        vs.forEach((vEl, vi0) => {
          let pos = mStart;
          let voice = vi0;
          const tupStack = []; // [比]
          const tup2 = {}; // MuseScore 2 の 3連符 id → 比
          let pendingArt = [];
          let pendingGrace = null;
          let pendingTrem2 = false; // 2つの音のトレモロ：あいての音（2つ目）には記号をつけない
          let lastChord = null;
          for (const el of vEl.children) {
            const tag = el.localName;
            const ratio = () => tupStack.reduce((a, r) => a * r, 1);
            if (tag === 'tick') { pos = num(el.textContent, pos); continue; } // MuseScore 2：絶対位置
            if (tag === 'location') { const dm = Math.round(num(txt(el, 'measures'), 0)); pos = (dm ? startDiv[clamp(mi + dm, 0, nBars)] + (pos - mStart) : pos) + fracVal(txt(el, 'fractions')) * 4 * D; continue; }
            if (tag === 'Tuplet') {
              const r = num(txt(el, 'normalNotes'), 2) / num(txt(el, 'actualNotes'), 3);
              if (el.getAttribute('id') != null) tup2[el.getAttribute('id')] = r; else tupStack.push(r);
              continue;
            }
            if (tag === 'endTuplet') { tupStack.pop(); continue; }
            if (tag === 'Clef' && vi0 === 0) {
              const c = txt(el, 'concertClefType') || txt(el, 'subtype') || txt(el, 'clefType');
              const m2 = { G: 'treble', G8va: 'treble', G15ma: 'treble', G8vb: 'treble8', 'G8vb ': 'treble8', F: 'bass', F8vb: 'bass', F15mb: 'bass', C3: 'alto' }[c];
              if (m2 && mi > 0 && curClef && m2 !== curClef) clefChg[mi] = m2;
              if (m2 && mi === 0 && !clef0) clef0 = m2;
              if (m2) curClef = m2;
              continue;
            }
            if (tag === 'KeySig' && isKeyStaff) {
              if (txt(el, 'visible') === '0' && mi > 0) continue; // 見えない調号は、変わり目にしない
              const ck = txt(el, 'concertKey');
              const k = Math.round(num(ck || txt(el, 'accidental') || txt(el, 'key'), 0));
              const minor = txt(el, 'mode') === 'minor';
              const tonic = ((((k * 7) % 12) + 12) % 12 + (minor ? 9 : 0) - (ck ? 0 : wSh) + 24) % 12;
              if (mi === 0 && key0 == null) key0 = { key: tonic, minor };
              else if (mi > 0) {
                // 同じ調の書き直しは、変わり目にしない
                const prev = Object.keys(keys).map(Number).filter((x) => x < mi).sort((x, y) => y - x)[0];
                const pk = prev != null ? keys[prev] : key0;
                if (!pk || pk.key !== tonic || pk.minor !== minor) keys[mi] = { key: tonic, minor };
              }
              continue;
            }
            if (tag === 'Tempo') {
              const q = num(txt(el, 'tempo'), 0);
              if (q > 0) { const b = Math.round(q * 60); if (!bpm && mi === 0) bpm = b; else if (mi > 0) tempos[mi] = b; }
              const tx = plain(kid(el, 'text')).replace(/[-]/g, '').replace(/\s*=\s*\d+.*$/, '').trim();
              if (mi === 0 && tx && !/^[\d\s=.]*$/.test(tx) && !tempoText) tempoText = tx.slice(0, 30);
              continue;
            }
            if (tag === 'Dynamic') { const v = txt(el, 'subtype'); if (/^(ppp|pp|p|mp|mf|f|ff|fff|sf|sfz|fp)$/.test(v)) dyn.push({ t: absT(pos), v }); continue; }
            if (tag === 'RehearsalMark') { if (isFirstStaff && plain(kid(el, 'text'))) rehearsal[mi] = plain(kid(el, 'text')).slice(0, 8); continue; }
            if (tag === 'StaffText' || tag === 'SystemText' || tag === 'Expression') { const s = plain(kid(el, 'text')); if (s) texts.push({ t: absT(pos), x: s.slice(0, 80) }); continue; }
            if (tag === 'Harmony') {
              const r = txt(el, 'root');
              if (r !== '') {
                hasHarm = true;
                const c = { r: (tpcPc(r) - wSh + 24) % 12, q: HQ(txt(el, 'name')) };
                if (!chords[mi]) chords[mi] = c; else if (pos > mStart) addChordAt(chords[mi], absT(pos) - absT(mStart), c);
              }
              continue;
            }
            if (tag === 'Marker' && isFirstStaff) {
              const lb = (txt(el, 'label') || txt(el, 'subtype') || plain(kid(el, 'text'))).toLowerCase();
              if (/segno/.test(lb)) jumps.segno = mi; else if (/tocoda|to coda/.test(lb)) jumps.tocoda = mi; else if (/coda/.test(lb)) jumps.coda = mi; else if (/fine/.test(lb)) jumps.fine = mi;
              continue;
            }
            if (tag === 'Jump' && isFirstStaff) { const to = (txt(el, 'jumpTo') + ' ' + plain(kid(el, 'text'))).toLowerCase(); if (/segno|d\.?s/.test(to)) jumps.ds = mi; else jumps.dc = mi; continue; }
            if (tag === 'Fermata') { pendingArt.push('ferm'); continue; }
            if (tag === 'Breath') { if (lastChord) for (const n of lastChord) n.art = [...new Set([...(n.art || []), /caesura/i.test(txt(el, 'subtype')) ? 'caes' : 'breath'])]; continue; }
            if (tag === 'Spanner') {
              const type = el.getAttribute('type');
              const end = locTo(el, mi, pos);
              if (end == null) continue; // 終わりの印
              if (type === 'Slur') slurs.push({ s: absT(pos), e: absT(end) });
              else if (type === 'Pedal') pedals.push({ s: absT(pos), e: absT(end) });
              else if (type === 'Trill') {
                // トリルの波線（♯・♭がついていれば、その上の音）
                const te = kid(el, 'Trill');
                const ac = te && kid(te, 'Accidental');
                const sub = ac ? txt(ac, 'subtype') : '';
                const q = { s: absT(pos), e: absT(end) };
                if (sub) q.a = /Sharp/i.test(sub) ? 1 : /Flat/i.test(sub) ? -1 : 0;
                trills.push(q);
              }
              else if (type === 'Ottava') { const sub = txt(kid(el, 'Ottava'), 'subtype'); const k = /15m?b|15vb/i.test(sub) ? -2 : /15/.test(sub) ? 2 : /b/i.test(sub) ? -1 : 1; ottava.push({ s: absT(pos), e: absT(end), k }); }
              else if (type === 'HairPin') { const hp = kid(el, 'HairPin'); const sub = txt(hp, 'subtype'); hairpins.push({ s: absT(pos), e: absT(end), type: sub === '1' || /decresc|dim/i.test(sub) ? 'dim' : 'cresc' }); }
              else if (type === 'Volta' && isFirstStaff) { const vo = kid(el, 'Volta'); const no = clamp(Math.round(num((txt(vo, 'endings') || '1').split(/[ ,]/)[0], 1)), 1, 2); for (let b = mi; b < nBars && startDiv[b] < end - 1; b++) volta[b] = no; }
              continue;
            }
            if (tag === 'Slur' && ver < 3) { continue; }
            if ((tag === 'MeasureRepeat' || tag === 'RepeatMeasure') && mi > 0 && !part.perc) {
              // 前の小節と同じ：前の小節の音をうつす
              const a0 = absT(startDiv[mi - 1]);
              const a1 = absT(startDiv[mi]);
              for (const n of notes.filter((m) => m.s >= a0 && m.s < a1)) notes.push({ ...n, s: n.s + (a1 - a0) });
              mrep[mi] = 1;
              pos += barLen[mi].len;
              continue;
            }
            if (tag !== 'Chord' && tag !== 'Rest') continue;
            // 2.x：音の track で声部
            if (kid(el, 'track')) voice = Math.round(num(txt(el, 'track'), 0)) % 4;
            const dt = txt(el, 'durationType');
            let dur;
            if (dt === 'measure' || !dt) dur = kid(el, 'duration') ? fracVal(txt(el, 'duration')) * 4 * D : barLen[mi].len;
            else dur = (DUR_Q[dt] || 1) * D;
            const dots = Math.round(num(txt(el, 'dots'), 0));
            if (dt && dt !== 'measure' && kid(el, 'duration')) {
              // 本当の長さが書いてある音（2つの音のトレモロは、見た目の半分の長さ）
              dur = fracVal(txt(el, 'duration')) * 4 * D;
            } else {
              if (dots > 0 && dt !== 'measure') dur *= 2 - Math.pow(0.5, dots);
              const tref = txt(el, 'Tuplet');
              dur *= ratio() * (tref && tup2[tref] ? tup2[tref] : 1);
            }
            const isGrace = ['acciaccatura', 'appoggiatura', 'grace4', 'grace16', 'grace32', 'grace8after', 'grace16after', 'grace32after'].some((g) => kid(el, g));
            const isAppo = !!(kid(el, 'appoggiatura') || kid(el, 'grace4'));
            if (tag === 'Rest') { pos += dur; pendingArt = []; continue; }
            const ns = kids(el, 'Note').filter((n) => txt(n, 'pitch') !== '');
            if (isGrace) {
              // いくつも続く装飾音符は、まとめて次の音に（後打音はとばす）
              if (ns.length && !/after/.test(['grace8after', 'grace16after', 'grace32after'].find((g) => kid(el, g)) || '')) {
                if (!pendingGrace) pendingGrace = { ps: [], long: isAppo };
                pendingGrace.ps.push(Math.round(num(txt(ns[ns.length - 1], 'pitch'), 60)));
                if (!isAppo) pendingGrace.long = false;
              }
              continue;
            }
            const arts = pendingArt.slice();
            pendingArt = [];
            let trillAcc = null;
            for (const a of [...kids(el, 'Articulation'), ...kids(el, 'Ornament')]) {
              for (const x of artsOf(txt(a, 'subtype'))) if (!arts.includes(x)) arts.push(x);
              // トリルの上の ♯・♭・♮
              const ac = kid(a, 'Accidental') || kid(a, 'accidentalAbove');
              if (ac) { const sub = txt(ac, 'subtype') || ac.textContent; trillAcc = /Sharp/i.test(sub) ? 1 : /Flat/i.test(sub) ? -1 : /Natural/i.test(sub) ? 0 : null; }
            }
            // トレモロ：r8/r16/r32/r64＝1つの音（斜線1〜3本）、c8〜c64＝2つの音（つぎの音と交互に）
            let tremK = null;
            const trEl = kid(el, 'Tremolo') || kid(el, 'TremoloSingleChord') || kid(el, 'TremoloTwoChord');
            if (trEl) {
              const sub = txt(trEl, 'subtype') || 'r32';
              tremK = /8/.test(sub) ? 1 : /16/.test(sub) ? 2 : 3;
              const two = /^c/i.test(sub) || trEl.localName === 'TremoloTwoChord';
              if (two) { if (!pendingTrem2) arts.push('trem2'); pendingTrem2 = !pendingTrem2; } else arts.push('trem');
            } else pendingTrem2 = false;
            if (kid(el, 'Arpeggio')) arts.push('arp');
            const lys = kids(el, 'Lyrics').filter((l) => !kid(l, 'no') || txt(l, 'no') === '0');
            const sy0 = lys.length ? txt(lys[0], 'syllabic') : '';
            const ly = lys.length ? plain(kid(lys[0], 'text')) + (sy0 === 'begin' || sy0 === 'middle' ? '-' : '') : '';
            // 3.x：音符の中にあるスラー（はじまりの音に「次」の位置が書いてある）
            for (const sp of kids(el, 'Spanner')) {
              if (sp.getAttribute('type') !== 'Slur') continue;
              const end = locTo(sp, mi, pos);
              if (end != null && end > pos) slurs.push({ s: absT(pos), e: absT(end) });
            }
            // 2.x のスラー
            for (const sl of kids(el, 'Slur')) { const id = sl.getAttribute('id'); if (sl.getAttribute('type') === 'start') slur2[id] = absT(pos); else if (slur2[id] != null) { slurs.push({ s: slur2[id], e: absT(pos) }); delete slur2[id]; } }
            const s = absT(pos);
            const e = absT(pos + dur);
            const made = [];
            if (part.perc) {
              for (const n of ns) {
                const pt = Math.round(num(txt(n, 'pitch'), 38));
                const id = drumByName((part.drumName || {})[pt]) || GM_DRUM[pt] || 'snare';
                if (s >= 0 && s < Math.round(T(startDiv[nBars] + shift))) { grid[id] = grid[id] || {}; grid[id][s] = arts.includes('acc') || arts.includes('marc') ? 2 : Math.max(grid[id][s] || 0, 1); }
              }
            } else {
              ns.forEach((n, k) => {
                const p = clamp(Math.round(num(txt(n, 'pitch'), 60)), 0, 127);
                const key = voice + ':' + p;
                let note = null;
                const tiePrev = kids(n, 'Spanner').some((sp) => sp.getAttribute('type') === 'Tie' && kid(sp, 'prev')) || kids(n, 'endSpanner').length > 0;
                if (tiePrev && openTie[key] && Math.abs(openTie[key].s + openTie[key].l - s) <= 2) { note = openTie[key]; note.l = e - note.s; }
                else if (tiePrev) {
                  // ほかの声部からつながってくるタイ
                  const k2 = Object.keys(openTie).find((q) => q.endsWith(':' + p) && Math.abs(openTie[q].s + openTie[q].l - s) <= 2);
                  if (k2) { note = openTie[k2]; note.l = e - note.s; delete openTie[k2]; }
                }
                if (!note) {
                  note = { s, p, l: Math.max(1, e - s) };
                  if (voice > 0) note.v = 2;
                  if (arts.length) note.art = arts.slice();
                  if (ly && k === ns.length - 1) note.ly = ly.slice(0, 20);
                  if (k === ns.length - 1) for (const no of [1, 2]) { // 2番・3番（MuseScore は 0 から数える）
                    const lv = kids(el, 'Lyrics').find((l) => txt(l, 'no') === String(no));
                    if (lv) { const syv = txt(lv, 'syllabic'); const tv = plain(kid(lv, 'text')); if (tv) note['ly' + (no + 1)] = (tv + (syv === 'begin' || syv === 'middle' ? '-' : '')).slice(0, 20); }
                  }
                  if (pendingGrace != null && k === ns.length - 1) { note.gr = pendingGrace.ps.length === 1 ? pendingGrace.ps[0] : pendingGrace.ps.slice(0, 8); if (pendingGrace.long && pendingGrace.ps.length === 1) note.grl = true; }
                  if (tremK && tremK !== 3) note.trs = tremK;
                  if (trillAcc != null && arts.includes('tr')) note.tra = trillAcc;
                  const hd = txt(n, 'head');
                  if (/diamond/i.test(hd)) note.nh = 'diamond'; else if (/^(cross|x)$/i.test(hd)) note.nh = 'x';
                  const fg = kids(n, 'Fingering').map((f) => plain(kid(f, 'text')) || plain(f)).join('').replace(/[^0-5]/g, '').slice(0, 1);
                  if (fg) note.fg = fg;
                  // TAB譜の弦（MuseScore は 0＝いちばん高い弦 → ソラノートは 0＝いちばん低い弦）
                  const strEl = kid(n, 'string');
                  if (part.tun && strEl) { const si = part.tun.length - 1 - Math.round(num(strEl.textContent, -99)); const fr = p - part.tun[si]; if (si >= 0 && si < part.tun.length && fr >= 0 && fr <= 24) note.str = si; }
                  notes.push(note);
                }
                const tieNext = kids(n, 'Spanner').some((sp) => sp.getAttribute('type') === 'Tie' && kid(sp, 'next')) || !!kid(n, 'Tie');
                if (kids(n, 'Spanner').some((sp) => sp.getAttribute('type') === 'Glissando' && kid(sp, 'next')) && !(note.art || []).includes('gliss')) note.art = [...(note.art || []), 'gliss'];
                if (tieNext) openTie[key] = note; else delete openTie[key];
                made.push(note);
              });
              pendingGrace = null;
            }
            lastChord = made;
            pos += dur;
          }
        });
      });
      if (part.perc) {
        const dt = drumTracks.get(part) || { type: 'drum', name: part.name, kit: 'drums', grid: {} };
        for (const id in grid) { dt.grid[id] = { ...(dt.grid[id] || {}), ...grid[id] }; }
        dt.kit = kitFor(dt.grid);
        drumTracks.set(part, dt);
        if (!tracks.includes(dt)) tracks.push(dt);
        continue;
      }
      const nStaves = part.staves.length;
      // MuseScore は 8va の中の音を「書いた高さ」でしまっている → 鳴る高さになおす
      if (ottava.length) for (const n of notes) { const q = ottava.find((o) => n.s >= o.s && n.s < o.e); if (!q) continue; n.p = clamp(n.p + 12 * q.k, 0, 127); if (n.gr != null) n.gr = Array.isArray(n.gr) ? n.gr.map((g) => clamp(g + 12 * q.k, 0, 127)) : clamp(n.gr + 12 * q.k, 0, 127); }
      const nm = nStaves === 2 ? part.name + (info.idx === 0 ? '（右手）' : '（左手）') : nStaves > 2 ? `${part.name} ${info.idx + 1}` : part.name;
      const inst = guessInst(part.prg != null ? part.prg + 1 : null, part.name);
      const ps = notes.map((n) => n.p);
      const avg = ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : 64;
      const ic = part.iclef || {};
      const firstClef = clef0 || ic[String(info.idx + 1)] || (!Object.keys(ic).length && part.staves.length === 1 ? 'treble' : null); // 書いていなければト音記号（MuseScore のきまり）
      // 弦：自動でえらぶのと同じなら、おぼえない（自分でえらんだ弦だけのこす）
      if (part.tun && notes.some((n) => n.str != null) && typeof Notation !== 'undefined' && Notation.tabFrets) {
        const auto = Notation.tabFrets(notes.map((n) => { const { str, ...o } = n; return o; }), part.tun, nBars, { starts: Array.from({ length: nBars + 1 }, (_, i) => Math.round(T(startDiv[i]))), meters: Array(nBars).fill(meters[0] || [4, 4]), keys: Array(nBars).fill({ key: 0, minor: false }) }, meters[0] || [4, 4]);
        for (const n of notes) if (n.str != null) { const q = auto.get(n.s + ':' + n.p); if (q && q.si === n.str) delete n.str; }
      }
      tracks.push({ type: 'melody', name: nm.slice(0, 30), inst, ...(part.tabView && part.tun ? { tabView: part.tabView } : {}), range: avg >= 60 ? 'soprano' : avg >= 55 ? 'alto' : avg >= 48 ? 'tenor' : 'bass',
        ...(firstClef ? { clef: firstClef } : {}), ...(part.trans ? { trans: part.trans } : {}),
        notes: notes.sort((a, b) => a.s - b.s || a.p - b.p), dyn, hairpins, slurs, ...(texts.length ? { texts } : {}), ...(pedals.length ? { pedals } : {}), ...(ottava.length ? { ottava } : {}), ...(trills.length ? { trills } : {}), ...(Object.keys(clefChg).length ? { clefChg } : {}), ...(Object.keys(mrep).length ? { mrep } : {}) });
    }
    let out = tracks.filter((t) => t.type !== 'melody' || t.notes.length || tracks.length <= 2);
    if (!out.length) out = tracks.slice(0, 1);
    const room = hasHarm ? MAX_TRACKS - 1 : MAX_TRACKS;
    out = out.slice(0, room);
    if (hasHarm) out.push({ type: 'chord', name: 'コード伴奏', inst: 'piano', pattern: 'whole', bassOn: true, chords });
    const k0 = key0 || { key: 0, minor: false };
    return {
      v: 2, title: title.slice(0, 60), bpm: clamp(bpm || 100, 30, 240), meter: meters[0] || [4, 4], bars: nBars, key: k0.key, scale: k0.minor ? 'minor' : 'major',
      tempos, meters: Object.fromEntries(Object.entries(meters).filter(([b]) => +b > 0)), keys: Object.fromEntries(Object.entries(keys).map(([b, k]) => [b, k])),
      pickup: pickupDiv ? Math.round(T(pickupDiv)) : 0, jumps,
      repeats: { start: rStart, end: rEnd, volta }, tempoText, ...(Object.keys(rehearsal).length ? { rehearsal } : {}),
      score: { ...credit, ...(out.filter((t) => t.type === 'melody').length >= 6 ? { orch: true, ordered: true } : {}) },
      tracks: out,
    };
  }

  async function readFile(arrayBuffer, fileName) {
    const bytes = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
    const isZip = /\.(mxl|mscz)$/i.test(fileName || '') || (bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4);
    if (isZip) {
      // MuseScore（.mscz）：zip の中の .mscx を読む
      const ents = zipEntries(bytes);
      const ms = ents.find((e) => /\.mscx$/i.test(e.name) && !/\//.test(e.name)) || ents.find((e) => /\.mscx$/i.test(e.name) && !/^META-INF|excerpt/i.test(e.name));
      if (ms) return parseMscx(decodeText(await zipRead(bytes, ms)), fileName);
      return readMxl(bytes, fileName);
    }
    const text = decodeText(bytes);
    if (/\.mscx$/i.test(fileName || '') || /<museScore\b/.test(text.slice(0, 500))) return parseMscx(text, fileName);
    return parse(text, fileName);
  }

  return { parse, parseMscx, readFile };
})();
