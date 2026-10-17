(function registerFichaTecServiceWorker() {
  const SCANNER_ACTION = "scanner";
  const SHORTCUT_TIMEOUT_MS = 5 * 60 * 1000;
  const UPDATE_INTERVAL_MS = 5 * 60 * 1000;
  const RELEASE_CACHE_KEY = "fichatec.ui.release";
  let isReloadingForUpdate = false;
  let shouldReloadForUpdate = Boolean(navigator.serviceWorker?.controller);
  let activeReleaseId = "source";
  let releaseCheckPromise = null;

  function normalizeReleaseId(value) {
    return String(value || "source")
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 96) || "source";
  }

  async function fetchReleaseId() {
    const releaseUrl = new URL("/release.json", window.location.origin);
    releaseUrl.searchParams.set("t", String(Date.now()));

    const response = await window.fetch(releaseUrl, {
      cache: "no-store",
      headers: {"Cache-Control":"no-cache"},
    });
    if (!response.ok) throw new Error(`Release indisponivel (${response.status})`);

    const release = await response.json();
    return normalizeReleaseId(release?.releaseId);
  }

  async function clearOutdatedBrowserCaches(releaseId) {
    if (!("caches" in window)) return;

    try {
      if (window.localStorage.getItem(RELEASE_CACHE_KEY) === releaseId) return;

      const cacheNames = await window.caches.keys();
      const outdatedCacheNames = cacheNames.filter(
        (cacheName) => cacheName.startsWith("fichatec-pwa-")
          && cacheName !== `fichatec-pwa-${releaseId}`
      );
      await Promise.all(outdatedCacheNames.map((cacheName) => window.caches.delete(cacheName)));
      window.localStorage.setItem(RELEASE_CACHE_KEY, releaseId);
    } catch (error) {
      console.warn("Nao foi possivel limpar caches antigos da interface:", error);
    }
  }

  function buildServiceWorkerUrl(releaseId) {
    return `/service-worker.js?release=${encodeURIComponent(normalizeReleaseId(releaseId))}`;
  }

  function handleLaunchShortcut() {
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get("action") !== SCANNER_ACTION) return;

    let observer;
    let timeoutId;

    function stopWatching() {
      observer?.disconnect();
      window.clearTimeout(timeoutId);
    }

    function tryOpenScanner() {
      const authModal = document.getElementById("modal-auth");
      const isBooting = document.body.classList.contains("app-booting");
      const isAuthOpen = authModal?.classList.contains("open");

      if (isBooting || isAuthOpen || typeof window.openScanModal !== "function") {
        return false;
      }

      window.openScanModal();
      currentUrl.searchParams.delete("action");
      window.history.replaceState(window.history.state, "", currentUrl);
      stopWatching();
      return true;
    }

    function watchUntilScannerIsAvailable() {
      if (tryOpenScanner()) return;

      observer = new MutationObserver(tryOpenScanner);
      observer.observe(document.body, {attributes:true, attributeFilter:["class"]});

      const authModal = document.getElementById("modal-auth");
      if (authModal) {
        observer.observe(authModal, {attributes:true, attributeFilter:["class"]});
      }

      timeoutId = window.setTimeout(stopWatching, SHORTCUT_TIMEOUT_MS);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", watchUntilScannerIsAvailable, {once:true});
      return;
    }

    watchUntilScannerIsAvailable();
  }

  function requestServiceWorkerUpdate(registration) {
    registration.update().catch((error) => {
      console.warn("Nao foi possivel verificar uma atualizacao da PWA:", error);
    });
  }

  function synchronizePublishedRelease(registration) {
    if (releaseCheckPromise) return releaseCheckPromise;

    releaseCheckPromise = (async () => {
      const latestReleaseId = await fetchReleaseId();
      if (latestReleaseId === activeReleaseId) {
        requestServiceWorkerUpdate(registration);
        return;
      }

      activeReleaseId = latestReleaseId;
      await clearOutdatedBrowserCaches(latestReleaseId);
      const updatedRegistration = await navigator.serviceWorker.register(
        buildServiceWorkerUrl(latestReleaseId),
        {scope:"/", updateViaCache:"none"}
      );
      updatedRegistration.waiting?.postMessage({type:"SKIP_WAITING"});
      requestServiceWorkerUpdate(updatedRegistration);
    })()
      .catch((error) => {
        console.warn("Nao foi possivel sincronizar a versao publicada:", error);
      })
      .finally(() => {
        releaseCheckPromise = null;
      });

    return releaseCheckPromise;
  }

  function monitorServiceWorkerUpdates(registration) {
    function activateWaitingWorker() {
      registration.waiting?.postMessage({type:"SKIP_WAITING"});
    }

    activateWaitingWorker();

    registration.addEventListener("updatefound", () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener("statechange", () => {
        if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
          installingWorker.postMessage({type:"SKIP_WAITING"});
        }
      });
    });

    window.addEventListener("online", () => synchronizePublishedRelease(registration));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        synchronizePublishedRelease(registration);
      }
    });

    window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        synchronizePublishedRelease(registration);
      }
    }, UPDATE_INTERVAL_MS);

    synchronizePublishedRelease(registration);
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!shouldReloadForUpdate) {
        shouldReloadForUpdate = true;
        return;
      }

      if (isReloadingForUpdate) return;
      isReloadingForUpdate = true;
      window.location.reload();
    });

    let releaseId = "source";
    try {
      releaseId = await fetchReleaseId();
    } catch (error) {
      console.warn("Nao foi possivel consultar a versao publicada:", error);
    }

    activeReleaseId = releaseId;
    const serviceWorkerUrl = buildServiceWorkerUrl(releaseId);

    navigator.serviceWorker
      .register(serviceWorkerUrl, {scope:"/", updateViaCache:"none"})
      .then(async (registration) => {
        await clearOutdatedBrowserCaches(releaseId);
        monitorServiceWorkerUpdates(registration);
      })
      .catch((error) => {
        console.warn("Nao foi possivel ativar os recursos offline da PWA:", error);
      });
  }

  handleLaunchShortcut();

  if (document.readyState === "complete") {
    window.setTimeout(registerServiceWorker, 0);
  } else {
    window.addEventListener("load", () => window.setTimeout(registerServiceWorker, 0), {once:true});
  }
})();
