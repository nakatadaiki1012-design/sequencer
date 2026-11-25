/* ============================================================
   いろいろな楽譜ソフトの「いいところ」
   ・文字で打つと記号（Dorico のポップオーバー）：Ctrl+E
   ・機能を名前でさがす（Dorico のジャンプバー・Sibelius の検索）：Ctrl+/
   ・テンキーで入力（Finale・Sibelius のキーパッド）
   ・鍵盤・指板のパネル（Flat）：鳴っている音・えらんだ音が光る。おすと音が入る（カトカトーン）
   ・ギターのコード図（Flat）
   ・自動で編曲（Sibelius のアレンジ）
   ・楽譜にコメント（Flat）
   app.js の関数・変数（song・ui・track()・edit() など）をそのまま使います
   ============================================================ */

/* ---------- 文字で打つと記号（ポップオーバー） ---------- */
const POP_DYN = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sf', 'sfz', 'fp'];
const KEY_NAMES = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const KEY_JA = { ハ: 0, 嬰ハ: 1, 変ニ: 1, ニ: 2, 嬰ニ: 3, 変ホ: 3, ホ: 4, ヘ: 5, 嬰ヘ: 6, 変ト: 6, ト: 7, 嬰ト: 8, 変イ: 8, イ: 9, 嬰イ: 10, 変ロ: 10, ロ: 11 };
// 打った文字 → { label: 何が入るか, run: 入れる }。わからないときは「ことば」として音の上に書く
function popParse(raw) {
  const s = String(raw || '').trim().replace(/♯/g, '#').replace(/♭/g, 'b').replace(/＝/g, '=').replace(/／/g, '/');
  if (!s) return null;
  const low = s.toLowerCase();
  if (POP_DYN.includes(low)) return { kind: '強弱', label: `強弱記号 ${low}`, run: () => scDynamic(low) };
  if (/^(<|cresc\.?|crescendo|クレッシェンド)$/i.test(s)) return { kind: '強弱', label: 'クレッシェンド（だんだん強く）', run: () => scHairpin('cresc') };
  if (/^(>|dim\.?|decresc\.?|diminuendo|decrescendo|デクレッシェンド|ディミヌエンド)$/i.test(s)) return { kind: '強弱', label: 'デクレッシェンド（だんだん弱く）', run: () => scHairpin('dim') };
  // 強弱＋クレッシェンド（Dorico と同じ：mf< ）
  let m = /^(ppp|pp|p|mp|mf|f|ff|fff)\s*([<>])$/i.exec(s);
  if (m) { const v = m[1].toLowerCase(); const h = m[2] === '<' ? 'cresc' : 'dim'; return { kind: '強弱', label: `${v} から${h === 'cresc' ? 'だんだん強く' : 'だんだん弱く'}`, run: () => { scDynamic(v); scHairpin(h); } }; }
  // テンポ：♩=120、q=120、=120、tempo 120
  m = /^(?:♩|q|t|tempo|テンポ)?\s*=?\s*(\d{2,3})$/i.exec(s);
  if (m && (+m[1] >= 30 && +m[1] <= 240) && (/[=♩qt]|tempo|テンポ/i.test(s))) { const v = +m[1]; return { kind: 'テンポ', label: `テンポ ♩=${v}（この小節から）`, run: () => popTempo(v) }; }
  // 拍子：3/4、6/8
  m = /^(\d{1,2})\s*\/\s*(\d{1,2})$/.exec(s);
  if (m && [2, 4, 8].includes(+m[2]) && +m[1] >= 1 && +m[1] <= 12) { const nm = [+m[1], +m[2]]; return { kind: '拍子', label: `${nm.join('/')} 拍子（この小節から）`, run: () => popMeter(nm) }; }
  // 調：「key G」「key Em」「ト長調」「イ短調」
  m = /^(?:key|調)\s*([A-G](?:#|b)?)\s*(m|min|minor)?$/i.exec(s);
  if (m) { const k = KEY_NAMES[m[1][0].toUpperCase() + m[1].slice(1)]; const mi = !!m[2]; if (k != null) return { kind: '調', label: `${keyLabel(k, mi)}（この小節から）`, run: () => popKey(k, mi) }; }
  m = /^(嬰|変)?(ハ|ニ|ホ|ヘ|ト|イ|ロ)(長調|短調)$/.exec(s);
  if (m) { const k = KEY_JA[(m[1] || '') + m[2]]; if (k != null) { const mi = m[3] === '短調'; return { kind: '調', label: `${keyLabel(k, mi)}（この小節から）`, run: () => popKey(k, mi) }; } }
  // 練習番号：[A]、[B]
  m = /^\[(.{1,8})\]$/.exec(s);
  if (m) return { kind: '練習番号', label: `練習番号「${m[1]}」`, run: () => popRehearsal(m[1]) };
  // コードネーム（大文字で始まるときだけ。小文字の f・p は強弱）
  if (/^[A-G]/.test(s)) { const c = parseChord(s); if (c) return { kind: 'コード', label: `コードネーム ${chordName(c)}`, run: () => popChord(c) }; }
  // くり返し・はじめ・おわり
  if (/^(:\|\||:\||くり返しおわり)$/.test(s)) return { kind: 'くり返し', label: 'くり返し記号（おわり）', run: () => scBarMark('end') };
  if (/^(\|\|:|\|:|くり返しはじめ)$/.test(s)) return { kind: 'くり返し', label: 'くり返し記号（はじめ）', run: () => scBarMark('start') };
  // それ以外は、音の上に書くことば
  return { kind: 'ことば', label: `ことば「${s.slice(0, 40)}」を音の上に`, run: () => popText(s.slice(0, 80)) };
}
const popBar = () => barOf(Math.min(popTick(), totalTicks() - 1));
function popTick() { const tr = track(); const r = tr && tr.type === 'melody' ? selRange(tr) : null; return r ? r.s : ui.sc.cursor || 0; }
function popTempo(v) {
  if (song.locks.rules) return toast('ルールの変更はロックされています');
  const b = popBar();
  edit(() => { if (b === 0) { song.bpm = v; delete song.tempos[0]; } else song.tempos[b] = v; }, 'テンポ');
  renderSettings();
}
function popMeter(nm) {
  if (song.locks.rules) return toast('ルールの変更はロックされています');
  const b = popBar();
  edit(() => { song.meters = song.meters || {}; if (b === 0) { song.meter = nm; delete song.meters[0]; } else if (String(nm) !== String(meterAt(b - 1))) song.meters[b] = nm; else delete song.meters[b]; }, '拍子');
  renderSettings();
}
function popKey(k, minor) {
  if (song.locks.rules) return toast('ルールの変更はロックされています');
  const b = popBar();
  if (b === 0) { changeKey(k, minor, false); return; }
  edit(() => { song.keys = song.keys || {}; const prev = keyAt(b - 1); if (!(prev.key === k && !!prev.minor === minor)) song.keys[b] = { key: k, minor }; else delete song.keys[b]; }, '調');
  renderSettings();
}
function popRehearsal(txt) {
  const b = popBar();
  edit(() => { song.rehearsal = song.rehearsal || {}; song.rehearsal[b] = txt; }, '練習番号');
  renderScoreEdit();
}
function popChord(c) {
  let ct = chordTrackOf();
  if (ct && locked(ct)) return toast('コード伴奏のトラックはロックされています');
  const t = popTick();
  const b = barOf(Math.min(t, totalTicks() - 1));
  const o = Math.floor((t - barStart(b)) / beatAt(b)) * beatAt(b);
  edit(() => {
    if (!ct) { if (song.tracks.length >= MAX_TRACKS) return; ct = newTrack('chord'); song.tracks.push(ct); }
    if (!chordSetAt(ct, b, o, c, false)) chordSetAt(ct, b, 0, c, false);
  }, 'コードネーム');
  renderTracks();
  renderScoreEdit();
}
function popText(x) {
  const tr = scEditable();
  if (!tr || tr.type !== 'melody') return toast('メロディのトラックをえらんでください');
  const t = popTick();
  edit(() => { tr.texts = (tr.texts || []).filter((q) => q.t !== t); tr.texts.push({ t, x }); tr.texts.sort((a, z) => a.t - z.t); }, '譜表テキスト');
  renderScoreEdit();
}
const POP_EX = ['mf', 'p<', 'cresc', 'Am7', '♩=120', '3/4', 'key G', '[A]', 'dolce', 'pizz.'];
function popoverOpen() {
  if (ui.view !== 'score') { setView('score'); }
  let box = $('#popIn');
  if (!box) {
    box = document.createElement('div');
    box.id = 'popIn';
    box.className = 'popin';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', '文字で記号を入れる');
    box.innerHTML = `<div class="pihead"><b>文字で入れる</b><span class="muted small">打って Enter（Esc でやめる）</span></div>
      <input type="text" id="popInTxt" autocomplete="off" spellcheck="false" placeholder="mf・cresc・Am7・♩=120・3/4・key G・[A]・dolce …" aria-label="記号を打つ">
      <div class="pihint" id="popInHint" aria-live="polite"></div>
      <div class="piex">${POP_EX.map((x) => `<button class="mini" data-x="${escapeHtml(x)}">${escapeHtml(x)}</button>`).join('')}</div>`;
    document.body.appendChild(box);
    const inp = box.querySelector('input');
    const hint = () => { const r = popParse(inp.value); box.querySelector('#popInHint').innerHTML = r ? `<span class="pik">${r.kind}</span> ${escapeHtml(r.label)}` : '<span class="muted">れい：mf（強弱）、p&lt;（p からだんだん強く）、Am7（コード）、♩=96（テンポ）、6/8（拍子）、key F（調）、[B]（練習番号）。ほかの文字は、音の上に書きます</span>'; };
    inp.addEventListener('input', hint);
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); popoverClose(); }
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); const r = popParse(inp.value); popoverClose(); if (r) { r.run(); toast('入れました：' + r.label); } }
    });
    box.querySelectorAll('[data-x]').forEach((b) => (b.onclick = () => { inp.value = b.dataset.x; hint(); inp.focus(); }));
    box._hint = hint;
    document.addEventListener('pointerdown', (e) => { if (!box.hidden && !box.contains(e.target)) popoverClose(); }, true);
  }
  box.hidden = false;
  const inp = box.querySelector('input');
  inp.value = '';
  box._hint();
  // カーソル（えらんだ音）の近くに出す
  const c = $('#scoreEditView rect.cursor') || $('#scoreEditView .nh.sel');
  const q = c ? c.getBoundingClientRect() : { left: innerWidth / 2 - 150, bottom: 160 };
  box.style.left = clamp(q.left - 20, 6, innerWidth - box.offsetWidth - 6) + 'px';
  box.style.top = clamp(q.bottom + 8, 6, innerHeight - box.offsetHeight - 6) + 'px';
  setTimeout(() => inp.focus(), 0);
}
function popoverClose() { const b = $('#popIn'); if (b) b.hidden = true; }

