// いいところ その2：版の保存と見くらべ・アイデア帳・演奏の表情・ピアノ譜にまとめる・歌って入力・弾いて練習
// マイクは、作った音のファイル（ラ・ド・ソ）をにせのマイクとして使う
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
function wav(file, parts) {
  const sr = 44100;
  const xs = [];
  for (const [f, d] of parts) { const n = Math.round(sr * d); for (let i = 0; i < n; i++) xs.push(f ? 0.4 * Math.sin((2 * Math.PI * f * i) / sr) * Math.min(1, i / 400, (n - i) / 400) + 0.06 * Math.sin((4 * Math.PI * f * i) / sr) : 0); }
  const b = Buffer.alloc(44 + xs.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + xs.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(xs.length * 2, 40);
  xs.forEach((v, i) => b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  fs.writeFileSync(file, b);
}
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pro2-'));
const SING = path.join(dir, 'sing.wav');
const A4 = path.join(dir, 'a4.wav');
wav(SING, [[440, 0.8], [0, 0.3], [523.25, 0.8], [0, 0.3], [392, 0.8], [0, 0.6]]);
wav(A4, [[440, 8]]);
const open = async (mic) => {
  const args = mic ? ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${mic}`, '--autoplay-policy=no-user-gesture-required'] : ['--autoplay-policy=no-user-gesture-required'];
  const b = await chromium.launch({ args });
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, permissions: mic ? ['microphone'] : [] });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour');
  await p.waitForTimeout(700);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close(); if (document.body.classList.contains('simple')) applySimple(false); });
  return { b, p, errs };
};
const MEL = { v: 2, title: 'P2', bpm: 120, bars: 4, key: 0, tracks: [
  { type: 'melody', name: 'うた', inst: 'piano', notes: [[0, 60], [48, 64], [96, 67], [144, 72], [192, 71], [240, 67], [288, 64], [336, 62], [384, 60], [576, 60]].map(([s, p]) => ({ s, p, l: 48 })) },
  { type: 'melody', name: 'ひくい', inst: 'cello', notes: [[0, 48, 192], [192, 43, 192], [384, 45, 192], [576, 48, 192]].map(([s, p, l]) => ({ s, p, l })) },
  { type: 'chord', name: 'コード', inst: 'piano', pattern: 'beat', bassOn: true, chords: [{ r: 0, q: 'M' }, { r: 7, q: 'M' }, { r: 9, q: 'm' }, { r: 0, q: 'M' }] },
] };
(async () => {
  const chk = {};
  let all = [];
  {
    const { b, p, errs } = await open(null);
    await p.evaluate((m) => { loadSong(m); selectTrack(0); setView('grid'); }, MEL);
    await p.waitForTimeout(300);
    // ---- 版の保存と見くらべ ----
    await p.evaluate(async () => { songOwn = true; await verSave('はじめ', false); });
    await p.evaluate(() => { edit(() => { song.tracks[0].notes.push({ s: 480, p: 65, l: 48 }); song.tracks[0].notes = song.tracks[0].notes.filter((n) => n.s !== 48); }, 'テスト'); });
    await p.evaluate(async () => { await verSave('つぎ', false); });
    const same = await p.evaluate(async () => verSave('同じ', false));
    chk.同じ版は2回のこさない = same === false;
    await p.click('#btnMenu').catch(() => {});
    await p.evaluate(() => verOpen());
    await p.waitForTimeout(300);
    chk.版の一覧 = await p.locator('#dlgVer .verlist li').count() === 2;
    chk.版に名前 = /つぎ/.test(await p.locator('#dlgVer .verlist li').first().textContent());
    await p.locator('#dlgVer [data-cmp="1"]').click();
    await p.waitForTimeout(300);
    const ct = await p.evaluate(() => $('#cmpText').textContent);
    chk.見くらべの文 = /はじめ/.test(ct) && /足した音 1/.test(ct) && /消した音 1/.test(ct) && /変わった小節：1・3/.test(ct);
    chk.見くらべ文 = ct;
    await p.evaluate(() => setView('score'));
    await p.waitForTimeout(500);
    chk.楽譜で足した音が青 = await p.locator('#scoreEditView .nh.vd-add').count() >= 1;
    await p.evaluate(() => { setView('grid'); stopCompare(); });
    // もどす
    await p.evaluate(() => verOpen());
    await p.waitForTimeout(200);
    p.once('dialog', (d) => d.accept());
    await p.locator('#dlgVer [data-rs="1"]').click();
    await p.waitForTimeout(300);
    chk.前の版にもどる = await p.evaluate(() => song.tracks[0].notes.some((n) => n.s === 48) && !song.tracks[0].notes.some((n) => n.s === 480) && !!song.vid);
    await p.evaluate(() => undo());
    chk.もどすで今の曲へ = await p.evaluate(() => song.tracks[0].notes.some((n) => n.s === 480));
    chk.保存しても版のなかま = await p.evaluate(() => { const v = song.vid; loadSong(JSON.parse(JSON.stringify(song))); return song.vid === v; });
    // ---- アイデア帳 ----
    await p.evaluate(() => { localStorage.removeItem('otsumiki-ideas'); setView('score'); selectTrack(0); ui.sc.sel = new Set(song.tracks[0].notes.filter((n) => n.s < 192).map((n) => n.s + ':' + n.p)); });
    p.once('dialog', (d) => d.accept('はじまり'));
    await p.evaluate(() => ideaCapture());
    chk.アイデアをしまう = await p.evaluate(() => ideasLoad().length === 1 && ideasLoad()[0].name === 'はじまり' && ideasLoad()[0].len === 192);
    await p.evaluate(() => { edit(() => { song.key = 7; }); ui.sc.cursor = 384; ui.sc.sel = new Set(); });
    await p.evaluate(() => ideasOpen());
    await p.waitForTimeout(200);
    chk.アイデア帳の一覧 = await p.locator('#dlgIdea .verlist li').count() === 1 + 6;
    await p.locator('#dlgIdea [data-in]').first().click();
    await p.waitForTimeout(300);
    chk.調に合わせて貼る = await p.evaluate(() => { const ns = song.tracks[0].notes.filter((n) => n.s >= 384 && n.s < 576).map((n) => n.p).sort((a, b) => a - b); return JSON.stringify(ns); });
    chk.調に合わせて貼るOK = chk.調に合わせて貼る === '[55,62,67]'; // ド・ソ・ド（ハ長調）→ ト長調へ：ソ・レ・ソ
    // ドラムのアイデア（はじめから入っている）をドラムのトラックに
    await p.evaluate(() => { edit(() => song.tracks.push(newTrack('drum'))); selectTrack(song.tracks.length - 1); setView('grid'); ui.startTick = 0; ideaInsert(IDEA_BUILTIN[0], true); });
    chk.ドラムのアイデア = await p.evaluate(() => { const g = song.tracks[song.tracks.length - 1].grid; return Object.keys(g.hihat || {}).length === 8 && Object.keys(g.kick || {}).length === 2; });
    chk.ちがう種類は貼らない = await p.evaluate(() => { const n = JSON.stringify(song); ideaInsert(IDEA_BUILTIN[2], true); return JSON.stringify(song) === n; });
    // ---- 演奏の表情 ----
    await p.evaluate((m) => { loadSong(m); selectTrack(0); }, MEL);
    const plain = await p.evaluate(() => ({ ev: eventList().filter((e) => e.kind === 'note' && e.tr === song.tracks[0]).map((e) => e.v), end: timeTable().start.slice(-1)[0] }));
    await p.evaluate(() => feelSet(2));
    const feel = await p.evaluate(() => ({ ev: eventList().filter((e) => e.kind === 'note' && e.tr === song.tracks[0]).map((e) => e.v), end: timeTable().start.slice(-1)[0], ch: eventList().filter((e) => e.kind === 'note' && e.tr === song.tracks[2]).length }));
    chk.表情で強さが変わる = feel.ev.length === plain.ev.length && feel.ev.some((v, i) => Math.abs(v - plain.ev[i]) > 0.02);
    // いちばん高い音（ド5＝4つ目）が、はじめの音より強い
    chk.山へ向かって強く = feel.ev[3] > feel.ev[1];
    chk.おわりでゆっくり = feel.end > plain.end * 1.03;
    chk.表情は保存される = await p.evaluate(() => { loadSong(JSON.parse(JSON.stringify(song))); return song.feel === 2; });
    await p.evaluate(() => feelSet(0));
    chk.表情なしでもとどおり = await p.evaluate((pe) => Math.abs(timeTable().start.slice(-1)[0] - pe) < 1e-6 && song.feel == null, plain.end);
    await p.click('#popPractice summary');
    await p.waitForTimeout(150);
    chk.練習に表情のボタン = await p.locator('#feelSeg [data-f]').count() === 3;
    await p.locator('#feelSeg [data-f="1"]').click();
    chk.ボタンで表情 = await p.evaluate(() => song.feel === 1 && document.querySelector('#feelSeg [data-f="1"]').classList.contains('on'));
    await p.evaluate(() => closePops());
    // ---- ピアノ譜にまとめる ----
    await p.evaluate((m) => { loadSong(m); selectTrack(0); setView('grid'); }, MEL);
    await p.evaluate(() => reduceOpen());
    await p.waitForTimeout(200);
    await p.locator('#dlgRed #redOk').click();
    await p.waitForTimeout(300);
    const red = await p.evaluate(() => { const t = song.tracks[song.tracks.length - 1]; return { name: t.name, inst: t.inst, n: t.notes.length, rh: t.notes.filter((n) => n.p >= 60).length, lh: t.notes.filter((n) => n.p < 60).length, cur: track() === t, over: (() => { for (const v of [1, 2]) { const ns = t.notes.filter((n) => (n.v === 2 ? 2 : 1) === v && (n.p >= 60) === true).sort((a, b) => a.s - b.s); for (let i = 1; i < ns.length; i++) if (ns[i].s !== ns[i - 1].s && ns[i - 1].s + ns[i - 1].l > ns[i].s) return true; } return false; })() }; });
    chk.ピアノのトラック = red.inst === 'piano' && /ピアノ/.test(red.name) && red.cur;
    chk.右手と左手 = red.rh === 10 && red.lh >= 4;
    chk.同じ声部で重ならない = !red.over;
    chk.まとめ = JSON.stringify(red);
    await p.evaluate(() => setView('score'));
    await p.waitForTimeout(600);
    chk.大譜表で書ける = await p.evaluate(() => { const L = $('#scoreEditView')._layout; return !!L && L.systems[0].staves.length >= 3; });
    // ---- 機能をさがす ----
    chk.さがすで見つかる = await p.evaluate(() => ['版', 'アイデア', 'ひょうじょう', 'リダクション', 'マイク', 'さいてん'].every((q) => cmdSearch(q).length > 0));
    chk.メニューにある = await p.evaluate(() => ['btnVersions', 'btnIdeas', 'btnReduce', 'btnSing', 'btnPractice2'].every((id) => !!document.getElementById(id)));
    chk.楽譜のボタン = await p.locator('#scMicB').count() === 1 && await p.locator('#scIdeaB').count() === 1;
    all = all.concat(errs);
    await b.close();
  }
  // ---- 歌って入力（ラ・ド・ソを歌う） ----
  {
    const { b, p, errs } = await open(SING);
    await p.evaluate((m) => { m.tracks[0].notes = []; loadSong(m); selectTrack(0); setView('score'); ui.sc.input = true; ui.sc.cursor = 0; ui.sc.dur = 48; renderScorePal(); renderScoreEdit(); }, MEL);
    await p.waitForTimeout(400);
    await p.click('#scMicB');
    await p.waitForTimeout(3600);
    const got = await p.evaluate(() => song.tracks[0].notes.map((n) => n.p));
    chk.歌った音 = JSON.stringify(got);
    const s = new Set(got);
    chk.歌って入力 = s.has(69) && s.has(72) && s.has(67) && got.length <= 8;
    chk.マイクの表示 = await p.locator('#micHud:not([hidden])').count() === 1;
    await p.click('#micEnd');
    chk.おわるとマイクを止める = await p.evaluate(() => !Mic.on && $('#micHud').hidden);
    all = all.concat(errs);
    await b.close();
  }
  // ---- 弾いて練習（ずっとラ） ----
  {
    const { b, p, errs } = await open(A4);
    await p.evaluate(() => loadSong({ v: 2, title: 'PR', bpm: 120, bars: 2, key: 0, tracks: [{ type: 'melody', name: 'うた', inst: 'piano', notes: [[0, 69], [48, 69], [96, 72], [144, 69], [192, 64], [240, 69], [288, 69], [336, 81]].map(([s, p]) => ({ s, p, l: 48 })) }] }));
    await p.evaluate(() => { selectTrack(0); setView('score'); ui.countIn = 0; });
    await p.waitForTimeout(300);
    await p.evaluate(() => { prStart(); });
    await p.waitForTimeout(300);
    await p.locator('#dlgPr #prGo').click();
    await p.waitForTimeout(200);
    chk.マイクの計算ms = await p.evaluate(() => { let ok = 0; const t0 = performance.now(); for (let i = 0; i < 300; i++) if (micDetect().p != null) ok++; return { ms: Math.round(((performance.now() - t0) / 300) * 1000) / 1000, ok }; });
    chk.マイクは軽い = chk.マイクの計算ms.ms < 1.5 && chk.マイクの計算ms.ok > 250;
    chk.練習中は鳴らさない = await p.evaluate(() => song.tracks[0].mute === true);
    await p.waitForTimeout(7500);
    const res = await p.evaluate(() => [...PR.res].map(([n, c]) => n.s + ':' + c).join(' '));
    chk.採点 = res;
    chk.ラは緑_ちがう音は赤 = /0:ok/.test(res) && /96:ng/.test(res) && /192:ng/.test(res) && /144:ok/.test(res) && /336:ok/.test(res);
    chk.けっか = await p.locator('#dlgPrRes[open]').count() === 1 ? await p.locator('#dlgPrRes .prpct').textContent() : 'なし';
    chk.けっかが出る = /%/.test(chk.けっか);
    chk.楽譜に色 = await p.locator('#scoreEditView .nh.pk-ok').count() >= 3 && await p.locator('#scoreEditView .nh.pk-ng').count() >= 2;
    chk.消音をもどす = await p.evaluate(() => song.tracks[0].mute === false && !Mic.on);
    all = all.concat(errs);
    await b.close();
  }
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(JSON.stringify(chk, null, 1));
  const bad = Object.keys(chk).filter((k) => chk[k] === false);
  console.log('きまり:', bad.length ? 'NG ' + bad.join('・') : 'ぜんぶOK');
  console.log('エラー:', all.length ? all : 'なし');
})();
