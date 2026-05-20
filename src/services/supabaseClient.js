(function exposeSupabaseClientService() {
  const config = window.FichaTecSupabaseConfig;
  let clientPromise = null;

  function getSupabaseGlobal() {
    return window.supabase?.createClient ? window.supabase : null;
  }

  function loadSupabaseLibrary() {
    if (getSupabaseGlobal()) return Promise.resolve(getSupabaseGlobal());
    if (clientPromise) return clientPromise;

    clientPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.async = true;
      script.onload = () => {
        const supabaseGlobal = getSupabaseGlobal();
        if (!supabaseGlobal) {
          reject(new Error("Supabase library loaded without createClient."));
          return;
        }
        resolve(supabaseGlobal);
      };
      script.onerror = () => reject(new Error("Failed to load Supabase library."));
      document.head.appendChild(script);
    });

    return clientPromise;
  }

  async function createClient() {
    if (!config?.enabled) return null;

    const supabaseGlobal = await loadSupabaseLibrary();
    return supabaseGlobal.createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  window.FichaTecSupabaseClientService = {
    createClient,
    isEnabled: () => Boolean(config?.enabled),
  };
})();
