const CACHE_NAME = 'vocab-v2';
const CORE_ASSETS = [
  '/vocab-quiz/',
  '/vocab-quiz/index.html',
  '/vocab-quiz/style.css',
  '/vocab-quiz/app.js',
  '/vocab-quiz/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CORE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => {
      if (res) return res;
      return fetch(e.request).then(response => {
        if (e.request.url.includes('vocab_ALL_756.json') && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match('/vocab-quiz/index.html'));
    })
  );
});
