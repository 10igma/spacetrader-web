// Offline cache for the installable web app. The game runs on the device, so once the
// build is cached it opens without a network. A new build replaces the old one on the next visit.
const CACHE = 'nova-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Pages: network first, so a new build shows up. Hashed assets: cache first, they never change.
  const page = req.mode === 'navigate';
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached && !page) return cached;
    try {
      const fresh = await fetch(req);
      if (fresh.ok) void cache.put(req, fresh.clone());
      return fresh;
    } catch (err) {
      if (cached) return cached;
      throw err;
    }
  })());
});
