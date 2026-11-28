/* ============================================================
   いろいろな楽譜ソフトの「いいところ」その2
   ・版の保存と見くらべ（Flat の版の履歴）
   ・アイデア帳（Sibelius のアイデア）
   ・人が弾いたような再生（Sibelius の Espressivo・Dorico の演奏のゆれ）
   ・ピアノ譜にまとめる（Sibelius のリダクション）
   ・歌って入力（マイクの音の高さ → 音符）
   ・弾いて練習（マイクで聞いて、合った音は緑・ちがう音は赤）
   重くならないように：マイクの音は 1秒に30回、間引いた小さなデータで高さを調べる。
   版はブラウザの中の別の保存場所（IndexedDB）に入れて、ふだんの保存をじゃましない
   ============================================================ */

/* ---------- 版の保存と見くらべ ---------- */
const VerDB = (() => {
  let dbp = null;
  const mem = new Map(); // 保存場所が使えないとき（プライベートモードなど）は、開いている間だけ
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    if (!window.indexedDB) { rej(new Error('no idb')); return; }
    const r = indexedDB.open('otsumiki-pro', 1);
    r.onupgradeneeded = () => { const st = r.result.createObjectStore('versions', { keyPath: 'id' }); st.createIndex('vid', 'vid'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const run = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction('versions', mode);
      let out;
      fn(t.objectStore('versions'), (v) => (out = v));
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  };
  return {
    async list(vid) {
      try { return await run('readonly', (st, set) => { const q = st.index('vid').getAll(vid); q.onsuccess = () => set(q.result || []); }); } catch (e) { return [...mem.values()].filter((x) => x.vid === vid); }
    },
    async put(rec) { try { await run('readwrite', (st) => st.put(rec)); } catch (e) { mem.set(rec.id, rec); } },
    async del(id) { mem.delete(id); try { await run('readwrite', (st) => st.delete(id)); } catch (e) { /* なし */ } },
  };
})();
const VER_MAX = 40;
const VER_AUTO_MAX = 10;
function verEnsureId() { if (!song.vid) { song.vid = uid() + uid(); autosaveSoon(); } return song.vid; }
const verDate = (at) => { const d = new Date(at); return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
async function verSave(name, auto) {
  const vid = verEnsureId();
  const data = snapshot();
  const list = (await VerDB.list(vid)).sort((a, z) => z.at - a.at);
  if (list[0] && list[0].data === data) { if (!auto) toast('いちばん新しい版と同じです（変わっていません）'); return false; }
  await VerDB.put({ id: uid() + uid(), vid, name: String(name || '').slice(0, 60), auto: !!auto, at: Date.now(), title: song.title, n: noteCount(), bars: song.bars, data });
  // 古い版を整理：自動の版は10こまで、ぜんぶで40こまで（自分でつけた版を先にのこす）
  const autos = list.filter((x) => x.auto);
  const drop = autos.slice(auto ? VER_AUTO_MAX - 1 : VER_AUTO_MAX);
  const rest = list.filter((x) => !drop.includes(x));
  if (rest.length + 1 > VER_MAX) drop.push(...rest.filter((x) => x.auto).concat(rest.filter((x) => !x.auto)).slice(-(rest.length + 1 - VER_MAX)));
  for (const x of new Set(drop)) await VerDB.del(x.id);
  return true;
}
// 10分ごとに、変わっていれば自動で版をのこす（再生中はしない）
let verAuto = { v: -1, at: Date.now() };
setInterval(() => {
  if (typeof songOwn === 'undefined' || !songOwn || player.on || version === verAuto.v || Date.now() - verAuto.at < 10 * 60e3) return;
  verAuto = { v: version, at: Date.now() };
  const go = () => verSave('自動', true).catch(() => {});
  if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 5000 }); else setTimeout(go, 0);
}, 60e3);
// 前の版とくらべて、変わった小節
function verChangedBars(ref) {
  const bars = new Set();
  const sig = (t) => (t.type === 'melody' ? t.notes.map((n) => n.s + ':' + n.p + ':' + n.l) : t.type === 'chord' ? (t.chords || []).map((c, i) => (c ? i + ':' + c.r + c.q : '')) : Object.entries(t.grid || {}).flatMap(([id, g]) => Object.keys(g).map((s) => id + ':' + s)));
  const n = Math.max(song.tracks.length, ref.tracks.length);
  for (let i = 0; i < n; i++) {
    const a = song.tracks[i];
    const b = ref.tracks[i];
    if (!a || !b) continue;
    const A = new Set(sig(a));
    const B = new Set(sig(b));
    const mark = (k) => { const s = a.type === 'chord' ? barStart(+k.split(':')[0]) : +k.split(':')[a.type === 'drum' ? 1 : 0]; if (Number.isFinite(s) && s < totalTicks()) bars.add(barOf(s)); };
    for (const k of A) if (!B.has(k)) mark(k);
    for (const k of B) if (!A.has(k)) mark(k);
  }
  return [...bars].sort((x, z) => x - z);
}
function barsText(list) {
  const num = (b) => (song.pickup ? b : b + 1);
  const out = [];
  for (let i = 0; i < list.length; i++) {
    let j = i;
    while (j + 1 < list.length && list[j + 1] === list[j] + 1) j++;
    out.push(i === j ? `${num(list[i])}` : `${num(list[i])}〜${num(list[j])}`);
    i = j;
  }
  return out.join('・');
}
function verCompare(rec) {
  try {
    refSong = sanitizeSong(migrate(JSON.parse(rec.data)));
    refSong._ver = rec.name || verDate(rec.at);
  } catch (e) { toast('この版を読めませんでした'); return; }
  updateCompare();
  draw();
  if (ui.view === 'score') renderScoreEdit();
  toast(`「${refSong._ver}」と見くらべています。足した音は青、消した音は点線（マス目の画面）`, 4000);
}
function verRestore(rec) {
  if (!confirm(`いまの曲を「${rec.name || verDate(rec.at)}」（${verDate(rec.at)}）の版にもどしますか？\n（もどしたあとでも「もどす」で、いまの曲にもどれます）`)) return;
  const keep = song.vid;
  pushUndo(snapshot(), '版にもどす');
  restore(rec.data);
  song.vid = keep;
  if (refSong && refSong._ver) stopCompare();
  if (ui.view === 'score') renderScoreEdit();
  updateUndoButtons();
  toast('前の版にもどしました');
}
async function verOpen() {
  let dlg = $('#dlgVer');
  if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'dlgVer'; dlg.className = 'dlg small'; document.body.appendChild(dlg); }
  const list = song.vid ? (await VerDB.list(song.vid)).sort((a, z) => z.at - a.at) : [];
  const nm = `版${list.filter((x) => !x.auto).length + 1}`;
  dlg.innerHTML = `<h3>版の保存と見くらべ</h3>
    <p class="muted small">いまの曲を「版」としてのこしておけます。あとで見くらべたり、その版にもどしたりできます。10分ごとに、変わっていれば自動でものこします（このブラウザの中だけ）。</p>
    <div class="btnrow"><input id="verName" type="text" maxlength="60" value="${nm}" aria-label="版の名前" style="flex:1;min-width:0"><button class="mini accent" id="verSaveB">いまの曲をのこす</button></div>
    ${list.length ? `<ul class="cmtlist verlist">${list.map((r, i) => `<li><div class="vinfo"><b>${escapeHtml(r.name || '（名前なし）')}</b>${r.auto ? ' <small class="tag">自動</small>' : ''}<br><small class="muted">${verDate(r.at)}・音 ${r.n}こ・${r.bars}小節</small></div><span class="grow"></span><button class="mini" data-cmp="${i}">見くらべる</button><button class="mini" data-rs="${i}">もどす</button><button class="mini" data-rn="${i}" title="名前を変える">名前</button><button class="mini danger" data-del="${i}" title="この版を消す">消す</button></li>`).join('')}</ul>` : '<p class="muted">まだ版はありません</p>'}
    <div class="btnrow" style="margin-top:10px">${refSong && refSong._ver ? '<button class="mini" id="verStop">見くらべをやめる</button>' : ''}<span class="grow"></span><button class="mini accent" id="verClose">とじる</button></div>`;
  dlg.querySelector('#verClose').onclick = () => dlg.close();
  if (dlg.querySelector('#verStop')) dlg.querySelector('#verStop').onclick = () => { stopCompare(); if (ui.view === 'score') renderScoreEdit(); verOpen(); };
  dlg.querySelector('#verSaveB').onclick = async () => { if (await verSave(dlg.querySelector('#verName').value.trim() || nm, false)) { toast('版をのこしました'); verAuto = { v: version, at: Date.now() }; } verOpen(); };
  dlg.querySelectorAll('[data-cmp]').forEach((b) => (b.onclick = () => { dlg.close(); verCompare(list[+b.dataset.cmp]); }));
  dlg.querySelectorAll('[data-rs]').forEach((b) => (b.onclick = () => { dlg.close(); verRestore(list[+b.dataset.rs]); }));
  dlg.querySelectorAll('[data-rn]').forEach((b) => (b.onclick = async () => { const r = list[+b.dataset.rn]; const v = prompt('版の名前', r.name); if (v == null) return; await VerDB.put({ ...r, name: v.trim().slice(0, 60), auto: false }); verOpen(); }));
  dlg.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => { const r = list[+b.dataset.del]; if (!confirm(`「${r.name || verDate(r.at)}」の版を消しますか？`)) return; await VerDB.del(r.id); verOpen(); }));
  if (!dlg.open) dlg.showModal();
}

