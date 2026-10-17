(function registerFichaTecServiceWorker() {
  const SCANNER_ACTION = "scanner";
  const SHORTCUT_TIMEOUT_MS = 5 * 60 * 1000;
  let isReloadingForUpdate = false;
  let shouldReloadForUpdate = Boolean(navigator.serviceWorker?.controller);

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

    window.addEventListener("online", () => requestServiceWorkerUpdate(registration));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        requestServiceWorkerUpdate(registration);
      }
    });

    requestServiceWorkerUpdate(registration);
  }

  function registerServiceWorker() {
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

    navigator.serviceWorker
      .register("/service-worker.js", {scope:"/", updateViaCache:"none"})
      .then(monitorServiceWorkerUpdates)
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
