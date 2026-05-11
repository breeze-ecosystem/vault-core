/// <reference lib="webworker" />

const CACHE_NAME = 'oversight-v1';

// Static assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
];

// Install: pre-cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)),
  );
  self.skipWaiting();
});

// Activate: purge old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  // API / streaming routes → network-first
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/stream/') ||
    url.pathname.includes('/webrtc')
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets → cache-first
  event.respondWith(cacheFirst(request));
});

// ── Network-first ──────────────────────────────────────────────────────
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const clone = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Hors ligne', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// ── Cache-first ────────────────────────────────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    const clone = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    return response;
  } catch {
    // Offline fallback for navigation requests
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/');
      if (fallback) return fallback;
    }
    return new Response('Hors ligne', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}