/* ---------- 機能を名前でさがす（コマンド検索） ---------- */
const clickId = (id) => () => { const el = document.getElementById(id); if (el) el.click(); };
const inScore = (fn) => () => { if (ui.view !== 'score') setView('score'); fn(); };
function cmdList() {
  const L = [
    ['再生・一時停止', 'play さいせい スタート', clickId('btnPlay')],
    ['停止', 'stop ていし とめる', clickId('btnStop')],
    ['録音', 'record ろくおん レコーディング', clickId('btnRec')],
    ['ループ再生', 'loop くりかえし', clickId('btnLoop')],
    ['メトロノーム', 'metronome クリック', clickId('btnMetro')],
    ['元に戻す', 'undo もどす', () => undo()],
    ['やり直す', 'redo', () => redo()],
    ['楽譜の画面', 'score がくふ 五線', () => setView('score')],
    ['マス目（ピアノロール）の画面', 'grid piano roll ピアノロール オトグラフ', () => setView('grid')],
    ['文字で記号を入れる', 'popover ポップオーバー 強弱 テンポ 拍子 調 コード テキスト', () => popoverOpen()],
    ['スラー', 'slur なめらか', inScore(() => scSlur())],
    ['タイ', 'tie つなぐ', inScore(() => scTie())],
    ['スタッカート', 'staccato 短く', inScore(() => scArt('stac'))],
    ['アクセント', 'accent 強く', inScore(() => scArt('acc'))],
    ['テヌート', 'tenuto', inScore(() => scArt('ten'))],
    ['フェルマータ', 'fermata のばす', inScore(() => scArt('ferm'))],
    ['3連符', 'triplet tuplet さんれんぷ', inScore(() => scTuplet())],
    ['声部をかえる', 'voice せいぶ', inScore(() => scToggleVoice())],
    ['歌詞', 'lyrics かし うた', inScore(() => scLyric())],
    ['コードネーム', 'chord コード', inScore(() => scChord())],
    ['クレッシェンド', 'cresc だんだん強く', inScore(() => scHairpin('cresc'))],
    ['デクレッシェンド', 'dim decresc だんだん弱く', inScore(() => scHairpin('dim'))],
    ['8va（オクターブ上）', 'ottava オクターブ', inScore(() => scOttava(1))],
    ['ペダル', 'pedal', inScore(() => scPedal())],
    ['ことば（譜表テキスト）', 'text テキスト 文字', inScore(() => scStaffText())],
    ['楽器の持ちかえ', 'instrument change もちかえ', inScore(() => scInstChange())],
    ['練習番号', 'rehearsal mark リハーサル', inScore(() => scRehearsal())],
    ['くり返し記号（はじめ）', 'repeat start', inScore(() => scBarMark('start'))],
    ['くり返し記号（おわり）', 'repeat end', inScore(() => scBarMark('end'))],
    ['記号パレット', 'palette パレット 装飾 トリル', inScore(() => scPalette())],
    ['段組み', 'layout だんぐみ 改行 小節数', inScore(() => scLayoutPop($('#scLayoutB')))],
    ['テンポ・拍子・調（この小節から）', 'tempo meter key テンポ 拍子 調 ルール', () => openBarDialog(barOf(Math.min(ui.view === 'score' ? ui.sc.cursor || 0 : ui.startTick || 0, totalTicks() - 1)))],
    ['小節を入れる', 'insert bars 小節', clickId('btnIns')],
    ['小節を詰める（消す）', 'delete bars 小節', clickId('btnDelBars')],
    ['4小節ふやす', 'add bars 小節', clickId('btnAddFour')],
    ['メロディのトラックを足す', 'add track melody トラック', clickId('addMelody')],
    ['コード伴奏を足す', 'add chord track トラック', clickId('addChord')],
    ['リズム（打楽器）を足す', 'add drum track ドラム', clickId('addDrum')],
    ['楽譜の印刷・PDF', 'print pdf いんさつ', clickId('btnScore')],
    ['パート譜', 'parts パート', clickId('btnScore')],
    ['MuseScore に書き出す', 'musescore mscz export かきだし', () => exportMscz()],
    ['MusicXML に書き出す', 'musicxml xml finale sibelius dorico export', () => exportMusicXML()],
    ['MIDI に書き出す', 'midi export', clickId('btnMidi')],
    ['MP3 に書き出す', 'mp3 audio おと 音声', clickId('btnMp3')],
    ['このブラウザに保存', 'save ほぞん', () => saveToBrowser()],
    ['ファイルを開く', 'open import ひらく', clickId('btnImportJson')],
    ['新しい曲', 'new あたらしい', clickId('btnNew')],
    ['ミキサー', 'mixer 音量 イコライザー', clickId('btnPal')],
    ['送る（リンク）', 'share おくる', clickId('btnShare')],
    ['鍵盤・指板のパネル', 'keyboard fretboard けんばん 指板 ピアノ ギター', () => instPanelToggle()],
    ['テンキーで入力', 'keypad numpad テンキー', () => keypadToggle()],
    ['ギターのコード図', 'chord diagram コードダイアグラム ギター', () => chordDiagramToggle()],
    ['自動で編曲', 'arrange へんきょく アレンジ オーケストラ', () => arrangeOpen()],
    ['コメントを書く', 'comment メモ ふせん', () => commentAdd()],
    ['コメントの一覧', 'comments list メモ', () => commentList()],
    ['TAB譜', 'tab tablature ギター', () => { const t = track(); if (t && TAB_INST[t.inst]) setTabMode(t, (scoreSettings().tab || {})[t.id] ? '' : 'both'); else toast('ギター・ウクレレ・ベースのトラックをえらんでください'); }],
    ['発表モード', 'present 全画面', clickId('btnPresent')],
    ['着せかえ（色）', 'theme テーマ ダーク', clickId('btnTheme')],
    ['ショートカット一覧', 'keys shortcut キー', () => openKeys()],
    ['使い方', 'help ヘルプ', clickId('btnHelp')],
  ];
  return L.map(([n, k, run]) => ({ n, k, run }));
}
// ひらがな・カタカナを同じにして、くらべる
const kanaFold = (s) => String(s).toLowerCase().replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)).replace(/\s+/g, '');
function cmdSearch(q) {
  const list = cmdList();
  const f = kanaFold(q);
  if (!f) return list;
  return list.map((c) => {
    const n = kanaFold(c.n);
    const hay = n + ' ' + kanaFold(c.k);
    const sc = n.startsWith(f) ? 3 : n.includes(f) ? 2 : hay.includes(f) ? 1 : 0;
    return { c, sc };
  }).filter((x) => x.sc).sort((a, b) => b.sc - a.sc).map((x) => x.c);
}
function cmdOpen() {
  let dlg = $('#dlgCmd');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.id = 'dlgCmd';
    dlg.className = 'dlg cmddlg';
    dlg.innerHTML = `<input type="search" id="cmdTxt" placeholder="やりたいことを打つ（れい：スラー、印刷、テンポ、移調…）" autocomplete="off" aria-label="機能をさがす"><ul id="cmdUl" role="listbox" aria-label="見つかった機能"></ul><p class="muted small">↑↓ でえらんで Enter。Ctrl+/ でいつでも出せます</p>`;
    document.body.appendChild(dlg);
    const inp = dlg.querySelector('input');
    const ul = dlg.querySelector('ul');
    let res = [];
    let at = 0;
    const draw = () => {
      res = cmdSearch(inp.value).slice(0, 12);
      at = clamp(at, 0, Math.max(0, res.length - 1));
      ul.innerHTML = res.map((c, i) => `<li role="option" data-i="${i}" class="${i === at ? 'on' : ''}" aria-selected="${i === at}">${escapeHtml(c.n)}</li>`).join('') || '<li class="muted">見つかりません。ほかのことばでさがしてください</li>';
      ul.querySelectorAll('[data-i]').forEach((li) => (li.onclick = () => go(+li.dataset.i)));
    };
    const go = (i) => { const c = res[i]; if (!c) return; dlg.close(); setTimeout(() => c.run(), 0); };
    inp.addEventListener('input', () => { at = 0; draw(); });
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); dlg.close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); at++; draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); at--; draw(); }
      else if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); go(at); }
    });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg._draw = draw;
  }
  const inp = dlg.querySelector('input');
  inp.value = '';
  dlg._draw();
  if (!dlg.open) dlg.showModal();
  inp.focus();
}

