/* CO2 Compass service worker
   アプリの見た目・動作に必要な「アプリシェル」だけをキャッシュし、
   オフラインでもアプリが開けるようにする。
   天気APIなど外部の動的リクエストはキャッシュ対象外（常にネットワークへ）。 */

const CACHE_NAME = 'co2compass-shell-v1';

const SHELL_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './javascript/state.js',
  './javascript/data.js',
  './javascript/quiz.js',
  './javascript/gamify.js',
  './javascript/realworld.js',
  './javascript/cost.js',
  './javascript/commute.js',
  './javascript/quicklog.js',
  './javascript/monthlygoal.js',
  './javascript/chat.js',
  './javascript/modals.js',
  './javascript/flow.js',
  './javascript/main.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => { /* 一部アセットのパスが環境と異なっていても致命的にしない */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // 同一オリジンの静的アセットのみキャッシュ対象。外部API（天気など）はネットワークに任せる。
  if (url.origin !== self.location.origin){
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.ok){
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});