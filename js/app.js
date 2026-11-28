'use strict';
/* ============================================================
   ソラノート — アプリ本体
   時間の単位：4分音符 = 48 ティック（3連符や32分音符も表せます）
   ============================================================ */
const $ = (s) => document.querySelector(s);
// 楽譜の明朝体は、楽譜を出すときにはじめて読みこむ（はじめの画面を軽くする）
let serifLinked = false;
function loadSerif() {
  if (serifLinked) return;
  serifLinked = true;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = 'fonts/serif.css';
  document.head.appendChild(l);
}
if (typeof Notation !== 'undefined') { const render0 = Notation.render; Notation.render = (o) => { loadSerif(); return render0(o); }; }
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = () => Math.random().toString(36).slice(2, 9);
const TPQ = 48;
const I = (n) => `<svg class="i"><use href="#i-${n}"/></svg>`;
const TYPE_ICON = { melody: 'note', chord: 'piano', drum: 'drum' };
const PIC = (kind, id) => (typeof InstIcons !== 'undefined' && InstIcons[kind] ? `<span class="pic">${InstIcons[kind](id)}</span>` : '');

/* ---------- 音楽の基本データ ---------- */
const PC_COLORS = ['#f25f63', '#f5804f', '#f79e3e', '#f6b93b', '#ecd23f', '#97cc55', '#4cc38a', '#36b3a6', '#4f9cf0', '#6d7ff2', '#9a73ef', '#d76ac9'];
const NAMES = {
  doremi: [['ド', 'ド♯', 'レ', 'レ♯', 'ミ', 'ファ', 'ファ♯', 'ソ', 'ソ♯', 'ラ', 'ラ♯', 'シ'], ['ド', 'レ♭', 'レ', 'ミ♭', 'ミ', 'ファ', 'ソ♭', 'ソ', 'ラ♭', 'ラ', 'シ♭', 'シ']],
  cde: [['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'], ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']],
  haniho: [['ハ', '嬰ハ', 'ニ', '嬰ニ', 'ホ', 'ヘ', '嬰ヘ', 'ト', '嬰ト', 'イ', '嬰イ', 'ロ'], ['ハ', '変ニ', 'ニ', '変ホ', 'ホ', 'ヘ', '変ト', 'ト', '変イ', 'イ', '変ロ', 'ロ']],
};
const KEY_LABELS = ['C（ハ）', 'C♯/D♭（嬰ハ/変ニ）', 'D（ニ）', 'E♭（変ホ）', 'E（ホ）', 'F（ヘ）', 'F♯（嬰ヘ）', 'G（ト）', 'A♭（変イ）', 'A（イ）', 'B♭（変ロ）', 'B（ロ）'];
const CHORD_ROOT = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const SCALES = {
  major: { name: '長調（長音階）', steps: [0, 2, 4, 5, 7, 9, 11] },
  minor: { name: '短調（短音階）', steps: [0, 2, 3, 5, 7, 8, 10] },
  hminor: { name: '和声的短音階', steps: [0, 2, 3, 5, 7, 8, 11] },
  penta: { name: 'ヨナ抜き音階', steps: [0, 2, 4, 7, 9] },
  minyo: { name: '民謡音階', steps: [0, 3, 5, 7, 10] },
  miyako: { name: '都節音階', steps: [0, 1, 5, 7, 8] },
  ritsu: { name: '律音階', steps: [0, 2, 5, 7, 9] },
  ryukyu: { name: '沖縄（琉球）音階', steps: [0, 4, 5, 7, 11] },
  blues: { name: 'ブルース音階', steps: [0, 3, 5, 6, 7, 10] },
  whole: { name: '全音音階', steps: [0, 2, 4, 6, 8, 10] },
  chromatic: { name: 'すべての音（半音もぜんぶ）', steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
};
const MINORISH = ['minor', 'hminor', 'minyo', 'miyako', 'blues'];
const CHORD_Q = {
  M: { iv: [0, 4, 7], s: '' }, m: { iv: [0, 3, 7], s: 'm' }, 7: { iv: [0, 4, 7, 10], s: '7' },
  M7: { iv: [0, 4, 7, 11], s: 'M7' }, m7: { iv: [0, 3, 7, 10], s: 'm7' }, sus4: { iv: [0, 5, 7], s: 'sus4' },
  dim: { iv: [0, 3, 6], s: 'dim' }, aug: { iv: [0, 4, 8], s: 'aug' },
  // おしゃれなコード・ジャズのコード
  6: { iv: [0, 4, 7, 9], s: '6' }, m6: { iv: [0, 3, 7, 9], s: 'm6' }, add9: { iv: [0, 4, 7, 14], s: 'add9' },
  9: { iv: [0, 4, 7, 10, 14], s: '9' }, M9: { iv: [0, 4, 7, 11, 14], s: 'M9' }, m9: { iv: [0, 3, 7, 10, 14], s: 'm9' },
  '7sus4': { iv: [0, 5, 7, 10], s: '7sus4' }, m7b5: { iv: [0, 3, 6, 10], s: 'm7(♭5)' }, dim7: { iv: [0, 3, 6, 9], s: 'dim7' },
  mM7: { iv: [0, 3, 7, 11], s: 'mM7' }, '7b9': { iv: [0, 4, 7, 10, 13], s: '7(♭9)' }, '7s9': { iv: [0, 4, 7, 10, 15], s: '7(♯9)' },
};
const CHORD_PATTERNS = {
  whole: 'じゃーん（のばす）', beat: 'ジャン・ジャン（拍ごと）', arp: 'ポロロン（分散和音）',
  waltz: 'ズン・チャッ・チャッ（ワルツ風）', march: 'ズン・チャッ（マーチ風）', alberti: 'ドソミソ（アルベルティ）',
  pop8: 'タタタタ（ポップス・8分きざみ）', strum: 'ジャカジャカ（ギターのストローク）', bossa: 'ボサノバ風', ballad: 'バラード（ゆったり分散）',
};
const RANGES = {
  high: ['高い音（ド5〜ド8）', 72, 108], soprano: ['ソプラノ（ソ3〜ミ6）', 55, 88], alto: ['アルト（ド3〜ラ5）', 48, 81],
  tenor: ['テノール（ファ2〜ド5）', 41, 72], bass: ['ベース（ミ1〜ド4）', 28, 60], wide: ['広い（ド2〜ド7）', 36, 96], all: ['ピアノ全部（88鍵）', 21, 108],
};
const SOLFA_OCT = (m) => NAMES.doremi[0][m % 12] + (Math.floor(m / 12) - 1);
// トラックの音域（プリセット＋広げた分）
function trackRange(tr) {
  const [, lo, hi] = RANGES[tr.range] || RANGES.soprano;
  return [tr.lo != null ? tr.lo : lo, tr.hi != null ? tr.hi : hi];
}
const GRIDS = [[192, '全音符', '𝅝'], [96, '2分音符', '𝅗𝅥'], [48, '4分音符', '♩'], [24, '8分音符', '♪'], [12, '16分音符', '𝅘𝅥𝅯'], [6, '32分音符', '𝅘𝅥𝅰'], [16, '8分3連符', '♪³'], [8, '16分3連符', '𝅘𝅥𝅯³']];
const TRACK_COLORS = ['#e5484d', '#3e63dd', '#30a46c', '#f5a524', '#8e4ec6', '#f76b15', '#12a594', '#d6409f'];
const MAX_TRACKS = 48; // オーケストラのフルスコアも書けるように
const MAX_BARS = 1000; // 長い交響曲も入るように
/* ---------- オーケストラ・吹奏楽の楽譜のきまり ----------
   仲間（ww 木管・br 金管・perc 打楽器・kb 鍵盤とハープ・vo 声・str 弦）、ならぶ順、短い名前、移調、音部記号 */
const ORCH = {
  piccolo: ['ww', 'Picc.', -12], flute: ['ww', 'Fl.'], recorder: ['ww', 'Rec.'], oboe: ['ww', 'Ob.'], clarinet: ['ww', 'Cl.', 2], bassoon: ['ww', 'Fg.', 0, 'bass'], sax: ['ww', 'A.Sax.', 9],
  horn: ['br', 'Hr.', 7], trumpet: ['br', 'Tp.', 2], trombone: ['br', 'Tb.', 0, 'bass'], tuba: ['br', 'Tuba', 0, 'bass'], brassens: ['br', 'Br.'],
  timpani: ['perc', 'Timp.', 0, 'bass'], xylophone: ['perc', 'Xyl.', -12], glocken: ['perc', 'Glk.', -24], marimba: ['perc', 'Mar.', 0, 'grand'], vibraphone: ['perc', 'Vib.'], tubularbell: ['perc', 'T.Bells'],
  harp: ['kb', 'Hp.', 0, 'grand'], celesta: ['kb', 'Cel.', -12, 'grand'], piano: ['kb', 'Pf.', 0, 'grand'], harpsichord: ['kb', 'Cemb.', 0, 'grand'], organ: ['kb', 'Org.', 0, 'grand'], pipeorgan: ['kb', 'Org.', 0, 'grand'],
  choir: ['vo', 'Cho.'],
  violin: ['str', 'Vn.'], viola: ['str', 'Va.', 0, 'alto'], cello: ['str', 'Vc.', 0, 'bass'], contrabass: ['str', 'Cb.', 12, 'bass'], strings: ['str', 'Str.'], pizz: ['str', 'Pizz.'],
};
// 楽器の音域（鳴る音）：[プロの下, プロの上, ふつうの下, ふつうの上]。外の音は楽譜で赤（出せない）・オレンジ（むずかしい）
const INST_RANGE = {
  piccolo: [74, 108, 74, 103], flute: [60, 98, 60, 93], oboe: [58, 91, 58, 87], clarinet: [50, 94, 50, 89], bassoon: [34, 75, 34, 72], sax: [49, 81, 49, 77],
  horn: [34, 77, 41, 72], trumpet: [52, 84, 54, 79], trombone: [40, 77, 40, 72], tuba: [26, 65, 28, 58], timpani: [38, 60, 41, 55],
  violin: [55, 103, 55, 93], viola: [48, 91, 48, 81], cello: [36, 84, 36, 74], contrabass: [28, 67, 28, 60], harp: [23, 104, 23, 104],
  xylophone: [65, 108, 65, 108], glocken: [79, 108, 79, 108], marimba: [45, 96, 45, 96], vibraphone: [53, 89, 53, 89], celesta: [60, 108, 60, 108], tubularbell: [60, 77, 60, 77],
};
// TAB譜を書ける楽器と、その弦
const TAB_INST = { guitar: 'guitar', steelguitar: 'guitar', eguitar: 'guitar', rockguitar: 'guitar', ukulele: 'ukulele', ebass: 'bass', acbass: 'bass', sbass1: 'bass', sbass2: 'bass', sbass3: 'bass' };
const ORCH_ORDER = ['ww', 'br', 'perc', 'kb', 'vo', 'str'];
const ORCH_INST = ['piccolo', 'flute', 'recorder', 'oboe', 'clarinet', 'bassoon', 'sax', 'horn', 'trumpet', 'trombone', 'tuba', 'brassens', 'timpani', 'xylophone', 'glocken', 'marimba', 'vibraphone', 'tubularbell', 'harp', 'celesta', 'piano', 'harpsichord', 'organ', 'pipeorgan', 'choir', 'violin', 'viola', 'cello', 'contrabass', 'strings', 'pizz'];

/* ---------- 曲データ ---------- */
function newTrack(type, opts = {}) {
  const base = { id: uid(), type, vol: 0.8, mute: false, solo: false, locked: false, real: true };
  if (type === 'melody') return { ...base, name: 'メロディ', inst: 'recorder', range: 'soprano', notes: [], dyn: [], hairpins: [], slurs: [], ...opts };
  if (type === 'chord') return { ...base, name: 'コード伴奏', inst: 'piano', vol: 0.55, pattern: 'beat', bassOn: true, chords: [], ...opts };
  return { ...base, name: 'リズム', kit: 'drums', grid: {}, ...opts };
}
function newSong() {
  return {
    v: 2, title: 'あたらしい曲', bpm: 100, meter: [4, 4], bars: 8, key: 0, scale: 'major',
    swing: 0, swingUnit: 24, reverb: 0.25, master: 0.9, eq: { low: 0, mid: 0, high: 0 },
    metro: { vol: 0.7, kind: 'click' }, tempos: {}, meters: {}, keys: {}, jumps: {}, pickup: 0, tempoText: '', repeats: { start: [], end: [], volta: {} },
    locks: { pin: '', rules: false, tracks: false, compose: false, mute: false },
    tracks: [
      newTrack('melody', { name: 'メロディ1', inst: 'recorder' }),
      newTrack('melody', { name: 'メロディ2', inst: 'kenhamo', range: 'alto' }),
      newTrack('chord'),
      newTrack('drum'),
    ],
  };
}
function sampleSong() {
  const s = newSong();
  s.title = 'サンプル「はじめの一歩」';
  const E = 24;
  const mel = [[64, 2], [67, 2], [69, 2], [67, 2], [64, 2], [62, 1], [64, 1], [60, 4], [62, 2], [64, 2], [67, 2], [64, 2], [62, 6], [0, 2],
    [64, 2], [67, 2], [69, 2], [72, 2], [74, 2], [72, 2], [69, 4], [67, 3], [64, 1], [62, 2], [64, 2], [60, 8]];
  let st = 0;
  for (const [p, l] of mel) { if (p) s.tracks[0].notes.push({ s: st * E, p, l: l * E }); st += l; }
  const low = [[55, 8], [57, 8], [59, 8], [55, 8], [57, 8], [60, 8], [59, 8], [55, 8]];
  st = 0;
  for (const [p, l] of low) { s.tracks[1].notes.push({ s: st * E, p, l: l * E }); st += l; }
  s.tracks[1].vol = 0.45;
  s.tracks[2].chords = [{ r: 0, q: 'M' }, { r: 9, q: 'm' }, { r: 7, q: 'M' }, { r: 7, q: '7' }, { r: 9, q: 'm' }, { r: 5, q: 'M' }, { r: 7, q: 'M' }, { r: 0, q: 'M' }];
  const g = s.tracks[3].grid;
  g.kick = {}; g.snare = {}; g.hihat = {};
  for (let b = 0; b < 8; b++) {
    const o = b * 192;
    g.kick[o] = 2; g.kick[o + 96] = 1; g.snare[o + 48] = 1; g.snare[o + 144] = 1;
    for (let i = 0; i < 8; i++) g.hihat[o + i * 24] = i % 2 ? 1 : 2;
  }
  g.crash = { 0: 2, 1344: 2 };
  s.tempos = { 7: 88 };
  return s;
}
// みんなが知っている曲（作者がわからない・著作権の切れた童謡）
function demoSong(id) {
  const s = newSong();
  const Q = 48;
  const put = (tr, list) => { let st = 0; for (const [p, l] of list) { if (p) tr.notes.push({ s: st * Q, p, l: l * Q }); st += l; } return st; };
  const C = (r, q = 'M') => ({ r, q });
  s.tracks = s.tracks.filter((t) => t.type !== 'melody' || t === s.tracks[0]);
  const mel = s.tracks[0];
  const chord = s.tracks.find((t) => t.type === 'chord');
  const drum = s.tracks.find((t) => t.type === 'drum');
  if (id === 'twinkle') {
    s.title = 'きらきら星';
    s.bpm = 96;
    mel.inst = 'glocken';
    const a = [[60, 1], [60, 1], [67, 1], [67, 1], [69, 1], [69, 1], [67, 2], [65, 1], [65, 1], [64, 1], [64, 1], [62, 1], [62, 1], [60, 2]];
    const b = [[67, 1], [67, 1], [65, 1], [65, 1], [64, 1], [64, 1], [62, 2]];
    const len = put(mel, [...a, ...b, ...b, ...a]);
    s.bars = Math.ceil(len / 4);
    const A = [C(0), { ...C(5), h: C(0) }, { ...C(5), h: C(0) }, { ...C(7, '7'), h: C(0) }];
    const B = [{ ...C(0), h: C(5) }, { ...C(0), h: C(7) }];
    chord.chords = [...A, ...B, ...B, ...A];
    chord.pattern = 'arp';
  } else {
    s.title = 'かえるの合唱';
    s.bpm = 104;
    mel.inst = 'recorder';
    const list = [[60, 1], [62, 1], [64, 1], [65, 1], [64, 1], [62, 1], [60, 2], [64, 1], [65, 1], [67, 1], [69, 1], [67, 1], [65, 1], [64, 2],
      [60, 2], [60, 2], [60, 2], [60, 2], [60, 0.5], [60, 0.5], [62, 0.5], [62, 0.5], [64, 0.5], [64, 0.5], [65, 0.5], [65, 0.5], [64, 1], [62, 1], [60, 2]];
    const len = put(mel, list);
    s.bars = Math.ceil(len / 4);
    chord.chords = [C(0), C(0), C(0), C(0), C(0), C(0), C(0), { r: 7, q: '7', h: C(0) }];
    chord.pattern = 'march';
  }
  // かるいリズム
  drum.grid = { kick: {}, hihat: {} };
  for (let b = 0; b < s.bars; b++) { const o = b * 192; drum.grid.kick[o] = 2; drum.grid.kick[o + 96] = 1; for (let i = 0; i < 4; i++) drum.grid.hihat[o + i * 48] = 1; }
  drum.vol = 0.5;
  return s;
}
// 古い形式（v1：マス目単位）の曲を新しい形式に変換
function migrate(s) {
  if (s.v >= 2) return s;
  const f = 192 / (s.res || 8);
  for (const t of s.tracks) {
    if (t.type === 'melody') t.notes = (t.notes || []).map((n) => ({ s: n.s * f, p: n.p, l: n.l * f }));
    if (t.type === 'drum') {
      const ng = {};
      const rename = { cymbal: 'crash', tom: 'tomL', taiko: 'chodaiko', clave: 'hyoshigi' };
      for (const id in t.grid) { const nid = rename[id] || id; ng[nid] = {}; for (const st in t.grid[id]) ng[nid][st * f] = t.grid[id][st]; }
      t.grid = ng;
      t.kit = 'drums';
    }
    if (t.inst === 'brass') t.inst = 'trumpet';
    if (t.inst === 'synth') t.inst = 'synth2';
    if (t.inst === 'bass') t.inst = 'ebass';
  }
  s.v = 2;
  delete s.res;
  return s;
}

// 曲のデータをととのえる（ファイル・共有URLがこわれていても、アプリが止まらないように）
function sanitizeSong(s) {
  if (!s || typeof s !== 'object' || !Array.isArray(s.tracks)) throw new Error('曲データの形式がちがいます');
  const num = (v, d, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? clamp(n, lo, hi) : d; };
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const out = { ...s };
  out.bars = Math.round(num(s.bars, 8, 1, MAX_BARS));
  out.bpm = num(s.bpm, 100, 20, 300);
  out.key = Math.round(num(s.key, 0, -12, 12));
  out.meter = Array.isArray(s.meter) && s.meter.length === 2 && s.meter.every((x) => Number.isInteger(x) && x > 0 && x <= 32) ? s.meter : [4, 4];
  for (const k of ['tempos', 'meters', 'keys', 'jumps', 'eq', 'metro', 'locks']) out[k] = obj(s[k]);
  for (const b in out.tempos) { const v = +out.tempos[b]; if (!Number.isFinite(v) || v <= 0) delete out.tempos[b]; else out.tempos[b] = clamp(v, 20, 300); }
  out.ramps = obj(s.ramps);
  for (const b in out.ramps) { const r = out.ramps[b]; if (!(r && (r.type === 'rit' || r.type === 'acc') && Number.isInteger(r.n) && r.n > 0 && r.n <= 16)) delete out.ramps[b]; }
  for (const b in out.meters) { const m = out.meters[b]; if (!(Array.isArray(m) && m.length === 2 && m.every((x) => Number.isInteger(x) && x > 0 && x <= 32))) delete out.meters[b]; }
  if (!SCALES[out.scale]) out.scale = 'major';
  if (out.cp && !(typeof out.cp === 'object' && [1, 2, 3, 4].includes(out.cp.species) && typeof out.cp.cfId === 'string' && typeof out.cp.cpId === 'string')) delete out.cp;
  out.master = num(s.master, 0.9, 0, 1.5);
  out.reverb = num(s.reverb, 0.25, 0, 1);
  out.swing = num(s.swing, 0, 0, 1);
  if (s.swingUnit != null && ![12, 24].includes(s.swingUnit)) out.swingUnit = 24;
  for (const k of ['low', 'mid', 'high']) if (k in out.eq) out.eq[k] = num(out.eq[k], 0, -24, 24);
  if ('vol' in out.metro) out.metro.vol = num(out.metro.vol, 0.7, 0, 1.5);
  for (const b in out.keys) { const k = out.keys[b]; if (!(k && Number.isInteger(k.key) && k.key >= 0 && k.key < 12)) delete out.keys[b]; else out.keys[b] = { key: k.key, minor: !!k.minor }; }
  {
    const R = obj(s.repeats);
    const ints = (a) => (Array.isArray(a) ? a.filter((x) => Number.isInteger(x) && x >= 0 && x < MAX_BARS) : []);
    out.repeats = { start: ints(R.start), end: ints(R.end), volta: obj(R.volta) };
  }
  out.pickup = Math.max(0, Math.round(num(s.pickup, 0, 0, 192 * 4)));
  // 穴あき課題：{ tr: トラックの番号, bars: 空けた小節, ans: 答え（音のリスト） }
  if (s.task != null) {
    const T = s.task;
    const ok = T && typeof T === 'object' && Number.isInteger(T.tr) && T.tr >= 0 && Array.isArray(T.bars) && T.bars.length && T.bars.length <= MAX_BARS && T.bars.every((b) => Number.isInteger(b) && b >= 0 && b < MAX_BARS) && typeof T.ans === 'string' && T.ans.length < 400000;
    if (ok) out.task = { tr: T.tr, bars: [...new Set(T.bars)].sort((a, z) => a - z), ans: T.ans }; else delete out.task;
  }
  out.rehearsal = {};
  for (const b in obj(s.rehearsal)) { const v = String(s.rehearsal[b] == null ? '' : s.rehearsal[b]).trim().slice(0, 8); if (Number.isInteger(+b) && +b >= 0 && +b < MAX_BARS && v) out.rehearsal[b] = v; }
  if (!Object.keys(out.rehearsal).length) delete out.rehearsal;
  // 楽譜に書かないテンポ（読みこんだ曲の、再生だけのテンポ）と、とちゅうの速さのことば（Andante など）
  out.tempoHid = {};
  for (const b in obj(s.tempoHid)) if (Number.isInteger(+b) && +b > 0 && +b < MAX_BARS && s.tempoHid[b] && out.tempos[b]) out.tempoHid[b] = 1;
  if (!Object.keys(out.tempoHid).length) delete out.tempoHid;
  out.tempoWords = {};
  for (const b in obj(s.tempoWords)) { const v = String(s.tempoWords[b] == null ? '' : s.tempoWords[b]).trim().slice(0, 40); if (Number.isInteger(+b) && +b > 0 && +b < MAX_BARS && v) out.tempoWords[b] = v; }
  if (!Object.keys(out.tempoWords).length) delete out.tempoWords;
  // 楽譜のコメント（小節ごとのメモ）
  if (s.comments != null) {
    out.comments = (Array.isArray(s.comments) ? s.comments : []).filter((c) => c && Number.isInteger(c.b) && c.b >= 0 && c.b < MAX_BARS && typeof c.x === 'string' && c.x.trim()).slice(0, 500).map((c) => ({ b: c.b, x: c.x.slice(0, 300), ...(typeof c.who === 'string' && c.who ? { who: c.who.slice(0, 20) } : {}), ...(Number.isFinite(c.at) ? { at: c.at } : {}) }));
    if (!out.comments.length) delete out.comments;
  }
  // 版のなかま（版の保存と見くらべ）・演奏の表情
  if (s.vid != null && !(typeof s.vid === 'string' && /^[a-z0-9]{1,40}$/i.test(s.vid))) delete out.vid;
  if (s.feel != null) { const f = Math.round(Number(s.feel)); if (f === 1 || f === 2) out.feel = f; else delete out.feel; }
  out.title = String(s.title == null ? 'あたらしい曲' : s.title).slice(0, 60);
  const T = s.v >= 2 ? 1 : 0; // migrate のあと
  out.tracks = s.tracks.filter((t) => t && typeof t === 'object' && ['melody', 'drum', 'chord'].includes(t.type)).map((t) => {
    const tr = { ...t };
    if (t.type === 'melody') {
      tr.notes = (Array.isArray(t.notes) ? t.notes : []).filter((n) => n && Number.isFinite(+n.s) && Number.isFinite(+n.p) && Number.isFinite(+n.l) && +n.l > 0 && +n.s >= 0)
        .map((n) => {
          const o = { ...n, s: Math.round(+n.s), p: clamp(Math.round(+n.p), 0, 127), l: Math.max(1, Math.round(+n.l)) };
          if (n.vel != null) { const v = Number(n.vel); if (Number.isFinite(v) && v !== 1) o.vel = clamp(v, 0.1, 1.5); else delete o.vel; }
          if (o.art != null) { o.art = Array.isArray(o.art) ? [...new Set(o.art.filter((a) => ART_IDS.has(a)))] : []; if (!o.art.length) delete o.art; }
          if (o.fg != null) { o.fg = String(o.fg).replace(/[^0-5]/g, '').slice(0, 5); if (!o.fg) delete o.fg; }
          if (o.enh != null && o.enh !== 1 && o.enh !== -1) delete o.enh;
          if (o.sd != null && o.sd !== 1 && o.sd !== -1) delete o.sd;
          if (o.col != null && !Notation.NOTE_COLS[o.col]) delete o.col;
          if (o.sm != null && o.sm !== true) delete o.sm;
          for (const k of ['ly2', 'ly3']) if (o[k] != null) { o[k] = String(o[k]).slice(0, 20); if (!o[k]) delete o[k]; }
          if (o.gr != null) {
            const gs = (Array.isArray(o.gr) ? o.gr : [o.gr]).map((x) => Math.round(+x)).filter((g) => Number.isFinite(g) && g >= 21 && g <= 108).slice(0, 8);
            if (!gs.length) delete o.gr; else o.gr = gs.length === 1 ? gs[0] : gs;
          }
          if (o.grl != null && !(o.grl === true && o.gr != null)) delete o.grl;
          if (o.tra != null && ![1, -1, 0].includes(o.tra)) delete o.tra;
          if (o.trs != null && ![1, 2, 3].includes(o.trs)) delete o.trs;
          if (o.nh != null && !['diamond', 'x'].includes(o.nh)) delete o.nh;
          if (o.str != null && !(Number.isInteger(o.str) && o.str >= 0 && o.str < 8)) delete o.str; // TAB譜で弾く弦（0＝いちばん低い弦）
          return o;
        });
      tr.texts = (Array.isArray(t.texts) ? t.texts : []).filter((x) => x && Number.isFinite(+x.t) && +x.t >= 0 && typeof x.x === 'string' && x.x.trim()).map((x) => ({ t: Math.round(+x.t), x: x.x.slice(0, 80) }));
      if (!tr.texts.length) delete tr.texts;
      // 楽器の持ちかえ（とちゅうから、ちがう楽器の音で鳴らす）
      tr.instChg = (Array.isArray(t.instChg) ? t.instChg : []).filter((x) => x && Number.isFinite(+x.t) && +x.t >= 0 && typeof x.inst === 'string' && Sound.INSTRUMENTS[x.inst]).map((x) => ({ t: Math.round(+x.t), inst: x.inst, ...(x.q ? { q: 1 } : {}) })).sort((a, b) => a.t - b.t);
      if (!tr.instChg.length) delete tr.instChg;
      for (const k of ['dyn', 'hairpins', 'slurs', 'pedals']) tr[k] = (Array.isArray(tr[k]) ? tr[k] : []).filter((x) => x && typeof x === 'object' && (k === 'dyn' ? Number.isFinite(+x.t) && typeof x.v === 'string' : Number.isFinite(+x.s) && Number.isFinite(+x.e)));
      if (!tr.pedals.length) delete tr.pedals;
      // 読みこんだ楽譜で、声部がとちゅうで終わっている所（そこには休符を書かない）
      tr.vgap = (Array.isArray(t.vgap) ? t.vgap : []).filter((x) => x && Number.isFinite(+x.s) && Number.isFinite(+x.e) && +x.e > +x.s).slice(0, 4000).map((x) => ({ s: Math.round(+x.s), e: Math.round(+x.e), v: x.v === 2 ? 2 : 1 }));
      if (!tr.vgap.length) delete tr.vgap;
      tr.trills = (Array.isArray(t.trills) ? t.trills : []).filter((x) => x && Number.isFinite(+x.s) && Number.isFinite(+x.e) && +x.e > +x.s).map((x) => ({ s: Math.round(+x.s), e: Math.round(+x.e), ...([1, -1, 0].includes(x.a) ? { a: x.a } : {}) }));
      if (!tr.trills.length) delete tr.trills;
      tr.ottava = (Array.isArray(t.ottava) ? t.ottava : []).filter((x) => x && Number.isFinite(+x.s) && Number.isFinite(+x.e) && +x.e > +x.s && [1, -1, 2, -2].includes(x.k)).map((x) => ({ s: Math.round(+x.s), e: Math.round(+x.e), k: x.k }));
      if (!tr.ottava.length) delete tr.ottava;
      if (t.mrep && typeof t.mrep === 'object') { tr.mrep = {}; for (const b in t.mrep) if (Number.isInteger(+b) && +b > 0 && +b < MAX_BARS && t.mrep[b]) tr.mrep[b] = 1; if (!Object.keys(tr.mrep).length) delete tr.mrep; }
      if (!['treble', 'bass', 'alto', 'treble8'].includes(tr.clef)) delete tr.clef;
      if (!(Number.isInteger(tr.trans) && Math.abs(tr.trans) <= 36)) delete tr.trans;
      if (t.clefChg && typeof t.clefChg === 'object') { tr.clefChg = {}; for (const b in t.clefChg) if (Number.isInteger(+b) && +b > 0 && +b < MAX_BARS && ['treble', 'bass', 'alto', 'treble8'].includes(t.clefChg[b])) tr.clefChg[b] = t.clefChg[b]; if (!Object.keys(tr.clefChg).length) delete tr.clefChg; }
    } else if (t.type === 'drum') {
      const g = {};
      for (const id in obj(t.grid)) {
        const row = obj(t.grid[id]);
        for (const st in row) if (Number.isFinite(+st) && +st >= 0 && (row[st] === 1 || row[st] === 2)) { if (!g[id]) g[id] = {}; g[id][st] = row[st]; }
      }
      tr.grid = g;
    } else {
      const okC = (c) => c && Number.isInteger(c.r) && c.r >= 0 && c.r < 12 && CHORD_Q[c.q];
      tr.chords = (Array.isArray(t.chords) ? t.chords : []).map((c) => {
        if (!okC(c)) return null;
        const o = { r: c.r, q: c.q };
        if (Array.isArray(c.x)) { const x = c.x.filter((y) => okC(y) && Number.isFinite(+y.o) && y.o > 0).map((y) => ({ o: Math.round(+y.o), r: y.r, q: y.q })).slice(0, 16); if (x.length) o.x = x; }
        else if (okC(c.h)) o.h = { r: c.h.r, q: c.h.q };
        return o;
      });
    }
    tr.vol = num(t.vol, 0.8, 0, 1.5);
    tr.pan = num(t.pan, 0, -1, 1);
    if (t.name != null) tr.name = String(t.name).slice(0, 40);
    if (typeof t.short === 'string' && t.short.trim()) tr.short = t.short.trim().slice(0, 12); // 楽譜の2段目からの短い名前（Vln. 1 など）
    // 自分で決めた音域 [出せる下, 出せる上, ふつうの下, ふつうの上]（鳴る音）。0＝音域の色分けをしない
    if (t.rng === 0) tr.rng = 0;
    else if (Array.isArray(t.rng) && t.rng.length === 4 && t.rng.every((v) => Number.isInteger(v) && v >= 0 && v <= 127) && t.rng[0] <= t.rng[2] && t.rng[2] <= t.rng[3] && t.rng[3] <= t.rng[1]) tr.rng = t.rng.slice();
    return tr;
  });
  if (s.voice && !(typeof s.voice.data === 'string' && Number.isFinite(+s.voice.sr) && +s.voice.sr >= 8000 && +s.voice.sr <= 96000 && s.voice.data.length < 400000)) delete out.voice;
  if (!out.tracks.length) throw new Error('読みこめるトラックがありません');
  void T;
  return out;
}

/* ---------- 状態 ---------- */
let song = newSong();
let cur = 0;
const ui = {
  zoom: 56, rh: 22, names: 'doremi', flat: false, grid: 24, startTick: 0, loopOn: false, metro: false,
  loopRange: null, sel: { t: 0, b0: 0, b1: 0 }, selBar: 0, follow: true, ghost: true, touchEdit: true, touchMode: 'smart', dragMode: 'auto',
  stepRec: false, inputTick: 0, kbOct: 4, showScore: false, view: 'grid', chromatic: false, keyMove: true,
  sc: { cursor: 0, sel: new Set(), dur: 48, dot: false, trip: false, input: true, clip: null, lastIns: null, zoom: 1 },
};
let version = 0;
const undoStack = []; // {snap, label}
const redoStack = [];

const beatOfMeter = (m) => (m[1] === 8 && m[0] % 3 === 0 && m[0] > 3 ? 72 : 192 / m[1]);
// 小節の表：小節ごとの「始まり」「拍子」「調」。曲の途中で拍子や調を変えられます
let geoCache = { key: '' };
let geoHold = null; // 重い計算のあいだは、小節の表を作りなおさない（曲は変わらないので）
function holdGeo(fn) {
  if (geoHold) return fn();
  geoHold = geo();
  try { return fn(); } finally { geoHold = null; }
}
function geo() {
  if (geoHold) return geoHold;
  const key = song.bars + '|' + song.meter + '|' + JSON.stringify(song.meters || {}) + '|' + song.key + song.scale + JSON.stringify(song.keys || {});
  if (geoCache.key === key) return geoCache;
  const starts = [0];
  const meters = [];
  const keys = [];
  let m = song.meter;
  let k = { key: song.key, minor: MINORISH.includes(song.scale) };
  for (let b = 0; b < song.bars; b++) {
    if (song.meters && song.meters[b]) m = song.meters[b];
    if (song.keys && song.keys[b]) k = song.keys[b];
    meters.push(m);
    keys.push(k);
    starts.push(starts[b] + (m[0] * 192) / m[1]);
  }
  geoCache = { key, starts, meters, keys };
  return geoCache;
}
const barStart = (b) => geo().starts[clamp(b, 0, song.bars)];
const barLen = (b) => { const g = geo(); const i = clamp(b, 0, song.bars - 1); return g.starts[i + 1] - g.starts[i]; };
const meterAt = (b) => geo().meters[clamp(b, 0, song.bars - 1)];
const keyAt = (b) => geo().keys[clamp(b, 0, song.bars - 1)];
const beatAt = (b) => beatOfMeter(meterAt(b));
function barOf(t) {
  const st = geo().starts;
  let lo = 0;
  let hi = song.bars - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (st[mid] <= t) lo = mid; else hi = mid - 1; }
  return lo;
}
const barTicks = () => barLen(0);
const totalTicks = () => barStart(song.bars);
const beatTicks = () => beatAt(0);
const hasGeoChanges = () => Object.keys(song.meters || {}).length > 0 || Object.keys(song.keys || {}).length > 0;
const track = () => song.tracks[cur];
const scalePcs = () => {
  const set = new Set(SCALES[song.scale].steps.map((x) => (x + song.key) % 12));
  // 曲のとちゅうで調が変わるときは、その調の音も行に出す
  for (const b in song.keys || {}) { const k = song.keys[b]; for (const x of SCALES[k.minor ? 'minor' : 'major'].steps) set.add((x + k.key) % 12); }
  return set;
};
const MIN_CELL = 6; // 1マスの最小のはば（px）
const ppt = () => Math.max(ui.zoom / TPQ, MIN_CELL / ui.grid);
const isMinor = () => MINORISH.includes(song.scale);
const locked = (tr) => !!(tr && tr.locked);

function noteName(m, withOct = false) {
  const pc = ((m % 12) + 12) % 12;
  const fl = ui.flat ? 1 : 0;
  const n = ui.names === 'movable' ? NAMES.doremi[fl][(pc - song.key + 12) % 12] : NAMES[ui.names][fl][pc];
  return withOct ? n + (Math.floor(m / 12) - 1) : n;
}
const sciName = (m) => NAMES.cde[ui.flat ? 1 : 0][m % 12] + (Math.floor(m / 12) - 1);
function chordName(c) { return c ? CHORD_ROOT[c.r] + CHORD_Q[c.q].s : ''; }
// 1小節にいくつものコード：c.x ＝ [{ o: 小節の頭からの位置, r, q }]（古い形 c.h ＝ 後半のコードも読む）
function chordLabel(c) { return c ? [c, ...(Array.isArray(c.x) ? [...c.x].sort((a, z) => a.o - z.o) : c.h ? [c.h] : [])].map(chordName).join('・') : ''; }
// 後半がはじまる位置（小節の頭から。拍の区切りで、まん中あたり）
function chordHalf(b) { const bs = beatAt(b); const n = Math.round(barLen(b) / bs); return Math.max(1, Math.floor(n / 2)) * bs; }
// 小節の中のコードを、はじまる位置の順に [{ o, c }]
function chordSegs(c, b) {
  if (!c) return [];
  const bl = barLen(b);
  const out = [{ o: 0, c: { r: c.r, q: c.q } }];
  if (Array.isArray(c.x)) { for (const x of c.x) if (x && x.o > 0 && x.o < bl && Number.isInteger(x.r) && CHORD_Q[x.q]) out.push({ o: x.o, c: { r: x.r, q: x.q } }); }
  else if (c.h) out.push({ o: chordHalf(b), c: { r: c.h.r, q: c.h.q } });
  out.sort((a, z) => a.o - z.o);
  return out.filter((x, i) => i === 0 || x.o !== out[i - 1].o);
}
// [{ o, c }] → しまう形（2つで後半なら c.h、それ以外は c.x）
function chordFromSegs(segs, b) {
  const v = [];
  for (const x of [...segs].sort((a, z) => a.o - z.o)) { const p = v[v.length - 1]; if (!p || p.c.r !== x.c.r || p.c.q !== x.c.q) v.push(x); }
  if (!v.length) return null;
  const base = { r: v[0].c.r, q: v[0].c.q };
  const rest = v.slice(1);
  if (rest.length === 1 && rest[0].o === chordHalf(b)) base.h = { r: rest[0].c.r, q: rest[0].c.q };
  else if (rest.length) base.x = rest.map((x) => ({ o: x.o, r: x.c.r, q: x.c.q }));
  return base;
}
// 小節 b の位置 o にコード c を入れる（c＝null で消す。whole＝小節まるごと1つに）。入れられないときは false
function chordSetAt(ct, b, o, c, whole) {
  while (ct.chords.length < song.bars) ct.chords.push(null);
  if (whole || (o === 0 && !c)) { ct.chords[b] = c ? { r: c.r, q: c.q } : null; return true; }
  let segs = chordSegs(ct.chords[b], b);
  if (!segs.length) {
    if (!c) return true;
    if (o > 0) {
      // 小節の頭は、まえの小節のコードのつづき
      let pb = b - 1;
      while (pb >= 0 && !ct.chords[pb]) pb--;
      if (pb < 0) return false;
      const ps = chordSegs(ct.chords[pb], pb);
      segs = [{ o: 0, c: ps[ps.length - 1].c }];
    }
  }
  segs = segs.filter((x) => x.o !== o);
  if (c) segs.push({ o, c: { r: c.r, q: c.q } });
  ct.chords[b] = chordFromSegs(segs, b);
  return true;
}
// コードを入れる位置の候補：1つ＝[0]、2つ＝[0, 後半]、拍ごと＝拍の頭ぜんぶ
function chordPosList(b, per) {
  if (per === 1) return [0];
  if (per === 2) return [0, chordHalf(b)];
  const bs = beatAt(b);
  return Array.from({ length: Math.max(1, Math.round(barLen(b) / bs)) }, (_, i) => i * bs).filter((o) => o < barLen(b));
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// マス目（おたまチョップ）の区切り：小節の頭からかぞえます
function cellStart(t) {
  const b = barOf(t);
  const a = barStart(b);
  return a + Math.floor((t - a) / ui.grid) * ui.grid;
}
function cellLen(s) {
  return Math.min(ui.grid, barStart(barOf(s) + 1) - s);
}

/* ---------- テンポ（途中で変えられます） ---------- */
function bpmAt(bar) {
  let b = song.bpm;
  for (let i = 0; i <= bar; i++) if (song.tempos[i]) b = song.tempos[i];
  return b;
}
// くり返し記号・1番/2番かっこを展開した「再生する小節の順番」
let orderCache = { key: '', order: [] };
function playOrder() {
  const linear = !!(ui.loopOn && ui.loopRange);
  const key = version + ':' + linear + ':' + song.bars + ':' + JSON.stringify(song.jumps || {});
  if (orderCache.key === key) return orderCache.order;
  const n = song.bars;
  const R = song.repeats || {};
  const starts = new Set(R.start || []);
  const ends = new Set((R.end || []).filter((b) => b < n));
  const volta = R.volta || {};
  const J = song.jumps || {};
  const ok = (x) => x != null && x >= 0 && x < n;
  const backBar = ok(J.dc) ? J.dc : ok(J.ds) ? J.ds : null; // D.C. / D.S. を書いた小節
  let order = [];
  if (linear || (!ends.size && backBar == null)) order = Array.from({ length: n }, (_, i) => i);
  else {
    let b = 0;
    let back = 0;
    let pass = 1;
    let second = false; // D.C./D.S. でもどったあと（くり返しはしない・Fine で終わる・Coda へとぶ）
    const done = new Set();
    const maxV = (bb) => { let m = volta[bb] || 0; for (let i = bb + 1; i < n && volta[i]; i++) m = Math.max(m, volta[i]); for (let i = bb - 1; i >= 0 && volta[i]; i--) m = Math.max(m, volta[i]); return m; };
    while (b < n && order.length < n * 6) {
      const v = volta[b];
      if (second) {
        if (v && v < maxV(b)) { b++; continue; }
        order.push(b);
        if (ok(J.fine) && b === J.fine) break;
        if (ok(J.tocoda) && ok(J.coda) && b === J.tocoda) { b = J.coda; continue; }
        b++;
        continue;
      }
      if (starts.has(b)) back = b;
      if (v && v !== pass) { b++; continue; }
      order.push(b);
      if (ends.has(b) && !done.has(b)) { done.add(b); pass = 2; b = back; continue; }
      if (pass === 2 && (ends.has(b) || (v && !volta[b + 1]))) { pass = 1; back = b + 1; }
      if (b === backBar) { second = true; b = ok(J.dc) ? 0 : ok(J.segno) ? J.segno : 0; continue; }
      b++;
    }
  }
  orderCache = { key, order };
  return order;
}
// 再生の順番にならべた小節の始まり（拍子がちがう小節があっても正しく）
function playStarts() {
  const o = playOrder();
  if (orderCache.ps && orderCache.psKey === orderCache.key + geo().key) return orderCache.ps;
  const ps = [0];
  const pk = song.pickup > 0 ? barLen(0) - song.pickup : 0; // 弱起の小節の、音のない部分
  for (let k = 0; k < o.length; k++) {
    // くり返し・D.C. で弱起の小節にもどるときは、音のない部分をとばす（すき間があかないように）
    if (k > 0 && pk && o[k] === 0) ps[k] -= pk;
    ps.push(ps[k] + barLen(o[k]));
  }
  orderCache.ps = ps;
  orderCache.psKey = orderCache.key + geo().key;
  return ps;
}
function playBarOf(pt) {
  const ps = playStarts();
  let lo = 0;
  let hi = ps.length - 2;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ps[mid] <= pt) lo = mid; else hi = mid - 1; }
  return Math.max(0, lo);
}
const playTotal = () => { const ps = playStarts(); return ps[ps.length - 1]; };
// 再生の位置 → 楽譜の位置
function srcTick(pt) {
  const o = playOrder();
  const k = playBarOf(pt);
  return barStart(o[k]) + (pt - playStarts()[k]);
}
// 楽譜の位置 → 再生の位置（はじめて出てくる所）
function playTickOf(st) {
  const o = playOrder();
  const b = barOf(st);
  const k = o.indexOf(b);
  return (k < 0 ? barStart(b) : playStarts()[k]) + (st - barStart(b));
}
let timeCache = { key: '' };
// 練習用：再生だけゆっくり（曲の速さは変えない・書き出しには入らない）。play() で ui.speed、stop() で 1 にもどす
let playSpeed = 1;
function timeTable() {
  const o = playOrder();
  const key = orderCache.key + geo().key + ':' + playSpeed + ':' + (song.feel || 0);
  if (timeCache.key === key) return timeCache;
  const start = [0];
  const spt = [];
  const ps = playStarts();
  const slow = song.feel && typeof feelSlow === 'function' ? feelSlow(o) : null; // 演奏の表情：おわりでゆっくり
  for (let k = 0; k < o.length; k++) {
    spt.push((60 / (bpmAt(o[k]) * TPQ * playSpeed)) * (slow ? slow[k] : 1));
    start.push(start[k] + spt[k] * (ps[k + 1] - ps[k]));
  }
  timeCache = { key, start, spt, n: o.length };
  return timeCache;
}
function absSec(tick) {
  const { start, spt } = timeTable();
  const b = playBarOf(tick);
  return start[b] + (tick - playStarts()[b]) * spt[b];
}
function tickAtSec(sec) {
  const { start, spt, n } = timeTable();
  let b = 0;
  while (b < n - 1 && start[b + 1] <= sec) b++;
  return playStarts()[b] + (sec - start[b]) / spt[b];
}
function swingSec(tick) {
  if (!song.swing) return 0;
  const u = song.swingUnit;
  const bi = playBarOf(tick);
  const inBar = tick - playStarts()[bi];
  if (inBar % (u * 2) !== u) return 0;
  const { spt, n } = timeTable();
  return (song.swing * u / 3) * spt[clamp(playBarOf(tick), 0, n - 1)];
}

/* ---------- 元に戻す・履歴 ---------- */
function snapshot() { return JSON.stringify(song); }
let songOwn = false; // この曲は自分のもの（さわった・自分で開いた）
function pushUndo(snap, label) {
  songOwn = true;
  undoStack.push({ snap, label, cur: ui.sc ? ui.sc.cursor : null }); // 楽譜のカーソルもおぼえる
  if (undoStack.length > 300) undoStack.shift();
  // 大きな曲で記憶がふくらみすぎないように（全部で約2000万文字まで。少なくとも30回はもどれる）
  let total = 0;
  for (const u of undoStack) total += u.snap.length;
  while (total > 2e7 && undoStack.length > 30) total -= undoStack.shift().snap.length;
  redoStack.length = 0;
  updateUndoButtons();
}
/* ---------- トラックの名前：ふつうは楽器の名前。同じ楽器が2つ以上なら、上から トランペット1・トランペット2… ----------
   自分でつけた名前（cname）はそのまま。名前を空にすると、楽器の名前にもどる */
const ROMAN_NUM = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ', 'Ⅺ', 'Ⅻ'];
function trackBaseName(t) {
  if (t.type === 'melody') return Sound.INSTRUMENTS[t.inst] || 'メロディ';
  if (t.type === 'drum') return (Sound.KITS.find((k) => k.id === t.kit) || {}).name || 'リズム';
  return 'コード伴奏';
}
function isAutoName(t) {
  if (t.cname) return false;
  const n = String(t.name || '').replace(/\s*([0-9０-９]+|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ])$/, '').trim();
  if (!n || ['メロディ', 'リズム', 'ドラム', 'コード伴奏'].includes(n)) return true;
  return Object.values(Sound.INSTRUMENTS).includes(n) || Sound.KITS.some((k) => k.name === n);
}
function autoNameTracks() {
  const groups = new Map();
  for (const t of song.tracks) {
    if (!isAutoName(t)) continue;
    const base = trackBaseName(t);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(t);
  }
  for (const [base, ts] of groups) {
    const roman = ts.some((t) => /[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ]$/.test(t.name || '')); // バイオリンⅠ・Ⅱ のような書き方なら、そのまま
    const sep = /[0-9]$/.test(base) ? ' ' : '';
    ts.forEach((t, i) => { t.name = ts.length === 1 ? base : base + sep + (roman && i < ROMAN_NUM.length ? ROMAN_NUM[i] : String(i + 1)); });
  }
}
function edit(fn, label = '編集') {
  const snap = snapshot();
  const nTr = song.tracks.length;
  const trId = track() && track().id;
  const nNotes = noteCount();
  fn();
  autoNameTracks();
  if (song.tracks.length !== nTr || (track() && track().id) !== trId) { nsel.clear(); updateSelBar(); }
  if (snapshot() !== snap) {
    pushUndo(snap, label);
    // たくさん消したときは「もどせるよ」と知らせる（まちがえても安心）
    const lost = nNotes - noteCount();
    if (song.tracks.length < nTr || lost >= 4) setTimeout(() => toastUndo(`「${label}」をしました${lost > 0 ? `（音 ${lost} こ）` : ''}`), 0);
  }
  changed();
}
function restore(json) {
  song = JSON.parse(json);
  cur = clamp(cur, 0, song.tracks.length - 1);
  if (ui.sc) { ui.sc.sel = new Set(); ui.sc.cursor = clamp(ui.sc.cursor || 0, 0, totalTicks()); }
  nsel.clear();
  updateSelBar();
  changed(true);
}
function undo() {
  if (!undoStack.length) return toast('もどせる操作はありません');
  const e = undoStack.pop();
  redoStack.push({ snap: snapshot(), label: e.label, cur: ui.sc.cursor });
  if (e.cur != null) ui.sc.cursor = e.cur;
  restore(e.snap);
  if (ui.view === 'score') renderScoreEdit();
  toast(`↶ 「${e.label}」を元に戻しました`);
  updateUndoButtons();
}
function redo() {
  if (!redoStack.length) return toast('やり直せる操作はありません');
  const e = redoStack.pop();
  undoStack.push({ snap: snapshot(), label: e.label, cur: ui.sc.cursor });
  if (e.cur != null) ui.sc.cursor = e.cur;
  restore(e.snap);
  if (ui.view === 'score') renderScoreEdit();
  toast(`↷ 「${e.label}」をやり直しました`);
  updateUndoButtons();
}
// ボタンの説明に「次に何が戻るか」を出す
function updateUndoButtons() {
  const u = undoStack[undoStack.length - 1];
  const r = redoStack[redoStack.length - 1];
  $('#btnUndo').disabled = !u;
  $('#btnRedo').disabled = !r;
  $('#btnUndo').title = u ? `元に戻す：「${u.label}」（Ctrl+Z）` : '元に戻す（Ctrl+Z）';
  $('#btnRedo').title = r ? `やり直す：「${r.label}」（Ctrl+Y）` : 'やり直す（Ctrl+Y）';
}
let autosaveTimer = null;
// 自動保存のようす（ミニディスプレイの右上の小さな印）
function saveState(st) {
  const el = $('#saveMark');
  if (!el) return;
  el.dataset.st = st;
  el.title = st === 'saved' ? 'このブラウザに自動で保存しました（とじても、つぎに開くと続きから）' : st === 'saving' ? '保存しています…' : '保存できませんでした（ブラウザの保存領域がいっぱいかもしれません）';
}
let scoreTimer = null;
function changed(full = false) {
  version++;
  if (mission.on) setTimeout(missionCheck, 0);
  if (refSong) setTimeout(updateCompare, 0);
  setTimeout(updateCp, 0);
  if (full) { renderSettings(); renderTracks(); updateTaskBar(); }
  renderEditorTools();
  resizeEditor();
  draw();
  drawOverview();
  updateUndoButtons();
  updateMini();
  clearTimeout(autosaveTimer);
  saveState('saving');
  autosaveTimer = setTimeout(() => { try { localStorage.setItem('otsumiki-autosave', snapshot()); saveState('saved'); } catch (e) { saveState('error'); warnSaveFailed(); } }, 500);
  if (ui.showScore) { clearTimeout(scoreTimer); scoreTimer = setTimeout(renderScorePanel, 250); }
  if (ui.view === 'score') renderScoreEdit();
  warmEvents();
}
// 大きな曲：手があいているときに、鳴らす音の表を先に作っておく（▶ をおしてすぐ鳴るように）
let warmTimer = 0;
function warmEvents() {
  clearTimeout(warmTimer);
  if (song.tracks.reduce((a, t) => a + (t.notes ? t.notes.length : 0), 0) < 3000) return;
  warmTimer = setTimeout(() => {
    const go = () => { if (!player.on) eventList(); };
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 3000 }); else go();
  }, 800);
}

/* ============================================================
   オーディオ（再生）
   ============================================================ */
let actx = null;
let previewOut = null;
// スマホ・タブレット（力の弱い機械）：同時に鳴らす音を少なめに、音の予約を多めに、音の出口を少し大きく（とぎれないように）
// 響きの長さ（スマホでは短くして計算を軽く）
let REV_LEN = 2.2;
let FXREV_LEN = 3.5;
const LOW_POWER = (() => { try { return matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent)); } catch (e) { return false; } })();
if (LOW_POWER) { Sound.Samples.setVoiceLimit(32); REV_LEN = 1.4; FXREV_LEN = 2; }
function ensureAudio() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    try { actx = LOW_POWER ? new AC({ latencyHint: 'balanced' }) : new AC(); } catch (e) { actx = new AC(); }
    const comp = actx.createDynamicsCompressor();
    const an = actx.createAnalyser();
    an.fftSize = 256;
    an.smoothingTimeConstant = 0.78;
    comp.connect(an);
    an.connect(actx.destination);
    actx._an = an;
    previewOut = actx.createGain();
    previewOut.gain.value = 0.8;
    previewOut.connect(comp);
    actx._comp = comp;
    setTimeout(() => { Sound.makeReverb(actx, REV_LEN); Sound.makeReverb(actx, FXREV_LEN); }, 0);
  }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

const identityCurve = (() => { const c = new Float32Array(256); for (let i = 0; i < 256; i++) c[i] = i / 127.5 - 1; return c; })();
function crushCurve(bits) {
  const c = new Float32Array(1024);
  const steps = Math.pow(2, bits);
  for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.round(x * steps) / steps; }
  return c;
}
function buildGraph(ctx, dest, live) {
  // 響き・イコライザー・エフェクトの部品は一度だけ作って使い回す（再生ボタンを速くするため）
  let g = live ? ctx._live : null;
  if (!g) {
    const out = ctx.createGain();
    out.connect(dest);
    const pre = ctx.createGain();
    const eqL = ctx.createBiquadFilter(); eqL.type = 'lowshelf'; eqL.frequency.value = 250;
    const eqM = ctx.createBiquadFilter(); eqM.type = 'peaking'; eqM.frequency.value = 1000; eqM.Q.value = 0.8;
    const eqH = ctx.createBiquadFilter(); eqH.type = 'highshelf'; eqH.frequency.value = 4000;
    pre.connect(eqL); eqL.connect(eqM); eqM.connect(eqH);
    g = { out, pre, eqL, eqM, eqH };
    if (live) {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 22000; lp.Q.value = 1;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 10; hp.Q.value = 1;
      const crush = ctx.createWaveShaper(); crush.curve = identityCurve;
      const dry = ctx.createGain();
      eqH.connect(lp); lp.connect(hp); hp.connect(crush); crush.connect(dry); dry.connect(out);
      const dIn = ctx.createGain(); dIn.gain.value = 0;
      const dl = ctx.createDelay(2); dl.delayTime.value = 0.3;
      const dFb = ctx.createGain(); dFb.gain.value = 0.4;
      dIn.connect(dl); dl.connect(dFb); dFb.connect(dl); dl.connect(out);
      const stIn = ctx.createGain(); stIn.gain.value = 1;
      const st = ctx.createDelay(2); st.delayTime.value = 0.2;
      const stFb = ctx.createGain(); stFb.gain.value = 0;
      const stOut = ctx.createGain(); stOut.gain.value = 0;
      crush.connect(stIn); stIn.connect(st); st.connect(stFb); stFb.connect(st); st.connect(stOut); stOut.connect(out);
      const fxRev = Sound.makeReverb(ctx, FXREV_LEN);
      const fxRevIn = ctx.createGain(); fxRevIn.gain.value = 0;
      fxRevIn.connect(fxRev); fxRev.connect(out); // crush → fxRevIn は、エフェクトを使うときだけつなぐ（使っていないときも計算されて重いので）
      Object.assign(g, { lp, hp, crush, dry, dIn, dl, dFb, stIn, st, stFb, stOut, fxRevIn });
      ctx._live = g;
    } else eqH.connect(out);
    const rev = Sound.makeReverb(ctx, REV_LEN);
    const wet = ctx.createGain();
    rev.connect(wet); wet.connect(pre);
    g.rev = rev;
    g.wet = wet;
  }
  g.out.gain.value = song.master;
  g.eqL.gain.value = song.eq.low; g.eqM.gain.value = song.eq.mid; g.eqH.gain.value = song.eq.high;
  g.wet.gain.value = song.reverb * 0.6;
  // 再生1回ぶんの入り口（止めるときはここだけ消す）
  const session = ctx.createGain();
  session.connect(g.pre);
  const send = ctx.createGain();
  session.connect(send);
  // 響きが0のときは、響きの計算をしない（とちゅうで上げたらつなぐ）
  if (song.reverb > 0) send.connect(g.rev);
  const outs = {};
  const pans = {};
  for (const tr of song.tracks) {
    const tg = ctx.createGain();
    tg.gain.value = tr.vol;
    // 左右の位置（パン）：-1＝左、0＝まん中、1＝右
    if (ctx.createStereoPanner) {
      const pn = ctx.createStereoPanner();
      pn.pan.value = clamp(+tr.pan || 0, -1, 1);
      tg.connect(pn);
      pn.connect(session);
      pans[tr.id] = pn;
    } else tg.connect(session);
    outs[tr.id] = tg;
  }
  const metro = ctx.createGain();
  metro.gain.value = song.metro.vol;
  metro.connect(g.out);
  return Object.assign(Object.create(g), { session, send, outs, pans, metro, base: g, _revOn: song.reverb > 0 });
}

function chordEvents(tr) {
  const ev = [];
  let prev = null; // 前の和音の音（なめらかにつなぐため）
  for (let b = 0; b < song.bars; b++) {
    const c0 = tr.chords[b];
    if (!c0) continue;
    const bs = beatAt(b);
    const bl = barLen(b);
    // 伴奏の形は「小節の」リズムで作り、コードそれぞれの区切りの中だけ鳴らす（いくつコードがあっても速くならない）
    // 弱起の小節は、音のある所（さいごの数拍）だけ鳴らす
    const st0 = b === 0 && song.pickup > 0 ? Math.max(0, bl - song.pickup) : 0;
    const segs = chordSegs(c0, b);
    segs.forEach((sg, i) => {
      const a = Math.max(sg.o, st0);
      const z = i + 1 < segs.length ? segs[i + 1].o : bl;
      if (z > a) prev = chordPart(tr, ev, sg.c, barStart(b), bl, a, z, bs, prev);
    });
  }
  return ev;
}
// 和音の形（転回）を、前の和音からいちばん近いものにする（指があまり動かない、なめらかな伴奏）
function voiceLead(tones, prev) {
  if (!prev) return tones;
  let best = tones;
  let bc = Infinity;
  const n = tones.length;
  for (let inv = 0; inv < n; inv++) {
    const t = tones.map((x, i) => (i < inv ? x + 12 : x)).sort((a, b) => a - b);
    for (const sh of [-12, 0, 12]) {
      const c = t.map((x) => x + sh);
      if (c[0] < 52 || c[c.length - 1] > 79) continue;
      let cost = 0;
      for (const x of c) cost += Math.min(...prev.map((p) => Math.abs(p - x)));
      cost += Math.abs(c[0] - 60) * 0.15; // 真ん中あたりにいるように
      if (cost < bc) { bc = cost; best = c; }
    }
  }
  return best;
}
/* ---------- 和声法にそった音のえらび方（4声体のきまり） ----------
   ・ベースは根音。前のベースからいちばん近い高さへ
   ・上の声は、前の和音と同じ音（共通音）はそのまま、ほかはなるべく近く（順次進行）へ
   ・連続5度・連続8度（2つの声が同じ向きに動いて、5度→5度・8度→8度）はさける
   ・ベースとソプラノの並達（かくれた）5度・8度は、ソプラノが跳ぶならさける
   ・導音（音階の7番目の音）は、主音へ半音上がって解決する
   ・7の和音の7度の音は、2度下がって解決する
   ・声と声のあいだは1オクターブ以内（ベースと上の声はひらいてよい） */
function harmonyVoicing(c, prev) {
  const iv = CHORD_Q[c.q].iv;
  const rpc = ((c.r % 12) + 12) % 12;
  let pcs = iv.map((x) => (rpc + x) % 12);
  // 7の和音：上の3声は5度の音をはぶく（4声体のふつうの書き方）。5度が変わる和音では根音をはぶく（ベースが根音）
  // 9の和音（5つの音）：3度・7度・9度をえらぶ（和音の色を決める音）
  if (pcs.length > 4) pcs = [pcs[1], pcs[3], pcs[4]];
  else if (pcs.length > 3) pcs = iv[2] === 7 ? [pcs[0], pcs[1], pcs[3]] : [pcs[1], pcs[2], pcs[3]];
  // ベースの候補（E2〜G3）
  const bassCands = [];
  for (let m = 40; m <= 55; m++) if (m % 12 === rpc) bassCands.push(m);
  // 上の声の候補：和音の音をそれぞれ1回ずつ、F3〜A5 の中で
  const lists = pcs.map((pc) => { const a = []; for (let m = 53; m <= 81; m++) if (m % 12 === pc) a.push(m); return a; });
  const ups = [];
  const rec = (i, acc) => {
    if (i === lists.length) {
      const v = [...acc].sort((a, b) => a - b);
      for (let k = 1; k < v.length; k++) if (v[k] === v[k - 1] || v[k] - v[k - 1] > 12) return;
      if (v[v.length - 1] - v[0] > 19) return;
      ups.push(v);
      return;
    }
    for (const m of lists[i]) { acc.push(m); rec(i + 1, acc); acc.pop(); }
  };
  rec(0, []);
  const tonic = ((song.key % 12) + 12) % 12;
  const lead = (tonic + 11) % 12;
  const prevBass = prev && prev.bass;
  const prevUp = prev && prev.length ? [...prev] : null;
  const prevC = prev && prev.chord;
  const prevSeventh = prevC && CHORD_Q[prevC.q].iv.length > 3 ? (prevC.r + CHORD_Q[prevC.q].iv[3]) % 12 : null;
  const prevDominant = prevC && (prevC.r % 12) === (tonic + 7) % 12;
  let best = null;
  let bc = Infinity;
  for (const bass of bassCands) {
    let bcost = prevBass != null ? Math.abs(bass - prevBass) * 0.6 : Math.abs(bass - 48) * 0.3;
    if (prevBass != null && Math.abs(bass - prevBass) > 7) bcost += 2; // ベースの大きな跳躍は少しだけさける
    for (const up of ups) {
      if (up[0] <= bass + 2) continue;
      let cost = bcost;
      const top = up[up.length - 1];
      if (!prevUp) {
        cost += Math.abs((up[0] + top) / 2 - 66) * 0.5 + (top - up[0]) * 0.15; // はじめの和音：まん中あたりに、まとめて
      } else {
        // 声ごとに：前の音からのうごき（同じ数の声どうしで、下から順に）
        const n = Math.min(up.length, prevUp.length);
        const a = prevUp.slice(-n);
        const z = up.slice(-n);
        for (let k = 0; k < n; k++) {
          const d = Math.abs(z[k] - a[k]);
          cost += d === 0 ? -0.6 : d <= 2 ? d * 0.6 : d * 1.1; // 共通音はそのまま、順次進行がよい
        }
        // 連続5度・連続8度（ベースも入れて、すべての声の組で）
        const A = [prevBass, ...a];
        const Z = [bass, ...z];
        for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) {
          const i0 = (A[j] - A[i] + 120) % 12;
          const i1 = (Z[j] - Z[i] + 120) % 12;
          const moved = A[i] !== Z[i] && A[j] !== Z[j];
          const same = Math.sign(Z[i] - A[i]) === Math.sign(Z[j] - A[j]);
          if (moved && same && ((i0 === 7 && i1 === 7) || (i0 === 0 && i1 === 0))) cost += 40;
        }
        // 並達5度・8度：ベースとソプラノが同じ向きで、5度・8度に入り、ソプラノが跳ぶ
        const ib = (top - bass + 120) % 12;
        const topPrev = a[a.length - 1];
        if ((ib === 7 || ib === 0) && Math.sign(top - topPrev) === Math.sign(bass - prevBass) && top !== topPrev && Math.abs(top - topPrev) > 2) cost += 6;
        // 導音 → 主音（属和音から）
        if (prevDominant && pcs.includes(tonic)) {
          for (let k = 0; k < n; k++) if (a[k] % 12 === lead && z[k] !== a[k] + 1) cost += k === n - 1 ? 14 : 5; // ソプラノの導音はかならず
        }
        // 7度の音は2度下がる
        if (prevSeventh != null) {
          for (let k = 0; k < n; k++) if (a[k] % 12 === prevSeventh) { const d = a[k] - z[k]; if (d !== 1 && d !== 2 && d !== 0) cost += 8; }
        }
        cost += Math.abs((up[0] + top) / 2 - 66) * 0.08; // 高すぎ・低すぎにならないよう
      }
      if (cost < bc) { bc = cost; best = { bass, up }; }
    }
  }
  if (!best) return null;
  const tones = best.up;
  tones.bass = best.bass;
  tones.chord = { r: rpc, q: c.q };
  return tones;
}
function chordPart(tr, ev, c, o, bl, from, to, bs, prev) {
  let root = 48 + ((c.r % 12) + 12) % 12;
  if (root > 54) root -= 12;
  const iv = CHORD_Q[c.q].iv;
  const hv = harmonyVoicing(c, prev);
  const tones = hv || voiceLead(iv.map((x) => root + 12 + x), prev);
  const top = tones[tones.length - 1];
  const bass = hv ? hv.bass : root - 12 + (root < 43 ? 12 : 0);
  const fifth = bass + (iv[2] != null ? iv[2] : 7); // 和音の5度（減・増でも正しく）
  let bassed = false;
  // s は小節の頭からの位置。区切り（from〜to）の外の音は鳴らさない
  const push = (s, p, l, v = 0.7, isBass = false) => {
    if (s < from || s >= to) return;
    ev.push({ s: o + s, p, l: Math.max(1, Math.min(l, to - s)), v });
    if (isBass) bassed = true;
  };
  const pat = tr.pattern;
  if (pat === 'whole') {
    tones.forEach((p) => push(from, p, to - from, 0.6));
    if (tr.bassOn) push(from, bass, to - from, 0.8, true);
  } else if (pat === 'beat') {
    for (let s = 0; s < bl; s += bs) {
      tones.forEach((p) => push(s, p, bs * 0.9, s === 0 ? 0.65 : 0.5));
      if (tr.bassOn) push(s, bass, bs * 0.9, 0.75, true);
    }
  } else if (pat === 'arp' || pat === 'alberti') {
    // 7の和音は4つの音ぜんぶを使う
    const seq = pat === 'arp' ? (tones.length > 3 ? [tones[0], tones[1], tones[2], tones[3], tones[2], tones[1]] : [tones[0], tones[1], tones[2], tones[0] + 12, tones[2], tones[1]]) : [tones[0], top, tones[1], top];
    for (let s = 0, i = 0; s < bl; s += 24, i++) push(s, seq[i % seq.length], pat === 'arp' ? 40 : 22, 0.55);
    if (tr.bassOn) push(from, bass, to - from, 0.7, true);
  } else if (pat === 'pop8') {
    for (let s = 0, k = 0; s < bl; s += 24, k++) tones.forEach((p) => push(s, p, 20, k % 2 ? 0.38 : 0.5));
    if (tr.bassOn) for (let s = 0; s < bl; s += bs * 2) push(s, bass, bs * 1.8, 0.8, true);
  } else if (pat === 'strum') {
    // ギター：下・下上・上下・上（8分音符の位置で。3拍子・2拍子でもずれない）
    const hits = [[0, 1, 0.6], [48, 1, 0.5], [72, -1, 0.4], [120, -1, 0.4], [144, 1, 0.5], [168, -1, 0.4]];
    const gtr = [tones[0] - 12, tones[tones.length > 3 ? 2 : 2] - 12, ...tones];
    for (const [st, dir, v] of hits) {
      if (st >= bl) continue;
      const order = dir > 0 ? gtr : [...gtr].reverse().slice(0, 4);
      order.forEach((p, i) => push(st + i * 1.5, p, 40, v));
    }
    if (tr.bassOn) push(from, bass, bs * 1.5, 0.75, true);
  } else if (pat === 'bossa') {
    if (tr.bassOn) { push(0, bass, bs * 1.4, 0.8, true); push(bs * 1.5, fifth, bs * 0.45, 0.6, true); push(bs * 2, fifth, bs * 1.4, 0.75, true); push(bs * 3.5, bass, bs * 0.45, 0.6, true); }
    for (const st of [0, 72, 144]) if (st < bl) tones.forEach((p) => push(st, p, 30, 0.42));
    if (120 < bl) tones.forEach((p) => push(120, p, 20, 0.35));
  } else if (pat === 'ballad') {
    const seq = [bass + 12, tones[0], tones[1], tones[2], tones.length > 3 ? tones[3] : tones[0] + 12, tones[2], tones[1], tones[0]];
    for (let s = 0, i = 0; s < bl; s += 24, i++) push(s, seq[i % seq.length], 60, i === 0 ? 0.55 : 0.42);
    if (tr.bassOn) push(from, bass, to - from, 0.6, true);
  } else if (pat === 'waltz' || pat === 'march') {
    for (let s = 0, k = 0; s < bl; s += bs, k++) {
      const first = pat === 'waltz' ? k % 3 === 0 : k % 2 === 0;
      if (first) { if (tr.bassOn) push(s, bass, bs * 0.9, 0.85, true); else push(s, tones[0], bs * 0.9, 0.6); } else tones.forEach((p) => push(s, p, bs * 0.6, 0.45));
    }
  }
  // 後半のコードでベースがひとつも鳴らないときは、区切りの頭にベース
  if (tr.bassOn && !bassed && from > 0) push(from, bass, Math.min(bs, to - from) * 0.9, 0.75, true);
  return tones;
}
// 再生する出来事（ノート・打楽器・メトロノーム）を時間順に並べる
let evCache = { v: -1, list: [] };
function eventList() {
  const key = orderCache.key + ':' + version;
  playOrder();
  if (evCache.v === key) return evCache.list;
  return holdGeo(() => eventListBuild(key));
}
// その時点で鳴らす楽器（持ちかえがあれば、そのあとはその楽器）
function instAt(tr, t) { let i = tr.inst; for (const c of tr.instChg || []) { if (c.t <= t) i = c.inst; else break; } return i; }
function trackInsts(tr) { return [...new Set([tr.inst, ...(tr.instChg || []).map((c) => c.inst)])]; }
function eventListBuild(key) {
  const total = totalTicks();
  const bySrc = Array.from({ length: song.bars }, () => []);
  const put = (t, e) => { if (t < 0 || t >= total) return; const b = barOf(t); bySrc[b].push({ ...e, rt: t - barStart(b) }); };
  for (const tr of song.tracks) {
    if (tr.type === 'melody') {
      const ex = expression(tr);
      const arpAt = new Map();
      for (const n of tr.notes) if ((n.art || []).includes('arp')) { const g = tr.notes.filter((m) => m.s === n.s && voiceOf(m) === voiceOf(n)).sort((a, b) => a.p - b.p); arpAt.set(n, g.indexOf(n)); }
      const peds = tr.pedals || [];
      const trills = tr.trills || [];
      const chg = tr.instChg && tr.instChg.length ? tr.instChg : null;
      // 2つの音のトレモロ：あいての音（つぎの音）は、ここでいっしょに鳴らす
      const partnerOf = new Map();
      const skip = new Set();
      for (const n of tr.notes) {
        if (!(n.art || []).includes('trem2') || skip.has(n)) continue;
        const grp = tr.notes.filter((m) => m.s === n.s && voiceOf(m) === voiceOf(n)).sort((a, b) => a.p - b.p);
        const nx = tr.notes.filter((m) => Math.abs(m.s - (n.s + n.l)) <= 2 && voiceOf(m) === voiceOf(n)).sort((a, b) => a.p - b.p);
        if (!nx.length) continue;
        grp.forEach((g, i) => { if ((g.art || []).includes('trem2') || g === n) partnerOf.set(g, nx[Math.min(i, nx.length - 1)]); });
        for (const m of nx) skip.add(m);
      }
      for (const n of tr.notes) {
        if (n.s >= total || skip.has(n)) continue;
        const x = ex(n);
        const v = clamp(x.v * (n.vel || 1) * (song.feel && typeof feelVel === 'function' ? feelVel(n) : 1), 0.05, 1.3);
        // ペダルをふんでいる間は、音がのびる
        const pd = peds.find((q) => n.s >= q.s && n.s < q.e);
        const l = Math.min(pd ? Math.max(n.l, pd.e - n.s) : n.l, total - n.s);
        let gTo = null;
        if ((n.art || []).includes('gliss')) { const nx = tr.notes.filter((m) => m.s >= n.s + n.l - 1 && m.s > n.s && voiceOf(m) === voiceOf(n)).sort((a, b) => a.s - b.s || b.p - a.p)[0]; if (nx) gTo = nx.p; }
        const pt = partnerOf.get(n);
        const ctx = { trillSpan: trills.find((q) => n.s >= q.s && n.s < q.e) || null, partner: pt ? pt.p : null, partnerL: pt ? pt.l : 0 };
        for (const o of ornamentNotes(n, l, arpAt.get(n), gTo, ctx)) put(n.s + o.dt, chg && instAt(tr, n.s) !== tr.inst ? { tr, kind: 'note', p: o.p, l: o.l, v: v * (o.vf || 1), lf: o.last ? x.lf : 1, inst: instAt(tr, n.s) } : { tr, kind: 'note', p: o.p, l: o.l, v: v * (o.vf || 1), lf: o.last ? x.lf : 1 });
      }
    } else if (tr.type === 'chord') { const af = song.feel && typeof feelAccomp === 'function' ? feelAccomp() : 1; for (const n of chordEvents(tr)) put(n.s, { tr, kind: 'note', p: n.p, l: n.l, v: n.v * af }); }
    else for (const id in tr.grid) for (const s in tr.grid[id]) if (+s < total) put(+s, { tr, kind: 'drum', id, v: tr.grid[id][s] === 2 ? 1 : 0.6 });
  }
  // ちがうパートが同じ楽器・同じ高さ・同じときに鳴らす音（オーケストラの重ね）は1つにまとめる（スマホでも音がとぎれないように）
  // まとめた音は少し大きく。どのパートの音かは alt におぼえておき、消音・ソロのときはそのパートだけで鳴らす
  for (const arr of bySrc) {
    if (arr.length < 2) continue;
    const seen = new Map();
    let w = 0;
    for (const e of arr) {
      if (e.kind === 'note' && e.tr.type === 'melody') {
        const k = (e.inst || e.tr.inst) + '|' + (e.tr.real !== false) + '|' + e.p + '|' + e.rt;
        const f = seen.get(k);
        if (f) { (f.alt || (f.alt = [])).push({ tr: e.tr, v: e.v }); f.l = Math.max(f.l, e.l); continue; }
        seen.set(k, e);
      }
      arr[w++] = e;
    }
    arr.length = w;
  }
  const list = [];
  const order = playOrder();
  const ps = playStarts();
  // くり返しで弱起の小節にもどるときは、音のない部分（前の小節とかさなる所）はとばす
  const pk = song.pickup > 0 ? barLen(0) - song.pickup : 0;
  order.forEach((src, k) => {
    const skip = k > 0 && src === 0 ? pk : 0;
    for (const e of bySrc[src]) if (e.rt >= skip) list.push({ ...e, t: ps[k] + e.rt });
    const bs = beatAt(src);
    for (let t = 0; t < barLen(src); t += bs) if (t >= skip) list.push({ t: ps[k] + t, kind: 'metro', acc: t === 0 });
  });
  list.sort((a, b) => a.t - b.t);
  evCache = { v: key, list };
  return list;
}
// 装飾記号を、じっさいに鳴らす音の列にする（トリル・モルデント・ターン・トレモロ・アルペジオ・装飾音符）
const ART_IDS = new Set(['stac', 'ten', 'acc', 'marc', 'ferm', 'stacc2', 'tr', 'prall', 'mord', 'turn', 'iturn', 'trem', 'trem2', 'arp', 'breath', 'caes', 'upb', 'dnb', 'gliss', 'harm', 'open', 'stop', 'snap']);
// 装飾音符：1つ（数）でも、いくつか（配列）でもよい
// マス目の音につける、記号の小さなしるし
const BADGE = { tr: 'tr', prall: 'pr', mord: 'mo', turn: '∞', iturn: '∞', trem2: '⇄', gliss: '↗', arp: '⌇', stac: '・', stacc2: '▾', ten: '–', acc: '>', marc: '^', ferm: '⌒', harm: '○', open: 'o', stop: '+', snap: 'φ', upb: 'V', dnb: '⊓', breath: ',', caes: '//' };
function ornBadge(n, tr) {
  const A = n.art || [];
  let s = '';
  for (const a of A) {
    if (a === 'trem') s += ['/', '//', '///'][(n.trs || 3) - 1];
    else if (a === 'tr') s += 'tr' + (n.tra == null ? '' : n.tra === 1 ? '♯' : n.tra === -1 ? '♭' : '♮');
    else if (BADGE[a]) s += BADGE[a];
  }
  if (tr && tr.trills && tr.trills.some((q) => n.s >= q.s && n.s < q.e) && !A.includes('tr')) s = 'tr〰' + s;
  if (n.nh) s += n.nh === 'diamond' ? '◇' : '×';
  return s;
}
// 音の高さを動かす（装飾音符もいっしょに動かす）
function moveP(n, d, lo, hi) {
  const o = n.p;
  n.p = clamp(n.p + d, lo, hi);
  const k = n.p - o;
  if (k && n.gr != null) n.gr = Array.isArray(n.gr) ? n.gr.map((g) => clamp(g + k, 21, 108)) : clamp(n.gr + k, 21, 108);
  return n.p;
}
const grList = (n) => (n.gr == null ? [] : Array.isArray(n.gr) ? n.gr : [n.gr]);
// その場所の調で、となりの音（上・下）
function stepAt(p, dir, t) {
  const kk = keyAt(barOf(Math.max(0, Math.min(t, totalTicks() - 1))));
  const kc = Notation.keyCount(kk.key, kk.minor);
  const sp = Notation.spell(p, kc);
  const dn = sp.dn + dir;
  const L = ((dn % 7) + 7) % 7;
  const nat = (Math.floor(dn / 7) + 1) * 12 + [0, 2, 4, 5, 7, 9, 11][L];
  // 調号の ♯・♭
  const SO = [3, 0, 4, 1, 5, 2, 6];
  const FO = [6, 2, 5, 1, 4, 0, 3];
  let acc = 0;
  if (kc > 0 && SO.slice(0, kc).includes(L)) acc = 1;
  if (kc < 0 && FO.slice(0, -kc).includes(L)) acc = -1;
  return { p: nat + acc, nat };
}
// トリルの上の音（♯・♭・♮ の指定があれば、それにしたがう）
function trillUpper(n, a) {
  const u = stepAt(n.p, 1, n.s);
  return a === 1 || a === -1 || a === 0 ? u.nat + a : u.p;
}
function ornamentNotes(n, l, arpIdx, glissTo, ctx = {}) {
  const art = n.art || [];
  const out = [];
  let t0 = 0;
  const grs = grList(n);
  if (grs.length && l > 8) {
    if (n.grl && grs.length === 1) {
      // 長前打音（アポジャトゥーラ）：主音符の半分（付点なら2/3）の長さ
      const g = Math.round(l % 3 === 0 && l % 2 !== 0 ? (l * 2) / 3 : l / 2);
      out.push({ dt: 0, p: grs[0], l: g, vf: 1 });
      t0 = g;
    } else {
      // 短前打音（いくつかあれば、すばやく順に）：拍の頭で短く鳴らしてから主音符
      const u = Math.max(2, Math.min(6, Math.floor(l / (2 * grs.length))));
      grs.forEach((gp, i) => out.push({ dt: i * u, p: gp, l: u, vf: 0.85 }));
      t0 = u * grs.length;
    }
  }
  // アルペジオ：下の音から少しずつおくらせる
  if (arpIdx != null && arpIdx > 0) t0 += Math.min(arpIdx * 3, Math.floor(l / 2));
  const L = l - t0;
  const trillA = ctx.trillSpan ? ctx.trillSpan.a : n.tra;
  const up = trillUpper(n, trillA);
  const upN = stepAt(n.p, 1, n.s).p;
  const dn = stepAt(n.p, -1, n.s).p;
  const tremU = (k) => ({ 1: 24, 2: 12, 3: 6 }[k] || 6);
  const seq = (ps, u) => { let t = t0; ps.forEach((p, i) => { const last = i === ps.length - 1; const len = last ? L - (t - t0) : u; if (len > 0) out.push({ dt: t, p, l: len, last }); t += u; }); };
  if (art.includes('gliss') && glissTo != null && glissTo !== n.p && L >= 8) {
    // グリッサンド：つぎの音まで、半音ずつすべる（はじめの半分はもとの音）
    const steps = Math.min(24, Math.abs(glissTo - n.p));
    const dir = Math.sign(glissTo - n.p);
    const head = Math.floor(L / 2);
    const u = Math.max(1, (L - head) / steps);
    out.push({ dt: t0, p: n.p, l: head });
    for (let i = 1; i <= steps - 1; i++) out.push({ dt: t0 + head + Math.round((i - 1) * u), p: n.p + dir * Math.round((i * Math.abs(glissTo - n.p)) / steps), l: Math.max(1, Math.round(u)), vf: 0.8 });
    if (steps === 1) out[out.length - 1].l = L;
    out[out.length - 1].last = true;
  } else if (art.includes('trem2') && ctx.partner != null && L >= 8) {
    // 2つの音のトレモロ：となりの音と交互に、2つの音の長さぶん
    const LL = L + (ctx.partnerL || 0);
    const u = tremU(n.trs || 3);
    const ps = [];
    for (let k = 0; k * u < LL - u; k++) ps.push(k % 2 ? ctx.partner : n.p);
    const L0 = LL;
    let t = t0;
    ps.forEach((p) => { out.push({ dt: t, p, l: u }); t += u; });
    out.push({ dt: t, p: ps.length % 2 ? ctx.partner : n.p, l: Math.max(1, t0 + L0 - t), last: true });
  } else if ((art.includes('tr') || ctx.trillSpan) && L >= 12) {
    const u = L >= 48 ? 6 : 4;
    const ps = [];
    for (let k = 0; k * u < L - u; k++) ps.push(k % 2 ? n.p : up);
    ps.push(n.p);
    seq(ps, u);
  } else if (art.includes('prall') && L >= 12) seq([n.p, upN, n.p], 4);
  else if (art.includes('mord') && L >= 12) seq([n.p, dn, n.p], 4);
  else if (art.includes('turn') && L >= 16) { const u = Math.min(8, Math.floor(L / 5)); seq([upN, n.p, dn, n.p], u); }
  else if (art.includes('iturn') && L >= 16) { const u = Math.min(8, Math.floor(L / 5)); seq([dn, n.p, upN, n.p], u); }
  else if (art.includes('trem') && L >= 12) { const u = tremU(n.trs); const ps = []; for (let k = 0; k * u < L - u; k++) ps.push(n.p); ps.push(n.p); seq(ps, u); }
  else out.push({ dt: t0, p: n.p, l: L, last: true });
  return out;
}
// 強弱記号・クレッシェンド・アーティキュレーション・スラーを音の大きさと長さに反映
const DYN_V = { ppp: 0.28, pp: 0.38, p: 0.5, mp: 0.6, mf: 0.72, f: 0.85, ff: 0.95, fff: 1, sf: 1, sfz: 1, fp: 0.85 };
function expression(tr) {
  const dyn = (tr.dyn || []).filter((d) => DYN_V[d.v]).sort((a, b) => a.t - b.t);
  const level = (t) => {
    let v = 0.72;
    for (const d of dyn) { if (d.t > t) break; if (d.v === 'sf' || d.v === 'sfz') continue; v = d.v === 'fp' && d.t < t ? 0.5 : DYN_V[d.v]; }
    return v;
  };
  const hp = tr.hairpins || [];
  const slurs = tr.slurs || [];
  return (n) => {
    let v = level(n.s);
    for (const h of hp) {
      if (n.s < h.s || n.s > h.e || h.e <= h.s) continue;
      const a = level(h.s);
      const nextD = dyn.find((d) => d.t >= h.e && d.t <= h.e + 96);
      const z = nextD ? DYN_V[nextD.v] : clamp(a + (h.type === 'cresc' ? 0.25 : -0.25), 0.25, 1);
      v = a + (z - a) * ((n.s - h.s) / (h.e - h.s));
    }
    if (dyn.some((d) => d.t === n.s && (d.v === 'sf' || d.v === 'sfz'))) v = 1;
    const art = n.art || [];
    let lf = 0.94;
    if (slurs.some((sl) => n.s >= sl.s && n.s < sl.e)) lf = 1.02;
    if (art.includes('ten')) lf = 1;
    if (art.includes('marc')) { v *= 1.3; lf = Math.min(lf, 0.7); }
    if (art.includes('acc')) v *= 1.25;
    if (art.includes('stac')) lf = 0.45;
    if (art.includes('stacc2')) lf = 0.25;
    if (art.includes('breath')) lf = Math.min(lf, 0.8);
    if (art.includes('caes')) lf = Math.min(lf, 0.6);
    if (art.includes('ferm')) lf = 1.6;
    return { v: clamp(v, 0.15, 1), lf };
  };
}
function audible(tr) {
  if (tr.mute) return false;
  const anySolo = song.tracks.some((t) => t.solo);
  return anySolo ? tr.solo : true;
}
/* ---------- じぶんの音（マイクで録った声・手びょうしを楽器にする） ----------
   song.voice = { sr, data（16bit を base64）, root: 60 }。ドレミの高さは、再生の速さを変えて出す */
Sound.INSTRUMENTS.myvoice = 'じぶんの音';
Sound.GM.myvoice = 53; // MIDI では「声」
let voiceCache = { key: '', buf: null };
function voiceBuffer(ctx) {
  const v = song.voice;
  if (!v || !v.data) return null;
  const key = v.data.length + ':' + v.data.slice(0, 40);
  if (voiceCache.key === key && voiceCache.buf) return voiceCache.buf;
  const bin = atob(v.data);
  const n = bin.length >> 1;
  const buf = ctx.createBuffer(1, n, v.sr);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) { let x = bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8); if (x >= 32768) x -= 65536; ch[i] = x / 32768; }
  voiceCache = { key, buf };
  return buf;
}
const rawPlayNote = Sound.playNote;
Sound.playNote = function (ctx, out, inst, midi, t, dur, vel, real) {
  if (inst !== 'myvoice') return rawPlayNote.apply(this, arguments);
  const buf = voiceBuffer(ctx);
  if (!buf) return rawPlayNote.call(this, ctx, out, 'piano', midi, t, dur, vel, real);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = Math.pow(2, (midi - ((song.voice && song.voice.root) || 60)) / 12);
  const g = ctx.createGain();
  const end = t + Math.max(0.08, dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel, t + 0.005);
  g.gain.setValueAtTime(vel, end - 0.04);
  g.gain.linearRampToValueAtTime(0, end);
  src.connect(g);
  g.connect(out);
  src.start(t);
  src.stop(end + 0.01);
};
// 録った音を、しずかな所を切って・大きさをそろえて・22kHz のモノラルにしてしまう
function storeVoice(buf) {
  const sr = 22050;
  const src = buf.getChannelData(0);
  const ratio = buf.sampleRate / sr;
  const n0 = Math.floor(src.length / ratio);
  const mono = new Float32Array(n0);
  for (let i = 0; i < n0; i++) {
    let x = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) x += buf.getChannelData(c)[Math.floor(i * ratio)];
    mono[i] = x / buf.numberOfChannels;
  }
  let peak = 0;
  for (const x of mono) peak = Math.max(peak, Math.abs(x));
  if (peak < 0.02) return false; // 音が小さすぎる
  const th = peak * 0.12;
  let a = 0;
  while (a < mono.length && Math.abs(mono[a]) < th) a++;
  a = Math.max(0, a - Math.round(sr * 0.01));
  const len = Math.min(mono.length - a, Math.round(sr * 1.5));
  const out = new Int16Array(len);
  const fade = Math.round(sr * 0.03);
  for (let i = 0; i < len; i++) {
    let x = (mono[a + i] / peak) * 0.9;
    if (i > len - fade) x *= (len - i) / fade;
    out[i] = Math.round(clamp(x, -1, 1) * 32767);
  }
  const bytes = new Uint8Array(out.buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  song.voice = { sr, data: btoa(bin), root: 60 };
  voiceCache = { key: '', buf: null };
  return true;
}
async function recordVoice(onState) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) throw new Error('このブラウザでは録音できません');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
  try {
    for (const n of [3, 2, 1]) { onState(String(n)); await new Promise((r) => setTimeout(r, 450)); }
    onState('●');
    const mr = new MediaRecorder(stream);
    const chunks = [];
    mr.ondataavailable = (e) => chunks.push(e.data);
    const done = new Promise((r) => (mr.onstop = r));
    mr.start();
    await new Promise((r) => setTimeout(r, 1800));
    mr.stop();
    await done;
    const ab = await new Blob(chunks).arrayBuffer();
    const buf = await audioCtx().decodeAudioData(ab);
    return buf;
  } finally { stream.getTracks().forEach((t) => t.stop()); }
}
function scheduleEvent(ctx, graph, e, when, withMetro) {
  if (e.kind === 'metro') { if (withMetro) Sound.click(ctx, graph.metro, when, e.acc, song.metro.kind); return; }
  if (e.alt) {
    // まとめた音：鳴らすパートだけで（2つなら1.4倍、3つなら1.7倍…）
    const on = [{ tr: e.tr, v: e.v }, ...e.alt].filter((x) => audible(x.tr) && (!graph.only || x.tr.id === graph.only));
    if (!on.length) return;
    const v = Math.min(1.3, Math.max(...on.map((x) => x.v)) * Math.sqrt(on.length));
    e = { ...e, tr: on[0].tr, v, alt: null };
  } else if (graph.only && (!e.tr || e.tr.id !== graph.only)) return;
  if (!audible(e.tr)) return;
  let out = graph.outs[e.tr.id];
  if (!out) {
    // 再生中に足したトラックも鳴らす
    out = ctx.createGain(); out.gain.value = e.tr.vol;
    if (ctx.createStereoPanner) { const pn = ctx.createStereoPanner(); pn.pan.value = clamp(+e.tr.pan || 0, -1, 1); out.connect(pn); pn.connect(graph.session); graph.pans[e.tr.id] = pn; } else out.connect(graph.session);
    graph.outs[e.tr.id] = out;
  }
  // 人が弾いたように、ほんの少しだけ時間（0〜6ミリ秒おそく）と強さ（±4%）をばらつかせる。毎回同じばらつき
  const hz = ((e.t * 73856093) ^ ((e.p != null ? e.p : 7) * 19349663) ^ (String(e.tr.id).length * 83492791)) >>> 0;
  const jt = HUMANIZE === true ? ((hz % 1000) / 1000) * 0.006 : 0;
  const jv = HUMANIZE ? 1 + (((hz >>> 10) % 1000) / 1000 - 0.5) * 0.08 : 1;
  const t = when + swingSec(e.t) + jt;
  const dur = e.kind === 'note' ? (absSec(e.t + e.l) - absSec(e.t)) * (e.lf || 0.96) : 0.5;
  graph.lastEnd = Math.max(graph.lastEnd || 0, t + dur);
  if (e.kind === 'note') Sound.playNote(ctx, out, e.inst || e.tr.inst, e.p, t, dur, e.v * jv, e.tr.real !== false, (e.lf || 0) > 1);
  else Sound.playDrum(ctx, out, e.id, t, e.v * jv, e.tr.real !== false);
}

let HUMANIZE = 'v'; // 強さだけばらつかせる（時間のばらつきは、音の計算が重くなるので使わない）
const player = { on: false, timer: null, graph: null, idx: 0, seg: null, segs: [], stopping: false, stopAt: 0, lastT: -1, ver: -1 };
function loopBounds() {
  if (ui.loopRange) {
    const a = clamp(ui.loopRange[0], 0, song.bars);
    const z = clamp(ui.loopRange[1], 0, song.bars);
    if (z <= a) { ui.loopRange = null; ui.loopOn = false; const bl = $('#btnLoop'); if (bl) bl.classList.remove('on'); }
    else ui.loopRange = [a, z];
  }
  if (ui.loopOn && ui.loopRange) return [barStart(ui.loopRange[0]), Math.min(barStart(ui.loopRange[1]), totalTicks())];
  return [0, playTotal()];
}
function firstIdx(list, t) { let i = 0; while (i < list.length && list[i].t < t) i++; return i; }
const cheered = new Set();
function cheer(force) {
  const n = song.tracks.reduce((a, t) => a + (t.notes ? t.notes.length : 0), 0);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!force && (n < 6 || cheered.has(song.title))) return;
  cheered.add(song.title);
  const box = document.createElement('div');
  box.className = 'confetti';
  const cols = ['#ff6b6b', '#ffd43b', '#51cf66', '#4dabf7', '#b197fc', '#ff8fd1'];
  for (let i = 0; i < 36; i++) {
    const c = document.createElement('i');
    c.style.left = Math.random() * 100 + '%';
    c.style.background = cols[i % cols.length];
    c.style.animationDelay = Math.random() * 0.4 + 's';
    c.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
    c.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    box.appendChild(c);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 2600);
}
/* ---------- はじめてのミッション（読むより、やってみる） ---------- */
const mission = { on: false, step: 0, base: 0 };
const MISSION = ['マス目をおして、音を3つ置こう', '▶ をおして、聴いてみよう', '「送る」で、ともだちに送ってみよう（送らずにとじてもOK）'];
const noteCount = () => song.tracks.reduce((a, t) => a + (t.notes ? t.notes.length : 0), 0);
function startMission() {
  if (NO_TOUR || lsGet('otsumiki-mission', '')) return false;
  lsSet('otsumiki-tour', '1'); // 読むツアーは、メニューからいつでも
  mission.on = true;
  mission.step = 0;
  mission.base = noteCount();
  renderMission();
  return true;
}
// いまやること の場所を光らせる（どこをおせばいいか、すぐわかるように）
const MISSION_AT = ['#editorWrap', '#btnPlay', '#btnShare'];
function missionGlow(done) {
  $$('.missionGlow').forEach((e) => e.classList.remove('missionGlow'));
  if (!mission.on || done) return;
  let sel = MISSION_AT[mission.step];
  if (mission.step === 0 && ui.view === 'score') sel = '#scoreEditView';
  const el = sel && document.querySelector(sel);
  if (el && el.offsetParent !== null) el.classList.add('missionGlow');
}
function renderMission(done) {
  let box = $('#mission');
  missionGlow(done);
  if (!mission.on) { if (box) box.remove(); return; }
  if (!box) { box = document.createElement('div'); box.id = 'mission'; box.className = 'mission'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
  box.innerHTML = `<b>${done ? 'ミッションクリア！ 🎉' : 'はじめてのミッション'}</b><ol>${MISSION.map((m, i) => `<li class="${i < mission.step ? 'ok' : i === mission.step ? 'now' : ''}">${i < mission.step ? '✅' : i === mission.step ? '👉' : '・'} ${m}</li>`).join('')}</ol>${done ? '<p>これで作曲家の仲間入り！ 次は、楽器えらびのいちばん上「じぶんの音」で、声や手びょうしを楽器にしてみよう🎤</p>' : ''}<button class="mini" id="missionClose">${done ? 'とじる' : 'あとでやる'}</button>`;
  $('#missionClose').onclick = () => { mission.on = false; lsSet('otsumiki-mission', '1'); renderMission(); };
}
function missionCheck(ev) {
  if (!mission.on) return;
  const before = mission.step;
  if (mission.step === 0 && noteCount() - mission.base >= 3) mission.step = 1;
  if (mission.step === 1 && ev === 'play') mission.step = 2;
  if (mission.step === 2 && ev === 'share') mission.step = 3;
  if (mission.step === before) return;
  if (mission.step >= 3) {
    lsSet('otsumiki-mission', '1');
    renderMission(true);
    cheer(true);
    setTimeout(() => { mission.on = false; renderMission(); }, 6000);
  } else renderMission();
}
function play() {
  const ctx = ensureAudio();
  const fresh = !player.on;
  setTimeout(() => missionCheck('play'), 0);
  if (fresh) setTimeout(cheer, 200);
  if (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent))) {
    if (lsGet('otsumiki-silenthint', '') !== '1') { lsSet('otsumiki-silenthint', '1'); setTimeout(() => toast('音が出ないときは、マナーモード（横のスイッチ）を切ってね', 5000), 400); }
  }
  stop(true);
  const [ls, le] = loopBounds();
  player.graph = buildGraph(ctx, ctx._comp, true);
  player.on = true;
  document.querySelector('#scoreEditView .scpos')?.remove();
  player.stopping = false;
  if (fresh && ui.view === 'score' && ui.sc.cursor != null && ui.sc.cursor < totalTicks()) ui.startTick = barStart(barOf(ui.sc.cursor));
  let st0 = playTickOf(ui.startTick);
  if (st0 === 0 && song.pickup > 0 && !(ui.loopOn && ui.loopRange)) st0 = barLen(0) - song.pickup; // 弱起は休みをとばす
  const start = st0 >= ls && st0 < le ? st0 : ls;
  playSpeed = ui.speed || 1;
  // カウント（はじめる前にメトロノームで1〜2小節）
  let lead = 0;
  if (fresh && ui.countIn > 0) {
    const b0 = barOf(srcTick(start));
    const beat = beatAt(b0);
    const per = Math.max(1, Math.round(barLen(b0) / beat));
    const n = per * ui.countIn;
    const sec = (60 / (bpmAt(b0) * TPQ * playSpeed)) * beat;
    for (let i = 0; i < n; i++) {
      const when = ctx.currentTime + 0.08 + i * sec;
      Sound.click(ctx, player.graph.metro, when, i % per === 0, song.metro.kind);
      const left = n - i;
      setTimeout(() => { if (player.on) countHud(left); }, (when - ctx.currentTime) * 1000);
    }
    lead = n * sec + 0.03;
    setTimeout(() => countHud(0), (lead + 0.05) * 1000);
  }
  eventList(); // 音の表を先に作ってから、はじめる時間を決める（作っている間に、はじめの音の時間が来てしまわないように）
  player.seg = { tick: start, time: ctx.currentTime + (LOW_POWER ? 0.2 : 0.05) + lead };
  player.segs = [player.seg];
  player.tt = null;
  player.idx = firstIdx(eventList(), start);
  player.lastT = start - 1;
  player.ver = version;
  player.timer = setInterval(tick, 25);
  tick();
  document.body.classList.add('playing');
  $('#btnPlay').classList.add('on');
  $('#btnPlay').innerHTML = I('pause');
  requestAnimationFrame(anim);
}
const timeOf = (t) => player.seg.time + absSec(t) - absSec(player.seg.tick);
function tick() { if (player.on) holdGeo(tickBody); }
// 重い書きなおしの前に、先の音までまとめて予約しておく（書きなおしている間も音がとぎれないように）
function scheduleAhead(sec) { if (player.on) holdGeo(() => tickBody(sec)); }
function tickBody(ahead) {
  const ctx = actx;
  if (!player.on) return;
  if (player.stopping) { if (ctx.currentTime > player.stopAt) stop(); return; }
  const list = eventList();
  if (player.ver !== version) { player.ver = version; player.idx = firstIdx(list, player.lastT + 1); }
  // 再生中にテンポを変えたら、もう鳴らした所はそのままに、そこから先を新しいテンポで（音がいっぺんに鳴らないように）
  const tt = timeTable();
  const psKey = playStarts().join(',');
  if (player.tt && player.tt !== tt && player.psKey === psKey && player.lastT >= player.seg.tick) {
    const old = player.tt;
    const ps = playStarts();
    const at = (tb, x) => { const b = playBarOf(x); return tb.start[b] + (x - ps[b]) * tb.spt[b]; };
    const time = player.seg.time + at(old, player.lastT) - at(old, player.seg.tick);
    player.seg = { tick: player.lastT, time };
    player.segs.push(player.seg);
    if (player.segs.length > 4) player.segs.shift();
  }
  player.tt = tt; player.psKey = psKey;
  // どれだけ先の音まで予約しておくか。スマホは多め（楽譜の画面は書きなおしで止まることがあるので、さらに多め）
  const horizon = ctx.currentTime + (ahead || (LOW_POWER ? (ui.view === 'score' ? 1.0 : 0.6) : 0.3));
  let nSched = 0;
  for (let guard = 0; guard < 8; guard++) {
    const [ls, le] = loopBounds();
    while (player.idx < list.length && list[player.idx].t < le) {
      const e = list[player.idx];
      if (e.t < player.seg.tick) { player.idx++; continue; }
      const tm = timeOf(e.t);
      if (tm >= horizon) return;
      // 一度にたくさん予約すると画面が止まるので、すぐ鳴らす音でなければ次の回に（25ミリ秒ごとに呼ばれる）
      if (!ahead && ++nSched > 48 && tm > ctx.currentTime + (LOW_POWER ? 0.5 : 0.15)) return;
      scheduleEvent(ctx, player.graph, e, tm, ui.metro);
      player.lastT = e.t;
      player.idx++;
    }
    const endT = timeOf(le);
    if (endT >= horizon) return;
    if (ui.loopOn) {
      player.seg = { tick: ls, time: endT };
      player.segs.push(player.seg);
      if (player.segs.length > 4) player.segs.shift();
      player.idx = firstIdx(list, ls);
      player.lastT = ls - 1;
    } else {
      player.stopping = true;
      // さいごの音（フェルマータなど）がなり終わるまで待ってから止める
      player.stopAt = Math.max(endT, Math.min(endT + 8, (player.graph && player.graph.lastEnd) || 0) + 0.4) + 0.05;
      return;
    }
  }
}
function stop(silent = false) {
  if (rec.on && !silent) recStop();
  if (ui.view === 'score') setTimeout(() => highlightScore(null), 0);
  if (player.timer) clearInterval(player.timer);
  player.timer = null;
  if (player.graph && actx) {
    const gph = player.graph;
    const now = actx.currentTime;
    for (const n of [gph.session, gph.metro]) n.gain.setTargetAtTime(0, now, 0.02);
    fxApply(null, 0, 0, false, gph);
    setTimeout(() => { gph.session.disconnect(); gph.send.disconnect(); gph.metro.disconnect(); }, 300);
  }
  player.graph = null;
  player.on = false;
  document.body.classList.remove('playing');
  playSpeed = 1;
  if ($('#karaoke')) { $('#karaoke').hidden = true; karaKey = ''; }
  countHud(0);
  player.segs = [];
  if (!silent) {
    $('#btnPlay').classList.remove('on');
    $('#btnPlay').innerHTML = I('play');
    draw();
    drawOverview();
    updateMini();
    vizFade();
  }
}
/* ---------- ビジュアライザー（ミニディスプレイの中で、音に合わせて動く光の柱） ---------- */
let vizBuf = null;
let vizPeak = null;
let vizFadeRaf = 0;
function drawViz(fade) {
  const cv = $('#viz');
  if (!cv || !actx || !actx._an) return false;
  const dpr = devicePixelRatio || 1;
  const w = cv.clientWidth;
  const h = cv.clientHeight;
  if (!w || !h) return false;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const an = actx._an;
  if (!vizBuf) vizBuf = new Uint8Array(an.frequencyBinCount);
  an.getByteFrequencyData(vizBuf);
  const N = Math.max(12, Math.min(40, Math.floor(w / 7)));
  if (!vizPeak || vizPeak.length !== N) vizPeak = new Float32Array(N);
  const bw = w / N;
  const cs = getComputedStyle(document.documentElement);
  const c1 = cs.getPropertyValue('--accent').trim() || '#6d5dfc';
  const c2 = cs.getPropertyValue('--accent2').trim() || '#b45cff';
  const gr = g.createLinearGradient(0, h, 0, 0);
  gr.addColorStop(0, c1);
  gr.addColorStop(1, c2);
  let any = false;
  for (let i = 0; i < N; i++) {
    // 低い音から高い音へ、耳に近い並び（対数）でひろう
    const a = Math.floor(Math.pow(i / N, 1.7) * vizBuf.length * 0.7);
    const z = Math.max(a + 1, Math.floor(Math.pow((i + 1) / N, 1.7) * vizBuf.length * 0.7));
    let m = 0;
    for (let j = a; j < z; j++) m = Math.max(m, vizBuf[j]);
    let v = m / 255;
    if (fade) v = Math.min(v, vizPeak[i] * 0.86);
    vizPeak[i] = Math.max(v, vizPeak[i] * 0.93);
    if (vizPeak[i] > 0.01) any = true;
    const bh = Math.max(1.5, v * h * 0.95);
    g.fillStyle = gr;
    g.globalAlpha = 0.85;
    g.fillRect(i * bw + 1, h - bh, bw - 2, bh);
    g.globalAlpha = 1;
    g.fillStyle = c2;
    g.fillRect(i * bw + 1, h - vizPeak[i] * h * 0.95 - 2, bw - 2, 1.5);
  }
  return any;
}
// 止めたら、光の柱がすーっと下がって消える
function vizFade() {
  cancelAnimationFrame(vizFadeRaf);
  const step = () => { vizFadeRaf = !player.on && drawViz(true) ? requestAnimationFrame(step) : 0; };
  vizFadeRaf = requestAnimationFrame(step);
}
// 発表モード：歌詞を大きく（いま歌うところを光らせる）。歌詞があるいちばん上のメロディで
let karaKey = '';
function karaoke(pos) {
  const box = $('#karaoke');
  if (!box) return;
  const tr = song.tracks.find((t) => t.type === 'melody' && t.notes.some((n) => n.ly));
  if (!tr || pos == null) { if (karaKey) { box.innerHTML = ''; box.hidden = true; karaKey = ''; } return; }
  const b = barOf(Math.max(0, pos));
  const a = barStart(b);
  const z = barStart(Math.min(song.bars, b + 2));
  const syl = tr.notes.filter((n) => n.ly && n.s >= a && n.s < z).sort((x, y) => x.s - y.s);
  const now = syl.filter((n) => n.s <= pos).pop();
  const key = b + ':' + (now ? now.s : -1);
  if (key === karaKey) return;
  karaKey = key;
  box.hidden = !syl.length;
  box.innerHTML = syl.map((n) => `<span class="${n === now ? 'now' : n.s < pos ? 'done' : ''}${n.s >= barStart(b + 1) ? ' next' : ''}">${escapeHtml(n.ly)}</span>`).join('');
}
function countHud(n) {
  const h = $('#countHud');
  if (!h) return;
  h.textContent = n || '';
  h.classList.toggle('show', !!n);
  if (n) { h.classList.remove('pop'); void h.offsetWidth; h.classList.add('pop'); }
}
function playheadPlay() {
  if (!player.on || !actx) return null;
  const now = actx.currentTime;
  let seg = null;
  for (const s of player.segs) if (s.time <= now) seg = s;
  if (!seg) return null;
  const t = tickAtSec(absSec(seg.tick) + now - seg.time);
  return Math.min(t, playTotal() - 1);
}
// 再生位置（楽譜の上の位置にもどしたもの）
function playheadTick() {
  const t = playheadPlay();
  return t == null ? null : srcTick(t);
}
function anim() {
  if (!player.on) return;
  holdGeo(animBody);
  requestAnimationFrame(anim);
}
let animLast = 0;
let animN = 0;
const animVis = { t: 0, grid: true, ov: true };
function animBody() {
  // スマホ・タブレットでは、画面の書きかえは1秒に30回まで（音の計算に力をのこす）
  const now = performance.now();
  if (LOW_POWER && now - animLast < 30) return;
  animLast = now;
  // 見えていないもの（楽譜の画面のときのマス目など）は書かない。見えているかは0.5秒ごとに調べる
  if (now - animVis.t > 500) { animVis.t = now; animVis.grid = cv.clientWidth > 0 && cv.offsetParent !== null; animVis.ov = ov.offsetParent !== null; }
  const pos = playheadTick();
  if (pos != null && ui.follow) {
    const sc = $('#scroller');
    const x = LW + pos * ppt();
    if (x - sc.scrollLeft > sc.clientWidth - 40 || x - sc.scrollLeft < LW) sc.scrollLeft = Math.max(0, x - LW - 20);
  }
  if (animVis.grid) draw(pos, true);
  if (animVis.ov) {
    // 曲の地図も、いま鳴っている所が見えるように動かす
    if (pos != null && ui.follow) {
      const o = $('#ovScroller');
      if (o.scrollWidth > o.clientWidth + 2) {
        const b = barOf(pos);
        const x = OV_LW + (b + (pos - barStart(b)) / barLen(b)) * ovBarW();
        if (x - o.scrollLeft > o.clientWidth - 30 || x - o.scrollLeft < OV_LW) o.scrollLeft = Math.max(0, x - OV_LW - 40);
      }
    }
    drawOverview(pos);
  }
  updateMini(pos);
  // 上の小さな波形：スマホでは3コマに1回（1秒に10回くらい）
  if (!LOW_POWER || (animN = (animN + 1) % 3) === 0) drawViz();
  if (document.body.classList.contains('present')) karaoke(pos);
  if (ui.view === 'score') highlightScore(pos);
  if (typeof proFrame === 'function') proFrame(pos);
}
function liveVolume(tr) {
  if (player.graph && player.graph.outs[tr.id]) player.graph.outs[tr.id].gain.setTargetAtTime(tr.vol, actx.currentTime, 0.02);
}
function preview(tr, p, dur = 0.35) {
  const ctx = ensureAudio();
  const real = tr.real !== false;
  if (tr.type === 'drum') Sound.playDrum(ctx, previewOut, p, ctx.currentTime, 0.8, real);
  else Sound.playNote(ctx, previewOut, tr.inst, p, ctx.currentTime, dur, 0.8 * tr.vol + 0.2, real);
}
// 本物の楽器の録音を前もって読み込む（読み込み中は電子音で鳴ります）
function audioCtx() {
  if (!actx) ensureAudio();
  return actx;
}
const loadingNow = new Set();
// 開いただけでは読みこまない（重くしない）。画面に最初にさわったときに読みはじめる
let userActed = false;
let preloadWaiting = false;
const firstTouch = () => {
  if (userActed) return;
  userActed = true;
  removeEventListener('pointerdown', firstTouch, true);
  removeEventListener('keydown', firstTouch, true);
  if (preloadWaiting) setTimeout(preloadSamples, 0);
};
addEventListener('pointerdown', firstTouch, true);
addEventListener('keydown', firstTouch, true);
function preloadSamples() {
  if (!userActed) { preloadWaiting = true; return; }
  const ctx = audioCtx();
  const jobs = [];
  for (const tr of song.tracks) {
    if (tr.real === false) continue;
    if (tr.type === 'drum') { if (!Sound.Samples.drumsReady()) jobs.push(['drums', () => Sound.Samples.loadDrums(ctx)]); }
    else for (const inst of trackInsts(tr)) if (Sound.Samples.has(inst) && !Sound.Samples.ready(inst)) {
      // 曲で使っている高さの録音だけを先に読む（あとから使う高さは、鳴らすときに読みます）
      const ps = tr.type === 'melody' ? tr.notes.filter((n) => instAt(tr, n.s) === inst).map((n) => n.p) : chordEvents(tr).map((e) => e.p);
      const notes = ps.length ? [...new Set(ps)] : undefined;
      jobs.push([inst, () => Sound.Samples.load(inst, ctx, notes)]);
    }
  }
  for (const [key, fn] of jobs) {
    if (loadingNow.has(key)) continue;
    loadingNow.add(key);
    loadQueue = loadQueue.then(fn).then(() => { loadingNow.delete(key); renderTracksSoon(); }).catch(() => { loadingNow.delete(key); toast('録音の読み込みに失敗したので、電子音で鳴らします'); });
  }
}
let loadQueue = Promise.resolve();
// 録音が読めるたびに一覧を書きなおすと重いので、まとめて1回（再生中は、止まったあとか、2秒おきに）
let rtTimer = 0;
function renderTracksSoon() {
  if (rtTimer) return;
  rtTimer = setTimeout(() => {
    rtTimer = 0;
    const go = () => renderTracks();
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 2000 }); else go();
  }, player.on ? 2000 : 300);
}

/* ============================================================
   エディタ（オトグラフ）の描画
   ============================================================ */
let LW = 82;
const RH = 30;
const cv = $('#cv');
const g2 = cv.getContext('2d');

function kitRows(tr) {
  const kit = Sound.KITS.find((k) => k.id === tr.kit) || Sound.KITS[0];
  const ids = [...kit.list];
  for (const id in tr.grid) if (!ids.includes(id) && Sound.DRUMS[id]) ids.unshift(id);
  return ids;
}
function rowsFor(tr) {
  if (tr.type === 'drum') return kitRows(tr).map((id) => ({ id, label: Sound.DRUMS[id].name }));
  if (tr.type === 'chord') return [{ id: 'chord', label: 'コード' }];
  const [lo, hi] = trackRange(tr);
  const pcs = ui.chromatic ? new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) : scalePcs();
  const inSc = scalePcs();
  const used = new Set(tr.notes.map((n) => n.p));
  const rows = [];
  for (let m = hi; m >= lo; m--) if (pcs.has(m % 12) || used.has(m)) rows.push({ id: m, p: m, inScale: inSc.has(m % 12) });
  for (const p of used) if ((p > hi || p < lo) && !rows.some((r) => r.p === p)) rows.push({ id: p, p, inScale: inSc.has(p % 12) });
  rows.sort((a, b) => b.p - a.p);
  return rows;
}
const DRUM_SHORT = { バスドラム: 'バスドラ', クローズハイハット: 'ハイハット', オープンハイハット: 'オープンHH', ライドシンバル: 'ライド', クラッシュシンバル: 'クラッシュ', 合わせシンバル: 'シンバル', '長胴太鼓（フチ打ち）': 'フチ打ち', '大太鼓（ばち）': '大太鼓', 'クラップ（手拍子）': '手拍子' };
function shortDrum(name) { return DRUM_SHORT[name] || name.replace(/（(低|高|ミュート)）/, '$1').replace(/（.*?）/g, ''); }
function rowH(tr) {
  if (tr.type === 'chord') return 70;
  // リズムは行が少ないので、画面に余りがあれば行を高くして、たていっぱいに使う（タブレットで押しやすい）
  if (tr.type === 'drum') {
    const h = $('#editorWrap').clientHeight - RH - 6;
    const n = kitRows(tr).length;
    if (n && h > 0) return Math.max(ui.rh, Math.min(56, Math.floor((h / n) * 10) / 10));
  }
  return ui.rh;
}

function resizeEditor() {
  const wrap = $('#editorWrap');
  const tr = track();
  const rows = rowsFor(tr);
  const spacer = $('#spacer');
  spacer.style.width = LW + totalTicks() * ppt() + 60 + 'px';
  spacer.style.height = RH + rows.length * rowH(tr) + 4 + (dynLaneOn(tr) ? DYN_LANE_H : 0) + 'px';
  fitCanvas(cv, wrap);
}
function fitCanvas(c, wrap) {
  const dpr = window.devicePixelRatio || 1;
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    c.style.width = w + 'px';
    c.style.height = h + 'px';
  }
}
function roundRect(g, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
let cssCache = null;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
// 置いた音が「きらっ」と光る（0.4秒）
const fxNotes = new Map();
let fxRaf = 0;
function sparkle(n) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  fxNotes.set(n, performance.now());
  if (!fxRaf) {
    const loop = () => { draw(); fxRaf = fxNotes.size ? requestAnimationFrame(loop) : 0; };
    fxRaf = requestAnimationFrame(loop);
  }
}
// 色を明るく（amt>0）・暗く（amt<0）する
const shadeCache = new Map();
function shade(hex, amt) {
  const key = hex + amt;
  if (shadeCache.has(key)) return shadeCache.get(key);
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt));
  const out = `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  shadeCache.set(key, out);
  return out;
}
function C(n) {
  if (!cssCache) cssCache = getComputedStyle(document.documentElement);
  return cssCache.getPropertyValue(n).trim();
}
let highlightRow = null;

// マス目の左に出す打楽器の絵（SVG を画像にして、とっておく。色がかわったら作りなおす）
const drumIconCache = new Map();
let drumIconWait = 0;
function drumIcon(id) {
  if (typeof InstIcons === 'undefined' || !InstIcons.drum) return null;
  const col = C('--text') || '#222', fill = C('--ii-fill') || '#e0e7ff';
  const key = id + '|' + col + '|' + fill;
  let im = drumIconCache.get(key);
  if (!im) {
    const svg = InstIcons.drum(id).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace('width="100%" height="100%"', 'width="96" height="96"')
      .replace(/currentColor/g, col).replace(/var\(--ii-fill,[^)]*\)/g, fill);
    im = new Image();
    im.onload = () => {
      // 読みこめたら、まとめて1回だけ描きなおす
      if (drumIconWait) return;
      drumIconWait = requestAnimationFrame(() => { drumIconWait = 0; drawCache.key = ''; draw(); });
    };
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    drumIconCache.set(key, im);
    if (drumIconCache.size > 400) drumIconCache.delete(drumIconCache.keys().next().value);
  }
  return im.complete && im.naturalWidth ? im : null;
}

// 再生中のマス目：毎コマ全部を描きなおすと重いので、描いた絵をとっておき、
// 変わらないあいだは「とっておいた絵＋動く線」だけにする（鳴っている音が変わったとき・画面が動いたときに描きなおす）
const drawCache = { cv: null, key: '', px: null };
let drawSerial = 0;
function litSig(tr, pos) {
  if (tr.type !== 'melody') return 'q' + Math.floor(pos / 6);
  let sg = '';
  let pop = false;
  const ns = tr.notes;
  for (let i = 0; i < ns.length; i++) { const n = ns[i]; if (pos >= n.s && pos < n.s + n.l) { sg += i + ','; if (pos - n.s < 12) pop = true; } }
  return pop && !REDUCED && !LOW_POWER ? null : sg; // ふくらむ動きの間は、毎コマ描く（絵はとっておかない）
}
function drawPlayhead(px, W, H) {
  g2.save();
  g2.beginPath(); g2.rect(LW, RH, W - LW, H - RH); g2.clip();
  const tl = g2.createLinearGradient(px - 90, 0, px, 0);
  tl.addColorStop(0, 'rgba(0,0,0,0)');
  tl.addColorStop(1, C('--trail'));
  g2.fillStyle = tl;
  g2.fillRect(px - 90, RH, 90, H);
  g2.strokeStyle = C('--playhead');
  g2.lineWidth = 2;
  if (!LOW_POWER) { g2.shadowColor = C('--playhead'); g2.shadowBlur = 10; } // 光のにじみは重いので、スマホではつけない
  g2.beginPath(); g2.moveTo(px, RH); g2.lineTo(px, H); g2.stroke();
  g2.shadowBlur = 0;
  g2.restore();
  g2.save();
  g2.beginPath(); g2.rect(LW, 0, W - LW, RH); g2.clip();
  g2.fillStyle = C('--playhead');
  g2.fillRect(px - 1, 0, 2, RH);
  g2.restore();
}
function draw(playPos, fromAnim) {
  if (playPos === undefined) playPos = playheadTick();
  if (!fromAnim && typeof instPanelLight === 'function' && instPanelOn) setTimeout(() => instPanelLight(), 0);
  const tr = track();
  if (!tr) return;
  const sc = $('#scroller');
  const dpr = window.devicePixelRatio || 1;
  const W = cv.width / dpr;
  const H = cv.height / dpr;
  const sx = sc.scrollLeft;
  const sy = sc.scrollTop;
  const k = ppt();
  const rh = rowH(tr);
  if (!fromAnim) drawSerial++;
  const lit = fromAnim && playPos != null ? litSig(tr, playPos) : null;
  const cacheKey = lit != null ? [version, cur, sx, sy, cv.width, cv.height, k, rh, drawSerial, lit].join('|') : '';
  if (cacheKey && drawCache.cv && drawCache.key === cacheKey && drawCache.cv.width > 0 && drawCache.cv.height > 0) {
    // とっておいた絵から、前の線があった所と今度の線の所だけをもどして、線を書く（全面をコピーしない）
    const px = LW + playPos * k - sx;
    const a = Math.max(0, Math.floor((Math.min(px, drawCache.px) - 112) * dpr));
    const z = Math.min(cv.width, Math.ceil((Math.max(px, drawCache.px) + 26) * dpr));
    g2.setTransform(1, 0, 0, 1, 0, 0);
    if (drawCache.px == null || z - a > cv.width * 0.6) g2.drawImage(drawCache.cv, 0, 0);
    else if (z > a) g2.drawImage(drawCache.cv, a, 0, z - a, cv.height, a, 0, z - a, cv.height);
    g2.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPlayhead(px, W, H);
    drawCache.px = px;
    return;
  }
  const rows = rowsFor(tr);
  const total = totalTicks();
  const bt = barTicks();
  const bs = beatTicks();
  const X = (t) => LW + t * k - sx;

  g2.setTransform(dpr, 0, 0, dpr, 0, 0);
  g2.fillStyle = C('--grid-bg');
  g2.fillRect(0, 0, W, H);
  const t0 = Math.max(0, Math.floor(sx / k));
  const t1 = Math.min(total, Math.ceil((sx + W - LW) / k) + 1);
  const r0 = Math.max(0, Math.floor(sy / rh));
  const r1 = Math.min(rows.length, Math.ceil((sy + H - RH) / rh) + 1);

  g2.save();
  g2.beginPath(); g2.rect(LW, RH, W - LW, H - RH); g2.clip();
  for (let r = r0; r < r1; r++) {
    const y = RH + r * rh - sy;
    const row = rows[r];
    let bg = r % 2 ? C('--row-a') : C('--row-b');
    if (tr.type === 'melody') {
      if (row.p % 12 === song.key) bg = C('--row-tonic');
      if (!row.inScale) bg = C('--row-out');
    }
    if (highlightRow != null && row.id === highlightRow) bg = C('--row-hl');
    g2.fillStyle = bg;
    g2.fillRect(LW, y, W - LW, rh);
  }
  for (let b = barOf(t0); b < song.bars && barStart(b) < t1; b++) {
    if (b % 2) { g2.fillStyle = C('--bar-shade'); g2.fillRect(X(barStart(b)), RH, barLen(b) * k, H); }
  }
  if (ui.sel.t === cur) {
    g2.fillStyle = C('--sel');
    g2.fillRect(X(barStart(ui.sel.b0)), RH, (barStart(ui.sel.b1 + 1) - barStart(ui.sel.b0)) * k, 4);
  }
  if (X(total) < W) { g2.fillStyle = C('--outside'); g2.fillRect(X(total), RH, W - X(total), H); }
  for (let b = barOf(t0); b <= song.bars && barStart(b) <= t1; b++) {
    const bx = barStart(b);
    const bt = b < song.bars ? barLen(b) : 0;
    const bs = b < song.bars ? beatAt(b) : 48;
    if (ui.grid * k >= 6 && b < song.bars) {
      g2.strokeStyle = C('--line-step');
      g2.lineWidth = 1;
      g2.beginPath();
      for (let s = ui.grid; s < bt; s += ui.grid) { const x = Math.round(X(bx + s)) + 0.5; g2.moveTo(x, RH); g2.lineTo(x, H); }
      g2.stroke();
    }
    if (b < song.bars) {
      g2.strokeStyle = C('--line-beat');
      g2.lineWidth = 1;
      g2.beginPath();
      for (let s = bs; s < bt; s += bs) { const x = Math.round(X(bx + s)) + 0.5; g2.moveTo(x, RH); g2.lineTo(x, H); }
      g2.stroke();
    }
    g2.strokeStyle = C('--line-bar');
    g2.lineWidth = 2;
    g2.beginPath(); g2.moveTo(Math.round(X(bx)) + 0.5, RH); g2.lineTo(Math.round(X(bx)) + 0.5, H); g2.stroke();
  }
  g2.strokeStyle = C('--line-step');
  g2.lineWidth = 1;
  g2.beginPath();
  for (let r = r0; r <= r1; r++) { const y = RH + r * rh - sy + 0.5; g2.moveTo(LW, y); g2.lineTo(W, y); }
  g2.stroke();

  const rowIndex = new Map(rows.map((r, i) => [r.id, i]));
  const playing = playPos != null ? playPos : -1;

  if (tr.type === 'melody') {
    if (ui.ghost) song.tracks.forEach((o, oi) => {
      if (o === tr || o.type !== 'melody') return;
      g2.strokeStyle = TRACK_COLORS[oi % TRACK_COLORS.length];
      g2.setLineDash([4, 3]);
      g2.lineWidth = 1.5;
      for (const n of o.notes) {
        const ri = rowIndex.get(n.p);
        if (ri == null) continue;
        const x = X(n.s);
        if (x > W || x + n.l * k < LW) continue;
        roundRect(g2, x + 2, RH + ri * rh - sy + 3, n.l * k - 4, rh - 6, 5);
        g2.stroke();
      }
      g2.setLineDash([]);
    });
    g2.font = `bold ${Math.min(13, rh - 8)}px sans-serif`;
    g2.textBaseline = 'middle';
    for (const n of tr.notes) {
      const ri = rowIndex.get(n.p);
      if (ri == null) continue;
      const x = X(n.s);
      const y = RH + ri * rh - sy;
      const w = n.l * k;
      if (x > W || x + w < LW || y > H || y + rh < RH) continue;
      const on = playing >= n.s && playing < n.s + n.l;
      // 鳴りはじめに少しふくらむ（動きを減らす設定のときはしない）
      const pop = on && !REDUCED && !LOW_POWER ? Math.max(0, 1 - (playing - n.s) / 12) * 3 : 0;
      if (pop) { g2.save(); g2.translate(x + w / 2, y + rh / 2); g2.scale(1 + pop / Math.max(20, w), 1 + pop / rh); g2.translate(-(x + w / 2), -(y + rh / 2)); }
      {
        const col = PC_COLORS[n.p % 12];
        const gr = g2.createLinearGradient(0, y, 0, y + rh);
        gr.addColorStop(0, shade(col, 0.28));
        gr.addColorStop(1, col);
        g2.fillStyle = gr;
        if (on) { g2.shadowColor = col; g2.shadowBlur = 14; }
        roundRect(g2, x + 1.5, y + 1.5, w - 3, rh - 3, 6);
        const vel = n.vel || 1;
        if (vel < 1) g2.globalAlpha = 0.35 + 0.65 * vel;
        g2.fill();
        g2.globalAlpha = 1;
        g2.shadowBlur = 0;
        // 強さのしるし（下のはしの線の長さ）
        if (vel !== 1 && w > 14) { g2.fillStyle = vel > 1 ? 'rgba(0,0,0,.55)' : 'rgba(0,0,0,.3)'; g2.fillRect(x + 4, y + rh - 5, Math.max(3, (w - 10) * Math.min(1, vel / 1.25)), 2); }
      }
      const picked = nsel.has(n);
      g2.lineWidth = on ? 3 : picked ? 2.5 : 1;
      g2.strokeStyle = on ? '#fff' : picked ? C('--accent2') : 'rgba(0,0,0,.18)';
      if (picked && !on) { g2.shadowColor = C('--accent2'); g2.shadowBlur = 8; }
      g2.stroke();
      g2.shadowBlur = 0;
      // 下の声部（声部2）の音は点線のふち
      if (n.v === 2 && !on) { g2.setLineDash([4, 3]); g2.lineWidth = 2; g2.strokeStyle = 'rgba(0,0,0,.6)'; g2.stroke(); g2.setLineDash([]); }
      if (n.s + n.l > total) { g2.fillStyle = 'rgba(0,0,0,.3)'; g2.fill(); }
      const fx = fxNotes.get(n);
      if (fx != null) {
        const a = (performance.now() - fx) / 420;
        if (a >= 1) fxNotes.delete(n);
        else {
          const g = 3 + a * 9;
          g2.save();
          g2.globalAlpha = 1 - a;
          g2.lineWidth = 2.5;
          g2.strokeStyle = PC_COLORS[n.p % 12];
          roundRect(g2, x + 1.5 - g, y + 1.5 - g, w - 3 + g * 2, rh - 3 + g * 2, 8 + g);
          g2.stroke();
          g2.restore();
        }
      }
      // 装飾・記号のしるし（右上に小さく）。装飾音符は、その高さの行に小さな丸
      const bdg = ornBadge(n, tr);
      let bw = 0;
      if (bdg && w > 16 && rh >= 13) {
        g2.save();
        g2.font = `bold ${Math.min(11, rh - 5)}px sans-serif`;
        g2.textAlign = 'right';
        bw = Math.min(w - 10, g2.measureText(bdg).width + 3);
        g2.fillStyle = 'rgba(20,20,40,.82)';
        g2.fillText(bdg, x + w - 8, y + rh / 2 + 1, w - 12);
        g2.restore();
      }
      if (w > 24) { g2.fillStyle = '#1b1b1b'; g2.fillText(noteName(n.p), x + 6, y + rh / 2 + 1, Math.max(8, w - 12 - bw)); }
      if (n.gr != null && rh >= 8) {
        const gl = grList(n);
        gl.forEach((gp, gi) => {
          const gri = rowIndex.get(gp);
          if (gri == null) return;
          const gx = x - 5 - (gl.length - 1 - gi) * 8;
          const gy = RH + gri * rh - sy + rh / 2;
          g2.beginPath();
          g2.arc(gx, gy, Math.max(2.5, Math.min(4.5, rh / 4)) * (n.grl ? 1.3 : 1), 0, Math.PI * 2);
          g2.fillStyle = PC_COLORS[gp % 12];
          g2.fill();
          g2.lineWidth = 1;
          g2.strokeStyle = 'rgba(0,0,0,.55)';
          g2.stroke();
        });
      }
      if (pop) g2.restore();
      if (w > 12) { g2.fillStyle = 'rgba(0,0,0,.25)'; g2.fillRect(x + w - 6, y + 5, 3, rh - 10); }
    }
  }
  // まだ音がないときは、まん中にやさしい案内
  if ((tr.type === 'melody' && !tr.notes.length) || (tr.type === 'drum' && !Object.values(tr.grid).some((g) => Object.keys(g).length))) {
    if (!player.on && !locked(tr)) {
      const msg = tr.type === 'drum' ? 'マスをおして、リズムを置いてみよう' : 'マス目をおして、音を置いてみよう ♪';
      const sub = tr.type === 'drum' ? '下ほど低い太鼓、上ほど高いシンバルです' : '右へなぞると長い音に。上の「おまかせ」で自動作曲もできます';
      const cx = LW + (W - LW) / 2;
      const cy = RH + (H - RH) / 2;
      g2.save();
      g2.textAlign = 'center';
      g2.textBaseline = 'middle';
      const bw = Math.min(W - LW - 24, 440);
      g2.fillStyle = C('--panel');
      g2.globalAlpha = 0.86;
      roundRect(g2, cx - bw / 2, cy - 34, bw, 68, 16);
      g2.fill();
      g2.globalAlpha = 1;
      g2.fillStyle = C('--accent');
      g2.font = `600 ${W < 500 ? 14 : 16}px sans-serif`;
      g2.fillText(msg, cx, cy - 9, bw - 20);
      g2.fillStyle = C('--muted');
      g2.font = `${W < 500 ? 11 : 12}px sans-serif`;
      g2.fillText(sub, cx, cy + 14, bw - 20);
      g2.restore();
    }
  }
  if (false) {
  } else if (tr.type === 'drum') {
    for (const id in tr.grid) {
      const ri = rowIndex.get(id);
      if (ri == null) continue;
      const y = RH + ri * rh - sy;
      for (const s in tr.grid[id]) {
        const st = +s;
        if (st < t0 - 192 || st > t1) continue;
        const v = tr.grid[id][s];
        const x = X(st);
        const w = Math.max(8, cellLen(cellStart(st)) * k);
        g2.fillStyle = TRACK_COLORS[(ri + 2) % TRACK_COLORS.length];
        g2.globalAlpha = v === 2 ? 1 : 0.6;
        const pad = v === 2 ? 2 : 4;
        roundRect(g2, x + pad, y + pad, w - pad * 2, rh - pad * 2, 4);
        g2.fill();
        g2.globalAlpha = 1;
        if (playing >= st && playing < st + 12) { g2.strokeStyle = '#fff'; g2.lineWidth = 3; g2.stroke(); }
        else if (nsel.has(dkey(id, st))) { g2.strokeStyle = C('--accent2'); g2.lineWidth = 2.5; g2.stroke(); }
        if (v === 2 && w > 18) { g2.fillStyle = '#222'; g2.font = 'bold 11px sans-serif'; g2.textAlign = 'center'; g2.fillText('強', x + w / 2, y + rh / 2 + 1); g2.textAlign = 'left'; }
      }
    }
  } else if (tr.type === 'chord') {
    const y = RH - sy;
    for (let b = barOf(t0); b < song.bars && barStart(b) < t1; b++) {
      const x = X(barStart(b));
      const w = barLen(b) * k;
      const c = tr.chords[b];
      if (b === ui.selBar) { g2.fillStyle = C('--sel'); g2.fillRect(x + 2, y + 2, w - 4, rh - 4); }
      g2.textAlign = 'center';
      g2.textBaseline = 'middle';
      if (c) {
        const sg = chordSegs(c, b);
        const parts = sg.map((x, i) => [x.c, x.o * k, ((i + 1 < sg.length ? sg[i + 1].o : barLen(b)) - x.o) * k]);
        for (const [cc, dx, ww] of parts) {
          g2.fillStyle = PC_COLORS[cc.r];
          roundRect(g2, x + dx + 6, y + 10, ww - 12, rh - 20, 8);
          g2.fill();
          g2.fillStyle = '#1b1b1b';
          g2.font = `bold ${Math.min(26, ww / 3)}px sans-serif`;
          g2.fillText(chordName(cc), x + dx + ww / 2, y + rh / 2, ww - 16);
        }
        if (b === ui.selBar && ui.chordHalf) {
          const hx = ui.chordHalf === 2 ? chordHalf(b) * k : 0;
          const hw = ui.chordHalf === 2 ? w - chordHalf(b) * k : chordHalf(b) * k;
          g2.strokeStyle = C('--accent'); g2.lineWidth = 3;
          roundRect(g2, x + hx + 3, y + 6, hw - 6, rh - 12, 10); g2.stroke();
        }
      } else {
        g2.fillStyle = C('--muted');
        g2.font = '13px sans-serif';
        g2.fillText(b === ui.selBar ? '↓下から選ぶ' : '（なし）', x + w / 2, y + rh / 2, w - 8);
      }
      g2.textAlign = 'left';
    }
    drawChordNotes(tr, X, k, y + rh, H, t0, t1, playPos);
  }
  if (song.task && song.tracks[song.task.tr] === tr) taskMarks(g2, X, rh, sy, rowIndex.size);
  if (refSong && tr.type === 'melody') compareMarks(g2, tr, X, rowIndex, rh, sy, k);
  if (tr.type === 'melody' && typeof practiceMarks === 'function') practiceMarks(g2, tr, X, rowIndex, rh, sy, k);
  if (cpOn() && tr.id === song.cp.cpId) cpMarks(g2, X, rowIndex, rh, sy, k);
  if (rubber && tr.type !== 'chord') {
    const ta = Math.min(rubber.t0, rubber.t1);
    const tb = Math.max(rubber.t0, rubber.t1);
    const ra = Math.min(rubber.r0, rubber.r1);
    const rb = Math.max(rubber.r0, rubber.r1);
    const y0 = RH + ra * rh - sy;
    g2.fillStyle = C('--sel');
    g2.fillRect(X(ta), y0, (tb - ta) * k, (rb - ra + 1) * rh);
    g2.strokeStyle = C('--accent');
    g2.lineWidth = 1.5;
    g2.setLineDash([5, 3]);
    g2.strokeRect(X(ta) + 0.5, y0 + 0.5, (tb - ta) * k, (rb - ra + 1) * rh);
    g2.setLineDash([]);
  }
  if (ui.stepRec) {
    const x = X(ui.inputTick);
    g2.fillStyle = 'rgba(47,179,109,.18)';
    g2.fillRect(x, RH, cellLen(ui.inputTick) * k, H);
    g2.strokeStyle = '#2fb36d';
    g2.lineWidth = 2;
    g2.beginPath(); g2.moveTo(x, RH); g2.lineTo(x, H); g2.stroke();
  }
  g2.restore();

  // 上の目盛り（ループバー・小節番号・テンポ）
  g2.fillStyle = C('--ruler');
  g2.fillRect(0, 0, W, RH);
  g2.save();
  g2.beginPath(); g2.rect(LW, 0, W - LW, RH); g2.clip();
  g2.fillStyle = C('--loopbar');
  g2.fillRect(LW, 0, W, 9);
  if (ui.loopRange) {
    g2.fillStyle = ui.loopOn ? C('--loop') : C('--loop-off');
    g2.fillRect(X(barStart(ui.loopRange[0])), 0, (barStart(ui.loopRange[1]) - barStart(ui.loopRange[0])) * k, 9);
  }
  g2.textBaseline = 'middle';
  let nStep = 1;
  while (nStep < 16 && barLen(0) * k * nStep < 26) nStep *= 2;
  for (let b = barOf(t0); b < song.bars && barStart(b) < t1; b++) {
    const x = X(barStart(b));
    const bt = barLen(b);
    const bs = beatAt(b);
    // 拍子・調が変わる小節に印
    const chg = [];
    if (b > 0 && song.meters && song.meters[b]) chg.push(song.meters[b].join('/'));
    if (b > 0 && song.keys && song.keys[b]) chg.push(keyLabel(song.keys[b].key, song.keys[b].minor));
    if (chg.length) { g2.fillStyle = C('--accent'); g2.font = 'bold 10px sans-serif'; g2.fillText(chg.join(' '), x + 22, 6); }
    // 小節番号：大きくしたときは左はしにくっついて見え続ける。小さくしたときは間引く
    if (b % nStep === 0) {
      g2.fillStyle = C('--text');
      g2.font = 'bold 12px sans-serif';
      g2.fillText(String(b + 1), Math.max(x + 5, Math.min(LW + 5, x + bt * k - 22)), RH / 2 + 4);
    }
    if (song.tempos[b]) { g2.fillStyle = C('--accent'); g2.font = '11px sans-serif'; g2.fillText('♩=' + song.tempos[b], x + 24, RH / 2 + 4); }
    g2.strokeStyle = C('--line-bar');
    g2.lineWidth = 1;
    g2.beginPath(); g2.moveTo(x + 0.5, 0); g2.lineTo(x + 0.5, RH); g2.stroke();
    g2.strokeStyle = C('--line-beat');
    g2.beginPath();
    for (let s = bs; s < bt; s += bs) { const xb = x + s * k + 0.5; g2.moveTo(xb, RH * 0.72); g2.lineTo(xb, RH); }
    g2.stroke();
  }
  g2.fillStyle = C('--playhead');
  const sxm = X(ui.startTick);
  g2.beginPath(); g2.moveTo(sxm - 6, RH - 9); g2.lineTo(sxm + 6, RH - 9); g2.lineTo(sxm, RH); g2.closePath(); g2.fill();
  g2.restore();

  // 左の鍵盤・音名
  g2.fillStyle = C('--label-bg');
  g2.fillRect(0, RH, LW, H - RH);
  g2.save();
  g2.beginPath(); g2.rect(0, RH, LW, H - RH); g2.clip();
  for (let r = r0; r < r1; r++) {
    const y = RH + r * rh - sy;
    const row = rows[r];
    if (tr.type === 'melody') {
      const black = [1, 3, 6, 8, 10].includes(row.p % 12);
      g2.fillStyle = row.id === highlightRow ? '#ffd43b' : black ? C('--key-black') : C('--key-white');
      g2.fillRect(LW - 24, y + 1, 23, rh - 2);
      if (row.p % 12 === 0 && rh >= 16) { g2.fillStyle = '#888'; g2.font = '9px sans-serif'; g2.textBaseline = 'middle'; g2.fillText('C' + (Math.floor(row.p / 12) - 1), LW - 22, y + rh / 2 + 1); }
      g2.fillStyle = PC_COLORS[row.p % 12];
      g2.fillRect(2, y + 2, 6, rh - 4);
      g2.fillStyle = row.inScale ? C('--text') : C('--muted');
      g2.font = `${row.p % 12 === song.key ? 'bold ' : ''}${Math.min(13, rh - 7)}px sans-serif`;
      g2.textBaseline = 'middle';
      g2.fillText(noteName(row.p) + (row.p % 12 === 0 ? (Math.floor(row.p / 12) - 1) : ''), 12, y + rh / 2 + 1, LW - 40);
    } else {
      if (row.id === highlightRow) { g2.fillStyle = '#ffd43b'; g2.fillRect(0, y, LW, rh); }
      g2.fillStyle = C('--text');
      g2.font = `${tr.type === 'chord' ? 14 : Math.min(12, rh - 8)}px sans-serif`;
      g2.textBaseline = 'middle';
      if (tr.type === 'drum') {
        // 楽器の絵＋名前。せまいときは短い名前にして、それでも入らなければ2行に
        const s = Math.max(12, Math.min(isPhone ? 18 : 24, rh - 4));
        const ic = drumIcon(row.id);
        if (ic) g2.drawImage(ic, 3, y + (rh - s) / 2, s, s);
        const tx = s + 6, tw = LW - tx - 3;
        g2.font = `${isPhone ? 11.5 : 12}px sans-serif`;
        let t = row.label;
        if (isPhone || g2.measureText(t).width > tw) t = shortDrum(t);
        const two = g2.measureText(t).width > tw * 1.25 && t.length > 3 && rh >= 24;
        const half = Math.ceil(t.length / 2);
        const lines = two ? [t.slice(0, half), t.slice(half)] : [t];
        if (two) g2.font = `${isPhone ? 10.5 : 11}px sans-serif`;
        lines.forEach((ln, i) => g2.fillText(ln, tx, y + rh / 2 + 1 + (two ? (i - 0.5) * 12 : 0), tw));
      } else g2.fillText(row.label, 6, y + rh / 2 + 1, LW - 10);
    }
    g2.strokeStyle = C('--line-step');
    g2.lineWidth = 1;
    g2.beginPath(); g2.moveTo(0, y + rh + 0.5); g2.lineTo(LW, y + rh + 0.5); g2.stroke();
  }
  g2.restore();
  g2.fillStyle = C('--ruler');
  g2.fillRect(0, 0, LW, RH);
  g2.fillStyle = C('--muted');
  g2.font = '10px sans-serif';
  g2.textBaseline = 'middle';
  g2.fillText('ループ', 6, 5);
  g2.fillText('小節 →', 6, RH / 2 + 5);
  g2.strokeStyle = C('--line-bar');
  g2.beginPath(); g2.moveTo(LW + 0.5, 0); g2.lineTo(LW + 0.5, H); g2.stroke();
  if (locked(tr)) {
    g2.fillStyle = 'rgba(0,0,0,.08)';
    g2.fillRect(LW, RH, W - LW, H - RH);
  }
  updateDynLane(tr, X, k, t0, t1);
  // 動く線（再生の位置）は、さいごに上から書く。再生中は、線を書く前の絵をとっておく
  if (playPos != null) {
    if (cacheKey && cv.width > 0 && cv.height > 0) {
      if (!drawCache.cv) drawCache.cv = document.createElement('canvas');
      const cc = drawCache.cv;
      if (cc.width !== cv.width || cc.height !== cv.height) { cc.width = cv.width; cc.height = cv.height; }
      cc.getContext('2d').drawImage(cv, 0, 0);
      drawCache.key = cacheKey;
      drawCache.px = X(playPos);
    }
    drawPlayhead(X(playPos), W, H);
  }
}

/* ---------- 強弱のレーン（マス目の下）：強弱記号とクレッシェンドを見せる・おして入れる・はしをドラッグで長さ ---------- */
const DYN_LANE_H = 30;
function dynLaneOn(tr) { return !!tr && tr.type === 'melody' && ui.view !== 'score' && !isPhone && ui.dynLane !== false && !simpleOn(); }
function updateDynLane(tr, X, k, t0, t1) {
  let lane = $('#dynLane');
  if (!lane) {
    lane = document.createElement('div');
    lane.id = 'dynLane';
    lane.className = 'dynlane';
    $('#editorWrap').appendChild(lane);
    lane.addEventListener('pointerdown', dynLaneDown);
  }
  const on = dynLaneOn(tr);
  $('#editorWrap').classList.toggle('dynon', on); // 大きさのボタンを、強弱のレーンの上へ
  if (!on) { lane.hidden = true; return; }
  lane.hidden = false;
  lane.style.left = LW + 'px';
  const key = [version, tr.id, Math.round(X(0)), k, t0, t1].join('|');
  if (lane._key === key) return;
  lane._key = key;
  lane._X = X;
  lane._k = k;
  const parts = [`<span class="dlbl">強弱</span>`];
  (tr.hairpins || []).forEach((hp, i) => {
    if (hp.e < t0 || hp.s > t1) return;
    const xa = X(hp.s) - LW;
    const w = Math.max(10, (hp.e - hp.s) * k);
    const up = hp.type === 'cresc';
    parts.push(`<div class="dlhp" data-i="${i}" style="left:${xa}px;width:${w}px" title="${up ? 'クレッシェンド（だんだん強く）' : 'デクレッシェンド（だんだん弱く）'}・おすと長さを変える・右はしをドラッグ"><svg viewBox="0 0 100 20" preserveAspectRatio="none"><path d="${up ? 'M100 2 L2 10 L100 18' : 'M2 2 L98 10 L2 18'}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg><i class="dlend" data-i="${i}"></i></div>`);
  });
  (tr.dyn || []).forEach((d, i) => {
    if (d.t < t0 - 48 || d.t > t1) return;
    parts.push(`<button class="dldyn" data-i="${i}" style="left:${X(d.t) - LW - 2}px" title="強弱記号 ${d.v}（おすと変える）">${d.v}</button>`);
  });
  lane.innerHTML = parts.join('');
}
function dynLaneTick(e) {
  const lane = $('#dynLane');
  const r = lane.getBoundingClientRect();
  const sc = $('#scroller');
  const t = (e.clientX - r.left + sc.scrollLeft) / ppt();
  const g = Math.max(6, Math.min(ui.grid || 24, 48));
  return clamp(Math.round(t / g) * g, 0, totalTicks() - 1);
}
function dynLaneDown(e) {
  const tr = track();
  if (tr.type !== 'melody') return;
  if (locked(tr)) return toast('このトラックはロックされています');
  e.preventDefault();
  e.stopPropagation();
  const end = e.target.closest('.dlend');
  if (end) {
    // クレッシェンドの右はしをドラッグして長さを変える
    const i = +end.dataset.i;
    const hp = tr.hairpins[i];
    const snap = snapshot();
    const mv = (ev) => { const t = dynLaneTick(ev); hp.e = Math.max(hp.s + 6, t); version++; draw(); showLenTip(ev, hp); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); posTipHide(); if (snapshot() !== snap) pushUndo(snap, 'クレッシェンドの長さ'); changed(); };
    addEventListener('pointermove', mv);
    addEventListener('pointerup', up);
    return;
  }
  const hpEl = e.target.closest('.dlhp');
  if (hpEl) return dynPop(tr, tr.hairpins[+hpEl.dataset.i].s, e.clientX, e.clientY, { hp: +hpEl.dataset.i });
  const dEl = e.target.closest('.dldyn');
  if (dEl) return dynPop(tr, tr.dyn[+dEl.dataset.i].t, e.clientX, e.clientY, {});
  dynPop(tr, dynLaneTick(e), e.clientX, e.clientY, {});
}
function hpLenLabel(hp) {
  const b = barOf(hp.s);
  const L = hp.e - hp.s;
  const bl = barLen(b);
  const bs = beatAt(b);
  if (L % bl === 0) return `${L / bl}小節`;
  if (L > bl && (L % bl) % bs === 0) return `${Math.floor(L / bl)}小節と${(L % bl) / bs}拍`;
  if (L % bs === 0) return `${L / bs}拍`;
  return `${Math.round((L / bs) * 10) / 10}拍`;
}
function showLenTip(e, hp) { posTip(e, hp.e, 'おわり'); const tip = $('#posTip'); if (tip) tip.insertAdjacentHTML('beforeend', ` <small>（長さ ${hpLenLabel(hp)}）</small>`); }
// 強弱記号・クレッシェンドの小さなパネル（マス目のレーンと楽譜の両方から使う）
function dynPop(tr, t, cx, cy, focus) {
  let box = $('#dynPop');
  if (!box) { box = document.createElement('div'); box.id = 'dynPop'; box.className = 'dynpop'; document.body.appendChild(box); }
  const S = { t, hp: focus.hp != null ? focus.hp : null };
  const render = () => {
    const cur = (tr.dyn || []).find((d) => d.t === S.t);
    const hp = S.hp != null ? tr.hairpins[S.hp] : null;
    const b = barOf(S.t);
    const bs = beatAt(b);
    const bl = barLen(b);
    const lens = [[bs, '1拍'], [bs * 2, '2拍'], [bl, '1小節'], [bl * 2, '2小節'], [bl * 4, '4小節']];
    box.innerHTML = `<div class="dphead"><b>${beatPos(hp ? hp.s : S.t).head}</b><button class="mini close" data-x="close" aria-label="とじる">✕</button></div>
      ${hp ? `<div class="dprow"><span class="seg"><button class="mini ${hp.type === 'cresc' ? 'on' : ''}" data-ty="cresc">＜ cresc.</button><button class="mini ${hp.type === 'dim' ? 'on' : ''}" data-ty="dim">＞ dim.</button></span><span class="dplen">長さ <b>${hpLenLabel(hp)}</b></span></div>
        <div class="dprow">${lens.map(([v, n]) => `<button class="mini ${hp.e - hp.s === v ? 'on' : ''}" data-len="${v}">${n}</button>`).join('')}<button class="mini" data-nudge="-1" title="少し短く（1拍）">◀</button><button class="mini" data-nudge="1" title="少し長く（1拍）">▶</button><button class="mini danger" data-delhp="1">消す</button></div>`
      : `<div class="dprow">${['pp', 'p', 'mp', 'mf', 'f', 'ff', 'sf'].map((v) => `<button class="mini dynb ${cur && cur.v === v ? 'on' : ''}" data-v="${v}">${v}</button>`).join('')}${cur ? '<button class="mini danger" data-v="">消す</button>' : ''}</div>
        <div class="dprow"><button class="mini" data-new="cresc" title="ここから、だんだん強く">＜ cresc.</button><button class="mini" data-new="dim" title="ここから、だんだん弱く">＞ dim.</button><span class="muted small">をここから入れる</span></div>`}`;
    box.querySelector('[data-x="close"]').onclick = dynPopClose;
    box.querySelectorAll('[data-v]').forEach((x) => (x.onclick = () => { const v = x.dataset.v; edit(() => { tr.dyn = (tr.dyn || []).filter((d) => d.t !== S.t); if (v) tr.dyn.push({ t: S.t, v }); tr.dyn.sort((a, z) => a.t - z.t); }, '強弱記号'); renderScoreEdit(); dynPopClose(); }));
    box.querySelectorAll('[data-new]').forEach((x) => (x.onclick = () => {
      const len = ui.hpLen || bl;
      edit(() => { tr.hairpins = tr.hairpins || []; tr.hairpins.push({ s: S.t, e: Math.min(totalTicks(), S.t + len), type: x.dataset.new }); }, x.dataset.new === 'cresc' ? 'クレッシェンド' : 'デクレッシェンド');
      S.hp = tr.hairpins.length - 1;
      renderScoreEdit();
      render();
    }));
    box.querySelectorAll('[data-ty]').forEach((x) => (x.onclick = () => { edit(() => { tr.hairpins[S.hp].type = x.dataset.ty; }, 'クレッシェンド'); renderScoreEdit(); render(); }));
    box.querySelectorAll('[data-len]').forEach((x) => (x.onclick = () => { const v = +x.dataset.len; ui.hpLen = v; edit(() => { const h = tr.hairpins[S.hp]; h.e = Math.min(totalTicks(), h.s + v); }, 'クレッシェンドの長さ'); renderScoreEdit(); render(); }));
    box.querySelectorAll('[data-nudge]').forEach((x) => (x.onclick = () => { edit(() => { const h = tr.hairpins[S.hp]; h.e = clamp(h.e + +x.dataset.nudge * beatAt(barOf(h.s)), h.s + 6, totalTicks()); }, 'クレッシェンドの長さ'); renderScoreEdit(); render(); }));
    const dh = box.querySelector('[data-delhp]');
    if (dh) dh.onclick = () => { edit(() => { tr.hairpins.splice(S.hp, 1); }, 'クレッシェンドを消す'); renderScoreEdit(); dynPopClose(); };
  };
  render();
  box.hidden = false;
  box.style.left = clamp(cx - 20, 4, innerWidth - box.offsetWidth - 4) + 'px';
  box.style.top = clamp(cy - box.offsetHeight - 14, 4, innerHeight - box.offsetHeight - 4) + 'px';
  const outside = (ev) => { if (box.hidden) { document.removeEventListener('pointerdown', outside, true); return; } if (!box.contains(ev.target)) { document.removeEventListener('pointerdown', outside, true); dynPopClose(); } };
  setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
}
function dynPopClose() { const box = $('#dynPop'); if (box) box.hidden = true; }

// TAB譜を出す・出さない（''＝なし・'both'＝五線＋TAB・'only'＝TABだけ）。楽譜の画面・印刷・書き出しの全部に使う
function setTabMode(tr, v) {
  if (!tr || !TAB_INST[tr.inst]) return;
  edit(() => { const S = scoreSettings(); S.tab = { ...(S.tab || {}) }; if (v) S.tab[tr.id] = v; else delete S.tab[tr.id]; }, 'TAB譜');
  if (ui.view === 'score') { renderScorePal(); renderScoreEdit(); }
  toast(v === 'both' ? '五線の下にTAB譜を出します。入力モードで弦の上をおすと、フレットの番号で入れられます' : v === 'only' ? 'TAB譜だけで書きます' : 'TAB譜をしまいました');
}
/* ---------- TAB譜（ギター・ウクレレ・ベース）：弦をえらぶ・フレットの番号で入れる ----------
   五線とTABは同じ音（トラックの音）を見ているので、どちらを直しても両方がかわる */
const TAB_TUN = { guitar: [40, 45, 50, 55, 59, 64], ukulele: [67, 60, 64, 69], bass: [28, 33, 38, 43] };
const tabTunOf = (tr) => (tr && TAB_INST[tr.inst] ? TAB_TUN[TAB_INST[tr.inst]] : null);
const strName = (tun, si) => `${tun.length - si}弦`; // 1弦＝いちばん高い弦
// TAB譜のパネル。mode 'fret'：弦の上をおした → 番号で音を入れる、mode 'str'：数字をおした → その音を弾く弦をかえる
function tabPop(cx, cy, S) {
  let box = $('#tabPop');
  if (!box) { box = document.createElement('div'); box.id = 'tabPop'; box.className = 'dynpop tabpop'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'TAB譜'); document.body.appendChild(box); }
  ui.tabPop = S;
  const tr = track();
  const tun = tabTunOf(tr);
  if (!tun) return;
  const render = () => {
    if (S.mode === 'str') {
      const n = tr.notes.find((x) => x.s === S.s && x.p === S.p);
      if (!n) { tabPopClose(); return; }
      const can = tun.map((o, si) => ({ si, f: n.p - o })).filter((q) => q.f >= 0 && q.f <= 24).sort((a, b) => b.si - a.si);
      box.innerHTML = `<div class="dphead"><b>${noteName(n.p)} を弾く弦</b><button class="mini close" data-x="close" aria-label="とじる">✕</button></div>
        <div class="dprow">${can.map((q) => `<button class="mini ${n.str === q.si ? 'on' : ''}" data-si="${q.si}">${strName(tun, q.si)}の <b>${q.f}</b></button>`).join('') || '<span class="muted small">この楽器では弾けない高さです</span>'}</div>
        <div class="dprow"><button class="mini ${n.str == null ? 'on' : ''}" data-si="">自動（弾きやすい弦）</button><span class="muted small">↑↓ でもかえられます</span></div>`;
      box.querySelectorAll('[data-si]').forEach((b) => (b.onclick = () => tabSetStr(b.dataset.si === '' ? null : +b.dataset.si)));
    } else {
      const fr = Array.from({ length: 13 }, (_, i) => i);
      box.innerHTML = `<div class="dphead"><b>${strName(tun, S.str)}：フレットの番号</b><button class="mini close" data-x="close" aria-label="とじる">✕</button></div>
        <div class="dprow tabfrets">${fr.map((f) => `<button class="mini" data-f="${f}" title="${noteName(tun[S.str] + f)}">${f}</button>`).join('')}</div>
        <div class="dprow"><label class="small"><input type="checkbox" data-chord ${S.chord ? 'checked' : ''}> 和音にする（同じ所に重ねる）</label><button class="mini" data-up="1" title="高い弦へ（↑）">▲弦</button><button class="mini" data-up="-1" title="低い弦へ（↓）">▼弦</button></div>
        <div class="dprow muted small">${S.buf ? `打っている番号：<b>${S.buf}</b>　` : ''}数字キーでも入れられます（13より上も）。Enter＝決める・Esc＝おわる</div>`;
      box.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { ui.sc.byPointer = true; tabFret(+b.dataset.f); }));
      box.querySelector('[data-chord]').onchange = (e) => { S.chord = e.target.checked; };
      box.querySelectorAll('[data-up]').forEach((b) => (b.onclick = () => tabStrMove(+b.dataset.up)));
    }
    box.querySelector('[data-x="close"]').onclick = tabPopClose;
  };
  S.render = render;
  render();
  box.hidden = false;
  if (cx != null) {
    box.style.left = clamp(cx - 20, 4, innerWidth - box.offsetWidth - 4) + 'px';
    box.style.top = clamp(cy + 18, 4, innerHeight - box.offsetHeight - 4) + 'px';
  }
  if (!box._outside) {
    box._outside = (ev) => { if (box.hidden) return; if (box.contains(ev.target) || (ev.target.closest && ev.target.closest('#scoreEditView'))) return; tabPopClose(); };
    document.addEventListener('pointerdown', box._outside, true);
  }
}
function tabPopClose() { const box = $('#tabPop'); if (box) box.hidden = true; if (ui.tabPop) { clearTimeout(ui.tabPop.tm); ui.tabPop = null; } }
// えらんだ音を、その弦で弾く（null＝自動にもどす）
function tabSetStr(si) {
  const S = ui.tabPop;
  const tr = track();
  if (!S || locked(tr)) return;
  edit(() => { const n = tr.notes.find((x) => x.s === S.s && x.p === S.p); if (!n) return; if (si == null) delete n.str; else { for (const m of tr.notes) if (m !== n && m.s === n.s && m.str === si) delete m.str; n.str = si; } }, 'TAB譜の弦');
  renderScoreEdit();
  S.render();
}
// フレットの番号で音を入れる（カーソルの所。入れたらつぎへ進む）
function tabFret(f) {
  const S = ui.tabPop;
  const tr = track();
  const tun = tabTunOf(tr);
  if (!S || !tun || locked(tr)) return;
  clearTimeout(S.tm);
  S.buf = '';
  f = clamp(f, 0, 24);
  const p = tun[S.str] + f;
  if (p < 21 || p > 108) return;
  scInsert([p], !!S.chord, S.str);
  S.render();
}
function tabStrMove(d) {
  const S = ui.tabPop;
  const tun = tabTunOf(track());
  if (!S || !tun) return;
  if (S.mode === 'str') {
    const n = track().notes.find((x) => x.s === S.s && x.p === S.p);
    if (!n) return;
    // いま弾いている弦（自分でえらんでいないときは、楽譜に出ている弦）から、となりの弾ける弦へ
    const cur = n.str != null ? n.str : S.shown != null ? S.shown : 0;
    for (let si = cur + d; si >= 0 && si < tun.length; si += d) if (n.p - tun[si] >= 0 && n.p - tun[si] <= 24) { S.shown = si; tabSetStr(si); return; }
    return;
  }
  S.str = clamp(S.str + d, 0, tun.length - 1);
  S.render();
}
// TAB譜のパネルが出ているときのキー
function tabPopKey(e) {
  const S = ui.tabPop;
  if (!S || $('#tabPop')?.hidden) return false;
  const k = e.key;
  if (k === 'Escape') { e.preventDefault(); tabPopClose(); return true; }
  if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); tabStrMove(k === 'ArrowUp' ? 1 : -1); return true; }
  if (S.mode !== 'fret' || e.ctrlKey || e.metaKey || e.altKey) return false;
  if (/^[0-9]$/.test(k)) {
    e.preventDefault();
    S.buf = (S.buf || '') + k;
    clearTimeout(S.tm);
    // 1・2 のあとは、2けたの番号（10〜24）になるかもしれないので少し待つ
    if (S.buf.length >= 2 || +S.buf > 2) tabFret(+S.buf);
    else { S.render(); S.tm = setTimeout(() => { if (ui.tabPop === S && S.buf) tabFret(+S.buf); }, 650); }
    return true;
  }
  if (k === 'Enter' && S.buf) { e.preventDefault(); tabFret(+S.buf); return true; }
  if (k === 'Backspace' && S.buf) { e.preventDefault(); S.buf = S.buf.slice(0, -1); S.render(); return true; }
  if (k === 'ArrowRight' || k === 'ArrowLeft') return false; // カーソル移動はいつもどおり
  return false;
}

/* ============================================================
   エディタの操作（クリック・ドラッグ）
   ============================================================ */
let drag = null;
function hitInfo(e) {
  const sc = $('#scroller');
  const rect = sc.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  const tr = track();
  const rh = rowH(tr);
  const rows = rowsFor(tr);
  const cx = px + sc.scrollLeft - LW;
  const tick = cx / ppt();
  const ri = Math.floor((py + sc.scrollTop - RH) / rh);
  return { px, py, cx, tick, cell: cellStart(Math.max(0, tick)), ri, row: rows[ri], area: py < RH ? 'ruler' : px < LW ? 'label' : 'grid' };
}
function findNote(tr, tick, p) {
  for (let i = tr.notes.length - 1; i >= 0; i--) {
    const n = tr.notes[i];
    if (n.p === p && tick >= n.s && tick < n.s + n.l) return n;
  }
  return null;
}
/* ---------- 指での操作（スマート）----------
   タップ＝音を置く／消す、なぞる＝画面を動かす（いきおいで流れる・たてか横にそろえる）、
   長おし（0.28秒）してからなぞる＝長い音を書く。音の上からさわると、今までどおり動かす・のばす */
let pending = null;
let fling = 0;
function stopFling() { if (fling) { cancelAnimationFrame(fling); fling = 0; } }
function startFling(vx, vy) {
  stopFling();
  const sc = $('#scroller');
  let last = performance.now();
  const step = (now) => {
    const dt = Math.min(40, now - last);
    last = now;
    sc.scrollLeft -= vx * dt;
    sc.scrollTop -= vy * dt;
    const f = Math.pow(0.9955, dt);
    vx *= f;
    vy *= f;
    fling = Math.hypot(vx, vy) > 0.03 ? requestAnimationFrame(step) : 0;
  };
  fling = requestAnimationFrame(step);
}
function onDown(e) {
  stopFling();
  if (e.button > 0 || pan || touchPts.size >= 2) return;
  if (e.pointerType === 'touch' && ui.touchMode === 'scroll') {
    if (hitInfo(e).area !== 'grid') return;
    const sc = $('#scroller');
    try { sc.setPointerCapture(e.pointerId); } catch (er) { /* なし */ }
    pending = { e, x: e.clientX, y: e.clientY, sl: sc.scrollLeft, st: sc.scrollTop, mode: 'wait', axis: null, scrollOnly: true, pts: [{ x: e.clientX, y: e.clientY, t: performance.now() }] };
    return;
  }
  if (e.pointerType === 'touch' && ui.touchMode === 'smart') {
    const h = hitInfo(e);
    const tr = track();
    const onNote = tr.type === 'melody' && h.row && h.tick >= 0 && findNote(tr, h.tick, h.row.p);
    if (h.area === 'grid' && !onNote && !ui.stepRec && !ui.selTool) {
      const sc = $('#scroller');
      try { sc.setPointerCapture(e.pointerId); } catch (er) { /* なし */ }
      pending = { e, x: e.clientX, y: e.clientY, sl: sc.scrollLeft, st: sc.scrollTop, mode: 'wait', axis: null, pts: [{ x: e.clientX, y: e.clientY, t: performance.now() }] };
      pending.timer = setTimeout(() => {
        if (!pending || pending.mode !== 'wait') return;
        pending.mode = 'draw';
        if (navigator.vibrate) try { navigator.vibrate(10); } catch (er) { /* なし */ }
        editDown(pending.e);
      }, 280);
      return;
    }
  }
  editDown(e);
}
function pendingMove(e) {
  const p = pending;
  if (p.mode === 'draw') return false;
  const dx = e.clientX - p.x;
  const dy = e.clientY - p.y;
  if (p.mode === 'wait') {
    if (Math.hypot(dx, dy) < 8) return true;
    clearTimeout(p.timer);
    p.mode = 'pan';
    // 横に大きく動いたら横だけ、たてなら たてだけ
    p.axis = Math.abs(dx) > Math.abs(dy) * 1.6 ? 'x' : Math.abs(dy) > Math.abs(dx) * 1.6 ? 'y' : null;
  }
  const sc = $('#scroller');
  if (p.axis !== 'y') sc.scrollLeft = p.sl - dx;
  if (p.axis !== 'x') sc.scrollTop = p.st - dy;
  p.pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
  if (p.pts.length > 6) p.pts.shift();
  return true;
}
function pendingUp() {
  const p = pending;
  pending = null;
  clearTimeout(p.timer);
  if (p.mode === 'wait') { if (!p.scrollOnly) { editDown(p.e); onUp(); } return; } // タップ
  if (p.mode === 'pan') {
    const a = p.pts[0];
    const z = p.pts[p.pts.length - 1];
    const dt = z.t - a.t;
    if (dt > 0 && performance.now() - z.t < 80) {
      const vx = p.axis === 'y' ? 0 : (z.x - a.x) / dt;
      const vy = p.axis === 'x' ? 0 : (z.y - a.y) / dt;
      if (Math.hypot(vx, vy) > 0.15) startFling(vx, vy);
    }
  }
}
function editDown(e) {
  if (e.button > 0 || pan || touchPts.size >= 2) return;
  const h = hitInfo(e);
  const tr = track();
  if (h.area === 'ruler') {
    const bar = barOf(Math.max(0, h.tick));
    drag = { kind: 'ruler', b0: bar, b1: bar, moved: false, loopBar: h.py < 11 };
    $('#scroller').setPointerCapture(e.pointerId);
    return;
  }
  if (h.area === 'label') {
    if (h.row) {
      preview(tr, tr.type === 'drum' ? h.row.id : h.row.p);
      if (tr.type === 'melody') showMini(h.row.p);
      highlightRow = h.row.id;
      draw();
      setTimeout(() => { highlightRow = null; draw(); }, 400);
    }
    return;
  }
  if (h.tick < 0 || h.tick >= totalTicks() || !h.row) return;
  if (e.pointerType === 'touch' && ui.touchMode === 'scroll') return; // スクロールモード
  if (tr.type !== 'chord' && locked(tr)) { toast('このトラックはロックされています'); return; }
  e.preventDefault();
  try { $('#scroller').setPointerCapture(e.pointerId); } catch (er) { /* 指がもうはなれている（タップ） */ }
  const snap = snapshot();
  if (tr.type === 'melody') {
    const n = findNote(tr, h.tick, h.row.p);
    const addKey = e.shiftKey || e.ctrlKey || e.metaKey;
    if (n && addKey) { if (nsel.has(n)) nsel.delete(n); else nsel.add(n); updateSelBar(); draw(); return; }
    if (!n && (addKey || ui.selTool)) {
      rubber = { t0: h.tick, r0: h.ri, t1: h.tick, r1: h.ri, base: addKey ? new Set(nsel) : new Set() };
      drag = { kind: 'rubber' };
      draw();
      return;
    }
    if (!n && nsel.size) { nsel.clear(); updateSelBar(); draw(); return; } // 何もない所をおす＝えらぶのをやめる
    if (n && nsel.has(n) && (nsel.size > 1 || ui.selTool)) {
      drag = { kind: 'gmove', n, snap, p0: n.p, t0: cellStart(Math.max(0, h.tick)), base: [...nsel].map((m) => ({ m, s: m.s, p: m.p })), dt: 0, dp: 0, moved: false, label: 'えらんだ音を移動' };
      return;
    }
    if (n && ui.selTool) { nsel.clear(); nsel.add(n); updateSelBar(); draw(); return; }
    if (nsel.size) { nsel.clear(); updateSelBar(); }
    if (n) {
      const nearEnd = (n.s + n.l) * ppt() - h.cx < Math.min(12, n.l * ppt() * 0.35);
      let mode = nearEnd ? 'resize' : 'move';
      if (ui.dragMode === 'stretch') mode = 'resize';
      if (ui.dragMode === 'move') mode = 'move';
      drag = { kind: mode, n, snap, off: h.cell - n.s, offT: h.tick - n.s, moved: false, existing: true, touch: e.pointerType === 'touch', label: mode === 'resize' ? '音の長さを変更' : '音を移動' };
    } else {
      const nn = { s: h.cell, p: h.row.p, l: cellLen(h.cell) };
      tr.notes.push(nn);
      sparkle(nn);
      preview(tr, nn.p);
      showMini(nn.p);
      drag = { kind: 'resize', n: nn, snap, moved: true, label: '音を置く' };
      version++;
    }
  } else if (tr.type === 'drum') {
    const id = h.row.id;
    const ex = existingHit(tr, id, h.cell);
    const addKey = e.shiftKey || e.ctrlKey || e.metaKey;
    if (ex != null && (addKey || ui.selTool)) { const k = dkey(id, ex); if (addKey && nsel.has(k)) nsel.delete(k); else { if (!addKey) nsel.clear(); nsel.add(k); } updateSelBar(); draw(); return; }
    if (ex == null && (addKey || ui.selTool)) { rubber = { t0: h.tick, r0: h.ri, t1: h.tick, r1: h.ri, base: addKey ? new Set(nsel) : new Set() }; drag = { kind: 'rubber' }; draw(); return; }
    if (nsel.size) { nsel.clear(); updateSelBar(); draw(); return; }
    const v = ex != null ? tr.grid[id][ex] : 0;
    const nv = (v + 1) % 3;
    if (ex != null) delete tr.grid[id][ex];
    setCell(tr, id, ex != null ? ex : h.cell, nv);
    if (nv) preview(tr, id);
    drag = { kind: 'paint', id, val: nv, snap, label: 'リズムを入力' };
  } else if (tr.type === 'chord') {
    ui.selBar = barOf(Math.max(0, h.tick));
    selectBars(cur, ui.selBar, ui.selBar);
    renderEditorTools();
    drawOverview();
    const c = tr.chords[ui.selBar];
    if (c) previewChord(tr, c);
  }
  draw();
}
// コードの下に「じっさいに鳴る音」を出す（伴奏の形・ベースが目で見てわかる）
let chordNotesCache = { key: '', ev: [] };
function drawChordNotes(tr, X, k, top, H, t0, t1, playPos) {
  const key = JSON.stringify([tr.chords, tr.pattern, tr.bassOn, song.bars, song.meters, song.pickup]);
  if (chordNotesCache.key !== key) chordNotesCache = { key, ev: chordEvents(tr) };
  const ev = chordNotesCache.ev;
  const y0 = top + 26;
  const y1 = H - 14;
  if (!ev.length || y1 - y0 < 60) return;
  let lo = Infinity, hi = -Infinity;
  for (const n of ev) { lo = Math.min(lo, n.p); hi = Math.max(hi, n.p); }
  lo -= 1; hi += 1;
  const nh = Math.min(14, (y1 - y0) / (hi - lo + 1));
  const yy = (p) => y0 + (hi - p) * nh + ((y1 - y0) - (hi - lo + 1) * nh) / 2;
  g2.fillStyle = C('--muted'); g2.font = '12px sans-serif'; g2.textBaseline = 'middle';
  g2.fillText('じっさいに鳴る音（伴奏の形' + (tr.bassOn ? '・ベース' : '') + '）', LW + 8, top + 13);
  const col = TRACK_COLORS[cur % TRACK_COLORS.length];
  const bassMax = Math.min(...ev.map((n) => n.p)) + 11;
  for (const n of ev) {
    if (n.s + n.l < t0 || n.s > t1) continue;
    const on = playPos != null && playPos >= n.s && playPos < n.s + n.l;
    g2.fillStyle = on ? C('--accent') : col;
    g2.globalAlpha = on ? 1 : tr.bassOn && n.p <= bassMax && n.p < 48 ? 0.85 : 0.55;
    roundRect(g2, X(n.s) + 1, yy(n.p) + 1, Math.max(3, n.l * k - 2), Math.max(3, nh - 2), 3);
    g2.fill();
  }
  g2.globalAlpha = 1;
}
/* ---------- 音をえらぶ（まとめて移動・コピー・貼りつけ・複製・消す・高さを変える） ---------- */
let nsel = new Set();
let rubber = null;
let noteClip = null;
const dkey = (id, s) => id + '|' + s;
function prSel() {
  const tr = track();
  if (tr.type === 'melody') return tr.notes.filter((n) => nsel.has(n));
  if (tr.type === 'drum') {
    const out = [];
    for (const k of nsel) { if (typeof k !== 'string') continue; const i = k.lastIndexOf('|'); const id = k.slice(0, i); const st = +k.slice(i + 1); const v = tr.grid[id] && tr.grid[id][st]; if (v) out.push({ id, s: st, v, l: Math.max(1, cellLen(cellStart(st))), drum: true }); }
    return out.sort((a, b) => a.s - b.s);
  }
  return [];
}
function updateSelBar() {
  const bar = $('#selBar');
  if (!bar) return;
  const tr = track();
  if (tr.type === 'chord') nsel.clear();
  else if (tr.type === 'melody') { for (const n of [...nsel]) if (!tr.notes.includes(n)) nsel.delete(n); }
  else { const ok = new Set(prSel().map((h) => dkey(h.id, h.s))); for (const k of [...nsel]) if (!ok.has(k)) nsel.delete(k); }
  bar.hidden = !nsel.size && !(ui.selTool && noteClip);
  $('#selCount').textContent = nsel.size ? `${nsel.size}個` : 'えらぶ';
  $$('#selBar [data-need="sel"]').forEach((b) => (b.disabled = !nsel.size));
  $('#selPaste').disabled = !noteClip;
  $('#selOrn').hidden = tr.type !== 'melody';
}
function selSpan(ns) {
  const a = Math.min(...ns.map((n) => n.s));
  const z = Math.max(...ns.map((n) => n.s + n.l));
  return [a, z];
}
function selCopy(cut) {
  const ns = prSel();
  if (!ns.length) return;
  const [a, z] = selSpan(ns);
  noteClip = { drum: track().type === 'drum', notes: ns.map((n) => ({ ...n, s: n.s - a })), len: z - a };
  if (cut) selDelete('切り取り');
  else toast(`${ns.length}個の音をコピーしました（Ctrl+V で再生の印の所に貼りつけ）`);
  updateSelBar();
}
function pasteAt(t, label = '貼りつけ') {
  const tr = track();
  if (!noteClip || tr.type === 'chord') return;
  if (!!noteClip.drum !== (tr.type === 'drum')) { toast(noteClip.drum ? 'リズムのコピーは、リズムのトラックに貼りつけてね' : 'メロディのコピーは、メロディのトラックに貼りつけてね'); return; }
  if (locked(tr)) return toast('このトラックはロックされています');
  const added = [];
  if (tr.type === 'drum') {
    edit(() => { for (const c of noteClip.notes) { const st = t + c.s; if (st >= totalTicks()) continue; setCell(tr, c.id, st, c.v); added.push(dkey(c.id, st)); } }, label);
    nsel = new Set(added);
    updateSelBar();
    draw();
    return added;
  }
  edit(() => {
    for (const c of noteClip.notes) {
      const s = t + c.s;
      if (s >= totalTicks()) continue;
      tr.notes = tr.notes.filter((n) => !(n.s === s && n.p === c.p));
      const nn = { ...c, s };
      tr.notes.push(nn);
      added.push(nn);
    }
  }, label);
  nsel = new Set(added);
  added.forEach(sparkle);
  updateSelBar();
  draw();
  return added;
}
function selPaste() {
  if (!noteClip) return;
  const t = ui.startTick;
  const added = pasteAt(t);
  if (!added) return;
  ui.startTick = Math.min(totalTicks() - 1, t + noteClip.len); // 続けて貼ると、うしろへつながる
  toast(`${added.length}個の音を貼りつけました`);
  draw();
}
function selDuplicate() {
  const ns = prSel();
  if (!ns.length) return;
  const [a, z] = selSpan(ns);
  const beat = beatAt(barOf(a));
  const len = Math.ceil((z - a) / beat) * beat;
  const keep = noteClip;
  noteClip = { drum: track().type === 'drum', notes: ns.map((n) => ({ ...n, s: n.s - a })), len };
  const added = pasteAt(a + len, '複製');
  noteClip = keep;
  if (added) toast(`うしろに複製しました（${added.length}個）`);
}
function selDelete(label = 'えらんだ音を消す') {
  const tr = track();
  if (!nsel.size) return;
  if (locked(tr)) return toast('このトラックはロックされています');
  const n0 = nsel.size;
  if (tr.type === 'drum') { const hs = prSel(); edit(() => { for (const h of hs) setCell(tr, h.id, h.s, 0); }, label); } else
  edit(() => { tr.notes = tr.notes.filter((n) => !nsel.has(n)); }, label);
  nsel.clear();
  updateSelBar();
  toast(label === '切り取り' ? `${n0}個の音を切り取りました` : `${n0}個の音を消しました`);
}
function selMove(dt, drow, oct) {
  const tr = track();
  const ns = prSel();
  if (!ns.length) return;
  if (locked(tr)) return toast('このトラックはロックされています');
  const rows = rowsFor(tr);
  const [a] = selSpan(ns);
  const zS = Math.max(...ns.map((n) => n.s));
  dt = clamp(dt, -a, totalTicks() - 1 - zS);
  if (tr.type === 'drum') {
    if (!dt) return;
    edit(() => { for (const h of ns) setCell(tr, h.id, h.s, 0); for (const h of ns) setCell(tr, h.id, h.s + dt, h.v); }, 'えらんだリズムを移動');
    nsel = new Set(ns.map((h) => dkey(h.id, h.s + dt)));
    updateSelBar();
    draw();
    return;
  }
  edit(() => {
    for (const n of ns) {
      n.s += dt;
      if (oct) moveP(n, oct * 12, 0, 127);
      else if (drow) {
        // 表示している行（音階）にそって1つ上・下へ
        const i = rows.findIndex((r) => r.p === n.p);
        if (i >= 0) n.p = rows[clamp(i - drow, 0, rows.length - 1)].p;
        else moveP(n, drow, 0, 127);
      }
    }
  }, dt ? 'えらんだ音を移動' : '高さを変える');
  if (drow || oct) preview(tr, ns[0].p);
  updateSelBar();
}
// そろえる：えらんだ音のはじまりと長さを、今のマス目（おたまチョップ）にぴったり合わせる
function selQuantize() {
  const tr = track();
  const ns = prSel();
  if (!ns.length) return;
  if (locked(tr)) return toast('このトラックはロックされています');
  const g = ui.grid;
  let moved = 0;
  if (tr.type === 'drum') {
    const to = ns.map((h) => ({ ...h, t: clamp(Math.round(h.s / g) * g, 0, totalTicks() - 1) }));
    moved = to.filter((h) => h.t !== h.s).length;
    edit(() => { for (const h of to) setCell(tr, h.id, h.s, 0); for (const h of to) setCell(tr, h.id, h.t, h.v); }, 'リズムをそろえる');
    nsel = new Set(to.map((h) => dkey(h.id, h.t)));
    updateSelBar();
    draw();
    return toast(moved ? `${moved}個をそろえました` : 'もうそろっています');
  }
  edit(() => {
    for (const n of ns) {
      const s0 = n.s;
      const l0 = n.l;
      n.s = clamp(Math.round(n.s / g) * g, 0, totalTicks() - 1);
      n.l = Math.max(g, Math.round(l0 / g) * g);
      if (n.s !== s0 || n.l !== l0) moved++;
    }
    const seen = new Set();
    tr.notes = tr.notes.filter((n) => { const k = n.s + ':' + n.p; if (seen.has(k)) return false; seen.add(k); return true; });
  }, 'リズムをそろえる');
  updateSelBar();
  toast(moved ? `${moved}個の音を${GRIDS.find((x) => x[0] === g)?.[1] || 'マス目'}にそろえました` : 'もうそろっています');
}
function selVelocity(dir) {
  const tr = track();
  const ns = prSel();
  if (!ns.length) return;
  if (locked(tr)) return toast('このトラックはロックされています');
  if (tr.type === 'drum') {
    edit(() => { for (const h of ns) setCell(tr, h.id, h.s, dir > 0 ? 2 : 1); }, dir > 0 ? '強くする' : '弱くする');
    toast(dir > 0 ? '強く（アクセント）にしました' : 'ふつうの強さにしました');
    return updateSelBar();
  }
  const steps = [0.25, 0.5, 0.75, 1, 1.25];
  edit(() => {
    for (const n of ns) {
      const i = steps.findIndex((x) => x >= (n.vel || 1) - 0.01);
      const v = steps[clamp((i < 0 ? 3 : i) + dir, 0, steps.length - 1)];
      if (v === 1) delete n.vel; else n.vel = v;
    }
  }, dir > 0 ? '強くする' : '弱くする');
  const v = ns[0].vel || 1;
  preview(tr, ns[0].p);
  toast(`強さ：${['とても弱い', '弱い', '少し弱い', 'ふつう', '強い'][steps.indexOf(v)]}`);
  updateSelBar();
}
function selAll() {
  const tr = track();
  if (tr.type === 'chord') return;
  if (tr.type === 'drum') { nsel = new Set(); for (const id in tr.grid) for (const st in tr.grid[id]) nsel.add(dkey(id, +st)); }
  else nsel = new Set(tr.notes);
  updateSelBar();
  draw();
  toast(`${nsel.size}個の音をぜんぶえらびました`);
}
// キー：Ctrl+A/C/X/V/D、Delete、矢印、Esc（マス目のとき）
function noteKeys(e) {
  if (track().type === 'chord') return false;
  const ctrl = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();
  if (ctrl && k === 'a') { e.preventDefault(); selAll(); return true; }
  if (ctrl && k === 'c' && nsel.size) { e.preventDefault(); selCopy(false); return true; }
  if (ctrl && k === 'x' && nsel.size) { e.preventDefault(); selCopy(true); return true; }
  if (ctrl && k === 'v' && noteClip) { e.preventDefault(); selPaste(); return true; }
  if (ctrl && k === 'd' && nsel.size) { e.preventDefault(); selDuplicate(); return true; }
  if (!ctrl && k === 'q' && nsel.size && !ui.stepRec) { e.preventDefault(); selQuantize(); return true; }
  if (e.key === 'F9' && track().type === 'melody') { e.preventDefault(); scPalette(true); return true; } // 記号パレット（マス目でも）
  if (ctrl || !nsel.size || ui.stepRec) return false;
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); selDelete(); return true; }
  if (e.key === 'Escape') { nsel.clear(); updateSelBar(); draw(); return true; }
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); const d = e.key === 'ArrowUp' ? 1 : -1; selMove(0, e.shiftKey ? 0 : d, e.shiftKey ? d : 0); return true; }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    const d = e.key === 'ArrowRight' ? 1 : -1;
    selMove(d * (e.shiftKey ? barLen(barOf(selSpan(prSel())[0])) : ui.grid), 0, 0);
    return true;
  }
  return false;
}
function setupSelBar() {
  $('#selMore').onclick = () => { const b = $('#selBar'); b.classList.toggle('open'); $('#selMore').setAttribute('aria-expanded', b.classList.contains('open')); };
  $('#selCopy').onclick = () => selCopy(false);
  $('#selOrn').onclick = () => { const d = $('#dlgSym'); if (d && d.open && d.dataset.mode === 'grid') d.close(); else scPalette(true); };
  $('#selCut').onclick = () => selCopy(true);
  $('#selPaste').onclick = () => selPaste();
  $('#selDup').onclick = () => selDuplicate();
  $('#selQuant').onclick = () => selQuantize();
  $('#selLoop').onclick = () => {
    const ns = prSel();
    if (!ns.length) return;
    const [a, z] = selSpan(ns);
    ui.loopRange = [barOf(a), barOf(Math.max(a, z - 1)) + 1];
    ui.loopOn = true;
    $('#btnLoop').classList.add('on');
    ui.startTick = barStart(ui.loopRange[0]);
    draw(); drawOverview();
    toast(`${ui.loopRange[0] + 1}〜${ui.loopRange[1]}小節をくり返します（▶で再生）`);
  };
  $('#selLoud').onclick = () => selVelocity(1);
  $('#selSoft').onclick = () => selVelocity(-1);
  $('#selUp').onclick = () => selMove(0, 1, 0);
  $('#selDn').onclick = () => selMove(0, -1, 0);
  $('#selLeft').onclick = () => selMove(-ui.grid, 0, 0);
  $('#selRight').onclick = () => selMove(ui.grid, 0, 0);
  $('#selDel').onclick = () => selDelete();
  $('#selAll').onclick = () => selAll();
  $('#selClose').onclick = () => { nsel.clear(); if (ui.selTool) { ui.selTool = false; renderEditorTools(); } updateSelBar(); draw(); };
}
function existingHit(tr, id, cell) {
  if (!tr.grid[id]) return null;
  const end = cell + cellLen(cell);
  for (const s in tr.grid[id]) if (+s >= cell && +s < end) return +s;
  return null;
}
function setCell(tr, id, t, v) {
  if (!tr.grid[id]) tr.grid[id] = {};
  if (v) tr.grid[id][t] = v;
  else delete tr.grid[id][t];
  if (!Object.keys(tr.grid[id]).length) delete tr.grid[id];
  version++;
}
function onMove(e) {
  if (pending && (pan || touchPts.size >= 2)) { clearTimeout(pending.timer); pending = null; }
  if (pending && pendingMove(e)) return;
  if (pan) return;
  const h = hitInfo(e);
  const tr = track();
  if (!drag) {
    if (h.area === 'grid' && tr.type === 'melody' && h.row) {
      const n = findNote(tr, h.tick, h.row.p);
      const nearEnd = n && (n.s + n.l) * ppt() - h.cx < Math.min(12, n.l * ppt() * 0.35);
      $('#scroller').style.cursor = n ? (ui.dragMode === 'stretch' || (nearEnd && ui.dragMode !== 'move') ? 'ew-resize' : 'grab') : 'crosshair';
    } else $('#scroller').style.cursor = h.area === 'ruler' ? 'pointer' : 'crosshair';
    return;
  }
  if (drag.kind === 'ruler') {
    const bar = barOf(Math.max(0, h.tick));
    if (bar !== drag.b1) { drag.b1 = bar; drag.moved = true; }
    if (drag.moved) {
      ui.loopRange = [Math.min(drag.b0, drag.b1), Math.max(drag.b0, drag.b1) + 1];
      ui.loopOn = true;
      $('#btnLoop').classList.add('on');
      draw();
    }
    return;
  }
  if (drag.kind === 'rubber') {
    rubber.t1 = h.tick;
    rubber.r1 = h.ri;
    const rows = rowsFor(tr);
    const ta = Math.min(rubber.t0, rubber.t1);
    const tb = Math.max(rubber.t0, rubber.t1);
    const ra = Math.min(rubber.r0, rubber.r1);
    const rb = Math.max(rubber.r0, rubber.r1);
    nsel = new Set(rubber.base);
    if (tr.type === 'drum') {
      for (const r of rows.slice(Math.max(0, ra), rb + 1)) for (const st in tr.grid[r.id] || {}) if (+st < tb && +st + cellLen(cellStart(+st)) > ta) nsel.add(dkey(r.id, +st));
    } else {
      const inRow = new Set(rows.slice(Math.max(0, ra), rb + 1).map((r) => r.p));
      for (const n of tr.notes) if (inRow.has(n.p) && n.s < tb && n.s + n.l > ta) nsel.add(n);
    }
    updateSelBar();
    draw();
    return;
  }
  if (drag.kind === 'gmove') {
    const rows = rowsFor(tr);
    const row = rows[clamp(h.ri, 0, rows.length - 1)];
    let dt = cellStart(Math.max(0, h.tick)) - drag.t0;
    const minS = Math.min(...drag.base.map((b) => b.s));
    const maxS = Math.max(...drag.base.map((b) => b.s));
    dt = clamp(dt, -minS, totalTicks() - 1 - maxS);
    const dp = row.p - drag.p0;
    if (dt !== drag.dt || dp !== drag.dp) {
      if (dp !== drag.dp) { preview(tr, row.p); showMini(row.p); }
      for (const b of drag.base) { b.m.s = b.s + dt; b.m.p = clamp(b.p + dp, 0, 127); }
      drag.dt = dt;
      drag.dp = dp;
      drag.moved = true;
      version++;
    }
    if (drag.moved) posTip(e, minS + dt);
    draw();
    return;
  }
  const fine = e.altKey ? Math.max(3, Math.round(ui.grid / 4)) : 0;
  if (drag.kind === 'resize') {
    if (fine) drag.n.l = Math.max(fine, Math.round((clamp(h.tick, drag.n.s, totalTicks()) - drag.n.s) / fine) * fine + fine);
    else {
      const endCell = cellStart(clamp(h.tick, drag.n.s, totalTicks() - 1));
      drag.n.l = Math.max(cellLen(drag.n.s), endCell + cellLen(endCell) - drag.n.s);
    }
    drag.moved = true;
    version++;
    posTip(e, drag.n.s + drag.n.l, 'おわり');
  } else if (drag.kind === 'move') {
    const rows = rowsFor(tr);
    const ns = fine ? clamp(Math.round((h.tick - (drag.offT != null ? drag.offT : drag.off)) / fine) * fine, 0, totalTicks() - 1) : clamp(cellStart(Math.max(0, h.tick)) - drag.off, 0, totalTicks() - 1);
    const row = rows[clamp(h.ri, 0, rows.length - 1)];
    if (ns !== drag.n.s || row.p !== drag.n.p) {
      if (row.p !== drag.n.p) { preview(tr, row.p); showMini(row.p); }
      drag.n.s = ns;
      drag.n.p = row.p;
      drag.moved = true;
      version++;
    }
    if (drag.moved) posTip(e, drag.n.s);
  } else if (drag.kind === 'paint') {
    if (h.row && h.tick >= 0 && h.tick < totalTicks()) {
      const ex = existingHit(tr, h.row.id, h.cell);
      const curV = ex != null ? tr.grid[h.row.id][ex] : 0;
      if (curV !== drag.val) {
        if (ex != null) delete tr.grid[h.row.id][ex];
        setCell(tr, h.row.id, ex != null ? ex : h.cell, drag.val);
        if (drag.val) preview(tr, h.row.id);
      }
    }
  }
  draw();
}
function onUp() {
  posTipHide();
  if (pending) { pendingUp(); if (!drag) return; }
  if (!drag) return;
  const tr = track();
  const d = drag;
  drag = null;
  if (d.kind === 'ruler') {
    if (!d.moved) {
      if (d.loopBar && ui.loopRange) { ui.loopOn = !ui.loopOn; $('#btnLoop').classList.toggle('on', ui.loopOn); }
      ui.startTick = barStart(d.b0);
      ui.inputTick = ui.startTick;
      selectBars(cur, d.b0, d.b0);
      renderEditorTools();
      if (player.on) play();
    }
    draw();
    drawOverview();
    updateMini();
    return;
  }
  if (d.kind === 'rubber') {
    rubber = null;
    if (nsel.size) toast(isPhone ? `${nsel.size}個えらびました` : `${nsel.size}個の音をえらびました（ドラッグでまとめて移動・Delete で消す・Ctrl+C でコピー）`);
    updateSelBar();
    draw();
    return;
  }
  if (d.kind === 'gmove' && !d.moved) { nsel.clear(); nsel.add(d.n); updateSelBar(); draw(); return; }
  // 動かさずにはなしたら消す（指のときは、右はしをさわっても）
  // （置いたばかりの音を、すぐもう一度タップ＝ダブルタップのときは消さない）
  const justPut = d.touch && fxNotes.has(d.n) && performance.now() - fxNotes.get(d.n) < 400;
  if ((d.kind === 'move' || (d.kind === 'resize' && d.existing && d.touch)) && !d.moved && !justPut) { tr.notes.splice(tr.notes.indexOf(d.n), 1); d.label = '音を消す'; }
  if (tr.type === 'melody') {
    const seen = new Set();
    tr.notes = tr.notes.filter((n) => { const k = n.s + ':' + n.p; if (seen.has(k)) return false; seen.add(k); return true; });
  }
  if (d.snap && snapshot() !== d.snap) pushUndo(d.snap, d.label);
  changed();
}

/* ============================================================
   曲の地図（全体の見取り図：トラック × 小節）
   ============================================================ */
const ov = $('#ov');
const og = ov.getContext('2d');
let OV_LW = 110;
let OV_RH = 20;
const OV_TOP = 16;
let ovDrag = null;
// 曲の地図の1小節のはば：全体（つめて曲ぜんぶ）・ふつう・大きく
function ovBarW() {
  const room = $('#ovWrap').clientWidth - OV_LW - 10;
  const mode = typeof layout === 'object' && layout.ovMode;
  const f = (typeof layout === 'object' && layout.ovbz) || 1; // ↔ ボタンで決めた倍率
  if (mode === 'fit') return Math.max(3, (room / Math.max(1, song.bars)) * f);
  if (mode === 'big') return Math.max(24, Math.max(120, Math.min(220, room / Math.min(song.bars, 6))) * f);
  return Math.max(6, Math.max(34, Math.min(90, room / Math.min(song.bars, 16))) * f);
}
function ovRows() { return [...song.tracks.map((t, i) => ({ kind: 'track', i })), { kind: 'rule' }]; }
function resizeOverview() {
  const wrap = $('#ovWrap');
  // トラックが多い曲（オーケストラなど）は、行を細くして地図が高くなりすぎないようにする（自分で高さを決めたときはそのまま）
  if (!isPhone && typeof layout === 'object' && !layout.ovrh) OV_RH = Math.max(7, Math.min(20, Math.floor(250 / ovRows().length)));
  const h = OV_TOP + ovRows().length * OV_RH + 2;
  wrap.style.height = h + 14 + 'px';
  $('#ovSpacer').style.width = OV_LW + song.bars * ovBarW() + 20 + 'px';
  $('#ovSpacer').style.height = h + 'px';
  fitCanvas(ov, wrap);
}
function barHasContent(tr, b) {
  const bt = barTicks();
  const a = barStart(b);
  const z = barStart(b + 1);
  if (tr.type === 'melody') return tr.notes.some((n) => n.s >= a && n.s < z);
  if (tr.type === 'drum') return Object.values(tr.grid).some((g) => Object.keys(g).some((s) => +s >= a && +s < z));
  return !!tr.chords[b];
}
function drawOverview(playPos) {
  if (playPos === undefined) playPos = playheadTick();
  resizeOverview();
  if (!ov.width || !ov.height) return; // 見えていない（スマホの打ち込み画面など）
  const dpr = window.devicePixelRatio || 1;
  const W = ov.width / dpr;
  const H = ov.height / dpr;
  const sx = $('#ovScroller').scrollLeft;
  const bw = ovBarW();
  const bt = barTicks();
  const rows = ovRows();
  // 動かない部分（小節・音の点）は、変わったときだけ描いて、とっておく（再生中は線だけ描く）
  const key = [version, sx, W, H, dpr, bw, song.bars, ui.sel.t, ui.sel.b0, ui.sel.b1, cur, C('--panel'), C('--accent2'), rows.length,
    song.tracks.map((t) => t.name + (t.locked ? 1 : 0) + (t.notes ? t.notes.length : 0)).join('|')].join(',');
  if (!ovCache) ovCache = document.createElement('canvas');
  if (ovCacheKey !== key) {
    ovCacheKey = key;
    ovCache.width = ov.width;
    ovCache.height = ov.height;
    drawOverviewBase(ovCache.getContext('2d'), { W, H, dpr, sx, bw, rows });
  }
  og.setTransform(1, 0, 0, 1, 0, 0);
  og.clearRect(0, 0, ov.width, ov.height);
  og.drawImage(ovCache, 0, 0);
  og.setTransform(dpr, 0, 0, dpr, 0, 0);
  og.save();
  og.beginPath(); og.rect(OV_LW, 0, W - OV_LW, H); og.clip();
  overviewOverlay(W, H, sx, bw, playPos);
  og.restore();
}
let ovCache = null;
let ovCacheKey = '';
function drawOverviewBase(og, { W, H, dpr, sx, bw, rows }) {
  og.setTransform(dpr, 0, 0, dpr, 0, 0);
  og.fillStyle = C('--panel');
  og.fillRect(0, 0, W, H);
  og.save();
  og.beginPath(); og.rect(OV_LW, 0, W - OV_LW, H); og.clip();
  const bVis0 = Math.max(0, Math.floor(sx / bw) - 1);
  const bVis1 = Math.min(song.bars - 1, Math.ceil((sx + W) / bw) + 1);
  // 音の点：音ごとに1回だけ見る（小節ごとに全部の音を見ない）
  const t0 = barStart(bVis0);
  const t1 = barStart(bVis1 + 1);
  rows.forEach((r, ri) => {
    if (r.kind === 'rule') return;
    const tr = song.tracks[r.i];
    const y = OV_TOP + ri * OV_RH;
    og.fillStyle = TRACK_COLORS[r.i % TRACK_COLORS.length];
    const put = (st, fn) => { if (st < t0 || st >= t1) return; const b = barOf(st); fn(OV_LW + b * bw - sx, b); };
    // 背景のあとに描くため、あとでまとめる
    r._dots = (g) => {
      g.fillStyle = TRACK_COLORS[r.i % TRACK_COLORS.length];
      if (tr.type === 'melody') {
        for (const n of tr.notes) put(n.s, (x, b) => {
          const bt = barLen(b);
          const nx = x + 2 + ((n.s - barStart(b)) / bt) * (bw - 4);
          const ny = y + OV_RH - 3 - ((n.p - 36) / 60) * (OV_RH - 6);
          g.fillRect(nx, clamp(ny, y + 2, y + OV_RH - 4), Math.max(2, (n.l / bt) * (bw - 4) - 1), 2);
        });
      } else if (tr.type === 'drum') {
        for (const id in tr.grid) for (const s in tr.grid[id]) put(+s, (x, b) => g.fillRect(x + 2 + ((+s - barStart(b)) / barLen(b)) * (bw - 4), y + 5, 2, OV_RH - 10));
      }
    };
  });
  for (let b = bVis0; b <= bVis1; b++) {
    const x = OV_LW + b * bw - sx;
    if (x > W || x + bw < OV_LW) continue;
    og.fillStyle = C('--muted');
    og.font = '10px sans-serif';
    og.textBaseline = 'middle';
    const nStep = bw < 9 ? 8 : bw < 18 ? 4 : bw < 26 ? 2 : 1; // せまいときは、小節番号を何個かおきに
    if (b % nStep === 0) og.fillText(String(b + 1), x + 3, OV_TOP / 2);
    rows.forEach((r, ri) => {
      const y = OV_TOP + ri * OV_RH;
      if (r.kind === 'rule') {
        og.fillStyle = C('--row-b');
        og.fillRect(x + 1, y + 1, bw - 2, OV_RH - 2);
        if (song.tempos[b]) { og.fillStyle = C('--accent'); og.font = 'bold 10px sans-serif'; og.fillText('♩' + song.tempos[b], x + 3, y + OV_RH / 2); }
        return;
      }
      const tr = song.tracks[r.i];
      const sel = ui.sel.t === r.i && b >= ui.sel.b0 && b <= ui.sel.b1;
      const has = barHasContent(tr, b);
      og.fillStyle = sel ? C('--sel-strong') : has ? TRACK_COLORS[r.i % TRACK_COLORS.length] + '26' : C('--row-b');
      if (bw < 12) og.fillRect(x + 0.5, y + 1, Math.max(1, bw - 1), OV_RH - 2);
      else { roundRect(og, x + 1, y + 1, bw - 2, OV_RH - 2, 4); og.fill(); }
      if (sel) { og.strokeStyle = C('--accent2'); og.lineWidth = 2; og.stroke(); }
      if (tr.type === 'chord' && tr.chords[b] && bw >= 20) {
        og.fillStyle = C('--text');
        og.font = 'bold ' + (bw >= 110 ? 12 : 10) + 'px sans-serif';
        og.fillText(chordLabel(tr.chords[b]), x + 4, y + OV_RH / 2 + 1, bw - 6);
      }
    });
    if (b % 4 === 0) { og.strokeStyle = C('--line-bar'); og.lineWidth = 2; og.beginPath(); og.moveTo(x + 0.5, 2); og.lineTo(x + 0.5, H); og.stroke(); }
  }
  rows.forEach((r) => { if (r._dots) { r._dots(og); delete r._dots; } });
  og.restore();
  ovLabels(og, W, H, rows);
}
function overviewOverlay(W, H, sx, bw, playPos) {
  const sc = $('#scroller');
  const k = ppt();
  const vt0 = sc.scrollLeft / k;
  const vt1 = (sc.scrollLeft + sc.clientWidth - LW) / k;
  const vy = OV_TOP + cur * OV_RH;
  og.strokeStyle = C('--playhead');
  og.lineWidth = 1.5;
  og.setLineDash([3, 2]);
  const ovx = (t) => { const b = barOf(t); return OV_LW + (b + (t - barStart(b)) / barLen(b)) * bw - sx; };
  og.strokeRect(ovx(vt0), vy, ovx(Math.min(vt1, totalTicks())) - ovx(vt0), OV_RH);
  og.setLineDash([]);
  if (ovDrag && ovDrag.over) {
    const { r, b } = ovDrag.over;
    const n = ovDrag.b1 - ovDrag.b0 + 1;
    og.fillStyle = 'rgba(76,141,255,.35)';
    og.fillRect(OV_LW + b * bw - sx, OV_TOP + r * OV_RH, n * bw, OV_RH);
  }
  if (playPos != null) {
    og.fillStyle = C('--playhead');
    og.fillRect(ovx(playPos) - 1, 0, 2, H);
  }
}
function ovLabels(og, W, H, rows) {
  og.fillStyle = C('--label-bg');
  og.fillRect(0, 0, OV_LW, H);
  rows.forEach((r, ri) => {
    const y = OV_TOP + ri * OV_RH;
    og.textBaseline = 'middle';
    if (r.kind === 'rule') {
      og.fillStyle = C('--muted');
      og.font = `${OV_RH < 12 ? Math.max(7, OV_RH - 1) : 11}px sans-serif`;
      og.fillText('R  テンポ変化', 6, y + OV_RH / 2);
      return;
    }
    const tr = song.tracks[r.i];
    og.fillStyle = TRACK_COLORS[r.i % TRACK_COLORS.length];
    og.fillRect(0, y + 2, 5, OV_RH - 4);
    og.fillStyle = r.i === cur ? C('--accent2') : C('--text');
    og.font = `${r.i === cur ? 'bold ' : ''}${OV_RH < 12 ? Math.max(7, OV_RH - 1) : 11}px sans-serif`;
    og.fillText(`${r.i + 1}  ${tr.name}${tr.locked ? '（ロック）' : ''}`, 9, y + OV_RH / 2, OV_LW - 12);
  });
  og.fillStyle = C('--muted');
  og.font = '10px sans-serif';
  og.fillText('小節 →', 6, OV_TOP / 2);
}
function ovHit(e) {
  const rect = $('#ovScroller').getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  const b = Math.floor((px + $('#ovScroller').scrollLeft - OV_LW) / ovBarW());
  const r = Math.floor((py - OV_TOP) / OV_RH);
  const rows = ovRows();
  return { px, py, b, r, rowKind: rows[r] ? rows[r].kind : null };
}
function selectBars(t, b0, b1) {
  ui.sel = { t, b0: Math.min(b0, b1), b1: Math.max(b0, b1) };
  ui.selBar = ui.sel.b0;
}
function scrollEditorToBar(b) {
  const sc = $('#scroller');
  const x = barStart(b) * ppt();
  if (x < sc.scrollLeft || x > sc.scrollLeft + sc.clientWidth - LW - 40) sc.scrollLeft = x;
}
function ovDown(e) {
  const h = ovHit(e);
  if (h.r < 0 || !h.rowKind) return;
  if (h.px < OV_LW) { if (h.rowKind === 'track') selectTrack(h.r); return; }
  if (h.b < 0 || h.b >= song.bars) return;
  if (h.rowKind === 'rule') { editTempo(h.b); return; }
  e.preventDefault();
  const inSel = ui.sel.t === h.r && h.b >= ui.sel.b0 && h.b <= ui.sel.b1;
  if (e.shiftKey && ui.sel.t === h.r) selectBars(h.r, ui.sel.b0, h.b);
  else if (!inSel) selectBars(h.r, h.b, h.b);
  if (cur !== h.r) selectTrack(h.r, false);
  ui.startTick = barStart(ui.sel.b0);
  ui.inputTick = ui.startTick;
  scrollEditorToBar(ui.sel.b0);
  ovDrag = { t: h.r, b0: ui.sel.b0, b1: ui.sel.b1, start: h, over: null, moved: false, x: e.clientX, y: e.clientY, inSel, shift: e.shiftKey };
  $('#ovScroller').setPointerCapture(e.pointerId);
  renderEditorTools();
  draw();
  drawOverview();
  updateMini();
}
function ovMove(e) {
  if (!ovDrag) return;
  if (!ovDrag.moved && Math.hypot(e.clientX - ovDrag.x, e.clientY - ovDrag.y) < 6) return;
  ovDrag.moved = true;
  const h = ovHit(e);
  $('#ovTrash').classList.add('show');
  const trash = $('#ovTrash').getBoundingClientRect();
  const overTrash = e.clientX >= trash.left && e.clientX <= trash.right && e.clientY >= trash.top && e.clientY <= trash.bottom;
  $('#ovTrash').classList.toggle('hot', overTrash);
  ovDrag.trash = overTrash;
  ovDrag.over = !overTrash && h.r >= 0 && h.r < song.tracks.length && h.b >= 0 && h.b < song.bars ? { r: h.r, b: h.b } : null;
  drawOverview();
}
function ovUp() {
  if (!ovDrag) return;
  const d = ovDrag;
  ovDrag = null;
  $('#ovTrash').classList.remove('show', 'hot');
  if (!d.moved) {
    if (d.inSel && !d.shift) { selectBars(d.t, d.start.b, d.start.b); ui.startTick = barStart(d.start.b); }
    drawOverview(); draw(); renderEditorTools();
    if (isPhone) { setPhoneView('edit'); scrollEditorToBar(ui.sel.b0); }
    return;
  }
  const src = song.tracks[d.t];
  if (d.trash) {
    if (locked(src)) return toast('ロックされています');
    edit(() => clearBars(src, d.b0, d.b1), `${d.b0 + 1}〜${d.b1 + 1}小節を消す`);
    toast(`「${src.name}」の${d.b0 + 1}〜${d.b1 + 1}小節を消しました`);
    return;
  }
  if (!d.over) { drawOverview(); return; }
  const dst = song.tracks[d.over.r];
  if (src.type !== dst.type) { toast('ちがう種類のトラックにはコピーできません'); drawOverview(); return; }
  if (locked(dst)) { toast('コピー先はロックされています'); drawOverview(); return; }
  if (d.over.r === d.t && d.over.b === d.b0) { drawOverview(); return; }
  edit(() => copyBars(src, d.b0, d.b1, dst, d.over.b), `${d.b0 + 1}〜${d.b1 + 1}小節をコピー`);
  toast(`${src.name} ${d.b0 + 1}〜${d.b1 + 1}小節 → ${dst.name} ${d.over.b + 1}小節目へコピーしました`);
}
function selectTrack(i, redraw = true) {
  if (refSong) setTimeout(updateCompare, 0);
  if (i !== cur) { nsel.clear(); updateSelBar(); }
  const trChanged = i !== cur;
  cur = i;
  if (trChanged && typeof proView === 'function') setTimeout(proView, 0);
  if (ui.sel.t !== i) ui.sel = { ...ui.sel, t: i };
  ui.selBar = ui.sel.b0;
  renderTracks();
  renderEditorTools();
  resizeEditor();
  if (redraw) scrollToNotes();
  draw();
  drawOverview();
  if (ui.showScore) renderScorePanel();
  if (ui.view === 'score') { renderScorePal(); renderScoreEdit(); }
}
// 「◯小節目から変える」（テンポ・拍子・調・D.C.など）
const JUMPS = [
  ['segno', '𝄋 セーニョ（D.S. でもどる所）'], ['coda', '𝄌 コーダ（とんでくる所）'], ['tocoda', 'To Coda（ここの終わりからコーダへ）'],
  ['fine', 'Fine（ここの終わりでおわり）'], ['dc', 'D.C.（ここの終わりから曲の頭へ）'], ['ds', 'D.S.（ここの終わりからセーニョへ）'],
];
function jumpsAt(b) { return JUMPS.filter(([k]) => (song.jumps || {})[k] === b).map(([k]) => k); }
function setJump(b, kind) {
  if (song.locks.rules) return toast('ルールの変更はロックされています');
  edit(() => {
    song.jumps = song.jumps || {};
    if (kind === '-') { for (const [k] of JUMPS) if (song.jumps[k] === b) delete song.jumps[k]; return; }
    if (song.jumps[kind] === b) delete song.jumps[kind];
    else {
      song.jumps[kind] = b;
      if (kind === 'dc') delete song.jumps.ds;
      if (kind === 'ds') delete song.jumps.dc;
    }
  }, 'D.C.・コーダなど');
  const j = song.jumps || {};
  if (kind === 'ds' && j.segno == null) toast('D.S. でもどる所に「𝄋 セーニョ」もつけてください');
  else if (kind === 'tocoda' && j.coda == null) toast('とんでいく先の小節に「𝄌 コーダ」もつけてください');
}
function editTempo(b) { openBarDialog(b); }
function openBarDialog(b) {
  if (song.locks.rules) return toast('ルールの変更はロックされています');
  b = clamp(b, 0, song.bars - 1);
  const d = $('#dlgBar');
  const num = song.pickup ? b : b + 1;
  $('#barTitle').textContent = b === 0 ? '曲のはじめの設定' : `${num}小節目から変える`;
  const m = meterAt(b);
  const k = keyAt(b);
  opt($('#barMeterN'), [1, 2, 3, 4, 5, 6, 7, 9, 12].map((n) => [n, n]), m[0]);
  opt($('#barMeterD'), [2, 4, 8].map((n) => [n, n]), m[1]);
  const keys = [];
  for (let i = 0; i < 12; i++) keys.push([i + ':0', keyLabel(i, false) + '（' + keyEn(i, false) + '）']);
  for (let i = 0; i < 12; i++) keys.push([i + ':1', keyLabel(i, true) + '（' + keyEn(i, true) + '）']);
  opt($('#barKey'), keys, k.key + ':' + (k.minor ? 1 : 0));
  $('#barTempo').value = (b === 0 ? song.bpm : song.tempos[b]) || bpmAt(b);
  $('#barRamp').value = '';
  $('#barTempoOn').checked = b === 0 || !!song.tempos[b];
  $('#barMeterOn').checked = b === 0 || !!(song.meters || {})[b];
  $('#barKeyOn').checked = b === 0 || !!(song.keys || {})[b];
  $('#barKeyOn').closest('label').style.display = b === 0 ? 'none' : '';
  $('#barKeyHint').style.display = b === 0 ? 'none' : '';
  const cur = jumpsAt(b);
  opt($('#barJump'), [['', cur.length ? 'いま：' + cur.map((x) => JUMPS.find((j) => j[0] === x)[1].split('（')[0]).join('・') : 'なし'], ...JUMPS.map(([v, t]) => [v, (cur.includes(v) ? '✓ ' : '') + t]), ...(cur.length ? [['-', 'この小節の記号を消す']] : [])], '');
  for (const id of ['#barTempo', '#barMeterN', '#barMeterD', '#barKey']) $(id).onchange = $(id).oninput = () => { $(id).closest('label').querySelector('input[type=checkbox]').checked = true; };
  $('#barOk').onclick = () => {
    const tOn = $('#barTempoOn').checked;
    const mOn = $('#barMeterOn').checked;
    const kOn = $('#barKeyOn').checked;
    const nm = [+$('#barMeterN').value, +$('#barMeterD').value];
    const [kk, mm] = $('#barKey').value.split(':').map(Number);
    const jump = $('#barJump').value;
    const ramp = $('#barRamp').value;
    edit(() => {
      // だんだん遅く／速く：小節ごとにテンポを少しずつ変える（楽譜には rit. / accel. と書く）
      song.ramps = song.ramps || {};
      if (ramp === '-') {
        const r0 = song.ramps[b];
        if (r0) { for (let i = 0; i < r0.n; i++) delete song.tempos[b + i]; delete song.ramps[b]; }
      } else if (ramp) {
        const [type, n0] = ramp.split(':');
        const n = Math.min(+n0, song.bars - b);
        const from = bpmAt(Math.max(0, b - 1));
        const to = Math.round(from * (type === 'rit' ? 0.7 : 1.3));
        for (let i = 0; i < n; i++) song.tempos[b + i] = clamp(Math.round(from + ((to - from) * (i + 1)) / n), 30, 240);
        song.ramps[b] = { type, n };
      }
      song.meters = song.meters || {};
      song.keys = song.keys || {};
      if (b === 0) {
        song.bpm = clamp(Math.round(+$('#barTempo').value) || song.bpm, 30, 240);
        if (!(ramp && ramp !== '-')) delete song.tempos[0];
        song.meter = nm;
        delete song.meters[0];
      } else {
        if (ramp && ramp !== '-') { /* だんだんで入れたテンポをのこす */ } else if (tOn) { song.tempos[b] = clamp(Math.round(+$('#barTempo').value) || bpmAt(b), 30, 240); if (song.tempoHid) delete song.tempoHid[b]; } else delete song.tempos[b];
        if (mOn && String(nm) !== String(meterAt(b - 1))) song.meters[b] = nm; else delete song.meters[b];
        const prev = keyAt(b - 1);
        if (kOn && !(prev.key === kk && !!prev.minor === !!mm)) song.keys[b] = { key: kk, minor: !!mm }; else delete song.keys[b];
      }
    }, b === 0 ? 'テンポ・拍子' : `${num}小節目からの変化`);
    if (jump) setJump(b, jump);
    d.close();
    ui.startTick = Math.min(ui.startTick, totalTicks());
    renderSettings();
  };
  d.showModal();
}

/* ============================================================
   小節の操作（コピー・クリア・挿入・削除）
   ============================================================ */
function extractBars(tr, b0, b1) {
  const a = barStart(b0);
  const z = barStart(b1 + 1);
  if (tr.type === 'melody') return tr.notes.filter((n) => n.s >= a && n.s < z).map((n) => ({ ...n, s: n.s - a }));
  if (tr.type === 'drum') { const o = {}; for (const id in tr.grid) for (const s in tr.grid[id]) if (+s >= a && +s < z) { (o[id] = o[id] || {})[+s - a] = tr.grid[id][s]; } return o; }
  return tr.chords.slice(b0, b1 + 1).map((c) => (c ? { ...c } : null));
}
function clearBars(tr, b0, b1) {
  const a = barStart(b0);
  const z = barStart(b1 + 1);
  if (tr.type === 'melody') tr.notes = tr.notes.filter((n) => n.s < a || n.s >= z);
  else if (tr.type === 'drum') { for (const id in tr.grid) { for (const s in tr.grid[id]) if (+s >= a && +s < z) delete tr.grid[id][s]; if (!Object.keys(tr.grid[id]).length) delete tr.grid[id]; } }
  else for (let b = b0; b <= b1; b++) tr.chords[b] = null;
}
function copyBars(src, b0, b1, dst, to) {
  const n = b1 - b0 + 1;
  const data = extractBars(src, b0, b1);
  const last = Math.min(to + n - 1, song.bars - 1);
  clearBars(dst, to, last);
  const off = barStart(to);
  const lim = barStart(last + 1);
  if (dst.type === 'melody') dst.notes.push(...data.filter((x) => x.s + off < lim).map((x) => ({ ...x, s: x.s + off })));
  else if (dst.type === 'drum') { for (const id in data) for (const s in data[id]) if (+s + off < lim) (dst.grid[id] = dst.grid[id] || {})[+s + off] = data[id][s]; }
  else data.forEach((c, i) => { if (to + i <= last) dst.chords[to + i] = c; });
}
// 小節につけた記号（テンポ・拍子・調・くり返し・D.C.など）の番号をずらす
function shiftBarMarks(fromBar, n) {
  const mv = (obj) => { const o = {}; for (const b in obj) { const bi = +b; if (bi >= fromBar) { if (bi + n >= fromBar) o[bi + n] = obj[b]; } else if (n > 0 || bi < fromBar + n) o[bi] = obj[b]; } return o; };
  song.tempos = mv(song.tempos || {});
  song.ramps = mv(song.ramps || {});
  song.meters = mv(song.meters || {});
  song.keys = mv(song.keys || {});
  if (song.rehearsal) song.rehearsal = mv(song.rehearsal);
  if (song.tempoHid) song.tempoHid = mv(song.tempoHid);
  if (song.tempoWords) song.tempoWords = mv(song.tempoWords);
  for (const t of song.tracks) { if (t.clefChg) t.clefChg = mv(t.clefChg); if (t.mrep) t.mrep = mv(t.mrep); }
  const R = song.repeats || { start: [], end: [], volta: {} };
  const mvArr = (arr) => arr.map((b) => (b >= fromBar ? b + n : n < 0 && b >= fromBar + n ? -1 : b)).filter((b) => b >= 0);
  song.repeats = { start: mvArr(R.start || []), end: mvArr(R.end || []), volta: mv(R.volta || {}) };
  const J = song.jumps || {};
  for (const k in J) if (J[k] != null) { if (J[k] >= fromBar) J[k] += n; else if (n < 0 && J[k] >= fromBar + n) J[k] = null; }
  // 楽譜の改行の位置も、いっしょにずらす（小節を入れたり消したりしても、同じ小節の前で改行）
  const S = song.score;
  if (S && Array.isArray(S.breaks) && S.breaks.length) {
    const out = new Set();
    for (const b of S.breaks) {
      if (n > 0) out.add(b > fromBar ? b + n : b); // ちょうど入れた所の改行は、入れた小節の前にのこす
      else if (b >= fromBar) out.add(b + n);
      else if (b >= fromBar + n) out.add(fromBar + n); // 消した小節の前の改行は、次の小節にひきつぐ
      else out.add(b);
    }
    S.breaks = [...out].filter((b) => b > 0).sort((x, y) => x - y);
    if (!S.breaks.length) delete S.breaks;
  }
}
// fromBar の前に n 小節入れる（n<0 のときは fromBar-|n|〜fromBar-1 を取りのぞく）
function shiftAll(fromBar, n) {
  const a = barStart(fromBar);
  const d = n > 0 ? n * barLen(Math.min(fromBar, song.bars - 1)) : -(a - barStart(fromBar + n));
  const keep = (t) => t >= a || n > 0 || t < a + d;
  for (const tr of song.tracks) {
    if (tr.type === 'melody') {
      tr.notes = tr.notes.filter((x) => keep(x.s)).map((x) => (x.s >= a ? { ...x, s: x.s + d } : x));
      for (const k of ['dyn', 'hairpins', 'slurs', 'texts', 'instChg', 'pedals', 'ottava', 'trills', 'vgap']) if (tr[k]) tr[k] = tr[k].filter((x) => keep(x.t != null ? x.t : x.s)).map((x) => { const y = { ...x }; for (const f of ['t', 's', 'e']) if (y[f] != null && y[f] >= a) y[f] += d; return y; });
    } else if (tr.type === 'drum') {
      for (const id in tr.grid) {
        const ng = {};
        for (const st in tr.grid[id]) { const t = +st; if (!keep(t)) continue; ng[t >= a ? t + d : t] = tr.grid[id][st]; }
        tr.grid[id] = ng;
      }
    } else {
      while (tr.chords.length < fromBar) tr.chords.push(null);
      if (n > 0) tr.chords.splice(fromBar, 0, ...Array(n).fill(null));
      else tr.chords.splice(fromBar + n, -n);
    }
  }
  // 消した所に拍子や調の変化があったら、そのあとの小節に引きつぐ
  if (n < 0) {
    const mAfter = fromBar < song.bars ? meterAt(fromBar) : null;
    const kAfter = fromBar < song.bars ? keyAt(fromBar) : null;
    shiftBarMarks(fromBar, n);
    const nb = fromBar + n;
    if (mAfter && nb > 0 && !(song.meters || {})[nb]) song.meters[nb] = mAfter;
    if (kAfter && nb > 0 && !(song.keys || {})[nb]) song.keys[nb] = kAfter;
  } else {
    const m = meterAt(Math.min(fromBar, song.bars - 1));
    shiftBarMarks(fromBar, n);
    if (fromBar > 0 && !(song.meters || {})[fromBar] && JSON.stringify(m) !== JSON.stringify(song.meter)) song.meters[fromBar] = m;
  }
}
function insertBars() {
  if (song.locks.rules) return toast('小節数の変更はロックされています');
  const at = ui.sel.b0;
  const n = ui.sel.b1 - ui.sel.b0 + 1;
  edit(() => { shiftAll(at, n); song.bars = Math.min(MAX_BARS, song.bars + n); }, `${at + 1}小節目の前に${n}小節入れる`);
  renderSettings();
  toast(`${at + 1}小節目の前に${n}小節入れました`);
}
function deleteBars() {
  if (song.locks.rules) return toast('小節数の変更はロックされています');
  const at = ui.sel.b0;
  const n = ui.sel.b1 - ui.sel.b0 + 1;
  if (n >= song.bars) return toast('全部の小節は消せません');
  if (!confirm(`${at + 1}〜${at + n}小節目を、すべてのトラックから取りのぞいて詰めますか？`)) return;
  edit(() => {
    shiftAll(at + n, -n);
    song.bars -= n;
    selectBars(cur, Math.min(at, song.bars - 1), Math.min(at, song.bars - 1));
  }, `${at + 1}〜${at + n}小節を削除`);
  renderSettings();
}

/* ============================================================
   コード（和音）
   ============================================================ */
function diatonic(at) {
  const ka = at != null ? keyAt(at) : null;
  const k = ka ? ka.key : song.key;
  const list = (ka ? ka.minor : isMinor())
    ? [[0, 'm', 'Ⅰm'], [5, 'm', 'Ⅳm'], [7, 'm', 'Ⅴm'], [7, '7', 'Ⅴ7'], [8, 'M', '♭Ⅵ'], [10, 'M', '♭Ⅶ'], [3, 'M', '♭Ⅲ'], [2, 'dim', 'Ⅱdim']]
    : [[0, 'M', 'Ⅰ'], [5, 'M', 'Ⅳ'], [7, 'M', 'Ⅴ'], [7, '7', 'Ⅴ7'], [9, 'm', 'Ⅵm'], [2, 'm', 'Ⅱm'], [4, 'm', 'Ⅲm'], [0, 'M7', 'ⅠM7']];
  return list.map(([iv, q, deg]) => ({ r: (k + iv) % 12, q, deg }));
}
function previewChord(tr, c) {
  const ctx = ensureAudio();
  let root = 48 + (c.r % 12);
  if (root > 54) root -= 12;
  CHORD_Q[c.q].iv.forEach((x) => Sound.playNote(ctx, previewOut, tr.inst, root + 12 + x, ctx.currentTime + 0.01, 0.6, 0.5));
}
function setChord(c) {
  const tr = track();
  if (locked(tr)) return toast('このトラックはロックされています');
  const half = ui.chordHalf || 0;
  const old = tr.chords[ui.selBar];
  if (half === 2 && !old) { toast('先に「前半」のコードを入れてね'); ui.chordHalf = 1; renderEditorTools(); return; }
  edit(() => {
    chordSetAt(tr, ui.selBar, half === 2 ? chordHalf(ui.selBar) : 0, c, half === 0);
    if (c) previewChord(tr, c);
    // 前半を入れたら後半へ、後半（またはまるごと）を入れたら次の小節へ
    if (half === 1 && c) ui.chordHalf = 2;
    else {
      if (half === 2) ui.chordHalf = 1;
      const nb = Math.min(ui.selBar + 1, song.bars - 1);
      selectBars(cur, nb, nb);
    }
  }, 'コードを入れる');
}

/* ============================================================
   便利機能
   ============================================================ */
function scaleDegreesInRange(lo, hi) {
  const pcs = scalePcs();
  const out = [];
  for (let m = lo; m <= hi; m++) if (pcs.has(m % 12)) out.push(m);
  return out;
}
/* ---------- コード・スケール（そのコードの上で使える音階） ----------
   コードごとに「使える音階」を決める。候補の音階のうち、コードの音を全部ふくみ、曲の調の音といちばん多く重なるものをえらぶ
   （例：ハ長調の E7 → ミ ファ ソ♯ ラ シ ド レ。ソではなくソ♯を使う）
   音は3つに分ける：0＝コードの音、1＝テンション（のばしてもきれいな音。9th・11th・13th など）、
   2＝アボイド（コードの音の半音上でにごる音。通りすぎるだけにする） */
const CHORD_SCALES = {
  ion: [0, 2, 4, 5, 7, 9, 11], lyd: [0, 2, 4, 6, 7, 9, 11], mix: [0, 2, 4, 5, 7, 9, 10], dor: [0, 2, 3, 5, 7, 9, 10], aeo: [0, 2, 3, 5, 7, 8, 10],
  phr: [0, 1, 3, 5, 7, 8, 10], loc: [0, 1, 3, 5, 6, 8, 10], loc2: [0, 2, 3, 5, 6, 8, 10], mel: [0, 2, 3, 5, 7, 9, 11], hm: [0, 2, 3, 5, 7, 8, 11],
  lydb7: [0, 2, 4, 6, 7, 9, 10], mixb13: [0, 2, 4, 5, 7, 8, 10], phrdom: [0, 1, 4, 5, 7, 8, 10], alt: [0, 1, 3, 4, 6, 8, 10],
  hw: [0, 1, 3, 4, 6, 7, 9, 10], wh: [0, 2, 3, 5, 6, 8, 9, 11], wt: [0, 2, 4, 6, 8, 10], lydaug: [0, 2, 4, 6, 8, 9, 11],
};
const CHORD_SCALE_NAMES = { ion: 'アイオニアン（長音階）', lyd: 'リディアン', mix: 'ミクソリディアン', dor: 'ドリアン', aeo: 'エオリアン（自然短音階）', phr: 'フリジアン', loc: 'ロクリアン', loc2: 'ロクリアン♯2', mel: 'メロディック・マイナー', hm: 'ハーモニック・マイナー', lydb7: 'リディアン♭7', mixb13: 'ミクソリディアン♭13', phrdom: 'ハーモニック・マイナー・パーフェクト5thビロウ', alt: 'オルタード', hw: 'コンビネーション・オブ・ディミニッシュ', wh: 'ディミニッシュ', wt: 'ホールトーン', lydaug: 'リディアン・オーギュメント' };
const CHORD_SCALE_FAMILY = {
  M: ['ion', 'lyd', 'mix'], 6: ['ion', 'lyd', 'mix'], add9: ['ion', 'lyd', 'mix'], M7: ['ion', 'lyd'], M9: ['ion', 'lyd'],
  m: ['dor', 'aeo', 'phr'], m7: ['dor', 'aeo', 'phr'], m9: ['dor', 'aeo'], m6: ['dor', 'mel'], mM7: ['mel', 'hm'],
  7: ['mix', 'lydb7', 'mixb13', 'phrdom'], 9: ['mix', 'lydb7', 'mixb13'], '7b9': ['phrdom', 'hw'], '7s9': ['hw', 'alt'],
  '7sus4': ['mix', 'dor'], sus4: ['mix', 'ion', 'dor'], m7b5: ['loc', 'loc2'], dim: ['loc', 'wh'], dim7: ['wh'], aug: ['wt', 'lydaug'],
};
const DOMINANT_Q = new Set(['7', '9', '7b9', '7s9']);
function chordScale(c, keyPcs) {
  const iv = CHORD_Q[c.q].iv.map((x) => x % 12);
  let best = null, bs = -1;
  // 調の外の音を根音にする属7（♭Ⅱ7＝裏コード、♭Ⅶ7 など）は、リディアン♭7 を使うのがきまり
  const fam = (c.q === '7' || c.q === '9') && !keyPcs.has(c.r % 12) ? ['lydb7'] : CHORD_SCALE_FAMILY[c.q] || ['ion'];
  for (const id of fam) {
    const sc = CHORD_SCALES[id];
    if (!iv.every((x) => sc.includes(x))) continue;
    const ov = sc.filter((x) => keyPcs.has((c.r + x) % 12)).length - (sc.length - 7) * 0.5; // 8音の音階は少しひかえめに
    if (ov > bs) { bs = ov; best = id; }
  }
  const rel = best ? CHORD_SCALES[best] : [...new Set([...iv, ...[...keyPcs].map((x) => (x - c.r + 12) % 12)])];
  const kind = new Map();
  for (const x of rel) {
    let k;
    if (iv.includes(x)) k = 0;
    else if (DOMINANT_Q.has(c.q)) k = x === 5 ? 2 : 1; // 属7：♭9・♯9・♯11・♭13・9・13 はテンション、11 はアボイド
    else if (c.q === '7sus4' || c.q === 'sus4') k = x === 4 || x === 3 ? 2 : iv.includes((x + 11) % 12) && x !== 9 ? 2 : 1;
    else k = iv.includes((x + 11) % 12) ? 2 : 1; // コードの音の半音上はアボイド
    kind.set((c.r + x) % 12, k);
  }
  return { id: best, name: best ? CHORD_SCALE_NAMES[best] : '', pcs: new Set(kind.keys()), kind };
}
// おまかせ作曲：音階・コード・ほかのパートに合わせて、メロディを自動で作ります
// ・コード・スケール：コードごとに使える音階を決め、コードの音・テンション・アボイドを区別する（7th や 9th のおしゃれなコードにも合う）
// ・ガイドトーン：コードがかわる所では3度・7度をえらびやすくし、7度は次のコードで2度下がって解決する
// ・クロマチック・アプローチ：ジャズのコードの曲では、半音となりからコードの音へすべりこむ音を、うら拍に少しだけ使う
// ・和声：拍の頭はコードの音。コードの外の音は、となりの音へなめらかにつなぐ（経過音・ししゅう音）だけ
// ・対位法：ほかのパートと強い拍でぶつからない（2度・7度・増4度をさける）、平行5度・8度をさける、声部を交差させない
// ・旋律：となりの音へ進むのを基本に、大きくとんだら反対向きにもどる。増4度・7度のとびはしない。さいごは主音
// リズムを先に決めてから、きまりをやぶるほど点が高くなる「減点」をつけ、曲全体で減点がいちばん少ない音のならびをえらぶ
// おまかせ作曲の設定（前にえらんだものをおぼえておく）
const AUTO_DEFAULT = { style: 'auto', density: 1, rests: 1, span: 1, height: 1, motif: 1, orn: 1, form: 0 };
function autoOpts() {
  try { const o = JSON.parse(lsGet('otsumiki-auto', '') || '{}'); const r = { ...AUTO_DEFAULT }; for (const k in r) if (k === 'style' ? ['auto', 'easy', 'pop', 'jazz'].includes(o[k]) : [0, 1, 2].includes(o[k])) r[k] = o[k]; return r; } catch (e) { return { ...AUTO_DEFAULT }; }
}
function autoCompose(tr, opt) {
  opt = { ...AUTO_DEFAULT, ...(opt || autoOpts()) };
  const chordTr = song.tracks.find((t) => t.type === 'chord' && t.chords.some(Boolean));
  // ジャズらしいコード（M7・m7・9th・dim7 など）がある曲か
  const jazzSong = !!chordTr && chordTr.chords.some((c, b) => chordSegs(c, b).some((x) => !['M', 'm', '7', 'sus4', 'dim', 'aug'].includes(x.c.q)));
  // 感じ：やさしい（童謡のように歌いやすい）・ポップス・ジャズ。おまかせ＝コードを見て決める
  const style = opt.style === 'auto' ? (jazzSong ? 'jazz' : 'pop') : opt.style;
  const useChr = style === 'jazz' && jazzSong;
  // 音域：はば（せまい＝6度・ふつう＝1オクターブと少し・広い＝1オクターブ半）と、高さ
  const [rlo0, rhi0] = trackRange(tr);
  const lo = Math.max(rlo0, (RANGES[tr.range] || RANGES.soprano)[1]);
  let LO = lo + [1, 5, 9][opt.height], HI = LO + [9, 14, 19][opt.span];
  if (HI > rhi0) { LO -= HI - rhi0; HI = rhi0; }
  if (LO < rlo0) LO = rlo0;
  const rnd = Math.random;
  const pickW = (arr) => { let t = 0; for (const x of arr) t += x[1]; let r = rnd() * t; for (const x of arr) { r -= x[1]; if (r <= 0) return x[0]; } return arr[arr.length - 1][0]; };
  const sum = (a) => a.reduce((x, y) => x + y, 0);

  // ---- 1) リズム ----
  // 旋律の形：2小節を1つのまとまり（フレーズ）にして、8小節で「モチーフ → くり返し → 変化（山場）→ しめくくり」
  // ・モチーフのリズムをくり返す（おぼえやすくなる）
  // ・フレーズのおわりは長い音にして、休符で息つぎをする。次のフレーズへ入る前に、短い音（弱起）を入れることもある
  const sync = style === 'jazz' ? 1 : style === 'pop' ? 0.6 : 0;
  // 1拍の中の音のならび（1＝1拍）と、えらばれやすさ
  const CELLS = {
    s: [
      [[[1], 5], [[2], 3], [[1.5, 0.5], 1.2], [[3], 0.5]],
      [[[1], 5], [[0.5, 0.5], 3.5], [[2], 1.5], [[1.5, 0.5], 2], [[0.5, 1, 0.5], sync]],
      [[[0.5, 0.5], 6], [[1], 2.5], [[0.25, 0.25, 0.5], 1.2], [[0.5, 0.25, 0.25], 1.2], [[1.5, 0.5], 1.5], [[0.75, 0.25], style === 'easy' ? 0 : 0.8], [[0.5, 1, 0.5], sync]],
    ],
    c: [ // 6/8 など、1拍が3つに分かれる拍子
      [[[1], 5], [[2], 2]],
      [[[1], 3], [[2 / 3, 1 / 3], 4], [[1 / 3, 1 / 3, 1 / 3], 2], [[2], 0.8]],
      [[[1 / 3, 1 / 3, 1 / 3], 5], [[2 / 3, 1 / 3], 3], [[1], 1]],
    ],
  };
  const genBar = (b) => {
    const bl = barLen(b), beat = beatAt(b);
    if (bl % beat || beat < 12) return [bl];
    const tbl = CELLS[beat % 72 === 0 && beat % 48 !== 0 ? 'c' : 's'][opt.density];
    const out = [];
    let pos = 0;
    while (pos < bl) {
      const rem = (bl - pos) / beat, even = Math.round(pos / beat) % 2 === 0;
      const ok = tbl.filter(([c, w]) => w > 0 && sum(c) <= rem + 1e-6 && (sum(c) <= 1 || even) && c.every((x) => Number.isInteger(Math.round(x * beat * 1000) / 1000)));
      const cell = ok.length ? pickW(ok) : [rem];
      for (const x of cell) out.push(Math.round(x * beat));
      pos += Math.round(sum(cell) * beat);
    }
    return out;
  };
  // うしろから want 以上をまとめて、1つの長い音にする
  const endLong = (r, want) => { r = r.slice(); let got = 0; while (r.length && got < want) got += r.pop(); r.push(got); return r; };
  const units = [];
  /* 8小節の形（楽節）。古典の作曲法の2つの型：
     ・センテンス：モチーフ(M) → くり返し(M2) → 発展(N：モチーフを半分に切って たたみかけ、山場へ) → しめくくり(K)
     ・ピリオド　：前半＝モチーフ(M) → 対比(H：半終止で「問い」) ／ 後半＝モチーフ(M) → しめくくり(K：山場をへて完全終止で「答え」) */
  const form = opt.form === 0 ? (rnd() < 0.5 ? 1 : 2) : opt.form; // 1 センテンス・2 ピリオド
  for (let b0 = 0; b0 < song.bars; b0 += 2) units.push({ b0, nb: Math.min(2, song.bars - b0), role: (form === 2 ? ['M', 'H', 'M', 'K'] : ['M', 'M2', 'N', 'K'])[Math.floor((b0 % 8) / 2)] });
  units[units.length - 1].role = 'K';
  units[units.length - 1].final = true;
  // 山場（いちばん高い音）を置くフレーズ：センテンスは「発展」、ピリオドは後半の「しめくくり」
  for (const u of units) u.climb = form === 2 ? u.role === 'K' && units.length > 2 : u.role === 'N';
  const motifR = {}; // モチーフのリズム（小節の長さごとにおぼえる）
  const barRhythm = (kind, j, b) => {
    const key = kind + ':' + j + ':' + barLen(b) + ':' + beatAt(b);
    if (opt.motif === 0) return genBar(b);
    if (!motifR[key]) motifR[key] = genBar(b);
    return motifR[key].slice();
  };
  const slots = [];
  units.forEach((u, ui) => {
    const items = []; // { d, rest, pick }
    for (let j = 0; j < u.nb; j++) {
      const b = u.b0 + j, bl = barLen(b), beat = beatAt(b), nb = Math.max(1, Math.round(bl / beat));
      const lastBar = j === u.nb - 1;
      // フレーズのおわりに休符（息つぎ）を入れるか。入れるときは、そのぶん長い音を長めにとっておく
      const cut = lastBar && opt.rests > 0 && nb >= (opt.rests === 2 ? 3 : 4) && (opt.rests === 2 || u.final || rnd() < 0.6) ? beat : 0;
      let r;
      if (u.role === 'K' && lastBar) r = u.final || nb <= 2 ? [bl] : endLong(barRhythm('M', 0, b), Math.max(2 * beat, bl / 2));
      else {
        const kind = u.role === 'N' ? 'N' : u.role === 'H' ? 'H' : 'M';
        // 「くり返し」が ふつう のときは、ときどき2小節目だけ変える
        // 発展（N）：モチーフのはじめの1小節を「断片」にして、2回たたみかける（フラグメンテーション）
        r = u.role === 'N' && opt.motif > 0 ? barRhythm('M', 0, b) : u.role === 'M2' && j === 1 && opt.motif === 1 && rnd() < 0.3 ? genBar(b) : barRhythm(kind, u.role === 'K' ? 0 : j, b);
        if (lastBar) r = endLong(r, nb <= 2 ? beat : Math.min(2 * beat + cut, bl - beat));
      }
      const its = r.map((d) => ({ d, b }));
      if (lastBar) {
        // フレーズのおわり：長い音を1拍ちぢめて休符にする（息つぎ）。次のフレーズがあれば、そこに弱起の音を入れることも
        const L = its[its.length - 1];
        if (cut && L.d >= 2 * beat) {
          L.d -= cut;
          if (!u.final && rnd() < [0, 0.35, 0.3][opt.rests] && beat % 2 === 0) { if (rnd() < 0.6) its.push({ d: cut / 2, b, pick: true }, { d: cut / 2, b, pick: true }); else its.push({ d: cut, b, pick: true }); } else its.push({ d: cut, b, rest: true });
        }
      } else if (j === 0 && opt.rests === 2 && u.role !== 'K' && ui > 0 && its[0].d >= beat && beat % 2 === 0 && rnd() < 0.35) {
        // 休符が多め：フレーズを拍のうらから始める
        its.splice(0, 1, { d: beat / 2, b, rest: true }, { d: its[0].d - beat / 2, b });
      }
      items.push(...its);
    }
    let s = barStart(u.b0), k = 0;
    for (const it of items) {
      const b = it.b, bl = barLen(b), beat = beatAt(b), off = s - barStart(b);
      if (it.rest) { if (slots.length) slots[slots.length - 1].restAfter = true; } else {
        // 拍の強さ：3＝小節の頭、2＝まん中の強い拍（4拍子の3拍目など）、1＝ほかの拍の頭、0＝うら
        const nb = Math.round(bl / beat);
        const strong = off === 0 ? 3 : off % beat !== 0 ? 0 : nb >= 4 && nb % 2 === 0 && off === (nb / 2) * beat ? 2 : 1;
        slots.push({ s, l: it.d, b, strong, gap: false, u: it.pick ? ui + 1 : ui, k: it.pick ? -1 : k++, pick: !!it.pick, endU: false });
      }
      s += it.d;
    }
    // そのフレーズのさいごの音（弱起はのぞく）
    for (let i = slots.length - 1; i >= 0; i--) if (slots[i].u === ui && !slots[i].pick) { slots[i].endU = true; break; }
  });
  slots.forEach((x, i) => { x.gap = i > 0 && !!slots[i - 1].restAfter; });
  const n = slots.length;
  if (!n) { tr.notes = []; return; }

  // ---- 2) まわりのようす（調・コード・ほかのパート） ----
  const hasKeys = !!(song.keys && Object.keys(song.keys).length);
  const pcsMemo = new Map();
  const pcsAtBar = (b) => {
    const k = keyAt(b);
    const id = k.key + ':' + (k.minor ? 1 : 0);
    if (!pcsMemo.has(id)) {
      const steps = (!hasKeys || (k.key === song.key && !!k.minor === isMinor())) ? SCALES[song.scale].steps : SCALES[k.minor ? 'minor' : 'major'].steps;
      pcsMemo.set(id, { key: k.key, steps, pcs: new Set(steps.map((x) => (x + k.key) % 12)) });
    }
    return pcsMemo.get(id);
  };
  const myMid = (trackRange(tr)[0] + trackRange(tr)[1]) / 2;
  const others = song.tracks.filter((t) => t !== tr && t.type === 'melody' && t.notes.length).map((t) => {
    const ns = [...t.notes].sort((a, z) => a.s - z.s);
    const mean = ns.reduce((a, x) => a + x.p, 0) / ns.length;
    // そのパートは自分より下か上か：まず音域の設定でくらべ、同じなら実際の音の高さでくらべる
    const mid = (trackRange(t)[0] + trackRange(t)[1]) / 2;
    const rel = mid !== myMid ? Math.sign(mid - myMid) : Math.abs(mean - (LO + HI) / 2) > 3 ? Math.sign(mean - (LO + HI) / 2) : 0;
    return { ns, mean, rel };
  });
  // ほかのパートと音域が重なるときは、自分の音域の中で、重ならない高さへ寄せる
  {
    const below = others.filter((o) => o.rel < 0).map((o) => o.mean), above = others.filter((o) => o.rel > 0).map((o) => o.mean);
    const rlo = rlo0, rhi = rhi0;
    let sh = 0;
    if (below.length) sh = Math.max(0, Math.min(rhi - HI, Math.ceil(Math.max(...below) + 5 - (LO + HI) / 2)));
    if (above.length && !sh) sh = -Math.max(0, Math.min(LO - rlo, Math.ceil((LO + HI) / 2 - (Math.min(...above) - 5))));
    LO += sh; HI += sh;
  }
  const centre = (LO + HI) / 2;
  // ある時刻に鳴っている音（パートごとに、いちばん高い音と低い音）
  const sounding = (o, t) => {
    let hi = null, lw = null;
    const ns = o.ns;
    let a = 0, z = ns.length;
    while (a < z) { const m = (a + z) >> 1; if (ns[m].s <= t) a = m + 1; else z = m; }
    for (let i = a - 1; i >= 0 && i >= a - 12; i--) { const x = ns[i]; if (x.s + x.l > t) { if (hi == null || x.p > hi) hi = x.p; if (lw == null || x.p < lw) lw = x.p; } }
    return hi == null ? null : { hi, lw };
  };
  const triadOf = (c) => new Set(CHORD_Q[c.q].iv.map((x) => (c.r + x) % 12));
  const barChords = []; // 小節ごとの [{o, pcs, root, q, cs}]
  if (chordTr) {
    for (let b = 0; b < song.bars; b++) {
      const K = pcsAtBar(b);
      barChords.push(chordSegs(chordTr.chords[b], b).map((x) => {
        const iv = CHORD_Q[x.c.q].iv;
        return { o: x.o, pcs: triadOf(x.c), root: x.c.r, q: x.c.q,
          cs: K.steps.length === 7 ? chordScale(x.c, K.pcs) : null, // 5音の音階などは、えらんだ音階のまま
          rich: iv.length > 3, // 7th・6th・9th のあるコード（テンションをのばしてよい）
          third: (x.c.r + iv[1]) % 12, seventh: iv.length > 3 && iv[3] >= 9 && iv[3] <= 11 ? (x.c.r + iv[3]) % 12 : -1 };
      }));
    }
  } else {
    // コードのトラックがないとき：音階の上にできる三和音から、ほかのパートの音に合うものを小節ごとに見立てる
    const tmpl = [[0, 3, 4, 0], [0, 5, 3, 4], [0, 4, 5, 3], [0, 3, 0, 4], [0, 1, 4, 0]][Math.floor(Math.random() * 5)];
    for (let b = 0; b < song.bars; b++) {
      const K = pcsAtBar(b);
      if (K.steps.length !== 7) { barChords.push([]); continue; }
      const tri = (d) => new Set([0, 2, 4].map((x) => (K.key + K.steps[(d + x) % 7]) % 12));
      const b0 = barStart(b), b1 = barStart(b + 1);
      let best = 0, bs = -1e9;
      for (const d of [0, 3, 4, 5, 1]) {
        const t = tri(d);
        if ([...t].some((x) => !K.pcs.has(x))) continue;
        let sc = Math.random() * 0.3 + (d === tmpl[b % 4] ? 0.6 : 0);
        if (b === song.bars - 1) sc += d === 0 ? 6 : 0;
        else if (b === song.bars - 2) sc += d === 4 ? 1.5 : 0;
        else if (b === 0) sc += d === 0 ? 1.5 : 0;
        for (const o of others) for (const x of o.ns) {
          if (x.s >= b1) break;
          const ov = Math.min(x.s + x.l, b1) - Math.max(x.s, b0);
          if (ov > 0) sc += (ov / (b1 - b0)) * (t.has(x.p % 12) ? 2 : -2.5);
        }
        if (sc > bs) { bs = sc; best = d; }
      }
      barChords.push([{ o: 0, pcs: tri(best), root: (K.key + K.steps[best]) % 12 }]);
    }
  }
  const chordAt = (b, off) => { let c = null; for (const x of barChords[b] || []) if (x.o <= off) c = x; return c; };

  // ---- 3) それぞれの音のこうほと、その音だけで決まる減点 ----
  const sign = Math.sign;
  const DIS = new Set([1, 2, 6, 10, 11]);
  // 旋律の形（りんかく）：モチーフの形を決めて、くり返しでは同じ形を少し高さをかえて使う（反復・ゼクエンツ）。
  // 「変化」のフレーズでいちばん高い音（山場）へのぼり、「しめくくり」で下りて終わる
  const hasN = units.some((u) => u.climb);
  const genContour = () => {
    const c = [0];
    let dir = rnd() < 0.7 ? 1 : -1;
    const leapAt = rnd() < 0.7 ? 1 + Math.floor(rnd() * 2) : -1;
    const leap2 = style === 'easy' ? -1 : 4 + Math.floor(rnd() * 4);
    for (let j = 1; j < 40; j++) {
      let st;
      if (j === leapAt) { st = 2 + Math.floor(rnd() * 3); dir = -1; } // とんで上がって、順に下りる
      else if (j === leap2) { st = -dir * (2 + Math.floor(rnd() * 2)); } // もう1回、3度〜4度のとび
      else { const r = rnd(); const rp = style === 'pop' ? 0.14 : 0.06; st = r < 0.42 ? dir : r < 0.42 + rp ? 0 : r < 0.66 ? -dir : r < 0.88 ? dir * 2 : -dir * 2; } // となりへ進むのが半分ちょっと、3度のとびが3割
      let v = c[j - 1] + st;
      if (v > 5) { v = 5 - (v - 5); dir = -1; } else if (v < -3) { v = -3 + (-3 - v); dir = 1; } else if (rnd() < 0.2) dir = -dir;
      c.push(v);
    }
    return c;
  };
  const contM = genContour();
  const contH = genContour().map((v) => -v * 0.8); // 対比のフレーズは、モチーフと逆の向きの形に
  const seq = pickW([[1, 3], [2, 2], [-1, 1.5], [0, 1]]); // くり返しのとき、何段ずらすか
  const wT = [0.2, 0.4, 0.55][opt.motif];
  const AMP = (1.7 * (HI - LO)) / 14; // 音域が広いほど、形の上下も大きく
  const topP = HI - 1; // 山場でめざす高さ
  const base = centre - 1 - Math.max(0, HI - LO - 14) / 3; // 広い音域では、ふだんは低めにいて、山場との差を大きくする
  const uCount = units.map((u, ui) => slots.filter((x) => x.u === ui && !x.pick).length);
  const targetOf = (sl) => {
    const u = units[Math.min(sl.u, units.length - 1)];
    const ui = Math.min(sl.u, units.length - 1);
    const k = Math.max(0, sl.k), cnt = Math.max(1, uCount[ui]);
    let t, w = wT;
    if (u.climb && u.role === 'K') {
      // ピリオドの答え：はじめに山場へのぼり、そこから下りて主音へ（旋律は山なり、フレーズの終わりは下がる）
      const peakAt = Math.max(1, Math.round(cnt * 0.35));
      t = k <= peakAt ? centre + 1 + ((topP - centre) * k) / peakAt : topP - ((k - peakAt) * (topP - centre + 3)) / Math.max(1, cnt - 1 - peakAt);
      w = k === peakAt ? 0.7 : 0.35;
    } else if (u.role === 'N') {
      // 発展：モチーフの断片を、小節ごとに1段高くして山場へ（ゼクエンツ）。断片がなければ、まっすぐのぼる
      const peakAt = Math.max(1, Math.round(cnt * 0.7));
      const lin = k <= peakAt ? centre + ((topP + 1 - centre) * k) / peakAt : topP - (k - peakAt) * 2;
      if (opt.motif > 0) { const h = Math.ceil(cnt / 2), kk = k % h, st = k < h ? 0 : 1; t = (lin + base + 2 + AMP * (contM[kk] + st * 2)) / 2; } else t = lin;
      w = k === peakAt ? 0.7 : 0.4;
    } else if (u.role === 'K') { const half = Math.ceil(cnt / 2); t = k < half ? base + AMP * contM[k] : base - ((k - half) * AMP) / 1.7; w = k < half ? wT : 0.25; } // 思い出して、下りて終わる
    else if (u.role === 'H') t = base + 1 + AMP * contH[k]; // 対比：モチーフとちがう形
    else t = base + AMP * (contM[k] + (u.role === 'M2' ? seq : 0));
    // フレーズの終わりは少し下がる（終わりに向かって下がるのが旋律のくせ）
    if (!u.climb && k >= cnt - 2 && cnt >= 4) t -= (k - (cnt - 3)) * 0.8;
    if (sl.pick) { t -= 2; w = 0.2; } // 弱起は下から入る
    return { t: clamp(t, LO + 1, u.climb ? HI : HI - 3), w, role: u.role, final: !!u.final, climb: !!u.climb };
  };
  const S = slots.map((sl, i) => {
    const K = pcsAtBar(sl.b);
    const off = sl.s - barStart(sl.b);
    const ch = chordAt(sl.b, off);
    const cs = ch && ch.cs;
    const scale = cs ? cs.pcs : K.pcs;
    // クロマチック・アプローチ：ジャズの曲の、うら拍のみじかい音だけ、音階の外の音もこうほに入れる
    const chrOk = useChr && !!cs && sl.strong === 0 && sl.l <= 24 && i > 0 && i < n - 1 && !sl.restAfter;
    const cand = [], chr = [];
    for (let m = LO; m <= HI; m++) { if (scale.has(m % 12)) { cand.push(m); chr.push(false); } else if (chrOk) { cand.push(m); chr.push(true); } }
    const prevCh = i > 0 ? chordAt(slots[i - 1].b, slots[i - 1].s - barStart(slots[i - 1].b)) : null;
    const strong = Math.max(sl.strong, ch && prevCh && ch !== prevCh && off > 0 ? 2 : 0); // コードがかわる所も強い拍としてあつかう
    const oth = others.map((o) => ({ o, now: sounding(o, sl.s) }));
    let bass = null;
    for (const x of oth) if (x.now && (bass == null || x.now.lw < bass)) bass = x.now.lw;
    const tg = targetOf(sl);
    const first = i === 0, lastN = i === n - 1;
    const hasTonic = cand.some((m) => m % 12 === K.key);
    const un = [], nct = [], tone = [], pen = [];
    cand.forEach((p, k) => {
      let c = Math.random() * 0.6 + Math.abs(p - tg.t) * tg.w;
      if (hasN && !tg.climb && p > HI - 4) c += p > HI - 3 ? 4 : 1; // いちばん高い音は、山場のためにとっておく
      // とちゅうのしめくくり（半終止）：主音で終わると「おしまい」に聞こえるので、主和音でなければ主音をさける
      // フレーズの終わりの音：安定した音（主音・3度・5度）で終わると落ちつき、不安定な音（2・4・6・7度）で終わると先へ進みたくなる
      if (sl.endU && !tg.final && K.steps.length === 7) {
        const dg = K.steps.indexOf((p - K.key + 120) % 12); // 音階の何番目か（0＝主音）
        const tonicCh = ch && ch.root === K.key;
        if (tg.role === 'H') c += dg === 0 ? 4 : dg === 1 || dg === 4 || dg === 6 ? -1 : 0.5; // 半終止：2度・5度・7度で「問い」にする
        else if (tg.role === 'K') c += form === 2 ? (dg === 0 ? -2 : tonicCh ? 4 : 1) : dg === 0 && !tonicCh ? 2.5 : 0; // ピリオドの区切りは主音で答える
        else if (dg === 0 && !tonicCh) c += 1.5; // とちゅうで主音に落ちつくと、そこで終わって聞こえる
      }
      const inCh = !ch || ch.pcs.has(p % 12);
      const kd = chr[k] ? 3 : cs ? cs.kind.get(p % 12) : inCh ? 0 : 2; // 0 コードの音・1 テンション・2 アボイド・3 音階の外
      let bad = !inCh, pn = 0; // pn＝コードの外の音であることの減点（倚音・掛留音として正しく解決すれば、あとで返す）
      if (kd === 3) c += 1.6;
      else if (kd === 1 && ch.rich) {
        // 7th のあるコードでは、テンション（9th・11th・13th）は強い拍でものばしてもよい「色のある音」
        bad = false;
        c += strong === 3 ? 1.3 : strong === 2 ? 1 : strong === 1 ? 0.3 : 0;
      } else if (!inCh) {
        // 弱い拍の頭なら、なめらかにつなぐ「経過音」としてコードの外の音も少しゆるす
        pn = strong === 3 ? 14 : strong === 2 ? 10 : strong === 1 ? 2 : 0.4;
        if (sl.l >= 48) pn += 6;
        if (kd === 2 && cs) pn += strong ? 3 : 0.4; // アボイド・ノートはさらにひかえる
        c += pn;
      } else if (ch && ch.rich && strong >= 2 && (p % 12 === ch.third || p % 12 === ch.seventh)) c -= 0.7; // ガイドトーン（3度・7度）
      for (const x of oth) {
        if (!x.now) continue;
        for (const q of x.now.hi === x.now.lw ? [x.now.hi] : [x.now.hi, x.now.lw]) {
          const ic = Math.abs(p - q) % 12;
          if (DIS.has(ic)) { bad = true; c += strong >= 2 || sl.l >= 48 ? 12 : strong === 1 ? 5 : ic === 1 || ic === 11 ? 3.5 : 1.5; }
          else if (ic === 5 && p > q && q === bass) c += strong >= 2 ? 4 : 1; // バスの上の4度
          else if (ic === 0) c += first || lastN ? 0.5 : p === q ? 3.5 : 2; // 同じ音・オクターブばかりだとうすくなる
          else if (ic === 7) c += 0.8;
        }
        // 声部の交差：下のパートより下へ、上のパートより上へ行かない
        if (x.o.rel < 0 && p < x.now.hi) c += 8;
        else if (x.o.rel > 0 && p > x.now.lw) c += 8;
      }
      if (first && ch && !inCh) c += 8;
      // さいごの音：主音。さいごのコードに主音がないとき（Ⅴ7 で終わるなど）は、そのコードの音
      if (lastN) { if (ch && !ch.pcs.has(K.key)) c += inCh ? 0 : 1000; else if (hasTonic && p % 12 !== K.key) c += 1000; }
      un.push(c); nct.push(bad); pen.push(pn); tone.push(kd === 0 && !!ch && ch.rich);
    });
    return { sl, K, cand, chr, ch, tone, pen, semi: !!cs, un, nct, oth, strong, lt: K.steps.includes(11) && scale.has((K.key + 11) % 12) ? (K.key + 11) % 12 : -1 };
  });
  // 音階の上で何段はなれているか
  const degMemo = new Map();
  const degIn = (K, m) => {
    let t = degMemo.get(K);
    if (!t) { t = new Map(); let d = 0; for (let x = 0; x < 128; x++) { if (K.pcs.has(x % 12)) d++; t.set(x, d); } degMemo.set(K, t); }
    return t.get(m);
  };
  // となりへ進むのを基本に。同じ音のくり返しは、ポップスではよく使う。やさしい感じでは、大きなとびをへらす
  const LEAP = style === 'easy' ? [2, 0, 1.3, 2.8, 4, 7, 14, 8] : style === 'pop' ? [1.3, 0, 1.5, 2.4, 3, 5, 11, 5] : [2.6, 0, 1.5, 2.4, 3, 5, 11, 5];
  const SEM_DEG = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6, 7];
  // となり合う2音の減点
  const pairCost = (i) => {
    const A = S[i - 1], B = S[i];
    const mul = B.sl.gap ? 0.5 : 1;
    const out = A.cand.map(() => new Float64Array(B.cand.length));
    const D = A.cand.map(() => new Int8Array(B.cand.length));
    // 両方の時刻に鳴っているほかのパート
    const mv = [];
    for (let x = 0; x < A.oth.length; x++) { const q1 = A.oth[x].now, q2 = B.oth[x].now; if (q1 && q2) mv.push([q1.hi, q2.hi], ...(q1.lw !== q1.hi || q2.lw !== q2.hi ? [[q1.lw, q2.lw]] : [])); }
    A.cand.forEach((a, j) => B.cand.forEach((b, k) => {
      const sem = Math.abs(b - a);
      // 何段はなれているか。コードごとに音階がかわるときは、半音の数から数える（1〜2＝となり、3〜4＝3度…）
      const d = B.semi || A.semi ? Math.sign(b - a) * (sem > 12 ? 9 : SEM_DEG[sem]) : degIn(B.K, b) - degIn(B.K, a);
      D[j][k] = d;
      const ad = Math.abs(d);
      let c = (ad < LEAP.length ? LEAP[ad] : 20) * (ad === 0 ? 1 : mul);
      if (sem === 6 || sem === 10 || sem === 11) c += 12;
      if (sem > 12) c += 20;
      if (ad >= 2 && (A.nct[j] || B.nct[k])) c += 3; // コードの外の音へはとばない
      if (ad === 2 && A.tone[j] && B.tone[k]) c -= 1; // 7th のコードは、コードの音を3度でつなぐ（アルペジオ）のもジャズらしい
      if (A.lt >= 0 && a % 12 === A.lt && b !== a + 1) c += 2.5; // 導音は主音へ
      // 不安定な音は、となりの安定した音へ進みたがる（4度→3度、6度→5度、2度→主音、7度→主音）
      if (B.K.steps.length === 7 && !A.chr[j] && !B.chr[k]) {
        const da = B.K.steps.indexOf((a - B.K.key + 120) % 12), db = B.K.steps.indexOf((b - B.K.key + 120) % 12);
        if (da >= 0 && db >= 0) {
          const dn = b < a && sem <= 2, up = b > a && sem <= 2;
          if ((da === 3 && db === 2 && dn) || (da === 5 && db === 4 && dn) || (da === 1 && db === 0 && dn) || (da === 6 && db === 0 && up)) c -= 0.5;
          else if ((da === 3 || da === 6) && ad >= 2) c += 0.8; // 4度・7度（いちばん不安定）からとぶのは、ひかえる
        }
      }
      // 旋律のくせ（統計）：となりへ進むときは下がることが多く、大きくとぶときは上がることが多い（とんで上がり、順に下りる）
      if (ad === 1 && b > a) c += 0.15;
      else if (ad >= 3 && b < a) c += 0.6;
      // クロマチック・アプローチ：半音となりのコードの音（またはテンション）へ、かならずすべりこむ。入るときも、となりから
      if (A.chr[j]) c += sem === 1 && !B.chr[k] && !B.nct[k] ? 0 : 30;
      if (B.chr[k]) c += A.chr[j] ? 30 : sem <= 2 && sem > 0 ? 0 : 8;
      // 7度の音は、コードがかわったら2度下がって解決する（ジャズでも和声でも同じきまり）
      if (A.ch && B.ch && A.ch !== B.ch && A.ch.seventh >= 0 && a % 12 === A.ch.seventh) c += b - a === -1 || b - a === -2 ? -1 : b === a ? 0 : 1.5;
      if (i === n - 1 && ad !== 1) c += 3; // さいごは、となりの音から主音へ
      for (const [q1, q2] of mv) {
        if (q1 === q2 || a === b) continue;
        const i1 = Math.abs(a - q1) % 12, i2 = Math.abs(b - q2) % 12;
        const same = sign(b - a) === sign(q2 - q1);
        if ((i2 === 0 || i2 === 7) && i1 === i2) c += 25; // 平行5度・8度
        else if ((i2 === 0 || i2 === 7) && same && ad > 1) c += 4; // とんで入る5度・8度（かくれた5度・8度）
        else if (!same) c -= 0.3; // 反行はよい
      }
      out[j][k] = c;
    }));
    return { out, D };
  };
  // 3つつづく音の減点（h→j→k）
  /* 非和声音（コードの外の音）の使い方。まん中の音 j がコードの外のとき、前後の動きで種類を見分ける
     ・経過音／刺繍音：となりから入って、となりへ出る（強い拍なら「強拍の経過音」）
     ・倚音（いおん）：強い拍に、とんで入って（またはフレーズの頭で）、となりのコードの音へ解決する
     ・掛留音（けいりゅうおん）：前の音をそのままのこして強い拍でにごらせ、2度下のコードの音へ解決する
     ・逸音（いつおん）：となりから入って、反対向きにとんで出る（うら拍）
     ・先取音（せんしゅおん）：次のコードの音を、うら拍で先に鳴らす
     きまりどおりでないコードの外の音は、大きく減点する */
  const ORN = [null, { app: -1, sus: 0.5, accp: 4, esc: -1, ant: 1.5 }, { app: -3, sus: -1.2, accp: 2.2, esc: -2.5, ant: 0.2 }][opt.orn];
  const nctKind = (Z, A, B, h, j, k, d1, d2) => {
    const a1 = Math.abs(d1), a2 = Math.abs(d2);
    const toTone = !B.nct[k] && !B.chr[k];
    const res = toTone && A.ch === B.ch && !A.sl.restAfter && a2 === 1; // 同じコードの中で、となりのコードの音へ
    if (a1 === 1 && a2 === 1) return A.strong >= 2 ? (res ? 'accp' : 'bad') : 'pass';
    if (res && A.sl.l <= 96 && A.strong >= 1) {
      if (a1 === 0 && d2 === -1 && Z && !Z.nct[h] && !A.sl.gap) return 'sus';
      if (a1 >= 2 || A.sl.gap) return 'app';
    }
    if (a1 === 1 && a2 >= 2 && a2 <= 3 && sign(d2) !== sign(d1) && A.strong === 0 && toTone && !A.sl.restAfter) return 'esc';
    if (a1 === 1 && a2 === 0 && A.strong === 0 && A.sl.l <= B.sl.l && toTone && A.ch !== B.ch && !A.sl.restAfter) return 'ant';
    return 'bad';
  };
  const triCost = (Z, A, B, h, j, k, d1, d2) => {
    const x = Z.cand[h], a = A.cand[j], b = B.cand[k];
    let c = 0;
    const a1 = Math.abs(d1), a2 = Math.abs(d2);
    if (A.nct[j] && !A.chr[j]) {
      const kd = nctKind(Z, A, B, h, j, k, d1, d2);
      if (kd === 'bad') c += 9;
      else if (kd !== 'pass') c += ORN ? ORN[kd] - A.pen[j] * (kd === 'esc' || kd === 'ant' ? 0 : 1) : 9; // 正しく使えていれば、強い拍の減点を返す
    }
    if (a1 >= 3) {
      // 大きくとんだあと：音域のまん中から遠ざかるとびなら、反対向きにもどる（まん中へもどる性質）。
      // まん中へ近づくとびなら、そのまま同じ向きへ進んでもよい
      const away = Math.abs(a - centre) > Math.abs(x - centre) && Math.abs(a - centre) > 2;
      if (away) { if (!(d2 !== 0 && sign(d2) === -sign(d1) && a2 <= 2)) c += 3; } else if (a2 > 2) c += 1.5;
      if (sign(d2) === sign(d1) && a2 >= 2) c += 3;
    } else if (style !== 'pop' && d1 === -1 && d2 === -1) c -= 0.25; // となりへ下がったら、そのまま下がりやすい
    else if (a1 === 2 && a2 >= 3 && sign(d1) === sign(d2)) c += 2;
    if (x === a && a === b) c += style === 'pop' ? 3 : 5;
    else if (x === b && a !== b) c += 0.5;
    const span = Math.abs(b - x);
    if (sign(d1) === sign(d2) && (span === 6 || span === 10 || span === 11)) c += 2;
    return c;
  };

  // ---- 4) 曲全体で減点がいちばん少ないならびをさがす ----
  // 状態＝（1つ前の音, 今の音）。3つつづく音のきまりまで見られる
  const back = [], allD = [];
  let prevD = null, dp = null;
  if (n === 1) { let k = 0; S[0].un.forEach((c, i) => { if (c < S[0].un[k]) k = i; }); tr.notes = [{ s: slots[0].s, p: S[0].cand[k], l: slots[0].l }]; return; }
  for (let i = 1; i < n; i++) {
    const A = S[i - 1], B = S[i];
    const { out: P, D } = pairCost(i);
    const nj = A.cand.length, nk = B.cand.length;
    const cur = Array.from({ length: nj }, () => new Float64Array(nk));
    const bk = Array.from({ length: nj }, () => new Int16Array(nk));
    if (i === 1) {
      for (let j = 0; j < nj; j++) for (let k = 0; k < nk; k++) cur[j][k] = A.un[j] + (A.nct[j] ? 4 : 0) + P[j][k] + B.un[k];
    } else {
      const Z = S[i - 2];
      const nh = Z.cand.length;
      for (let j = 0; j < nj; j++) for (let k = 0; k < nk; k++) {
        let best = Infinity, bh = 0;
        const d2 = D[j][k];
        for (let h = 0; h < nh; h++) {
          const c = dp[h][j] + triCost(Z, A, B, h, j, k, prevD[h][j], d2);
          if (c < best) { best = c; bh = h; }
        }
        cur[j][k] = best + P[j][k] + B.un[k];
        bk[j][k] = bh;
      }
    }
    back.push(bk); dp = cur; prevD = D; allD.push(D);
  }
  let bj = 0, bkk = 0, bc = Infinity;
  for (let j = 0; j < dp.length; j++) for (let k = 0; k < dp[j].length; k++) if (dp[j][k] < bc) { bc = dp[j][k]; bj = j; bkk = k; }
  const pick = new Array(n);
  pick[n - 1] = bkk; pick[n - 2] = bj;
  for (let i = n - 1; i >= 2; i--) pick[i - 2] = back[i - 1][pick[i - 1]][pick[i]];
  const notes = slots.map((sl, i) => ({ s: sl.s, p: S[i].cand[pick[i]], l: sl.l }));
  // 使った非和声音を数える。掛留音は、前の音とタイでつないで1つの長い音にする（本来の形）
  const used = { pass: 0, accp: 0, app: 0, sus: 0, esc: 0, ant: 0, bad: 0 };
  const drop = new Set();
  for (let i = 1; i < n - 1; i++) {
    const A = S[i], j = pick[i];
    if (!A.nct[j] || A.chr[j]) continue;
    const kd = nctKind(S[i - 1], A, S[i + 1], pick[i - 1], j, pick[i + 1], allD[i - 1][pick[i - 1]][j], allD[i][j][pick[i + 1]]);
    used[kd]++;
    if (kd === 'sus' && slots[i - 1].s + slots[i - 1].l === slots[i].s && !drop.has(i - 1)) { let q = i - 1; notes[q].l += notes[i].l; drop.add(i); }
  }
  autoCompose.last = used;
  tr.notes = notes.filter((_, i) => !drop.has(i));
}
// おまかせ作曲のまど：感じ・音の細かさ・休符・音域・くり返しをえらんで、気に入るまで何度でも作りなおせる
function autoDialog(tr) {
  let dlg = $('#dlgAuto');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.id = 'dlgAuto';
    dlg.className = 'dlg small';
    document.body.appendChild(dlg);
  }
  const o = autoOpts();
  const sel = (k, label, items, tip) => `<label title="${tip}">${label} <select data-k="${k}">${items.map(([v, n]) => `<option value="${v}"${String(o[k]) === String(v) ? ' selected' : ''}>${n}</option>`).join('')}</select></label>`;
  dlg.innerHTML = `<h3>おまかせ作曲</h3><p class="muted">コードやほかのパートに合うメロディを作ります。気に入るまで、何度でも作りなおせます。</p>
    <div class="autogrid">
    ${sel('style', '感じ', [['auto', 'おまかせ（コードに合わせる）'], ['easy', 'やさしい（歌いやすい）'], ['pop', 'ポップス'], ['jazz', 'ジャズ']], 'やさしい＝となりの音へ進むことが多い。ポップス＝同じ音のくり返しや、拍のうらの音も使う。ジャズ＝半音のすべりこみも使う')}
    ${sel('density', '音の細かさ', [[0, 'ゆったり（長い音が多い）'], [1, 'ふつう'], [2, 'こまかい（短い音が多い）']], '1小節に入る音の数')}
    ${sel('rests', '休符（息つぎ）', [[0, '少ない（つなげて歌う）'], [1, 'ふつう'], [2, '多い（間をあける）']], 'フレーズのおわりに休符を入れて、息つぎの場所を作ります')}
    ${sel('span', '音域のはば', [[0, 'せまい（6度くらい）'], [1, 'ふつう（1オクターブと少し）'], [2, '広い（1オクターブ半）']], 'いちばん低い音からいちばん高い音までのはば')}
    ${sel('height', '音の高さ', [[0, '低め'], [1, 'ふつう'], [2, '高め']], 'そのパートの音域の中で、どのあたりを使うか')}
    ${sel('orn', 'かざりの音（非和声音）', [[0, '少ない（経過音・刺繍音だけ）'], [1, 'ふつう'], [2, '多い（倚音・掛留音もよく使う）']], 'コードの外の音の使い方。倚音＝強い拍でにごらせて、となりの音へ解決する。掛留音＝前の音をのこして、下へ解決する。逸音・先取音も使います')}
    ${sel('form', '形（楽節）', [[0, 'おまかせ'], [1, 'くり返して発展（モチーフ→くり返し→たたみかけ→終わり）'], [2, '問いと答え（前半は問い、後半は答え）']], '8小節の組み立て方。くり返して発展＝モチーフをくり返し、短く切ってたたみかけて山場へ。問いと答え＝前半は「続く」感じで終わり、後半は同じ出だしから主音で終わる')}
    ${sel('motif', 'くり返し', [[0, '自由（毎回ちがうリズム）'], [1, 'ふつう'], [2, 'しっかり（同じ形をくり返す）']], '同じリズムや形をくり返すと、おぼえやすいメロディになります')}
    </div>
    <div class="btnrow" style="margin-top:12px"><button class="mini" id="auPlay">${I('play')}聞く</button><span class="grow"></span><button class="mini" id="auNo">とじる</button><button class="mini accent" id="auGo">${I('spark')}<span>作る</span></button></div>`;
  let made = false;
  const read = () => { const r = {}; dlg.querySelectorAll('select[data-k]').forEach((x) => { r[x.dataset.k] = x.dataset.k === 'style' ? x.value : +x.value; }); return r; };
  dlg.querySelectorAll('select[data-k]').forEach((x) => (x.onchange = () => lsSet('otsumiki-auto', JSON.stringify(read()))));
  dlg.querySelector('#auGo').onclick = () => {
    if (locked(tr)) return toast('ロックされています');
    if (!made && tr.notes.length && !confirm('今のメロディを消して、新しく作曲しますか？（「元に戻す」で戻せます）')) return;
    stop(true);
    edit(() => autoCompose(tr, read()), 'おまかせ作曲');
    made = true;
    dlg.querySelector('#auGo span').textContent = '作りなおす';
    scrollToNotes();
  };
  dlg.querySelector('#auPlay').onclick = () => { stop(true); ui.startTick = 0; play(); };
  dlg.querySelector('#auNo').onclick = () => dlg.close();
  dlg.onclose = () => stop(true);
  dlg.showModal();
}
function shiftCopy(src, dst, bars) {
  const off = barStart(bars);
  const total = totalTicks();
  dst.notes = src.notes.filter((n) => n.s + off < total).map((n) => ({ s: n.s + off, p: n.p, l: Math.min(n.l, total - n.s - off) }));
}
function notesInScope(tr) {
  // 2小節以上えらんでいればその範囲、そうでなければ全部
  if (ui.sel.t !== cur || ui.sel.b1 === ui.sel.b0) return tr.notes;
  const bt = barTicks();
  return tr.notes.filter((n) => n.s >= barStart(ui.sel.b0) && n.s < barStart(ui.sel.b1 + 1));
}
function transpose(tr, semis) { for (const n of notesInScope(tr)) moveP(n, semis, 21, 108); }
function transposeDegree(tr, dir) {
  const byKey = new Map();
  const degreesAt = (b) => {
    const k = keyAt(b);
    const id = k.key + ':' + (k.minor ? 1 : 0);
    if (!byKey.has(id)) {
      // 曲のはじめの調は、えらんでいる音階（ヨナ抜きなど）のまま。とちゅうの調は長調・短調
      const steps = (!(song.keys && Object.keys(song.keys).length) || (k.key === song.key && !!k.minor === isMinor())) ? SCALES[song.scale].steps : SCALES[k.minor ? 'minor' : 'major'].steps;
      const pcs = new Set(steps.map((x) => (x + k.key) % 12));
      const out = [];
      for (let m = 21; m <= 108; m++) if (pcs.has(m % 12)) out.push(m);
      byKey.set(id, out);
    }
    return byKey.get(id);
  };
  for (const n of notesInScope(tr)) {
    const all = degreesAt(barOf(n.s));
    let i = all.indexOf(n.p);
    if (i < 0) { i = all.findIndex((m) => m >= n.p); if (dir < 0) i--; } else i += dir;
    n.p = all[clamp(i, 0, all.length - 1)];
  }
}
function clearTrack(tr) {
  if (tr.type === 'melody') tr.notes = [];
  else if (tr.type === 'drum') tr.grid = {};
  else tr.chords = [];
}
function range(a, b, st) { const r = []; for (let i = a; i < b; i += Math.max(1, st)) r.push(i); return r; }
const RHYTHM_PRESETS = {
  // 拍子に合わせる：強い拍（1拍目など）にバスドラム、弱い拍にスネア
  basic: { name: '8ビート', kit: 'drums', f: (bt, b, B) => ({ kick: B.strong, snare: B.weak, hihat: range(0, bt, 24) }) },
  rock16: { name: '16ビート', kit: 'drums', f: (bt, b, B) => ({ kick: [...B.strong, ...(B.n === 4 ? [72] : [])], snare: B.weak, hihat: range(0, bt, 12) }) },
  march: { name: 'マーチ（音楽室）', kit: 'school', f: (bt, b, B) => ({ odaiko: B.strong, kodaiko: B.weak, awase: b % 4 === 0 ? [0] : [] }) },
  waltz: { name: 'ワルツ', kit: 'drums', f: (bt) => ({ kick: [0], hihat: range(48, bt, 48), snare: range(48, bt, 48) }) },
  samba: { name: 'サンバ', kit: 'perc2', f: (bt) => ({ maracas: range(0, bt, 12), agogoH: [0, 72, 144], agogoL: [24, 96, 168], clave: [0, 36, 96, 120, 168] }) },
  latin: { name: 'ボサノバ', kit: 'perc1', f: () => ({ congaL: [0, 96], congaH: [72, 168], congaM: [48, 144], woodH: [0, 72, 144] }) },
  matsuri: { name: 'お祭り（和太鼓）', kit: 'wa', f: (bt, b) => ({ chodaiko: [0, 48, 72, 96, 144], shime: range(0, bt, 24), kane: [0, 48, 96, 144], hyoshigi: b % 4 === 3 ? [144] : [] }) },
  edm: { name: '4つ打ち（EDM）', kit: 'edm', f: (bt, b, B) => ({ kick808: B.all, clapE: B.weak, ohatE: B.all.map((x) => x + B.beat / 2), hihatE: range(0, bt, 12) }) },
  clap: { name: '手拍子', kit: 'perc2', f: (bt, b, B) => ({ clap: B.all }) },
};
function applyRhythm(tr, key) {
  const pre = RHYTHM_PRESETS[key];
  tr.grid = {};
  tr.kit = pre.kit;
  const bt = barTicks();
  for (let b = 0; b < song.bars; b++) {
    const bt = barLen(b);
    // 拍の位置：6/8 などは付点4分が1拍
    const m = meterAt(b);
    const beat = m[1] === 8 && m[0] % 3 === 0 && m[0] > 3 ? 72 : beatAt(b);
    const n = Math.max(1, Math.round(bt / beat));
    const all = Array.from({ length: n }, (_, i) => i * beat);
    const strong = n === 3 ? [0] : all.filter((_, i) => i % 2 === 0);
    const weak = n === 3 ? [beat, beat * 2] : all.filter((_, i) => i % 2 === 1);
    const pat = pre.f(bt, b, { beat, n, all, strong, weak });
    for (const id in pat) for (const s of pat[id]) {
      if (s >= bt) continue;
      (tr.grid[id] = tr.grid[id] || {})[barStart(b) + s] = s === 0 ? 2 : 1;
    }
  }
}

/* ============================================================
   鍵盤で入力・演奏（パソコンのキーボード／MIDI鍵盤）
   ============================================================ */
const KEYMAP = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14, p: 15, ';': 16 };
const held = new Map();
let chordAnchor = null;
/* ---------- 録音（再生しながらひくと、そのまま音が入る） ---------- */
const rec = { on: false, snap: null, open: new Map(), n: 0 };
function recTick() {
  const t = playheadTick();
  if (t == null) return null;
  let q = Math.round(t / ui.grid) * ui.grid;
  if (ui.loopOn && ui.loopRange) { const [a, z] = [barStart(ui.loopRange[0]), barStart(ui.loopRange[1])]; if (q >= z) q = a; }
  return clamp(q, 0, totalTicks() - 1);
}
function recNoteOn(midi, drumId) {
  if (!rec.on || !player.on) return;
  const tr = track();
  if (locked(tr) || tr.type === 'chord') return;
  const t = recTick();
  if (t == null) return; // カウント中
  if (tr.type === 'drum') { setCell(tr, drumId, t, 1); rec.n++; return; }
  tr.notes = tr.notes.filter((n) => !(n.s === t && n.p === midi));
  const n = { s: t, p: midi, l: ui.grid };
  tr.notes.push(n);
  rec.open.set(midi, { n, t0: playheadTick() });
  rec.n++;
  version++;
}
function recNoteOff() {
  if (!rec.open.size) return;
  const still = new Set([...held.values()]);
  const now = playheadTick();
  for (const [m, o] of [...rec.open]) {
    if (still.has(m)) continue;
    rec.open.delete(m);
    if (now != null && now > o.t0) o.n.l = Math.max(ui.grid, Math.round((now - o.n.s) / ui.grid) * ui.grid);
    version++;
  }
}
function recStart() {
  const tr = track();
  if (tr.type === 'chord') return toast('コード伴奏のトラックには録音できません。メロディかリズムをえらんでね');
  if (locked(tr)) return toast('このトラックはロックされています');
  rec.on = true;
  rec.snap = snapshot();
  rec.n = 0;
  rec.open.clear();
  $('#btnRec').classList.add('on');
  const keep = ui.countIn;
  if (!ui.countIn) ui.countIn = 1; // 録音のときは、かならずカウント
  play();
  ui.countIn = keep;
  toast(isPhone ? '録音中：カウントのあと、鍵盤をひいてね' : '録音中：カウントのあと、キーボード（A〜K）やMIDI鍵盤でひいてね', 3500);
}
function recStop() {
  if (!rec.on) return;
  rec.on = false;
  rec.open.clear();
  $('#btnRec').classList.remove('on');
  if (rec.snap && snapshot() !== rec.snap) { pushUndo(rec.snap, '録音'); changed(); toast(`${rec.n}個の音を録音しました（ずれたら「えらぶ」→「そろえる」）`, 3500); }
  rec.snap = null;
}
function noteOn(midi, keyIndex) {
  const tr = track();
  if (tr.type === 'drum') {
    const ids = kitRows(tr);
    const i = keyIndex != null ? keyIndex : (((midi - 36) % ids.length) + ids.length) % ids.length;
    const id = ids[ids.length - 1 - (i % ids.length)];
    preview(tr, id);
    recNoteOn(null, id);
    highlightRow = id;
    draw();
    if (ui.stepRec && !locked(tr)) {
      const at = chordAnchor != null ? chordAnchor : ui.inputTick;
      chordAnchor = at;
      edit(() => setCell(tr, id, at, 1), '鍵盤で入力');
    }
    return;
  }
  if (tr.type === 'chord') { preview({ ...tr, type: 'melody' }, midi); return; }
  // 楽譜の画面では、鍵盤（MIDI キーボード）でそのまま入力。いっしょにおした鍵盤は和音
  if (ui.view === 'score' && ui.sc.input && !locked(tr)) {
    const now = performance.now();
    if (ui.sc.repitch) scRepitch(midi);
    else scInsert([midi], now - (ui.sc.lastKeyAt || 0) < 70 && ui.sc.lastIns && ui.sc.lastIns.p != null);
    ui.sc.lastKeyAt = now;
    return;
  }
  preview(tr, midi, 0.5);
  recNoteOn(midi);
  showMini(midi);
  highlightRow = midi;
  draw();
  if (ui.stepRec && !locked(tr)) {
    const at = chordAnchor != null ? chordAnchor : ui.inputTick;
    chordAnchor = at;
    edit(() => { if (!tr.notes.some((n) => n.s === at && n.p === midi)) tr.notes.push({ s: at, p: midi, l: cellLen(at) }); }, '鍵盤で入力');
  }
}
function noteOff() {
  recNoteOff();
  if (held.size) return;
  highlightRow = null;
  if (ui.stepRec && chordAnchor != null) { chordAnchor = null; advanceCursor(1); }
  draw();
}
function advanceCursor(dir) {
  if (dir > 0) ui.inputTick = Math.min(totalTicks() - 1, ui.inputTick + cellLen(ui.inputTick));
  else ui.inputTick = cellStart(Math.max(0, ui.inputTick - 1));
  ui.inputTick = cellStart(ui.inputTick);
  const sc = $('#scroller');
  const x = ui.inputTick * ppt();
  if (x < sc.scrollLeft || x > sc.scrollLeft + sc.clientWidth - LW - 60) sc.scrollLeft = Math.max(0, x - 100);
  draw();
}
function stepBackspace() {
  const tr = track();
  advanceCursor(-1);
  if (locked(tr)) return;
  const at = ui.inputTick;
  edit(() => {
    if (tr.type === 'melody') tr.notes = tr.notes.filter((n) => n.s !== at);
    else if (tr.type === 'drum') for (const id in tr.grid) if (tr.grid[id][at]) setCell(tr, id, at, 0);
  }, '鍵盤入力を消す');
}
let midiAccess = null;
async function connectMidi() {
  if (!navigator.requestMIDIAccess) return alert('このブラウザはMIDI鍵盤に対応していません（Chrome / Edge をおすすめします）');
  try {
    midiAccess = await navigator.requestMIDIAccess();
    const hook = () => {
      let n = 0;
      midiAccess.inputs.forEach((inp) => {
        n++;
        inp.onmidimessage = (m) => {
          const [st, note, vel] = m.data;
          const cmd = st & 0xf0;
          if (cmd === 0x90 && vel > 0) { held.set('m' + note, note); noteOn(note); }
          else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) { held.delete('m' + note); noteOff(); }
        };
      });
      $('#btnMidiIn').classList.toggle('on', n > 0);
      toast(n ? `MIDI鍵盤を${n}台つなぎました` : 'MIDI鍵盤が見つかりません');
    };
    midiAccess.onstatechange = hook;
    hook();
  } catch (e) { alert('MIDI鍵盤につなげませんでした：' + e.message); }
}

/* ============================================================
   ミニディスプレイ
   ============================================================ */
let miniTimer = null;
function showMini(midi) {
  if (isPhone && ui.view === 'score') return; // スマホの楽譜画面では、上のボタンをかくさない（音符はそのまま見える）
  const box = $('#miniNote');
  box.innerHTML = `${Notation.single(midi, song.key, isMinor())}<div><b>${noteName(midi)}</b><small>${sciName(midi)}</small></div>`;
  box.classList.add('show');
  clearTimeout(miniTimer);
  miniTimer = setTimeout(() => box.classList.remove('show'), isPhone ? 1500 : 5000); // スマホでは下のボタンをかくさないよう短く
}
// 位置 → 「3小節 2拍目 ○●○○（16分の2つ目）」：拍の中のどこかを、点の列でも見せる
function beatPos(t) {
  t = Math.max(0, t);
  const b = barOf(t);
  const bs = beatAt(b);
  const off = t - barStart(b);
  const bi = Math.floor(off / bs);
  const r = off - bi * bs;
  const head = `${b + (song.pickup ? 0 : 1)}小節 ${bi + 1}拍目`;
  const bar = `${b + (song.pickup ? 0 : 1)}小節`;
  const nb = Math.max(1, Math.round(barLen(b) / bs));
  // 小節の拍を ○ で並べ、いまの拍だけ ● に。拍の中のときは、その拍を細かい点に広げる
  const viz = (inner) => `<span class="bv">${Array.from({ length: nb }, (_, i) => (i === bi ? `<span class="bvon">${inner}</span>` : '<span class="bvk"></span>')).join('')}</span>`;
  if (r === 0) return { head, bar, beat: bi + 1, dots: '', sub: '拍の頭', text: `${head}（拍の頭）`, viz: viz('<span class="bvk fill"></span>') };
  const comp = bs % 24 === 0 && bs % 48 !== 0; // 6/8 など（1拍＝付点4分）
  const cand = comp ? [[3, '8分'], [6, '16分'], [12, '32分']] : [[2, '8分'], [4, '16分'], [3, '3連'], [8, '32分'], [6, '16分の3連']];
  let pick = null;
  for (const [n, nm] of cand) if (bs % n === 0 && r % (bs / n) === 0) { pick = [n, nm]; break; }
  if (!pick) return { head, bar, beat: bi + 1, dots: '', sub: '', text: `${head}＋少し`, viz: viz('<span class="bvk half"></span>') };
  const [n, nm] = pick;
  const k = r / (bs / n);
  const dots = Array.from({ length: n }, (_, i) => (i === k ? '●' : '○')).join('');
  const sub = n === 2 ? 'ウラ' : `${nm}の${k + 1}つ目`;
  const inner = Array.from({ length: n }, (_, i) => `<span class="bvd${i === k ? ' fill' : ''}"></span>`).join('');
  return { head, bar, beat: bi + 1, dots, sub, text: `${head} ${dots}（${sub}）`, viz: viz(`<span class="bvsub">${inner}</span>`) };
}
// ドラッグ中に、指・マウスのそばに位置を出す
function posTip(e, t, label = '') {
  let tip = $('#posTip');
  if (!tip) { tip = document.createElement('div'); tip.id = 'posTip'; tip.className = 'postip'; document.body.appendChild(tip); }
  const P = beatPos(t);
  tip.innerHTML = `${label ? `<small>${label}</small> ` : ''}<small>${P.bar}</small> ${P.viz} <small>${P.beat}拍目${P.dots ? '・' + P.sub : ''}</small>`;
  tip.style.left = clamp(e.clientX + 14, 4, innerWidth - 230) + 'px';
  tip.style.top = clamp(e.clientY - 46, 4, innerHeight - 30) + 'px';
  tip.hidden = false;
}
// 楽譜のカーソル（えらんでいる所）のすぐ上に、何小節・何拍目・拍の中のどこかを出す
function scPosShow(box) {
  const old = box.querySelector('.scpos');
  if (old) old.remove();
  const cur = box.querySelector('rect.cursor');
  if (!cur || player.on || ui.sc.lyr || ui.chd || ui.sc.cursor == null) return;
  const P = beatPos(ui.sc.cursor);
  const el = document.createElement('div');
  el.className = 'scpos';
  el.innerHTML = `<small>${P.bar}</small> ${P.viz} <small>${P.beat}拍目${P.dots ? '・' + P.sub : ''}</small>`;
  box.appendChild(el);
  const br = box.getBoundingClientRect();
  const r = cur.getBoundingClientRect();
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  let x = r.left - br.left + box.scrollLeft + r.width / 2 - w / 2;
  x = clamp(x, box.scrollLeft + 2, box.scrollLeft + box.clientWidth - w - 2);
  let y = r.top - br.top + box.scrollTop - h - 16; // 長さの記号（♩）の上
  // コードネーム・テンポなどの文字にかぶるなら、その上へ
  const L = x + br.left - box.scrollLeft;
  const texts = [...box.querySelectorAll('svg text')].map((t) => t.getBoundingClientRect()).filter((q) => q.width && q.right > L - 2 && q.left < L + w + 2 && q.bottom <= r.top + 2 && q.bottom > r.top - 120);
  for (let k = 0; k < 6; k++) {
    const top = y - box.scrollTop + br.top;
    const hit = texts.find((q) => q.bottom > top - 1 && q.top < top + h + 1);
    if (!hit) break;
    y = hit.top - br.top + box.scrollTop - h - 3;
  }
  if (y < box.scrollTop + 2) { y = r.bottom - br.top + box.scrollTop + 4; el.classList.add('below'); }
  el.style.left = x + 'px';
  el.style.top = y + 'px';
}
function posTipHide() { const tip = $('#posTip'); if (tip) tip.hidden = true; }
// 文字は、変わったときだけ書きかえる（同じ文字でも書くと、画面の計算がやりなおしになって重い）
function setText(el, v) { if (el && el._txt !== v) { el._txt = v; el.textContent = v; } }
function updateMini(pos) {
  if (pos === undefined) pos = playheadTick();
  const t = pos != null ? pos : ui.startTick;
  const bt = barTicks();
  const bar = barOf(Math.max(0, t));
  const beat = Math.floor((t - barStart(bar)) / beatAt(bar));
  setText($('#miniTitle'), song.title);
  const posTxt = `${bar + 1}小節 ${beat + 1}拍`;
  setText($('#miniPos'), posTxt);
  // 再生中：経過時間／曲の長さ と、すすみぐあいの線（文字は秒がかわったときだけ書きかえる）
  if (pos != null) {
    const pt = playheadPlay();
    const tot = absSec(playTotal());
    const now = pt == null ? 0 : absSec(pt);
    const mmss = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
    const tt = isPhone ? `${mmss(now)}/${mmss(tot)}` : `${mmss(now)} / ${mmss(tot)}`;
    setText($('#miniTime'), tt);
    // すすみぐあいの線は、目で分かるだけ動いたときに（細かく動かしすぎない）
    const mpg = $('#miniProg');
    const fr = tot > 0 ? Math.min(1, now / tot) : 0;
    if (mpg._fr == null || Math.abs(fr - mpg._fr) >= 0.004 || fr < mpg._fr) { mpg._fr = fr; mpg.style.transform = `scaleX(${fr.toFixed(3)})`; }
  }
  // 拍のランプ（いまの拍が光る。1拍目は色をかえる）
  {
    const n = Math.max(1, Math.round(barLen(bar) / beatAt(bar)));
    const box = $('#beatDots');
    const k = n + ':' + (pos != null ? beat : -1);
    if (box && box._k !== k) {
      box._k = k;
      box.innerHTML = Array.from({ length: Math.min(n, 12) }, (_, i) => `<i class="${pos != null && i === beat ? (i === 0 ? 'on one' : 'on') : ''}"></i>`).join('');
    }
  }
  { const k = keyAt(bar); setText($('#miniKey'), keyLabel(k.key, k.minor)); }
  setText($('#miniMeter'), meterAt(bar).join('/'));
  setText($('#miniBpm'), '♩=' + bpmAt(bar) + ((ui.speed || 1) !== 1 ? `（練習${Math.round(ui.speed * 100)}%）` : ''));
}

/* ============================================================
   画面（設定・トラック一覧・ツール）
   ============================================================ */
function opt(sel, items, val) {
  sel.innerHTML = items.map(([v, t]) => `<option value="${v}">${escapeHtml(t)}</option>`).join('');
  sel.value = String(val);
}
function renderSettings() {
  $('#title').value = song.title;
  $('#bpm').value = song.bpm;
  $('#bpmNum').value = song.bpm;
  opt($('#meterN'), [1, 2, 3, 4, 5, 6].map((n) => [n, n]), song.meter[0]);
  opt($('#meterD'), [2, 4, 8].map((n) => [n, n]), song.meter[1]);
  $('#bars').value = song.bars;
  opt($('#key'), KEY_LABELS.map((l, i) => [i, l]), song.key);
  opt($('#scale'), Object.entries(SCALES).map(([k, v]) => [k, v.name]), song.scale);
  opt($('#names'), [['doremi', 'ドレミ'], ['movable', 'ドレミ（移動ド）'], ['cde', 'CDE（英語）'], ['haniho', 'ハニホ（日本語）']], ui.names);
  $('#btnFlat').textContent = ui.flat ? '♭で表示中' : '♯で表示中';
  $('#ghost').checked = ui.ghost;
  $('#dragMode').value = ui.dragMode;
  $('#touchMode').value = ui.touchMode;
  $('#swing').value = song.swing;
  opt($('#swingUnit'), [[24, '8分音符'], [12, '16分音符']], song.swingUnit);
  $('#zoom').value = ui.zoom;
  $('#btnLoop').classList.toggle('on', ui.loopOn);
  $('#btnMetro').classList.toggle('on', ui.metro);
  $('#rules').disabled = !!song.locks.rules;
  $('#bpm').disabled = $('#bpmNum').disabled = $('#btnTap').disabled = !!song.locks.rules;
  $('#addRow').hidden = !!song.locks.tracks;
  $('#popRules').classList.toggle('locked', !!song.locks.rules);
  renderKeyPop();
  $('#btnIns').disabled = $('#btnDelBars').disabled = $('#btnAddFour').disabled = !!song.locks.rules;
  updateMini();
}

function renderTracks() { holdGeo(renderTracksNow); }
function renderTracksNow() {
  const list = $('#trackList');
  // 書きなおしても、一覧のスクロールの位置はそのまま（一番上にもどらないように）
  const scBox = list.closest('.tracks');
  const scTop = scBox ? scBox.scrollTop : 0;
  const listTop = list.scrollTop;
  list.innerHTML = '';
  song.tracks.forEach((tr, i) => {
    const d = document.createElement('div');
    d.className = 'track' + (i === cur ? ' sel' : '') + (tr.locked ? ' locked' : '');
    d.style.setProperty('--tc', TRACK_COLORS[i % TRACK_COLORS.length]);
    const icon = I(TYPE_ICON[tr.type]);
    const instLabel = tr.type === 'drum' ? (Sound.KITS.find((k) => k.id === tr.kit) || Sound.KITS[0]).name : Sound.INSTRUMENTS[tr.inst] || tr.inst;
    const realOk = tr.real !== false && (tr.type === 'drum' || Sound.Samples.has(tr.inst));
    const loading = realOk && !(tr.type === 'drum' ? Sound.Samples.drumsReady() : Sound.Samples.ready(tr.inst));
    const badge = realOk ? (loading ? `<span class="badge wait" title="録音を読み込み中">${I('mic')}</span>` : `<span class="badge" title="本物の楽器の録音">${I('mic')}</span>`) : `<span class="badge syn" title="電子音">${I('wave')}</span>`;
    const lockMute = song.locks.mute;
    d.innerHTML = `
      <div class="trow"><span class="tgrip" title="ドラッグで順番を入れかえ（楽譜の順番も変わります）" aria-hidden="true">⋮⋮</span><span class="ticon" data-n="${i + 1}" title="${escapeHtml(tr.name)}">${icon}</span><span class="tname" title="${escapeHtml(tr.name)}">${i + 1}. ${escapeHtml(tr.name)}</span>${tr.locked ? `<span class="tlock" title="ロック中">${I('lock')}</span>` : ''}
        <button class="mini icon mute ${tr.mute ? 'on' : ''}" title="消音：このトラックを鳴らさない（ミュート）" aria-label="消音" ${lockMute ? 'disabled' : ''}>消音</button>
        <button class="mini icon solo ${tr.solo ? 'on' : ''}" title="ソロ：このトラックだけ鳴らす" aria-label="ソロ" ${lockMute ? 'disabled' : ''}>ソロ</button>
        <details class="pop right tmenu" data-pop="t${i}"><summary class="mini icon" title="名前・並べかえ・複製・削除">${I('more')}</summary><div class="popbody menu-list">
          <button data-a="rename" ${tr.locked ? 'disabled' : ''}>${I('pencil')}名前を変える</button>
          <button data-a="up" ${i === 0 ? 'disabled' : ''}>${I('chevron')}上へ</button>
          <button data-a="down" ${i === song.tracks.length - 1 ? 'disabled' : ''}>${I('chevron')}下へ</button>
          ${tr.type === 'melody' && TAB_INST[tr.inst] ? `<button data-a="tab" title="弦とフレットの番号の楽譜（五線とつながっています）">${I('score')}TAB譜：${{ '': 'なし', both: '五線＋TAB', only: 'TABだけ' }[(scoreSettings().tab || {})[tr.id] || '']} → かえる</button>` : ''}
          ${song.locks.tracks ? '' : `<button data-a="dup">${I('copy')}複製する</button><button data-a="del" class="danger">${I('trash')}削除する</button>`}
        </div></details></div>
      <div class="trow"><button class="instbtn" ${tr.locked ? 'disabled' : ''} title="楽器をえらぶ">${tr.type === 'drum' ? PIC('kit', tr.kit) : PIC('inst', tr.inst)}<span class="instname">${escapeHtml(instLabel)}</span>${badge}${I('chevron')}</button>
        <input class="vol" type="range" min="0" max="1" step="0.01" value="${tr.vol}" title="音量" ${tr.locked ? 'disabled' : ''}></div>`;
    d.addEventListener('pointerdown', (ev) => {
      // つまみ（⋮⋮）か、マウスならカードのあいている所をドラッグ → 順番を入れかえ
      const grip = ev.target.closest('.tgrip');
      if (grip || (ev.pointerType === 'mouse' && ev.button === 0 && !ev.target.closest('button, input, select, details, .tstrip'))) trackDragStart(ev, i, d, !!grip);
      if (cur !== i && !ev.target.closest('details') && !ev.target.closest('.tstrip')) selectTrack(i);
    });
    d.addEventListener('focusin', (ev) => { if (cur !== i && !ev.target.closest('details')) { const id = ev.target.className; selectTrack(i); const again = $$('#trackList .track')[i]; const el = again && [...again.querySelectorAll('button, input, summary')].find((x) => x.className === id); if (el) el.focus(); } });
    d.querySelector('.mute').onclick = () => { tr.mute = !tr.mute; version++; renderTracks(); autosaveSoon(); const b = $$('#trackList .track')[i]; if (b) b.querySelector('.mute').focus({ preventScroll: true }); };
    d.querySelector('.solo').onclick = () => { tr.solo = !tr.solo; version++; renderTracks(); autosaveSoon(); const b = $$('#trackList .track')[i]; if (b) b.querySelector('.solo').focus({ preventScroll: true }); };
    d.querySelector('.instbtn').onclick = (ev) => { ev.stopPropagation(); openInstPicker(i); };
    d.querySelectorAll('.tmenu [data-a]').forEach((b) => (b.onclick = (ev) => {
      ev.stopPropagation();
      closePops();
      const a = b.dataset.a;
      if (a === 'rename') {
        const n = prompt('トラックの名前（空にすると楽器の名前にもどります）', tr.name);
        if (n != null) edit(() => { const v = n.trim().slice(0, 20); tr.name = v; delete tr.short; if (v && !isAutoName({ name: v })) tr.cname = true; else delete tr.cname; }, 'トラック名');
        renderTracks();
      }
      else if (a === 'tab') { const order = ['', 'both', 'only']; const c = (scoreSettings().tab || {})[tr.id] || ''; setTabMode(tr, order[(order.indexOf(c) + 1) % 3]); renderTracks(); }
      else if (a === 'up') moveTrack(i, -1);
      else if (a === 'down') moveTrack(i, 1);
      else if (a === 'dup') {
        if (song.tracks.length >= MAX_TRACKS) return toast(`トラックは${MAX_TRACKS}つまでです`);
        edit(() => { song.tracks.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(tr)), id: uid(), name: isAutoName(tr) ? tr.name : (tr.name + 'のコピー').slice(0, 20), locked: false }); cur = i + 1; }, 'トラックを複製');
        renderTracks();
      } else if (a === 'del') {
        if (song.tracks.length <= 1) return alert('トラックは1つ以上必要です');
        if (!confirm(`「${tr.name}」を削除しますか？`)) return;
        edit(() => { song.tracks.splice(i, 1); cur = clamp(cur, 0, song.tracks.length - 1); }, 'トラックを削除');
        renderTracks();
      }
    }));
    const vol = d.querySelector('.vol');
    vol.onpointerdown = vol.onfocus = () => { vol._snap = snapshot(); };
    vol.oninput = (ev) => { tr.vol = +ev.target.value; liveVolume(tr); };
    vol.onchange = () => { if (vol._snap && snapshot() !== vol._snap) pushUndo(vol._snap, '音量'); changed(); };
    if (isPhone) {
      // スマホ：トラックの中身を、小節ごとの帯で見せる（タップでその小節を打ち込みへ）
      const strip = document.createElement('div');
      strip.className = 'tstrip';
      {
        // 絵が前と同じなら、前に作った部品をそのまま付けなおす（文字から作りなおさない）
        const html = trackStrip(tr, i);
        const c = stripCache.get(tr.id);
        if (c && c.node && c.nodeKey === c.key) strip.appendChild(c.node);
        else { strip.innerHTML = html; if (c) { c.node = strip.firstElementChild; c.nodeKey = c.key; } }
      }
      strip.onclick = (ev) => {
        const svg = strip.querySelector('svg');
        const r = svg.getBoundingClientRect();
        const b = clamp(Math.floor((ev.clientX - r.left) / stripBW()), 0, song.bars - 1);
        selectTrack(i, false);
        selectBars(i, b, b);
        ui.startTick = barStart(b);
        setPhoneView('edit');
        $('#scroller').scrollLeft = barStart(b) * ppt();
        draw(); drawOverview(); updateMini();
      };
      strip.onscroll = () => { stripScroll = strip.scrollLeft; list.querySelectorAll('.tstrip').forEach((x) => { if (x !== strip && Math.abs(x.scrollLeft - stripScroll) > 1) x.scrollLeft = stripScroll; }); };
      d.appendChild(strip);
    }
    list.appendChild(d);
  });
  if (isPhone) list.querySelectorAll('.tstrip').forEach((x) => { x.scrollLeft = stripScroll; });
  renderChips();
  // ソロ・消音をまとめて解除するボタン（どれかがソロ・消音のときだけ出す）
  const so = $('#btnSoloOff');
  const mo = $('#btnMuteOff');
  if (so) so.hidden = !song.tracks.some((t) => t.solo) || !!song.locks.mute;
  if (mo) mo.hidden = !song.tracks.some((t) => t.mute) || !!song.locks.mute;
  if (scBox && scBox.scrollTop !== scTop) scBox.scrollTop = scTop;
  if (list.scrollTop !== listTop) list.scrollTop = listTop;
}
// 全部のトラックのソロ（または消音）を、まとめて解除する
function clearAll(key) {
  if (song.locks.mute) return toast('ロックされています');
  const n = song.tracks.filter((t) => t[key]).length;
  if (!n) return;
  for (const t of song.tracks) t[key] = false;
  version++;
  renderTracks();
  autosaveSoon();
  toast(key === 'solo' ? `ソロを解除しました（${n}つ）` : `消音を解除しました（${n}つ）`);
}
// トラックの中身の帯（スマホのトラック画面）
let stripScroll = 0;
function stripBW() {
  const w = ($('#trackList').clientWidth || innerWidth) - 40;
  // ui.stripZoom：スマホのトラック画面を2本指で広げた・つまんだ倍率
  return Math.max(10, Math.floor((Math.max(30, Math.floor(w / Math.min(song.bars, 8))) * (ui.stripZoom || 1))));
}
// 2本指で広げる・つまむ（ピンチ）：el の上で2本指を動かすと、on.move(倍率, 中心x, 中心y) をよぶ
function pinchOn(el, on) {
  let g = null;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const move = (e) => {
    if (!g || e.touches.length !== 2 || e._pinch) return;
    e._pinch = true;
    e.preventDefault();
    g.k = on.move(dist(e.touches) / g.d0, (e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2);
  };
  const done = (e) => {
    if (!g || (e && e._pinch)) return;
    if (e) e._pinch = true;
    const k = g.k;
    for (const t of g.targets) { t.removeEventListener('touchmove', move); t.removeEventListener('touchend', done); t.removeEventListener('touchcancel', done); }
    g = null;
    on.end(k);
  };
  el.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 2) { if (g) done(); return; }
    if (g || (on.ok && !on.ok())) return;
    // 指をおいた部品が、とちゅうで書きなおされて消えても動きを受け取れるように、その部品にも直接つける
    g = { d0: Math.max(10, dist(e.touches)), k: 1, targets: new Set([el, ...[...e.touches].map((t) => t.target)]) };
    for (const t of g.targets) { t.addEventListener('touchmove', move, { passive: false }); t.addEventListener('touchend', done); t.addEventListener('touchcancel', done); }
    on.start();
    e.preventDefault();
  }, { passive: false });
}
function initPinch() {
  // 楽譜の画面：2本指で大きく・小さく。指を動かしている間は絵をのばすだけにして、はなしたときに書きなおす（軽くするため）
  const view = $('#scoreEditView');
  let z0 = 1, c = null;
  const svgs = () => [...view.querySelectorAll(':scope > svg, :scope > div > svg')];
  pinchOn(view, {
    ok: () => ui.view === 'score',
    start: () => {
      z0 = ui.sc.zoom || 1; c = null;
      ui.sc.pinching = true;
      // 1本目の指で音符をつかんでいたら、はなす。音が入ってしまっていたら、取り消す
      if (ui.sc.dragging) dispatchEvent(new Event('pointercancel'));
      if (scTouch && performance.now() - scTouch.t < 600 && undoStack.length > scTouch.n) undo();
      scTouch = null;
    },
    move: (f, x, y) => {
      const k = clamp(z0 * f, 0.6, 2) / z0;
      const r = view.getBoundingClientRect();
      if (!c) c = { x: x - r.left + view.scrollLeft, y: y - r.top + view.scrollTop, vx: x - r.left, vy: y - r.top };
      for (const el of svgs()) { el.style.transformOrigin = `${c.x - el.offsetLeft}px ${c.y - el.offsetTop}px`; el.style.transform = `scale(${k.toFixed(3)})`; }
      return k;
    },
    end: (k) => {
      ui.sc.pinching = false;
      for (const el of svgs()) { el.style.transform = ''; el.style.transformOrigin = ''; }
      const z = clamp(Math.round(z0 * k * 100) / 100, 0.6, 2);
      if (Math.abs(z - z0) < 0.02) return;
      const kk = z / z0;
      ui.sc.zoom = z;
      renderScoreEditNow();
      // 指のあった所が、同じ所にのこるように
      if (c) { view.scrollLeft = c.x * kk - c.vx; view.scrollTop = c.y * kk - c.vy; }
    },
  });
  // スマホのトラックの画面：2本指で、小節のはばを広く・せまく
  const box = document.querySelector('.tracks');
  let s0 = 1, raf = 0;
  pinchOn(box, {
    ok: () => isPhone,
    start: () => { s0 = ui.stripZoom || 1; },
    move: (f) => {
      const z = clamp(s0 * f, 0.25, 6);
      const old = ui.stripZoom || 1;
      if (Math.abs(z - old) / old < 0.03) return z / s0;
      stripScroll = stripScroll * (z / old);
      ui.stripZoom = z;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; renderTracks(); });
      return z / s0;
    },
    end: () => { renderTracks(); lsSet('otsumiki-stripzoom', String(ui.stripZoom || 1)); },
  });
  ui.stripZoom = clamp(+lsGet('otsumiki-stripzoom', '1') || 1, 0.25, 6);
}
let scTouch = null; // 楽譜を指でおしたときの記録（2本目の指が来たら、1本目の操作を取り消すため）
// トラックの帯の絵は、中身が変わっていなければ前のものを使い回す（30パートの曲で、毎回2万個の音を書きなおさない）
const stripCache = new Map(); // トラックの id → { key, html }
function trackStrip(tr, i) {
  let h = 0;
  if (tr.type === 'melody') { const ns = tr.notes; h = ns.length; for (let q = 0; q < ns.length; q++) { const n = ns[q]; h = (Math.imul(h, 31) + n.s * 7 + n.p * 131 + n.l) | 0; } }
  else h = JSON.stringify(tr.type === 'chord' ? tr.chords : tr.grid);
  const key = [tr.type, i, stripBW(), song.bars, totalTicks(), JSON.stringify(song.meter), JSON.stringify(song.meters || 0), song.pickup || 0, i === cur ? ui.sel.b0 + ':' + ui.sel.b1 : '', h].join('|');
  const c = stripCache.get(tr.id);
  if (c && c.key === key) return c.html;
  const html = trackStripBuild(tr, i);
  stripCache.set(tr.id, { key, html });
  if (stripCache.size > 200) stripCache.clear();
  return html;
}
function trackStripBuild(tr, i) {
  const BW = stripBW();
  const H = 44;
  const W = BW * song.bars;
  const col = TRACK_COLORS[i % TRACK_COLORS.length];
  const xOf = (t) => { const b = barOf(Math.max(0, t)); return (b + (t - barStart(b)) / barLen(b)) * BW; };
  let o = '';
  for (let b = 0; b < song.bars; b++) {
    const sel = i === cur && b >= ui.sel.b0 && b <= ui.sel.b1;
    o += `<rect x="${b * BW + 1}" y="1" width="${BW - 2}" height="${H - 2}" rx="6" class="${sel ? 'sb sel' : 'sb'}"/>`;
    if (b % 4 === 0) o += `<text x="${b * BW + 5}" y="11" class="bn">${b + 1}</text>`;
  }
  if (tr.type === 'melody' && tr.notes.length) {
    const ps = tr.notes.map((n) => n.p);
    const lo = Math.min(...ps) - 1;
    const hi = Math.max(...ps) + 1;
    const span = Math.max(8, hi - lo);
    // 音は、色（ドレミ…）ごとに1つの図形にまとめて書く（音の数だけ部品を作ると、大きな曲で画面が重くなる）
    const paths = new Array(12).fill('');
    const tot = totalTicks();
    for (const n of tr.notes) {
      if (n.s >= tot) continue;
      const x = xOf(n.s);
      const w = Math.max(2, xOf(Math.min(n.s + n.l, tot)) - x - 1);
      const y = 13 + ((hi - n.p) / span) * (H - 19);
      paths[n.p % 12] += `M${x.toFixed(1)} ${y.toFixed(1)}h${w.toFixed(1)}v3.2h${(-w).toFixed(1)}z`;
    }
    paths.forEach((d, pc) => { if (d) o += `<path d="${d}" fill="${PC_COLORS[pc]}"/>`; });
  } else if (tr.type === 'chord') {
    tr.chords.forEach((c, b) => { if (c && b < song.bars) o += `<text x="${b * BW + BW / 2}" y="${H / 2 + 7}" text-anchor="middle" class="cn">${escapeHtml(chordLabel(c))}</text>`; });
  } else if (tr.type === 'drum') {
    const ids = Object.keys(tr.grid);
    ids.forEach((id, k) => {
      const y = 15 + (k % 6) * 4.6;
      let d1 = '', d2 = '';
      for (const s in tr.grid[id]) { if (+s < totalTicks()) { const d = `M${xOf(+s).toFixed(1)} ${y}h2v3.4h-2z`; if (tr.grid[id][s] === 2) d2 += d; else d1 += d; } }
      if (d1) o += `<path d="${d1}" fill="${col}" opacity="0.65"/>`;
      if (d2) o += `<path d="${d2}" fill="${col}"/>`;
    });
  }
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${o}</svg>`;
}
function moveTrack(i, dir) { moveTrackTo(i, i + dir); }
// トラックを i 番目から j 番目へ（楽譜のパートの順番も、この順になる）
function moveTrackTo(i, j) {
  if (j < 0 || j >= song.tracks.length || i === j) return;
  if (song.locks.tracks) return toast('トラックの並べかえはロックされています');
  const curId = track().id;
  edit(() => {
    const [t] = song.tracks.splice(i, 1);
    song.tracks.splice(j, 0, t);
    cur = Math.max(0, song.tracks.findIndex((x) => x.id === curId));
    // オーケストラの楽譜でも、自分でならべた順にする
    const S = scoreSettings();
    if (S.orch) S.ordered = true;
  }, 'トラックの並べかえ');
  renderTracks();
  renderScoreEdit();
  if (!$('#scorePanel').hidden) renderScorePanel();
}
// トラックのカードをドラッグして並べかえる
function trackDragStart(ev, i, card, fromGrip) {
  if (song.tracks.length < 2) return;
  const x0 = ev.clientX;
  const y0 = ev.clientY;
  const list = $('#trackList');
  let on = false;
  let to = i;
  let ghost = null;
  const cards = () => [...list.querySelectorAll('.track')];
  const move = (e) => {
    const dy = e.clientY - y0;
    if (!on) {
      if (Math.abs(dy) < 6 || Math.abs(e.clientX - x0) > Math.abs(dy) * 1.5) return;
      on = true;
      card.classList.add('dragging');
      document.body.classList.add('trackdrag');
      ghost = document.createElement('div');
      ghost.className = 'tdrop';
      list.appendChild(ghost);
    }
    e.preventDefault();
    const zf = parseFloat(list.style.zoom) || 1;
    card.style.transform = `translateY(${dy / zf}px)`;
    // どこに入るか：ほかのカードのまん中より上か下か
    const cs = cards();
    const lr = list.getBoundingClientRect();
    to = 0;
    let lineY = cs[0].getBoundingClientRect().top;
    cs.forEach((c, k) => {
      if (k === i) return;
      const r = c.getBoundingClientRect();
      if (e.clientY > r.top + r.height / 2) { to = k < i ? k + 1 : k; lineY = r.bottom; }
      else if (to === 0 && k === 0) lineY = r.top;
    });
    if (to > i) to = Math.min(to, cs.length - 1);
    ghost.style.top = (lineY - lr.top) / zf + list.scrollTop - 2 + 'px';
    // リストのはしでは、自動でスクロール
    if (e.clientY < lr.top + 24) list.scrollTop -= 8; else if (e.clientY > lr.bottom - 24) list.scrollTop += 8;
  };
  const up = () => {
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', up);
    removeEventListener('pointercancel', up);
    if (!on) return;
    card.classList.remove('dragging');
    card.style.transform = '';
    document.body.classList.remove('trackdrag');
    if (ghost) ghost.remove();
    if (to !== i) { moveTrackTo(i, to); toast(`「${song.tracks[to].name}」を ${to + 1}番目にしました（楽譜の順番も同じです）`); }
  };
  addEventListener('pointermove', move, { passive: false });
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
  if (fromGrip) ev.preventDefault();
}
function addTrack(type) {
  if (song.tracks.length >= MAX_TRACKS) return toast(`トラックは${MAX_TRACKS}つまでです`);
  const n = song.tracks.filter((t) => t.type === type).length + 1;
  const name = type === 'melody' ? 'メロディ' + n : type === 'drum' ? 'リズム' + n : 'コード伴奏' + (n > 1 ? n : '');
  edit(() => { song.tracks.push(newTrack(type, { name })); cur = song.tracks.length - 1; }, 'トラックを追加');
  renderTracks();
  scrollToNotes();
  if (type !== 'chord') openInstPicker(cur);
}

// 和音をパートに分ける（MuseScore の「展開」）：上の音から順に、1つずつ下のパートへ。
// 音が足りない所は、いちばん下の音を下のパートにも入れる（どのパートも休みにならないように）
function explodeTrack(tr) {
  const groups = new Map();
  for (const n of tr.notes) { if (!groups.has(n.s)) groups.set(n.s, []); groups.get(n.s).push(n); }
  let parts = 0;
  for (const g of groups.values()) parts = Math.max(parts, new Set(g.map((n) => n.p)).size);
  if (parts < 2) return toast('和音（同時に鳴る2つ以上の音）がありません');
  parts = Math.min(parts, 4);
  if (song.tracks.length + parts - 1 > MAX_TRACKS) return toast(`トラックは${MAX_TRACKS}つまでです`);
  const at = song.tracks.indexOf(tr);
  const strip = (n) => { const o = { ...n }; for (const k of ['ly', 'ly2', 'ly3', 'v']) delete o[k]; return o; };
  edit(() => {
    const lists = Array.from({ length: parts }, () => []);
    for (const g of groups.values()) {
      const byP = [...g].sort((a, b) => b.p - a.p).filter((n, i, arr) => !i || arr[i - 1].p !== n.p);
      for (let k = 0; k < parts; k++) {
        // 4つより多い和音は、いちばん下のパートに、のこりを全部
        if (k === parts - 1 && byP.length > parts) { for (const n of byP.slice(k)) lists[k].push(strip(n)); continue; }
        const n = byP[Math.min(k, byP.length - 1)];
        lists[k].push(k === 0 ? n : strip(n));
      }
    }
    tr.notes = lists[0];
    const base = tr.name.replace(/\s*[1-4１-４]$/, '');
    const made = [];
    for (let k = 1; k < parts; k++) made.push(newTrack('melody', { name: base + ' ' + (k + 1), inst: tr.inst, range: tr.range, vol: tr.vol, pan: tr.pan, real: tr.real, notes: lists[k].sort((a, b) => a.s - b.s) }));
    if (!/[1-4１-４]$/.test(tr.name)) tr.name = base + ' 1';
    song.tracks.splice(at + 1, 0, ...made);
  }, '和音をパートに分ける');
  renderTracks(); renderEditorTools(); draw(); drawOverview();
  if (ui.view === 'score') renderScoreEdit();
  toast(`${parts}つのパートに分けました`);
}
// 下のパートをまとめる（MuseScore の「集約」）：すぐ下のメロディのパートの音を、このパートの和音にする
function implodeTrack(tr) {
  const at = song.tracks.indexOf(tr);
  const src = song.tracks[at + 1];
  if (!src || src.type !== 'melody') return toast('すぐ下にメロディのパートがありません');
  if (src.locked) return toast('下のパートがロックされています');
  edit(() => {
    const have = new Set(tr.notes.map((n) => n.s + ':' + n.p));
    for (const n of src.notes) {
      if (have.has(n.s + ':' + n.p)) continue;
      have.add(n.s + ':' + n.p);
      const o = { ...n };
      for (const k of ['ly', 'ly2', 'ly3']) delete o[k];
      // 長さのちがう音は、楽譜では下の声部に書く
      const mate = tr.notes.find((m) => m.s === n.s && voiceOf(m) === 1);
      if (mate && mate.l !== n.l) o.v = 2; else if (!mate && tr.notes.some((m) => voiceOf(m) === 1 && m.s < n.s + n.l && m.s + m.l > n.s)) o.v = 2; else delete o.v;
      tr.notes.push(o);
    }
    tr.notes.sort((a, b) => a.s - b.s || b.p - a.p);
    song.tracks.splice(at + 1, 1);
  }, '下のパートをまとめる');
  renderTracks(); renderEditorTools(); draw(); drawOverview();
  if (ui.view === 'score') renderScoreEdit();
  toast(`「${src.name}」をまとめました（「もどす」で元にもどせます）`);
}

function renderEditorTools() {
  const tr = track();
  const box = $('#editorTools');
  const pal = $('#chordPalette');
  const lk = locked(tr);
  const wasOpen = box.querySelector('details[open]');
  const multi = ui.sel.t === cur && ui.sel.b1 > ui.sel.b0;
  pal.innerHTML = '';
  pal.hidden = tr.type !== 'chord';
  let html = '';
  if (lk) html += `<span class="lockmsg" title="先生がロックしています（見る・聴くだけ）">${I('lock')}ロック中</span>`;
  // 音の長さ：広い画面はボタン、そうでなければ1つのえらぶ箱（道具の行があふれないように）
  if (tr.type !== 'chord' && (isPhone || innerWidth < 1600)) html += `<select id="gridSel" class="gridsel" title="おたまチョップ：置く音の長さ">${GRIDS.map(([v, t, ic]) => `<option value="${v}" ${ui.grid === v ? 'selected' : ''}>${ic} ${t}</option>`).join('')}</select>`;
  else if (tr.type !== 'chord') html += `<span class="grp otama" title="おたまチョップ：置く音の長さ（マス目の大きさ）">${GRIDS.map(([v, t, ic]) => `<button class="mini gbtn ${ui.grid === v ? 'on' : ''}" data-v="${v}" title="${t}"><span class="ic">${ic}</span>${t.replace('音符', '').replace('3連符', '3連')}</button>`).join('')}</span>`;
  let tools = '';
  let others = [];
  if (tr.type === 'melody') {
    others = song.tracks.filter((t) => t.type === 'melody' && t !== tr);
    if (!song.locks.compose) html += `<button class="mini accent" id="btnAuto" title="音階・コード・ほかのパートに合うように、メロディを自動で作ります">${I('spark')}<span class="keep">おまかせ</span></button>`;
    const [rlo, rhi] = trackRange(tr);
    html += `<details class="pop" data-pop="range"><summary class="mini" title="表示する音の高さのはんい">${I('piano')}<span>${SOLFA_OCT(rlo)}〜${SOLFA_OCT(rhi)}</span></summary><div class="popbody">
      <div class="sub">はんいをえらぶ</div>
      <div class="rangelist">${Object.entries(RANGES).map(([k, v]) => `<button class="mini ${k === tr.range && tr.lo == null && tr.hi == null ? 'on' : ''}" data-range="${k}">${v[0]}</button>`).join('')}</div>
      <div class="sub">広げる・せまくする（1オクターブずつ）</div>
      <div class="btnrow"><button class="mini" data-ext="hi+1">${I('plus')}上に広げる</button><button class="mini" data-ext="lo-1">${I('plus')}下に広げる</button></div>
      <div class="btnrow"><button class="mini" data-ext="hi-1">${I('minus')}上をせまく</button><button class="mini" data-ext="lo+1">${I('minus')}下をせまく</button></div>
    </div></details>
    <button class="mini ${ui.selTool ? 'on' : ''}" id="btnSelTool" title="えらぶ：ドラッグで囲んで、まとめて移動・コピー・消す（パソコンは Shift＋ドラッグでも）">${I('pointer')}<span>えらぶ</span></button>
    <button class="mini adv-only ${ui.chromatic ? 'on' : ''}" id="btnChrom" title="音階にない音（半音・黒鍵）の行もぜんぶ表示します">${I('sharp')}<span>半音</span></button>`;
    tools = `
      <div class="sub">音の移動 <small>${multi ? `（${ui.sel.b0 + 1}〜${ui.sel.b1 + 1}小節だけ）` : '（全部。曲の地図で2小節以上えらぶとその範囲だけ）'}</small></div>
      <div class="btnrow"><button class="mini" id="tOctUp">オクターブ↑</button><button class="mini" id="tSemiUp">半音↑</button><button class="mini" id="tDegUp">音階↑</button></div>
      <div class="btnrow"><button class="mini" id="tOctDn">オクターブ↓</button><button class="mini" id="tSemiDn">半音↓</button><button class="mini" id="tDegDn">音階↓</button></div>
      ${others.length ? `<div class="sub">輪唱づくり</div><div class="btnrow"><select id="rSrc">${others.map((t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}</select>を<select id="rBars">${[0, 1, 2, 4].map((b) => `<option value="${b}" ${b === 2 ? 'selected' : ''}>${b}小節</option>`).join('')}</select>ずらして<button class="mini" id="btnRound">ここに写す</button></div>` : ''}
      <div class="sub">パートを分ける・まとめる</div>
      <div class="btnrow"><button class="mini" id="btnExplode" title="和音を、上の音から順に、べつべつのパートに分けます（このパートにいちばん上の音がのこり、下に新しいパートができます）">和音をパートに分ける</button><button class="mini" id="btnImplode" title="すぐ下のメロディのパートを、このパートにまとめて和音にします（下のパートはなくなります）" ${song.tracks[cur + 1] && song.tracks[cur + 1].type === 'melody' ? '' : 'disabled'}>下のパートをまとめる</button></div>`;
  } else if (tr.type === 'drum') {
    html += `<button class="mini ${ui.selTool ? 'on' : ''}" id="btnSelTool" title="えらぶ：ドラッグで囲んで、まとめて移動・コピー・消す（パソコンは Shift＋ドラッグでも）">${I('pointer')}<span>えらぶ</span></button>`;
    html += `<select id="rPreset" title="お手本のリズムを入れます"><option value="">リズムのお手本…</option>${Object.entries(RHYTHM_PRESETS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select><span class="hint">おすたびに ●→強→なし</span>`;
  } else {
    if (!song.locks.compose) html += `<select id="cProg" title="よく使われるコード進行を、えらんだ小節から入れます"><option value="">コード進行…</option>${[...new Set(PROGRESSIONS.map((x) => x[4]))].map((g) => `<optgroup label="${g}">${PROGRESSIONS.map(([n, , d, , gg], i) => (gg === g ? `<option value="${i}" title="${d}">${n}</option>` : '')).join('')}</optgroup>`).join('')}</select>`;
    if (!song.locks.compose) html += `<button class="mini accent" id="btnAutoChord" title="メロディに合うコードを、全部の小節に自動でつけます">${I('spark')}<span>コードをつける</span></button>`;
    html += `<label class="grp">伴奏の形 <select id="cPat">${Object.entries(CHORD_PATTERNS).map(([k, v]) => `<option value="${k}" ${k === tr.pattern ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="grp"><input type="checkbox" id="cBass" ${tr.bassOn ? 'checked' : ''}> ベースも</label>`;
    const dia = diatonic();
    const hb = ui.chordHalf || 0;
    pal.innerHTML = `<div class="palhead">${ui.selBar + 1}小節目${hb === 1 ? 'の前半' : hb === 2 ? 'の後半' : ''}のコードをえらぶ
      <span class="seg halfseg" title="1小節に2つのコードを入れるときは「前半」「後半」"><button class="mini ${hb === 0 ? 'on' : ''}" data-h="0">1小節まるごと</button><button class="mini ${hb === 1 ? 'on' : ''}" data-h="1">前半</button><button class="mini ${hb === 2 ? 'on' : ''}" data-h="2">後半</button></span></div>
      <div class="palrow">${dia.map((c, i) => `<button class="chordbtn" data-i="${i}" style="--pc:${PC_COLORS[c.r]}"><b>${chordName(c)}</b><small>${c.deg}</small></button>`).join('')}
      <button class="chordbtn none" data-i="-1"><b>なし</b><small>休み</small></button>
      <input id="cType" class="ctype" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="打つ：Am7" title="コードネームを打って Enter（れい：Am7, F#m, B♭）" aria-label="コードネームを打つ">
      <details class="pop" data-pop="chordother"><summary class="mini">そのほかのコード…</summary><div class="popbody"><select id="cRoot">${CHORD_ROOT.map((n, i) => `<option value="${i}">${n}</option>`).join('')}</select>
      <select id="cQ">${Object.entries(CHORD_Q).map(([k, v]) => `<option value="${k}">${v.s || '（長三和音）'}</option>`).join('')}</select>
      <button class="mini" id="cSet">この小節に入れる</button></div></details></div>`;
    pal.querySelectorAll('.halfseg button').forEach((b) => (b.onclick = () => { ui.chordHalf = +b.dataset.h; renderEditorTools(); draw(); }));
    pal.querySelectorAll('.chordbtn').forEach((b) => (b.onclick = () => { const i = +b.dataset.i; setChord(i < 0 ? null : { r: dia[i].r, q: dia[i].q }); }));
    $('#cSet').onclick = () => setChord({ r: +$('#cRoot').value, q: $('#cQ').value });
    $('#cType').addEventListener('keydown', (e) => {
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      const v = e.target.value.trim().replace(/＃/g, '#');
      if (!v) return;
      const c = v === '-' || v === 'なし' ? null : parseChord(v);
      if (v !== '-' && v !== 'なし' && !c) return toast('読めませんでした（れい：C, Am, G7, FM7, F#m, B♭）');
      setChord(c);
      setTimeout(() => { const el = $('#cType'); if (el) el.focus(); }, 0);
    });
  }
  html += `<details class="pop adv-only" data-pop="tools"><summary class="mini" title="音域・音の移動・輪唱・消去など">${I('tool')}<span>道具</span></summary><div class="popbody">${tools}
    <div class="sub">再生</div><div class="btnrow"><button class="mini" id="btnViewLoop" title="いま見えている小節だけをくりかえし再生">${I('loop')}見えている所だけくりかえす</button></div>
    <div class="sub">消す</div><div class="btnrow"><button class="mini danger" id="btnClear" ${lk ? 'disabled' : ''}>このトラックをぜんぶ消す</button></div></div></details>`;
  box.innerHTML = html;
  if (wasOpen) { const again = box.querySelector(`details[data-pop="${wasOpen.dataset.pop}"]`); if (again) again.open = true; }
  box.querySelectorAll('.gbtn').forEach((b) => (b.onclick = () => setGrid(+b.dataset.v)));
  const gs = $('#gridSel');
  if (gs) gs.onchange = () => setGrid(+gs.value);
  $('#btnViewLoop').onclick = () => {
    const sc = $('#scroller');
    const bt = barTicks();
    const b0 = barOf(sc.scrollLeft / ppt());
    const b1 = Math.max(b0, barOf((sc.scrollLeft + sc.clientWidth - LW - 10) / ppt()));
    ui.loopRange = [b0, b1 + 1];
    ui.loopOn = true;
    ui.startTick = barStart(b0);
    $('#btnLoop').classList.add('on');
    closePops();
    play();
  };
  $('#btnClear').onclick = () => { if (confirm(`「${tr.name}」の中身をぜんぶ消しますか？`)) edit(() => clearTrack(tr), 'トラックを全部消す'); };
  if (tr.type === 'melody') {
    box.querySelectorAll('[data-range]').forEach((b) => (b.onclick = () => { edit(() => { tr.range = b.dataset.range; delete tr.lo; delete tr.hi; }, '音域'); scrollToNotes(); }));
    box.querySelectorAll('[data-ext]').forEach((b) => (b.onclick = () => {
      const [lo, hi] = trackRange(tr);
      const [side, d] = [b.dataset.ext.slice(0, 2), +b.dataset.ext.slice(2) * 12];
      edit(() => {
        if (side === 'hi') tr.hi = clamp(hi + d, Math.max(lo + 12, 33), 108);
        else tr.lo = clamp(lo + d, 21, Math.min(hi - 12, 96));
      }, '音域を広げる');
      resizeEditor();
      draw();
    }));
    $('#btnSelTool').onclick = () => { ui.selTool = !ui.selTool; if (!ui.selTool) nsel.clear(); renderEditorTools(); updateSelBar(); draw(); toast(ui.selTool ? 'えらぶモード：ドラッグで囲むと、まとめてえらべます' : '音を置くモードにもどりました'); };
    $('#btnChrom').onclick = () => { ui.chromatic = !ui.chromatic; renderEditorTools(); resizeEditor(); draw(); toast(ui.chromatic ? '半音の行もぜんぶ表示します（音階にない音はうすい色）' : '音階の音だけ表示します'); };
    const guard = (fn, label) => () => { if (lk) return toast('ロックされています'); edit(fn, label); };
    $('#tDegDn').onclick = guard(() => transposeDegree(tr, -1), '音階で下げる');
    $('#tDegUp').onclick = guard(() => transposeDegree(tr, 1), '音階で上げる');
    $('#tSemiDn').onclick = guard(() => transpose(tr, -1), '半音下げる');
    $('#tSemiUp').onclick = guard(() => transpose(tr, 1), '半音上げる');
    $('#tOctDn').onclick = guard(() => transpose(tr, -12), 'オクターブ下げる');
    $('#tOctUp').onclick = guard(() => transpose(tr, 12), 'オクターブ上げる');
    const ba = $('#btnAuto');
    if (ba) ba.onclick = () => { if (lk) return toast('ロックされています'); autoDialog(tr); };
    $('#btnExplode').onclick = () => { if (lk) return toast('ロックされています'); explodeTrack(tr); };
    $('#btnImplode').onclick = () => { if (lk) return toast('ロックされています'); implodeTrack(tr); };
    if (others.length) $('#btnRound').onclick = () => {
      if (lk) return;
      const src = song.tracks.find((t) => t.id === $('#rSrc').value);
      if (tr.notes.length && !confirm('このトラックの音を上書きしますか？')) return;
      edit(() => shiftCopy(src, tr, +$('#rBars').value), '輪唱づくり');
    };
  } else if (tr.type === 'drum') {
    $('#btnSelTool').onclick = () => { ui.selTool = !ui.selTool; if (!ui.selTool) nsel.clear(); renderEditorTools(); updateSelBar(); draw(); toast(ui.selTool ? 'えらぶモード：ドラッグで囲むと、まとめてえらべます' : 'リズムを入れるモードにもどりました'); };
    $('#rPreset').onchange = (ev) => {
      if (!ev.target.value || lk) return;
      if (Object.keys(tr.grid).length && !confirm('今のリズムを消して、お手本を入れますか？')) { ev.target.value = ''; return; }
      edit(() => applyRhythm(tr, ev.target.value), 'リズムのお手本');
      renderTracks();
    };
  } else {
    if ($('#btnAutoChord')) $('#btnAutoChord').onclick = () => autoChords();
    if ($('#cProg')) $('#cProg').onchange = (ev) => { if (ev.target.value !== '') applyProgression(+ev.target.value); ev.target.value = ''; };
    $('#cPat').onchange = (ev) => edit(() => { tr.pattern = ev.target.value; }, '伴奏の形');
    $('#cBass').onchange = (ev) => edit(() => { tr.bassOn = ev.target.checked; }, 'ベースの有無');
  }
}
function closePops(except) {
  $$('details.pop[open]').forEach((d) => { if (d !== except && !d.contains(except)) d.removeAttribute('open'); });
}
function setGrid(v) {
  const sc = $('#scroller');
  const centerTick = (sc.scrollLeft + (sc.clientWidth - LW) / 2) / ppt();
  ui.grid = v;
  ui.inputTick = cellStart(ui.inputTick);
  renderEditorTools();
  resizeEditor();
  sc.scrollLeft = Math.max(0, centerTick * ppt() - (sc.clientWidth - LW) / 2);
  draw();
  drawOverview();
}

function scrollToNotes() {
  const tr = track();
  const sc = $('#scroller');
  resizeEditor();
  if (tr.type !== 'melody') { sc.scrollTop = 0; return; }
  const rows = rowsFor(tr);
  let target;
  if (tr.notes.length) {
    const avg = tr.notes.reduce((a, n) => a + n.p, 0) / tr.notes.length;
    target = rows.findIndex((r) => r.p <= avg);
  } else target = rows.findIndex((r) => r.p <= trackRange(tr)[0] + 12);
  sc.scrollTop = Math.max(0, RH + target * ui.rh - sc.clientHeight / 2);
}

/* ============================================================
   楽器えらび
   ============================================================ */
let picker = null;
function openInstPicker(ti) {
  const tr = song.tracks[ti];
  if (locked(tr)) return toast('ロックされています');
  picker = { ti, type: tr.type, val: tr.type === 'drum' ? tr.kit : tr.inst, cat: tr.type === 'drum' ? null : Sound.INST_CAT[tr.inst] || 'key', real: tr.real !== false };
  $('#instTitle').textContent = tr.type === 'drum' ? '打楽器のセットをえらぶ' : '楽器をえらぶ';
  renderPicker();
  $('#dlgInst').showModal();
}
function renderPicker() {
  const p = picker;
  const box = $('#instBody');
  const ctx = audioCtx();
  const toggle = `<div class="realtoggle" title="本物の楽器を録音した音か、コンピューターで作った音か">
    <button class="${p.real ? 'on' : ''}" data-r="1">${I('mic')}本物の録音</button><button class="${p.real ? '' : 'on'}" data-r="0">${I('wave')}電子音</button></div>`;
  if (p.type === 'drum') {
    const kit = Sound.KITS.find((k) => k.id === p.val) || Sound.KITS[0];
    box.innerHTML = `${toggle}<div class="cats">${Sound.KITS.map((k) => `<button class="catbtn ${k.id === kit.id ? 'on' : ''}" data-k="${k.id}">${PIC('kit', k.id)}${k.name}</button>`).join('')}</div>
      <div class="pads">${[...kit.list].reverse().map((id, i) => `<button class="pad" data-id="${id}"><kbd>${'ASDFGHJK'[i]}</kbd>${PIC('drum', id)}<span class="padname">${Sound.DRUMS[id].name}</span>${p.real && Sound.Samples.hasDrum(id) ? `<small class="rec">${I('mic')}</small>` : ''}</button>`).join('')}</div>
      <p class="muted">パッドをたたくか、キーボードの A〜K で音をためせます。マイクのしるし＝本物の録音があります。</p>`;
    if (p.real) Sound.Samples.loadDrums(ctx).catch(() => {});
    box.querySelectorAll('.catbtn').forEach((b) => (b.onclick = () => { p.val = b.dataset.k; renderPicker(); }));
    box.querySelectorAll('.pad').forEach((b) => (b.onpointerdown = () => preview({ type: 'drum', real: p.real }, b.dataset.id)));
  } else {
    const cat = Sound.CATS.find((c) => c.id === p.cat) || Sound.CATS[0];
    box.innerHTML = `${toggle}<div class="cats">${Sound.CATS.map((c) => `<button class="catbtn ${c.id === cat.id ? 'on' : ''}" data-c="${c.id}">${PIC('cat', c.id)}${c.name}</button>`).join('')}</div>
      <div class="insts">${cat.list.map(([id, name]) => `<button class="instopt ${id === p.val ? 'on' : ''}" data-id="${id}">${PIC('inst', id)}<span class="iname">${name}</span>${p.real ? (Sound.Samples.has(id) ? `<small class="rec" title="本物の録音">${I('mic')}</small>` : `<small class="rec syn" title="録音がないので電子音で鳴ります">${I('wave')}</small>`) : ''}</button>`).join('')}</div>
      <div class="kbd" id="pickKbd"></div>`;
    box.insertAdjacentHTML('afterbegin', `<div class="myvoice ${p.val === 'myvoice' ? 'on' : ''}"><b>${I('mic')}じぶんの音</b><span>声や手びょうしを録音して、楽器にします（ド＝録った高さ）</span>
      <button class="mini accent" id="mvRec">${song.voice ? '録りなおす' : '録音する（2秒）'}</button>${song.voice ? '<button class="mini" id="mvUse">これにする</button>' : ''}<span id="mvState" class="mvstate"></span></div>`);
    $('#mvRec').onclick = async () => {
      try {
        const buf = await recordVoice((st) => { $('#mvState').textContent = st; });
        $('#mvState').textContent = '';
        if (!storeVoice(buf)) { toast('音が小さすぎました。マイクに近づいて、もう一度'); return; }
        autosaveSoon();
        p.val = 'myvoice';
        renderPicker();
        ensureAudio();
        [60, 64, 67, 72].forEach((m, i) => Sound.playNote(ctx, previewOut, 'myvoice', m, ctx.currentTime + 0.05 + i * 0.25, 0.3, 0.8));
        toast('録れました！ ドミソド で鳴らしてみたよ');
      } catch (e) { $('#mvState').textContent = ''; toast(e && e.name === 'NotAllowedError' ? 'マイクを使えるように許可してね' : '録音できませんでした：' + (e.message || e)); }
    };
    if ($('#mvUse')) $('#mvUse').onclick = () => { p.val = 'myvoice'; renderPicker(); ensureAudio(); [60, 64, 67, 72].forEach((m, i) => Sound.playNote(ctx, previewOut, 'myvoice', m, ctx.currentTime + 0.05 + i * 0.25, 0.3, 0.8)); };
    box.querySelectorAll('.catbtn').forEach((b) => (b.onclick = () => { p.cat = b.dataset.c; renderPicker(); }));
    const demo = async () => {
      if (p.real && Sound.Samples.has(p.val) && !Sound.Samples.ready(p.val)) { toast('録音を読み込んでいます…'); try { await Sound.Samples.load(p.val, ctx); } catch (e) { /* 電子音で鳴らす */ } }
      ensureAudio();
      const base = ['ebass', 'acbass', 'contrabass', 'cello', 'sbass1', 'sbass2', 'sbass3', 'tuba', 'bassoon', 'trombone', 'timpani', 'taikodrum'].includes(p.val) ? 41 : 60;
      [0, 4, 7, 12].forEach((iv, i) => Sound.playNote(ctx, previewOut, p.val, base + iv, ctx.currentTime + 0.02 + i * 0.18, 0.35, 0.7, p.real));
    };
    box.querySelectorAll('.instopt').forEach((b) => (b.onclick = () => {
      p.val = b.dataset.id;
      box.querySelectorAll('.instopt').forEach((x) => x.classList.toggle('on', x === b));
      demo();
    }));
    if (p.real && Sound.Samples.has(p.val)) Sound.Samples.load(p.val, ctx).catch(() => {});
    renderKeyboard($('#pickKbd'), (m) => { ensureAudio(); Sound.playNote(ctx, previewOut, p.val, m, ctx.currentTime, 0.5, 0.8, p.real); });
  }
  box.querySelectorAll('.realtoggle button').forEach((b) => (b.onclick = () => { p.real = b.dataset.r === '1'; renderPicker(); }));
}
function renderKeyboard(el, onPress) {
  const base = ui.kbOct * 12 + 12;
  const keys = 'awsedftgyhujkolp;';
  let html = '';
  for (let i = 0; i < 17; i++) {
    const m = base + i;
    const black = [1, 3, 6, 8, 10].includes(m % 12);
    html += `<button class="key ${black ? 'black' : 'white'}" data-m="${m}"><kbd>${keys[i].toUpperCase()}</kbd>${black ? '' : `<span>${noteName(m)}${m % 12 === 0 ? Math.floor(m / 12) - 1 : ''}</span>`}</button>`;
  }
  el.innerHTML = `<div class="keys">${html}</div><div class="kbdhint">鍵盤をおすか、キーボードの文字で音が出ます。Z：オクターブ下げる ／ X：上げる（いま C${ui.kbOct} から）</div>`;
  el.querySelectorAll('.key').forEach((b) => (b.onpointerdown = (e) => { e.preventDefault(); onPress(+b.dataset.m); }));
}

/* ============================================================
   パレット（ミキサー・イコライザー・エフェクト）
   ============================================================ */
const FX = {
  lowpass: ['ローパス（こもった音）', '横：音の明るさ ／ たて：くせの強さ'],
  highpass: ['ハイパス（シャカシャカ）', '横：低い音をけずる量 ／ たて：くせの強さ'],
  stutter: ['スタッター（くりかえし）', '横：くりかえす長さ（左ほど短い）'],
  delay: ['ディレイ（やまびこ）', '横：間かく ／ たて：くりかえす回数'],
  reverb: ['リバーブ（大きなホール）', 'たて：ひびきの量'],
  decimator: ['デシメーター（ゲーム機風）', 'たて：音のあらさ'],
};
let fxKind = 'lowpass';
function openPalette() {
  const box = $('#palBody');
  box.innerHTML = `
    <section><h4>ミキサー</h4><div class="mixer">${song.tracks.map((t, i) => `
      <div class="mixch" style="--tc:${TRACK_COLORS[i % TRACK_COLORS.length]}"><input type="range" min="0" max="1" step="0.01" value="${t.vol}" data-i="${i}" aria-label="${escapeHtml(t.name)}の音量" ${t.locked ? 'disabled' : ''}><span>${i + 1}. ${escapeHtml(t.name)}</span>
        <div class="panrow" title="左右の位置（ダブルクリックでまん中）"><small>左</small><input type="range" class="pan" min="-1" max="1" step="0.1" value="${+t.pan || 0}" data-p="${i}" aria-label="${escapeHtml(t.name)}の左右の位置" ${t.locked ? 'disabled' : ''}><small>右</small></div></div>`).join('')}
      <label class="mixch master"><input type="range" min="0" max="1.2" step="0.01" value="${song.master}" id="mMaster"><span>全体の音量</span></label></div></section>
    <section><h4>イコライザー <small class="muted">音域ごとのバランス</small></h4>
      <div class="eqrow"><label>低音 <input type="range" min="-12" max="12" step="1" value="${song.eq.low}" data-eq="low"></label>
      <label>中音 <input type="range" min="-12" max="12" step="1" value="${song.eq.mid}" data-eq="mid"></label>
      <label>高音 <input type="range" min="-12" max="12" step="1" value="${song.eq.high}" data-eq="high"></label>
      <label>ひびき <input type="range" min="0" max="1" step="0.05" value="${song.reverb}" id="mRev"></label>
      <button class="mini" id="eqReset">もとにもどす</button></div></section>
    <section><h4>メトロノーム</h4>
      <div class="eqrow"><label>音色 <select id="mKind">${Object.entries(Sound.METRO_SOUNDS).map(([k, v]) => `<option value="${k}" ${k === song.metro.kind ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label>音量 <input type="range" min="0" max="1.5" step="0.05" value="${song.metro.vol}" id="mVol"></label></div></section>
    <section><h4>エフェクトパッド <small class="muted">再生中にパッドを押している間だけかかります（書き出しには入りません）</small></h4>
      <div class="fxsel">${Object.entries(FX).map(([k, v]) => `<button class="mini ${k === fxKind ? 'on' : ''}" data-fx="${k}">${v[0]}</button>`).join('')}</div>
      <div class="fxpad" id="fxPad"><span id="fxHint">${FX[fxKind][1]}</span><i id="fxDot"></i></div>
      <button class="mini accent" id="fxPlay">${player.on ? '止める' : '再生してためす'}</button></section>`;
  box.querySelectorAll('.mixch input[data-p]').forEach((inp) => {
    const set = (v) => { const t = song.tracks[+inp.dataset.p]; t.pan = Math.abs(v) < 0.05 ? 0 : v; inp.value = t.pan; if (player.graph && player.graph.pans[t.id]) player.graph.pans[t.id].pan.setTargetAtTime(t.pan, actx.currentTime, 0.02); };
    inp.oninput = () => set(+inp.value);
    inp.onpointerdown = inp.onfocus = () => { inp._snap = snapshot(); };
    inp.onchange = () => { if (inp._snap && snapshot() !== inp._snap) pushUndo(inp._snap, '左右の位置'); inp._snap = snapshot(); autosaveSoon(); };
    inp.ondblclick = () => { const sn = snapshot(); set(0); if (snapshot() !== sn) pushUndo(sn, '左右の位置'); autosaveSoon(); };
  });
  box.querySelectorAll('.mixch input[data-i]').forEach((inp) => {
    inp.oninput = () => { const t = song.tracks[+inp.dataset.i]; t.vol = +inp.value; liveVolume(t); };
    inp.onpointerdown = inp.onfocus = () => { inp._snap = snapshot(); };
    inp.onchange = () => { if (inp._snap && snapshot() !== inp._snap) pushUndo(inp._snap, '音量'); inp._snap = snapshot(); renderTracks(); autosaveSoon(); };
  });
  $('#mMaster').oninput = (e) => { song.master = +e.target.value; if (player.graph) player.graph.out.gain.value = song.master; };
  $('#mMaster').onchange = () => autosaveSoon();
  box.querySelectorAll('[data-eq]').forEach((inp) => (inp.oninput = () => {
    song.eq[inp.dataset.eq] = +inp.value;
    if (player.graph) { player.graph.eqL.gain.value = song.eq.low; player.graph.eqM.gain.value = song.eq.mid; player.graph.eqH.gain.value = song.eq.high; }
  }));
  $('#eqReset').onclick = () => { song.eq = { low: 0, mid: 0, high: 0 }; if (player.graph) { player.graph.eqL.gain.value = 0; player.graph.eqM.gain.value = 0; player.graph.eqH.gain.value = 0; } openPalette(); };
  $('#mRev').oninput = (e) => { song.reverb = +e.target.value; const pg = player.graph; if (pg) { pg.wet.gain.value = song.reverb * 0.6; if (song.reverb > 0 && !pg._revOn) { pg.send.connect(pg.rev); pg._revOn = true; } } };
  $('#mKind').onchange = (e) => { song.metro.kind = e.target.value; const ctx = ensureAudio(); Sound.click(ctx, previewOut, ctx.currentTime + 0.01, true, song.metro.kind); };
  $('#mVol').oninput = (e) => { song.metro.vol = +e.target.value; if (player.graph) player.graph.metro.gain.value = song.metro.vol; };
  $('#fxPlay').onclick = () => { player.on ? stop() : play(); $('#fxPlay').textContent = player.on ? '止める' : '再生してためす'; };
  box.querySelectorAll('[data-fx]').forEach((b) => (b.onclick = () => { fxKind = b.dataset.fx; openPalette(); }));
  const pad = $('#fxPad');
  let active = false;
  const apply = (e) => {
    const r = pad.getBoundingClientRect();
    const x = clamp((e.clientX - r.left) / r.width, 0, 1);
    const y = clamp(1 - (e.clientY - r.top) / r.height, 0, 1);
    $('#fxDot').style.left = x * 100 + '%';
    $('#fxDot').style.top = (1 - y) * 100 + '%';
    fxApply(fxKind, x, y, true);
  };
  pad.onpointerdown = (e) => { if (!player.on) { toast('再生中に押してみよう'); return; } active = true; pad.setPointerCapture(e.pointerId); pad.classList.add('on'); apply(e); };
  pad.onpointermove = (e) => { if (active) apply(e); };
  pad.onpointerup = pad.onpointercancel = () => { if (!active) return; active = false; pad.classList.remove('on'); fxApply(fxKind, 0, 0, false); };
  if (!$('#dlgPal').open) $('#dlgPal').showModal();
}
// ディレイ・リバーブのエフェクトは、使うときだけつなぐ（使っていないときはつながず、計算させない）
function fxLink(B, which, on) {
  const L = B._fxL || (B._fxL = {});
  if (!!L[which] === on) return;
  L[which] = on;
  const dst = which === 'delay' ? B.dIn : B.fxRevIn;
  try { if (on) B.crush.connect(dst); else B.crush.disconnect(dst); } catch (e) { /* もうはずれている */ }
}
function fxApply(kind, x, y, on, gph) {
  const g = gph || player.graph;
  if (!g) return;
  const B = g.base || g;
  if (B.crush) {
    clearTimeout(B._fxOff);
    if (on && (kind === 'delay' || kind === 'reverb')) fxLink(B, kind, true);
    // はなしたら、こだま・響きが消えるのを待ってからはずす
    if (!on) B._fxOff = setTimeout(() => { fxLink(B, 'delay', false); fxLink(B, 'reverb', false); }, 6000);
  }
  const now = actx.currentTime;
  const tc = 0.02;
  if (!on) {
    g.lp.frequency.setTargetAtTime(22000, now, tc); g.lp.Q.value = 1;
    g.hp.frequency.setTargetAtTime(10, now, tc); g.hp.Q.value = 1;
    g.crush.curve = identityCurve;
    g.dIn.gain.setTargetAtTime(0, now, tc);
    g.fxRevIn.gain.setTargetAtTime(0, now, tc);
    g.stIn.gain.setTargetAtTime(1, now, 0.005); g.stFb.gain.setTargetAtTime(0, now, 0.005); g.stOut.gain.setTargetAtTime(0, now, 0.005);
    g.dry.gain.setTargetAtTime(1, now, 0.005);
    g._stut = false;
    return;
  }
  if (kind === 'lowpass') { g.lp.frequency.setTargetAtTime(150 * Math.pow(100, x), now, tc); g.lp.Q.value = 1 + y * 14; }
  else if (kind === 'highpass') { g.hp.frequency.setTargetAtTime(40 * Math.pow(150, x), now, tc); g.hp.Q.value = 1 + y * 14; }
  else if (kind === 'decimator') g.crush.curve = crushCurve(Math.round(8 - y * 6.5));
  else if (kind === 'delay') { g.dl.delayTime.setTargetAtTime(0.08 + x * 0.6, now, 0.05); g.dFb.gain.value = 0.2 + y * 0.65; g.dIn.gain.setTargetAtTime(0.7, now, tc); }
  else if (kind === 'reverb') g.fxRevIn.gain.setTargetAtTime(0.3 + y * 1.4, now, tc);
  else if (kind === 'stutter') {
    const beat = 60 / bpmAt(0);
    const lens = [beat / 4, beat / 2, beat, beat * 2];
    const len = Math.min(1.9, lens[Math.min(3, Math.floor(x * 4))]);
    if (!g._stut || g._stutLen !== len) {
      g._stut = true;
      g._stutLen = len;
      g.st.delayTime.setValueAtTime(len, now);
      g.stIn.gain.setValueAtTime(0, now);
      g.stFb.gain.setValueAtTime(1, now);
      g.stOut.gain.setValueAtTime(1, now);
      g.dry.gain.setValueAtTime(0, now);
    }
  }
}

/* ============================================================
   履歴・先生用設定
   ============================================================ */
function openHistory() {
  const box = $('#histList');
  const items = undoStack.map((e, i) => `<button class="histrow" data-i="${i}"><span>${i + 1}.</span> ${escapeHtml(e.label)}</button>`);
  box.innerHTML = items.length ? items.join('') + '<div class="histrow now">いまの状態</div>' : '<p class="muted">まだ操作の記録はありません。</p>';
  box.querySelectorAll('.histrow[data-i]').forEach((b) => (b.onclick = () => {
    const i = +b.dataset.i;
    if (!undoStack[i]) return openHistory(); // 一覧が古くなっていたら、書きなおすだけ
    const label = undoStack[i].label;
    while (undoStack.length > i) undo();
    openHistory();
    toast(`「${label}」の前までもどしました（「やり直す」で進めます）`);
  }));
  if (!$('#dlgHist').open) $('#dlgHist').showModal();
  box.scrollTop = box.scrollHeight;
}
async function sha(s) {
  if (!window.crypto || !crypto.subtle) return 'p:' + s;
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('otsumiki:' + s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function openTeacher() {
  if (song.locks.pin) {
    const p = prompt('先生用の暗証番号を入れてください');
    if (p === null) return;
    if ((await sha(p)) !== song.locks.pin) return alert('暗証番号がちがいます');
  }
  const L = song.locks;
  $('#teachBody').innerHTML = `
    <p>ここで決めた設定は曲ファイルや共有URLに入ります。設定したファイルを配ると、児童・生徒は決められた範囲だけ操作できます。</p>
    <h4>使える機能</h4>
    <label class="chk"><input type="checkbox" id="lkRules" ${L.rules ? 'checked' : ''}> 調・拍子・テンポ・音階・小節数を変えられないようにする</label>
    <label class="chk"><input type="checkbox" id="lkTracks" ${L.tracks ? 'checked' : ''}> トラックの追加・複製・削除をできないようにする</label>
    <label class="chk"><input type="checkbox" id="lkMute" ${L.mute ? 'checked' : ''}> 消音・ソロの切りかえをできないようにする</label>
    <label class="chk"><input type="checkbox" id="lkCompose" ${L.compose ? 'checked' : ''}> 「おまかせ作曲」をかくす</label>
    <h4>トラックのロック（ロックしたトラックは見る・聴くだけ）</h4>
    ${song.tracks.map((t, i) => `<label class="chk"><input type="checkbox" class="lkTr" data-i="${i}" ${t.locked ? 'checked' : ''}> ${i + 1}. ${escapeHtml(t.name)}</label>`).join('')}
    <h4>穴あき課題（答えの小節を空けて配る）</h4>
    <div class="taskmk">
      <label>トラック <select id="tkTrack">${song.tracks.map((t, i) => (t.type === 'melody' ? `<option value="${i}" ${i === cur ? 'selected' : ''}>${i + 1}. ${escapeHtml(t.name)}</option>` : '')).join('')}</select></label>
      <label>空ける小節 <input id="tkBars" placeholder="例：3-4, 7" value="${ui.sel && ui.sel.b1 > ui.sel.b0 ? `${ui.sel.b0 + 1}-${ui.sel.b1 + 1}` : ''}" size="12"></label>
      <button class="mini" id="tkMake" type="button">課題ファイルを書き出す</button>
    </div>
    <p class="muted small">えらんだ小節の音を消したファイルを書き出します（いまの曲はそのまま）。生徒がそのファイルを開くと、空いた小節にわくが出て、「答え合わせ」でその小節だけ採点できます。</p>
    <h4>暗証番号</h4>
    <label>この画面を開くための暗証番号（空欄のまま＝${L.pin ? '変えない' : 'なし'}） <input id="lkPin" type="password" autocomplete="new-password"></label>
    ${L.pin ? '<label class="chk"><input type="checkbox" id="lkPinClear"> 暗証番号を消す</label>' : ''}`;
  $('#teachSave').onclick = async () => {
    const pin = $('#lkPin').value;
    const clearPin = $('#lkPinClear') && $('#lkPinClear').checked;
    const newPin = clearPin ? '' : pin ? await sha(pin) : L.pin;
    edit(() => {
      song.locks = { pin: newPin, rules: $('#lkRules').checked, tracks: $('#lkTracks').checked, mute: $('#lkMute').checked, compose: $('#lkCompose').checked };
      $$('.lkTr').forEach((c) => { song.tracks[+c.dataset.i].locked = c.checked; });
    }, '先生用設定');
    renderSettings();
    renderTracks();
    $('#dlgTeach').close();
    toast('先生用設定を保存しました。「ファイル」→「曲ファイルを書き出す」で配れます');
  };
  const mk = $('#tkMake');
  if (mk) mk.onclick = () => {
    const ti = +$('#tkTrack').value;
    const bars = parseBars($('#tkBars').value).filter((b) => b < song.bars);
    if (!song.tracks[ti] || song.tracks[ti].type !== 'melody') return toast('メロディのトラックをえらんでください');
    if (!bars.length) return toast('空ける小節を入れてください（例：3-4, 7）');
    makeTaskFile(ti, bars);
  };
  $('#dlgTeach').showModal();
}
/* ---------- 穴あき課題 ---------- */
const inBars = (bars, t) => bars.some((b) => t >= barStart(b) && t < barStart(b + 1));
function makeTaskFile(ti, bars) {
  const copy = JSON.parse(JSON.stringify(song));
  const tr = copy.tracks[ti];
  const ans = tr.notes.filter((n) => inBars(bars, n.s));
  if (!ans.length) return toast('その小節には音がありません。答えの音を入れてから書き出してください');
  tr.notes = tr.notes.filter((n) => !inBars(bars, n.s));
  copy.task = { tr: ti, bars, ans: btoa(unescape(encodeURIComponent(JSON.stringify(ans)))) };
  copy.title = song.title + '（課題）';
  download(new Blob([JSON.stringify(copy)], { type: 'application/json' }), safeName() + '_課題.soranote.json');
  toast(`課題ファイルを書き出しました（${bars.map((b) => b + 1).join('・')}小節目を空けました）`, 4000);
}
function taskAnswer() {
  try { return JSON.parse(decodeURIComponent(escape(atob(song.task.ans)))); } catch (e) { return []; }
}
function taskLabel() {
  const T = song.task;
  const tr = song.tracks[T.tr];
  // 3,4,5,7 → 3〜5・7
  const out = [];
  for (const b of T.bars) { const last = out[out.length - 1]; if (last && last[1] === b - 1) last[1] = b; else out.push([b, b]); }
  return `「${tr ? tr.name : ''}」の ${out.map(([a, z]) => (a === z ? a + 1 : `${a + 1}〜${z + 1}`)).join('・')}小節目`;
}
function updateTaskBar() {
  let bar = $('#taskBar');
  const T = song.task;
  if (!T || !song.tracks[T.tr]) { if (bar) bar.remove(); return; }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'taskBar';
    bar.className = 'cmpbar taskbar';
    bar.setAttribute('role', 'status');
    $('#cmpBar').before(bar);
  }
  bar.innerHTML = `<span>📝 課題：${escapeHtml(taskLabel())}を作ろう（点線のわくの中）</span><button class="mini primary" id="taskCheck">答え合わせ</button>`;
  $('#taskCheck').onclick = () => {
    // お手本＝いまの曲に答えを入れたもの（空けた小節だけでくらべる）
    const ref = JSON.parse(JSON.stringify(song));
    const rt = ref.tracks[T.tr];
    rt.notes = rt.notes.filter((n) => !inBars(T.bars, n.s)).concat(taskAnswer());
    ref._taskBars = T.bars;
    refSong = ref;
    if (cur !== T.tr) { cur = T.tr; renderTracks(); }
    updateCompare();
    draw();
    const c = compareTrack(T.tr);
    if (c && c.total && c.ok === c.total && !c.wrong.size) { toast('ぜんぶ正解！ 🎉', 3500); cheer(true); }
  };
}
function taskMarks(g2, X, rh, sy, rows) {
  const T = song.task;
  g2.save();
  g2.setLineDash([6, 4]);
  g2.lineWidth = 2;
  g2.strokeStyle = C('--accent');
  g2.fillStyle = C('--accent');
  g2.font = 'bold 12px sans-serif';
  for (const b of T.bars) {
    const x0 = X(barStart(b));
    const x1 = X(barStart(b + 1));
    roundRect(g2, x0 + 3, RH + 3, x1 - x0 - 6, Math.max(20, rows * rh - sy) - 6, 8);
    g2.stroke();
    g2.fillText('ここを作ろう', x0 + 10, RH + 18);
  }
  g2.restore();
}

/* ============================================================
   楽譜
   ============================================================ */
function scoreSettings() {
  if (!song.score) song.score = {};
  return Object.assign(song.score, { subtitle: '', lyricist: '', composer: '', perLine: 0, scale: 1, solfa: 'none', finger: '', drums: false, clefs: {}, accompStyle: 'grand', paper: 'auto', size: 'auto', ...song.score });
}
// 「3,5-6」→ [2, 4, 5]（小節番号は1から）
function parseBars(txt) {
  const out = new Set();
  for (const part of String(txt || '').replace(/[－]/g, '-').split(/[,、\s]+/)) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) continue;
    const a = +m[1];
    const z = m[2] ? +m[2] : a;
    for (let b = Math.min(a, z); b <= Math.min(Math.max(a, z), MAX_BARS); b++) out.add(b - 1 + (song.pickup ? 1 : 0));
  }
  return [...out];
}
// 楽譜での音部記号と移調（書く音＝鳴る音＋trans）。オーケストラの書き方では楽器に合わせる（自分で決めたときはそれ）
const GRAND_INST = new Set(['piano', 'epiano', 'epiano2', 'clavinet', 'harpsichord', 'organ', 'pipeorgan', 'harp', 'celesta']);
function partClefTrans(t) {
  const S = scoreSettings();
  const oi = ORCH[t.inst];
  let clef = (S.clefs || {})[t.id] || 'auto';
  if (clef === 'auto' && t.clef) clef = t.clef; // 読みこんだ楽譜の音部記号
  let trans = +(S.trans || {})[t.id] || 0;
  // ギターは「ト音記号の8つ下」がふつう
  if (clef === 'auto' && TAB_INST[t.inst] === 'guitar') clef = 'treble8';
  // ピアノなど鍵盤の楽器で、高い音と低い音の両方をたくさん使うときは、大譜表（上下2段）にする
  if (clef === 'auto' && GRAND_INST.has(t.inst) && Array.isArray(t.notes) && t.notes.length >= 4) {
    const lo = t.notes.filter((n) => n.p < 57).length;
    const hi = t.notes.filter((n) => n.p >= 64).length;
    if (lo >= Math.max(2, t.notes.length * 0.15) && hi >= Math.max(2, t.notes.length * 0.15)) clef = 'grand';
  }
  const own = (S.trans || {})[t.id] != null; // 自分で決めた移調
  if (S.orch && oi) {
    if (clef === 'auto' && oi[3]) clef = oi[3];
    if (!own && oi[2]) trans = S.concert && Math.abs(oi[2]) % 12 ? 0 : oi[2];
  }
  // 移調楽器（クラリネット・サックス・ホルン・トランペット）は、フルスコアの書き方でなくても、その楽器の調で書く
  // （オクターブだけちがう楽器＝ピッコロ・コントラバスなどは、フルスコアの書き方のときだけ）
  if (!S.orch && oi && !own && oi[2] && Math.abs(oi[2]) % 12 && !S.concert) trans = oi[2];
  // 読みこんだ楽譜の移調（in A のクラリネットなど）は、楽器の決まりより先。パートの数にかかわらず
  if (!own && Number.isInteger(t.trans) && t.trans && (S.orch || Math.abs(t.trans) % 12)) trans = S.concert && Math.abs(t.trans) % 12 ? 0 : t.trans;
  return { clef, trans };
}
function scoreOpts(trackIds, withDrums) {
  const S = scoreSettings();
  if (!S.trans) S.trans = {};
  const parts = [];
  const partTracks = [];
  for (const t of song.tracks) {
    if (!trackIds.includes(t.id)) continue;
    if (t.type === 'melody') {
      const oi = ORCH[t.inst];
      const { clef, trans } = partClefTrans(t);
      parts.push({ id: t.id, name: t.name, range: t.rng === 0 ? null : t.rng || (S.orch ? INST_RANGE[t.inst] || null : null), short: t.short || (oi ? oi[1] + (/(Ⅰ|Ⅱ|Ⅲ|Ⅳ|[1-4１-４])\s*$/.exec(t.name) || [''])[0] : ''), family: S.orch ? (oi ? oi[0] : 'kb') : '', inst: t.inst, notes: t.notes, clef, transpose: trans, lyrics: t.notes.some((n) => n.ly) ? [] : Notation.splitLyrics(t.lyrics || ''), dyn: t.dyn && t.dyn.some((d) => d.h) ? t.dyn.filter((d) => !d.h) : t.dyn, hairpins: t.hairpins, slurs: t.slurs, texts: t.instChg && t.instChg.some((c) => !c.q) ? [...(t.texts || []).filter((x) => !t.instChg.some((c) => !c.q && c.t === x.t)), ...t.instChg.filter((c) => !c.q).map((c) => { const own = (t.texts || []).find((x) => x.t === c.t); return { t: c.t, x: (Sound.INSTRUMENTS[c.inst] || c.inst) + ' に持ちかえ' + (own ? '　' + own.x : '') }; })].sort((a, b) => a.t - b.t) : t.texts, pedals: t.pedals, ottava: t.ottava, trills: t.trills, vgap: t.vgap, clefChg: t.clefChg, mrep: t.mrep, tab: TAB_INST[t.inst] ? (S.tab || {})[t.id] || '' : '', tabTuning: TAB_INST[t.inst], gm: Sound.GM[t.inst] || 0 });
      partTracks.push(t);
    } else if (t.type === 'drum' && withDrums) {
      const notes = [];
      const starts = new Set();
      for (const id in t.grid) for (const st in t.grid[id]) starts.add(+st);
      const ts = [...starts].sort((a, b) => a - b);
      const nextOf = new Map(ts.map((st, i) => [st, i + 1 < ts.length ? ts[i + 1] : st + beatAt(barOf(st))]));
      for (const id in t.grid) for (const st in t.grid[id]) {
        const s0 = +st;
        notes.push({ s: s0, p: 0, l: Math.max(1, Math.min(nextOf.get(s0) - s0, beatAt(barOf(s0)))), id, art: t.grid[id][st] === 2 ? ['acc'] : [] });
      }
      parts.push({ id: t.id, name: t.name, short: t.short || 'Perc.', family: S.orch ? 'perc' : '', perc: true, notes, gm: 0 });
      partTracks.push(t);
    } else if (t.type === 'chord' && S.accomp && t.chords.some(Boolean)) {
      if (S.accompStyle === 'slash') {
        // スラッシュ：拍ごとに「／」、上にコードネーム（ギター・バンドの楽譜）
        const notes = [];
        for (let b = 0; b < song.bars; b++) if (t.chords[b]) for (let q = barStart(b); q < barStart(b + 1); q += beatAt(b)) notes.push({ s: q, p: 71, l: Math.min(beatAt(b), barStart(b + 1) - q) });
        parts.push({ id: t.id, name: t.name, short: 'Ch.', family: S.orch ? 'kb' : '', notes, clef: 'treble', slash: true, gm: Sound.GM[t.inst] || 0 });
        partTracks.push(t);
        continue;
      }
      // コード伴奏を、ピアノの大譜表の楽譜にする
      const notes = chordEvents(t).map((n) => ({ s: n.s, p: n.p, l: Math.max(24, Math.ceil(n.l / 24 - 0.05) * 24) })); // 楽譜ではきりのよい長さに
      parts.push({ id: t.id, name: /伴奏/.test(t.name) ? t.name : t.name + '（伴奏）', short: 'Pf.', family: S.orch ? 'kb' : '', notes, clef: 'grand', gm: Sound.GM[t.inst] || 0 });
      partTracks.push(t);
    }
  }
  // オーケストラの順（木管・金管・打楽器・鍵盤・声・弦、仲間の中は楽器の順）にならべる
  if (S.orch && !S.ordered && parts.length > 1) {
    const rank = (p, i) => [ORCH_ORDER.indexOf(p.family || 'kb'), p.inst && ORCH_INST.includes(p.inst) ? ORCH_INST.indexOf(p.inst) : 99, i];
    const idx = parts.map((p, i) => ({ p, t: partTracks[i], r: rank(p, i) }));
    idx.sort((a, b) => a.r[0] - b.r[0] || a.r[1] - b.r[1] || a.r[2] - b.r[2]);
    parts.splice(0, parts.length, ...idx.map((x) => x.p));
    partTracks.splice(0, partTracks.length, ...idx.map((x) => x.t));
  }
  const chordTr = song.tracks.find((t) => t.type === 'chord' && t.chords.some(Boolean));
  // 楽譜のパートがみな同じ移調楽器（トランペットだけ、など）のときは、コードネームもその楽器の調で書く（MuseScore・パート譜と同じ）
  const pTr = parts.filter((p) => !p.perc).map((p) => p.transpose || 0);
  const chordShift = pTr.length && pTr[0] % 12 && pTr.every((x) => x === pTr[0]) ? pTr[0] : 0;
  const solfa = S.solfa;
  const nameOf = solfa === 'none' ? null : (m) => {
    const pc = ((m % 12) + 12) % 12;
    if (solfa === 'movable') return NAMES.doremi[ui.flat ? 1 : 0][(pc - song.key + 12) % 12];
    return NAMES[solfa][ui.flat ? 1 : 0][pc];
  };
  return {
    parts, partTracks, bars: song.bars, barTicks: barTicks(), meter: song.meter, key: song.key, minor: isMinor(),
    geo: { starts: geo().starts, meters: geo().meters, keys: geo().keys }, jumps: song.jumps || {},
    title: song.title, bpm: song.bpm, tempoText: song.tempoText,
    tempos: (() => { const t = { ...song.tempos }; for (const b in song.ramps || {}) for (let i = 0; i < song.ramps[b].n; i++) delete t[+b + i]; for (const b in song.tempoHid || {}) delete t[b]; return t; })(),
    words: { ...(song.tempoWords || {}), ...Object.fromEntries(Object.entries(song.ramps || {}).map(([b, r]) => [b, r.type === 'rit' ? 'rit.' : 'accel.'])) },
    soundTempos: { ...song.tempos },
    drumGm: Object.fromEntries(Object.entries(Sound.DRUMS).map(([k, v]) => [k, v.gm])),
    meta: { subtitle: S.subtitle, lyricist: S.lyricist, composer: S.composer, nameLine: !!S.nameLine },
    finger: S.finger || '',
    blankBars: parseBars(S.blank),
    ...chordOptsFor(chordTr, chordShift), chordShift,
    diagrams: !!(S.diagrams && chordTr), chordShape: typeof guitarShape === 'function' ? guitarShape : null,
    nameOf, perLine: +S.perLine || 0, scale: +S.scale, width: 780, spacing: +S.spacing || 1, breaks: Array.isArray(S.breaks) ? S.breaks : [],
    pickup: song.pickup, repeats: song.repeats, rehearsal: song.rehearsal || null,
  };
}
// 楽譜に書くコードネーム。shift＝移調楽器のパート譜で、その楽器の調に合わせて上げる半音の数（in B♭ なら 2）
function chordOptsFor(chordTr, shift) {
  if (!chordTr) return { chords: null, chordObjs: null };
  const sh = ((shift % 12) + 12) % 12;
  const mv = (c) => (c && sh ? { ...c, r: (c.r + sh) % 12, ...(c.h ? { h: { ...c.h, r: (c.h.r + sh) % 12 } } : {}), ...(Array.isArray(c.x) ? { x: c.x.map((x) => (x && Number.isInteger(x.r) ? { ...x, r: (x.r + sh) % 12 } : x)) } : {}) } : c);
  return {
    chords: Array.from({ length: song.bars }, (_, b) => chordLabel(mv(chordTr.chords[b]))),
    chordObjs: Array.from({ length: song.bars }, (_, b) => { const c = mv(chordTr.chords[b]); if (!c) return null; const segs = chordSegs(c, b).map((x) => ({ o: x.o, r: x.c.r, q: x.c.q, name: chordName(x.c) })); return { ...c, segs, ...(c.h && !c.x ? { hAt: chordHalf(b) } : {}) }; }),
  };
}
// 歌詞の文字列を、音の始まりごとに1つずつ入れる
//   v：何番の歌詞か（1〜3）。2番・3番は、1番の下の行に書く
const lyKey = (v) => (v > 1 ? 'ly' + v : 'ly');
function assignLyrics(tr, text, v = 1) {
  const syl = Notation.splitLyrics(text || '');
  const starts = [...new Set(tr.notes.map((n) => n.s))].sort((a, b) => a - b);
  const k = lyKey(v);
  for (const n of tr.notes) delete n[k];
  starts.forEach((st, i) => {
    if (!syl[i]) return;
    const top = tr.notes.filter((n) => n.s === st).sort((a, b) => b.p - a.p)[0];
    top[k] = syl[i];
  });
  if (v === 1) tr.lyrics = text;
}
// 音についている歌詞を、まとめて入れる欄の書き方にもどす
function lyricsText(tr, v) { const k = lyKey(v); return tr.notes.filter((n) => n[k]).sort((a, b) => a.s - b.s).map((n) => (n[k].length > 1 && !/^[A-Za-z]/.test(n[k]) ? '(' + n[k] + ')' : n[k])).join(' '); }
// MuseScore（.mscz）で書き出す
function exportMscz() {
  const o = scoreOpts([...(scoreSel || new Set(song.tracks.filter((t) => t.type === 'melody').map((t) => t.id)))], true);
  if (o.chordShift) Object.assign(o, chordOptsFor(song.tracks.find((t) => t.type === 'chord' && t.chords.some(Boolean)), 0)); // 書き出しは実音のコード（書き出す側で移調する）
  o.chords = o.chordObjs;
  o.parts = o.parts.filter((p) => !p.slash); // スラッシュはコードネームだけ（音は書き出さない）
  o.parts = o.parts.flatMap((p) => (p.clef === 'grand' ? [
    { ...p, name: p.name.replace('（伴奏）', '') + '（右手）', clef: 'treble', notes: p.notes.filter((n) => n.p >= 60) },
    { ...p, id: p.id + '-L', name: p.name.replace('（伴奏）', '') + '（左手）', clef: 'bass', notes: p.notes.filter((n) => n.p < 60) },
  ] : [p]));
  const enc = new TextEncoder();
  const xml = MuseScoreExport.mscx(o);
  const cont = '<?xml version="1.0" encoding="UTF-8"?>\n<container>\n<rootfiles>\n<rootfile full-path="score.mscx"></rootfile>\n</rootfiles>\n</container>\n';
  download(makeZip([{ name: 'META-INF/container.xml', data: enc.encode(cont) }, { name: 'score.mscx', data: enc.encode(xml) }]), safeName() + '.mscz');
  toast('MuseScore のファイル（.mscz）を書き出しました');
}
// 2つのパートを1段にまとめる（印刷の画面だけ）：「1つ上のパートと1段に」にしたパートは、上のパートの声部2として書く
function combineParts(o) {
  const S = scoreSettings();
  const cb = S.combine || {};
  const out = [];
  const outT = [];
  o.parts.forEach((p, i) => {
    const prev = out[out.length - 1];
    if (cb[p.id] && prev && !prev.perc && !p.perc && prev.clef !== 'grand' && !prev._comb) {
      const nm = (a, z) => { const m = /^(.*?)\s*(Ⅰ|Ⅱ|Ⅲ|1|2|3|１|２|３)$/.exec(a); const m2 = /^(.*?)\s*(Ⅰ|Ⅱ|Ⅲ|1|2|3|１|２|３)$/.exec(z); return m && m2 && m[1] === m2[1] ? `${m[1]} ${m[2]}・${m2[2]}` : `${a}・${z}`; };
      out[out.length - 1] = { ...prev, _comb: true, name: nm(prev.name, p.name), short: prev.short, notes: prev.notes.filter((n) => n.v !== 2).concat(p.notes.map((n) => ({ ...n, v: 2 }))), slurs: (prev.slurs || []).concat((p.slurs || []).map((x) => ({ ...x, v: 2 }))) };
      return;
    }
    out.push(p);
    outT.push(o.partTracks[i]);
  });
  o.parts = out;
  o.partTracks = outT;
  return o;
}
// 印刷の用紙（よはく 12mm）
const PAPERS = { a4: { n: 'A4', w: 210, h: 297, css: 'A4' }, a4l: { n: 'A4よこ', w: 297, h: 210, css: 'A4 landscape' }, b4: { n: 'B4', w: 257, h: 364, css: 'B4' }, a3: { n: 'A3', w: 297, h: 420, css: 'A3' } };
let printPaper = PAPERS.a4; // いま組んでいる楽譜の用紙
let printFit = null; // { paper, mm }：自動で決めた五線の大きさ（画面に出す）
const pageRatio = (P) => (P.h - 24) / (P.w - 24);
// 五線の高さ（mm）：楽譜のはば（OUTW/scale）が、紙のはば（よはくの内がわ）になる
const staffMmOf = (o, P) => (32 * (+o.scale || 1) * (P.w - 24)) / (o.width || 780);
// 1段がページに入る、いちばん大きな五線の大きさ（scale）。段の高さ（楽譜の単位）は、五線の大きさではほとんど変わらないので、1回組んだ地図から計算できる
function fitScaleOf(L, OUTW, P, scaleNow) {
  if (!L || !L.systems.length) return scaleNow;
  const top0 = L.systems[0].y0;
  let need = 0;
  L.systems.forEach((sy, i) => { need = Math.max(need, (sy.y1 - sy.y0) + 34 + (i === 0 ? top0 : 46)); });
  // ページの高さ（単位）＝ (OUTW/scale)・比 ≧ need → scale ≦ OUTW・比 / need
  return (OUTW * pageRatio(P)) / need;
}
function fitToPaper(o, P, targetMm, L0) {
  const OUTW = o.width || 780;
  o.pageRatio = pageRatio(P);
  const want = targetMm ? (targetMm * OUTW) / (32 * (P.w - 24)) : +o.scale || 1;
  let scale = Math.min(want, L0 ? fitScaleOf(L0, OUTW, P, want) * 0.99 : want);
  let svg = '';
  for (let it = 0; it < 3; it++) {
    o.scale = scale;
    svg = Notation.render(o);
    const f = fitScaleOf(Notation.lastLayout, OUTW, P, scale);
    if (scale <= f * 1.0005) break;
    scale = f * 0.99; // 段の組み方が変わって、少しはみ出した：もう一度
  }
  return { svg, mm: staffMmOf(o, P), scale };
}
function scoreSvg(trackIds) {
  const o = combineParts(scoreOpts(trackIds, true));
  const S0 = scoreSettings();
  o.hideEmpty = !!S0.orch && S0.hideEmpty !== false; // フルスコアは、休んでいる段をかくす（2段目から）
  o.fillPage = !!S0.orch; // 1ページに1段のときは、五線の間を広げて下までそろえる
  o.tight = !!S0.orch && o.parts.length > 4; // フルスコアは、五線のあいだをつめて、五線を大きく
  if (o.tight) o.spacing = (+o.spacing || 1) * 1.5; // フルスコアは、小節をゆったり（1段の小節数が多くなりすぎないように）
  const auto = !S0.size || S0.size === 'auto';
  const big = !!S0.orch && o.parts.length > 8;
  // 用紙：自動のときは A4。大きなオーケストラで五線が小さくなりすぎる（3mm未満）なら、B4・A3 に
  const papers = S0.paper && PAPERS[S0.paper] ? [PAPERS[S0.paper]] : big ? [PAPERS.a4, PAPERS.b4, PAPERS.a3] : [PAPERS.a4];
  // 五線の大きさのめやす：ふつうの楽譜 7mm、フルスコア 6mm（入らなければ、入るだけ小さく）
  const target = auto ? (big ? 6 : 7) : null;
  if (!auto) o.scale = +S0.size || 1;
  // まず1回組んで段の高さを見て、どの用紙なら五線が 3mm 以上になるかを計算で決める（何度も組みなおさない）
  let L0 = null;
  let P = papers[0];
  if (papers.length > 1 || auto) {
    o.scale = (target * (o.width || 780)) / (32 * (papers[0].w - 24)) || 1;
    o.pageRatio = pageRatio(papers[0]);
    Notation.render(o);
    L0 = Notation.lastLayout;
    for (const Q of papers) {
      P = Q;
      const mm = (32 * Math.min((target * (o.width || 780)) / (32 * (Q.w - 24)), fitScaleOf(L0, o.width || 780, Q, 1)) * (Q.w - 24)) / (o.width || 780);
      if (mm >= 3) break;
    }
  }
  const r = fitToPaper(o, P, target, L0);
  printPaper = P;
  printFit = { paper: printPaper.n, mm: r ? r.mm : 0 };
  return r ? r.svg : Notation.render(o);
}
let scoreSel = null;
let scoreFull = '';
let scorePages = [];
function openScore() {
  const mel = song.tracks.filter((t) => t.type === 'melody' || t.type === 'drum' || (t.type === 'chord' && t.chords.some(Boolean)));
  if (!mel.some((t) => t.type === 'melody')) return alert('楽譜にできるメロディのトラックがありません');
  const S = scoreSettings();
  if (!S.trans) S.trans = {};
  // えらんであるパートを、今の曲に合わせる（曲を開きなおしたあと、からっぽにならないように）
  if (scoreSel) for (const id of [...scoreSel]) if (!song.tracks.some((t) => t.id === id)) scoreSel.delete(id);
  if (!scoreSel || !scoreSel.size) {
    scoreSel = new Set(song.tracks.filter((t) => t.type === 'melody' && t.notes.length).map((t) => t.id));
    if (!scoreSel.size) scoreSel = new Set(song.tracks.filter((t) => t.type === 'melody').slice(0, 1).map((t) => t.id));
  }
  const bt = barTicks();
  const pickOpts = [[0, 'なし']];
  for (let t = 24; t < bt; t += 24) pickOpts.push([t, `${t / 48}拍ぶん`.replace('0.5拍', '8分音符1つ').replace('.5拍', '拍半')]);
  const side = $('#scoreSide');
  side.innerHTML = `
    <h4>曲の情報</h4>
    <label>曲名 <input data-k="title" value="${escapeHtml(song.title)}"></label>
    <label>サブタイトル <input data-s="subtitle" value="${escapeHtml(S.subtitle)}" placeholder="（なくてもよい）"></label>
    <label>作詞 <input data-s="lyricist" value="${escapeHtml(S.lyricist)}"></label>
    <label>作曲 <input data-s="composer" value="${escapeHtml(S.composer)}"></label>
    <label>速さのことば <input data-k="tempoText" value="${escapeHtml(song.tempoText || '')}" placeholder="れい：Moderato／やさしく"></label>
    <label title="1小節目を、はじめの休みをのぞいた短い小節（アウフタクト）として書きます">弱起（アウフタクト） <select data-k="pickup">${pickOpts.map(([v, t]) => `<option value="${v}" ${song.pickup === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <h4>見た目</h4>
    <label>リコーダーの指づかい <select data-s="finger"><option value="">書かない</option><option value="baroque">ソプラノ（バロック式）</option><option value="german">ソプラノ（ジャーマン式）</option></select></label>
    <label>音符の下に <select data-s="solfa"><option value="none">何も書かない</option><option value="doremi">ドレミ（音名）</option><option value="movable">ドレミ（階名・移動ド）</option><option value="cde">CDE</option><option value="haniho">ハニホ</option></select></label>
    <label>1段の小節数 <select data-s="perLine"><option value="0">自動</option>${[1, 2, 3, 4, 5, 6].map((n) => `<option value="${n}">${n}小節</option>`).join('')}</select></label>
    <label>画面の大きさ <select data-s="scale"><option value="0.8">小さい</option><option value="1">ふつう</option><option value="1.25">大きい</option><option value="1.5">とても大きい</option></select></label>
    <h4>印刷</h4>
    <label title="自動：ふつうは A4。大きなオーケストラで五線が小さくなりすぎるときは B4・A3">用紙 <select data-s="paper"><option value="auto">自動</option><option value="a4">A4（たて）</option><option value="a4l">A4（よこ）</option><option value="b4">B4（たて）</option><option value="a3">A3（たて）</option></select></label>
    <label title="自動：1段がページに入る、いちばん大きな五線（ふつう 7mm、フルスコア 6mm まで）">五線の大きさ <select data-s="size"><option value="auto">自動（用紙に合わせる）</option><option value="0.7">小さい</option><option value="0.85">やや小さい</option><option value="1">ふつう</option><option value="1.2">大きい</option></select></label>
    <small class="muted" id="scFitInfo"></small>
    <label class="chk"><input type="checkbox" data-c="accomp" ${S.accomp ? 'checked' : ''}> コード伴奏の楽譜も書く</label>
    <label>コード伴奏の書き方 <select data-s="accompStyle"><option value="grand">ピアノの楽譜（大譜表）</option><option value="slash">スラッシュ（コードネームと拍の ／）</option></select></label>
    <label class="chk" title="木管・金管・打楽器・弦の順にならべて、仲間ごとにかっこでくくります。クラリネット（in B♭）・ホルン（in F）などは移調して、ビオラはハ音記号で書きます"><input type="checkbox" data-c="orch" ${S.orch ? 'checked' : ''}> オーケストラ・吹奏楽の書き方（フルスコア）</label>
    <label class="chk" title="2段目からは、その段でずっと休んでいるパートの五線を書きません（ページがへります）"><input type="checkbox" data-c="hideEmpty" ${S.hideEmpty !== false ? 'checked' : ''} ${S.orch ? '' : 'disabled'}> 休んでいるパートの段をかくす</label>
    <label class="chk" title="移調楽器も、じっさいに鳴る音の高さで書きます（指揮者・作曲の確認用）"><input type="checkbox" data-c="concert" ${S.concert ? 'checked' : ''}> 実音で書く（コンサートピッチ）</label>
    <h4>プリント（学習用）</h4>
    <label class="chk"><input type="checkbox" data-c="nameLine" ${S.nameLine ? 'checked' : ''}> 名前を書くらん（年・組・番・名前）</label>
    <label class="srow">穴うめにする小節 <input type="text" data-k="blank" value="${escapeHtml(S.blank || '')}" placeholder="れい：3,5-6" inputmode="numeric" style="width:9em"></label>
    <small class="muted">えらんだ小節の音符を書かずに、五線だけにします（聴き取り・書きこみ用）</small>
    <h4>パート</h4>
    ${mel.map((t) => `<div class="scorepart">
      <label class="chk"><input type="checkbox" class="spart" value="${t.id}" ${scoreSel.has(t.id) ? 'checked' : ''}> ${I(TYPE_ICON[t.type])} ${escapeHtml(t.name)}</label>
      ${t.type === 'melody' && mel.indexOf(t) > 0 && mel[mel.indexOf(t) - 1].type === 'melody' ? `<label class="chk" title="フルート1・2のように、1つ上のパートと同じ五線に書きます（上のパートはぼう上、このパートはぼう下）"><input type="checkbox" class="scomb" data-id="${t.id}" ${(S.combine || {})[t.id] ? 'checked' : ''}> 1つ上のパートと1段にまとめる</label>` : ''}
      ${t.type === 'melody' && TAB_INST[t.inst] ? `<label title="ギター・ウクレレ・ベースの、弦とフレットの数字の楽譜">TAB譜 <select class="stab" data-id="${t.id}"><option value="">なし</option><option value="both">五線＋TAB</option><option value="only">TABだけ</option></select></label>` : ''}
      ${t.type === 'melody' ? `<label>音部記号 <select class="sclef" data-id="${t.id}"><option value="auto">自動</option><option value="treble">ト音記号</option><option value="treble8">ト音記号（8つ下・テノール）</option><option value="alto">ハ音記号（アルト・ビオラ）</option><option value="bass">ヘ音記号</option><option value="grand">大譜表（ピアノ）</option></select></label>
      <label title="クラリネットやトランペットなど、楽譜の音と実際の音がちがう楽器用">移調楽器 <select class="strans" data-id="${t.id}"><option value="auto">自動</option><option value="0">なし（C・実音）</option><option value="2">in B♭（クラリネット・トランペット）</option><option value="9">in E♭（アルトサックス）</option><option value="7">in F（ホルン）</option><option value="14">in B♭（テナーサックス）</option></select></label>
      <label class="col">歌詞をまとめて入れる <small>1音に1文字ずつ（「きゃ」「っ」は前の字といっしょ。スペースは見やすくするだけ。2文字以上を1音にするときは（ ）。英語は単語ごと）。英語は「Hap-py」のようにハイフンで音節を分けられます。1音ずつ打つときは「楽譜で編集」で音符をえらんで L キー（スペースでつぎの音へ）。</small><textarea class="slyr" data-id="${t.id}" data-v="1" rows="2" placeholder="れい：さいたさいたチューリップのはなが">${escapeHtml(t.lyrics || lyricsText(t, 1))}</textarea></label>
      <label class="col">2番の歌詞 <small>1番の下の行に書きます</small><textarea class="slyr" data-id="${t.id}" data-v="2" rows="1" placeholder="（2番があれば）">${escapeHtml(lyricsText(t, 2))}</textarea></label>
      <label class="col"${t.notes.some((n) => n.ly2 || n.ly3) ? '' : ' hidden'} data-ly3="${t.id}">3番の歌詞<textarea class="slyr" data-id="${t.id}" data-v="3" rows="1" placeholder="（3番があれば）">${escapeHtml(lyricsText(t, 3))}</textarea></label>` : t.type === 'chord' ? '<small class="muted">上の「コード伴奏をピアノの楽譜にする」をオンにすると出ます</small>' : ''}
    </div>`).join('')}
    <p class="muted">くり返し記号・1番/2番かっこ・強弱記号などは「楽譜で編集」で入れられます。</p>`;
  side.querySelectorAll('[data-s]').forEach((el) => { el.value = String(S[el.dataset.s]); });
  side.querySelectorAll('.sclef').forEach((el) => { el.value = S.clefs[el.dataset.id] || 'auto'; });
  side.querySelectorAll('.strans').forEach((el) => { el.value = S.trans[el.dataset.id] == null ? 'auto' : String(S.trans[el.dataset.id]); if (!el.value) el.value = 'auto'; });
  const upd = () => {
    const ids = [...scoreSel];
    if (!ids.length) { scoreFull = ''; scorePages = []; $('#scoreView').innerHTML = '<p class="muted" style="padding:12px">パートを選んでください</p>'; return; }
    const big = song.bars * ids.length > 2400;
    const build = () => {
      scoreFull = scoreSvg(ids);
      // 印刷するときと同じ、A4 のページに分けて見せる（とても長い曲は、はじめの数ページだけ見せる。印刷には全部出る）
      scorePages = Notation.paginate(scoreFull, Notation.lastLayout, pageRatio(printPaper));
      const fi = $('#scFitInfo');
      if (fi && printFit) fi.textContent = `${printFit.paper}・五線の高さ ${printFit.mm.toFixed(1)}mm・${scorePages.length || 1}ページ`;
      const SHOW = 4;
      const more = scorePages.length > SHOW ? `<p class="muted scmore">全${scorePages.length}ページ。ここでは、はじめの${SHOW}ページだけを見せています（印刷・PDF・画像には全部出ます）</p>` : '';
      $('#scoreView').innerHTML = scorePages.length > 1 ? scorePages.slice(0, SHOW).map((pg) => `<div class="pagebox">${pg}</div>`).join('') + more : scoreFull;
    };
    if (!big) return build();
    // 大きな曲は時間がかかるので、先に「作っています」を出してから作る
    $('#scoreView').innerHTML = '<p class="muted" style="padding:12px">楽譜を作っています…（大きな曲なので、少し時間がかかります）</p>';
    clearTimeout(upd.timer);
    upd.timer = setTimeout(build, 30);
  };
  side.querySelectorAll('[data-s]').forEach((el) => {
    el.oninput = () => { S[el.dataset.s] = el.value; upd(); };
    el.onchange = () => { autosaveSoon(); if (ui.showScore) renderScorePanel(); if (ui.view === 'score') renderScoreEdit(); };
  });
  side.querySelector('[data-c="hideEmpty"]').onchange = (e) => { S.hideEmpty = e.target.checked; upd(); autosaveSoon(); };
  side.querySelector('[data-c="orch"]').onchange = (e) => { S.orch = e.target.checked; side.querySelector('[data-c="hideEmpty"]').disabled = !S.orch; upd(); autosaveSoon(); if (ui.view === 'score') renderScoreEdit(); };
  side.querySelector('[data-c="concert"]').onchange = (e) => { S.concert = e.target.checked; upd(); autosaveSoon(); if (ui.view === 'score') renderScoreEdit(); };
  side.querySelector('[data-c="nameLine"]').onchange = (e) => { S.nameLine = e.target.checked; upd(); autosaveSoon(); };
  side.querySelector('[data-k="blank"]').onchange = (e) => { S.blank = e.target.value.replace(/[^0-9,\-－、 ]/g, '').slice(0, 60); upd(); autosaveSoon(); };
  side.querySelector('[data-c="accomp"]').onchange = (e) => { S.accomp = e.target.checked; const ct = song.tracks.find((t) => t.type === 'chord'); if (ct && S.accomp) scoreSel.add(ct.id); upd(); autosaveSoon(); };
  side.querySelector('[data-k="title"]').onchange = (e) => { edit(() => { song.title = e.target.value || song.title; }, '曲名'); renderSettings(); upd(); };
  side.querySelector('[data-k="tempoText"]').onchange = (e) => { edit(() => { song.tempoText = e.target.value.slice(0, 30); }, '速さのことば'); upd(); };
  side.querySelector('[data-k="pickup"]').onchange = (e) => { edit(() => { song.pickup = +e.target.value; }, '弱起'); upd(); };
  side.querySelectorAll('.spart').forEach((c) => (c.onchange = () => { c.checked ? scoreSel.add(c.value) : scoreSel.delete(c.value); upd(); }));
  side.querySelectorAll('.stab').forEach((el) => { el.value = (S.tab || {})[el.dataset.id] || ''; el.onchange = () => { S.tab = { ...(S.tab || {}) }; if (el.value) S.tab[el.dataset.id] = el.value; else delete S.tab[el.dataset.id]; upd(); autosaveSoon(); if (ui.view === 'score') renderScoreEdit(); }; });
  side.querySelectorAll('.scomb').forEach((el) => (el.onchange = () => { S.combine = { ...(S.combine || {}) }; if (el.checked) S.combine[el.dataset.id] = true; else delete S.combine[el.dataset.id]; upd(); autosaveSoon(); }));
  side.querySelectorAll('.sclef').forEach((el) => (el.onchange = () => { S.clefs[el.dataset.id] = el.value; upd(); autosaveSoon(); }));
  side.querySelectorAll('.strans').forEach((el) => (el.onchange = () => { if (el.value === 'auto') delete S.trans[el.dataset.id]; else S.trans[el.dataset.id] = +el.value; upd(); autosaveSoon(); if (ui.view === 'score') renderScoreEdit(); }));
  side.querySelectorAll('.slyr').forEach((el) => {
    const tr = song.tracks.find((t) => t.id === el.dataset.id);
    el.onfocus = () => { el._snap = snapshot(); };
    el.oninput = () => { assignLyrics(tr, el.value, +el.dataset.v || 1); if (el.dataset.v === '2' && el.value.trim()) { const l3 = side.querySelector(`[data-ly3="${tr.id}"]`); if (l3) l3.hidden = false; } upd(); };
    el.onchange = () => { if (el._snap && snapshot() !== el._snap) pushUndo(el._snap, '歌詞'); version++; autosaveSoon(); };
  });
  upd();
  if (!$('#dlgScore').open) $('#dlgScore').showModal();
}
function autosaveSoon() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => { try { localStorage.setItem('otsumiki-autosave', snapshot()); } catch (e) { /* 何もしない */ } }, 400);
}
function printScore() {
  const pages = scorePages.length ? scorePages : [scoreFull || $('#scoreView').innerHTML];
  const w = window.open('', '_blank');
  if (!w) return alert('ポップアップがブロックされました。ブラウザの設定で許可してください');
  // 1ページに1枚ずつ。段のとちゅうで切れないように、ページを分けてあります
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${escapeHtml(song.title)}</title><link rel="stylesheet" href="${new URL('fonts/serif.css', location.href)}"><style>@page{size:${printPaper.css};margin:12mm}body{margin:0}.pg{break-after:page;page-break-after:always}.pg:last-child{break-after:auto;page-break-after:auto}svg{display:block;width:100%;height:auto}.pg svg.page{width:auto;height:${printPaper.h - 29}mm;margin:0 auto}</style>${pages.map((pg) => `<div class="pg">${pg}</div>`).join('')}<script>onload=()=>{const go=()=>setTimeout(()=>print(),200);(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(go,go)}<\/script>`);
  w.document.close();
}
// パート譜：えらんだパートを1つずつ、べつのページにして印刷（MuseScore の「パート」）
function printParts() {
  const ids = [...(scoreSel || [])].filter((id) => { const t = song.tracks.find((x) => x.id === id); return t && t.type !== 'chord'; });
  if (!ids.length) return alert('パートをえらんでください');
  const pages = [];
  for (const id of ids) {
    const t = song.tracks.find((x) => x.id === id);
    // パート譜は、演奏する人のための楽譜。フルスコア用の設定（小さな五線・手で入れた改行・実音）は引きつがない
    const S0 = scoreSettings();
    const keepConcert = S0.concert;
    S0.concert = false; // 移調楽器は、その楽器の調で書く
    const o = scoreOpts([id], true);
    S0.concert = keepConcert;
    o.partHeader = t.name;
    o.partMode = true;
    o.breaks = []; // 改行は、このパートに合わせて自動で決める
    o.perLine = 0;
    // 用紙と五線の大きさ：自動なら A4・五線 7mm（演奏する人が読みやすい大きさ）
    const PP = (S0.paper && PAPERS[S0.paper]) || PAPERS.a4;
    const ratioP = pageRatio(PP);
    o.scale = !S0.size || S0.size === 'auto' ? (7 * (o.width || 780)) / (32 * (PP.w - 24)) : +S0.size || 1;
    o.pageRatio = ratioP;
    o.hideEmpty = false;
    if (S0.orch) { o.chords = null; o.chordObjs = null; } // オーケストラ・吹奏楽のパート譜に、コードネームは書かない
    else if (o.chords && o.parts[0] && (o.parts[0].transpose || 0) % 12) {
      // 移調楽器（クラリネット・ホルンなど）：コードネームも、その楽器の調に合わせる
      const ct = song.tracks.find((x) => x.type === 'chord' && x.chords.some(Boolean));
      Object.assign(o, chordOptsFor(ct, o.parts[0].transpose));
    }
    o.mmRest = S0.mmRest !== false; // 長い休みは1つにまとめる（MuseScore のパート譜と同じ）
    let svg = Notation.render(o);
    let lay = Notation.lastLayout;
    // さいごのページに1〜2段だけはみ出すときは、少しつめて組みなおし、ページを1枚へらす
    const cnt = Notation.pageCounts(lay, ratioP);
    if (cnt.length > 1 && cnt[cnt.length - 1] <= 2) {
      for (const f of [0.93, 0.86]) {
        const svg2 = Notation.render({ ...o, spacing: (o.spacing || 1) * f });
        if (Notation.pageCounts(Notation.lastLayout, ratioP).length < cnt.length) { svg = svg2; lay = Notation.lastLayout; break; }
      }
    }
    const pg = Notation.paginate(svg, lay, ratioP);
    printPaper = PP;
    pages.push(...(pg.length ? pg : [svg]));
  }
  const keep = scorePages;
  scorePages = pages;
  printScore();
  scorePages = keep;
}
// 画像にするときは、楽譜の明朝体（使う字のぶんだけ）を絵の中に入れる（画像の中からは字体のファイルを読めないため）
async function embedSerifFont(svgEl) {
  try {
    const css = await (await fetch('fonts/serif.css')).text();
    const cps = new Set();
    for (const t of svgEl.querySelectorAll('text')) for (const ch of t.textContent) cps.add(ch.codePointAt(0));
    const rules = [];
    // 明朝体（Sora Serif）と欧文（Sora Text）の両方。使う字が入っているファイルだけ入れる
    for (const m of css.matchAll(/font-family:'([^']+)';font-style:(\w+);font-display:swap;font-weight:(\d+);src:url\(([^)]+)\)[^;]*;unicode-range:([^}]+)\}/g)) {
      const ranges = m[5].split(',').map((r) => r.trim().replace(/^U\+/i, '').split('-').map((h) => parseInt(h, 16)));
      if (![...cps].some((c) => ranges.some(([a, z]) => c >= a && c <= (z ?? a)))) continue;
      const blob = await (await fetch('fonts/' + m[4])).blob();
      const url = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
      rules.push(`@font-face{font-family:'${m[1]}';font-style:${m[2]};font-weight:${m[3]};src:url(${url}) format('woff2');unicode-range:${m[5]}}`);
    }
    if (rules.length) { const st = document.createElementNS('http://www.w3.org/2000/svg', 'style'); st.textContent = rules.join(''); svgEl.insertBefore(st, svgEl.firstChild); }
  } catch (e) { /* 字体が読めなければ、そのまま */ }
}
async function exportPng() {
  if (!scoreFull) return;
  const holder = document.createElement('div');
  holder.innerHTML = scoreFull;
  const svgEl = holder.querySelector('svg');
  await embedSerifFont(svgEl);
  const xml = new XMLSerializer().serializeToString(svgEl);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = svgEl.width.baseVal.value * 2;
    c.height = svgEl.height.baseVal.value * 2;
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    c.toBlob((b) => { download(b, safeName() + '_楽譜.png'); toast('楽譜の画像を保存しました'); });
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
}
function exportMusicXML() {
  const o = scoreOpts([...(scoreSel || new Set(song.tracks.filter((t) => t.type === 'melody').map((t) => t.id)))], true);
  if (o.chordShift) Object.assign(o, chordOptsFor(song.tracks.find((t) => t.type === 'chord' && t.chords.some(Boolean)), 0)); // 書き出しは実音のコード（書き出す側で移調する）
  o.chords = o.chordObjs;
  // 大譜表の伴奏は、右手（ト音記号）と左手（ヘ音記号）の2つのパートに分けて書き出す
  o.parts = o.parts.filter((p) => !p.slash); // スラッシュはコードネームだけ（音は書き出さない）
  o.parts = o.parts.flatMap((p) => (p.clef === 'grand' ? [
    { ...p, name: p.name.replace('（伴奏）', '') + '（右手）', clef: 'treble', notes: p.notes.filter((n) => n.p >= 60) },
    { ...p, id: p.id + '-L', name: p.name.replace('（伴奏）', '') + '（左手）', clef: 'bass', notes: p.notes.filter((n) => n.p < 60) },
  ] : [p]));
  download(new Blob([Notation.musicXML(o)], { type: 'application/vnd.recordare.musicxml+xml' }), safeName() + '.musicxml');
  toast('MusicXMLを書き出しました（MuseScore・Flat などの楽譜ソフトで開けます）');
}
function renderScorePanel() {
  const tr = track();
  const el = $('#scorePanel');
  if (!ui.showScore) { el.hidden = true; return; }
  el.hidden = false;
  const accOn = tr.type === 'chord' && scoreSettings().accomp && tr.chords.some(Boolean);
  $('#scorePanelBody').innerHTML = tr.type === 'melody' || tr.type === 'drum' || accOn ? scoreSvg([tr.id]) : tr.type === 'chord' ? '<p class="muted" style="padding:8px">楽譜の画面で、コード伴奏の書き方を「スラッシュ」か「ピアノ譜」にすると、ここにも楽譜が出ます</p>' : '<p class="muted" style="padding:8px">メロディかリズムのトラックを選ぶと、ここに楽譜が出ます</p>';
  const nm = $('#scorePanelName');
  if (nm) nm.textContent = tr.name;
}

/* ============================================================
   楽譜で編集（Flat のように五線の上で直接書く）
   - クリック：その高さ・位置に音符を置く（✏️入力モード）／音符をえらぶ（☝選択モード）
   - キー：A〜G＝音名、1〜6＝長さ、.＝付点、T＝3連符、0／R＝休符、↑↓＝高さ、←→＝となりへ
           Shift+音名＝和音、+＝タイ、S＝スラー、L＝歌詞、Delete＝消す、Ctrl+C/X/V/A
   ============================================================ */
const SC_DURS = [[192, '全音符', '𝅝', 6], [96, '2分音符', '𝅗𝅥', 5], [48, '4分音符', '♩', 4], [24, '8分音符', '♪', 3], [12, '16分音符', '𝅘𝅥𝅯', 2], [6, '32分音符', '𝅘𝅥𝅰', 1]];
const ARTS = [['stac', '・', 'スタッカート（短く）'], ['ten', '－', 'テヌート（たっぷり）'], ['acc', '＞', 'アクセント（強く）'], ['marc', '∧', 'マルカート（とても強く）'], ['ferm', '𝄐', 'フェルマータ（のばす）']];
const DYNS = ['pp', 'p', 'mp', 'mf', 'f', 'ff', 'sf'];
let scoreElems = [];
let scoreParts = [];
// 楽譜の地図で、小節 b（その中の位置 rel）が書かれている段と小節の箱。とても音の多い小節は2段に分かれていることがある（off＝その段の小節の頭のずれ）
function layoutBar(L, b, rel = 0) {
  let best = null;
  if (L) for (const sys of L.systems) for (const B of sys.bars) if (B.b === b && (!best || (B.off || 0) <= rel)) best = { sys, B };
  return best || { sys: null, B: null };
}

function scDur() {
  let d = ui.sc.dur;
  if (ui.sc.dot) d *= 1.5;
  if (ui.sc.trip) d = (d * 2) / 3;
  return Math.max(1, Math.round(d));
}
function scKeyAcc(tr = 0) {
  const kk = keyAt(barOf(Math.min(ui.sc.cursor || 0, Math.max(0, totalTicks() - 1))));
  const kc = Notation.keyCount(((kk.key + tr) % 12 + 12) % 12, kk.minor);
  const a = [0, 0, 0, 0, 0, 0, 0];
  const SO = [3, 0, 4, 1, 5, 2, 6];
  const FO = [6, 2, 5, 1, 4, 0, 3];
  if (kc > 0) for (let i = 0; i < kc; i++) a[SO[i]] = 1;
  if (kc < 0) for (let i = 0; i < -kc; i++) a[FO[i]] = -1;
  return a;
}
function scEditable() {
  const tr = track();
  if (tr.type === 'chord') { toast('コードは「C7 コードを入れる」（Ctrl+K）か、楽譜のコード名・伴奏の段をおして入れます'); return null; }
  if (tr.type !== 'melody') { toast('楽譜で書けるのはメロディのトラックです（リズムはマス目で）'); return null; }
  if (locked(tr)) { toast('このトラックはロックされています'); return null; }
  return tr;
}
// マス目と楽譜を行き来するとき、えらんだ音・いまの場所を引きつぐ
function viewHandoff(to) {
  const tr = track();
  if (tr.type !== 'melody') return;
  const sc = $('#scroller');
  if (to === 'score') {
    const picked = tr.notes.filter((n) => nsel.has(n));
    if (picked.length) {
      ui.sc.sel = new Set(picked.map((n) => n.s + ':' + n.p));
      ui.sc.selByInput = false;
      ui.sc.cursor = Math.min(...picked.map((n) => n.s));
    } else if (ui.gridTouch != null) {
      const t = ui.gridTouch;
      const on = tr.notes.filter((n) => n.s <= t && t < n.s + n.l).sort((a, b) => b.s - a.s)[0];
      ui.sc.cursor = on ? on.s : cellStart(t);
      ui.sc.sel = on ? new Set([on.s + ':' + on.p]) : new Set();
      ui.sc.selByInput = false;
    } else if (sc && sc.clientWidth) {
      // マス目で見ていた所に、楽譜のカーソルが無ければ、見ていた所の頭へ
      const t0 = sc.scrollLeft / ppt();
      const t1 = t0 + (sc.clientWidth - LW) / ppt();
      if (ui.sc.cursor == null || ui.sc.cursor < t0 || ui.sc.cursor > t1) { ui.sc.cursor = barStart(barOf(Math.min(Math.max(0, t0 + 1), totalTicks() - 1))); ui.sc.sel = new Set(); }
    }
    ui.sc.scrollTo = true;
    ui.gridTouch = null;
  } else {
    nsel.clear();
    if (ui.sc.sel.size && !ui.sc.selByInput) for (const n of selNotes(tr)) nsel.add(n);
    if (typeof updateSelBar === 'function') updateSelBar();
    ui.gridTouch = null;
  }
}
// マス目にもどったら、楽譜のカーソルの所が見えるように（マス目が見えてから）
function gridShowCursor() {
  const sc = $('#scroller');
  if (!sc || ui.sc.cursor == null || !sc.clientWidth) return;
  const t0 = sc.scrollLeft / ppt();
  const t1 = t0 + (sc.clientWidth - LW) / ppt();
  const c = ui.sc.cursor;
  if (c < t0 || c > t1 - 48) { sc.scrollLeft = Math.max(0, barStart(barOf(Math.min(c, totalTicks() - 1))) * ppt() - 40); draw(); if (typeof drawOverview === 'function') drawOverview(); }
}
function setView(v) {
  if (mission.on) setTimeout(() => missionGlow(), 0);
  if (ui.chd && typeof chordPickClose === 'function') chordPickClose();
  if (typeof dynPopClose === 'function') dynPopClose();
  if (v !== ui.view) viewHandoff(v);
  ui.view = v;
  document.body.classList.toggle('view-score', v === 'score');
  $$('#viewSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
  $('#editorWrap').hidden = v === 'score';
  $('#scoreEdit').hidden = v !== 'score';
  if (v === 'score') {
    if (ui.sc.cursor == null) ui.sc.cursor = ui.startTick;
    renderScorePal();
    renderScoreEdit();
  } else { resizeEditor(); draw(); gridShowCursor(); }
  renderPhonePad();
  if (typeof proView === 'function') proView();
  if (v === 'score') tourFirstTime('score');
}
function scoreEditIds() {
  return song.tracks.filter((t) => t.type === 'melody' || (t.type === 'drum' && Object.keys(t.grid).length) || (t.type === 'chord' && scoreSettings().accomp && t.chords.some(Boolean))).map((t) => t.id);
}
let scoreRenderQueued = false;
function renderScoreEdit() {
  if (ui.view !== 'score') return;
  if (scoreRenderQueued) return;
  scoreRenderQueued = true;
  requestAnimationFrame(() => { scoreRenderQueued = false; renderScoreEditNow(); });
}
function renderScoreEditNow() {
  const box = $('#scoreEditView');
  const o = scoreOpts(scoreEditIds(), true);
  scoreParts = o.partTracks;
  const pi = scoreParts.indexOf(track());
  if (ui.sc.lyr && pi >= 0 && track().id === ui.sc.lyr.tid) { o.lyrPart = track().id; o.lyrVerse = ui.sc.lyr.v || 1; }
  o.edit = { part: pi, cursor: pi >= 0 ? ui.sc.cursor : null, sel: ui.sc.sel, color: C('--accent'), curLabel: ui.sc.input ? ((SC_DURS.find((d) => d[0] === ui.sc.dur) || [0, '', ''])[2] + (ui.sc.dot ? '.' : '') + (ui.sc.trip ? '³' : '')) : '' };
  // 段の幅：画面に合わせる・自分で決める（layout.scW）。横に1列（右へ進む）にもできる
  const fitW = isPhone ? Math.max(320, box.clientWidth - 8) : Math.max(560, box.clientWidth - 8);
  o.width = !isPhone && layout.scW ? layout.scW : fitW;
  o.continuous = !isPhone && layout.scFlow === 'h';
  o.scale = (+scoreSettings().scale || 1) * ui.sc.zoom;
  o.perLine = +scoreSettings().perLine || 0;
  if (cpOn()) Object.assign(o, cpScoreMarks());
  // 大きな曲（オーケストラの長い曲など）は、いまの場所の前後だけを書く（全部書くと重い）
  const win = scoreWindow(o.parts.length);
  let pageChanged = false;
  if (win) {
    const cb = barOf(Math.min(ui.sc.cursor || 0, totalTicks() - 1));
    if (ui.sc.win == null || cb < ui.sc.win || cb >= ui.sc.win + win) { const w0 = Math.floor(cb / win) * win; pageChanged = w0 !== ui.sc.win; ui.sc.win = w0; }
    ui.sc.win = clamp(ui.sc.win, 0, Math.max(0, song.bars - 1));
    o.window = [ui.sc.win, Math.min(song.bars, ui.sc.win + win)];
  } else ui.sc.win = null;
  // 段ごとの絵のとりおき用：曲・楽譜の設定・画面のようすが同じかどうかの目じるし
  o.comments = song.comments || null;
  o.cacheSalt = [song.key, song.scale, document.body.classList.contains('kids') ? 1 : 0, ui.sc.input ? 1 : 0, ui.sc.voice || 1, JSON.stringify(song.score || 0), document.documentElement.dataset.theme || '', isPhone ? 1 : 0].join('|');
  const keepTop = box.scrollTop;
  const svgHtml = Notation.render(o);
  const LW0 = Notation.lastLayout;
  const nav = win && LW0 && LW0.window ? `<div class="scwin" role="navigation" aria-label="楽譜のページ"><button class="mini" data-w="-1" ${LW0.window[0] <= 0 ? 'disabled' : ''}>◀ 前</button><span>${LW0.window[0] + (song.pickup ? 0 : 1)}〜${LW0.window[1] - (song.pickup ? 1 : 0)}小節（全${song.bars - (song.pickup ? 1 : 0)}小節）</span><button class="mini" data-w="1" ${LW0.window[1] >= song.bars ? 'disabled' : ''}>次 ▶</button></div>` : '';
  // 前に書いた楽譜と、わく（大きさ・曲名など）と段の数が同じなら、変わった段だけを入れかえる（全部入れかえると重い）
  const sysStr = LW0 ? LW0.systems.map((x) => x.svg) : null;
  const cut = sysStr && sysStr.length ? svgHtml.indexOf('<g class="sys">') : -1;
  const frame = cut >= 0 ? nav + svgHtml.slice(0, cut) : null;
  const oldG = frame != null && box._frame === frame && box._sysStr && box._sysStr.length === sysStr.length ? box.querySelectorAll(':scope > svg > g.sys') : null;
  if (oldG && oldG.length === sysStr.length) {
    let tmp = null;
    for (let i = 0; i < sysStr.length; i++) {
      if (sysStr[i] === box._sysStr[i]) continue;
      if (!tmp) tmp = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      tmp.innerHTML = sysStr[i];
      oldG[i].replaceWith(tmp.firstChild);
    }
    document.querySelector('#scoreEditView .scpos')?.remove();
    const pc = $('#playCur');
    if (pc && !player.on) pc.remove();
  } else {
    box.innerHTML = nav + svgHtml;
  }
  box._frame = frame;
  box._sysStr = sysStr;
  box.scrollTop = pageChanged ? 0 : keepTop;
  box._layout = LW0;
  if (nav) box.querySelectorAll('.scwin button').forEach((bt) => (bt.onclick = (e) => { e.stopPropagation(); scoreWinMove(+bt.dataset.w); }));
  // カーソルが動いたら（キーでの入力・←→）、カーソルの所が見えるようにスクロールする
  //   ・マウス・指で楽譜をおして入れたときは動かさない（見ている所に入れたので）
  //   ・動かすのは、カーソルのパートの段（五線・TAB譜）が画面の外に出たときだけ。少しだけ動かす（段ぜんぶを見せようとして、上に飛ばない）
  if (ui.sc.cursor !== ui.sc.lastShown) { ui.sc.lastShown = ui.sc.cursor; if (pi >= 0 && !player.on && !ui.sc.byPointer) ui.sc.scrollTo = true; }
  ui.sc.byPointer = false;
  if (ui.sc.scrollTo) {
    ui.sc.scrollTo = false;
    const L = box._layout;
    const cb = barOf(Math.min(ui.sc.cursor || 0, totalTicks() - 1));
    const { sys } = layoutBar(L, cb, (ui.sc.cursor || 0) - barStart(cb));
    const svg = box.querySelector('svg');
    if (sys && svg) {
      const sr = svg.getBoundingClientRect();
      const br = box.getBoundingClientRect();
      const k = sr.height / L.height;
      const oy = sr.top - br.top + box.scrollTop; // 楽譜の絵の上の端（ボックスの中で）
      const mine = sys.staves.filter((q) => q.pi === pi);
      const hOf = (q) => (q.clef === 'tab' ? q.tabH || 60 : 32);
      let a = mine.length ? Math.min(...mine.map((q) => q.top)) - 28 : sys.y0;
      let z = mine.length ? Math.max(...mine.map((q) => q.top + hOf(q))) + 28 : sys.y1;
      a = oy + a * k;
      z = oy + z * k;
      const vh = box.clientHeight;
      if (a < box.scrollTop) box.scrollTop = Math.max(0, a - 8);
      else if (z > box.scrollTop + vh) box.scrollTop = Math.max(0, Math.min(a - 8, z - vh + 8));
      // 横に長いとき（横に1列・段の幅を広げたとき）は、横にもスクロール（はみ出したぶんだけ）
      const { B } = layoutBar(L, cb, (ui.sc.cursor || 0) - barStart(cb));
      if (B && sr.width > box.clientWidth + 4) {
        const kx = sr.width / L.width;
        const ox = sr.left - br.left + box.scrollLeft;
        const xa = B.x0 * kx + ox;
        const xz = B.x1 * kx + ox;
        const vw = box.clientWidth;
        if (xa < box.scrollLeft + 20) box.scrollLeft = Math.max(0, xa - 40);
        else if (xz > box.scrollLeft + vw - 20) box.scrollLeft = Math.max(0, Math.min(xa - 40, xz - vw + 40));
      }
    }
  }
  if (ui.sc.tup) setTimeout(() => scTupEnd(false), 0);
  scoreElems = [...box.querySelectorAll('.nh')].map((el) => ({ el, s: +el.dataset.s, e: +el.dataset.e, pi: +el.dataset.pi, on: el.classList.contains('playing') })); // のこした段の音符は、光ったままのことがある
  scPosShow(box);
  box.classList.toggle('mode-input', !!ui.sc.input);
  if (typeof instPanelLight === 'function' && instPanelOn) instPanelLight();
  if (typeof proAfterScore === 'function') proAfterScore(box);
  box.classList.toggle('mode-select', !ui.sc.input);
  $('#scGhost')?.remove();
  // 指で使うとき：音を1つえらんだら「ここから範囲でえらぶ」ボタンを出す（さいごの音をタップすると、その間を全部えらぶ）
  box.querySelector('.scrange')?.remove();
  if (LOW_POWER && track() && track().type === 'melody' && (ui.sc.sel.size >= 1 || ui.sc.rangeTap)) {
    const rb = document.createElement('button');
    rb.className = 'scrange' + (ui.sc.rangeTap ? ' on' : '');
    rb.textContent = ui.sc.rangeTap ? 'さいごの音をタップ（やめる）' : 'ここから範囲でえらぶ';
    rb.onpointerdown = (ev) => ev.stopPropagation();
    rb.onclick = (ev) => { ev.stopPropagation(); ui.sc.rangeTap = !ui.sc.rangeTap; if (ui.sc.rangeTap) toast('さいごの音をタップすると、その間を全部えらびます'); renderScoreEdit(); if (typeof renderPhonePad === 'function' && isPhone) renderPhonePad(); };
    box.appendChild(rb);
  }
  const st = $('#scStatus');
  if (st) {
    const bt = barTicks();
    const b = barOf(ui.sc.cursor);
    const beat = (ui.sc.cursor - barStart(b)) / beatAt(b) + 1;
    const touchy = LOW_POWER;
    const how = ui.sc.input ? (touchy ? '【入力】タップ＝音を置く' : '【入力】クリック＝音を置く・ドラッグ＝範囲をえらぶ') : (touchy ? '【選択】タップ＝音をえらぶ' : '【選択】クリック＝音をえらぶ・ドラッグ＝範囲をえらぶ');
    st.textContent = `${how}｜${ui.sc.repitch ? '【高さだけ入れなおす】' : ''}${track().name}｜${beatPos(ui.sc.cursor).text}${ui.sc.sel.size ? `｜${ui.sc.sel.size}音えらび中` : ''}`;
  }
}
// 楽譜の画面で、一度に書く小節の数（大きな曲だけ。小さな曲は全部書く）
function scoreWindow(nParts) {
  const n = Math.max(1, nParts);
  // スマホ・タブレットは、一度に書く量を少なく（音を入れるたびの書きなおしを軽くする）
  if (song.bars * n <= (LOW_POWER ? 1200 : 2400)) return 0;
  return Math.max(4, Math.round((LOW_POWER ? 480 : 900) / n));
}
function scoreWinMove(dir) {
  const L = $('#scoreEditView')._layout;
  if (!L || !L.window) return;
  const to = dir > 0 ? L.window[1] : Math.max(0, L.window[0] - scoreWindow(scoreParts.length || 1));
  if (to >= song.bars) return;
  ui.sc.win = to;
  ui.sc.cursor = barStart(to);
  ui.sc.sel = new Set();
  const box = $('#scoreEditView');
  renderScoreEditNow();
  box.scrollTop = 0;
}
function highlightScore(pos) {
  // 鳴っている音符に色をつける。音符がとても多いとき（スマホでは少し多いとき）は、たての線だけにする（色をかえると楽譜の書きなおしが重い）
  const paint = pos == null || scoreElems.length <= (LOW_POWER ? 400 : 3000);
  if (paint || scoreElems.some((it) => it.on)) for (const it of scoreElems) {
    const on = paint && pos != null && it.s <= pos && pos < it.e;
    if (on !== !!it.on) { it.on = on; it.el.classList.toggle('playing', on); }
  }
  // 再生の位置に、たての線（MuseScore の再生カーソル）。段ごとに見えるようにスクロール
  const box = $('#scoreEditView');
  let cur = $('#playCur');
  if (pos == null) { if (cur) cur.hidden = true; return; }
  let L = box._layout;
  if (!L || !box.querySelector('svg')) return;
  const b = barOf(Math.min(pos, totalTicks() - 1));
  // 大きな曲：再生がいま書いている小節の外に出たら、そこを書きなおす
  if (L.window && (b < L.window[0] || b >= L.window[1])) {
    const win = scoreWindow(scoreParts.length || 1);
    ui.sc.win = Math.floor(b / win) * win;
    const keep = ui.sc.cursor;
    ui.sc.cursor = barStart(ui.sc.win);
    scheduleAhead(1.5);
    renderScoreEditNow();
    ui.sc.cursor = keep;
    ui.sc.lastShown = keep;
    box.scrollTop = 0;
    L = box._layout;
    for (const it of scoreElems) it.on = false;
    cur = $('#playCur');
  }
  const svg = box.querySelector('svg');
  const rel = pos - barStart(b);
  const { sys, B } = layoutBar(L, b, rel);
  if (!sys) return;
  let x = B.xs[0];
  for (let i = 0; i < B.ticks.length - 1; i++) if (rel >= B.ticks[i]) x = B.xs[i] + ((Math.min(rel, B.ticks[i + 1]) - B.ticks[i]) / (B.ticks[i + 1] - B.ticks[i] || 1)) * (B.xs[i + 1] - B.xs[i]);
  if (!cur) { box.insertAdjacentHTML('beforeend', '<div id="playCur" aria-hidden="true"></div>'); cur = $('#playCur'); }
  // 楽譜（svg）の左上の、箱の中での位置。スクロールしても変わらないので、書きなおしたときと大きさが変わったときだけ測る（毎回測ると重い）
  let G = L._curGeo;
  if (!G || G.w !== box.clientWidth || G.svg !== svg) {
    const sr = svg.getBoundingClientRect();
    const br = box.getBoundingClientRect();
    G = L._curGeo = { w: box.clientWidth, svg, k: sr.width / L.width, ox: sr.left - br.left + box.scrollLeft, oy: sr.top - br.top + box.scrollTop };
  }
  const { k, ox, oy } = G;
  if (!sys._y) { const tops = sys.staves.map((st) => st.top); sys._y = [Math.min(...tops) - 10, Math.max(...tops) + 4 * 8 + 10]; }
  const [y0, y1] = sys._y;
  cur.hidden = false;
  // 線は transform で動かす（楽譜を描きなおさずにすむ）
  const h = Math.round((y1 - y0) * k);
  if (cur._h !== h) { cur._h = h; cur.style.height = h + 'px'; }
  const tf = `translate(${Math.round(ox + x * k - 2)}px,${Math.round(oy + y0 * k)}px)`;
  if (cur._tf !== tf) { cur._tf = tf; cur.style.transform = tf; } // 1ピクセルも動かないときは、さわらない
  const top = oy + sys.y0 * k;
  const bot = oy + sys.y1 * k;
  if (top < box.scrollTop || bot > box.scrollTop + box.clientHeight) { scheduleAhead(LOW_POWER ? 1.5 : 0.8); box.scrollTop = Math.max(0, top - 8); }
}

// ---- 入力・編集の操作 ----
// 声部：1＝上（ふつう）、2＝下。楽譜で入力するとき、同じ声部の音だけを上書きします
const scVoice = () => (ui.sc.voice === 2 ? 2 : 1);
const voiceOf = (n) => (n.v === 2 ? 2 : 1);
function clearRange(tr, a, z, v = scVoice()) {
  tr.notes = tr.notes.filter((n) => !(n.s >= a && n.s < z && voiceOf(n) === v));
  for (const n of tr.notes) if (voiceOf(n) === v && n.s < a && n.s + n.l > a) n.l = a - n.s;
}
function ensureLength(t) {
  // 曲の最後をこえたら小節をふやす（Flat と同じ）
  while (t > totalTicks() && song.bars < MAX_BARS && !song.locks.rules) song.bars++;
}
function scInsert(pitches, chordAdd, str) {
  const tr = scEditable();
  if (!tr) return;
  const last = ui.sc.lastIns;
  if (chordAdd && !(last && last.p != null)) chordAdd = false; // 休符のあとは和音にしない
  const t = chordAdd ? last.t : ui.sc.cursor;
  const d = chordAdd ? last.d : scDur();
  edit(() => {
    // 挿入：カーソルからうしろの音を、入れる長さだけうしろへずらす（上書きしない）
    if (ui.sc.insert && !chordAdd) {
      const v2 = scVoice() === 2;
      const mine = (n) => (n.v === 2) === v2;
      const lastEnd = Math.max(t, ...tr.notes.filter((n) => mine(n) && n.s >= t).map((n) => n.s + n.l));
      ensureLength(lastEnd + d);
      for (const n of tr.notes) if (mine(n) && n.s >= t) n.s += d;
      for (const k of ['dyn', 'texts', 'instChg']) for (const x of tr[k] || []) if (x.t >= t) x.t += d;
      for (const k of ['hairpins', 'slurs', 'pedals', 'ottava', 'trills', 'vgap']) for (const x of tr[k] || []) { if (x.s >= t) x.s += d; if (x.e >= t) x.e += d; }
    }
    ensureLength(t + d);
    if (!chordAdd && !ui.sc.insert) clearRange(tr, t, t + d);
    for (const p of pitches) {
      const ex = tr.notes.find((n) => n.s === t && n.p === p);
      if (!ex) tr.notes.push({ s: t, p: clamp(p, 21, 108), l: d, ...(scVoice() === 2 ? { v: 2 } : {}), ...(str != null ? { str } : {}) });
      else if (str != null) ex.str = str;
      if (str != null) for (const n of tr.notes) if (n.s === t && n.p !== p && n.str === str) delete n.str; // 1本の弦で2つの音は弾けない
    }
    // S をおしてから入れた音：まえの音からここまでスラー
    const sp = ui.sc.slurPend;
    if (sp && !chordAdd && pitches.length && sp.tid === tr.id && t > sp.s) { tr.slurs = (tr.slurs || []).filter((x) => x.e < sp.s || x.s > t); tr.slurs.push({ s: sp.s, e: t }); }
  }, pitches.length ? '楽譜で音符を入力' : '楽譜で休符を入力');
  if (pitches.length) { preview(tr, pitches[pitches.length - 1]); showMini(pitches[pitches.length - 1]); }
  ui.sc.lastIns = { t, d, p: pitches.length ? Math.max(...pitches) : null, ref: pitches.length ? Math.max(...pitches) : last ? last.ref || last.p : null };
  ui.sc.sel = new Set(pitches.map((p) => t + ':' + p));
  ui.sc.selByInput = true;
  if (!chordAdd) { ui.sc.cursor = Math.min(t + d, totalTicks()); ui.sc.slurPend = null; }
  renderScoreEdit();
}
function refPitch(tr) {
  if (!tr || !Array.isArray(tr.notes)) return 72; // コード・リズムのトラックのとき
  if (ui.sc.lastIns && (ui.sc.lastIns.p || ui.sc.lastIns.ref)) return ui.sc.lastIns.p || ui.sc.lastIns.ref;
  const before = tr.notes.filter((n) => n.s < ui.sc.cursor).sort((a, b) => b.s - a.s)[0];
  return before ? before.p : (RANGES[tr.range] || RANGES.soprano)[1] + 7;
}
// 音名（0=ド…6=シ）→ いちばん近い高さ（調号つき）
function letterPitch(letter, ref) {
  // 移調楽器の段では、書いてある音（その楽器の調）の音名で入れる
  const tr = track().type === 'melody' && ui.view === 'score' ? partClefTrans(track()).trans : 0;
  const pc = (([0, 2, 4, 5, 7, 9, 11][letter] + scKeyAcc(tr)[letter]) % 12 + 12) % 12;
  let best = null;
  for (let m = pc; m <= 127; m += 12) if (best == null || Math.abs(m - (ref + tr)) < Math.abs(best - (ref + tr))) best = m;
  return best - tr;
}
function selNotes(tr) { return tr && Array.isArray(tr.notes) ? tr.notes.filter((n) => ui.sc.sel.has(n.s + ':' + n.p)) : []; }
function scEditSel(fn, label) {
  const tr = scEditable();
  if (!tr) return;
  const ns = selNotes(tr);
  if (!ns.length) return toast('先に音符をえらんでください（クリック、または ← → キー）');
  edit(() => { fn(ns, tr); }, label);
  ui.sc.sel = new Set(ns.map((n) => n.s + ':' + n.p));
  renderScoreEdit();
}
/* ---------- メロディにコードをつける ----------
   小節ごとに、メロディの音（長い音・拍の頭の音ほど大事）がいちばん多くふくまれるコードをえらぶ。
   さいごの小節は主和音（Ⅰ）、その前は属和音（Ⅴ・Ⅴ7）になりやすくする。
   1小節の中で前半と後半の音がはっきりちがうときは、2つのコードにする */
// よく使われるコード進行（調の主音からの半音の数・和音の種類）。'|' で小節、'/' で1小節に2つ
// 書き方：ローマ数字＝調の主音から何番目か（♭・♯ は b・#）、うしろにコードの種類。1小節に4つまで
// 4つ目の m: true は「短調の主音から数えた進行」
const PROGRESSIONS = [
  // ---- ポップス ----
  ['カノン進行', 'I V | VIm IIIm | IV I | IV V', 'パッヘルベルのカノンの流れ。やさしく、なつかしい', 0, 'ポップス'],
  ['王道進行', 'IV | V | IIIm | VIm', 'J-POP でよく聞く、せつなくてもり上がる進行', 0, 'ポップス'],
  ['小室進行', 'VIm | IV | V | I', 'かっこよく、走りだしたくなる進行', 0, 'ポップス'],
  ['ずっと明るい', 'I | IV | V | I', 'Ⅰ→Ⅳ→Ⅴ→Ⅰ。いちばん基本の進行', 0, 'ポップス'],
  ['50年代', 'I | VIm | IV | V', 'むかしのポップス・ドゥーワップ', 0, 'ポップス'],
  ['ポップスの定番（Ⅰ-Ⅴ-Ⅵm-Ⅳ）', 'I | V | VIm | IV', '世界中のヒット曲で使われている、明るくて力づよい進行', 0, 'ポップス'],
  ['ブルース（12小節）', 'I7 | I7 | I7 | I7 | IV7 | IV7 | I7 | I7 | V7 | IV7 | I7 | V7', 'ジャズ・ロックのもと', 0, 'ポップス'],
  // ---- おしゃれ ----
  ['おしゃれ王道（7thつき）', 'IVM7 | V7 | IIIm7 | VIm7', '王道進行に7thを足して、大人っぽく', 0, 'おしゃれ'],
  ['都会の夜（Ⅳ→Ⅲ7→Ⅵm）', 'IVM7 | III7 | VIm7 | Vm7 I7', 'R&B・シティポップでおなじみ。ぐるぐる回して気持ちいい', 0, 'おしゃれ'],
  ['シティポップ', 'IM7 | IIIm7 | IVM7 | V7sus4 V7', 'ふわっと明るく、さわやかに', 0, 'おしゃれ'],
  ['なめらかに下がる', 'IVM7 | IIIm7 | IIm7 | IM7', '階段を1段ずつ下りていく、やさしい流れ', 0, 'おしゃれ'],
  ['クリシェ（半音で下がる）', 'I | IM7 | I7 | IV | IVm6 | I | IIm7 | V7', '和音の中の1つの音だけが、半音ずつ下がっていく', 0, 'おしゃれ'],
  ['せつないⅣm', 'IM7 | IVM7 | IVm6 | IM7', '明るい調の中に、一瞬だけ短調のかげりを入れる', 0, 'おしゃれ'],
  ['半音で上がる（dim7でつなぐ）', 'IM7 | #Idim7 | IIm7 | #IIdim7 | IIIm7 | VI7 | IIm7 | V7', 'コードのあいだを dim7 でなめらかにつなぐ', 0, 'おしゃれ'],
  ['add9 のきらめき', 'Iadd9 | VIm7 | IVadd9 | Vsus4 V', '9度の音を足して、すきとおったひびきに', 0, 'おしゃれ'],
  ['ボサノバ', 'IM7 | IM7 | II7 | II7 | IIm7 | bII7 | IM7 | bII7', 'ブラジルの風。半音上からすべりこむのがポイント', 0, 'おしゃれ'],
  ['ネオソウル（9thのひびき）', 'IIm9 | V9 | IM9 | VI7b9', '9thを重ねた、とろけるようなひびき', 0, 'おしゃれ'],
  // ---- ジャズ ----
  ['ツー・ファイブ・ワン', 'IIm7 | V7 | IM7 | IM7', 'ジャズのいちばん大事な形（Ⅱm7→Ⅴ7→ⅠM7）', 0, 'ジャズ'],
  ['循環コード（1-6-2-5）', 'IM7 VIm7 | IIm7 V7', 'ぐるぐる回りつづける、ジャズの基本', 0, 'ジャズ'],
  ['3-6-2-5', 'IIIm7 VI7 | IIm7 V7 | IIIm7 VI7 | IIm7 V7', '主和音に帰らず、ずっと先へ進みたくなる', 0, 'ジャズ'],
  ['五度圏めぐり', 'IIm7 | V7 | IM7 | IVM7 | VIIm7b5 | III7 | VIm | VIm', '4度ずつ進んで、明るい調から短調へ。ジャズの名曲の流れ', 0, 'ジャズ'],
  ['ジャズ・ブルース（12小節）', 'I7 | IV7 | I7 | Vm7 I7 | IV7 | #IVdim7 | I7 | IIIm7b5 VI7 | IIm7 | V7 | I7 VI7 | IIm7 V7', 'ブルースをジャズらしくしたもの', 0, 'ジャズ'],
  ['リズム・チェンジ', 'I6 VIm7 | IIm7 V7 | IIIm7 VI7 | IIm7 V7 | I I7 | IV #IVdim7 | I V7 | I6', 'ビバップでよく使われる、速い曲の形', 0, 'ジャズ'],
  ['裏コード（半音上から帰る）', 'IIm7 | bII7 | IM7 | IM7', 'Ⅴ7 のかわりに ♭Ⅱ7。ベースが半音で下りる', 0, 'ジャズ'],
  ['バックドア（♭Ⅶ7から帰る）', 'IVM7 | IVm7 bVII7 | IM7 | IM7', 'うら口から主和音へ帰る、あたたかい終わり方', 0, 'ジャズ'],
  ['おしゃれな折り返し', 'IM7 bIIIM7 | bVIM7 bIIM7', '遠い調のコードをめぐって、ふしぎに帰ってくる', 0, 'ジャズ'],
  // ---- 短調 ----
  ['短調のツー・ファイブ', 'IIm7b5 | V7b9 | Im7 | Im7', '短調のジャズの基本（Ⅱm7♭5→Ⅴ7→Ⅰm）', 1, '短調'],
  ['アンダルシア進行', 'Im | bVII | bVI | V', 'フラメンコのように、情熱的に下がっていく', 1, '短調'],
  ['短調のクリシェ', 'Im | ImM7 | Im7 | Im6', 'スパイ映画のように、1つの音が半音ずつ下がる', 1, '短調'],
  ['短調でもり上がる', 'bVI | bVII | Im | Im', 'アニメ・ゲーム音楽でよく聞く、力づよい上がり方', 1, '短調'],
  ['ドリアン（モード）', 'Im7 | IV7 | Im7 | IV7', '2つのコードを行き来する、クールなひびき', 1, '短調'],
  ['マイナー・ブルース（12小節）', 'Im7 | Im7 | Im7 | Im7 | IVm7 | IVm7 | Im7 | Im7 | bVI7 | V7 | Im7 | V7', '短調のブルース', 1, '短調'],
];
const ROMAN = { I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11 };
const ROMAN_MIN = { I: 0, II: 2, III: 3, IV: 5, V: 7, VI: 8, VII: 10 }; // 短調：♭Ⅲ・♭Ⅵ・♭Ⅶ は b をつけて書く（下で長調の数え方にそろえる）
// 'bVIIM7' → { iv: 主音からの半音, q: 種類 }
function parseDegree(d) {
  const m = String(d).match(/^([b#]?)(VII|VI|IV|V|III|II|I)(.*)$/);
  if (!m) return null;
  const q = m[3] === '' ? 'M' : m[3] === '7#9' ? '7s9' : m[3];
  if (!CHORD_Q[q]) return null;
  return { iv: (ROMAN[m[2]] + (m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0) + 12) % 12, q };
}
// 進行を、小節ごとのコードのならびにする（base＝主音）
function progressionBars(i, base) {
  return PROGRESSIONS[i][1].split('|').map((x) => x.trim().split(/\s+/).filter(Boolean).map((d) => { const g = parseDegree(d) || { iv: 0, q: 'M' }; return { r: (base + g.iv) % 12, q: g.q }; }));
}
function applyProgression(i) {
  const tr = track();
  if (tr.type !== 'chord') return;
  if (locked(tr)) return toast('このトラックはロックされています');
  const [name, , , minor] = PROGRESSIONS[i];
  // 曲が短調で進行が長調（またはその逆）のときは、同じ音階を使う調（平行調）の主音から数える
  const k = !!minor === isMinor() ? song.key : minor ? (song.key + 9) % 12 : (song.key + 3) % 12;
  const bars = progressionBars(i, k);
  const from = ui.selBar || 0;
  edit(() => {
    while (tr.chords.length < song.bars) tr.chords.push(null);
    // えらんだ小節から、曲のおわりまでくり返し入れる
    for (let b = from, j = 0; b < song.bars; b++, j++) {
      const cs = bars[j % bars.length];
      // 1小節にいくつかあるときは、拍の頭に同じ間かくでならべる
      const bs = beatAt(b), nb = Math.max(1, Math.round(barLen(b) / bs));
      const segs = cs.slice(0, nb).map((c, x, a) => ({ o: Math.floor((x * nb) / a.length) * bs, c }));
      tr.chords[b] = chordFromSegs(segs, b);
    }
  }, 'コード進行「' + name + '」');
  toast(`「${name}」を ${from + 1}小節目から入れました`, 3500);
  // はじめの4つのコードを、さっと鳴らして聞かせる
  const ctx = ensureAudio();
  let k2 = 0;
  for (let b = from; b < Math.min(song.bars, from + 4); b++) {
    const c = tr.chords[b];
    for (const cc of chordSegs(c, b).map((x) => x.c)) {
      let root = 48 + (cc.r % 12);
      if (root > 54) root -= 12;
      const at = ctx.currentTime + 0.05 + k2 * 0.42;
      CHORD_Q[cc.q].iv.forEach((x) => Sound.playNote(ctx, previewOut, tr.inst, root + 12 + x, at, 0.38, 0.45));
      Sound.playNote(ctx, previewOut, tr.inst, root - 12 + (root < 43 ? 12 : 0), at, 0.38, 0.5);
      k2++;
    }
  }
}
function harmonize(halves = true) {
  const mels = song.tracks.filter((t) => t.type === 'melody' && t.notes.length);
  if (!mels.length) return null;
  const candsAt = (b) => diatonic(b).filter((c) => c.q !== 'M7' && c.q !== 'dim');
  let cands = candsAt(0);
  const tonesOf = (c) => new Set(CHORD_Q[c.q].iv.map((x) => (c.r + x) % 12));
  const weights = (a, z) => {
    const w = new Array(12).fill(0);
    mels.forEach((t, ti) => {
      const tw = ti === 0 ? 1 : 0.5; // いちばん上のメロディを大事に
      for (const n of t.notes) {
        const s0 = Math.max(n.s, a);
        const e0 = Math.min(n.s + n.l, z);
        if (e0 <= s0) continue;
        let v = (e0 - s0) / 48;
        if (n.s >= a && (n.s - a) % beatAt(barOf(a)) === 0) v += 0.5; // 拍の頭
        if (n.s === a) v += 0.5; // 小節（区切り）の頭
        w[n.p % 12] += v * tw;
      }
    });
    return w;
  };
  const score = (c, w, prev, last, beforeLast) => {
    const tones = tonesOf(c);
    let sc = 0;
    let any = 0;
    for (let pc = 0; pc < 12; pc++) { if (!w[pc]) continue; any += w[pc]; sc += tones.has(pc) ? w[pc] : -0.45 * w[pc]; }
    if (!any) return -1e9;
    const deg = c.deg;
    if (/^Ⅰ/.test(deg)) sc += 0.25;
    if (/^Ⅳ|^Ⅴ/.test(deg)) sc += 0.15;
    if (last) sc += /^Ⅰ/.test(deg) ? 3 : -1;
    if (beforeLast && /^Ⅴ/.test(deg)) sc += 0.6;
    if (prev && prev.r === c.r && prev.q === c.q) sc += 0.1;
    if (c.q === '7' && !(w[(c.r + 10) % 12] > 0)) sc -= 0.2; // 7の音がないなら、ふつうのⅤ
    return sc;
  };
  const best = (a, z, prev, last, beforeLast) => {
    const w = weights(a, z);
    let bc = null;
    let bs = -1e9;
    for (const c of cands) { const v = score(c, w, prev, last, beforeLast); if (v > bs) { bs = v; bc = c; } }
    return bs <= -1e8 ? null : { c: { r: bc.r, q: bc.q }, s: bs };
  };
  const out = [];
  let prev = null;
  const lastBar = (() => { let lb = 0; for (const t of mels) for (const n of t.notes) lb = Math.max(lb, barOf(Math.min(n.s, totalTicks() - 1))); return lb; })();
  for (let b = 0; b < song.bars; b++) {
    cands = candsAt(b);
    const a = barStart(b);
    const z = barStart(b + 1);
    const last = b === lastBar;
    const whole = best(a, z, prev, last, b === lastBar - 1);
    if (!whole) { out.push(b > lastBar ? null : prev ? { ...prev } : null); continue; }
    let pick = whole.c;
    if (halves && !last) {
      const h = a + chordHalf(b);
      const A = best(a, h, prev, false, false);
      const B = A && best(h, z, A.c, false, b === lastBar - 1);
      // にた和音（音が2つ以上同じ）なら分けない
      const shared = A && B ? [...tonesOf(A.c)].filter((x) => tonesOf(B.c).has(x)).length : 3;
      if (A && B && shared < 2 && A.s + B.s > whole.s + 1.2) pick = { ...A.c, h: B.c };
    }
    out.push(pick);
    prev = pick.h || pick;
  }
  return out;
}
function autoChords() {
  let tr = song.tracks.find((t) => t.type === 'chord');
  if (!tr) return toast('コード伴奏のトラックがありません（トラックの「追加」から作れます）');
  if (locked(tr)) return toast('コード伴奏のトラックはロックされています');
  const res = harmonize(true);
  if (!res) return toast('先にメロディを入れてね');
  edit(() => { tr.chords = res; }, 'メロディにコードをつける');
  const two = res.filter((c) => c && c.h).length;
  toast(`メロディに合うコードをつけました${two ? `（${two}小節は2つのコード）` : ''}。気に入らない小節は、下のボタンで変えられます`, 4000);
}
function diatonicStep(p, dir) {
  const acc = scKeyAcc();
  const pcs = [0, 2, 4, 5, 7, 9, 11].map((v, i) => ((v + acc[i]) % 12 + 12) % 12);
  let q = p;
  do q += dir; while (!pcs.includes(((q % 12) + 12) % 12) && Math.abs(q - p) < 3);
  return q;
}
function onsetsOf(tr) { return [...new Set(tr.notes.map((n) => n.s))].sort((a, b) => a - b); }
const durKeys = () => lsGet('otsumiki-durkeys', 'otsumiki');
// 和音の中で、上・下の音をえらぶ（Alt＋↑↓）
function scChordStep(dir) {
  const tr = track();
  const ns = selNotes(tr);
  if (!ns.length) return;
  const s0 = ns[0].s;
  const chord = tr.notes.filter((n) => n.s === s0).sort((a, b) => a.p - b.p);
  const i = chord.indexOf(dir > 0 ? ns.reduce((a, n) => (n.p > a.p ? n : a)) : ns.reduce((a, n) => (n.p < a.p ? n : a)));
  const nx = chord[clamp(i + dir, 0, chord.length - 1)];
  ui.sc.sel = new Set([nx.s + ':' + nx.p]);
  ui.sc.selByInput = false;
  preview(tr, nx.p, 0.25);
  renderScoreEdit();
}
// 上・下のパートへ（Ctrl＋Alt＋↑↓）：カーソルの位置はそのまま
function scStaffStep(dir) {
  const ids = scoreEditIds();
  const list = song.tracks.filter((t) => ids.includes(t.id) && t.type === 'melody');
  const i = list.indexOf(track());
  const nx = list[i + dir];
  if (!nx) return;
  selectTrack(song.tracks.indexOf(nx), false);
  ui.sc.sel = new Set();
  ui.sc.lastIns = null;
  toast(nx.name);
  renderScoreEdit();
}
// R：えらんだ音（なければ、いま入れた音）を、すぐうしろにくり返す
function scRepeat() {
  const tr = scEditable();
  if (!tr) return;
  let ns = ui.sc.sel.size ? selNotes(tr) : [];
  if (!ns.length && ui.sc.lastIns && ui.sc.lastIns.p != null) ns = tr.notes.filter((n) => n.s === ui.sc.lastIns.t);
  if (!ns.length) return toast('くり返す音符をえらんでください');
  const a = Math.min(...ns.map((n) => n.s));
  const z = Math.max(...ns.map((n) => n.s + n.l));
  const d = z - a;
  const copy = ns.map((n) => ({ ...n, s: n.s + d }));
  edit(() => {
    ensureLength(z + d);
    for (const v of [1, 2]) if (copy.some((n) => voiceOf(n) === v)) clearRange(tr, z, z + d, v);
    for (const n of copy) { delete n.ly; delete n.ly2; delete n.ly3; tr.notes.push(n); }
  }, 'くり返す');
  ui.sc.sel = new Set(copy.map((n) => n.s + ':' + n.p));
  ui.sc.selByInput = false;
  ui.sc.cursor = Math.min(z + d, totalTicks());
  ui.sc.lastIns = { t: z, d: copy[0].l, p: Math.max(...copy.map((n) => n.p)) };
  preview(tr, Math.max(...copy.map((n) => n.p)), 0.25);
  renderScoreEdit();
}
// 高さだけ入れなおす：カーソルの所の音の高さを変えて、次の音へ（リズムはそのまま）
function scRepitch(p) {
  const tr = scEditable();
  if (!tr) return;
  const ons = onsetsOf(tr);
  const at = ons.find((s0) => s0 >= ui.sc.cursor);
  if (at == null) { ui.sc.repitch = false; toast('おわりまで来ました'); return; }
  edit(() => {
    const chord = tr.notes.filter((n) => n.s === at && voiceOf(n) === scVoice());
    const keep = chord.sort((a, b) => b.p - a.p)[0];
    if (!keep) return;
    tr.notes = tr.notes.filter((n) => !(n.s === at && voiceOf(n) === scVoice() && n !== keep));
    keep.p = clamp(p, 21, 108);
    delete keep.enh;
  }, '高さを入れなおす');
  preview(tr, p, 0.3);
  showMini(p);
  ui.sc.lastIns = { t: at, d: 0, p };
  const next = ons.find((s0) => s0 > at);
  ui.sc.cursor = next != null ? next : totalTicks();
  ui.sc.sel = new Set([at + ':' + clamp(p, 21, 108)]);
  ui.sc.selByInput = true;
  renderScoreEdit();
}
function scMove(dir, extend) {
  const tr = track();
  if (tr.type !== 'melody') return;
  const ons = onsetsOf(tr);
  const curS = ui.sc.sel.size ? [...ui.sc.sel].map((k) => +k.split(':')[0])[dir > 0 ? 'reduce' : 'reduce']((a, b) => (dir > 0 ? Math.max(a, b) : Math.min(a, b))) : null;
  let target;
  if (curS != null) target = dir > 0 ? ons.find((s) => s > curS) : [...ons].reverse().find((s) => s < curS);
  else target = dir > 0 ? ons.find((s) => s >= ui.sc.cursor) : [...ons].reverse().find((s) => s < ui.sc.cursor);
  if (target == null) {
    // うしろに音がないときは、いまの音（えらんだ音・カーソルにかかる音）のおわりへ。なければ1つぶん
    let to = ui.sc.cursor + dir * scDur();
    if (dir > 0) {
      const from = curS != null ? curS : ui.sc.cursor;
      const cover = tr.notes.filter((n) => n.s <= from && n.s + n.l > from);
      if (cover.length) to = Math.max(...cover.map((n) => n.s + n.l));
    }
    ui.sc.cursor = clamp(to, 0, totalTicks()); ui.sc.sel = extend ? ui.sc.sel : new Set(); renderScoreEdit(); return;
  }
  const keys = tr.notes.filter((n) => n.s === target).map((n) => n.s + ':' + n.p);
  ui.sc.sel = extend ? new Set([...ui.sc.sel, ...keys]) : new Set(keys);
  ui.sc.selByInput = false;
  ui.sc.cursor = target;
  ui.sc.lastIns = null;
  const top = tr.notes.filter((n) => n.s === target).sort((a, b) => b.p - a.p)[0];
  if (top && !extend) preview(tr, top.p, 0.25);
  renderScoreEdit();
}
function scDelete() {
  const tr = scEditable();
  if (!tr) return;
  if (ui.sc.sel.size) {
    edit(() => { tr.notes = tr.notes.filter((n) => !ui.sc.sel.has(n.s + ':' + n.p)); }, '音符を消す');
    ui.sc.sel = new Set();
  } else {
    const prev = onsetsOf(tr).reverse().find((s) => s < ui.sc.cursor);
    if (prev == null) return;
    edit(() => { tr.notes = tr.notes.filter((n) => n.s !== prev); }, '音符を消す');
    ui.sc.cursor = prev;
  }
  renderScoreEdit();
}
function scCopy(cut) {
  const tr = track();
  const ns = selNotes(tr);
  if (!ns.length) return toast('コピーする音符をえらんでください（Shift＋クリックで範囲）');
  const s0 = Math.min(...ns.map((n) => n.s));
  const s1 = Math.max(...ns.map((n) => n.s + n.l));
  ui.sc.clip = { len: s1 - s0, notes: ns.map((n) => ({ ...n, s: n.s - s0, art: n.art ? [...n.art] : undefined })) };
  if (cut) { edit(() => { tr.notes = tr.notes.filter((n) => !ui.sc.sel.has(n.s + ':' + n.p)); }, '切り取り'); ui.sc.sel = new Set(); renderScoreEdit(); }
  toast(cut ? '切り取りました' : 'コピーしました。カーソルの所で Ctrl+V（貼りつけ）');
}
function scPaste() {
  const tr = scEditable();
  if (!tr || !ui.sc.clip) return;
  const t = ui.sc.cursor;
  const c = ui.sc.clip;
  edit(() => { ensureLength(t + c.len); clearRange(tr, t, t + c.len); for (const n of c.notes) tr.notes.push({ ...n, s: n.s + t, art: n.art ? [...n.art] : undefined }); }, '貼りつけ');
  ui.sc.sel = new Set(c.notes.map((n) => n.s + t + ':' + n.p));
  ui.sc.cursor = Math.min(t + c.len, totalTicks());
  renderScoreEdit();
}
function scTie() {
  scEditSel((ns, tr) => {
    for (const n of ns) {
      const nx = tr.notes.find((m) => m.p === n.p && m.s === n.s + n.l);
      if (nx) { n.l += nx.l; tr.notes.splice(tr.notes.indexOf(nx), 1); }
    }
  }, 'タイ');
}
// いっしょにつけられない記号のなかま
const ART_EXCL = [['stac', 'stacc2', 'ten'], ['acc', 'marc'], ['tr', 'prall', 'mord', 'turn', 'trem', 'gliss'], ['upb', 'dnb'], ['breath', 'caes']];
function scArt(a) {
  ornEdit((ns) => {
    const allHave = ns.every((n) => (n.art || []).includes(a));
    for (const n of ns) {
      n.art = (n.art || []).filter((x) => x !== a);
      if (!allHave) {
        for (const grp of ART_EXCL) if (grp.includes(a)) n.art = n.art.filter((x) => !grp.includes(x));
        n.art.push(a);
      }
      if (!n.art.length) delete n.art;
    }
  }, 'アーティキュレーション');
}
function scAccidental(kind) {
  scEditSel((ns) => {
    for (const n of ns) {
      if (kind === '#') n.p = clamp(n.p + 1, 21, 108);
      else if (kind === 'b') n.p = clamp(n.p - 1, 21, 108);
      else {
        // ♮：調号の音にもどす
        const sp = Notation.spell(n.p, Notation.keyCount(song.key, isMinor()));
        const nat = 12 * (sp.oct + 1) + [0, 2, 4, 5, 7, 9, 11][sp.letter] + scKeyAcc()[sp.letter];
        n.p = nat;
      }
    }
  }, '臨時記号');
}
function selRange(tr) {
  const ns = selNotes(tr);
  if (!ns.length) return null;
  return { s: Math.min(...ns.map((n) => n.s)), e: Math.max(...ns.map((n) => n.s)), end: Math.max(...ns.map((n) => n.s + n.l)) };
}
function scSlur() {
  const tr = scEditable();
  if (!tr) return;
  let r = selRange(tr);
  if (!r) {
    // 何もえらんでいないとき：カーソルの前の音（入れたばかりの音）から
    const prev = tr.notes.filter((n) => n.s < ui.sc.cursor).sort((a, b) => b.s - a.s)[0];
    if (!prev) return toast('スラーをかける音符をえらんでください');
    r = { s: prev.s, e: prev.s };
  }
  let ext = null;
  if (r.s === r.e) {
    // 音符が1つだけ：つぎの音までスラー。すでにスラーのおわりの音なら、そのスラーをのばす
    const v = (selNotes(tr)[0] || tr.notes.find((n) => n.s === r.s) || {}).v || 1;
    const nx = tr.notes.filter((n) => n.s > r.s && (n.v || 1) === v && !n.gr).sort((a, b) => a.s - b.s)[0];
    if (!nx) {
      if (!ui.sc.input) return toast('つぎの音がないので、スラーをかけられません');
      // 入力中：つぎに入れる音にスラーをつなぐ
      ext = (tr.slurs || []).find((x) => x.e === r.s && x.s < r.s);
      ui.sc.slurPend = { s: ext ? ext.s : r.s, tid: tr.id };
      return toast('つぎに入れる音までスラーがつきます');
    }
    ext = (tr.slurs || []).find((x) => x.e === r.s && x.s < r.s);
    r = { s: ext ? ext.s : r.s, e: nx.s };
    ui.sc.sel = new Set(tr.notes.filter((n) => n.s === nx.s && (n.v || 1) === v).map((n) => n.s + ':' + n.p));
  }
  edit(() => { tr.slurs = (tr.slurs || []).filter((x) => x.e < r.s || x.s > r.e); tr.slurs.push({ s: r.s, e: r.e }); }, 'スラー');
  renderScoreEdit();
}
function scHairpin(type) {
  const tr = scEditable();
  if (!tr) return;
  const r = selRange(tr);
  if (!r || r.s === r.e) {
    // 音符が1つ（または何もえらんでいない）：そこから決まった長さで入れて、長さをえらぶパネルを出す
    const s0 = r ? r.s : ui.sc.cursor;
    const len = ui.hpLen || barLen(barOf(s0));
    edit(() => { tr.hairpins = (tr.hairpins || []).filter((x) => x.s !== s0); tr.hairpins.push({ s: s0, e: Math.min(totalTicks(), s0 + len), type }); }, type === 'cresc' ? 'クレッシェンド' : 'デクレッシェンド');
    renderScoreEditNow();
    const c = $('#scoreEditView rect.cursor');
    const q = c ? c.getBoundingClientRect() : { left: innerWidth / 2, bottom: innerHeight / 2 };
    dynPop(tr, s0, q.left, q.bottom + 160, { hp: tr.hairpins.length - 1 });
    return;
  }
  edit(() => { tr.hairpins = (tr.hairpins || []).filter((x) => x.e <= r.s || x.s >= r.end); tr.hairpins.push({ s: r.s, e: r.end, type }); }, type === 'cresc' ? 'クレッシェンド' : 'デクレッシェンド');
  renderScoreEdit();
}
function scDynamic(v) {
  const tr = scEditable();
  if (!tr) return;
  const r = selRange(tr);
  const t = r ? r.s : ui.sc.cursor;
  edit(() => { tr.dyn = (tr.dyn || []).filter((d) => d.t !== t); if (v) tr.dyn.push({ t, v }); tr.dyn.sort((a, b) => a.t - b.t); }, '強弱記号');
  renderScoreEdit();
}
function scClearMarks() {
  const tr = scEditable();
  if (!tr) return;
  const r = selRange(tr) || { s: ui.sc.cursor, e: ui.sc.cursor, end: ui.sc.cursor + 1 };
  edit(() => {
    tr.dyn = (tr.dyn || []).filter((d) => d.t < r.s || d.t >= r.end);
    tr.hairpins = (tr.hairpins || []).filter((h) => h.e <= r.s || h.s >= r.end);
    tr.slurs = (tr.slurs || []).filter((x) => x.e < r.s || x.s > r.e);
    for (const n of selNotes(tr)) { for (const k of ['art', 'fg', 'gr', 'grl', 'tra', 'trs', 'nh', 'sd', 'sm', 'col']) delete n[k]; }
    if (tr.texts) { tr.texts = tr.texts.filter((x) => x.t < r.s || x.t >= r.end); if (!tr.texts.length) delete tr.texts; }
    if (tr.instChg) { tr.instChg = tr.instChg.filter((x) => x.t < r.s || x.t >= r.end); if (!tr.instChg.length) delete tr.instChg; }
    if (tr.pedals) { tr.pedals = tr.pedals.filter((x) => x.e <= r.s || x.s >= r.end); if (!tr.pedals.length) delete tr.pedals; }
    if (tr.ottava) { tr.ottava = tr.ottava.filter((x) => x.e <= r.s || x.s >= r.end); if (!tr.ottava.length) delete tr.ottava; }
    if (tr.trills) { tr.trills = tr.trills.filter((x) => x.e <= r.s || x.s >= r.end); if (!tr.trills.length) delete tr.trills; }
  }, '記号を消す');
  renderScoreEdit();
}
/* ---------- 記号パレット（MuseScore のパレットのように、記号をえらんでつける） ---------- */
const PAL = [
  ['アーティキュレーション', [['stac', 'articStaccatoAbove', 'スタッカート（短く）'], ['stacc2', 'articStaccatissimoAbove', 'スタッカーティッシモ（とても短く）'], ['ten', 'articTenutoAbove', 'テヌート（たっぷり）'], ['acc', 'articAccentAbove', 'アクセント（強く）'], ['marc', 'articMarcatoAbove', 'マルカート（とても強く）'], ['ferm', 'fermataAbove', 'フェルマータ（のばす）']]],
  ['装飾記号', [['tr', 'ornamentTrill', 'トリル（となりの音とすばやく交互に）'], ['prall', 'ornamentShortTrill', 'プラルトリラー（上の音へ1回）'], ['mord', 'ornamentMordent', 'モルデント（下の音へ1回）'], ['turn', 'ornamentTurn', 'ターン（上・元・下・元）'], ['iturn', 'ornamentTurnInverted', '逆ターン（下・元・上・元）'], ['trem', 'tremolo3', 'トレモロ（同じ音をきざむ）'], ['gliss', 'gliss', 'グリッサンド（つぎの音まで、すべるように）']]],
  ['和音・息つぎ', [['arp', null, 'アルペジオ（和音を下から順に）'], ['breath', 'breathMarkComma', 'ブレス（息つぎ）'], ['caes', 'caesura', 'カエスーラ（区切って止まる）']]],
  ['弦楽器の弓', [['dnb', 'stringsDownBow', 'ダウン・ボウ（下げ弓）'], ['upb', 'stringsUpBow', 'アップ・ボウ（上げ弓）']]],
];
function palGlyph(name) {
  if (name === 'gliss') return '<svg viewBox="0 0 30 24" width="30" height="24"><ellipse cx="5" cy="19" rx="4" ry="3" fill="currentColor"/><ellipse cx="25" cy="5" rx="4" ry="3" fill="currentColor"/><path d="M9 17 L21 7" stroke="currentColor" stroke-width="1.4"/></svg>';
  if (name === 'grace') return `<svg viewBox="-0.6 -3.4 3 4.2" width="22" height="30"><path d="${Glyphs.g.noteheadBlack.d}" transform="scale(0.7)" fill="currentColor"/><path d="M0.82 -0.1V-3" stroke="currentColor" stroke-width="0.12"/><path d="M0.82 -3 q0.9 0.6 0.9 1.6" fill="none" stroke="currentColor" stroke-width="0.14"/><path d="M0.2 -1.2 L1.6 -2.4" stroke="currentColor" stroke-width="0.12"/></svg>`;
  if (!name) return '<svg viewBox="-8 -14 16 28" width="18" height="26"><path d="M0 12 Q3 9 0 6 Q-3 3 0 0 Q3 -3 0 -6 Q-3 -9 0 -12" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  const g = Glyphs.g[name];
  if (!g) return '';
  const bb = g.bbox || [0, -1, g.w || 1, 0];
  const pad = 0.3;
  return `<svg viewBox="${bb[0] - pad} ${bb[1] - pad} ${bb[2] - bb[0] + pad * 2} ${bb[3] - bb[1] + pad * 2}" width="${Math.max(14, (bb[2] - bb[0] + pad * 2) * 9)}" height="${Math.max(14, (bb[3] - bb[1] + pad * 2) * 9)}" style="max-width:34px;max-height:30px"><path d="${g.d}" fill="currentColor"/></svg>`;
}
// パレットは「うかぶ小窓」：ほかのボタンや楽譜をずらさない。見出しをドラッグで動かせて、場所とたたみ方をおぼえる
const PAL_MORE = [
  ['装飾音符', () => `<button class="palb" data-gr="1" title="装飾音符（上のとなりの音から）">${palGlyph('grace')}<i>↑</i></button><button class="palb" data-gr="-1" title="装飾音符（下のとなりの音から）">${palGlyph('grace')}<i>↓</i></button><button class="palb txt" data-gr="addUp" title="装飾音符をもう1つ前に足す（上へ）：2つ以上は16分音符でつながります">＋↑</button><button class="palb txt" data-gr="addDown" title="装飾音符をもう1つ前に足す（下へ）">＋↓</button><button class="palb txt sm" data-gr="long" title="長前打音（斜線なし）：主音符の半分の長さで、はっきり鳴らす／短前打音にもどす">長い</button><button class="palb" data-gr="0" title="装飾音符を消す">✕</button>`],
  ['トリル・トレモロ', () => `<button class="palb txt" data-tra="1" title="トリル（上の音を ♯ に）"><b>tr</b><i>♯</i></button><button class="palb txt" data-tra="-1" title="トリル（上の音を ♭ に）"><b>tr</b><i>♭</i></button><button class="palb txt" data-tra="0" title="トリル（上の音を ♮ に）"><b>tr</b><i>♮</i></button><button class="palb txt" id="palTrl" title="トリルの波線：えらんだ音のはじめから終わりまで「tr～～～」（もう一度で消す）"><b>tr</b>〰</button><button class="palb txt" data-trs="1" title="トレモロ（斜線1本＝8分音符できざむ）">／</button><button class="palb txt" data-trs="2" title="トレモロ（斜線2本＝16分音符できざむ）">／／</button><button class="palb txt" data-trs="3" title="トレモロ（斜線3本＝できるだけ速く）">///</button><button class="palb txt" data-trs="two" title="2つの音のトレモロ：つぎの音と交互にすばやく（2つの音をえらんでおす）">⇄</button>`],
  ['符頭・奏法', () => `<button class="palb txt" data-nh="diamond" title="ひし形の符頭（ハーモニクスなど）">◇</button><button class="palb txt" data-nh="x" title="×の符頭（語り・打つ音など）">×</button><button class="palb txt" data-nh="" title="ふつうの符頭にもどす">●</button><button class="palb txt" data-look="up" title="ぼうを上向きに（もう一度おすと自動にもどる）">ぼう↑</button><button class="palb txt" data-look="dn" title="ぼうを下向きに（もう一度おすと自動にもどる）">ぼう↓</button><button class="palb txt" data-look="sm" title="小さい音符（キュー・ほかのパートの手がかり）。もう一度おすと、ふつうの大きさ"><i style="position:static;font-style:normal;font-size:10px">小さく</i></button>${Object.entries(Notation.NOTE_COLS).map(([k, c]) => `<button class="palb txt" data-look="col:${k}" title="音符の色（もう一度おすと黒にもどる）"><i style="position:static;display:inline-block;width:12px;height:12px;border-radius:50%;background:${c}"></i></button>`).join('')}<button class="palb txt" data-art="harm" title="ハーモニクス（○：弦をそっとふれて、高い音）">○</button><button class="palb txt" data-art="open" title="オープン（o：ミュートをはずす・開放弦）">o</button><button class="palb txt" data-art="stop" title="ストップ（＋：ホルンの手でふさぐ音・左手ピチカート）">＋</button><button class="palb txt" data-art="snap" title="スナップ・ピチカート（弦をはじいて指板に当てる）">φ</button>`],
  ['指番号', () => `${[1, 2, 3, 4, 5].map((k) => `<button class="palb num" data-fg="${k}" title="指番号 ${k}">${k}</button>`).join('')}<button class="palb" data-fg="0" title="指番号を消す">✕</button>`],
  ['音を重ねる', () => [[3, '3度上'], [4, '4度上'], [5, '5度上'], [6, '6度上'], [8, '8度上'], [-3, '3度下'], [-8, '8度下']].map(([k, t]) => `<button class="palb txt" data-iv="${k}" title="えらんだ音の${t}に音を足す（Alt＋${Math.abs(k)}）">${Math.abs(k)}${k > 0 ? '↑' : '↓'}</button>`).join('')],
  ['オクターブ記号', () => `<button class="palb txt" data-ott="1" title="8va：1オクターブ上で弾く（高い音の加線をへらす）"><i style="position:static;font-style:italic;font-weight:700;font-family:serif;font-size:13px">8va</i></button><button class="palb txt" data-ott="-1" title="8vb：1オクターブ下で弾く"><i style="position:static;font-style:italic;font-weight:700;font-family:serif;font-size:13px">8vb</i></button><button class="palb txt" data-ott="2" title="15ma：2オクターブ上"><i style="position:static;font-style:italic;font-weight:700;font-family:serif;font-size:12px">15ma</i></button><button class="palb" data-ott="0" title="オクターブ記号を消す">✕</button>`],
  ['音部記号', () => `${[['treble', 'gClef', 'ト音記号'], ['bass', 'fClef', 'ヘ音記号'], ['alto', 'cClef', 'ハ音記号（アルト）'], ['treble8', 'gClef', 'ト音記号（8つ下）']].map(([c, g, t]) => `<button class="palb" data-clef="${c}" title="${t}：カーソルの小節から">${palGlyph(g)}${c === 'treble8' ? '<i>8</i>' : ''}</button>`).join('')}<button class="palb" data-clef="" title="この小節の音部記号の変化を消す">✕</button>`],
  ['ピアノ', () => `<button class="palb" id="palPed" title="ペダル：えらんだ音符のはじめからおわりまで、ペダルをふむ（Ped. ＊）">${palGlyph('keyboardPedalPed')}</button>`],
  ['テキスト', () => `<button class="palb txt" id="palText" title="譜表テキスト：音の上にことばを書く（Alt+T）"><b>T</b></button><button class="palb" id="palReh" title="リハーサル記号 A・B・C…（Alt+M）"><b class="rehb">A</b></button><button class="palb txt" id="palInst" title="楽器の持ちかえ：ここから、ちがう楽器の音にする（れい：フルート → ピッコロ）"><i style="position:static;font-style:normal;font-size:11px;font-weight:700">持ちかえ</i></button>`],
  ['くり返し・D.C.', () => `<button class="palb" data-bar="start" title="くり返しはじめ（カーソルの小節）">𝄆</button><button class="palb" data-bar="end" title="くり返しおわり（カーソルの前の小節）">𝄇</button><button class="palb txt" data-bar="1" title="1番かっこ">1.</button><button class="palb txt" data-bar="2" title="2番かっこ">2.</button>${JUMPS.map(([k, t]) => `<button class="palb ${k === 'segno' || k === 'coda' ? '' : 'txt sm'}" data-jump="${k}" title="${t}">${k === 'segno' ? palGlyph('segno') : k === 'coda' ? palGlyph('coda') : { tocoda: 'To⊕', fine: 'Fine', dc: 'D.C.', ds: 'D.S.' }[k]}</button>`).join('')}<button class="palb" data-jump="-" title="この小節の D.C.・コーダなどを消す">✕</button><button class="palb" id="palMrep" title="前の小節と同じ（くり返し記号）：前の小節の音をこの小節にうつして、楽譜では ％ の記号で書きます"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 19 L16 5 L19 5 L8 19 Z" fill="currentColor"/><circle cx="7" cy="8" r="2.2" fill="currentColor"/><circle cx="17" cy="16" r="2.2" fill="currentColor"/></svg></button>`],
];
// マス目でも使える記号（音につくもの）
const PAL_GRID = new Set(['装飾音符', 'トリル・トレモロ', '符頭・奏法', '指番号']);
function scPalette(gridMode = ui.view !== 'score') {
  let d = $('#dlgSym');
  if (!d) {
    document.body.insertAdjacentHTML('beforeend', '<dialog id="dlgSym" class="paldlg" aria-label="記号パレット"></dialog>');
    d = $('#dlgSym');
  }
  if (d.open && d.dataset.mode === (gridMode ? 'grid' : 'score')) { d.close(); return; }
  if (d.open) d.close();
  d.dataset.mode = gridMode ? 'grid' : 'score';
  let shut = {};
  try { shut = JSON.parse(lsGet('otsumiki-palshut', '') || '{"装飾音符":1,"指番号":1,"音を重ねる":1,"テキスト":1,"ピアノ":1,"オクターブ記号":1,"音部記号":1,"くり返し・D.C.":1}'); } catch (e) { shut = {}; }
  const sec = (name, inner) => `<details class="palsec" data-sec="${name}" ${shut[name] ? '' : 'open'}><summary>${name}</summary><div class="palgrid">${inner}</div></details>`;
  d.innerHTML = `<div class="palhead" title="ドラッグで動かせます"><b>記号</b><span class="muted">${gridMode ? '音をえらんでおす' : '音符をえらんでおす'}</span><button class="mini icon close" title="とじる（F9）">✕</button></div>
    <div class="palbody">
    ${PAL.map(([name, items]) => sec(name, items.map(([a, g, t]) => `<button class="palb" data-art="${a}" title="${t}">${palGlyph(g)}</button>`).join(''))).join('')}
    ${PAL_MORE.filter(([name]) => !gridMode || PAL_GRID.has(name)).map(([name, f]) => sec(name, f())).join('')}
    <button class="mini palclr" id="palClr" title="えらんだ音符の記号・強弱・スラーなどを消す">記号を消す</button>
    </div>`;
  d.querySelector('.close').onclick = () => d.close();
  d.querySelectorAll('[data-art]').forEach((b) => (b.onclick = () => scArt(b.dataset.art)));
  d.querySelectorAll('[data-gr]').forEach((b) => (b.onclick = () => { const v = b.dataset.gr; scGrace(/^-?\d+$/.test(v) ? +v : v); }));
  d.querySelectorAll('[data-tra]').forEach((b) => (b.onclick = () => ornTrill(+b.dataset.tra)));
  d.querySelectorAll('[data-trs]').forEach((b) => (b.onclick = () => ornTrem(b.dataset.trs === 'two' ? 'two' : +b.dataset.trs)));
  d.querySelectorAll('[data-nh]').forEach((b) => (b.onclick = () => ornHead(b.dataset.nh)));
  d.querySelectorAll('[data-look]').forEach((b) => (b.onclick = () => noteLook(b.dataset.look)));
  { const t = d.querySelector('#palTrl'); if (t) t.onclick = ornTrillLine; }
  d.querySelectorAll('[data-fg]').forEach((b) => (b.onclick = () => scFinger(+b.dataset.fg)));
  d.querySelectorAll('[data-iv]').forEach((b) => (b.onclick = () => scAddInterval(+b.dataset.iv)));
  d.querySelectorAll('[data-bar]').forEach((b) => (b.onclick = () => scBarMark(b.dataset.bar)));
  d.querySelectorAll('[data-jump]').forEach((b) => (b.onclick = () => { setJump(barOf(Math.min(ui.sc.cursor, totalTicks() - 1)), b.dataset.jump); renderScoreEdit(); }));
  const on = (id, fn) => { const el = d.querySelector('#' + id); if (el) el.onclick = fn; };
  on('palText', scStaffText);
  on('palInst', scInstChange);
  on('palReh', scRehearsal);
  on('palPed', scPedal);
  on('palMrep', scMeasureRepeat);
  d.querySelectorAll('[data-ott]').forEach((b) => (b.onclick = () => scOttava(+b.dataset.ott)));
  d.querySelectorAll('[data-clef]').forEach((b) => (b.onclick = () => scClefChange(b.dataset.clef)));
  $('#palClr').onclick = gridMode ? () => ornEdit((ns, tr) => {
    for (const n of ns) for (const k of ['art', 'fg', 'gr', 'grl', 'tra', 'trs', 'nh', 'sd', 'sm', 'col']) delete n[k];
    const a = Math.min(...ns.map((n) => n.s));
    const z = Math.max(...ns.map((n) => n.s + n.l));
    if (tr.trills) { tr.trills = tr.trills.filter((q) => q.e <= a || q.s >= z); if (!tr.trills.length) delete tr.trills; }
  }, '記号を消す') : scClearMarks;
  // ボタンをおしても、キー操作は楽譜にもどす
  d.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => b.blur()));
  d.querySelectorAll('details').forEach((x) => (x.ontoggle = () => { shut[x.dataset.sec] = x.open ? 0 : 1; lsSet('otsumiki-palshut', JSON.stringify(shut)); }));
  // 見出しをドラッグして動かす
  const head = d.querySelector('.palhead');
  head.onpointerdown = (e) => {
    if (e.target.closest('button') || document.body.classList.contains('phone')) return;
    const r = d.getBoundingClientRect();
    const ox = e.clientX - r.left;
    const oy = e.clientY - r.top;
    head.setPointerCapture(e.pointerId);
    head.onpointermove = (ev) => { palPlace(d, ev.clientX - ox, ev.clientY - oy); };
    head.onpointerup = () => { head.onpointermove = null; const rr = d.getBoundingClientRect(); lsSet('otsumiki-palpos', JSON.stringify([Math.round(rr.left), Math.round(rr.top)])); };
  };
  d.onclose = () => { const b = $('#scPalB'); if (b) b.classList.remove('on'); };
  d.show();
  const b0 = $('#scPalB');
  if (b0) b0.classList.add('on');
  if (!document.body.classList.contains('phone')) {
    let pos = null;
    try { pos = JSON.parse(lsGet('otsumiki-palpos', '') || 'null'); } catch (e) { pos = null; }
    const view = (gridMode ? $('#editorWrap') : $('#scoreEditView')).getBoundingClientRect();
    if (pos) palPlace(d, pos[0], pos[1]);
    else palPlace(d, innerWidth - d.offsetWidth - 16, Math.max(80, view.top + 8));
  } else { d.style.left = ''; d.style.top = ''; }
}
addEventListener('resize', () => setTimeout(() => {
  const d = $('#dlgSym');
  if (!d || !d.open) return;
  if (document.body.classList.contains('phone')) { d.style.left = d.style.top = d.style.right = d.style.maxHeight = ''; return; }
  const r = d.getBoundingClientRect();
  palPlace(d, r.left, r.top);
}, 50));
function palPlace(d, x, y) {
  d.style.left = clamp(x, 4, Math.max(4, innerWidth - d.offsetWidth - 4)) + 'px';
  const top = clamp(y, 4, Math.max(4, innerHeight - 180));
  d.style.top = top + 'px';
  d.style.right = 'auto';
  // 画面の下にはみ出さない（中はスクロール）
  d.style.maxHeight = Math.max(160, innerHeight - top - 8) + 'px';
}
// 装飾音符：dir=1 上のとなり、-1 下のとなり、0 消す
// 装飾音符：1＝上のとなりから、-1＝下のとなりから、0＝消す、'addUp'・'addDown'＝前にもう1つ足す、'long'＝長前打音（斜線なし）にする／もどす
function scGrace(dir) {
  ornEdit((ns) => {
    const tops = new Map();
    for (const n of ns) if (!tops.has(n.s) || tops.get(n.s).p < n.p) tops.set(n.s, n);
    if (dir === 'long') {
      const on = ![...tops.values()].every((n) => n.grl);
      for (const n of tops.values()) { if (n.gr == null) n.gr = stepAt(n.p, 1, n.s).p; const gl = grList(n); if (on && gl.length === 1) n.grl = true; else delete n.grl; }
      return;
    }
    if (dir === 'addUp' || dir === 'addDown') {
      for (const n of tops.values()) {
        const gl = grList(n);
        const base = gl.length ? gl[0] : n.p;
        const np = stepAt(base, dir === 'addUp' ? 1 : -1, n.s).p;
        const next = [np, ...gl].slice(0, 8);
        n.gr = next.length === 1 ? next[0] : next;
        delete n.grl;
      }
      return;
    }
    for (const n of ns) { delete n.gr; delete n.grl; }
    if (dir) for (const n of tops.values()) n.gr = stepAt(n.p, dir, n.s).p;
  }, '装飾音符');
}
// トリル：上の音の ♯・♭・♮（null＝調のまま）
function ornTrill(acc) {
  ornEdit((ns) => {
    const same = ns.every((n) => (n.art || []).includes('tr') && n.tra === acc);
    for (const n of ns) {
      n.art = (n.art || []).filter((x) => !['tr', 'prall', 'mord', 'turn', 'iturn', 'trem', 'trem2', 'gliss'].includes(x));
      delete n.tra;
      if (!same) { n.art.push('tr'); if (acc != null) n.tra = acc; }
      if (!n.art.length) delete n.art;
    }
  }, 'トリル');
}
// トリルの波線：えらんだ音のはじめから、おわりの音の終わりまで（もう一度で消す）
function ornTrillLine() {
  ornEdit((ns, tr) => {
    const a = Math.min(...ns.map((n) => n.s));
    const z = Math.max(...ns.map((n) => n.s + n.l));
    const had = (tr.trills || []).some((q) => q.s < z && q.e > a);
    tr.trills = (tr.trills || []).filter((q) => q.e <= a || q.s >= z);
    if (!had) {
      const q = { s: a, e: z };
      const first = ns.find((n) => n.s === a && n.tra != null);
      if (first) q.a = first.tra;
      for (const n of ns.filter((m) => m.s === a)) { delete n.tra; if (n.art) { n.art = n.art.filter((x) => x !== 'tr'); if (!n.art.length) delete n.art; } }
      tr.trills.push(q);
      tr.trills.sort((p, q2) => p.s - q2.s);
    }
    if (!tr.trills.length) delete tr.trills;
  }, 'トリルの波線');
}
// トレモロ：k＝斜線の数（1・2・3）。'two'＝2つの音のトレモロ（つぎの音と交互に）
function ornTrem(k) {
  ornEdit((ns) => {
    const kind = k === 'two' ? 'trem2' : 'trem';
    let tg = ns;
    if (kind === 'trem2') {
      // えらんだ中のさいごの音は「あいて」なので、記号をつけない
      const starts = [...new Set(ns.map((n) => n.s))].sort((a, b) => a - b);
      if (starts.length > 1) tg = ns.filter((n) => n.s !== starts[starts.length - 1]);
    }
    const kk = kind === 'trem' ? k : 3;
    const same = tg.every((n) => (n.art || []).includes(kind) && (n.trs || 3) === kk);
    for (const n of tg) {
      n.art = (n.art || []).filter((x) => !['tr', 'prall', 'mord', 'turn', 'iturn', 'trem', 'trem2', 'gliss'].includes(x));
      delete n.trs;
      if (!same) { n.art.push(kind); if (kk !== 3) n.trs = kk; }
      if (!n.art.length) delete n.art;
    }
  }, 'トレモロ');
}
// 音符の見た目：ぼうの向き（up・dn）、小さい音符（sm）、色（col:red など）。同じものをもう一度おすと、もとにもどる
function noteLook(kind) {
  ornEdit((ns) => {
    if (kind === 'up' || kind === 'dn') {
      const v = kind === 'up' ? 1 : -1;
      const same = ns.every((n) => n.sd === v);
      // 同じときに鳴る音（和音）は、ぼうが1本なので、いっしょに変える
      const tr = track();
      const starts = new Set(ns.map((n) => n.s + ':' + voiceOf(n)));
      for (const n of tr.notes) if (starts.has(n.s + ':' + voiceOf(n))) { if (same) delete n.sd; else n.sd = v; }
    } else if (kind === 'sm') {
      const same = ns.every((n) => n.sm);
      const tr = track();
      const starts = new Set(ns.map((n) => n.s + ':' + voiceOf(n)));
      for (const n of tr.notes) if (starts.has(n.s + ':' + voiceOf(n))) { if (same) delete n.sm; else n.sm = true; }
    } else if (kind.startsWith('col:')) {
      const c = kind.slice(4);
      const same = ns.every((n) => n.col === c);
      for (const n of ns) { if (same) delete n.col; else n.col = c; }
    }
  }, '音符の見た目');
}
// 符頭の形：'diamond'（ハーモニクス）・'x'・''（ふつう）
function ornHead(kind) {
  ornEdit((ns) => {
    const same = kind && ns.every((n) => n.nh === kind);
    for (const n of ns) { if (!kind || same) delete n.nh; else n.nh = kind; }
  }, '符頭');
}
// 記号をつける：楽譜ではえらんだ音符に、マス目ではえらんだ音に
function ornEdit(fn, label) {
  if (ui.view === 'score') return scEditSel(fn, label);
  const tr = track();
  if (!tr || tr.type !== 'melody') return toast('記号をつけられるのは、メロディのトラックの音です');
  if (locked(tr)) return toast('このトラックはロックされています');
  const ns = tr.notes.filter((n) => nsel.has(n));
  if (!ns.length) return toast('先に音をえらんでください（音をおす、またはドラッグでかこむ）');
  edit(() => { fn(ns, tr); }, label);
  draw();
  updateSelBar();
}
function scFinger(k) {
  ornEdit((ns) => {
    const all = ns.every((n) => n.fg === String(k));
    for (const n of ns) { if (!k || all) delete n.fg; else n.fg = String(k); }
  }, '指番号');
}
// えらんだ音に、音階で k 度はなれた音を足す（MuseScore の Alt＋数字）
function scAddInterval(k) {
  const tr = scEditable();
  if (!tr) return;
  let ns = selNotes(tr);
  if (!ns.length && ui.sc.lastIns && ui.sc.lastIns.p != null) ns = tr.notes.filter((n) => n.s === ui.sc.lastIns.t && n.p === ui.sc.lastIns.p);
  if (!ns.length) return toast('先に音符をえらんでください');
  const added = [];
  edit(() => {
    const byS = new Map();
    for (const n of ns) { const o = byS.get(n.s); if (!o || (k > 0 ? n.p > o.p : n.p < o.p)) byS.set(n.s, n); }
    for (const n of byS.values()) {
      let p = n.p;
      if (Math.abs(k) === 8) p += k > 0 ? 12 : -12;
      else for (let i = 1; i < Math.abs(k); i++) p = diatonicStep(p, Math.sign(k));
      p = clamp(p, 21, 108);
      if (tr.notes.some((m) => m.s === n.s && m.p === p)) continue;
      const nn = { s: n.s, p, l: n.l, ...(n.v === 2 ? { v: 2 } : {}) };
      tr.notes.push(nn);
      added.push(nn);
    }
  }, '音を重ねる');
  if (added.length) {
    preview(tr, added[0].p, 0.3);
    ui.sc.sel = new Set(added.map((n) => n.s + ':' + n.p));
    ui.sc.lastIns = { t: added[0].s, d: added[0].l, p: added[0].p };
  }
  renderScoreEdit();
}
// オクターブ記号：えらんだ音符のはじめから、さいごの音符のおわりまで（k=1 8va、-1 8vb、2 15ma、0 消す）
function scOttava(k) {
  const tr = scEditable();
  if (!tr) return;
  const r = selRange(tr);
  if (!r) return toast('オクターブ記号をつける音符をえらんでください（Shift＋クリックで、はんい）');
  edit(() => {
    tr.ottava = (tr.ottava || []).filter((x) => x.e <= r.s || x.s >= r.end);
    if (k) tr.ottava.push({ s: r.s, e: r.end, k });
    tr.ottava.sort((a, b) => a.s - b.s);
    if (!tr.ottava.length) delete tr.ottava;
  }, k ? 'オクターブ記号' : 'オクターブ記号を消す');
  renderScoreEdit();
}
// 音部記号：カーソル（えらんだ音符）の小節から変える。1小節目なら、そのパートの音部記号
function scClefChange(clef) {
  const tr = scEditable();
  if (!tr) return;
  const r = selRange(tr);
  const b = barOf(Math.min(r ? r.s : ui.sc.cursor, totalTicks() - 1));
  if (b === 0) {
    const S = scoreSettings();
    S.clefs[tr.id] = clef || 'auto';
    autosaveSoon();
    toast(clef ? 'このパートの音部記号を変えました' : '音部記号を自動にもどしました');
  } else {
    edit(() => {
      tr.clefChg = { ...(tr.clefChg || {}) };
      if (clef) tr.clefChg[b] = clef; else delete tr.clefChg[b];
      if (!Object.keys(tr.clefChg).length) delete tr.clefChg;
    }, '音部記号');
    toast(clef ? `${b + (song.pickup ? 0 : 1)}小節目から音部記号を変えました` : '音部記号の変化を消しました');
  }
  renderScoreEdit();
}
// 小節のくり返し記号：カーソルの小節を「前の小節と同じ」にする（もう一度おすと記号をやめる。音はそのまま）
function scMeasureRepeat() {
  const tr = scEditable();
  if (!tr) return;
  const b = barOf(Math.min(ui.sc.cursor, totalTicks() - 1));
  if (b === 0) return toast('1小節目には使えません（前の小節がありません）');
  if (barLen(b) !== barLen(b - 1)) return toast('前の小節と拍子がちがうので使えません');
  if (tr.mrep && tr.mrep[b]) {
    edit(() => { delete tr.mrep[b]; if (!Object.keys(tr.mrep).length) delete tr.mrep; }, 'くり返し記号をやめる');
  } else {
    const a = barStart(b - 1);
    const d = barStart(b) - a;
    edit(() => {
      tr.notes = tr.notes.filter((n) => n.s < barStart(b) || n.s >= barStart(b + 1));
      for (const n of tr.notes) if (n.s < barStart(b) && n.s + n.l > barStart(b)) n.l = barStart(b) - n.s;
      for (const n of tr.notes.filter((m) => m.s >= a && m.s < a + d)) tr.notes.push({ ...n, s: n.s + d, l: Math.min(n.l, a + d - n.s) });
      tr.mrep = { ...(tr.mrep || {}), [b]: 1 };
    }, 'くり返し記号');
    toast(`${b + (song.pickup ? 0 : 1)}小節目を「前の小節と同じ」にしました`);
  }
  renderScoreEdit();
}
// ペダル：えらんだ音符のはじめから、さいごの音符のおわりまで
function scPedal() {
  const tr = scEditable();
  if (!tr) return;
  const r = selRange(tr);
  if (!r) return toast('ペダルをかける音符をえらんでください（Shift＋クリックで、はんい）');
  edit(() => {
    tr.pedals = (tr.pedals || []).filter((x) => x.e <= r.s || x.s >= r.end);
    tr.pedals.push({ s: r.s, e: r.end });
    tr.pedals.sort((a, b) => a.s - b.s);
  }, 'ペダル');
  renderScoreEdit();
}
function scStaffText() {
  const tr = scEditable();
  if (!tr) return;
  const r = selRange(tr);
  const t = r ? r.s : ui.sc.cursor;
  const old = (tr.texts || []).find((x) => x.t === t);
  const v = prompt('音の上に書くことば（れい：やさしく、dolce、pizz.、arco）\n空にすると消します', old ? old.x : '');
  if (v === null) return;
  edit(() => {
    tr.texts = (tr.texts || []).filter((x) => x.t !== t);
    if (v.trim()) tr.texts.push({ t, x: v.trim().slice(0, 80) });
    tr.texts.sort((a, b) => a.t - b.t);
    if (!tr.texts.length) delete tr.texts;
  }, '譜表テキスト');
  renderScoreEdit();
}
// 楽器の持ちかえ：カーソル（えらんだ音）の所から、ちがう楽器の音にする
function scInstChange() {
  const tr = scEditable();
  if (!tr || tr.type !== 'melody') return;
  const r = selRange(tr);
  const t = r ? r.s : ui.sc.cursor;
  if (t == null) return toast('持ちかえる所の音符をえらんでください');
  const old = (tr.instChg || []).find((x) => x.t === t);
  const cur = instAt(tr, t);
  let dlg = $('#dlgInstChg');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.id = 'dlgInstChg';
    dlg.className = 'dlg small';
    document.body.appendChild(dlg);
  }
  const b = barOf(t);
  dlg.innerHTML = `<h3>楽器の持ちかえ</h3><p class="muted">${b + 1}小節目のここから、ちがう楽器の音で鳴らします。楽譜には「○○ に持ちかえ」と出ます。</p>
    <label>ここからの楽器 <select id="icSel">${Object.entries(Sound.INSTRUMENTS).map(([id, nm]) => `<option value="${id}"${id === cur ? ' selected' : ''}>${escapeHtml(nm)}${id === tr.inst ? '（もとの楽器）' : ''}</option>`).join('')}</select></label>
    <div class="btnrow" style="margin-top:12px"><button class="mini" id="icTry">ためしに聞く</button><span class="grow"></span>${old ? '<button class="mini" id="icDel">持ちかえを消す</button>' : ''}<button class="mini" id="icNo">やめる</button><button class="mini accent" id="icOk">決める</button></div>`;
  const sel = dlg.querySelector('#icSel');
  const set = (inst) => {
    edit(() => {
      tr.instChg = (tr.instChg || []).filter((x) => x.t !== t);
      if (inst && inst !== instAt(tr, t)) tr.instChg.push({ t, inst });
      tr.instChg.sort((a, c) => a.t - c.t);
      // つづけて同じ楽器になる持ちかえは、いらない
      let prev = tr.inst;
      tr.instChg = tr.instChg.filter((x) => { const keep = x.inst !== prev; if (keep) prev = x.inst; return keep; });
      if (!tr.instChg.length) delete tr.instChg;
    }, '楽器の持ちかえ');
    dlg.close();
    preloadSamples();
    renderScoreEdit();
  };
  dlg.querySelector('#icTry').onclick = () => { const ctx = ensureAudio(); const go = () => Sound.playNote(ctx, ctx._comp || ctx.destination, sel.value, 67, ctx.currentTime + 0.05, 0.6, 0.8, tr.real !== false); if (Sound.Samples.has(sel.value) && !Sound.Samples.ready(sel.value)) Sound.Samples.load(sel.value, ctx, [67]).then(go, go); else go(); };
  dlg.querySelector('#icNo').onclick = () => dlg.close();
  dlg.querySelector('#icOk').onclick = () => set(sel.value);
  if (old) dlg.querySelector('#icDel').onclick = () => set(null);
  dlg.showModal();
}
function scRehearsal() {
  const tr = track();
  const r = tr.type === 'melody' ? selRange(tr) : null;
  const b = barOf(Math.min(r ? r.s : ui.sc.cursor, totalTicks() - 1));
  const R = song.rehearsal || {};
  edit(() => {
    if (R[b] != null) delete R[b];
    else {
      const before = Object.keys(R).filter((k) => +k < b).length;
      R[b] = before < 26 ? String.fromCharCode(65 + before) : String(before + 1);
      // うしろの記号は、A・B・C… の順にふりなおす
      let i = 0;
      for (const k of Object.keys(R).map(Number).sort((x, y) => x - y)) { if (/^[A-Z]$/.test(R[k])) R[k] = String.fromCharCode(65 + Math.min(25, i)); i++; }
    }
    song.rehearsal = R;
    if (!Object.keys(R).length) delete song.rehearsal;
  }, 'リハーサル記号');
  renderScoreEdit();
}
// 歌詞：楽譜の上で、そのまま打つ（MuseScore・Dorico と同じ）
//   スペース・Tab＝つぎの音へ  -＝ハイフンでつないでつぎへ  Shift+スペース＝まえの音へ  Enter・Esc＝おわる
function lyrOnsets(tr) { return [...new Set(tr.notes.filter((n) => n.v !== 2).map((n) => n.s))].sort((a, b) => a - b); }
function lyrTop(tr, t) { return tr.notes.filter((n) => n.s === t && n.v !== 2).sort((a, b) => b.p - a.p)[0]; }
function scLyric() {
  const tr = scEditable();
  if (!tr) return;
  const ns = selNotes(tr);
  const ons = lyrOnsets(tr);
  const t = ns.length ? Math.min(...ns.map((n) => n.s)) : ons.find((x) => x >= ui.sc.cursor);
  if (t == null || !lyrTop(tr, t)) return toast('歌詞をつける音符をえらんでください');
  lyrOpen(t);
}
function lyrOpen(t) {
  document.querySelector('#scoreEditView .scpos')?.remove();
  const tr = track();
  // 歌詞を打っているとちゅうで、コードやリズムのトラックに切りかわったときは、とじる
  if (!tr || tr.type !== 'melody') return lyrClose();
  const top = lyrTop(tr, t);
  if (!top) return lyrClose();
  ui.sc.lyr = { t, tid: tr.id, v: (ui.sc.lyr && ui.sc.lyr.tid === tr.id && ui.sc.lyr.v) || 1 };
  ui.sc.cursor = t;
  ui.sc.sel = new Set([t + ':' + top.p]);
  ui.sc.selByInput = false;
  let box = $('#lyrEd');
  if (!box) {
    box = document.createElement('div');
    box.id = 'lyrEd';
    box.className = 'lyred';
    box.innerHTML = `<button class="mini lyrv" data-v="1" title="何番の歌詞か（おすと 1番→2番→3番。キーは ↑・↓）">1番</button><button class="mini" data-d="-1" title="まえの音（Shift+スペース）" aria-label="まえの音">◀</button><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="歌詞"><button class="mini" data-d="1" title="つぎの音（スペース）" aria-label="つぎの音">▶</button><button class="mini" data-d="0" title="おわる（Enter）" aria-label="おわる">✓</button>`;
    document.body.appendChild(box);
    const inp = box.querySelector('input');
    box.querySelectorAll('button').forEach((b) => {
      b.onpointerdown = (e) => e.preventDefault(); // 入力欄からフォーカスをはずさない
      b.onclick = () => { if (b.dataset.v) return lyrVerse(((ui.sc.lyr.v || 1) % 3) + 1); const d = +b.dataset.d; if (d) lyrStep(d, false); else { lyrCommit(); lyrClose(); } };
    });
    inp.addEventListener('keydown', (e) => {
      if (e.isComposing || e.keyCode === 229) return; // かな漢字変換のとちゅう
      const k = e.key;
      if (k === ' ' || k === 'Tab') { e.preventDefault(); lyrStep(e.shiftKey ? -1 : 1, false); }
      else if (k === '-' && inp.value.trim() && inp.selectionStart === inp.value.length) { e.preventDefault(); lyrStep(1, true); }
      else if (k === 'ArrowRight' && inp.selectionStart === inp.value.length && (e.ctrlKey || e.metaKey || !inp.value)) { e.preventDefault(); lyrStep(1, false); }
      else if (k === 'ArrowLeft' && inp.selectionStart === 0 && (e.ctrlKey || e.metaKey || !inp.value)) { e.preventDefault(); lyrStep(-1, false); }
      else if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); lyrVerse(clamp((ui.sc.lyr.v || 1) + (k === 'ArrowDown' ? 1 : -1), 1, 3)); }
      else if (k === 'Enter') { e.preventDefault(); lyrCommit(); lyrClose(); }
      else if (k === 'Escape') { e.preventDefault(); lyrClose(); }
      e.stopPropagation();
    });
    // 全角スペースで次へ（日本語入力のまま打てるように）
    inp.addEventListener('input', () => { if (/[　 ]/.test(inp.value)) { inp.value = inp.value.replace(/[　 ]+/g, ''); lyrStep(1, false); return; } lyrFit(); });
    inp.addEventListener('blur', () => setTimeout(() => { if (ui.sc.lyr && document.activeElement !== inp) { lyrCommit(); lyrClose(); } }, 150));
  }
  const inp = box.querySelector('input');
  inp.value = top[lyKey(ui.sc.lyr.v)] || '';
  box.querySelector('.lyrv').textContent = ui.sc.lyr.v + '番';
  box.hidden = false;
  lyrFit();
  renderScoreEditNow();
  lyrPlace();
  inp.focus();
  inp.select();
}
function lyrCommit(hy) {
  const L = ui.sc.lyr;
  const box = $('#lyrEd');
  if (!L || !box) return;
  const tr = song.tracks.find((x) => x.id === L.tid);
  const top = tr && lyrTop(tr, L.t);
  if (!top) return;
  let v = box.querySelector('input').value.trim().slice(0, 20);
  if (hy && v && !/-$/.test(v)) v += '-';
  const k = lyKey(L.v || 1);
  if ((top[k] || '') === v) return;
  edit(() => { for (const n of tr.notes) if (n.s === L.t && n !== top) delete n[k]; if (v) top[k] = v; else delete top[k]; if (k === 'ly') tr.lyrics = ''; }, '歌詞');
}
// 何番の歌詞を打つか、切りかえる
function lyrVerse(v) {
  const L = ui.sc.lyr;
  if (!L || v === (L.v || 1)) return;
  lyrCommit();
  L.v = v;
  lyrOpen(L.t);
}
function lyrStep(d, hy) {
  const L = ui.sc.lyr;
  if (!L) return;
  lyrCommit(hy);
  const tr = song.tracks.find((x) => x.id === L.tid);
  const ons = tr ? lyrOnsets(tr) : [];
  const nx = d > 0 ? ons.find((x) => x > L.t) : [...ons].reverse().find((x) => x < L.t);
  if (nx == null) { if (d > 0) { toast('さいごの音です'); } lyrOpen(L.t); return; }
  lyrOpen(nx);
}
function lyrFit() { const inp = $('#lyrEd input'); if (inp) inp.style.width = Math.max(3, Math.min(12, [...inp.value].reduce((w, c) => w + (c.charCodeAt(0) > 255 ? 1.1 : 0.62), 0.6))) + 'em'; }
function lyrClose() {
  const box = $('#lyrEd');
  if (box) box.hidden = true;
  if (!ui.sc.lyr) return;
  ui.sc.lyr = null;
  renderScoreEdit();
}
// 入力欄を、その音符の歌詞の高さに置く
function lyrPlace() {
  const L = ui.sc.lyr;
  const box = $('#lyrEd');
  const view = $('#scoreEditView');
  if (!L || !box || !view) return;
  const pi = scoreParts.indexOf(track());
  const head = view.querySelector(`.nh[data-pi="${pi}"][data-s="${L.t}"]`);
  if (!head) { box.style.left = '50%'; box.style.top = '40%'; return; }
  let r = head.getBoundingClientRect();
  // 見えていなければスクロール
  const vr = view.getBoundingClientRect();
  if (r.top < vr.top + 10 || r.bottom > vr.bottom - 60) { view.scrollTop += r.top - vr.top - vr.height / 3; r = head.getBoundingClientRect(); }
  let y = r.bottom + 30;
  const lines = [...view.querySelectorAll(`.lyrbase[data-pi="${pi}"]`)].map((el) => el.getBoundingClientRect().top).filter((ly) => ly > r.top - 4);
  if (lines.length) y = Math.min(...lines);
  const w = box.offsetWidth || 200;
  const cx = (r.left + r.right) / 2;
  const inpEl = box.querySelector('input');
  const off = inpEl.offsetLeft + inpEl.offsetWidth / 2;
  box.style.left = clamp(cx - off, 4, innerWidth - w - 4) + 'px';
  box.style.top = clamp(y - 16, 4, innerHeight - 40) + 'px';
}
// コードネーム（れい：Am7, F#m, B♭）→ コード伴奏トラックへ
function parseChord(txt) {
  const m = String(txt).trim().match(/^([A-Ga-g])([#♯b♭]?)(.*)$/);
  if (!m) return null;
  let r = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1].toUpperCase()];
  if (m[2] === '#' || m[2] === '♯') r++;
  if (m[2] === 'b' || m[2] === '♭') r--;
  const rest = m[3].replace(/[\s()]/g, '').replace(/♭/g, 'b').replace(/♯/g, '#').replace(/-5/, 'b5');
  const q = { '': 'M', M: 'M', maj: 'M', m: 'm', min: 'm', 7: '7', M7: 'M7', maj7: 'M7', m7: 'm7', sus4: 'sus4', dim: 'dim', aug: 'aug', '+': 'aug',
    6: '6', m6: 'm6', add9: 'add9', 9: '9', M9: 'M9', maj9: 'M9', m9: 'm9', '7sus4': '7sus4', m7b5: 'm7b5', 'ø': 'm7b5', 'ø7': 'm7b5', dim7: 'dim7', mM7: 'mM7', mmaj7: 'mM7', '7b9': '7b9', '7#9': '7s9' }[rest];
  if (!q) return null;
  return { r: (r + 12) % 12, q };
}
// コードを入れる：楽譜の上に小さなパネル。よく使うコードをおすだけ・打ってもOK（Am7 など）。入れると次の小節へ
function scChord() { chordPick(barOf(Math.min(ui.sc.cursor || 0, totalTicks() - 1)), 0); }
function chordPick(bar, o) {
  bar = clamp(bar, 0, song.bars - 1);
  o = o || 0;
  // 1小節にいくつ入れるか（前のえらび方をおぼえておく）。もう入っているコードや、おした位置に合わせる
  let per = ui.chdPer || 1;
  const ct = chordTrackOf();
  const offs = chordSegs(ct && ct.chords[bar], bar).map((x) => x.o).concat(o);
  const fits = (p) => offs.every((x) => chordPosList(bar, p).includes(x));
  if (!fits(per)) per = fits(2) ? 2 : 'b';
  ui.chd = { bar, o, per, root: null };
  document.querySelector('#scoreEditView .scpos')?.remove();
  let box = $('#chdEd');
  if (!box) {
    box = document.createElement('div');
    box.id = 'chdEd';
    box.className = 'chded';
    document.body.appendChild(box);
  }
  box.hidden = false;
  chordPickRender(true);
}
/* ---------- 段組み：1段の小節数・詰まり具合・段の幅・改行・横に1列（右へ進む） ---------- */
function scLayoutPop(anchor) {
  let box = $('#layPop');
  if (!box) { box = document.createElement('div'); box.id = 'layPop'; box.className = 'laypop'; document.body.appendChild(box); }
  if (!box.hidden && box._open) { box.hidden = true; box._open = false; return; }
  const S = scoreSettings();
  const render = () => {
    const brk = Array.isArray(S.breaks) ? S.breaks : [];
    const cb = barOf(Math.min(ui.sc.cursor || 0, totalTicks() - 1));
    const has = brk.includes(cb);
    const h = layout.scFlow === 'h';
    const fitW = Math.round($('#scoreEditView').clientWidth - 8);
    box.innerHTML = `<div class="lphead"><b>段組み</b><button class="mini close" data-x="close" aria-label="とじる">✕</button></div>
      <div class="lprow"><label>ならべ方</label><span class="seg"><button class="mini ${h ? '' : 'on'}" data-flow="wrap" title="段をかえて、下へ進む（ふつうの楽譜）">改行して下へ</button><button class="mini ${h ? 'on' : ''}" data-flow="h" title="1つの長い段で、右へ進んでいく（フルスコアを見るときなど）">横に1列（右へ）</button></span></div>
      <div class="lprow ${h ? 'off' : ''}"><label>1段の小節数</label><span class="seg">${[0, 2, 3, 4, 5, 6, 8].map((n) => `<button class="mini ${(+S.perLine || 0) === n ? 'on' : ''}" data-per="${n}">${n ? n : '自動'}</button>`).join('')}</span></div>
      <div class="lprow"><label>詰まり具合</label><small>つめる</small><input type="range" id="lpSpc" min="0.5" max="2" step="0.05" value="${+S.spacing || 1}"><small>ゆったり</small><button class="mini" data-spc="1" title="ふつうにもどす">ふつう</button></div>
      <div class="lprow ${h ? 'off' : ''}"><label>段の幅</label><input type="range" id="lpW" min="420" max="${Math.max(2400, fitW)}" step="10" value="${layout.scW || fitW}"><span class="lpval">${layout.scW ? layout.scW + 'px' : '画面に合わせる'}</span><button class="mini" data-w="fit">画面に合わせる</button></div>
      <div class="lprow ${h ? 'off' : ''}"><label>改行</label><button class="mini ${has ? 'on' : ''}" data-brk="1" ${cb === 0 ? 'disabled' : ''} title="カーソルのある小節（${cb + 1}小節）の前で、段をかえる">${has ? '✓ ' : ''}${cb + 1}小節の前で改行</button>${brk.length ? `<button class="mini" data-brk="clear">改行をぜんぶ消す（${brk.length}）</button>` : ''}</div>
      <p class="muted small">印刷・PDF の楽譜にも、1段の小節数・詰まり具合・改行が使われます。</p>`;
    box.querySelector('[data-x="close"]').onclick = () => { box.hidden = true; box._open = false; };
    box.querySelectorAll('[data-flow]').forEach((b) => (b.onclick = () => { layout.scFlow = b.dataset.flow === 'h' ? 'h' : undefined; saveLayout(); ui.sc.scrollTo = true; renderScoreEdit(); render(); }));
    box.querySelectorAll('[data-per]').forEach((b) => (b.onclick = () => { edit(() => { S.perLine = +b.dataset.per; }, '1段の小節数'); renderScoreEdit(); render(); }));
    const spc = box.querySelector('#lpSpc');
    let spSnap = null;
    spc.onpointerdown = spc.onfocus = () => { spSnap = spSnap || snapshot(); };
    spc.oninput = () => { S.spacing = +spc.value; renderScoreEdit(); };
    spc.onchange = () => { if (spSnap && snapshot() !== spSnap) pushUndo(spSnap, '詰まり具合'); spSnap = null; changed(); };
    box.querySelector('[data-spc]').onclick = () => { edit(() => { S.spacing = 1; }, '詰まり具合'); renderScoreEdit(); render(); };
    const wr = box.querySelector('#lpW');
    wr.oninput = () => { layout.scW = +wr.value; box.querySelector('.lpval').textContent = layout.scW + 'px'; renderScoreEdit(); };
    wr.onchange = () => saveLayout();
    box.querySelector('[data-w="fit"]').onclick = () => { delete layout.scW; saveLayout(); renderScoreEdit(); render(); };
    box.querySelectorAll('[data-brk]').forEach((b) => (b.onclick = () => {
      edit(() => {
        if (b.dataset.brk === 'clear') { delete S.breaks; return; }
        const list = new Set(Array.isArray(S.breaks) ? S.breaks : []);
        if (list.has(cb)) list.delete(cb); else list.add(cb);
        S.breaks = [...list].sort((x, y) => x - y);
        if (!S.breaks.length) delete S.breaks;
      }, '改行');
      renderScoreEdit();
      render();
    }));
  };
  render();
  box.hidden = false;
  box._open = true;
  box._render = render;
  const r = anchor.getBoundingClientRect();
  box.style.left = clamp(r.left - 100, 4, innerWidth - box.offsetWidth - 4) + 'px';
  box.style.top = clamp(r.bottom + 6, 4, innerHeight - box.offsetHeight - 4) + 'px';
  const outside = (ev) => { if (box.hidden) { document.removeEventListener('pointerdown', outside, true); return; } if (!box.contains(ev.target) && ev.target !== anchor && !(ev.target.closest && ev.target.closest('#scoreEditView'))) { document.removeEventListener('pointerdown', outside, true); box.hidden = true; box._open = false; } };
  setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
}

/* ---------- 曲名・サブタイトル・作詞・作曲を、楽譜の上で書きかえる（作詞・作曲などは、いるときだけ足す） ---------- */
function titleEdit(want) {
  let box = $('#titleEd');
  if (!box) { box = document.createElement('div'); box.id = 'titleEd'; box.className = 'titleed'; document.body.appendChild(box); }
  const S = scoreSettings();
  const snap = snapshot();
  const shown = new Set(['subtitle', 'lyricist', 'composer'].filter((k) => S[k]));
  if (want === 'credit') { shown.add('lyricist'); shown.add('composer'); }
  const LBL = { subtitle: 'サブタイトル', lyricist: '作詞', composer: '作曲' };
  const draw = (focusKey) => {
    box.innerHTML = `<div class="ttlrow"><label>曲名</label><input data-k="title" value="${escapeHtml(song.title)}" maxlength="120"></div>
      ${['subtitle', 'lyricist', 'composer'].filter((k) => shown.has(k)).map((k) => `<div class="ttlrow"><label>${LBL[k]}</label><input data-k="${k}" value="${escapeHtml(S[k] || '')}" maxlength="80"><button class="mini" data-del="${k}" title="${LBL[k]}を消す" aria-label="${LBL[k]}を消す">✕</button></div>`).join('')}
      <div class="ttladd">${['subtitle', 'lyricist', 'composer'].filter((k) => !shown.has(k)).map((k) => `<button class="mini" data-add="${k}">＋ ${LBL[k]}</button>`).join('')}<span class="grow"></span><button class="mini accent" data-x="ok">OK</button></div>`;
    box.querySelectorAll('input').forEach((inp) => {
      inp.oninput = () => {
        const k = inp.dataset.k;
        if (k === 'title') song.title = inp.value.slice(0, 120); else S[k] = inp.value.slice(0, 80);
        renderScoreEdit();
        setText($('#miniTitle'), song.title || '');
      };
      inp.onkeydown = (e) => { e.stopPropagation(); if (e.isComposing || e.keyCode === 229) return; if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); titleClose(); } };
    });
    box.querySelectorAll('[data-add]').forEach((b) => (b.onclick = () => { shown.add(b.dataset.add); draw(b.dataset.add); }));
    box.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { const k = b.dataset.del; S[k] = ''; shown.delete(k); renderScoreEdit(); draw(); }));
    box.querySelector('[data-x="ok"]').onclick = titleClose;
    const f = box.querySelector(`input[data-k="${focusKey || 'title'}"]`);
    if (f) { f.focus(); if (!focusKey) f.select(); }
  };
  box._snap = snap;
  box.hidden = false;
  draw(want === 'credit' ? 'lyricist' : null);
  // おした直後に楽譜のほうへ入力が行かないよう、少しあとで入力欄へ
  setTimeout(() => { const f = box.querySelector(`input[data-k="${want === 'credit' ? 'lyricist' : 'title'}"]`); if (f && !box.hidden) { f.focus(); if (want !== 'credit') f.select(); } }, 40);
  // 曲名の下あたりに置く
  const svg = $('#scoreEditView svg');
  const r = svg ? svg.getBoundingClientRect() : { left: 100, top: 120, width: 600 };
  box.style.left = clamp(r.left + r.width / 2 - box.offsetWidth / 2, 4, innerWidth - box.offsetWidth - 4) + 'px';
  box.style.top = clamp(r.top + 46, 4, innerHeight - box.offsetHeight - 4) + 'px';
  // パネルの外をおしたら、とじる
  const outside = (e) => { if (box.hidden) { document.removeEventListener('pointerdown', outside, true); return; } if (!box.contains(e.target) && !(e.target.closest && e.target.closest('.sctitle'))) { document.removeEventListener('pointerdown', outside, true); titleClose(); } };
  setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
}
function titleClose() {
  const box = $('#titleEd');
  if (!box || box.hidden) return;
  box.hidden = true;
  if (!song.title.trim()) song.title = 'あたらしい曲';
  if (box._snap && snapshot() !== box._snap) pushUndo(box._snap, '曲名・作詞・作曲');
  box._snap = null;
  changed();
  renderSettings();
  renderScoreEdit();
}
function chordPickClose() {
  const box = $('#chdEd');
  if (box) box.hidden = true;
  ui.chd = null;
  renderScoreEdit();
}
const chordTrackOf = () => song.tracks.find((t) => t.type === 'chord');
function chordPickRender(focus) {
  const box = $('#chdEd');
  const S = ui.chd;
  if (!box || !S) return;
  const ct = chordTrackOf();
  const c = ct && ct.chords[S.bar];
  const segs = chordSegs(c, S.bar);
  const posL = chordPosList(S.bar, S.per);
  if (!posL.includes(S.o)) S.o = 0;
  const cur = (segs.find((x) => x.o === S.o) || {}).c;
  const bs = beatAt(S.bar);
  const at = (o) => { const sg = segs.filter((x) => x.o <= o).pop(); return sg ? { name: chordName(sg.c), own: sg.o === o } : null; };
  const posName = (o) => (o % bs === 0 ? `${o / bs + 1}拍目` : `${Math.floor(o / bs) + 1}拍目のウラ`);
  const dia = diatonic(barStart(S.bar));
  const num = S.bar + (song.pickup ? 0 : 1);
  const curRoot = S.root != null ? S.root : cur ? cur.r : null;
  box.innerHTML = `<div class="chdhead"><button class="mini" data-nav="-1" title="まえの小節" aria-label="まえの小節">◀</button><b>${num}小節目</b><button class="mini" data-nav="1" title="つぎの小節" aria-label="つぎの小節">▶</button>
      <span class="muted small">1小節に</span><span class="seg"><button class="mini ${S.per === 1 ? 'on' : ''}" data-per="1">1つ</button><button class="mini ${S.per === 2 ? 'on' : ''}" data-per="2">2つ</button><button class="mini ${S.per === 'b' ? 'on' : ''}" data-per="b" title="1拍に1つずつ">拍ごと</button></span>
      <span class="chdnow">${c ? escapeHtml(chordLabel(c)) : '<small class="muted">まだなし</small>'}</span>
      <button class="mini close" data-x="close" title="とじる（Esc）" aria-label="とじる">✕</button></div>
    ${S.per !== 1 ? `<div class="chdpos">${posL.map((o) => { const a = at(o); return `<button class="${o === S.o ? 'on' : ''} ${a && a.own ? 'own' : ''}" data-o="${o}" title="${posName(o)}に入れる"><small>${posName(o)}</small><b>${a ? (a.own ? escapeHtml(a.name) : '<span class="muted">〃</span>') : '<span class="muted">－</span>'}</b></button>`; }).join('')}</div>` : ''}
    <div class="chdrow">${dia.map((d, i) => `<button class="chordbtn" data-i="${i}" style="--pc:${PC_COLORS[d.r]}"><b>${chordName(d)}</b><small>${d.deg}</small></button>`).join('')}<button class="chordbtn none" data-i="-1"><b>なし</b><small>消す</small></button></div>
    <div class="chdtype"><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="打って入れる：Am7・F#m・B♭" aria-label="コードネームを打つ"><small class="muted">Enter・スペースで次へ</small></div>
    <details class="chdmore" ${S.more ? 'open' : ''}><summary>ほかのコード（根音 → 種類）</summary>
      <div class="chdroots">${CHORD_ROOT.map((n, i) => `<button class="mini ${curRoot === i ? 'on' : ''}" data-r="${i}">${n}</button>`).join('')}</div>
      <div class="chdqs">${Object.entries(CHORD_Q).map(([k, v]) => `<button class="mini" data-q="${k}" ${curRoot == null ? 'disabled' : ''}>${curRoot != null ? CHORD_ROOT[curRoot] : ''}${v.s || ''}</button>`).join('')}</div>
    </details>`;
  const inp = box.querySelector('input');
  box.querySelectorAll('[data-nav]').forEach((b) => (b.onclick = () => { S.bar = clamp(S.bar + +b.dataset.nav, 0, song.bars - 1); S.root = null; chordPickShow(); }));
  box.querySelectorAll('[data-per]').forEach((b) => (b.onclick = () => { S.per = b.dataset.per === 'b' ? 'b' : +b.dataset.per; ui.chdPer = S.per; if (!chordPosList(S.bar, S.per).includes(S.o)) S.o = 0; chordPickRender(); }));
  box.querySelectorAll('.chdpos [data-o]').forEach((b) => (b.onclick = () => { S.o = +b.dataset.o; S.root = null; chordPickRender(); }));
  box.querySelector('[data-x="close"]').onclick = chordPickClose;
  box.querySelectorAll('.chordbtn').forEach((b) => (b.onclick = () => { const i = +b.dataset.i; chordPickSet(i < 0 ? null : { r: dia[i].r, q: dia[i].q }); }));
  box.querySelector('.chdmore').ontoggle = (e) => { S.more = e.target.open; };
  box.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { S.root = +b.dataset.r; const ctx = ensureAudio(); Sound.playNote(ctx, previewOut, 'piano', 60 + S.root, ctx.currentTime + 0.01, 0.4, 0.5); chordPickRender(); }));
  box.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => { if (curRoot != null) chordPickSet({ r: curRoot, q: b.dataset.q }); }));
  inp.addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); chordPickClose(); return; }
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Tab') {
      e.preventDefault();
      const v = inp.value.trim().replace(/＃/g, '#');
      if (!v) { if (e.key !== 'Enter') { S.bar = clamp(S.bar + (e.shiftKey ? -1 : 1), 0, song.bars - 1); chordPickShow(); } else chordPickClose(); return; }
      if (v === '-' || v === 'なし') { chordPickSet(null); return; }
      const cc = parseChord(v);
      if (!cc) { toast('読めませんでした（れい：C, Am, G7, FM7, F#m, B♭）'); inp.select(); return; }
      chordPickSet(cc);
    }
  });
  chordPickPlace();
  if (focus !== false && !isPhone) inp.focus();
}
// パネルを、その小節の上あたりに置く（楽譜が見えていないときは画面の上）
function chordPickPlace() {
  const box = $('#chdEd');
  const S = ui.chd;
  if (!box || !S) return;
  const view = ui.view === 'score' ? $('#scoreEditView') : null;
  const L = view && view._layout;
  const svg = view && view.querySelector('svg');
  let x = 16;
  let y = 90;
  if (L && svg) {
    const r = svg.getBoundingClientRect();
    const k = r.width / L.width;
    const { sys, B } = layoutBar(L, S.bar);
    if (B) {
      x = r.left + B.x0 * k;
      const vr = view.getBoundingClientRect();
      y = r.top + sys.y0 * k - box.offsetHeight - 6;
      if (y < vr.top) y = r.top + sys.y1 * k + 6; // 上にはいらなければ、段の下へ
    }
  } else {
    const vr = ($('#scroller') || document.body).getBoundingClientRect();
    x = vr.left + 16;
    y = vr.top + 16;
  }
  box.style.left = clamp(x, 4, Math.max(4, innerWidth - box.offsetWidth - 4)) + 'px';
  box.style.top = clamp(y, 4, Math.max(4, innerHeight - box.offsetHeight - 4)) + 'px';
}
// 小節をかえたとき：楽譜のカーソルもそこへ（見えるようにスクロール）
function chordPickShow() {
  const S = ui.chd;
  if (!S) return;
  if (ui.view === 'score') { ui.sc.cursor = barStart(S.bar) + (S.o || 0); ui.sc.sel = new Set(); renderScoreEditNow(); }
  else if (typeof selectBars === 'function' && track().type === 'chord') { selectBars(cur, S.bar, S.bar); }
  chordPickRender();
}
function chordPickSet(c) {
  const S = ui.chd;
  if (!S) return;
  let ct = chordTrackOf();
  if (ct && locked(ct)) return toast('コード伴奏のトラックはロックされています');
  if (!ct && !c) return;
  if (!ct) {
    if (song.tracks.length >= MAX_TRACKS) return toast('トラックがいっぱいです');
    edit(() => { ct = newTrack('chord'); song.tracks.push(ct); }, 'コード伴奏を追加');
    renderTracks();
  }
  const b = S.bar;
  let ok = true;
  edit(() => { ok = chordSetAt(ct, b, S.o, c, S.per === 1); }, 'コードネーム');
  if (!ok) { toast('先に1拍目のコードを入れてね'); S.o = 0; chordPickRender(); return; }
  if (c) previewChord(ct, c);
  // 入れたら、その小節のつぎの位置へ。小節のおわりなら次の小節の頭へ
  const posL = chordPosList(b, S.per);
  const i = posL.indexOf(S.o);
  if (i >= 0 && i + 1 < posL.length) S.o = posL[i + 1];
  else { S.o = 0; S.bar = Math.min(b + 1, song.bars - 1); }
  S.root = null;
  if (ui.view !== 'score') draw();
  chordPickShow();
}
function scBarMark(kind) {
  if (song.locks.rules) return toast('ロックされています');
  const b = barOf(Math.max(0, ui.sc.cursor - 1));
  const bb = kind === 'start' ? barOf(ui.sc.cursor) : b;
  edit(() => {
    const R = song.repeats;
    if (kind === 'start' || kind === 'end') {
      const arr = R[kind];
      const at = kind === 'start' ? bb : b;
      const i = arr.indexOf(at);
      if (i >= 0) arr.splice(i, 1); else arr.push(at);
    } else {
      const at = barOf(ui.sc.cursor);
      const v = +kind;
      if (R.volta[at] === v) delete R.volta[at]; else R.volta[at] = v;
    }
  }, 'くり返し記号');
  renderScoreEdit();
}

function renderScorePal() {
  const pal = $('#scorePal');
  const durBtns = SC_DURS.map(([v, name, ic, key]) => `<button class="mini sdur ${ui.sc.dur === v ? 'on' : ''}" data-d="${v}" title="${name}（キー ${durKeys() === 'musescore' ? key + 1 : key}）"><span class="ic">${ic}</span></button>`).join('');
  pal.innerHTML = `
    <div class="prow">
      <span class="seg"><button class="mini ${ui.sc.input ? 'on' : ''}" data-m="1" title="クリックで音符を置く（キー N で切りかえ）">${I('pencil')}<span>入力</span></button><button class="mini ${ui.sc.input ? '' : 'on'}" data-m="0" title="クリックで音符をえらぶ">${I('pointer')}<span>選択</span></button></span>
      <span class="grp">${durBtns}<button class="mini ${ui.sc.dot ? 'on' : ''}" id="scDot" title="付点（キー .）">付点</button><button class="mini ${ui.sc.trip ? 'on' : ''}" id="scTrip" title="3連符（キー T）">3連</button></span>
      <button class="mini" id="scRest" title="休符を入れる（キー 0）"><span class="ic">𝄽</span> 休符</button>
      <button class="mini ${ui.sc.insert ? 'on' : ''}" id="scIns" title="挿入：入れた音のうしろを、ずらしていく（上書きしない）・キー I">挿入</button>
      <span class="grp">${['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ'].map((n, i) => `<button class="mini snote" data-l="${i}" title="${'CDEFGAB'[i]} キー（Shift で和音に足す）">${n}</button>`).join('')}</span>
      <span class="grp"><button class="mini" id="scSharp" title="半音上げる">♯</button><button class="mini" id="scFlat" title="半音下げる">♭</button><button class="mini" id="scNat" title="調号の音にもどす">♮</button><button class="mini" id="scUp" title="1音上げる（↑）">↑</button><button class="mini" id="scDn" title="1音下げる（↓）">↓</button><button class="mini" id="scOct" title="オクターブ上げる（Ctrl+↑）">8va</button></span>
    </div>
    <div class="prow">
      <span class="grp"><select id="scDyn" title="強弱記号（カーソルか、えらんだ音符の所に）"><option value="">強弱…</option>${DYNS.map((d) => `<option>${d}</option>`).join('')}<option value="-">（消す）</option></select><button class="mini" id="scCresc" title="クレッシェンド（だんだん強く）">cresc.＜</button><button class="mini" id="scDim" title="デクレッシェンド（だんだん弱く）">dim.＞</button></span>
      <span class="grp"><button class="mini" id="scSlur" title="スラー（なめらかに）・キー S。音符を1つえらんでおすと、つぎの音まで">⌒ スラー</button><button class="mini" id="scTieB" title="タイ（同じ高さをつなぐ）・キー +">‿ タイ</button></span>
      <span class="grp"><button class="mini" id="scLyr" title="歌詞・キー L">あ 歌詞</button><button class="mini" id="scChd" title="コードネーム">C7 コード</button></span>
      <span class="grp"><button class="mini ${scVoice() === 2 ? 'on' : ''}" id="scVoice" title="声部（1段に2つのメロディ）：1＝上の声部（ぼう上）、2＝下の声部（ぼう下）。キー V">声部${scVoice()}</button><button class="mini" id="scBarSet" title="カーソルの小節から、テンポ・拍子・調を変える">拍子・調…</button></span>
      <span class="grp"><button class="mini icon" id="scCopyB" title="コピー（Ctrl+C）">${I('copy')}</button><button class="mini icon" id="scPasteB" title="貼りつけ（Ctrl+V）">${I('paste')}</button><button class="mini icon danger" id="scDel" title="消す（Delete）">${I('trash')}</button></span>
      <span class="grp"><button class="mini icon" id="scZoomOut" title="小さく">${I('minus')}</button><button class="mini icon" id="scZoomIn" title="大きく">${I('plus')}</button><button class="mini" id="scLayoutB" title="段組み：1段の小節数・詰まり具合・段の幅・改行・横に1列">段組み…</button></span>
      <button class="mini ${$('#dlgSym') && $('#dlgSym').open ? 'on' : ''}" id="scPalB" title="記号パレット：スタッカート・トリル・装飾音符・指番号・くり返し・D.C. など（キー F9）">${I('palette')}<span>記号…</span></button>
    </div>
    <div class="prow small"><span id="scStatus" class="hint"></span><span class="hint">キー：A〜G 音名／1〜6 長さ／. 付点／T 3連／0 休符／R くり返し／↑↓ 高さ／←→ となり／Shift 和音・はんい／Delete 消す／? ぜんぶ</span></div>`;
  // いろいろな楽譜ソフトのいいところ：文字で入れる（Dorico）・鍵盤パネル（Flat・カトカトーン）・テンキー（Finale・Sibelius）・コード図・コメント（Flat）
  if (typeof popoverOpen === 'function') {
    pal.querySelectorAll('.prow')[1].insertAdjacentHTML('beforeend', `<span class="grp progrp"><button class="mini" id="scPopB" title="文字で記号を入れる：mf・cresc・Am7・♩=120・3/4・key G・[A] など（Ctrl+E）">Aa 文字で</button><button class="mini ${instPanelOn ? 'on' : ''}" id="scKbB" title="鍵盤・指板のパネル：おすと音が入る・鳴っている音が光る">${I('keys')}<span>鍵盤</span></button><button class="mini ${keypadOn ? 'on' : ''}" id="scKpB" title="テンキーで入力（数字のキーで長さ・♯♭・休符・タイ）">テンキー</button>${chordTrackOf() ? `<button class="mini ${scoreSettings().diagrams ? 'on' : ''}" id="scDiaB" title="コードネームの上に、ギターのコード図（印刷にも出ます）">コード図</button>` : ''}<button class="mini" id="scCmtB" title="いまの小節にコメント（メモ）を書く。印刷には出ません">💬 コメント</button>${typeof singToggle === 'function' ? `<button class="mini ${singOn ? 'on' : ''}" id="scMicB" title="歌って入力：マイクに向かって歌うと、その高さの音符が入ります">🎤 歌って</button><button class="mini" id="scIdeaB" title="アイデア帳：フレーズやリズムをしまう・貼る">💡 アイデア</button>` : ''}</span>`);
    $('#scPopB').onclick = () => popoverOpen();
    $('#scKbB').onclick = () => { instPanelToggle(); renderScorePal(); };
    $('#scKpB').onclick = () => { keypadToggle(); renderScorePal(); };
    if ($('#scDiaB')) $('#scDiaB').onclick = () => chordDiagramToggle();
    $('#scCmtB').onclick = () => commentAdd();
    if ($('#scMicB')) $('#scMicB').onclick = () => singToggle();
    if ($('#scIdeaB')) $('#scIdeaB').onclick = () => ideasOpen();
  }
  // ギター・ウクレレ・ベース：TAB譜を出す・出さない（五線とTABは同じ音。どちらで入れても直しても、両方かわる）
  if (track() && track().type === 'melody' && TAB_INST[track().inst]) {
    const cur = (scoreSettings().tab || {})[track().id] || '';
    pal.querySelectorAll('.prow')[1].insertAdjacentHTML('beforeend', `<span class="accrow inline tabrow"><span class="muted small" title="弦とフレットの番号の楽譜。五線とつながっていて、どちらで入れても直しても両方かわります">TAB譜</span><span class="seg" id="scTab"><button class="mini ${cur === '' ? 'on' : ''}" data-t="">なし</button><button class="mini ${cur === 'both' ? 'on' : ''}" data-t="both" title="五線の下にTAB譜">五線＋TAB</button><button class="mini ${cur === 'only' ? 'on' : ''}" data-t="only" title="TAB譜だけ">TABだけ</button></span></span>`);
    pal.querySelectorAll('#scTab [data-t]').forEach((b) => (b.onclick = () => setTabMode(track(), b.dataset.t)));
  }
  // コード伴奏：楽譜での書き方をえらぶ（コード名だけ・スラッシュ・ピアノ譜）。コードのトラックをえらんでいるときは、いちばん上に
  const ct = chordTrackOf();
  if (ct) {
    const S = scoreSettings();
    const cur = S.accomp ? (S.accompStyle === 'slash' ? 'slash' : 'grand') : 'none';
    const sel = track().type === 'chord';
    const row = `<div class="prow accrow ${sel ? 'on' : ''}">${sel ? `<b class="accttl">${I('piano')}${escapeHtml(ct.name)}</b><button class="mini accent" id="scChdIn" title="コードを入れる（Ctrl+K）・楽譜のコード名や伴奏の段をおしても入れられます">C7 コードを入れる</button>` : ''}
      <span class="muted small">${sel ? '楽譜での書き方' : 'コード伴奏の楽譜'}</span>
      <span class="seg" id="scAcc"><button class="mini ${cur === 'none' ? 'on' : ''}" data-a="none" title="五線の上にコードネームだけ書く（メロディ譜・リードシート）">コード名だけ</button><button class="mini ${cur === 'slash' ? 'on' : ''}" data-a="slash" title="拍ごとに「／」とコードネーム（ギター・バンドの楽譜）">スラッシュ</button><button class="mini ${cur === 'grand' ? 'on' : ''}" data-a="grand" title="伴奏をピアノの楽譜（大譜表）にする">ピアノ譜</button></span></div>`;
    if (sel) pal.insertAdjacentHTML('afterbegin', row);
    else pal.querySelectorAll('.prow')[1].insertAdjacentHTML('beforeend', row.replace('class="prow accrow ', 'class="accrow inline '));
    pal.querySelectorAll('#scAcc [data-a]').forEach((b) => (b.onclick = () => {
      const a = b.dataset.a;
      edit(() => { const S2 = scoreSettings(); S2.accomp = a !== 'none'; if (a !== 'none') S2.accompStyle = a; }, 'コード伴奏の楽譜');
      if (a !== 'none' && typeof scoreSel !== 'undefined' && scoreSel) scoreSel.add(ct.id);
      renderScorePal();
      renderScoreEdit();
      toast(a === 'none' ? 'コードネームだけを書きます' : a === 'slash' ? 'コード伴奏を、スラッシュの楽譜で書きます' : 'コード伴奏を、ピアノの楽譜（大譜表）で書きます');
    }));
    const ci = $('#scChdIn');
    if (ci) ci.onclick = () => scChord();
  }
  // パレットをたたむ（1行だけ：入力・長さ・休符・ドレミ・♯♭）。画面が低いときは、はじめからたたむ
  if (ui.sc.compact == null) ui.sc.compact = lsGet('otsumiki-scpal', innerHeight < 860 && !isPhone ? '1' : '0') === '1';
  pal.classList.toggle('compact', ui.sc.compact);
  pal.querySelector('.prow').insertAdjacentHTML('beforeend', `<button class="mini palfold" id="scFold" title="${ui.sc.compact ? '記号・強弱・歌詞・くり返しなどのボタンも出す' : 'ボタンを1行にして、楽譜を広く見る'}">${ui.sc.compact ? '▾ もっと' : '▴ たたむ'}</button>`);
  $('#scFold').onclick = () => { ui.sc.compact = !ui.sc.compact; lsSet('otsumiki-scpal', ui.sc.compact ? '1' : '0'); renderScorePal(); renderScoreEdit(); };
  pal.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => { ui.sc.input = b.dataset.m === '1'; renderScorePal(); }));
  pal.querySelectorAll('.sdur').forEach((b) => (b.onclick = () => { ui.sc.dur = +b.dataset.d; ui.sc.dot = false; ui.sc.trip = !!ui.sc.tup; scApplyDurToSel(); renderScorePal(); }));
  $('#scDot').onclick = () => { ui.sc.dot = !ui.sc.dot; scApplyDurToSel(); renderScorePal(); };
  $('#scTrip').onclick = () => { if (ui.sc.tup) scTupEnd(true); else ui.sc.trip = !ui.sc.trip; renderScorePal(); };
  $('#scRest').onclick = () => scInsert([]);
  $('#scIns').onclick = () => { ui.sc.insert = !ui.sc.insert; renderScorePal(); toast(ui.sc.insert ? '挿入：うしろの音をずらしながら入れます' : '上書き：カーソルの所の音を入れかえます'); };
  pal.querySelectorAll('.snote').forEach((b) => (b.onclick = (e) => { const tr = track(); if (tr.type !== 'melody') return scEditable(); scInsert([letterPitch(+b.dataset.l, refPitch(tr))], e.shiftKey); }));
  $('#scSharp').onclick = () => scAccidental('#');
  $('#scFlat').onclick = () => scAccidental('b');
  $('#scNat').onclick = () => scAccidental('n');
  $('#scUp').onclick = () => scEditSel((ns) => ns.forEach((n) => { n.p = diatonicStep(n.p, 1); }), '1音上げる');
  $('#scDn').onclick = () => scEditSel((ns) => ns.forEach((n) => { n.p = diatonicStep(n.p, -1); }), '1音下げる');
  $('#scOct').onclick = () => scEditSel((ns) => ns.forEach((n) => { moveP(n, 12, 21, 108); }), 'オクターブ上げる');
  $('#scDyn').onchange = (e) => { const v = e.target.value; e.target.value = ''; if (v) scDynamic(v === '-' ? null : v); };
  $('#scCresc').onclick = () => scHairpin('cresc');
  $('#scDim').onclick = () => scHairpin('dim');
  $('#scSlur').onclick = scSlur;
  $('#scTieB').onclick = scTie;
  $('#scLyr').onclick = scLyric;
  $('#scPalB').onclick = scPalette;
  $('#scChd').onclick = scChord;
  $('#scVoice').onclick = scToggleVoice;
  $('#scBarSet').onclick = () => openBarDialog(barOf(Math.min(ui.sc.cursor, totalTicks() - 1)));
  $('#scCopyB').onclick = () => scCopy(false);
  $('#scPasteB').onclick = scPaste;
  $('#scDel').onclick = scDelete;
  $('#scZoomIn').onclick = () => { ui.sc.zoom = Math.min(2, ui.sc.zoom + 0.15); renderScoreEdit(); };
  $('#scLayoutB').onclick = (e) => scLayoutPop(e.currentTarget);
  $('#scZoomOut').onclick = () => { ui.sc.zoom = Math.max(0.6, ui.sc.zoom - 0.15); renderScoreEdit(); };
  renderScoreEdit();
}
function scToggleVoice() {
  ui.sc.voice = scVoice() === 2 ? 1 : 2;
  ui.sc.lastIns = null;
  // えらんでいる音符があれば、その声部に移す
  const tr = track();
  if (tr.type === 'melody' && ui.sc.sel.size && !ui.sc.selByInput && !locked(tr)) {
    edit(() => { for (const n of selNotes(tr)) { if (ui.sc.voice === 2) n.v = 2; else delete n.v; } }, '声部を変える');
  }
  toast(ui.sc.voice === 2 ? '声部2（下の声部・ぼう下）で入力します' : '声部1（上の声部）で入力します');
  renderScorePal();
}
// えらんだ音符の長さを、えらんだ長さに変える（Flat と同じ）
// 3連符（MuseScore と同じ）
//   音符をえらんでいる → その音符のところを3つに分けて、1つめにその音、のこりは休符。つづけて音名で入れられる
//   えらんでいない → いまの長さ（♩なら♩のところ）に、半分の音符（♪）を3つ入れる
//   3つ入れおわる（その場所をこえる）と、もとの長さにもどる
const TUP_OK = [12, 24, 48, 96, 192];
function scTuplet() {
  const tr = scEditable();
  if (!tr) return;
  if (ui.sc.tup) { scTupEnd(true); return; }
  const ns = ui.sc.selByInput ? [] : selNotes(tr);
  let at;
  let D;
  if (ns.length) {
    at = Math.min(...ns.map((n) => n.s));
    const chord = ns.filter((n) => n.s === at);
    D = Math.max(...chord.map((n) => n.l));
    if (!TUP_OK.includes(D)) return toast('3連符にできるのは、付点のない音符です');
    edit(() => {
      clearRange(tr, at + 1, at + D, voiceOf(chord[0]));
      for (const n of chord) { n.l = D / 3; if (!tr.notes.includes(n)) tr.notes.push(n); }
    }, '3連符にする');
    ui.sc.cursor = at + D / 3;
  } else {
    D = ui.sc.dur;
    if (!TUP_OK.includes(D)) return toast('3連符にできるのは、付点のない長さです');
    at = ui.sc.cursor;
  }
  ui.sc.tup = { from: ui.sc.dur, dot: ui.sc.dot, start: at, end: at + D };
  ui.sc.dur = D / 2;
  ui.sc.dot = false;
  ui.sc.trip = true;
  ui.sc.input = true;
  ui.sc.sel = new Set();
  ui.sc.lastIns = null;
  toast(`3連符：${(SC_DURS.find((d) => d[0] === D) || [0, ''])[1]}のところに、${(SC_DURS.find((d) => d[0] === D / 2) || [0, ''])[1]}を3つ`);
  renderScorePal();
  renderScoreEdit();
}
// 3連符のところをこえたら、もとの長さにもどす
function scTupEnd(force) {
  const T = ui.sc.tup;
  if (!T) return;
  if (!force && ui.sc.cursor >= T.start && ui.sc.cursor < T.end) return;
  ui.sc.tup = null;
  ui.sc.dur = T.from;
  ui.sc.dot = T.dot;
  ui.sc.trip = false;
  renderScorePal();
}
function scApplyDurToSel() {
  const tr = track();
  if (tr.type !== 'melody' || !ui.sc.sel.size || locked(tr) || ui.sc.selByInput) return; // 入力した直後は「次の音の長さ」
  const d = scDur();
  edit(() => {
    const ns = selNotes(tr);
    for (const n of ns) {
      clearRange(tr, n.s + 1, n.s + d, voiceOf(n));
      if (!tr.notes.includes(n)) tr.notes.push(n);
      n.l = d;
    }
  }, '長さを変える');
}
// 楽譜を四角でかこんで、音符をまとめてえらぶ（何もない所からドラッグ。入力モードでは五線の外から）
function scBandStart(e) {
  const t = e.target;
  if (t.closest && t.closest('.nh, .nhhit, .chd, .sctitle, .hp, .scpos, .scrange')) return false;
  // 指（タッチ）：動かしたらスクロール。動かさずにはなしたときだけ「おした」ことにする（スクロールのつもりで音が入らないように）
  if (e.pointerType === 'touch' && !ui.sc.rangeTap) {
    const x0t = e.clientX, y0t = e.clientY, t0 = performance.now();
    let moved = false;
    const mvT = (ev) => { if (ev.pointerId === e.pointerId && Math.hypot(ev.clientX - x0t, ev.clientY - y0t) > 8) moved = true; };
    const end = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      removeEventListener('pointermove', mvT); removeEventListener('pointerup', end); removeEventListener('pointercancel', end);
      if (ev.type === 'pointerup' && !moved && performance.now() - t0 < 700 && !(ui.sc && ui.sc.pinching)) scoreClick(e);
    };
    addEventListener('pointermove', mvT); addEventListener('pointerup', end); addEventListener('pointercancel', end);
    return true;
  }
  const box = $('#scoreEditView');
  const svg = box.querySelector('svg');
  const L = box._layout;
  if (!svg || !L) return false;
  const r = svg.getBoundingClientRect();
  const x = (e.clientX - r.left) * (L.width / r.width);
  const y = (e.clientY - r.top) * (L.height / r.height);
  const h = Notation.hit(L, x, y);
  // 入力モードでも選択モードでも：ドラッグ＝四角でかこんで範囲をえらぶ。動かさずにはなしたら「クリック」（入力モードなら音を置く）
  const br = box.getBoundingClientRect();
  const x0 = e.clientX;
  const y0 = e.clientY;
  let band = null;
  const add = e.shiftKey || e.ctrlKey || e.metaKey;
  const rectOf = (ev) => ({ l: Math.min(x0, ev.clientX), r: Math.max(x0, ev.clientX), t: Math.min(y0, ev.clientY), b: Math.max(y0, ev.clientY) });
  const mv = (ev) => {
    if (!band) {
      if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
      band = document.createElement('div');
      band.className = 'scband';
      box.appendChild(band);
    }
    ev.preventDefault();
    const q = rectOf(ev);
    Object.assign(band.style, { left: q.l - br.left + box.scrollLeft + 'px', top: q.t - br.top + box.scrollTop + 'px', width: q.r - q.l + 'px', height: q.b - q.t + 'px' });
    // 画面のはしでは、自動でスクロール
    if (ev.clientY > br.bottom - 20) box.scrollTop += 10; else if (ev.clientY < br.top + 20) box.scrollTop -= 10;
  };
  const up = (ev) => {
    removeEventListener('pointermove', mv);
    removeEventListener('pointerup', up);
    removeEventListener('pointercancel', up);
    if (!band) { scoreClick(e); return; }
    band.remove();
    const q = rectOf(ev);
    const hits = [...box.querySelectorAll('.nh')].filter((el) => { const b = el.getBoundingClientRect(); const cx = (b.left + b.right) / 2; const cy = (b.top + b.bottom) / 2; return cx >= q.l && cx <= q.r && cy >= q.t && cy <= q.b; });
    if (!hits.length) { toast('四角の中に音符がありませんでした'); return; }
    // いくつかのパートにまたがるときは、いまのトラック（なければ、いちばん多いパート）
    const count = {};
    for (const el of hits) count[el.dataset.pi] = (count[el.dataset.pi] || 0) + 1;
    const curPi = String(scoreParts.indexOf(track()));
    const pi = count[curPi] ? curPi : Object.keys(count).sort((a, z) => count[z] - count[a])[0];
    const tr = scoreParts[+pi];
    if (tr && tr !== track()) selectTrack(song.tracks.indexOf(tr), false);
    const keys = hits.filter((el) => el.dataset.pi === pi).map((el) => el.dataset.s + ':' + el.dataset.p);
    ui.sc.sel = add ? new Set([...ui.sc.sel, ...keys]) : new Set(keys);
    ui.sc.selByInput = false;
    ui.sc.cursor = Math.min(...[...ui.sc.sel].map((k) => +k.split(':')[0]));
    renderScoreEdit();
    toast(`${ui.sc.sel.size}個の音をえらびました（スラー・クレッシェンド・コピー・Delete など）`);
  };
  addEventListener('pointermove', mv, { passive: false });
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
  return true;
}
function scoreClick(e) {
  const box = $('#scoreEditView');
  const svg = box.querySelector('svg');
  const L = box._layout;
  if (!svg || !L) return;
  const r = svg.getBoundingClientRect();
  const x = (e.clientX - r.left) * (L.width / r.width);
  const y = (e.clientY - r.top) * (L.height / r.height);
  ui.sc.byPointer = true; // おした所を見ているので、楽譜はスクロールしない
  // クレッシェンドをおすと、長さを変えるパネル
  const hpe = e.target.closest && e.target.closest('.hp');
  if (hpe) {
    const ptr = scoreParts[+hpe.dataset.pi];
    if (ptr && ptr !== track()) selectTrack(song.tracks.indexOf(ptr), false);
    // 画面に出ている範囲だけの「何番目」ではなく、はじめとおわりの位置でさがす（長い曲で、ちがうクレッシェンドをえらばないように）
    const hs = track().hairpins || [];
    let hi = hs.findIndex((h) => String(h.s) === hpe.dataset.s && String(h.e) === hpe.dataset.e);
    if (hi < 0) hi = hs.findIndex((h) => String(h.s) === hpe.dataset.s);
    if (hi < 0 && hpe.dataset.s == null) hi = +hpe.dataset.i;
    if (hs[hi]) { dynPop(track(), track().hairpins[hi].s, e.clientX, e.clientY, { hp: hi }); return; }
  }
  // コメントの印：そのコメントを出す
  const cmt = e.target.closest && e.target.closest('.cmt');
  if (cmt) { commentOpen(+cmt.dataset.b); return; }
  // 曲名・作詞・作曲をおすと、その場で書きかえるパネル
  const ttl = e.target.closest && e.target.closest('.sctitle');
  if (ttl) { titleEdit(ttl.classList.contains('scadd') ? 'credit' : null); return; }
  // 楽譜の上のコードネームをおすと、そのコードを変えるパネル
  const chd = e.target.closest && e.target.closest('.chd');
  if (chd) { chordPick(+chd.dataset.b, +chd.dataset.o || 0); return; }
  const nh = e.target.closest && e.target.closest('.nh, .nhhit');
  // TAB譜の数字：その音をえらんで、弾く弦をかえるパネル
  if (nh && nh.classList.contains('tabn')) {
    const tr = scoreParts[+nh.dataset.pi];
    if (tr && tr !== track()) selectTrack(song.tracks.indexOf(tr), false);
    if (track().type !== 'melody') return;
    const s0 = +nh.dataset.s;
    const p0 = +nh.dataset.p;
    if (!track().notes.some((n) => n.s === s0 && n.p === p0)) return;
    if (e.ctrlKey || e.metaKey) { const k = s0 + ':' + p0; if (ui.sc.sel.has(k)) ui.sc.sel.delete(k); else ui.sc.sel.add(k); } else ui.sc.sel = new Set([s0 + ':' + p0]);
    ui.sc.cursor = s0;
    ui.sc.selByInput = false;
    ui.sc.lastIns = { t: s0, d: track().notes.find((n) => n.s === s0 && n.p === p0).l, p: p0 };
    preview(track(), p0, 0.3);
    renderScoreEdit();
    if (!locked(track())) tabPop(e.clientX, e.clientY, { mode: 'str', s: s0, p: p0, shown: +nh.dataset.str });
    return;
  }
  if (nh) {
    const tr = scoreParts[+nh.dataset.pi];
    if (tr && tr !== track()) { selectTrack(song.tracks.indexOf(tr), false); }
    const s0 = +nh.dataset.s;
    const p0 = +nh.dataset.p;
    if (track().type === 'chord') { const b = barOf(s0); chordPick(b, Math.floor((s0 - barStart(b)) / beatAt(b)) * beatAt(b)); return; }
    if (track().type !== 'melody') { ui.sc.cursor = s0; renderScoreEdit(); return; }
    if ((e.shiftKey || ui.sc.rangeTap) && ui.sc.sel.size) {
      const ss = [...ui.sc.sel].map((k) => +k.split(':')[0]);
      const a = Math.min(...ss, s0);
      const z = Math.max(...ss, s0);
      ui.sc.sel = new Set(track().notes.filter((n) => n.s >= a && n.s <= z).map((n) => n.s + ':' + n.p));
      if (ui.sc.rangeTap) { ui.sc.rangeTap = false; toast(`${ui.sc.sel.size}個の音をえらびました（「…」からスラーなど）`); renderPhonePad(); }
    } else if (e.ctrlKey || e.metaKey) {
      const k = s0 + ':' + p0;
      if (ui.sc.sel.has(k)) ui.sc.sel.delete(k); else ui.sc.sel.add(k);
    } else ui.sc.sel = new Set([s0 + ':' + p0]);
    ui.sc.cursor = s0;
    ui.sc.selByInput = false;
    ui.sc.lastIns = { t: s0, d: track().notes.find((n) => n.s === s0 && n.p === p0).l, p: p0 };
    preview(track(), p0, 0.3);
    showMini(p0);
    renderScoreEdit();
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !locked(track())) scDragPitch(e, r.height / L.height);
    return;
  }
  const h = Notation.hit(L, x, y);
  if (!h) return;
  const tr = scoreParts[h.pi];
  if (tr && tr !== track()) selectTrack(song.tracks.indexOf(tr), false);
  // コード伴奏の段をおしたら、その小節・拍のコードを入れるパネル
  if (track().type === 'chord') { const bs = beatAt(h.bar); chordPick(h.bar, Math.max(0, Math.floor((h.tick - barStart(h.bar)) / bs) * bs)); return; }
  const bt = barTicks();
  const unit = Math.min(scDur(), ui.sc.trip ? scDur() : 24);
  const bStart = barStart(h.bar);
  const t = bStart + Math.floor((h.tick - bStart) / unit) * unit;
  ui.sc.cursor = clamp(t, 0, totalTicks());
  // オクターブ記号の中は、書いてある高さ＋オクターブ
  if (h.pitch != null && track().type === 'melody') { const q = (track().ottava || []).find((o2) => t >= o2.s && t < o2.e); if (q) h.pitch = clamp(h.pitch + 12 * q.k, 0, 127); }
  // TAB譜の弦の上：フレットの番号で音を入れるパネル（入力モードのとき）
  if (h.tab) {
    if (ui.sc.input && track().type === 'melody' && !locked(track())) { ui.sc.sel = new Set(); renderScoreEdit(); tabPop(e.clientX, e.clientY, { mode: 'fret', str: h.tabStr, chord: e.shiftKey }); }
    else { ui.sc.sel = new Set(); renderScoreEdit(); if (!ui.sc.input) toast('TAB譜に音を入れるときは「入力」にして、弦の上をおします'); }
    return;
  }
  if (ui.sc.input && h.pitch != null && track().type === 'melody' && !h.perc) {
    ui.sc.byPointer = true;
    if (e.shiftKey && ui.sc.lastIns && ui.sc.lastIns.t === t) scInsert([h.pitch], true);
    else { ui.sc.lastIns = null; scInsert([h.pitch], false); }
  } else { ui.sc.sel = new Set(); renderScoreEdit(); }
}
// 入力モード（マウス）：クリックしたら入る音符の「影」を、マウスの所に出す（どこに・どの高さで入るかが、おす前に分かる）
function scGhost(e) {
  const box = $('#scoreEditView');
  let g = $('#scGhost');
  const hide = () => { if (g) g.hidden = true; };
  if (ui.view !== 'score' || !ui.sc.input || e.pointerType !== 'mouse' || e.buttons || player.on || ui.sc.lyr || ui.chd) return hide();
  if (e.target.closest && e.target.closest('.nh, .nhhit, .chd, .sctitle, .hp, .scpos, .scwin, .scrange')) return hide();
  const svg = box.querySelector('svg');
  const L = box._layout;
  if (!svg || !L) return hide();
  const r = svg.getBoundingClientRect();
  const kx = r.width / L.width;
  const x = (e.clientX - r.left) / kx;
  const y = (e.clientY - r.top) / kx;
  const h = Notation.hit(L, x, y);
  if (!h || h.pitch == null || h.perc) return hide();
  const tr = scoreParts[h.pi];
  if (!tr || tr.type !== 'melody' || locked(tr)) return hide();
  const { sys, B: hB } = layoutBar(L, h.bar, h.tick - barStart(h.bar));
  const stf = sys && sys.staves.find((q) => q.pi === h.pi && q.sub === h.sub);
  if (!stf) return hide();
  // 入る位置（クリックしたときと同じ決め方）
  const unit = Math.min(scDur(), ui.sc.trip ? scDur() : 24);
  const bStart = barStart(h.bar);
  const rel = Math.floor((h.tick - bStart) / unit) * unit;
  const B = hB;
  let gx = B.xs[0];
  for (let i = 0; i < B.ticks.length - 1; i++) if (rel >= B.ticks[i]) gx = B.xs[i] + ((Math.min(rel, B.ticks[i + 1]) - B.ticks[i]) / (B.ticks[i + 1] - B.ticks[i] || 1)) * (B.xs[i + 1] - B.xs[i]);
  const gy = stf.top + 32 - h.staffPos * 4;
  if (!g) { g = document.createElement('div'); g.id = 'scGhost'; g.innerHTML = '<i></i><b></b>'; box.appendChild(g); }
  const br = box.getBoundingClientRect();
  g.hidden = false;
  g.style.transform = `translate(${Math.round(r.left - br.left + box.scrollLeft + gx * kx)}px,${Math.round(r.top - br.top + box.scrollTop + gy * kx)}px) scale(${kx.toFixed(3)})`;
  const q = (tr.ottava || []).find((o2) => bStart + rel >= o2.s && bStart + rel < o2.e);
  setText(g.lastChild, noteName(clamp(h.pitch + (q ? 12 * q.k : 0), 0, 127)));
}
// 音符を上下にドラッグして高さを変える（MuseScore と同じ。1目もり＝線か間1つ。Shift で半音ずつ）
function scDragPitch(e, k) {
  const tr = track();
  const ns = selNotes(tr);
  if (!ns.length) return;
  const stepPx = (8 / 2) * k; // 線と間の1つぶん（画面のピクセル）
  const y0 = e.clientY;
  const orig = ns.map((n) => n.p);
  const snap = snapshot();
  let steps = 0;
  ui.sc.dragging = true;
  const move = (ev) => {
    const st = Math.round((y0 - ev.clientY) / stepPx);
    if (st === steps) return;
    steps = st;
    ns.forEach((n, i) => {
      let q = orig[i];
      for (let j = 0; j < Math.abs(st); j++) q = ev.shiftKey ? q + Math.sign(st) : diatonicStep(q, Math.sign(st));
      n.p = clamp(q, 21, 108);
    });
    ui.sc.sel = new Set(ns.map((n) => n.s + ':' + n.p));
    ui.sc.lastIns = null;
    preview(tr, ns[0].p, 0.2);
    showMini(ns[0].p);
    renderScoreEdit();
  };
  const up = () => {
    ui.sc.dragging = false;
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', up);
    removeEventListener('pointercancel', up);
    if (snapshot() !== snap) { pushUndo(snap, '高さを変える（ドラッグ）'); changed(); }
  };
  addEventListener('pointermove', move);
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
}
// 楽譜モードのキー操作（使ったら true）
function scoreKey(e) {
  ui.sc.byPointer = false;
  const k = e.key;
  const tr = track();
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl && (k === 'i' || k === 'I') && !e.shiftKey) { e.preventDefault(); ui.sc.insert = !ui.sc.insert; renderScorePal(); toast(ui.sc.insert ? '挿入：うしろの音をずらしながら入れます' : '上書き：カーソルの所の音を入れかえます'); return true; }
  // ♯・♭（えらんだ音符を半音上げる・下げる）
  if (!ctrl && !e.altKey && (k === '#' || k === '-')) { e.preventDefault(); scAccidental(k === '#' ? '#' : 'b'); return true; }
  // Ctrl+3（MuseScore・Finale と同じ）：3連符にする
  if (ctrl && !e.altKey && !e.shiftKey && e.code === 'Digit3') { e.preventDefault(); scTuplet(); return true; }
  // MuseScore と同じ：Alt＋数字で音程を重ねる、Alt+T 譜表テキスト、Alt+M リハーサル記号、F9 パレット
  if (e.altKey && !ctrl) {
    const dg = /^Digit([1-9])$/.exec(e.code || '');
    if (dg && +dg[1] >= 2) { e.preventDefault(); scAddInterval((+dg[1] === 8 ? 8 : +dg[1]) * (e.shiftKey ? -1 : 1)); return true; } // Shift もいっしょで下に
    if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); scChordStep(k === 'ArrowUp' ? 1 : -1); return true; }
    if (e.code === 'KeyT') { e.preventDefault(); scStaffText(); return true; }
    if (e.code === 'KeyM') { e.preventDefault(); scRehearsal(); return true; }
  }
  if (k === 'F9') { e.preventDefault(); scPalette(); return true; }
  if (ctrl) {
    const kl = k.toLowerCase();
    if (e.shiftKey && kl === 'm') { e.preventDefault(); scRehearsal(); return true; }
    if (kl === 'k' && !e.shiftKey) { e.preventDefault(); scChord(); return true; } // MuseScore と同じ：コードネーム
    if (kl === 'c') { e.preventDefault(); scCopy(false); return true; }
    if (kl === 'x') { e.preventDefault(); scCopy(true); return true; }
    if (kl === 'v') { e.preventDefault(); scPaste(); return true; }
    if (kl === 'a') { e.preventDefault(); ui.sc.sel = new Set(tr.type === 'melody' ? tr.notes.map((n) => n.s + ':' + n.p) : []); renderScoreEdit(); return true; }
    if ((k === 'ArrowUp' || k === 'ArrowDown') && e.altKey) { e.preventDefault(); scStaffStep(k === 'ArrowUp' ? -1 : 1); return true; } // 上・下のパートへ
    if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); const d = k === 'ArrowUp' ? 12 : -12; scEditSel((ns) => ns.forEach((n) => { moveP(n, d, 21, 108); }), 'オクターブ'); return true; }
    // 小節ごとに動く・曲の頭／おわりへ
    if (k === 'ArrowRight' || k === 'ArrowLeft') { e.preventDefault(); const b = barOf(Math.min(ui.sc.cursor, totalTicks() - 1)); const nb = clamp(b + (k === 'ArrowRight' ? 1 : (ui.sc.cursor > barStart(b) ? 0 : -1)), 0, song.bars); ui.sc.cursor = barStart(nb); ui.sc.sel = new Set(); ui.sc.lastIns = null; renderScoreEdit(); return true; }
    if (k === 'Home' || k === 'End') { e.preventDefault(); ui.sc.cursor = k === 'Home' ? 0 : Math.max(0, totalTicks() - barLen(song.bars - 1)); ui.sc.sel = new Set(); ui.sc.lastIns = null; renderScoreEdit(); return true; }
    if (kl === 'b' && !e.shiftKey) { e.preventDefault(); if (song.locks.rules) return toast('ルールの変更はロックされています'), true; edit(() => { song.bars = Math.min(MAX_BARS, song.bars + 1); }, '小節を足す'); toast('おわりに1小節足しました'); renderScoreEdit(); return true; }
    // 音の高さだけ入れなおす（MuseScore の Re-pitch）
    if (e.shiftKey && kl === 'i') { e.preventDefault(); ui.sc.repitch = !ui.sc.repitch; toast(ui.sc.repitch ? '高さだけ入れなおす：音名・鍵盤をおすと、カーソルの音の高さだけ変えて、次の音へ（リズムはそのまま）' : '高さだけ入れなおすのをやめました', 3500); renderScoreEdit(); return true; }
    return false;
  }
  if (/^[a-gA-G]$/.test(k)) {
    if (tr.type !== 'melody') { scEditable(); return true; }
    e.preventDefault();
    const letter = 'cdefgab'.indexOf(k.toLowerCase());
    if (ui.sc.repitch && !e.shiftKey) { scRepitch(letterPitch(letter, refPitch(tr))); return true; }
    scInsert([letterPitch(letter, refPitch(tr))], e.shiftKey);
    return true;
  }
  // 数字キーの長さ：MuseScore 式（5＝4分音符・6＝2分・7＝全・4＝8分・3＝16分・2＝32分）もえらべる
  const durKey = durKeys() === 'musescore' ? [[192, '', '', 7], [96, '', '', 6], [48, '', '', 5], [24, '', '', 4], [12, '', '', 3], [6, '', '', 2]].find((d) => String(d[3]) === k) : SC_DURS.find((d) => String(d[3]) === k);
  if (durKey) { e.preventDefault(); ui.sc.dur = durKey[0]; ui.sc.dot = false; ui.sc.trip = !!ui.sc.tup; scApplyDurToSel(); renderScorePal(); return true; }
  if (k === '.') { ui.sc.dot = !ui.sc.dot; scApplyDurToSel(); renderScorePal(); return true; }
  if (k === 't' || k === 'T') { if (ui.sc.tup) scTupEnd(true); else ui.sc.trip = !ui.sc.trip; renderScorePal(); return true; }
  if (k === '0') { e.preventDefault(); scInsert([]); return true; }
  // R：えらんだ音（なければ入れたばかりの音）を、すぐうしろにくり返す（MuseScore・Dorico と同じ）
  if (k === 'r' || k === 'R') { e.preventDefault(); scRepeat(); return true; }
  // J：♯ と ♭ の書き方を入れかえる（ド♯ ⇔ レ♭）
  if (k === 'j' || k === 'J') { e.preventDefault(); scEditSel((ns) => ns.forEach((n) => { const pc = ((n.p % 12) + 12) % 12; if (![1, 3, 6, 8, 10].includes(pc)) return; n.enh = n.enh === 1 ? -1 : n.enh === -1 ? 1 : (Notation.keyCount(song.key, isMinor()) < 0 ? 1 : -1); }), '♯・♭の書き方'); return true; }
  if (k === 'n' || k === 'N') { ui.sc.input = !ui.sc.input; renderScorePal(); toast(ui.sc.input ? '入力モード' : '選択モード'); return true; }
  if (k === '+') { scTie(); return true; }
  // MuseScore と同じ：Q＝長さを半分、W＝長さを2倍（えらんだ音符。なければ、次に入れる長さ）
  if ((k === 'q' || k === 'Q' || k === 'w' || k === 'W') && !e.shiftKey) {
    const half = k.toLowerCase() === 'q';
    const ns = tr.type === 'melody' && !ui.sc.selByInput ? selNotes(tr) : [];
    if (ns.length) {
      if (!scEditable()) return true;
      edit(() => {
        for (const n of ns) {
          const nl = half ? Math.max(6, Math.round(n.l / 2)) : Math.min(192 * 4, n.l * 2);
          if (!half) { ensureLength(n.s + nl); clearRange(tr, n.s + n.l, n.s + nl, voiceOf(n)); }
          n.l = nl;
        }
      }, half ? '長さを半分' : '長さを2倍');
      ui.sc.sel = new Set(ns.map((n) => n.s + ':' + n.p));
      renderScoreEdit();
    } else {
      const order = SC_DURS.map((d) => d[0]); // 192, 96, 48 …
      const i = order.indexOf(ui.sc.dur);
      ui.sc.dur = order[clamp(i + (half ? 1 : -1), 0, order.length - 1)];
      ui.sc.dot = false;
      renderScorePal();
    }
    return true;
  }
  // 強弱：[ で弱く、] で強く（カーソルか、えらんだ所の記号を1段ずつ）。< > でクレッシェンド・デクレッシェンド
  if (k === '[' || k === ']') {
    e.preventDefault();
    if (!scEditable()) return true;
    const r = selRange(tr); const t = r ? r.s : ui.sc.cursor;
    const lv = DYNS.filter((d) => d !== 'sf');
    const before = (tr.dyn || []).filter((d) => d.t <= t).sort((a, b) => b.t - a.t)[0];
    const i0 = before ? lv.indexOf(before.v) : lv.indexOf('mf');
    const i = clamp((i0 < 0 ? lv.indexOf('mf') : i0) + (k === ']' ? 1 : -1), 0, lv.length - 1);
    scDynamic(lv[i]); toast('強弱：' + lv[i]);
    return true;
  }
  if (k === '<' || k === '>') { e.preventDefault(); scHairpin(k === '<' ? 'cresc' : 'dim'); return true; }
  if (k === 's' || k === 'S') { scSlur(); return true; }
  if (k === 'l' || k === 'L') { e.preventDefault(); scLyric(); return true; }
  if (k === 'v' || k === 'V') { scToggleVoice(); return true; }
  if (k === 'ArrowUp' || k === 'ArrowDown') {
    e.preventDefault();
    const dir = k === 'ArrowUp' ? 1 : -1;
    scEditSel((ns) => ns.forEach((n) => { n.p = e.shiftKey ? clamp(n.p + dir, 21, 108) : diatonicStep(n.p, dir); }), '高さを変える');
    const ns = selNotes(tr);
    if (ns.length) preview(tr, ns[0].p, 0.25);
    return true;
  }
  if (k === 'ArrowRight' || k === 'ArrowLeft') { e.preventDefault(); scMove(k === 'ArrowRight' ? 1 : -1, e.shiftKey); return true; }
  if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); if (k === 'Delete' && !ui.sc.sel.size) return true; scDelete(); return true; }
  if (k === 'Escape') {
    // 何もえらんでいなければ、入力モードをやめる（MuseScore と同じ）
    if (!ui.sc.sel.size && ui.sc.input) { ui.sc.input = false; ui.sc.repitch = false; renderScorePal(); toast('選択モード（N か Enter でもどる）'); return true; }
    ui.sc.sel = new Set(); renderScoreEdit(); return true;
  }
  if (k === 'Enter' && !ui.sc.input) { e.preventDefault(); ui.sc.input = true; renderScorePal(); toast('入力モード'); return true; }
  return false;
}
function initScoreEditor() {
  $$('#viewSeg button').forEach((b) => (b.onclick = () => setView(b.dataset.v)));
  $('#scoreEditView').addEventListener('pointerdown', (e) => { if (e.button > 0) return; if (ui.sc && ui.sc.pinching) return; if (e.pointerType === 'touch' && !e.isPrimary) return; if (e.pointerType === 'touch') scTouch = { t: performance.now(), n: undoStack.length }; if (scBandStart(e)) return; scoreClick(e); });
  initPinch();
  $('#scoreEditView').addEventListener('pointermove', scGhost);
  $('#scoreEditView').addEventListener('pointerleave', () => { const g = $('#scGhost'); if (g) g.hidden = true; });
  $('#scoreEditView').addEventListener('pointerdown', () => { const g = $('#scGhost'); if (g) g.hidden = true; }, true);
  // Ctrl＋ホイールで楽譜を大きく・小さく
  // 音符をドラッグしているあいだは、画面をスクロールさせない（タブレット）
  $('#scoreEditView').addEventListener('touchmove', (e) => { if (ui.sc && ui.sc.dragging) e.preventDefault(); }, { passive: false });
  $('#scoreEditView').addEventListener('scroll', () => { if (ui.sc && ui.sc.lyr) lyrPlace(); if (ui.chd) chordPickPlace(); }, { passive: true });
  addEventListener('resize', () => { if (ui.sc && ui.sc.lyr) setTimeout(lyrPlace, 60); });
  $('#scoreEditView').addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    ui.sc.zoom = clamp(Math.round((ui.sc.zoom * Math.exp(-clamp(e.deltaY, -60, 60) * 0.004)) * 100) / 100, 0.6, 2);
    renderScoreEdit();
  }, { passive: false });
  new ResizeObserver(() => renderScoreEdit()).observe($('#scoreEditView'));
}


/* ============================================================
   調をかえる（12の調から1回でえらぶ・曲ぜんたいを半音ずつ移調）
   ============================================================ */
const KEY_JA_MAJ = ['ハ', '変ニ', 'ニ', '変ホ', 'ホ', 'ヘ', '嬰ヘ', 'ト', '変イ', 'イ', '変ロ', 'ロ'];
const KEY_JA_MIN = ['ハ', '嬰ハ', 'ニ', '変ホ', 'ホ', 'ヘ', '嬰ヘ', 'ト', '嬰ト', 'イ', '変ロ', 'ロ'];
const KEY_EN = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const KEY_EN_MIN = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
const keyLabel = (k, minor) => (minor ? KEY_JA_MIN[k] + '短調' : KEY_JA_MAJ[k] + '長調');
const keyEn = (k, minor) => (minor ? KEY_EN_MIN[k] + 'm' : KEY_EN[k]);
function keySigText(k, minor) {
  const c = Notation.keyCount(k, minor);
  return c === 0 ? '調号なし' : c > 0 ? '♯' + c : '♭' + -c;
}
// 調をかえる。move＝入っている音も移す。d＝移す半音の数（決まっていなければ近いほう）
function changeKey(nk, minor, move, d) {
  if (song.locks.rules) return toast('ロックされています');
  const old = song.key;
  let semis = d;
  if (semis == null) { const m = (((nk - old) % 12) + 12) % 12; semis = m > 6 ? m - 12 : m; }
  edit(() => {
    song.key = ((nk % 12) + 12) % 12;
    if (minor && !isMinor()) song.scale = 'minor';
    if (!minor && (song.scale === 'minor' || song.scale === 'hminor')) song.scale = 'major';
    if (move && semis) {
      for (const t of song.tracks) {
        if (t.locked) continue;
        if (t.type === 'melody') for (const n of t.notes) moveP(n, semis, 21, 108);
        const tr12 = (r) => (((r + semis) % 12) + 12) % 12;
        if (t.type === 'chord') t.chords = t.chords.map((c) => (c ? { ...c, r: tr12(c.r), ...(c.h ? { h: { ...c.h, r: tr12(c.h.r) } } : {}), ...(Array.isArray(c.x) ? { x: c.x.map((x) => ({ ...x, r: tr12(x.r) })) } : {}) } : c));
      }
      // とちゅうの調の変化も、いっしょに動かす
      for (const b in song.keys || {}) song.keys[b] = { ...song.keys[b], key: (((song.keys[b].key + semis) % 12) + 12) % 12 };
    }
  }, move && semis ? `${keyLabel(song.key, minor)}に移調` : '調');
  renderSettings();
  renderKeyPop();
  toast(`${keyLabel(song.key, isMinor())}（${keyEn(song.key, isMinor())}）${move && semis ? 'に移調しました' : 'にしました'}`);
}
function renderKeyPop() {
  const minor = isMinor();
  const sum = $('#keySum');
  if (sum) sum.innerHTML = `${I('key')}<span>${keyLabel(song.key, minor)}</span>`;
  const box = $('#keyBody');
  if (!box) return;
  // 五度圏の順（♯がふえる順・♭がふえる順）
  const sharps = [0, 7, 2, 9, 4, 11, 6];
  const flats = [5, 10, 3, 8, 1];
  const tonic = (maj) => (minor ? (maj + 9) % 12 : maj);
  const btn = (maj) => {
    const k = tonic(maj);
    return `<button class="keybtn ${k === song.key ? 'on' : ''}" data-k="${k}"><b>${keyLabel(k, minor)}</b><small>${keyEn(k, minor)}・${keySigText(k, minor)}</small></button>`;
  };
  box.innerHTML = `
    <div class="seg modeseg"><button class="mini ${minor ? '' : 'on'}" data-mode="maj">長調</button><button class="mini ${minor ? 'on' : ''}" data-mode="min">短調</button></div>
    <div class="sub">♯の調</div><div class="keygrid">${sharps.map(btn).join('')}</div>
    <div class="sub">♭の調</div><div class="keygrid">${flats.map(btn).join('')}</div>
    <label class="chk"><input type="checkbox" id="keyMove" ${ui.keyMove ? 'checked' : ''}> 入っている音やコードも、いっしょに移す（移調）</label>
    <div class="sub">曲ぜんたいを半音ずつ移調</div>
    <div class="btnrow"><button class="mini" data-semi="-1">${I('minus')}半音下げる</button><button class="mini" data-semi="1">${I('plus')}半音上げる</button><button class="mini" data-semi="-12">オクターブ下げる</button><button class="mini" data-semi="12">オクターブ上げる</button></div>
    <div class="sub">音階</div>
    <div class="scalelist">${Object.entries(SCALES).map(([k, v]) => `<button class="mini ${song.scale === k ? 'on' : ''}" data-scale="${k}">${v.name}</button>`).join('')}</div>`;
  box.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => changeKey(+b.dataset.k, isMinor(), ui.keyMove)));
  box.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => {
    const toMin = b.dataset.mode === 'min';
    if (toMin === isMinor()) return;
    // 同じ主音のまま、長調⇔短調（音はそのまま）
    edit(() => { song.scale = toMin ? 'minor' : 'major'; }, toMin ? '短調にする' : '長調にする');
    renderSettings();
    renderKeyPop();
  }));
  $('#keyMove').onchange = (e) => { ui.keyMove = e.target.checked; try { localStorage.setItem('otsumiki-keymove', ui.keyMove ? '1' : '0'); } catch (er) { /* 何もしない */ } };
  box.querySelectorAll('[data-semi]').forEach((b) => (b.onclick = () => {
    const d = +b.dataset.semi;
    if (Math.abs(d) === 12) {
      if (song.locks.rules) return toast('ロックされています');
      edit(() => { for (const t of song.tracks) if (t.type === 'melody' && !t.locked) for (const n of t.notes) moveP(n, d, 21, 108); }, d > 0 ? 'オクターブ上げる' : 'オクターブ下げる');
      return;
    }
    changeKey(song.key + d, isMinor(), true, d);
  }));
  box.querySelectorAll('[data-scale]').forEach((b) => (b.onclick = () => {
    if (song.locks.rules) return toast('ロックされています');
    edit(() => { song.scale = b.dataset.scale; }, '音階');
    renderSettings();
    renderKeyPop();
  }));
}

/* ============================================================
   スマホで楽譜をサッと書く入力パネル
   長さ → ドレミ をおすだけで、カーソルの所に音符が入っていきます
   ============================================================ */
function renderPhonePad() {
  const pad = $('#phonePad');
  if (!pad) return;
  const show = isPhone && ui.view === 'score';
  pad.hidden = !show;
  $('#scorePal').hidden = show;
  if (!show) return;
  const durs = SC_DURS.slice(0, 5);
  pad.innerHTML = `
    <div class="pp-row pp-durs">${durs.map(([v, name, ic]) => `<button class="pp-btn ${ui.sc.dur === v ? 'on' : ''}" data-d="${v}" title="${name}"><span class="ic">${ic}</span></button>`).join('')}
      <button class="pp-btn ${ui.sc.dot ? 'on' : ''}" data-x="dot" title="付点">付点</button><button class="pp-btn ${ui.sc.trip ? 'on' : ''}" data-x="trip" title="3連符">3連</button></div>
    <div class="pp-row pp-notes">${['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ'].map((n, i) => `<button class="pp-note" data-l="${i}" style="--pc:${PC_COLORS[[0, 2, 4, 5, 7, 9, 11][i]]}">${n}</button>`).join('')}</div>
    <div class="pp-row pp-tools">
      <button class="pp-btn" data-x="oct+" title="オクターブ上">${I('plus')}<small>8va</small></button>
      <button class="pp-btn" data-x="oct-" title="オクターブ下">${I('minus')}<small>8vb</small></button>
      <button class="pp-btn" data-x="sharp" title="半音上げる">♯</button>
      <button class="pp-btn" data-x="flat" title="半音下げる">♭</button>
      <button class="pp-btn" data-x="rest" title="休符"><span class="ic">𝄽</span></button>
      <button class="pp-btn" data-x="left" title="前へ">←</button>
      <button class="pp-btn" data-x="right" title="次へ">→</button>
      <button class="pp-btn danger" data-x="del" title="消す">⌫</button>
      <details class="pop pp-more" data-pop="ppmore"><summary class="pp-btn" title="記号・歌詞・コードなど">${I('more')}</summary><div class="popbody">
        <div class="btnrow"><button class="mini ${ui.sc.insert ? 'on' : ''}" data-x="insert">${ui.sc.insert ? '✓ ' : ''}挿入（うしろの音をずらして入れる）</button></div>
        <div class="sub">いくつかの音をえらぶ（スラー・クレシェンド・コピー用）</div>
        <div class="btnrow"><button class="mini ${ui.sc.rangeTap ? 'on' : ''}" data-x="range">${ui.sc.rangeTap ? '✓ ' : ''}はんい：1つめの音をタップ → さいごの音をタップ</button></div>
        <div class="sub">記号（えらんだ音符に）</div>
        <div class="btnrow">${ARTS.map(([a, ic, t]) => `<button class="mini" data-art="${a}">${ic} ${t.split('（')[0]}</button>`).join('')}</div>
        <div class="btnrow"><button class="mini" data-x="palette">${I('palette')} もっと記号（トリル・装飾音符・指番号…）</button></div>
        <div class="btnrow"><button class="mini" data-x="tie">タイ</button><button class="mini" data-x="slur">スラー</button><button class="mini" data-x="cresc">cresc.</button><button class="mini" data-x="dim">dim.</button></div>
        <div class="sub">強弱</div>
        <div class="btnrow">${DYNS.map((d) => `<button class="mini dynb" data-dyn="${d}">${d}</button>`).join('')}</div>
        <div class="sub">ことば・コード</div>
        <div class="btnrow"><button class="mini" data-x="lyric">歌詞</button><button class="mini" data-x="chord">コードネーム</button></div>
        <div class="sub">小節</div>
        <div class="btnrow"><button class="mini" data-bar="start">𝄆 くり返しはじめ</button><button class="mini" data-bar="end">𝄇 くり返しおわり</button><button class="mini" data-bar="1">1番かっこ</button><button class="mini" data-bar="2">2番かっこ</button><button class="mini" data-x="barset">拍子・調・テンポを変える</button></div>
        <div class="sub">D.C.・コーダ（この小節に）</div>
        <div class="btnrow">${JUMPS.map(([k, t]) => `<button class="mini" data-jump="${k}">${t.split('（')[0]}</button>`).join('')}<button class="mini" data-jump="-">消す</button></div>
        <div class="sub">声部（1段に2つのメロディ）</div>
        <div class="btnrow"><button class="mini ${scVoice() === 1 ? 'on' : ''}" data-x="voice1">声部1（上）</button><button class="mini ${scVoice() === 2 ? 'on' : ''}" data-x="voice2">声部2（下）</button></div>
        <div class="sub">そのほか</div>
        <div class="btnrow"><button class="mini" data-x="copy">コピー</button><button class="mini" data-x="paste">貼りつけ</button><button class="mini" data-x="print">印刷・書き出し</button></div>
      </div></details>
    </div>`;
  pad.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { ui.sc.dur = +b.dataset.d; ui.sc.dot = false; ui.sc.trip = !!ui.sc.tup; scApplyDurToSel(); renderPhonePad(); }));
  pad.querySelectorAll('.pp-note').forEach((b) => (b.onclick = () => {
    const tr = track();
    if (tr.type !== 'melody') { scEditable(); return; }
    scInsert([letterPitch(+b.dataset.l, refPitch(tr))], false);
  }));
  const act = {
    dot: () => { ui.sc.dot = !ui.sc.dot; scApplyDurToSel(); },
    palette: () => { closePops(); scPalette(); },
    insert: () => { ui.sc.insert = !ui.sc.insert; toast(ui.sc.insert ? '挿入：うしろの音をずらしながら入れます' : '上書き：カーソルの所の音を入れかえます'); },
    range: () => { ui.sc.rangeTap = !ui.sc.rangeTap; if (ui.sc.rangeTap) ui.sc.sel = new Set(); toast(ui.sc.rangeTap ? 'はんい：1つめの音、さいごの音の順にタップしてね' : 'はんいをやめました'); },
    trip: () => { if (ui.sc.tup) scTupEnd(true); else ui.sc.trip = !ui.sc.trip; },
    'oct+': () => phoneOct(12),
    'oct-': () => phoneOct(-12),
    sharp: () => scAccidental('#'),
    flat: () => scAccidental('b'),
    rest: () => scInsert([]),
    left: () => scMove(-1, false),
    right: () => scMove(1, false),
    del: () => scDelete(),
    tie: scTie, slur: scSlur, cresc: () => scHairpin('cresc'), dim: () => scHairpin('dim'),
    lyric: scLyric, chord: scChord, copy: () => scCopy(false), paste: scPaste,
    print: () => openScore(),
    barset: () => openBarDialog(barOf(Math.min(ui.sc.cursor, totalTicks() - 1))),
    voice1: () => { if (scVoice() !== 1) scToggleVoice(); },
    voice2: () => { if (scVoice() !== 2) scToggleVoice(); },
  };
  pad.querySelectorAll('[data-x]').forEach((b) => (b.onclick = () => { closePops(); act[b.dataset.x](); renderPhonePad(); }));
  pad.querySelectorAll('[data-art]').forEach((b) => (b.onclick = () => { closePops(); scArt(b.dataset.art); }));
  pad.querySelectorAll('[data-dyn]').forEach((b) => (b.onclick = () => { closePops(); scDynamic(b.dataset.dyn); }));
  pad.querySelectorAll('[data-bar]').forEach((b) => (b.onclick = () => { closePops(); scBarMark(b.dataset.bar); }));
  pad.querySelectorAll('[data-jump]').forEach((b) => (b.onclick = () => { closePops(); setJump(barOf(Math.min(ui.sc.cursor, totalTicks() - 1)), b.dataset.jump); renderScoreEdit(); }));
}
// オクターブ：えらんだ音符を動かし、次に入れる音の高さもいっしょに
function phoneOct(d) {
  const tr = track();
  if (ui.sc.sel.size && tr.type === 'melody' && !locked(tr)) {
    scEditSel((ns) => ns.forEach((n) => { moveP(n, d, 21, 108); }), d > 0 ? 'オクターブ上げる' : 'オクターブ下げる');
    const ns = selNotes(tr);
    if (ns.length) { preview(tr, ns[0].p, 0.3); ui.sc.lastIns = { ...(ui.sc.lastIns || { t: ns[0].s, d: ns[0].l }), p: ns[0].p, ref: ns[0].p }; }
  } else {
    const ref = refPitch(tr) + d;
    ui.sc.lastIns = { ...(ui.sc.lastIns || { t: ui.sc.cursor, d: scDur() }), p: null, ref };
    toast(`次の音は ${SOLFA_OCT(ref)} のあたり`);
  }
}

/* ============================================================
   はじめの画面：曲のひな形をえらぶ（カトカトーンより早く始められる）
   ============================================================ */
const TEMPLATES = [
  { id: 'melody', icon: 'note', title: 'メロディをつくる', desc: 'メロディ＋コード伴奏＋リズム', make: () => [newTrack('melody', { name: 'メロディ', inst: 'recorder' }), newTrack('chord'), newTrack('drum', { name: 'リズム' })] },
  { id: 'song', icon: 'mic', title: '歌と伴奏', desc: '歌のメロディ＋ピアノ伴奏', make: () => [newTrack('melody', { name: '歌', inst: 'choir' }), newTrack('chord', { name: 'ピアノ伴奏', pattern: 'arp' })] },
  { id: 'duet', icon: 'layers', title: 'リコーダー二重奏', desc: 'ソプラノとアルトの2パート', make: () => [newTrack('melody', { name: 'ソプラノ', inst: 'recorder' }), newTrack('melody', { name: 'アルト', inst: 'recorder', range: 'alto' })] },
  { id: 'rhythm', icon: 'drum', title: 'リズムアンサンブル', desc: '打楽器だけで合奏', make: () => [newTrack('drum', { name: '音楽室の打楽器', kit: 'school' }), newTrack('drum', { name: '和太鼓', kit: 'wa' })] },
  { id: 'score', icon: 'score', title: '楽譜で書く', desc: '五線譜に直接書いていく', make: () => [newTrack('melody', { name: 'メロディ', inst: 'piano' })], view: 'score' },
  { id: 'orch', icon: 'score', title: 'オーケストラ', desc: '2管編成のフルスコア（13パート）', orch: true, make: () => [
    ['フルート', 'flute', 'soprano'], ['オーボエ', 'oboe', 'soprano'], ['クラリネット', 'clarinet', 'alto'], ['ファゴット', 'bassoon', 'tenor'],
    ['ホルン', 'horn', 'alto'], ['トランペット', 'trumpet', 'soprano'], ['トロンボーン', 'trombone', 'tenor'], ['ティンパニ', 'timpani', 'bass'],
    ['バイオリンⅠ', 'violin', 'soprano'], ['バイオリンⅡ', 'violin', 'soprano'], ['ビオラ', 'viola', 'alto'], ['チェロ', 'cello', 'tenor'], ['コントラバス', 'contrabass', 'bass'],
  ].map(([name, inst, range]) => newTrack('melody', { name, inst, range })), view: 'score' },
  { id: 'empty', icon: 'plus', title: 'からっぽ', desc: 'メロディ1つだけ', make: () => [newTrack('melody', { name: 'メロディ', inst: 'piano' })] },
];
function openStart(first) {
  const box = $('#startBody');
  box.innerHTML = `
    <div class="tpl-grid">${TEMPLATES.map((t) => `<button class="tpl" data-t="${t.id}"><span class="tpl-ic">${I(t.icon)}</span><b>${t.title}</b><small>${t.desc}</small></button>`).join('')}</div>
    <div class="tpl-opts">
      <label>拍子 <select id="tplMeter"><option value="2/4">2/4</option><option value="3/4">3/4</option><option value="4/4" selected>4/4</option><option value="6/8">6/8</option></select></label>
      <label>調 <select id="tplKey">${[[0, 0], [7, 0], [5, 0], [2, 0], [10, 0], [9, 1], [4, 1], [2, 1]].map(([k, m]) => `<option value="${k}:${m}">${keyLabel(k, !!m)}</option>`).join('')}</select></label>
      <label>小節 <select id="tplBars">${[4, 8, 12, 16, 24, 32].map((n) => `<option ${n === 8 ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label>テンポ <input id="tplBpm" type="number" min="30" max="240" value="100"></label>
    </div>
    <div class="tpl-links"><button class="mini" id="tplSample">${I('note')}サンプル曲を開く</button><button class="mini" id="tplTwinkle">${I('note')}きらきら星</button><button class="mini" id="tplFrog">${I('note')}かえるの合唱</button><button class="mini" id="tplOpen">${I('folder')}ファイルを開く</button>${first ? '' : `<button class="mini" id="tplCancel">${I('x')}いまの曲にもどる</button>`}</div>
    <label class="tpl-kids"><input type="checkbox" id="tplKids" ${document.body.classList.contains('kids') ? 'checked' : ''}> こどもモード（漢字にふりがな・大きなボタン）</label>`;
  box.querySelectorAll('.tpl').forEach((b) => (b.onclick = () => {
    const t = TEMPLATES.find((x) => x.id === b.dataset.t);
    const s = newSong();
    s.title = 'あたらしい曲';
    s.meter = $('#tplMeter').value.split('/').map(Number);
    const [k, m] = $('#tplKey').value.split(':').map(Number);
    s.key = k;
    s.scale = m ? 'minor' : 'major';
    s.bars = +$('#tplBars').value;
    s.bpm = clamp(+$('#tplBpm').value || 100, 30, 240);
    s.tracks = t.make();
    if (t.orch) s.score = { orch: true };
    $('#dlgStart').close();
    loadSong(s);
    setView(t.view || 'grid');
    if (isPhone) setPhoneView(t.view === 'score' ? 'score' : 'edit');
    if (t.view === 'score') toast('長さ→音名の順におすと、音符が入っていきます');
    if (!startMission()) tourFirstTime();
  }));
  $('#tplSample').onclick = () => { $('#dlgStart').close(); loadSong(sampleSong()); tourFirstTime(); };
  $('#tplKids').onchange = (e) => setKids(e.target.checked);
  $('#tplTwinkle').onclick = () => { $('#dlgStart').close(); loadSong(demoSong('twinkle')); toast('「きらきら星」を開きました。▶で聴いてみよう'); };
  $('#tplFrog').onclick = () => { $('#dlgStart').close(); loadSong(demoSong('frog')); toast('「かえるの合唱」を開きました。輪唱（メロディをずらして重ねる）にもちょうせんしてみよう'); };
  $('#tplOpen').onclick = () => { $('#dlgStart').close(); $('#fileIn').click(); };
  const c = $('#tplCancel');
  if (c) c.onclick = () => $('#dlgStart').close();
  if (!$('#dlgStart').open) $('#dlgStart').showModal();
}

/* ============================================================
   スマホ用の画面
   ============================================================ */
const phoneMQ = window.matchMedia('(max-width: 700px), (max-width: 900px) and (orientation: portrait), (max-height: 500px) and (pointer: coarse), (max-width: 900px) and (max-height: 560px)');
let isPhone = false;
const movedEls = [];
// 指2本でスクロール（1本目で置きかけた音は取り消す）
const touchPts = new Map();
let pan = null;
function centroid() {
  const ps = [...touchPts.values()];
  return { x: ps.reduce((a, p) => a + p.x, 0) / ps.length, y: ps.reduce((a, p) => a + p.y, 0) / ps.length };
}
function panDown(e) {
  if (e.pointerType !== 'touch') return;
  touchPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (touchPts.size === 2 && pending) { clearTimeout(pending.timer); pending = null; }
  if (touchPts.size === 2) {
    if (drag && drag.snap && drag.kind !== 'ruler') { song = JSON.parse(drag.snap); changed(); }
    drag = null;
    const sc = $('#scroller');
    const ps = [...touchPts.values()];
    const c = centroid();
    const a = zoomAnchor(c.x, c.y);
    pan = { sx: sc.scrollLeft, sy: sc.scrollTop, c, dx0: Math.abs(ps[0].x - ps[1].x), dy0: Math.abs(ps[0].y - ps[1].y), z0: ui.zoom, rh0: ui.rh, a };
  }
}
function panMove(e) {
  if (!touchPts.has(e.pointerId)) return;
  touchPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!pan) return;
  const c = centroid();
  const ps = [...touchPts.values()];
  if (ps.length < 2) return;
  const dx = Math.abs(ps[0].x - ps[1].x);
  const dy = Math.abs(ps[0].y - ps[1].y);
  // 指の向きに合わせて：横にならんだ指＝横の大きさ、たてにならんだ指＝たての大きさ（ななめなら両方）
  const useX = pan.dx0 > 40 && pan.dx0 > pan.dy0 * 0.45;
  const useY = pan.dy0 > 40 && pan.dy0 > pan.dx0 * 0.45 && track().type !== 'chord';
  const z = useX ? pan.z0 * dx / pan.dx0 : pan.z0;
  const rh = useY ? pan.rh0 * dy / pan.dy0 : pan.rh0;
  applyZoom(z, rh, pan.a, c.x, c.y, true);
}
function panUp(e) {
  touchPts.delete(e.pointerId);
  if (touchPts.size < 2 && pan) { pan = null; drag = null; saveZoom(); }
}

function setPhoneView(v) {
  if (v === 'score') {
    $('#phoneMore').classList.remove('open');
    document.body.dataset.view = 'edit';
    $$('#phoneNav button').forEach((b) => b.classList.toggle('on', b.dataset.view === 'score'));
    setView('score');
    return;
  }
  if (v === 'edit' && ui.view === 'score') setView('grid');
  if (v === 'more') { $('#phoneMore').classList.toggle('open'); return; }
  $('#phoneMore').classList.remove('open');
  document.body.dataset.view = v;
  $$('#phoneNav button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
  requestAnimationFrame(() => { resizeEditor(); draw(); drawOverview(); if (v === 'tracks') renderTracks(); });
}
/* ---------- マス目の大きさ（ピアノロールのズーム） ----------
   ・2本指でつまむ／ひろげる（横にならべた指＝横、たて＝たて、ななめ＝両方）
   ・Ctrl＋ホイール／トラックパッドのつまむ操作（鍵盤の列の上・Alt つきは たて）
   ・右下の －／ぴったり／＋、キーボードの － ＝ 0
   どれも、指やマウスの所がずれないように大きさを変えます。大きさはおぼえておきます */
const ZOOM_MIN = 8;
const ZOOM_MAX = 480;
const RH_MIN = 10;
const RH_MAX = 64;
// ある画面上の点が、曲のどこ（何tick・何行目）にあたるか
function zoomAnchor(cx, cy) {
  const sc = $('#scroller');
  const r = sc.getBoundingClientRect();
  if (cx == null) cx = r.left + LW + (r.width - LW) / 2;
  if (cy == null) cy = r.top + RH + (r.height - RH) / 2;
  const px = clamp(cx - r.left, LW, r.width);
  const py = clamp(cy - r.top, RH, r.height);
  return { tick: (px + sc.scrollLeft - LW) / ppt(), row: (py + sc.scrollTop - RH) / rowH(track()), cx, cy };
}
let zoomHudT = 0;
let fitState = null;
function applyZoom(z, rh, a, cx, cy, keepFit) {
  const sc = $('#scroller');
  const r = sc.getBoundingClientRect();
  const zMin = Math.max(ZOOM_MIN, (MIN_CELL / ui.grid) * TPQ);
  ui.zoom = Math.round(clamp(z, zMin, ZOOM_MAX) * 10) / 10;
  ui.rh = Math.round(clamp(rh, RH_MIN, RH_MAX) * 10) / 10;
  $('#zoom').value = ui.zoom;
  $('#rowZoom').value = ui.rh;
  resizeEditor();
  if (a) {
    const px = clamp((cx == null ? a.cx : cx) - r.left, LW, r.width);
    const py = clamp((cy == null ? a.cy : cy) - r.top, RH, r.height);
    sc.scrollLeft = a.tick * ppt() - px + LW;
    sc.scrollTop = a.row * rowH(track()) - py + RH;
  }
  if (!keepFit) fitState = null;
  draw();
  drawOverview();
  showZoomHud();
  if (!pan) saveZoomSoon();
}
function zoomDefaults() { return isPhone ? [72, 30] : [56, 22]; }
function showZoomHud() {
  const h = $('#zoomHud');
  const [z0, r0] = zoomDefaults();
  h.textContent = `↔ ${Math.round((ppt() * TPQ / z0) * 100)}%　↕ ${Math.round((ui.rh / r0) * 100)}%`;
  h.classList.add('show');
  clearTimeout(zoomHudT);
  zoomHudT = setTimeout(() => h.classList.remove('show'), 900);
  $('#zFit').classList.toggle('on', !!fitState);
}
function zoomStep(dir) {
  const a = zoomAnchor();
  const base = Math.max(ui.zoom, ppt() * TPQ); // 限度に当たっていても、すぐ反応するように
  applyZoom(base * (dir > 0 ? 1.3 : 1 / 1.3), ui.rh * (dir > 0 ? 1.1 : 1 / 1.1), a);
  saveZoom();
}
// ぴったり：曲全体を横いっぱいに、使っている音の高さをたていっぱいに。もう一度おすと元にもどる
function zoomFit() {
  const sc = $('#scroller');
  if (fitState) {
    const p = fitState.prev;
    fitState = null;
    applyZoom(p.z, p.rh, null);
    sc.scrollLeft = p.sl;
    sc.scrollTop = p.st;
    draw(); drawOverview(); saveZoom();
    toast('元の大きさにもどしました');
    return;
  }
  const prev = { z: ui.zoom, rh: ui.rh, sl: sc.scrollLeft, st: sc.scrollTop };
  const w = sc.clientWidth - LW - 12;
  const h = sc.clientHeight - RH - 6;
  const z = (w / totalTicks()) * TPQ;
  const tr = track();
  const rows = rowsFor(tr);
  let i0 = 0;
  let i1 = rows.length - 1;
  if (tr.type === 'melody' && tr.notes.length) {
    const idx = tr.notes.map((n) => rows.findIndex((r) => r.p === n.p)).filter((i) => i >= 0);
    if (idx.length) { i0 = Math.max(0, Math.min(...idx) - 1); i1 = Math.min(rows.length - 1, Math.max(...idx) + 1); }
  }
  const rh = tr.type === 'chord' ? ui.rh : Math.min(RH_MAX, Math.max(14, h / (i1 - i0 + 1)));
  applyZoom(z, rh, null);
  sc.scrollLeft = 0;
  sc.scrollTop = i0 * rowH(tr);
  fitState = { prev };
  draw(); drawOverview(); showZoomHud(); saveZoom();
  toast(ppt() * TPQ > z + 0.5 ? '入るだけ小さくしました（もう一度で元にもどる）' : '曲の全体を表示（もう一度で元にもどる）');
}
let zoomSaveT = 0;
function saveZoomSoon() { clearTimeout(zoomSaveT); zoomSaveT = setTimeout(saveZoom, 400); }
function saveZoom() {
  try {
    const all = JSON.parse(localStorage.getItem('otsumiki-zoom') || '{}');
    all[isPhone ? 'phone' : 'pc'] = [ui.zoom, ui.rh];
    localStorage.setItem('otsumiki-zoom', JSON.stringify(all));
  } catch (e) { /* なし */ }
}
function loadZoom() {
  try {
    const v = JSON.parse(localStorage.getItem('otsumiki-zoom') || '{}')[isPhone ? 'phone' : 'pc'];
    if (v) { ui.zoom = clamp(+v[0] || 56, ZOOM_MIN, ZOOM_MAX); ui.rh = clamp(+v[1] || 22, RH_MIN, RH_MAX); $('#zoom').value = ui.zoom; $('#rowZoom').value = ui.rh; }
  } catch (e) { /* なし */ }
}
function applyPhone() {
  const on = phoneMQ.matches;
  if (on === isPhone) return;
  isPhone = on;
  document.body.classList.toggle('lowpower', LOW_POWER);
  document.body.classList.toggle('phone', on);
  if (on) {
    // パソコンでは上のバーにある部品を「その他」シートへ移す
    for (const sel of ['.topbar .tempo', '#btnMetro', '#popPractice', '#popKey', '#popRules', '#btnPal', '#btnShare', '.menu details.dropdown']) {
      // タブレット（はば700以上）では、テンポ・メトロノーム・練習は上のバーにのこす
      if (matchMedia('(min-width: 700px)').matches && ['.topbar .tempo', '#btnMetro', '#popPractice'].includes(sel)) continue;
      const el = $(sel);
      if (!el) continue;
      const mark = document.createComment('phone');
      el.parentNode.insertBefore(mark, el);
      movedEls.push([el, mark]);
      $('#phoneMoreBody').appendChild(el);
    }
    LW = 54;
    OV_LW = 84;
    OV_RH = 30;
    if (ui.rh === 22) { ui.rh = 30; $('#rowZoom').value = 30; }
    if (ui.zoom === 56) { ui.zoom = 72; $('#zoom').value = 72; }
    loadZoom();
    if (!document.body.dataset.view) document.body.dataset.view = 'edit';
  } else {
    for (const [el, mark] of movedEls.splice(0)) { mark.parentNode.insertBefore(el, mark); mark.parentNode.removeChild(mark); }
    LW = 82;
    OV_LW = 110;
    OV_RH = 20;
    if (ui.rh === 30) { ui.rh = 22; $('#rowZoom').value = 22; }
    if (ui.zoom === 72) { ui.zoom = 56; $('#zoom').value = 56; }
    loadZoom();
    document.body.dataset.view = '';
    $('#phoneMore').classList.remove('open');
  }
  if (on) ui.sc.input = false; // スマホでは、楽譜をタップ＝えらぶ（入力は下のパネルで）
  renderEditorTools();
  renderPhoneKbd();
  renderPhonePad();
  applyLayout();
  resizeEditor();
  draw();
  drawOverview();
}
/* ---------- かんたん表示：はじめての人には、よく使うボタンだけ（「くわしく」で全部のボタン） ---------- */
function simpleOn() { return document.body.classList.contains('simple') && !document.body.classList.contains('phone'); }
function applySimple(on, quiet) {
  document.body.classList.toggle('simple', on);
  lsSet('otsumiki-simple', on ? '1' : '0');
  const b = $('#btnSimple');
  if (b) { b.querySelector('span').textContent = on ? 'くわしく' : 'かんたん'; b.title = on ? 'もっとたくさんのボタンを出す（くわしい表示）' : 'よく使うボタンだけにする（かんたん表示）'; b.setAttribute('aria-pressed', String(!on)); }
  if (ui.sc) ui.sc.compact = on ? true : lsGet('otsumiki-scpal', '0') === '1';
  if (typeof renderScorePal === 'function' && ui.view === 'score') renderScorePal();
  if (!quiet) {
    resizeEditor(); draw(); drawOverview();
    if (ui.view === 'score') renderScoreEdit();
    toast(on ? 'かんたん表示：よく使うボタンだけにしました（右上の「くわしく」で全部出ます）' : 'くわしい表示：全部のボタンを出しました（「かんたん」でもどせます）', 3500);
  }
}
// タッチの画面：ボタンを長おしすると、そのボタンの説明が出る（マウスをのせられないので）
function initLongPress() {
  let timer = 0;
  let shown = null;
  let swallow = false;
  const hide = () => { if (shown) { shown.remove(); shown = null; } };
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    const el = e.target.closest && e.target.closest('button[title], summary[title], [data-cap][title], label[title], select[title]');
    if (!el) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      hide();
      const tip = document.createElement('div');
      tip.className = 'lpTip';
      tip.textContent = el.title;
      document.body.appendChild(tip);
      const r = el.getBoundingClientRect();
      tip.style.left = clamp(r.left + r.width / 2 - tip.offsetWidth / 2, 8, innerWidth - tip.offsetWidth - 8) + 'px';
      tip.style.top = (r.bottom + 8 + tip.offsetHeight < innerHeight ? r.bottom + 8 : r.top - tip.offsetHeight - 8) + 'px';
      shown = tip;
      swallow = true; // 長おしのあとは、ボタンをおしたことにしない
      setTimeout(hide, 2600);
    }, 550);
  }, true);
  const cancel = () => clearTimeout(timer);
  document.addEventListener('pointerup', cancel, true);
  document.addEventListener('pointercancel', cancel, true);
  document.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch' && Math.abs(e.movementX) + Math.abs(e.movementY) > 6) cancel(); }, true);
  document.addEventListener('click', (e) => { if (swallow) { swallow = false; e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener('contextmenu', (e) => { if (shown) e.preventDefault(); }, true);
}
function initSimple() {
  initLongPress();
  // はじめて使う人（保存した曲がない）は、かんたん表示から
  let v = lsGet('otsumiki-simple', '');
  if (!v) { let used = NO_TOUR; try { used = used || !!(localStorage.getItem('otsumiki-autosave') || localStorage.getItem('otsumiki-songs')); } catch (e) { /* なし */ } v = used ? '0' : '1'; }
  applySimple(v === '1', true);
  const b = $('#btnSimple');
  if (b) b.onclick = () => applySimple(!document.body.classList.contains('simple'));
}
/* ---------- 画面の区切りをドラッグして、トラック・曲の地図・下の楽譜の大きさを変える（パソコン・タブレット） ---------- */
const LAYOUT_KEY = 'otsumiki-layout';
var layout = (() => { try { return JSON.parse(localStorage.getItem(LAYOUT_KEY)) || {}; } catch { return {}; } })();
function saveLayout() { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch { /* 保存できなくても動く */ } }
function applyLayout() {
  const phone = document.body.classList.contains('phone');
  const side = $('.main > .tracks');
  if (side && !floatOn('tracks')) side.style.width = !phone && layout.tw ? layout.tw + 'px' : '';
  if (!phone) OV_RH = layout.ovrh || 20;
  if (side && !floatOn('tracks')) side.classList.toggle('narrow', !phone && layout.tw != null && layout.tw < 150);
  const tl = $('#trackList');
  if (tl) tl.style.zoom = !phone && layout.tz && layout.tz !== 1 ? String(layout.tz) : '';
  const ca = $('.canvas-area');
  if (ca) ca.classList.toggle('folded', !phone && !!layout.ovHide);
  const fb = $('#ovFold');
  if (fb) { fb.textContent = layout.ovHide ? '▾ ひらく' : '▴ たたむ'; fb.setAttribute('aria-expanded', String(!layout.ovHide)); }
  $$('#ovMode button').forEach((b) => b.classList.toggle('on', (layout.ovMode || 'normal') === b.dataset.m));
  const sp = $('#scorePanel');
  if (sp && !floatOn('score')) { sp.style.maxHeight = !phone && layout.sph ? layout.sph + 'px' : ''; sp.style.height = !phone && layout.sph ? layout.sph + 'px' : ''; }
  applyFloats();
}
/* ---------- 窓をポップアップ（うかせる）・もとの場所にもどす：トラック・曲の地図・下の楽譜 ---------- */
const FLOATS = {
  tracks: { sel: '.main > .tracks', head: '.tracks-head', name: 'トラック', w: 270, h: 460 },
  canvas: { sel: '.canvas-area', head: '.ovtools', name: '曲の地図', w: 760, h: 220 },
  score: { sel: '#scorePanel', head: '.sphead', name: '楽譜', w: 720, h: 320 },
};
let floatZ = 40;
function floatOn(k) { return !!(layout.float && layout.float[k]) && !document.body.classList.contains('phone'); }
function applyFloats() {
  for (const k in FLOATS) {
    const el = $(FLOATS[k].sel);
    if (!el) continue;
    const on = floatOn(k);
    el.classList.toggle('floating', on);
    document.body.classList.toggle('float-' + k, on);
    const btn = el.querySelector('.floatbtn');
    if (btn) { btn.title = on ? 'もとの場所にもどす（ならべて表示）' : 'ポップアップにする（うかせて、すきな場所へ）'; btn.textContent = on ? '⇲' : '⧉'; btn.setAttribute('aria-pressed', String(on)); }
    if (on) {
      const R = layout.float[k];
      R.w = clamp(R.w || FLOATS[k].w, 160, innerWidth - 8);
      R.h = clamp(R.h || FLOATS[k].h, 60, innerHeight - 8);
      R.x = clamp(R.x != null ? R.x : innerWidth - R.w - 24, 4, innerWidth - 60);
      R.y = clamp(R.y != null ? R.y : 90, 4, innerHeight - 40);
      Object.assign(el.style, { left: R.x + 'px', top: R.y + 'px', width: R.w + 'px', height: R.h + 'px', maxHeight: 'none' });
      if (k === 'tracks') el.classList.toggle('narrow', R.w < 150);
    } else if (el.style.left) {
      el.style.left = el.style.top = el.style.zIndex = '';
      if (k !== 'tracks') el.style.width = '';
      if (k !== 'score') el.style.height = '';
      if (k === 'score') el.style.height = el.style.maxHeight = '';
      if (k === 'tracks') el.style.width = '';
    }
  }
}
function floatToggle(k) {
  if (!layout.float) layout.float = {};
  if (floatOn(k)) delete layout.float[k];
  else {
    const el = $(FLOATS[k].sel);
    const r = el.getBoundingClientRect();
    // いまの場所から少しずらして、うかせる
    layout.float[k] = { x: Math.round(r.left + 24), y: Math.round(r.top + 24), w: Math.round(k === 'tracks' ? r.width : Math.min(Math.max(FLOATS[k].w * 0.8, r.width), FLOATS[k].w * 1.25)), h: Math.round(k === 'canvas' || k === 'score' ? Math.max(FLOATS[k].h, Math.min(r.height, 420)) : Math.min(r.height, FLOATS[k].h + 200)) };
    if (k === 'score') { ui.showScore = true; const cb = $('#btnScorePanel'); if (cb) cb.checked = true; renderScorePanel(); }
  }
  applyLayout();
  saveLayout();
  relayoutAll();
  toast(floatOn(k) ? `「${FLOATS[k].name}」をポップアップにしました（上の帯をドラッグで動かす・右下で大きさ）` : `「${FLOATS[k].name}」をもとの場所にもどしました`);
}
function initFloats() {
  for (const k in FLOATS) {
    const el = $(FLOATS[k].sel);
    const head = el && el.querySelector(FLOATS[k].head);
    if (!head) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mini floatbtn';
    btn.onclick = (e) => { e.stopPropagation(); floatToggle(k); };
    head.appendChild(btn);
    // 上の帯をつかんで動かす
    head.addEventListener('pointerdown', (e) => {
      if (!floatOn(k) || e.button !== 0 || e.target.closest('button, input, select, summary, details, a, label')) return;
      e.preventDefault();
      const R = layout.float[k];
      const x0 = e.clientX - R.x;
      const y0 = e.clientY - R.y;
      el.style.zIndex = ++floatZ;
      document.body.classList.add('splitting');
      const mv = (ev) => { R.x = clamp(ev.clientX - x0, 4 - R.w + 80, innerWidth - 80); R.y = clamp(ev.clientY - y0, 4, innerHeight - 40); el.style.left = R.x + 'px'; el.style.top = R.y + 'px'; };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); document.body.classList.remove('splitting'); saveLayout(); };
      addEventListener('pointermove', mv);
      addEventListener('pointerup', up);
      addEventListener('pointercancel', up);
    });
    el.addEventListener('pointerdown', () => { if (floatOn(k)) el.style.zIndex = ++floatZ; }, true);
    // 右下をつまんで大きさを変えたら、おぼえて描きなおす
    let t = 0;
    new ResizeObserver(() => {
      if (!floatOn(k)) return;
      const R = layout.float[k];
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      if (w === R.w && h === R.h) return;
      R.w = w;
      R.h = h;
      if (k === 'tracks') el.classList.toggle('narrow', w < 150);
      clearTimeout(t);
      t = setTimeout(() => { saveLayout(); relayoutAll(); }, 60);
    }).observe(el);
  }
  addEventListener('resize', () => { if (layout.float && Object.keys(layout.float).length) applyFloats(); });
}
function relayoutAll() {
  resizeOverview();
  drawOverview();
  resizeEditor();
  draw();
  if (ui.view === 'score') renderScoreEdit();
}
function splitterDrag(el, onMove, onReset) {
  if (!el) return;
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const x0 = e.clientX;
    const y0 = e.clientY;
    const st = onMove(null);
    el.classList.add('on');
    document.body.classList.add('splitting');
    let raf = 0;
    const mv = (ev) => { const dx = ev.clientX - x0; const dy = ev.clientY - y0; cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { onMove({ dx, dy, st }); relayoutAll(); }); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); el.classList.remove('on'); document.body.classList.remove('splitting'); saveLayout(); relayoutAll(); };
    addEventListener('pointermove', mv);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
  });
  el.addEventListener('dblclick', () => { onReset(); applyLayout(); saveLayout(); relayoutAll(); });
  // キーボードでも（← → ↑ ↓）
  el.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[e.key];
    if (!d) return;
    e.preventDefault();
    const st = onMove(null);
    onMove({ dx: d[0], dy: d[1], st });
    saveLayout();
    relayoutAll();
  });
}
function initSplitters() {
  initFloats();
  initPanelZoom();
  applyLayout();
  splitterDrag($('#splitTracks'), (m) => {
    const side = $('.main > .tracks');
    if (!m) return side.getBoundingClientRect().width;
    // せまくすると、アイコンと番号だけになる（楽譜を広く見たいとき）
    layout.tw = Math.round(clamp(m.st + m.dx, 64, Math.min(560, innerWidth * 0.5)));
    if (layout.tw < 150 && layout.tw > 110) layout.tw = m.dx < 0 ? 72 : 150;
    side.style.width = layout.tw + 'px';
    side.classList.toggle('narrow', layout.tw < 150);
  }, () => { delete layout.tw; });
  splitterDrag($('#splitOv'), (m) => {
    if (!m) return layout.ovHide ? 4 : OV_RH;
    // 曲の地図の高さ＝行の高さ（トラックの数で割る）。上までよせると、たたむ
    const v = m.st + m.dy / Math.max(1, ovRows().length);
    layout.ovHide = v < 9;
    if (!layout.ovHide) { layout.ovrh = Math.round(clamp(v, 12, 56)); OV_RH = layout.ovrh; }
    applyLayout();
  }, () => { delete layout.ovrh; delete layout.ovHide; });
  const fb = $('#ovFold');
  if (fb) fb.onclick = () => { layout.ovHide = !layout.ovHide; applyLayout(); saveLayout(); relayoutAll(); };
  $$('#ovMode button').forEach((b) => (b.onclick = () => {
    layout.ovMode = b.dataset.m === 'normal' ? undefined : b.dataset.m;
    delete layout.ovbz;
    if (layout.ovHide) layout.ovHide = false;
    applyLayout(); saveLayout(); relayoutAll();
    toast(b.dataset.m === 'fit' ? '曲の地図：曲ぜんぶを、つめて表示' : b.dataset.m === 'big' ? '曲の地図：大きく表示（横にスクロール）' : '曲の地図：ふつうの大きさ');
  }));
  splitterDrag($('#splitScore'), (m) => {
    const sp = $('#scorePanel');
    if (!m) return sp.getBoundingClientRect().height;
    layout.sph = Math.round(clamp(m.st - m.dy, 80, innerHeight * 0.8));
    sp.style.maxHeight = sp.style.height = layout.sph + 'px';
  }, () => { delete layout.sph; });
}
/* ---------- トラック欄・曲の地図・マス目の大きさを、横とたてで別々に変える（ボタン・Ctrl＋ホイール） ---------- */
function zoomToast(what, v) { toast(`${what}：${Math.round(v * 100)}%`); }
function trackZoom(axis, dir) {
  const side = $('.main > .tracks');
  if (axis === 'x') {
    const w0 = layout.tw || side.getBoundingClientRect().width || 262;
    layout.tw = Math.round(clamp(w0 * (dir > 0 ? 1.15 : 1 / 1.15), 64, Math.min(560, innerWidth * 0.5)));
    applyLayout(); saveLayout(); relayoutAll();
    toast(`トラック欄のはば：${layout.tw}px`);
  } else {
    layout.tz = Math.round(clamp((layout.tz || 1) * (dir > 0 ? 1.12 : 1 / 1.12), 0.6, 1.8) * 100) / 100;
    if (Math.abs(layout.tz - 1) < 0.03) delete layout.tz;
    applyLayout(); saveLayout();
    zoomToast('トラックの大きさ', layout.tz || 1);
  }
}
function ovZoom(axis, dir) {
  if (layout.ovHide) layout.ovHide = false;
  if (axis === 'x') {
    layout.ovbz = Math.round(clamp((layout.ovbz || 1) * (dir > 0 ? 1.25 : 1 / 1.25), 0.25, 6) * 100) / 100;
    if (Math.abs(layout.ovbz - 1) < 0.03) delete layout.ovbz;
    applyLayout(); saveLayout(); relayoutAll();
    zoomToast('曲の地図の横', layout.ovbz || 1);
  } else {
    const v = clamp(Math.round(OV_RH * (dir > 0 ? 1.2 : 1 / 1.2)), 8, 56);
    layout.ovrh = v === OV_RH ? clamp(v + dir, 8, 56) : v;
    OV_RH = layout.ovrh;
    applyLayout(); saveLayout(); relayoutAll();
    toast(`曲の地図のたて：1パート ${layout.ovrh}px`);
  }
}
function gridZoom(axis, dir) {
  const a = zoomAnchor();
  if (axis === 'x') { const base = Math.max(ui.zoom, ppt() * TPQ); applyZoom(base * (dir > 0 ? 1.25 : 1 / 1.25), ui.rh, a); }
  else applyZoom(ui.zoom, ui.rh * (dir > 0 ? 1.15 : 1 / 1.15), a);
  saveZoom();
}
function initPanelZoom() {
  const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  on('#zxIn', () => gridZoom('x', 1)); on('#zxOut', () => gridZoom('x', -1));
  on('#zyIn', () => gridZoom('y', 1)); on('#zyOut', () => gridZoom('y', -1));
  on('#ovxIn', () => ovZoom('x', 1)); on('#ovxOut', () => ovZoom('x', -1));
  on('#ovyIn', () => ovZoom('y', 1)); on('#ovyOut', () => ovZoom('y', -1));
  on('#txIn', () => trackZoom('x', 1)); on('#txOut', () => trackZoom('x', -1));
  on('#tyIn', () => trackZoom('y', 1)); on('#tyOut', () => trackZoom('y', -1));
  // Ctrl（Mac は ⌘）＋ホイール：横の大きさ。Shift もおすと たて
  const wheel = (el, fn) => el && el.addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const now = performance.now();
    if (now - (el._zt || 0) < 90) return; // トラックパッドで速くなりすぎないように
    el._zt = now;
    const d = e.deltaY || e.deltaX;
    if (d) fn(e.shiftKey ? 'y' : 'x', d < 0 ? 1 : -1);
  }, { passive: false });
  wheel($('#ovWrap'), ovZoom);
  wheel($('#trackList'), (ax, dir) => trackZoom(ax === 'x' ? 'y' : 'x', dir)); // トラック欄はたて（大きさ）がふつう、Shift ではば
}
function renderChips() {
  const box = $('#trackChips');
  box.innerHTML = song.tracks.map((t, i) => `<button class="chip ${i === cur ? 'on' : ''}" data-i="${i}" style="--tc:${TRACK_COLORS[i % TRACK_COLORS.length]}"><i class="dot"></i>${escapeHtml(t.name)}${t.mute ? I('mute') : ''}${t.locked ? I('lock') : ''}</button>`).join('') + (song.locks.tracks ? '' : `<button class="chip add" data-add="1" aria-label="トラックを追加" title="トラックを追加">${I('plus')}</button>`);
  box.querySelectorAll('.chip[data-i]').forEach((b) => (b.onclick = () => {
    const i = +b.dataset.i;
    if (i === cur) setPhoneView('tracks'); else { selectTrack(i); renderPhoneKbd(); }
  }));
  const add = box.querySelector('[data-add]');
  if (add) add.onclick = () => { setPhoneView('tracks'); $('#addRow').open = true; };
  const on = box.querySelector('.chip.on');
  if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
// スマホの画面の鍵盤（鍵盤入力のとき）
function renderPhoneKbd() {
  const el = $('#phoneKbd');
  const show = isPhone && ui.stepRec;
  el.hidden = !show;
  if (!show) return;
  const tr = track();
  let keys = '';
  if (tr.type === 'drum') {
    const ids = kitRows(tr);
    keys = `<div class="pkpads">${[...ids].reverse().slice(0, 8).map((id, i) => `<button class="pkpad" data-i="${i}">${PIC('drum', id)}<span>${shortDrum(Sound.DRUMS[id].name)}</span></button>`).join('')}</div>`;
  } else {
    const base = ui.kbOct * 12 + 12;
    let w = '';
    let bl = '';
    let wi = 0;
    for (let i = 0; i < 13; i++) {
      const m = base + i;
      if ([1, 3, 6, 8, 10].includes(m % 12)) bl += `<button class="pk black" data-m="${m}" style="left:calc(${wi} * 12.5% - 3.75%)"></button>`;
      else { w += `<button class="pk white" data-m="${m}"><span>${noteName(m)}</span></button>`; wi++; }
    }
    keys = `<div class="pkeys">${w}${bl}</div>`;
  }
  el.innerHTML = `<div class="pkbar">
    <button class="mini" data-a="oct-">◀</button><b>C${ui.kbOct}</b><button class="mini" data-a="oct+">▶</button>
    <span class="grow"></span>
    <button class="mini" data-a="back" title="ひとつもどって消す">⌫</button><button class="mini" data-a="rest" title="休み（次へ進む）">→ 休み</button><button class="mini icon" data-a="close">${I('x')}</button></div>${keys}`;
  el.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'oct-' || a === 'oct+') { ui.kbOct = clamp(ui.kbOct + (a === 'oct+' ? 1 : -1), 1, 7); renderPhoneKbd(); }
    else if (a === 'back') stepBackspace();
    else if (a === 'rest') advanceCursor(1);
    else { ui.stepRec = false; $('#btnStepRec').classList.remove('on'); renderPhoneKbd(); draw(); }
  }));
  const press = (key, fn) => (e) => { e.preventDefault(); if (held.has(key)) return; held.set(key, 1); fn(); };
  const release = (key) => () => { if (held.delete(key)) noteOff(); };
  el.querySelectorAll('.pk').forEach((b) => {
    const m = +b.dataset.m;
    b.onpointerdown = (e) => { e.preventDefault(); if (held.has('p' + m)) return; held.set('p' + m, m); noteOn(m); };
    b.onpointerup = b.onpointercancel = b.onpointerleave = release('p' + m);
  });
  el.querySelectorAll('.pkpad').forEach((b) => {
    const i = +b.dataset.i;
    b.onpointerdown = press('d' + i, () => noteOn(0, i));
    b.onpointerup = b.onpointercancel = b.onpointerleave = release('d' + i);
  });
  requestAnimationFrame(() => { resizeEditor(); draw(); });
}

/* ============================================================
   保存・読み込み・共有・書き出し
   ============================================================ */
// 曲に何か入っているか
function songHasContent(sg) {
  return !!(sg && Array.isArray(sg.tracks) && sg.tracks.some((t) => (t.notes && t.notes.length) || (t.grid && Object.values(t.grid).some((g) => Object.keys(g).length)) || (t.chords && t.chords.some(Boolean))));
}
// ほかの曲を開く前に、今の曲を「マイ曲」へしまっておく（同じ中身がもうあれば、しない）
function keepSong(sg) {
  if (!songHasContent(sg)) return null;
  const all = savedList();
  const json = JSON.stringify(sg);
  for (const n in all) if (JSON.stringify(all[n].song) === json) return null;
  const d = new Date();
  const stamp = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  let name = sg.title || 'むだいの曲';
  if (all[name]) name = `${name}（${stamp}）`;
  for (let i = 2; all[name]; i++) name = `${sg.title || 'むだいの曲'}（${stamp}・${i}）`;
  all[name] = { t: Date.now(), song: sg, auto: true };
  // 自動でしまったものは、新しい20曲まで
  const autos = Object.keys(all).filter((n) => all[n].auto).sort((a, b) => all[b].t - all[a].t);
  // 同じ名前でも上書きしない（同じ分に何曲あっても）
  for (const n of autos.slice(20)) delete all[n];
  for (const n of autos.slice(3)) if (all[n] && all[n].song && all[n].song.voice) delete all[n].song.voice; // 録った声は大きいので、新しい3曲ぶんだけ
  // 保存の場所がいっぱいなら、古い「自動でしまった曲」と録った声から消して、やりなおす
  for (let tries = 0; tries < 30; tries++) {
    try { localStorage.setItem('otsumiki-songs', JSON.stringify(all)); return name; } catch (e) {
      const olds = Object.keys(all).filter((n) => all[n].auto && n !== name).sort((a, b) => all[a].t - all[b].t);
      const withVoice = Object.keys(all).find((n) => all[n].song && all[n].song.voice);
      if (withVoice) delete all[withVoice].song.voice;
      else if (olds.length) delete all[olds[0]];
      else break;
    }
  }
  warnSaveFailed();
  return null;
}
function loadSong(s, opts = {}) {
  stop();
  if (opts.keep !== false && opts.own) studentOpen = false;
  if (!s || !Array.isArray(s.tracks)) throw new Error('曲データの形式がちがいます');
  s = sanitizeSong(migrate(JSON.parse(JSON.stringify(s)))); // ここでだめなら、今の曲はそのまま
  // 自分で作った・開いた曲だけしまう（はじめのサンプルなどは、しまわない）
  const prevSnap = opts.keep === false || !songOwn || !song || !song.tracks ? null : snapshot();
  const kept = prevSnap ? keepSong(JSON.parse(prevSnap)) : null;
  // うまく開けなかったときに、前の曲にもどすため
  const back = { song, cur, undo: undoStack.slice(), redo: redoStack.slice() };
  try {
  const base = newSong();
  song = { ...base, ...s, eq: { ...base.eq, ...(s.eq || {}) }, metro: { ...base.metro, ...(s.metro || {}) }, locks: { ...base.locks, ...(s.locks || {}) }, tempos: s.tempos || {} };
  song.tracks = s.tracks.slice(0, MAX_TRACKS).map((t) => ({ ...newTrack(t.type), ...t, id: t.id || uid() }));
  // 読みこんだ楽譜に TAB譜があった（MuseScore・MusicXML）：楽譜の設定に入れる
  for (const t of song.tracks) {
    if (t.tabView === 'both' || t.tabView === 'only') { song.score = { ...(song.score || {}) }; song.score.tab = { ...(song.score.tab || {}), [t.id]: t.tabView }; }
    delete t.tabView;
  }
  autoNameTracks();
  song.repeats = { start: [], end: [], volta: {}, ...(s.repeats || {}) };
  song.pickup = s.pickup || 0;
  song.meters = s.meters || {};
  song.keys = s.keys || {};
  song.jumps = s.jumps || {};
  song.tempoText = s.tempoText || '';
  for (const t of song.tracks) if (t.type === 'melody' && t.lyrics && !t.notes.some((n) => n.ly)) { assignLyrics(t, t.lyrics); }
  ui.sc.cursor = 0;
  ui.sc.sel = new Set();
  cur = 0;
  if (song.task && song.tracks[song.task.tr]) cur = song.task.tr; // 課題のトラックをはじめから
  if (refSong && refSong._taskBars) refSong = null;
  ui.startTick = 0;
  ui.inputTick = 0;
  ui.loopRange = null;
  ui.loopOn = false;
  ui.sel = { t: 0, b0: 0, b1: 0 };
  ui.selBar = 0;
  undoStack.length = 0;
  redoStack.length = 0;
  // 「元に戻す」で、前の曲にもどれる
  if (prevSnap && songHasContent(JSON.parse(prevSnap))) pushUndo(prevSnap, '別の曲を開く');
  changed(true);
  } catch (err) {
    song = back.song; cur = back.cur;
    undoStack.length = 0; undoStack.push(...back.undo); redoStack.length = 0; redoStack.push(...back.redo);
    try { changed(true); } catch (e2) { /* 何もしない */ }
    throw err;
  }
  scrollToNotes();
  draw();
  preloadSamples();
  songOwn = !!opts.own;
  if (kept) setTimeout(() => toast(`前の曲は「マイ曲」に「${kept}」としてしまいました`), 1600);
}
// 曲の小さな絵（メロディを線で、リズムを点で）
function songThumb(sg) {
  const W = 120;
  const H = 40;
  const bt = ((sg.meter || [4, 4])[0] * 192) / (sg.meter || [4, 4])[1];
  const total = Math.max(1, (sg.bars || 8) * bt);
  const mel = (sg.tracks || []).filter((t) => t.type === 'melody' && (t.notes || []).length);
  const ps = mel.flatMap((t) => t.notes.map((x) => x.p));
  const lo = Math.min(...ps, 60) - 1;
  const hi = Math.max(...ps, 72) + 1;
  const cols = ['#e5484d', '#3e63dd', '#30a46c', '#f76b15', '#8e4ec6', '#d6409f'];
  let out = '';
  mel.slice(0, 4).forEach((t, i) => {
    for (const x of t.notes) {
      if (x.s >= total) continue;
      out += `<rect x="${(x.s / total * W).toFixed(1)}" y="${((hi - x.p) / (hi - lo) * (H - 4) + 1).toFixed(1)}" width="${Math.max(1.5, x.l / total * W - 0.5).toFixed(1)}" height="2.6" rx="1.2" fill="${cols[i % cols.length]}"/>`;
    }
  });
  if (!out) out = `<text x="${W / 2}" y="${H / 2 + 4}" text-anchor="middle" font-size="10" fill="#999">（音なし）</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">${out}</svg>`;
}
function relTime(t) {
  const d = (Date.now() - t) / 1000;
  if (d < 60) return 'いま';
  if (d < 3600) return `${Math.floor(d / 60)}分前`;
  if (d < 86400) return `${Math.floor(d / 3600)}時間前`;
  if (d < 86400 * 7) return `${Math.floor(d / 86400)}日前`;
  return new Date(t).toLocaleDateString('ja-JP');
}
function savedList() { try { return JSON.parse(localStorage.getItem('otsumiki-songs') || '{}'); } catch (e) { return {}; } }
function saveToBrowser() {
  const name = prompt('どの名前で保存しますか？', song.title);
  if (!name) return;
  const all = savedList();
  if (all[name] && !confirm('同じ名前の曲があります。上書きしますか？')) return;
  all[name] = { t: Date.now(), song: JSON.parse(snapshot()) };
  try { localStorage.setItem('otsumiki-songs', JSON.stringify(all)); toast('このブラウザに保存しました'); } catch (e) { alert('保存できませんでした（ブラウザの保存領域がいっぱいかもしれません）'); }
}
function openDialog() {
  const all = savedList();
  const names = Object.keys(all).sort((a, b) => all[b].t - all[a].t);
  const box = $('#openList');
  box.innerHTML = names.length ? '' : '<p class="muted">まだ保存した曲はありません。</p>';
  for (const n of names) {
    const row = document.createElement('div');
    row.className = 'openrow';
    const sg = all[n].song || {};
    const info = [`${sg.bars || '?'}小節`, `♩=${sg.bpm || '?'}`, `${(sg.tracks || []).length}トラック`].join('・');
    row.innerHTML = `<span class="openthumb">${songThumb(sg)}</span><span class="openname"><b>${escapeHtml(n)}</b><small>${info}　${relTime(all[n].t)}</small></span><button class="mini primary">開く</button><button class="mini icon danger" title="削除">${I('trash')}</button>`;
    const [bOpen, bDel] = row.querySelectorAll('button');
    row.querySelector('.openthumb').onclick = () => bOpen.click();
    bOpen.onclick = () => { loadSong(all[n].song, { own: true }); $('#dlgOpen').close(); };
    bDel.onclick = () => { if (!confirm(`「${n}」を削除しますか？`)) return; delete all[n]; localStorage.setItem('otsumiki-songs', JSON.stringify(all)); openDialog(); };
    box.appendChild(row);
  }
  if (!$('#dlgOpen').open) $('#dlgOpen').showModal();
}
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
const safeName = () => (song.title || 'song').replace(/[\\/:*?"<>|]/g, '_');
function exportJSON() { download(new Blob([JSON.stringify(song)], { type: 'application/json' }), safeName() + '.soranote.json'); toast('曲ファイルを書き出しました'); }
// ファイル（曲・MusicXML・MIDI）を曲のデータにする
function readSongFile(file) {
  return new Promise((ok, ng) => {
    const r = new FileReader();
    r.onerror = () => ng(new Error('ファイルを読めませんでした'));
    if (/\.(musicxml|xml|mxl|mscz|mscx)$/i.test(file.name)) {
      r.onload = () => MusicXMLImport.readFile(r.result, file.name).then(ok, ng);
      r.readAsArrayBuffer(file);
    } else if (/\.midi?$/i.test(file.name)) {
      r.onload = () => { try { ok(importMidi(new Uint8Array(r.result), file.name)); } catch (e) { ng(e); } };
      r.readAsArrayBuffer(file);
    } else {
      r.onload = () => { try { ok(JSON.parse(r.result)); } catch (e) { ng(e); } };
      r.readAsText(file);
    }
  });
}

/* ---------- お手本とくらべる ----------
   お手本の曲を読みこんで、今の曲のメロディと1音ずつくらべます。
   マス目に「たりない音」（緑の点線）と「ちがう音」（赤い×）を出し、あっている割合を出します */
/* ---------- 対位法れんしゅう（定旋律に対旋律をつけて、きまりを自動でチェック） ---------- */
const cpOn = () => !!(song.cp && song.cp.on && song.tracks.some((t) => t.id === song.cp.cfId) && song.tracks.some((t) => t.id === song.cp.cpId));
let cpCache = { key: '', res: null };
function cpResult() {
  if (!cpOn()) return null;
  const key = version + ':' + JSON.stringify(song.cp);
  if (cpCache.key === key) return cpCache.res;
  const cfT = song.tracks.find((t) => t.id === song.cp.cfId);
  const cpT = song.tracks.find((t) => t.id === song.cp.cpId);
  const cf = [];
  for (let b = 0; b < song.bars; b++) {
    const n = cfT.notes.filter((x) => x.s >= barStart(b) && x.s < barStart(b + 1)).sort((a, c) => a.s - c.s)[0];
    cf.push(n ? n.p : b ? cf[b - 1] : 60);
  }
  const res = Counterpoint.check({ cf, cp: cpT.notes, species: song.cp.species, above: song.cp.above });
  res.cf = cf;
  cpCache = { key, res };
  return res;
}
// 2つの声の音程の数字（3・5・6・8 …）
function cpIvNum(cpP, s) {
  const r = cpResult();
  const c = r.cf[Math.floor(s / 192)];
  if (c == null) return '';
  const v = Math.abs(cpP - c);
  const ic = v % 12;
  const num = [1, 2, 2, 3, 3, 4, 4, 5, 6, 6, 7, 7][ic] + 7 * Math.floor(v / 12);
  return ic === 0 && v ? String(1 + 7 * Math.floor(v / 12)) : String(num);
}
const CP_HOW = { 1: '全音符', 2: '2分音符', 3: '4分音符', 4: '2拍目からタイでのばす2分音符' };
const CP_KIND = { 1: '1対1：全音符に全音符', 2: '2対1：全音符に2分音符', 3: '4対1：全音符に4分音符', 4: '掛留：小節線をこえてのばし、ずらしてぶつける' };
// 第4類で小節線をこえてのばした音は「準備の音程→小節の頭の音程」（例 6→7）
function cpLabel(n, notes) {
  const a = cpIvNum(n.p, n.s);
  if (song.cp.species !== 4 || n.s % 192 === 0) return a;
  const nb = (Math.floor(n.s / 192) + 1) * 192;
  const r = cpResult();
  if (n.s + n.l <= nb || nb >= r.cf.length * 192 || notes.some((x) => x.s === nb && x.p !== n.p)) return a;
  return a + '→' + cpIvNum(n.p, nb);
}
function updateCp() {
  const bar = $('#cpBar');
  if (!bar) return;
  if (!cpOn()) { bar.hidden = true; return; }
  bar.hidden = false;
  const r = cpResult();
  const cnt = (lv) => r.issues.filter((x) => x.level === lv).length;
  const e = cnt('err');
  const w = cnt('warn');
  const h = cnt('hint');
  const done = r.filled === r.total;
  const sp = song.cp.species;
  let html;
  if (!r.notes) html = `<b>第${sp}類</b> 定旋律の${song.cp.above ? '上' : '下'}に、${CP_HOW[sp]}で対旋律を書こう`;
  else if (done && !e && !w) html = `<b>できました！</b> きまりは全部まもれています${h ? `（ヒント ${h}）` : ''}`;
  else html = `<b>第${sp}類</b> ${r.filled}/${r.total}小節　<span class="bad">まちがい ${e}</span>　<span class="warnc">注意 ${w}</span>${h ? `　<span class="hintc">ヒント ${h}</span>` : ''}`;
  $('#cpText').innerHTML = html;
  bar.classList.toggle('perfect', done && !e && !w);
}
function cpMarks(g2, X, rowIndex, rh, sy, k) {
  const r = cpResult();
  if (!r) return;
  const cpT = song.tracks.find((t) => t.id === song.cp.cpId);
  g2.save();
  g2.font = 'bold 11px sans-serif';
  g2.textBaseline = 'alphabetic';
  // 音程の数字（定旋律との間）
  for (const n of cpT.notes) {
    const ri = rowIndex.get(n.p);
    if (ri == null) continue;
    g2.fillStyle = C('--muted');
    g2.fillText(cpLabel(n, cpT.notes), X(n.s) + 4, RH + (ri + 1) * rh - sy + 12);
  }
  const seen = new Map();
  for (const is of r.issues) {
    if (!is.note || is.level === 'hint') continue;
    const n = is.note;
    const ri = rowIndex.get(n.p);
    if (ri == null) continue;
    const x = X(n.s);
    const y = RH + ri * rh - sy;
    const col = is.level === 'err' ? '#e03131' : '#e67700';
    g2.strokeStyle = col;
    g2.lineWidth = 2.5;
    roundRect(g2, x + 1, y + 1, Math.max(10, (n.l || 48) * k - 2), rh - 2, 6);
    g2.stroke();
    const key = n.s + ':' + n.p;
    const c = seen.get(key) || 0;
    seen.set(key, c + 1);
    const label = Counterpoint.SHORT[is.rule] || is.rule;
    const tw = g2.measureText(label).width + 8;
    g2.fillStyle = col;
    roundRect(g2, x + 2, y - 16 - c * 15, tw, 14, 4);
    g2.fill();
    g2.fillStyle = '#fff';
    g2.fillText(label, x + 6, y - 5 - c * 15);
  }
  g2.restore();
}
// 楽譜で編集：小節の上に印、対旋律の下に音程の数字
function cpScoreMarks() {
  const r = cpResult();
  const marks = {};
  for (const is of r.issues) {
    if (is.level === 'hint' || is.bar == null) continue;
    const t = Counterpoint.SHORT[is.rule] || is.rule;
    const b = is.note ? Math.floor(is.note.s / 192) : is.bar;
    if (!marks[b]) marks[b] = [];
    if (!marks[b].some((m) => m.t === t)) marks[b].push({ t, err: is.level === 'err' });
  }
  const cpT = song.tracks.find((t) => t.id === song.cp.cpId);
  const ivNums = {};
  for (const n of cpT.notes) ivNums[n.s] = cpLabel(n, cpT.notes);
  return { marks, ivNums, ivPart: song.cp.cpId };
}
function cpStart(cantus, species, above) {
  const c = Counterpoint.CANTI.find((x) => x.id === cantus) || Counterpoint.CANTI[0];
  const n = c.notes.length;
  const cfTr = newTrack('melody', { name: '定旋律', inst: 'organ', range: above ? 'alto' : 'soprano', locked: true, notes: c.notes.map((p, i) => ({ s: i * 192, p, l: 192 })) });
  const cpTr = newTrack('melody', { name: '対旋律', inst: above ? 'flute' : 'bassoon', range: above ? 'soprano' : 'tenor', notes: [] });
  loadSong({
    v: 2, title: `対位法 第${species}類（${c.name.split('・')[0].split('（')[0]}）`, bpm: 80, bars: n, meter: [4, 4], key: 0, scale: 'major',
    tracks: above ? [cpTr, cfTr] : [cfTr, cpTr],
    cp: { on: true, species, above, cantus: c.id, cfId: cfTr.id, cpId: cpTr.id },
  }, { own: true });
  selectTrack(song.tracks.findIndex((t) => t.id === song.cp.cpId));
  const g = { 1: 192, 2: 96, 3: 48, 4: 96 }[species];
  setGrid(g);
  ui.sc.dur = g; ui.sc.dot = false; ui.sc.trip = false;
  scrollToNotes();
  toast(species === 4 ? `定旋律の${above ? '上' : '下'}に、2拍目から音を出して次の小節の頭までのばそう（同じ音の2分音符2つでもOK）` : `定旋律の${above ? '上' : '下'}に、対旋律を書いてみよう。まちがいは赤、注意はオレンジで出ます`);
}
function cpDialog(mode) {
  const d = $('#dlgCp');
  const body = $('#cpBody');
  const sp = song.cp ? song.cp.species : 1;
  if (mode === 'list' && cpOn()) {
    const r = cpResult();
    const icon = { err: '❌', warn: '⚠️', hint: '💡' };
    const st = r.stats;
    body.innerHTML = `<h3>対位法のチェック（第${sp}類）</h3>
      <p class="muted">反進行 ${st.contrary}回・斜進行 ${st.oblique}回・並進行 ${st.similar}回。反進行が多いほど、2つのメロディがよく聞き分けられます。</p>
      ${r.issues.length ? `<ol class="cplist">${r.issues.map((x, i) => `<li class="${x.level}"><button data-i="${i}">${icon[x.level]} ${escapeHtml(x.msg)}</button></li>`).join('')}</ol>` : `<p>${r.notes ? 'きまりをやぶっているところはありません 🎉' : 'まだ対旋律がありません。'}</p>`}
      <div class="btnrow"><button class="tbtn" data-x="rules">きまりを見る</button><button class="tbtn primary close">とじる</button></div>`;
    body.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => {
      const is = r.issues[+b.dataset.i];
      d.close();
      ui.selBar = is.bar;
      selectBars(cur, is.bar, is.bar2 != null ? is.bar2 : is.bar);
      if (ui.view === 'score') { ui.sc.cursor = is.bar * 192; renderScoreEdit(); } else { const sc = $('#scroller'); sc.scrollLeft = Math.max(0, barStart(is.bar) * ppt() - 80); draw(); drawOverview(); }
    }));
  } else if (mode === 'rules') {
    body.innerHTML = `<h3>対位法のきまり</h3>
      <p class="muted">対位法は、いくつかのメロディを、それぞれ生き生きと、しかもきれいにひびくように重ねる作曲の技術です。ここでは、J. J. フックス『パルナッソス山への階梯』（1725年）の「類」の順に練習します。</p>
      ${[1, 2, 3, 4].map((k) => `<h4>第${k}類（${CP_KIND[k]}）</h4><ul>${Counterpoint.RULES[k].map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`).join('')}
      <p class="muted">音程の数え方：同じ高さ＝1（同度）、となり＝2度、ド〜ミ＝3度、ド〜ソ＝5度、ド〜ラ＝6度、ド〜上のド＝8度。ピアノロールと楽譜では、対旋律の音の下に、定旋律との音程の数字が出ます。</p>
      <div class="btnrow">${cpOn() ? '<button class="tbtn" data-x="list">チェックの結果</button>' : ''}<button class="tbtn primary close">とじる</button></div>`;
  } else {
    body.innerHTML = `<h3>対位法れんしゅう</h3>
      <p class="muted">決まったメロディ（定旋律）に、もう1つのメロディ（対旋律）をつけます。書くたびに、きまり（平行5度・不協和音程など）をその場でチェックします。</p>
      <label class="row">定旋律 <select id="cpCf">${Counterpoint.CANTI.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}（${c.notes.length}小節）</option>`).join('')}</select></label>
      <fieldset class="row"><legend>類</legend><label><input type="radio" name="cpSp" value="1" checked> 第1類（1対1：全音符）</label><label><input type="radio" name="cpSp" value="2"> 第2類（2対1：2分音符）</label><label><input type="radio" name="cpSp" value="3"> 第3類（4対1：4分音符）</label><label><input type="radio" name="cpSp" value="4"> 第4類（掛留：ずらしてのばす）</label></fieldset>
      <fieldset class="row"><legend>対旋律の位置</legend><label><input type="radio" name="cpAb" value="1" checked> 定旋律の上</label><label><input type="radio" name="cpAb" value="0"> 定旋律の下</label></fieldset>
      <div class="btnrow"><button class="tbtn" data-x="rules">きまりを見る</button><button class="tbtn close">やめる</button><button class="tbtn primary" id="cpGo">はじめる</button></div>`;
    $('#cpGo').onclick = () => {
      d.close();
      cpStart($('#cpCf').value, +body.querySelector('[name=cpSp]:checked').value, body.querySelector('[name=cpAb]:checked').value === '1');
    };
  }
  body.querySelectorAll('.close').forEach((b) => (b.onclick = () => d.close()));
  body.querySelectorAll('[data-x]').forEach((b) => (b.onclick = () => cpDialog(b.dataset.x)));
  if (!d.open) d.showModal();
}
let refSong = null;
function refTrackFor(i) {
  if (!refSong) return null;
  const tr = song.tracks[i];
  if (!tr || tr.type !== 'melody') return null;
  const same = refSong.tracks[i];
  if (same && same.type === 'melody') return same;
  const k = song.tracks.slice(0, i + 1).filter((t) => t.type === 'melody').length - 1;
  return refSong.tracks.filter((t) => t.type === 'melody')[k] || null;
}
function compareTrack(i) {
  const tr = song.tracks[i];
  const rt = refTrackFor(i);
  if (!rt) return null;
  const only = refSong._taskBars ? (n) => inBars(refSong._taskBars, n.s) : () => true; // 穴あき課題は、空けた小節だけ
  const mine = new Map(tr.notes.filter(only).map((n) => [n.s + ':' + n.p, n]));
  const theirs = new Map(rt.notes.filter(only).map((n) => [n.s + ':' + n.p, n]));
  let ok = 0;
  let len = 0;
  const missing = [];
  const wrong = new Set();
  for (const [k, n] of theirs) {
    const m = mine.get(k);
    if (m) { ok++; if (m.l !== n.l) len++; } else missing.push(n);
  }
  for (const [k, n] of mine) if (!theirs.has(k)) wrong.add(n);
  return { ok, total: theirs.size, len, missing, wrong };
}
function updateCompare() {
  const bar = $('#cmpBar');
  if (!refSong) { bar.hidden = true; return; }
  bar.hidden = false;
  const c = compareTrack(cur);
  if (refSong._ver) {
    // 前の版との見くらべ
    const ch = typeof verChangedBars === 'function' ? verChangedBars(refSong) : [];
    $('#cmpText').innerHTML = `「${escapeHtml(refSong._ver)}」とくらべて${c ? `　<span class="add">足した音 ${c.wrong.size}</span>　<span class="miss">消した音 ${c.missing.length}</span>${c.len ? `　長さを変えた ${c.len}` : ''}` : ''}　${ch.length ? `変わった小節：${barsText(ch.slice(0, 40))}${ch.length > 40 ? '…' : ''}` : '変わっていません'}`;
    $('#cmpBar').classList.remove('perfect');
    return;
  }
  if (!c) { $('#cmpText').textContent = 'このトラックには、くらべるお手本がありません'; return; }
  const pct = c.total ? Math.round((c.ok / c.total) * 100) : 100;
  $('#cmpText').innerHTML = `<b>${pct}%</b> あっている音 ${c.ok}/${c.total}　<span class="miss">たりない ${c.missing.length}</span>　<span class="bad">ちがう ${c.wrong.size}</span>${c.len ? `　長さがちがう ${c.len}` : ''}`;
  $('#cmpBar').classList.toggle('perfect', c.total > 0 && c.ok === c.total && !c.wrong.size);
}
function compareMarks(g2, tr, X, rowIndex, rh, sy, k) {
  const c = compareTrack(cur);
  if (!c) return;
  g2.save();
  g2.setLineDash([4, 3]);
  g2.lineWidth = 2;
  g2.strokeStyle = '#2f9e44';
  for (const n of c.missing) {
    const ri = rowIndex.get(n.p);
    if (ri == null) continue;
    roundRect(g2, X(n.s) + 2, RH + ri * rh - sy + 2, n.l * k - 4, rh - 4, 6);
    g2.stroke();
  }
  g2.setLineDash([]);
  if (refSong._ver) {
    // 前の版との見くらべ：足した音は青のふち（まちがいではない）
    g2.strokeStyle = '#1c7ed6';
    g2.lineWidth = 2.5;
    for (const n of c.wrong) { const ri = rowIndex.get(n.p); if (ri == null) continue; roundRect(g2, X(n.s) + 1, RH + ri * rh - sy + 1, Math.max(4, n.l * k - 2), rh - 2, 5); g2.stroke(); }
    g2.restore();
    return;
  }
  g2.strokeStyle = '#e03131';
  g2.lineWidth = 2.5;
  for (const n of c.wrong) {
    const ri = rowIndex.get(n.p);
    if (ri == null) continue;
    const x = X(n.s);
    const y = RH + ri * rh - sy;
    const sz = Math.min(rh - 8, 12);
    g2.beginPath();
    g2.moveTo(x + 4, y + 4); g2.lineTo(x + 4 + sz, y + 4 + sz);
    g2.moveTo(x + 4 + sz, y + 4); g2.lineTo(x + 4, y + 4 + sz);
    g2.stroke();
  }
  g2.restore();
}
function startCompare() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json,.mid,.midi,.musicxml,.xml,.mxl,.mscz,.mscx';
  inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    try {
      refSong = sanitizeSong(migrate(await readSongFile(f)));
      toast(`お手本「${refSong.title}」とくらべています`);
      updateCompare();
      draw();
    } catch (e) { alert('お手本を読みこめませんでした：' + e.message); }
  };
  inp.hidden = true;
  document.body.appendChild(inp); // Safari などは、ページの中にないと選べない
  inp.addEventListener('change', () => setTimeout(() => inp.remove(), 0));
  inp.click();
}
function stopCompare() { refSong = null; updateCompare(); draw(); }
// まとめて採点：お手本（いま読みこんだもの）と、たくさんのファイルをくらべて一覧に
function scoreAgainst(ref, sg) {
  const mels = (x) => x.tracks.filter((t) => t.type === 'melody');
  const R = mels(ref);
  const S = mels(sg);
  let ok = 0;
  let total = 0;
  let wrong = 0;
  R.forEach((rt, i) => {
    const st = S[i];
    const theirs = new Set(rt.notes.map((n) => n.s + ':' + n.p));
    const mine = new Set(st ? st.notes.map((n) => n.s + ':' + n.p) : []);
    total += theirs.size;
    for (const k of theirs) if (mine.has(k)) ok++;
    for (const k of mine) if (!theirs.has(k)) wrong++;
  });
  return { pct: total ? Math.round((ok / total) * 100) : 0, ok, total, wrong, missing: total - ok };
}
let studentOpen = false; // まとめて採点から生徒の曲を開いているあいだ
function batchCompare() {
  if (!refSong) return toast('先に「お手本とくらべる」で、お手本をえらんでね');
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.multiple = true;
  inp.accept = '.json,.mid,.midi,.musicxml,.xml,.mxl,.mscz,.mscx';
  inp.onchange = async () => {
    const rows = [];
    for (const f of inp.files) {
      try {
        const sg = sanitizeSong(migrate(await readSongFile(f)));
        rows.push({ file: f.name, title: sg.title, ...scoreAgainst(refSong, sg), sg });
      } catch (e) { rows.push({ file: f.name, err: e instanceof SyntaxError ? 'ファイルがこわれているか、曲のファイルではありません' : e.message }); }
    }
    rows.sort((a, b) => (a.file > b.file ? 1 : -1));
    const box = $('#batchBody');
    box.innerHTML = `<p class="muted">お手本：「${escapeHtml(refSong.title)}」　${rows.length}人ぶん（メロディのトラックぜんぶでくらべます）。行をおすと、その曲を開いて、どこがちがうか見られます。</p>
      <table class="batch"><thead><tr><th>ファイル</th><th>曲名</th><th>あっている</th><th>たりない</th><th>ちがう</th></tr></thead><tbody>${rows.map((r, i) => r.err
        ? `<tr><td>${escapeHtml(r.file)}</td><td colspan="4" class="bad">読めませんでした（${escapeHtml(r.err)}）</td></tr>`
        : `<tr data-i="${i}" tabindex="0"><td>${escapeHtml(r.file)}</td><td>${escapeHtml(r.title)}</td><td><b class="${r.pct === 100 ? 'good' : ''}">${r.pct}%</b> <small>${r.ok}/${r.total}</small><span class="bar"><i style="width:${r.pct}%"></i></span></td><td>${r.missing}</td><td>${r.wrong}</td></tr>`).join('')}</tbody></table>
      <div class="dlgfoot"><button class="tbtn" id="batchCsv">${I('download')}表をCSVで保存</button><button class="close tbtn primary">閉じる</button></div>`;
    box.querySelectorAll('tr[data-i]').forEach((tr) => (tr.onclick = tr.onkeydown = (e) => {
      if (e.type === 'keydown' && e.key !== 'Enter') return;
      const r = rows[+tr.dataset.i];
      const keep = refSong;
      loadSong(r.sg, { keep: !studentOpen }); // はじめの1回だけ、自分の曲をしまう（生徒の曲はしまわない）
      studentOpen = true;
      refSong = keep;
      updateCompare(); draw();
      $('#dlgBatch').close();
    }));
    $('#batchCsv').onclick = () => {
      const csv = '\ufeffファイル,曲名,あっている(%),あっている音,お手本の音,たりない,ちがう\n' + rows.filter((r) => !r.err).map((r) => [r.file, r.title, r.pct, r.ok, r.total, r.missing, r.wrong].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
      download(new Blob([csv], { type: 'text/csv' }), '採点_' + safeName() + '.csv');
    };
    box.querySelectorAll('.close').forEach((b) => (b.onclick = () => $('#dlgBatch').close()));
    $('#dlgBatch').showModal();
  };
  inp.hidden = true;
  document.body.appendChild(inp); // Safari などは、ページの中にないと選べない
  inp.addEventListener('change', () => setTimeout(() => inp.remove(), 0));
  inp.click();
}
// オーケストラの楽譜を読みこんだら、本物の舞台のように左右にならべる（左＝ヴァイオリン、右＝チェロ・コントラバスなど）
// 左右が決めてあるパートがあるときは、なにもしない
function seatOrchestra(sg) {
  const mel = (sg.tracks || []).filter((t) => t.type === 'melody');
  if (mel.length < 6 || (sg.tracks || []).some((t) => +t.pan)) return;
  const SEAT = [
    [/vi(o|)l(i|)n.*(2|ii)|2nd vi|vn\.? ?2/i, -0.25], [/vi(o|)l(i|)n|vn\b|vl\b/i, -0.45], [/viol(a|e)\b|va\b|bratsche/i, 0.15], [/cell|vc\b|violoncel/i, 0.32], [/contrabass|double bass|kontrabass|cb\b|bass(?!oon| drum|s? clar)/i, 0.48],
    [/harp/i, -0.55], [/piano|celesta|celesta/i, -0.4], [/flute|piccolo/i, -0.12], [/oboe|english horn|cor anglais/i, 0.1], [/clarinet/i, -0.08], [/bassoon|fagott/i, 0.14],
    [/horn/i, -0.3], [/trumpet|cornet/i, 0.18], [/trombone/i, 0.3], [/tuba/i, 0.38], [/timpani/i, 0.05],
  ];
  const BY_INST = { violin: -0.45, viola: 0.15, cello: 0.32, contrabass: 0.48, harp: -0.55, flute: -0.12, piccolo: -0.12, oboe: 0.1, clarinet: -0.08, bassoon: 0.14, horn: -0.3, trumpet: 0.18, trombone: 0.3, tuba: 0.38 };
  for (const t of sg.tracks) {
    if (t.type === 'chord') continue;
    const hit = SEAT.find(([re]) => re.test(t.name || ''));
    const v = hit ? hit[1] : BY_INST[t.inst];
    if (v != null) t.pan = v;
    else if (t.type === 'drum') t.pan = 0.1;
  }
}
function importFile(file) {
  const r = new FileReader();
  if (/\.(musicxml|xml|mxl|mscz|mscx)$/i.test(file.name)) {
    if (file.size > 200000) toast('楽譜を読みこんでいます…（大きなファイルなので、少し時間がかかります）', 8000);
    r.onload = () => {
      MusicXMLImport.readFile(r.result, file.name)
        .then((sg) => { seatOrchestra(sg); loadSong(sg, { own: true }); toast(/\.msc[zx]$/i.test(file.name) ? 'MuseScore のファイルを読み込みました' : 'MusicXMLを読み込みました'); })
        .catch((e) => alert((/\.msc[zx]$/i.test(file.name) ? 'MuseScore のファイル' : 'MusicXML') + 'を読み込めませんでした：' + e.message));
    };
    r.readAsArrayBuffer(file);
    return;
  }
  if (/\.midi?$/i.test(file.name)) {
    r.onload = () => { try { loadSong(importMidi(new Uint8Array(r.result), file.name), { own: true }); toast('MIDIファイルを読み込みました'); } catch (e) { alert('MIDIを読み込めませんでした：' + e.message); } };
    r.readAsArrayBuffer(file);
    return;
  }
  r.onload = () => { try { loadSong(JSON.parse(r.result), { own: true }); toast('読み込みました'); } catch (e) { alert('読み込めませんでした：' + e.message); } };
  r.readAsText(file);
}

async function packSong() {
  let sg = song;
  if (song.voice) { sg = JSON.parse(JSON.stringify(song)); delete sg.voice; for (const t of sg.tracks) if (t.inst === 'myvoice') t.inst = 'piano'; }
  const bytes = new TextEncoder().encode(JSON.stringify(sg));
  let data = bytes;
  let prefix = 'j';
  if (window.CompressionStream) {
    const cs = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    data = new Uint8Array(await new Response(cs).arrayBuffer());
    prefix = 'z';
  }
  let bin = '';
  data.forEach((b) => (bin += String.fromCharCode(b)));
  return prefix + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function unpackSong(str) {
  const prefix = str[0];
  const bin = atob(str.slice(1).replace(/-/g, '+').replace(/_/g, '/'));
  let bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  if (prefix === 'z') {
    const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    bytes = new Uint8Array(await new Response(ds).arrayBuffer());
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
async function shareDialog() {
  setTimeout(() => missionCheck('share'), 300);
  // ?notour などの表示の設定は、送る先にはいらないので外す
  const url = location.origin + location.pathname + '#song=' + (await packSong());
  $('#shareUrl').value = url;
  $('#btnSendUrl').hidden = !navigator.share;
  if (song.voice && song.tracks.some((t) => t.inst === 'myvoice')) toast('「じぶんの音」はリンクでは送れないので、相手にはピアノで聞こえます（ファイルに書き出すと送れます）', 5000);
  $('#shareTitle').textContent = `「${song.title}」`;
  $('#dlgShare').showModal();
  if (!isPhone) $('#shareUrl').select();
}
async function sendShare() {
  const url = $('#shareUrl').value;
  try { await navigator.share({ title: song.title, text: `「${song.title}」をつくったよ！ ひらくと聴けます🎵`, url }); }
  catch (e) { if (e && e.name !== 'AbortError') toast('送れませんでした。「コピー」を使ってね'); }
}

// 曲を音にする（WAV・MP3 で共通）
// 書き出しのようすを出す小さな画面
let exportJob = null;
function exportProgress(label, p) {
  const d = $('#dlgExport');
  if (label == null) { if (d.open) d.close(); return; }
  $('#expLabel').textContent = label;
  $('#expBar').style.width = Math.round(p * 100) + '%';
  $('#expPct').textContent = Math.round(p * 100) + '%';
  if (!d.open) d.showModal();
}
// どこを書き出すか：ループがオンなら「範囲だけ」をえらべる
function exportRange() {
  if (!(ui.loopOn && ui.loopRange)) return null;
  const [a, z] = loopBounds();
  const b0 = ui.loopRange[0] + 1;
  const b1 = ui.loopRange[1];
  return confirm(`ループの範囲（${b0}〜${b1}小節）だけ書き出しますか？\nOK＝範囲だけ／キャンセル＝曲の全部`) ? [a, z] : null;
}
async function renderSong(onProg, opts = {}) {
  stop();
  if (onProg) onProg(0.02);
  const c0 = audioCtx();
  await Promise.all(song.tracks.filter((t) => t.real !== false).flatMap((t) => (t.type === 'drum' ? [Sound.Samples.loadDrums(c0)] : trackInsts(t).map((i) => (Sound.Samples.has(i) ? Sound.Samples.load(i, c0) : null)))).map((p) => p && p.catch(() => null)));
  const sr = 44100;
  // 曲の全部を書き出すときは、ループの「はんい」を使わない（くり返し・D.C. もそのとおりに）
  const loop0 = ui.loopOn;
  if (!opts.range) ui.loopOn = false;
  try {
  const [ra, rz] = opts.range || [0, playTotal()];
  const off = absSec(ra);
  // さいごの音がのびる分（フェルマータなど）も入れる
  let tailEnd = absSec(rz);
  for (const e of eventList()) if (e.kind === 'note' && e.t >= ra && e.t < rz) tailEnd = Math.max(tailEnd, absSec(e.t) + (absSec(e.t + e.l) - absSec(e.t)) * (e.lf || 0.96));
  const len = Math.ceil((Math.min(tailEnd, absSec(rz) + 10) - off + (opts.range ? 1.5 : 3)) * sr);
  const ctx = new OfflineAudioContext(2, len, sr);
  const comp = ctx.createDynamicsCompressor();
  comp.connect(ctx.destination);
  const graph = buildGraph(ctx, comp, false);
  if (opts.only) graph.only = opts.only;
  for (const e of eventList()) {
    if (e.t < ra || e.t >= rz) continue;
    scheduleEvent(ctx, graph, e, 0.05 + absSec(e.t) - off, false);
  }
  return finishRender(ctx, len, sr, onProg);
  } finally { ui.loopOn = loop0; }
}
function finishRender(ctx, len, sr, onProg) {
  // とちゅうで止めて、進みぐあいを知らせる
  if (onProg && ctx.suspend) {
    const dur = len / sr;
    for (let t = 1; t < dur; t += Math.max(1, dur / 20)) {
      const tt = t;
      ctx.suspend(tt).then(() => { onProg(tt / dur); ctx.resume(); }).catch(() => {});
    }
  }
  return ctx.startRendering();
}
async function exportWav() {
  const range = exportRange();
  const job = (exportJob = { cancel: false });
  try {
    const buf = await renderSong((p) => exportProgress('音を作っています…', p * 0.9), { range });
    if (job.cancel) return;
    exportProgress('ファイルにまとめています…', 0.95);
    download(encodeWav(buf), safeName() + '.wav');
    toast('音声ファイル（WAV）を書き出しました');
    return buf;
  } finally { exportProgress(null); exportJob = null; }
}
async function exportMp3() {
  const job = (exportJob = { cancel: false, ac: new AbortController() });
  try {
    MP3.ensure();
    const range = exportRange();
    const buf = await renderSong((p) => exportProgress('音を作っています…', p * 0.5), { range });
    if (job.cancel) return;
    const blob = await MP3.encode(buf, { kbps: 192, signal: job.ac.signal, onProgress: (p) => exportProgress('MP3 に変換しています…', 0.5 + p * 0.5) });
    if (job.cancel) return;
    download(blob, safeName() + '.mp3');
    toast('音声ファイル（MP3）を書き出しました');
    return blob;
  } catch (e) {
    if (e && e.name === 'AbortError') { toast('書き出しをやめました'); return; }
    throw e;
  } finally { exportProgress(null); exportJob = null; }
}
/* ---------- パートごとに書き出す（WAV を ZIP にまとめる） ---------- */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
// 圧縮しない ZIP（音のファイルはもう小さくならないので、そのまま入れる）
function makeZip(files) {
  const enc = new TextEncoder();
  const parts = [];
  const central = [];
  let off = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = f.data;
    const crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), name);
    off += 30 + name.length + data.length;
  }
  const csize = central.reduce((a, x) => a + x.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
}
async function exportStems() {
  const range = exportRange();
  const list = song.tracks.filter((t) => audible(t) && ((t.notes && t.notes.length) || (t.grid && Object.keys(t.grid).length) || (t.chords && t.chords.some(Boolean))));
  if (!list.length) return toast('書き出す音がありません');
  const job = (exportJob = { cancel: false });
  try {
    const files = [];
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      const buf = await renderSong((p) => exportProgress(`パート ${i + 1}/${list.length}「${t.name}」`, (i + p) / list.length), { range, only: t.id });
      if (job.cancel) return;
      const wav = encodeWav(buf);
      files.push({ name: `${String(song.tracks.indexOf(t) + 1).padStart(2, '0')}_${t.name.replace(/[\\/:*?"<>|]/g, '_')}.wav`, data: new Uint8Array(await wav.arrayBuffer()) });
    }
    download(makeZip(files), safeName() + '_パートごと.zip');
    toast(`${files.length}パートを、それぞれのWAVにしてZIPにまとめました（ほかの音楽ソフトで使えます）`, 4000);
    return files.length;
  } finally { exportProgress(null); exportJob = null; }
}
function cancelExport() { if (exportJob) { exportJob.cancel = true; if (exportJob.ac) exportJob.ac.abort(); } exportProgress(null); toast('書き出しをやめました'); }
function encodeWav(buf) {
  const ch = buf.numberOfChannels;
  const n = buf.length;
  const data = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); data.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true);
  data.setUint32(24, buf.sampleRate, true); data.setUint32(28, buf.sampleRate * ch * 2, true);
  data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true); w(36, 'data'); data.setUint32(40, n * ch * 2, true);
  const chans = [];
  for (let c = 0; c < ch; c++) chans.push(buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = clamp(chans[c][i], -1, 1); data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  return new Blob([data], { type: 'audio/wav' });
}

function midiBytes() {
  const PPQ = 480;
  const k = PPQ / TPQ;
  const vlq = (v) => { v = Math.max(0, Math.round(v)); const b = [v & 0x7f]; while ((v >>= 7)) b.unshift((v & 0x7f) | 0x80); return b; };
  const str = (s) => Array.from(new TextEncoder().encode(s));
  const chunk = (id, bytes) => [...str(id), (bytes.length >>> 24) & 255, (bytes.length >>> 16) & 255, (bytes.length >>> 8) & 255, bytes.length & 255, ...bytes];
  const trackBytes = (events) => {
    events.sort((a, b) => a.t - b.t || a.o - b.o);
    const out = [];
    let last = 0;
    for (const e of events) { const t = Math.round(e.t); out.push(...vlq(t - last), ...e.d); last = t; }
    out.push(0, 0xff, 0x2f, 0);
    return out;
  };
  const tempoEv = (t, bpm) => { const us = Math.round(60000000 / bpm); return { t, o: 0, d: [0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255] }; };
  const title = str(song.title).slice(0, 120);
  const t0 = [
    { t: 0, o: 0, d: [0xff, 0x03, ...vlq(title.length), ...title] },
    tempoEv(0, song.bpm),
    { t: 0, o: 0, d: [0xff, 0x58, 4, song.meter[0], Math.log2(song.meter[1]), 24, 8] },
    { t: 0, o: 0, d: [0xff, 0x59, 2, (Notation.keyCount(song.key, isMinor()) + 256) & 255, isMinor() ? 1 : 0] },
  ];
  for (const b in song.tempos) t0.push(tempoEv(barStart(+b) * k, song.tempos[b]));
  for (const b in song.meters || {}) { const m = song.meters[b]; t0.push({ t: barStart(+b) * k, o: 0, d: [0xff, 0x58, 4, m[0], Math.log2(m[1]), 24, 8] }); }
  for (const b in song.keys || {}) { const kk = song.keys[b]; t0.push({ t: barStart(+b) * k, o: 0, d: [0xff, 0x59, 2, (Notation.keyCount(kk.key, kk.minor) + 256) & 255, kk.minor ? 1 : 0] }); }
  const tracks = [trackBytes(t0)];
  let ch = 0;
  for (const tr of song.tracks) {
    const ev = [];
    const name = str(tr.name).slice(0, 60);
    ev.push({ t: 0, o: 0, d: [0xff, 0x03, ...vlq(name.length), ...name] });
    if (tr.type === 'drum') {
      for (const id in tr.grid) for (const s in tr.grid[id]) {
        const n = Sound.DRUMS[id] ? Sound.DRUMS[id].gm : 38;
        const v = tr.grid[id][s] === 2 ? 115 : 80;
        ev.push({ t: +s * k, o: 2, d: [0x99, n, v] }, { t: (+s + 12) * k, o: 1, d: [0x89, n, 0] });
      }
    } else {
      if (ch === 9) ch++;
      const c = ch++ & 15;
      ev.push({ t: 0, o: 0, d: [0xc0 | c, Sound.GM[tr.inst] || 0] }, { t: 0, o: 0, d: [0xb0 | c, 7, Math.round(tr.vol * 127)] }, { t: 0, o: 0, d: [0xb0 | c, 10, clamp(Math.round(((+tr.pan || 0) + 1) * 63.5), 0, 127)] });
      const notes = tr.type === 'melody' ? tr.notes.map((n) => ({ ...n, v: 0.8 * (n.vel || 1) })) : chordEvents(tr);
      for (const cg of tr.instChg || []) ev.push({ t: cg.t * k, o: 0, d: [0xc0 | c, Sound.GM[cg.inst] || 0] });
      for (const n of notes) {
        if (n.s >= totalTicks()) continue;
        const v = Math.round(clamp(n.v, 0.1, 1) * 110);
        ev.push({ t: n.s * k, o: 2, d: [0x90 | c, n.p, v] }, { t: (n.s + n.l) * k - 1, o: 1, d: [0x80 | c, n.p, 0] });
      }
    }
    tracks.push(trackBytes(ev));
  }
  const bytes = chunk('MThd', [0, 1, 0, tracks.length, (PPQ >> 8) & 255, PPQ & 255]);
  for (const t of tracks) bytes.push(...chunk('MTrk', t));
  return new Uint8Array(bytes);
}
function exportMidi() {
  download(new Blob([midiBytes()], { type: 'audio/midi' }), safeName() + '.mid');
  toast('MIDIファイルを書き出しました');
}

// MIDIファイルの読み込み
function importMidi(buf, fname) {
  let p = 0;
  const u32 = () => ((buf[p++] << 24) | (buf[p++] << 16) | (buf[p++] << 8) | buf[p++]) >>> 0;
  const u16 = () => (buf[p++] << 8) | buf[p++];
  const vlq = () => { let v = 0; let b; do { b = buf[p++]; v = (v << 7) | (b & 0x7f); } while (b & 0x80 && p < buf.length); return v; };
  const id = () => String.fromCharCode(buf[p++], buf[p++], buf[p++], buf[p++]);
  if (id() !== 'MThd') throw new Error('MIDIファイルではありません');
  const hl = u32();
  u16();
  const ntr = u16();
  const div = u16();
  p = 8 + hl;
  if (div & 0x8000) throw new Error('この形式のMIDIには対応していません');
  const scale = TPQ / div;
  const s = newSong();
  s.title = fname.replace(/\.midi?$/i, '');
  s.tracks = [];
  let meter = [4, 4];
  let bpm = 120;
  const chans = new Map();
  const drums = [];
  const tempoEv = []; // [tick, bpm]（とちゅうのテンポ）
  let midiKey = null;
  const keyEv = [];
  const meterEv = []; // [tick, [n, d]]（とちゅうの拍子）
  const prog = {}; // チャンネル → 楽器番号
  for (let t = 0; t < ntr && p < buf.length; t++) {
    if (id() !== 'MTrk') break;
    const len = u32();
    const end = Math.min(p + len, buf.length);
    let tick = 0;
    let rs = 0;
    const on = new Map();
    let tname = '';
    while (p < end) {
      tick += vlq();
      let st = buf[p];
      if (st & 0x80) p++; else st = rs;
      if (st === 0xff) {
        const type = buf[p++];
        const l = vlq();
        const data = buf.slice(p, p + l);
        p += l;
        if (type === 0x51 && l >= 3) { const v = Math.round(60000000 / ((data[0] << 16) | (data[1] << 8) | data[2] || 1)); if (tick === 0) bpm = v; else tempoEv.push([tick, v]); }
        if (type === 0x59 && l >= 2) {
          const sf = data[0] > 127 ? data[0] - 256 : data[0];
          const mi = data[1] === 1;
          const k = ((((sf * 7) % 12) + 12) % 12 + (mi ? 9 : 0)) % 12; // ♯の数 → 主音（短調は平行調）
          if (tick === 0) midiKey = { key: k, minor: mi }; else keyEv.push([tick, { key: k, minor: mi }]);
        }
        if (type === 0x58 && l >= 2) { const m = [data[0], Math.pow(2, data[1])]; if (tick === 0) meter = m; else meterEv.push([tick, m]); }
        if (type === 0x03) tname = new TextDecoder().decode(data);
        continue;
      }
      if (st === 0xf0 || st === 0xf7) { p += vlq(); continue; }
      rs = st;
      const cmd = st & 0xf0;
      const chn = st & 15;
      const a = buf[p++];
      const b = cmd === 0xc0 || cmd === 0xd0 ? 0 : buf[p++];
      const key = chn + ':' + a;
      if (cmd === 0xc0) { prog[t + ':' + chn] = a; prog['c' + chn] = a; continue; }
      if (cmd === 0xb0 && a === 10) { prog['pan' + chn] = b; continue; } // 左右の位置
      // 同じ高さの音がかさなっても（声部2など）、先に鳴った音から順に止める
      if (cmd === 0x90 && b > 0) { if (!on.has(key)) on.set(key, []); on.get(key).push({ s: tick, v: b }); }
      else if (cmd === 0x80 || (cmd === 0x90 && b === 0)) {
        const q = on.get(key);
        const o = q && q.shift();
        if (!o) continue;
        if (!q.length) on.delete(key);
        if (chn === 9) drums.push({ s: Math.round(o.s * scale), n: a, v: o.v });
        else {
          if (!chans.has(t + ':' + chn)) chans.set(t + ':' + chn, { name: tname, notes: [], key: t + ':' + chn, chn });
          const nn = { s: Math.round(o.s * scale), p: a, l: Math.max(1, Math.round((tick - o.s) * scale)) };
          const vel = Math.round(clamp(o.v / 88, 0.25, 1.25) * 4) / 4; // 強さ（4段階くらいにまるめる）
          if (vel !== 1) nn.vel = vel;
          chans.get(t + ':' + chn).notes.push(nn);
        }
      }
    }
    p = end;
  }
  s.bpm = clamp(bpm, 30, 240);
  const okMeter = (m) => [clamp(m[0], 1, 12), [2, 4, 8, 16].includes(m[1]) ? m[1] : 4];
  s.meter = okMeter(meter);
  const bt = (s.meter[0] * 192) / s.meter[1];
  // とちゅうの拍子：小節の番号を数えながら入れる
  s.meters = {};
  {
    let curBt = bt;
    let barAt = 0; // いまの拍子がはじまった小節
    let tickAt = 0;
    for (const [tk, m0] of meterEv.sort((a, b) => a[0] - b[0])) {
      const t2 = tk * scale;
      const b = barAt + Math.round((t2 - tickAt) / curBt);
      const m = okMeter(m0);
      s.meters[b] = m;
      barAt = b;
      tickAt = t2;
      curBt = (m[0] * 192) / m[1];
    }
  }
  const barOfTick = (t2) => {
    let curBt = bt; let barAt = 0; let tickAt = 0;
    for (const b of Object.keys(s.meters).map(Number).sort((x, y) => x - y)) {
      const bs2 = tickAt + (b - barAt) * curBt;
      if (bs2 > t2) break;
      tickAt = bs2; barAt = b; curBt = (s.meters[b][0] * 192) / s.meters[b][1];
    }
    return barAt + Math.floor((t2 - tickAt) / curBt);
  };
  // とちゅうのテンポ：小節ごと（小節のとちゅうなら、その小節から）
  s.tempos = {};
  for (const [tk, v] of tempoEv) { const b = barOfTick(tk * scale); if (b > 0) s.tempos[b] = clamp(v, 30, 240); }
  if (midiKey) { s.key = midiKey.key; s.scale = midiKey.minor ? 'minor' : 'major'; }
  s.keys = {};
  for (const [tk, kk] of keyEv) { const b = barOfTick(tk * scale); if (b > 0) s.keys[b] = kk; }
  // 楽器番号 → いちばん近い楽器（同じ番号、なければ同じなかま）
  const instFor = (pg) => {
    if (pg == null) return null;
    const ids = Object.keys(Sound.GM);
    return ids.find((id) => Sound.GM[id] === pg) || ids.find((id) => (Sound.GM[id] >> 3) === (pg >> 3)) || null;
  };
  let maxT = 0;
  for (const c of chans.values()) {
    if (s.tracks.length >= MAX_TRACKS - (drums.length ? 1 : 0)) break;
    const avg = c.notes.reduce((x, n) => x + n.p, 0) / c.notes.length;
    const rg = avg < 50 ? 'bass' : avg < 60 ? 'tenor' : 'soprano';
    const inst = instFor(prog[c.key] != null ? prog[c.key] : prog['c' + c.chn]) || (avg < 50 ? 'ebass' : 'piano');
    const pv = prog['pan' + c.chn];
    s.tracks.push(newTrack('melody', { name: (c.name || 'パート' + (s.tracks.length + 1)).slice(0, 20), inst, range: rg, notes: c.notes, ...(pv != null && Math.abs(pv - 64) > 2 ? { pan: Math.round(((pv / 63.5) - 1) * 10) / 10 } : {}) }));
    for (const n of c.notes) maxT = Math.max(maxT, n.s + n.l);
  }
  if (drums.length) {
    const rev = {};
    for (const k of ['kick', 'snare', 'hihat', 'ohat', 'tomL', 'tomH', 'ride', 'crash', 'clap', 'cowbell', 'tamb', 'maracas', 'triangle']) rev[Sound.DRUMS[k].gm] = k;
    for (const k in Sound.DRUMS) if (Sound.DRUMS[k].gm != null && !(Sound.DRUMS[k].gm in rev)) rev[Sound.DRUMS[k].gm] = k; // ほかの打楽器も
    const tr = newTrack('drum', { name: 'ドラム' });
    for (const d of drums) { const k = rev[d.n] || 'snare'; (tr.grid[k] = tr.grid[k] || {})[d.s] = d.v > 100 ? 2 : 1; maxT = Math.max(maxT, d.s + 1); }
    // いちばん多く入っているセットをえらぶ
    const ids = Object.keys(tr.grid);
    let best = null; let bc = 0;
    for (const kt of Sound.KITS) { const c = ids.filter((id) => kt.list.includes(id)).length; if (c > bc) { bc = c; best = kt; } }
    if (best) tr.kit = best.id;
    s.tracks.push(tr);
  }
  if (!s.tracks.length) s.tracks.push(newTrack('melody'));
  s.bars = clamp(barOfTick(Math.max(0, maxT - 1)) + 1, 1, MAX_BARS); // とちゅうで拍子が変わっても、さいごの音まで
  return s;
}

let toastTimer;
let saveWarned = false;
function warnSaveFailed() {
  if (saveWarned) return;
  saveWarned = true;
  const b = document.createElement('div');
  b.className = 'savewarn';
  b.setAttribute('role', 'alert');
  b.innerHTML = `<span>⚠ このブラウザに自動で保存できません（保存の場所がいっぱい、またはプライベートモード）。曲が消えないよう、ファイルに書き出してください。</span><button class="tbtn primary">ファイルに書き出す</button><button class="tbtn" aria-label="とじる">×</button>`;
  b.querySelector('.primary').onclick = () => $('#btnExportJson').click();
  b.querySelector('[aria-label]').onclick = () => b.remove();
  document.body.appendChild(b);
}
function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.classList.remove('withbtn');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

// 「もどす」ボタンつきのお知らせ（たくさん消したとき）
function toastUndo(msg) {
  const t = $('#toast');
  t.textContent = msg + ' ';
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'toastbtn';
  b.textContent = '↶ もどす';
  b.onclick = () => { t.classList.remove('show', 'withbtn'); undo(); };
  t.appendChild(b);
  t.classList.add('show', 'withbtn');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show', 'withbtn'), 6000);
}

/* ============================================================
   初期化・イベント
   ============================================================ */
const tapTimes = [];
function init() {
  const guardRules = (fn) => (e) => { if (song.locks.rules) { renderSettings(); return toast('ロックされています'); } fn(e); };
  $('#title').onchange = (e) => edit(() => { song.title = e.target.value || 'あたらしい曲'; }, '曲名');
  const setBpm = (v) => { song.bpm = clamp(Math.round(+v || 100), 30, 240); $('#bpm').value = song.bpm; $('#bpmNum').value = song.bpm; version++; updateMini(); draw(); };
  $('#bpm').oninput = guardRules((e) => setBpm(e.target.value));
  $('#bpmNum').onchange = guardRules((e) => setBpm(e.target.value));
  $('#btnTap').onclick = guardRules(() => {
    const now = performance.now();
    if (tapTimes.length && now - tapTimes[tapTimes.length - 1] > 2000) tapTimes.length = 0;
    tapTimes.push(now);
    if (tapTimes.length > 4) tapTimes.shift();
    if (tapTimes.length >= 2) {
      const avg = (tapTimes[tapTimes.length - 1] - tapTimes[0]) / (tapTimes.length - 1);
      setBpm(60000 / avg);
      toast(`テンポ ${song.bpm}（${tapTimes.length}回の平均）`);
    } else toast('リズムに合わせて4回タップしてください');
  });
  const setMeter = () => edit(() => { song.meter = [+$('#meterN').value, +$('#meterD').value]; ui.startTick = 0; ui.inputTick = 0; }, '拍子');
  $('#meterN').onchange = guardRules(setMeter);
  $('#meterD').onchange = guardRules(setMeter);
  $('#bars').onchange = guardRules((e) => edit(() => {
    song.bars = clamp(Math.round(+e.target.value || 8), 1, MAX_BARS);
    e.target.value = song.bars;
    const b = Math.min(ui.sel.b0, song.bars - 1);
    selectBars(cur, b, b);
    ui.loopRange = null;
    ui.startTick = 0;
  }, '小節の数'));
  $('#key').onchange = guardRules((e) => changeKey(+e.target.value, isMinor(), ui.keyMove));
  $('#scale').onchange = guardRules((e) => { edit(() => { song.scale = e.target.value; }, '音階'); renderKeyPop(); });
  $('#names').onchange = (e) => { ui.names = e.target.value; draw(); };
  $('#btnFlat').onclick = () => { ui.flat = !ui.flat; renderSettings(); draw(); };
  $('#swing').oninput = guardRules((e) => { song.swing = +e.target.value; version++; });
  $('#swingUnit').onchange = guardRules((e) => { song.swingUnit = +e.target.value; version++; });
  $('#zoom').oninput = (e) => applyZoom(+e.target.value, ui.rh, zoomAnchor());
  $('#rowZoom').oninput = (e) => applyZoom(ui.zoom, +e.target.value, zoomAnchor());
  $('#zOut').onclick = () => zoomStep(-1);
  $('#zIn').onclick = () => zoomStep(1);
  $('#zFit').onclick = () => zoomFit();
  for (const id of ['#zoom', '#rowZoom']) $(id).onchange = () => saveZoom();

  $('#btnPlay').onclick = () => (player.on ? stop() : play());
  $('#btnRec').onclick = () => (rec.on ? stop() : recStart());
  $('#btnStop').onclick = () => {
    const wasOn = player.on;
    stop();
    if (!wasOn) { ui.startTick = 0; $('#scroller').scrollLeft = 0; } else ui.startTick = barStart(ui.sel.b0);
    draw(); drawOverview(); updateMini();
  };
  $('#btnLoop').onclick = () => {
    ui.loopOn = !ui.loopOn;
    if (ui.loopOn && !ui.loopRange) ui.loopRange = [ui.sel.b0, ui.sel.b1 + 1];
    if (ui.loopOn && !player.on) ui.startTick = barStart(ui.loopRange[0]);
    $('#btnLoop').classList.toggle('on', ui.loopOn);
    draw();
  };
  $('#btnMetro').onclick = () => { ui.metro = !ui.metro; $('#btnMetro').classList.toggle('on', ui.metro); };
  // 練習：カウント・ゆっくり（このブラウザだけでおぼえる。曲には入らない）
  ui.countIn = +lsGet('otsumiki-countin', '0') || 0;
  ui.speed = 1;
  const practiceUi = () => {
    $$('#countSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.c === ui.countIn));
    $('#speedVal').textContent = Math.round(ui.speed * 100) + '%';
    $('#speedRange').value = ui.speed;
    $('#popPractice > summary').classList.toggle('on', ui.countIn > 0 || ui.speed !== 1);
    updateMini();
  };
  $$('#countSeg button').forEach((b) => (b.onclick = () => { ui.countIn = +b.dataset.c; lsSet('otsumiki-countin', String(ui.countIn)); practiceUi(); }));
  $('#speedRange').oninput = (e) => { ui.speed = +e.target.value; practiceUi(); };
  // すすみぐあいの線をクリック → その場所から鳴らす
  $('#miniSeek').onpointerdown = (e) => {
    if (!player.on) return;
    e.preventDefault(); e.stopPropagation();
    const r = $('#miniProg').parentElement.getBoundingClientRect();
    const frac = clamp((e.clientX - (r.left + 10)) / Math.max(1, r.width - 20), 0, 1);
    const tot = absSec(playTotal());
    const pt = Math.min(playTotal() - 1, tickAtSec(frac * tot));
    ui.startTick = cellStart(Math.max(0, srcTick(pt)));
    play();
  };
  const replayHere = () => { if (!player.on) return; const t = playheadTick(); if (t != null) ui.startTick = cellStart(Math.max(0, t)); play(); };
  $('#speedRange').onchange = replayHere;
  $$('#speedPre button').forEach((b) => (b.onclick = () => { ui.speed = +b.dataset.s; practiceUi(); replayHere(); }));
  practiceUi();
  $('#btnUndo').onclick = undo;
  $('#btnRedo').onclick = redo;
  $('#btnHist').onclick = openHistory;
  $('#btnNew').onclick = () => openStart(false);
  $('#btnSample').onclick = () => loadSong(sampleSong());
  $('#btnSave').onclick = saveToBrowser;
  $('#btnOpen').onclick = openDialog;
  $('#btnExportJson').onclick = exportJSON;
  $('#btnImportJson').onclick = () => $('#fileIn').click();
  $('#fileIn').onchange = (e) => { if (e.target.files[0]) importFile(e.target.files[0]); e.target.value = ''; };
  $('#btnWav').onclick = () => exportWav().catch((err) => alert('書き出しに失敗しました：' + err.message));
  $('#btnStems').onclick = () => { closePops(); exportStems().catch((err) => alert('書き出しに失敗しました：' + err.message)); };
  $('#expCancel').onclick = cancelExport;
  $('#btnMp3').onclick = () => exportMp3().catch((err) => alert('書き出しに失敗しました：' + err.message));
  $('#btnMidi').onclick = exportMidi;
  $('#btnScore').onclick = openScore;
  $('#btnScoreMenu').onclick = openScore;
  $('#btnPrintScore').onclick = printScore;
  { const dk = $('#durKeysSel'); if (dk) { dk.value = durKeys(); dk.onchange = () => { lsSet('otsumiki-durkeys', dk.value); if (ui.view === 'score') renderScorePal(); toast(dk.value === 'musescore' ? '数字キー：MuseScore式（5＝4分音符）' : '数字キー：ふつう（4＝4分音符）'); }; } }
  $('#btnPrintParts').onclick = printParts;
  $('#btnPngScore').onclick = exportPng;
  $('#btnXmlScore').onclick = exportMusicXML;
  $('#btnMsczScore').onclick = exportMscz;
  $('#btnSvgScore').onclick = () => download(new Blob([scoreFull], { type: 'image/svg+xml' }), safeName() + '_楽譜.svg');
  $('#btnScorePanel').onchange = (e) => { ui.showScore = e.target.checked; renderScorePanel(); };
  $('#ghost').onchange = (e) => { ui.ghost = e.target.checked; draw(); };
  $('#dragMode').onchange = (e) => { ui.dragMode = e.target.value; };
  $('#touchMode').onchange = (e) => { ui.touchMode = e.target.value; ui.touchEdit = ui.touchMode !== 'scroll'; $('#scroller').classList.toggle('touchedit', ui.touchEdit); try { localStorage.setItem('otsumiki-touch', ui.touchMode); } catch (er) { /* なし */ } };
  $('#miniInfo').onclick = () => { const d = isPhone ? $('#popRules') : $('#popKey'); d.open = !d.open; };
  // ポップアップ（ルール・メニュー・道具・表示）は外をおすと閉じる
  document.addEventListener('pointerdown', (e) => { if (e.target.closest('#miniInfo')) return; closePops(e.target.closest('details.pop')); });
  document.addEventListener('toggle', (e) => { if (e.target.matches && e.target.matches('details.pop') && e.target.open) closePops(e.target); }, true);
  $('#btnPal').onclick = openPalette;
  $('#btnTeach').onclick = openTeacher;
  $('#btnShare').onclick = () => shareDialog().catch((err) => alert('URLを作れませんでした：' + err.message));
  $('#btnSendUrl').onclick = () => sendShare();
  $('#btnCopyUrl').onclick = async () => { try { await navigator.clipboard.writeText($('#shareUrl').value); toast('コピーしました'); } catch (e) { $('#shareUrl').select(); document.execCommand('copy'); toast('コピーしました'); } };
  $('#btnHelp').onclick = () => $('#dlgHelp').showModal();
  $('#btnMidiIn').onclick = connectMidi;
  $('#btnStepRec').onclick = () => {
    ui.stepRec = !ui.stepRec;
    $('#btnStepRec').classList.toggle('on', ui.stepRec);
    renderPhoneKbd();
    if (ui.stepRec && isPhone) { ui.inputTick = cellStart(ui.startTick); toast('下の鍵盤をおすと、緑の線の所に音が入ります'); }
    else if (ui.stepRec) { ui.inputTick = cellStart(ui.startTick); toast('鍵盤入力：A〜Kのキー（またはMIDI鍵盤）で緑の線の所に音が入ります。→で休み、Backspaceで消す'); }
    draw();
  };
  $('#instOk').onclick = () => {
    const tr = song.tracks[picker.ti];
    edit(() => { if (picker.type === 'drum') tr.kit = picker.val; else tr.inst = picker.val; tr.real = picker.real; delete tr.short; }, '楽器を変更');
    renderTracks();
    preloadSamples();
    $('#dlgInst').close();
  };
  $('#dlgPal').addEventListener('close', () => { renderTracks(); changed(); });
  document.querySelectorAll('dialog .close').forEach((b) => (b.onclick = () => b.closest('dialog').close()));
  document.querySelectorAll('.dropdown .dd button, #addRow button').forEach((b) => b.addEventListener('click', () => b.closest('details').removeAttribute('open')));
  $('#btnSoloOff').onclick = () => clearAll('solo');
  $('#btnMuteOff').onclick = () => clearAll('mute');
  $('#addMelody').onclick = () => addTrack('melody');
  $('#addChord').onclick = () => addTrack('chord');
  $('#addDrum').onclick = () => addTrack('drum');
  $('#btnIns').onclick = insertBars;
  $('#btnDelBars').onclick = deleteBars;
  $('#btnAddFour').onclick = guardRules(() => { edit(() => { song.bars = Math.min(MAX_BARS, song.bars + 4); }, '4小節ふやす'); renderSettings(); });

  const sc = $('#scroller');
  sc.addEventListener('pointerdown', panDown);
  sc.addEventListener('pointermove', panMove);
  sc.addEventListener('pointerup', panUp);
  sc.addEventListener('pointercancel', panUp);
  $$('#phoneNav button').forEach((b) => (b.onclick = () => setPhoneView(b.dataset.view)));
  initScoreEditor();
  try { ui.keyMove = localStorage.getItem('otsumiki-keymove') !== '0'; } catch (e) { /* 何もしない */ }
  $('#phoneMoreClose').onclick = () => $('#phoneMore').classList.remove('open');
  if (phoneMQ.addEventListener) phoneMQ.addEventListener('change', applyPhone);
  initSimple();
  applyPhone();
  initSplitters();
  loadZoom();
  setupSelBar();
  { let wide = innerWidth >= 1600; addEventListener('resize', () => { const w = innerWidth >= 1600; if (w !== wide) { wide = w; renderEditorTools(); } }); }
  {
    const tb = document.querySelector('.toolbar');
    const upd = () => tb.classList.toggle('more', isPhone && tb.scrollLeft + tb.clientWidth < tb.scrollWidth - 4);
    tb.addEventListener('scroll', upd, { passive: true });
    new ResizeObserver(upd).observe(tb);
    new MutationObserver(upd).observe($('#editorTools'), { childList: true });
  }
  try { const tm = localStorage.getItem('otsumiki-touch'); if (tm) { ui.touchMode = tm; ui.touchEdit = tm !== 'scroll'; } } catch (er) { /* なし */ }
  sc.classList.toggle('touchedit', ui.touchEdit);
  renderSettings();
  sc.addEventListener('pointerdown', onDown);
  // マス目で最後にさわった場所（楽譜に切りかえたとき、カーソルをそこへ）
  sc.addEventListener('pointerdown', (e) => { const r = sc.getBoundingClientRect(); const x = e.clientX - r.left - LW; if (x >= 0 && e.clientY - r.top > RH) ui.gridTouch = clamp((x + sc.scrollLeft) / ppt(), 0, totalTicks() - 1); }, true);
  sc.addEventListener('pointermove', onMove);
  sc.addEventListener('pointerup', onUp);
  sc.addEventListener('pointercancel', () => { drag = null; if (pending) { clearTimeout(pending.timer); pending = null; } });
  sc.addEventListener('scroll', () => { if (!player.on) { draw(); drawOverview(); } });
  sc.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      stopFling();
      const d = clamp(e.deltaY || e.deltaX, -60, 60) * (e.deltaMode === 1 ? 20 : 1);
      const f = Math.exp(-clamp(d, -60, 60) * 0.004);
      const rr = sc.getBoundingClientRect();
      const vert = e.altKey || e.shiftKey || e.clientX - rr.left < LW;
      const a = zoomAnchor(e.clientX, e.clientY);
      if (vert) applyZoom(ui.zoom, ui.rh * f, a, e.clientX, e.clientY);
      else applyZoom(ui.zoom * f, ui.rh, a, e.clientX, e.clientY);
      return;
    }
    // 小節番号の行の上では、ホイールで横に動く
    const r = sc.getBoundingClientRect();
    if (e.clientY - r.top < RH && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); stopFling(); sc.scrollLeft += e.deltaY; }
  }, { passive: false });
  // 曲の地図の上では、ホイールで横に動く
  $('#ovScroller').addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || e.ctrlKey || e.metaKey) return;
    const o = $('#ovScroller');
    if (o.scrollWidth <= o.clientWidth) return;
    e.preventDefault();
    o.scrollLeft += e.deltaY;
  }, { passive: false });
  const osc = $('#ovScroller');
  osc.addEventListener('pointerdown', ovDown);
  osc.addEventListener('pointermove', ovMove);
  osc.addEventListener('pointerup', ovUp);
  osc.addEventListener('pointercancel', () => { ovDrag = null; $('#ovTrash').classList.remove('show', 'hot'); drawOverview(); });
  osc.addEventListener('scroll', () => drawOverview());
  new ResizeObserver(() => { resizeEditor(); draw(); drawOverview(); }).observe($('#editorWrap'));
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', () => applyTheme());

  // 記号パレット（うかんでいる窓）は、開いていてもキー操作をじゃましない
  const modalOpen = () => $$('dialog').some((d) => d.open && !d.classList.contains('paldlg'));
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if (e.key === 'Escape' && document.body.classList.contains('present') && !modalOpen()) { setPresent(false); return; }
    if (e.key === 'Escape' && ui.chd) { chordPickClose(); return; }
    if (e.key === 'Escape') { const op = $$('details.pop[open]'); if (op.length) { op.forEach((d) => (d.open = false)); const s0 = op[0].querySelector('summary'); if (s0) s0.focus(); return; } }
    if (e.key === '?' && !modalOpen()) { e.preventDefault(); openKeys(); return; }
    if (ui.view === 'score' && !modalOpen() && tabPopKey(e)) return;
    if (ui.view === 'score' && !modalOpen() && scoreKey(e)) return;
    if (ui.view !== 'score' && !modalOpen() && noteKeys(e)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveToBrowser(); return; }
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      return;
    }
    const otherDialog = $$('dialog').some((d) => d.open && d.id !== 'dlgInst' && !d.classList.contains('paldlg'));
    if (otherDialog) return;
    const inPicker = $('#dlgInst').open;
    if (e.code === 'Space' && !inPicker && !(e.target.closest && e.target.closest('button, summary, a, [role="button"]') && e.target.matches(':focus-visible'))) { e.preventDefault(); player.on ? stop() : play(); return; }
    const k = e.key.toLowerCase();
    if (k === 'z' || k === 'x') {
      ui.kbOct = clamp(ui.kbOct + (k === 'z' ? -1 : 1), 1, 7);
      toast(`鍵盤の高さ：C${ui.kbOct} から`);
      if (inPicker && picker.type !== 'drum') renderPicker();
      return;
    }
    if (ui.view !== 'score' && !inPicker) {
      if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomStep(-1); return; }
      if (e.key === '=' || e.key === '+' || e.key === '^') { e.preventDefault(); zoomStep(1); return; }
      if (e.key === '0' && !ui.stepRec) { e.preventDefault(); zoomFit(); return; }
    }
    if (ui.stepRec && !inPicker) {
      if (e.key === 'ArrowRight') { e.preventDefault(); advanceCursor(1); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); advanceCursor(-1); return; }
      if (e.key === 'Backspace') { e.preventDefault(); stepBackspace(); return; }
    }
    if (k in KEYMAP && !e.repeat) {
      if (held.has(k)) return;
      const midi = ui.kbOct * 12 + 12 + KEYMAP[k];
      const drumIdx = 'asdfghjk'.indexOf(k);
      if (inPicker) {
        if (picker.type === 'drum') { const kit = Sound.KITS.find((x) => x.id === picker.val) || Sound.KITS[0]; const id = [...kit.list].reverse()[drumIdx]; if (id) preview({ type: 'drum', real: picker.real }, id); }
        else { const ctx = ensureAudio(); Sound.playNote(ctx, previewOut, picker.val, midi, ctx.currentTime, 0.5, 0.8, picker.real); }
        return;
      }
      if (track().type === 'drum' && drumIdx < 0) return;
      held.set(k, midi);
      noteOn(midi, track().type === 'drum' ? drumIdx : null);
    }
  });
  document.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (held.has(k)) { held.delete(k); noteOff(); }
  });
  window.addEventListener('hashchange', async () => {
    const m = location.hash.match(/#song=(.+)$/);
    if (!m) return;
    history.replaceState(null, '', location.pathname + location.search);
    try { loadSong(await unpackSong(m[1])); toast('共有された曲を開きました'); } catch (e) { alert('共有URLの曲を読み込めませんでした'); }
  });
  window.addEventListener('beforeunload', () => { try { localStorage.setItem('otsumiki-autosave', snapshot()); } catch (e) { /* 何もしない */ } });
  // iPad・スマホは beforeunload が来ないことがあるので、かくれたときにも保存。テンポやミキサーを変えたときも保存
  const saveNow = () => { try { localStorage.setItem('otsumiki-autosave', snapshot()); } catch (e) { /* 何もしない */ } };
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });
  document.addEventListener('change', () => autosaveSoon(), true);

  (async () => {
    const m = location.hash.match(/#song=(.+)$/);
    if (m) {
      try {
        // 自分の続きの曲は、マイ曲にしまっておく（友だちの曲で上書きされないように）
        history.replaceState(null, '', location.pathname + location.search);
        let kept = null;
        try { const a = localStorage.getItem('otsumiki-autosave'); if (a) kept = keepSong(JSON.parse(a)); } catch (er) { /* なし */ }
        loadSong(await unpackSong(m[1]), { keep: false });
        toast(kept ? `共有された曲を開きました（自分の曲は「マイ曲」の「${kept}」に）` : '共有された曲を開きました'); history.replaceState(null, '', location.pathname + location.search); return; } catch (e) { history.replaceState(null, '', location.pathname + location.search); alert('共有URLの曲を読み込めませんでした（URLが途中で切れているかもしれません）'); }
    }
    try {
      const auto = localStorage.getItem('otsumiki-autosave');
      if (auto) { loadSong(JSON.parse(auto), { keep: false, own: true }); toast('前回の続きから開きました'); return; }
    } catch (e) { /* 何もしない */ }
    loadSong(sampleSong());
    openStart(true);
  })();
}
// タッチの画面では、ボタンを長おしすると説明（title）が出ます
function setupTouchTips() {
  let timer = null;
  let tip = null;
  let shownAt = 0;
  let start = null;
  const hide = () => { if (tip) { tip.remove(); tip = null; } };
  const show = (el) => {
    const text = el.getAttribute('title') || el.getAttribute('aria-label') || el.dataset.tip;
    if (!text) return;
    hide();
    tip = document.createElement('div');
    tip.className = 'touchtip';
    tip.textContent = text;
    document.body.appendChild(tip);
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const x = clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8);
    const y = r.top - h - 8 > 8 ? r.top - h - 8 : r.bottom + 8;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
    shownAt = Date.now();
    if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) { /* なし */ }
  };
  document.addEventListener('pointerdown', (e) => {
    hide();
    shownAt = 0;
    if (e.pointerType !== 'touch') return;
    const el = e.target.closest && e.target.closest('[title], [aria-label], [data-tip]');
    if (!el || el.closest('svg') || e.target.closest('canvas')) return;
    start = { x: e.clientX, y: e.clientY };
    clearTimeout(timer);
    timer = setTimeout(() => show(el), 450);
  }, true);
  document.addEventListener('pointermove', (e) => {
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) { clearTimeout(timer); start = null; }
  }, true);
  const up = () => { clearTimeout(timer); start = null; if (tip) setTimeout(hide, 1800); };
  document.addEventListener('pointerup', up, true);
  document.addEventListener('pointercancel', up, true);
  // 説明を出したときは、そのボタンは押さなかったことにする
  document.addEventListener('click', (e) => { if (shownAt && Date.now() - shownAt < 2500) { shownAt = 0; e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener('contextmenu', (e) => { if (tip || (start && e.target.closest('[title], [aria-label]'))) e.preventDefault(); }, true);
}
setupTouchTips();

/* ============================================================
   着せかえ（色のテーマ・明るさ）
   ============================================================ */
const THEMES = [
  ['lavender', 'ラベンダー', '#6d5dfc', '#b45cff'], ['ocean', 'オーシャン', '#2f7fe8', '#1fc8c1'], ['sakura', 'さくら', '#e3477f', '#ff8f73'],
  ['mint', 'ミント', '#0f9f7a', '#5ccf9a'], ['sunset', 'サンセット', '#f2672a', '#f5b521'],
  ['neon', 'ネオン', '#00d5ff', '#ff3cc7'],
];
const lsGet = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* なし */ } };
// 明るさ：CSS の「暗い画面用」の指定を、強制的に使う／使わないに切りかえる
function applyMode(mode) {
  for (const sh of document.styleSheets) {
    let rules;
    try { rules = sh.cssRules; } catch (e) { continue; }
    for (const r of rules) {
      if (!r.media) continue;
      if (r._orig == null) { if (!/prefers-color-scheme:\s*dark/.test(r.media.mediaText)) continue; r._orig = r.media.mediaText; }
      r.media.mediaText = mode === 'dark' ? 'all' : mode === 'light' ? 'not all' : r._orig;
    }
  }
  document.documentElement.style.colorScheme = mode === 'auto' ? '' : mode;
}
function applyTheme() {
  const t = lsGet('otsumiki-theme', 'lavender');
  if (t === 'lavender') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  const NEON = t === 'neon';
  applyMode(NEON ? 'dark' : lsGet('otsumiki-mode', 'auto'));
  // マス目（曲の地図）で使う色は、ふつうの色の書き方で入れる
  const th = THEMES.find((x) => x[0] === t) || THEMES[0];
  const n = parseInt(th[2].slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
  const mode = lsGet('otsumiki-mode', 'auto');
  const dark = NEON || mode === 'dark' || (mode === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const st = document.documentElement.style;
  st.setProperty('--trail', `rgba(${r},${g},${b},${dark ? 0.16 : 0.1})`);
  st.setProperty('--sel', `rgba(${r},${g},${b},${dark ? 0.18 : 0.11})`);
  st.setProperty('--sel-strong', `rgba(${r},${g},${b},${dark ? 0.32 : 0.22})`);
  st.setProperty('--bar-shade', `rgba(${r},${g},${b},${dark ? 0.04 : 0.03})`);
  const mix = (bg, k) => `rgb(${Math.round(bg[0] + (r - bg[0]) * k)},${Math.round(bg[1] + (g - bg[1]) * k)},${Math.round(bg[2] + (b - bg[2]) * k)})`;
  st.setProperty('--row-tonic', dark ? mix(NEON ? [8, 11, 20] : [20, 22, 28], 0.12) : mix([255, 255, 255], 0.06));
  cssCache = null;
  try { draw(); drawOverview(); if (ui.view === 'score') renderScoreEdit(); } catch (e) { /* はじめは描かない */ }
}
function openTheme() {
  const cur = lsGet('otsumiki-theme', 'lavender');
  const mode = lsGet('otsumiki-mode', 'auto');
  $('#themeGrid').innerHTML = THEMES.map(([id, name, a, b]) => `<button class="themebtn ${id === cur ? 'on' : ''}" data-t="${id}"><i style="background:linear-gradient(135deg,${a},${b})"></i>${name}</button>`).join('');
  $$('#themeGrid .themebtn').forEach((b) => (b.onclick = () => { lsSet('otsumiki-theme', b.dataset.t); applyTheme(); openTheme(); }));
  $('#modeSeg').classList.toggle('dis', cur === 'neon');
  $('#modeSeg').title = cur === 'neon' ? 'ネオンは、いつも暗い画面です' : '';
  $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === mode); b.onclick = () => { lsSet('otsumiki-mode', b.dataset.mode); applyTheme(); openTheme(); }; });
  if (!$('#dlgTheme').open) $('#dlgTheme').showModal();
}
$('#btnTheme').onclick = () => { closePops(); openTheme(); };
applyTheme();

/* ============================================================
   はじめての人への案内（使い方ツアー）
   ============================================================ */
const TOUR_PC = [
  ['#editorWrap', 'オトグラフ', 'マス目をクリックすると音が置けます。もう一度クリックで消えます。右へドラッグすると長い音になります。'],
  ['#trackList', 'トラック', 'パート（メロディ・コード伴奏・リズム）の一覧です。楽器の絵をおすと音色を変えられます。'],
  ['#ovWrap', '曲の地図', '曲全体を見わたす地図です。小節をドラッグしてコピー、ゴミ箱で消去。「R」の行をおすと、その小節からテンポ・拍子・調を変えられます。'],
  ['#viewSeg', 'マス目 ⇔ 楽譜', '楽譜に切りかえると、五線の上で音符を入力・編集できます（キーボードの A〜G と 1〜6 でも入力できます）。'],
  ['#btnPlay', '再生', '曲を鳴らします。スペースキーでも再生・停止できます。'],
  ['#keySum', '調', 'ハ長調・ト長調などをえらぶと、曲全体をかんたんに移調できます。'],
  ['[data-pop="menu"] > summary', 'メニュー', '保存・ファイルを開く・音声（MP3/WAV）や MIDI・楽譜の書き出しはここです。'],
  [null, 'ヒント', 'ボタンにマウスをのせると、説明が出ます。このツアーは「メニュー → 使い方ツアー」でいつでも見られます。'],
];
const TOUR_PHONE = [
  ['#editorWrap', '打ち込み', 'マス目を指でおすと音が置けます。もう一度おすと消えます。'],
  ['#phoneNav [data-view="tracks"]', 'トラック', 'パートの一覧です。楽器の絵をおすと音色を変えられます。'],
  ['#phoneNav [data-view="canvas"]', '全体', '曲全体の地図です。小節のコピーや、テンポ・拍子・調の変化はここから。'],
  ['#phoneNav [data-view="score"]', '楽譜', '五線譜で入力できます。長さ → ドレミ の順におすだけで、サッと楽譜が作れます。'],
  ['#btnPlay', '再生', '曲を鳴らします。'],
  ['#phoneNav [data-view="more"]', 'その他', '保存・書き出し（MP3・MIDI・楽譜）・調や拍子の設定はここです。'],
  [null, 'ヒント', 'ボタンを長おしすると、そのボタンの説明が出ます。このツアーは「その他 → 使い方ツアー」でいつでも見られます。'],
];
const TOUR_SCORE_PC = [
  ['#scoreEditView', '楽譜で入力', '五線をクリックした高さに音符が入ります。音符をクリックするとえらべます（Shift で範囲、Ctrl で追加）。'],
  ['#scorePal [data-m="1"]', '入力 ⇔ 選択', '「入力」はクリックで音符を置く、「選択」はクリックでえらぶだけ。キー N でも切りかえられます。'],
  ['#scorePal .grp:has(.sdur)', '音の長さ', '先に長さをえらんでから音を入れます。キー 1〜6 でも（4＝4分音符、3＝8分音符）。音符をえらんでから押すと、その音符の長さが変わります。'],
  ['#scorePal .grp:has(.snote)', 'ドレミで入れる', 'キーボードの A〜G（C＝ド）でも入ります。Shift をおしながらだと和音になります。0 または R で休符。'],
  ['#scorePal .grp:has(#scSharp)', '高さを直す', '♯・♭・↑↓ で、えらんだ音符の高さを変えます。Ctrl＋↑↓ でオクターブ。'],
  ['#scorePal .grp:has(#scVoice)', '声部・拍子・D.C.', '1つの段に2つのメロディ（声部）、とちゅうの拍子・調の変化、D.C.・コーダもここから。'],
  [null, 'ショートカット', '「?」キーで、使えるキーの一覧がいつでも出ます。'],
];
const TOUR_SCORE_PHONE = [
  ['#scoreEditView', '楽譜で入力', '下のパネルで、長さ → ドレミ の順におすだけで音符が入っていきます。音符をタップするとえらべます。'],
  ['#phonePad .pp-durs', '音の長さ', '先に長さをえらびます。音符をえらんでからおすと、その音符の長さが変わります。'],
  ['#phonePad .pp-notes', 'ドレミ', 'おすと、カーソルの所に音符が入り、次へ進みます。'],
  ['#phonePad .pp-tools', '直す', 'オクターブ・♯♭・休符・前後へ移動・消す。'],
  ['#phonePad .pp-more > summary', 'もっと', '記号・強弱・歌詞・コード・くり返し・声部・拍子や調の変化・D.C. はここ。'],
];
const NO_TOUR = /[?&]notour\b/.test(location.search);
function tourFirstTime(kind = 'main') {
  if (NO_TOUR) return;
  const key = kind === 'score' ? 'otsumiki-tour-score' : 'otsumiki-tour';
  let done = false;
  try { done = !!localStorage.getItem(key); } catch (e) { /* なし */ }
  if (done || document.querySelector('.tour')) return;
  setTimeout(() => startTour(kind), 700);
}
function startTour(kind = 'main') {
  if (document.querySelector('.tour')) return;
  const flag = kind === 'score' ? 'otsumiki-tour-score' : 'otsumiki-tour';
  const list = kind === 'score' ? (isPhone ? TOUR_SCORE_PHONE : TOUR_SCORE_PC) : isPhone ? TOUR_PHONE : TOUR_PC;
  const steps = list.filter(([sel]) => {
    if (!sel) return true;
    const el = document.querySelector(sel);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  closePops();
  if (isPhone && kind === 'main') setPhoneView('edit');
  let k = 0;
  const ov = document.createElement('div');
  ov.className = 'tour';
  ov.innerHTML = '<div class="tour-hole"></div><div class="tour-card" role="dialog" aria-live="polite"><div class="tour-step"></div><b class="tour-title"></b><p class="tour-text"></p><div class="tour-btns"><button class="mini tour-skip">おわる</button><button class="mini tour-back">もどる</button><button class="tbtn primary tour-next">次へ</button></div></div>';
  document.body.appendChild(ov);
  const hole = ov.querySelector('.tour-hole');
  const card = ov.querySelector('.tour-card');
  const end = () => { ov.remove(); removeEventListener('resize', place); try { localStorage.setItem(flag, '1'); } catch (e) { /* なし */ } };
  function place() {
    const [sel, title, text] = steps[k];
    ov.querySelector('.tour-step').textContent = `${k + 1} / ${steps.length}`;
    ov.querySelector('.tour-title').textContent = title;
    ov.querySelector('.tour-text').textContent = text;
    ov.querySelector('.tour-back').style.visibility = k ? '' : 'hidden';
    ov.querySelector('.tour-next').textContent = k === steps.length - 1 ? 'はじめる' : '次へ';
    const el = sel && document.querySelector(sel);
    const cw = Math.min(340, innerWidth - 24);
    card.style.width = cw + 'px';
    if (!el) {
      hole.style.cssText = `left:${innerWidth / 2}px;top:${innerHeight / 2}px;width:0;height:0`;
      card.style.left = (innerWidth - cw) / 2 + 'px';
      card.style.top = Math.max(12, innerHeight / 2 - card.offsetHeight / 2) + 'px';
      return;
    }
    const r = el.getBoundingClientRect();
    const pad = 6;
    const x = Math.max(4, r.left - pad);
    const y = Math.max(4, r.top - pad);
    const w = Math.min(innerWidth - 8, r.right + pad) - x;
    const h = Math.min(innerHeight - 8, r.bottom + pad) - y;
    hole.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
    const ch = card.offsetHeight;
    let cy = y + h + 12;
    if (cy + ch > innerHeight - 8) cy = y - ch - 12;
    if (cy < 8) cy = Math.min(innerHeight - ch - 8, Math.max(8, y + h / 2 - ch / 2));
    card.style.top = cy + 'px';
    card.style.left = clamp(x + w / 2 - cw / 2, 12, innerWidth - cw - 12) + 'px';
  }
  ov.querySelector('.tour-next').onclick = () => { if (k >= steps.length - 1) end(); else { k++; place(); } };
  ov.querySelector('.tour-back').onclick = () => { if (k > 0) { k--; place(); } };
  ov.querySelector('.tour-skip').onclick = end;
  ov.onkeydown = (e) => { if (e.key === 'Escape') end(); };
  addEventListener('resize', place);
  place();
  ov.querySelector('.tour-next').focus();
}
// 発表モード：全画面で、マス目を大きく（授業のプロジェクター・ともだちに見せるとき）
let presentPrev = null;
function setPresent(on) {
  if (on === document.body.classList.contains('present')) return;
  document.body.classList.toggle('present', on);
  if (on) {
    presentPrev = { zoom: ui.zoom, rh: ui.rh, follow: ui.follow };
    ui.rh = Math.max(ui.rh * 1.45, 32);
    ui.zoom = ui.zoom * 1.3;
    ui.follow = true;
    try { if (document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); } catch (e) { /* なし */ }
    toast('発表モード：Esc または右上の「おわる」でもどります');
  } else {
    if (presentPrev) { ui.zoom = presentPrev.zoom; ui.rh = presentPrev.rh; ui.follow = presentPrev.follow; }
    try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) { /* なし */ }
  }
  $('#zoom').value = ui.zoom;
  $('#rowZoom').value = ui.rh;
  requestAnimationFrame(() => { resizeEditor(); scrollToNotes(); draw(); drawOverview(); });
}
$('#btnPresent').onclick = () => { closePops(); setPresent(true); };
$('#presentExit').onclick = () => setPresent(false);
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) setPresent(false); });
$('#btnCompare').onclick = () => { closePops(); startCompare(); };
$('#btnCp').onclick = () => { closePops(); cpDialog('start'); };
$('#cpList').onclick = () => cpDialog('list');
$('#cpRules').onclick = () => cpDialog('rules');
$('#cpNew').onclick = () => cpDialog('start');
$('#cpClose').onclick = () => { if (song.cp) { song.cp.on = false; changed(); toast('対位法のチェックをおわりました（曲はそのままです）'); } };
$('#cmpClose').onclick = () => stopCompare();
$('#cmpOther').onclick = () => startCompare();
$('#cmpBatch').onclick = () => batchCompare();
/* ---------- こどもモード：むずかしい漢字にふりがな、M/S を絵に、ボタンを大きく ---------- */
const RUBY = [
  ['使い方', 'つかいかた'], ['新しい', 'あたらしい'], ['打ち込み', 'うちこみ'], ['元に戻す', 'もとにもどす'], ['戻す', 'もどす'],
  ['小節', 'しょうせつ'], ['伴奏', 'ばんそう'], ['拍子', 'ひょうし'], ['楽譜', 'がくふ'], ['五線', 'ごせん'], ['再生', 'さいせい'], ['停止', 'ていし'],
  ['音符', 'おんぷ'], ['休符', 'きゅうふ'], ['楽器', 'がっき'], ['音量', 'おんりょう'], ['音色', 'ねいろ'], ['保存', 'ほぞん'], ['共有', 'きょうゆう'],
  ['練習', 'れんしゅう'], ['表示', 'ひょうじ'], ['設定', 'せってい'], ['鍵盤', 'けんばん'], ['入力', 'にゅうりょく'], ['選択', 'せんたく'],
  ['削除', 'さくじょ'], ['音階', 'おんかい'], ['和音', 'わおん'], ['半音', 'はんおん'], ['全体', 'ぜんたい'], ['発表', 'はっぴょう'],
  ['先生', 'せんせい'], ['複製', 'ふくせい'], ['移動', 'いどう'], ['範囲', 'はんい'], ['曲名', 'きょくめい'], ['調', 'ちょう'], ['曲', 'きょく'],
  ['全画面', 'ぜんがめん'], ['画面', 'がめん'], ['速さ', 'はやさ'], ['長さ', 'ながさ'], ['高さ', 'たかさ'], ['音', 'おと'], ['前半', 'ぜんはん'], ['後半', 'こうはん'],
  ['自動', 'じどう'], ['作曲', 'さっきょく'], ['機能', 'きのう'], ['書き出し', 'かきだし'], ['読み込み', 'よみこみ'], ['開く', 'ひらく'], ['送る', 'おくる'],
];
const RUBY_RE = new RegExp(RUBY.map(([w]) => w).join('|'), 'g');
const RUBY_MAP = Object.fromEntries(RUBY);
const RUBY_SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'RUBY', 'RT', 'CANVAS', 'KBD', 'TITLE']);
function rubyNode(root) {
  if (!document.body.classList.contains('kids')) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      for (let e = n.parentNode; e && e !== document.body; e = e.parentNode) { if (RUBY_SKIP.has(e.nodeName) || (e.namespaceURI && e.namespaceURI !== 'http://www.w3.org/1999/xhtml') || (e.classList && e.classList.contains('noruby'))) return NodeFilter.FILTER_REJECT; }
      RUBY_RE.lastIndex = 0;
      return RUBY_RE.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const list = [];
  while (walker.nextNode()) list.push(walker.currentNode);
  for (const n of list) {
    const frag = document.createDocumentFragment();
    let last = 0;
    const t = n.nodeValue;
    t.replace(RUBY_RE, (w, at) => {
      if (at > last) frag.appendChild(document.createTextNode(t.slice(last, at)));
      const r = document.createElement('ruby');
      r.append(w);
      const rt = document.createElement('rt');
      rt.textContent = RUBY_MAP[w];
      r.appendChild(rt);
      frag.appendChild(r);
      last = at + w.length;
      return w;
    });
    if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    n.parentNode.replaceChild(frag, n);
  }
}
let rubyObs = null;
function setKids(on) {
  document.body.classList.toggle('kids', on);
  lsSet('otsumiki-kids', on ? '1' : '0');
  $('#kidsMode').checked = on;
  if (on && ui.rh < 34) { ui.rh = 34; $('#rowZoom').value = 34; requestAnimationFrame(() => { resizeEditor(); draw(); }); }
  if (on) {
    rubyNode(document.body);
    if (!rubyObs) {
      rubyObs = new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) { if (n.nodeType === 1) rubyNode(n); else if (n.nodeType === 3 && n.parentNode) rubyNode(n.parentNode); } });
    }
    rubyObs.observe(document.body, { childList: true, subtree: true });
  } else {
    if (rubyObs) rubyObs.disconnect();
    $$('ruby').forEach((r) => { const rt = r.querySelector('rt'); if (rt) rt.remove(); r.replaceWith(document.createTextNode(r.textContent)); });
    document.body.normalize();
  }
}
$('#kidsMode').onchange = (e) => setKids(e.target.checked);
if (lsGet('otsumiki-kids', '0') === '1') setKids(true);
// 読み上げソフトのために：on のボタンは「おされている」、ダイアログには見出しの名前
{
  // 切りかえボタン（いちど「on」になったことのあるボタンも）に、おされている状態をつける
  const sync = (b) => { if (b.classList.contains('toggle') || b.closest('.seg, .otama, .realtoggle, .halfseg') || b.id === 'btnRec' || b.id === 'btnStepRec' || b.classList.contains('on') || b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', b.classList.contains('on') ? 'true' : 'false'); };
  $$('button').forEach(sync);
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'attributes' && m.target.nodeName === 'BUTTON') sync(m.target);
      else if (m.type === 'childList') m.addedNodes.forEach((n) => { if (n.nodeType !== 1) return; if (n.nodeName === 'BUTTON') sync(n); if (n.querySelectorAll) n.querySelectorAll('button').forEach(sync); });
    }
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  $$('dialog').forEach((d, i) => { const h = d.querySelector('h3'); if (h && !d.hasAttribute('aria-labelledby')) { if (!h.id) h.id = 'dlgTitle' + i; d.setAttribute('aria-labelledby', h.id); } });
}
// MIDI鍵盤が使えないブラウザ（iPad の Safari など）では、ボタンを出さない
if (!navigator.requestMIDIAccess && $('#btnMidiIn')) $('#btnMidiIn').hidden = true;
// ひらいたメニューが画面の下からはみ出すときは、その中でスクロール
document.addEventListener('toggle', (e) => {
  const d = e.target;
  if (!d.open || !d.matches || !d.matches('details.pop, details.dropdown')) return;
  const body = d.querySelector(':scope > .popbody, :scope > .dd');
  if (!body) return;
  body.style.maxHeight = '';
  requestAnimationFrame(() => {
    const r = body.getBoundingClientRect();
    const room = innerHeight - Math.max(0, r.top) - 10;
    if (r.height > room && room > 120) { body.style.maxHeight = room + 'px'; body.style.overflowY = 'auto'; }
  });
}, true);
$('#btnTour').onclick = () => { closePops(); startTour(ui.view === 'score' ? 'score' : 'main'); };
$('#btnKeys').onclick = () => { closePops(); openKeys(); };
function openKeys() { if (!$('#dlgKeys').open) $('#dlgKeys').showModal(); }
init();