/* ---------- テンキーで入力（Sibelius・Finale のキーパッド） ----------
   7 ♮  8 ♯  9 ♭
   4 4分 5 2分 6 全音符
   1 32分 2 16分 3 8分
   0 休符  . 付点  Enter タイ   / スラー  * スタッカート  - アクセント  + 3連符 */
const KEYPAD = [
  ['NumpadDivide', '/', 'スラー', () => scSlur()], ['NumpadMultiply', '*', 'スタッカート', () => scArt('stac')], ['NumpadSubtract', '−', 'アクセント', () => scArt('acc')],
  ['Numpad7', '7', '♮', () => scAccidental('n')], ['Numpad8', '8', '♯', () => scAccidental('#')], ['Numpad9', '9', '♭', () => scAccidental('b')], ['NumpadAdd', '+', '3連符', () => scTuplet()],
  ['Numpad4', '4', '♩ 4分', () => kpDur(48)], ['Numpad5', '5', '𝅗𝅥 2分', () => kpDur(96)], ['Numpad6', '6', '𝅝 全音符', () => kpDur(192)],
  ['Numpad1', '1', '𝅘𝅥𝅰 32分', () => kpDur(6)], ['Numpad2', '2', '𝅘𝅥𝅯 16分', () => kpDur(12)], ['Numpad3', '3', '♪ 8分', () => kpDur(24)], ['NumpadEnter', 'Enter', 'タイ', () => scTie()],
  ['Numpad0', '0', '休符', () => scInsert([], false)], ['NumpadDecimal', '.', '付点', () => { ui.sc.dot = !ui.sc.dot; scApplyDurToSel(); renderScorePal(); }],
];
function kpDur(d) { ui.sc.dur = d; ui.sc.dot = false; ui.sc.trip = !!ui.sc.tup; scApplyDurToSel(); renderScorePal(); keypadRender(); }
let keypadOn = false;
try { keypadOn = localStorage.getItem('otsumiki-keypad') === '1'; } catch (e) { /* なし */ }
function keypadToggle(on) {
  keypadOn = on == null ? !keypadOn : !!on;
  try { localStorage.setItem('otsumiki-keypad', keypadOn ? '1' : '0'); } catch (e) { /* なし */ }
  if (keypadOn && ui.view !== 'score') setView('score');
  keypadRender();
  toast(keypadOn ? 'テンキー：数字のキーで長さ・♯♭・休符・タイ。音の高さは A〜G か、鍵盤パネルで' : 'テンキーのパネルをしまいました');
}
function keypadRender() {
  let box = $('#keypad');
  if (!keypadOn || ui.view !== 'score') { if (box) box.hidden = true; return; }
  if (!box) {
    box = document.createElement('div');
    box.id = 'keypad';
    box.className = 'keypad';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'テンキー');
    document.body.appendChild(box);
  }
  box.hidden = false;
  const cur = (code) => (code === 'NumpadDecimal' ? ui.sc.dot : { Numpad4: 48, Numpad5: 96, Numpad6: 192, Numpad1: 6, Numpad2: 12, Numpad3: 24 }[code] === ui.sc.dur);
  box.innerHTML = `<div class="kphead"><b>テンキー</b><button class="mini close" aria-label="とじる">✕</button></div><div class="kpgrid">${KEYPAD.map(([code, k, lab]) => `<button class="kpb ${cur(code) ? 'on' : ''}" data-c="${code}" style="grid-area:${code.replace('Numpad', 'k')}" title="${lab}（テンキーの ${k}）"><i>${k}</i><span>${lab}</span></button>`).join('')}</div>`;
  box.querySelector('.close').onclick = () => keypadToggle(false);
  box.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { const it = KEYPAD.find((x) => x[0] === b.dataset.c); if (it) { it[3](); keypadRender(); } }));
}
function keypadKey(e) {
  if (!keypadOn || ui.view !== 'score' || e.ctrlKey || e.metaKey || e.altKey) return false;
  const it = KEYPAD.find((x) => x[0] === e.code);
  if (!it) return false;
  e.preventDefault();
  it[3]();
  keypadRender();
  return true;
}

