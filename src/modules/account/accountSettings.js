(function exposeAccountSettings() {
  function createAccountSettings({repository, getAuth, closeModal, reloadOrganizations}) {
    const root = document.getElementById("modal-account");
    const el = id => document.getElementById(id);
    let revision = 0;
    let data = null;
    let scope = null;
    let busy = false;
    const dirtyForms = new Set();
    const roleLabels = {owner:"Proprietário", admin:"Administrador", chef:"Chef", viewer:"Somente leitura"};
    function setStatus(message, error = false) {
      el("account-status").textContent = message;
      el("account-status").setAttribute("role", error ? "alert" : "status");
      el("account-status").dataset.error = String(error);
    }
    function setBusy(value) {
      busy = value;
      root.dataset.busy = String(value);
      root.setAttribute("aria-busy", String(value));
      el("account-profile-fields").disabled = value || !data;
      el("account-company-fields").disabled = value || !data?.company || !scope?.canManage;
      el("account-reload").disabled = value;
    }
    function fillFields() {
      const profile = data.profile;
      const company = data.company || {};
      el("account-name").value = profile.full_name || "";
      el("account-phone").value = profile.phone || "";
      el("account-email").value = scope.email;
      el("account-company-name").value = company.name || "";
      el("account-company-phone").value = company.phone || "";
      el("account-company-email").value = company.billing_email || "";
      el("account-segment").value = company.business_segment || "";
      el("account-city").value = company.city || "";
      el("account-region").value = company.region || "";
      el("account-avatar").textContent = (profile.full_name || scope.email || "?").trim().split(/\s+/).slice(0,2).map(part => part[0]).join("").toUpperCase();
      el("account-summary-name").textContent = profile.full_name || "Seu perfil";
      el("account-summary-company").textContent = company.name || "Nenhuma empresa selecionada";
      el("account-role").textContent = roleLabels[scope.role] || "Sem empresa";
      el("account-company-note").textContent = !data.company ? "Selecione uma empresa na sua conta para configurar." : scope.canManage ? "As alterações valem para todos os membros desta empresa." : "Você pode consultar estes dados. Apenas o proprietário ou administrador pode alterá-los.";
      dirtyForms.clear();
    }
    async function load() {
      const auth = getAuth();
      const ticket = ++revision;
      data = null;
      scope = null;
      el("account-profile-form").reset();
      el("account-company-form").reset();
      el("account-summary-name").textContent = "Carregando sua conta";
      el("account-summary-company").textContent = "";
      el("account-avatar").textContent = "•";
      el("account-role").textContent = "";
      if (!auth.isAuthenticated) {
        setBusy(false);
        setStatus("Entre na sua conta para acessar o perfil.", true);
        return;
      }
      const organization = auth.organizations.find(item => item.id === auth.activeOrganizationId);
      scope = {userId:auth.user.id, organizationId:auth.activeOrganizationId, email:auth.user.email || "", role:organization?.role, canManage:["owner","admin"].includes(organization?.role)};
      const requestScope = {...scope};
      setBusy(true);
      setStatus("Carregando suas configurações…");
      try {
        const loaded = await repository.load(requestScope.userId, requestScope.organizationId);
        if (ticket !== revision) return;
        data = loaded;
        fillFields();
        setStatus("Dados sincronizados com sua conta.");
      } catch (error) {
        if (ticket !== revision) return;
        setStatus("Não foi possível carregar os dados. Verifique a conexão e toque em Recarregar.", true);
      } finally { if (ticket === revision) setBusy(false); }
    }
    function sameScope(ticket) {
      const auth = getAuth();
      return ticket === revision && auth.isAuthenticated && auth.user.id === scope?.userId && auth.activeOrganizationId === scope?.organizationId;
    }
    async function save(event) {
      event.preventDefault();
      if (busy || !data || !scope) return;
      const company = event.currentTarget.id === "account-company-form";
      if (company && !scope.canManage) return;
      if (!event.currentTarget.reportValidity()) return;
      const values = Object.fromEntries(new FormData(event.currentTarget));
      Object.keys(values).forEach(key => { values[key] = String(values[key]).trim() || null; });
      if (!(company ? values.name : values.full_name)) {
        setStatus("Preencha o nome antes de salvar.", true);
        return;
      }
      const ticket = revision;
      if (!sameScope(ticket)) { reset(); return; }
      setBusy(true);
      setStatus("Salvando…");
      try {
        const saved = company
          ? await repository.saveCompany(scope.organizationId, values, data.company.updated_at)
          : await repository.saveProfile(scope.userId, values, data.profile.updated_at);
        if (!sameScope(ticket)) return;
        if (company) data.company = saved; else data.profile = saved;
        // Preserve unsaved edits in the other form.
        el("account-summary-name").textContent = data.profile.full_name || "Seu perfil";
        el("account-summary-company").textContent = data.company?.name || "";
        el("account-avatar").textContent = (data.profile.full_name || scope.email).trim().split(/\s+/).slice(0,2).map(part => part[0]).join("").toUpperCase();
        dirtyForms.delete(event.currentTarget?.id || (company ? "account-company-form" : "account-profile-form"));
        setStatus(company ? "Dados da empresa salvos." : "Perfil salvo.");
        if (company) void reloadOrganizations().catch(() => {});
      } catch (error) {
        if (!sameScope(ticket)) return;
        const conflict = error.code === "PGRST116";
        setStatus(conflict ? "Os dados mudaram ou seu acesso foi alterado. Recarregue antes de salvar." : "Não foi possível confirmar o salvamento. Seus campos foram mantidos; recarregue para conferir.", true);
      } finally { if (ticket === revision) setBusy(false); }
    }
    function open() {
      closeModal("modal-auth");
      root.classList.add("open");
      void load();
    }
    function reset() {
      revision++;
      data = null; scope = null; dirtyForms.clear();
      el("account-profile-form").reset();
      el("account-company-form").reset();
      el("account-summary-name").textContent = "Seu perfil";
      el("account-summary-company").textContent = "";
      el("account-avatar").textContent = "";
      el("account-role").textContent = "";
      setStatus("");
      setBusy(false);
      closeModal("modal-account");
    }
    function onWorkspaceChange() { reset(); }
    function onInput(event) { const form = event.target.closest("form"); if (form) dirtyForms.add(form.id); setStatus("Você tem alterações para salvar."); }
    function reload() {
      if (dirtyForms.size && !window.confirm("Recarregar e descartar as alterações não salvas?")) return;
      void load();
    }
    function close() {
      if (busy || (dirtyForms.size && !window.confirm("Fechar e descartar as alterações não salvas?"))) return;
      reset();
    }
    el("account-profile-form").addEventListener("submit", save);
    el("account-company-form").addEventListener("submit", save);
    root.addEventListener("input", onInput);
    el("account-reload").addEventListener("click", reload);
    el("account-close").addEventListener("click", close);
    window.addEventListener("fichatec:auth-signed-out", reset);
    window.addEventListener("fichatec:workspace-change", onWorkspaceChange);
    return {open, reset, close};
  }
  window.FichaTecAccountSettings = {createAccountSettings};
})();

