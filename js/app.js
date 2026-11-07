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
    metro: { vol: 0.7, kind: 'click' }, tempos: {}, pickup: 0, tempoText: '', repeats: { start: [], end: [], volta: {} },
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

/* ---------- 状態 ---------- */
let song = newSong();
let cur = 0;
const ui = {
  zoom: 56, rh: 22, names: 'doremi', flat: false, grid: 24, startTick: 0, loopOn: false, metro: false,
  loopRange: null, sel: { t: 0, b0: 0, b1: 0 }, selBar: 0, follow: true, ghost: true, touchEdit: true, dragMode: 'auto',
  stepRec: false, inputTick: 0, kbOct: 4, showScore: false, view: 'grid', chromatic: false, keyMove: true,
  sc: { cursor: 0, sel: new Set(), dur: 48, dot: false, trip: false, input: true, clip: null, lastIns: null, zoom: 1 },
};
let version = 0;
const undoStack = []; // {snap, label}
const redoStack = [];

const barTicks = () => (song.meter[0] * 192) / song.meter[1];
const totalTicks = () => barTicks() * song.bars;
const beatTicks = () => (song.meter[1] === 8 && song.meter[0] % 3 === 0 && song.meter[0] > 3 ? 72 : 192 / song.meter[1]);
const track = () => song.tracks[cur];
const scalePcs = () => new Set(SCALES[song.scale].steps.map((x) => (x + song.key) % 12));
const ppt = () => Math.max(ui.zoom / TPQ, 18 / ui.grid);
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
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// マス目（おたまチョップ）の区切り：小節の頭からかぞえます
function cellStart(t) {
  const bt = barTicks();
  const b = Math.floor(t / bt);
  return b * bt + Math.floor((t - b * bt) / ui.grid) * ui.grid;
}
function cellLen(s) {
  const bt = barTicks();
  const be = (Math.floor(s / bt) + 1) * bt;
  return Math.min(ui.grid, be - s);
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
  const key = version + ':' + linear + ':' + song.bars;
  if (orderCache.key === key) return orderCache.order;
  const n = song.bars;
  const R = song.repeats || {};
  const starts = new Set(R.start || []);
  const ends = new Set((R.end || []).filter((b) => b < n));
  const volta = R.volta || {};
  let order = [];
  if (linear || !ends.size) order = Array.from({ length: n }, (_, i) => i);
  else {
    let b = 0;
    let back = 0;
    let pass = 1;
    const done = new Set();
    while (b < n && order.length < n * 4) {
      if (starts.has(b)) back = b;
      const v = volta[b];
      if (v && v !== pass) { b++; continue; }
      order.push(b);
      if (ends.has(b) && !done.has(b)) { done.add(b); pass = 2; b = back; continue; }
      if (pass === 2 && (ends.has(b) || (v && !volta[b + 1]))) { pass = 1; back = b + 1; }
      b++;
    }
  }
  orderCache = { key, order };
  return order;
}
const playTotal = () => playOrder().length * barTicks();
// 再生の位置 → 楽譜の位置
function srcTick(pt) {
  const bt = barTicks();
  const o = playOrder();
  const k = clamp(Math.floor(pt / bt), 0, o.length - 1);
  return o[k] * bt + (pt - k * bt);
}
// 楽譜の位置 → 再生の位置（はじめて出てくる所）
function playTickOf(st) {
  const bt = barTicks();
  const o = playOrder();
  const b = Math.floor(st / bt);
  const k = o.indexOf(b);
  return (k < 0 ? b : k) * bt + (st - b * bt);
}
let timeCache = { key: '' };
function timeTable() {
  const o = playOrder();
  const key = orderCache.key;
  if (timeCache.key === key) return timeCache;
  const start = [0];
  const spt = [];
  for (let k = 0; k < o.length; k++) {
    spt.push(60 / (bpmAt(o[k]) * TPQ));
    start.push(start[k] + spt[k] * barTicks());
  }
  timeCache = { key, start, spt, n: o.length };
  return timeCache;
}
function absSec(tick) {
  const { start, spt, n } = timeTable();
  const bt = barTicks();
  const b = clamp(Math.floor(tick / bt), 0, n - 1);
  return start[b] + (tick - b * bt) * spt[b];
}
function tickAtSec(sec) {
  const { start, spt, n } = timeTable();
  const bt = barTicks();
  let b = 0;
  while (b < n - 1 && start[b + 1] <= sec) b++;
  return b * bt + (sec - start[b]) / spt[b];
}
function swingSec(tick) {
  if (!song.swing) return 0;
  const u = song.swingUnit;
  if (tick % (u * 2) !== u) return 0;
  const { spt, n } = timeTable();
  return (song.swing * u / 3) * spt[clamp(Math.floor(tick / barTicks()), 0, n - 1)];
}

/* ---------- 元に戻す・履歴 ---------- */
function snapshot() { return JSON.stringify(song); }
function pushUndo(snap, label) {
  undoStack.push({ snap, label });
  if (undoStack.length > 300) undoStack.shift();
  redoStack.length = 0;
  updateUndoButtons();
}
function edit(fn, label = '編集') {
  const snap = snapshot();
  fn();
  if (snapshot() !== snap) pushUndo(snap, label);
  changed();
}
function restore(json) {
  song = JSON.parse(json);
  cur = clamp(cur, 0, song.tracks.length - 1);
  changed(true);
}
function undo() {
  if (!undoStack.length) return;
  const e = undoStack.pop();
  redoStack.push({ snap: snapshot(), label: e.label });
  restore(e.snap);
}
function redo() {
  if (!redoStack.length) return;
  const e = redoStack.pop();
  undoStack.push({ snap: snapshot(), label: e.label });
  restore(e.snap);
}
function updateUndoButtons() {
  $('#btnUndo').disabled = !undoStack.length;
  $('#btnRedo').disabled = !redoStack.length;
}
let autosaveTimer = null;
let scoreTimer = null;
function changed(full = false) {
  version++;
  if (full) { renderSettings(); renderTracks(); }
  renderEditorTools();
  resizeEditor();
  draw();
  drawOverview();
  updateUndoButtons();
  updateMini();
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => { try { localStorage.setItem('otsumiki-autosave', snapshot()); } catch (e) { /* 保存できなくても続ける */ } }, 500);
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
    comp.connect(actx.destination);
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
  for (const tr of song.tracks) {
    const tg = ctx.createGain();
    tg.gain.value = tr.vol;
    tg.connect(session);
    outs[tr.id] = tg;
  }
  const metro = ctx.createGain();
  metro.gain.value = song.metro.vol;
  metro.connect(g.out);
  return Object.assign(Object.create(g), { session, send, outs, metro, base: g });
}

function chordEvents(tr) {
  const bt = barTicks();
  const bs = beatTicks();
  const ev = [];
  for (let b = 0; b < song.bars; b++) {
    const c = tr.chords[b];
    if (!c) continue;
    let root = 48 + ((c.r % 12) + 12) % 12;
    if (root > 54) root -= 12;
    const tones = CHORD_Q[c.q].iv.map((x) => root + 12 + x);
    const bass = root - 12 + (root < 43 ? 12 : 0);
    const o = b * bt;
    const push = (s, p, l, v = 0.7) => ev.push({ s: o + s, p, l, v });
    const pat = tr.pattern;
    if (pat === 'whole') {
      tones.forEach((p) => push(0, p, bt, 0.6));
      if (tr.bassOn) push(0, bass, bt, 0.8);
    } else if (pat === 'beat') {
      for (let s = 0; s < bt; s += bs) {
        tones.forEach((p) => push(s, p, bs * 0.9, s === 0 ? 0.65 : 0.5));
        if (tr.bassOn) push(s, bass, bs * 0.9, 0.75);
      }
    } else if (pat === 'arp' || pat === 'alberti') {
      const seq = pat === 'arp' ? [tones[0], tones[1], tones[2], tones[0] + 12, tones[2], tones[1]] : [tones[0], tones[2], tones[1], tones[2]];
      let i = 0;
      for (let s = 0; s < bt; s += 24) push(s, seq[i++ % seq.length], pat === 'arp' ? 40 : 22, 0.55);
      if (tr.bassOn) push(0, bass, bt, 0.7);
    } else if (pat === 'waltz' || pat === 'march') {
      for (let s = 0, k = 0; s < bt; s += bs, k++) {
        const first = pat === 'waltz' ? k % 3 === 0 : k % 2 === 0;
        if (first) { if (tr.bassOn) push(s, bass, bs * 0.9, 0.85); else push(s, tones[0], bs * 0.9, 0.6); } else tones.forEach((p) => push(s, p, bs * 0.6, 0.45));
      }
    }
  }
  return ev;
}