/* ---------- 鍵盤・指板のパネル（Flat）：鳴っている音・えらんだ音が光る。おすと音が入る（カトカトーン） ---------- */
let instPanelOn = false;
try { instPanelOn = localStorage.getItem('otsumiki-instpanel') === '1'; } catch (e) { /* なし */ }
const IP = { lo: 48, mode: 'auto', lit: '', chord: false };
function instPanelToggle(on) {
  instPanelOn = on == null ? !instPanelOn : !!on;
  try { localStorage.setItem('otsumiki-instpanel', instPanelOn ? '1' : '0'); } catch (e) { /* なし */ }
  instPanelRender();
}
const isFretMode = (tr) => IP.mode === 'fret' || (IP.mode === 'auto' && tr && TAB_INST[tr.inst]);
function instPanelRender() {
  let box = $('#instPanel');
  const host = $('.editor');
  if (!instPanelOn || !host) { if (box) box.hidden = true; document.body.classList.remove('ipon'); return; }
  if (!box) {
    box = document.createElement('div');
    box.id = 'instPanel';
    box.className = 'instpanel';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', '鍵盤・指板');
    host.appendChild(box);
  }
  document.body.classList.add('ipon');
  box.hidden = false;
  const tr = track();
  const fret = isFretMode(tr);
  const tun = fret ? (tabTunOf(tr) || TAB_TUN.guitar) : null;
  const durs = ui.view === 'score' ? SC_DURS.map(([v, name, ic]) => `<button class="mini ipdur ${ui.sc.dur === v ? 'on' : ''}" data-d="${v}" title="${name}">${ic}</button>`).join('') + `<button class="mini ipdur ${ui.sc.dot ? 'on' : ''}" data-dot="1" title="付点">.</button><button class="mini" data-rest="1" title="休符">𝄽</button>` : '';
  const head = `<div class="iphead"><span class="seg"><button class="mini ${!fret ? 'on' : ''}" data-m="kb">鍵盤</button><button class="mini ${fret ? 'on' : ''}" data-m="fret">指板</button></span>
    ${fret ? '' : `<button class="mini" data-oct="-12" title="1オクターブ下">◀ オクターブ</button><button class="mini" data-oct="12" title="1オクターブ上">オクターブ ▶</button>`}
    <span class="grp">${durs}</span>${ui.view === 'score' ? `<label class="small"><input type="checkbox" data-chord ${IP.chord ? 'checked' : ''}> 和音</label>` : ''}
    <span class="muted small iphint">${ui.view === 'score' && ui.sc.input ? 'おすと、カーソルの所に音が入ります' : 'おすと音が鳴ります（楽譜の「入力」でおすと、音が入ります）'}</span><span class="grow"></span><button class="mini close" aria-label="とじる">✕</button></div>`;
  let body;
  if (fret) {
    const N = 15;
    const n = tun.length;
    body = `<div class="fretb" style="--n:${n}">${[...Array(n)].map((_, r) => { const si = n - 1 - r; return `<div class="frow"><b>${noteName(tun[si])}</b>${[...Array(N + 1)].map((__, f) => `<button class="fr${f === 0 ? ' open' : ''}" data-p="${tun[si] + f}" data-si="${si}" data-f="${f}" title="${n - si}弦 ${f}フレット（${noteName(tun[si] + f, true)}）" aria-label="${n - si}弦 ${f}フレット">${f === 0 ? '' : ''}</button>`).join('')}</div>`; }).join('')}
      <div class="frow fnum"><b></b>${[...Array(N + 1)].map((_, f) => `<i>${[3, 5, 7, 9, 12, 15].includes(f) ? f : ''}</i>`).join('')}</div></div>`;
  } else {
    const lo = IP.lo;
    const keys = [];
    for (let p = lo; p < lo + 36; p++) keys.push(p);
    const whites = keys.filter((p) => ![1, 3, 6, 8, 10].includes(p % 12));
    body = `<div class="pkb" style="--w:${whites.length}">${whites.map((p) => `<button class="pw" data-p="${p}" title="${noteName(p, true)}" aria-label="${noteName(p, true)}">${p % 12 === 0 ? `<i>${noteName(p, true)}</i>` : ''}</button>`).join('')}${keys.filter((p) => [1, 3, 6, 8, 10].includes(p % 12)).map((p) => { const wi = whites.findIndex((w) => w > p); return `<button class="pb" data-p="${p}" style="--x:${wi}" title="${noteName(p, true)}" aria-label="${noteName(p, true)}"></button>`; }).join('')}</div>`;
  }
  box.innerHTML = head + body;
  box.querySelector('.close').onclick = () => instPanelToggle(false);
  box.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => { IP.mode = b.dataset.m; instPanelRender(); }));
  box.querySelectorAll('[data-oct]').forEach((b) => (b.onclick = () => { IP.lo = clamp(IP.lo + +b.dataset.oct, 24, 84); instPanelRender(); }));
  box.querySelectorAll('.ipdur[data-d]').forEach((b) => (b.onclick = () => { kpDur(+b.dataset.d); instPanelRender(); }));
  const dot = box.querySelector('[data-dot]');
  if (dot) dot.onclick = () => { ui.sc.dot = !ui.sc.dot; scApplyDurToSel(); renderScorePal(); instPanelRender(); };
  const rest = box.querySelector('[data-rest]');
  if (rest) rest.onclick = () => scInsert([], false);
  const ch = box.querySelector('[data-chord]');
  if (ch) ch.onchange = () => { IP.chord = ch.checked; };
  box.querySelectorAll('[data-p]').forEach((b) => (b.onpointerdown = (e) => { e.preventDefault(); ipPress(+b.dataset.p, b.dataset.si != null ? +b.dataset.si : null, e.shiftKey); }));
  IP.lit = '';
  instPanelLight();
}
function ipPress(p, si, shift) {
  const tr = track();
  if (!tr || tr.type !== 'melody') { const t2 = song.tracks.find((t) => t.type === 'melody'); if (t2) preview(t2, p); return; }
  if (ui.view === 'score' && ui.sc.input && !locked(tr)) {
    ui.sc.byPointer = false; // 続けて入れるので、カーソルの所が見えるように
    scInsert([p], IP.chord || shift, si);
    return;
  }
  preview(tr, p);
}
// いま光らせる音：再生中＝鳴っている音（いまのトラック）、止まっているとき＝えらんだ音
function instPanelLight(pos) {
  const box = $('#instPanel');
  if (!box || box.hidden) return;
  const tr = track();
  let ps = [];
  let fr = null;
  if (tr && tr.type === 'melody') {
    if (pos != null && player.on) ps = tr.notes.filter((n) => n.s <= pos && pos < n.s + n.l);
    else if (ui.view === 'score') ps = selNotes(tr);
    else ps = tr.notes.filter((n) => nsel.has(n));
    const tun = isFretMode(tr) ? (tabTunOf(tr) || TAB_TUN.guitar) : null;
    if (tun && ps.length) { const all = Notation.tabFrets(tr.notes, tun, song.bars, geo(), song.meter); fr = ps.map((n) => all.get(n.s + ':' + n.p)).filter(Boolean); }
  }
  const key = (fr ? fr.map((q) => q.si + '/' + q.f) : ps.map((n) => n.p)).join(',');
  if (key === IP.lit) return;
  IP.lit = key;
  box.querySelectorAll('.lit').forEach((el) => el.classList.remove('lit'));
  if (fr) for (const q of fr) box.querySelector(`[data-si="${q.si}"][data-f="${q.f}"]`)?.classList.add('lit');
  else for (const n of ps) box.querySelector(`.pkb [data-p="${n.p}"]`)?.classList.add('lit');
  // 鍵盤の外の音なら、そのオクターブへ
  if (!fr && ps.length && !player.on) { const lo = Math.min(...ps.map((n) => n.p)); if (lo < IP.lo || lo >= IP.lo + 36) { IP.lo = clamp(Math.floor(lo / 12) * 12, 24, 84); instPanelRender(); } }
}
// 再生中に毎コマ（app.js の anim から）
function proFrame(pos) { if (instPanelOn) instPanelLight(pos); }

