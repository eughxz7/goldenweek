const CACHE_NAME = 'golden-week-cache-v2';
const assets = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon.png',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;900&family=Courier+Prime:wght@700&family=JetBrains+Mono:wght@700&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      return cachedResponse || fetch(e.request);
    })
  );
});
