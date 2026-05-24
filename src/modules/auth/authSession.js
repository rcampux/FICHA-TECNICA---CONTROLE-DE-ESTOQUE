(function exposeAuthSessionModule() {
  function createAuthSessionModule(deps) {
    const {
      closeModal,
      config,
      createSupabaseClient,
      enterAppView,
      exitToStartView,
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
      pendingVerificationEmail: "",
      session: null,
      user: null,
    };
    let authFlipMidpointTimer = null;
    let authFlipCleanupTimer = null;
    let authFlipAnimation = null;
    let authModeTabsBound = false;
    let pendingAuthMode = null;

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

    function dispatchSignedOut() {
      if (!state.isSupabaseEnabled) return;
      window.dispatchEvent(new CustomEvent("fichatec:auth-signed-out"));
    }

    function getAuthRedirectUrl() {
      return `${window.location.origin}${window.location.pathname}`;
    }

    function getPasswordValidation(password) {
      return {
        minLength: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
      };
    }

    function isStrongPassword(password) {
      return Object.values(getPasswordValidation(password)).every(Boolean);
    }

    async function ensureSupabaseClient() {
      if (!state.isSupabaseEnabled) return null;
      if (!state.client) {
        state.client = await createSupabaseClient();
      }
      return state.client;
    }

    function showInitialUserScreen() {
      closeModal("modal-auth");
      if (typeof enterAppView === "function") {
        enterAppView();
        return;
      }
      if (typeof window.showPage === "function") window.showPage("ficha", "nav-ficha");
    }

    function handleAuthKeydown(event) {
      if (event.key !== "Enter" || state.loading) return;
      event.preventDefault();
      submitAuthForm();
    }

    function clearAuthInputs(options = {}) {
      const emailInput = getElement("auth-email");
      const passwordInput = getElement("auth-password");
      const passwordIcon = getElement("auth-password-toggle-icon");

      if (emailInput && options.clearEmail) emailInput.value = "";
      if (passwordInput) {
        passwordInput.value = "";
        passwordInput.type = "password";
      }
      if (passwordIcon) passwordIcon.textContent = "visibility";

      renderPasswordFeedback();
    }

    function syncAuthModeTabs(mode) {
      const nextMode = mode === "signup" ? "signup" : "login";
      getElement("auth-mode-login")?.classList.toggle("active", nextMode === "login");
      getElement("auth-mode-signup")?.classList.toggle("active", nextMode === "signup");
    }

    function bindAuthModeTabs() {
      if (authModeTabsBound) return;
      const loginButton = getElement("auth-mode-login");
      const signupButton = getElement("auth-mode-signup");
      if (!loginButton || !signupButton) return;

      document.addEventListener("click", (event) => {
        const modeButton = event.target.closest?.("[data-auth-mode]");
        if (!modeButton) return;

        event.preventDefault();
        event.stopPropagation();
        setAuthMode(modeButton.dataset.authMode);
      }, true);
      authModeTabsBound = true;
    }

    function applyAuthMode(mode) {
      state.authMode = mode === "signup" ? "signup" : "login";
      state.pendingVerificationEmail = "";
      clearAuthInputs({clearEmail: true});
      syncAuthModeTabs(state.authMode);
      renderAuthState();
      renderPasswordFeedback();
    }

    function resetAuthCardFlip(card, content) {
      if (authFlipMidpointTimer) {
        window.clearTimeout(authFlipMidpointTimer);
        authFlipMidpointTimer = null;
      }
      if (authFlipCleanupTimer) {
        window.clearTimeout(authFlipCleanupTimer);
        authFlipCleanupTimer = null;
      }
      if (authFlipAnimation) {
        authFlipAnimation.cancel();
        authFlipAnimation = null;
      }
      card?.classList.remove(
        "auth-card-flip",
        "auth-card-flip-login",
        "auth-card-flip-signup",
        "auth-card-flip-out",
        "auth-card-flip-in",
      );
      content?.classList.remove("auth-content-out", "auth-content-in");
      if (card) card.style.height = "";
      pendingAuthMode = null;
    }

    function runAuthFlipStep(card, keyframes) {
      if (typeof card.animate !== "function") return null;
      authFlipAnimation = card.animate(keyframes, {
        duration: 330,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        fill: "forwards",
      });
      return authFlipAnimation.finished.catch(() => null);
    }

    async function animateAuthCardFlip(mode) {
      const modal = getElement("modal-auth");
      const card = modal?.querySelector(".auth-modal");
      const content = getElement("auth-card-content");
      if (!modal?.classList.contains("open") || !card || !content) {
        applyAuthMode(mode);
        pendingAuthMode = null;
        return;
      }

      const shouldReduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (shouldReduceMotion) {
        applyAuthMode(mode);
        pendingAuthMode = null;
        return;
      }

      resetAuthCardFlip(card, content);
      pendingAuthMode = mode === "signup" ? "signup" : "login";
      syncAuthModeTabs(mode);
      const flipAngle = mode === "signup" ? -92 : 92;
      const canUseWebAnimation = typeof card.animate === "function";
      card.style.height = `${card.getBoundingClientRect().height}px`;
      void card.offsetWidth;
      card.classList.add(
        "auth-card-flip",
        mode === "signup" ? "auth-card-flip-signup" : "auth-card-flip-login",
      );
      if (!canUseWebAnimation) card.classList.add("auth-card-flip-out");
      content.classList.add("auth-content-out");

      const firstHalf = runAuthFlipStep(card, [
        {opacity: 1, transform: "rotateY(0deg) translateY(0) scale(1)"},
        {opacity: 0.96, transform: `rotateY(${flipAngle}deg) translateY(-2px) scale(0.992)`},
      ]);

      if (firstHalf) {
        await firstHalf;
        if (pendingAuthMode !== mode) return;
        applyAuthMode(mode);
        card.classList.remove("auth-card-flip-out");
        if (!canUseWebAnimation) card.classList.add("auth-card-flip-in");
        await new Promise((resolve) => window.requestAnimationFrame(resolve));
        card.style.height = `${card.scrollHeight}px`;
        content.classList.remove("auth-content-out");
        content.classList.add("auth-content-in");
        const secondHalf = runAuthFlipStep(card, [
          {opacity: 0.96, transform: `rotateY(${-flipAngle}deg) translateY(-2px) scale(0.992)`},
          {opacity: 1, transform: "rotateY(0deg) translateY(0) scale(1)"},
        ]);
        if (secondHalf) await secondHalf;
        if (pendingAuthMode === mode) resetAuthCardFlip(card, content);
        return;
      }

      authFlipMidpointTimer = window.setTimeout(() => {
        if (pendingAuthMode !== mode) return;
        applyAuthMode(mode);
        card.classList.remove("auth-card-flip-out");
        card.classList.add("auth-card-flip-in");
        window.requestAnimationFrame(() => {
          card.style.height = `${card.scrollHeight}px`;
          content.classList.remove("auth-content-out");
          content.classList.add("auth-content-in");
        });
      }, 330);

      authFlipCleanupTimer = window.setTimeout(() => resetAuthCardFlip(card, content), 720);
    }

    async function initAuthSession() {
      if (state.initialized) return getAuthState();
      state.initialized = true;

      if (!state.isSupabaseEnabled) {
        renderAuthState();
        return getAuthState();
      }

      try {
        state.client = await ensureSupabaseClient();
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
        syncSupabaseSession(null);
        showToast("Nao foi possivel validar a sessao. Entre novamente.");
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
        dispatchSignedOut();
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
      const verificationWrap = getElement("auth-verification-wrap");
      const verificationEmail = getElement("auth-verification-email");
      const tabs = getElement("auth-mode-tabs");
      const submitButton = getElement("auth-submit-btn");
      const authModal = getElement("modal-auth");
      const modalTitle = getElement("auth-modal-title");
      const stateIcon = getElement("auth-state-icon");

      bindAuthModeTabs();

      if (!statusLabel || !stateTitle || !stateDescription) return;

      authModal?.classList.toggle("auth-gate", !state.user);
      authModal?.classList.toggle("auth-mode-login", state.authMode === "login");
      authModal?.classList.toggle("auth-mode-signup", state.authMode === "signup");
      if (modalTitle) {
        modalTitle.textContent = state.user
          ? "Workspace"
          : state.authMode === "signup"
            ? "Criar nova conta"
            : "Entrar no FichaTec";
      }
      if (stateIcon) {
        stateIcon.textContent = state.user
          ? "verified_user"
          : state.pendingVerificationEmail
            ? "mark_email_read"
            : state.authMode === "signup"
              ? "person_add"
              : "lock_open";
      }

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
      formWrap.style.display = state.user || state.pendingVerificationEmail ? "none" : "block";
      workspaceWrap.style.display = state.user ? "block" : "none";
      if (verificationWrap) {
        verificationWrap.style.display = !state.user && state.pendingVerificationEmail ? "block" : "none";
      }
      if (verificationEmail) verificationEmail.textContent = state.pendingVerificationEmail;

      stateTitle.textContent = state.user
        ? "Sessao ativa"
        : state.pendingVerificationEmail
          ? "Verifique seu e-mail"
          : state.authMode === "signup"
            ? "Cadastro Supabase"
            : "Login Supabase";
      stateDescription.textContent = state.user
        ? "Escolha o workspace de trabalho antes de salvar dados remotos."
        : state.pendingVerificationEmail
          ? "Enviamos um link de confirmacao. Abra seu e-mail e confirme a conta para voltar ao app."
          : state.authMode === "signup"
            ? "Crie uma conta com senha forte para proteger suas fichas tecnicas."
            : "Entre para sincronizar dados com seguranca.";

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

      renderPasswordFeedback();
    }

    function openAuthModal() {
      getElement("modal-auth")?.classList.add("open");
      renderAuthState();
    }

    function renderPasswordFeedback() {
      const password = getElement("auth-password")?.value || "";
      const feedback = getElement("auth-password-feedback");
      if (!feedback) return;

      if (state.authMode !== "signup") {
        feedback.innerHTML = "";
        feedback.style.display = "none";
        return;
      }

      feedback.style.display = "flex";

      const rules = [
        ["minLength", "8+ caracteres"],
        ["uppercase", "maiuscula"],
        ["lowercase", "minuscula"],
        ["number", "numero"],
        ["special", "especial"],
      ];
      const validation = getPasswordValidation(password);

      feedback.innerHTML = rules.map(([key, label]) => `
        <span class="${validation[key] ? "valid" : ""}">
          <span class="material-symbols-rounded">${validation[key] ? "check_circle" : "radio_button_unchecked"}</span>
          ${label}
        </span>
      `).join("");
    }

    function togglePasswordVisibility() {
      const input = getElement("auth-password");
      const icon = getElement("auth-password-toggle-icon");
      if (!input) return;

      const shouldShow = input.type === "password";
      input.type = shouldShow ? "text" : "password";
      if (icon) icon.textContent = shouldShow ? "visibility_off" : "visibility";
    }

    function setAuthMode(mode) {
      const nextMode = mode === "signup" ? "signup" : "login";
      if (state.authMode === nextMode || pendingAuthMode === nextMode) return;
      animateAuthCardFlip(nextMode);
    }

    async function submitAuthForm() {
      let client = null;
      try {
        client = await ensureSupabaseClient();
      } catch (error) {
        console.error(error);
      }

      if (!state.isSupabaseEnabled || !client) {
        showToast("Configure o Supabase antes de entrar.");
        return;
      }

      const email = getElement("auth-email")?.value.trim();
      const password = getElement("auth-password")?.value;

      if (!email || !password) {
        showToast("Informe e-mail e senha.");
        return;
      }

      if (state.authMode === "signup" && !isStrongPassword(password)) {
        showToast("Use senha forte: 8+ caracteres, maiuscula, minuscula, numero e especial.");
        renderPasswordFeedback();
        return;
      }

      state.loading = true;
      renderAuthState();

      const action = state.authMode === "login"
        ? client.auth.signInWithPassword({email, password})
        : client.auth.signUp({
          email,
          password,
          options: {emailRedirectTo: getAuthRedirectUrl()},
        });

      const {data, error} = await action;
      state.loading = false;

      if (error) {
        console.error(error);
        clearAuthInputs();
        showToast(error.message || "Falha no acesso.");
        renderAuthState();
        return;
      }

      clearAuthInputs();
      if (state.authMode === "signup" && !data.session) {
        state.pendingVerificationEmail = email;
        renderAuthState();
        showToast("Conta criada. Verifique seu e-mail para ativar o acesso.");
        return;
      }

      state.pendingVerificationEmail = "";
      syncSupabaseSession(data.session);
      await loadOrganizations();
      showInitialUserScreen();
      showToast(state.authMode === "login" ? "Login realizado." : "Conta criada e login realizado.");
    }

    async function resendConfirmationEmail() {
      let client = null;
      try {
        client = await ensureSupabaseClient();
      } catch (error) {
        console.error(error);
      }

      if (!state.isSupabaseEnabled || !client) {
        showToast("Configure o Supabase antes de reenviar.");
        return;
      }

      const email = state.pendingVerificationEmail || getElement("auth-email")?.value.trim();

      if (!email) {
        showToast("Informe o e-mail para reenviar a confirmacao.");
        return;
      }

      state.loading = true;
      renderAuthState();

      const {error} = await client.auth.resend({
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

    function backToAuthForm() {
      state.pendingVerificationEmail = "";
      setAuthMode("login");
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
      if (typeof exitToStartView === "function") await exitToStartView();
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
      getPasswordValidation,
      backToAuthForm,
      clearAuthInputs,
      handleAuthKeydown,
      initAuthSession,
      isStrongPassword,
      loadOrganizations,
      openAuthModal,
      renderAuthState,
      renderPasswordFeedback,
      resendConfirmationEmail,
      selectOrganization,
      setAuthMode,
      signOutAuth,
      submitAuthForm,
      syncSupabaseSession,
      dispatchWorkspaceChange,
      getAuthRedirectUrl,
      togglePasswordVisibility,
    };
  }

  window.FichaTecAuthSession = {createAuthSessionModule};
})();
