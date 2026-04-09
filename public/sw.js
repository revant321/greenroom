// Service Worker for greenroom PWA
// Strategy: Cache app shell on install, serve from cache when offline

const CACHE_NAME = 'greenroom-v1';

// On install, cache the app shell (the HTML entry point).
// Vite-built assets have hashed filenames and are cached on first fetch.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['/greenroom/']))
  );
  // Activate immediately instead of waiting for old tabs to close
  self.skipWaiting();
});

// On activate, clean up old caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// Fetch strategy:
// - Navigation requests (page loads): network-first with cache fallback
//   This ensures you get the latest HTML when online, but the cached
//   version works when offline.
// - Asset requests (JS, CSS, images): cache-first with network fallback
//   Vite hashes filenames, so cached assets are always correct.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests (POST, etc.)
  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) return;

  if (request.mode === 'navigate') {
    // Navigation: try network first, fall back to cached index
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fresh response for next time
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/greenroom/'))
    );
  } else {
    // Assets: try cache first, fall back to network (and cache the result)
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          // Only cache successful responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});
