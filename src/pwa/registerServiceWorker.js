(function registerFichaTecServiceWorker() {
  const SW_BUILD = "2026-05-23-hotfix-1";
  const SW_BUILD_KEY = "fichatec.sw.build";
  const SW_URL = `/service-worker.js?v=${encodeURIComponent(SW_BUILD)}`;

  function handleLaunchShortcut() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") !== "scanner") return;

    window.addEventListener("load", () => {
      if (typeof window.openScanModal === "function") {
        window.openScanModal();
      }
    });
  }

  async function clearServiceWorkerStateIfNeeded() {
    if (!("serviceWorker" in navigator)) return;

    const previousBuild = localStorage.getItem(SW_BUILD_KEY);
    if (previousBuild === SW_BUILD) return;

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch (error) {
      console.warn("Service worker reset failed:", error);
    }

    localStorage.setItem(SW_BUILD_KEY, SW_BUILD);
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    let isRefreshingForUpdate = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (isRefreshingForUpdate) return;
      isRefreshingForUpdate = true;
      window.location.reload();
    });

    window.addEventListener("load", async () => {
      await clearServiceWorkerStateIfNeeded();

      navigator.serviceWorker.register(SW_URL, {scope:"/"})
        .then((registration) => {
          registration.update();
          if (registration.waiting) {
            registration.waiting.postMessage({type:"SKIP_WAITING"});
          }
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            if (!worker) return;
            worker.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller) {
                worker.postMessage({type:"SKIP_WAITING"});
              }
            });
          });
        })
        .catch((error) => {
          console.warn("Service worker registration failed:", error);
        });
    });
  }

  handleLaunchShortcut();
  registerServiceWorker();
})();
