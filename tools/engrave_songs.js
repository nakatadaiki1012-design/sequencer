// 浄書の検証用の曲（いろいろな要素）
const N = (s, p, l, x = {}) => ({ s, p, l, ...x });
const seq = (start, items) => { let t = start; const out = []; for (const it of items) { const [p, l, x] = it; if (p != null) (Array.isArray(p) ? p : [p]).forEach((pp) => out.push(N(t, pp, l, x || {}))); t += l; } return out; };
module.exports = {
  // 1. 歌：ニ長調、弱起、歌詞、強弱、スラー、タイ、付点、コード
  song1: { v: 2, title: 'うたの練習（ニ長調）', bpm: 92, bars: 9, meter: [4, 4], key: 2, scale: 'major', pickup: 48,
    tracks: [
      { type: 'melody', id: 'v', name: 'うた', inst: 'flute', range: 'soprano',
        dyn: [{ t: 144, v: 'mp' }, { t: 912, v: 'f' }], hairpins: [{ s: 720, e: 900, type: 'cresc' }], slurs: [{ s: 336, e: 384 }],
        notes: seq(144, [[69, 48, { ly: 'そ' }], [74, 72, { ly: 'ら' }], [76, 24, { ly: 'に' }], [78, 48, { ly: 'う' }], [74, 48, { ly: 'か' }],
          [71, 96, { ly: 'ぶ' }], [73, 48, { ly: 'し' }], [74, 48, { ly: 'ろ' }], [76, 144, { ly: 'い' }], [null, 48],
          [78, 48, { ly: 'く' }], [79, 48, { ly: 'も' }], [81, 72, { ly: 'は' }], [79, 24], [78, 48, { ly: 'ど' }], [76, 48, { ly: 'こ' }],
          [74, 192 + 96, { ly: 'へ' }], [null, 96],
          [81, 32, { ly: 'ゆ' }], [83, 32], [81, 32], [79, 48, { ly: 'く' }], [78, 48, { ly: 'の' }], [76, 48, { ly: 'だ' }],
          [74, 48, { ly: 'ろ' }], [73, 48, { ly: 'う' }], [74, 96, { ly: 'か' }], [null, 48],
          [86, 96, { ly: 'あ' }], [85, 48, { ly: 'お' }], [83, 48, { ly: 'い' }], [81, 192, { ly: 'そ' }], [79, 96, { ly: 'ら' }], [74, 96]]) },
      { type: 'chord', name: 'コード', inst: 'piano', pattern: 'whole', chords: [{ r: 2, q: 'M' }, { r: 2, q: 'M' }, { r: 7, q: 'M' }, { r: 9, q: '7' }, { r: 2, q: 'M' }, { r: 11, q: 'm' }, { r: 7, q: 'M' }, { r: 9, q: '7' }, { r: 2, q: 'M' }] },
    ] },
  // 2. ピアノ：変ホ長調、大譜表、和音、2声、16分、3連、臨時記号、高い音・低い音、ペダルなし
  song2: { v: 2, title: 'ピアノ小品（変ホ長調）', bpm: 76, bars: 6, meter: [3, 4], key: 3, scale: 'major',
    tracks: [
      { type: 'melody', id: 'rh', name: '右手', inst: 'piano', range: 'all',
        notes: [...seq(0, [[[67, 70, 75], 48], [79, 24], [77, 12], [75, 12], [74, 32], [75, 32], [77, 32]]),
          ...seq(144, [[79, 72], [80, 24], [82, 48], [84, 96, { art: ['ten'] }], [86, 48], [87, 96], [91, 48, { art: ['acc'] }], [96, 48], [94, 24], [92, 24]]),
          ...seq(576, [[[79, 82], 48], [[78, 81], 48], [[77, 80], 48], [75, 144, { art: ['ferm'] }]])] },
      { type: 'melody', id: 'lh', name: '左手', inst: 'piano', range: 'all',
        notes: [...seq(0, [[39, 48], [[46, 51, 55], 48], [[46, 51, 55], 48], [44, 48], [[48, 51, 56], 96], [43, 48], [[46, 51, 55], 96], [36, 48], [[48, 51, 54], 96], [34, 48], [[46, 50, 53], 96], [39, 144]])] },
    ] },
  // 3. 合唱2部＋リズム：ト長調→ホ短調へ転調、くり返し・1番2番・D.C.、6/8、リハーサル記号・テキスト
  song3: { v: 2, title: 'ふたつのこえ', bpm: 120, bars: 8, meter: [6, 8], key: 7, scale: 'major', keys: { 4: { key: 4, minor: true } },
    repeats: { start: [0], end: [3], volta: { 2: 1, 3: 2 } }, rehearsal: { 0: 'A', 4: 'B' }, jumps: { fine: 3, dc: 7 },
    tracks: [
      { type: 'melody', id: 's', name: 'ソプラノ', inst: 'flute', range: 'soprano', texts: [{ t: 0, x: 'やさしく' }, { t: 576, x: 'dolce' }],
        notes: seq(0, [[74, 72], [76, 24], [74, 48], [79, 144], [78, 72], [76, 72], [74, 144], [71, 144], [74, 144],
          [71, 72], [72, 24], [71, 48], [67, 144], [75, 72], [76, 72], [78, 144], [79, 144], [76, 288]]) },
      { type: 'melody', id: 'a', name: 'アルト', inst: 'clarinet', range: 'alto',
        notes: seq(0, [[67, 144], [71, 144], [69, 72], [67, 72], [66, 144], [67, 144], [67, 144],
          [67, 144], [64, 144], [66, 144], [71, 144], [71, 144], [71, 144], [64, 288]]) },
      { type: 'drum', name: 'リズム', kit: 'drums', grid: { kick: { 0: 2, 144: 1, 288: 2, 432: 1 }, snare: { 72: 1, 216: 1, 360: 1, 504: 1 } } },
    ] },
  // 4. 器楽：変ロ長調のトランペット（移調）、記号いっぱい、32分、装飾音、トリル、長い休み、高音
  song4: { v: 2, title: 'ファンファーレ', bpm: 108, bars: 8, meter: [2, 4], key: 10, scale: 'major', tempos: { 4: 80 }, ramps: { 6: { type: 'rit', n: 2 } },
    tracks: [
      { type: 'melody', id: 't', name: 'トランペット', inst: 'trumpet', range: 'soprano',
        dyn: [{ t: 0, v: 'ff' }, { t: 384, v: 'p' }, { t: 576, v: 'sf' }], slurs: [{ s: 384, e: 480 }],
        notes: [...seq(0, [[70, 12, { art: ['stac'] }], [70, 12, { art: ['stac'] }], [70, 24, { art: ['acc'] }], [74, 24, { art: ['acc'] }], [77, 24, { art: ['marc'] }],
          [82, 6], [81, 6], [79, 6], [77, 6], [75, 6], [74, 6], [72, 6], [70, 6], [77, 48, { art: ['tr'] }], [null, 96]]),
          ...seq(384, [[74, 48, { gr: 75 }], [75, 24], [77, 24], [79, 96, { art: ['turn'] }], [null, 96], [82, 96, { art: ['acc', 'ferm'] }], [null, 96], [null, 96], [70, 96, { art: ['marc'] }], [null, 96], [89, 96]])] },
    ] },
};
const N2 = (s, p, l, x = {}) => ({ s, p, l, ...x });
module.exports.song5 = { v: 2, title: 'English Song & Chords', bpm: 110, bars: 6, meter: [4, 4], key: 0, scale: 'major',
  tracks: [
    { type: 'melody', id: 'v', name: 'Vocal', inst: 'flute', range: 'soprano', dyn: [{ t: 0, v: 'p' }, { t: 384, v: 'ff' }], hairpins: [{ s: 192, e: 370, type: 'cresc' }],
      notes: [N2(0, 72, 24, { ly: 'Beautiful' }), N2(24, 74, 24, { ly: 'wonderful' }), N2(48, 76, 24, { ly: 'everything' }), N2(72, 77, 24, { ly: 'tomorrow' }), N2(96, 79, 48, { ly: 'yesterday' }), N2(144, 81, 48, { ly: 'remember' }),
        N2(192, 84, 48, { ly: 'しあわせ', art: ['tr'], fg: '3' }), N2(240, 86, 48, { ly: 'ありがとう', art: ['acc'] }), N2(288, 88, 96, { ly: 'さようなら', art: ['ferm', 'marc'] }),
        N2(384, 91, 192, { ly: 'oh', art: ['turn'] }), N2(576, 55, 96, { ly: 'low', fg: '1' }), N2(672, 53, 96, { ly: 'lower' }), N2(768, 72, 48), N2(816, 74, 48), N2(864, 76, 96, { ly: 'end' }), N2(960, 72, 192)] },
    { type: 'chord', name: 'コード', inst: 'piano', pattern: 'whole', chords: [{ r: 0, q: 'M7', h: { r: 9, q: 'm7' } }, { r: 5, q: 'M7', h: { r: 7, q: '7' } }, { r: 4, q: 'm7', h: { r: 9, q: '7' } }, { r: 2, q: 'm7', h: { r: 7, q: 'sus4' } }, { r: 0, q: 'M' }, { r: 0, q: 'M' }] },
  ] };
