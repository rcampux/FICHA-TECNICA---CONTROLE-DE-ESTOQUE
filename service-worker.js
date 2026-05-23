const CACHE_VERSION = "fichatec-pwa-v6";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon.svg",
  "/src/config/env.js",
  "/src/config/supabase.js",
  "/src/config/storageKeys.js",
  "/src/utils/formatters.js",
  "/src/services/repositories/localStorageRepository.js",
  "/src/services/supabaseClient.js",
  "/src/services/repositories/supabaseDomainRepository.js",
  "/src/services/repositories/hybridRepository.js",
  "/src/modules/auth/authSession.js",
  "/src/modules/nutrition/nutritionDefaults.js",
  "/src/modules/recipes/recipeSheet.js",
  "/src/modules/scanner/scannerRecipe.js",
  "/src/modules/stock/categoryCatalog.js",
  "/src/modules/stock/stockPricing.js",
  "/src/modules/stock/virtualStock.js",
  "/src/modules/stock/physicalStock.js",
  "/src/pwa/registerServiceWorker.js",
  "/src/styles/app.css",
  "/src/styles/base.css",
  "/src/styles/components.css",
  "/src/styles/layout.css",
  "/src/styles/legacy.css",
  "/src/styles/pages.css",
  "/src/styles/stock-dashboard.css",
  "/src/styles/tokens.css"
];

function shouldCacheResponse(response) {
  return response?.ok && response.type === "basic";
}

async function cacheAppShell() {
  const cache = await caches.open(CACHE_VERSION);

  await Promise.allSettled(
    APP_SHELL.map(async (url) => {
      const response = await fetch(url, {cache:"reload"});
      if (shouldCacheResponse(response)) {
        await cache.put(url, response);
      }
    })
  );
}

async function deleteOldCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)));
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (shouldCacheResponse(response)) {
      const cache = await caches.open(CACHE_VERSION);
      await cache.put(request, response.clone());
      await cache.put("/", response.clone());
    }
    return response;
  } catch (error) {
    const cachedPage = await caches.match(request);
    return cachedPage || caches.match("/") || Response.error();
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (shouldCacheResponse(response)) {
    const cache = await caches.open(CACHE_VERSION);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(deleteOldCaches());
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const {request} = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  event.respondWith(cacheFirstAsset(request));
});
