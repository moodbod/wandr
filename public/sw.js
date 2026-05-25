const CACHE_PREFIX = 'wandr-pwa';
const VERSION = 'v1';
const APP_CACHE = `${CACHE_PREFIX}-${VERSION}-app`;
const STATIC_CACHE = `${CACHE_PREFIX}-${VERSION}-static`;
const MAP_CACHE = `${CACHE_PREFIX}-${VERSION}-map`;
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/wandr-apple-touch-icon.png',
  '/wandr-favicon.png',
  '/wandr-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && !key.includes(VERSION)).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isSameOrigin(url) && isStaticAsset(request, url)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE, 90));
    return;
  }

  if (isMapboxAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, MAP_CACHE, 180));
  }
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isStaticAsset(request, url) {
  return (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'worker' ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    /\.(?:css|js|mjs|png|jpg|jpeg|webp|gif|svg|ico|woff2?)$/i.test(url.pathname)
  );
}

function isMapboxAsset(url) {
  return url.hostname === 'api.mapbox.com' || url.hostname === 'tiles.mapbox.com';
}

async function networkFirst(request) {
  const cache = await caches.open(APP_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone()).catch(() => undefined);
    }
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match('/')) || Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then(async (response) => {
      if (response.ok || response.type === 'opaque') {
        await cache.put(request, response.clone()).catch(() => undefined);
        await trimCache(cache, maxEntries);
      }
      return response;
    })
    .catch(() => undefined);

  return cached || (await fresh) || Response.error();
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) {
    return;
  }

  await Promise.all(keys.slice(0, keys.length - maxEntries).map((request) => cache.delete(request)));
}
