// 再生中に、すすみぐあいの線をクリックすると、その場所へ飛ぶ（パソコン・スマホ）
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const out = {};
  for (const [name, opt] of [['パソコン', { viewport: { width: 1366, height: 860 } }], ['スマホ', devices['Pixel 5']]]) {
    const ctx = await b.newContext(opt);
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://localhost:8765/?notour');
    await p.waitForTimeout(900);
    await p.evaluate(() => {
      const d = document.querySelector('#dlgStart'); if (d.open) d.close();
      const notes = []; for (let i = 0; i < 400; i++) notes.push({ s: i * 48, p: 60 + (i % 12), l: 48 });
      loadSong({ v: 2, title: 'seek', bpm: 240, bars: 100, tracks: [{ type: 'melody', inst: 'piano', notes }] }, { own: true });
      ui.startTick = 0;
    });
    out[name + '：止まっているときは線をさわれない'] = await p.evaluate(() => getComputedStyle(document.querySelector('#miniSeek')).display === 'none');
    await p.evaluate(() => play());
    await p.waitForTimeout(600);
    const r = await p.evaluate(() => { const el = document.querySelector('#miniProg').parentElement.getBoundingClientRect(); return { x: el.left + 10 + (el.width - 20) * 0.75, y: el.bottom - 2 }; });
    if (opt.hasTouch) await p.touchscreen.tap(r.x, r.y); else await p.mouse.click(r.x, r.y);
    await p.waitForTimeout(500);
    const res = await p.evaluate(() => ({ bar: barOf(playheadTick()) + 1, on: player.on, pops: [...document.querySelectorAll('details.pop')].some((d) => d.open) }));
    out[name + '：4分の3の所をクリック → 76小節くらいから鳴る'] = res.bar + '小節・再生中 ' + res.on;
    out[name + '：ルールの窓は開かない'] = !res.pops;
    await p.evaluate(() => stop());
    out[name + ' errs'] = errs;
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
