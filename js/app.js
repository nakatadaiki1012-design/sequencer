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

/* ---------- 音楽の基本データ ---------- */
const PC_COLORS = ['#ff5a5f', '#ff7e47', '#ff9f2e', '#ffc02e', '#f5dd2a', '#8fd93a', '#3ccf7a', '#2ec4b6', '#36a6ff', '#5b7bff', '#9b5bff', '#e05bd6'];
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
  soprano: ['ソプラノ（ド4〜ド6）', 60, 84], alto: ['アルト（ソ3〜ソ5）', 55, 79], tenor: ['テノール（ド3〜ド5）', 48, 72],
  bass: ['ベース（ド2〜ド4）', 36, 60], wide: ['広い（ド2〜ド7）', 36, 96], all: ['ピアノ全部（88鍵）', 21, 108],
};
const GRIDS = [[192, '全音符', '𝅝'], [96, '2分音符', '𝅗𝅥'], [48, '4分音符', '♩'], [24, '8分音符', '♪'], [12, '16分音符', '𝅘𝅥𝅯'], [6, '32分音符', '𝅘𝅥𝅰'], [16, '8分3連符', '♪³'], [8, '16分3連符', '𝅘𝅥𝅯³']];
const TRACK_COLORS = ['#ff6b6b', '#4dabf7', '#51cf66', '#fcc419', '#cc5de8', '#ff922b', '#20c997', '#748ffc'];
const MAX_TRACKS = 8;

