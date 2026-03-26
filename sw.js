/* ═══════════════════════════════════════════════════════════
   NeuroHabit Service Worker
   — Caches app shell + Firebase CDN scripts for offline use
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'neurohabit-v4';

const PRECACHE = [
  '/neurohabit/',
  '/neurohabit/index.html',
  '/neurohabit/manifest.json',
  '/neurohabit/icon-192.png',
  '/neurohabit/icon-512.png',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600&display=swap',
];

/* Install — cache everything in PRECACHE */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

/* Activate — delete old caches */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Fetch — cache-first for CDN scripts, network-first for everything else */
self.addEventListener('fetch', event => {
  const url = event.request.url;

  /* Cache-first: Firebase CDN and Google Fonts (rarely change) */
  if (url.includes('gstatic.com/firebasejs') || url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  /* Network-first: app shell — fall back to cache if offline */
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/neurohabit/index.html'))
    );
    return;
  }

  /* Default: network with cache fallback */
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
