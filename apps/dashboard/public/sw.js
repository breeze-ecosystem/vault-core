/// <reference lib="webworker" />

const CACHE_NAME = 'oversight-v3';

const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)),
  );
  self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/stream/') ||
    url.pathname.includes('/webrtc')
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

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

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    const clone = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    return response;
  } catch {
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