/* ---------- 曲データ ---------- */
function newTrack(type, opts = {}) {
  const base = { id: uid(), type, vol: 0.8, mute: false, solo: false, locked: false };
  if (type === 'melody') return { ...base, name: 'メロディ', inst: 'recorder', range: 'soprano', notes: [], ...opts };
  if (type === 'chord') return { ...base, name: 'コード伴奏', inst: 'piano', vol: 0.55, pattern: 'beat', bassOn: true, chords: [], ...opts };
  return { ...base, name: 'リズム', kit: 'drums', grid: {}, ...opts };
}
function newSong() {
  return {
    v: 2, title: 'あたらしい曲', bpm: 100, meter: [4, 4], bars: 8, key: 0, scale: 'major',
    swing: 0, swingUnit: 24, reverb: 0.25, master: 0.9, eq: { low: 0, mid: 0, high: 0 },
    metro: { vol: 0.7, kind: 'click' }, tempos: {},
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
  stepRec: false, inputTick: 0, kbOct: 4, showScore: false,
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
let timeCache = { v: -1 };
function timeTable() {
  if (timeCache.v === version) return timeCache;
  const n = song.bars;
  const start = [0];
  const spt = [];
  for (let b = 0; b < n; b++) {
    spt.push(60 / (bpmAt(b) * TPQ));
    start.push(start[b] + spt[b] * barTicks());
  }
  timeCache = { v: version, start, spt };
  return timeCache;
}
function absSec(tick) {
  const { start, spt } = timeTable();
  const bt = barTicks();
  const b = clamp(Math.floor(tick / bt), 0, song.bars - 1);
  return start[b] + (tick - b * bt) * spt[b];
}
function tickAtSec(sec) {
  const { start, spt } = timeTable();
  const bt = barTicks();
  let b = 0;
  while (b < song.bars - 1 && start[b + 1] <= sec) b++;
  return b * bt + (sec - start[b]) / spt[b];
}
function swingSec(tick) {
  if (!song.swing) return 0;
  const u = song.swingUnit;
  if (tick % (u * 2) !== u) return 0;
  const { spt } = timeTable();
  return (song.swing * u / 3) * spt[clamp(Math.floor(tick / barTicks()), 0, song.bars - 1)];
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
  const out = ctx.createGain();
  out.gain.value = song.master;
  out.connect(dest);
  const pre = ctx.createGain();
  const eqL = ctx.createBiquadFilter(); eqL.type = 'lowshelf'; eqL.frequency.value = 250; eqL.gain.value = song.eq.low;
  const eqM = ctx.createBiquadFilter(); eqM.type = 'peaking'; eqM.frequency.value = 1000; eqM.Q.value = 0.8; eqM.gain.value = song.eq.mid;
  const eqH = ctx.createBiquadFilter(); eqH.type = 'highshelf'; eqH.frequency.value = 4000; eqH.gain.value = song.eq.high;
  pre.connect(eqL); eqL.connect(eqM); eqM.connect(eqH);
  const g = { out, pre, eqL, eqM, eqH, outs: {} };
  if (live) {
    // エフェクトパッド用の部品
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
  } else eqH.connect(out);
  const rev = Sound.makeReverb(ctx, 2.2);
  const wet = ctx.createGain();
  wet.gain.value = song.reverb * 0.6;
  rev.connect(wet); wet.connect(pre);
  g.wet = wet;
  for (const tr of song.tracks) {
    const tg = ctx.createGain();
    tg.gain.value = tr.vol;
    tg.connect(pre); tg.connect(rev);
    g.outs[tr.id] = tg;
  }
  g.metro = ctx.createGain();
  g.metro.gain.value = song.metro.vol;
  g.metro.connect(out);
  return g;
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
  if (evCache.v === version) return evCache.list;
  const list = [];
  const total = totalTicks();
  for (const tr of song.tracks) {
    if (tr.type === 'melody') for (const n of tr.notes) { if (n.s < total) list.push({ t: n.s, tr, kind: 'note', p: n.p, l: Math.min(n.l, total - n.s), v: 0.8 }); }
    else if (tr.type === 'chord') for (const n of chordEvents(tr)) list.push({ t: n.s, tr, kind: 'note', p: n.p, l: n.l, v: n.v });
    else for (const id in tr.grid) for (const s in tr.grid[id]) if (+s < total) list.push({ t: +s, tr, kind: 'drum', id, v: tr.grid[id][s] === 2 ? 1 : 0.6 });
  }
  const bt = barTicks();
  const bs = beatTicks();
  for (let t = 0; t < total; t += bs) list.push({ t, kind: 'metro', acc: t % bt === 0 });
  list.sort((a, b) => a.t - b.t);
  evCache = { v: version, list };
  return list;
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
  if (e.kind === 'note') Sound.playNote(ctx, out, e.tr.inst, e.p, t, (absSec(e.t + e.l) - absSec(e.t)) * 0.96, e.v);
  else Sound.playDrum(ctx, out, e.id, t, e.v);
}

const player = { on: false, timer: null, graph: null, idx: 0, seg: null, segs: [], stopping: false, stopAt: 0, lastT: -1, ver: -1 };
function loopBounds() {
  const bt = barTicks();
  if (ui.loopOn && ui.loopRange) return [ui.loopRange[0] * bt, Math.min(ui.loopRange[1] * bt, totalTicks())];
  return [0, totalTicks()];
}
function firstIdx(list, t) { let i = 0; while (i < list.length && list[i].t < t) i++; return i; }
function play() {
  const ctx = ensureAudio();
  stop(true);
  const [ls, le] = loopBounds();
  player.graph = buildGraph(ctx, ctx._comp, true);
  player.on = true;
  player.stopping = false;
  const start = ui.startTick >= ls && ui.startTick < le ? ui.startTick : ls;
  player.seg = { tick: start, time: ctx.currentTime + 0.08 };
  player.segs = [player.seg];
  player.idx = firstIdx(eventList(), start);
  player.lastT = start - 1;
  player.ver = version;
  player.timer = setInterval(tick, 25);
  tick();
  $('#btnPlay').classList.add('on');
  $('#btnPlay').textContent = '⏸';
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
  if (player.timer) clearInterval(player.timer);
  player.timer = null;
  if (player.graph && actx) {
    player.graph.out.gain.setTargetAtTime(0, actx.currentTime, 0.03);
    const old = player.graph.out;
    setTimeout(() => old.disconnect(), 400);
  }
  player.graph = null;
  player.on = false;
  player.segs = [];
  if (!silent) {
    $('#btnPlay').classList.remove('on');
    $('#btnPlay').textContent = '▶';
    draw();
    drawOverview();
    updateMini();
  }
}
function playheadTick() {
  if (!player.on || !actx) return null;
  const now = actx.currentTime;
  let seg = null;
  for (const s of player.segs) if (s.time <= now) seg = s;
  if (!seg) return null;
  const t = tickAtSec(absSec(seg.tick) + now - seg.time);
  return Math.min(t, totalTicks());
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
  requestAnimationFrame(anim);
}
function liveVolume(tr) {
  if (player.graph && player.graph.outs[tr.id]) player.graph.outs[tr.id].gain.setTargetAtTime(tr.vol, actx.currentTime, 0.02);
}
function preview(tr, p, dur = 0.35) {
  const ctx = ensureAudio();
  if (tr.type === 'drum') Sound.playDrum(ctx, previewOut, p, ctx.currentTime + 0.01, 0.8);
  else Sound.playNote(ctx, previewOut, tr.inst, p, ctx.currentTime + 0.01, dur, 0.8 * tr.vol + 0.2);
}

/* ============================================================
   エディタ（オトグラフ）の描画
   ============================================================ */
const LW = 82;
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
  const [, lo, hi] = RANGES[tr.range] || RANGES.soprano;
  const pcs = scalePcs();
  const used = new Set(tr.notes.map((n) => n.p));
  const rows = [];
  for (let m = hi; m >= lo; m--) if (pcs.has(m % 12) || used.has(m)) rows.push({ id: m, p: m, inScale: pcs.has(m % 12) });
  for (const p of used) if ((p > hi || p < lo) && !rows.some((r) => r.p === p)) rows.push({ id: p, p, inScale: pcs.has(p % 12) });
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
      g2.strokeStyle = on ? '#fff' : 'rgba(0,0,0,.35)';
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
      g2.fillStyle = row.id === highlightRow ? '#ffd43b' : black ? '#3a3a46' : '#fafafa';
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
  if (e.button > 0) return;
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
  if (tr.type !== 'chord' && locked(tr)) { toast('🔒 このトラックはロックされています'); return; }
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
const OV_LW = 110;
const OV_RH = 20;
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
      og.fillStyle = sel ? C('--sel-strong') : has ? TRACK_COLORS[r.i % TRACK_COLORS.length] + '55' : C('--row-b');
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
    og.fillText(`${r.i + 1} ${tr.locked ? '🔒' : ''}${tr.name}`, 9, y + OV_RH / 2, OV_LW - 12);
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
    return;
  }
  const src = song.tracks[d.t];
  if (d.trash) {
    if (locked(src)) return toast('🔒 ロックされています');
    edit(() => clearBars(src, d.b0, d.b1), `${d.b0 + 1}〜${d.b1 + 1}小節を消す`);
    toast(`「${src.name}」の${d.b0 + 1}〜${d.b1 + 1}小節を消しました`);
    return;
  }
  if (!d.over) { drawOverview(); return; }
  const dst = song.tracks[d.over.r];
  if (src.type !== dst.type) { toast('ちがう種類のトラックにはコピーできません'); drawOverview(); return; }
  if (locked(dst)) { toast('🔒 コピー先はロックされています'); drawOverview(); return; }
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
  if (song.locks.rules) return toast('🔒 ルールの変更はロックされています');
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
  if (song.locks.rules) return toast('🔒 小節数の変更はロックされています');
  const at = ui.sel.b0;
  const n = ui.sel.b1 - ui.sel.b0 + 1;
  edit(() => { shiftAll(at, n); song.bars = Math.min(128, song.bars + n); }, `${at + 1}小節目の前に${n}小節入れる`);
  renderSettings();
  toast(`${at + 1}小節目の前に${n}小節入れました`);
}
function deleteBars() {
  if (song.locks.rules) return toast('🔒 小節数の変更はロックされています');
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
  if (locked(tr)) return toast('🔒 このトラックはロックされています');
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
  const [, lo] = RANGES[tr.range] || RANGES.soprano;
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
  $('#miniKey').textContent = `${KEY_LABELS[song.key].split('（')[0]} ${isMinor() ? 'minor' : 'major'}`;
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
  $('#btnFlat').textContent = ui.flat ? '♭で表示' : '♯で表示';
  $('#swing').value = song.swing;
  opt($('#swingUnit'), [[24, '8分音符'], [12, '16分音符']], song.swingUnit);
  $('#zoom').value = ui.zoom;
  $('#btnLoop').classList.toggle('on', ui.loopOn);
  $('#btnMetro').classList.toggle('on', ui.metro);
  $('#rules').disabled = !!song.locks.rules;
  $('#bpm').disabled = $('#bpmNum').disabled = $('#btnTap').disabled = !!song.locks.rules;
  $('#addRow').hidden = !!song.locks.tracks;
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
    const icon = tr.type === 'melody' ? '🎵' : tr.type === 'chord' ? '🎹' : '🥁';
    const instLabel = tr.type === 'drum' ? (Sound.KITS.find((k) => k.id === tr.kit) || Sound.KITS[0]).name : Sound.INSTRUMENTS[tr.inst] || tr.inst;
    const lockMute = song.locks.mute;
    d.innerHTML = `
      <div class="trow"><span class="tnum">${i + 1}</span><span class="ticon">${icon}</span><input class="tname" value="${escapeHtml(tr.name)}" maxlength="20" ${tr.locked ? 'disabled' : ''}>
        ${tr.locked ? '<span title="ロック中">🔒</span>' : ''}
        <button class="mini mute ${tr.mute ? 'on' : ''}" title="ミュート（消音）" ${lockMute ? 'disabled' : ''}>消</button>
        <button class="mini solo ${tr.solo ? 'on' : ''}" title="ソロ（これだけ鳴らす）" ${lockMute ? 'disabled' : ''}>ソロ</button></div>
      <div class="trow"><button class="instbtn" ${tr.locked ? 'disabled' : ''} title="楽器をえらぶ">${escapeHtml(instLabel)} ▾</button>
        <input class="vol" type="range" min="0" max="1" step="0.01" value="${tr.vol}" title="音量" ${tr.locked ? 'disabled' : ''}></div>
      <div class="trow tsub">
        <button class="mini up" title="上へ">▲</button><button class="mini down" title="下へ">▼</button>
        ${song.locks.tracks ? '' : '<button class="mini dup" title="複製">複製</button><button class="mini del" title="削除">削除</button>'}
      </div>`;
    d.addEventListener('pointerdown', () => { if (cur !== i) selectTrack(i); });
    d.querySelector('.tname').onchange = (ev) => edit(() => { tr.name = ev.target.value || tr.name; }, 'トラック名');
    d.querySelector('.mute').onclick = () => { tr.mute = !tr.mute; version++; renderTracks(); };
    d.querySelector('.solo').onclick = () => { tr.solo = !tr.solo; version++; renderTracks(); };
    d.querySelector('.instbtn').onclick = (ev) => { ev.stopPropagation(); openInstPicker(i); };
    d.querySelector('.up').onclick = (ev) => { ev.stopPropagation(); moveTrack(i, -1); };
    d.querySelector('.down').onclick = (ev) => { ev.stopPropagation(); moveTrack(i, 1); };
    const dup = d.querySelector('.dup');
    if (dup) dup.onclick = (ev) => {
      ev.stopPropagation();
      if (song.tracks.length >= MAX_TRACKS) return toast(`トラックは${MAX_TRACKS}つまでです`);
      edit(() => { song.tracks.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(tr)), id: uid(), name: (tr.name + 'のコピー').slice(0, 20), locked: false }); cur = i + 1; }, 'トラックを複製');
      renderTracks();
    };
    const del = d.querySelector('.del');
    if (del) del.onclick = (ev) => {
      ev.stopPropagation();
      if (song.tracks.length <= 1) return alert('トラックは1つ以上必要です');
      if (!confirm(`「${tr.name}」を削除しますか？`)) return;
      edit(() => { song.tracks.splice(i, 1); cur = clamp(cur, 0, song.tracks.length - 1); }, 'トラックを削除');
      renderTracks();
    };
    const vol = d.querySelector('.vol');
    vol.oninput = (ev) => { tr.vol = +ev.target.value; liveVolume(tr); };
    vol.onchange = () => changed();
    list.appendChild(d);
  });
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
  const multi = ui.sel.t === cur && ui.sel.b1 > ui.sel.b0;
  const gridUI = tr.type !== 'chord' ? `<span class="grp otama" title="おたまチョップ：置く音の長さ（マス目の大きさ）">${GRIDS.map(([v, t, ic]) => `<button class="mini gbtn ${ui.grid === v ? 'on' : ''}" data-v="${v}" title="${t}"><span class="ic">${ic}</span>${t.replace('音符', '')}</button>`).join('')}</span>` : '';
  pal.innerHTML = '';
  pal.hidden = tr.type !== 'chord';
  let html = '';
  if (lk) html += '<span class="lockmsg">🔒 このトラックは先生がロックしています（見る・聴くだけ）</span>';
  html += gridUI;
  let others = [];
  if (tr.type === 'melody') {
    others = song.tracks.filter((t) => t.type === 'melody' && t !== tr);
    html += `
      <span class="grp">音域 <select id="range">${Object.entries(RANGES).map(([k, v]) => `<option value="${k}" ${k === tr.range ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></span>
      <span class="grp" title="キャンバスで2小節以上えらぶと、その範囲だけ動かします">音の移動${multi ? `<small>（${ui.sel.b0 + 1}〜${ui.sel.b1 + 1}小節）</small>` : '<small>（全部）</small>'} <button class="mini" id="tOctUp">オクターブ↑</button><button class="mini" id="tSemiUp">半音↑</button><button class="mini" id="tDegUp">音階↑</button><button class="mini" id="tDegDn">音階↓</button><button class="mini" id="tSemiDn">半音↓</button><button class="mini" id="tOctDn">オクターブ↓</button></span>
      ${song.locks.compose ? '' : '<span class="grp"><button class="mini accent" id="btnAuto">🎲 おまかせ作曲</button></span>'}
      ${others.length ? `<span class="grp">輪唱づくり：<select id="rSrc">${others.map((t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}</select>を<select id="rBars">${[0, 1, 2, 4].map((b) => `<option value="${b}" ${b === 2 ? 'selected' : ''}>${b}小節</option>`).join('')}</select>ずらして<button class="mini" id="btnRound">ここに写す</button></span>` : ''}
      <label class="grp"><input type="checkbox" id="ghost" ${ui.ghost ? 'checked' : ''}> ほかのパートを点線で表示</label>`;
  } else if (tr.type === 'drum') {
    html += `
      <span class="hint">クリックするたびに ●→強●→なし</span>
      <span class="grp">リズムのお手本 <select id="rPreset"><option value="">えらぶ…</option>${Object.entries(RHYTHM_PRESETS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select></span>`;
  } else {
    html += `
      <span class="grp">伴奏の形 <select id="cPat">${Object.entries(CHORD_PATTERNS).map(([k, v]) => `<option value="${k}" ${k === tr.pattern ? 'selected' : ''}>${v}</option>`).join('')}</select></span>
      <label class="grp"><input type="checkbox" id="cBass" ${tr.bassOn ? 'checked' : ''}> 低い音（ベース）もつける</label>`;
    const dia = diatonic();
    pal.innerHTML = `<div class="palhead">${ui.selBar + 1}小節目のコードをえらぶ（えらぶと次の小節へ進みます）</div>
      <div class="palrow">${dia.map((c, i) => `<button class="chordbtn" data-i="${i}" style="--pc:${PC_COLORS[c.r]}"><b>${chordName(c)}</b><small>${c.deg}</small></button>`).join('')}
      <button class="chordbtn none" data-i="-1"><b>なし</b><small>休み</small></button></div>
      <div class="palrow">そのほか：<select id="cRoot">${CHORD_ROOT.map((n, i) => `<option value="${i}">${n}</option>`).join('')}</select>
      <select id="cQ">${Object.entries(CHORD_Q).map(([k, v]) => `<option value="${k}">${v.s || '（長三和音）'}</option>`).join('')}</select>
      <button class="mini" id="cSet">この小節に入れる</button></div>`;
    pal.querySelectorAll('.chordbtn').forEach((b) => (b.onclick = () => { const i = +b.dataset.i; setChord(i < 0 ? null : { r: dia[i].r, q: dia[i].q }); }));
    $('#cSet').onclick = () => setChord({ r: +$('#cRoot').value, q: $('#cQ').value });
  }
  html += `<span class="grp">${tr.type === 'chord' ? '' : `<select id="dragMode" title="音をドラッグしたときの動き"><option value="auto">ドラッグ：自動</option><option value="stretch">ドラッグ：のばすだけ</option><option value="move">ドラッグ：動かすだけ</option></select>`}
    <button class="mini" id="btnTouch" title="タブレットで指でなぞったときの動き">${ui.touchEdit ? '✏️ 指で編集' : '✋ 指でスクロール'}</button>
    <button class="mini" id="btnViewLoop" title="いま見えている小節だけをくりかえし再生">▶ 見えている所だけ再生</button>
    <button class="mini danger" id="btnClear" ${lk ? 'disabled' : ''}>ぜんぶ消す</button></span>`;
  box.innerHTML = html;
  box.querySelectorAll('.gbtn').forEach((b) => (b.onclick = () => setGrid(+b.dataset.v)));
  const dm = $('#dragMode');
  if (dm) { dm.value = ui.dragMode; dm.onchange = (e) => { ui.dragMode = e.target.value; }; }
  $('#btnTouch').onclick = () => { ui.touchEdit = !ui.touchEdit; $('#scroller').classList.toggle('touchedit', ui.touchEdit); renderEditorTools(); };
  $('#btnViewLoop').onclick = () => {
    const sc = $('#scroller');
    const bt = barTicks();
    const b0 = clamp(Math.floor(sc.scrollLeft / ppt() / bt), 0, song.bars - 1);
    const b1 = clamp(Math.floor((sc.scrollLeft + sc.clientWidth - LW - 10) / ppt() / bt), b0, song.bars - 1);
    ui.loopRange = [b0, b1 + 1];
    ui.loopOn = true;
    ui.startTick = b0 * bt;
    $('#btnLoop').classList.add('on');
    play();
  };
  $('#btnClear').onclick = () => { if (confirm(`「${tr.name}」の中身をぜんぶ消しますか？`)) edit(() => clearTrack(tr), 'トラックを全部消す'); };
  if (tr.type === 'melody') {
    $('#range').onchange = (ev) => { edit(() => { tr.range = ev.target.value; }, '音域'); scrollToNotes(); };
    const guard = (fn, label) => () => { if (lk) return toast('🔒 ロックされています'); edit(fn, label); };
    $('#tDegDn').onclick = guard(() => transposeDegree(tr, -1), '音階で下げる');
    $('#tDegUp').onclick = guard(() => transposeDegree(tr, 1), '音階で上げる');
    $('#tSemiDn').onclick = guard(() => transpose(tr, -1), '半音下げる');
    $('#tSemiUp').onclick = guard(() => transpose(tr, 1), '半音上げる');
    $('#tOctDn').onclick = guard(() => transpose(tr, -12), 'オクターブ下げる');
    $('#tOctUp').onclick = guard(() => transpose(tr, 12), 'オクターブ上げる');
    const ba = $('#btnAuto');
    if (ba) ba.onclick = () => { if (lk) return; if (tr.notes.length && !confirm('今のメロディを消して、新しく作曲しますか？（「戻す」で元に戻せます）')) return; edit(() => autoCompose(tr), 'おまかせ作曲'); scrollToNotes(); };
    $('#ghost').onchange = (ev) => { ui.ghost = ev.target.checked; draw(); };
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
  } else target = rows.findIndex((r) => r.p <= (RANGES[tr.range] || RANGES.soprano)[1] + 12);
  sc.scrollTop = Math.max(0, RH + target * ui.rh - sc.clientHeight / 2);
}

/* ============================================================
   楽器えらび
   ============================================================ */
let picker = null;
function openInstPicker(ti) {
  const tr = song.tracks[ti];
  if (locked(tr)) return toast('🔒 ロックされています');
  picker = { ti, type: tr.type, val: tr.type === 'drum' ? tr.kit : tr.inst, cat: tr.type === 'drum' ? null : Sound.INST_CAT[tr.inst] || 'key' };
  $('#instTitle').textContent = tr.type === 'drum' ? '🥁 打楽器のセットをえらぶ' : '🎹 楽器をえらぶ';
  renderPicker();
  $('#dlgInst').showModal();
}
function renderPicker() {
  const p = picker;
  const box = $('#instBody');
  if (p.type === 'drum') {
    const kit = Sound.KITS.find((k) => k.id === p.val) || Sound.KITS[0];
    box.innerHTML = `<div class="cats">${Sound.KITS.map((k) => `<button class="catbtn ${k.id === kit.id ? 'on' : ''}" data-k="${k.id}">${k.icon} ${k.name}</button>`).join('')}</div>
      <div class="pads">${[...kit.list].reverse().map((id, i) => `<button class="pad" data-id="${id}"><kbd>${'ASDFGHJK'[i]}</kbd>${Sound.DRUMS[id].name}</button>`).join('')}</div>
      <p class="muted">パッドをたたくか、キーボードの A〜K で音をためせます。</p>`;
    box.querySelectorAll('.catbtn').forEach((b) => (b.onclick = () => { p.val = b.dataset.k; renderPicker(); }));
    box.querySelectorAll('.pad').forEach((b) => (b.onpointerdown = () => preview({ type: 'drum' }, b.dataset.id)));
  } else {
    const cat = Sound.CATS.find((c) => c.id === p.cat) || Sound.CATS[0];
    box.innerHTML = `<div class="cats">${Sound.CATS.map((c) => `<button class="catbtn ${c.id === cat.id ? 'on' : ''}" data-c="${c.id}">${c.icon} ${c.name}</button>`).join('')}</div>
      <div class="insts">${cat.list.map(([id, name]) => `<button class="instopt ${id === p.val ? 'on' : ''}" data-id="${id}">${name}</button>`).join('')}</div>
      <div class="kbd" id="pickKbd"></div>`;
    box.querySelectorAll('.catbtn').forEach((b) => (b.onclick = () => { p.cat = b.dataset.c; renderPicker(); }));
    box.querySelectorAll('.instopt').forEach((b) => (b.onclick = () => {
      p.val = b.dataset.id;
      box.querySelectorAll('.instopt').forEach((x) => x.classList.toggle('on', x === b));
      const ctx = ensureAudio();
      const base = ['ebass', 'acbass', 'sbass1', 'sbass2', 'sbass3', 'tuba', 'bassoon', 'trombone', 'timpani'].includes(p.val) ? 36 : 60;
      [0, 4, 7, 12].forEach((iv, i) => Sound.playNote(ctx, previewOut, p.val, base + iv, ctx.currentTime + 0.02 + i * 0.16, 0.3, 0.7));
    }));
    renderKeyboard($('#pickKbd'), (m) => { const ctx = ensureAudio(); Sound.playNote(ctx, previewOut, p.val, m, ctx.currentTime + 0.01, 0.5, 0.8); });
  }
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
    <section><h4>🎚 ミキサー（トラックの音量）</h4><div class="mixer">${song.tracks.map((t, i) => `
      <label class="mixch" style="--tc:${TRACK_COLORS[i % TRACK_COLORS.length]}"><input type="range" min="0" max="1" step="0.01" value="${t.vol}" data-i="${i}" ${t.locked ? 'disabled' : ''}><span>${i + 1}. ${escapeHtml(t.name)}</span></label>`).join('')}
      <label class="mixch master"><input type="range" min="0" max="1.2" step="0.01" value="${song.master}" id="mMaster"><span>全体の音量</span></label></div></section>
    <section><h4>🎛 イコライザー（音域ごとのバランス）</h4>
      <div class="eqrow"><label>低音 <input type="range" min="-12" max="12" step="1" value="${song.eq.low}" data-eq="low"></label>
      <label>中音 <input type="range" min="-12" max="12" step="1" value="${song.eq.mid}" data-eq="mid"></label>
      <label>高音 <input type="range" min="-12" max="12" step="1" value="${song.eq.high}" data-eq="high"></label>
      <label>ひびき <input type="range" min="0" max="1" step="0.05" value="${song.reverb}" id="mRev"></label>
      <button class="mini" id="eqReset">もとにもどす</button></div></section>
    <section><h4>⏱ メトロノーム</h4>
      <div class="eqrow"><label>音色 <select id="mKind">${Object.entries(Sound.METRO_SOUNDS).map(([k, v]) => `<option value="${k}" ${k === song.metro.kind ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label>音量 <input type="range" min="0" max="1.5" step="0.05" value="${song.metro.vol}" id="mVol"></label></div></section>
    <section><h4>✨ エフェクトパッド <small class="muted">再生中にパッドを押している間だけかかります（書き出しには入りません）</small></h4>
      <div class="fxsel">${Object.entries(FX).map(([k, v]) => `<button class="mini ${k === fxKind ? 'on' : ''}" data-fx="${k}">${v[0]}</button>`).join('')}</div>
      <div class="fxpad" id="fxPad"><span id="fxHint">${FX[fxKind][1]}</span><i id="fxDot"></i></div>
      <button class="mini" id="fxPlay">${player.on ? '⏸ 止める' : '▶ 再生してためす'}</button></section>`;
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
  $('#fxPlay').onclick = () => { player.on ? stop() : play(); $('#fxPlay').textContent = player.on ? '⏸ 止める' : '▶ 再生してためす'; };
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
function fxApply(kind, x, y, on) {
  const g = player.graph;
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
  box.innerHTML = items.length ? items.join('') + '<div class="histrow now">▶ いまの状態</div>' : '<p class="muted">まだ操作の記録はありません。</p>';
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
function scoreSvg(trackIds) {
  const parts = song.tracks.filter((t) => t.type === 'melody' && trackIds.includes(t.id)).map((t) => ({ name: t.name, notes: t.notes }));
  const chordTr = song.tracks.find((t) => t.type === 'chord' && t.chords.some(Boolean));
  return Notation.render({
    parts, bars: song.bars, barTicks: barTicks(), meter: song.meter, key: song.key, minor: isMinor(),
    title: song.title, bpm: song.bpm, chords: chordTr ? Array.from({ length: song.bars }, (_, b) => chordName(chordTr.chords[b])) : null,
    width: 780,
  });
}
function openScore() {
  const mel = song.tracks.filter((t) => t.type === 'melody');
  if (!mel.length) return alert('楽譜にできるメロディのトラックがありません');
  $('#scoreParts').innerHTML = mel.map((t) => `<label class="chk"><input type="checkbox" value="${t.id}" ${t.notes.length ? 'checked' : ''}> ${escapeHtml(t.name)}</label>`).join('') + '<span class="muted">（コード伴奏はコードネームとして表示されます）</span>';
  const upd = () => {
    const ids = $$('#scoreParts input:checked').map((c) => c.value);
    $('#scoreView').innerHTML = ids.length ? scoreSvg(ids) : '<p class="muted">パートを選んでください</p>';
  };
  $$('#scoreParts input').forEach((c) => (c.onchange = upd));
  upd();
  $('#dlgScore').showModal();
}
function printScore() {
  const svg = $('#scoreView').innerHTML;
  const w = window.open('', '_blank');
  if (!w) return alert('ポップアップがブロックされました。ブラウザの設定で許可してください');
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${escapeHtml(song.title)}</title><style>@page{size:A4;margin:12mm}body{margin:0}svg{width:100%;height:auto}</style>${svg}<script>onload=()=>setTimeout(()=>print(),200)<\/script>`);
  w.document.close();
}
function renderScorePanel() {
  const tr = track();
  const el = $('#scorePanel');
  if (!ui.showScore) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = tr.type === 'melody' ? scoreSvg([tr.id]) : '<p class="muted" style="padding:8px">メロディのトラックを選ぶと、ここに楽譜が出ます</p>';
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

async function exportWav() {
  stop();
  toast('音声ファイルを作っています…');
  const sr = 44100;
  const len = Math.ceil((absSec(totalTicks()) + 3) * sr);
  const ctx = new OfflineAudioContext(2, len, sr);
  const comp = ctx.createDynamicsCompressor();
  comp.connect(ctx.destination);
  const graph = buildGraph(ctx, comp, false);
  for (const e of eventList()) scheduleEvent(ctx, graph, e, 0.05 + absSec(e.t), false);
  const buf = await ctx.startRendering();
  download(encodeWav(buf), safeName() + '.wav');
  toast('音声ファイル（WAV）を書き出しました');
  return buf;
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
  const guardRules = (fn) => (e) => { if (song.locks.rules) { renderSettings(); return toast('🔒 ロックされています'); } fn(e); };
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
  $('#key').onchange = guardRules((e) => {
    const nk = +e.target.value;
    const diff = nk - song.key;
    const hasNotes = song.tracks.some((t) => (t.notes && t.notes.length) || (t.chords && t.chords.some(Boolean)));
    const move = hasNotes && confirm('いま入っている音やコードも、新しい調に移しますか？\n（OK＝移す／キャンセル＝調だけ変える）');
    edit(() => {
      song.key = nk;
      if (move) {
        const m = ((diff % 12) + 12) % 12;
        const d = m > 6 ? m - 12 : m;
        for (const t of song.tracks) {
          if (t.type === 'melody' && !t.locked) for (const n of t.notes) n.p = clamp(n.p + d, 21, 108);
          if (t.type === 'chord' && !t.locked) t.chords = t.chords.map((c) => (c ? { ...c, r: (c.r + m) % 12 } : c));
        }
      }
    }, '調');
  });
  $('#scale').onchange = guardRules((e) => edit(() => { song.scale = e.target.value; }, '音階'));
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
  $('#btnNew').onclick = () => { if (confirm('注意：保存していないデータは消えてしまいます。新しい曲を作りますか？')) loadSong(newSong()); };
  $('#btnSample').onclick = () => { if (confirm('注意：保存していないデータは消えてしまいます。サンプル曲を開きますか？')) loadSong(sampleSong()); };
  $('#btnSave').onclick = saveToBrowser;
  $('#btnOpen').onclick = openDialog;
  $('#btnExportJson').onclick = exportJSON;
  $('#btnImportJson').onclick = () => $('#fileIn').click();
  $('#fileIn').onchange = (e) => { if (e.target.files[0]) importFile(e.target.files[0]); e.target.value = ''; };
  $('#btnWav').onclick = () => exportWav().catch((err) => alert('書き出しに失敗しました：' + err.message));
  $('#btnMidi').onclick = exportMidi;
  $('#btnScore').onclick = openScore;
  $('#btnScoreMenu').onclick = openScore;
  $('#btnPrintScore').onclick = printScore;
  $('#btnSvgScore').onclick = () => download(new Blob([$('#scoreView').innerHTML], { type: 'image/svg+xml' }), safeName() + '_楽譜.svg');
  $('#btnScorePanel').onclick = () => { ui.showScore = !ui.showScore; $('#btnScorePanel').classList.toggle('on', ui.showScore); renderScorePanel(); };
  $('#btnPal').onclick = openPalette;
  $('#btnTeach').onclick = openTeacher;
  $('#btnShare').onclick = () => shareDialog().catch((err) => alert('URLを作れませんでした：' + err.message));
  $('#btnCopyUrl').onclick = async () => { try { await navigator.clipboard.writeText($('#shareUrl').value); toast('コピーしました'); } catch (e) { $('#shareUrl').select(); document.execCommand('copy'); toast('コピーしました'); } };
  $('#btnHelp').onclick = () => $('#dlgHelp').showModal();
  $('#btnMidiIn').onclick = connectMidi;
  $('#btnStepRec').onclick = () => {
    ui.stepRec = !ui.stepRec;
    $('#btnStepRec').classList.toggle('on', ui.stepRec);
    if (ui.stepRec) { ui.inputTick = cellStart(ui.startTick); toast('鍵盤入力：A〜Kのキー（またはMIDI鍵盤）で緑の線の所に音が入ります。→で休み、Backspaceで消す'); }
    draw();
  };
  $('#instOk').onclick = () => {
    const tr = song.tracks[picker.ti];
    edit(() => { if (picker.type === 'drum') tr.kit = picker.val; else tr.inst = picker.val; }, '楽器を変更');
    renderTracks();
    $('#dlgInst').close();
  };
  $('#dlgPal').addEventListener('close', () => { renderTracks(); changed(); });
  document.querySelectorAll('dialog .close').forEach((b) => (b.onclick = () => b.closest('dialog').close()));
  document.querySelectorAll('.dropdown .dd button').forEach((b) => b.addEventListener('click', () => b.closest('details').removeAttribute('open')));
  $('#addMelody').onclick = () => addTrack('melody');
  $('#addChord').onclick = () => addTrack('chord');
  $('#addDrum').onclick = () => addTrack('drum');
  $('#btnIns').onclick = insertBars;
  $('#btnDelBars').onclick = deleteBars;
  $('#btnAddFour').onclick = guardRules(() => { edit(() => { song.bars = Math.min(128, song.bars + 4); }, '4小節ふやす'); renderSettings(); });

  const sc = $('#scroller');
  sc.classList.toggle('touchedit', ui.touchEdit);
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
        if (picker.type === 'drum') { const kit = Sound.KITS.find((x) => x.id === picker.val) || Sound.KITS[0]; const id = [...kit.list].reverse()[drumIdx]; if (id) preview({ type: 'drum' }, id); }
        else { const ctx = ensureAudio(); Sound.playNote(ctx, previewOut, picker.val, midi, ctx.currentTime + 0.01, 0.5, 0.8); }
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
  })();
}
init();
