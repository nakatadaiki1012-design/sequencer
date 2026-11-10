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
    s.loop = true; // 長いシンバルでも、雑音がとちゅうで切れない
    return s;
  }
  const curves = new Map();
  function driveCurve(amount) {
    if (curves.has(amount)) return curves.get(amount);
    const n = 1024;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      c[i] = Math.tanh(x * amount) / Math.tanh(amount);
    }
    curves.set(amount, c);
    return c;
  }

  /* ---------- 弦をはじく音（カープラス・ストロング法） ---------- */
  const KS = {
    harpsichord: { len: 1.8, t60: 1.6, bright: 1.0, hp: 300 },
    clavinet: { len: 1.0, t60: 0.6, bright: 0.95, hp: 400 },
    pizz: { len: 0.8, t60: 0.45, bright: 0.45 },
    acbass: { len: 1.8, t60: 1.3, bright: 0.22, lp: 1100 },
    harp: { len: 2.6, t60: 2.4, bright: 0.35 },
    guitar: { len: 2.2, t60: 2.0, bright: 0.55 },
    eguitar: { len: 2.6, t60: 3.0, bright: 0.6, drive: 3, lp: 4500 },
    rockguitar: { len: 2.6, t60: 3.5, bright: 0.7, drive: 25, lp: 3200 },
    ukulele: { len: 1.4, t60: 1.0, bright: 0.7 },
    ebass: { len: 2.0, t60: 1.8, bright: 0.3, lp: 1500 },
    koto: { len: 2.6, t60: 2.6, bright: 0.8 },
    shamisen: { len: 1.4, t60: 1.0, bright: 0.97, drive: 1.6, hp: 250 },
    sanshin: { len: 1.6, t60: 1.3, bright: 0.6 },
  };
  const ksCache = new Map();
  function ksBuffer(ctx, midi, kind) {
    const sr = ctx.sampleRate;
    const key = sr + '|' + midi + '|' + kind;
    if (ksCache.has(key)) {
      const v = ksCache.get(key);
      ksCache.delete(key);
      ksCache.set(key, v);
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

  /* ---------- 発振器でつくる楽器 ----------
     layers: [波形, 倍音の倍率, 音量, デチューン(セント)]
     a/d/s/r: 立ち上がり・減衰・持続レベル・余韻
     perc: 打鍵楽器（だんだん小さくなる）  lp/hp: フィルター  lpEnv: 音の出だしで明るくする
     vib: [速さHz, 深さ]  breath: 息の音  formants: 人の声の響き  drive: ひずみ */
  const OSC = {
    piano: { layers: [['triangle', 1, 0.55], ['sine', 2, 0.25], ['sine', 4, 0.06]], a: 0.004, d: 0.8, s: 0.15, r: 0.25, lp: 5000, perc: true },
    epiano: { layers: [['sine', 1, 0.6], ['sine', 2, 0.12], ['sine', 14, 0.05]], a: 0.003, d: 1.1, s: 0.2, r: 0.3, perc: true, trem: [5, 0.15] },
    epiano2: { layers: [['sine', 1, 0.5], ['triangle', 3, 0.12], ['sine', 7, 0.06]], a: 0.003, d: 0.7, s: 0.15, r: 0.25, perc: true },
    organ: { layers: [['sine', 1, 0.4], ['sine', 2, 0.28], ['sine', 3, 0.14], ['sine', 4, 0.1]], a: 0.01, d: 0.1, s: 1, r: 0.06 },
    pipeorgan: { layers: [['sine', 0.5, 0.25], ['sine', 1, 0.35], ['sine', 2, 0.22], ['sine', 4, 0.12], ['triangle', 3, 0.06]], a: 0.08, d: 0.1, s: 1, r: 0.3 },
    accordion: { layers: [['sawtooth', 1, 0.17, -8], ['sawtooth', 1, 0.17, 8], ['square', 2, 0.05]], a: 0.04, d: 0.1, s: 0.9, r: 0.08, lp: 2600 },
    kenhamo: { layers: [['sawtooth', 1, 0.22], ['square', 1, 0.12]], a: 0.03, d: 0.1, s: 0.9, r: 0.06, lp: 2400, vib: [5, 0.003] },
    strings: { layers: [['sawtooth', 1, 0.2, -7], ['sawtooth', 1, 0.2, 7]], a: 0.15, d: 0.3, s: 0.85, r: 0.35, lp: 2600, vib: [5.5, 0.003] },
    brassens: { layers: [['sawtooth', 1, 0.2, -10], ['sawtooth', 1, 0.2, 10], ['sawtooth', 1, 0.15]], a: 0.05, d: 0.2, s: 0.8, r: 0.12, lp: 900, lpEnv: 2400 },
    trumpet: { layers: [['sawtooth', 1, 0.36]], a: 0.04, d: 0.2, s: 0.75, r: 0.1, lp: 900, lpEnv: 2600, vib: [5.5, 0.002] },
    trombone: { layers: [['sawtooth', 1, 0.36]], a: 0.06, d: 0.2, s: 0.8, r: 0.12, lp: 600, lpEnv: 1500 },
    horn: { layers: [['sawtooth', 1, 0.25], ['triangle', 1, 0.25]], a: 0.08, d: 0.2, s: 0.85, r: 0.18, lp: 700, lpEnv: 600 },
    tuba: { layers: [['sawtooth', 1, 0.3], ['sine', 1, 0.3]], a: 0.06, d: 0.2, s: 0.85, r: 0.12, lp: 400, lpEnv: 500 },
    sax: { layers: [['sawtooth', 1, 0.25], ['square', 1, 0.12]], a: 0.04, d: 0.2, s: 0.8, r: 0.1, lp: 1600, lpEnv: 1500, vib: [5, 0.004], breath: 0.03 },
    clarinet: { layers: [['square', 1, 0.3], ['sine', 3, 0.05]], a: 0.04, d: 0.1, s: 0.9, r: 0.08, lp: 1800 },
    oboe: { layers: [['sawtooth', 1, 0.25], ['square', 2, 0.08]], a: 0.04, d: 0.1, s: 0.85, r: 0.08, formants: [[1100, 1], [2800, 0.5]], vib: [5.5, 0.004] },
    bassoon: { layers: [['sawtooth', 1, 0.3]], a: 0.05, d: 0.1, s: 0.85, r: 0.08, formants: [[450, 1], [1200, 0.4]] },
    flute: { layers: [['sine', 1, 0.7], ['sine', 2, 0.05]], a: 0.07, d: 0.1, s: 0.9, r: 0.1, vib: [5.5, 0.006], breath: 0.09 },
    recorder: { layers: [['sine', 1, 0.7], ['triangle', 2, 0.07]], a: 0.04, d: 0.1, s: 0.9, r: 0.08, vib: [5, 0.004], breath: 0.05 },
    xylophone: { layers: [['sine', 1, 0.75], ['sine', 4, 0.18], ['sine', 10, 0.04]], a: 0.002, d: 0.16, s: 0, r: 0.2, perc: true },
    glocken: { layers: [['sine', 1, 0.6], ['sine', 2.76, 0.14], ['sine', 5.4, 0.07]], a: 0.002, d: 1.0, s: 0, r: 1.2, perc: true },
    tubularbell: { layers: [['sine', 1, 0.45], ['sine', 2.0, 0.2], ['sine', 3.0, 0.15], ['sine', 4.2, 0.1], ['sine', 5.4, 0.06]], a: 0.002, d: 2.2, s: 0, r: 2.0, perc: true },
    timpani: { layers: [['sine', 1, 0.8], ['sine', 1.5, 0.2], ['sine', 1.98, 0.1]], a: 0.004, d: 1.2, s: 0, r: 0.8, perc: true, pitchDrop: 0.03, thump: 0.3 },
    musicbox: { layers: [['sine', 1, 0.6], ['sine', 3, 0.1], ['sine', 6.1, 0.05]], a: 0.002, d: 0.7, s: 0, r: 0.9, perc: true },
    steeldrum: { layers: [['sine', 1, 0.55], ['sine', 2, 0.25], ['sine', 3.01, 0.12], ['sine', 4.1, 0.05]], a: 0.003, d: 0.6, s: 0, r: 0.5, perc: true },
    shakuhachi: { layers: [['sine', 1, 0.6], ['triangle', 2, 0.04]], a: 0.12, d: 0.1, s: 0.85, r: 0.15, vib: [4.5, 0.008], breath: 0.22 },
    choir: { layers: [['sawtooth', 1, 0.25, -6], ['sawtooth', 1, 0.25, 6]], a: 0.18, d: 0.2, s: 0.9, r: 0.35, formants: [[750, 1], [1150, 0.6], [2600, 0.25]], vib: [5, 0.005] },
    bagpipe: { layers: [['sawtooth', 1, 0.3], ['sawtooth', 0.5, 0.12]], a: 0.03, d: 0.1, s: 0.95, r: 0.05, formants: [[1000, 1], [2400, 0.6]] },
    synth1: { layers: [['sawtooth', 1, 0.2, -8], ['sawtooth', 1, 0.2, 8]], a: 0.2, d: 0.4, s: 0.8, r: 0.5, lp: 1800 },
    synth2: { layers: [['square', 1, 0.2, -5], ['square', 1, 0.2, 5]], a: 0.01, d: 0.2, s: 0.7, r: 0.1, lp: 3500 },
    synth3: { layers: [['sine', 1, 0.4], ['sine', 2.005, 0.2], ['sine', 0.5, 0.2]], a: 0.3, d: 0.5, s: 0.8, r: 0.8 },
    synthbell: { layers: [['sine', 1, 0.5], ['sine', 3.5, 0.2], ['sine', 7.1, 0.07]], a: 0.002, d: 0.9, s: 0, r: 1.0, perc: true },
    lead1: { layers: [['sawtooth', 1, 0.3]], a: 0.005, d: 0.2, s: 0.8, r: 0.08, lp: 4000, vib: [6, 0.004] },
    lead2: { layers: [['square', 1, 0.3]], a: 0.005, d: 0.2, s: 0.8, r: 0.08, lp: 3000, vib: [6, 0.004] },
    lead3: { layers: [['sawtooth', 1, 0.2], ['sawtooth', 1.5, 0.12]], a: 0.005, d: 0.2, s: 0.8, r: 0.08, lp: 3500 },
    chip: { layers: [['square', 1, 0.28]], a: 0.002, d: 0.05, s: 0.9, r: 0.02 },
    chip2: { layers: [['triangle', 1, 0.5]], a: 0.002, d: 0.05, s: 0.9, r: 0.02 },
    sbass1: { layers: [['sawtooth', 1, 0.35], ['square', 0.5, 0.15]], a: 0.005, d: 0.25, s: 0.5, r: 0.06, lp: 500, lpEnv: 1500 },
    sbass2: { layers: [['square', 1, 0.3]], a: 0.005, d: 0.3, s: 0.6, r: 0.06, lp: 700 },
    sbass3: { layers: [['sine', 1, 0.7], ['triangle', 1, 0.15]], a: 0.005, d: 0.4, s: 0.7, r: 0.08 },
  };

  /* ---------- 楽器の一覧（カテゴリーごと） ---------- */
  const CATS = [
    { id: 'key', name: '鍵盤', icon: '🎹', list: [['piano', 'ピアノ', 0], ['epiano', 'エレクトリックピアノ1', 4], ['epiano2', 'エレクトリックピアノ2', 5], ['clavinet', 'クラビネット', 7], ['harpsichord', 'チェンバロ', 6], ['organ', 'オルガン', 16], ['pipeorgan', 'パイプオルガン', 19], ['accordion', 'アコーディオン', 21], ['kenhamo', '鍵盤ハーモニカ', 22], ['celesta', 'チェレスタ', 8]] },
    { id: 'orch', name: 'オーケストラ', icon: '🎻', list: [['strings', 'ストリングス', 48], ['violin', 'バイオリン', 40], ['cello', 'チェロ', 42], ['contrabass', 'コントラバス', 43], ['pizz', 'ピチカート', 45], ['acbass', 'アコースティックベース', 32], ['brassens', 'ブラスアンサンブル', 61], ['trumpet', 'トランペット', 56], ['trombone', 'トロンボーン', 57], ['horn', 'ホルン', 60], ['tuba', 'チューバ', 58], ['sax', 'サクソフォーン', 65], ['clarinet', 'クラリネット', 71], ['oboe', 'オーボエ', 68], ['bassoon', 'ファゴット', 70], ['piccolo', 'ピッコロ', 72], ['flute', 'フルート', 73], ['recorder', 'リコーダー', 74], ['ocarina', 'オカリナ', 79], ['xylophone', '木琴', 13], ['marimba', 'マリンバ', 12], ['vibraphone', 'ビブラフォン', 11], ['glocken', '鉄琴', 9], ['harp', 'ハープ', 46], ['tubularbell', 'チューブラーベル', 14], ['timpani', 'ティンパニ', 47]] },
    { id: 'wa', name: '和楽器', icon: '🎎', list: [['koto', '琴', 107], ['shamisen', '三味線', 106], ['sanshin', '三線', 106], ['shakuhachi', '尺八', 77], ['taikodrum', '太鼓（音程つき）', 116]] },
    { id: 'band', name: 'ギター・ベース', icon: '🎸', list: [['guitar', 'クラシックギター', 24], ['steelguitar', 'フォークギター', 25], ['eguitar', 'エレクトリックギター', 27], ['rockguitar', 'ロックギター', 30], ['ukulele', 'ウクレレ', 24], ['ebass', 'エレクトリックベース', 33]] },
    { id: 'synth', name: 'シンセサイザー', icon: '🎛', list: [['synth1', 'シンセ（やわらか）', 89], ['synth2', 'シンセ（四角い音）', 80], ['synth3', 'シンセ（ふんわり）', 88], ['synthbell', 'シンセベル', 98], ['lead1', 'シンセリード1', 81], ['lead2', 'シンセリード2', 80], ['lead3', 'シンセリード3', 87], ['chip', 'ピコピコ（8bit）', 80], ['chip2', 'ピコピコ（やわらか）', 80], ['sbass1', 'シンセベース1', 38], ['sbass2', 'シンセベース2', 39], ['sbass3', 'シンセベース3', 38]] },
    { id: 'other', name: 'その他', icon: '✨', list: [['steeldrum', 'スチールドラム', 114], ['kalimba', 'カリンバ', 108], ['musicbox', 'オルゴール', 10], ['choir', 'コーラス（あー）', 52], ['bagpipe', 'バグパイプ', 109]] },
  ];

  /* ============================================================
     本物の楽器の録音（FluidR3 GM サウンドフォント／CC BY 3.0）
     samples/<楽器>.js を必要になったときだけ読み込みます。
     3半音ごとの録音を使い、そのあいだの音は高さを少しずらして鳴らします。
     ============================================================ */
  // 楽器ごとの音量の補正（検証スクリプトで測った値から計算。どの楽器でも同じくらいの大きさに聞こえるように）
  const GAIN_SYN = {"acbass": 0.73, "accordion": 1.45, "bagpipe": 1.75, "bassoon": 1.3, "brassens": 1.39, "celesta": 0.61, "cello": 1.63, "chip": 0.74, "chip2": 0.6, "choir": 1.98, "clarinet": 0.66, "clavinet": 1.25, "contrabass": 0.73, "ebass": 0.86, "eguitar": 0.44, "epiano": 0.46, "epiano2": 0.67, "flute": 0.38, "glocken": 0.53, "guitar": 0.78, "harp": 0.66, "harpsichord": 0.93, "horn": 0.75, "kalimba": 0.61, "kenhamo": 0.88, "koto": 0.75, "lead1": 1.27, "lead2": 0.73, "lead3": 1.7, "musicbox": 0.61, "oboe": 3.63, "ocarina": 0.36, "organ": 0.44, "piano": 0.63, "piccolo": 0.38, "pipeorgan": 0.49, "pizz": 1.45, "recorder": 0.36, "rockguitar": 0.34, "sanshin": 0.93, "sax": 0.88, "sbass1": 1.14, "sbass2": 0.83, "sbass3": 0.33, "shakuhachi": 0.48, "steeldrum": 0.64, "steelguitar": 0.78, "strings": 1.63, "synth1": 1.71, "synth2": 0.84, "synth3": 0.79, "synthbell": 0.62, "taikodrum": 0.37, "timpani": 0.38, "trombone": 1.1, "trumpet": 1.13, "tuba": 0.53, "tubularbell": 0.51, "ukulele": 1.1, "vibraphone": 0.53, "violin": 1.63};
  const GAIN_REAL = {"acbass": 2.69, "accordion": 3.59, "bagpipe": 3.2, "bassoon": 3.09, "brassens": 3.74, "celesta": 2.48, "cello": 7.37, "choir": 5.62, "clarinet": 2.34, "clavinet": 2.68, "contrabass": 7.94, "ebass": 2.33, "eguitar": 4.17, "epiano": 2.08, "epiano2": 3.39, "flute": 3.05, "glocken": 3.13, "guitar": 3.11, "harp": 2.16, "harpsichord": 2.57, "horn": 2.44, "kalimba": 5.07, "kenhamo": 3.63, "koto": 4.27, "marimba": 2.63, "musicbox": 3.51, "oboe": 3.37, "ocarina": 2.13, "organ": 3.31, "piano": 4.22, "piccolo": 3.04, "pipeorgan": 3.2, "pizz": 2.53, "recorder": 2.24, "rockguitar": 1.92, "sanshin": 6.46, "sax": 2.32, "shakuhachi": 1.47, "shamisen": 6.46, "steeldrum": 3.22, "steelguitar": 2.65, "strings": 4.12, "taikodrum": 2.65, "timpani": 7.94, "trombone": 1.67, "trumpet": 3.57, "tuba": 1.4, "tubularbell": 2.6, "vibraphone": 3.96, "violin": 3.72, "xylophone": 7.94};
  const SAMPLE_IDS = ['piano', 'epiano', 'epiano2', 'clavinet', 'harpsichord', 'organ', 'pipeorgan', 'accordion', 'kenhamo', 'celesta', 'glocken', 'musicbox', 'vibraphone', 'marimba', 'xylophone', 'tubularbell', 'strings', 'violin', 'cello', 'contrabass', 'pizz', 'harp', 'timpani', 'choir', 'trumpet', 'trombone', 'horn', 'tuba', 'brassens', 'sax', 'oboe', 'clarinet', 'bassoon', 'flute', 'piccolo', 'recorder', 'ocarina', 'acbass', 'guitar', 'steelguitar', 'eguitar', 'rockguitar', 'ebass', 'koto', 'shamisen', 'shakuhachi', 'steeldrum', 'kalimba', 'bagpipe', 'taikodrum'];
  const SAMPLE_FILE = { sanshin: 'shamisen' };
  // 録音しかない楽器を電子音で代わりに鳴らすときの楽器
  const SYNTH_FALLBACK = { celesta: 'musicbox', vibraphone: 'glocken', marimba: 'xylophone', violin: 'strings', cello: 'strings', contrabass: 'acbass', piccolo: 'flute', ocarina: 'recorder', steelguitar: 'guitar', kalimba: 'musicbox', taikodrum: 'timpani' };
  // のばす楽器（録音が終わってもくりかえして鳴らす）
  const SUSTAIN = new Set(['organ', 'pipeorgan', 'accordion', 'kenhamo', 'strings', 'violin', 'cello', 'contrabass', 'choir', 'trumpet', 'trombone', 'horn', 'tuba', 'brassens', 'sax', 'oboe', 'clarinet', 'bassoon', 'flute', 'piccolo', 'recorder', 'ocarina', 'shakuhachi', 'bagpipe']);
  const DRUM_SAMPLES = ['kick', 'snare', 'hihat', 'ohat', 'tomL', 'tomH', 'ride', 'crash', 'odaiko', 'kodaiko', 'awase', 'tamb', 'triangle', 'triMute', 'woodL', 'woodH', 'bongoL', 'bongoH', 'congaL', 'congaH', 'congaM', 'cowbell', 'maracas', 'clave', 'guiro', 'agogoL', 'agogoH', 'clap', 'fuchi', 'hyoshigi', 'kane', 'gong', 'roll', 'whistle'];

  /* 読み込みのしくみ
     - http(s) で開いたとき: samples/mp3/<楽器>/<音>.mp3 を fetch で1音ずつ読む（曲で使う音だけ）
     - file:// で開いたときや mp3/ が無いとき: 今までどおり samples/<楽器>.js を読む
     - 鳴らしたい音がまだ無いときは、いちばん近い録音の高さをずらして鳴らし、その間に正しい録音を読む */
  const raw = {};      // 楽器 → {音: base64}（.js から読んだとき）
  const sets = {};     // 楽器 → { notes: [...], buf: {midi: AudioBuffer} }（1音でも読めたらできる）
  const st = {};       // 楽器 → 読み込みの状態
  const waiting = {};
  let drumRaw = null;
  let drumBufs = null;  // 打楽器ID → AudioBuffer
  let drumSt = null;
  let base = 'samples/';
  let indexP = null;
  const MAX_FETCH = 6;  // 同時に読む数（画面が重くならないように）
  const b64 = (s) => { const bin = atob(s); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a.buffer; };
  const decode = (ctx, data) => new Promise((res, rej) => { const p = ctx.decodeAudioData(data, res, rej); if (p && p.catch) p.catch(rej); });
  function loadScript(name) {
    if (waiting[name]) return waiting[name];
    waiting[name] = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = base + name + '.js';
      s.onload = res;
      s.onerror = () => { delete waiting[name]; rej(new Error('録音を読み込めませんでした: ' + name)); };
      document.head.appendChild(s);
    });
    return waiting[name];
  }
  // samples/mp3/index.json（http(s) のときだけ。読めなければ null → .js を使う）
  function getIndex() {
    if (!indexP) {
      const http = typeof location !== 'undefined' && /^https?:$/.test(location.protocol);
      indexP = !http || typeof fetch !== 'function' ? Promise.resolve(null)
        : fetch(base + 'mp3/index.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    }
    return indexP;
  }
  // 同時に読む数を MAX_FETCH までにする順番待ち（急ぐものは前に入れる）
  const queue = [];
  let running = 0;
  function enqueue(fn, urgent) {
    return new Promise((res, rej) => {
      const job = { fn, res, rej };
      if (urgent) queue.unshift(job); else queue.push(job);
      pump();
    });
  }
  function pump() {
    while (running < MAX_FETCH && queue.length) {
      const j = queue.shift();
      running++;
      Promise.resolve().then(j.fn).then(j.res, j.rej).finally(() => { running--; pump(); });
    }
  }
  async function fetchBuf(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status + ' ' + url);
    return r.arrayBuffer();
  }
  const silent = (b) => {
    const d = b.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < d.length; i += 16) peak = Math.max(peak, Math.abs(d[i]));
    return peak <= 0.003;
  };
  const nearest = (list, m) => { let best = list[0]; for (const n of list) if (Math.abs(n - m) < Math.abs(best - m)) best = n; return best; };

  // 楽器の状態を用意する（どの音があるか・どこから読むか）
  function prepare(f) {
    if (!st[f]) {
      st[f] = { avail: null, src: null, ctx: null, notes: {}, init: null };
      st[f].init = (async () => {
        const idx = await getIndex();
        const list = idx && idx.insts && idx.insts[f];
        if (list && list.length) {
          st[f].avail = list.slice();
          st[f].src = (m) => fetchBuf(base + 'mp3/' + f + '/' + m + '.mp3?v=' + idx.v);
        } else await useScript(f);
      })();
      st[f].init.catch(() => { delete st[f]; });
    }
    return st[f].init;
  }
  async function useScript(f) {
    await loadScript(f);
    const s = st[f];
    s.avail = Object.keys(raw[f]).map(Number).sort((a, b) => a - b);
    s.src = async (m) => b64(raw[f][m]);
  }
  // 1音を読む（読み終わった音・読んでいる音は二度読まない）
  function loadNote(f, m, urgent) {
    const s = st[f];
    if (!s.notes[m]) {
      s.notes[m] = enqueue(async () => {
        let data;
        try { data = await s.src(m); } catch (e) {
          // mp3/ が読めないとき（古い公開物など）は .js に切りかえる
          if (!raw[f]) { await useScript(f); data = await s.src(m); } else throw e;
        }
        const b = await decode(s.ctx, data);
        if (silent(b)) { s.avail = s.avail.filter((n) => n !== m); return null; } // 音域の外で無音になっている録音は使わない
        const set = sets[f] || (sets[f] = { notes: [], buf: {} });
        set.buf[m] = b;
        set.notes = Object.keys(set.buf).map(Number).sort((a, b2) => a - b2);
        if (raw[f] && s.avail.every((n) => set.buf[n])) delete raw[f];
        return b;
      }, urgent);
      s.notes[m].catch(() => { delete s.notes[m]; });
    }
    return s.notes[m];
  }
  // pitches（なければ全部）を鳴らすのに必要な録音を読む
  async function loadFor(f, pitches, urgent) {
    for (let tries = 0; tries < 4; tries++) {
      const s = st[f];
      if (!s.avail.length) return;
      const want = [...new Set(pitches ? pitches.map((p) => nearest(s.avail, p)) : s.avail)];
      want.sort((a, b) => Math.abs(a - 66) - Math.abs(b - 66)); // 真ん中の音から先に
      const res = await Promise.allSettled(want.map((m) => loadNote(f, m, urgent)));
      if (res.every((r) => r.status === 'fulfilled' && r.value)) return;
      if (res.every((r) => r.status === 'rejected') && !sets[f]) throw res[0].reason;
      if (!res.some((r) => r.status === 'fulfilled' && !r.value)) return; // 失敗した音はあとで鳴らすときにもう一度
    }
  }

  const Samples = {
    add(id, map) { raw[id] = map; },
    addDrums(map) { drumRaw = map; },
    has: (id) => SAMPLE_IDS.includes(SAMPLE_FILE[id] || id),
    // 1音でも読めたら true（足りない音は近い録音の高さをずらして鳴らします）
    ready: (id) => !!sets[SAMPLE_FILE[id] || id],
    drumsReady: () => !!drumBufs,
    hasDrum: (id) => DRUM_SAMPLES.includes(id),
    // notes: 曲で使う音の高さ（MIDI番号）の配列。省略するとその楽器の録音を全部読みます
    async load(id, ctx, notes) {
      const f = SAMPLE_FILE[id] || id;
      if (!SAMPLE_IDS.includes(f)) return null;
      await prepare(f);
      if (!st[f].ctx) st[f].ctx = ctx;
      const pitches = Array.isArray(notes) && notes.length ? [...new Set(notes.map(Math.round))] : null;
      await loadFor(f, pitches, false);
      if (!sets[f]) throw new Error('録音を読み込めませんでした: ' + f);
      return sets[f];
    },
    // ids: 使う打楽器の配列。省略すると全部
    async loadDrums(ctx, ids) {
      if (!drumSt) {
        drumSt = { ctx, notes: {}, init: null };
        drumSt.init = (async () => {
          const idx = await getIndex();
          if (idx && idx.drums && idx.drums.length) {
            drumSt.avail = idx.drums.slice();
            drumSt.src = (k) => fetchBuf(base + 'mp3/drums/' + k + '.mp3?v=' + idx.v);
          } else await drumScript();
        })();
        drumSt.init.catch(() => { drumSt = null; });
      }
      const s = drumSt;
      await s.init;
      const want = (Array.isArray(ids) ? ids : s.avail).filter((k) => s.avail.includes(k));
      const res = await Promise.allSettled(want.map((k) => loadDrum(k, false)));
      if (res.length && res.every((r) => r.status === 'rejected') && !drumBufs) throw res[0].reason;
      if (!drumBufs) drumBufs = {};
      return drumBufs;
    },
    setBase(b) { base = b; indexP = null; },
  };
  async function drumScript() {
    await loadScript('drums');
    drumSt.avail = Object.keys(drumRaw);
    drumSt.src = async (k) => b64(drumRaw[k]);
  }
  function loadDrum(k, urgent) {
    const s = drumSt;
    if (!s.notes[k]) {
      s.notes[k] = enqueue(async () => {
        let data;
        try { data = await s.src(k); } catch (e) {
          if (!drumRaw) { await drumScript(); data = await s.src(k); } else throw e;
        }
        const b = await decode(s.ctx, data);
        (drumBufs || (drumBufs = {}))[k] = b;
        return b;
      }, urgent);
      s.notes[k].catch(() => { delete s.notes[k]; });
    }
    return s.notes[k];
  }

  function playSample(ctx, out, inst, midi, t, dur, vel) {
    const f = SAMPLE_FILE[inst] || inst;
    const set = sets[f];
    const best = nearest(set.notes, midi);
    // もっと近い録音があるのにまだ読んでいなければ、今は近い録音で鳴らし、後ろで読んでおく
    const info = st[f];
    if (info && info.avail && info.avail.length) {
      const right = nearest(info.avail, midi);
      if (right !== best && !info.notes[right]) loadNote(f, right, true).catch(() => {});
    }
    const buf = set.buf[best];
    const rate = Math.pow(2, (midi - best) / 12);
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.playbackRate.value = rate;
    const len = buf.duration / rate;
    const sustain = SUSTAIN.has(inst);
    if (sustain && dur > len * 0.85 && buf.duration > 0.6) {
      s.loop = true;
      s.loopStart = buf.duration * 0.45;
      s.loopEnd = buf.duration * 0.85;
    }
    const g = ctx.createGain();
    const peak = vel * 0.9 * (GAIN_REAL[inst] || 1);
    g.gain.setValueAtTime(peak, t);
    const end = t + Math.max(dur, 0.04);
    const rel = sustain ? 0.06 : 0.25;
    g.gain.setTargetAtTime(0, end, rel);
    s.connect(g);
    g.connect(out);
    s.start(t);
    s.stop(s.loop ? end + rel * 6 : Math.min(t + len, end + rel * 6));
  }

  const INSTRUMENTS = {};
  const GM = {};
  const INST_CAT = {};
  for (const c of CATS) for (const [id, name, gm] of c.list) { INSTRUMENTS[id] = name; GM[id] = gm; INST_CAT[id] = c.id; }

  function playNote(ctx, out, inst, midi, t, dur, vel = 0.8, real = false) {
    if (real && sets[SAMPLE_FILE[inst] || inst]) return playSample(ctx, out, inst, midi, t, dur, vel);
    vel *= GAIN_SYN[inst] || 1;
    inst = SYNTH_FALLBACK[inst] || inst;
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
    p.setTargetAtTime(0, end, c.r / 3);
    const stopAt = end + c.r * 1.6 + 0.05;

    let dest = g;
    let tail = g;
    if (c.trem) {
      const tg = ctx.createGain();
      const lfo = ctx.createOscillator();
      const d = ctx.createGain();
      lfo.frequency.value = c.trem[0];
      d.gain.value = c.trem[1];
      lfo.connect(d); d.connect(tg.gain);
      lfo.start(t); lfo.stop(stopAt);
      g.connect(tg);
      tail = tg;
    }
    if (c.formants) {
      const sum = ctx.createGain();
      for (const [ff, amt] of c.formants) {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = ff;
        bp.Q.value = 5;
        const fg = ctx.createGain();
        fg.gain.value = amt * 2.2;
        sum.connect(bp); bp.connect(fg); fg.connect(g);
      }
      dest = sum;
    } else if (c.lp) {
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
    tail.connect(out);

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
      o.frequency.setValueAtTime(f * mult * (c.pitchDrop ? 1 + c.pitchDrop : 1), t);
      if (c.pitchDrop) o.frequency.setTargetAtTime(f * mult, t, 0.05);
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
      n.connect(bp); bp.connect(ng); ng.connect(dest);
      n.start(t, Math.random());
      n.stop(stopAt);
    }
    if (c.thump) {
      const n = noiseSrc(ctx);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 400;
      const ng = envGain(ctx, out, t, vel * c.thump, 0.15);
      n.connect(lp); lp.connect(ng);
      n.start(t, Math.random()); n.stop(t + 0.3);
    }
  }

  function playPluck(ctx, out, inst, midi, t, dur, vel) {
    const cfg = KS[inst];
    const { buf, rate } = ksBuffer(ctx, midi, inst);
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel * 0.75, t);
    const end = t + Math.max(dur, 0.05);
    const longRing = inst === 'koto' || inst === 'harp' || inst === 'sanshin';
    g.gain.setTargetAtTime(0, end, longRing ? 0.25 : 0.08);
    let node = s;
    if (cfg.hp) { const h = ctx.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = cfg.hp; node.connect(h); node = h; }
    if (cfg.drive) {
      const pre = ctx.createGain();
      pre.gain.value = 1.2;
      const ws = ctx.createWaveShaper();
      ws.curve = driveCurve(cfg.drive);
      const post = ctx.createGain();
      post.gain.value = cfg.drive > 5 ? 0.35 : 0.6;
      node.connect(pre); pre.connect(ws); ws.connect(post); node = post;
    }
    if (cfg.lp) { const l = ctx.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = cfg.lp; node.connect(l); node = l; }
    node.connect(g);
    g.connect(out);
    s.start(t);
    s.stop(Math.min(t + buf.duration / rate, end + 1.2));
  }

  /* ---------- 打楽器 ---------- */
  function envGain(ctx, out, t, peak, decay, attack = 0.001) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
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
    n.stop(t + (attack || 0) + decay + 0.1);
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
  function metal(ctx, out, t, vel, decay, freqs, hp = 3000) {
    const f = filt(ctx, 'highpass', hp);
    const g = envGain(ctx, out, t, vel, decay);
    f.connect(g);
    for (const fr of freqs) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = fr;
      o.connect(f);
      o.start(t);
      o.stop(t + decay + 0.1);
    }
  }
  const D = {
    // ドラムセット
    kick: ['バスドラム', 36, (c, o, t, v) => { toneHit(c, o, t, v, 0.38, 'sine', 150, 45, 0.12); toneHit(c, o, t, v * 0.3, 0.015, 'square', 900); }],
    snare: ['スネア', 38, (c, o, t, v) => { noiseHit(c, o, t, v * 0.5, 0.16, [filt(c, 'highpass', 1500)]); toneHit(c, o, t, v * 0.35, 0.08, 'triangle', 190, 160); }],
    hihat: ['クローズハイハット', 42, (c, o, t, v) => noiseHit(c, o, t, v * 0.4, 0.05, [filt(c, 'highpass', 7000), filt(c, 'bandpass', 10000, 0.8)])],
    ohat: ['オープンハイハット', 46, (c, o, t, v) => noiseHit(c, o, t, v * 0.4, 0.32, [filt(c, 'highpass', 7000), filt(c, 'bandpass', 10000, 0.8)])],
    tomL: ['ロータム', 45, (c, o, t, v) => toneHit(c, o, t, v * 0.8, 0.35, 'sine', 160, 95, 0.25)],
    tomH: ['ハイタム', 50, (c, o, t, v) => toneHit(c, o, t, v * 0.8, 0.28, 'sine', 260, 170, 0.2)],
    ride: ['ライドシンバル', 51, (c, o, t, v) => { metal(c, o, t, v * 0.12, 0.9, [523, 811, 1077, 1573], 5000); noiseHit(c, o, t, v * 0.12, 0.5, [filt(c, 'bandpass', 9000, 2)]); }],
    crash: ['クラッシュシンバル', 49, (c, o, t, v) => { noiseHit(c, o, t, v * 0.45, 1.3, [filt(c, 'highpass', 5000)]); metal(c, o, t, v * 0.08, 0.9, [440, 667, 993, 1420]); }],
    // 音楽室キット
    odaiko: ['大太鼓（ばち）', 35, (c, o, t, v) => { toneHit(c, o, t, v, 0.7, 'sine', 90, 55, 0.25); noiseHit(c, o, t, v * 0.25, 0.12, [filt(c, 'lowpass', 600)]); }],
    kodaiko: ['小太鼓', 38, (c, o, t, v) => { noiseHit(c, o, t, v * 0.55, 0.2, [filt(c, 'highpass', 1800)]); toneHit(c, o, t, v * 0.3, 0.06, 'triangle', 220, 180); }],
    awase: ['合わせシンバル', 57, (c, o, t, v) => { noiseHit(c, o, t, v * 0.5, 1.8, [filt(c, 'highpass', 3500)]); metal(c, o, t, v * 0.1, 1.2, [380, 571, 860, 1230]); }],
    tamb: ['タンブリン', 54, (c, o, t, v) => { noiseHit(c, o, t, v * 0.35, 0.2, [filt(c, 'highpass', 6000)]); noiseHit(c, o, t + 0.015, v * 0.25, 0.15, [filt(c, 'bandpass', 9000, 3)]); }],
    castanet: ['カスタネット', 85, (c, o, t, v) => { noiseHit(c, o, t, v * 0.6, 0.025, [filt(c, 'bandpass', 3200, 3)]); toneHit(c, o, t, v * 0.2, 0.03, 'sine', 1800); }],
    suzu: ['すず', 83, (c, o, t, v) => { for (let i = 0; i < 5; i++) toneHit(c, o, t + i * 0.011, v * 0.07, 0.3, 'sine', 3800 + i * 610); }],
    triangle: ['トライアングル', 81, (c, o, t, v) => { toneHit(c, o, t, v * 0.18, 1.4, 'sine', 4200); toneHit(c, o, t, v * 0.08, 1.0, 'sine', 6930); }],
    triMute: ['トライアングル（ミュート）', 80, (c, o, t, v) => { toneHit(c, o, t, v * 0.18, 0.12, 'sine', 4200); toneHit(c, o, t, v * 0.08, 0.1, 'sine', 6930); }],
    // パーカッション1
    woodL: ['ウッドブロック（低）', 77, (c, o, t, v) => toneHit(c, o, t, v * 0.6, 0.08, 'sine', 800, 760)],
    woodH: ['ウッドブロック（高）', 76, (c, o, t, v) => toneHit(c, o, t, v * 0.6, 0.07, 'sine', 1200, 1150)],
    bongoL: ['ボンゴ（低）', 61, (c, o, t, v) => toneHit(c, o, t, v * 0.6, 0.18, 'sine', 330, 290, 0.05)],
    bongoH: ['ボンゴ（高）', 60, (c, o, t, v) => toneHit(c, o, t, v * 0.6, 0.14, 'sine', 470, 420, 0.05)],
    congaL: ['コンガ（低）', 64, (c, o, t, v) => toneHit(c, o, t, v * 0.7, 0.3, 'sine', 210, 185, 0.06)],
    congaH: ['コンガ（高）', 63, (c, o, t, v) => toneHit(c, o, t, v * 0.7, 0.25, 'sine', 300, 270, 0.06)],
    congaM: ['コンガ（ミュート）', 62, (c, o, t, v) => { toneHit(c, o, t, v * 0.6, 0.06, 'sine', 320, 280); noiseHit(c, o, t, v * 0.2, 0.03, [filt(c, 'bandpass', 2000, 2)]); }],
    cowbell: ['カウベル', 56, (c, o, t, v) => { const bp = filt(c, 'bandpass', 800, 2); const g = envGain(c, o, t, v * 0.5, 0.3); bp.connect(g); for (const f of [540, 800]) { const x = c.createOscillator(); x.type = 'square'; x.frequency.value = f; x.connect(bp); x.start(t); x.stop(t + 0.4); } }],
    // パーカッション2
    maracas: ['マラカス', 70, (c, o, t, v) => noiseHit(c, o, t, v * 0.3, 0.06, [filt(c, 'highpass', 5000)], 0.015)],
    clave: ['クラベス', 75, (c, o, t, v) => toneHit(c, o, t, v * 0.6, 0.06, 'sine', 2500)],
    guiro: ['ギロ', 73, (c, o, t, v) => { for (let i = 0; i < 9; i++) noiseHit(c, o, t + i * 0.022, v * 0.25, 0.015, [filt(c, 'bandpass', 3500, 4)]); }],
    shaker: ['シェーカー', 82, (c, o, t, v) => noiseHit(c, o, t, v * 0.25, 0.1, [filt(c, 'bandpass', 7000, 1)], 0.03)],
    agogoL: ['アゴゴー（低）', 68, (c, o, t, v) => { toneHit(c, o, t, v * 0.25, 0.35, 'sine', 660); toneHit(c, o, t, v * 0.08, 0.2, 'sine', 1720); }],
    agogoH: ['アゴゴー（高）', 67, (c, o, t, v) => { toneHit(c, o, t, v * 0.25, 0.3, 'sine', 990); toneHit(c, o, t, v * 0.08, 0.18, 'sine', 2580); }],
    gong: ['ドラ', 52, (c, o, t, v) => { for (const [f, a] of [[110, 0.3], [167, 0.2], [233, 0.15], [311, 0.1], [523, 0.05]]) toneHit(c, o, t, v * a, 3.5, 'sine', f * 1.02, f, 0.5); noiseHit(c, o, t, v * 0.1, 0.8, [filt(c, 'bandpass', 800, 1)]); }],
    clap: ['クラップ（手拍子）', 39, (c, o, t, v) => { for (const d of [0, 0.011, 0.023]) noiseHit(c, o, t + d, v * 0.45, d === 0.023 ? 0.16 : 0.02, [filt(c, 'bandpass', 1200, 1.2)]); }],
    // 和楽器
    chodaiko: ['長胴太鼓', 41, (c, o, t, v) => { toneHit(c, o, t, v * 1.0, 0.9, 'sine', 95, 58, 0.3); noiseHit(c, o, t, v * 0.35, 0.18, [filt(c, 'lowpass', 500)]); }],
    fuchi: ['長胴太鼓（フチ打ち）', 37, (c, o, t, v) => { toneHit(c, o, t, v * 0.6, 0.05, 'triangle', 1500, 1200); noiseHit(c, o, t, v * 0.3, 0.03, [filt(c, 'bandpass', 2500, 3)]); }],
    okedo: ['桶胴太鼓', 43, (c, o, t, v) => { toneHit(c, o, t, v * 0.9, 0.45, 'sine', 140, 95, 0.2); noiseHit(c, o, t, v * 0.25, 0.1, [filt(c, 'lowpass', 900)]); }],
    shime: ['締太鼓', 47, (c, o, t, v) => { toneHit(c, o, t, v * 0.7, 0.15, 'sine', 420, 360, 0.05); noiseHit(c, o, t, v * 0.3, 0.05, [filt(c, 'bandpass', 2200, 2)]); }],
    otsuzumi: ['大つづみ', 66, (c, o, t, v) => { toneHit(c, o, t, v * 0.6, 0.1, 'triangle', 1300, 1100, 0.05); noiseHit(c, o, t, v * 0.4, 0.05, [filt(c, 'bandpass', 3000, 3)]); }],
    kotsuzumi: ['小つづみ', 65, (c, o, t, v) => { toneHit(c, o, t, v * 0.7, 0.35, 'sine', 420, 300, 0.15); toneHit(c, o, t, v * 0.15, 0.2, 'sine', 840, 600, 0.15); }],
    hyoshigi: ['拍子木', 75, (c, o, t, v) => { toneHit(c, o, t, v * 0.6, 0.06, 'triangle', 2500); noiseHit(c, o, t, v * 0.2, 0.02, [filt(c, 'bandpass', 3000, 4)]); }],
    kane: ['鉦（チャンチキ）', 80, (c, o, t, v) => { metal(c, o, t, v * 0.2, 0.25, [1450, 2230, 3100], 1200); toneHit(c, o, t, v * 0.2, 0.25, 'sine', 2900); }],
    // EDM
    kick808: ['キック（EDM）', 36, (c, o, t, v) => { toneHit(c, o, t, v, 0.7, 'sine', 120, 42, 0.08); toneHit(c, o, t, v * 0.4, 0.01, 'square', 1200); }],
    snareE: ['スネア（EDM）', 40, (c, o, t, v) => { noiseHit(c, o, t, v * 0.55, 0.22, [filt(c, 'bandpass', 4000, 0.7)]); toneHit(c, o, t, v * 0.4, 0.1, 'sine', 240, 180); }],
    hihatE: ['ハイハット（EDM）', 42, (c, o, t, v) => metal(c, o, t, v * 0.12, 0.05, [3150, 4410, 5630, 6890], 8000)],
    ohatE: ['オープンハット（EDM）', 46, (c, o, t, v) => metal(c, o, t, v * 0.12, 0.3, [3150, 4410, 5630, 6890], 8000)],
    tomE: ['タム（EDM）', 48, (c, o, t, v) => toneHit(c, o, t, v * 0.8, 0.3, 'sine', 300, 120, 0.2)],
    percE: ['パーカッション（EDM）', 76, (c, o, t, v) => toneHit(c, o, t, v * 0.4, 0.08, 'square', 1800, 900, 0.05)],
    clapE: ['クラップ（EDM）', 39, (c, o, t, v) => { for (const d of [0, 0.008, 0.016, 0.024]) noiseHit(c, o, t + d, v * 0.4, d === 0.024 ? 0.25 : 0.012, [filt(c, 'bandpass', 1500, 0.9)]); }],
    crashE: ['クラッシュ（EDM）', 49, (c, o, t, v) => noiseHit(c, o, t, v * 0.4, 1.6, [filt(c, 'highpass', 6000)])],
    // 効果音
    orch1: ['オーケストラヒット1', 55, (c, o, t, v) => { for (const m of [48, 55, 60, 64, 67, 72]) { const x = c.createOscillator(); x.type = 'sawtooth'; x.frequency.value = mtof(m); const g = envGain(c, o, t, v * 0.08, 0.35); x.connect(g); x.start(t); x.stop(t + 0.5); } noiseHit(c, o, t, v * 0.2, 0.15, [filt(c, 'lowpass', 3000)]); }],
    orch2: ['オーケストラヒット2', 55, (c, o, t, v) => { for (const m of [45, 52, 57, 60, 64, 69]) { const x = c.createOscillator(); x.type = 'sawtooth'; x.frequency.value = mtof(m); const g = envGain(c, o, t, v * 0.08, 0.35); x.connect(g); x.start(t); x.stop(t + 0.5); } noiseHit(c, o, t, v * 0.2, 0.15, [filt(c, 'lowpass', 3000)]); }],
    airhorn: ['ホーン', 56, (c, o, t, v) => { for (const f of [440, 446, 554]) { const x = c.createOscillator(); x.type = 'sawtooth'; x.frequency.value = f; const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * 0.1, t + 0.02); g.gain.setValueAtTime(v * 0.1, t + 0.45); g.gain.linearRampToValueAtTime(0, t + 0.55); x.connect(g); g.connect(o); x.start(t); x.stop(t + 0.6); } }],
    roll: ['ドラムロール', 38, (c, o, t, v) => { for (let i = 0; i < 16; i++) noiseHit(c, o, t + i * 0.035, v * (0.2 + i * 0.015), 0.05, [filt(c, 'highpass', 1500)]); }],
    beam: ['ビーム', 81, (c, o, t, v) => toneHit(c, o, t, v * 0.3, 0.35, 'square', 2400, 200, 0.3)],
    pop: ['ポン（あわ）', 81, (c, o, t, v) => toneHit(c, o, t, v * 0.5, 0.08, 'sine', 400, 1400, 0.06)],
    whistle: ['ホイッスル', 71, (c, o, t, v) => { const x = c.createOscillator(); x.frequency.value = 2500; const l = c.createOscillator(); l.frequency.value = 30; const lg = c.createGain(); lg.gain.value = 120; l.connect(lg); lg.connect(x.frequency); const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * 0.15, t + 0.02); g.gain.setValueAtTime(v * 0.15, t + 0.3); g.gain.linearRampToValueAtTime(0, t + 0.35); x.connect(g); g.connect(o); x.start(t); l.start(t); x.stop(t + 0.4); l.stop(t + 0.4); }],
    jump: ['ジャンプ', 81, (c, o, t, v) => toneHit(c, o, t, v * 0.3, 0.2, 'square', 300, 1200, 0.15)],
  };
  const DRUMS = {};
  for (const id in D) DRUMS[id] = { name: D[id][0], gm: D[id][1], play: D[id][2] };

  const KITS = [
    { id: 'drums', name: 'ドラムキット', icon: '🥁', list: ['crash', 'ride', 'ohat', 'hihat', 'tomH', 'tomL', 'snare', 'kick'] },
    { id: 'school', name: '音楽室キット', icon: '🏫', list: ['triMute', 'triangle', 'suzu', 'castanet', 'tamb', 'awase', 'kodaiko', 'odaiko'] },
    { id: 'wa', name: '和太鼓・和楽器', icon: '🏮', list: ['kane', 'hyoshigi', 'kotsuzumi', 'otsuzumi', 'shime', 'okedo', 'fuchi', 'chodaiko'] },
    { id: 'perc1', name: 'パーカッション1', icon: '🪘', list: ['cowbell', 'congaM', 'congaH', 'congaL', 'bongoH', 'bongoL', 'woodH', 'woodL'] },
    { id: 'perc2', name: 'パーカッション2', icon: '🪇', list: ['clap', 'gong', 'agogoH', 'agogoL', 'shaker', 'guiro', 'clave', 'maracas'] },
    { id: 'edm', name: 'EDMキット', icon: '🎧', list: ['crashE', 'clapE', 'percE', 'tomE', 'ohatE', 'hihatE', 'snareE', 'kick808'] },
    { id: 'fx', name: '効果音', icon: '💥', list: ['jump', 'whistle', 'pop', 'beam', 'roll', 'airhorn', 'orch2', 'orch1'] },
  ];

  function playDrum(ctx, out, id, t, vel = 0.8, real = false) {
    if (real && drumBufs && drumBufs[id]) {
      const s = ctx.createBufferSource();
      s.buffer = drumBufs[id];
      const g = ctx.createGain();
      g.gain.value = vel * 0.9;
      s.connect(g); g.connect(out);
      s.start(t);
      return;
    }
    // まだ読んでいない打楽器は電子音で鳴らし、後ろで読んでおく
    if (real && drumSt && drumSt.avail && drumSt.avail.includes(id) && !drumSt.notes[id]) loadDrum(id, true).catch(() => {});
    const d = DRUMS[id];
    if (d) d.play(ctx, out, t, vel);
  }

  const METRO_SOUNDS = { click: 'ピッ（電子音）', wood: 'カッ（木の音）', bell: 'チーン（ベル）' };
  function click(ctx, out, t, accent, kind = 'click') {
    if (kind === 'wood') toneHit(ctx, out, t, accent ? 0.7 : 0.45, 0.06, 'sine', accent ? 1500 : 1100);
    else if (kind === 'bell') { toneHit(ctx, out, t, accent ? 0.35 : 0.2, accent ? 0.5 : 0.15, 'sine', accent ? 2093 : 1568); }
    else toneHit(ctx, out, t, accent ? 0.5 : 0.3, 0.05, 'square', accent ? 1600 : 1000);
  }

  /* ---------- ホールの響き（リバーブ） ---------- */
  const revCache = new WeakMap();
  function makeReverb(ctx, seconds = 2.0) {
    // 響きのデータは一度だけ作って使い回す（再生開始を速くするため）
    let m = revCache.get(ctx);
    if (!m) { m = {}; revCache.set(ctx, m); }
    if (m[seconds]) { const cv = ctx.createConvolver(); cv.buffer = m[seconds]; return cv; }
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    m[seconds] = buf;
    const cv = ctx.createConvolver();
    cv.buffer = buf;
    return cv;
  }

  return { Samples, mtof, playNote, playDrum, click, makeReverb, driveCurve, INSTRUMENTS, INST_CAT, CATS, DRUMS, KITS, GM, METRO_SOUNDS };
})();
window.Samples = Sound.Samples;