/* ---------- アイデア帳（Sibelius のアイデア）：フレーズ・リズムをしまって、どの曲にも貼れる ---------- */
const IDEA_KEY = 'otsumiki-ideas';
const IDEA_BUILTIN = [
  { id: 'b1', name: '8ビート（ドラム）', kind: 'drum', len: 192, notes: [0, 96].map((s) => ({ id: 'kick', s, v: 2 })).concat([48, 144].map((s) => ({ id: 'snare', s, v: 2 })), [0, 24, 48, 72, 96, 120, 144, 168].map((s) => ({ id: 'hihat', s, v: 1 }))) },
  { id: 'b2', name: 'フィルイン（ドラム）', kind: 'drum', len: 192, notes: [0, 48, 96].map((s) => ({ id: 'kick', s, v: 2 })).concat([96, 120, 132, 144, 156, 168, 180].map((s) => ({ id: 'snare', s, v: s === 96 ? 2 : 1 }))) },
  { id: 'b3', name: 'ドレミファソ（上がる）', kind: 'mel', key: 0, len: 192, notes: [60, 62, 64, 65, 67].map((p, i) => ({ s: i * 24, p, l: i === 4 ? 96 : 24 })) },
  { id: 'b4', name: 'タン・タタ（リズム）', kind: 'mel', key: 0, len: 192, notes: [[0, 48], [48, 24], [72, 24], [96, 48], [144, 48]].map(([s, l]) => ({ s, p: 67, l })) },
  { id: 'b5', name: 'おわりの形（ソ→ド）', kind: 'mel', key: 0, len: 192, notes: [[0, 64, 48], [48, 62, 48], [96, 60, 96]].map(([s, p, l]) => ({ s, p, l })) },
  { id: 'b6', name: 'ワルツのベース（3拍子）', kind: 'mel', key: 0, len: 144, notes: [[0, 48, 48], [48, 55, 48], [96, 55, 48]].map(([s, p, l]) => ({ s, p, l })) },
];
function ideasLoad() { try { const a = JSON.parse(localStorage.getItem(IDEA_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function ideasSave(a) { try { localStorage.setItem(IDEA_KEY, JSON.stringify(a.slice(0, 100))); return true; } catch (e) { toast('しまえませんでした（ブラウザの保存領域がいっぱいかもしれません）'); return false; } }
function ideaCapture() {
  const tr = track();
  if (!tr || tr.type === 'chord') return toast('メロディかリズムのトラックで、音をえらんでからおしてね');
  const ns = ui.view === 'score' ? selNotes(tr) : prSel();
  if (!ns.length) return toast(ui.view === 'score' ? '先に、しまいたい音をえらんでください（Shift＋クリックで範囲）' : '先に、しまいたい音をえらんでください（Shift＋ドラッグで囲む）');
  const [a, z] = selSpan(ns.map((n) => ({ s: n.s, l: n.l || 1 })));
  const b0 = barStart(barOf(a));
  const st = a - ((a - b0) % beatAt(barOf(a))); // 拍の頭から
  const beat = beatAt(barOf(a));
  const len = Math.max(beat, Math.ceil((z - st) / beat) * beat);
  const kind = tr.type === 'drum' ? 'drum' : 'mel';
  const name = prompt('アイデアの名前', `${tr.name}（${ns.length}音）`);
  if (name == null) return;
  const notes = kind === 'drum' ? ns.map((n) => ({ id: n.id, s: n.s - st, v: n.v })) : ns.map((n) => { const c = { ...n, s: n.s - st }; delete c.str; if (n.art) c.art = [...n.art]; return c; });
  const all = ideasLoad();
  all.unshift({ id: uid() + uid(), name: (name.trim() || 'アイデア').slice(0, 40), kind, len, notes, inst: tr.inst || '', key: song.key, at: Date.now() });
  if (ideasSave(all)) toast('アイデア帳にしまいました');
}
function ideaNotes(idea, fit) {
  const notes = idea.notes.map((n) => ({ ...n, art: n.art ? [...n.art] : undefined }));
  if (idea.kind === 'mel' && fit && idea.key != null) {
    let d = (((song.key - idea.key) % 12) + 12) % 12;
    if (d > 6) d -= 12;
    for (const n of notes) n.p = clamp(n.p + d, 21, 108);
  }
  return notes;
}
function ideaInsert(idea, fit) {
  const tr = track();
  if (!tr || tr.type === 'chord') return toast('メロディかリズムのトラックをえらんでね');
  if ((idea.kind === 'drum') !== (tr.type === 'drum')) return toast(idea.kind === 'drum' ? 'リズムのアイデアは、リズムのトラックに貼りつけてね' : 'メロディのアイデアは、メロディのトラックに貼りつけてね');
  const notes = ideaNotes(idea, fit);
  if (ui.view === 'score' && idea.kind === 'mel') {
    const keep = ui.sc.clip;
    ui.sc.clip = { len: idea.len, notes };
    scPaste();
    ui.sc.clip = keep;
  } else {
    const keep = noteClip;
    noteClip = { drum: idea.kind === 'drum', notes, len: idea.len };
    if (ui.view === 'score') { pasteAt(ui.sc.cursor || 0, 'アイデアを貼る'); renderScoreEdit(); } else selPaste();
    noteClip = keep;
    updateSelBar();
  }
}
function ideaPreview(idea) {
  const ctx = ensureAudio();
  const spt = 60 / (bpmAt(0) * TPQ);
  const t0 = ctx.currentTime + 0.05;
  const tr = track();
  const inst = idea.inst || (tr && tr.type === 'melody' ? tr.inst : 'piano');
  for (const n of idea.notes.slice(0, 64)) {
    if (idea.kind === 'drum') Sound.playDrum(ctx, previewOut, n.id, t0 + n.s * spt, n.v === 2 ? 0.9 : 0.6, true);
    else Sound.playNote(ctx, previewOut, inst, n.p, t0 + n.s * spt, n.l * spt * 0.95, 0.7, true);
  }
}
function ideasOpen() {
  let dlg = $('#dlgIdea');
  if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'dlgIdea'; dlg.className = 'dlg small'; document.body.appendChild(dlg); }
  const mine = ideasLoad();
  const tr = track();
  const want = tr && tr.type === 'drum' ? 'drum' : 'mel';
  const row = (x, own) => `<li class="${x.kind === want ? '' : 'dim'}"><div class="vinfo"><b>${escapeHtml(x.name)}</b><br><small class="muted">${x.kind === 'drum' ? 'リズム' : 'メロディ'}・${Math.round((x.len / TPQ) * 10) / 10}拍</small></div><span class="grow"></span><button class="mini" data-pv="${x.id}" title="聞いてみる">▶</button><button class="mini accent" data-in="${x.id}" title="いまの場所に貼りつける">貼る</button>${own ? `<button class="mini danger" data-del="${x.id}">消す</button>` : ''}</li>`;
  dlg.innerHTML = `<h3>アイデア帳</h3>
    <p class="muted small">気に入ったフレーズやリズムをしまっておいて、どの曲にもすぐ貼れます。音をえらんで「えらんだ音をしまう」。貼るときは、楽譜ならカーソル、マス目なら再生の印の所に入ります。</p>
    <div class="btnrow"><button class="mini accent" id="ideaCap">＋ えらんだ音をしまう</button><span class="grow"></span><label class="small"><input type="checkbox" id="ideaFit" checked> いまの調に合わせる</label></div>
    <h4>じぶんのアイデア</h4>${mine.length ? `<ul class="cmtlist verlist">${mine.map((x) => row(x, true)).join('')}</ul>` : '<p class="muted small">まだありません</p>'}
    <h4>はじめから入っているもの</h4><ul class="cmtlist verlist">${IDEA_BUILTIN.map((x) => row(x, false)).join('')}</ul>
    <div class="btnrow" style="margin-top:10px"><span class="grow"></span><button class="mini accent" id="ideaClose">とじる</button></div>`;
  const find = (id) => mine.find((x) => x.id === id) || IDEA_BUILTIN.find((x) => x.id === id);
  dlg.querySelector('#ideaClose').onclick = () => dlg.close();
  dlg.querySelector('#ideaCap').onclick = () => { ideaCapture(); ideasOpen(); };
  dlg.querySelectorAll('[data-pv]').forEach((b) => (b.onclick = () => ideaPreview(find(b.dataset.pv))));
  dlg.querySelectorAll('[data-in]').forEach((b) => (b.onclick = () => { const fit = dlg.querySelector('#ideaFit').checked; dlg.close(); ideaInsert(find(b.dataset.in), fit); }));
  dlg.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { if (!confirm('このアイデアを消しますか？')) return; ideasSave(mine.filter((x) => x.id !== b.dataset.del)); ideasOpen(); }));
  if (!dlg.open) dlg.showModal();
}

/* ---------- 人が弾いたような再生（Sibelius の Espressivo）：song.feel = 0 なし・1 ほんのり・2 たっぷり ----------
   ・フレーズ（休みで区切る、長くても4小節）の山（いちばん高い音）へ向かって少し強く、そのあと少し弱く
   ・小節の頭は少し強く、裏拍は少し弱く
   ・フレーズのおわりの音は少しやさしく
   ・メロディがあるときは、コード伴奏を少しひかえめに
   ・曲のおわりの2小節は、だんだんゆっくり（たっぷりのときは、フレーズのおわりの小節もほんの少しゆっくり）
   計算は曲が変わったときに1回だけ（再生中は表を見るだけ） */
let feelCache = { key: '', map: new Map(), ends: new Set() };
function feelBuild() {
  const key = version + ':' + (song.feel || 0);
  if (feelCache.key === key) return feelCache;
  const amt = song.feel || 0;
  const map = new Map();
  const ends = new Set();
  for (const tr of song.tracks) {
    if (tr.type !== 'melody' || !tr.notes.length) continue;
    const ns = tr.notes.filter((n) => n.v !== 2).sort((a, b) => a.s - b.s || b.p - a.p);
    // 和音は一番上の音で形を見る
    const tops = [];
    for (const n of ns) if (!tops.length || tops[tops.length - 1].s !== n.s) tops.push(n);
    const phrases = [];
    let curP = [];
    for (let i = 0; i < tops.length; i++) {
      const n = tops[i];
      if (curP.length) {
        const prev = curP[curP.length - 1];
        const gap = n.s - (prev.s + prev.l);
        const long = barOf(n.s) - barOf(curP[0].s) >= 4;
        if (gap >= beatAt(barOf(prev.s)) || long) { phrases.push(curP); curP = []; }
      }
      curP.push(n);
    }
    if (curP.length) phrases.push(curP);
    const fac = new Map();
    for (const ph of phrases) {
      let pk = 0;
      ph.forEach((n, i) => { if (n.p > ph[pk].p) pk = i; });
      ph.forEach((n, i) => {
        // 山へ向かって -0.5 → +0.5、そのあと → -0.6
        const sh = ph.length < 2 ? 0 : i <= pk ? (pk ? -0.5 + i / pk : 0.5) : 0.5 - ((i - pk) / (ph.length - 1 - pk || 1)) * 1.1;
        let f = 1 + amt * 0.09 * sh;
        if (i === ph.length - 1 && ph.length > 2) f -= amt * 0.05;
        fac.set(n.s, f);
      });
      const last = ph[ph.length - 1];
      if (ph.length > 3 && barOf(last.s) > barOf(ph[0].s)) ends.add(barOf(last.s));
    }
    for (const n of tr.notes) {
      const b = barOf(n.s);
      const inBar = n.s - barStart(b);
      const bt = beatAt(b);
      let m = 1;
      if (inBar === 0) m += amt * 0.05;
      else if (inBar % bt === 0) m += inBar === barLen(b) / 2 ? amt * 0.025 : 0;
      else m -= amt * 0.035;
      map.set(n, (fac.get(n.s) || 1) * m); // 声部2の音などは、形の強弱なし（拍の強弱だけ）
    }
  }
  feelCache = { key, map, ends };
  return feelCache;
}
function feelVel(n) { if (!song.feel) return 1; return feelBuild().map.get(n) || 1; }
function feelAccomp() { return song.feel && song.tracks.some((t) => t.type === 'melody' && t.notes.length && !t.mute) ? 1 - song.feel * 0.06 : 1; }
// 小節ごとの速さの倍率（1より大きい＝ゆっくり）。o は再生する小節の順番
function feelSlow(o) {
  if (!song.feel) return null;
  const amt = song.feel;
  const f = o.map(() => 1);
  const n = o.length;
  if (n >= 3) { f[n - 1] *= 1 + 0.12 * amt; f[n - 2] *= 1 + 0.045 * amt; }
  if (amt >= 2) { const ends = feelBuild().ends; o.forEach((b, k) => { if (k < n - 2 && ends.has(b)) f[k] *= 1.03; }); }
  return f;
}
function feelSet(v) {
  v = clamp(Math.round(+v || 0), 0, 2);
  if ((song.feel || 0) === v) return;
  edit(() => { if (v) song.feel = v; else delete song.feel; }, '演奏の表情');
  feelUi();
  toast(['表情なし：楽譜のとおり、きっちり鳴らします', '表情ほんのり：フレーズの山へ向かって少し強く、おわりで少しゆっくり', '表情たっぷり：強弱とゆれを大きく'][v], 3500);
}
function feelUi() { document.querySelectorAll('#feelSeg [data-f]').forEach((b) => b.classList.toggle('on', +b.dataset.f === (song.feel || 0))); }

/* ---------- ピアノ譜にまとめる（Sibelius のリダクション） ----------
   いくつかのパートの音を、右手（ド4より上）と左手（下）に分けて、1つのピアノのトラックにする。
   同じときに鳴る音は和音に。長さのちがう音は2つめの声部に。同じ音の重なり（オクターブちがいも）は1つに */
function reduceMake(tracks, withChords) {
  const all = [];
  for (const tr of tracks) for (const n of tr.notes) if (n.s < totalTicks()) all.push({ s: n.s, p: n.p, l: Math.max(1, n.l) });
  const RH = [];
  const LH = [];
  for (const n of all) (n.p >= 60 ? RH : LH).push(n);
  if (withChords) {
    const ct = chordTrackOf();
    if (ct) for (const c of chordTimeline(ct)) {
      // 左手がからっぽの所だけ、根音と5度を足す
      const busy = LH.some((n) => n.s < c.e && n.s + n.l > c.s);
      if (busy) continue;
      let r = 36 + c.root;
      if (r < 41) r += 12;
      LH.push({ s: c.s, p: r, l: c.e - c.s }, { s: c.s, p: r + 7, l: c.e - c.s });
    }
  }
  const hand = (list, right) => {
    const by = new Map();
    for (const n of list) { if (!by.has(n.s)) by.set(n.s, []); by.get(n.s).push(n); }
    const out = [];
    const v1 = [];
    const v2 = [];
    for (const [s, g] of [...by].sort((a, b) => a[0] - b[0])) {
      // 同じ高さは1つ（長いほう）
      const m = new Map();
      for (const n of g) { const o = m.get(n.p); if (!o || n.l > o.l) m.set(n.p, n); }
      let ps = [...m.values()].sort((a, b) => b.p - a.p);
      // オクターブの重なりは、外側の音をのこす
      const seen = new Set();
      ps = ps.filter((n, i) => { const pc = n.p % 12; if (i === 0 || i === ps.length - 1) { seen.add(pc); return true; } if (seen.has(pc)) return false; seen.add(pc); return true; });
      // 片手で4音まで。右手は上から、左手は下からのこす
      if (ps.length > 4) ps = right ? [...ps.slice(0, 3), ps[ps.length - 1]] : [ps[0], ...ps.slice(-3)];
      // 片手でとどくはんい（右手は一番上から、左手は一番下から1オクターブと少し）
      const lim = 14;
      ps = right ? ps.filter((n) => ps[0].p - n.p <= lim) : ps.filter((n) => n.p - ps[ps.length - 1].p <= lim);
      const keyL = right ? ps[0].l : ps[ps.length - 1].l;
      for (const n of ps) (n.l === keyL ? v1 : v2).push({ s, p: n.p, l: n.l });
    }
    // 同じ声部の中で重ならないように、つぎの音の頭で切る
    const trim = (arr, v) => {
      const starts = [...new Set(arr.map((n) => n.s))].sort((a, b) => a - b);
      for (const n of arr) {
        const nx = starts.find((x) => x > n.s);
        if (nx != null && n.s + n.l > nx) n.l = nx - n.s;
        out.push(v === 2 ? { ...n, v: 2 } : n);
      }
    };
    trim(v1, 1);
    trim(v2, 2);
    return out;
  };
  return [...hand(RH, true), ...hand(LH, false)];
}
function reduceOpen() {
  const mels = song.tracks.filter((t) => t.type === 'melody' && t.notes.length);
  if (!mels.length) return toast('音の入ったメロディのトラックがありません');
  let dlg = $('#dlgRed');
  if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'dlgRed'; dlg.className = 'dlg small'; document.body.appendChild(dlg); }
  const ct = chordTrackOf();
  dlg.innerHTML = `<h3>ピアノ譜にまとめる</h3>
    <p class="muted small">えらんだパートの音を、1つのピアノの楽譜（右手・左手）にまとめて、新しいトラックを作ります。合唱やバンドの伴奏譜・練習用の楽譜に。もとのトラックはそのままです。</p>
    <div class="redlist">${mels.map((t) => `<label class="small"><input type="checkbox" data-id="${t.id}" ${t.mute ? '' : 'checked'}> ${escapeHtml(t.name)}</label>`).join('')}</div>
    ${ct ? '<label class="small"><input type="checkbox" id="redCh" checked> 左手が休みの所は、コード伴奏の根音を入れる</label>' : ''}
    <label class="small"><input type="checkbox" id="redMute"> もとのパートは消音にする</label>
    <div class="btnrow" style="margin-top:12px"><span class="grow"></span><button class="mini" id="redNo">やめる</button><button class="mini accent" id="redOk">作る</button></div>`;
  dlg.querySelector('#redNo').onclick = () => dlg.close();
  dlg.querySelector('#redOk').onclick = () => {
    const ids = new Set([...dlg.querySelectorAll('[data-id]:checked')].map((x) => x.dataset.id));
    const trs = mels.filter((t) => ids.has(t.id));
    if (!trs.length) return toast('パートを1つ以上えらんでね');
    if (song.tracks.length >= MAX_TRACKS) return toast('トラックがいっぱいです');
    const notes = reduceMake(trs, !!(dlg.querySelector('#redCh') && dlg.querySelector('#redCh').checked));
    const mute = dlg.querySelector('#redMute').checked;
    dlg.close();
    edit(() => {
      const nt = newTrack('melody', { name: 'ピアノ（まとめ）', cname: 'ピアノ（まとめ）', inst: 'piano', range: 'wide', notes });
      song.tracks.push(nt);
      if (mute) for (const t of trs) t.mute = true;
    }, 'ピアノ譜にまとめる');
    selectTrack(song.tracks.length - 1);
    preloadSamples();
    renderTracks();
    if (ui.view === 'score') renderScoreEdit(); else draw();
    toast(`${trs.length}つのパートを、ピアノ譜（${notes.length}音）にまとめました`);
  };
  dlg.showModal();
}

