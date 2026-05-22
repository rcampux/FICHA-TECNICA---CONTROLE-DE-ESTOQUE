(function exposeSupabaseClientService() {
  const config = window.FichaTecSupabaseConfig;
  let libraryPromise = null;
  let clientPromise = null;

  function getSupabaseGlobal() {
    return window.supabase?.createClient ? window.supabase : null;
  }

  function loadSupabaseLibrary() {
    if (getSupabaseGlobal()) return Promise.resolve(getSupabaseGlobal());
    if (libraryPromise) return libraryPromise;

    libraryPromise = new Promise((resolve, reject) => {
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

    return libraryPromise;
  }

  async function createClient() {
    if (!config?.enabled) return null;
    if (clientPromise) return clientPromise;

    clientPromise = loadSupabaseLibrary()
      .then((supabaseGlobal) => supabaseGlobal.createClient(config.url, config.anonKey, {
        auth: {
          storageKey: "fichatec-auth-token",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }))
      .catch((error) => {
        clientPromise = null;
        throw error;
      });

    return clientPromise;
  }

  window.FichaTecSupabaseClientService = {
    createClient,
    isEnabled: () => Boolean(config?.enabled),
  };
})();
