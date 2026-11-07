// 録音の読み込みのテストと計測。
// 使い方: (リポジトリのいちばん上で) python3 -m http.server 8771 2> /tmp/http.log &
//         node tools/sample_load_test.js [古い sound.js のパス] [http.log のパス]
// 古い sound.js を渡すと「前」と「後」をくらべます（git show HEAD~:js/sound.js > old.js など）。
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'http://localhost:8771';
const PAGE = ORIGIN + '/tools/sample_load_test.html';
const OLD = process.argv[2] && fs.existsSync(process.argv[2]) ? fs.readFileSync(process.argv[2], 'utf8') : null;
const LOG = process.argv[3];

// サンプル曲「はじめの一歩」で使う音
const SONG = {
  recorder: [60, 62, 64, 67, 69, 72, 74],
  kenhamo: [55, 57, 59, 60],
  piano: [36, 41, 43, 45, 48, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72],
  drums: ['kick', 'snare', 'hihat', 'crash'],
};
const SLOW = { offline: false, latency: 150, downloadThroughput: (4e6 / 8), uploadThroughput: (1e6 / 8) }; // 4 Mbps, 150 ms

async function newPage(b, { old = false, throttle = null, sw = 'block' } = {}) {
  const ctx = await b.newContext({ serviceWorkers: sw });
  const page = await ctx.newPage();
  const st = { bytes: 0, reqs: 0, fromSW: 0, errors: [], urls: [] };
  page.on('pageerror', (e) => st.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') st.errors.push(m.text()); });
  page.on('requestfinished', async (r) => {
    const res = await r.response();
    const s = await r.sizes().catch(() => null);
    st.reqs++;
    st.urls.push(r.url());
    if (res && res.fromServiceWorker()) st.fromSW++;
    else if (s) st.bytes += s.responseBodySize + s.responseHeadersSize;
  });
  if (old) await page.route('**/js/sound.js', (r) => r.fulfill({ body: OLD, contentType: 'text/javascript' }));
  if (throttle) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', throttle);
  }
  return { ctx, page, st };
}

// アプリと同じように、楽器を1つずつ順番に読む
async function loadSong(page, withNotes) {
  return page.evaluate(async ({ SONG, withNotes }) => {
    const ac = new AudioContext();
    const S = Sound.Samples;
    const t0 = performance.now();
    const times = {};
    let first = null;
    const poll = setInterval(() => {
      for (const id of ['recorder', 'kenhamo', 'piano']) if (S.ready(id) && !times[id + '_ready']) times[id + '_ready'] = performance.now() - t0;
      if (S.drumsReady() && !times.drums_ready) times.drums_ready = performance.now() - t0;
      if (first == null && Object.keys(times).length) first = performance.now() - t0;
    }, 5);
    for (const id of ['recorder', 'kenhamo', 'piano']) { await S.load(id, ac, withNotes ? SONG[id] : undefined); times[id] = performance.now() - t0; }
    await S.loadDrums(ac, withNotes ? SONG.drums : undefined);
    times.drums = performance.now() - t0;
    clearInterval(poll);
    return { first: first == null ? times.recorder : first, all: performance.now() - t0, times };
  }, { SONG, withNotes });
}

async function measure(b, label, opts, withNotes) {
  const { ctx, page, st } = await newPage(b, opts);
  await page.goto(PAGE);
  await page.waitForLoadState('networkidle');
  const before = st.bytes;
  const r = await loadSong(page, withNotes);
  await page.waitForTimeout(300);
  const out = { label, kB: Math.round((st.bytes - before) / 1024), firstReady_ms: Math.round(r.first), allLoaded_ms: Math.round(r.all), errors: st.errors.length };
  await ctx.close();
  return out;
}

