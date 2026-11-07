/* ============================================================
   楽器のイラスト（インラインSVG）
   InstIcons.inst(id) / InstIcons.kit(id) / InstIcons.cat(id) が SVG の文字列を返します。
   色は currentColor（線）と --ii-fill（ぬり）で決まるので、ダークモードでも使えます。
   ============================================================ */
const InstIcons = (() => {
  const T = ' style="fill:var(--ii-fill,#e0e7ff)"'; // うすい色でぬる
  const C = ' fill="currentColor" stroke="none"'; // 線の色でぬる
  const TS = ' style="stroke:var(--ii-fill,#e0e7ff)"'; // うすい色の線
  const svg = (b, sw = 2) => `<svg class="ii" viewBox="0 0 48 48" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${b}</svg>`;
  const g = (tf, b) => `<g transform="${tf}">${b}</g>`;
  const rot = (a) => `rotate(${a} 24 24)`;

  // 鍵盤（白鍵 n 本、黒鍵つき）
  function kb(x, y, w, h, n, rx = 1.5) {
    const kw = w / n;
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"${T}/>`;
    let p = '';
    for (let i = 1; i < n; i++) p += `M${+(x + i * kw).toFixed(2)} ${y}V${y + h}`;
    s += `<path d="${p}" stroke-width="1.25"/>`;
    for (let i = 0; i < n - 1; i++) {
      if ([0, 1, 3, 4, 5].includes(i % 7)) {
        const bw = kw * 0.56;
        s += `<rect x="${+(x + (i + 1) * kw - bw / 2).toFixed(2)}" y="${y}" width="${+bw.toFixed(2)}" height="${+(h * 0.6).toFixed(2)}" rx=".5"${C}/>`;
      }
    }
    return s;
  }
  // きらきら（4つのとんがり）
  const spark = (x, y, r) => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z"${C}/>`;
  // 小さな8分音符
  const note = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="2"${C} transform="rotate(-20 ${x} ${y})"/><path d="M${x + 2.3} ${y - 0.5}V${y - 9}l3.5 2.5"/>`;
  // はじく線（ピチカート）
  const pluck = (x, y) => `<path d="M${x} ${y}h4M${x - 0.5} ${y - 4.5}l3.2-2.4M${x - 0.5} ${y + 4.5}l3.2 2.4" stroke-width="1.75"/>`;
  // バイオリン族の胴体（上下 16〜44 / 中心 x=24）
  const VBODY = 'M24 16C18.5 16 15.5 18 15.5 21.5C15.5 25 19.5 26.5 19.5 29C19.5 31.5 14 33 14 37.5C14 42 18.5 44 24 44C29.5 44 34 42 34 37.5C34 33 28.5 31.5 28.5 29C28.5 26.5 32.5 25 32.5 21.5C32.5 18 29.5 16 24 16Z';
  const BBODY = 'M24 14C20 15 16.5 18.5 16.5 23C16.5 26 19.5 27 19.5 29.5C19.5 31.5 13.5 33 13.5 37.5C13.5 42 18.5 44 24 44C29.5 44 34.5 42 34.5 37.5C34.5 33 28.5 31.5 28.5 29.5C28.5 27 31.5 26 31.5 23C31.5 18.5 28 15 24 14Z';
  const fholes = '<path d="M19.6 32.5q-1.4 2.5 0 5M28.4 32.5q1.4 2.5 0 5" stroke-width="1.5"/>';
  const violin = () => `<path d="${VBODY}"${T}/>${fholes}<rect x="22.6" y="6" width="2.8" height="23" rx="1.4"${C}/><circle cx="24" cy="4.6" r="2"/><path d="M21 35.5h6"/><path d="M22.3 40h3.4" stroke-width="2.5"/>`;
  const bass = (endpin = true) => `<path d="${BBODY}"${T}/>${fholes}<rect x="22.6" y="5" width="2.8" height="24" rx="1.4"${C}/><circle cx="24" cy="3.8" r="1.8"/><path d="M21 35.5h6"/>${endpin ? '<path d="M24 44v3"/>' : ''}`;
  // 小さなトランペット（ブラスアンサンブル用）
  const tp = (x, y) => `<path d="M${x + 22} ${y - 1.5}C${x + 26} ${y - 1.5} ${x + 29} ${y - 4} ${x + 34} ${y - 8}V${y + 8}C${x + 29} ${y + 4} ${x + 26} ${y + 1.5} ${x + 22} ${y + 1.5}Z"${T}/><path d="M${x + 2} ${y}H${x + 22}M${x + 8} ${y}v3.5q0 2 2 2h8q2 0 2-2v-2"/><path d="M${x} ${y - 2}v4"/><rect x="${x + 8.5}" y="${y - 7}" width="3" height="7" rx=".8"${T}/><rect x="${x + 13}" y="${y - 7}" width="3" height="7" rx=".8"${T}/><rect x="${x + 17.5}" y="${y - 7}" width="3" height="7" rx=".8"${T}/>`;
  const bow = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}"/>`;

  // シンセ（パネル＋画面＋鍵盤）
  const synth = (wave) => `<rect x="4" y="9" width="40" height="31" rx="3"${T}/><rect x="8" y="13" width="19" height="10" rx="1.5"${C}/><path d="${wave}" stroke-width="1.75"${TS}/><circle cx="33" cy="18" r="2.4"/><circle cx="39.5" cy="18" r="2.4"/>${kb(4, 27, 40, 13, 10)}`;
  // リード（ホイールつきの小さいシンセ＋大きな画面）
  const lead = (wave) => `<rect x="4" y="9" width="40" height="31" rx="3"${T}/><rect x="8" y="13" width="32" height="10" rx="1.5"${C}/><path d="${wave}" stroke-width="1.75"${TS}/><rect x="6.5" y="28" width="3" height="9" rx="1.5"${C}/><rect x="11" y="28" width="3" height="9" rx="1.5"${C}/>${kb(16, 27, 28, 13, 7)}`;
  // シンセベース（スピーカー＋波形）
  const sbass = (wave) => `<rect x="8" y="4" width="32" height="40" rx="3"${T}/><path d="${wave}" stroke-width="1.75"/><circle cx="24" cy="30" r="9"/><circle cx="24" cy="30" r="3.5"${C}/>`;
  const W = {
    sine: 'M10.5 18q2.25-5 4.5 0t4.5 0t4.5 0',
    square: 'M10.5 20.5v-5h3.5v5h3.5v-5h3.5v5h3',
    tri: 'M10.5 20.5l2.7-5l2.7 5l2.7-5l2.7 5l2.7-5',
    saw: 'M11 20.5l4.5-5v5l4.5-5v5l4.5-5v5',
  };

  // ギター族（たて向きに描いて回す）
  const GBODY = 'M24 21C19 21 16.5 23 16.5 26.5C16.5 29.5 19.5 30.5 19.5 32C19.5 33.5 14 35 14 39C14 43 18 45 24 45C30 45 34 43 34 39C34 35 28.5 33.5 28.5 32C28.5 30.5 31.5 29.5 31.5 26.5C31.5 23 29 21 24 21Z';
  const DBODY = 'M24 20C18.5 20 16 22 16 25.5C16 28.5 17.5 30 17.5 31.5C17.5 33 13.5 35 13.5 39C13.5 43.5 18 45 24 45C30 45 34.5 43.5 34.5 39C34.5 35 30.5 33 30.5 31.5C30.5 30 32 28.5 32 25.5C32 22 29.5 20 24 20Z';

  const I = {
    piano: () => `<path d="M7 21L36 6.5Q42 4 42 9V21Z"${T}/><path d="M14 21L30 11" stroke-width="1.5"/><rect x="4" y="21" width="40" height="9" rx="2"${T}/>${kb(6, 23, 16, 5, 7, 0.8).replace(/stroke-width="1.25"/, 'stroke-width="1"')}<path d="M9 30v13M39 30v13M24 30v8M21 41h6"/>`,
    epiano: () => `${kb(4, 18, 40, 12, 10)}<path d="M12 30l24 13M36 30L12 43"/><path d="M27 2.5l-6.5 8h6l-5 6" stroke-width="2.25"/>`,
    epiano2: () => `${kb(4, 18, 40, 12, 10)}<path d="M12 30l24 13M36 30L12 43"/><path d="M40 18v-5q0-4-4-4h-6"/><rect x="21" y="5" width="9" height="8" rx="2"${C}/><path d="M21 7h-4M21 11h-4" stroke-width="2"/>`,
    clavinet: () => `<path d="M4 34V16l5-6h30l5 6v18Z"${T}/><path d="M10 14h28M9 17.5h30" stroke-width="1.5"/>${kb(4, 21, 40, 13, 10)}<path d="M8 34v10M40 34v10"/>`,
    harpsichord: () => `<path d="M8 36V7Q8 4 11 4H16L40 29V36Z"${T}/><path d="M13 33V8M18 33V8.5M23 33V12.5M28 33V17.5M33 33V22.5" stroke-width="1.25"/><path d="M8 30h32" stroke-width="1.5"/>${kb(6, 36, 36, 7, 7)}`,
    organ: () => `<path d="M6 44V8Q6 5 9 5H39Q42 5 42 8V44"${T}/><path d="M13 9v4M17 9v6M21 9v3M27 9v5M31 9v3M35 9v6" stroke-width="2"/>${kb(9, 18, 30, 8, 7)}${kb(9, 28, 30, 8, 7)}<path d="M6 44h36"/>`,
    pipeorgan: () => [[7.5, 18], [14.5, 11], [21.5, 5], [28.5, 11], [35.5, 18]].map(([x, t]) => `<path d="M${x} 33V${t + 1.5}Q${x} ${t} ${x + 1.5} ${t}H${x + 3.5}Q${x + 5} ${t} ${x + 5} ${t + 1.5}V33"${T}/><path d="M${x + 1} 29l1.5-2.5l1.5 2.5Z"${C}/>`).join('') + `<rect x="4" y="33" width="40" height="10" rx="2"${T}/><path d="M9 38h30" stroke-width="1.5"/>`,
    accordion: () => `<path d="M13 11L35 11L35 37L13 37Z"${T}/><path d="M16.5 11v26M20 11v26M23.5 11v26M27 11v26M30.5 11v26" stroke-width="1.5"/><rect x="4" y="7" width="9" height="34" rx="2"${T}/><circle cx="8.5" cy="14" r="1.3"${C}/><circle cx="8.5" cy="20" r="1.3"${C}/><circle cx="8.5" cy="26" r="1.3"${C}/><circle cx="8.5" cy="32" r="1.3"${C}/><rect x="35" y="7" width="9" height="34" rx="2"${T}/><path d="M35 13h9M35 19h9M35 25h9M35 31h9M35 37h9" stroke-width="1.25"/><path d="M35 16h5M35 22h5M35 34h5" stroke-width="2.5"/>`,
    kenhamo: () => `<rect x="10" y="15" width="34" height="18" rx="4"${T}/>${kb(13, 18, 28, 12, 9, 1)}<path d="M10 25C3 25 3 36 9 38.5C13 40 16 40 21 40"/><rect x="20" y="37.5" width="8" height="5" rx="2"${C}/>`,
    celesta: () => `<rect x="8" y="14" width="32" height="13" rx="2"${T}/><path d="M14 14v-3h20v3"/>${kb(5, 26, 38, 8, 7)}<path d="M9 34v9M39 34v9M9 39h30"/>${spark(41, 7, 4.5)}${spark(33, 4.5, 2.5)}`,

    strings: () => g(`translate(-7 3) ${rot(-25)} scale(.85) translate(4 4)`, violin()) + g(`translate(7 -3) ${rot(-25)} scale(.85) translate(4 4)`, `<path d="${VBODY}"${T}/>${fholes}<rect x="22.6" y="6" width="2.8" height="23" rx="1.4"${C}/><circle cx="24" cy="4.6" r="2"/>`),
    violin: () => g(rot(-30), violin()) + bow(5, 32, 44, 12),
    cello: () => g('translate(0 -2.5)', `<path d="${VBODY}"${T}/>${fholes}<rect x="22.6" y="6" width="2.8" height="23" rx="1.4"${C}/><circle cx="24" cy="4.6" r="2"/><path d="M21 35.5h6"/><path d="M24 44v4"/>`) + bow(4, 31, 44, 37),
    contrabass: () => g('translate(0 -1.5)', bass()) + bow(4, 30, 44, 36),
    pizz: () => g('translate(-4 0) ' + rot(-20), violin()) + pluck(37, 31),
    acbass: () => g('translate(-4 -1.5)', bass()) + pluck(37, 33),
    brassens: () => tp(11, 12) + tp(3, 33),
    trumpet: () => `<path d="M30 24C34 24 38 21 44 15V35C38 30 34 28 30 28Z"${T}/><path d="M6 24H30M14 24v7q0 3 3 3h10q3 0 3-3v-3"/><path d="M3.5 21.5v5"/><rect x="15" y="14" width="3.5" height="10" rx="1"${T}/><rect x="20" y="14" width="3.5" height="10" rx="1"${T}/><rect x="25" y="14" width="3.5" height="10" rx="1"${T}/><path d="M14.5 11.5h4.5M19.5 11.5h4.5M24.5 11.5h4.5" stroke-width="2.25"/>`,
    trombone: () => `<path d="M18 17C14 17 10 14 4 9V29C10 24 14 21 18 21Z"${T}/><path d="M18 17H39Q44 17 44 22.5Q44 28 39 28H33"/><path d="M42 33H8Q4 33 4 36.5Q4 40 8 40H38M35 40V30"/><path d="M33 28V36" stroke-width="1.5"/><path d="M42 30.5V35.5"/>`,
    horn: () => `<circle cx="20" cy="22" r="13"${T}/><circle cx="20" cy="22" r="7"/><path d="M29 31C33 35 35 38 36 43L45 34C40 33 37 31 33 27Z"${T}/><path d="M9 14L4 9M3 11l3-3"/>`,
    tuba: () => `<rect x="12" y="19" width="24" height="25" rx="11"${T}/><path d="M11 4H37C32 7 30 10 30 15V22H18V15C18 10 16 7 11 4Z"${T}/><rect x="18" y="24" width="3" height="7" rx=".8"${C}/><rect x="22.5" y="24" width="3" height="7" rx=".8"${C}/><rect x="27" y="24" width="3" height="7" rx=".8"${C}/><path d="M12 30H6"/><path d="M5 27.5v5"/>`,
    sax: () => `<path d="M17 10H23L25.5 33Q26 37 29.5 37Q33 37 33 33.5L31.5 26L28 20H42L37.5 27L38.5 34Q38 44 29.5 44Q20 44 19.5 34Z"${T}/><path d="M28 20H42" stroke-width="2.5"/><path d="M20 10C19.5 6 16 4 11 4.5"/><path d="M11 4.5L7 5" stroke-width="3"/><circle cx="21.5" cy="16" r="1.5"${C}/><circle cx="22.2" cy="21.5" r="1.5"${C}/><circle cx="22.9" cy="27" r="1.5"${C}/>`,
    clarinet: () => g(rot(35), `<path d="M22 9L22.5 3.5H25.5L26 9"${C}/><rect x="21" y="9" width="6" height="28" rx="1"${T}/><path d="M21 37L17 45H31L27 37"${T}/><path d="M21 14h6M21 25h6" stroke-width="1.5"/><circle cx="24" cy="18.5" r="1.3"${C}/><circle cx="24" cy="29" r="1.3"${C}/><circle cx="24" cy="33" r="1.3"${C}/><circle cx="24" cy="21.5" r="1.3"${C}/>`),
    oboe: () => g(rot(35), `<path d="M24 9V3" stroke-width="1.5"/><path d="M23 4.5l1-3l1 3" stroke-width="1.5"/><path d="M22 9H26L27 39H21Z"${T}/><path d="M21 39L19.5 45H28.5L27 39"${T}/><path d="M22 18h4.3M21.6 29h4.8" stroke-width="1.5"/><circle cx="24" cy="14" r="1.1"${C}/><circle cx="24" cy="23" r="1.1"${C}/><circle cx="24" cy="26" r="1.1"${C}/><circle cx="24" cy="34" r="1.1"${C}/>`),
    bassoon: () => g(rot(15), `<rect x="17" y="7" width="7" height="38" rx="2"${T}/><rect x="24" y="15" width="6" height="30" rx="2"${T}/><path d="M17 7h7" stroke-width="3"/><path d="M27 15C27 9 30 5.5 36 5"/><circle cx="27" cy="34" r="1.2"${C}/><circle cx="27" cy="38" r="1.2"${C}/><circle cx="20.5" cy="18" r="1.2"${C}/><circle cx="20.5" cy="22" r="1.2"${C}/>`),
    piccolo: () => g(rot(-35), `<rect x="9" y="21.5" width="30" height="5" rx="1.5"${T}/><ellipse cx="14" cy="21.5" rx="2.5" ry="1.5"${C}/><circle cx="22" cy="24" r="1.3"${C}/><circle cx="26" cy="24" r="1.3"${C}/><circle cx="30" cy="24" r="1.3"${C}/><circle cx="34" cy="24" r="1.3"${C}/>`),
    flute: () => g(rot(-35), `<rect x="2" y="21.5" width="44" height="5" rx="1.5"${T}/><ellipse cx="8" cy="21.5" rx="2.5" ry="1.5"${C}/><path d="M13 21.5v5M38 21.5v5" stroke-width="1.5"/><circle cx="18" cy="24" r="1.3"${C}/><circle cx="22" cy="24" r="1.3"${C}/><circle cx="26" cy="24" r="1.3"${C}/><circle cx="30" cy="24" r="1.3"${C}/><circle cx="34" cy="24" r="1.3"${C}/>`),
    recorder: () => g(rot(35), `<path d="M21 4H27L27.5 12L26.5 15V38L29 44H19L21.5 38V15L20.5 12Z"${T}/><rect x="22.6" y="9" width="2.8" height="2.5" rx=".5"${C}/><path d="M21.5 15h5M21.5 38h5" stroke-width="1.5"/><circle cx="24" cy="18.5" r="1.3"${C}/><circle cx="24" cy="22.5" r="1.3"${C}/><circle cx="24" cy="26.5" r="1.3"${C}/><circle cx="24" cy="30.5" r="1.3"${C}/><circle cx="24" cy="34.5" r="1.3"${C}/>`),
    ocarina: () => `<path d="M12 18C17 10 34 9 41 16C47 22 44 33 34 35C24 37 16 33 11 28H6Q3 28 3 25.5V23.5Q3 21 6 21H12Z"${T}/><rect x="13.5" y="21" width="3.5" height="3" rx=".8"${C}/><circle cx="23" cy="20" r="2"${C}/><circle cx="29" cy="18" r="2"${C}/><circle cx="35" cy="19" r="2"${C}/><circle cx="39" cy="24" r="2"${C}/><circle cx="27" cy="27" r="1.6"${C}/>`,
    xylophone: () => `<path d="M4 15L36 18M4 31L36 27" stroke-width="2"/>` + [[4, 7, 32], [10, 8.5, 29], [16, 10, 26], [22, 11.5, 23], [28, 13, 20], [34, 14.5, 17]].map(([x, y, h]) => `<rect x="${x}" y="${y}" width="4.5" height="${h}" rx="1"${T}/>`).join('') + `<path d="M44 45L36 36"/><circle cx="35" cy="35" r="3"${C}/>`,
    marimba: () => `<rect x="4" y="8" width="40" height="7" rx="1.5"${T}/><path d="M10.7 8v7M17.3 8v7M24 8v7M30.7 8v7M37.3 8v7" stroke-width="1.25"/>` + [[6, 42], [12.7, 38], [19.3, 34], [26, 30], [32.7, 26], [39.3, 23]].map(([x, b]) => `<rect x="${x}" y="15" width="3" height="${b - 15}" rx="1.5"${T}/>`).join('') + `<path d="M4 15v29M44 15v29"/>`,
    vibraphone: () => `<path d="M8 8q4-4 8 0t8 0t8 0t8 0" stroke-width="2"/><rect x="4" y="14" width="40" height="7" rx="1.5"/><path d="M10.7 14v7M17.3 14v7M24 14v7M30.7 14v7M37.3 14v7" stroke-width="1.25"/>` + [6, 12.7, 19.3, 26, 32.7, 39.3].map((x) => `<rect x="${x}" y="21" width="3" height="16" rx="1.5"${T}/>`).join('') + `<path d="M4 21v23M44 21v23M4 39h40"/>`,
    glocken: () => `<path d="M3 12H45L41 40H7Z"${T}/>` + [[7, 15, 22], [11.5, 16, 20], [16, 17, 18], [20.5, 18, 16], [25, 19, 14], [29.5, 20, 12], [34, 21, 10]].map(([x, y, h]) => `<rect x="${x}" y="${y}" width="3.5" height="${h}" rx=".5"/><circle cx="${x + 1.75}" cy="${y + 2.2}" r=".7"${C}/><circle cx="${x + 1.75}" cy="${y + h - 2.2}" r=".7"${C}/>`).join('') + `<path d="M40 8L44 2"/><circle cx="39" cy="9.5" r="2.2"${C}/>`,
    harp: () => `<path d="M12 44L37 12L40 13L17 44Z"${T}/><path d="M10 9V44H18"/><path d="M10 9C16 2 24 12 38 10" stroke-width="2.5"/><path d="M16 9.5V39M21 10.5V33M26 11V27M31 11V21" stroke-width="1.25"/><rect x="7.5" y="5" width="5" height="5" rx="1.5"${C}/>`,
    tubularbell: () => `<path d="M4 5H44M7 5V44M41 5V44M4 44h7M37 44h7"/>` + [[12, 34], [18, 30], [24, 26], [30, 22]].map(([x, h]) => `<rect x="${x}" y="8" width="4" height="${h}" rx="1"${T}/><path d="M${x} 10.5h4" stroke-width="2.5"/>`).join('') + `<path d="M38 36L31 29"/><rect x="27" y="25" width="6" height="4" rx="1"${C} transform="rotate(45 30 27)"/>`,
    timpani: () => `<path d="M4 22H44C44 33 36 38 24 38C12 38 4 33 4 22Z"${T}/><ellipse cx="24" cy="22" rx="20" ry="5"${T}/><path d="M12 36l-3 8M36 36l3 8M24 38v5"/><path d="M31 15L42 4"/><circle cx="30" cy="16" r="2.6"${C}/>`,

    koto: () => g(rot(-28), `<path d="M3 19Q3 17 5 17H43Q45 17 45 19V29Q45 31 43 31H5Q3 31 3 29Z"${T}/><path d="M7 20.5H41M7 24H41M7 27.5H41" stroke-width="1.1"/>` + [[11, 27.5], [16, 24], [21, 20.5], [26, 27.5], [31, 24], [36, 20.5]].map(([x, y]) => `<path d="M${x - 2.4} ${y + 2.6}L${x} ${y - 2.4}L${x + 2.4} ${y + 2.6}Z"${C}/>`).join('')),
    shamisen: () => g(rot(25), `<rect x="22.5" y="6" width="3" height="24"${T}/><path d="M22.5 6L23 2H25L25.5 6"${C}/><path d="M20.5 5h3M24.5 8h3M20.5 11h3" stroke-width="2"/><rect x="14.5" y="28" width="19" height="16" rx="2"${T}/><path d="M24 29v14" stroke-width="1.25"/><path d="M20.5 40.5h7" stroke-width="2.25"/>`),
    sanshin: () => g(rot(25), `<rect x="22.5" y="6" width="3" height="24"${T}/><path d="M22.5 6L23 2H25L25.5 6"${C}/><path d="M20.5 5h3M24.5 8h3M20.5 11h3" stroke-width="2"/><rect x="14" y="28" width="20" height="16" rx="6"${T}/>` + [[19, 32], [24, 32], [29, 32], [21.5, 36], [26.5, 36], [19, 40], [24, 40], [29, 40]].map(([x, y]) => `<path d="M${x - 1.5} ${y}L${x} ${y - 1.5}L${x + 1.5} ${y}L${x} ${y + 1.5}Z"${C}/>`).join('')),
    shakuhachi: () => g(rot(35), `<path d="M20.5 7L27.5 4V41Q27.5 45 24 45Q20.5 45 20.5 41Z"${T}/><path d="M20.5 15q3.5 1.5 7 0M20.5 26q3.5 1.5 7 0M20.5 36q3.5 1.5 7 0" stroke-width="1.5"/><circle cx="24" cy="20.5" r="1.4"${C}/><circle cx="24" cy="30.5" r="1.4"${C}/><circle cx="24" cy="40" r="1.4"${C}/>`),
    taikodrum: () => `<path d="M8 17Q4 30 8 43H40Q44 30 40 17Z"${T}/><path d="M7 17H41M7 43H41" stroke-width="2.5"/>` + [11, 16, 21, 26, 31, 36].map((x) => `<circle cx="${x + 0.5}" cy="20" r="1"${C}/><circle cx="${x + 0.5}" cy="40" r="1"${C}/>`).join('') + `<path d="M8 3L22 14M40 3L26 14" stroke-width="2.5"/>`,

    guitar: () => g(rot(35), `<rect x="21" y="3" width="6" height="8" rx="1"${T}/><path d="M23 5v4M25 5v4" stroke-width="1.25"/><rect x="22.5" y="11" width="3" height="20" rx=".5"${C}/><path d="${GBODY}"${T}/><circle cx="24" cy="32" r="3.4"${C}/><circle cx="24" cy="32" r="5.2" stroke-width="1.25"/><rect x="20.5" y="38.5" width="7" height="2" rx=".5"${C}/>`),
    steelguitar: () => g(rot(35), `<path d="M21 11L20.5 4Q20.5 2.5 22 2.5H26Q27.5 2.5 27.5 4L27 11Z"${T}/><circle cx="19" cy="5" r="1"${C}/><circle cx="19" cy="8.5" r="1"${C}/><circle cx="29" cy="5" r="1"${C}/><circle cx="29" cy="8.5" r="1"${C}/><rect x="22.5" y="11" width="3" height="20" rx=".5"${C}/><path d="${DBODY}"${T}/><path d="M27 33Q32 34 31 38Q30 40.5 27 38.5" stroke-width="1.5"/><circle cx="24" cy="31" r="3.6"${C}/><path d="M20 40h8" stroke-width="2.5"/>`),
    eguitar: () => g(rot(35), `<path d="M22.5 13V3.5Q22.5 2 24 2H25.5Q27 2 27 4L26 6L27 8L26 10L25.5 13Z"${T}/><rect x="22.5" y="11" width="3" height="18" rx=".5"${C}/><path d="M22 27C22 22 20 18 17 19C15 20 17 25 16 28C13.5 30 13 33 14 37C15.5 42 19 45 24 45C30 45 34 42 34 37C34 33 32 31 31 29C30.5 26 33 21 31 20C28.5 19 26 22 26 27Z"${T}/><rect x="21" y="29.5" width="6" height="2.5" rx=".6"${C}/><rect x="21" y="34" width="6" height="2.5" rx=".6"${C}/><circle cx="29.5" cy="40" r="1.2"${C}/><path d="M19 40h1"/>`),
    rockguitar: () => g(rot(30), `<path d="M23 12L22 4L26 3L25.5 12Z"${T}/><rect x="22.6" y="11" width="2.8" height="18" rx=".5"${C}/><path d="M24 29L15 22L12 25L22 44H26L36 25L33 22Z"${T}/><rect x="21" y="32" width="6" height="2.5" rx=".6"${C}/>`) + `<path d="M40 4l-6 8h5l-4 7" stroke-width="2.25"/>`,
    ukulele: () => g(rot(35), `<rect x="21" y="5" width="6" height="7" rx="1.5"${T}/><circle cx="19.5" cy="7" r="1"${C}/><circle cx="19.5" cy="10" r="1"${C}/><circle cx="28.5" cy="7" r="1"${C}/><circle cx="28.5" cy="10" r="1"${C}/><rect x="22.5" y="12" width="3" height="12" rx=".5"${C}/><path d="M24 20C18 20 15.5 22.5 15.5 27C15.5 30 18.5 31.5 18.5 33C18.5 34.5 14 36 14 39.5C14 43.5 18 45 24 45C30 45 34 43.5 34 39.5C34 36 29.5 34.5 29.5 33C29.5 31.5 32.5 30 32.5 27C32.5 22.5 30 20 24 20Z"${T}/><circle cx="24" cy="29" r="3.4"${C}/><rect x="20.5" y="38.5" width="7" height="2" rx=".5"${C}/>`),
    ebass: () => g(rot(35), `<path d="M22.5 11V2.5H27.5L26.5 11Z"${T}/><path d="M28 4h2M28 8h2" stroke-width="2.25"/><rect x="22.6" y="10" width="2.8" height="21" rx=".5"${C}/><path d="M22 30C22 25 20 22 17.5 23C15.5 24 17 28 16 31C14 33 13.5 35.5 14.5 39C16 43 19 45.5 24 45.5C29.5 45.5 33.5 43 33.5 38.5C33.5 35 31.5 33 31 31.5C30.5 28.5 32.5 25 30.5 24C28.5 23 26 25.5 26 30Z"${T}/><rect x="20.5" y="33.5" width="4" height="2.4" rx=".6"${C}/><rect x="24" y="36" width="4" height="2.4" rx=".6"${C}/>`),

    synth1: () => synth(W.sine),
    synth2: () => synth(W.square),
    synth3: () => synth(W.tri),
    synthbell: () => `<rect x="4" y="9" width="40" height="31" rx="3"${T}/><rect x="8" y="13" width="19" height="10" rx="1.5"${C}/><path d="M14 20.5q0-5 3.5-5t3.5 5Z M13 20.5h9M17.5 15v-.8" stroke-width="1.6"${TS}/><circle cx="33" cy="18" r="2.4"/><circle cx="39.5" cy="18" r="2.4"/>${kb(4, 27, 40, 13, 10)}`,
    lead1: () => lead('M11 20.5l6-5v5l6-5v5l6-5v5l6-5v5'),
    lead2: () => lead('M11 20.5v-5h5v5h5v-5h5v5h5v-5h5'),
    lead3: () => lead('M11 20.5l3-5l3 5l3-5l3 5l3-5l3 5l3-5l3 5l3-5'),
    chip: () => `<path d="M13 13H35C41 13 45 22 44.5 30C44 37 38.5 38 35.5 34.5L32 30.5H16L12.5 34.5C9.5 38 4 37 3.5 30C3 22 7 13 13 13Z"${T}/><path d="M11 20h3v3h3v3h-3v3h-3v-3H8v-3h3Z"${C}/><rect x="32" y="18.5" width="4" height="4" rx=".6"${C}/><rect x="36.5" y="23" width="4" height="4" rx=".6"${C}/><path d="M21 19h2M25 19h2" stroke-width="2"/>`,
    chip2: () => `<path d="M22 6H26V10H30V14H34V18H38V28H34V22H30V18H26V38H22V42H14V38H10V30H14V26H22Z"${T}/><rect x="14" y="30" width="4" height="4"${C}/>`,
    sbass1: () => sbass('M13 14q5.5-8 11 0t11 0'),
    sbass2: () => sbass('M13 17l7-7v7l7-7v7l7-7v7'),
    sbass3: () => sbass('M13 17v-7h5.5v7H24v-7h5.5v7H35'),

    steeldrum: () => `<path d="M5 19V30C5 35 13.5 39 24 39C34.5 39 43 35 43 30V19"${T}/><ellipse cx="24" cy="19" rx="19" ry="9"${T}/><ellipse cx="24" cy="20" rx="5" ry="3" stroke-width="1.5"/><ellipse cx="14" cy="18" rx="4" ry="2.5" stroke-width="1.5"/><ellipse cx="33.5" cy="17.5" rx="4" ry="2.5" stroke-width="1.5"/><ellipse cx="23" cy="13.5" rx="3" ry="1.6" stroke-width="1.5"/><path d="M5 30L5 44M43 30V44" stroke-width="2"/><path d="M38 3L30 13"/><circle cx="29.5" cy="13.5" r="2.4"${C}/>`,
    kalimba: () => `<rect x="7" y="5" width="34" height="39" rx="7"${T}/><circle cx="24" cy="36" r="3.5"${C}/><path d="M11 26H37" stroke-width="3"/><path d="M13 25V15M17 25V12M21 25V9.5M24 25V8M27 25V9.5M31 25V12M35 25V15" stroke-width="1.75"/>`,
    musicbox: () => `<path d="M7 25L12 10H40L41 25"${T}/><rect x="5" y="25" width="38" height="17" rx="2"${T}/><path d="M5 30H43" stroke-width="1.5"/><path d="M43 34H46"/><path d="M46 34V39" stroke-width="2.5"/>` + note(19, 21) + `<circle cx="24" cy="36" r="1.4"${C}/>`,
    choir: () => `<path d="M3 42C3 35 6 31.5 11 31.5C16 31.5 19 35 19 42Z"${T}/><path d="M29 42C29 35 32 31.5 37 31.5C42 31.5 45 35 45 42Z"${T}/><circle cx="11" cy="22" r="5.5"${T}/><circle cx="37" cy="22" r="5.5"${T}/><path d="M13 42C13 34 17 29 24 29C31 29 35 34 35 42Z"${T}/><circle cx="24" cy="17" r="6.5"${T}/><ellipse cx="24" cy="19.5" rx="1.8" ry="2.1"${C}/><ellipse cx="11" cy="24" rx="1.4" ry="1.7"${C}/><ellipse cx="37" cy="24" rx="1.4" ry="1.7"${C}/>` + note(38, 11),
    bagpipe: () => `<path d="M10 22C10 15 18 12 26 15C34 18 38 26 34 33C30 39 20 40 14 35C11 32 10 27 10 22Z"${T}/><path d="M17 17L34 34M14 24L27 37M22 15L37 28" stroke-width="1"/><path d="M22 14L28 3M28 16L38 5M32 19L44 12"/><path d="M27.5 2.5l2 1M37.5 4l2 1.5M43.5 11l1.5 1.8" stroke-width="3"/><path d="M13 34L7 45"/><circle cx="9.8" cy="39.3" r=".8"${C}/><path d="M11 21L3 18"/>`,
  };

  const K = {
    drums: () => `<path d="M33 10L41 7M37 8.5V26"/><ellipse cx="37" cy="8.5" rx="8" ry="2.2" transform="rotate(-15 37 8.5)"${T}/><rect x="7" y="13" width="14" height="10" rx="2"${T}/><ellipse cx="14" cy="13" rx="7" ry="2"${T}/><circle cx="25" cy="31" r="12"${T}/><circle cx="25" cy="31" r="5" stroke-width="1.5"/><path d="M3 30h8v8H3Z"${T}/><path d="M18 44l2-2M32 44l-2-2"/>`,
    school: () => `<path d="M14 4L24 22H4Z" stroke-width="2.25"/><path d="M14 4V2"/><path d="M5 25L19 13" stroke-width="1.75"/><circle cx="32" cy="31" r="12"${T}/><circle cx="32" cy="31" r="7.5" stroke-width="1.5"/>` + [[32, 19], [44, 31], [32, 43], [20, 31], [40.5, 22.5], [40.5, 39.5], [23.5, 39.5], [23.5, 22.5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6"${C}/>`).join('') + `<path d="M3 38A6 6 0 0 1 15 38Z"${T}/><path d="M4 40A6 6 0 0 0 14 40"/><circle cx="9" cy="35" r=".9"${C}/>`,
    wa: () => `<circle cx="24" cy="27" r="16"${T}/><circle cx="24" cy="27" r="11.5" stroke-width="1.5"/>` + Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<circle cx="${(24 + Math.cos(a) * 13.8).toFixed(2)}" cy="${(27 + Math.sin(a) * 13.8).toFixed(2)}" r=".9"${C}/>`; }).join('') + `<path d="M4 4L20 19M44 4L28 19" stroke-width="2.75"/>`,
    perc1: () => `<path d="M6 10C3 22 6 32 8 44H20C22 32 25 22 22 10Z"${T}/><ellipse cx="14" cy="10" rx="8" ry="2.5"${T}/><path d="M26 16C23.5 26 26 35 28 44H40C42 35 44.5 26 42 16Z"${T}/><ellipse cx="34" cy="16" rx="8" ry="2.5"${T}/><path d="M6.5 20H21.5M26 26H42" stroke-width="1.5"/>`,
    perc2: () => `<path d="M21 23L37 45M27 23L11 45" stroke-width="3"/><ellipse cx="15" cy="14" rx="8" ry="10" transform="rotate(-30 15 14)"${T}/><ellipse cx="33" cy="14" rx="8" ry="10" transform="rotate(30 33 14)"${T}/><circle cx="13" cy="12" r="1.2"${C}/><circle cx="17" cy="16" r="1.2"${C}/><circle cx="12" cy="17" r="1.2"${C}/><circle cx="35" cy="12" r="1.2"${C}/><circle cx="31" cy="16" r="1.2"${C}/><circle cx="36" cy="17" r="1.2"${C}/>`,
    edm: () => `<path d="M8 30V24A16 16 0 0 1 40 24V30" stroke-width="3"/><rect x="4" y="26" width="10" height="16" rx="4"${T}/><rect x="34" y="26" width="10" height="16" rx="4"${T}/><path d="M18 34v4M22 30v12M26 32v8M30 35v2" stroke-width="2"/>`,
    fx: () => `<path d="M24 4L28 16L40 10L34 22L45 27L33 30L37 43L26 35L18 44L17 32L4 32L13 24L5 13L18 16Z"${T}/>${spark(24, 24, 5)}`,
  };

  const CA = {
    key: () => `${kb(4, 12, 40, 24, 7, 2.5).replace(/stroke-width="1.25"/, 'stroke-width="2"')}`,
    orch: () => g(rot(-30), `<path d="${VBODY}"${T}/><rect x="22.5" y="5" width="3" height="24" rx="1.5"${C}/><circle cx="24" cy="4.5" r="2"/>`),
    wa: () => `<path d="M24 42L5 18A24 24 0 0 1 43 18Z"${T}/><path d="M24 42L14 11M24 42V9M24 42L34 11" stroke-width="2"/><circle cx="24" cy="40" r="2"${C}/>`,
    band: () => g(rot(35), `<rect x="22.5" y="4" width="3" height="25" rx="1"${C}/><path d="M22 27C22 22 20 18 17 19C15 20 17 25 16 28C13.5 30 13 33 14 37C15.5 42 19 45 24 45C30 45 34 42 34 37C34 33 32 31 31 29C30.5 26 33 21 31 20C28.5 19 26 22 26 27Z"${T}/><rect x="21" y="32" width="6" height="3" rx=".8"${C}/>`),
    synth: () => `<path d="M12 6V42M24 6V42M36 6V42"/><rect x="8" y="12" width="8" height="7" rx="2"${T}/><rect x="20" y="27" width="8" height="7" rx="2"${T}/><rect x="32" y="17" width="8" height="7" rx="2"${T}/>`,
    other: () => `<path d="M20 6Q20 24 38 24Q20 24 20 42Q20 24 2 24Q20 24 20 6Z"${T}/>${spark(38, 9, 6)}${spark(38, 39, 4)}`,
  };

  const fallback = () => `<path d="M18 36V10L38 6V32"/><path d="M18 16L38 12"/><ellipse cx="13" cy="36" rx="5" ry="4"${T}/><ellipse cx="33" cy="32" rx="5" ry="4"${T}/>`;

  return {
    inst: (id) => svg((I[id] || fallback)()),
    kit: (id) => svg((K[id] || fallback)()),
    cat: (id) => svg((CA[id] || fallback)(), 3),
    has: (id) => !!I[id],
  };
})();