/* ---------- ギターのコード図（Flat） ----------
   よく使う形は表から（開放弦のコード）。ないものは、押さえやすい形をさがす */
const SHAPES = {
  '0M': 'x32010', '2M': 'xx0232', '4M': '022100', '5M': '133211', '7M': '320003', '9M': 'x02220', '11M': 'x24442', '10M': 'x13331',
  '9m': 'x02210', '2m': 'xx0231', '4m': '022000', '11m': 'x24432', '5m': '133111', '7m': '355333', '0m': 'x35543',
  '47': '020100', '97': 'x02020', '27': 'xx0212', '77': '320001', '07': 'x32310', '117': 'x21202',
  '9m7': 'x02010', '4m7': '022030', '2m7': 'xx0211', '0M7': 'x32000', '5M7': 'xx3210', '9M7': 'x02120', '2M7': 'xx0222', '7M7': '320002',
  '9sus4': 'x02230', '2sus4': 'xx0233', '4sus4': '022200', '97sus4': 'x02030', '27sus4': 'xx0213', '47sus4': '020200',
  '06': 'x32210', '96': 'x02222', '26': 'xx0202', '9m6': 'x02212', '4m6': '022020', '0add9': 'x32030', '7add9': '300003',
};
const shapeCache = new Map();
const GTUN = [40, 45, 50, 55, 59, 64];
// コード → { f: [6本の弦のフレット（-1＝弾かない）], base: 図の一番上のフレット }
function guitarShape(r, q) {
  const key = r + q;
  if (shapeCache.has(key)) return shapeCache.get(key);
  let f = null;
  if (SHAPES[key]) f = [...SHAPES[key]].map((c) => (c === 'x' ? -1 : +c));
  else {
    const iv = (CHORD_Q[q] || CHORD_Q.M).iv.map((x) => (r + x) % 12);
    const need = new Set([iv[0], iv[1], iv.length > 3 ? iv[3] : iv[2]]); // 根音・3度（sus は4度）・7度（なければ5度）
    let best = null;
    for (let base = 1; base <= 10; base++) {
      const opts = GTUN.map((o) => { const a = [-1]; for (let fr = base; fr < base + 4; fr++) if (iv.includes((o + fr) % 12)) a.push(fr); return a; });
      const cur = [];
      const go = (i) => {
        if (i === 6) {
          const played = cur.map((fr, s) => (fr < 0 ? null : GTUN[s] + fr)).filter((x) => x != null);
          if (played.length < 4) return;
          const first = cur.findIndex((x) => x >= 0);
          if (cur.slice(first).some((x) => x < 0)) return; // とちゅうの弦はならす
          if ((GTUN[first] + cur[first]) % 12 !== iv[0]) return; // いちばん低い音は根音
          const pcs = new Set(played.map((x) => x % 12));
          if ([...need].some((x) => !pcs.has(x))) return;
          const cost = base * 2 + (6 - played.length) * 1.5 + (Math.max(...cur) - Math.min(...cur.filter((x) => x >= 0)));
          if (!best || cost < best.cost) best = { cost, f: cur.slice() };
          return;
        }
        for (const v of opts[i]) { cur.push(v); go(i + 1); cur.pop(); }
      };
      go(0);
      if (best && best.cost < base * 2 + 4) break;
    }
    f = best ? best.f : [-1, -1, -1, -1, -1, -1];
  }
  const pos = f.filter((x) => x > 0);
  const base = pos.length && Math.max(...pos) > 4 ? Math.min(...pos) : 1;
  const out = { f, base };
  shapeCache.set(key, out);
  return out;
}
function chordDiagramToggle(on) {
  const S = scoreSettings();
  const v = on == null ? !S.diagrams : !!on;
  edit(() => { scoreSettings().diagrams = v; }, 'コード図');
  if (ui.view === 'score') { renderScorePal(); renderScoreEdit(); }
  if (typeof updScoreDlg === 'function') updScoreDlg();
  toast(v ? 'コードネームの上に、ギターのコード図を書きます（印刷にも出ます）' : 'コード図をしまいました');
}

