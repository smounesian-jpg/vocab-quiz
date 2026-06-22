const CACHE_NAME = 'vocab-v1';
const ASSETS = [
  '/vocab-quiz/',
  '/vocab-quiz/index.html',
  '/vocab-quiz/style.css',
  '/vocab-quiz/app.js',
  '/vocab-quiz/manifest.json',
  '/vocab-quiz/vocab_ALL_756.json',
  '/vocab-quiz/app-icon-192.svg',
  '/vocab-quiz/app-icon-512.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
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
      return res || fetch(e.request);
    })
  );
});
