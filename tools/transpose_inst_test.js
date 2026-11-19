// 移調楽器：楽譜には「その楽器の調」で書き、鳴る音は「実際の高さ」。パートが少ない曲でも。
// 楽譜で書いた音（レ）を入れると、B♭クラリネットはドが鳴る。書き出し・読みもどしでも同じ
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour');
  await p.waitForTimeout(900);
  const r = await p.evaluate(async () => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const out = {};
    const firstStep = (xml) => { const m = xml.match(/<step>([A-G])<\/step>(?:<alter>(-?\d)<\/alter>)?<octave>(\d)<\/octave>/); return m ? m[1] + (m[2] === '1' ? '#' : m[2] === '-1' ? 'b' : '') + m[3] : '?'; };
    const keyOf = (xml) => (xml.match(/<fifths>(-?\d+)<\/fifths>/) || [])[1];
    // 自分で作った曲：クラリネット1パート（フルスコアの書き方ではない）
    loadSong({ v: 2, title: 'cl', bpm: 100, bars: 1, key: 0, tracks: [{ type: 'melody', inst: 'clarinet', notes: [{ s: 0, p: 72, l: 48 }] }] }, { own: true });
    out['クラリネット：楽譜での移調（2）'] = partClefTrans(track()).trans;
    let xml = Notation.musicXML(scoreOpts([track().id], true));
    out['鳴るド → 楽譜にはレ（D5）・調号は#2つ（2）'] = firstStep(xml) + '・' + keyOf(xml);
    // 楽譜の画面で「レ」を入れると、ドが鳴る
    setView('score'); renderScoreEditNow();
    ui.sc.lastIns = { p: 72 };
    out['楽譜で書いた「レ」→ 鳴る音（72＝ド）'] = letterPitch(1, 72);
    // 書き出して読みもどしても、鳴る音はド
    const a = await MusicXMLImport.readFile(new TextEncoder().encode(xml).buffer, 'a.musicxml');
    const c = await MusicXMLImport.readFile(new TextEncoder().encode(MuseScoreExport.mscx(scoreOpts([track().id], true))).buffer, 'a.mscx');
    out['読みもどし（MusicXML・MuseScore）：鳴る音72、移調2'] = a.tracks[0].notes[0].p + '/' + a.tracks[0].trans + '・' + c.tracks[0].notes[0].p + '/' + c.tracks[0].trans;
    // トランペット・アルトサックス・ホルン
    const tw = {};
    for (const [inst, want] of [['trumpet', 2], ['sax', 9], ['horn', 7], ['flute', 0], ['piccolo', 0], ['contrabass', 0]]) { song.tracks[0].inst = inst; tw[inst] = partClefTrans(track()).trans + (partClefTrans(track()).trans === want ? '' : '（ちがう: ' + want + '）'); }
    out['楽器ごとの移調（フルスコアでないときは、オクターブだけの楽器はそのまま）'] = JSON.stringify(tw);
    song.tracks[0].inst = 'clarinet';
    // 実音で書く（コンサートピッチ）にすると、移調しない
    scoreSettings().concert = true;
    out['実音で書く → 0'] = partClefTrans(track()).trans;
    scoreSettings().concert = false;
    // 自分で「なし」にしたら、移調しない
    scoreSettings().trans = { [track().id]: 0 };
    out['自分で「なし」→ 0'] = partClefTrans(track()).trans;
    scoreSettings().trans = {};
    // 読みこんだ in A のクラリネット（1パートの曲）
    const note = (st, o) => `<note><pitch><step>${st}</step><octave>${o}</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>`;
    const mx = `<?xml version="1.0"?><score-partwise><part-list><score-part id="P1"><part-name>Clarinet in A</part-name><midi-instrument id="I1"><midi-program>72</midi-program></midi-instrument></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>1</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef><transpose><diatonic>-2</diatonic><chromatic>-3</chromatic></transpose></attributes>${note('C', 5)}</measure></part></score-partwise>`;
    loadSong(await MusicXMLImport.readFile(new TextEncoder().encode(mx).buffer, 'A.musicxml'), { own: true });
    xml = Notation.musicXML(scoreOpts([track().id], true));
    out['in A：書いたド → 鳴るラ（69）・楽譜にはまたド（C5）・調号0'] = track().notes[0].p + '・' + firstStep(xml) + '・' + keyOf(xml);
    out['鳴らす音（69）'] = eventList().filter((e) => e.kind === 'note').map((e) => e.p).join(',');
    return out;
  });
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