/* ---------- 自動で編曲（Sibelius のアレンジ） ----------
   メロディ（いまのトラック）とコード伴奏から、えらんだ編成の楽器に、それぞれのパートを作る */
const ENSEMBLES = {
  strings: { n: '弦楽四重奏', parts: [['violin', 'バイオリン1'], ['violin', 'バイオリン2'], ['viola', 'ビオラ'], ['cello', 'チェロ']] },
  winds: { n: '木管五重奏', parts: [['flute', 'フルート'], ['oboe', 'オーボエ'], ['clarinet', 'クラリネット'], ['horn', 'ホルン'], ['bassoon', 'ファゴット']] },
  brass: { n: '金管五重奏', parts: [['trumpet', 'トランペット1'], ['trumpet', 'トランペット2'], ['horn', 'ホルン'], ['trombone', 'トロンボーン'], ['tuba', 'チューバ']] },
  choir: { n: '混声合唱（4部）', parts: [['choir', 'ソプラノ', [60, 79]], ['choir', 'アルト', [55, 72]], ['choir', 'テノール', [48, 67]], ['choir', 'バス', [41, 62]]] },
  band: { n: 'バンド', parts: [['eguitar', 'ギター'], ['piano', 'キーボード'], ['ebass', 'ベース']] },
};
function rangeOf(inst, own) {
  if (own) return own;
  const r = INST_RANGE[inst];
  if (r) return [r[2], r[3]];
  return { eguitar: [52, 76], ebass: [28, 52], piano: [48, 84] }[inst] || [48, 84];
}
// コード伴奏の、時間ごとのコード [{ s, e, pcs, root }]
function chordTimeline(ct) {
  const out = [];
  let last = null;
  for (let b = 0; b < song.bars; b++) {
    const segs = chordSegs(ct.chords[b], b);
    if (!segs.length) { if (last) out.push({ ...last, s: barStart(b), e: barStart(b + 1) }); continue; }
    segs.forEach((sg, i) => {
      const s = barStart(b) + sg.o;
      const e = i + 1 < segs.length ? barStart(b) + segs[i + 1].o : barStart(b + 1);
      last = { root: sg.c.r, pcs: (CHORD_Q[sg.c.q] || CHORD_Q.M).iv.map((x) => (sg.c.r + x) % 12) };
      out.push({ ...last, s, e });
    });
  }
  // となりの同じコードはつなぐ
  return out.reduce((a, x) => { const p = a[a.length - 1]; if (p && p.root === x.root && String(p.pcs) === String(x.pcs) && p.e === x.s) p.e = x.e; else a.push({ ...x }); return a; }, []);
}
function nearestIn(pcs, ref, lo, hi, avoid) {
  let best = null;
  for (let p = lo; p <= hi; p++) {
    if (!pcs.includes(p % 12)) continue;
    const c = Math.abs(p - ref) + (avoid.has(p % 12) ? 4 : 0);
    if (best == null || c < best.c) best = { p, c };
  }
  return best ? best.p : null;
}
function arrangeMake(ensKey, rhythm, mel, ct) {
  const E = ENSEMBLES[ensKey];
  const tl = chordTimeline(ct);
  const parts = E.parts.map(([inst, name, own]) => ({ inst, name, rg: rangeOf(inst, own), notes: [] }));
  // 1つ目：メロディ（楽器の音域に入るよう、オクターブをそろえる）
  const mp = mel.notes.filter((n) => n.v !== 2);
  if (mp.length) {
    const avg = mp.reduce((a, n) => a + n.p, 0) / mp.length;
    const [lo, hi] = parts[0].rg;
    const sh = Math.round(((lo + hi) / 2 - avg) / 12) * 12;
    parts[0].notes = mp.map((n) => ({ s: n.s, p: clamp(n.p + sh, 21, 108), l: n.l, ...(n.ly ? { ly: n.ly } : {}) }));
  }
  // のこり：いちばん下はコードの根音、間はコードの音を、前の音から近い所へ（声部の進み方をなめらかに）
  const inner = parts.slice(1);
  const prev = inner.map((p) => Math.round((p.rg[0] + p.rg[1]) / 2));
  for (const c of tl) {
    const len = c.e - c.s;
    const hits = [];
    if (rhythm === 'beat') { for (let t = c.s; t < c.e;) { const b = barOf(t); const bt = beatAt(b); const e2 = Math.min(c.e, t + bt); hits.push([t, e2 - t]); t = e2; } }
    else if (rhythm === 'half') { for (let t = c.s; t < c.e;) { const e2 = Math.min(c.e, t + 96); hits.push([t, e2 - t]); t = e2; } }
    else hits.push([c.s, len]);
    const used = new Set();
    // メロディの音（その時の）と重ねすぎない
    const top = parts[0].notes.find((n) => n.s <= c.s && c.s < n.s + n.l);
    if (top) used.add(top.p % 12);
    inner.forEach((p, i) => {
      const last = i === inner.length - 1;
      let q;
      if (last && inner.length > 1) q = nearestIn([c.root], prev[i], p.rg[0], p.rg[1], new Set());
      else q = nearestIn(c.pcs, prev[i], p.rg[0], p.rg[1], used);
      if (q == null) return;
      used.add(q % 12);
      prev[i] = q;
      for (const [s, l] of hits) p.notes.push({ s, p: q, l });
    });
  }
  return parts;
}
function arrangeOpen() {
  const mel = track() && track().type === 'melody' ? track() : song.tracks.find((t) => t.type === 'melody');
  const ct = chordTrackOf();
  if (!mel) return toast('メロディのトラックがありません');
  if (!ct || !ct.chords.some(Boolean)) return toast('先にコード伴奏（コードネーム）を入れてください。メロディから「コードをつける」こともできます');
  let dlg = $('#dlgArr');
  if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'dlgArr'; dlg.className = 'dlg small'; document.body.appendChild(dlg); }
  dlg.innerHTML = `<h3>自動で編曲</h3>
    <p class="muted">メロディ「${escapeHtml(mel.name)}」とコード伴奏から、いくつかの楽器のパートを作ります。1つ目の楽器がメロディ、のこりがコードの音を受けもちます（あとから自由に直せます）。</p>
    <label>編成 <select id="arrEns">${Object.entries(ENSEMBLES).map(([k, e]) => `<option value="${k}">${e.n}（${e.parts.length}パート）</option>`).join('')}</select></label>
    <label>伴奏のリズム <select id="arrRhy"><option value="long">のばす（コードが変わるまで）</option><option value="half">2分音符ずつ</option><option value="beat">1拍ずつ</option></select></label>
    <label class="small"><input type="checkbox" id="arrMute" checked> もとのメロディとコード伴奏は、消音にする</label>
    <div class="btnrow" style="margin-top:12px"><span class="grow"></span><button class="mini" id="arrNo">やめる</button><button class="mini accent" id="arrOk">作る</button></div>`;
  dlg.querySelector('#arrNo').onclick = () => dlg.close();
  dlg.querySelector('#arrOk').onclick = () => {
    const ens = dlg.querySelector('#arrEns').value;
    const parts = arrangeMake(ens, dlg.querySelector('#arrRhy').value, mel, ct);
    if (song.tracks.length + parts.length > MAX_TRACKS) { toast('トラックがいっぱいです'); return; }
    const mute = dlg.querySelector('#arrMute').checked;
    edit(() => {
      for (const p of parts) song.tracks.push(newTrack('melody', { name: p.name, inst: p.inst, range: 'wide', notes: p.notes }));
      if (mute) { mel.mute = true; ct.mute = true; }
    }, '自動で編曲');
    dlg.close();
    preloadSamples();
    renderTracks();
    if (ui.view === 'score') renderScoreEdit(); else draw();
    toast(`${ENSEMBLES[ens].n}のパートを${parts.length}つ作りました`);
  };
  dlg.showModal();
}

