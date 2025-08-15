const CACHE = 'essaycoach-v1';
const ASSETS = [
  '/alfons149-cmyk/',
  '/alfons149-cmyk/index.html',
  '/alfons149-cmyk/manifest.webmanifest',
  '/alfons149-cmyk/icon-192.png',
  '/alfons149-cmyk/icon-512.png'
];

// Install: pre-cache core assets
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

// Activate: cleanup old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for same-origin; fall back to network
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then(res => res || fetch(e.request))
    );
  }
});