// すべての楽器: 60 と 69 を OfflineAudioContext で鳴らし、大きさと高さを調べる
async function checkInstruments(b, old) {
  const { ctx, page, st } = await newPage(b, { old });
  await page.goto(PAGE);
  const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'samples/mp3/index.json'), 'utf8'));
  const res = await page.evaluate(async ({ insts, old }) => {
    const ac = new AudioContext();
    const out = {};
    const goertzel = (d, sr, f) => { const w = 2 * Math.PI * f / sr, c = 2 * Math.cos(w); let s1 = 0, s2 = 0; for (let i = 0; i < d.length; i++) { const s0 = d[i] + c * s1 - s2; s2 = s1; s1 = s0; } return s1 * s1 + s2 * s2 - c * s1 * s2; };
    for (const [id, avail] of Object.entries(insts)) {
      const ms = [60, 69].filter((m) => m >= avail[0] - 1 && m <= avail[avail.length - 1] + 1);
      if (!ms.length) ms.push(avail[Math.floor(avail.length / 2)]);
      await (old ? Sound.Samples.load(id, ac) : Sound.Samples.load(id, ac, ms));
      out[id] = [];
      for (const m of ms) {
        const sr = 44100;
        const oc = new OfflineAudioContext(2, sr, sr);  // ステレオで鳴らす（実際のアプリと同じ）
        Sound.playNote(oc, oc.destination, id, m, 0, 0.5, 0.8, true);
        const rb = await oc.startRendering();
        const d = rb.getChannelData(0), d1 = rb.getChannelData(1);
        let e = 0; for (let i = 0; i < d.length; i++) e += d[i] * d[i] + d1[i] * d1[i];
        const rms = Math.sqrt(e / d.length / 2);
        // 高さ: 基音のまわり ±60 セントで、倍音1〜4の強さの合計がいちばん大きいところ
        const seg = d.subarray(Math.floor(0.05 * sr), Math.floor(0.45 * sr));
        const f0 = 440 * Math.pow(2, (m - 69) / 12);
        let best = 0, bestP = -1;
        for (let c = -60; c <= 60; c += 2) {
          const f = f0 * Math.pow(2, c / 1200);
          let p = 0; for (let h = 1; h <= 4; h++) if (f * h < sr / 2) p += goertzel(seg, sr, f * h);
          if (p > bestP) { bestP = p; best = c; }
        }
        out[id].push({ m, rms: +rms.toFixed(4), cents: best });
      }
    }
    return out;
  }, { insts: idx.insts, old });
  await ctx.close();
  return { res, errors: st.errors };
}

