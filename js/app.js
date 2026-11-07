'use strict';
/* ============================================================
   おとつみき — アプリ本体
   ============================================================ */
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = () => Math.random().toString(36).slice(2, 9);

/* ---------- 音楽の基本データ ---------- */
const PC_COLORS = ['#ff5a5f', '#ff7e47', '#ff9f2e', '#ffc02e', '#f5dd2a', '#8fd93a', '#3ccf7a', '#2ec4b6', '#36a6ff', '#5b7bff', '#9b5bff', '#e05bd6'];
const NAMES = {
  doremi: ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'],
  cde: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
  haniho: ['ハ', '嬰ハ', 'ニ', '嬰ニ', 'ホ', 'ヘ', '嬰ヘ', 'ト', '嬰ト', 'イ', '嬰イ', 'ロ'],
};
const KEY_LABELS = ['C (ハ)', 'C# (嬰ハ)', 'D (ニ)', 'E♭ (変ホ)', 'E (ホ)', 'F (ヘ)', 'F# (嬰ヘ)', 'G (ト)', 'A♭ (変イ)', 'A (イ)', 'B♭ (変ロ)', 'B (ロ)'];
const CHORD_ROOT = ['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'A♭', 'A', 'B♭', 'B'];
const SCALES = {
  major: { name: '長音階（ドレミ）', steps: [0, 2, 4, 5, 7, 9, 11] },
  minor: { name: '短音階', steps: [0, 2, 3, 5, 7, 8, 10] },
  penta: { name: 'ヨナ抜き音階（ペンタトニック）', steps: [0, 2, 4, 7, 9] },
  minyo: { name: '民謡音階', steps: [0, 3, 5, 7, 10] },
  miyako: { name: '都節音階', steps: [0, 1, 5, 7, 8] },
  ritsu: { name: '律音階', steps: [0, 2, 5, 7, 9] },
  ryukyu: { name: '沖縄（琉球）音階', steps: [0, 4, 5, 7, 11] },
  blues: { name: 'ブルース音階', steps: [0, 3, 5, 6, 7, 10] },
  whole: { name: '全音音階', steps: [0, 2, 4, 6, 8, 10] },
  chromatic: { name: 'すべての音（半音もぜんぶ）', steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
};
const CHORD_Q = {
  M: { iv: [0, 4, 7], s: '' }, m: { iv: [0, 3, 7], s: 'm' }, 7: { iv: [0, 4, 7, 10], s: '7' },
  M7: { iv: [0, 4, 7, 11], s: 'M7' }, m7: { iv: [0, 3, 7, 10], s: 'm7' }, sus4: { iv: [0, 5, 7], s: 'sus4' },
  dim: { iv: [0, 3, 6], s: 'dim' }, aug: { iv: [0, 4, 8], s: 'aug' },
};
const CHORD_PATTERNS = {
  whole: 'じゃーん（のばす）',
  beat: 'ジャン・ジャン（拍ごと）',
  arp: 'ポロロン（分散和音）',
  waltz: 'ズン・チャッ・チャッ（ワルツ風）',
  march: 'ズン・チャッ（マーチ風）',
};
const RANGES = { soprano: ['ソプラノ（ド4〜ド6）', 60], alto: ['アルト（ソ3〜ソ5）', 55], tenor: ['テノール（ド3〜ド5）', 48], bass: ['ベース（ド2〜ド4）', 36] };
const TRACK_COLORS = ['#ff6b6b', '#4dabf7', '#51cf66', '#fcc419', '#cc5de8', '#ff922b', '#20c997', '#748ffc'];

/* ---------- 曲データ ---------- */
function newTrack(type, opts = {}) {
  const base = { id: uid(), type, vol: 0.8, mute: false, solo: false };
  if (type === 'melody') return { ...base, name: 'メロディ', inst: 'recorder', range: 'soprano', notes: [], ...opts };
  if (type === 'chord') return { ...base, name: 'コード伴奏', inst: 'piano', vol: 0.55, pattern: 'beat', bassOn: true, chords: [], ...opts };
  return { ...base, name: 'リズム', grid: {}, ...opts };
}
function newSong() {
  return {
    v: 1, title: 'あたらしい曲', bpm: 100, meter: [4, 4], res: 8, bars: 8, key: 0, scale: 'major',
    swing: 0, reverb: 0.25,
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
  const mel = [[64, 2], [67, 2], [69, 2], [67, 2], [64, 2], [62, 2], [60, 4], [62, 2], [64, 2], [67, 2], [64, 2], [62, 6], [0, 2],
    [64, 2], [67, 2], [69, 2], [72, 2], [74, 2], [72, 2], [69, 4], [67, 2], [64, 2], [62, 2], [64, 2], [60, 8]];
  let st = 0;
  for (const [p, l] of mel) { if (p) s.tracks[0].notes.push({ s: st, p, l }); st += l; }
  const low = [[60, 8], [57, 8], [59, 8], [55, 8], [57, 8], [60, 8], [59, 8], [55, 8]];
  st = 0;
  for (const [p, l] of low) { s.tracks[1].notes.push({ s: st, p, l }); st += l; }
  s.tracks[1].vol = 0.5;
  s.tracks[2].chords = [{ r: 0, q: 'M' }, { r: 9, q: 'm' }, { r: 7, q: 'M' }, { r: 7, q: '7' }, { r: 9, q: 'm' }, { r: 5, q: 'M' }, { r: 7, q: 'M' }, { r: 0, q: 'M' }];
  const g = s.tracks[3].grid;
  g.kick = {}; g.snare = {}; g.hihat = {};
  for (let b = 0; b < 8; b++) {
    const o = b * 8;
    g.kick[o] = 2; g.kick[o + 4] = 1; g.snare[o + 2] = 1; g.snare[o + 6] = 1;
    for (let i = 0; i < 8; i++) g.hihat[o + i] = i % 2 ? 1 : 2;
  }
  g.cymbal = { 0: 2, 56: 2 };
  return s;
}

/* ---------- 状態 ---------- */
let song = newSong();
let cur = 0; // 選択中のトラック
const ui = { cw: 28, rh: 22, names: 'doremi', defLen: 2, startStep: 0, loopOn: true, metro: false, loopRange: null, selBar: 0, follow: true };
let version = 0;
const undoStack = [];
const redoStack = [];

const stepsPerBar = () => song.meter[0] * (song.res / song.meter[1]);
const beatSteps = () => Math.max(1, song.res / song.meter[1]) * (song.meter[1] === 8 && song.meter[0] % 3 === 0 ? 3 : 1);
const totalSteps = () => stepsPerBar() * song.bars;
const stepDur = () => (60 / song.bpm) * (4 / song.res);
const track = () => song.tracks[cur];
const scalePcs = () => new Set(SCALES[song.scale].steps.map((x) => (x + song.key) % 12));

function noteName(m, withOct = false) {
  const pc = ((m % 12) + 12) % 12;
  let n;
  if (ui.names === 'movable') n = NAMES.doremi[(pc - song.key + 12) % 12];
  else n = NAMES[ui.names][pc];
  return withOct ? n + (Math.floor(m / 12) - 1) : n;
}
function chordName(c) { return c ? CHORD_ROOT[c.r] + CHORD_Q[c.q].s : ''; }

/* ---------- 元に戻す ---------- */
function snapshot() { return JSON.stringify(song); }
function pushUndo(snap) {
  undoStack.push(snap);
  if (undoStack.length > 200) undoStack.shift();
  redoStack.length = 0;
  updateUndoButtons();
}
function edit(fn) {
  const snap = snapshot();
  fn();
  if (snapshot() !== snap) pushUndo(snap);
  changed();
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  song = JSON.parse(undoStack.pop());
  cur = clamp(cur, 0, song.tracks.length - 1);
  changed(true);
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  song = JSON.parse(redoStack.pop());
  cur = clamp(cur, 0, song.tracks.length - 1);
  changed(true);
}
function updateUndoButtons() {
  $('#btnUndo').disabled = !undoStack.length;
  $('#btnRedo').disabled = !redoStack.length;
}
let autosaveTimer = null;
function changed(full = false) {
  version++;
  if (full) { renderSettings(); renderTracks(); }
  renderEditorTools();
  resizeEditor();
  draw();
  updateUndoButtons();
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => { try { localStorage.setItem('otsumiki-autosave', snapshot()); } catch (e) { /* 保存できなくても続ける */ } }, 500);
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

function buildGraph(ctx, dest) {
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(dest);
  const rev = Sound.makeReverb(ctx, 2.2);
  const wet = ctx.createGain();
  wet.gain.value = song.reverb * 0.6;
  rev.connect(wet);
  wet.connect(master);
  const outs = {};
  for (const tr of song.tracks) {
    const g = ctx.createGain();
    g.gain.value = tr.vol;
    g.connect(master);
    g.connect(rev);
    outs[tr.id] = g;
  }
  const metro = ctx.createGain();
  metro.connect(master);
  return { master, outs, metro, wet };
}

// 1ステップごとに鳴らすものを前もって整理
let evCache = { v: -1, map: null };
function chordEvents(tr) {
  const spb = stepsPerBar();
  const bs = beatSteps();
  const ev = [];
  for (let b = 0; b < song.bars; b++) {
    const c = tr.chords[b];
    if (!c) continue;
    let root = 48 + ((c.r - 48) % 12 + 12) % 12; // C3〜B3
    if (root > 54) root -= 12;
    const tones = CHORD_Q[c.q].iv.map((x) => root + 12 + x);
    const bass = root - 12 + (root < 43 ? 12 : 0);
    const o = b * spb;
    const push = (s, p, l, v = 0.7) => ev.push({ s: o + s, p, l, v });
    const pat = tr.pattern;
    if (pat === 'whole') {
      tones.forEach((p) => push(0, p, spb, 0.6));
      if (tr.bassOn) push(0, bass, spb, 0.8);
    } else if (pat === 'beat') {
      for (let s = 0; s < spb; s += bs) {
        tones.forEach((p) => push(s, p, Math.max(1, bs - 0.3), s === 0 ? 0.65 : 0.5));
        if (tr.bassOn) push(s, bass, Math.max(1, bs - 0.3), 0.75);
      }
    } else if (pat === 'arp') {
      const seq = [tones[0], tones[1], tones[2], tones[0] + 12, tones[2], tones[1]];
      const unit = Math.max(1, song.res / 8);
      let i = 0;
      for (let s = 0; s < spb; s += unit) push(s, seq[i++ % seq.length], unit * 1.6, 0.55);
      if (tr.bassOn) push(0, bass, spb, 0.7);
    } else if (pat === 'waltz' || pat === 'march') {
      for (let s = 0, k = 0; s < spb; s += bs, k++) {
        const first = pat === 'waltz' ? k % 3 === 0 : k % 2 === 0;
        if (first) { if (tr.bassOn) push(s, bass, bs * 0.9, 0.85); else push(s, tones[0], bs * 0.9, 0.6); }
        else tones.forEach((p) => push(s, p, bs * 0.6, 0.45));
      }
    }
  }
  return ev;
}
function eventMap() {
  if (evCache.v === version) return evCache.map;
  const map = new Map();
  const add = (s, e) => { if (!map.has(s)) map.set(s, []); map.get(s).push(e); };
  for (const tr of song.tracks) {
    if (tr.type === 'melody') for (const n of tr.notes) add(n.s, { tr, kind: 'note', p: n.p, l: n.l, v: 0.8 });
    else if (tr.type === 'chord') for (const n of chordEvents(tr)) add(n.s, { tr, kind: 'note', p: n.p, l: n.l, v: n.v });
    else for (const id in tr.grid) for (const s in tr.grid[id]) add(+s, { tr, kind: 'drum', id, v: tr.grid[id][s] === 2 ? 1 : 0.6 });
  }
  evCache = { v: version, map };
  return map;
}
function audible(tr) {
  if (tr.mute) return false;
  const anySolo = song.tracks.some((t) => t.solo);
  return anySolo ? tr.solo : true;
}
function stepLen(step) {
  const d = stepDur();
  if (!song.swing) return d;
  const sw = song.swing * 0.33;
  return step % 2 === 0 ? d * (1 + sw) : d * (1 - sw);
}
function scheduleStep(ctx, graph, step, t, withMetro) {
  const evs = eventMap().get(step);
  if (evs) {
    for (const e of evs) {
      if (!audible(e.tr)) continue;
      const out = graph.outs[e.tr.id];
      if (!out) continue;
      if (e.kind === 'note') Sound.playNote(ctx, out, e.tr.inst, e.p, t, e.l * stepDur() * 0.96, e.v);
      else Sound.playDrum(ctx, out, e.id, t, e.v);
    }
  }
  if (withMetro && step % beatSteps() === 0) Sound.click(ctx, graph.metro, t, step % stepsPerBar() === 0);
}

const player = { on: false, timer: null, graph: null, step: 0, next: 0, queue: [], end: 0, loopStart: 0, stopping: false };
function loopBounds() {
  const spb = stepsPerBar();
  if (ui.loopRange) return [ui.loopRange[0] * spb, Math.min(ui.loopRange[1] * spb, totalSteps())];
  return [0, totalSteps()];
}
function play() {
  const ctx = ensureAudio();
  stop(true);
  const [ls, le] = loopBounds();
  player.graph = buildGraph(ctx, ctx._comp);
  player.on = true;
  player.stopping = false;
  player.loopStart = ls;
  player.end = le;
  player.step = ui.startStep >= ls && ui.startStep < le ? ui.startStep : ls;
  player.next = ctx.currentTime + 0.08;
  player.queue = [];
  player.timer = setInterval(tick, 25);
  tick();
  $('#btnPlay').classList.add('on');
  $('#btnPlay').textContent = '⏸';
  requestAnimationFrame(anim);
}
function tick() {
  const ctx = actx;
  while (player.on && !player.stopping && player.next < ctx.currentTime + 0.12) {
    const [ls, le] = loopBounds();
    player.loopStart = ls;
    player.end = le;
    if (player.step >= le || player.step < ls && ui.loopRange) {
      if (ui.loopOn) player.step = ls;
      else { player.stopping = true; player.stopAt = player.next; break; }
    }
    scheduleStep(ctx, player.graph, player.step, player.next, ui.metro);
    player.queue.push({ step: player.step, t: player.next, d: stepLen(player.step) });
    player.next += stepLen(player.step);
    player.step++;
  }
  if (player.stopping && ctx.currentTime > player.stopAt + 0.05) stop();
}
function stop(silent = false) {
  if (player.timer) clearInterval(player.timer);
  player.timer = null;
  if (player.graph && actx) {
    const g = player.graph.master.gain;
    g.setTargetAtTime(0, actx.currentTime, 0.03);
    const old = player.graph.master;
    setTimeout(() => old.disconnect(), 400);
  }
  player.graph = null;
  player.on = false;
  player.queue = [];
  if (!silent) {
    $('#btnPlay').classList.remove('on');
    $('#btnPlay').textContent = '▶';
    draw();
  }
}
function playheadPos() {
  if (!player.on || !actx) return null;
  const now = actx.currentTime;
  const q = player.queue;
  while (q.length > 1 && q[1].t <= now) q.shift();
  if (!q.length || q[0].t > now) return null;
  return q[0].step + Math.min(1, (now - q[0].t) / q[0].d);
}
function anim() {
  if (!player.on) return;
  const pos = playheadPos();
  if (pos != null && ui.follow) {
    const sc = $('#scroller');
    const x = LW + pos * ui.cw;
    const viewW = sc.clientWidth - LW;
    if (x - sc.scrollLeft > sc.clientWidth - 40 || x - sc.scrollLeft < LW) sc.scrollLeft = Math.max(0, x - LW - viewW * 0.1);
  }
  draw(pos);
  requestAnimationFrame(anim);
}
function liveVolume(tr) {
  if (player.graph && player.graph.outs[tr.id]) player.graph.outs[tr.id].gain.setTargetAtTime(tr.vol, actx.currentTime, 0.02);
}
function preview(tr, p) {
  const ctx = ensureAudio();
  if (tr.type === 'drum') Sound.playDrum(ctx, previewOut, p, ctx.currentTime + 0.01, 0.8);
  else Sound.playNote(ctx, previewOut, tr.inst, p, ctx.currentTime + 0.01, 0.35, 0.8 * tr.vol + 0.2);
}

/* ============================================================
   エディタ（マス目）の描画
   ============================================================ */
const LW = 78; // 左の音名の幅
const RH = 28; // 上の小節番号の高さ
const cv = $('#cv');
const g2 = cv.getContext('2d');

function rowsFor(tr) {
  if (tr.type === 'drum') return Sound.DRUM_ORDER.map((id) => ({ id, label: Sound.DRUMS[id].name }));
  if (tr.type === 'chord') return [{ id: 'chord', label: 'コード' }];
  const lo = RANGES[tr.range][1];
  const hi = lo + 24;
  const pcs = scalePcs();
  const used = new Set(tr.notes.map((n) => n.p));
  const rows = [];
  for (let m = hi; m >= lo; m--) {
    const pc = m % 12;
    if (pcs.has(pc) || used.has(m)) rows.push({ id: m, p: m, inScale: pcs.has(pc) });
  }
  for (const n of tr.notes) if (n.p > hi || n.p < lo) { if (!rows.some((r) => r.p === n.p)) rows.push({ id: n.p, p: n.p, inScale: pcs.has(n.p % 12) }); }
  rows.sort((a, b) => b.p - a.p);
  return rows;
}
function rowH(tr) { return tr.type === 'chord' ? 70 : ui.rh; }

function resizeEditor() {
  const wrap = $('#editorWrap');
  const tr = track();
  const rows = rowsFor(tr);
  const spacer = $('#spacer');
  spacer.style.width = LW + totalSteps() * ui.cw + 60 + 'px';
  spacer.style.height = RH + rows.length * rowH(tr) + 4 + 'px';
  const dpr = window.devicePixelRatio || 1;
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
  }
}

function roundRect(x, y, w, h, r) {
  g2.beginPath();
  g2.moveTo(x + r, y);
  g2.arcTo(x + w, y, x + w, y + h, r);
  g2.arcTo(x + w, y + h, x, y + h, r);
  g2.arcTo(x, y + h, x, y, r);
  g2.arcTo(x, y, x + w, y, r);
  g2.closePath();
}

function draw(playPos) {
  if (playPos === undefined) playPos = playheadPos();
  const tr = track();
  if (!tr) return;
  const sc = $('#scroller');
  const dpr = window.devicePixelRatio || 1;
  const W = cv.width / dpr;
  const H = cv.height / dpr;
  const sx = sc.scrollLeft;
  const sy = sc.scrollTop;
  const cw = ui.cw;
  const rh = rowH(tr);
  const rows = rowsFor(tr);
  const total = totalSteps();
  const spb = stepsPerBar();
  const bs = beatSteps();
  const css = getComputedStyle(document.documentElement);
  const C = (n) => css.getPropertyValue(n).trim();

  g2.setTransform(dpr, 0, 0, dpr, 0, 0);
  g2.fillStyle = C('--grid-bg');
  g2.fillRect(0, 0, W, H);

  const s0 = Math.max(0, Math.floor((sx) / cw));
  const s1 = Math.min(total, Math.ceil((sx + W - LW) / cw) + 1);
  const r0 = Math.max(0, Math.floor(sy / rh));
  const r1 = Math.min(rows.length, Math.ceil((sy + H - RH) / rh) + 1);

  g2.save();
  g2.beginPath();
  g2.rect(LW, RH, W - LW, H - RH);
  g2.clip();

  // 行の背景
  for (let r = r0; r < r1; r++) {
    const y = RH + r * rh - sy;
    const row = rows[r];
    let bg = r % 2 ? C('--row-a') : C('--row-b');
    if (tr.type === 'melody') {
      if (row.p % 12 === song.key) bg = C('--row-tonic');
      if (!row.inScale) bg = C('--row-out');
    }
    g2.fillStyle = bg;
    g2.fillRect(LW, y, W - LW, rh);
  }
  // 小節ごとの色分け
  for (let b = Math.floor(s0 / spb); b * spb < s1; b++) {
    if (b % 2) {
      g2.fillStyle = C('--bar-shade');
      g2.fillRect(LW + b * spb * cw - sx, RH, spb * cw, H);
    }
  }
  // 曲の終わり以降
  const endX = LW + total * cw - sx;
  if (endX < W) { g2.fillStyle = C('--outside'); g2.fillRect(endX, RH, W - endX, H); }
  // 縦線
  for (let s = s0; s <= s1; s++) {
    const x = LW + s * cw - sx + 0.5;
    g2.strokeStyle = s % spb === 0 ? C('--line-bar') : s % bs === 0 ? C('--line-beat') : C('--line-step');
    g2.lineWidth = s % spb === 0 ? 2 : 1;
    g2.beginPath(); g2.moveTo(x, RH); g2.lineTo(x, H); g2.stroke();
  }
  // 横線
  g2.strokeStyle = C('--line-step');
  g2.lineWidth = 1;
  for (let r = r0; r <= r1; r++) {
    const y = RH + r * rh - sy + 0.5;
    g2.beginPath(); g2.moveTo(LW, y); g2.lineTo(W, y); g2.stroke();
  }

  const rowIndex = new Map(rows.map((r, i) => [r.id, i]));
  const playing = playPos != null ? Math.floor(playPos) : -1;

  if (tr.type === 'melody') {
    // ほかのメロディトラックをうすく表示（ハモリや輪唱づくりに便利）
    song.tracks.forEach((o, oi) => {
      if (o === tr || o.type !== 'melody' || !ui.ghost) return;
      g2.strokeStyle = TRACK_COLORS[oi % TRACK_COLORS.length];
      g2.setLineDash([4, 3]);
      g2.lineWidth = 1.5;
      for (const n of o.notes) {
        const ri = rowIndex.get(n.p);
        if (ri == null) continue;
        const x = LW + n.s * cw - sx;
        const y = RH + ri * rh - sy;
        if (x > W || x + n.l * cw < LW) continue;
        roundRect(x + 2, y + 3, n.l * cw - 4, rh - 6, 5);
        g2.stroke();
      }
      g2.setLineDash([]);
    });
    g2.font = `bold ${Math.min(13, rh - 8)}px sans-serif`;
    g2.textBaseline = 'middle';
    for (const n of tr.notes) {
      const ri = rowIndex.get(n.p);
      if (ri == null) continue;
      const x = LW + n.s * cw - sx;
      const y = RH + ri * rh - sy;
      const w = n.l * cw;
      if (x > W || x + w < LW || y > H || y + rh < RH) continue;
      const on = playing >= n.s && playing < n.s + n.l;
      g2.fillStyle = PC_COLORS[n.p % 12];
      roundRect(x + 1.5, y + 1.5, w - 3, rh - 3, 5);
      g2.fill();
      g2.lineWidth = on ? 3 : 1;
      g2.strokeStyle = on ? '#fff' : 'rgba(0,0,0,.35)';
      g2.stroke();
      if (n.s + n.l > total) { g2.fillStyle = 'rgba(0,0,0,.3)'; g2.fill(); }
      if (w > 22) {
        g2.fillStyle = '#1b1b1b';
        g2.fillText(noteName(n.p), x + 6, y + rh / 2 + 1, w - 10);
      }
      // 長さを変えるつまみ
      g2.fillStyle = 'rgba(0,0,0,.25)';
      g2.fillRect(x + w - 6, y + 5, 3, rh - 10);
    }
  } else if (tr.type === 'drum') {
    for (const id in tr.grid) {
      const ri = rowIndex.get(id);
      if (ri == null) continue;
      const y = RH + ri * rh - sy;
      for (const s in tr.grid[id]) {
        const st = +s;
        if (st < s0 - 1 || st > s1) continue;
        const v = tr.grid[id][s];
        const x = LW + st * cw - sx;
        const on = playing === st;
        g2.fillStyle = TRACK_COLORS[(ri + 2) % TRACK_COLORS.length];
        g2.globalAlpha = v === 2 ? 1 : 0.6;
        const pad = v === 2 ? 2 : 4;
        roundRect(x + pad, y + pad, cw - pad * 2, rh - pad * 2, 4);
        g2.fill();
        g2.globalAlpha = 1;
        if (on) { g2.strokeStyle = '#fff'; g2.lineWidth = 3; g2.stroke(); }
        if (v === 2 && cw > 18) { g2.fillStyle = '#222'; g2.font = 'bold 11px sans-serif'; g2.textAlign = 'center'; g2.fillText('強', x + cw / 2, y + rh / 2 + 1); g2.textAlign = 'left'; }
      }
    }
  } else if (tr.type === 'chord') {
    const y = RH - sy;
    for (let b = Math.floor(s0 / spb); b < song.bars && b * spb < s1; b++) {
      const x = LW + b * spb * cw - sx;
      const w = spb * cw;
      const c = tr.chords[b];
      if (b === ui.selBar) {
        g2.fillStyle = C('--sel');
        g2.fillRect(x + 2, y + 2, w - 4, rh - 4);
      }
      if (c) {
        g2.fillStyle = PC_COLORS[c.r];
        roundRect(x + 6, y + 10, w - 12, rh - 20, 8);
        g2.fill();
        g2.fillStyle = '#1b1b1b';
        g2.font = `bold ${Math.min(26, w / 3)}px sans-serif`;
        g2.textAlign = 'center';
        g2.textBaseline = 'middle';
        g2.fillText(chordName(c), x + w / 2, y + rh / 2, w - 16);
        g2.textAlign = 'left';
      } else {
        g2.fillStyle = C('--muted');
        g2.font = '13px sans-serif';
        g2.textAlign = 'center';
        g2.textBaseline = 'middle';
        g2.fillText(b === ui.selBar ? '↓下から選ぶ' : '（なし）', x + w / 2, y + rh / 2, w - 8);
        g2.textAlign = 'left';
      }
    }
  }

  // 再生位置
  if (playPos != null) {
    const x = LW + playPos * cw - sx;
    g2.strokeStyle = C('--playhead');
    g2.lineWidth = 2;
    g2.beginPath(); g2.moveTo(x, RH); g2.lineTo(x, H); g2.stroke();
  }
  g2.restore();

  // 上の小節番号
  g2.fillStyle = C('--ruler');
  g2.fillRect(0, 0, W, RH);
  g2.save();
  g2.beginPath(); g2.rect(LW, 0, W - LW, RH); g2.clip();
  if (ui.loopRange) {
    const x0 = LW + ui.loopRange[0] * spb * cw - sx;
    const x1 = LW + ui.loopRange[1] * spb * cw - sx;
    g2.fillStyle = C('--loop');
    g2.fillRect(x0, 0, x1 - x0, RH);
  }
  g2.font = 'bold 12px sans-serif';
  g2.textBaseline = 'middle';
  for (let b = Math.floor(s0 / spb); b < song.bars && b * spb < s1; b++) {
    const x = LW + b * spb * cw - sx;
    g2.fillStyle = C('--text');
    g2.fillText(String(b + 1), x + 5, RH / 2);
    g2.strokeStyle = C('--line-bar');
    g2.beginPath(); g2.moveTo(x + 0.5, RH * 0.35); g2.lineTo(x + 0.5, RH); g2.stroke();
    for (let s = bs; s < spb; s += bs) {
      const xb = x + s * cw + 0.5;
      g2.strokeStyle = C('--line-beat');
      g2.beginPath(); g2.moveTo(xb, RH * 0.7); g2.lineTo(xb, RH); g2.stroke();
    }
  }
  // 再生開始位置マーク
  const sxm = LW + ui.startStep * cw - sx;
  g2.fillStyle = C('--playhead');
  g2.beginPath(); g2.moveTo(sxm - 6, 0); g2.lineTo(sxm + 6, 0); g2.lineTo(sxm, 9); g2.closePath(); g2.fill();
  if (playPos != null) {
    const x = LW + playPos * cw - sx;
    g2.fillRect(x - 1, 0, 2, RH);
  }
  g2.restore();

  // 左の音名・楽器名
  g2.fillStyle = C('--label-bg');
  g2.fillRect(0, RH, LW, H - RH);
  g2.save();
  g2.beginPath(); g2.rect(0, RH, LW, H - RH); g2.clip();
  for (let r = r0; r < r1; r++) {
    const y = RH + r * rh - sy;
    const row = rows[r];
    if (tr.type === 'melody') {
      const black = [1, 3, 6, 8, 10].includes(row.p % 12);
      g2.fillStyle = black ? '#3a3a46' : '#fafafa';
      g2.fillRect(LW - 22, y + 1, 21, rh - 2);
      g2.fillStyle = PC_COLORS[row.p % 12];
      g2.fillRect(2, y + 2, 6, rh - 4);
      g2.fillStyle = row.inScale ? C('--text') : C('--muted');
      g2.font = `${row.p % 12 === song.key ? 'bold ' : ''}${Math.min(13, rh - 7)}px sans-serif`;
      g2.textBaseline = 'middle';
      g2.fillText(noteName(row.p) + (row.p % 12 === 0 ? (Math.floor(row.p / 12) - 1) : ''), 12, y + rh / 2 + 1, LW - 38);
    } else {
      g2.fillStyle = C('--text');
      g2.font = `${tr.type === 'chord' ? 14 : Math.min(12, rh - 8)}px sans-serif`;
      g2.textBaseline = 'middle';
      g2.fillText(row.label, 6, y + rh / 2 + 1, LW - 10);
    }
    g2.strokeStyle = C('--line-step');
    g2.beginPath(); g2.moveTo(0, y + rh + 0.5); g2.lineTo(LW, y + rh + 0.5); g2.stroke();
  }
  g2.restore();
  g2.fillStyle = C('--ruler');
  g2.fillRect(0, 0, LW, RH);
  g2.fillStyle = C('--muted');
  g2.font = '11px sans-serif';
  g2.textBaseline = 'middle';
  g2.fillText('小節 →', 8, RH / 2);
  g2.strokeStyle = C('--line-bar');
  g2.beginPath(); g2.moveTo(LW + 0.5, 0); g2.lineTo(LW + 0.5, H); g2.stroke();
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
  const step = Math.floor(cx / ui.cw);
  const ri = Math.floor((py + sc.scrollTop - RH) / rh);
  return { px, py, cx, step, ri, row: rows[ri], area: py < RH ? 'ruler' : px < LW ? 'label' : 'grid' };
}
function findNote(tr, step, p) {
  for (let i = tr.notes.length - 1; i >= 0; i--) {
    const n = tr.notes[i];
    if (n.p === p && step >= n.s && step < n.s + n.l) return n;
  }
  return null;
}
function onDown(e) {
  if (e.button > 0) return;
  const h = hitInfo(e);
  const tr = track();
  const isTouch = e.pointerType === 'touch';
  if (h.area === 'ruler') {
    const bar = clamp(Math.floor(h.step / stepsPerBar()), 0, song.bars - 1);
    drag = { kind: 'ruler', b0: bar, b1: bar, moved: false, isTouch };
    return;
  }
  if (h.area === 'label') {
    if (h.row) preview(tr, tr.type === 'drum' ? h.row.id : h.row.p);
    return;
  }
  if (h.step < 0 || h.step >= totalSteps() || !h.row) return;
  if (isTouch) { drag = { kind: 'tap', h, x: e.clientX, y: e.clientY }; return; }
  e.preventDefault();
  $('#scroller').setPointerCapture(e.pointerId);
  const snap = snapshot();
  if (tr.type === 'melody') {
    const n = findNote(tr, h.step, h.row.p);
    if (n) {
      const xEnd = (n.s + n.l) * ui.cw;
      if (xEnd - h.cx < Math.min(10, n.l * ui.cw * 0.35)) drag = { kind: 'resize', n, snap };
      else drag = { kind: 'move', n, snap, off: h.step - n.s, ri: h.ri, moved: false, os: n.s, op: n.p };
    } else {
      const l = Math.min(ui.defLen, totalSteps() - h.step);
      const nn = { s: h.step, p: h.row.p, l };
      tr.notes.push(nn);
      preview(tr, nn.p);
      drag = { kind: 'resize', n: nn, snap };
      version++;
    }
  } else if (tr.type === 'drum') {
    const id = h.row.id;
    const v = (tr.grid[id] && tr.grid[id][h.step]) || 0;
    const nv = (v + 1) % 3;
    setCell(tr, id, h.step, nv);
    if (nv) preview(tr, id);
    drag = { kind: 'paint', id, val: nv, snap };
  } else if (tr.type === 'chord') {
    ui.selBar = clamp(Math.floor(h.step / stepsPerBar()), 0, song.bars - 1);
    renderEditorTools();
    const c = tr.chords[ui.selBar];
    if (c) previewChord(tr, c);
  }
  draw();
}
function setCell(tr, id, step, v) {
  if (!tr.grid[id]) tr.grid[id] = {};
  if (v) tr.grid[id][step] = v;
  else delete tr.grid[id][step];
  if (!Object.keys(tr.grid[id]).length) delete tr.grid[id];
  version++;
}
function onMove(e) {
  if (!drag) return;
  const h = hitInfo(e);
  const tr = track();
  if (drag.kind === 'ruler') {
    const bar = clamp(Math.floor(h.step / stepsPerBar()), 0, song.bars - 1);
    if (bar !== drag.b1) { drag.b1 = bar; drag.moved = true; }
    if (drag.moved) {
      ui.loopRange = [Math.min(drag.b0, drag.b1), Math.max(drag.b0, drag.b1) + 1];
      draw();
    }
    return;
  }
  if (drag.kind === 'tap') return;
  if (drag.kind === 'resize') {
    drag.n.l = clamp(h.step - drag.n.s + 1, 1, totalSteps() - drag.n.s);
    version++;
  } else if (drag.kind === 'move') {
    const rows = rowsFor(tr);
    const ns = clamp(h.step - drag.off, 0, totalSteps() - drag.n.l);
    const row = rows[clamp(h.ri, 0, rows.length - 1)];
    if (ns !== drag.n.s || row.p !== drag.n.p) {
      if (row.p !== drag.n.p) preview(tr, row.p);
      drag.n.s = ns;
      drag.n.p = row.p;
      drag.moved = true;
      version++;
    }
  } else if (drag.kind === 'paint') {
    if (h.row && h.step >= 0 && h.step < totalSteps()) {
      const cur = (tr.grid[h.row.id] && tr.grid[h.row.id][h.step]) || 0;
      if (cur !== drag.val) { setCell(tr, h.row.id, h.step, drag.val); if (drag.val) preview(tr, h.row.id); }
    }
  }
  draw();
}
function onUp(e) {
  if (!drag) return;
  const tr = track();
  const d = drag;
  drag = null;
  if (d.kind === 'ruler') {
    if (!d.moved) {
      ui.startStep = d.b0 * stepsPerBar();
      if (ui.loopRange && (d.b0 < ui.loopRange[0] || d.b0 >= ui.loopRange[1])) ui.loopRange = null;
      if (player.on) play();
    }
    renderLoopInfo();
    draw();
    return;
  }
  if (d.kind === 'tap') {
    // タッチ操作：タップで置く／消す
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) return;
    const h = d.h;
    edit(() => {
      if (tr.type === 'melody') {
        const n = findNote(tr, h.step, h.row.p);
        if (n) tr.notes.splice(tr.notes.indexOf(n), 1);
        else { tr.notes.push({ s: h.step, p: h.row.p, l: Math.min(ui.defLen, totalSteps() - h.step) }); preview(tr, h.row.p); }
      } else if (tr.type === 'drum') {
        const v = (tr.grid[h.row.id] && tr.grid[h.row.id][h.step]) || 0;
        setCell(tr, h.row.id, h.step, (v + 1) % 3);
        if (v < 2) preview(tr, h.row.id);
      } else if (tr.type === 'chord') {
        ui.selBar = clamp(Math.floor(h.step / stepsPerBar()), 0, song.bars - 1);
        const c = tr.chords[ui.selBar];
        if (c) previewChord(tr, c);
      }
    });
    return;
  }
  if (d.kind === 'move' && !d.moved) {
    tr.notes.splice(tr.notes.indexOf(d.n), 1);
  }
  if (tr.type === 'melody') {
    // 同じ場所・同じ高さの重なりを整理
    const seen = new Set();
    tr.notes = tr.notes.filter((n) => { const k = n.s + ':' + n.p; if (seen.has(k)) return false; seen.add(k); return true; });
  }
  if (d.snap && snapshot() !== d.snap) pushUndo(d.snap);
  changed();
}

/* ============================================================
   コード（和音）
   ============================================================ */
function diatonic() {
  const k = song.key;
  const minorish = ['minor', 'minyo', 'miyako', 'blues'].includes(song.scale);
  const list = minorish
    ? [[0, 'm', 'Ⅰm'], [5, 'm', 'Ⅳm'], [7, 'm', 'Ⅴm'], [7, '7', 'Ⅴ7'], [8, 'M', '♭Ⅵ'], [10, 'M', '♭Ⅶ'], [3, 'M', '♭Ⅲ'], [2, 'dim', 'Ⅱdim']]
    : [[0, 'M', 'Ⅰ'], [5, 'M', 'Ⅳ'], [7, 'M', 'Ⅴ'], [7, '7', 'Ⅴ7'], [9, 'm', 'Ⅵm'], [2, 'm', 'Ⅱm'], [4, 'm', 'Ⅲm'], [0, 'M7', 'ⅠM7']];
  return list.map(([iv, q, deg]) => ({ r: (k + iv) % 12, q, deg }));
}
function previewChord(tr, c) {
  const ctx = ensureAudio();
  const root = 48 + ((c.r % 12) + 12) % 12;
  CHORD_Q[c.q].iv.forEach((x) => Sound.playNote(ctx, previewOut, tr.inst, root + 12 + x - (root > 54 ? 12 : 0), ctx.currentTime + 0.01, 0.6, 0.5));
}
function setChord(c) {
  const tr = track();
  edit(() => {
    while (tr.chords.length < song.bars) tr.chords.push(null);
    tr.chords[ui.selBar] = c;
    if (c) previewChord(tr, c);
    if (ui.selBar < song.bars - 1) ui.selBar++;
  });
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
  const lo = RANGES[tr.range][1];
  const tones = scaleDegreesInRange(lo + 2, lo + 16);
  const chordTr = song.tracks.find((t) => t.type === 'chord' && t.chords.some(Boolean));
  const spb = stepsPerBar();
  const e = Math.max(1, song.res / 8); // 8分音符のステップ数
  const notes = [];
  let idx = tones.findIndex((m) => m % 12 === song.key && m >= lo + 5);
  if (idx < 0) idx = Math.floor(tones.length / 2);
  const rhythms = [[2, 2, 2, 2], [2, 1, 1, 2, 2], [4, 2, 2], [1, 1, 2, 2, 2], [2, 2, 4], [3, 1, 2, 2], [2, 2, 1, 1, 2]];
  for (let b = 0; b < song.bars; b++) {
    const last = b === song.bars - 1;
    let pattern;
    if (last) pattern = [spb / e];
    else {
      pattern = rhythms[Math.floor(Math.random() * rhythms.length)].slice();
      let sum = pattern.reduce((a, x) => a + x, 0);
      const need = spb / e;
      while (sum > need) { sum -= pattern.pop(); }
      if (sum < need) pattern.push(need - sum);
      if (b % 4 === 3) pattern = [Math.max(1, need - 2), ...(need > 2 ? [2] : [])].slice(0, need > 2 ? 2 : 1);
    }
    let s = b * spb;
    const c = chordTr && chordTr.chords[b];
    const chordPcs = c ? new Set(CHORD_Q[c.q].iv.map((x) => (c.r + x) % 12)) : null;
    pattern.forEach((len, k) => {
      if (last) {
        let best = idx;
        let bd = 99;
        tones.forEach((m, i) => { if (m % 12 === song.key && Math.abs(i - idx) < bd) { bd = Math.abs(i - idx); best = i; } });
        idx = best;
      } else {
        let step = [-2, -1, -1, 0, 1, 1, 2, 3, -3][Math.floor(Math.random() * 9)];
        idx = clamp(idx + step, 0, tones.length - 1);
        if (chordPcs && k === 0) {
          // 小節の頭はコードの音に寄せる
          for (const d of [0, 1, -1, 2, -2]) {
            const j = clamp(idx + d, 0, tones.length - 1);
            if (chordPcs.has(tones[j] % 12)) { idx = j; break; }
          }
        }
      }
      if (!(Math.random() < 0.07 && k > 0 && !last)) notes.push({ s, p: tones[idx], l: len * e });
      s += len * e;
    });
  }
  tr.notes = notes;
}
function shiftCopy(src, dst, bars) {
  const off = bars * stepsPerBar();
  dst.notes = src.notes.filter((n) => n.s + off < totalSteps()).map((n) => ({ s: n.s + off, p: n.p, l: Math.min(n.l, totalSteps() - n.s - off) }));
}
function transpose(tr, semis) {
  for (const n of tr.notes) n.p = clamp(n.p + semis, 24, 108);
}
function transposeDegree(tr, dir) {
  const all = scaleDegreesInRange(24, 108);
  for (const n of tr.notes) {
    let i = all.indexOf(n.p);
    if (i < 0) { i = all.findIndex((m) => m >= n.p); if (dir < 0) i--; }
    else i += dir;
    n.p = all[clamp(i, 0, all.length - 1)];
  }
}
function copyBar(tr, from, to) {
  const spb = stepsPerBar();
  if (tr.type === 'melody') {
    tr.notes = tr.notes.filter((n) => !(n.s >= to * spb && n.s < (to + 1) * spb));
    tr.notes.push(...tr.notes.filter((n) => n.s >= from * spb && n.s < (from + 1) * spb).map((n) => ({ ...n, s: n.s - from * spb + to * spb })));
  } else if (tr.type === 'drum') {
    for (const id in tr.grid) {
      for (let i = 0; i < spb; i++) {
        const v = tr.grid[id][from * spb + i];
        if (v) tr.grid[id][to * spb + i] = v; else delete tr.grid[id][to * spb + i];
      }
    }
  } else if (tr.type === 'chord') {
    tr.chords[to] = tr.chords[from] ? { ...tr.chords[from] } : null;
  }
}
function clearTrack(tr) {
  if (tr.type === 'melody') tr.notes = [];
  else if (tr.type === 'drum') tr.grid = {};
  else tr.chords = [];
}
const RHYTHM_PRESETS = {
  basic: { name: '8ビート', f: (b, spb, e) => ({ kick: [0, 4 * e], snare: [2 * e, 6 * e], hihat: range(0, spb, e) }) },
  march: { name: 'マーチ', f: (b, spb, e) => ({ kick: [0, 2 * e, 4 * e, 6 * e].filter((x) => x < spb), snare: [e, 3 * e, 5 * e, 7 * e].filter((x) => x < spb), cymbal: b % 4 === 0 ? [0] : [] }) },
  waltz: { name: 'ワルツ', f: (b, spb, e) => ({ kick: [0], hihat: [2 * e, 4 * e].filter((x) => x < spb), snare: [2 * e, 4 * e].filter((x) => x < spb) }) },
  samba: { name: 'サンバ', f: (b, spb, e) => ({ kick: range(0, spb, 2 * e), shaker: range(0, spb, Math.max(1, e / 2)), tamb: [e, 3 * e, 4 * e, 6 * e].filter((x) => x < spb), cowbell: [0, 3 * e, 6 * e].filter((x) => x < spb) }) },
  matsuri: { name: 'お祭り（和太鼓）', f: (b, spb, e) => ({ taiko: [0, 2 * e, 3 * e, 4 * e, 6 * e].filter((x) => x < spb), clave: [e, 5 * e].filter((x) => x < spb), suzu: b % 2 ? [] : [0] }) },
  clap: { name: '手拍子', f: (b, spb, e) => ({ clap: range(0, spb, 2 * e) }) },
};
function range(a, b, st) { const r = []; for (let i = a; i < b; i += Math.max(1, st)) r.push(i); return r; }
function applyRhythm(tr, key) {
  tr.grid = {};
  const spb = stepsPerBar();
  const e = Math.max(1, song.res / 8);
  for (let b = 0; b < song.bars; b++) {
    const pat = RHYTHM_PRESETS[key].f(b, spb, e);
    for (const id in pat) for (const s of pat[id]) {
      if (s >= spb) continue;
      if (!tr.grid[id]) tr.grid[id] = {};
      tr.grid[id][b * spb + s] = s === 0 ? 2 : 1;
    }
  }
}
function changeRes(newRes) {
  const f = newRes / song.res;
  for (const tr of song.tracks) {
    if (tr.type === 'melody') tr.notes = tr.notes.map((n) => ({ s: Math.floor(n.s * f), p: n.p, l: Math.max(1, Math.round(n.l * f)) }));
    if (tr.type === 'drum') for (const id in tr.grid) {
      const ng = {};
      for (const s in tr.grid[id]) { const ns = Math.floor(+s * f); if (f >= 1 || +s % 2 === 0) ng[ns] = tr.grid[id][s]; }
      tr.grid[id] = ng;
    }
  }
  ui.startStep = Math.floor(ui.startStep * f);
  ui.defLen = clamp(Math.round(ui.defLen * f), 1, 16);
  song.res = newRes;
}

/* ============================================================
   画面（設定・トラック一覧・ツール）
   ============================================================ */
function opt(sel, items, val) {
  sel.innerHTML = '';
  for (const [v, t] of items) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = t;
    sel.appendChild(o);
  }
  sel.value = String(val);
}
function renderSettings() {
  $('#title').value = song.title;
  $('#bpm').value = song.bpm;
  $('#bpmNum').value = song.bpm;
  opt($('#meter'), [['2/4', '2/4拍子'], ['3/4', '3/4拍子'], ['4/4', '4/4拍子'], ['6/8', '6/8拍子']], song.meter.join('/'));
  $('#bars').value = song.bars;
  opt($('#res'), [[8, '8分音符まで'], [16, '16分音符まで']], song.res);
  opt($('#key'), KEY_LABELS.map((l, i) => [i, l]), song.key);
  opt($('#scale'), Object.entries(SCALES).map(([k, v]) => [k, v.name]), song.scale);
  opt($('#names'), [['doremi', 'ドレミ'], ['movable', 'ドレミ（移動ド）'], ['cde', 'CDE'], ['haniho', 'ハニホ']], ui.names);
  $('#reverb').value = song.reverb;
  $('#swing').value = song.swing;
  $('#zoom').value = ui.cw;
  $('#btnLoop').classList.toggle('on', ui.loopOn);
  $('#btnMetro').classList.toggle('on', ui.metro);
  renderLoopInfo();
}
function renderLoopInfo() {
  const el = $('#loopInfo');
  if (ui.loopRange) {
    el.innerHTML = `くりかえす範囲：${ui.loopRange[0] + 1}〜${ui.loopRange[1]}小節 <button id="btnLoopClear" class="mini">解除</button>`;
    $('#btnLoopClear').onclick = () => { ui.loopRange = null; renderLoopInfo(); draw(); };
  } else el.textContent = '小節番号をクリック＝そこから再生／なぞる＝くりかえし範囲';
}

