// フルスコアの浄書：見えないテンポ・短い楽器名・2声部の休符・ことば/トリルの位置・打楽器の連桁・ページを下までそろえる
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 900 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour');
  await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); });
  const out = await p.evaluate(async () => {
    const out = {};
    const box = document.createElement('div');
    box.style.cssText = 'position:absolute;left:0;top:0;width:1000px';
    document.body.appendChild(box);
    const show = (svg) => { box.innerHTML = svg; return box.querySelector('svg'); };
    const cy = (el) => { const r = el.getBoundingClientRect(); return (r.top + r.bottom) / 2; };
    // ---- 1. MuseScore の読みこみ：見えないテンポ・見えない強弱・短い名前・とちゅうの速さのことば ----
    const meas = (i) => {
      let v = '';
      if (i === 0) v += '<TimeSig><sigN>4</sigN><sigD>4</sigD></TimeSig><Tempo><tempo>2</tempo><text>Allegro</text></Tempo><Dynamic><subtype>f</subtype></Dynamic>';
      if (i === 2) v += '<Tempo><tempo>1.5</tempo><visible>0</visible><text> = 90</text></Tempo><Dynamic><subtype>pp</subtype><visible>0</visible></Dynamic>';
      if (i === 4) v += '<Tempo><tempo>1</tempo><text>Andante = 60</text></Tempo>';
      v += '<Chord><durationType>whole</durationType><Note><pitch>72</pitch></Note></Chord>';
      return `<Measure><voice>${v}</voice></Measure>`;
    };
    const xml = `<?xml version="1.0"?><museScore version="3.01"><Score><Division>480</Division><Part><Staff id="1"/><trackName>Violin 1</trackName><Instrument><longName>Violin 1</longName><shortName>Vln. 1</shortName><Channel><program value="48"/></Channel></Instrument></Part><Staff id="1">${[0, 1, 2, 3, 4, 5].map(meas).join('')}</Staff></Score></museScore>`;
    const sg = await MusicXMLImport.readFile(new TextEncoder().encode(xml).buffer, 't.mscx');
    loadSong(sg, { own: true });
    out['テンポ（3小節目 90・5小節目 60）'] = JSON.stringify(song.tempos);
    out['見えないテンポ（3小節目だけ）'] = JSON.stringify(song.tempoHid || {});
    out['速さのことば（5小節目 Andante）'] = JSON.stringify(song.tempoWords || {});
    out['短い名前（Vln. 1）'] = song.tracks[0].short;
    out['見えない強弱は h つき'] = JSON.stringify(song.tracks[0].dyn);
    const o1 = scoreOpts([song.tracks[0].id], true);
    out['楽譜のテンポ（5小節目だけ）'] = JSON.stringify(o1.tempos);
    out['楽譜のことば'] = JSON.stringify(o1.words);
    out['楽譜の強弱（f だけ）'] = JSON.stringify(o1.parts[0].dyn.map((d) => d.v));
    out['楽譜の短い名前'] = o1.parts[0].short;
    const s1 = JSON.parse(snapshot());
    // pizz. / arco：弦楽器は、そこから音色が変わる（楽譜には「持ちかえ」と書かない）
    {
      const m2 = (i) => `<Measure><voice>${i === 1 ? '<StaffText><text>pizz.</text></StaffText>' : i === 3 ? '<StaffText><text>arco</text></StaffText>' : ''}<Chord><durationType>whole</durationType><Note><pitch>72</pitch></Note></Chord></voice></Measure>`;
      const x2 = `<?xml version="1.0"?><museScore version="3.01"><Score><Division>480</Division><Part><Staff id="1"/><trackName>Violin</trackName><Instrument><Channel><program value="40"/></Channel></Instrument></Part><Staff id="1">${[0, 1, 2, 3].map(m2).join('')}</Staff></Score></museScore>`;
      const g2 = await MusicXMLImport.readFile(new TextEncoder().encode(x2).buffer, 'p.mscx');
      loadSong(g2, { own: true });
      const t2 = song.tracks[0];
      out['pizz. → arco で音色が変わる'] = [instAt(t2, 0), instAt(t2, 192), instAt(t2, 576)].join(',');
      out['楽譜のことばは pizz. と arco だけ'] = JSON.stringify(scoreOpts([t2.id], true).parts[0].texts.map((x) => x.x));
      loadSong(sg, { own: true });
    }
    out['保存しても残る'] = !!(s1.tempoHid && s1.tempoHid[2] && s1.tempoWords[4] === 'Andante' && s1.tracks[0].short === 'Vln. 1');
    // ---- 2. 2声部の休符：相手の声部の音が低いとき、もっと下へよける ----
    const restY = (hiP) => {
      loadSong({ v: 2, title: 't', bpm: 100, bars: 2, key: 0, tracks: [{ type: 'melody', inst: 'flute', notes: [
        ...[0, 48, 96, 144].map((s) => ({ s, p: hiP, l: 48 })),
        { s: 0, p: 60, l: 24, v: 2 },
      ] }] }, { own: true });
      const svg = show(Notation.render(scoreOpts([song.tracks[0].id], true)));
      const rests = [...svg.querySelectorAll('.rest')].filter((r) => +r.dataset.s >= 48 && +r.dataset.s < 96);
      const heads = [...svg.querySelectorAll('.nh')].filter((r) => +r.dataset.p === hiP);
      return { rest: Math.max(...rests.map(cy)), head: Math.max(...heads.map(cy)), n: rests.length };
    };
    const rHi = restY(79); // 上の声部が高い：休符はいつもの場所
    const rLo = restY(64); // 上の声部が低い：休符はもっと下
    out['休符：相手が低いと下へよける'] = rLo.rest > rHi.rest + 4;
    out['休符は相手の音より下（かさならない）'] = rLo.rest > rLo.head + 10;
    // ---- 3. ことば・トリルの線：その小節の音のすぐ上（段のいちばん高い音に合わせない） ----
    const mk = (hiP) => ({ v: 2, title: 't', bpm: 100, bars: 4, key: 0, tracks: [{ type: 'melody', inst: 'violin', notes: [{ s: 0, p: hiP, l: 192 }, { s: 192, p: 72, l: 192 }, { s: 384, p: 72, l: 192 }, { s: 576, p: 72, l: 192 }], texts: [{ t: 192, x: 'pizz.' }], trills: [{ s: 384, e: 560 }] }] });
    const pos = (hiP) => {
      loadSong(mk(hiP), { own: true });
      const svg = show(Notation.render(scoreOpts([song.tracks[0].id], true)));
      const head = [...svg.querySelectorAll('.nh')].find((r) => +r.dataset.s === 192);
      return { txt: cy(svg.querySelector('.stxt')) - cy(head), trl: cy(svg.querySelector('.trl')) - cy(head) };
    };
    const A = pos(72);
    const B = pos(100); // 1小節目だけ、とても高い音
    out['ことば：高い音が別の小節にあっても、同じ近さ'] = Math.abs(A.txt - B.txt) < 1.5 && A.txt < -8 && A.txt > -45;
    out['トリル：高い音が別の小節にあっても、同じ近さ'] = Math.abs(A.trl - B.trl) < 1.5 && A.trl < -8 && A.trl > -45;
    // ---- 4. 打楽器：連桁でつながった音も、ぼうは上 ----
    loadSong({ v: 2, title: 't', bpm: 100, bars: 1, key: 0, tracks: [{ type: 'drum', kit: 'drums', grid: { hihat: { 0: 1, 2: 1, 4: 1, 6: 1 } } }] }, { own: true });
    {
      const id = Object.keys(song.tracks[0].grid)[0];
      const svg = show(Notation.render(scoreOpts([song.tracks[0].id], true)));
      const heads = [...svg.querySelectorAll('.nh')];
      const beams = [...svg.querySelectorAll('.beam')];
      out['打楽器の音符の数'] = heads.length + ':' + id;
      const hy = heads.length ? Math.min(...heads.map(cy)) : 0;
      const by = beams.length ? Math.min(...beams.map(cy)) : 1e9;
      out['打楽器：連桁は符頭より上'] = heads.length >= 2 && beams.length ? by < hy : 'beam?' + beams.length;
    }
    // ---- 5. フルスコア：1ページに1段のとき、下までそろえる ----
    const names = [['フルート', 'flute', 84], ['オーボエ', 'oboe', 79], ['クラリネット', 'clarinet', 72], ['ファゴット', 'bassoon', 48], ['ホルン', 'horn', 60], ['トランペット', 'trumpet', 72], ['トロンボーン', 'trombone', 55], ['チューバ', 'tuba', 40], ['バイオリンⅠ', 'violin', 79], ['バイオリンⅡ', 'violin', 74], ['ビオラ', 'viola', 64], ['チェロ', 'cello', 50], ['コントラバス', 'contrabass', 40]];
    const BARS = 48;
    loadSong({ v: 2, title: 'フル', bpm: 100, bars: BARS, key: 0, score: { orch: true }, tracks: names.map(([name, inst, base], ti) => ({ type: 'melody', name, inst, notes: Array.from({ length: BARS * 4 }, (_, i) => (ti < 9 || Math.floor(i / 4) % 12 < 6 ? { s: i * 48, p: base + (i % 5), l: 48 } : null)).filter(Boolean) })) }, { own: true });
    const full = scoreSvg(song.tracks.map((t) => t.id));
    const L = Notation.lastLayout;
    const cnt = Notation.pageCounts(L);
    const PH = L.width * (273 / 186);
    out['ページごとの段の数'] = cnt.join(',');
    let ok = 0;
    let single = 0;
    let i = 0;
    cnt.forEach((n, k) => {
      if (n === 1 && k > 0 && k < cnt.length - 1) { single++; const h = L.systems[i].y1 - L.systems[i].y0; const room = PH - 34 - 46; if (h > room * 0.9 && h <= room) ok++; }
      i += n;
    });
    out['1段だけのページ：下まで（9割以上）うまっている'] = single > 0 ? ok + '/' + single : 'なし';
    out['ページに分けられる'] = Notation.paginate(full, L).length === cnt.length;
    box.remove();
    return out;
  });
  console.log(JSON.stringify({ ...out, errs }, null, 1));
  await b.close();
})();
