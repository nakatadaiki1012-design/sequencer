'use strict';
/* ============================================================
   おとつみき — アプリ本体
   時間の単位：4分音符 = 48 ティック（3連符や32分音符も表せます）
   ============================================================ */
const $ = (s) => document.querySelector(s);
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
const MAX_TRACKS = 8;

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
  out.bars = Math.round(num(s.bars, 8, 1, 128));
  out.bpm = num(s.bpm, 100, 20, 300);
  out.key = Math.round(num(s.key, 0, -12, 12));
  out.meter = Array.isArray(s.meter) && s.meter.length === 2 && s.meter.every((x) => Number.isInteger(x) && x > 0 && x <= 32) ? s.meter : [4, 4];
  for (const k of ['tempos', 'meters', 'keys', 'jumps', 'eq', 'metro', 'locks']) out[k] = obj(s[k]);
  for (const b in out.tempos) if (!Number.isFinite(+out.tempos[b])) delete out.tempos[b];
  out.ramps = obj(s.ramps);
  for (const b in out.ramps) { const r = out.ramps[b]; if (!(r && (r.type === 'rit' || r.type === 'acc') && Number.isInteger(r.n) && r.n > 0 && r.n <= 16)) delete out.ramps[b]; }
  for (const b in out.meters) { const m = out.meters[b]; if (!(Array.isArray(m) && m.length === 2 && m.every((x) => Number.isInteger(x) && x > 0 && x <= 32))) delete out.meters[b]; }
  out.title = String(s.title == null ? 'あたらしい曲' : s.title).slice(0, 60);
  const T = s.v >= 2 ? 1 : 0; // migrate のあと
  out.tracks = s.tracks.filter((t) => t && typeof t === 'object' && ['melody', 'drum', 'chord'].includes(t.type)).map((t) => {
    const tr = { ...t };
    if (t.type === 'melody') {
      tr.notes = (Array.isArray(t.notes) ? t.notes : []).filter((n) => n && Number.isFinite(+n.s) && Number.isFinite(+n.p) && Number.isFinite(+n.l) && +n.l > 0 && +n.s >= 0)
        .map((n) => { const o = { ...n, s: Math.round(+n.s), p: clamp(Math.round(+n.p), 0, 127), l: Math.max(1, Math.round(+n.l)) }; if (n.vel != null) { const v = Number(n.vel); if (Number.isFinite(v) && v !== 1) o.vel = clamp(v, 0.1, 1.5); else delete o.vel; } return o; });
      for (const k of ['dyn', 'hairpins', 'slurs']) if (!Array.isArray(tr[k])) tr[k] = [];
    } else if (t.type === 'drum') {
      const g = {};
      for (const id in obj(t.grid)) {
        const row = obj(t.grid[id]);
        for (const st in row) if (Number.isFinite(+st) && +st >= 0 && (row[st] === 1 || row[st] === 2)) { if (!g[id]) g[id] = {}; g[id][st] = row[st]; }
      }
      tr.grid = g;
    } else {
      const okC = (c) => c && Number.isInteger(c.r) && c.r >= 0 && c.r < 12 && CHORD_Q[c.q];
      tr.chords = (Array.isArray(t.chords) ? t.chords : []).map((c) => (okC(c) ? (c.h && !okC(c.h) ? { r: c.r, q: c.q } : c) : null));
    }
    tr.vol = num(t.vol, 0.8, 0, 1.5);
    tr.pan = num(t.pan, 0, -1, 1);
    if (t.name != null) tr.name = String(t.name).slice(0, 40);
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
function geo() {
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
// 1小節に2つのコード（c.h ＝ 小節の後半のコード）
function chordLabel(c) { return c ? (c.h ? `${chordName(c)}・${chordName(c.h)}` : chordName(c)) : ''; }
// 後半がはじまる位置（小節の頭から。拍の区切りで、まん中あたり）
function chordHalf(b) { const bs = beatAt(b); const n = Math.round(barLen(b) / bs); return Math.max(1, Math.floor(n / 2)) * bs; }
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
  const key = orderCache.key + geo().key + ':' + playSpeed;
  if (timeCache.key === key) return timeCache;
  const start = [0];
  const spt = [];
  const ps = playStarts();
  for (let k = 0; k < o.length; k++) {
    spt.push(60 / (bpmAt(o[k]) * TPQ * playSpeed));
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
  undoStack.push({ snap, label });
  if (undoStack.length > 300) undoStack.shift();
  // 大きな曲で記憶がふくらみすぎないように（全部で約2000万文字まで。少なくとも30回はもどれる）
  let total = 0;
  for (const u of undoStack) total += u.snap.length;
  while (total > 2e7 && undoStack.length > 30) total -= undoStack.shift().snap.length;
  redoStack.length = 0;
  updateUndoButtons();
}
function edit(fn, label = '編集') {
  const snap = snapshot();
  const nTr = song.tracks.length;
  const trId = track() && track().id;
  fn();
  if (song.tracks.length !== nTr || (track() && track().id) !== trId) { nsel.clear(); updateSelBar(); }
  if (snapshot() !== snap) pushUndo(snap, label);
  changed();
}
function restore(json) {
  song = JSON.parse(json);
  cur = clamp(cur, 0, song.tracks.length - 1);
  nsel.clear();
  updateSelBar();
  changed(true);
}
function undo() {
  if (!undoStack.length) return toast('もどせる操作はありません');
  const e = undoStack.pop();
  redoStack.push({ snap: snapshot(), label: e.label });
  restore(e.snap);
  toast(`↶ 「${e.label}」を元に戻しました`);
  updateUndoButtons();
}
function redo() {
  if (!redoStack.length) return toast('やり直せる操作はありません');
  const e = redoStack.pop();
  undoStack.push({ snap: snapshot(), label: e.label });
  restore(e.snap);
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
  if (full) { renderSettings(); renderTracks(); }
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
}

/* ============================================================
   オーディオ（再生）
   ============================================================ */
let actx = null;
let previewOut = null;
function ensureAudio() {
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
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
    setTimeout(() => { Sound.makeReverb(actx, 2.2); Sound.makeReverb(actx, 3.5); }, 0);
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
      crush.connect(dIn); dIn.connect(dl); dl.connect(dFb); dFb.connect(dl); dl.connect(out);
      const stIn = ctx.createGain(); stIn.gain.value = 1;
      const st = ctx.createDelay(2); st.delayTime.value = 0.2;
      const stFb = ctx.createGain(); stFb.gain.value = 0;
      const stOut = ctx.createGain(); stOut.gain.value = 0;
      crush.connect(stIn); stIn.connect(st); st.connect(stFb); stFb.connect(st); st.connect(stOut); stOut.connect(out);
      const fxRev = Sound.makeReverb(ctx, 3.5);
      const fxRevIn = ctx.createGain(); fxRevIn.gain.value = 0;
      crush.connect(fxRevIn); fxRevIn.connect(fxRev); fxRev.connect(out);
      Object.assign(g, { lp, hp, crush, dry, dIn, dl, dFb, stIn, st, stFb, stOut, fxRevIn });
      ctx._live = g;
    } else eqH.connect(out);
    const rev = Sound.makeReverb(ctx, 2.2);
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
  session.connect(send); send.connect(g.rev);
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
  return Object.assign(Object.create(g), { session, send, outs, pans, metro, base: g });
}

function chordEvents(tr) {
  const ev = [];
  let prev = null; // 前の和音の音（なめらかにつなぐため）
  for (let b = 0; b < song.bars; b++) {
    const c0 = tr.chords[b];
    if (!c0) continue;
    const bs = beatAt(b);
    const bl = barLen(b);
    const hs = c0.h ? chordHalf(b) : bl;
    // 伴奏の形は「小節の」リズムで作り、前半・後半それぞれの区切りの中だけ鳴らす（2つのコードでも速くならない）
    prev = chordPart(tr, ev, c0, barStart(b), bl, 0, hs, bs, prev);
    if (c0.h) prev = chordPart(tr, ev, c0.h, barStart(b), bl, hs, bl, bs, prev);
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
function chordPart(tr, ev, c, o, bl, from, to, bs, prev) {
  let root = 48 + ((c.r % 12) + 12) % 12;
  if (root > 54) root -= 12;
  const iv = CHORD_Q[c.q].iv;
  const tones = voiceLead(iv.map((x) => root + 12 + x), prev);
  const top = tones[tones.length - 1];
  const bass = root - 12 + (root < 43 ? 12 : 0);
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
  const total = totalTicks();
  const bySrc = Array.from({ length: song.bars }, () => []);
  const put = (t, e) => { if (t < 0 || t >= total) return; const b = barOf(t); bySrc[b].push({ ...e, rt: t - barStart(b) }); };
  for (const tr of song.tracks) {
    if (tr.type === 'melody') {
      const ex = expression(tr);
      for (const n of tr.notes) if (n.s < total) { const x = ex(n); put(n.s, { tr, kind: 'note', p: n.p, l: Math.min(n.l, total - n.s), v: clamp(x.v * (n.vel || 1), 0.05, 1.3), lf: x.lf }); }
    } else if (tr.type === 'chord') for (const n of chordEvents(tr)) put(n.s, { tr, kind: 'note', p: n.p, l: n.l, v: n.v });
    else for (const id in tr.grid) for (const s in tr.grid[id]) if (+s < total) put(+s, { tr, kind: 'drum', id, v: tr.grid[id][s] === 2 ? 1 : 0.6 });
  }
  const list = [];
  const order = playOrder();
  const ps = playStarts();
  order.forEach((src, k) => {
    for (const e of bySrc[src]) list.push({ ...e, t: ps[k] + e.rt });
    const bs = beatAt(src);
    for (let t = 0; t < barLen(src); t += bs) list.push({ t: ps[k] + t, kind: 'metro', acc: t === 0 });
  });
  list.sort((a, b) => a.t - b.t);
  evCache = { v: key, list };
  return list;
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
  if (!audible(e.tr)) return;
  const out = graph.outs[e.tr.id];
  if (!out) return;
  const t = when + swingSec(e.t);
  if (e.kind === 'note') Sound.playNote(ctx, out, e.tr.inst, e.p, t, (absSec(e.t + e.l) - absSec(e.t)) * (e.lf || 0.96), e.v, e.tr.real !== false);
  else Sound.playDrum(ctx, out, e.id, t, e.v, e.tr.real !== false);
}

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
function renderMission(done) {
  let box = $('#mission');
  if (!mission.on) { if (box) box.remove(); return; }
  if (!box) { box = document.createElement('div'); box.id = 'mission'; box.className = 'mission'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
  box.innerHTML = `<b>${done ? 'ミッションクリア！ 🎉' : 'はじめてのミッション'}</b><ol>${MISSION.map((m, i) => `<li class="${i < mission.step ? 'ok' : i === mission.step ? 'now' : ''}">${i < mission.step ? '✅' : i === mission.step ? '👉' : '・'} ${m}</li>`).join('')}</ol>${done ? '<p>これで作曲家の仲間入り！ いろいろためしてね。</p>' : ''}<button class="mini" id="missionClose">${done ? 'とじる' : 'あとでやる'}</button>`;
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
  player.stopping = false;
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
  player.seg = { tick: start, time: ctx.currentTime + 0.05 + lead };
  player.segs = [player.seg];
  player.idx = firstIdx(eventList(), start);
  player.lastT = start - 1;
  player.ver = version;
  player.timer = setInterval(tick, 25);
  tick();
  $('#btnPlay').classList.add('on');
  $('#btnPlay').innerHTML = I('pause');
  requestAnimationFrame(anim);
}
const timeOf = (t) => player.seg.time + absSec(t) - absSec(player.seg.tick);
function tick() {
  const ctx = actx;
  if (!player.on) return;
  if (player.stopping) { if (ctx.currentTime > player.stopAt) stop(); return; }
  const list = eventList();
  if (player.ver !== version) { player.ver = version; player.idx = firstIdx(list, player.lastT + 1); }
  const horizon = ctx.currentTime + 0.3;
  for (let guard = 0; guard < 8; guard++) {
    const [ls, le] = loopBounds();
    while (player.idx < list.length && list[player.idx].t < le) {
      const e = list[player.idx];
      if (e.t < player.seg.tick) { player.idx++; continue; }
      const tm = timeOf(e.t);
      if (tm >= horizon) return;
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
      player.stopAt = endT + 0.05;
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
  const pos = playheadTick();
  if (pos != null && ui.follow) {
    const sc = $('#scroller');
    const x = LW + pos * ppt();
    if (x - sc.scrollLeft > sc.clientWidth - 40 || x - sc.scrollLeft < LW) sc.scrollLeft = Math.max(0, x - LW - 20);
  }
  draw(pos);
  drawOverview(pos);
  updateMini(pos);
  drawViz();
  if (document.body.classList.contains('present')) karaoke(pos);
  if (ui.view === 'score') highlightScore(pos);
  requestAnimationFrame(anim);
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
function preloadSamples() {
  const ctx = audioCtx();
  const jobs = [];
  for (const tr of song.tracks) {
    if (tr.real === false) continue;
    if (tr.type === 'drum') { if (!Sound.Samples.drumsReady()) jobs.push(['drums', () => Sound.Samples.loadDrums(ctx)]); }
    else if (Sound.Samples.has(tr.inst) && !Sound.Samples.ready(tr.inst)) {
      // 曲で使っている高さの録音だけを先に読む（あとから使う高さは、鳴らすときに読みます）
      const ps = tr.type === 'melody' ? tr.notes.map((n) => n.p) : chordEvents(tr).map((e) => e.p);
      const notes = ps.length ? [...new Set(ps)] : undefined;
      jobs.push([tr.inst, () => Sound.Samples.load(tr.inst, ctx, notes)]);
    }
  }
  for (const [key, fn] of jobs) {
    if (loadingNow.has(key)) continue;
    loadingNow.add(key);
    loadQueue = loadQueue.then(fn).then(() => { loadingNow.delete(key); renderTracks(); }).catch(() => { loadingNow.delete(key); toast('録音の読み込みに失敗したので、電子音で鳴らします'); });
  }
}
let loadQueue = Promise.resolve();

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
function rowH(tr) { return tr.type === 'chord' ? 70 : ui.rh; }

function resizeEditor() {
  const wrap = $('#editorWrap');
  const tr = track();
  const rows = rowsFor(tr);
  const spacer = $('#spacer');
  spacer.style.width = LW + totalTicks() * ppt() + 60 + 'px';
  spacer.style.height = RH + rows.length * rowH(tr) + 4 + 'px';
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

function draw(playPos) {
  if (playPos === undefined) playPos = playheadTick();
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
      const pop = on && !REDUCED ? Math.max(0, 1 - (playing - n.s) / 12) * 3 : 0;
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
      if (w > 24) { g2.fillStyle = '#1b1b1b'; g2.fillText(noteName(n.p), x + 6, y + rh / 2 + 1, w - 12); }
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
        const parts = c.h ? [[c, 0, chordHalf(b) * k], [c.h, chordHalf(b) * k, w - chordHalf(b) * k]] : [[c, 0, w]];
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
  }
  if (refSong && tr.type === 'melody') compareMarks(g2, tr, X, rowIndex, rh, sy, k);
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
  if (playPos != null) {
    {
      const px = X(playPos);
      const tl = g2.createLinearGradient(px - 90, 0, px, 0);
      tl.addColorStop(0, 'rgba(0,0,0,0)');
      tl.addColorStop(1, C('--trail'));
      g2.fillStyle = tl;
      g2.fillRect(px - 90, RH, 90, H);
    }
    g2.strokeStyle = C('--playhead');
    g2.lineWidth = 2;
    g2.shadowColor = C('--playhead');
    g2.shadowBlur = 10;
    g2.beginPath(); g2.moveTo(X(playPos), RH); g2.lineTo(X(playPos), H); g2.stroke();
    g2.shadowBlur = 0;
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
  if (playPos != null) g2.fillRect(X(playPos) - 1, 0, 2, RH);
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
      if (isPhone && tr.type === 'drum') {
        // スマホ：せまい列でも読めるように、短い名前を2行で
        const t = shortDrum(row.label);
        const half = t.length > 4 ? Math.ceil(t.length / 2) : t.length;
        const lines = t.length > 4 && rh >= 24 ? [t.slice(0, half), t.slice(half)] : [t];
        g2.font = `${lines.length > 1 ? 10.5 : 11.5}px sans-serif`;
        lines.forEach((ln, i) => g2.fillText(ln, 4, y + rh / 2 + 1 + (lines.length > 1 ? (i - 0.5) * 11 : 0), LW - 6));
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
      if (oct) n.p = clamp(n.p + oct * 12, 0, 127);
      else if (drow) {
        // 表示している行（音階）にそって1つ上・下へ
        const i = rows.findIndex((r) => r.p === n.p);
        if (i >= 0) n.p = rows[clamp(i - drow, 0, rows.length - 1)].p;
        else n.p = clamp(n.p + drow, 0, 127);
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
   キャンバス（全体の見取り図：トラック × 小節）
   ============================================================ */
const ov = $('#ov');
const og = ov.getContext('2d');
let OV_LW = 110;
let OV_RH = 20;
const OV_TOP = 16;
let ovDrag = null;
function ovBarW() { return Math.max(34, Math.min(90, ($('#ovWrap').clientWidth - OV_LW - 10) / Math.min(song.bars, 16))); }
function ovRows() { return [...song.tracks.map((t, i) => ({ kind: 'track', i })), { kind: 'rule' }]; }
function resizeOverview() {
  const wrap = $('#ovWrap');
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
    og.fillText(String(b + 1), x + 3, OV_TOP / 2);
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
      roundRect(og, x + 1, y + 1, bw - 2, OV_RH - 2, 4);
      og.fill();
      if (sel) { og.strokeStyle = C('--accent2'); og.lineWidth = 2; og.stroke(); }
      if (tr.type === 'chord' && tr.chords[b]) {
        og.fillStyle = C('--text');
        og.font = 'bold 10px sans-serif';
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
      og.font = '11px sans-serif';
      og.fillText('R  テンポ変化', 6, y + OV_RH / 2);
      return;
    }
    const tr = song.tracks[r.i];
    og.fillStyle = TRACK_COLORS[r.i % TRACK_COLORS.length];
    og.fillRect(0, y + 2, 5, OV_RH - 4);
    og.fillStyle = r.i === cur ? C('--accent2') : C('--text');
    og.font = `${r.i === cur ? 'bold ' : ''}11px sans-serif`;
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
  cur = i;
  if (ui.sel.t !== i) ui.sel = { ...ui.sel, t: i };
  ui.selBar = ui.sel.b0;
  renderTracks();
  renderEditorTools();
  resizeEditor();
  if (redraw) scrollToNotes();
  draw();
  drawOverview();
  if (ui.showScore) renderScorePanel();
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
        if (ramp && ramp !== '-') { /* だんだんで入れたテンポをのこす */ } else if (tOn) song.tempos[b] = clamp(Math.round(+$('#barTempo').value) || bpmAt(b), 30, 240); else delete song.tempos[b];
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
  const R = song.repeats || { start: [], end: [], volta: {} };
  const mvArr = (arr) => arr.map((b) => (b >= fromBar ? b + n : n < 0 && b >= fromBar + n ? -1 : b)).filter((b) => b >= 0);
  song.repeats = { start: mvArr(R.start || []), end: mvArr(R.end || []), volta: mv(R.volta || {}) };
  const J = song.jumps || {};
  for (const k in J) if (J[k] != null) { if (J[k] >= fromBar) J[k] += n; else if (n < 0 && J[k] >= fromBar + n) J[k] = null; }
}
// fromBar の前に n 小節入れる（n<0 のときは fromBar-|n|〜fromBar-1 を取りのぞく）
function shiftAll(fromBar, n) {
  const a = barStart(fromBar);
  const d = n > 0 ? n * barLen(Math.min(fromBar, song.bars - 1)) : -(a - barStart(fromBar + n));
  const keep = (t) => t >= a || n > 0 || t < a + d;
  for (const tr of song.tracks) {
    if (tr.type === 'melody') {
      tr.notes = tr.notes.filter((x) => keep(x.s)).map((x) => (x.s >= a ? { ...x, s: x.s + d } : x));
      for (const k of ['dyn', 'hairpins', 'slurs']) if (tr[k]) tr[k] = tr[k].filter((x) => keep(x.t != null ? x.t : x.s)).map((x) => { const y = { ...x }; for (const f of ['t', 's', 'e']) if (y[f] != null && y[f] >= a) y[f] += d; return y; });
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
  edit(() => { shiftAll(at, n); song.bars = Math.min(128, song.bars + n); }, `${at + 1}小節目の前に${n}小節入れる`);
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
    while (tr.chords.length < song.bars) tr.chords.push(null);
    if (half === 0) tr.chords[ui.selBar] = c;
    else if (half === 1) tr.chords[ui.selBar] = c ? (old && old.h ? { r: c.r, q: c.q, h: old.h } : { r: c.r, q: c.q }) : null;
    else { const n = { r: old.r, q: old.q }; if (c) n.h = { r: c.r, q: c.q }; tr.chords[ui.selBar] = n; }
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
// おまかせ作曲：音階とコードに合わせてメロディを自動で作ります
function autoCompose(tr) {
  const lo = Math.max(trackRange(tr)[0], (RANGES[tr.range] || RANGES.soprano)[1]);
  const tones = scaleDegreesInRange(lo + 2, lo + 16);
  const chordTr = song.tracks.find((t) => t.type === 'chord' && t.chords.some(Boolean));
  const bt = barTicks();
  const E = 24;
  const notes = [];
  let idx = tones.findIndex((m) => m % 12 === song.key && m >= lo + 5);
  if (idx < 0) idx = Math.floor(tones.length / 2);
  const rhythms = [[2, 2, 2, 2], [2, 1, 1, 2, 2], [4, 2, 2], [1, 1, 2, 2, 2], [2, 2, 4], [3, 1, 2, 2], [2, 2, 1, 1, 2]];
  for (let b = 0; b < song.bars; b++) {
    const bt = barLen(b);
    const need = Math.max(1, Math.round(bt / E));
    const last = b === song.bars - 1;
    let pattern;
    if (last) pattern = [need];
    else if (b % 4 === 3) pattern = need > 2 ? [need - 2, 2] : [need];
    else {
      pattern = rhythms[Math.floor(Math.random() * rhythms.length)].slice();
      let sum = pattern.reduce((a, x) => a + x, 0);
      while (sum > need) sum -= pattern.pop();
      if (sum < need) pattern.push(need - sum);
    }
    let s = barStart(b);
    const c = chordTr && chordTr.chords[b];
    const chordPcs = c ? new Set(CHORD_Q[c.q].iv.map((x) => (c.r + x) % 12)) : null;
    pattern.forEach((len, k) => {
      if (last) {
        let best = idx;
        let bd = 99;
        tones.forEach((m, i) => { if (m % 12 === song.key && Math.abs(i - idx) < bd) { bd = Math.abs(i - idx); best = i; } });
        idx = best;
      } else {
        idx = clamp(idx + [-2, -1, -1, 0, 1, 1, 2, 3, -3][Math.floor(Math.random() * 9)], 0, tones.length - 1);
        if (chordPcs && k === 0) {
          for (const dd of [0, 1, -1, 2, -2]) {
            const j = clamp(idx + dd, 0, tones.length - 1);
            if (chordPcs.has(tones[j] % 12)) { idx = j; break; }
          }
        }
      }
      if (!(Math.random() < 0.07 && k > 0 && !last)) notes.push({ s, p: tones[idx], l: Math.min(len * E, barStart(b + 1) - s) });
      s += len * E;
    });
  }
  tr.notes = notes;
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
function transpose(tr, semis) { for (const n of notesInScope(tr)) n.p = clamp(n.p + semis, 21, 108); }
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
  const box = $('#miniNote');
  box.innerHTML = `${Notation.single(midi, song.key, isMinor())}<div><b>${noteName(midi)}</b><small>${sciName(midi)}</small></div>`;
  box.classList.add('show');
  clearTimeout(miniTimer);
  miniTimer = setTimeout(() => box.classList.remove('show'), isPhone ? 1500 : 5000); // スマホでは下のボタンをかくさないよう短く
}
function updateMini(pos) {
  if (pos === undefined) pos = playheadTick();
  const t = pos != null ? pos : ui.startTick;
  const bt = barTicks();
  const bar = barOf(Math.max(0, t));
  const beat = Math.floor((t - barStart(bar)) / beatAt(bar));
  $('#miniTitle').textContent = song.title;
  $('#miniPos').textContent = `${bar + 1}小節 ${beat + 1}拍`;
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
  { const k = keyAt(bar); $('#miniKey').textContent = keyLabel(k.key, k.minor); }
  $('#miniMeter').textContent = meterAt(bar).join('/');
  $('#miniBpm').textContent = '♩=' + bpmAt(bar) + ((ui.speed || 1) !== 1 ? `（練習${Math.round(ui.speed * 100)}%）` : '');
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

function renderTracks() {
  const list = $('#trackList');
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
      <div class="trow"><span class="ticon">${icon}</span><span class="tname" title="${escapeHtml(tr.name)}">${i + 1}. ${escapeHtml(tr.name)}</span>${tr.locked ? `<span class="tlock" title="ロック中">${I('lock')}</span>` : ''}
        <button class="mini icon mute ${tr.mute ? 'on' : ''}" title="ミュート（このトラックを鳴らさない）" ${lockMute ? 'disabled' : ''}>M</button>
        <button class="mini icon solo ${tr.solo ? 'on' : ''}" title="ソロ（このトラックだけ鳴らす）" ${lockMute ? 'disabled' : ''}>S</button>
        <details class="pop right tmenu" data-pop="t${i}"><summary class="mini icon" title="名前・並べかえ・複製・削除">${I('more')}</summary><div class="popbody menu-list">
          <button data-a="rename" ${tr.locked ? 'disabled' : ''}>${I('pencil')}名前を変える</button>
          <button data-a="up" ${i === 0 ? 'disabled' : ''}>${I('chevron')}上へ</button>
          <button data-a="down" ${i === song.tracks.length - 1 ? 'disabled' : ''}>${I('chevron')}下へ</button>
          ${song.locks.tracks ? '' : `<button data-a="dup">${I('copy')}複製する</button><button data-a="del" class="danger">${I('trash')}削除する</button>`}
        </div></details></div>
      <div class="trow"><button class="instbtn" ${tr.locked ? 'disabled' : ''} title="楽器をえらぶ">${tr.type === 'drum' ? PIC('kit', tr.kit) : PIC('inst', tr.inst)}<span class="instname">${escapeHtml(instLabel)}</span>${badge}${I('chevron')}</button>
        <input class="vol" type="range" min="0" max="1" step="0.01" value="${tr.vol}" title="音量" ${tr.locked ? 'disabled' : ''}></div>`;
    d.addEventListener('pointerdown', (ev) => { if (cur !== i && !ev.target.closest('details') && !ev.target.closest('.tstrip')) selectTrack(i); });
    d.addEventListener('focusin', (ev) => { if (cur !== i && !ev.target.closest('details')) { const id = ev.target.className; selectTrack(i); const again = $$('#trackList .track')[i]; const el = again && [...again.querySelectorAll('button, input, summary')].find((x) => x.className === id); if (el) el.focus(); } });
    d.querySelector('.mute').onclick = () => { tr.mute = !tr.mute; version++; renderTracks(); autosaveSoon(); const b = $$('#trackList .track')[i]; if (b) b.querySelector('.mute').focus(); };
    d.querySelector('.solo').onclick = () => { tr.solo = !tr.solo; version++; renderTracks(); autosaveSoon(); const b = $$('#trackList .track')[i]; if (b) b.querySelector('.solo').focus(); };
    d.querySelector('.instbtn').onclick = (ev) => { ev.stopPropagation(); openInstPicker(i); };
    d.querySelectorAll('.tmenu [data-a]').forEach((b) => (b.onclick = (ev) => {
      ev.stopPropagation();
      closePops();
      const a = b.dataset.a;
      if (a === 'rename') { const n = prompt('トラックの名前', tr.name); if (n) edit(() => { tr.name = n.slice(0, 20); }, 'トラック名'); renderTracks(); }
      else if (a === 'up') moveTrack(i, -1);
      else if (a === 'down') moveTrack(i, 1);
      else if (a === 'dup') {
        if (song.tracks.length >= MAX_TRACKS) return toast(`トラックは${MAX_TRACKS}つまでです`);
        edit(() => { song.tracks.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(tr)), id: uid(), name: (tr.name + 'のコピー').slice(0, 20), locked: false }); cur = i + 1; }, 'トラックを複製');
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
      strip.innerHTML = trackStrip(tr, i);
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
}
// トラックの中身の帯（スマホのトラック画面）
let stripScroll = 0;
function stripBW() {
  const w = ($('#trackList').clientWidth || innerWidth) - 40;
  return Math.max(30, Math.floor(w / Math.min(song.bars, 8)));
}
function trackStrip(tr, i) {
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
    for (const n of tr.notes) {
      if (n.s >= totalTicks()) continue;
      const x = xOf(n.s);
      const w = Math.max(2, xOf(Math.min(n.s + n.l, totalTicks())) - x - 1);
      const y = 13 + ((hi - n.p) / span) * (H - 19);
      o += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="3.2" rx="1.6" fill="${PC_COLORS[n.p % 12]}"/>`;
    }
  } else if (tr.type === 'chord') {
    tr.chords.forEach((c, b) => { if (c && b < song.bars) o += `<text x="${b * BW + BW / 2}" y="${H / 2 + 7}" text-anchor="middle" class="cn">${escapeHtml(chordLabel(c))}</text>`; });
  } else if (tr.type === 'drum') {
    const ids = Object.keys(tr.grid);
    ids.forEach((id, k) => {
      const y = 15 + (k % 6) * 4.6;
      for (const s in tr.grid[id]) { if (+s < totalTicks()) o += `<rect x="${xOf(+s).toFixed(1)}" y="${y}" width="2" height="3.4" rx="1" fill="${col}" opacity="${tr.grid[id][s] === 2 ? 1 : 0.65}"/>`; }
    });
  }
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${o}</svg>`;
}
function moveTrack(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= song.tracks.length) return;
  edit(() => {
    const [t] = song.tracks.splice(i, 1);
    song.tracks.splice(j, 0, t);
    if (cur === i) cur = j; else if (cur === j) cur = i;
  }, 'トラックの並べかえ');
  renderTracks();
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
    if (!song.locks.compose) html += `<button class="mini accent" id="btnAuto" title="音階とコードに合わせて、メロディを自動で作ります">${I('spark')}<span class="keep">おまかせ</span></button>`;
    const [rlo, rhi] = trackRange(tr);
    html += `<details class="pop" data-pop="range"><summary class="mini" title="表示する音の高さのはんい">${I('piano')}<span>${SOLFA_OCT(rlo)}〜${SOLFA_OCT(rhi)}</span></summary><div class="popbody">
      <div class="sub">はんいをえらぶ</div>
      <div class="rangelist">${Object.entries(RANGES).map(([k, v]) => `<button class="mini ${k === tr.range && tr.lo == null && tr.hi == null ? 'on' : ''}" data-range="${k}">${v[0]}</button>`).join('')}</div>
      <div class="sub">広げる・せまくする（1オクターブずつ）</div>
      <div class="btnrow"><button class="mini" data-ext="hi+1">${I('plus')}上に広げる</button><button class="mini" data-ext="lo-1">${I('plus')}下に広げる</button></div>
      <div class="btnrow"><button class="mini" data-ext="hi-1">${I('minus')}上をせまく</button><button class="mini" data-ext="lo+1">${I('minus')}下をせまく</button></div>
    </div></details>
    <button class="mini ${ui.selTool ? 'on' : ''}" id="btnSelTool" title="えらぶ：ドラッグで囲んで、まとめて移動・コピー・消す（パソコンは Shift＋ドラッグでも）">${I('pointer')}<span>えらぶ</span></button>
    <button class="mini ${ui.chromatic ? 'on' : ''}" id="btnChrom" title="音階にない音（半音・黒鍵）の行もぜんぶ表示します">${I('sharp')}<span>半音</span></button>`;
    tools = `
      <div class="sub">音の移動 <small>${multi ? `（${ui.sel.b0 + 1}〜${ui.sel.b1 + 1}小節だけ）` : '（全部。キャンバスで2小節以上えらぶとその範囲だけ）'}</small></div>
      <div class="btnrow"><button class="mini" id="tOctUp">オクターブ↑</button><button class="mini" id="tSemiUp">半音↑</button><button class="mini" id="tDegUp">音階↑</button></div>
      <div class="btnrow"><button class="mini" id="tOctDn">オクターブ↓</button><button class="mini" id="tSemiDn">半音↓</button><button class="mini" id="tDegDn">音階↓</button></div>
      ${others.length ? `<div class="sub">輪唱づくり</div><div class="btnrow"><select id="rSrc">${others.map((t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}</select>を<select id="rBars">${[0, 1, 2, 4].map((b) => `<option value="${b}" ${b === 2 ? 'selected' : ''}>${b}小節</option>`).join('')}</select>ずらして<button class="mini" id="btnRound">ここに写す</button></div>` : ''}`;
  } else if (tr.type === 'drum') {
    html += `<button class="mini ${ui.selTool ? 'on' : ''}" id="btnSelTool" title="えらぶ：ドラッグで囲んで、まとめて移動・コピー・消す（パソコンは Shift＋ドラッグでも）">${I('pointer')}<span>えらぶ</span></button>`;
    html += `<select id="rPreset" title="お手本のリズムを入れます"><option value="">リズムのお手本…</option>${Object.entries(RHYTHM_PRESETS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select><span class="hint">おすたびに ●→強→なし</span>`;
  } else {
    if (!song.locks.compose) html += `<select id="cProg" title="よく使われるコード進行を、えらんだ小節から入れます"><option value="">コード進行…</option>${PROGRESSIONS.map(([n, , d], i) => `<option value="${i}" title="${d}">${n}</option>`).join('')}</select>`;
    if (!song.locks.compose) html += `<button class="mini accent" id="btnAutoChord" title="メロディに合うコードを、全部の小節に自動でつけます">${I('spark')}<span>コードをつける</span></button>`;
    html += `<label class="grp">伴奏の形 <select id="cPat">${Object.entries(CHORD_PATTERNS).map(([k, v]) => `<option value="${k}" ${k === tr.pattern ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="grp"><input type="checkbox" id="cBass" ${tr.bassOn ? 'checked' : ''}> ベースも</label>`;
    const dia = diatonic();
    const hb = ui.chordHalf || 0;
    pal.innerHTML = `<div class="palhead">${ui.selBar + 1}小節目${hb === 1 ? 'の前半' : hb === 2 ? 'の後半' : ''}のコードをえらぶ
      <span class="seg halfseg" title="1小節に2つのコードを入れるときは「前半」「後半」"><button class="mini ${hb === 0 ? 'on' : ''}" data-h="0">1小節まるごと</button><button class="mini ${hb === 1 ? 'on' : ''}" data-h="1">前半</button><button class="mini ${hb === 2 ? 'on' : ''}" data-h="2">後半</button></span></div>
      <div class="palrow">${dia.map((c, i) => `<button class="chordbtn" data-i="${i}" style="--pc:${PC_COLORS[c.r]}"><b>${chordName(c)}</b><small>${c.deg}</small></button>`).join('')}
      <button class="chordbtn none" data-i="-1"><b>なし</b><small>休み</small></button>
      <details class="pop" data-pop="chordother"><summary class="mini">そのほかのコード…</summary><div class="popbody"><select id="cRoot">${CHORD_ROOT.map((n, i) => `<option value="${i}">${n}</option>`).join('')}</select>
      <select id="cQ">${Object.entries(CHORD_Q).map(([k, v]) => `<option value="${k}">${v.s || '（長三和音）'}</option>`).join('')}</select>
      <button class="mini" id="cSet">この小節に入れる</button></div></details></div>`;
    pal.querySelectorAll('.halfseg button').forEach((b) => (b.onclick = () => { ui.chordHalf = +b.dataset.h; renderEditorTools(); draw(); }));
    pal.querySelectorAll('.chordbtn').forEach((b) => (b.onclick = () => { const i = +b.dataset.i; setChord(i < 0 ? null : { r: dia[i].r, q: dia[i].q }); }));
    $('#cSet').onclick = () => setChord({ r: +$('#cRoot').value, q: $('#cQ').value });
  }
  html += `<details class="pop" data-pop="tools"><summary class="mini" title="音域・音の移動・輪唱・消去など">${I('tool')}<span>道具</span></summary><div class="popbody">${tools}
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
    if (ba) ba.onclick = () => { if (lk) return toast('ロックされています'); if (tr.notes.length && !confirm('今のメロディを消して、新しく作曲しますか？（「元に戻す」で戻せます）')) return; edit(() => autoCompose(tr), 'おまかせ作曲'); scrollToNotes(); };
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
      <div class="pads">${[...kit.list].reverse().map((id, i) => `<button class="pad" data-id="${id}"><kbd>${'ASDFGHJK'[i]}</kbd>${Sound.DRUMS[id].name}${p.real && Sound.Samples.hasDrum(id) ? `<small class="rec">${I('mic')}</small>` : ''}</button>`).join('')}</div>
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
  $('#mRev').oninput = (e) => { song.reverb = +e.target.value; if (player.graph) player.graph.wet.gain.value = song.reverb * 0.6; };
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
function fxApply(kind, x, y, on, gph) {
  const g = gph || player.graph;
  if (!g) return;
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
  $('#dlgTeach').showModal();
}

/* ============================================================
   楽譜
   ============================================================ */
function scoreSettings() {
  if (!song.score) song.score = {};
  return Object.assign(song.score, { subtitle: '', lyricist: '', composer: '', perLine: 0, scale: 1, solfa: 'none', finger: '', drums: false, clefs: {}, ...song.score });
}
// 「3,5-6」→ [2, 4, 5]（小節番号は1から）
function parseBars(txt) {
  const out = new Set();
  for (const part of String(txt || '').replace(/[－]/g, '-').split(/[,、\s]+/)) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) continue;
    const a = +m[1];
    const z = m[2] ? +m[2] : a;
    for (let b = Math.min(a, z); b <= Math.min(Math.max(a, z), 128); b++) out.add(b - 1 + (song.pickup ? 1 : 0));
  }
  return [...out];
}
function scoreOpts(trackIds, withDrums) {
  const S = scoreSettings();
  if (!S.trans) S.trans = {};
  const parts = [];
  const partTracks = [];
  for (const t of song.tracks) {
    if (!trackIds.includes(t.id)) continue;
    if (t.type === 'melody') {
      parts.push({ id: t.id, name: t.name, notes: t.notes, clef: S.clefs[t.id] || 'auto', transpose: +S.trans[t.id] || 0, lyrics: t.notes.some((n) => n.ly) ? [] : Notation.splitLyrics(t.lyrics || ''), dyn: t.dyn, hairpins: t.hairpins, slurs: t.slurs, gm: Sound.GM[t.inst] || 0 });
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
      parts.push({ id: t.id, name: t.name, perc: true, notes, gm: 0 });
      partTracks.push(t);
    } else if (t.type === 'chord' && S.accomp && t.chords.some(Boolean)) {
      // コード伴奏を、ピアノの大譜表の楽譜にする
      const notes = chordEvents(t).map((n) => ({ s: n.s, p: n.p, l: Math.max(24, Math.ceil(n.l / 24 - 0.05) * 24) })); // 楽譜ではきりのよい長さに
      parts.push({ id: t.id, name: t.name + '（伴奏）', notes, clef: 'grand', gm: Sound.GM[t.inst] || 0 });
      partTracks.push(t);
    }
  }
  const chordTr = song.tracks.find((t) => t.type === 'chord' && t.chords.some(Boolean));
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
    tempos: (() => { const t = { ...song.tempos }; for (const b in song.ramps || {}) for (let i = 0; i < song.ramps[b].n; i++) delete t[+b + i]; return t; })(),
    words: Object.fromEntries(Object.entries(song.ramps || {}).map(([b, r]) => [b, r.type === 'rit' ? 'rit.' : 'accel.'])),
    soundTempos: { ...song.tempos },
    meta: { subtitle: S.subtitle, lyricist: S.lyricist, composer: S.composer, nameLine: !!S.nameLine },
    finger: S.finger || '',
    blankBars: parseBars(S.blank),
    chords: chordTr ? Array.from({ length: song.bars }, (_, b) => chordLabel(chordTr.chords[b])) : null,
    chordObjs: chordTr ? Array.from({ length: song.bars }, (_, b) => { const c = chordTr.chords[b]; return c ? (c.h ? { ...c, hAt: chordHalf(b) } : c) : null; }) : null,
    nameOf, perLine: +S.perLine || (isPhone ? 2 : 0), scale: +S.scale, width: 780,
    pickup: song.pickup, repeats: song.repeats,
  };
}
// 歌詞の文字列を、音の始まりごとに1つずつ入れる
function assignLyrics(tr, text) {
  const syl = Notation.splitLyrics(text || '');
  const starts = [...new Set(tr.notes.map((n) => n.s))].sort((a, b) => a - b);
  for (const n of tr.notes) delete n.ly;
  starts.forEach((st, i) => {
    if (!syl[i]) return;
    const top = tr.notes.filter((n) => n.s === st).sort((a, b) => b.p - a.p)[0];
    top.ly = syl[i];
  });
  tr.lyrics = text;
}
function scoreSvg(trackIds) { return Notation.render(scoreOpts(trackIds, true)); }
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
    <label>大きさ <select data-s="scale"><option value="0.8">小さい</option><option value="1">ふつう</option><option value="1.25">大きい</option><option value="1.5">とても大きい</option></select></label>
    <label class="chk"><input type="checkbox" data-c="accomp" ${S.accomp ? 'checked' : ''}> コード伴奏をピアノの楽譜（大譜表）にする</label>
    <h4>プリント（学習用）</h4>
    <label class="chk"><input type="checkbox" data-c="nameLine" ${S.nameLine ? 'checked' : ''}> 名前を書くらん（年・組・番・名前）</label>
    <label class="srow">穴うめにする小節 <input type="text" data-k="blank" value="${escapeHtml(S.blank || '')}" placeholder="れい：3,5-6" inputmode="numeric" style="width:9em"></label>
    <small class="muted">えらんだ小節の音符を書かずに、五線だけにします（聴き取り・書きこみ用）</small>
    <h4>パート</h4>
    ${mel.map((t) => `<div class="scorepart">
      <label class="chk"><input type="checkbox" class="spart" value="${t.id}" ${scoreSel.has(t.id) ? 'checked' : ''}> ${I(TYPE_ICON[t.type])} ${escapeHtml(t.name)}</label>
      ${t.type === 'melody' ? `<label>音部記号 <select class="sclef" data-id="${t.id}"><option value="auto">自動</option><option value="treble">ト音記号</option><option value="bass">ヘ音記号</option><option value="grand">大譜表（ピアノ）</option></select></label>
      <label title="クラリネットやトランペットなど、楽譜の音と実際の音がちがう楽器用">移調楽器 <select class="strans" data-id="${t.id}"><option value="0">なし（C）</option><option value="2">in B♭（クラリネット・トランペット）</option><option value="9">in E♭（アルトサックス）</option><option value="7">in F（ホルン）</option><option value="14">in B♭（テナーサックス）</option></select></label>
      <label class="col">歌詞をまとめて入れる <small>1音に1文字ずつ（「きゃ」「っ」は前の字といっしょ。スペースは見やすくするだけ。2文字以上を1音にするときは（ ）。英語は単語ごと）。1音ずつ直すときは「楽譜で編集」で音符をえらんで「歌詞」。</small><textarea class="slyr" data-id="${t.id}" rows="2" placeholder="れい：さいたさいたチューリップのはなが">${escapeHtml(t.lyrics || t.notes.filter((n) => n.ly).sort((a, b) => a.s - b.s).map((n) => (n.ly.length > 1 && !/^[A-Za-z]/.test(n.ly) ? '(' + n.ly + ')' : n.ly)).join(' '))}</textarea></label>` : t.type === 'chord' ? '<small class="muted">上の「コード伴奏をピアノの楽譜にする」をオンにすると出ます</small>' : ''}
    </div>`).join('')}
    <p class="muted">くり返し記号・1番/2番かっこ・強弱記号などは「楽譜で編集」で入れられます。</p>`;
  side.querySelectorAll('[data-s]').forEach((el) => { el.value = String(S[el.dataset.s]); });
  side.querySelectorAll('.sclef').forEach((el) => { el.value = S.clefs[el.dataset.id] || 'auto'; });
  side.querySelectorAll('.strans').forEach((el) => { el.value = String(S.trans[el.dataset.id] || 0); });
  const upd = () => {
    const ids = [...scoreSel];
    if (!ids.length) { scoreFull = ''; scorePages = []; $('#scoreView').innerHTML = '<p class="muted" style="padding:12px">パートを選んでください</p>'; return; }
    scoreFull = scoreSvg(ids);
    // 印刷するときと同じ、A4 のページに分けて見せる
    scorePages = Notation.paginate(scoreFull, Notation.lastLayout);
    $('#scoreView').innerHTML = scorePages.length > 1 ? scorePages.map((pg) => `<div class="pagebox">${pg}</div>`).join('') : scoreFull;
  };
  side.querySelectorAll('[data-s]').forEach((el) => {
    el.oninput = () => { S[el.dataset.s] = el.value; upd(); };
    el.onchange = () => { autosaveSoon(); if (ui.showScore) renderScorePanel(); if (ui.view === 'score') renderScoreEdit(); };
  });
  side.querySelector('[data-c="nameLine"]').onchange = (e) => { S.nameLine = e.target.checked; upd(); autosaveSoon(); };
  side.querySelector('[data-k="blank"]').onchange = (e) => { S.blank = e.target.value.replace(/[^0-9,\-－、 ]/g, '').slice(0, 60); upd(); autosaveSoon(); };
  side.querySelector('[data-c="accomp"]').onchange = (e) => { S.accomp = e.target.checked; const ct = song.tracks.find((t) => t.type === 'chord'); if (ct && S.accomp) scoreSel.add(ct.id); upd(); autosaveSoon(); };
  side.querySelector('[data-k="title"]').onchange = (e) => { edit(() => { song.title = e.target.value || song.title; }, '曲名'); renderSettings(); upd(); };
  side.querySelector('[data-k="tempoText"]').onchange = (e) => { edit(() => { song.tempoText = e.target.value.slice(0, 30); }, '速さのことば'); upd(); };
  side.querySelector('[data-k="pickup"]').onchange = (e) => { edit(() => { song.pickup = +e.target.value; }, '弱起'); upd(); };
  side.querySelectorAll('.spart').forEach((c) => (c.onchange = () => { c.checked ? scoreSel.add(c.value) : scoreSel.delete(c.value); upd(); }));
  side.querySelectorAll('.sclef').forEach((el) => (el.onchange = () => { S.clefs[el.dataset.id] = el.value; upd(); autosaveSoon(); }));
  side.querySelectorAll('.strans').forEach((el) => (el.onchange = () => { S.trans[el.dataset.id] = +el.value; upd(); autosaveSoon(); }));
  side.querySelectorAll('.slyr').forEach((el) => {
    const tr = song.tracks.find((t) => t.id === el.dataset.id);
    el.onfocus = () => { el._snap = snapshot(); };
    el.oninput = () => { assignLyrics(tr, el.value); upd(); };
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
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${escapeHtml(song.title)}</title><style>@page{size:A4;margin:12mm}body{margin:0}.pg{break-after:page;page-break-after:always}.pg:last-child{break-after:auto;page-break-after:auto}svg{display:block;width:100%;height:auto}.pg svg.page{width:auto;height:268mm;margin:0 auto}</style>${pages.map((pg) => `<div class="pg">${pg}</div>`).join('')}<script>onload=()=>setTimeout(()=>print(),200)<\/script>`);
  w.document.close();
}
function exportPng() {
  if (!scoreFull) return;
  const holder = document.createElement('div');
  holder.innerHTML = scoreFull;
  const svgEl = holder.querySelector('svg');
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
  o.chords = o.chordObjs;
  download(new Blob([Notation.musicXML(o)], { type: 'application/vnd.recordare.musicxml+xml' }), safeName() + '.musicxml');
  toast('MusicXMLを書き出しました（MuseScore・Flat などの楽譜ソフトで開けます）');
}
function renderScorePanel() {
  const tr = track();
  const el = $('#scorePanel');
  if (!ui.showScore) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = tr.type === 'melody' || tr.type === 'drum' ? scoreSvg([tr.id]) : '<p class="muted" style="padding:8px">メロディかリズムのトラックを選ぶと、ここに楽譜が出ます</p>';
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

function scDur() {
  let d = ui.sc.dur;
  if (ui.sc.dot) d *= 1.5;
  if (ui.sc.trip) d = (d * 2) / 3;
  return Math.max(1, Math.round(d));
}
function scKeyAcc() {
  const kk = keyAt(barOf(Math.min(ui.sc.cursor || 0, Math.max(0, totalTicks() - 1))));
  const kc = Notation.keyCount(kk.key, kk.minor);
  const a = [0, 0, 0, 0, 0, 0, 0];
  const SO = [3, 0, 4, 1, 5, 2, 6];
  const FO = [6, 2, 5, 1, 4, 0, 3];
  if (kc > 0) for (let i = 0; i < kc; i++) a[SO[i]] = 1;
  if (kc < 0) for (let i = 0; i < -kc; i++) a[FO[i]] = -1;
  return a;
}
function scEditable() {
  const tr = track();
  if (tr.type !== 'melody') { toast('楽譜で書けるのはメロディのトラックです（リズム・コードはマス目で）'); return null; }
  if (locked(tr)) { toast('このトラックはロックされています'); return null; }
  return tr;
}
function setView(v) {
  ui.view = v;
  document.body.classList.toggle('view-score', v === 'score');
  $$('#viewSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
  $('#editorWrap').hidden = v === 'score';
  $('#scoreEdit').hidden = v !== 'score';
  if (v === 'score') {
    if (ui.sc.cursor == null) ui.sc.cursor = ui.startTick;
    renderScorePal();
    renderScoreEdit();
  } else { resizeEditor(); draw(); }
  renderPhonePad();
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
  o.edit = { part: pi, cursor: pi >= 0 ? ui.sc.cursor : null, sel: ui.sc.sel, color: C('--accent') };
  o.width = isPhone ? Math.max(320, box.clientWidth - 8) : Math.max(560, box.clientWidth - 8);
  o.scale = (+scoreSettings().scale || 1) * ui.sc.zoom;
  o.perLine = +scoreSettings().perLine || 0;
  const keepTop = box.scrollTop;
  box.innerHTML = Notation.render(o);
  box.scrollTop = keepTop;
  box._layout = Notation.lastLayout;
  scoreElems = [...box.querySelectorAll('.nh')].map((el) => ({ el, s: +el.dataset.s, e: +el.dataset.e, pi: +el.dataset.pi }));
  const st = $('#scStatus');
  if (st) {
    const bt = barTicks();
    const b = barOf(ui.sc.cursor);
    const beat = (ui.sc.cursor - barStart(b)) / beatAt(b) + 1;
    st.textContent = `${track().name}｜${b + (song.pickup ? 0 : 1)}小節 ${Math.round(beat * 100) / 100}拍目${ui.sc.sel.size ? `｜${ui.sc.sel.size}音えらび中` : ''}`;
  }
}
function highlightScore(pos) {
  for (const it of scoreElems) {
    const on = pos != null && it.s <= pos && pos < it.e;
    if (on !== !!it.on) { it.on = on; it.el.classList.toggle('playing', on); }
  }
  if (pos != null) {
    const it = scoreElems.find((x) => x.on);
    const box = $('#scoreEditView');
    if (it) {
      const r = it.el.getBoundingClientRect();
      const br = box.getBoundingClientRect();
      if (r.top < br.top + 20 || r.bottom > br.bottom - 20) box.scrollTop += r.top - br.top - box.clientHeight / 3;
    }
  }
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
  while (t > totalTicks() && song.bars < 128 && !song.locks.rules) song.bars++;
}
function scInsert(pitches, chordAdd) {
  const tr = scEditable();
  if (!tr) return;
  const last = ui.sc.lastIns;
  if (chordAdd && !(last && last.p != null)) chordAdd = false; // 休符のあとは和音にしない
  const t = chordAdd ? last.t : ui.sc.cursor;
  const d = chordAdd ? last.d : scDur();
  edit(() => {
    ensureLength(t + d);
    if (!chordAdd) clearRange(tr, t, t + d);
    for (const p of pitches) if (!tr.notes.some((n) => n.s === t && n.p === p)) tr.notes.push({ s: t, p: clamp(p, 21, 108), l: d, ...(scVoice() === 2 ? { v: 2 } : {}) });
  }, pitches.length ? '楽譜で音符を入力' : '楽譜で休符を入力');
  if (pitches.length) { preview(tr, pitches[pitches.length - 1]); showMini(pitches[pitches.length - 1]); }
  ui.sc.lastIns = { t, d, p: pitches.length ? Math.max(...pitches) : null, ref: pitches.length ? Math.max(...pitches) : last ? last.ref || last.p : null };
  ui.sc.sel = new Set(pitches.map((p) => t + ':' + p));
  ui.sc.selByInput = true;
  if (!chordAdd) ui.sc.cursor = Math.min(t + d, totalTicks());
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
  const pc = (([0, 2, 4, 5, 7, 9, 11][letter] + scKeyAcc()[letter]) % 12 + 12) % 12;
  let best = null;
  for (let m = pc; m <= 127; m += 12) if (best == null || Math.abs(m - ref) < Math.abs(best - ref)) best = m;
  return best;
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
const PROGRESSIONS = [
  ['カノン進行', 'I V | vi iii | IV I | IV V', 'パッヘルベルのカノンの流れ。やさしく、なつかしい'],
  ['王道進行', 'IV | V | iii | vi', 'J-POP でよく聞く、せつなくてもり上がる進行'],
  ['小室進行', 'vi | IV | V | I', 'かっこよく、走りだしたくなる進行'],
  ['ずっと明るい', 'I | IV | V | I', 'Ⅰ→Ⅳ→Ⅴ→Ⅰ。いちばん基本の進行'],
  ['50年代', 'I | vi | IV | V', 'むかしのポップス・ドゥーワップ'],
  ['ブルース（12小節）', 'I7 | I7 | I7 | I7 | IV7 | IV7 | I7 | I7 | V7 | IV7 | I7 | V7', 'ジャズ・ロックのもと'],
];
const DEG = { I: [0, 'M'], ii: [2, 'm'], iii: [4, 'm'], IV: [5, 'M'], V: [7, 'M'], vi: [9, 'm'], I7: [0, '7'], IV7: [5, '7'], V7: [7, '7'] };
function applyProgression(i) {
  const tr = track();
  if (tr.type !== 'chord') return;
  if (locked(tr)) return toast('このトラックはロックされています');
  const [name, pat] = PROGRESSIONS[i];
  const bars = pat.split('|').map((x) => x.trim().split(/\s+/).filter(Boolean));
  const k = song.key;
  const mk = (d) => { const [iv, q] = DEG[d] || DEG.I; return { r: (k + iv) % 12, q }; };
  const from = ui.selBar || 0;
  edit(() => {
    while (tr.chords.length < song.bars) tr.chords.push(null);
    // えらんだ小節から、曲のおわりまでくり返し入れる
    for (let b = from, j = 0; b < song.bars; b++, j++) {
      const ds = bars[j % bars.length];
      const c = mk(ds[0]);
      if (ds[1]) c.h = mk(ds[1]);
      tr.chords[b] = c;
    }
  }, 'コード進行「' + name + '」');
  toast(`「${name}」を ${from + 1}小節目から入れました（メジャーの調で、いちばん合います）`, 3500);
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
function scMove(dir, extend) {
  const tr = track();
  if (tr.type !== 'melody') return;
  const ons = onsetsOf(tr);
  const curS = ui.sc.sel.size ? [...ui.sc.sel].map((k) => +k.split(':')[0])[dir > 0 ? 'reduce' : 'reduce']((a, b) => (dir > 0 ? Math.max(a, b) : Math.min(a, b))) : null;
  let target;
  if (curS != null) target = dir > 0 ? ons.find((s) => s > curS) : [...ons].reverse().find((s) => s < curS);
  else target = dir > 0 ? ons.find((s) => s >= ui.sc.cursor) : [...ons].reverse().find((s) => s < ui.sc.cursor);
  if (target == null) { ui.sc.cursor = clamp(ui.sc.cursor + dir * scDur(), 0, totalTicks()); ui.sc.sel = extend ? ui.sc.sel : new Set(); renderScoreEdit(); return; }
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
function scArt(a) {
  scEditSel((ns) => {
    const allHave = ns.every((n) => (n.art || []).includes(a));
    for (const n of ns) {
      n.art = (n.art || []).filter((x) => x !== a);
      if (!allHave) {
        if (a === 'stac' || a === 'ten') n.art = n.art.filter((x) => x !== 'stac' && x !== 'ten');
        if (a === 'acc' || a === 'marc') n.art = n.art.filter((x) => x !== 'acc' && x !== 'marc');
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
  const r = selRange(tr);
  if (!r || r.s === r.e) return toast('スラーをかける音符を2つ以上えらんでください（Shift＋クリック）');
  edit(() => { tr.slurs = (tr.slurs || []).filter((x) => x.e < r.s || x.s > r.e); tr.slurs.push({ s: r.s, e: r.e }); }, 'スラー');
  renderScoreEdit();
}
function scHairpin(type) {
  const tr = scEditable();
  if (!tr) return;
  const r = selRange(tr);
  if (!r || r.s === r.e) return toast('クレッシェンドをかける音符を2つ以上えらんでください（Shift＋クリック）');
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
    for (const n of selNotes(tr)) delete n.art;
  }, '記号を消す');
  renderScoreEdit();
}
function scLyric() {
  const tr = scEditable();
  if (!tr) return;
  const ns = selNotes(tr);
  const t = ns.length ? Math.min(...ns.map((n) => n.s)) : ui.sc.cursor;
  const top = tr.notes.filter((n) => n.s === t).sort((a, b) => b.p - a.p)[0];
  if (!top) return toast('歌詞をつける音符をえらんでください');
  const v = prompt('この音符の歌詞（空にすると消します）', top.ly || '');
  if (v === null) return;
  edit(() => { for (const n of tr.notes) if (n.s === t) delete n.ly; if (v.trim()) top.ly = v.trim(); }, '歌詞');
  scMove(1, false);
}
// コードネーム（れい：Am7, F#m, B♭）→ コード伴奏トラックへ
function parseChord(txt) {
  const m = String(txt).trim().match(/^([A-Ga-g])([#♯b♭]?)(.*)$/);
  if (!m) return null;
  let r = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1].toUpperCase()];
  if (m[2] === '#' || m[2] === '♯') r++;
  if (m[2] === 'b' || m[2] === '♭') r--;
  const rest = m[3].replace(/\s/g, '');
  const q = { '': 'M', M: 'M', maj: 'M', m: 'm', min: 'm', 7: '7', M7: 'M7', maj7: 'M7', m7: 'm7', sus4: 'sus4', dim: 'dim', aug: 'aug', '+': 'aug' }[rest];
  if (!q) return null;
  return { r: (r + 12) % 12, q };
}
function scChord() {
  const b = barOf(ui.sc.cursor);
  let ct = song.tracks.find((t) => t.type === 'chord');
  const v = prompt(`${b + (song.pickup ? 0 : 1)}小節目のコードネーム（れい：C, Am, G7, FM7, Dm7, B♭）\n空にすると消します`, ct && ct.chords[b] ? chordName(ct.chords[b]).replace('♯', '#').replace('♭', 'b') : '');
  if (v === null) return;
  const c = v.trim() ? parseChord(v) : null;
  if (v.trim() && !c) return alert('コードネームを読めませんでした（れい：C, Am, G7, FM7）');
  if (!ct) {
    if (song.tracks.length >= MAX_TRACKS) return toast('トラックがいっぱいです');
    edit(() => { ct = newTrack('chord'); song.tracks.push(ct); }, 'コード伴奏を追加');
    renderTracks();
  }
  edit(() => { while (ct.chords.length < song.bars) ct.chords.push(null); ct.chords[b] = c; }, 'コードネーム');
  if (c) previewChord(ct, c);
  renderScoreEdit();
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
  const durBtns = SC_DURS.map(([v, name, ic, key]) => `<button class="mini sdur ${ui.sc.dur === v ? 'on' : ''}" data-d="${v}" title="${name}（キー ${key}）"><span class="ic">${ic}</span></button>`).join('');
  pal.innerHTML = `
    <div class="prow">
      <span class="seg"><button class="mini ${ui.sc.input ? 'on' : ''}" data-m="1" title="クリックで音符を置く（キー N で切りかえ）">${I('pencil')}<span>入力</span></button><button class="mini ${ui.sc.input ? '' : 'on'}" data-m="0" title="クリックで音符をえらぶ">${I('pointer')}<span>選択</span></button></span>
      <span class="grp">${durBtns}<button class="mini ${ui.sc.dot ? 'on' : ''}" id="scDot" title="付点（キー .）">付点</button><button class="mini ${ui.sc.trip ? 'on' : ''}" id="scTrip" title="3連符（キー T）">3連</button></span>
      <button class="mini" id="scRest" title="休符を入れる（キー 0 または R）"><span class="ic">𝄽</span> 休符</button>
      <span class="grp">${['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ'].map((n, i) => `<button class="mini snote" data-l="${i}" title="${'CDEFGAB'[i]} キー（Shift で和音に足す）">${n}</button>`).join('')}</span>
      <span class="grp"><button class="mini" id="scSharp" title="半音上げる">♯</button><button class="mini" id="scFlat" title="半音下げる">♭</button><button class="mini" id="scNat" title="調号の音にもどす">♮</button><button class="mini" id="scUp" title="1音上げる（↑）">↑</button><button class="mini" id="scDn" title="1音下げる（↓）">↓</button><button class="mini" id="scOct" title="オクターブ上げる（Ctrl+↑）">8va</button></span>
    </div>
    <div class="prow">
      <span class="grp">${ARTS.map(([a, ic, t]) => `<button class="mini" data-art="${a}" title="${t}">${ic}</button>`).join('')}</span>
      <span class="grp"><select id="scDyn" title="強弱記号（カーソルか、えらんだ音符の所に）"><option value="">強弱…</option>${DYNS.map((d) => `<option>${d}</option>`).join('')}<option value="-">（消す）</option></select><button class="mini" id="scCresc" title="クレッシェンド（だんだん強く）">cresc.＜</button><button class="mini" id="scDim" title="デクレッシェンド（だんだん弱く）">dim.＞</button></span>
      <span class="grp"><button class="mini" id="scSlur" title="スラー（なめらかに）・キー S">⌒ スラー</button><button class="mini" id="scTieB" title="タイ（同じ高さをつなぐ）・キー +">‿ タイ</button></span>
      <span class="grp"><button class="mini" id="scLyr" title="歌詞・キー L">あ 歌詞</button><button class="mini" id="scChd" title="コードネーム">C7 コード</button></span>
      <span class="grp"><button class="mini ${scVoice() === 2 ? 'on' : ''}" id="scVoice" title="声部（1段に2つのメロディ）：1＝上の声部（ぼう上）、2＝下の声部（ぼう下）。キー V">声部${scVoice()}</button><button class="mini" id="scBarSet" title="カーソルの小節から、テンポ・拍子・調を変える／D.C.・コーダなど">拍子・調…</button><select id="scJump" title="D.C.・D.S.・コーダ・Fine（カーソルの小節）"><option value="">D.C./コーダ…</option>${JUMPS.map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}<option value="-">（この小節の記号を消す）</option></select></span>
      <span class="grp"><button class="mini" data-bar="start" title="くり返しはじめ（カーソルの小節）">𝄆</button><button class="mini" data-bar="end" title="くり返しおわり（カーソルの前の小節）">𝄇</button><button class="mini" data-bar="1" title="1番かっこ">1.</button><button class="mini" data-bar="2" title="2番かっこ">2.</button></span>
      <span class="grp"><button class="mini icon" id="scCopyB" title="コピー（Ctrl+C）">${I('copy')}</button><button class="mini icon" id="scPasteB" title="貼りつけ（Ctrl+V）">${I('paste')}</button><button class="mini" id="scClr" title="えらんだ所の強弱・スラーなどの記号を消す">記号を消す</button><button class="mini icon danger" id="scDel" title="消す（Delete）">${I('trash')}</button></span>
      <span class="grp"><button class="mini icon" id="scZoomOut" title="小さく">${I('minus')}</button><button class="mini icon" id="scZoomIn" title="大きく">${I('plus')}</button></span>
    </div>
    <div class="prow small"><span id="scStatus" class="hint"></span><span class="hint">キー：A〜G 音名／1〜6 長さ／. 付点／T 3連／0 休符／↑↓ 高さ／←→ となり／Shift 和音・はんい／Delete 消す</span></div>`;
  // パレットをたたむ（1行だけ：入力・長さ・休符・ドレミ・♯♭）。画面が低いときは、はじめからたたむ
  if (ui.sc.compact == null) ui.sc.compact = lsGet('otsumiki-scpal', innerHeight < 860 && !isPhone ? '1' : '0') === '1';
  pal.classList.toggle('compact', ui.sc.compact);
  pal.querySelector('.prow').insertAdjacentHTML('beforeend', `<button class="mini palfold" id="scFold" title="${ui.sc.compact ? '記号・強弱・歌詞・くり返しなどのボタンも出す' : 'ボタンを1行にして、楽譜を広く見る'}">${ui.sc.compact ? '▾ もっと' : '▴ たたむ'}</button>`);
  $('#scFold').onclick = () => { ui.sc.compact = !ui.sc.compact; lsSet('otsumiki-scpal', ui.sc.compact ? '1' : '0'); renderScorePal(); renderScoreEdit(); };
  pal.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => { ui.sc.input = b.dataset.m === '1'; renderScorePal(); }));
  pal.querySelectorAll('.sdur').forEach((b) => (b.onclick = () => { ui.sc.dur = +b.dataset.d; scApplyDurToSel(); renderScorePal(); }));
  $('#scDot').onclick = () => { ui.sc.dot = !ui.sc.dot; scApplyDurToSel(); renderScorePal(); };
  $('#scTrip').onclick = () => { ui.sc.trip = !ui.sc.trip; renderScorePal(); };
  $('#scRest').onclick = () => scInsert([]);
  pal.querySelectorAll('.snote').forEach((b) => (b.onclick = (e) => { const tr = track(); if (tr.type !== 'melody') return scEditable(); scInsert([letterPitch(+b.dataset.l, refPitch(tr))], e.shiftKey); }));
  $('#scSharp').onclick = () => scAccidental('#');
  $('#scFlat').onclick = () => scAccidental('b');
  $('#scNat').onclick = () => scAccidental('n');
  $('#scUp').onclick = () => scEditSel((ns) => ns.forEach((n) => { n.p = diatonicStep(n.p, 1); }), '1音上げる');
  $('#scDn').onclick = () => scEditSel((ns) => ns.forEach((n) => { n.p = diatonicStep(n.p, -1); }), '1音下げる');
  $('#scOct').onclick = () => scEditSel((ns) => ns.forEach((n) => { n.p = clamp(n.p + 12, 21, 108); }), 'オクターブ上げる');
  pal.querySelectorAll('[data-art]').forEach((b) => (b.onclick = () => scArt(b.dataset.art)));
  $('#scDyn').onchange = (e) => { const v = e.target.value; e.target.value = ''; if (v) scDynamic(v === '-' ? null : v); };
  $('#scCresc').onclick = () => scHairpin('cresc');
  $('#scDim').onclick = () => scHairpin('dim');
  $('#scSlur').onclick = scSlur;
  $('#scTieB').onclick = scTie;
  $('#scLyr').onclick = scLyric;
  $('#scChd').onclick = scChord;
  pal.querySelectorAll('[data-bar]').forEach((b) => (b.onclick = () => scBarMark(b.dataset.bar)));
  $('#scVoice').onclick = scToggleVoice;
  $('#scBarSet').onclick = () => openBarDialog(barOf(Math.min(ui.sc.cursor, totalTicks() - 1)));
  $('#scJump').onchange = (e) => { const v = e.target.value; e.target.value = ''; if (v) { setJump(barOf(Math.min(ui.sc.cursor, totalTicks() - 1)), v); renderScoreEdit(); } };
  $('#scCopyB').onclick = () => scCopy(false);
  $('#scPasteB').onclick = scPaste;
  $('#scClr').onclick = scClearMarks;
  $('#scDel').onclick = scDelete;
  $('#scZoomIn').onclick = () => { ui.sc.zoom = Math.min(2, ui.sc.zoom + 0.15); renderScoreEdit(); };
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
function scoreClick(e) {
  const box = $('#scoreEditView');
  const svg = box.querySelector('svg');
  const L = box._layout;
  if (!svg || !L) return;
  const r = svg.getBoundingClientRect();
  const x = (e.clientX - r.left) * (L.width / r.width);
  const y = (e.clientY - r.top) * (L.height / r.height);
  const nh = e.target.closest && e.target.closest('.nh, .nhhit');
  if (nh) {
    const tr = scoreParts[+nh.dataset.pi];
    if (tr && tr !== track()) { selectTrack(song.tracks.indexOf(tr), false); }
    const s0 = +nh.dataset.s;
    const p0 = +nh.dataset.p;
    if (track().type !== 'melody') { ui.sc.cursor = s0; renderScoreEdit(); return; }
    if (e.shiftKey && ui.sc.sel.size) {
      const ss = [...ui.sc.sel].map((k) => +k.split(':')[0]);
      const a = Math.min(...ss, s0);
      const z = Math.max(...ss, s0);
      ui.sc.sel = new Set(track().notes.filter((n) => n.s >= a && n.s <= z).map((n) => n.s + ':' + n.p));
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
    return;
  }
  const h = Notation.hit(L, x, y);
  if (!h) return;
  const tr = scoreParts[h.pi];
  if (tr && tr !== track()) selectTrack(song.tracks.indexOf(tr), false);
  const bt = barTicks();
  const unit = Math.min(scDur(), ui.sc.trip ? scDur() : 24);
  const bStart = barStart(h.bar);
  const t = bStart + Math.floor((h.tick - bStart) / unit) * unit;
  ui.sc.cursor = clamp(t, 0, totalTicks());
  if (ui.sc.input && h.pitch != null && track().type === 'melody' && !h.perc) {
    if (e.shiftKey && ui.sc.lastIns && ui.sc.lastIns.t === t) scInsert([h.pitch], true);
    else { ui.sc.lastIns = null; scInsert([h.pitch], false); }
  } else { ui.sc.sel = new Set(); renderScoreEdit(); }
}
// 楽譜モードのキー操作（使ったら true）
function scoreKey(e) {
  const k = e.key;
  const tr = track();
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl) {
    const kl = k.toLowerCase();
    if (kl === 'c') { e.preventDefault(); scCopy(false); return true; }
    if (kl === 'x') { e.preventDefault(); scCopy(true); return true; }
    if (kl === 'v') { e.preventDefault(); scPaste(); return true; }
    if (kl === 'a') { e.preventDefault(); ui.sc.sel = new Set(tr.type === 'melody' ? tr.notes.map((n) => n.s + ':' + n.p) : []); renderScoreEdit(); return true; }
    if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); const d = k === 'ArrowUp' ? 12 : -12; scEditSel((ns) => ns.forEach((n) => { n.p = clamp(n.p + d, 21, 108); }), 'オクターブ'); return true; }
    return false;
  }
  if (/^[a-gA-G]$/.test(k)) {
    if (tr.type !== 'melody') { scEditable(); return true; }
    e.preventDefault();
    const letter = 'cdefgab'.indexOf(k.toLowerCase());
    scInsert([letterPitch(letter, refPitch(tr))], e.shiftKey);
    return true;
  }
  const durKey = SC_DURS.find((d) => String(d[3]) === k);
  if (durKey) { e.preventDefault(); ui.sc.dur = durKey[0]; scApplyDurToSel(); renderScorePal(); return true; }
  if (k === '.') { ui.sc.dot = !ui.sc.dot; scApplyDurToSel(); renderScorePal(); return true; }
  if (k === 't' || k === 'T') { ui.sc.trip = !ui.sc.trip; renderScorePal(); return true; }
  if (k === '0' || k === 'r' || k === 'R') { e.preventDefault(); scInsert([]); return true; }
  if (k === 'n' || k === 'N') { ui.sc.input = !ui.sc.input; renderScorePal(); toast(ui.sc.input ? '入力モード' : '選択モード'); return true; }
  if (k === '+') { scTie(); return true; }
  if (k === 's' || k === 'S') { scSlur(); return true; }
  if (k === 'l' || k === 'L') { scLyric(); return true; }
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
  if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); scDelete(); return true; }
  if (k === 'Escape') { ui.sc.sel = new Set(); renderScoreEdit(); return true; }
  return false;
}
function initScoreEditor() {
  $$('#viewSeg button').forEach((b) => (b.onclick = () => setView(b.dataset.v)));
  $('#scoreEditView').addEventListener('pointerdown', (e) => { if (e.button > 0) return; scoreClick(e); });
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
        if (t.type === 'melody') for (const n of t.notes) n.p = clamp(n.p + semis, 21, 108);
        const tr12 = (r) => (((r + semis) % 12) + 12) % 12;
        if (t.type === 'chord') t.chords = t.chords.map((c) => (c ? { ...c, r: tr12(c.r), ...(c.h ? { h: { ...c.h, r: tr12(c.h.r) } } : {}) } : c));
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
      edit(() => { for (const t of song.tracks) if (t.type === 'melody' && !t.locked) for (const n of t.notes) n.p = clamp(n.p + d, 21, 108); }, d > 0 ? 'オクターブ上げる' : 'オクターブ下げる');
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
        <div class="sub">記号（えらんだ音符に）</div>
        <div class="btnrow">${ARTS.map(([a, ic, t]) => `<button class="mini" data-art="${a}">${ic} ${t.split('（')[0]}</button>`).join('')}</div>
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
  pad.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { ui.sc.dur = +b.dataset.d; scApplyDurToSel(); renderPhonePad(); }));
  pad.querySelectorAll('.pp-note').forEach((b) => (b.onclick = () => {
    const tr = track();
    if (tr.type !== 'melody') { scEditable(); return; }
    scInsert([letterPitch(+b.dataset.l, refPitch(tr))], false);
  }));
  const act = {
    dot: () => { ui.sc.dot = !ui.sc.dot; scApplyDurToSel(); },
    trip: () => { ui.sc.trip = !ui.sc.trip; },
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
    scEditSel((ns) => ns.forEach((n) => { n.p = clamp(n.p + d, 21, 108); }), d > 0 ? 'オクターブ上げる' : 'オクターブ下げる');
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
  resizeEditor();
  draw();
  drawOverview();
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
    keys = `<div class="pkpads">${[...ids].reverse().slice(0, 8).map((id, i) => `<button class="pkpad" data-i="${i}">${Sound.DRUMS[id].name}</button>`).join('')}</div>`;
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
  try { localStorage.setItem('otsumiki-songs', JSON.stringify(all)); return name; } catch (e) { return null; }
}
function loadSong(s, opts = {}) {
  stop();
  if (opts.keep !== false && opts.own) studentOpen = false;
  if (!s || !Array.isArray(s.tracks)) throw new Error('曲データの形式がちがいます');
  s = sanitizeSong(migrate(JSON.parse(JSON.stringify(s)))); // ここでだめなら、今の曲はそのまま
  // 自分で作った・開いた曲だけしまう（はじめのサンプルなどは、しまわない）
  const prevSnap = opts.keep === false || !songOwn || !song || !song.tracks ? null : snapshot();
  const kept = prevSnap ? keepSong(JSON.parse(prevSnap)) : null;
  const base = newSong();
  song = { ...base, ...s, eq: { ...base.eq, ...(s.eq || {}) }, metro: { ...base.metro, ...(s.metro || {}) }, locks: { ...base.locks, ...(s.locks || {}) }, tempos: s.tempos || {} };
  song.tracks = s.tracks.slice(0, MAX_TRACKS).map((t) => ({ ...newTrack(t.type), ...t, id: t.id || uid() }));
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
function exportJSON() { download(new Blob([JSON.stringify(song)], { type: 'application/json' }), safeName() + '.otsumiki.json'); toast('曲ファイルを書き出しました'); }
// ファイル（曲・MusicXML・MIDI）を曲のデータにする
function readSongFile(file) {
  return new Promise((ok, ng) => {
    const r = new FileReader();
    r.onerror = () => ng(new Error('ファイルを読めませんでした'));
    if (/\.(musicxml|xml|mxl)$/i.test(file.name)) {
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
  const mine = new Map(tr.notes.map((n) => [n.s + ':' + n.p, n]));
  const theirs = new Map(rt.notes.map((n) => [n.s + ':' + n.p, n]));
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
  inp.accept = '.json,.mid,.midi,.musicxml,.xml,.mxl';
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
  inp.accept = '.json,.mid,.midi,.musicxml,.xml,.mxl';
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
function importFile(file) {
  const r = new FileReader();
  if (/\.(musicxml|xml|mxl)$/i.test(file.name)) {
    r.onload = () => {
      MusicXMLImport.readFile(r.result, file.name)
        .then((sg) => { loadSong(sg, { own: true }); toast('MusicXMLを読み込みました'); })
        .catch((e) => alert('MusicXMLを読み込めませんでした：' + e.message));
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
  await Promise.all(song.tracks.filter((t) => t.real !== false).map((t) => (t.type === 'drum' ? Sound.Samples.loadDrums(c0) : Sound.Samples.has(t.inst) ? Sound.Samples.load(t.inst, c0) : null)).map((p) => p && p.catch(() => null)));
  const sr = 44100;
  const [ra, rz] = opts.range || [0, playTotal()];
  const off = absSec(ra);
  const len = Math.ceil((absSec(rz) - off + (opts.range ? 1.5 : 3)) * sr);
  const ctx = new OfflineAudioContext(2, len, sr);
  const comp = ctx.createDynamicsCompressor();
  comp.connect(ctx.destination);
  const graph = buildGraph(ctx, comp, false);
  for (const e of eventList()) {
    if (e.t < ra || e.t >= rz) continue;
    if (opts.only && (!e.tr || e.tr.id !== opts.only)) continue;
    scheduleEvent(ctx, graph, e, 0.05 + absSec(e.t) - off, false);
  }
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
      if (cmd === 0x90 && b > 0) on.set(key, { s: tick, v: b });
      else if (cmd === 0x80 || (cmd === 0x90 && b === 0)) {
        const o = on.get(key);
        if (!o) continue;
        on.delete(key);
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
    const tr = newTrack('drum', { name: 'ドラム' });
    for (const d of drums) { const k = rev[d.n] || 'snare'; (tr.grid[k] = tr.grid[k] || {})[d.s] = d.v > 100 ? 2 : 1; maxT = Math.max(maxT, d.s + 1); }
    s.tracks.push(tr);
  }
  if (!s.tracks.length) s.tracks.push(newTrack('melody'));
  s.bars = clamp(Math.ceil(maxT / bt), 1, 128);
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
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
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
    song.bars = clamp(Math.round(+e.target.value || 8), 1, 128);
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
  $('#btnPngScore').onclick = exportPng;
  $('#btnXmlScore').onclick = exportMusicXML;
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
    edit(() => { if (picker.type === 'drum') tr.kit = picker.val; else tr.inst = picker.val; tr.real = picker.real; }, '楽器を変更');
    renderTracks();
    preloadSamples();
    $('#dlgInst').close();
  };
  $('#dlgPal').addEventListener('close', () => { renderTracks(); changed(); });
  document.querySelectorAll('dialog .close').forEach((b) => (b.onclick = () => b.closest('dialog').close()));
  document.querySelectorAll('.dropdown .dd button, #addRow button').forEach((b) => b.addEventListener('click', () => b.closest('details').removeAttribute('open')));
  $('#addMelody').onclick = () => addTrack('melody');
  $('#addChord').onclick = () => addTrack('chord');
  $('#addDrum').onclick = () => addTrack('drum');
  $('#btnIns').onclick = insertBars;
  $('#btnDelBars').onclick = deleteBars;
  $('#btnAddFour').onclick = guardRules(() => { edit(() => { song.bars = Math.min(128, song.bars + 4); }, '4小節ふやす'); renderSettings(); });

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
  applyPhone();
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
  // キャンバスの上では、ホイールで横に動く
  $('#ovScroller').addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || e.ctrlKey) return;
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

  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if (e.key === 'Escape' && document.body.classList.contains('present') && !$$('dialog').some((d) => d.open)) { setPresent(false); return; }
    if (e.key === 'Escape') { const op = $$('details.pop[open]'); if (op.length) { op.forEach((d) => (d.open = false)); const s0 = op[0].querySelector('summary'); if (s0) s0.focus(); return; } }
    if (e.key === '?' && !$$('dialog').some((d) => d.open)) { e.preventDefault(); openKeys(); return; }
    if (ui.view === 'score' && !$$('dialog').some((d) => d.open) && scoreKey(e)) return;
    if (ui.view !== 'score' && !$$('dialog').some((d) => d.open) && noteKeys(e)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveToBrowser(); return; }
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      return;
    }
    const otherDialog = $$('dialog').some((d) => d.open && d.id !== 'dlgInst');
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
  // マス目（キャンバス）で使う色は、ふつうの色の書き方で入れる
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
  ['#ovWrap', 'キャンバス', '曲全体の地図です。小節をドラッグしてコピー、ゴミ箱で消去。「R」の行をおすと、その小節からテンポ・拍子・調を変えられます。'],
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
  const sync = (b) => { if (b.classList.contains('toggle') || b.closest('.seg, .otama, .realtoggle, .halfseg') || b.id === 'btnRec' || b.id === 'btnStepRec') b.setAttribute('aria-pressed', b.classList.contains('on') ? 'true' : 'false'); };
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
