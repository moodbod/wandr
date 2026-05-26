const CACHE_PREFIX = 'wandr-pwa';
const VERSION = 'v2';
const APP_CACHE = `${CACHE_PREFIX}-${VERSION}-app`;
const STATIC_CACHE = `${CACHE_PREFIX}-${VERSION}-static`;
const MAP_CACHE = `${CACHE_PREFIX}-${VERSION}-map`;
const OFFLINE_MAP_CACHE = 'wandr-offline-map-packs-v1';
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/wandr-apple-touch-icon.png',
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
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== APP_CACHE && key !== STATIC_CACHE && key !== MAP_CACHE)
            .map((key) => caches.delete(key))
        )
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

  if (isSameOrigin(url) && isOfflineMapPackAsset(url)) {
    event.respondWith(cacheFirstOfflineMapPack(request));
    return;
  }

  if (isSameOrigin(url) && isAppShellAsset(request, url)) {
    event.respondWith(networkFirstStatic(request));
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

function isAppShellAsset(request, url) {
  return (
    request.destination === 'script' ||
    request.destination === 'style' ||
    /\.(?:js|mjs|css)$/i.test(url.pathname)
  );
}

function isMapboxAsset(url) {
  return url.hostname === 'api.mapbox.com' || url.hostname === 'tiles.mapbox.com';
}

function isOfflineMapPackAsset(url) {
  return url.pathname.startsWith('/offline-map-packs/');
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

async function networkFirstStatic(request) {
  const cache = await caches.open(STATIC_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone()).catch(() => undefined);
      await trimCache(cache, 90);
    }
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
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

async function cacheFirstOfflineMapPack(request) {
  const cache = await caches.open(OFFLINE_MAP_CACHE);
  const cached = await cache.match(request.url);
  const rangeHeader = request.headers.get('range');

  if (cached) {
    return rangeHeader ? createRangeResponse(cached, rangeHeader) : cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok && response.status !== 206) {
      await cache.put(request.url, response.clone()).catch(() => undefined);
    }
    return response;
  } catch {
    return Response.error();
  }
}

async function createRangeResponse(response, rangeHeader) {
  const range = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader);
  if (!range) {
    return response;
  }

  const buffer = await response.arrayBuffer();
  const size = buffer.byteLength;
  const start = range[1] ? Number(range[1]) : 0;
  const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) {
    return new Response(null, {
      status: 416,
      headers: {
        'Content-Range': `bytes */${size}`,
      },
    });
  }

  const body = buffer.slice(start, end + 1);
  const headers = new Headers(response.headers);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Length', String(body.byteLength));
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);

  return new Response(body, {
    status: 206,
    statusText: 'Partial Content',
    headers,
  });
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) {
    return;
  }

  await Promise.all(keys.slice(0, keys.length - maxEntries).map((request) => cache.delete(request)));
}
