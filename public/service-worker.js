const CACHE_VERSION = "fichatec-pwa-v14-force-refresh";
const NETWORK_FIRST_EXTENSIONS = new Set([".css", ".html", ".js", ".webmanifest"]);
const APP_SHELL = [
  "/",
  "/index.html",
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
  "/src/modules/billing/planAccess.js",
  "/src/modules/nutrition/nutritionDefaults.js",
  "/src/modules/recipes/recipeSheet.js",
  "/src/modules/scanner/scannerRecipe.js",
  "/src/modules/stock/categoryCatalog.js",
  "/src/modules/stock/stockPricing.js",
  "/src/modules/stock/virtualStock.js",
  "/src/modules/stock/physicalStock.js",
  "/src/pwa/registerServiceWorker.js",
  "/assets/images/fichatec-kitchen-hero.jpg",
  "/assets/fonts/material-symbols-rounded.ttf",
  "/src/styles/app.css",
  "/src/styles/base.css",
  "/src/styles/components.css",
  "/src/styles/elegant-refinement.css",
  "/src/styles/experience.css",
  "/src/styles/layout.css",
  "/src/styles/legacy.css",
  "/src/styles/pages.css",
  "/src/styles/saas-workspace.css",
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

function shouldUseNetworkFirstAsset(url) {
  if (url.pathname === "/" || url.pathname.endsWith("/index.html")) return true;
  const extension = url.pathname.slice(url.pathname.lastIndexOf("."));
  return NETWORK_FIRST_EXTENSIONS.has(extension);
}

async function networkFirstAsset(request) {
  try {
    const response = await fetch(new Request(request, {cache:"reload"}));
    if (shouldCacheResponse(response)) {
      const cache = await caches.open(CACHE_VERSION);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return await caches.match(request) || Response.error();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([deleteOldCaches(), self.clients.claim()]));
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

  if (shouldUseNetworkFirstAsset(url)) {
    event.respondWith(networkFirstAsset(request));
    return;
  }

  event.respondWith(cacheFirstAsset(request));
});
