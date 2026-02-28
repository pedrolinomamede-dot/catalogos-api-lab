self.addEventListener("install", () => {
  self.skipWaiting();
});

const STATIC_CACHE = "static-assets-v2";
const PUBLIC_API_CACHE = "public-api-v1";
const STATIC_PREFIXES = ["/_next/static/", "/icons/"];
const STATIC_FILES = ["/manifest.json", "/favicon.ico"];
const PUBLIC_API_PREFIX = "/api/public/";

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const keep = new Set([STATIC_CACHE, PUBLIC_API_CACHE]);
      await Promise.all(
        keys.map((key) => (keep.has(key) ? null : caches.delete(key))),
      );
      await self.clients.claim();
    })(),
  );
});

const isStaticAssetRequest = (request) => {
  if (request.method !== "GET") {
    return false;
  }

  if (request.mode === "navigate") {
    return false;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return false;
  }

  if (url.pathname.startsWith("/api/")) {
    return false;
  }

  if (url.pathname.startsWith("/_next/image")) {
    return false;
  }

  if (STATIC_FILES.includes(url.pathname)) {
    return true;
  }

  return STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
};

const isPublicApiRequest = (request) => {
  if (request.method !== "GET") {
    return false;
  }

  if (request.mode === "navigate") {
    return false;
  }

  if (request.credentials === "include") {
    return false;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return false;
  }

  if (!url.pathname.startsWith("/api/")) {
    return false;
  }

  return url.pathname.startsWith(PUBLIC_API_PREFIX);
};

const cacheFirst = async (request) => {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response && response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
};

const limitCacheEntries = async (cacheName, maxEntries) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) {
    return;
  }

  const excess = keys.length - maxEntries;
  const deletions = keys.slice(0, excess).map((request) => cache.delete(request));
  await Promise.all(deletions);
};

const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(PUBLIC_API_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await cache.put(request, response.clone());
        await limitCacheEntries(PUBLIC_API_CACHE, 50);
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    networkPromise.catch(() => null);
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) {
    return networkResponse;
  }

  return Response.error();
};

self.addEventListener("fetch", (event) => {
  if (isStaticAssetRequest(event.request)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  if (isPublicApiRequest(event.request)) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});
