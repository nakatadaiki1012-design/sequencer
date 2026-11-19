// 装飾音符・トリル・トレモロなど：マス目でも楽譜でも入れられる／鳴り方／書き出して読みもどしても同じ
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 860 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  const out = process.argv[2] || 'tools';
  await p.goto('http://localhost:8765/?notour');
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const notes = [];
    for (let i = 0; i < 8; i++) notes.push({ s: i * 48, p: [72, 74, 76, 77, 79, 77, 76, 74][i], l: 48 });
    loadSong({ v: 2, title: 'そうしょく', bpm: 90, bars: 2, key: 0, tracks: [{ type: 'melody', inst: 'violin', notes }] }, { own: true });
    setView('grid');
  });
  const r = {};
  const pick = (idx) => p.evaluate((idx) => { nsel.clear(); for (const i of idx) nsel.add(track().notes.sort((a, z) => a.s - z.s)[i]); updateSelBar(); draw(); }, idx);
  const notes = () => p.evaluate(() => track().notes.slice().sort((a, z) => a.s - z.s).map((n) => ({ s: n.s, p: n.p, gr: n.gr, grl: n.grl, art: n.art, tra: n.tra, trs: n.trs, nh: n.nh })));

  // マス目：音をえらぶと「記号」ボタン → パレット（マス目で使える記号だけ）
  await pick([0]);
  r['記号ボタン'] = await p.evaluate(() => !document.querySelector('#selOrn').hidden && !document.querySelector('#selOrn').disabled);
  await p.click('#selOrn');
  await p.waitForTimeout(200);
  r['パレットの見出し'] = await p.evaluate(() => [...document.querySelectorAll('#dlgSym summary')].map((s) => s.textContent).join('・'));
  r['楽譜だけの記号は出ない（くり返し）'] = await p.evaluate(() => !document.querySelector('#dlgSym [data-bar]'));
  // 装飾音符：上から → もう1つ足す → 長前打音は1つのときだけ
  const openSec = () => p.evaluate(() => document.querySelectorAll('#dlgSym details').forEach((x) => (x.open = true)));
  await openSec();
  await p.click('#dlgSym [data-gr="1"]');
  await p.click('#dlgSym [data-gr="addDown"]');
  r['装飾音符2つ（ド→レ→主音のド）'] = JSON.stringify((await notes())[0].gr);
  // トリル♯（ミ）
  await pick([2]);
  await p.click('#dlgSym [data-tra="1"]');
  r['トリル♯'] = JSON.stringify((await notes())[2]);
  // トレモロ2本（ファ）
  await pick([3]);
  await p.click('#dlgSym [data-trs="2"]');
  // 2つの音のトレモロ（ソ・ファ）
  await pick([4, 5]);
  await p.click('#dlgSym [data-trs="two"]');
  // ひし形の符頭＋ハーモニクス（ミ）
  await pick([6]);
  await p.click('#dlgSym [data-nh="diamond"]');
  await p.click('#dlgSym [data-art="harm"]');
  // トリルの波線（さいごの2つ）
  await pick([6, 7]);
  await p.click('#dlgSym #palTrl');
  const ns = await notes();
  r['トレモロ2本'] = JSON.stringify(ns[3].art) + ns[3].trs;
  r['2音トレモロ（はじめの音だけ）'] = JSON.stringify([ns[4].art, ns[5].art]);
  r['符頭'] = ns[6].nh + JSON.stringify(ns[6].art);
  r['波線'] = await p.evaluate(() => JSON.stringify(track().trills));
  r['マス目のしるし'] = await p.evaluate(() => track().notes.slice().sort((a, z) => a.s - z.s).map((n) => ornBadge(n, track())).join(' | '));
  await p.screenshot({ path: out + '/orn_grid.png' });
  // 鳴り方：トリル♯はファ♯と交互、2音トレモロはソとファが交互、波線トリルはファと交互
  r['鳴り方'] = await p.evaluate(() => {
    const L = eventList().filter((e) => e.kind === 'note');
    const at = (a, z) => [...new Set(L.filter((e) => e.tr === track() && e.t >= a && e.t < z).map((e) => e.p))].sort().join(',');
    return `トリル ${at(96, 144)}／2音トレモロ ${at(192, 288)}／波線 ${at(288, 336)}`;
  });
  // もどす（Ctrl+Z）でも消える
  await p.keyboard.press('Escape');
  // 楽譜の画面でも同じ記号が出る
  await p.evaluate(() => { document.querySelector('#dlgSym').close(); setView('score'); });
  await p.waitForTimeout(800);
  r['楽譜：装飾音符・斜線・波線'] = await p.evaluate(() => {
    const v = document.querySelector('#scoreEditView');
    return `grace ${v.querySelectorAll('.grace').length} trem2 ${v.querySelectorAll('.trem2').length} trl ${v.querySelectorAll('.trl').length}`;
  });
  await (await p.$('#scoreEditView')).screenshot({ path: out + '/orn_score.png' });
  // 楽譜で：音符をえらんで「長い（長前打音）」
  r['楽譜で長前打音'] = await p.evaluate(() => {
    const n = track().notes.slice().sort((a, z) => a.s - z.s)[1];
    ui.sc.sel = new Set([n.s + ':' + n.p]);
    scGrace(1); scGrace('long');
    return JSON.stringify([n.gr, n.grl]);
  });
  // 書き出して読みもどす（MusicXML・MuseScore）
  r['読みもどし'] = await p.evaluate(async () => {
    const sum = (t) => JSON.stringify([t.notes.slice().sort((a, z) => a.s - z.s).map((n) => [n.s, n.p, n.gr, !!n.grl, (n.art || []).slice().sort(), n.tra, n.trs, n.nh]), t.trills]);
    const me = sum(track());
    const ids = [track().id];
    const a = await MusicXMLImport.readFile(new TextEncoder().encode(Notation.musicXML(scoreOpts(ids, true))).buffer, 'a.musicxml');
    const c = await MusicXMLImport.readFile(new TextEncoder().encode(MuseScoreExport.mscx(scoreOpts(ids, true))).buffer, 'a.mscx');
    return `MusicXML ${sum(a.tracks[0]) === me ? '同じ' : 'ちがう ' + sum(a.tracks[0])}・MuseScore ${sum(c.tracks[0]) === me ? '同じ' : 'ちがう ' + sum(c.tracks[0])}`;
  });
  // 波線が段の切れ目ちょうどでおわっても書ける（1段に1小節）
  r['段の切れ目でおわる波線'] = await p.evaluate(() => {
    try {
      edit(() => { track().trills = [{ s: 96, e: 192 }, { s: 288, e: 384 }]; }, 't');
      const o = scoreOpts([track().id], true);
      o.perLine = 1;
      const svg = Notation.render(o);
      return 'OK（' + (svg.match(/class="trl"/g) || []).length + '本）';
    } catch (e) { return 'エラー ' + e.message; }
  });
  // 移調すると装飾音符もいっしょに動く
  r['移調（＋2）で装飾音符も'] = await p.evaluate(() => { edit(() => transpose(track(), 2), 't'); return JSON.stringify(track().notes.slice().sort((a, z) => a.s - z.s)[0].gr); });
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
