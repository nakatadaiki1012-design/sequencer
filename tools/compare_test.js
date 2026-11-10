// お手本とくらべる：たりない音・ちがう音・割合、ぜんぶ合うと🎉
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 820 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  const r = await p.evaluate(async () => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    loadSong(sampleSong()); selectTrack(0);
    const answer = new File([snapshot()], 'answer.json', { type: 'application/json' });
    refSong = sanitizeSong(migrate(await readSongFile(answer)));
    const out = {};
    updateCompare(); out['同じ曲'] = document.querySelector('#cmpText').textContent; out['ぜんぶ合う印'] = document.querySelector('#cmpBar').classList.contains('perfect');
    edit(() => { const n = track().notes; n.splice(0, 2); n.push({ s: 0, p: 90, l: 48 }); }, 't');
    await new Promise((res) => setTimeout(res, 50));
    out['2つ消して1つまちがえた'] = document.querySelector('#cmpText').textContent;
    return out;
  });
  await p.screenshot({ path: `${OUT}/compare.png` });
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