// 再生する出来事（ノート・打楽器・メトロノーム）を時間順に並べる
let evCache = { v: -1, list: [] };
function eventList() {
  const key = orderCache.key + ':' + version;
  playOrder();
  if (evCache.v === key) return evCache.list;
  const total = totalTicks();
  const bt = barTicks();
  const bySrc = Array.from({ length: song.bars }, () => []);
  const put = (t, e) => { const b = Math.floor(t / bt); if (b >= 0 && b < song.bars) bySrc[b].push({ ...e, rt: t - b * bt }); };
  for (const tr of song.tracks) {
    if (tr.type === 'melody') {
      const ex = expression(tr);
      for (const n of tr.notes) if (n.s < total) { const x = ex(n); put(n.s, { tr, kind: 'note', p: n.p, l: Math.min(n.l, total - n.s), v: x.v, lf: x.lf }); }
    } else if (tr.type === 'chord') for (const n of chordEvents(tr)) put(n.s, { tr, kind: 'note', p: n.p, l: n.l, v: n.v });
    else for (const id in tr.grid) for (const s in tr.grid[id]) if (+s < total) put(+s, { tr, kind: 'drum', id, v: tr.grid[id][s] === 2 ? 1 : 0.6 });
  }
  const list = [];
  const order = playOrder();
  const bs = beatTicks();
  order.forEach((src, k) => {
    for (const e of bySrc[src]) list.push({ ...e, t: k * bt + e.rt });
    for (let t = 0; t < bt; t += bs) list.push({ t: k * bt + t, kind: 'metro', acc: t === 0 });
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
  const bt = barTicks();
  if (ui.loopOn && ui.loopRange) return [ui.loopRange[0] * bt, Math.min(ui.loopRange[1] * bt, totalTicks())];
  return [0, playTotal()];
}
function firstIdx(list, t) { let i = 0; while (i < list.length && list[i].t < t) i++; return i; }
function play() {
  const ctx = ensureAudio();
  stop(true);
  const [ls, le] = loopBounds();
  player.graph = buildGraph(ctx, ctx._comp, true);
  player.on = true;
  player.stopping = false;
  let st0 = playTickOf(ui.startTick);
  if (st0 === 0 && song.pickup > 0 && !(ui.loopOn && ui.loopRange)) st0 = barTicks() - song.pickup; // 弱起は休みをとばす
  const start = st0 >= ls && st0 < le ? st0 : ls;
  player.seg = { tick: start, time: ctx.currentTime + 0.05 };
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
  const horizon = ctx.currentTime + 0.15;
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
  player.segs = [];
  if (!silent) {
    $('#btnPlay').classList.remove('on');
    $('#btnPlay').innerHTML = I('play');
    draw();
    drawOverview();
    updateMini();
  }
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
    else if (Sound.Samples.has(tr.inst) && !Sound.Samples.ready(tr.inst)) jobs.push([tr.inst, () => Sound.Samples.load(tr.inst, ctx)]);
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
  for (let b = Math.floor(t0 / bt); b * bt < t1; b++) {
    if (b % 2) { g2.fillStyle = C('--bar-shade'); g2.fillRect(X(b * bt), RH, bt * k, H); }
  }
  if (ui.sel.t === cur) {
    g2.fillStyle = C('--sel');
    g2.fillRect(X(ui.sel.b0 * bt), RH, (ui.sel.b1 - ui.sel.b0 + 1) * bt * k, 4);
  }
  if (X(total) < W) { g2.fillStyle = C('--outside'); g2.fillRect(X(total), RH, W - X(total), H); }
  for (let b = Math.floor(t0 / bt); b * bt <= t1 && b <= song.bars; b++) {
    const bx = b * bt;
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
      g2.fillStyle = PC_COLORS[n.p % 12];
      roundRect(g2, x + 1.5, y + 1.5, w - 3, rh - 3, 5);
      g2.fill();
      g2.lineWidth = on ? 3 : 1;
      g2.strokeStyle = on ? '#fff' : 'rgba(0,0,0,.18)';
      g2.stroke();
      if (n.s + n.l > total) { g2.fillStyle = 'rgba(0,0,0,.3)'; g2.fill(); }
      if (w > 24) { g2.fillStyle = '#1b1b1b'; g2.fillText(noteName(n.p), x + 6, y + rh / 2 + 1, w - 12); }
      if (w > 12) { g2.fillStyle = 'rgba(0,0,0,.25)'; g2.fillRect(x + w - 6, y + 5, 3, rh - 10); }
    }
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
        if (v === 2 && w > 18) { g2.fillStyle = '#222'; g2.font = 'bold 11px sans-serif'; g2.textAlign = 'center'; g2.fillText('強', x + w / 2, y + rh / 2 + 1); g2.textAlign = 'left'; }
      }
    }
  } else if (tr.type === 'chord') {
    const y = RH - sy;
    for (let b = Math.floor(t0 / bt); b < song.bars && b * bt < t1; b++) {
      const x = X(b * bt);
      const w = bt * k;
      const c = tr.chords[b];
      if (b === ui.selBar) { g2.fillStyle = C('--sel'); g2.fillRect(x + 2, y + 2, w - 4, rh - 4); }
      g2.textAlign = 'center';
      g2.textBaseline = 'middle';
      if (c) {
        g2.fillStyle = PC_COLORS[c.r];
        roundRect(g2, x + 6, y + 10, w - 12, rh - 20, 8);
        g2.fill();
        g2.fillStyle = '#1b1b1b';
        g2.font = `bold ${Math.min(26, w / 3)}px sans-serif`;
        g2.fillText(chordName(c), x + w / 2, y + rh / 2, w - 16);
      } else {
        g2.fillStyle = C('--muted');
        g2.font = '13px sans-serif';
        g2.fillText(b === ui.selBar ? '↓下から選ぶ' : '（なし）', x + w / 2, y + rh / 2, w - 8);
      }
      g2.textAlign = 'left';
    }
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
    g2.strokeStyle = C('--playhead');
    g2.lineWidth = 2;
    g2.beginPath(); g2.moveTo(X(playPos), RH); g2.lineTo(X(playPos), H); g2.stroke();
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
    g2.fillRect(X(ui.loopRange[0] * bt), 0, (ui.loopRange[1] - ui.loopRange[0]) * bt * k, 9);
  }
  g2.textBaseline = 'middle';
  for (let b = Math.floor(t0 / bt); b < song.bars && b * bt < t1; b++) {
    const x = X(b * bt);
    g2.fillStyle = C('--text');
    g2.font = 'bold 12px sans-serif';
    g2.fillText(String(b + 1), x + 5, RH / 2 + 4);
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
      g2.fillText(row.label, 6, y + rh / 2 + 1, LW - 10);
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
function onDown(e) {
  if (e.button > 0 || pan || touchPts.size >= 2) return;
  const h = hitInfo(e);
  const tr = track();
  if (h.area === 'ruler') {
    const bar = clamp(Math.floor(h.tick / barTicks()), 0, song.bars - 1);
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
  if (e.pointerType === 'touch' && !ui.touchEdit) return; // スクロールモード
  if (tr.type !== 'chord' && locked(tr)) { toast('このトラックはロックされています'); return; }
  e.preventDefault();
  $('#scroller').setPointerCapture(e.pointerId);
  const snap = snapshot();
  if (tr.type === 'melody') {
    const n = findNote(tr, h.tick, h.row.p);
    if (n) {
      const nearEnd = (n.s + n.l) * ppt() - h.cx < Math.min(12, n.l * ppt() * 0.35);
      let mode = nearEnd ? 'resize' : 'move';
      if (ui.dragMode === 'stretch') mode = 'resize';
      if (ui.dragMode === 'move') mode = 'move';
      drag = { kind: mode, n, snap, off: h.cell - n.s, moved: false, label: mode === 'resize' ? '音の長さを変更' : '音を移動' };
    } else {
      const nn = { s: h.cell, p: h.row.p, l: cellLen(h.cell) };
      tr.notes.push(nn);
      preview(tr, nn.p);
      showMini(nn.p);
      drag = { kind: 'resize', n: nn, snap, moved: true, label: '音を置く' };
      version++;
    }
  } else if (tr.type === 'drum') {
    const id = h.row.id;
    const ex = existingHit(tr, id, h.cell);
    const v = ex != null ? tr.grid[id][ex] : 0;
    const nv = (v + 1) % 3;
    if (ex != null) delete tr.grid[id][ex];
    setCell(tr, id, ex != null ? ex : h.cell, nv);
    if (nv) preview(tr, id);
    drag = { kind: 'paint', id, val: nv, snap, label: 'リズムを入力' };
  } else if (tr.type === 'chord') {
    ui.selBar = clamp(Math.floor(h.tick / barTicks()), 0, song.bars - 1);
    selectBars(cur, ui.selBar, ui.selBar);
    renderEditorTools();
    drawOverview();
    const c = tr.chords[ui.selBar];
    if (c) previewChord(tr, c);
  }
  draw();
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
    const bar = clamp(Math.floor(h.tick / barTicks()), 0, song.bars - 1);
    if (bar !== drag.b1) { drag.b1 = bar; drag.moved = true; }
    if (drag.moved) {
      ui.loopRange = [Math.min(drag.b0, drag.b1), Math.max(drag.b0, drag.b1) + 1];
      ui.loopOn = true;
      $('#btnLoop').classList.add('on');
      draw();
    }
    return;
  }
  if (drag.kind === 'resize') {
    const endCell = cellStart(clamp(h.tick, drag.n.s, totalTicks() - 1));
    drag.n.l = Math.max(cellLen(drag.n.s), endCell + cellLen(endCell) - drag.n.s);
    drag.moved = true;
    version++;
  } else if (drag.kind === 'move') {
    const rows = rowsFor(tr);
    const ns = clamp(cellStart(Math.max(0, h.tick)) - drag.off, 0, totalTicks() - 1);
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
  if (!drag) return;
  const tr = track();
  const d = drag;
  drag = null;
  if (d.kind === 'ruler') {
    if (!d.moved) {
      if (d.loopBar && ui.loopRange) { ui.loopOn = !ui.loopOn; $('#btnLoop').classList.toggle('on', ui.loopOn); }
      ui.startTick = d.b0 * barTicks();
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
  if (d.kind === 'move' && !d.moved) { tr.notes.splice(tr.notes.indexOf(d.n), 1); d.label = '音を消す'; }
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
  if (tr.type === 'melody') return tr.notes.some((n) => n.s >= b * bt && n.s < (b + 1) * bt);
  if (tr.type === 'drum') return Object.values(tr.grid).some((g) => Object.keys(g).some((s) => +s >= b * bt && +s < (b + 1) * bt));
  return !!tr.chords[b];
}
function drawOverview(playPos) {
  if (playPos === undefined) playPos = playheadTick();
  resizeOverview();
  const dpr = window.devicePixelRatio || 1;
  const W = ov.width / dpr;
  const H = ov.height / dpr;
  const sx = $('#ovScroller').scrollLeft;
  const bw = ovBarW();
  const bt = barTicks();
  og.setTransform(dpr, 0, 0, dpr, 0, 0);
  og.fillStyle = C('--panel');
  og.fillRect(0, 0, W, H);
  const rows = ovRows();
  og.save();
  og.beginPath(); og.rect(OV_LW, 0, W - OV_LW, H); og.clip();
  for (let b = 0; b < song.bars; b++) {
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
      og.fillStyle = TRACK_COLORS[r.i % TRACK_COLORS.length];
      if (tr.type === 'melody') {
        for (const n of tr.notes) {
          if (n.s < b * bt || n.s >= (b + 1) * bt) continue;
          const nx = x + 2 + ((n.s - b * bt) / bt) * (bw - 4);
          const ny = y + OV_RH - 3 - ((n.p - 36) / 60) * (OV_RH - 6);
          og.fillRect(nx, clamp(ny, y + 2, y + OV_RH - 4), Math.max(2, (n.l / bt) * (bw - 4) - 1), 2);
        }
      } else if (tr.type === 'chord' && tr.chords[b]) {
        og.fillStyle = C('--text');
        og.font = 'bold 10px sans-serif';
        og.fillText(chordName(tr.chords[b]), x + 4, y + OV_RH / 2 + 1, bw - 6);
      } else if (tr.type === 'drum') {
        for (const id in tr.grid) for (const s in tr.grid[id]) {
          if (+s < b * bt || +s >= (b + 1) * bt) continue;
          og.fillRect(x + 2 + ((+s - b * bt) / bt) * (bw - 4), y + 5, 2, OV_RH - 10);
        }
      }
    });
    if (b % 4 === 0) { og.strokeStyle = C('--line-bar'); og.lineWidth = 2; og.beginPath(); og.moveTo(x + 0.5, 2); og.lineTo(x + 0.5, H); og.stroke(); }
  }
  const sc = $('#scroller');
  const k = ppt();
  const vt0 = sc.scrollLeft / k;
  const vt1 = (sc.scrollLeft + sc.clientWidth - LW) / k;
  const vy = OV_TOP + cur * OV_RH;
  og.strokeStyle = C('--playhead');
  og.lineWidth = 1.5;
  og.setLineDash([3, 2]);
  og.strokeRect(OV_LW + (vt0 / bt) * bw - sx, vy, ((vt1 - vt0) / bt) * bw, OV_RH);
  og.setLineDash([]);
  if (ovDrag && ovDrag.over) {
    const { r, b } = ovDrag.over;
    const n = ovDrag.b1 - ovDrag.b0 + 1;
    og.fillStyle = 'rgba(76,141,255,.35)';
    og.fillRect(OV_LW + b * bw - sx, OV_TOP + r * OV_RH, n * bw, OV_RH);
  }
  if (playPos != null) {
    og.fillStyle = C('--playhead');
    og.fillRect(OV_LW + (playPos / bt) * bw - sx - 1, 0, 2, H);
  }
  og.restore();
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
  const x = b * barTicks() * ppt();
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
  ui.startTick = ui.sel.b0 * barTicks();
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
    if (d.inSel && !d.shift) { selectBars(d.t, d.start.b, d.start.b); ui.startTick = d.start.b * barTicks(); }
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
function editTempo(b) {
  if (song.locks.rules) return toast('ルールの変更はロックされています');
  const v = prompt(`${b + 1}小節目からのテンポを入れてください（30〜240）\n空にすると、この小節のテンポ変化を消します`, song.tempos[b] || bpmAt(b));
  if (v === null) return;
  edit(() => {
    if (b === 0) { delete song.tempos[0]; if (v.trim()) song.bpm = clamp(Math.round(+v) || song.bpm, 30, 240); }
    else if (v.trim() === '') delete song.tempos[b];
    else song.tempos[b] = clamp(Math.round(+v) || bpmAt(b), 30, 240);
  }, 'テンポ変化');
  renderSettings();
}

/* ============================================================
   小節の操作（コピー・クリア・挿入・削除）
   ============================================================ */
function extractBars(tr, b0, b1) {
  const bt = barTicks();
  const a = b0 * bt;
  const z = (b1 + 1) * bt;
  if (tr.type === 'melody') return tr.notes.filter((n) => n.s >= a && n.s < z).map((n) => ({ ...n, s: n.s - a }));
  if (tr.type === 'drum') { const o = {}; for (const id in tr.grid) for (const s in tr.grid[id]) if (+s >= a && +s < z) { (o[id] = o[id] || {})[+s - a] = tr.grid[id][s]; } return o; }
  return tr.chords.slice(b0, b1 + 1).map((c) => (c ? { ...c } : null));
}
function clearBars(tr, b0, b1) {
  const bt = barTicks();
  const a = b0 * bt;
  const z = (b1 + 1) * bt;
  if (tr.type === 'melody') tr.notes = tr.notes.filter((n) => n.s < a || n.s >= z);
  else if (tr.type === 'drum') { for (const id in tr.grid) { for (const s in tr.grid[id]) if (+s >= a && +s < z) delete tr.grid[id][s]; if (!Object.keys(tr.grid[id]).length) delete tr.grid[id]; } }
  else for (let b = b0; b <= b1; b++) tr.chords[b] = null;
}
function copyBars(src, b0, b1, dst, to) {
  const n = b1 - b0 + 1;
  const data = extractBars(src, b0, b1);
  const last = Math.min(to + n - 1, song.bars - 1);
  clearBars(dst, to, last);
  const bt = barTicks();
  const off = to * bt;
  const lim = (last + 1) * bt;
  if (dst.type === 'melody') dst.notes.push(...data.filter((x) => x.s + off < lim).map((x) => ({ ...x, s: x.s + off })));
  else if (dst.type === 'drum') { for (const id in data) for (const s in data[id]) if (+s + off < lim) (dst.grid[id] = dst.grid[id] || {})[+s + off] = data[id][s]; }
  else data.forEach((c, i) => { if (to + i <= last) dst.chords[to + i] = c; });
}
// fromBar 以降の中身を n 小節ずらす（n<0 で前に詰める。詰めた所の中身は消える）
function shiftAll(fromBar, n) {
  const bt = barTicks();
  const a = fromBar * bt;
  const d = n * bt;
  const keep = (t) => t >= a || n > 0 || t < a + d;
  for (const tr of song.tracks) {
    if (tr.type === 'melody') tr.notes = tr.notes.filter((x) => keep(x.s)).map((x) => (x.s >= a ? { ...x, s: x.s + d } : x));
    else if (tr.type === 'drum') {
      for (const id in tr.grid) {
        const ng = {};
        for (const s in tr.grid[id]) { const t = +s; if (!keep(t)) continue; ng[t >= a ? t + d : t] = tr.grid[id][s]; }
        tr.grid[id] = ng;
      }
    } else {
      while (tr.chords.length < fromBar) tr.chords.push(null);
      if (n > 0) tr.chords.splice(fromBar, 0, ...Array(n).fill(null));
      else tr.chords.splice(fromBar + n, -n);
    }
  }
  const nt = {};
  for (const b in song.tempos) { const bi = +b; if (bi >= fromBar) nt[bi + n] = song.tempos[b]; else if (n > 0 || bi < fromBar + n) nt[bi] = song.tempos[b]; }
  song.tempos = nt;
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
function diatonic() {
  const k = song.key;
  const list = isMinor()
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
  edit(() => {
    while (tr.chords.length < song.bars) tr.chords.push(null);
    tr.chords[ui.selBar] = c;
    if (c) previewChord(tr, c);
    const nb = Math.min(ui.selBar + 1, song.bars - 1);
    selectBars(cur, nb, nb);
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
  const need = Math.max(1, Math.round(bt / E));
  for (let b = 0; b < song.bars; b++) {
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
    let s = b * bt;
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
      if (!(Math.random() < 0.07 && k > 0 && !last)) notes.push({ s, p: tones[idx], l: Math.min(len * E, (b + 1) * bt - s) });
      s += len * E;
    });
  }
  tr.notes = notes;
}
function shiftCopy(src, dst, bars) {
  const off = bars * barTicks();
  const total = totalTicks();
  dst.notes = src.notes.filter((n) => n.s + off < total).map((n) => ({ s: n.s + off, p: n.p, l: Math.min(n.l, total - n.s - off) }));
}
function notesInScope(tr) {
  // 2小節以上えらんでいればその範囲、そうでなければ全部
  if (ui.sel.t !== cur || ui.sel.b1 === ui.sel.b0) return tr.notes;
  const bt = barTicks();
  return tr.notes.filter((n) => n.s >= ui.sel.b0 * bt && n.s < (ui.sel.b1 + 1) * bt);
}
function transpose(tr, semis) { for (const n of notesInScope(tr)) n.p = clamp(n.p + semis, 21, 108); }
function transposeDegree(tr, dir) {
  const all = scaleDegreesInRange(21, 108);
  for (const n of notesInScope(tr)) {
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
  basic: { name: '8ビート', kit: 'drums', f: (bt) => ({ kick: [0, 96], snare: [48, 144], hihat: range(0, bt, 24) }) },
  rock16: { name: '16ビート', kit: 'drums', f: (bt) => ({ kick: [0, 72, 96], snare: [48, 144], hihat: range(0, bt, 12) }) },
  march: { name: 'マーチ（音楽室）', kit: 'school', f: (bt, b) => ({ odaiko: range(0, bt, 96), kodaiko: range(48, bt, 96), awase: b % 4 === 0 ? [0] : [] }) },
  waltz: { name: 'ワルツ', kit: 'drums', f: (bt) => ({ kick: [0], hihat: range(48, bt, 48), snare: range(48, bt, 48) }) },
  samba: { name: 'サンバ', kit: 'perc2', f: (bt) => ({ maracas: range(0, bt, 12), agogoH: [0, 72, 144], agogoL: [24, 96, 168], clave: [0, 36, 96, 120, 168] }) },
  latin: { name: 'ボサノバ', kit: 'perc1', f: () => ({ congaL: [0, 96], congaH: [72, 168], congaM: [48, 144], woodH: [0, 72, 144] }) },
  matsuri: { name: 'お祭り（和太鼓）', kit: 'wa', f: (bt, b) => ({ chodaiko: [0, 48, 72, 96, 144], shime: range(0, bt, 24), kane: [0, 48, 96, 144], hyoshigi: b % 4 === 3 ? [144] : [] }) },
  edm: { name: '4つ打ち（EDM）', kit: 'edm', f: (bt) => ({ kick808: range(0, bt, 48), clapE: [48, 144], ohatE: [24, 72, 120, 168], hihatE: range(0, bt, 12) }) },
  clap: { name: '手拍子', kit: 'perc2', f: (bt) => ({ clap: range(0, bt, 48) }) },
};
function applyRhythm(tr, key) {
  const pre = RHYTHM_PRESETS[key];
  tr.grid = {};
  tr.kit = pre.kit;
  const bt = barTicks();
  for (let b = 0; b < song.bars; b++) {
    const pat = pre.f(bt, b);
    for (const id in pat) for (const s of pat[id]) {
      if (s >= bt) continue;
      (tr.grid[id] = tr.grid[id] || {})[b * bt + s] = s === 0 ? 2 : 1;
    }
  }
}

/* ============================================================
   鍵盤で入力・演奏（パソコンのキーボード／MIDI鍵盤）
   ============================================================ */
const KEYMAP = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14, p: 15, ';': 16 };
const held = new Map();
let chordAnchor = null;
function noteOn(midi, keyIndex) {
  const tr = track();
  if (tr.type === 'drum') {
    const ids = kitRows(tr);
    const i = keyIndex != null ? keyIndex : (((midi - 36) % ids.length) + ids.length) % ids.length;
    const id = ids[ids.length - 1 - (i % ids.length)];
    preview(tr, id);
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
  miniTimer = setTimeout(() => box.classList.remove('show'), 5000);
}
function updateMini(pos) {
  if (pos === undefined) pos = playheadTick();
  const t = pos != null ? pos : ui.startTick;
  const bt = barTicks();
  const bar = clamp(Math.floor(t / bt), 0, song.bars - 1);
  const beat = Math.floor((t - bar * bt) / beatTicks());
  $('#miniTitle').textContent = song.title;
  $('#miniPos').textContent = `${bar + 1}小節 ${beat + 1}拍`;
  $('#miniKey').textContent = keyLabel(song.key, isMinor());
  $('#miniMeter').textContent = song.meter.join('/');
  $('#miniBpm').textContent = '♩=' + bpmAt(bar);
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
  $('#touchMode').value = ui.touchEdit ? 'edit' : 'scroll';
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
    d.addEventListener('pointerdown', (ev) => { if (cur !== i && !ev.target.closest('details')) selectTrack(i); });
    d.querySelector('.mute').onclick = () => { tr.mute = !tr.mute; version++; renderTracks(); };
    d.querySelector('.solo').onclick = () => { tr.solo = !tr.solo; version++; renderTracks(); };
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
    vol.oninput = (ev) => { tr.vol = +ev.target.value; liveVolume(tr); };
    vol.onchange = () => changed();
    list.appendChild(d);
  });
  renderChips();
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
  if (tr.type !== 'chord' && isPhone) html += `<select id="gridSel" class="gridsel" title="おたまチョップ：置く音の長さ">${GRIDS.map(([v, t, ic]) => `<option value="${v}" ${ui.grid === v ? 'selected' : ''}>${ic} ${t}</option>`).join('')}</select>`;
  else if (tr.type !== 'chord') html += `<span class="grp otama" title="おたまチョップ：置く音の長さ（マス目の大きさ）">${GRIDS.map(([v, t, ic]) => `<button class="mini gbtn ${ui.grid === v ? 'on' : ''}" data-v="${v}" title="${t}"><span class="ic">${ic}</span>${t.replace('音符', '').replace('3連符', '3連')}</button>`).join('')}</span>`;
  let tools = '';
  let others = [];
  if (tr.type === 'melody') {
    others = song.tracks.filter((t) => t.type === 'melody' && t !== tr);
    if (!song.locks.compose) html += `<button class="mini accent" id="btnAuto" title="音階とコードに合わせて、メロディを自動で作ります">${I('spark')}${isPhone ? '' : '<span>おまかせ</span>'}</button>`;
    const [rlo, rhi] = trackRange(tr);
    html += `<details class="pop" data-pop="range"><summary class="mini" title="表示する音の高さのはんい">${I('piano')}<span>${SOLFA_OCT(rlo)}〜${SOLFA_OCT(rhi)}</span></summary><div class="popbody">
      <div class="sub">はんいをえらぶ</div>
      <div class="rangelist">${Object.entries(RANGES).map(([k, v]) => `<button class="mini ${k === tr.range && tr.lo == null && tr.hi == null ? 'on' : ''}" data-range="${k}">${v[0]}</button>`).join('')}</div>
      <div class="sub">広げる・せまくする（1オクターブずつ）</div>
      <div class="btnrow"><button class="mini" data-ext="hi+1">${I('plus')}上に広げる</button><button class="mini" data-ext="lo-1">${I('plus')}下に広げる</button></div>
      <div class="btnrow"><button class="mini" data-ext="hi-1">${I('minus')}上をせまく</button><button class="mini" data-ext="lo+1">${I('minus')}下をせまく</button></div>
    </div></details>
    <button class="mini ${ui.chromatic ? 'on' : ''}" id="btnChrom" title="音階にない音（半音・黒鍵）の行もぜんぶ表示します">${I('keys')}<span>半音</span></button>`;
    tools = `
      <div class="sub">音の移動 <small>${multi ? `（${ui.sel.b0 + 1}〜${ui.sel.b1 + 1}小節だけ）` : '（全部。キャンバスで2小節以上えらぶとその範囲だけ）'}</small></div>
      <div class="btnrow"><button class="mini" id="tOctUp">オクターブ↑</button><button class="mini" id="tSemiUp">半音↑</button><button class="mini" id="tDegUp">音階↑</button></div>
      <div class="btnrow"><button class="mini" id="tOctDn">オクターブ↓</button><button class="mini" id="tSemiDn">半音↓</button><button class="mini" id="tDegDn">音階↓</button></div>
      ${others.length ? `<div class="sub">輪唱づくり</div><div class="btnrow"><select id="rSrc">${others.map((t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}</select>を<select id="rBars">${[0, 1, 2, 4].map((b) => `<option value="${b}" ${b === 2 ? 'selected' : ''}>${b}小節</option>`).join('')}</select>ずらして<button class="mini" id="btnRound">ここに写す</button></div>` : ''}`;
  } else if (tr.type === 'drum') {
    html += `<select id="rPreset" title="お手本のリズムを入れます"><option value="">リズムのお手本…</option>${Object.entries(RHYTHM_PRESETS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select><span class="hint">おすたびに ●→強→なし</span>`;
  } else {
    html += `<label class="grp">伴奏の形 <select id="cPat">${Object.entries(CHORD_PATTERNS).map(([k, v]) => `<option value="${k}" ${k === tr.pattern ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="grp"><input type="checkbox" id="cBass" ${tr.bassOn ? 'checked' : ''}> ベースも</label>`;
    const dia = diatonic();
    pal.innerHTML = `<div class="palhead">${ui.selBar + 1}小節目のコードをえらぶ（えらぶと次の小節へ進みます）</div>
      <div class="palrow">${dia.map((c, i) => `<button class="chordbtn" data-i="${i}" style="--pc:${PC_COLORS[c.r]}"><b>${chordName(c)}</b><small>${c.deg}</small></button>`).join('')}
      <button class="chordbtn none" data-i="-1"><b>なし</b><small>休み</small></button>
      <details class="pop" data-pop="chordother"><summary class="mini">そのほかのコード…</summary><div class="popbody"><select id="cRoot">${CHORD_ROOT.map((n, i) => `<option value="${i}">${n}</option>`).join('')}</select>
      <select id="cQ">${Object.entries(CHORD_Q).map(([k, v]) => `<option value="${k}">${v.s || '（長三和音）'}</option>`).join('')}</select>
      <button class="mini" id="cSet">この小節に入れる</button></div></details></div>`;
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
    const b0 = clamp(Math.floor(sc.scrollLeft / ppt() / bt), 0, song.bars - 1);
    const b1 = clamp(Math.floor((sc.scrollLeft + sc.clientWidth - LW - 10) / ppt() / bt), b0, song.bars - 1);
    ui.loopRange = [b0, b1 + 1];
    ui.loopOn = true;
    ui.startTick = b0 * bt;
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
    $('#rPreset').onchange = (ev) => {
      if (!ev.target.value || lk) return;
      if (Object.keys(tr.grid).length && !confirm('今のリズムを消して、お手本を入れますか？')) { ev.target.value = ''; return; }
      edit(() => applyRhythm(tr, ev.target.value), 'リズムのお手本');
      renderTracks();
    };
  } else {
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
      <label class="mixch" style="--tc:${TRACK_COLORS[i % TRACK_COLORS.length]}"><input type="range" min="0" max="1" step="0.01" value="${t.vol}" data-i="${i}" ${t.locked ? 'disabled' : ''}><span>${i + 1}. ${escapeHtml(t.name)}</span></label>`).join('')}
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
  box.querySelectorAll('.mixch input[data-i]').forEach((inp) => {
    inp.oninput = () => { const t = song.tracks[+inp.dataset.i]; t.vol = +inp.value; liveVolume(t); };
  });
  $('#mMaster').oninput = (e) => { song.master = +e.target.value; if (player.graph) player.graph.out.gain.value = song.master; };
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
  return Object.assign(song.score, { subtitle: '', lyricist: '', composer: '', perLine: 0, scale: 1, solfa: 'none', drums: false, clefs: {}, ...song.score });
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
      const nextOf = new Map(ts.map((st, i) => [st, i + 1 < ts.length ? ts[i + 1] : st + beatTicks()]));
      for (const id in t.grid) for (const st in t.grid[id]) {
        const s0 = +st;
        notes.push({ s: s0, p: 0, l: Math.max(1, Math.min(nextOf.get(s0) - s0, beatTicks())), id, art: t.grid[id][st] === 2 ? ['acc'] : [] });
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
    title: song.title, bpm: song.bpm, tempoText: song.tempoText, tempos: song.tempos,
    meta: { subtitle: S.subtitle, lyricist: S.lyricist, composer: S.composer },
    chords: chordTr ? Array.from({ length: song.bars }, (_, b) => chordName(chordTr.chords[b])) : null,
    chordObjs: chordTr ? Array.from({ length: song.bars }, (_, b) => chordTr.chords[b] || null) : null,
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
function openScore() {
  const mel = song.tracks.filter((t) => t.type === 'melody' || t.type === 'drum' || (t.type === 'chord' && t.chords.some(Boolean)));
  if (!mel.some((t) => t.type === 'melody')) return alert('楽譜にできるメロディのトラックがありません');
  const S = scoreSettings();
  if (!S.trans) S.trans = {};
  if (!scoreSel) scoreSel = new Set(song.tracks.filter((t) => (t.type === 'melody' && t.notes.length)).map((t) => t.id));
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
    <label>音符の下に <select data-s="solfa"><option value="none">何も書かない</option><option value="doremi">ドレミ（音名）</option><option value="movable">ドレミ（階名・移動ド）</option><option value="cde">CDE</option><option value="haniho">ハニホ</option></select></label>
    <label>1段の小節数 <select data-s="perLine"><option value="0">自動</option>${[1, 2, 3, 4, 5, 6].map((n) => `<option value="${n}">${n}小節</option>`).join('')}</select></label>
    <label>大きさ <select data-s="scale"><option value="0.8">小さい</option><option value="1">ふつう</option><option value="1.25">大きい</option><option value="1.5">とても大きい</option></select></label>
    <label class="chk"><input type="checkbox" data-c="accomp" ${S.accomp ? 'checked' : ''}> コード伴奏をピアノの楽譜（大譜表）にする</label>
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
    $('#scoreView').innerHTML = ids.length ? scoreSvg(ids) : '<p class="muted" style="padding:12px">パートを選んでください</p>';
  };
  side.querySelectorAll('[data-s]').forEach((el) => {
    el.oninput = () => { S[el.dataset.s] = el.value; upd(); };
    el.onchange = () => { autosaveSoon(); if (ui.showScore) renderScorePanel(); if (ui.view === 'score') renderScoreEdit(); };
  });
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
  const svg = $('#scoreView').innerHTML;
  const w = window.open('', '_blank');
  if (!w) return alert('ポップアップがブロックされました。ブラウザの設定で許可してください');
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${escapeHtml(song.title)}</title><style>@page{size:A4;margin:12mm}body{margin:0}svg{width:100%;height:auto}</style>${svg}<script>onload=()=>setTimeout(()=>print(),200)<\/script>`);
  w.document.close();
}
function exportPng() {
  const svgEl = $('#scoreView svg');
  if (!svgEl) return;
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
  const kc = Notation.keyCount(song.key, isMinor());
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
  $$('#viewSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
  $('#editorWrap').hidden = v === 'score';
  $('#scoreEdit').hidden = v !== 'score';
  if (v === 'score') {
    if (ui.sc.cursor == null) ui.sc.cursor = ui.startTick;
    renderScorePal();
    renderScoreEdit();
  } else { resizeEditor(); draw(); }
  renderPhonePad();
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
  o.edit = { part: pi, cursor: pi >= 0 ? ui.sc.cursor : null, sel: ui.sc.sel };
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
    const b = Math.floor(ui.sc.cursor / bt);
    const beat = (ui.sc.cursor - b * bt) / beatTicks() + 1;
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
function clearRange(tr, a, z) {
  tr.notes = tr.notes.filter((n) => !(n.s >= a && n.s < z));
  for (const n of tr.notes) if (n.s < a && n.s + n.l > a) n.l = a - n.s;
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
    for (const p of pitches) if (!tr.notes.some((n) => n.s === t && n.p === p)) tr.notes.push({ s: t, p: clamp(p, 21, 108), l: d });
  }, pitches.length ? '楽譜で音符を入力' : '楽譜で休符を入力');
  if (pitches.length) { preview(tr, pitches[pitches.length - 1]); showMini(pitches[pitches.length - 1]); }
  ui.sc.lastIns = { t, d, p: pitches.length ? Math.max(...pitches) : null, ref: pitches.length ? Math.max(...pitches) : last ? last.ref || last.p : null };
  ui.sc.sel = new Set(pitches.map((p) => t + ':' + p));
  ui.sc.selByInput = true;
  if (!chordAdd) ui.sc.cursor = Math.min(t + d, totalTicks());
  renderScoreEdit();
}
function refPitch(tr) {
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
function selNotes(tr) { return tr.notes.filter((n) => ui.sc.sel.has(n.s + ':' + n.p)); }
function scEditSel(fn, label) {
  const tr = scEditable();
  if (!tr) return;
  const ns = selNotes(tr);
  if (!ns.length) return toast('先に音符をえらんでください（クリック、または ← → キー）');
  edit(() => { fn(ns, tr); }, label);
  ui.sc.sel = new Set(ns.map((n) => n.s + ':' + n.p));
  renderScoreEdit();
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
  const b = Math.floor(ui.sc.cursor / barTicks());
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
  const b = Math.floor(Math.max(0, ui.sc.cursor - 1) / barTicks());
  const bb = kind === 'start' ? Math.floor(ui.sc.cursor / barTicks()) : b;
  edit(() => {
    const R = song.repeats;
    if (kind === 'start' || kind === 'end') {
      const arr = R[kind];
      const at = kind === 'start' ? bb : b;
      const i = arr.indexOf(at);
      if (i >= 0) arr.splice(i, 1); else arr.push(at);
    } else {
      const at = Math.floor(ui.sc.cursor / barTicks());
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
      <span class="grp"><button class="mini" data-bar="start" title="くり返しはじめ（カーソルの小節）">𝄆</button><button class="mini" data-bar="end" title="くり返しおわり（カーソルの前の小節）">𝄇</button><button class="mini" data-bar="1" title="1番かっこ">1.</button><button class="mini" data-bar="2" title="2番かっこ">2.</button></span>
      <span class="grp"><button class="mini icon" id="scCopyB" title="コピー（Ctrl+C）">${I('copy')}</button><button class="mini icon" id="scPasteB" title="貼りつけ（Ctrl+V）">${I('paste')}</button><button class="mini" id="scClr" title="えらんだ所の強弱・スラーなどの記号を消す">記号を消す</button><button class="mini icon danger" id="scDel" title="消す（Delete）">${I('trash')}</button></span>
      <span class="grp"><button class="mini icon" id="scZoomOut" title="小さく">${I('minus')}</button><button class="mini icon" id="scZoomIn" title="大きく">${I('plus')}</button></span>
    </div>
    <div class="prow small"><span id="scStatus" class="hint"></span><span class="hint">キー：A〜G 音名／1〜6 長さ／. 付点／T 3連／0 休符／↑↓ 高さ／←→ となり／Shift 和音・はんい／Delete 消す</span></div>`;
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
  $('#scCopyB').onclick = () => scCopy(false);
  $('#scPasteB').onclick = scPaste;
  $('#scClr').onclick = scClearMarks;
  $('#scDel').onclick = scDelete;
  $('#scZoomIn').onclick = () => { ui.sc.zoom = Math.min(2, ui.sc.zoom + 0.15); renderScoreEdit(); };
  $('#scZoomOut').onclick = () => { ui.sc.zoom = Math.max(0.6, ui.sc.zoom - 0.15); renderScoreEdit(); };
  renderScoreEdit();
}
// えらんだ音符の長さを、えらんだ長さに変える（Flat と同じ）
function scApplyDurToSel() {
  const tr = track();
  if (tr.type !== 'melody' || !ui.sc.sel.size || locked(tr) || ui.sc.selByInput) return; // 入力した直後は「次の音の長さ」
  const d = scDur();
  edit(() => {
    const ns = selNotes(tr);
    for (const n of ns) {
      clearRange(tr, n.s + 1, n.s + d);
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
  const bStart = h.bar * bt;
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
        if (t.type === 'chord') t.chords = t.chords.map((c) => (c ? { ...c, r: (((c.r + semis) % 12) + 12) % 12 } : c));
      }
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
        <div class="btnrow"><button class="mini" data-bar="start">𝄆 くり返しはじめ</button><button class="mini" data-bar="end">𝄇 くり返しおわり</button><button class="mini" data-bar="1">1番かっこ</button><button class="mini" data-bar="2">2番かっこ</button></div>
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
  };
  pad.querySelectorAll('[data-x]').forEach((b) => (b.onclick = () => { closePops(); act[b.dataset.x](); renderPhonePad(); }));
  pad.querySelectorAll('[data-art]').forEach((b) => (b.onclick = () => { closePops(); scArt(b.dataset.art); }));
  pad.querySelectorAll('[data-dyn]').forEach((b) => (b.onclick = () => { closePops(); scDynamic(b.dataset.dyn); }));
  pad.querySelectorAll('[data-bar]').forEach((b) => (b.onclick = () => { closePops(); scBarMark(b.dataset.bar); }));
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
    <div class="tpl-links"><button class="mini" id="tplSample">${I('note')}サンプル曲を開く</button><button class="mini" id="tplOpen">${I('folder')}ファイルを開く</button>${first ? '' : `<button class="mini" id="tplCancel">${I('x')}いまの曲にもどる</button>`}</div>`;
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
    toast(t.view === 'score' ? '長さ→音名の順におすと、音符が入っていきます' : 'マス目をおして音を置いてみよう');
  }));
  $('#tplSample').onclick = () => { $('#dlgStart').close(); loadSong(sampleSong()); };
  $('#tplOpen').onclick = () => { $('#dlgStart').close(); $('#fileIn').click(); };
  const c = $('#tplCancel');
  if (c) c.onclick = () => $('#dlgStart').close();
  if (!$('#dlgStart').open) $('#dlgStart').showModal();
}

/* ============================================================
   スマホ用の画面
   ============================================================ */
const phoneMQ = window.matchMedia('(max-width: 700px)');
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
  if (touchPts.size === 2) {
    if (drag && drag.snap && drag.kind !== 'ruler') { song = JSON.parse(drag.snap); changed(); }
    drag = null;
    const sc = $('#scroller');
    pan = { sx: sc.scrollLeft, sy: sc.scrollTop, c: centroid() };
  }
}
function panMove(e) {
  if (!touchPts.has(e.pointerId)) return;
  touchPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!pan) return;
  const c = centroid();
  const sc = $('#scroller');
  sc.scrollLeft = pan.sx - (c.x - pan.c.x);
  sc.scrollTop = pan.sy - (c.y - pan.c.y);
}
function panUp(e) {
  touchPts.delete(e.pointerId);
  if (touchPts.size < 2 && pan) { pan = null; drag = null; }
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
  requestAnimationFrame(() => { resizeEditor(); draw(); drawOverview(); });
}
function applyPhone() {
  const on = phoneMQ.matches;
  if (on === isPhone) return;
  isPhone = on;
  document.body.classList.toggle('phone', on);
  if (on) {
    // パソコンでは上のバーにある部品を「その他」シートへ移す
    for (const sel of ['.topbar .tempo', '#btnMetro', '#popKey', '#popRules', '#btnPal', '#btnShare', '.menu details.dropdown']) {
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
    if (!document.body.dataset.view) document.body.dataset.view = 'edit';
  } else {
    for (const [el, mark] of movedEls.splice(0)) { mark.parentNode.insertBefore(el, mark); mark.parentNode.removeChild(mark); }
    LW = 82;
    OV_LW = 110;
    OV_RH = 20;
    if (ui.rh === 30) { ui.rh = 22; $('#rowZoom').value = 22; }
    if (ui.zoom === 72) { ui.zoom = 56; $('#zoom').value = 56; }
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
  box.innerHTML = song.tracks.map((t, i) => `<button class="chip ${i === cur ? 'on' : ''}" data-i="${i}" style="--tc:${TRACK_COLORS[i % TRACK_COLORS.length]}"><i class="dot"></i>${escapeHtml(t.name)}${t.mute ? I('mute') : ''}${t.locked ? I('lock') : ''}</button>`).join('') + (song.locks.tracks ? '' : `<button class="chip add" data-add="1">${I('plus')}</button>`);
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
    b.onpointerdown = press('p' + m, () => noteOn(m));
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
function loadSong(s) {
  stop();
  if (!s || !Array.isArray(s.tracks)) throw new Error('曲データの形式がちがいます');
  s = migrate(s);
  const base = newSong();
  song = { ...base, ...s, eq: { ...base.eq, ...(s.eq || {}) }, metro: { ...base.metro, ...(s.metro || {}) }, locks: { ...base.locks, ...(s.locks || {}) }, tempos: s.tempos || {} };
  song.tracks = s.tracks.slice(0, MAX_TRACKS).map((t) => ({ ...newTrack(t.type), ...t, id: t.id || uid() }));
  song.repeats = { start: [], end: [], volta: {}, ...(s.repeats || {}) };
  song.pickup = s.pickup || 0;
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
  changed(true);
  scrollToNotes();
  draw();
  preloadSamples();
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
    row.innerHTML = `<span>${escapeHtml(n)}<small>${new Date(all[n].t).toLocaleString('ja-JP')}</small></span><button class="mini">開く</button><button class="mini danger">削除</button>`;
    const [bOpen, bDel] = row.querySelectorAll('button');
    bOpen.onclick = () => { loadSong(all[n].song); $('#dlgOpen').close(); };
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
function importFile(file) {
  const r = new FileReader();
  if (/\.(musicxml|xml|mxl)$/i.test(file.name)) {
    r.onload = () => {
      MusicXMLImport.readFile(r.result, file.name)
        .then((sg) => { loadSong(sg); toast('MusicXMLを読み込みました'); })
        .catch((e) => alert('MusicXMLを読み込めませんでした：' + e.message));
    };
    r.readAsArrayBuffer(file);
    return;
  }
  if (/\.midi?$/i.test(file.name)) {
    r.onload = () => { try { loadSong(importMidi(new Uint8Array(r.result), file.name)); toast('MIDIファイルを読み込みました'); } catch (e) { alert('MIDIを読み込めませんでした：' + e.message); } };
    r.readAsArrayBuffer(file);
    return;
  }
  r.onload = () => { try { loadSong(JSON.parse(r.result)); toast('読み込みました'); } catch (e) { alert('読み込めませんでした：' + e.message); } };
  r.readAsText(file);
}

async function packSong() {
  const bytes = new TextEncoder().encode(JSON.stringify(song));
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
  const url = location.href.split('#')[0] + '#song=' + (await packSong());
  $('#shareUrl').value = url;
  $('#dlgShare').showModal();
  $('#shareUrl').select();
}

// 曲を音にする（WAV・MP3 で共通）
async function renderSong() {
  stop();
  toast('音声ファイルを作っています…');
  const c0 = audioCtx();
  await Promise.all(song.tracks.filter((t) => t.real !== false).map((t) => (t.type === 'drum' ? Sound.Samples.loadDrums(c0) : Sound.Samples.has(t.inst) ? Sound.Samples.load(t.inst, c0) : null)).map((p) => p && p.catch(() => null)));
  const sr = 44100;
  const len = Math.ceil((absSec(playTotal()) + 3) * sr);
  const ctx = new OfflineAudioContext(2, len, sr);
  const comp = ctx.createDynamicsCompressor();
  comp.connect(ctx.destination);
  const graph = buildGraph(ctx, comp, false);
  for (const e of eventList()) scheduleEvent(ctx, graph, e, 0.05 + absSec(e.t), false);
  return ctx.startRendering();
}
async function exportWav() {
  const buf = await renderSong();
  download(encodeWav(buf), safeName() + '.wav');
  toast('音声ファイル（WAV）を書き出しました');
  return buf;
}
// MP3（WAVの約10分の1の大きさ。音楽アプリやスマホでそのまま聴けます）
async function exportMp3() {
  MP3.ensure();
  const buf = await renderSong();
  const blob = await MP3.encode(buf, { kbps: 192, onProgress: (p) => toast(`MP3に変換中… ${Math.round(p * 100)}%`) });
  download(blob, safeName() + '.mp3');
  toast('音声ファイル（MP3）を書き出しました');
  return blob;
}
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
  for (const b in song.tempos) t0.push(tempoEv(+b * barTicks() * k, song.tempos[b]));
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
      ev.push({ t: 0, o: 0, d: [0xc0 | c, Sound.GM[tr.inst] || 0] }, { t: 0, o: 0, d: [0xb0 | c, 7, Math.round(tr.vol * 127)] });
      const notes = tr.type === 'melody' ? tr.notes.map((n) => ({ ...n, v: 0.8 })) : chordEvents(tr);
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
  for (let t = 0; t < ntr && p < buf.length; t++) {
    if (id() !== 'MTrk') break;
    const len = u32();
    const end = p + len;
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
        if (type === 0x51 && tick === 0) bpm = Math.round(60000000 / ((data[0] << 16) | (data[1] << 8) | data[2]));
        if (type === 0x58 && tick === 0) meter = [data[0], Math.pow(2, data[1])];
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
      if (cmd === 0x90 && b > 0) on.set(key, { s: tick, v: b });
      else if (cmd === 0x80 || (cmd === 0x90 && b === 0)) {
        const o = on.get(key);
        if (!o) continue;
        on.delete(key);
        if (chn === 9) drums.push({ s: Math.round(o.s * scale), n: a, v: o.v });
        else {
          if (!chans.has(t + ':' + chn)) chans.set(t + ':' + chn, { name: tname, notes: [] });
          chans.get(t + ':' + chn).notes.push({ s: Math.round(o.s * scale), p: a, l: Math.max(1, Math.round((tick - o.s) * scale)) });
        }
      }
    }
    p = end;
  }
  s.bpm = clamp(bpm, 30, 240);
  s.meter = [clamp(meter[0], 1, 6), [2, 4, 8].includes(meter[1]) ? meter[1] : 4];
  const bt = (s.meter[0] * 192) / s.meter[1];
  let maxT = 0;
  for (const c of chans.values()) {
    if (s.tracks.length >= MAX_TRACKS - (drums.length ? 1 : 0)) break;
    const avg = c.notes.reduce((x, n) => x + n.p, 0) / c.notes.length;
    const rg = avg < 50 ? 'bass' : avg < 60 ? 'tenor' : 'soprano';
    s.tracks.push(newTrack('melody', { name: (c.name || 'パート' + (s.tracks.length + 1)).slice(0, 20), inst: avg < 50 ? 'ebass' : 'piano', range: rg, notes: c.notes }));
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
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
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
  $('#zoom').oninput = (e) => {
    const sc = $('#scroller');
    const tk = sc.scrollLeft / ppt();
    ui.zoom = +e.target.value;
    resizeEditor();
    sc.scrollLeft = tk * ppt();
    draw();
    drawOverview();
  };
  $('#rowZoom').oninput = (e) => { ui.rh = +e.target.value; resizeEditor(); draw(); };

  $('#btnPlay').onclick = () => (player.on ? stop() : play());
  $('#btnStop').onclick = () => {
    const wasOn = player.on;
    stop();
    if (!wasOn) { ui.startTick = 0; $('#scroller').scrollLeft = 0; } else ui.startTick = ui.sel.b0 * barTicks();
    draw(); drawOverview(); updateMini();
  };
  $('#btnLoop').onclick = () => {
    ui.loopOn = !ui.loopOn;
    if (ui.loopOn && !ui.loopRange) ui.loopRange = [ui.sel.b0, ui.sel.b1 + 1];
    if (ui.loopOn && !player.on) ui.startTick = ui.loopRange[0] * barTicks();
    $('#btnLoop').classList.toggle('on', ui.loopOn);
    draw();
  };
  $('#btnMetro').onclick = () => { ui.metro = !ui.metro; $('#btnMetro').classList.toggle('on', ui.metro); };
  $('#btnUndo').onclick = undo;
  $('#btnRedo').onclick = redo;
  $('#btnHist').onclick = openHistory;
  $('#btnNew').onclick = () => openStart(false);
  $('#btnSample').onclick = () => { if (confirm('注意：保存していないデータは消えてしまいます。サンプル曲を開きますか？')) loadSong(sampleSong()); };
  $('#btnSave').onclick = saveToBrowser;
  $('#btnOpen').onclick = openDialog;
  $('#btnExportJson').onclick = exportJSON;
  $('#btnImportJson').onclick = () => $('#fileIn').click();
  $('#fileIn').onchange = (e) => { if (e.target.files[0]) importFile(e.target.files[0]); e.target.value = ''; };
  $('#btnWav').onclick = () => exportWav().catch((err) => alert('書き出しに失敗しました：' + err.message));
  $('#btnMp3').onclick = () => exportMp3().catch((err) => alert('書き出しに失敗しました：' + err.message));
  $('#btnMidi').onclick = exportMidi;
  $('#btnScore').onclick = openScore;
  $('#btnScoreMenu').onclick = openScore;
  $('#btnPrintScore').onclick = printScore;
  $('#btnPngScore').onclick = exportPng;
  $('#btnXmlScore').onclick = exportMusicXML;
  $('#btnSvgScore').onclick = () => download(new Blob([$('#scoreView').innerHTML], { type: 'image/svg+xml' }), safeName() + '_楽譜.svg');
  $('#btnScorePanel').onchange = (e) => { ui.showScore = e.target.checked; renderScorePanel(); };
  $('#ghost').onchange = (e) => { ui.ghost = e.target.checked; draw(); };
  $('#dragMode').onchange = (e) => { ui.dragMode = e.target.value; };
  $('#touchMode').onchange = (e) => { ui.touchEdit = e.target.value === 'edit'; $('#scroller').classList.toggle('touchedit', ui.touchEdit); };
  $('#miniInfo').onclick = () => { const d = isPhone ? $('#popRules') : $('#popKey'); d.open = !d.open; };
  // ポップアップ（ルール・メニュー・道具・表示）は外をおすと閉じる
  document.addEventListener('pointerdown', (e) => { if (e.target.closest('#miniInfo')) return; closePops(e.target.closest('details.pop')); });
  document.addEventListener('toggle', (e) => { if (e.target.matches && e.target.matches('details.pop') && e.target.open) closePops(e.target); }, true);
  $('#btnPal').onclick = openPalette;
  $('#btnTeach').onclick = openTeacher;
  $('#btnShare').onclick = () => shareDialog().catch((err) => alert('URLを作れませんでした：' + err.message));
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
  sc.classList.toggle('touchedit', ui.touchEdit);
  renderSettings();
  sc.addEventListener('pointerdown', onDown);
  sc.addEventListener('pointermove', onMove);
  sc.addEventListener('pointerup', onUp);
  sc.addEventListener('pointercancel', () => { drag = null; });
  sc.addEventListener('scroll', () => { if (!player.on) { draw(); drawOverview(); } });
  sc.addEventListener('wheel', (e) => {
    if (e.ctrlKey) { e.preventDefault(); ui.zoom = clamp(ui.zoom - Math.sign(e.deltaY) * 6, 12, 240); $('#zoom').value = ui.zoom; resizeEditor(); draw(); drawOverview(); }
  }, { passive: false });
  const osc = $('#ovScroller');
  osc.addEventListener('pointerdown', ovDown);
  osc.addEventListener('pointermove', ovMove);
  osc.addEventListener('pointerup', ovUp);
  osc.addEventListener('pointercancel', () => { ovDrag = null; $('#ovTrash').classList.remove('show', 'hot'); drawOverview(); });
  osc.addEventListener('scroll', () => drawOverview());
  new ResizeObserver(() => { resizeEditor(); draw(); drawOverview(); }).observe($('#editorWrap'));
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', () => { cssCache = null; draw(); drawOverview(); });

  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if (ui.view === 'score' && !$$('dialog').some((d) => d.open) && scoreKey(e)) return;
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      return;
    }
    const otherDialog = $$('dialog').some((d) => d.open && d.id !== 'dlgInst');
    if (otherDialog) return;
    const inPicker = $('#dlgInst').open;
    if (e.code === 'Space' && !inPicker) { e.preventDefault(); player.on ? stop() : play(); return; }
    const k = e.key.toLowerCase();
    if (k === 'z' || k === 'x') {
      ui.kbOct = clamp(ui.kbOct + (k === 'z' ? -1 : 1), 1, 7);
      toast(`鍵盤の高さ：C${ui.kbOct} から`);
      if (inPicker && picker.type !== 'drum') renderPicker();
      return;
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
  window.addEventListener('beforeunload', () => { try { localStorage.setItem('otsumiki-autosave', snapshot()); } catch (e) { /* 何もしない */ } });

  (async () => {
    const m = location.hash.match(/#song=(.+)$/);
    if (m) {
      try { loadSong(await unpackSong(m[1])); toast('共有された曲を開きました'); history.replaceState(null, '', location.pathname + location.search); return; } catch (e) { alert('共有URLの曲を読み込めませんでした'); }
    }
    try {
      const auto = localStorage.getItem('otsumiki-autosave');
      if (auto) { loadSong(JSON.parse(auto)); toast('前回の続きから開きました'); return; }
    } catch (e) { /* 何もしない */ }
    loadSong(sampleSong());
    openStart(true);
  })();
}
init();
