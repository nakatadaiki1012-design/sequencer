// おとつみき 検証スクリプト：操作性・音色・機能・UI・レイテンシーを数値で測る
const { chromium, devices } = require('playwright');
const fs = require('fs');
(async () => {
  const [SP, tag] = [process.argv[2], process.argv[3] || 'x'];
  const R = {};
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const errs = [];
  const page = async (opts) => { const p = await b.newPage(opts); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept(d.type()==='prompt'?'80':undefined)); await p.goto('http://localhost:8765/?notour'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(900); return p; };

  // ---------- UI のスッキリ感 ----------
  for (const [name, vp] of [['PC', { width: 1440, height: 900 }], ['iPad横', { width: 1180, height: 820 }]]) {
    const p = await page({ viewport: vp });
    R['UI_' + name] = await p.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && r.top < innerHeight && r.bottom > 0 && !el.closest('dialog:not([open])') && !(el.tagName !== 'SUMMARY' && el.closest('details:not([open])')) && !(el.tagName === 'SUMMARY' && el.parentElement.closest('details:not([open])')); };
      const ctrls = [...document.querySelectorAll('button,select,input,summary')].filter(vis);
      const small = ctrls.filter(e => e.getBoundingClientRect().height < 32);
      const ed = document.querySelector('#editorWrap').getBoundingClientRect();
      return { 見えている操作部品の数: ctrls.length, '高さ32px未満の部品': small.length, 'オトグラフの面積(%)': Math.round(ed.width * ed.height / (innerWidth * innerHeight) * 100), 'オトグラフより上の高さ(px)': Math.round(ed.top) };
    });
    await p.screenshot({ path: `${SP}/${tag}-ui-${name}.png` });
    await p.close();
  }

  // ---------- レイテンシー ----------
  {
    const p = await page({ viewport: { width: 1440, height: 900 } });
    R.レイテンシー = await p.evaluate(async () => {
      const ctx = ensureAudio(); await ctx.resume();
      const out = {};
      out['音声出力の遅れ(base+output, ms)'] = Math.round(((ctx.baseLatency || 0) + (ctx.outputLatency || 0)) * 1000 * 10) / 10;
      // マスを押してから音が鳴る予定時刻までの遅れ
      const sc = document.querySelector('#scroller'); const r = sc.getBoundingClientRect();
      const ts = [];
      const orig = Sound.playNote; let sched = null;
      Sound.playNote = function (c, o, i, m, t, ...a) { sched = t - c.currentTime; return orig.call(this, c, o, i, m, t, ...a); };
      for (let i = 0; i < 20; i++) {
        const x = r.left + 82 + 28 * (20 + i) + 5, y = r.top + 30 + 22 * 3 + 5;
        const t0 = performance.now();
        sc.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true, pointerId: 1, button: 0, pointerType: 'mouse' }));
        const t1 = performance.now();
        sc.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, bubbles: true, pointerId: 1, pointerType: 'mouse' }));
        ts.push([t1 - t0, sched]);
      }
      Sound.playNote = orig;
      const avg = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length * 10) / 10;
      out['マスを押す→処理時間(ms)'] = avg(ts.map(t => t[0]));
      out['マスを押す→発音予約の遅れ(ms)'] = avg(ts.map(t => t[1] * 1000));
      // 鍵盤（左の音名）を押したとき
      // 再生ボタン→最初の音
      
      // 描画時間
      let t0 = performance.now(); for (let i = 0; i < 30; i++) draw(); out['オトグラフ描画1回(ms)'] = Math.round((performance.now() - t0) / 30 * 10) / 10;
      t0 = performance.now(); for (let i = 0; i < 30; i++) drawOverview(); out['キャンバス描画1回(ms)'] = Math.round((performance.now() - t0) / 30 * 10) / 10;
      // 大きな曲（64小節・6トラック・音が多い）
      const big = JSON.parse(JSON.stringify(song)); big.bars = 64;
      for (const t of big.tracks) if (t.type === 'melody') { t.notes = []; for (let s = 0; s < 64 * 192; s += 24) t.notes.push({ s, p: 60 + (s / 24) % 12, l: 24 }); }
      big.tracks.push(JSON.parse(JSON.stringify(big.tracks[0])), JSON.parse(JSON.stringify(big.tracks[0])));
      big.tracks.forEach((t, i) => t.id = 'b' + i);
      loadSong(big);
      t0 = performance.now(); for (let i = 0; i < 30; i++) { draw(); drawOverview(); } out['大きな曲の描画1回(ms)'] = Math.round((performance.now() - t0) / 30 * 10) / 10;
      t0 = performance.now(); version++; eventList(); out['大きな曲の再生準備(ms)'] = Math.round((performance.now() - t0) * 10) / 10;
      // 弦をはじく音（ギター・琴）の初回の準備時間
      const off = new OfflineAudioContext(1, 44100, 44100);
      t0 = performance.now(); Sound.playNote(ctx, previewOut, 'koto', 67, ctx.currentTime + 0.01, 0.1, 0.01); out['琴の音の初回準備(ms)'] = Math.round((performance.now() - t0) * 10) / 10;
      // 録音の読み込みが終わるのを待ってから測る
      for (const t of song.tracks) { if (t.type === 'drum') await Sound.Samples.loadDrums(ctx); else if (Sound.Samples.has(t.inst)) await Sound.Samples.load(t.inst, ctx); }
      await new Promise(r => setTimeout(r, 300));
      // 再生ボタン→最初の音
      t0 = performance.now(); play(); out['再生ボタンの処理時間(ms)'] = Math.round((performance.now() - t0) * 10) / 10;
      out['再生ボタン→最初の音(ms)'] = Math.round((player.seg.time - ctx.currentTime) * 1000 + (performance.now() - t0));
      const frames = []; let last = performance.now();
      await new Promise((res) => { const f = (now) => { frames.push(now - last); last = now; if (frames.length < 90) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
      stop();
      frames.shift();
      out['再生中の1コマ平均(ms)'] = avg(frames);
      out['再生中の最悪の1コマ(ms)'] = Math.round(Math.max(...frames));
      return out;
    });
    await p.close();
  }

  // ---------- 音色 ----------
  {
    const p = await page({ viewport: { width: 1200, height: 800 } });
    R.音色 = await p.evaluate(async () => {
      const rows = [];
      const ids = Sound.CATS.flatMap(c => c.list.map(x => x[0]));
      const ac = ensureAudio();
      if (window.Samples) { for (const id of ids) { try { await Samples.load(id, ac); } catch (e) {} } }
      for (const real of (window.Samples ? [false, true] : [false])) {
        for (const id of ids) {
          if (real && !(window.Samples && Samples.has(id))) continue;
          for (const m of [60, 69]) {
            const sr = 44100; const ctx = new OfflineAudioContext(1, sr * 1.2, sr);
            Sound.playNote(ctx, ctx.destination, id, m, 0, 0.8, 0.8, real);
            const buf = await ctx.startRendering(); const d = buf.getChannelData(0);
            let peak = 0, sum = 0, n = 0; for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; if (i < sr * 0.3) { sum += d[i] * d[i]; n++; } }
            // 音の高さ：基本の周波数のまわり±100セントを1セントずつ調べる
            const st = Math.floor(sr * 0.1), L = Math.floor(sr * 0.4), seg = d.subarray(st, st + L);
            const f0 = 440 * Math.pow(2, (m - 69) / 12);
            let bestP = 0, cents = 0;
            for (let c = -100; c <= 100; c++) {
              const f = f0 * Math.pow(2, c / 1200), w = 2 * Math.PI * f / sr; let re = 0, im = 0;
              for (let i = 0; i < seg.length; i++) { const h = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / seg.length); re += seg[i] * h * Math.cos(w * i); im += seg[i] * h * Math.sin(w * i); }
              const pw = re * re + im * im; if (pw > bestP) { bestP = pw; cents = c; }
            }
            let att = 0; for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > peak * 0.7) { att = i / sr; break; }
            rows.push({ id, name: Sound.INSTRUMENTS[id], real, m, peakDb: Math.round(20 * Math.log10(peak + 1e-9) * 10) / 10, rmsDb: Math.round(10 * Math.log10(sum / n + 1e-12) * 10) / 10, cents: Math.round(cents), attackMs: Math.round(att * 1000) });
          }
        }
      }
      return rows;
    });
    await p.close();
  }

  // ---------- カトカトーンにない機能 ----------
  {
    const p = await page({ viewport: { width: 1440, height: 900 } });
    R.独自機能 = await p.evaluate(async () => {
      const ok = {};
      const tryit = async (name, fn) => { try { ok[name] = (await fn()) ? 'OK' : 'NG'; } catch (e) { ok[name] = 'エラー: ' + e.message; } };
      await tryit('コード伴奏が音になる', () => chordEvents(song.tracks[2]).length > 0);
      await tryit('おまかせ作曲', () => { const t = song.tracks[1]; autoCompose(t); return t.notes.length > 8 && t.notes.every(n => scalePcs().has(n.p % 12)); });
      await tryit('輪唱づくり(2小節ずらし)', () => { const a = song.tracks[0], b = song.tracks[1]; shiftCopy(a, b, 2); return b.notes[0].s === a.notes[0].s + 2 * barTicks(); });
      await tryit('共有URLで同じ曲に戻る', async () => JSON.stringify(await unpackSong(await packSong())) === JSON.stringify(song));
      await tryit('自動一時保存', async () => { changed(); await new Promise(r => setTimeout(r, 700)); return !!localStorage.getItem('otsumiki-autosave'); });
      await tryit('MIDI書き出し→読み込み', () => { const s = importMidi(midiBytes(), 'a.mid'); return s.tracks.length >= 3 && s.tracks[0].notes.length === song.tracks[0].notes.length; });
      await tryit('鍵盤で1音ずつ入力', () => { const t = song.tracks[0]; selectTrack(0); ui.stepRec = true; ui.inputTick = 0; const n0 = t.notes.length; noteOn(72); held.clear(); noteOff(); ui.stepRec = false; return t.notes.some(n => n.s === 0 && n.p === 72) && ui.inputTick === ui.grid; });
      await tryit('楽譜をいっしょに表示', () => { ui.showScore = true; renderScorePanel(); const s = document.querySelector('#scorePanel svg'); ui.showScore = false; renderScorePanel(); return !!s; });
      await tryit('日本の音階（民謡）', () => { song.scale = 'minyo'; changed(); const r = rowsFor({ type: 'melody', range: 'soprano', notes: [] }); song.scale = 'major'; changed(); return r.every(x => [0, 3, 5, 7, 10].includes(x.p % 12)); });
      await tryit('テンポ変化が時間に反映', () => { song.tempos = { 4: 50 }; version++; const a = absSec(4 * barTicks() + 48) - absSec(4 * barTicks()); song.tempos = {}; version++; return Math.abs(a - 60 / 50) < 1e-6; });
      await tryit('先生用ロック', () => { song.tracks[0].locked = true; const before = song.tracks[0].notes.length; renderEditorTools(); const r = document.querySelector('#btnClear').disabled; song.tracks[0].locked = false; return r; });
      await tryit('WAV書き出し', async () => (await exportWav()).length > 44100);
      return ok;
    });
    await p.close();
  }

  // ---------- 操作性（タブレット） ----------
  {
    const ctx = await b.newContext({ ...devices['iPad (gen 7) landscape'] });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900); await p.evaluate(()=>{ if (document.querySelector('#dlgStart').open) document.querySelector('#dlgStart').close(); });
    const box = await p.locator('#scroller').boundingBox();
    const n0 = await p.evaluate(() => song.tracks[0].notes.length);
    await p.touchscreen.tap(box.x + 82 + 28 * 5 + 5, box.y + 30 + 22 * 3 + 5);
    const n1 = await p.evaluate(() => song.tracks[0].notes.length);
    R.操作性_タブレット = { 'タップで音を置ける': n1 === n0 + 1 ? 'OK' : `NG (${n0}→${n1})` };
    const sizes = await p.evaluate(() => { const v = [...document.querySelectorAll('button,select,input,summary')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && r.top < innerHeight && !e.closest('dialog:not([open])') && !(e.tagName !== 'SUMMARY' && e.closest('details:not([open])')); }); return { 部品: v.length, '指で押しにくい(32px未満)': v.filter(e => e.getBoundingClientRect().height < 32).length }; });
    Object.assign(R.操作性_タブレット, sizes);
    await p.screenshot({ path: `${SP}/${tag}-ipad.png` });
    await ctx.close();
  }
  R.エラー = errs;
  fs.writeFileSync(`${SP}/${tag}-audit.json`, JSON.stringify(R, null, 1));
  const short = { ...R }; delete short.音色;
  console.log(JSON.stringify(short, null, 1));
  // 音色のまとめ
  const t = R.音色;
  for (const real of [false, true]) {
    const rs = t.filter(r => r.real === real); if (!rs.length) continue;
    const bad = rs.filter(r => Math.abs(r.cents) > 15);
    const rms = rs.map(r => r.rmsDb);
    console.log(real ? '録音' : '電子音', '楽器数', new Set(rs.map(r => r.id)).size, '音の高さずれ>15セント:', bad.map(r => `${r.name}${r.m}(${r.cents})`).join(' '), '音量の幅(dB):', Math.min(...rms), '〜', Math.max(...rms), 'クリップ:', rs.filter(r => r.peakDb > -0.1).map(r => r.name).join(' '));
  }
  await b.close();
})();
