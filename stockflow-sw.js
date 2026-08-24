// Bump this string on every deploy as a belt-and-suspenders measure.
// With the network-first strategy below it's no longer strictly required,
// but it guarantees a clean slate if you ever want to force one.
const CACHE_VERSION = 'v2';
const CACHE_NAME = `stockflow-${CACHE_VERSION}`;
const APP_SHELL = [
  './index.html',
  './StockFlow_Mobile_Inventory-3.html',
  './stockflow-manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Network-first: always try to get the latest file. Only fall back to the
// cache if the network request fails (e.g. offline). This is what makes
// redeploys show up immediately in a normal tab, not just in private mode.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});