(function exposeHybridRepository() {
  const localRepository = window.FichaTecLocalStorageRepository;
  const supabaseService = window.FichaTecSupabaseClientService;
  let supabaseClientPromise = null;

  const tableByStorageKey = {
    fichatec_stock: "stock_items",
    fichatec_physical: "physical_stock_items",
    fichatec_recipes: "recipes",
  };

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

  function resolveTable(key) {
    return tableByStorageKey[key] || null;
  }

  function load(key) {
    return localRepository.load(key);
  }

  function save(key, value) {
    localRepository.save(key, value);
  }

  async function loadRemote(key, organizationId) {
    const table = resolveTable(key);
    const client = await getSupabaseClient();
    if (!client || !table || !organizationId) return load(key);

    const {data, error} = await client
      .from(table)
      .select("*")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("created_at", {ascending:false});

    if (error) throw error;
    return data || [];
  }

  async function saveRemote(_key, _value, _organizationId) {
    throw new Error("Supabase write sync is not enabled yet. Use domain-specific repositories in the next phase.");
  }

  window.FichaTecRepository = {
    mode: getMode,
    load,
    save,
    loadRemote,
    saveRemote,
  };
})();
