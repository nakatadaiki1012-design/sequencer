// コード進行のお手本（ポップス・おしゃれ・ジャズ・短調）と、新しいコードの種類
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 820 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const out = {};
    const mk = (extra) => ({ v: 2, title: 'p', bars: 12, ...extra, tracks: [{ type: 'melody', notes: [{ s: 0, p: 60, l: 48 }] }, { type: 'chord', chords: [] }] });
    out.進行の数 = PROGRESSIONS.length;
    out.なかま = [...new Set(PROGRESSIONS.map((x) => x[4]))].join('・');
    // 書き方のまちがいがない（読めない記号がない）
    out.読めない記号 = PROGRESSIONS.flatMap((x) => x[1].split('|').flatMap((bb) => bb.trim().split(/\s+/)).filter((dd) => !parseDegree(dd)));
    out.名前がかぶらない = new Set(PROGRESSIONS.map((x) => x[0])).size === PROGRESSIONS.length;
    // ハ長調に入れたときのコードネーム
    const names = (i, extra) => { loadSong(mk(extra)); selectTrack(1); ui.selBar = 0; applyProgression(i); return song.tracks[1].chords.slice(0, PROGRESSIONS[i][1].split('|').length).map((c, bb) => chordSegs(c, bb).map((x) => chordName(x.c)).join(' ')).join(' | '); };
    const idx = (n) => PROGRESSIONS.findIndex((x) => x[0].startsWith(n));
    out.ツーファイブワン = names(idx('ツー・ファイブ・ワン'));
    out.五度圏めぐり = names(idx('五度圏めぐり'));
    out.ジャズブルース = names(idx('ジャズ・ブルース'));
    out.都会の夜 = names(idx('都会の夜'));
    out.半音で上がる = names(idx('半音で上がる'));
    out.ネオソウル = names(idx('ネオソウル'));
    out.イ短調で短調のツーファイブ = names(idx('短調のツー・ファイブ'), { key: 9, scale: 'minor' });
    out.ハ長調で短調のツーファイブ = names(idx('短調のツー・ファイブ'));
    out.イ短調でカノン進行 = names(idx('カノン進行'), { key: 9, scale: 'minor' });
    out.アンダルシア = names(idx('アンダルシア'), { key: 9, scale: 'minor' });
    out['3拍子でリズムチェンジ'] = names(idx('リズム・チェンジ'), { meter: [3, 4] });
    // 全部の進行を入れて、伴奏の音が作れる（エラーなし・音がある・コードの音だけ）
    const bad = [];
    PROGRESSIONS.forEach((x, i) => {
      for (const pat of ['whole', 'arp', 'pop8']) {
        loadSong(mk({})); selectTrack(1); ui.selBar = 0; song.tracks[1].pattern = pat; applyProgression(i);
        try {
          const ev = chordEvents(song.tracks[1]);
          if (ev.length < 12) bad.push(x[0] + ':音が少ない');
          for (const e of ev) { const bb = barOf(e.t != null ? e.t : e.s); const t = (e.t != null ? e.t : e.s) - barStart(bb); let c = null; for (const sg of chordSegs(song.tracks[1].chords[bb], bb)) if (sg.o <= t) c = sg.c; const pcs = CHORD_Q[c.q].iv.map((v) => (c.r + v) % 12); if (!pcs.includes(((e.p % 12) + 12) % 12)) { bad.push(x[0] + ':コードの外 ' + chordName(c) + ' ' + e.p); break; } }
        } catch (er) { bad.push(x[0] + ':' + er.message); }
      }
    });
    out.伴奏が作れない進行 = bad;
    // 新しい種類：打って入れる・名前・保存して読みもどす
    out.打って入れる = ['Dm7b5', 'G7(♭9)', 'Cmaj9', 'F6', 'Am6', 'Cadd9', 'G7sus4', 'Bdim7', 'AmM7', 'E7#9', 'D9', 'Em9'].map((t) => { const c = parseChord(t); return c ? chordName(c) : '×'; }).join(' ');
    const qs = Object.keys(CHORD_Q);
    out.種類の数 = qs.length;
    loadSong({ v: 2, title: 'q', bars: qs.length, tracks: [{ type: 'melody', inst: 'piano', notes: qs.map((_, i) => ({ s: i * 192, p: 60, l: 192 })) }, { type: 'chord', chords: qs.map((q, i) => ({ r: i % 12, q })) }] });
    const want = song.tracks[1].chords.map((c) => c.r + c.q).join(' ');
    out.保存して開きなおす = JSON.parse(JSON.stringify(song)).tracks[1].chords.map((c) => c.r + c.q).join(' ') === want;
    const ids = song.tracks.filter((t) => t.type !== 'chord').map((t) => t.id);
    const o = scoreOpts(ids, true); o.chords = o.chordObjs;
    const x1 = Notation.musicXML(o);
    const b1 = MusicXMLImport.parse(x1, 'a.musicxml'); const c1 = b1.tracks.find((t) => t.type === 'chord');
    out.MusicXMLで読みもどす = c1 ? c1.chords.map((c) => c.r + c.q).join(' ') === want || c1.chords.map((c) => c.r + c.q).join(' ') : 'なし';
    const x2 = MuseScoreExport.mscx(o);
    const b2 = MusicXMLImport.parseMscx(x2, 'a.mscx'); const c2 = b2.tracks.find((t) => t.type === 'chord');
    out.MuseScoreで読みもどす = c2 ? c2.chords.map((c) => c.r + c.q).join(' ') === want || c2.chords.map((c) => c.r + c.q).join(' ') : 'なし';
    // 画面：えらぶ所がなかま分けされている
    loadSong(mk({})); selectTrack(1); renderEditorTools();
    out.えらぶ所のなかま = document.querySelectorAll('#cProg optgroup').length;
    out.えらぶ所の数 = document.querySelectorAll('#cProg option').length - 1;
    return out;
  });
  await p.evaluate(() => { setView('score'); });
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + '/progressions.png' });
  console.log(JSON.stringify(r, null, 1)); console.log('エラー:', errs.length ? errs : 'なし');
  await b.close();
})();
