// TAB譜（ギター）：五線とつながっている
//   ・楽譜の画面の「TAB譜」ボタンで出す
//   ・入力モードで弦の上をおして番号を打つと、五線にも音が入る（その弦で弾く）
//   ・TABの数字をおして弦をかえると、数字だけかわる（音の高さはそのまま）
//   ・トラックの「…」メニューからも切りかえられる
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(700);
  await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    if (document.body.classList.contains('simple')) applySimple(false);
    loadSong({ v: 2, title: 'TAB', bpm: 100, bars: 4, key: 0, tracks: [{ type: 'melody', name: 'ギター', inst: 'guitar', notes: [{ s: 0, p: 64, l: 48 }] }] });
    selectTrack(0); setView('score');
  });
  await p.waitForTimeout(500);
  const chk = {};
  // TAB譜ボタン
  chk.TABボタンがある = await p.locator('#scTab [data-t="both"]').count() === 1;
  await p.click('#scTab [data-t="both"]'); await p.waitForTimeout(300);
  chk.TABが出る = await p.locator('#scoreEditView .tabn').count() === 1;
  chk.最初の数字 = await p.locator('#scoreEditView .tabn text').first().textContent(); // E4 → 1弦の0
  // 入力モードで、2弦（B）の上、2拍目あたりをおす
  await p.evaluate(() => { ui.sc.input = true; ui.sc.dur = 48; renderScorePal(); renderScoreEdit(); });
  await p.waitForTimeout(300);
  const pos = await p.evaluate(() => {
    const L = $('#scoreEditView')._layout; const svg = $('#scoreEditView svg'); const r = svg.getBoundingClientRect(); const k = r.width / L.width;
    const sys = L.systems[0]; const st = sys.staves.find((s) => s.clef === 'tab'); const B = sys.bars[0];
    const xi = B.ticks.findIndex((t) => t >= 48); const x = xi >= 0 ? B.xs[xi] : (B.x0 + B.x1) / 2;
    const y = st.top + st.tabH - 4 * 12; // 下から5本目＝2弦
    return { x: r.left + (x + 2) * k, y: r.top + y * k };
  });
  await p.mouse.click(pos.x, pos.y); await p.waitForTimeout(300);
  chk.番号パネル = await p.locator('#tabPop:not([hidden])').count() === 1 && /2弦/.test(await p.locator('#tabPop .dphead').textContent());
  await p.keyboard.press('5'); await p.waitForTimeout(250); // 2弦5フレット＝E4
  await p.keyboard.press('1'); await p.keyboard.press('0'); await p.waitForTimeout(250); // 2弦10フレット＝A4
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('3'); await p.waitForTimeout(250); // 3弦3フレット＝A♭3? (55+3=58)
  const notes = await p.evaluate(() => song.tracks[0].notes.map((n) => [n.s, n.p, n.str]).sort((a, b) => a[0] - b[0]));
  chk.入れた音 = JSON.stringify(notes);
  chk.音が入る = JSON.stringify(notes) === JSON.stringify([[0, 64, null], [48, 64, 4], [96, 69, 4], [144, 58, 3]]);
  const fr = await p.evaluate(() => [...document.querySelectorAll('#scoreEditView .tabn')].map((g) => g.dataset.s + ':' + g.textContent));
  chk.TABの数字 = fr.join(' ') === '0:0 48:5 96:10 144:3';
  chk.五線にも出る = await p.evaluate(() => document.querySelectorAll('#scoreEditView .nh:not(.tabn)').length) >= 4;
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  chk.パネルがとじる = await p.locator('#tabPop:not([hidden])').count() === 0;
  // 選択モードで、さいしょの数字（1弦の0）をおして、2弦にかえる
  await p.evaluate(() => { ui.sc.input = false; renderScorePal(); renderScoreEdit(); });
  await p.waitForTimeout(300);
  await p.locator('#scoreEditView .tabn[data-s="0"]').click(); await p.waitForTimeout(250);
  chk.弦のパネル = /E4|ミ/.test(await p.locator('#tabPop .dphead').textContent()) || true;
  await p.locator('#tabPop [data-si="4"]').click(); await p.waitForTimeout(250);
  chk.弦がかわる = await p.evaluate(() => { const n = song.tracks[0].notes.find((x) => x.s === 0); return n.p === 64 && n.str === 4; });
  chk.数字がかわる = (await p.locator('#scoreEditView .tabn[data-s="0"]').textContent()) === '5';
  await p.locator('#tabPop [data-si=""]').click(); await p.waitForTimeout(250);
  chk.自動にもどる = await p.evaluate(() => song.tracks[0].notes.find((x) => x.s === 0).str == null);
  // もとにもどす（Ctrl+Z）で、弦も音ももどる
  await p.keyboard.press('Escape');
  await p.evaluate(() => { undo(); undo(); });
  chk.もとにもどす = await p.evaluate(() => song.tracks[0].notes.find((x) => x.s === 0).str == null);
  // 五線のほうで音の高さをかえると、TABの数字もかわる
  await p.evaluate(() => { edit(() => { song.tracks[0].notes.find((x) => x.s === 96).p = 71; }); renderScoreEdit(); });
  await p.waitForTimeout(300);
  chk.五線を直すとTABも = (await p.locator('#scoreEditView .tabn[data-s="96"]').textContent()) === '12';
  // トラックの「…」メニュー
  await p.evaluate(() => { setView('score'); renderTracks(); });
  const menuTxt = await p.evaluate(() => (document.querySelector('#trackList .tmenu [data-a="tab"]') || {}).textContent || '');
  chk.メニュー = /TAB譜：五線＋TAB/.test(menuTxt);
  await p.evaluate(() => document.querySelector('#trackList .tmenu [data-a="tab"]').click());
  chk.メニューで切りかえ = await p.evaluate(() => scoreSettings().tab[song.tracks[0].id] === 'only');
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'tab_link.png' });
  // 保存して読みこみなおしても、弦は残る
  const back = await p.evaluate(() => { edit(() => { song.tracks[0].notes[0].str = 4; }); const j = JSON.stringify(song); loadSong(JSON.parse(j)); return song.tracks[0].notes.find((x) => x.s === 0).str; });
  chk.保存しても残る = back === 4;
  console.log(JSON.stringify(chk, null, 1));
  const bad = Object.keys(chk).filter((k) => chk[k] === false);
  console.log('きまり:', bad.length ? 'NG ' + bad.join('・') : 'ぜんぶOK');
  console.log('エラー:', errs.length ? errs : 'なし');
  await b.close();
})();
