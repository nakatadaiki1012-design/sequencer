/* オフラインでも速く開けるようにするサービスワーカー（http(s) で開いたときだけ使われます）
   - アプリ本体（HTML・CSS・JS）: まずネットから新しいものを取り、だめならキャッシュ（ネットが遅いときは 4 秒で見切る）
   - 楽器の録音 samples/mp3/**.mp3: 中身が変わらない（?v=… 付き）のでキャッシュを先に使う
   キャッシュの中身を変えたいときは VERSION を上げてください。 */
const VERSION = 'v1';
const SHELL = 'shell-' + VERSION;
const SAMPLES = 'samples-' + VERSION;
const SHELL_FILES = ['./', 'index.html', 'css/style.css', 'js/sound.js', 'js/glyphs.js', 'js/notation.js', 'js/musicxml.js', 'js/insticons.js', 'js/mp3.js', 'js/vendor/lame.min.js', 'js/app.js'];
const NET_TIMEOUT = 4000;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    // 1つ失敗しても入れられるものは入れる
    await Promise.all(SHELL_FILES.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keep = new Set([SHELL, SAMPLES]);
    for (const k of await caches.keys()) if (!keep.has(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

const isSample = (url) => /\/samples\/mp3\/.+\.mp3$/.test(url.pathname);

async function cacheFirst(req) {
  const c = await caches.open(SAMPLES);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && res.status === 200) {
    // 同じ録音の古い版（?v= が違うもの）は消しておく
    const old = await c.keys(req, { ignoreSearch: true });
    await Promise.all(old.map((k) => c.delete(k)));
    await c.put(req, res.clone());
  }
  return res;
}

async function networkFirst(req) {
  const c = await caches.open(SHELL);
  const hit = await c.match(req, { ignoreSearch: true });
  const net = fetch(req).then((res) => {
    if (res.ok && res.status === 200 && res.type === 'basic') c.put(req, res.clone()).catch(() => {});
    return res;
  });
  if (!hit) return net;
  // キャッシュがあるときは、ネットが遅ければキャッシュを使う
  const timeout = new Promise((res) => setTimeout(() => res(hit), NET_TIMEOUT));
  return Promise.race([net.catch(() => hit), timeout]);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (isSample(url)) e.respondWith(cacheFirst(req));
  else e.respondWith(networkFirst(req));
});
