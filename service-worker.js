// ─── نسخه v5: اضافه شدن vocab_ALL_756.json به cache ───
const CACHE_NAME = 'vocab-quiz-v5';
const ASSETS = [
  '/vocab-quiz/',
  '/vocab-quiz/index.html',
  '/vocab-quiz/app.js',
  '/vocab-quiz/style.css',
  '/vocab-quiz/manifest.json',
  '/vocab-quiz/vocab_ALL_756.json'   // ← کلید: فایل سوالات حالا offline هم کار می‌کنه
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => { if (key !== CACHE_NAME) return caches.delete(key); })
    )).then(() => self.clients.claim())
  );
});

// استراتژی: network-first برای JSON (آخرین نسخه) ، cache-first برای بقیه
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // برای فایل سوالات: همیشه اول از شبکه، cache به عنوان fallback
  if (url.pathname.endsWith('vocab_ALL_756.json')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // برای بقیه فایل‌ها: cache-first
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
