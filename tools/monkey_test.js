// でたらめにさわる（サル）テスト：見えているボタンなどを、たくさんランダムにおして、エラーが出ないか
const { chromium, devices } = require('playwright');
const N = +(process.argv[2] || 300);
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const out = {};
  for (const [name, opt, seed0] of [['pc', { viewport: { width: 1366, height: 820 } }, +(process.argv[3] || 7)], ['phone', devices['iPhone 13'], +(process.argv[3] || 42) + 1], ['pc2', { viewport: { width: 1024, height: 700 } }, +(process.argv[3] || 99) + 2]]) {
    const ctx = await b.newContext(opt);
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message.slice(0, 160) + ' @ ' + String(e.stack || '').split('\n').slice(1, 4).join(' | ').replace(/http:\/\/localhost:8765\//g, '').slice(0, 300)));
    p.on('dialog', (d) => d.dismiss().catch(() => {}));
    p.on('filechooser', () => {});
    await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
    let seed = seed0;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    for (let i = 0; i < N; i++) {
      const kind = rnd();
      try {
        if (kind < 0.7) {
          // 見えている押せるものを1つ
          const ok = await p.evaluate((r) => {
            const els = [...document.querySelectorAll('button, summary, select, input[type=checkbox], .tpl, .chip, .track, .instopt, .catbtn, .chordbtn')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && !e.disabled && b.top >= 0 && b.top < innerHeight && !/btnSave|btnOpen|btnImportJson|btnNew|tplOpen|mvRec|btnMidiIn|btnPrintScore|btnCompare|cmpBatch|cmpOther|btnStems|btnWav|btnMp3|btnPngScore|btnSvgScore|btnXmlScore|btnExportJson|btnMidi$|btnPresent/.test(e.id); });
            if (!els.length) return null;
            const e = els[Math.floor(r * els.length)];
            if (e.tagName === 'SELECT') { if (e.options.length) { e.selectedIndex = Math.floor(r * 997) % e.options.length; e.dispatchEvent(new Event('change', { bubbles: true })); } return 'select#' + e.id; }
            e.click();
            return (e.id || e.className || e.tagName).toString().slice(0, 30);
          }, rnd());
          if (!ok) continue;
        } else if (kind < 0.88) {
          // マス目をおす・ドラッグ
          const box = await p.locator('#scroller').boundingBox().catch(() => null);
          if (!box || !box.width) continue;
          const x = box.x + 90 + rnd() * (box.width - 100);
          const y = box.y + 40 + rnd() * (box.height - 50);
          await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + rnd() * 80, y + rnd() * 30, { steps: 3 }); await p.mouse.up();
        } else if (kind < 0.95) {
          const keys = ['Escape', 'Space', 'Control+z', 'Control+y', 'a', 's', 'd', 'ArrowUp', 'ArrowRight', 'Delete', 'Control+a', 'Control+c', 'Control+v', 'Control+d', 'q', '-', '=', '0', '?'];
          await p.keyboard.press(keys[Math.floor(rnd() * keys.length)]);
        } else {
          // ダイアログがひらいていたらとじる
          await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach((d) => d.close()); });
        }
      } catch (e) { /* 押せなかった */ }
      if (i % 50 === 49) await p.waitForTimeout(50);
    }
    await p.evaluate(() => { try { stop(); } catch (e) { /* なし */ } });
    out[name] = errs.length ? [...new Set(errs)].slice(0, 6) : 'エラーなし';
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
