// ═══════════════════════════════════════════════
// Service Worker - نسخه v6
// استراتژی stale-while-revalidate برای فایل JSON
// ═══════════════════════════════════════════════

const CACHE_NAME = 'vocab-quiz-v6';
const urlsToCache = [
    '/vocab-quiz/',
    '/vocab-quiz/index.html',
    '/vocab-quiz/app.js',
    '/vocab-quiz/manifest.json',
    '/vocab-quiz/icon-192.png',
    '/vocab-quiz/icon-512.png',
    // فایل JSON را در کش اولیه نمی‌گذاریم (بعداً در حین fetch کش می‌شود)
];

// نصب: کش کردن فایل‌های ایستا
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache', CACHE_NAME);
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// فعال‌سازی: حذف کش‌های قدیمی
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// درخواست‌ها: استراتژی‌های مختلف
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // ─── فایل JSON: stale-while-revalidate ───
    if (url.pathname.endsWith('vocab_ALL_756.json')) {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                // درخواست به شبکه برای به‌روزرسانی کش (در پس‌زمینه)
                const fetchPromise = fetch(event.request)
                    .then(networkResponse => {
                        // کش کردن نسخه جدید
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, networkResponse.clone());
                        });
                        return networkResponse;
                    })
                    .catch(() => {
                        // اگر شبکه خطا داد، همان کش برگردانده می‌شود
                        console.warn('Network failed, serving cached JSON');
                        return cachedResponse;
                    });

                // اگر کش وجود دارد، سریعاً آن را برگردان، ولی در پس‌زمینه به‌روزرسانی کن
                return cachedResponse || fetchPromise;
            })
        );
        return;
    }

    // ─── فایل‌های app.js و index.html: network-first ───
    if (url.pathname.endsWith('app.js') || url.pathname.endsWith('index.html')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // کش کردن نسخه جدید
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, response.clone());
                    });
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // ─── سایر فایل‌های ایستا: cache-first ───
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) return response;
                return fetch(event.request).then(networkResponse => {
                    // کش کردن برای دفعات بعد
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                    });
                    return networkResponse;
                });
            })
    );
});
