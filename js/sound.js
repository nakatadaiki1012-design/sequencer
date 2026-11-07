'use strict';
/* ============================================================
   音を作る部分（Web Audio API で楽器の音を合成します）
   すべての関数は ctx（AudioContext / OfflineAudioContext）を受け取るので
   リアルタイム再生にも WAV 書き出しにも同じコードを使えます。
   ============================================================ */
const Sound = (() => {
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /* ---------- ノイズ（雑音）バッファ ---------- */
  const noiseBufs = new WeakMap();
  function noiseBuf(ctx) {
    let b = noiseBufs.get(ctx);
    if (!b) {
      b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      noiseBufs.set(ctx, b);
    }
    return b;
  }
  function noiseSrc(ctx) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf(ctx);
    return s;
  }

  /* ---------- 弦をはじく音（カープラス・ストロング法） ---------- */
  const KS = {
    guitar: { len: 2.2, t60: 2.0, bright: 0.55, name: 'ギター' },
    koto: { len: 2.6, t60: 2.6, bright: 0.8, name: '琴' },
    bass: { len: 2.0, t60: 1.6, bright: 0.25, name: 'ベース' },
    harp: { len: 2.6, t60: 2.4, bright: 0.35, name: 'ハープ' },
  };
  const ksCache = new Map();
  function ksBuffer(ctx, midi, kind) {
    const sr = ctx.sampleRate;
    const key = sr + '|' + midi + '|' + kind;
    if (ksCache.has(key)) {
      const v = ksCache.get(key);
      ksCache.delete(key);
      ksCache.set(key, v); // 最近使ったものを後ろへ
      return v;
    }
    const cfg = KS[kind];
    const f = mtof(midi);
    const N = Math.max(2, Math.floor(sr / f - 0.5));
    const f0 = sr / (N + 0.5);
    const len = Math.floor(sr * cfg.len);
    const buf = ctx.createBuffer(1, len, sr);
    const y = buf.getChannelData(0);
    let prev = 0;
    for (let i = 0; i < N; i++) {
      prev += cfg.bright * (Math.random() * 2 - 1 - prev);
      y[i] = prev;
    }
    let mean = 0;
    for (let i = 0; i < N; i++) mean += y[i];
    mean /= N;
    for (let i = 0; i < N; i++) y[i] -= mean;
    const damp = Math.pow(0.001, 1 / (f0 * cfg.t60 * (midi > 72 ? 0.7 : 1)));
    for (let i = N; i < len; i++) {
      const a = y[i - N];
      const b = i - N - 1 >= 0 ? y[i - N - 1] : 0;
      y[i] = damp * 0.5 * (a + b);
    }
    let peak = 0;
    for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(y[i]));
    if (peak > 0) for (let i = 0; i < len; i++) y[i] *= 0.8 / peak;
    const v = { buf, rate: f / f0 };
    ksCache.set(key, v);
    if (ksCache.size > 160) ksCache.delete(ksCache.keys().next().value);
    return v;
  }

  /* ---------- 発振器でつくる楽器 ---------- */
  // layers: [波形, 倍音の倍率, 音量, デチューン(セント)]
  const OSC = {
    piano: { name: 'ピアノ', layers: [['triangle', 1, 0.55], ['sine', 2, 0.25], ['sine', 4, 0.06]], a: 0.004, d: 0.8, s: 0.15, r: 0.25, lp: 5000, perc: true },
    kenhamo: { name: '鍵盤ハーモニカ', layers: [['sawtooth', 1, 0.22], ['square', 1, 0.12]], a: 0.03, d: 0.1, s: 0.9, r: 0.06, lp: 2400, vib: [5, 0.003] },
    recorder: { name: 'リコーダー', layers: [['sine', 1, 0.7], ['triangle', 2, 0.07]], a: 0.04, d: 0.1, s: 0.9, r: 0.08, vib: [5, 0.004], breath: 0.05 },
    organ: { name: 'オルガン', layers: [['sine', 1, 0.4], ['sine', 2, 0.28], ['sine', 3, 0.14], ['sine', 4, 0.1]], a: 0.01, d: 0.1, s: 1, r: 0.06 },
    xylophone: { name: '木琴', layers: [['sine', 1, 0.75], ['sine', 4, 0.18], ['sine', 10, 0.04]], a: 0.002, d: 0.16, s: 0, r: 0.2, perc: true },
    glocken: { name: '鉄琴', layers: [['sine', 1, 0.6], ['sine', 2.76, 0.14], ['sine', 5.4, 0.07]], a: 0.002, d: 1.0, s: 0, r: 1.2, perc: true },
    musicbox: { name: 'オルゴール', layers: [['sine', 1, 0.6], ['sine', 3, 0.1], ['sine', 6.1, 0.05]], a: 0.002, d: 0.7, s: 0, r: 0.9, perc: true },
    strings: { name: 'ストリングス', layers: [['sawtooth', 1, 0.2, -7], ['sawtooth', 1, 0.2, 7]], a: 0.15, d: 0.3, s: 0.85, r: 0.35, lp: 2600, vib: [5.5, 0.003] },
    brass: { name: 'トランペット', layers: [['sawtooth', 1, 0.36]], a: 0.04, d: 0.2, s: 0.75, r: 0.1, lp: 900, lpEnv: 2600 },
    flute: { name: 'フルート', layers: [['sine', 1, 0.7], ['sine', 2, 0.05]], a: 0.07, d: 0.1, s: 0.9, r: 0.1, vib: [5.5, 0.006], breath: 0.09 },
    synth: { name: 'シンセ', layers: [['square', 1, 0.2, -6], ['square', 1, 0.2, 6]], a: 0.01, d: 0.2, s: 0.7, r: 0.1, lp: 3500 },
    chip: { name: 'ピコピコ(8bit)', layers: [['square', 1, 0.28]], a: 0.002, d: 0.05, s: 0.9, r: 0.02 },
  };

  const INSTRUMENTS = {};
  for (const k in OSC) INSTRUMENTS[k] = OSC[k].name;
  for (const k in KS) INSTRUMENTS[k] = KS[k].name;

  // General MIDI のプログラム番号（MIDI書き出し用）
  const GM = { piano: 0, kenhamo: 22, recorder: 74, organ: 16, xylophone: 13, glocken: 9, musicbox: 10, strings: 48, brass: 56, flute: 73, synth: 80, chip: 80, guitar: 24, koto: 107, bass: 33, harp: 46 };

  function playNote(ctx, out, inst, midi, t, dur, vel = 0.8) {
    if (KS[inst]) return playPluck(ctx, out, inst, midi, t, dur, vel);
    const c = OSC[inst] || OSC.piano;
    const f = mtof(midi);
    const g = ctx.createGain();
    const p = g.gain;
    const peak = vel * 0.5;
    const end = t + Math.max(dur, c.a + 0.01);
    const decay = c.perc ? c.d * (midi > 72 ? 0.7 : 1) : c.d;
    p.setValueAtTime(0.0001, t);
    p.linearRampToValueAtTime(peak, t + c.a);
    p.setTargetAtTime(peak * c.s + 0.00001, t + c.a, decay / 3);
    const relTC = (c.perc ? c.r : c.r) / 3;
    p.setTargetAtTime(0, end, relTC);
    const stopAt = end + c.r * 1.6 + 0.05;

    let dest = g;
    if (c.lp) {
      const fl = ctx.createBiquadFilter();
      fl.type = 'lowpass';
      fl.Q.value = 0.7;
      const base = Math.min(c.lp + f * 1.5, 16000);
      if (c.lpEnv) {
        fl.frequency.setValueAtTime(base, t);
        fl.frequency.linearRampToValueAtTime(base + c.lpEnv, t + c.a + 0.02);
        fl.frequency.setTargetAtTime(base, t + c.a + 0.02, 0.12);
      } else fl.frequency.value = base;
      fl.connect(g);
      dest = fl;
    }
    g.connect(out);

    let lfo = null;
    if (c.vib) {
      lfo = ctx.createOscillator();
      lfo.frequency.value = c.vib[0];
      const lg = ctx.createGain();
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(f * c.vib[1], t + 0.3);
      lfo.connect(lg);
      lfo._g = lg;
      lfo.start(t);
      lfo.stop(stopAt);
    }
    for (const [type, mult, amt, det] of c.layers) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mult;
      if (det) o.detune.value = det;
      if (lfo) lfo._g.connect(o.frequency);
      const og = ctx.createGain();
      og.gain.value = amt;
      o.connect(og);
      og.connect(dest);
      o.start(t);
      o.stop(stopAt);
    }
    if (c.breath) {
      const n = noiseSrc(ctx);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = Math.min(f * 2, 12000);
      bp.Q.value = 2;
      const ng = ctx.createGain();
      ng.gain.value = c.breath;
      n.connect(bp);
      bp.connect(ng);
      ng.connect(dest);
      n.start(t, Math.random());
      n.stop(stopAt);
    }
  }

  function playPluck(ctx, out, inst, midi, t, dur, vel) {
    const { buf, rate } = ksBuffer(ctx, midi, inst);
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel * 0.75, t);
    const end = t + Math.max(dur, 0.05);
    g.gain.setTargetAtTime(0, end, inst === 'koto' || inst === 'harp' ? 0.25 : 0.08);
    let node = s;
    if (inst === 'bass') {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1200;
      s.connect(lp);
      node = lp;
    }
    node.connect(g);
    g.connect(out);
    s.start(t);
    s.stop(Math.min(t + buf.duration / rate, end + 1.2));
  }

  /* ---------- 打楽器 ---------- */
  function envGain(ctx, out, t, peak, decay, attack = 0.001) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(out);
    return g;
  }
  function filt(ctx, type, freq, q = 1) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }
  function noiseHit(ctx, out, t, vel, decay, chain, attack) {
    const n = noiseSrc(ctx);
    const g = envGain(ctx, out, t, vel, decay, attack);
    let node = n;
    for (const f of chain) { node.connect(f); node = f; }
    node.connect(g);
    n.start(t, Math.random() * 1.5);
    n.stop(t + decay + 0.1);
  }
  function toneHit(ctx, out, t, vel, decay, type, f1, f2, sweep = 0.1) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + sweep);
    const g = envGain(ctx, out, t, vel, decay);
    o.connect(g);
    o.start(t);
    o.stop(t + decay + 0.1);
  }

  const DRUMS = {
    cymbal: { name: 'シンバル', gm: 49, play: (c, o, t, v) => { noiseHit(c, o, t, v * 0.45, 1.3, [filt(c, 'highpass', 5000)]); toneHit(c, o, t, v * 0.04, 0.8, 'square', 1420); } },
    ohat: { name: 'オープンハイハット', gm: 46, play: (c, o, t, v) => noiseHit(c, o, t, v * 0.4, 0.32, [filt(c, 'highpass', 7000), filt(c, 'bandpass', 10000, 0.8)]) },
    hihat: { name: 'ハイハット', gm: 42, play: (c, o, t, v) => noiseHit(c, o, t, v * 0.4, 0.05, [filt(c, 'highpass', 7000), filt(c, 'bandpass', 10000, 0.8)]) },
    tamb: { name: 'タンバリン', gm: 54, play: (c, o, t, v) => { noiseHit(c, o, t, v * 0.35, 0.2, [filt(c, 'highpass', 6000)]); noiseHit(c, o, t + 0.015, v * 0.25, 0.15, [filt(c, 'bandpass', 9000, 3)]); } },
    shaker: { name: 'マラカス', gm: 70, play: (c, o, t, v) => noiseHit(c, o, t, v * 0.3, 0.07, [filt(c, 'highpass', 5000)], 0.02) },
    triangle: { name: 'トライアングル', gm: 81, play: (c, o, t, v) => { toneHit(c, o, t, v * 0.18, 1.4, 'sine', 4200); toneHit(c, o, t, v * 0.08, 1.0, 'sine', 6930); } },
    suzu: { name: '鈴', gm: 83, play: (c, o, t, v) => { for (let i = 0; i < 4; i++) { toneHit(c, o, t + i * 0.012, v * 0.08, 0.25, 'sine', 3800 + i * 610); } } },
    cowbell: { name: 'カウベル', gm: 56, play: (c, o, t, v) => { const bp = filt(c, 'bandpass', 800, 2); const g = envGain(c, o, t, v * 0.5, 0.3); bp.connect(g); for (const f of [540, 800]) { const x = c.createOscillator(); x.type = 'square'; x.frequency.value = f; x.connect(bp); x.start(t); x.stop(t + 0.4); } } },
    clave: { name: '拍子木', gm: 75, play: (c, o, t, v) => { toneHit(c, o, t, v * 0.6, 0.06, 'triangle', 2500); noiseHit(c, o, t, v * 0.2, 0.02, [filt(c, 'bandpass', 3000, 4)]); } },
    castanet: { name: 'カスタネット', gm: 85, play: (c, o, t, v) => { noiseHit(c, o, t, v * 0.6, 0.025, [filt(c, 'bandpass', 3200, 3)]); toneHit(c, o, t, v * 0.2, 0.03, 'sine', 1800); } },
    clap: { name: '手拍子', gm: 39, play: (c, o, t, v) => { for (const d of [0, 0.011, 0.023]) noiseHit(c, o, t + d, v * 0.45, d === 0.023 ? 0.16 : 0.02, [filt(c, 'bandpass', 1200, 1.2)]); } },
    snare: { name: 'スネア(小だいこ)', gm: 38, play: (c, o, t, v) => { noiseHit(c, o, t, v * 0.5, 0.16, [filt(c, 'highpass', 1500)]); toneHit(c, o, t, v * 0.35, 0.08, 'triangle', 190, 160); } },
    tom: { name: 'タム', gm: 45, play: (c, o, t, v) => toneHit(c, o, t, v * 0.8, 0.32, 'sine', 210, 120, 0.25) },
    taiko: { name: '和太鼓', gm: 41, play: (c, o, t, v) => { toneHit(c, o, t, v * 1.0, 0.8, 'sine', 95, 58, 0.3); noiseHit(c, o, t, v * 0.35, 0.18, [filt(c, 'lowpass', 500)]); } },
    kick: { name: 'バスドラム(大だいこ)', gm: 36, play: (c, o, t, v) => { toneHit(c, o, t, v * 1.0, 0.38, 'sine', 150, 45, 0.12); toneHit(c, o, t, v * 0.3, 0.015, 'square', 900); } },
  };
  const DRUM_ORDER = Object.keys(DRUMS);

  function playDrum(ctx, out, id, t, vel = 0.8) {
    const d = DRUMS[id];
    if (d) d.play(ctx, out, t, vel);
  }

  function click(ctx, out, t, accent) {
    toneHit(ctx, out, t, accent ? 0.5 : 0.3, 0.05, 'sine', accent ? 1600 : 1000);
  }

  /* ---------- ホールの響き（リバーブ） ---------- */
  function makeReverb(ctx, seconds = 2.0) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    const cv = ctx.createConvolver();
    cv.buffer = buf;
    return cv;
  }

  return { mtof, playNote, playDrum, click, makeReverb, INSTRUMENTS, DRUMS, DRUM_ORDER, GM };
})();
