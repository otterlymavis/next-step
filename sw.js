// Offline cache for the app shell. Bump VERSION when any file changes.
const VERSION = 'nextstep-v6';
const FILES = ['./', 'index.html', 'style.css', 'core.js', 'ui.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Cache first so the app opens instantly, even offline or on a weak connection.
// The network copy refreshes the cache in the background and is used on the next open.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then((cache) =>
      cache.match(e.request, { ignoreSearch: true }).then((hit) => {
        const fresh = fetch(e.request)
          .then((res) => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          })
          .catch(() => hit || cache.match('index.html'));
        if (hit) {
          e.waitUntil(fresh.catch(() => {}));
          return hit;
        }
        return fresh;
      })
    )
  );
});
