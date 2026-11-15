// 窓をポップアップ⇔もとにもどす・キャンバスの全体／大きく・楽譜の曲名をクリックして書きかえ
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const out = process.argv[2] || 'tools';
  await p.goto('http://localhost:8765/?notour'); await p.evaluate(() => localStorage.removeItem('otsumiki-layout')); await p.reload(); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const N = []; for (let i = 0; i < 32 * 4; i++) N.push({ s: i * 48, p: 60 + ((i * 3) % 12), l: 48 });
    loadSong({ v: 2, title: 'まど', bpm: 100, bars: 32, key: 0, tracks: [{ type: 'melody', inst: 'flute', notes: N }, { type: 'chord', chords: Array.from({ length: 32 }, (_, i) => ({ r: [0, 9, 5, 7][i % 4], q: i % 4 === 1 ? 'm' : 'M' })) }] }, { own: true });
    setView('score'); });
  await p.waitForTimeout(300);
  const r = {};
  const box = (q) => p.evaluate((q) => { const e = document.querySelector(q); const b = e.getBoundingClientRect(); return Math.round(b.x) + ',' + Math.round(b.y) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height); }, q);
  // キャンバス：全体／大きく
  r['ふつう 1小節のはば'] = await p.evaluate(() => Math.round(ovBarW()));
  await p.click('#ovMode [data-m="fit"]'); await p.waitForTimeout(150);
  r['全体 1小節のはば'] = await p.evaluate(() => Math.round(ovBarW()) + ' 曲ぜんぶ見える=' + (ovBarW() * song.bars <= document.querySelector('#ovWrap').clientWidth));
  await p.screenshot({ path: out + '/ov_fit.png', clip: { x: 280, y: 80, width: 1086, height: 180 } });
  await p.click('#ovMode [data-m="big"]'); await p.waitForTimeout(150);
  r['大きく 1小節のはば'] = await p.evaluate(() => Math.round(ovBarW()));
  await p.click('#ovMode [data-m="normal"]'); await p.waitForTimeout(150);
  // ポップアップ：トラック・キャンバス
  r['トラック（ならべて）'] = await box('.main > .tracks');
  await p.click('.tracks-head .floatbtn'); await p.waitForTimeout(200);
  r['トラック（ポップアップ）'] = await box('.main > .tracks') + ' floating=' + await p.evaluate(() => document.querySelector('.main > .tracks').classList.contains('floating'));
  // 帯をつかんで動かす
  const hb = await (await p.$('.tracks-head h2')).boundingBox();
  await p.mouse.move(hb.x + 10, hb.y + 5); await p.mouse.down(); await p.mouse.move(hb.x + 610, hb.y + 305, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(150);
  r['トラックを動かした'] = await box('.main > .tracks');
  await p.click('.ovtools .floatbtn'); await p.waitForTimeout(250);
  r['キャンバス（ポップアップ）'] = await box('.canvas-area');
  r['楽譜の広さ（2つうかせた）'] = await box('#scoreEditView');
  await p.screenshot({ path: out + '/float.png' });
  // 読みこみ直しても、うかせたまま
  await p.reload(); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d && d.open) d.close(); });
  r['読みこみ直し'] = await p.evaluate(() => [...document.querySelectorAll('.floating')].map((e) => e.className.split(' ')[0]).join(','));
  // もどす
  await p.click('.tracks-head .floatbtn'); await p.click('.ovtools .floatbtn'); await p.waitForTimeout(200);
  r['もどした'] = await box('.main > .tracks') + ' / ' + await box('.canvas-area');
  // 曲名をクリック → 書きかえ・作詞作曲を足す
  await p.evaluate(() => setView('score')); await p.waitForTimeout(300);
  r['はじめは作詞作曲なし（＋の印だけ）'] = await p.evaluate(() => [...document.querySelectorAll('#scoreEditView .sctitle')].map((e) => e.textContent).join(' | '));
  await p.click('#scoreEditView .sctitle'); await p.waitForTimeout(150);
  r['パネルの欄'] = await p.evaluate(() => [...document.querySelectorAll('#titleEd input')].map((i) => i.dataset.k).join(','));
  await p.keyboard.press('Control+a'); await p.keyboard.type('はるのうた');
  await p.click('#titleEd [data-add="composer"]'); await p.keyboard.type('なかた');
  await p.waitForTimeout(150);
  await p.screenshot({ path: out + '/title_edit.png', clip: { x: 280, y: 250, width: 1086, height: 330 } });
  await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  r['書きかえた'] = await p.evaluate(() => song.title + ' / 作曲:' + scoreSettings().composer + ' / 作詞:' + (scoreSettings().lyricist || 'なし'));
  r['楽譜の文字'] = await p.evaluate(() => [...document.querySelectorAll('#scoreEditView .sctitle')].map((e) => e.textContent).join(' | '));
  await p.keyboard.press('Control+z'); await p.waitForTimeout(150);
  r['元にもどす'] = await p.evaluate(() => song.title + ' / 作曲:' + (scoreSettings().composer || 'なし'));
  r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
