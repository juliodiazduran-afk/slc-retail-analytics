// SLC Retail Analytics — service worker
// Bump CACHE_VERSION on every publish so returning devices pick up the new
// data snapshot instead of serving a stale cached index.html.
const CACHE_VERSION = 'slc-analytics-20260917175607';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for index.html (so an online device always checks for a
// fresh data snapshot first), cache-first for static assets, with a cache
// fallback when offline.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isHtml = event.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');

  if (isHtml) {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          return resp;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