(async () => {
  const b = await chromium.launch();
  const report = {};

  // 1) 読み込みの量と時間
  const runs = [];
  for (const [tname, throttle] of [['localhost', null], ['4Mbps/150ms', SLOW]]) {
    if (OLD) runs.push(await measure(b, `BEFORE (.js base64) ${tname}`, { old: true, throttle }, false));
    runs.push(await measure(b, `AFTER, app unchanged (all notes) ${tname}`, { throttle }, false));
    runs.push(await measure(b, `AFTER, song notes only ${tname}`, { throttle }, true));
  }
  console.table(runs);

  // 2) すべての楽器が鳴るか・高さが正しいか（前と後の大きさもくらべる）
  const now = await checkInstruments(b, false);
  const before = OLD ? await checkInstruments(b, true) : null;
  const bad = [];
  const ratios = [];
  for (const [id, list] of Object.entries(now.res)) {
    list.forEach((r, i) => {
      if (!(r.rms > 0.001) || (Math.abs(r.cents) > 20 && id !== 'taikodrum')) bad.push({ id, ...r }); // 和太鼓は高さの無い音
      if (before) { const o = before.res[id][i]; ratios.push({ id, m: r.m, ratio: +(r.rms / o.rms).toFixed(2), centsOld: o.cents, centsNew: r.cents }); }
    });
  }
  console.log('instruments checked:', Object.keys(now.res).length, 'notes:', Object.values(now.res).flat().length, 'bad:', JSON.stringify(bad), 'errors:', now.errors);
  if (ratios.length) {
    const rs = ratios.map((r) => r.ratio).sort((a, b2) => a - b2);
    console.log('loudness new/old: min', rs[0], 'median', rs[rs.length >> 1], 'max', rs[rs.length - 1]);
    console.log('outliers (>1.5 dB):', JSON.stringify(ratios.filter((r) => Math.abs(20 * Math.log10(r.ratio)) > 1.5)));
  }

  // 3) まだ読んでいない音: 近い録音で鳴らし、後ろで正しい録音を読む
  {
    const { ctx, page, st } = await newPage(b);
    await page.goto(PAGE);
    const r = await page.evaluate(async () => {
      const ac = new AudioContext();
      await Sound.Samples.load('piano', ac, [60]);
      const oc = new OfflineAudioContext(1, 22050, 44100);
      Sound.playNote(oc, oc.destination, 'piano', 72, 0, 0.3, 0.8, true);
      const d = (await oc.startRendering()).getChannelData(0);
      let e = 0; for (const v of d) e += v * v;
      await new Promise((res) => setTimeout(res, 800));
      return { rms: Math.sqrt(e / d.length), readyAfter: Sound.Samples.ready('piano') };
    });
    const got = st.urls.filter((u) => /piano\/\d+\.mp3/.test(u)).map((u) => u.match(/piano\/(\d+)/)[1]);
    console.log('on-demand: played 72 with only 60 loaded, rms', r.rms.toFixed(4), '→ fetched piano notes', got.join(','), 'errors', st.errors);
    await ctx.close();
  }

  // 4) file:// では .js を読む
  for (const url of ['file://' + path.join(ROOT, 'tools/sample_load_test.html'), 'file://' + path.join(ROOT, 'index.html')]) {
    const ctx = await b.newContext();
    const page = await ctx.newPage();
    const errs = [];
    const urls = [];
    page.on('pageerror', (e) => errs.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('request', (r) => urls.push(r.url()));
    await page.goto(url);
    await page.waitForTimeout(500);
    const r = await page.evaluate(async () => {
      const ac = new AudioContext();
      await Sound.Samples.load('piano', ac, [60, 64, 67]);
      await Sound.Samples.loadDrums(ac);
      const all = await Sound.Samples.load('piano', ac);
      return { ready: Sound.Samples.ready('piano'), notes: all.notes.length, drums: Sound.Samples.drumsReady() };
    }).catch((e) => ({ fail: e.message }));
    console.log('file://', path.basename(url), JSON.stringify(r), 'loaded', urls.filter((u) => /samples\//.test(u)).map((u) => u.split('/samples/')[1]).join(','), 'errors', JSON.stringify(errs));
    await ctx.close();
  }

  // 5) サービスワーカー: 2回目は録音をネットから読まない
  {
    const { ctx, page, st } = await newPage(b, { sw: 'allow' });
    await page.goto(PAGE);
    await page.evaluate(async () => { await navigator.serviceWorker.register('../sw.js', { scope: '../' }); await navigator.serviceWorker.ready; });
    await page.reload();
    console.log('controlled:', await page.evaluate(() => !!navigator.serviceWorker.controller));
    const logLines = () => (LOG && fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').split('\n').filter((l) => /samples\/mp3\/.+\.mp3/.test(l)).length : NaN);
    const l0 = logLines();
    const sw0 = st.fromSW;
    const r1 = await loadSong(page, true);
    await page.waitForTimeout(300);
    const l1 = logLines();
    await page.reload();
    await page.waitForLoadState('networkidle');
    const sw1 = st.fromSW;
    const r2 = await loadSong(page, true);
    await page.waitForTimeout(300);
    const l2 = logLines();
    console.log(`SW: 1st load ${l1 - l0} mp3 requests reached the server (${Math.round(r1.all)} ms); 2nd load ${l2 - l1} reached the server, ${st.fromSW - sw1} responses served by SW (${Math.round(r2.all)} ms)`);
    // オフラインでも開けるか
    await ctx.setOffline(true);
    await page.reload();
    const off = await page.evaluate(async () => { const ac = new AudioContext(); await Sound.Samples.load('recorder', ac, [60, 72]); return Sound.Samples.ready('recorder'); }).catch((e) => 'fail ' + e.message);
    console.log('SW offline reload + recorder ready:', off, 'errors', JSON.stringify(st.errors.filter((e) => !/ERR_INTERNET_DISCONNECTED/.test(e))));
    await ctx.close();
  }
  await b.close();
})();
