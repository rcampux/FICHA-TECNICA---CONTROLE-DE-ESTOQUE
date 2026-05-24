(function registerFichaTecServiceWorker() {
  const SW_BUILD = "2026-05-23-hotfix-2";
  const SW_BUILD_KEY = "fichatec.sw.build";

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
    window.addEventListener("load", async () => {
      await clearServiceWorkerStateIfNeeded();
    });
  }

  handleLaunchShortcut();
  registerServiceWorker();
})();
