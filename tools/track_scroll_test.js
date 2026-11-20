// トラックの一覧：操作しても、スクロールの位置が一番上にもどらない。ソロ・消音をまとめて解除できる
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const out = {};
  for (const [name, opt] of [['パソコン', { viewport: { width: 1366, height: 700 } }], ['スマホ', devices['Pixel 5']]]) {
    const ctx = await b.newContext(opt);
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://localhost:8765/?notour');
    await p.waitForTimeout(900);
    const r = await p.evaluate(async (phone) => {
      const d = document.querySelector('#dlgStart'); if (d.open) d.close();
      const o = {};
      const tracks = []; for (let k = 0; k < 24; k++) tracks.push({ type: 'melody', name: 'パート' + (k + 1), inst: 'flute', notes: [{ s: 0, p: 60 + k, l: 48 }] });
      loadSong({ v: 2, title: 'many', bpm: 100, bars: 2, tracks }, { own: true });
      if (phone) setPhoneView('tracks');
      await new Promise((res) => setTimeout(res, 400));
      const list = document.querySelector('#trackList');
      let sc = list; while (sc && !(sc.scrollHeight > sc.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
      o['スクロールする所'] = sc ? (sc.id || sc.className) : 'なし';
      if (!sc) return o;
      const wait = (ms) => new Promise((res) => setTimeout(res, ms));
      const at = () => Math.round(sc.scrollTop);
      const card = (i) => document.querySelectorAll('#trackList .track')[i];
      sc.scrollTop = 900; await wait(50);
      const y0 = at();
      // 画面に見えているカードで操作する
      const scr = sc.getBoundingClientRect();
      const vis = [...document.querySelectorAll('#trackList .track')].map((c, i) => [i, c.getBoundingClientRect()]).filter(([, q]) => q.top >= scr.top && q.bottom <= scr.bottom).map(([i]) => i);
      const v0 = vis[0], v1 = vis[1] != null ? vis[1] : vis[0];
      o['見えているカード'] = vis.join(',');
      card(v0).querySelector('.solo').click(); await wait(400);
      o['ソロをおしても動かない'] = at() === y0 ? true : y0 + '→' + at();
      card(v1).querySelector('.mute').click(); await wait(400);
      o['消音をおしても動かない'] = at() === y0 ? true : y0 + '→' + at();
      selectTrack(v1); await wait(400);
      o['トラックをえらんでも動かない'] = at() === y0 ? true : y0 + '→' + at();
      const vol = card(v1).querySelector('.vol'); vol.value = 0.5; vol.dispatchEvent(new Event('input', { bubbles: true })); vol.dispatchEvent(new Event('change', { bubbles: true })); await wait(400);
      o['音量を変えても動かない'] = at() === y0 ? true : y0 + '→' + at();
      undo(); await wait(400);
      o['もどすをしても動かない'] = at() === y0 ? true : y0 + '→' + at();
      // まとめて解除
      song.tracks[3].solo = true; song.tracks[20].solo = true; renderTracks(); await wait(100);
      const btn = document.querySelector('#btnSoloOff');
      o['ソロがあると「ソロ解除」が出る'] = !!btn && !btn.hidden;
      if (btn) { btn.click(); await wait(300); }
      o['ソロが全部はずれる'] = song.tracks.every((t) => !t.solo);
      o['解除しても動かない'] = at() === y0 ? true : y0 + '→' + at();
      o['ソロがなければボタンは出ない'] = !document.querySelector('#btnSoloOff') || document.querySelector('#btnSoloOff').hidden;
      return o;
    }, !!opt.hasTouch || name === 'スマホ');
    for (const k in r) out[name + '：' + k] = r[k];
    out[name + ' errs'] = errs;
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
