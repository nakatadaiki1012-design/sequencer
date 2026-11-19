// 読みこんだ音の高さ・長さが正しいか：移調楽器（MusicXML）、8va（MuseScore）、カデンツァ（拍子どおりでない小節）、
// 声部をまたぐタイ、2つの音のトレモロの長さ、MuseScore に書き出して読みもどしても 8va の音が同じか
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour');
  await p.waitForTimeout(900);
  const r = await p.evaluate(async () => {
    const out = {};
    const rd = (xml, name) => MusicXMLImport.readFile(new TextEncoder().encode(xml).buffer, name);
    // ---- MusicXML：B♭クラリネット（書いた音はレ、鳴る音はド）。調号はニ長調（書いた調）→ 鳴る調はハ長調
    const note = (step, oct, dur, extra = '') => `<note><pitch><step>${step}</step><octave>${oct}</octave></pitch><duration>${dur}</duration><voice>1</voice>${extra}</note>`;
    const mx = `<?xml version="1.0"?><score-partwise><part-list><score-part id="P1"><part-name>Clarinet in Bb</part-name></score-part><score-part id="P2"><part-name>Violin</part-name></score-part></part-list>
<part id="P1">
<measure number="1"><attributes><divisions>4</divisions><key><fifths>2</fifths></key><time><beats>2</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef><transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose></attributes>${note('D', 5, 8)}</measure>
<measure number="2"><attributes><time><beats>166</beats><beat-type>64</beat-type></time></attributes>${note('E', 5, 41)}${note('E', 5, 0.5)}</measure>
<measure number="3"><attributes><time><beats>2</beats><beat-type>4</beat-type></time></attributes>${note('D', 5, 8)}</measure>
</part>
<part id="P2">
<measure number="1"><attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>2</beats><beat-type>4</beat-type></time></attributes>
<note><pitch><step>G</step><octave>5</octave></pitch><duration>8</duration><tie type="start"/><voice>2</voice><notations><tied type="start"/></notations></note></measure>
<measure number="2"><note><pitch><step>G</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice></note><note><rest/><duration>39.5</duration><voice>1</voice></note><backup><duration>41.5</duration></backup>
<note><pitch><step>G</step><octave>5</octave></pitch><duration>4</duration><tie type="stop"/><voice>2</voice><notations><tied type="stop"/></notations></note><note><rest/><duration>37.5</duration><voice>2</voice></note></measure>
<measure number="3"><note><rest/><duration>8</duration><voice>1</voice></note></measure>
</part></score-partwise>`;
    const a = await rd(mx, 'a.musicxml');
    const cl = a.tracks[0].notes;
    out['クラリネット：書いたレ → 鳴るド（72）'] = cl[0].p;
    out['調号：書いたニ長調 → 鳴るハ長調（0）'] = a.key;
    out['移調の記録（2）'] = a.tracks[0].trans;
    out['カデンツァの小節（166/64 → 21/8）'] = JSON.stringify(a.meters[1]);
    out['カデンツァのあとの小節の位置（96＋504＝600）'] = cl[cl.length - 1].s;
    const vn = a.tracks[1].notes;
    out['同じ高さの音がほかの声部にあってもタイが切れない（0:144 96:24）'] = vn.filter((n) => n.p === 79).map((n) => n.s + ':' + n.l).join(' ');
    // ---- MuseScore：8va の中の音・2つの音のトレモロ（本当の長さ）・長さのちがう小節（len）
    const chord = (p, dt, extra = '') => `<Chord>${extra}<durationType>${dt}</durationType><Note><pitch>${p}</pitch></Note></Chord>`;
    const ms = `<?xml version="1.0"?><museScore version="3.02"><Score><Division>480</Division><Part><Staff id="1"/><trackName>Violin</trackName><Instrument><Channel><program value="40"/></Channel></Instrument></Part>
<Staff id="1">
<Measure><voice><TimeSig><sigN>2</sigN><sigD>4</sigD></TimeSig><Spanner type="Ottava"><Ottava><subtype>8va</subtype></Ottava><next><location><fractions>1/4</fractions></location></next></Spanner>${chord(84, 'quarter')}<Spanner type="Ottava"><prev><location><fractions>-1/4</fractions></location></prev></Spanner>${chord(84, 'quarter')}</voice></Measure>
<Measure><voice><Chord><durationType>half</durationType><duration>1/4</duration><Note><pitch>69</pitch></Note><Tremolo><subtype>c32</subtype></Tremolo></Chord><Chord><durationType>half</durationType><duration>1/4</duration><Note><pitch>71</pitch></Note></Chord></voice></Measure>
<Measure len="166/64"><voice>${chord(60, 'whole')}${chord(62, 'quarter')}</voice></Measure>
<Measure><voice>${chord(64, 'half')}</voice></Measure>
</Staff></Score></museScore>`;
    const c = await rd(ms, 'a.mscx');
    const vs = c.tracks[0].notes;
    out['8va の中の音は1オクターブ上で鳴る（96・84）'] = vs.slice(0, 2).map((n) => n.p).join('・');
    out['2つの音のトレモロ（96:69:48 144:71:48）'] = vs.filter((n) => n.p === 69 || n.p === 71).map((n) => n.s + ':' + n.p + ':' + n.l).join(' ');
    out['長さのちがう小節（21/8）とつぎの小節の位置（192＋504＝696）'] = JSON.stringify(c.meters[2]) + ' ' + vs[vs.length - 1].s;
    // ---- 書き出して読みもどす（MuseScore の 8va）
    loadSong(c, { own: true });
    const back = await rd(MuseScoreExport.mscx(scoreOpts([track().id], true)), 'b.mscx');
    out['書き出して読みもどしても 8va の音が同じ'] = JSON.stringify(back.tracks[0].notes.map((n) => n.p)) === JSON.stringify(vs.map((n) => n.p)) ? '同じ' : 'ちがう ' + JSON.stringify(back.tracks[0].notes.map((n) => n.p));
    // ---- 再生の準備（大きな曲）：小節の表を何度も作りなおさない
    const big = { v: 2, title: 'big', bpm: 120, bars: 400, keys: { 100: { key: 2, minor: false } }, meters: { 200: [3, 4] }, tracks: [] };
    for (let k = 0; k < 20; k++) { const notes = []; for (let i = 0; i < 1500; i++) notes.push({ s: i * 48, p: 60 + (i % 12), l: 48 }); big.tracks.push({ type: 'melody', inst: 'piano', notes }); }
    loadSong(big, { own: true });
    version++;
    const t0 = performance.now();
    eventList();
    out['3万音の表を作る秒（0.5秒より少ない）'] = ((performance.now() - t0) / 1000).toFixed(2);
    return out;
  });
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
