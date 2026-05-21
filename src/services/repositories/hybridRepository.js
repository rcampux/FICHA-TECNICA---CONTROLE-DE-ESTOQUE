(function exposeHybridRepository() {
  const localRepository = window.FichaTecLocalStorageRepository;
  const supabaseService = window.FichaTecSupabaseClientService;
  const domainRepository = window.FichaTecSupabaseDomainRepository;
  let supabaseClientPromise = null;

  function getMode() {
    return supabaseService?.isEnabled() ? "supabase" : "local";
  }

  function getSupabaseClient() {
    if (!supabaseService?.isEnabled()) return Promise.resolve(null);
    if (!supabaseClientPromise) {
      supabaseClientPromise = supabaseService.createClient();
    }
    return supabaseClientPromise;
  }

  function getActiveOrganizationId() {
    return window.getAuthState?.().activeOrganizationId || null;
  }

  function load(key) {
    return localRepository.load(key);
  }

  function save(key, value) {
    localRepository.save(key, value);
    queueRemoteSave(key, value);
  }

  function remove(key) {
    localRepository.remove(key);
  }

  async function loadRemote(key, organizationId) {
    const client = await getSupabaseClient();
    if (!client || !domainRepository || !organizationId) return load(key);
    return domainRepository.loadByKey(client, key, organizationId);
  }

  async function saveRemote(key, value, organizationId) {
    const client = await getSupabaseClient();
    if (!client || !domainRepository || !organizationId) return value;
    const saved = await domainRepository.saveByKey(client, key, organizationId, value);
    localRepository.save(key, saved);
    return saved;
  }

  function queueRemoteSave(key, value) {
    if (getMode() !== "supabase") return;
    const organizationId = getActiveOrganizationId();
    if (!organizationId) return;

    saveRemote(key, value, organizationId)
      .then((saved) => {
        window.dispatchEvent(new CustomEvent("fichatec:remote-save", {
          detail: {key, value:saved},
        }));
      })
      .catch((error) => {
        console.error("Remote sync failed", error);
      });
  }

  window.FichaTecRepository = {
    mode: getMode,
    activeOrganizationId: getActiveOrganizationId,
    load,
    save,
    remove,
    loadRemote,
    saveRemote,
    queueRemoteSave,
  };
})();
