(function exposeLocalStorageRepository() {
  window.FichaTecLocalStorageRepository = {
    load(key) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw || raw === "undefined" || raw === "null") return [];
        return JSON.parse(raw);
      } catch (error) {
        console.error("Local cache parse failed", {key, error});
        localStorage.removeItem(key);
        return [];
      }
    },
    save(key, value) {
      localStorage.setItem(key, JSON.stringify(value ?? []));
    },
    remove(key) {
      localStorage.removeItem(key);
    },
  };
})();
