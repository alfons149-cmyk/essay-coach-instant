/* ========= EssayCoach SW (GitHub Pages path-aware) =========
   Place this file at repo root and register it from:
   navigator.serviceWorker.register('/alfons149-cmyk/sw.js')
*/

const REPO_BASE = '/alfons149-cmyk';
const CACHE_VERSION = 'v3';
const STATIC_CACHE = `essaycoach-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `essaycoach-runtime-${CACHE_VERSION}`;

// Core assets to precache for offline
const PRECACHE_URLS = [
  `${REPO_BASE}/`,
  `${REPO_BASE}/index.html`,
  `${REPO_BASE}/manifest.webmanifest`,
  `${REPO_BASE}/icon-192.png`,
  `${REPO_BASE}/icon-512.png`
];

// --- Install: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// --- Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('essaycoach-') && k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// --- Fetch strategy
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // 1) SPA-style navigation requests → serve cached index.html (offline support)
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(`${REPO_BASE}/index.html`).then((resp) => {
        const fetchPromise = fetch(req).catch(() => resp);
        // If we have a cached HTML, return it immediately; otherwise fall back to network
        return resp || fetchPromise;
      })
    );
    return;
  }

  // 2) Static assets in our repo base → cache-first
  if (url.pathname.startsWith(REPO_BASE)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            const resClone = res.clone();
            // Only cache successful, basic/cors responses
            if (res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, resClone));
            }
            return res;
          })
          .catch(() => {
            // As a tiny fallback: if requesting the manifest or icons and offline, try index
            if (req.destination === 'document') return caches.match(`${REPO_BASE}/index.html`);
          });
      })
    );
    return;
  }

  // 3) Default: just passthrough
  // (You could add caching for CDN assets if you want)
});