/* ---------- 楽譜にコメント（Flat）：小節に付箋のようなメモ。印刷には出ない ---------- */
function commentAt() { return barOf(Math.min(ui.view === 'score' ? ui.sc.cursor || 0 : ui.startTick || 0, totalTicks() - 1)); }
function commentAdd(b) {
  b = b == null ? commentAt() : b;
  const who = (() => { try { return localStorage.getItem('otsumiki-name') || ''; } catch (e) { return ''; } })();
  const x = prompt(`${song.pickup ? b : b + 1}小節目へのコメント（先生・なかまへのメモ。印刷には出ません）`, '');
  if (x == null || !x.trim()) return;
  edit(() => { song.comments = song.comments || []; song.comments.push({ b, x: x.trim().slice(0, 300), who: who.slice(0, 20), at: Date.now() }); }, 'コメント');
  renderScoreEdit();
  if (ui.view !== 'score') draw();
}
function commentOpen(b) {
  const list = (song.comments || []).map((c, i) => ({ ...c, i })).filter((c) => c.b === b);
  let dlg = $('#dlgCmt');
  if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'dlgCmt'; dlg.className = 'dlg small'; document.body.appendChild(dlg); }
  const num = song.pickup ? b : b + 1;
  dlg.innerHTML = `<h3>${num}小節目のコメント</h3>${list.length ? `<ul class="cmtlist">${list.map((c) => `<li><p>${escapeHtml(c.x)}</p><small class="muted">${c.who ? escapeHtml(c.who) + '・' : ''}${c.at ? new Date(c.at).toLocaleDateString() : ''}</small><span class="grow"></span><button class="mini" data-ed="${c.i}">直す</button><button class="mini danger" data-del="${c.i}">消す</button></li>`).join('')}</ul>` : '<p class="muted">まだありません</p>'}
    <div class="btnrow" style="margin-top:10px"><button class="mini" id="cmtAdd">＋ コメントを足す</button><span class="grow"></span><button class="mini accent" id="cmtClose">とじる</button></div>`;
  dlg.querySelector('#cmtClose').onclick = () => dlg.close();
  dlg.querySelector('#cmtAdd').onclick = () => { dlg.close(); commentAdd(b); };
  dlg.querySelectorAll('[data-del]').forEach((x) => (x.onclick = () => { edit(() => { song.comments.splice(+x.dataset.del, 1); if (!song.comments.length) delete song.comments; }, 'コメントを消す'); renderScoreEdit(); if (ui.view !== 'score') draw(); commentOpen(b); }));
  dlg.querySelectorAll('[data-ed]').forEach((x) => (x.onclick = () => { const c = song.comments[+x.dataset.ed]; const v = prompt('コメント', c.x); if (v == null) return; edit(() => { if (v.trim()) c.x = v.trim().slice(0, 300); else song.comments.splice(+x.dataset.ed, 1); if (!song.comments.length) delete song.comments; }, 'コメント'); renderScoreEdit(); commentOpen(b); }));
  if (!dlg.open) dlg.showModal();
}
function commentList() {
  const cs = (song.comments || []).map((c, i) => ({ ...c, i })).sort((a, z) => a.b - z.b);
  let dlg = $('#dlgCmtAll');
  if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'dlgCmtAll'; dlg.className = 'dlg small'; document.body.appendChild(dlg); }
  dlg.innerHTML = `<h3>コメントの一覧</h3>${cs.length ? `<ul class="cmtlist">${cs.map((c) => `<li><button class="mini" data-go="${c.b}">${song.pickup ? c.b : c.b + 1}小節</button><p>${escapeHtml(c.x)}</p><small class="muted">${c.who ? escapeHtml(c.who) : ''}</small></li>`).join('')}</ul>` : '<p class="muted">コメントはまだありません。楽譜の小節をえらんで「コメントを書く」で足せます</p>'}
    <div class="btnrow" style="margin-top:10px"><button class="mini" id="cmtAdd2">＋ いまの小節にコメント</button><span class="grow"></span><button class="mini accent" id="cmtClose2">とじる</button></div>`;
  dlg.querySelector('#cmtClose2').onclick = () => dlg.close();
  dlg.querySelector('#cmtAdd2').onclick = () => { dlg.close(); commentAdd(); };
  dlg.querySelectorAll('[data-go]').forEach((x) => (x.onclick = () => { dlg.close(); if (ui.view !== 'score') setView('score'); ui.sc.cursor = barStart(+x.dataset.go); ui.sc.scrollTo = true; renderScoreEdit(); commentOpen(+x.dataset.go); }));
  if (!dlg.open) dlg.showModal();
}

