(function exposeAuthSessionModule() {
  function createAuthSessionModule(deps) {
    const {
      closeModal,
      config,
      createSupabaseClient,
      showToast,
    } = deps;

    const state = {
      activeOrganizationId: null,
      authMode: "login",
      client: null,
      initialized: false,
      isSupabaseEnabled: Boolean(config?.enabled),
      loading: false,
      organizations: [],
      session: null,
      user: null,
    };

    function getElement(id) {
      return document.getElementById(id);
    }

    function getAuthState() {
      return {
        activeOrganizationId: state.activeOrganizationId,
        isAuthenticated: Boolean(state.user),
        isSupabaseEnabled: state.isSupabaseEnabled,
        organizations: [...state.organizations],
        user: state.user,
      };
    }

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]);
    }

    function dispatchWorkspaceChange() {
      if (!state.activeOrganizationId) return;
      window.dispatchEvent(new CustomEvent("fichatec:workspace-change", {
        detail: {organizationId: state.activeOrganizationId},
      }));
    }

    function getAuthRedirectUrl() {
      return `${window.location.origin}${window.location.pathname}`;
    }

    async function initAuthSession() {
      if (state.initialized) return getAuthState();
      state.initialized = true;

      if (!state.isSupabaseEnabled) {
        renderAuthState();
        return getAuthState();
      }

      try {
        state.client = await createSupabaseClient();
        const {data, error} = await state.client.auth.getSession();
        if (error) throw error;
        syncSupabaseSession(data.session);

        state.client.auth.onAuthStateChange((_event, session) => {
          syncSupabaseSession(session);
          loadOrganizations();
        });

        await loadOrganizations();
      } catch (error) {
        console.error(error);
        state.isSupabaseEnabled = false;
        showToast("Supabase indisponivel. Mantendo modo local.");
      }

      renderAuthState();
      return getAuthState();
    }

    function syncSupabaseSession(session) {
      state.session = session || null;
      state.user = session?.user || null;
      if (!state.user) {
        state.activeOrganizationId = null;
        state.organizations = [];
      }
      renderAuthState();
    }

    async function loadOrganizations() {
      if (!state.client || !state.user) {
        state.organizations = [];
        renderAuthState();
        return [];
      }

      const {data, error} = await state.client
        .from("organization_members")
        .select("role, organization:organizations(id, name, slug)")
        .eq("user_id", state.user.id)
        .order("created_at", {ascending: true});

      if (error) {
        console.error(error);
        showToast("Nao foi possivel carregar workspaces.");
        return [];
      }

      state.organizations = (data || [])
        .map((member) => ({
          id: member.organization?.id,
          name: member.organization?.name || "Workspace",
          role: member.role,
          slug: member.organization?.slug || "",
        }))
        .filter((organization) => organization.id);

      if (!state.activeOrganizationId && state.organizations.length) {
        state.activeOrganizationId = state.organizations[0].id;
        dispatchWorkspaceChange();
      }

      renderAuthState();
      return state.organizations;
    }

    function renderAuthState() {
      const statusLabel = getElement("auth-status-label");
      const statusButton = getElement("auth-status-btn");
      const stateTitle = getElement("auth-state-title");
      const stateDescription = getElement("auth-state-description");
      const formWrap = getElement("auth-form-wrap");
      const localWrap = getElement("auth-local-wrap");
      const workspaceWrap = getElement("auth-workspace-wrap");
      const workspaceList = getElement("auth-workspace-list");
      const tabs = getElement("auth-mode-tabs");
      const submitButton = getElement("auth-submit-btn");

      if (!statusLabel || !stateTitle || !stateDescription) return;

      statusButton?.classList.toggle("is-authenticated", Boolean(state.user));
      statusLabel.textContent = state.user
        ? state.user.email
        : state.isSupabaseEnabled
          ? "Entrar"
          : "Modo local";

      if (!state.isSupabaseEnabled) {
        stateTitle.textContent = "Prototipo local";
        stateDescription.textContent = "Seus dados ficam salvos neste navegador ate ligarmos o Supabase.";
        formWrap.style.display = "none";
        workspaceWrap.style.display = "none";
        tabs.style.display = "none";
        localWrap.style.display = "block";
        return;
      }

      localWrap.style.display = "none";
      tabs.style.display = state.user ? "none" : "grid";
      formWrap.style.display = state.user ? "none" : "block";
      workspaceWrap.style.display = state.user ? "block" : "none";
      stateTitle.textContent = state.user ? "Sessao ativa" : "Login Supabase";
      stateDescription.textContent = state.user
        ? "Escolha o workspace de trabalho antes de salvar dados remotos."
        : "Entre ou crie uma conta para sincronizar dados com seguranca.";

      if (submitButton) {
        submitButton.innerHTML = state.loading
          ? '<span class="material-symbols-rounded">hourglass_top</span> Processando'
          : state.authMode === "login"
            ? '<span class="material-symbols-rounded">login</span> Entrar'
            : '<span class="material-symbols-rounded">person_add</span> Criar conta';
        submitButton.disabled = state.loading;
      }

      if (workspaceList) {
        workspaceList.innerHTML = state.organizations.length
          ? state.organizations.map((organization) => `
            <button class="workspace-option ${organization.id === state.activeOrganizationId ? "active" : ""}" onclick="selectOrganization('${escapeHtml(organization.id)}')" type="button">
              <span class="material-symbols-rounded">business</span>
              <span>
                <strong>${escapeHtml(organization.name)}</strong>
                <small>${escapeHtml(organization.role)}</small>
              </span>
            </button>
          `).join("")
          : '<div class="empty-state">Nenhum workspace encontrado. A migration cria um workspace automaticamente para novos usuarios.</div>';
      }
    }

    function openAuthModal() {
      getElement("modal-auth")?.classList.add("open");
      renderAuthState();
    }

    function setAuthMode(mode) {
      state.authMode = mode === "signup" ? "signup" : "login";
      getElement("auth-mode-login")?.classList.toggle("active", state.authMode === "login");
      getElement("auth-mode-signup")?.classList.toggle("active", state.authMode === "signup");
      renderAuthState();
    }

    async function submitAuthForm() {
      if (!state.isSupabaseEnabled || !state.client) {
        showToast("Configure o Supabase antes de entrar.");
        return;
      }

      const email = getElement("auth-email")?.value.trim();
      const password = getElement("auth-password")?.value;

      if (!email || !password) {
        showToast("Informe e-mail e senha.");
        return;
      }

      state.loading = true;
      renderAuthState();

      const action = state.authMode === "login"
        ? state.client.auth.signInWithPassword({email, password})
        : state.client.auth.signUp({
          email,
          password,
          options: {emailRedirectTo: getAuthRedirectUrl()},
        });

      const {data, error} = await action;
      state.loading = false;

      if (error) {
        console.error(error);
        showToast(error.message || "Falha no acesso.");
        renderAuthState();
        return;
      }

      syncSupabaseSession(data.session);
      await loadOrganizations();
      showToast(state.authMode === "login" ? "Login realizado." : "Conta criada.");
    }

    async function resendConfirmationEmail() {
      if (!state.isSupabaseEnabled || !state.client) {
        showToast("Configure o Supabase antes de reenviar.");
        return;
      }

      const email = getElement("auth-email")?.value.trim();

      if (!email) {
        showToast("Informe o e-mail para reenviar a confirmacao.");
        return;
      }

      state.loading = true;
      renderAuthState();

      const {error} = await state.client.auth.resend({
        type: "signup",
        email,
        options: {emailRedirectTo: getAuthRedirectUrl()},
      });

      state.loading = false;

      if (error) {
        console.error(error);
        showToast(error.message || "Nao foi possivel reenviar.");
        renderAuthState();
        return;
      }

      showToast("E-mail de confirmacao reenviado.");
      renderAuthState();
    }

    async function signOutAuth() {
      if (!state.client) return;
      const {error} = await state.client.auth.signOut();
      if (error) {
        showToast("Nao foi possivel sair.");
        return;
      }
      syncSupabaseSession(null);
      closeModal("modal-auth");
      showToast("Sessao encerrada.");
    }

    function selectOrganization(id) {
      state.activeOrganizationId = id;
      renderAuthState();
      dispatchWorkspaceChange();
      showToast("Workspace selecionado.");
    }

    return {
      getAuthState,
      initAuthSession,
      loadOrganizations,
      openAuthModal,
      renderAuthState,
      resendConfirmationEmail,
      selectOrganization,
      setAuthMode,
      signOutAuth,
      submitAuthForm,
      syncSupabaseSession,
      dispatchWorkspaceChange,
      getAuthRedirectUrl,
    };
  }

  window.FichaTecAuthSession = {createAuthSessionModule};
})();