function renderTracks() {
  const list = $('#trackList');
  list.innerHTML = '';
  song.tracks.forEach((tr, i) => {
    const d = document.createElement('div');
    d.className = 'track' + (i === cur ? ' sel' : '');
    d.style.setProperty('--tc', TRACK_COLORS[i % TRACK_COLORS.length]);
    const icon = tr.type === 'melody' ? '🎵' : tr.type === 'chord' ? '🎹' : '🥁';
    let instSel = '';
    if (tr.type !== 'drum') {
      instSel = `<select class="inst" title="楽器">${Object.entries(Sound.INSTRUMENTS).map(([k, v]) => `<option value="${k}" ${k === tr.inst ? 'selected' : ''}>${v}</option>`).join('')}</select>`;
    }
    d.innerHTML = `
      <div class="trow"><span class="ticon">${icon}</span><input class="tname" value="${escapeHtml(tr.name)}" maxlength="20">
        <button class="mini mute ${tr.mute ? 'on' : ''}" title="ミュート（消音）">消</button>
        <button class="mini solo ${tr.solo ? 'on' : ''}" title="ソロ（これだけ鳴らす）">ソロ</button>
        <button class="mini del" title="トラックを削除">✕</button></div>
      <div class="trow">${instSel}<input class="vol" type="range" min="0" max="1" step="0.01" value="${tr.vol}" title="音量"></div>`;
    d.addEventListener('pointerdown', (ev) => {
      if (cur !== i) { cur = i; ui.selBar = 0; renderTracks(); renderEditorTools(); resizeEditor(); scrollToNotes(); draw(); }
    });
    d.querySelector('.tname').onchange = (ev) => edit(() => { tr.name = ev.target.value || tr.name; });
    d.querySelector('.mute').onclick = () => { tr.mute = !tr.mute; renderTracks(); };
    d.querySelector('.solo').onclick = () => { tr.solo = !tr.solo; renderTracks(); };
    d.querySelector('.del').onclick = (ev) => {
      ev.stopPropagation();
      if (song.tracks.length <= 1) return alert('トラックは1つ以上必要です');
      if (!confirm(`「${tr.name}」を削除しますか？`)) return;
      edit(() => { song.tracks.splice(i, 1); cur = clamp(cur, 0, song.tracks.length - 1); });
      renderTracks();
    };
    const is = d.querySelector('.inst');
    if (is) is.onchange = (ev) => { edit(() => { tr.inst = ev.target.value; }); preview(tr, tr.type === 'melody' ? RANGES[tr.range][1] + 12 : 60); };
    const vol = d.querySelector('.vol');
    vol.oninput = (ev) => { tr.vol = +ev.target.value; liveVolume(tr); };
    vol.onchange = () => changed();
    list.appendChild(d);
  });
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function renderEditorTools() {
  const tr = track();
  const box = $('#editorTools');
  const pal = $('#chordPalette');
  const barOpts = Array.from({ length: song.bars }, (_, i) => `<option value="${i}">${i + 1}</option>`).join('');
  const copyBarUI = `<span class="grp">小節コピー <select id="cbFrom">${barOpts}</select>→<select id="cbTo">${barOpts}</select><button id="btnCopyBar" class="mini">コピー</button></span>`;
  pal.innerHTML = '';
  pal.hidden = tr.type !== 'chord';
  if (tr.type === 'melody') {
    const lens = [[1, '1マス'], [2, '2マス'], [3, '3マス'], [4, '4マス'], [6, '6マス'], [8, '8マス']];
    const others = song.tracks.filter((t) => t.type === 'melody' && t !== tr);
    box.innerHTML = `
      <span class="grp">置く長さ ${lens.map(([v, t]) => `<button class="mini len ${ui.defLen === v ? 'on' : ''}" data-v="${v}">${t}</button>`).join('')}</span>
      <span class="grp">音域 <select id="range">${Object.entries(RANGES).map(([k, v]) => `<option value="${k}" ${k === tr.range ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></span>
      <span class="grp">移調 <button class="mini" id="tDegDn">音階↓</button><button class="mini" id="tDegUp">音階↑</button><button class="mini" id="tSemiDn">半音↓</button><button class="mini" id="tSemiUp">半音↑</button><button class="mini" id="tOctDn">オクターブ↓</button><button class="mini" id="tOctUp">オクターブ↑</button></span>
      <span class="grp"><button class="mini accent" id="btnAuto">🎲 おまかせ作曲</button></span>
      ${others.length ? `<span class="grp">輪唱・コピー：<select id="rSrc">${others.map((t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}</select>を<select id="rBars">${[0, 1, 2, 4].map((b) => `<option value="${b}" ${b === 2 ? 'selected' : ''}>${b}小節</option>`).join('')}</select>ずらして<button class="mini" id="btnRound">ここに写す</button></span>` : ''}
      <label class="grp"><input type="checkbox" id="ghost" ${ui.ghost ? 'checked' : ''}> ほかのメロディを点線で表示</label>
      ${copyBarUI}
      <button class="mini danger" id="btnClear">ぜんぶ消す</button>`;
    box.querySelectorAll('.len').forEach((b) => (b.onclick = () => { ui.defLen = +b.dataset.v; renderEditorTools(); }));
    $('#range').onchange = (ev) => { edit(() => { tr.range = ev.target.value; }); scrollToNotes(); };
    $('#tDegDn').onclick = () => edit(() => transposeDegree(tr, -1));
    $('#tDegUp').onclick = () => edit(() => transposeDegree(tr, 1));
    $('#tSemiDn').onclick = () => edit(() => transpose(tr, -1));
    $('#tSemiUp').onclick = () => edit(() => transpose(tr, 1));
    $('#tOctDn').onclick = () => edit(() => transpose(tr, -12));
    $('#tOctUp').onclick = () => edit(() => transpose(tr, 12));
    $('#btnAuto').onclick = () => { if (tr.notes.length && !confirm('今のメロディを消して、新しく作曲しますか？（元に戻すボタンで戻せます）')) return; edit(() => autoCompose(tr)); scrollToNotes(); };
    $('#ghost').onchange = (ev) => { ui.ghost = ev.target.checked; draw(); };
    if (others.length) $('#btnRound').onclick = () => {
      const src = song.tracks.find((t) => t.id === $('#rSrc').value);
      if (tr.notes.length && !confirm('このトラックの音を上書きしますか？')) return;
      edit(() => shiftCopy(src, tr, +$('#rBars').value));
    };
  } else if (tr.type === 'drum') {
    box.innerHTML = `
      <span class="hint">クリックするたびに ●→強●→なし と変わります</span>
      <span class="grp">リズムのお手本 <select id="rPreset"><option value="">えらぶ…</option>${Object.entries(RHYTHM_PRESETS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select></span>
      ${copyBarUI}
      <button class="mini danger" id="btnClear">ぜんぶ消す</button>`;
    $('#rPreset').onchange = (ev) => {
      if (!ev.target.value) return;
      if (Object.keys(tr.grid).length && !confirm('今のリズムを消して、お手本を入れますか？')) { ev.target.value = ''; return; }
      edit(() => applyRhythm(tr, ev.target.value));
    };
  } else {
    box.innerHTML = `
      <span class="grp">伴奏の形 <select id="cPat">${Object.entries(CHORD_PATTERNS).map(([k, v]) => `<option value="${k}" ${k === tr.pattern ? 'selected' : ''}>${v}</option>`).join('')}</select></span>
      <label class="grp"><input type="checkbox" id="cBass" ${tr.bassOn ? 'checked' : ''}> 低い音（ベース）もつける</label>
      ${copyBarUI}
      <button class="mini danger" id="btnClear">ぜんぶ消す</button>`;
    $('#cPat').onchange = (ev) => edit(() => { tr.pattern = ev.target.value; });
    $('#cBass').onchange = (ev) => edit(() => { tr.bassOn = ev.target.checked; });
    pal.innerHTML = `<div class="palhead">${ui.selBar + 1}小節目のコードをえらぶ（えらぶと次の小節へ進みます）</div>
      <div class="palrow">${diatonic().map((c, i) => `<button class="chordbtn" data-i="${i}" style="--pc:${PC_COLORS[c.r]}"><b>${chordName(c)}</b><small>${c.deg}</small></button>`).join('')}
      <button class="chordbtn none" data-i="-1"><b>なし</b><small>休み</small></button></div>
      <div class="palrow">そのほか：<select id="cRoot">${CHORD_ROOT.map((n, i) => `<option value="${i}">${n}</option>`).join('')}</select>
      <select id="cQ">${Object.entries(CHORD_Q).map(([k, v]) => `<option value="${k}">${v.s || '（長三和音）'}</option>`).join('')}</select>
      <button class="mini" id="cSet">この小節に入れる</button></div>`;
    const dia = diatonic();
    pal.querySelectorAll('.chordbtn').forEach((b) => (b.onclick = () => { const i = +b.dataset.i; setChord(i < 0 ? null : { r: dia[i].r, q: dia[i].q }); }));
    $('#cSet').onclick = () => setChord({ r: +$('#cRoot').value, q: $('#cQ').value });
  }
  const cbFrom = $('#cbFrom');
  if (cbFrom) {
    cbFrom.value = String(Math.min(ui.selBar, song.bars - 1));
    $('#cbTo').value = String(Math.min(ui.selBar + 1, song.bars - 1));
    $('#btnCopyBar').onclick = () => edit(() => copyBar(tr, +$('#cbFrom').value, +$('#cbTo').value));
  }
  $('#btnClear').onclick = () => { if (confirm(`「${tr.name}」の中身をぜんぶ消しますか？`)) edit(() => clearTrack(tr)); };
}

function scrollToNotes() {
  const tr = track();
  const sc = $('#scroller');
  if (tr.type !== 'melody') { sc.scrollTop = 0; return; }
  const rows = rowsFor(tr);
  let target;
  if (tr.notes.length) {
    const avg = tr.notes.reduce((a, n) => a + n.p, 0) / tr.notes.length;
    target = rows.findIndex((r) => r.p <= avg);
  } else target = rows.findIndex((r) => r.p <= RANGES[tr.range][1] + 12);
  resizeEditor();
  sc.scrollTop = Math.max(0, RH + target * ui.rh - sc.clientHeight / 2);
}

/* ============================================================
   保存・読み込み・共有・書き出し
   ============================================================ */
function loadSong(s) {
  stop();
  if (!s || !Array.isArray(s.tracks)) throw new Error('曲データの形式がちがいます');
  const base = newSong();
  song = { ...base, ...s };
  song.tracks = s.tracks.map((t) => ({ ...newTrack(t.type), ...t, id: t.id || uid() }));
  cur = 0;
  ui.startStep = 0;
  ui.loopRange = null;
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
  try { localStorage.setItem('otsumiki-songs', JSON.stringify(all)); toast('保存しました'); } catch (e) { alert('保存できませんでした（ブラウザの保存領域がいっぱいかもしれません）'); }
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
function exportJSON() { download(new Blob([JSON.stringify(song, null, 1)], { type: 'application/json' }), safeName() + '.otsumiki.json'); }
function importJSON(file) {
  const r = new FileReader();
  r.onload = () => { try { loadSong(JSON.parse(r.result)); toast('読み込みました'); } catch (e) { alert('読み込めませんでした：' + e.message); } };
  r.readAsText(file);
}

// 共有URL（曲データをURLの中に入れる）
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
  const b64 = str.slice(1).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
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

// WAV（音声ファイル）書き出し
async function exportWav() {
  stop();
  toast('音声ファイルを作っています…');
  const sr = 44100;
  let dur = 0;
  for (let s = 0; s < totalSteps(); s++) dur += stepLen(s);
  const len = Math.ceil((dur + 2.5) * sr);
  const ctx = new OfflineAudioContext(2, len, sr);
  const comp = ctx.createDynamicsCompressor();
  comp.connect(ctx.destination);
  const graph = buildGraph(ctx, comp);
  let t = 0.05;
  for (let s = 0; s < totalSteps(); s++) { scheduleStep(ctx, graph, s, t, false); t += stepLen(s); }
  const buf = await ctx.startRendering();
  download(encodeWav(buf), safeName() + '.wav');
  toast('WAVファイルを書き出しました');
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

// MIDI ファイル書き出し（ほかの音楽ソフトで開けます）
function exportMidi() {
  const PPQ = 480;
  const tps = (PPQ * 4) / song.res; // 1ステップのティック数
  const vlq = (v) => { const b = [v & 0x7f]; while ((v >>= 7)) b.unshift((v & 0x7f) | 0x80); return b; };
  const str = (s) => Array.from(new TextEncoder().encode(s));
  const chunk = (id, bytes) => [...str(id), (bytes.length >>> 24) & 255, (bytes.length >>> 16) & 255, (bytes.length >>> 8) & 255, bytes.length & 255, ...bytes];
  const trackBytes = (events) => {
    events.sort((a, b) => a.t - b.t || a.o - b.o);
    const out = [];
    let last = 0;
    for (const e of events) { out.push(...vlq(Math.round(e.t - last)), ...e.d); last = e.t; }
    out.push(0, 0xff, 0x2f, 0);
    return out;
  };
  const usPerQ = Math.round(60000000 / song.bpm);
  const title = str(song.title).slice(0, 120);
  const t0 = [
    { t: 0, o: 0, d: [0xff, 0x03, ...vlq(title.length), ...title] },
    { t: 0, o: 0, d: [0xff, 0x51, 3, (usPerQ >> 16) & 255, (usPerQ >> 8) & 255, usPerQ & 255] },
    { t: 0, o: 0, d: [0xff, 0x58, 4, song.meter[0], Math.log2(song.meter[1]), 24, 8] },
  ];
  const tracks = [trackBytes(t0)];
  let ch = 0;
  for (const tr of song.tracks) {
    const ev = [];
    const name = str(tr.name).slice(0, 60);
    ev.push({ t: 0, o: 0, d: [0xff, 0x03, ...vlq(name.length), ...name] });
    if (tr.type === 'drum') {
      for (const id in tr.grid) for (const s in tr.grid[id]) {
        const n = Sound.DRUMS[id].gm;
        const v = tr.grid[id][s] === 2 ? 115 : 80;
        ev.push({ t: +s * tps, o: 2, d: [0x99, n, v] }, { t: +s * tps + tps / 2, o: 1, d: [0x89, n, 0] });
      }
    } else {
      if (ch === 9) ch++;
      const c = ch++ & 15;
      ev.push({ t: 0, o: 0, d: [0xc0 | c, Sound.GM[tr.inst] || 0] }, { t: 0, o: 0, d: [0xb0 | c, 7, Math.round(tr.vol * 127)] });
      const notes = tr.type === 'melody' ? tr.notes.map((n) => ({ ...n, v: 0.8 })) : chordEvents(tr);
      for (const n of notes) {
        if (n.s >= totalSteps()) continue;
        const v = Math.round(clamp(n.v, 0.1, 1) * 110);
        ev.push({ t: n.s * tps, o: 2, d: [0x90 | c, n.p, v] }, { t: (n.s + n.l) * tps - 1, o: 1, d: [0x80 | c, n.p, 0] });
      }
    }
    tracks.push(trackBytes(ev));
  }
  const head = chunk('MThd', [0, 1, 0, tracks.length, (PPQ >> 8) & 255, PPQ & 255]);
  const bytes = [...head];
  for (const t of tracks) bytes.push(...chunk('MTrk', t));
  download(new Blob([new Uint8Array(bytes)], { type: 'audio/midi' }), safeName() + '.mid');
  toast('MIDIファイルを書き出しました');
}

function printScore() {
  // マス目の画像を小節ごとに並べて印刷用ページを作る
  const tr = track();
  const w = window.open('', '_blank');
  if (!w) return alert('ポップアップがブロックされました');
  const sc = $('#scroller');
  const saved = [sc.scrollLeft, sc.scrollTop];
  const imgs = [];
  const spb = stepsPerBar();
  const pageBars = Math.max(1, Math.floor((cv.clientWidth - LW) / (spb * ui.cw)));
  for (let b = 0; b < song.bars; b += pageBars) {
    sc.scrollLeft = b * spb * ui.cw;
    draw(null);
    imgs.push(cv.toDataURL('image/png'));
  }
  sc.scrollLeft = saved[0]; sc.scrollTop = saved[1];
  draw();
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${escapeHtml(song.title)}</title><style>body{font-family:sans-serif;margin:16px}img{width:100%;border:1px solid #ccc;margin:6px 0;page-break-inside:avoid}</style><h2>${escapeHtml(song.title)} ／ ${escapeHtml(tr.name)}</h2><p>テンポ ${song.bpm}・${song.meter.join('/')}拍子・${KEY_LABELS[song.key]}・${SCALES[song.scale].name}</p>${imgs.map((s) => `<img src="${s}">`).join('')}<script>onload=()=>print()<\/script>`);
  w.document.close();
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ============================================================
   初期化・イベント
   ============================================================ */
function init() {
  ui.ghost = true;
  // 設定パネル
  $('#title').onchange = (e) => edit(() => { song.title = e.target.value || 'あたらしい曲'; });
  const setBpm = (v) => { song.bpm = clamp(Math.round(+v || 100), 30, 260); $('#bpm').value = song.bpm; $('#bpmNum').value = song.bpm; version++; };
  $('#bpm').oninput = (e) => setBpm(e.target.value);
  $('#bpmNum').onchange = (e) => setBpm(e.target.value);
  $('#meter').onchange = (e) => edit(() => { song.meter = e.target.value.split('/').map(Number); ui.startStep = 0; });
  $('#bars').onchange = (e) => edit(() => { song.bars = clamp(Math.round(+e.target.value || 8), 1, 64); e.target.value = song.bars; ui.selBar = Math.min(ui.selBar, song.bars - 1); ui.loopRange = null; ui.startStep = 0; renderLoopInfo(); });
  $('#res').onchange = (e) => edit(() => changeRes(+e.target.value));
  $('#key').onchange = (e) => {
    const nk = +e.target.value;
    const diff = nk - song.key;
    const hasNotes = song.tracks.some((t) => (t.notes && t.notes.length) || (t.chords && t.chords.some(Boolean)));
    const move = hasNotes && confirm('いま入っている音やコードも、新しい調に移しますか？\n（OK＝移す／キャンセル＝調だけ変える）');
    edit(() => {
      song.key = nk;
      if (move) {
        const d = ((diff % 12) + 12) % 12 > 6 ? ((diff % 12) + 12) % 12 - 12 : ((diff % 12) + 12) % 12;
        for (const t of song.tracks) {
          if (t.type === 'melody') transpose(t, d);
          if (t.type === 'chord') t.chords = t.chords.map((c) => (c ? { ...c, r: (c.r + diff + 12) % 12 } : c));
        }
      }
    });
  };
  $('#scale').onchange = (e) => edit(() => { song.scale = e.target.value; });
  $('#names').onchange = (e) => { ui.names = e.target.value; draw(); };
  $('#reverb').oninput = (e) => { song.reverb = +e.target.value; if (player.graph) player.graph.wet.gain.value = song.reverb * 0.6; };
  $('#reverb').onchange = () => changed();
  $('#swing').oninput = (e) => { song.swing = +e.target.value; };
  $('#zoom').oninput = (e) => {
    const sc = $('#scroller');
    const ratio = (sc.scrollLeft + 1) / ui.cw;
    ui.cw = +e.target.value;
    resizeEditor();
    sc.scrollLeft = ratio * ui.cw;
    draw();
  };
  $('#rowZoom').oninput = (e) => { ui.rh = +e.target.value; resizeEditor(); draw(); };

  // 再生ボタンなど
  $('#btnPlay').onclick = () => (player.on ? stop() : play());
  $('#btnStop').onclick = () => { stop(); ui.startStep = ui.loopRange ? ui.loopRange[0] * stepsPerBar() : 0; $('#scroller').scrollLeft = 0; draw(); };
  $('#btnLoop').onclick = () => { ui.loopOn = !ui.loopOn; $('#btnLoop').classList.toggle('on', ui.loopOn); };
  $('#btnMetro').onclick = () => { ui.metro = !ui.metro; $('#btnMetro').classList.toggle('on', ui.metro); };
  $('#btnUndo').onclick = undo;
  $('#btnRedo').onclick = redo;
  $('#btnNew').onclick = () => { if (confirm('新しい曲を作りますか？（今の曲は保存されていなければ消えます）')) loadSong(newSong()); };
  $('#btnSample').onclick = () => { if (confirm('サンプル曲を開きますか？（今の曲は保存されていなければ消えます）')) loadSong(sampleSong()); };
  $('#btnSave').onclick = saveToBrowser;
  $('#btnOpen').onclick = openDialog;
  $('#btnExportJson').onclick = exportJSON;
  $('#btnImportJson').onclick = () => $('#fileIn').click();
  $('#fileIn').onchange = (e) => { if (e.target.files[0]) importJSON(e.target.files[0]); e.target.value = ''; };
  $('#btnWav').onclick = () => exportWav().catch((err) => alert('書き出しに失敗しました：' + err.message));
  $('#btnMidi').onclick = exportMidi;
  $('#btnPrint').onclick = printScore;
  $('#btnShare').onclick = () => shareDialog().catch((err) => alert('URLを作れませんでした：' + err.message));
  $('#btnCopyUrl').onclick = async () => { try { await navigator.clipboard.writeText($('#shareUrl').value); toast('コピーしました'); } catch (e) { $('#shareUrl').select(); document.execCommand('copy'); toast('コピーしました'); } };
  $('#btnHelp').onclick = () => $('#dlgHelp').showModal();
  document.querySelectorAll('dialog .close').forEach((b) => (b.onclick = () => b.closest('dialog').close()));
  $('#addMelody').onclick = () => { edit(() => { song.tracks.push(newTrack('melody', { name: 'メロディ' + (song.tracks.filter((t) => t.type === 'melody').length + 1) })); cur = song.tracks.length - 1; }); renderTracks(); scrollToNotes(); };
  $('#addChord').onclick = () => { edit(() => { song.tracks.push(newTrack('chord')); cur = song.tracks.length - 1; }); renderTracks(); };
  $('#addDrum').onclick = () => { edit(() => { song.tracks.push(newTrack('drum', { name: 'リズム' + (song.tracks.filter((t) => t.type === 'drum').length + 1) })); cur = song.tracks.length - 1; }); renderTracks(); };

  // エディタ
  const sc = $('#scroller');
  sc.addEventListener('pointerdown', onDown);
  sc.addEventListener('pointermove', onMove);
  sc.addEventListener('pointerup', onUp);
  sc.addEventListener('pointercancel', () => { if (drag && drag.kind === 'tap') drag = null; });
  sc.addEventListener('scroll', () => { if (!player.on) draw(); });
  sc.addEventListener('wheel', (e) => {
    if (e.ctrlKey) { e.preventDefault(); ui.cw = clamp(ui.cw - Math.sign(e.deltaY) * 2, 12, 60); $('#zoom').value = ui.cw; resizeEditor(); draw(); }
  }, { passive: false });
  new ResizeObserver(() => { resizeEditor(); draw(); }).observe($('#editorWrap'));
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => draw());

  // キーボード操作
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if (e.code === 'Space') { e.preventDefault(); player.on ? stop() : play(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
  });

  // 起動時：URLに曲があれば開く → なければ前回の続き → なければサンプル
  (async () => {
    const m = location.hash.match(/#song=(.+)$/);
    if (m) {
      try { loadSong(await unpackSong(m[1])); toast('共有された曲を開きました'); history.replaceState(null, '', location.pathname + location.search); return; } catch (e) { alert('共有URLの曲を読み込めませんでした'); }
    }
    try {
      const auto = localStorage.getItem('otsumiki-autosave');
      if (auto) { loadSong(JSON.parse(auto)); return; }
    } catch (e) { /* 何もしない */ }
    loadSong(sampleSong());
  })();
}
init();