/* ---------- キー・はじめの用意 ---------- */
function proKey(e) {
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return false;
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && !e.shiftKey && !e.altKey && (e.key === '/' || e.code === 'Slash')) { e.preventDefault(); cmdOpen(); return true; }
  if (ctrl && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'e') { e.preventDefault(); popoverOpen(); return true; }
  if (ui.view === 'score' && keypadKey(e)) return true;
  return false;
}
function proInit() {
  const anyModal = () => [...document.querySelectorAll('dialog')].some((d) => d.open && !d.classList.contains('paldlg'));
  document.addEventListener('keydown', (e) => { if (anyModal()) return; if (proKey(e)) e.stopImmediatePropagation(); }, true);
  // 上の道具の列：機能をさがすボタン（Dorico のジャンプバー・Sibelius の検索）
  const sb = document.createElement('button');
  sb.id = 'btnCmd';
  sb.className = 'tbtn icon';
  sb.dataset.cap = 'さがす';
  sb.title = '機能を名前でさがす（Ctrl+/）';
  sb.setAttribute('aria-label', '機能をさがす');
  sb.innerHTML = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>';
  sb.onclick = () => cmdOpen();
  const anchor = $('#btnScore');
  if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(sb, anchor);
  if (instPanelOn) instPanelRender();
  keypadRender();
}
// 画面・トラックがかわったとき
function proView() { if (instPanelOn) instPanelRender(); keypadRender(); }
// メニューのボタン
function proMenu() {
  const on = (id, fn) => { const b = document.getElementById(id); if (b) b.onclick = () => { if (typeof closePops === 'function') closePops(); fn(); }; };
  on('btnCmdMenu', cmdOpen);
  on('btnArrange', arrangeOpen);
  on('btnInstPanel', () => instPanelToggle());
  on('btnComments', commentList);
}
proInit();
proMenu();
