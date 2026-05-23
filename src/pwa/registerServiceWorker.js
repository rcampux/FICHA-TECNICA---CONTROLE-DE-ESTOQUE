(function registerFichaTecServiceWorker() {
  function handleLaunchShortcut() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") !== "scanner") return;

    window.addEventListener("load", () => {
      if (typeof window.openScanModal === "function") {
        window.openScanModal();
      }
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    let isRefreshingForUpdate = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (isRefreshingForUpdate) return;
      isRefreshingForUpdate = true;
      window.location.reload();
    });

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("../service-worker.js", {scope:"../"})
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
