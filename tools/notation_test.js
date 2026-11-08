const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:1300,height:900} });
const errs=[]; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(800);
const R = await p.evaluate(() => {
  const res = {};
  const cnt = (svg, nm) => svg.split(Glyphs.g[nm].d).length - 1;
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // 1. どの拍子でも、小節の長さの合計が正しい（ランダムな曲 300曲）
  let bad = 0, total = 0;
  const meters = [[2,4],[3,4],[4,4],[5,4],[6,4],[2,2],[3,8],[6,8],[5,8],[1,4]];
  for (let k = 0; k < 300; k++) {
    const m = meters[k % meters.length]; const bt = m[0]*192/m[1]; const bars = 4;
    const notes = []; let t = 0;
    while (t < bars*bt) { const l = [6,8,12,16,18,24,32,36,48,72,96,144,192][Math.floor(rnd()*13)]; if (rnd() < 0.8) notes.push({ s: t, p: 55 + Math.floor(rnd()*24), l }); t += l; }
    const ev = Notation.buildEvents(notes, bars, bt, m[1]===8&&m[0]%3===0&&m[0]>3?72:192/m[1], m);
    for (const bar of ev) { total++; if (bar.reduce((a,e)=>a+e.len,0) !== bt) bad++; }
  }
  res['小節の長さが拍子と合わない小節'] = `${bad} / ${total}`;
  // 2. 4/4拍子で3拍目（小節のまん中）をかくさない
  const ev2 = Notation.buildEvents([{ s: 72, p: 60, l: 48 }], 1, 192, 48, [4,4])[0].filter(e=>!e.rest);
  res['2拍目うらから4分音符→まん中で分けてタイ'] = ev2.length === 2 && ev2[0].tie ? 'OK' : 'NG ' + JSON.stringify(ev2);
  const ev3 = Notation.buildEvents([{ s: 48, p: 60, l: 96 }], 1, 192, 48, [4,4])[0].filter(e=>!e.rest);
  res['2拍目から2分音符→そのまま（シンコペーション）'] = ev3.length === 1 ? 'OK' : 'NG';
  // 3. 臨時記号：上がるとき♯、下がるとき♭（ハ長調）
  const up = Notation.render({ parts: [{ name: 'a', notes: [60,61,62].map((p,i)=>({s:i*48,p,l:48})) }], bars: 1, barTicks: 192, meter: [4,4], key: 0, minor: false, title: '', bpm: 100 });
  const dn = Notation.render({ parts: [{ name: 'a', notes: [62,61,60].map((p,i)=>({s:i*48,p,l:48})) }], bars: 1, barTicks: 192, meter: [4,4], key: 0, minor: false, title: '', bpm: 100 });
  res['ド→ド♯→レ は♯で書く'] = cnt(up,'accidentalSharp')===1 && cnt(up,'accidentalFlat')===0 ? 'OK' : 'NG';
  res['レ→レ♭→ド は♭で書く'] = cnt(dn,'accidentalFlat')===1 && cnt(dn,'accidentalSharp')===0 ? 'OK' : 'NG';
  // 同じ小節で2回目の同じ音には臨時記号を書かない、ナチュラルでもどす
  const nat = Notation.render({ parts: [{ name: 'a', notes: [61,61,60].map((p,i)=>({s:i*48,p,l:48})) }], bars: 1, barTicks: 192, meter: [4,4], key: 0, minor: false, title: '', bpm: 100 });
  res['小節内の臨時記号（♯1回・♮1回）'] = cnt(nat,'accidentalSharp')===1 && cnt(nat,'accidentalNatural')===1 ? 'OK' : 'NG';
  // ト長調のファは♯なし（調号）、ファ♮は♮
  const g = Notation.render({ parts: [{ name: 'a', notes: [66,65].map((p,i)=>({s:i*48,p,l:48})) }], bars: 1, barTicks: 192, meter: [4,4], key: 7, minor: false, title: '', bpm: 100 });
  res['ト長調：ファ♯は調号だけ、ファは♮'] = cnt(g,'accidentalSharp')===1 && cnt(g,'accidentalNatural')===1 ? 'OK' : 'NG';
  // 4. 楽譜のクリック位置→音の高さ（ト音・ヘ音・調号つき）全部の線と間
  let hb = 0, ht = 0;
  for (const [key, clef] of [[0,'treble'],[0,'bass'],[7,'treble'],[5,'bass'],[2,'treble']]) {
    Notation.render({ parts: [{ name: 'a', clef, notes: [{s:0,p:clef==='bass'?48:67,l:192}] }], bars: 2, barTicks: 192, meter: [4,4], key, minor: false, title: '', bpm: 100 });
    const L = Notation.lastLayout; const st = L.systems[0].staves[0]; const B = L.systems[0].bars[1];
    const kc = Notation.keyCount(key, false);
    for (let pos = -4; pos <= 12; pos++) {
      ht++;
      const h = Notation.hit(L, (B.x0 + B.x1) / 2, st.top + 4*8 - pos*4);
      const dn = pos + (clef === 'treble' ? 30 : 18); const letter = ((dn%7)+7)%7;
      const sp = Notation.spell(h.pitch, kc);
      if (sp.dn !== dn) hb++;
    }
  }
  res['クリックした線・間と音の高さのずれ'] = `${hb} / ${ht}`;
  // 5. クリックした横の位置→時間（拍の頭をクリック）
  Notation.render({ parts: [{ name: 'a', notes: [0,48,96,144].map(s=>({s,p:67,l:48})) }], bars: 1, barTicks: 192, meter: [4,4], key: 0, minor: false, title: '', bpm: 100 });
  { const L = Notation.lastLayout; const B = L.systems[0].bars[0]; const st = L.systems[0].staves[0];
    const ticks = B.ticks.slice(0,4).map((t,i)=>Math.round(Notation.hit(L, B.xs[i]+0.5, st.top+16).tick));
    res['拍の頭をクリック→その拍の時間'] = JSON.stringify(ticks) === '[0,48,96,144]' ? 'OK' : 'NG ' + JSON.stringify(ticks); }
  // 6. MusicXML 書き出し→読み込み（ランダムな曲 60曲で音が同じ）
  let same = 0;
  for (let k = 0; k < 60; k++) {
    const m = meters[k % 7]; const bt = m[0]*192/m[1];
    const notes = []; let t = 0;
    while (t < 4*bt) { const l = [12,24,24,48,48,72,96][Math.floor(rnd()*7)]; if (rnd() < 0.85) { notes.push({ s: t, p: 55 + Math.floor(rnd()*20), l }); if (rnd()<0.15) notes.push({ s: t, p: 76, l }); } t += l; }
    const key = Math.floor(rnd()*12);
    const xml = Notation.musicXML({ parts: [{ name: 'a', notes }], bars: 4, barTicks: bt, meter: m, key, minor: false, title: 't', bpm: 100 });
    const s2 = MusicXMLImport.parse(xml, 't.musicxml');
    const A = notes.filter(n=>n.s<4*bt).map(n=>`${n.s}:${n.p}:${Math.min(n.l, 4*bt-n.s)}`).sort().join();
    const Bn = s2.tracks[0].notes.map(n=>`${n.s}:${n.p}:${n.l}`).sort().join();
    if (A === Bn) same++; else if (!res['往復のちがい例']) res['往復のちがい例'] = [m, A.slice(0,200), Bn.slice(0,200)];
  }
  res['MusicXML往復で音が同じ曲'] = `${same} / 60`;
  return res;
});
console.log(JSON.stringify(R, null, 1)); console.log('errors', errs); await b.close(); })();
