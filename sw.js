// Offline cache for the app shell. Bump VERSION when any file changes.
const VERSION = 'nextstep-v9';
const FILES = ['./', 'index.html', 'style.css', 'core.js', 'ui.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

// Fetch past the browser's HTTP cache, so a new version never stores old files.
const fresh = (req) => fetch(new Request(req, { cache: 'no-cache' }));

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.all(FILES.map((f) => fresh(f).then((res) => c.put(f, res))))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Cache first so the app opens instantly, even offline or on a weak connection.
// A fresh copy refreshes the cache in the background; the page offers "Update now" when a new version activates.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then((cache) =>
      cache.match(e.request, { ignoreSearch: true }).then((hit) => {
        const update = fresh(e.request)
          .then((res) => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          })
          .catch(() => hit || cache.match('index.html'));
        if (hit) {
          e.waitUntil(update.catch(() => {}));
          return hit;
        }
        return update;
      })
    )
  );
});
