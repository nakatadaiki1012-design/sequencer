// 自分の曲が消えない：友だちの共有URL・新しい曲・サンプルを開いても「マイ曲」にしまわれる、元に戻すで前の曲へ
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 820 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const r = {};
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.click('.tpl >> nth=5'); await p.waitForTimeout(400);
  r['はじめ（サンプルはしまわない）'] = await p.evaluate(() => Object.keys(savedList()).length);
  await p.evaluate(() => { song.title = 'ぼくの曲'; edit(() => { for (let i = 0; i < 10; i++) track().notes.push({ s: i * 48, p: 60 + i, l: 48 }); }, 'テスト'); });
  // 友だちの曲のURL
  const url = await p.evaluate(async () => { const keep = song; const s = JSON.parse(snapshot()); s.title = 'ともだちの曲'; s.tracks[0].notes = [{ s: 0, p: 72, l: 48 }]; song = s; const z = await packSong(); song = keep; return location.origin + location.pathname + '?notour#song=' + z; });
  await p.waitForTimeout(800); // 自動保存
  await p.close(); const p2 = await ctx.newPage(); p2.on('pageerror', (e) => errs.push(e.message)); await p2.goto(url); await p2.waitForTimeout(1200);
  r['共有URLを開いた曲'] = await p2.evaluate(() => song.title);
  r['自分の曲はマイ曲に'] = await p2.evaluate(() => Object.keys(savedList()));
  r['しまわれた音の数'] = await p2.evaluate(() => (savedList()['ぼくの曲'] || { song: { tracks: [{ notes: [] }] } }).song.tracks[0].notes.length);
  // 友だちの曲をいじってから、新しい曲 → しまわれる・元に戻すでもどれる
  await p2.evaluate(() => edit(() => track().notes.push({ s: 96, p: 74, l: 48 }), 'テスト'));
  await p2.evaluate(() => loadSong(sampleSong()));
  r['サンプルを開いたあとマイ曲'] = await p2.evaluate(() => Object.keys(savedList()));
  await p2.keyboard.press('Control+z'); await p2.waitForTimeout(200);
  r['元に戻すで前の曲'] = await p2.evaluate(() => song.title);
  // 同じ中身を2回しまわない
  await p2.evaluate(() => loadSong(sampleSong()));
  r['同じ曲は2回しまわない'] = await p2.evaluate(() => Object.keys(savedList()).length);
  r['エラー'] = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
