// 楽譜の明朝体：アプリに入れた字体（Sora Serif）で、曲名・歌詞が出る／画像に書き出すときも字体が入る
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  const out = process.argv[2] || 'tools';
  await p.goto('http://localhost:8765/?notour');
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    loadSong({ v: 2, title: 'ふるさとの歌', bpm: 90, bars: 2, tracks: [{ type: 'melody', inst: 'piano', notes: [{ s: 0, p: 60, l: 48, ly: 'う' }, { s: 48, p: 62, l: 48, ly: 'さ' }, { s: 96, p: 64, l: 96, ly: 'ぎ' }] }] }, { own: true });
    setView('score');
  });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => {
    await document.fonts.ready;
    const used = [...document.fonts].filter((f) => f.family.replace(/['"]/g, '') === 'Sora Serif' && f.status === 'loaded').map((f) => f.weight);
    const t = document.querySelector('#scoreEditView .sctitle');
    return { 読みこんだ明朝体の数: used.length, 太さ: [...new Set(used)].join(','), 曲名の字体: t ? getComputedStyle(t).fontFamily.slice(0, 40) : 'なし', 明朝体がある: document.fonts.check("bold 22px 'Sora Serif'", 'ふるさとの歌') };
  });
  // 画像の書き出し：字体を絵の中に入れる
  const holder = await p.evaluate(async () => {
    const h = document.createElement("div"); h.innerHTML = Notation.render(scoreOpts(song.tracks.map((x) => x.id), true)); const svg = h.querySelector('svg');
    await embedSerifFont(svg);
    const st = svg.querySelector('style');
    return st ? Math.round(st.textContent.length / 1024) + 'KB・' + (st.textContent.match(/@font-face/g) || []).length + 'こ' : 'なし';
  });
  r['画像に入れた字体'] = holder;
  await (await p.$('#scoreEditView')).screenshot({ path: out + '/serif.png' });
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
