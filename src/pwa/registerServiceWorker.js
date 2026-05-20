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

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("../service-worker.js", {scope:"../"})
        .then((registration) => {
          if (registration.waiting) {
            registration.waiting.postMessage({type:"SKIP_WAITING"});
          }
        })
        .catch((error) => {
          console.warn("Service worker registration failed:", error);
        });
    });
  }

  handleLaunchShortcut();
  registerServiceWorker();
})();
