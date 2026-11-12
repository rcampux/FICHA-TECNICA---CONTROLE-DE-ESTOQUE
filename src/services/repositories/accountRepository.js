(function exposeAccountRepository() {
  const PROFILE_FIELDS = "id,full_name,phone,updated_at";
  const COMPANY_FIELDS = "id,name,phone,billing_email,business_segment,city,region,updated_at";
  function createAccountRepository({createClient}) {
    async function query(run) {
      const controller = new AbortController();
      let timer;
      try {
        return await Promise.race([
          (async () => {
            const client = await createClient();
            if (controller.signal.aborted) throw new Error("Conexão expirada. Recarregue os dados.");
            if (!client) throw new Error("Entre na sua conta para salvar as configurações.");
            const result = await run(client, controller.signal);
            if (result.error) throw result.error;
            return result.data;
          })(),
          new Promise((_, reject) => { timer = setTimeout(() => {
            controller.abort();
            reject(new Error("A conexão demorou. Recarregue os dados antes de tentar novamente."));
          }, 12000); })
        ]);
      } finally { clearTimeout(timer); }
    }
    async function load(userId, organizationId) {
      const [profile, company] = await Promise.all([
        query((client, signal) => client.from("profiles").select(PROFILE_FIELDS).eq("id", userId).abortSignal(signal).single()),
        organizationId ? query((client, signal) => client.from("organizations").select(COMPANY_FIELDS).eq("id", organizationId).abortSignal(signal).single()) : null
      ]);
      return {profile, company};
    }
    async function saveProfile(userId, values, version) {
      const payload = {full_name: values.full_name, phone: values.phone};
      return query((client, signal) => client.from("profiles").update(payload).eq("id", userId).eq("updated_at", version).select(PROFILE_FIELDS).abortSignal(signal).single());
    }
    async function saveCompany(organizationId, values, version) {
      const payload = Object.fromEntries(["name", "phone", "billing_email", "business_segment", "city", "region"].map(key => [key, values[key]]));
      return query((client, signal) => client.from("organizations").update(payload).eq("id", organizationId).eq("updated_at", version).select(COMPANY_FIELDS).abortSignal(signal).single());
    }
    return {load, saveProfile, saveCompany};
  }
  window.FichaTecAccountRepository = {createAccountRepository};
})();

