// いろいろな楽譜ソフトのいいところ（js/pro.js）
//   文字で記号（Dorico）・機能をさがす（Dorico・Sibelius）・テンキー（Finale・Sibelius）・鍵盤／指板（Flat・カトカトーン）
//   ギターのコード図（Flat）・自動で編曲（Sibelius）・コメント（Flat）
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'ここはもっとやさしく' : undefined));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(800);
  await p.evaluate(() => {
    try { localStorage.removeItem('otsumiki-keypad'); localStorage.removeItem('otsumiki-instpanel'); } catch (e) {}
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    if (document.body.classList.contains('simple')) applySimple(false);
    loadSong({ v: 2, title: 'P', bpm: 100, bars: 4, key: 0, tracks: [{ type: 'melody', name: 'メロディ', inst: 'piano', notes: [{ s: 0, p: 64, l: 48 }, { s: 48, p: 65, l: 48 }, { s: 96, p: 67, l: 96 }, { s: 192, p: 69, l: 192 }, { s: 384, p: 67, l: 192 }, { s: 576, p: 60, l: 192 }] }, { type: 'chord', name: 'コード', chords: [{ r: 0, q: 'M' }, { r: 5, q: 'M' }, { r: 7, q: '7' }, { r: 0, q: 'M' }] }] });
    selectTrack(0); setView('score');
  });
  await p.waitForTimeout(500);
  const chk = {};
  // ---- 文字で記号 ----
  const pop = async (txt) => { await p.evaluate(() => { ui.sc.sel = new Set(['48:65']); ui.sc.cursor = 48; renderScoreEditNow(); }); await p.keyboard.press('Control+e'); await p.waitForTimeout(150); await p.keyboard.type(txt); await p.waitForTimeout(80); const hint = await p.locator('#popInHint').textContent(); await p.keyboard.press('Enter'); await p.waitForTimeout(200); return hint; };
  chk.強弱_hint = /強弱/.test(await pop('mf'));
  chk.強弱 = await p.evaluate(() => song.tracks[0].dyn.some((d) => d.t === 48 && d.v === 'mf'));
  await pop('p<');
  chk.強弱とクレシェンド = await p.evaluate(() => song.tracks[0].dyn.some((d) => d.v === 'p') && song.tracks[0].hairpins.some((h) => h.type === 'cresc'));
  await pop('Am7');
  chk.コード = await p.evaluate(() => { const c = chordTrackOf().chords[0]; return JSON.stringify(chordSegs(c, 0).map((x) => x.o + ':' + x.c.r + x.c.q)); });
  chk.コード = chk.コード.includes('48:9m7');
  await pop('♩=88'); chk.テンポ = await p.evaluate(() => song.bpm === 88);
  await pop('3/4'); chk.拍子 = await p.evaluate(() => String(song.meter) === '3,4');
  await p.evaluate(() => { undo(); });
  await pop('key G'); chk.調 = await p.evaluate(() => song.key === 7);
  await pop('[A]'); chk.練習番号 = await p.evaluate(() => song.rehearsal && song.rehearsal[0] === 'A');
  await pop('dolce'); chk.ことば = await p.evaluate(() => (song.tracks[0].texts || []).some((x) => x.x === 'dolce'));
  // ---- 機能をさがす ----
  await p.keyboard.press('Control+/'); await p.waitForTimeout(200);
  chk.さがす窓 = await p.locator('#dlgCmd[open]').count() === 1;
  await p.keyboard.type('すらー'); await p.waitForTimeout(100);
  chk.ひらがなで見つかる = (await p.locator('#cmdUl li').first().textContent()) === 'スラー';
  await p.keyboard.type(''); await p.locator('#cmdTxt').fill('こめんと'); await p.waitForTimeout(100);
  chk.コメントも見つかる = /コメント/.test(await p.locator('#cmdUl li').first().textContent());
  await p.keyboard.press('Escape');
  chk.さがすボタン = await p.locator('#btnCmd').count() === 1;
  // ---- テンキー ----
  await p.click('#scKpB'); await p.waitForTimeout(200);
  chk.テンキーの窓 = await p.locator('#keypad:not([hidden])').count() === 1;
  await p.evaluate(() => { ui.sc.sel = new Set(); ui.sc.cursor = 576; ui.sc.input = true; renderScoreEditNow(); });
  await p.keyboard.press('Numpad3'); await p.waitForTimeout(80);
  chk.テンキー3で8分 = await p.evaluate(() => ui.sc.dur === 24);
  await p.keyboard.press('c'); await p.waitForTimeout(80);
  await p.keyboard.press('Numpad0'); await p.waitForTimeout(80);
  chk.テンキー0で休符 = await p.evaluate(() => ui.sc.cursor === 576 + 48);
  // ---- 鍵盤パネル ----
  await p.click('#scKbB'); await p.waitForTimeout(300);
  chk.鍵盤が出る = await p.locator('#instPanel .pkb .pw').count() > 10;
  await p.evaluate(() => { ui.sc.cursor = 672; ui.sc.input = true; ui.sc.dur = 48; renderScoreEditNow(); });
  await p.locator('#instPanel [data-p="72"]').dispatchEvent('pointerdown'); await p.waitForTimeout(200);
  chk.鍵盤をおすと音が入る = await p.evaluate(() => song.tracks[0].notes.some((n) => n.s === 672 && n.p === 72));
  chk.えらんだ音が光る = await p.locator('#instPanel .lit[data-p="72"]').count() === 1;
  // ---- ギター：指板 ----
  await p.evaluate(() => { song.tracks.push(newTrack('melody', { name: 'ギター', inst: 'guitar', notes: [{ s: 0, p: 52, l: 48 }, { s: 0, p: 55, l: 48 }] })); renderTracks(); selectTrack(song.tracks.length - 1); setView('score'); ui.sc.sel = new Set(['0:52', '0:55']); renderScoreEditNow(); });
  await p.waitForTimeout(400);
  chk.ギターは指板 = await p.locator('#instPanel .fretb').count() === 1;
  chk.指板で光る = await p.locator('#instPanel .fretb .lit').count() === 2;
  await p.screenshot({ path: 'pro_panel.png' });
  // ---- コード図 ----
  await p.evaluate(() => { selectTrack(0); setView('score'); });
  await p.waitForTimeout(200);
  await p.click('#scDiaB'); await p.waitForTimeout(400);
  chk.コード図 = await p.locator('#scoreEditView .cdiag').count() >= 4;
  chk.コード図の形 = await p.evaluate(() => JSON.stringify(guitarShape(0, 'M').f) === '[-1,3,2,0,1,0]' && guitarShape(1, 'm7').f.filter((x) => x >= 0).length >= 4);
  const odd = await p.evaluate(() => ['m7b5', 'dim7', '9', 'aug', 'M9', '7b9'].map((q) => { const s = guitarShape(4, q); return s.f.filter((x) => x >= 0).length; }));
  chk.むずかしいコードも形 = odd.every((n) => n >= 4);
  const pr = await p.evaluate(() => { const o = scoreOpts(song.tracks.map((t) => t.id), true); return Notation.render({ ...o, width: 780 }); });
  chk.印刷にもコード図 = /class="cdiag"/.test(pr);
  // ---- コメント ----
  await p.evaluate(() => { ui.sc.cursor = barStart(1); renderScoreEditNow(); });
  await p.click('#scCmtB'); await p.waitForTimeout(300);
  chk.コメント = await p.evaluate(() => (song.comments || []).length === 1 && song.comments[0].b === 1);
  chk.コメントの印 = await p.locator('#scoreEditView .cmt').count() === 1;
  chk.印刷には出ない = !/class="cmt"/.test(pr) && !/class="cmt"/.test(await p.evaluate(() => { const o = scoreOpts(song.tracks.map((t) => t.id), true); return Notation.render({ ...o, width: 780 }); }));
  await p.locator('#scoreEditView .cmt').click(); await p.waitForTimeout(200);
  chk.コメントを読める = /もっとやさしく/.test(await p.locator('#dlgCmt').textContent());
  await p.evaluate(() => $('#dlgCmt').close());
  chk.保存してものこる = await p.evaluate(() => { const j = JSON.parse(JSON.stringify(song)); loadSong(j); return (song.comments || []).length === 1; });
  // ---- 自動で編曲 ----
  await p.evaluate(() => { selectTrack(0); arrangeOpen(); });
  await p.waitForTimeout(200);
  await p.selectOption('#arrEns', 'strings');
  await p.click('#arrOk'); await p.waitForTimeout(400);
  const arr = await p.evaluate(() => song.tracks.slice(-4).map((t) => [t.inst, t.notes.length, Math.min(...t.notes.map((n) => n.p)), Math.max(...t.notes.map((n) => n.p))]));
  chk.編曲4パート = arr.length === 4 && arr.map((a) => a[0]).join() === 'violin,violin,viola,cello' && arr.every((a) => a[1] > 0);
  chk.チェロは低く = arr[3][3] <= 74 && arr[3][2] >= 36;
  chk.もとは消音 = await p.evaluate(() => song.tracks[0].mute === true);
  await p.evaluate(() => setView('score'));
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'pro_score.png' });
  console.log(JSON.stringify({ arr, odd }));
  console.log(JSON.stringify(chk, null, 1));
  const bad = Object.keys(chk).filter((k) => chk[k] !== true);
  console.log('きまり:', bad.length ? 'NG ' + bad.join('・') : 'ぜんぶOK');
  console.log('エラー:', errs.length ? errs : 'なし');
  await b.close();
})();
