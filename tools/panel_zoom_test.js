// 横・たての大きさボタンを押して、画面がどう変わるかを見る
const { chromium } = require('playwright');
// 横（↔）とたて（↕）の大きさ：マス目・曲の地図・トラック欄のボタンと Ctrl＋ホイール。読みこみなおしても残る
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 820 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(800);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); try { localStorage.removeItem('otsumiki-layout'); } catch (e) {} });
  await p.evaluate(() => { if (document.body.classList.contains('simple')) applySimple(false); });
  await p.waitForTimeout(300);
  const st = async () => p.evaluate(() => ({ zoom: ui.zoom, rh: ui.rh, ovbw: Math.round(ovBarW()), ovrh: OV_RH, tw: Math.round(document.querySelector('.main > .tracks').getBoundingClientRect().width), tz: document.querySelector('#trackList').style.zoom, trackH: Math.round(document.querySelector('.track').getBoundingClientRect().height) }));
  const s0 = await st();
  for (const id of ['#zxIn', '#zxIn', '#zyOut', '#ovxIn', '#ovxIn', '#ovyIn', '#ovyIn', '#txIn', '#tyOut', '#tyOut']) { await p.click(id); await p.waitForTimeout(150); }
  const s1 = await st();
  await p.waitForTimeout(400);
  // Ctrl+ホイール
  await p.mouse.move(700, 240); await p.keyboard.down('Control'); await p.mouse.wheel(0, -100); await p.waitForTimeout(150); await p.keyboard.down('Shift'); await p.mouse.wheel(0, 100); await p.keyboard.up('Shift'); await p.keyboard.up('Control');
  const s2 = await st();
  // 読みこみなおしても残る
  await p.reload(); await p.waitForTimeout(900);
  const s3 = await st();
  const chk = { マス目の横: s1.zoom > s0.zoom, マス目のたて: s1.rh < s0.rh, 地図の横: s1.ovbw > s0.ovbw, 地図のたて: s1.ovrh > s0.ovrh, トラック欄のはば: s1.tw > s0.tw, トラックの大きさ: s1.trackH < s0.trackH, ホイールで地図の横: s2.ovbw > s1.ovbw, ホイールで地図のたて: s2.ovrh < s1.ovrh, 読みこみなおしても残る: JSON.stringify(s3) === JSON.stringify(s2) };
  console.log(JSON.stringify({ s0, s1, s2, s3 }));
  console.log('きまり:', Object.values(chk).every(Boolean) ? 'ぜんぶOK' : 'NG ' + Object.keys(chk).filter((k) => !chk[k]).join('・'));
  console.log('エラー:', errs.length ? errs : 'なし');
  await b.close();
})();
