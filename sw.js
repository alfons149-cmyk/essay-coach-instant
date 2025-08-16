/* ========= EssayCoach SW (GitHub Pages path-aware) =========
   Register from index.html as:
   navigator.serviceWorker.register('/alfons149-cmyk/sw.js')
*/

const REPO_BASE = '/alfons149-cmyk';

/* -----------------------------------------------------------
   VERSION BUMP TIP:
   - Any time you change index.html or JS logic, bump this:
     CACHE_VERSION = 'v4'  ->  'v5', 'v6', etc.
   - After you push, hard-refresh once (Ctrl/⌘+Shift+R).
   - If icons/manifest change, bump too.
----------------------------------------------------------- */
const CACHE_VERSION = 'v4';

const STATIC_CACHE = `essaycoach-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `essaycoach-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = `${REPO_BASE}/offline.html`;

// Core assets to precache for offline
const PRECACHE_URLS = [
  `${REPO_BASE}/`,
  `${REPO_BASE}/index.html`,
  `${REPO_BASE}/manifest.webmanifest`,
  `${REPO_BASE}/icon-192.png`,
  `${REPO_BASE}/icon-512.png`,
  OFFLINE_URL
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

  // 1) SPA-style navigation → network first, fallback to cached index, then offline page
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          return fresh;
        } catch (err) {
          // Return cached index if available; otherwise offline page
          const cachedIndex = await caches.match(`${REPO_BASE}/index.html`);
          return cachedIndex || caches.match(OFFLINE_URL);
        }
      })()
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
            if (res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, resClone));
            }
            return res;
          })
          .catch(() => {
            if (req.destination === 'document') return caches.match(OFFLINE_URL);
          });
      })
    );
    return;
  }

  // 3) Default passthrough
});
