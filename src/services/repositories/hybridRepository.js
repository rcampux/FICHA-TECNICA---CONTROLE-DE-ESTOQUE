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

  function saveLocal(key, value) {
    localRepository.save(key, value);
  }

  function remove(key) {
    localRepository.remove(key);
  }

  async function loadRemote(key, organizationId) {
    const client = await getSupabaseClient();
    if (!client || !domainRepository?.canSyncKey?.(key) || !organizationId) return load(key);
    return domainRepository.loadByKey(client, key, organizationId);
  }

  async function saveRemote(key, value, organizationId) {
    const client = await getSupabaseClient();
    if (!client || !domainRepository?.canSyncKey?.(key) || !organizationId) return value;
    const saved = await domainRepository.saveByKey(client, key, organizationId, value);
    localRepository.save(key, saved);
    return saved;
  }

  function queueRemoteSave(key, value) {
    if (getMode() !== "supabase") return;
    if (!domainRepository?.canSyncKey?.(key)) return;
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

  async function upsertStockBatch(products, physicalItems, organizationId) {
    const keys = window.FichaTecStorageKeys;
    const client = await getSupabaseClient();
    if (getMode() === 'supabase') {
      if (!client || !organizationId || organizationId !== getActiveOrganizationId()) {
        throw new Error('Entre novamente na cozinha para salvar os ingredientes.');
      }
      await domainRepository.saveStockItems(client, organizationId, products, {prune:false});
      if (physicalItems.length) {
        await domainRepository.savePhysicalStockItems(client, organizationId, physicalItems, {prune:false});
      }
    }
    // Stable product IDs allow a failed batch to be retried without duplicating items.
    for (const [key, items] of [[keys.stock, products], [keys.physicalStock, physicalItems]]) {
      if (!items.length) continue;
      if (getMode() === 'supabase' && organizationId !== getActiveOrganizationId()) return;
      const updates = new Map(items.map(item => [String(item.remoteId || item.id), item]));
      const merged = load(key).filter(item => !updates.has(String(item.remoteId || item.id))).concat(items);
      saveLocal(key, merged);
      window.dispatchEvent(new CustomEvent('fichatec:remote-save', {detail:{key, value:merged}}));
    }
  }

  window.FichaTecRepository = {
    mode: getMode,
    activeOrganizationId: getActiveOrganizationId,
    load,
    save,
    saveLocal,
    remove,
    loadRemote,
    saveRemote,
    queueRemoteSave,
    upsertStockBatch,
  };
})();
