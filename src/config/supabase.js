(function exposeSupabaseConfig() {
  const env = window.FICHATEC_ENV || {};
  const config = env.supabase || {};

  function hasSupabaseConfig() {
    return Boolean(config.url && config.anonKey);
  }

  window.FichaTecSupabaseConfig = {
    url: config.url || "",
    anonKey: config.anonKey || "",
    enabled: env.dataMode === "supabase" && hasSupabaseConfig(),
    hasSupabaseConfig,
  };
})();
