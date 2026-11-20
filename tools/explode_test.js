// 和音をパートに分ける・下のパートをまとめる（MuseScore の展開・集約）
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 860 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?notour');
  await p.waitForTimeout(900);
  const r = await p.evaluate(async () => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const out = {};
    // ドミソ・ドミソ・（ミだけ）・レファ
    const notes = [[0, [60, 64, 67]], [48, [60, 64, 67]], [96, [64]], [144, [62, 65]]].flatMap(([s, ps]) => ps.map((pp) => ({ s, p: pp, l: 48 })));
    notes.find((n) => n.p === 67).ly = 'あ';
    loadSong({ v: 2, title: 'ex', bpm: 100, bars: 1, tracks: [{ type: 'melody', name: 'トランペット', inst: 'trumpet', notes }, { type: 'drum' }] }, { own: true });
    const sig = (t) => t.notes.slice().sort((a, c) => a.s - c.s).map((n) => n.p).join(',');
    explodeTrack(track());
    out['分ける：3つのパート'] = song.tracks.map((t) => t.name).join(' / ');
    out['上（ソソミファ）・中（ミミミレ）・下（ドドミレ）'] = song.tracks.slice(0, 3).map(sig).join(' | ');
    out['歌詞はいちばん上だけ'] = song.tracks.slice(0, 3).map((t) => t.notes.filter((n) => n.ly).length).join(',');
    out['楽器は同じ'] = song.tracks.slice(0, 3).every((t) => t.inst === 'trumpet');
    // まとめる：2回やると、もとの和音にもどる
    cur = 0;
    implodeTrack(track()); implodeTrack(track());
    out['まとめる：パートの数（2）・音'] = song.tracks.length + '・' + track().notes.map((n) => n.s + ':' + n.p).join(' ');
    undo(); undo(); undo();
    out['3回もどすと、はじめと同じ'] = song.tracks.length + '・' + track().notes.length;
    // 長さのちがう音をまとめると、下の声部になる
    loadSong({ v: 2, title: 'im', bpm: 100, bars: 1, tracks: [{ type: 'melody', inst: 'flute', notes: [{ s: 0, p: 72, l: 48 }, { s: 48, p: 74, l: 48 }] }, { type: 'melody', inst: 'flute', notes: [{ s: 0, p: 60, l: 96 }] }] }, { own: true });
    cur = 0; implodeTrack(track());
    out['長さがちがう音は声部2'] = track().notes.map((n) => n.p + (n.v === 2 ? '(2)' : '')).join(',');
    // 道具のボタン
    renderEditorTools();
    out['ボタンがある'] = !!document.querySelector('#btnExplode') && !!document.querySelector('#btnImplode');
    return out;
  });
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