/* ---------- マイクで音の高さを聞く（歌って入力・弾いて練習で使う） ----------
   1秒に30回、2048こ（約0.05秒）の音を 1/4 に間引いてから、YIN という方法で高さをさがす。1回の計算はとても小さい */
const Mic = { on: false, stream: null, src: null, an: null, buf: null, timer: null, sr: 44100, cb: null, cur: null, cand: null, candN: 0, quiet: 0, peak: 0, dip: false, last: null, oct: 0 };
async function micStart(cb) {
  if (Mic.on) { Mic.cb = cb; return true; }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('このブラウザではマイクを使えません'); return false; }
  try {
    const ctx = ensureAudio();
    if (ctx.state === 'suspended') await ctx.resume();
    Mic.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
    Mic.src = ctx.createMediaStreamSource(Mic.stream);
    Mic.an = ctx.createAnalyser();
    Mic.an.fftSize = 2048;
    Mic.src.connect(Mic.an); // スピーカーにはつながない
    Mic.buf = new Float32Array(2048);
    Mic.sr = ctx.sampleRate;
    Mic.on = true;
    Mic.cb = cb;
    Mic.cur = null; Mic.cand = null; Mic.candN = 0; Mic.quiet = 0; Mic.peak = 0;
    Mic.timer = setInterval(micTick, 33);
    return true;
  } catch (e) {
    toast(e && e.name === 'NotAllowedError' ? 'マイクを使えるように許可してね' : 'マイクを使えませんでした：' + ((e && e.message) || e));
    micStop();
    return false;
  }
}
function micStop() {
  if (Mic.timer) clearInterval(Mic.timer);
  Mic.timer = null;
  if (Mic.src) try { Mic.src.disconnect(); } catch (e) { /* なし */ }
  if (Mic.stream) Mic.stream.getTracks().forEach((t) => t.stop());
  Mic.on = false; Mic.stream = null; Mic.src = null; Mic.an = null; Mic.cb = null; Mic.cur = null;
}
const yinWork = { x: null, d: null };
// 高さ（MIDI の番号、小数つき）と大きさ。高さがわからないときは p = null
function micDetect() {
  const an = Mic.an;
  an.getFloatTimeDomainData(Mic.buf);
  const D = Math.max(1, Math.round(Mic.sr / 11025));
  const N = Math.floor(Mic.buf.length / D);
  if (!yinWork.x || yinWork.x.length !== N) { yinWork.x = new Float32Array(N); yinWork.d = new Float32Array(N >> 1); }
  const x = yinWork.x;
  let rms = 0;
  for (let i = 0; i < N; i++) { let s = 0; for (let k = 0; k < D; k++) s += Mic.buf[i * D + k]; s /= D; x[i] = s; rms += s * s; }
  rms = Math.sqrt(rms / N);
  if (rms < 0.012) return { p: null, rms };
  const sr = Mic.sr / D;
  const W = N >> 1;
  const tMin = Math.max(2, Math.floor(sr / 1100));
  const tMax = Math.min(W - 1, Math.ceil(sr / 70));
  const d = yinWork.d;
  let run = 0;
  d[0] = 1;
  let best = -1;
  for (let t = 1; t <= tMax; t++) {
    let s = 0;
    for (let i = 0; i < W; i++) { const v = x[i] - x[i + t]; s += v * v; }
    run += s;
    d[t] = run ? (s * t) / run : 1;
    if (t >= tMin && best < 0 && d[t] < 0.15) {
      // 谷の底まで進む
      while (t + 1 <= tMax) {
        let s2 = 0;
        for (let i = 0; i < W; i++) { const v = x[i] - x[i + t + 1]; s2 += v * v; }
        const run2 = run + s2;
        const d2 = (s2 * (t + 1)) / run2;
        if (d2 >= d[t]) break;
        t++; run = run2; d[t] = d2;
      }
      best = t;
      break;
    }
  }
  if (best < 0) return { p: null, rms };
  // となりとの3点で、ほんの少しくわしく
  let tau = best;
  if (best > 1 && best < tMax) {
    let s0 = 0; let s2 = 0;
    for (let i = 0; i < W; i++) { const a = x[i] - x[i + best - 1]; const c = x[i] - x[i + best + 1]; s0 += a * a; s2 += c * c; }
    const a = s0; const c = s2; const bb = d[best] * (run / best);
    const den = a + c - 2 * bb;
    if (den > 0) tau = best + clamp((a - c) / (2 * den), -0.5, 0.5);
  }
  const f = sr / tau;
  return { p: 69 + 12 * Math.log2(f / 440), rms };
}
// 同じ高さが3回（約0.1秒）つづいたら「音が出た」。しずかになったり、声の大きさがいったん下がってまた上がったら、次の音
function micTick() {
  if (!Mic.on || !Mic.an) return;
  const r = micDetect();
  Mic.last = r;
  Mic.peak = Math.max(r.rms, Mic.peak * 0.92);
  if (r.rms < Mic.peak * 0.45) Mic.dip = true;
  const m = r.p == null ? null : Math.round(r.p);
  if (m == null) {
    Mic.quiet++;
    Mic.candN = 0;
    if (Mic.cur != null && Mic.quiet >= 3) { const was = Mic.cur; Mic.cur = null; if (Mic.cb) Mic.cb('off', was, r); }
  } else {
    Mic.quiet = 0;
    const off = Math.abs(r.p - m);
    if (m === Mic.cand) Mic.candN++; else { Mic.cand = m; Mic.candN = 1; }
    const again = Mic.cur === m && Mic.dip && r.rms > Mic.peak * 0.7;
    if (Mic.candN >= 3 && off < 0.42 && (Mic.cur !== m || again)) {
      if (Mic.cur != null && Mic.cb) Mic.cb('off', Mic.cur, r);
      Mic.cur = m;
      Mic.dip = false;
      if (Mic.cb) Mic.cb('on', m + Mic.oct * 12, r);
    }
  }
  if (Mic.cb) Mic.cb('frame', r.p == null ? null : r.p + Mic.oct * 12, r);
}
const NOTE_JA = ['ド', 'ド♯', 'レ', 'ミ♭', 'ミ', 'ファ', 'ファ♯', 'ソ', 'ソ♯', 'ラ', 'シ♭', 'シ'];
const noteJa = (m) => `${NOTE_JA[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
function micHud(on, html) {
  let h = $('#micHud');
  if (!on) { if (h) h.hidden = true; return; }
  if (!h) { h = document.createElement('div'); h.id = 'micHud'; h.className = 'michud'; h.setAttribute('role', 'status'); document.body.appendChild(h); }
  h.hidden = false;
  if (html != null) h.innerHTML = html;
  return h;
}

/* ---------- 歌って入力：楽譜の入力モードなら、カーソルに音符が入る。録音中（●）なら、そのまま録音 ---------- */
let singOn = false;
let singShown = '';
function singCb(kind, m, r) {
  if (kind === 'frame') {
    const lv = Math.min(1, (r.rms || 0) * 8);
    const nm = m == null ? '…' : noteJa(Math.round(m));
    const key = nm + ':' + Math.round(lv * 10);
    if (key === singShown) return; // 変わったときだけ書きかえる
    singShown = key;
    const h = $('#micHud');
    if (h) { h.querySelector('.mnote').textContent = nm; h.querySelector('.mlv i').style.width = Math.round(lv * 100) + '%'; }
    return;
  }
  const tr = track();
  if (!tr || tr.type !== 'melody') return;
  if (kind === 'on') {
    if (rec.on && player.on) { held.set('mic', m); recNoteOn(m); return; }
    if (ui.view === 'score' && ui.sc.input) { scInsert([m]); renderScoreEdit(); return; }
    if (ui.view !== 'score' && ui.stepRec) { noteOn(m); setTimeout(() => noteOff && noteOff(m), 0); }
  } else if (kind === 'off') {
    if (rec.on && held.has('mic')) { held.delete('mic'); recNoteOff(); }
  }
}
async function singToggle(force) {
  const on = force != null ? force : !singOn;
  if (!on) { singOn = false; if (!prOn()) { micStop(); micHud(false); } renderMicButtons(); return; }
  if (prOn()) return toast('いまは「弾いて練習」でマイクを使っています');
  const tr = track();
  if (!tr || tr.type !== 'melody') return toast('メロディのトラックをえらんでね');
  if (!(await micStart(singCb))) return;
  singOn = true;
  const h = micHud(true, `<b>🎤 歌って入力</b><span class="mnote">…</span><span class="mlv"><i></i></span><button class="mini" data-o="-1" title="1オクターブ下に入れる">8vb</button><span class="moct"></span><button class="mini" data-o="1" title="1オクターブ上に入れる">8va</button><button class="mini" id="micEnd">おわる</button><small class="muted mhint"></small>`);
  const octUi = () => { h.querySelector('.moct').textContent = Mic.oct ? (Mic.oct > 0 ? '+' : '') + Mic.oct * 12 : '±0'; };
  h.querySelectorAll('[data-o]').forEach((b) => (b.onclick = () => { Mic.oct = clamp(Mic.oct + +b.dataset.o, -2, 2); octUi(); }));
  h.querySelector('#micEnd').onclick = () => singToggle(false);
  octUi();
  h.querySelector('.mhint').textContent = ui.view === 'score' ? (ui.sc.input ? '「ラー」とはっきり歌うと、えらんだ長さで1音ずつ入ります' : '入力モード（✏️）にすると、音符が入ります') : '録音（●）しながら歌うと、そのまま録音されます';
  if (ui.view === 'score' && !ui.sc.input) { ui.sc.input = true; renderScorePal(); renderScoreEdit(); h.querySelector('.mhint').textContent = '「ラー」とはっきり歌うと、えらんだ長さで1音ずつ入ります'; }
  renderMicButtons();
}
function renderMicButtons() {
  const b = $('#scMicB');
  if (b) b.classList.toggle('on', singOn);
  const p = $('#btnPrStart');
  if (p) p.textContent = prOn() ? '練習をおわる' : '🎤 弾いて練習（採点）';
}

/* ---------- 弾いて練習：再生にあわせて弾く（歌う）と、合った音は緑・ちがう音は赤 ---------- */
const PR = { on: false, tr: null, targets: [], idx: 0, res: new Map(), muted: false, octOk: true, started: false, live: null, lastHud: '' };
const prOn = () => PR.on;
function prTargets(tr) {
  // 声部1の、いちばん上の音（和音は、どれか1つ合えばよい）
  const by = new Map();
  for (const n of tr.notes) { if (n.v === 2 || n.s >= totalTicks()) continue; if (!by.has(n.s)) by.set(n.s, []); by.get(n.s).push(n); }
  return [...by].sort((a, b) => a[0] - b[0]).map(([s, g]) => ({ s, e: s + Math.max(...g.map((n) => n.l)), ps: g.map((n) => n.p), notes: g, tot: 0, hit: 0, done: false }));
}
function prCb(kind, m, r) {
  if (kind !== 'frame' || !PR.on) return;
  if (!player.on) { if (PR.started) prFinish(); return; }
  PR.started = true;
  // マイクの音は少しおくれて届くので、0.08秒前の位置で見る
  const pt = playheadPlay();
  if (pt == null) return;
  const { spt } = timeTable();
  const pb = playBarOf(pt);
  const t = srcTick(Math.max(0, pt - 0.08 / (spt[pb] || 0.01)));
  const T = PR.targets;
  // おわった音を採点
  while (PR.idx < T.length && T[PR.idx].e <= t) { prJudge(T[PR.idx]); PR.idx++; }
  // 前にもどったとき（くり返し・ループ）
  if (PR.idx > 0 && T[PR.idx - 1] && T[PR.idx - 1].s > t + 4) {
    PR.idx = 0;
    while (PR.idx < T.length && T[PR.idx].e <= t) PR.idx++;
  }
  const g = T[PR.idx];
  let live = '';
  if (g && g.s <= t) {
    const span = g.e - g.s;
    // 音のはじめとおわりは、ずれやすいので数えない
    if (t >= g.s + span * 0.15 && t <= g.e - span * 0.08) {
      g.tot++;
      if (m != null && g.ps.some((p) => { const dd = m - p; return Math.abs(dd) < 0.6 || (PR.octOk && Math.abs(dd - Math.round(dd / 12) * 12) < 0.6); })) g.hit++;
    }
    live = `ねらい ${noteJa(Math.max(...g.ps))}`;
  }
  const now = m == null ? '…' : noteJa(Math.round(m));
  const hud = live + '|' + now;
  if (hud !== PR.lastHud) {
    PR.lastHud = hud;
    const h = $('#micHud');
    if (h) { h.querySelector('.mnote').textContent = now; h.querySelector('.mgoal').textContent = live; }
  }
}
function prJudge(g) {
  if (g.done) return;
  g.done = true;
  if (g.tot < 2) return; // 短すぎて聞けなかった音は数えない
  const ok = g.hit / g.tot >= 0.4;
  for (const n of g.notes) PR.res.set(n, ok ? 'ok' : 'ng');
  prMarkScore(g.notes, ok ? 'ok' : 'ng');
  if (ui.view !== 'score') draw();
}
function prPartIndex(tr) { return typeof scoreParts !== 'undefined' && scoreParts ? scoreParts.indexOf(tr) : -1; }
function prMarkScore(notes, cls) {
  if (ui.view !== 'score') return;
  const pi = prPartIndex(PR.tr);
  if (pi < 0) return;
  const box = $('#scoreEditView');
  for (const n of notes) box.querySelectorAll(`.nh[data-pi="${pi}"][data-s="${n.s}"][data-p="${n.p}"]`).forEach((el) => { el.classList.remove('pk-ok', 'pk-ng'); el.classList.add('pk-' + cls); });
}
// 楽譜を書きなおしたあと：練習の色・版の見くらべの色をつけなおす
function proAfterScore(box) {
  if (PR.res.size && PR.tr) {
    const pi = prPartIndex(PR.tr);
    if (pi >= 0) {
      const want = new Map();
      for (const [n, c] of PR.res) want.set(n.s + ':' + n.p, c);
      box.querySelectorAll(`.nh[data-pi="${pi}"]`).forEach((el) => { const c = want.get(el.dataset.s + ':' + el.dataset.p); if (c) el.classList.add('pk-' + c); });
    }
  }
  if (refSong && refSong._ver) {
    const tr = track();
    const i = song.tracks.indexOf(tr);
    const rt = refTrackFor(i);
    const pi = scoreParts ? scoreParts.indexOf(tr) : -1;
    if (rt && pi >= 0) {
      const old = new Set(rt.notes.map((n) => n.s + ':' + n.p));
      box.querySelectorAll(`.nh[data-pi="${pi}"]`).forEach((el) => { if (!old.has(el.dataset.s + ':' + el.dataset.p)) el.classList.add('vd-add'); });
    }
  }
}
// マス目の画面：採点した音にふちどり
function practiceMarks(g2, tr, X, rowIndex, rh, sy, k) {
  if (!PR.res.size || tr !== PR.tr) return;
  g2.save();
  g2.lineWidth = 2.5;
  for (const [n, c] of PR.res) {
    const ri = rowIndex.get(n.p);
    if (ri == null) continue;
    g2.strokeStyle = c === 'ok' ? '#2f9e44' : '#e03131';
    roundRect(g2, X(n.s) + 1, RH + ri * rh - sy + 1, Math.max(4, n.l * k - 2), rh - 2, 5);
    g2.stroke();
  }
  g2.restore();
}
function prClear() { PR.res.clear(); document.querySelectorAll('#scoreEditView .pk-ok, #scoreEditView .pk-ng').forEach((el) => el.classList.remove('pk-ok', 'pk-ng')); }
async function prStart() {
  if (PR.on) { prFinish(true); return; }
  const tr = track();
  if (!tr || tr.type !== 'melody' || !tr.notes.length) return toast('練習するメロディのトラックをえらんでね（音が入っているもの）');
  if (singOn) singToggle(false);
  closePops();
  const opt = await prAsk(tr);
  if (!opt) return;
  if (!(await micStart(prCb))) return;
  prClear();
  PR.on = true;
  PR.tr = tr;
  PR.octOk = opt.octOk;
  PR.targets = prTargets(tr);
  PR.idx = 0;
  PR.started = false;
  PR.lastHud = '';
  PR.muted = false;
  if (opt.mute && !tr.mute) { tr.mute = true; PR.muted = true; }
  micHud(true, `<b>🎤 弾いて練習</b><span class="mgoal"></span><span class="mnote">…</span><button class="mini" id="prEnd">おわる</button><small class="muted mhint">合った音は緑、ちがう音は赤になります</small>`);
  $('#prEnd').onclick = () => prFinish(true);
  renderMicButtons();
  if (player.on) stop();
  const keep = ui.countIn;
  if (!ui.countIn) ui.countIn = 1; // かならずカウントしてから
  play();
  ui.countIn = keep;
}
function prAsk(tr) {
  return new Promise((res) => {
    let dlg = $('#dlgPr');
    if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'dlgPr'; dlg.className = 'dlg small'; document.body.appendChild(dlg); }
    dlg.innerHTML = `<h3>弾いて練習（採点）</h3>
      <p class="muted small">「${escapeHtml(tr.name)}」の楽譜を見ながら、再生にあわせて楽器を弾いたり歌ったりします。マイクで聞いて、合った音は緑、ちがう音は赤にします。おわると、何％合ったかが出ます。</p>
      <label class="small"><input type="checkbox" id="prMute" checked> このパートの音は鳴らさない（自分で弾く）</label>
      <label class="small"><input type="checkbox" id="prOct" checked> オクターブちがいも合っていることにする（歌のとき）</label>
      <p class="muted small">ヘッドホンを使うと、スピーカーの音をまちがえて聞きとりません。ゆっくり練習（練習 → 速さ）とも組み合わせられます。</p>
      <div class="btnrow" style="margin-top:10px"><span class="grow"></span><button class="mini" id="prNo">やめる</button><button class="mini accent" id="prGo">はじめる</button></div>`;
    let done = false;
    const fin = (v) => { if (done) return; done = true; dlg.close(); res(v); };
    dlg.querySelector('#prNo').onclick = () => fin(null);
    dlg.querySelector('#prGo').onclick = () => fin({ mute: dlg.querySelector('#prMute').checked, octOk: dlg.querySelector('#prOct').checked });
    dlg.onclose = () => fin(null);
    dlg.showModal();
  });
}
function prFinish(user) {
  if (!PR.on) return;
  PR.on = false;
  if (user && player.on) stop();
  // 最後まで聞けた音も採点
  for (const g of PR.targets) if (!g.done && g.tot >= 2) prJudge(g);
  if (PR.muted && PR.tr) PR.tr.mute = false;
  PR.muted = false;
  micStop();
  micHud(false);
  renderMicButtons();
  if (typeof renderTracks === 'function') renderTracks();
  let ok = 0;
  let ng = 0;
  const bad = new Set();
  for (const [n, c] of PR.res) { if (c === 'ok') ok++; else { ng++; bad.add(barOf(n.s)); } }
  if (!ok && !ng) { toast('音が聞こえませんでした。マイクを近づけて、もう一度やってみてね'); return; }
  const pct = Math.round((ok / (ok + ng)) * 100);
  let dlg = $('#dlgPrRes');
  if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'dlgPrRes'; dlg.className = 'dlg small'; document.body.appendChild(dlg); }
  const badL = [...bad].sort((a, z) => a - z);
  dlg.innerHTML = `<h3>練習のけっか</h3>
    <p class="prpct"><b>${pct}%</b> 合っていました（${ok + ng}音のうち ${ok}音）</p>
    ${badL.length ? `<p>ちがった音がある小節：${barsText(badL)}</p>` : '<p>ぜんぶ合っていました！</p>'}
    <p class="muted small">楽譜とマス目に、合った音（緑）とちがう音（赤）の色がのこっています。</p>
    <div class="btnrow" style="margin-top:10px">${badL.length ? '<button class="mini" id="prLoop">ちがった所だけくり返す</button>' : ''}<button class="mini" id="prClr">色を消す</button><span class="grow"></span><button class="mini" id="prAgain">もう一度</button><button class="mini accent" id="prOk">とじる</button></div>`;
  dlg.querySelector('#prOk').onclick = () => dlg.close();
  dlg.querySelector('#prClr').onclick = () => { prClear(); dlg.close(); draw(); };
  dlg.querySelector('#prAgain').onclick = () => { dlg.close(); prStart(); };
  if (dlg.querySelector('#prLoop')) dlg.querySelector('#prLoop').onclick = () => {
    dlg.close();
    ui.loopRange = [badL[0], Math.min(song.bars, badL[badL.length - 1] + 1)];
    ui.loopOn = true;
    const lb = $('#btnLoop');
    if (lb) lb.classList.add('on');
    ui.startTick = barStart(badL[0]);
    if (ui.view === 'score') ui.sc.cursor = barStart(badL[0]);
    draw();
    toast(`${barsText([badL[0]])}〜${barsText([badL[badL.length - 1]])}小節をくり返します。「弾いて練習」でもう一度どうぞ`, 4000);
  };
  dlg.showModal();
  if (pct >= 90 && typeof cheer === 'function') setTimeout(cheer, 200);
}

/* ---------- 画面のボタン ---------- */
function pro2Cmds() {
  return [
    ['版の保存と見くらべ', 'version history ばーじょん りれき 履歴 スナップショット 保存', () => verOpen()],
    ['いまの曲を版としてのこす', 'save version ばん のこす', () => verSave(`版 ${verDate(Date.now())}`, false).then((ok) => ok && toast('版をのこしました'))],
    ['アイデア帳', 'ideas idea アイデア フレーズ リズム ライブラリ', () => ideasOpen()],
    ['えらんだ音をアイデア帳にしまう', 'capture idea しまう', () => ideaCapture()],
    ['演奏の表情（人が弾いたように）', 'espressivo humanize 表情 ゆれ 自然 ひょうじょう', () => feelSet(((song.feel || 0) + 1) % 3)],
    ['ピアノ譜にまとめる', 'reduction piano reduce リダクション ピアノ まとめる', () => reduceOpen()],
    ['パートの設定（名前・移調・音域）', 'part name transpose range パート 名前 移調 音域 いちょう おんいき', () => partDlg(track().id)],
    ['歌って入力（マイク）', 'sing mic microphone うた うたう マイク 鼻歌', () => singToggle()],
    ['弾いて練習（採点）', 'practice score mic れんしゅう さいてん マイク', () => prStart()],
  ].map(([n, k, run]) => ({ n, k, run }));
}
function pro2Menu() {
  const on = (id, fn) => { const b = document.getElementById(id); if (b) b.onclick = () => { if (typeof closePops === 'function') closePops(); fn(); }; };
  on('btnVersions', verOpen);
  on('btnIdeas', ideasOpen);
  on('btnReduce', reduceOpen);
  on('btnSing', () => singToggle());
  on('btnPractice2', prStart);
  // 練習のポップアップ：表情と、弾いて練習
  const body = document.querySelector('#popPractice .popbody');
  if (body && !$('#feelSeg')) {
    body.insertAdjacentHTML('beforeend', `<div class="sub">演奏の表情 <small class="muted">（人が弾いたように）</small></div>
      <div class="seg" id="feelSeg"><button class="mini" data-f="0" title="楽譜のとおり、きっちり">なし</button><button class="mini" data-f="1" title="フレーズの山へ向かって少し強く・おわりで少しゆっくり">ほんのり</button><button class="mini" data-f="2" title="強弱とゆれを大きく">たっぷり</button></div>
      <div class="btnrow" style="margin-top:8px"><button class="mini" id="btnPrStart">🎤 弾いて練習（採点）</button></div>`);
    body.querySelectorAll('#feelSeg [data-f]').forEach((b) => (b.onclick = () => feelSet(+b.dataset.f)));
    $('#btnPrStart').onclick = () => prStart();
  }
  const pp = $('#popPractice');
  if (pp) pp.addEventListener('toggle', feelUi);
  feelUi();
}
pro2Menu();

/* ---------- パートの設定（楽譜のパート名をダブルクリック） ----------
   名前・短い名前（2段目から）・音部記号・移調（in B♭ など）・音域（出せない音を赤、むずかしい音をオレンジに） */
const PART_TRANS = [
  ['auto', '自動（楽器にあわせる）'], ['0', 'なし（C・実音）'], ['2', 'in B♭（クラリネット・トランペット）'], ['3', 'in A（クラリネット・トランペット）'],
  ['7', 'in F（ホルン・イングリッシュホルン）'], ['9', 'in E♭（アルトサックス）'], ['5', 'in G（アルトフルート）'], ['14', 'in B♭・1オクターブ下（テナーサックス・バスクラリネット）'],
  ['21', 'in E♭・1オクターブ下（バリトンサックス）'], ['12', '1オクターブ下で鳴る（コントラバス・ギター）'], ['-12', '1オクターブ上で鳴る（ピッコロ・グロッケン）'],
];
const PART_CLEF = [['auto', '自動'], ['treble', 'ト音記号'], ['treble8', 'ト音記号（8つ下・テノール）'], ['alto', 'ハ音記号（アルト・ビオラ）'], ['bass', 'ヘ音記号'], ['grand', '大譜表（ピアノ）']];
const midiLabel = (m) => `${['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'][m % 12]}${Math.floor(m / 12) - 1}（${noteJa(m)}）`;
function partDlg(id) {
  const t = song.tracks.find((x) => String(x.id) === String(id));
  if (!t) return;
  const S = scoreSettings();
  if (!S.trans) S.trans = {};
  if (!S.clefs) S.clefs = {};
  const mel = t.type === 'melody';
  let dlg = $('#dlgPart');
  if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'dlgPart'; dlg.className = 'dlg small'; document.body.appendChild(dlg); }
  const instR = INST_RANGE[t.inst] || null;
  const cur = Array.isArray(t.rng) ? t.rng : instR || [48, 84, 52, 79];
  const rMode = t.rng === 0 ? 'off' : Array.isArray(t.rng) ? 'own' : 'auto';
  const nOpts = (v) => Array.from({ length: 88 }, (_, i) => 21 + i).reverse().map((m) => `<option value="${m}" ${m === v ? 'selected' : ''}>${midiLabel(m)}</option>`).join('');
  const now = mel && typeof partClefTrans === 'function' ? partClefTrans(t).trans : 0;
  const nowTxt = (PART_TRANS.find(([v]) => +v === now && v !== 'auto') || [0, now ? `${now > 0 ? '+' : ''}${now}半音` : 'なし（実音）'])[1].replace(/（.*$/, '');
  dlg.innerHTML = `<h3>パートの設定</h3>
    <label class="col small">名前 <input id="ptName" maxlength="20" value="${escapeHtml(t.name)}"></label>
    <label class="col small">短い名前（2段目からの左に書く。空なら自動） <input id="ptShort" maxlength="12" value="${escapeHtml(t.short || '')}" placeholder="れい：Vln. 1"></label>
    ${mel ? `<label class="col small">音部記号 <select id="ptClef">${PART_CLEF.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
    <label class="col small">移調楽器（楽譜に書く高さ）<small class="muted">いまの書き方：${escapeHtml(nowTxt)}</small> <select id="ptTrans">${PART_TRANS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
    <label class="col small">音域の色分け（楽譜で編集するときだけ）<select id="ptRng">
      <option value="auto">自動（オーケストラの書き方のとき、楽器の音域）</option>
      ${instR ? '<option value="inst">楽器の音域でいつも出す</option>' : ''}
      <option value="own">自分で決める</option><option value="off">出さない</option></select></label>
    <div id="ptOwn" class="small" style="display:grid;grid-template-columns:auto 1fr 1fr;gap:4px 8px;align-items:center">
      <span></span><b>下</b><b>上</b>
      <span>出せる音<br><small class="muted">外は赤</small></span><select id="ptP0">${nOpts(cur[0])}</select><select id="ptP1">${nOpts(cur[1])}</select>
      <span>ふつうの音<br><small class="muted">外はオレンジ</small></span><select id="ptE0">${nOpts(cur[2])}</select><select id="ptE1">${nOpts(cur[3])}</select>
    </div>
    <p class="muted small">音域は、実際に鳴る音の高さです。</p>` : ''}
    <div class="btnrow" style="margin-top:12px"><span class="grow"></span><button class="mini" id="ptNo">やめる</button><button class="mini accent" id="ptOk">決める</button></div>`;
  const q = (s) => dlg.querySelector(s);
  if (mel) {
    q('#ptClef').value = S.clefs[t.id] || 'auto';
    q('#ptTrans').value = S.trans[t.id] == null ? 'auto' : String(S.trans[t.id]);
    if (!q('#ptTrans').value) q('#ptTrans').value = 'auto';
    q('#ptRng').value = rMode;
    const showOwn = () => { q('#ptOwn').hidden = q('#ptRng').value !== 'own'; };
    q('#ptRng').onchange = showOwn;
    showOwn();
  }
  q('#ptNo').onclick = () => dlg.close();
  q('#ptOk').onclick = () => {
    const name = q('#ptName').value.trim().slice(0, 20);
    if (!name) return toast('名前を入れてください');
    const short = q('#ptShort').value.trim().slice(0, 12);
    let rng;
    if (mel) {
      const m = q('#ptRng').value;
      if (m === 'off') rng = 0;
      else if (m === 'inst' && instR) rng = instR.slice();
      else if (m === 'own') {
        const p = [+q('#ptP0').value, +q('#ptP1').value].sort((a, c) => a - c);
        const e2 = [+q('#ptE0').value, +q('#ptE1').value].sort((a, c) => a - c);
        rng = [p[0], p[1], Math.max(p[0], e2[0]), Math.min(p[1], e2[1])];
        if (rng[2] > rng[3]) { rng[2] = p[0]; rng[3] = p[1]; }
      }
    }
    dlg.close();
    edit(() => {
      if (name !== t.name) { t.name = name; t.cname = true; }
      if (short) t.short = short; else delete t.short;
      if (mel) {
        const cv = q('#ptClef').value;
        if (cv === 'auto') delete S.clefs[t.id]; else S.clefs[t.id] = cv;
        const tv = q('#ptTrans').value;
        if (tv === 'auto') delete S.trans[t.id]; else S.trans[t.id] = +tv;
        if (rng === undefined) delete t.rng; else t.rng = rng;
      }
    }, 'パートの設定');
    renderTracks();
    if (ui.view === 'score') renderScoreEdit();
    if ($('#dlgScore') && $('#dlgScore').open) openScore();
    toast('パートの設定を変えました');
  };
  dlg.showModal();
  q('#ptName').focus();
}
// 楽譜（編集の画面・楽譜の画面）のパート名をダブルクリック → パートの設定
document.addEventListener('dblclick', (e) => {
  const el = e.target && e.target.closest ? e.target.closest('.pname[data-id]') : null;
  if (!el) return;
  e.preventDefault();
  e.stopPropagation();
  partDlg(el.dataset.id);
}, true);
