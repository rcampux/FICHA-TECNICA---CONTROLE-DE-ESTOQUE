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

    const COMMON_PASSWORDS = new Set([
      "12345678",
      "123456789",
      "1234567890",
      "password",
      "senha123",
      "qwerty123",
      "admin123",
    ]);
    const AUTH_MODES = new Set(["login", "signup", "forgot", "reset"]);
    const PASSWORD_RECOVERY_STORAGE_KEY = "fichatec:password-recovery";
    const PASSWORD_RECOVERY_MAX_AGE_MS = 60 * 60 * 1000;

    const state = {
      activeOrganizationId: null,
      authMessage: "",
      authMessageTone: "info",
      authMode: "login",
      authSubscription: null,
      client: null,
      initialized: false,
      isSupabaseEnabled: Boolean(config?.enabled),
      loading: false,
      organizations: [],
      pendingRecoveryEmail: "",
      pendingVerificationEmail: "",
      session: null,
      user: null,
    };

    function getElement(id) {
      return document.getElementById(id);
    }

    function setPasswordRecoveryMarker(isActive) {
      try {
        if (isActive) {
          window.sessionStorage.setItem(PASSWORD_RECOVERY_STORAGE_KEY, String(Date.now()));
        } else {
          window.sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
        }
      } catch (error) {
        console.warn("Nao foi possivel atualizar o estado local de recuperacao.", error);
      }
    }

    function hasPendingPasswordRecovery() {
      try {
        const startedAt = Number(window.sessionStorage.getItem(PASSWORD_RECOVERY_STORAGE_KEY));
        const isCurrent = Number.isFinite(startedAt)
          && startedAt > 0
          && Date.now() - startedAt < PASSWORD_RECOVERY_MAX_AGE_MS;
        if (!isCurrent) window.sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
        return isCurrent;
      } catch (error) {
        console.warn("Nao foi possivel ler o estado local de recuperacao.", error);
        return false;
      }
    }

    function getAuthState() {
      return {
        activeOrganizationId: state.activeOrganizationId,
        authMode: state.authMode,
        hasSession: Boolean(state.user),
        isAuthenticated: Boolean(state.user) && state.authMode !== "reset",
        isBusy: state.loading,
        isPasswordRecovery: state.authMode === "reset",
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
      try {
        const redirectUrl = new URL(window.location.href);
        redirectUrl.search = "";
        redirectUrl.hash = "";
        return redirectUrl.toString();
      } catch (_error) {
        return `${window.location.origin}${window.location.pathname}`;
      }
    }

    function getPasswordValidation(password) {
      const value = String(password ?? "");
      return {
        minLength: value.length >= 10,
        maxLength: value.length > 0 && value.length <= 72,
        uppercase: /\p{Lu}/u.test(value),
        lowercase: /\p{Ll}/u.test(value),
        number: /\p{N}/u.test(value),
        special: /[^\p{L}\p{N}\s]/u.test(value),
        notCommon: Boolean(value) && !COMMON_PASSWORDS.has(value.toLocaleLowerCase("pt-BR")),
      };
    }

    function isStrongPassword(password) {
      return Object.values(getPasswordValidation(password)).every(Boolean);
    }

    function formatAuthError(error, fallbackMessage = "Nao foi possivel concluir. Tente novamente.") {
      const code = String(error?.code || "").toLowerCase();
      const message = String(error?.message || "").toLowerCase();

      if (code.includes("invalid_credentials") || message.includes("invalid login credentials")) {
        return "E-mail ou senha incorretos.";
      }
      if (code.includes("email_not_confirmed") || message.includes("email not confirmed")) {
        return "Confirme seu e-mail antes de entrar.";
      }
      if (code.includes("user_already_exists") || message.includes("already registered")) {
        return "Ja existe uma conta com este e-mail.";
      }
      if (code.includes("signup_disabled") || message.includes("signups not allowed")) {
        return "Novos cadastros estao temporariamente indisponiveis.";
      }
      if (code.includes("over_email_send_rate_limit") || message.includes("rate limit")) {
        return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
      }
      if (code.includes("weak_password") || message.includes("password should")) {
        return "A senha ainda nao atende aos requisitos de seguranca.";
      }
      if (code.includes("same_password") || message.includes("same password")) {
        return "A nova senha deve ser diferente da senha atual.";
      }
      if (
        code.includes("otp_expired")
        || code.includes("flow_state_expired")
        || message.includes("expired")
        || message.includes("invalid token")
      ) {
        return "Este link expirou ou ja foi usado. Solicite um novo link.";
      }
      if (message.includes("failed to fetch") || message.includes("network")) {
        return "Sem conexao com o servidor. Verifique sua internet e tente novamente.";
      }

      return fallbackMessage;
    }

    function setAuthBusy(isBusy) {
      state.loading = Boolean(isBusy);
      renderAuthState();
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
      const passwordConfirmInput = getElement("auth-password-confirm");
      const passwordIcon = getElement("auth-password-toggle-icon");
      const passwordConfirmIcon = getElement("auth-password-confirm-toggle-icon");

      if (emailInput && options.clearEmail) emailInput.value = "";
      if (passwordInput) {
        passwordInput.value = "";
        passwordInput.type = "password";
      }
      if (passwordConfirmInput) {
        passwordConfirmInput.value = "";
        passwordConfirmInput.type = "password";
      }
      if (passwordIcon) passwordIcon.textContent = "visibility";
      if (passwordConfirmIcon) passwordConfirmIcon.textContent = "visibility";

      renderPasswordFeedback();
    }

    function animateAuthViewChange() {
      const modal = getElement("modal-auth");
      const card = modal?.querySelector(".auth-modal");
      if (!modal?.classList.contains("open") || !card) return;
      card.classList.remove("auth-view-change");
      void card.offsetWidth;
      card.classList.add("auth-view-change");
      window.setTimeout(() => card.classList.remove("auth-view-change"), 320);
    }

    function handlePasswordRecovery(session) {
      setPasswordRecoveryMarker(true);
      state.authMode = "reset";
      state.authMessage = "Link validado. Defina uma nova senha para continuar.";
      state.authMessageTone = "info";
      state.pendingRecoveryEmail = session?.user?.email || "";
      state.pendingVerificationEmail = "";
      syncSupabaseSession(session);

      try {
        window.history.replaceState({}, document.title, getAuthRedirectUrl());
      } catch (error) {
        console.warn("Nao foi possivel limpar a URL de recuperacao.", error);
      }

      openAuthModal();
      window.setTimeout(() => getElement("auth-password")?.focus(), 80);
    }

    async function initAuthSession() {
      if (state.initialized) return getAuthState();
      state.initialized = true;

      if (!state.isSupabaseEnabled) {
        renderAuthState();
        return getAuthState();
      }

      try {
        const recoveryType = new URLSearchParams(window.location.search).get("type")
          || new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type");
        if (recoveryType === "recovery") setPasswordRecoveryMarker(true);
        if (recoveryType === "recovery" || hasPendingPasswordRecovery()) state.authMode = "reset";

        state.client = await ensureSupabaseClient();
        const {data: listenerData} = state.client.auth.onAuthStateChange((event, session) => {
          if (event === "PASSWORD_RECOVERY") {
            handlePasswordRecovery(session);
            return;
          }

          if (event === "SIGNED_OUT") {
            setPasswordRecoveryMarker(false);
            state.authMode = "login";
            state.authMessage = "";
            state.pendingRecoveryEmail = "";
          }

          syncSupabaseSession(session);
          if (state.authMode !== "reset") {
            void loadOrganizations().catch((error) => console.error(error));
          }
        });
        state.authSubscription = listenerData?.subscription || null;

        const {data, error} = await state.client.auth.getSession();
        if (error) throw error;
        syncSupabaseSession(data.session);

        if (state.authMode === "reset" && !data.session) {
          setPasswordRecoveryMarker(false);
          state.authMode = "forgot";
          state.authMessage = "Este link expirou ou ja foi usado. Solicite um novo link.";
          state.authMessageTone = "error";
        }

        if (state.authMode !== "reset") await loadOrganizations();
      } catch (error) {
        console.error(error);
        syncSupabaseSession(null);
        if (state.authMode === "reset") setPasswordRecoveryMarker(false);
        state.authMessage = state.authMode === "reset"
          ? "Nao foi possivel validar este link. Solicite uma nova recuperacao de senha."
          : "";
        state.authMessageTone = "error";
        showToast(state.authMode === "reset"
          ? "Link de recuperacao invalido ou expirado."
          : "Nao foi possivel validar a sessao. Entre novamente.");
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
      if (!state.client || !state.user || state.authMode === "reset") {
        if (!state.user) state.organizations = [];
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
      const emailInput = getElement("auth-email");
      const passwordInput = getElement("auth-password");
      const passwordConfirmInput = getElement("auth-password-confirm");
      const emailGroup = getElement("auth-email-group") || emailInput?.closest(".input-group");
      const passwordGroup = getElement("auth-password-group") || passwordInput?.closest(".input-group");
      const passwordConfirmGroup = getElement("auth-password-confirm-group")
        || passwordConfirmInput?.closest(".input-group");
      const forgotButton = getElement("auth-forgot-btn");
      const backButton = getElement("auth-back-login-btn");
      const resendButton = getElement("auth-resend-confirm-btn");
      const inlineMessage = getElement("auth-inline-message");
      const isResetMode = state.authMode === "reset";
      const showWorkspace = Boolean(state.user) && !isResetMode;
      const showVerification = !state.user && Boolean(state.pendingVerificationEmail);
      const showForm = !showWorkspace && !showVerification;

      const shouldGateAccess = state.isSupabaseEnabled && !showWorkspace;
      authModal?.classList.toggle("auth-gate", shouldGateAccess);
      AUTH_MODES.forEach((mode) => {
        authModal?.classList.toggle(`auth-mode-${mode}`, state.authMode === mode);
      });
      authModal?.classList.toggle("is-busy", state.loading);
      authModal?.setAttribute("aria-busy", String(state.loading));

      const modeCopy = {
        login: {
          title: "Entrar no FichaTec",
          stateTitle: "Bem-vindo de volta",
          description: "Acesse suas fichas, receitas e estoques.",
          button: '<span class="material-symbols-rounded" aria-hidden="true">login</span> Entrar',
        },
        signup: {
          title: "Criar nova conta",
          stateTitle: "Comece sua cozinha digital",
          description: "Crie uma conta segura para organizar sua operacao.",
          button: '<span class="material-symbols-rounded" aria-hidden="true">person_add</span> Criar conta',
        },
        forgot: {
          title: "Recuperar acesso",
          stateTitle: state.pendingRecoveryEmail ? "Confira seu e-mail" : "Esqueceu sua senha?",
          description: state.pendingRecoveryEmail
            ? `Se houver uma conta para ${state.pendingRecoveryEmail}, o link seguro chegara em instantes.`
            : "Informe seu e-mail para receber um link seguro de redefinicao.",
          button: `<span class="material-symbols-rounded" aria-hidden="true">${state.pendingRecoveryEmail ? "refresh" : "outgoing_mail"}</span> ${state.pendingRecoveryEmail ? "Reenviar link" : "Enviar link"}`,
        },
        reset: {
          title: "Criar nova senha",
          stateTitle: "Proteja sua conta",
          description: "Escolha uma senha nova e forte para voltar ao FichaTec.",
          button: '<span class="material-symbols-rounded" aria-hidden="true">lock_reset</span> Salvar nova senha',
        },
      };
      const copy = modeCopy[state.authMode] || modeCopy.login;

      if (modalTitle) modalTitle.textContent = showWorkspace ? "Workspace" : copy.title;
      statusButton?.classList.toggle("is-authenticated", showWorkspace);
      if (statusLabel) {
        statusLabel.textContent = showWorkspace
          ? state.user.email
          : isResetMode
            ? "Redefinir senha"
            : state.isSupabaseEnabled
              ? "Entrar"
              : "Modo local";
      }
      statusButton?.setAttribute("aria-label", showWorkspace
        ? `Conta conectada: ${state.user?.email || "usuario"}`
        : isResetMode
          ? "Redefinir senha"
          : state.isSupabaseEnabled
            ? "Abrir acesso a conta"
            : "Dados salvos em modo local");

      if (!state.isSupabaseEnabled) {
        if (stateTitle) stateTitle.textContent = "Prototipo local";
        if (stateDescription) {
          stateDescription.textContent = "Seus dados ficam salvos neste navegador ate ligarmos o Supabase.";
        }
        if (formWrap) formWrap.style.display = "none";
        if (workspaceWrap) workspaceWrap.style.display = "none";
        if (verificationWrap) verificationWrap.style.display = "none";
        if (tabs) tabs.style.display = "none";
        if (localWrap) localWrap.style.display = "block";
        if (inlineMessage) inlineMessage.style.display = "none";
        return;
      }

      if (localWrap) localWrap.style.display = "none";
      if (tabs) {
        tabs.style.display = !state.user && ["login", "signup"].includes(state.authMode) ? "grid" : "none";
      }
      if (formWrap) formWrap.style.display = showForm ? "block" : "none";
      if (workspaceWrap) workspaceWrap.style.display = showWorkspace ? "block" : "none";
      if (verificationWrap) verificationWrap.style.display = showVerification ? "block" : "none";
      if (verificationEmail) verificationEmail.textContent = state.pendingVerificationEmail;

      if (emailGroup) emailGroup.style.display = ["login", "signup", "forgot"].includes(state.authMode) ? "block" : "none";
      if (passwordGroup) passwordGroup.style.display = ["login", "signup", "reset"].includes(state.authMode) ? "block" : "none";
      if (passwordConfirmGroup) passwordConfirmGroup.style.display = isResetMode ? "block" : "none";
      if (forgotButton) forgotButton.style.display = state.authMode === "login" ? "inline-flex" : "none";
      if (backButton) backButton.style.display = ["forgot", "reset"].includes(state.authMode) ? "inline-flex" : "none";
      if (backButton) {
        backButton.innerHTML = state.authMode === "reset"
          ? '<span class="material-symbols-rounded" aria-hidden="true">restart_alt</span> Solicitar novo link'
          : '<span class="material-symbols-rounded" aria-hidden="true">arrow_back</span> Voltar para entrar';
      }
      if (resendButton) resendButton.style.display = "none";

      getElement("auth-mode-login")?.classList.toggle("active", state.authMode === "login");
      getElement("auth-mode-signup")?.classList.toggle("active", state.authMode === "signup");
      getElement("auth-mode-login")?.setAttribute("aria-pressed", String(state.authMode === "login"));
      getElement("auth-mode-signup")?.setAttribute("aria-pressed", String(state.authMode === "signup"));

      if (stateTitle) {
        stateTitle.textContent = showWorkspace
          ? "Sessao ativa"
          : showVerification
            ? "Verifique seu e-mail"
            : copy.stateTitle;
      }
      if (stateDescription) {
        stateDescription.textContent = showWorkspace
          ? "Escolha o workspace de trabalho antes de salvar dados remotos."
          : showVerification
            ? "Enviamos um link de confirmacao. Abra seu e-mail e confirme a conta para voltar ao app."
            : copy.description;
      }

      if (inlineMessage) {
        inlineMessage.textContent = state.authMessage;
        inlineMessage.style.display = state.authMessage ? "flex" : "none";
        inlineMessage.dataset.tone = state.authMessageTone;
        inlineMessage.setAttribute("role", state.authMessageTone === "error" ? "alert" : "status");
        inlineMessage.setAttribute("aria-live", state.authMessageTone === "error" ? "assertive" : "polite");
      }

      if (emailInput) {
        emailInput.disabled = state.loading;
        emailInput.autocomplete = "email";
      }
      if (passwordInput) {
        passwordInput.disabled = state.loading;
        passwordInput.autocomplete = state.authMode === "login" ? "current-password" : "new-password";
        passwordInput.placeholder = state.authMode === "login" ? "Sua senha" : "Nova senha forte";
      }
      if (passwordConfirmInput) {
        passwordConfirmInput.disabled = state.loading;
        passwordConfirmInput.autocomplete = "new-password";
      }

      [
        "auth-mode-login",
        "auth-mode-signup",
        "auth-forgot-btn",
        "auth-back-login-btn",
        "auth-resend-confirm-btn",
      ].forEach((id) => {
        const control = getElement(id);
        if (control) control.disabled = state.loading;
      });
      authModal?.querySelectorAll(".password-toggle").forEach((control) => {
        control.disabled = state.loading;
      });

      if (submitButton) {
        submitButton.innerHTML = state.loading
          ? '<span class="material-symbols-rounded auth-spinner" aria-hidden="true">progress_activity</span> Aguarde'
          : copy.button;
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
      const confirmation = getElement("auth-password-confirm")?.value || "";
      const feedback = getElement("auth-password-feedback");
      if (!feedback) return;

      if (!["signup", "reset"].includes(state.authMode)) {
        feedback.innerHTML = "";
        feedback.style.display = "none";
        return;
      }

      feedback.style.display = "flex";

      const rules = [
        ["minLength", "10+ caracteres"],
        ["maxLength", "ate 72 caracteres"],
        ["uppercase", "maiuscula"],
        ["lowercase", "minuscula"],
        ["number", "numero"],
        ["special", "simbolo"],
        ["notCommon", "nao obvia"],
      ];
      const validation = getPasswordValidation(password);

      feedback.innerHTML = rules.map(([key, label]) => `
        <span class="${validation[key] ? "valid" : ""}">
          <span class="material-symbols-rounded">${validation[key] ? "check_circle" : "radio_button_unchecked"}</span>
          ${label}
        </span>
      `).join("");

      if (state.authMode === "reset") {
        const matches = Boolean(confirmation) && password === confirmation;
        feedback.insertAdjacentHTML("beforeend", `
          <span class="${matches ? "valid" : ""}">
            <span class="material-symbols-rounded">${matches ? "check_circle" : "radio_button_unchecked"}</span>
            senhas iguais
          </span>
        `);
      }
    }

    function togglePasswordVisibility() {
      const input = getElement("auth-password");
      const icon = getElement("auth-password-toggle-icon");
      if (!input) return;

      const shouldShow = input.type === "password";
      input.type = shouldShow ? "text" : "password";
      if (icon) icon.textContent = shouldShow ? "visibility_off" : "visibility";
    }

    function togglePasswordConfirmationVisibility() {
      const input = getElement("auth-password-confirm");
      const icon = getElement("auth-password-confirm-toggle-icon");
      if (!input) return;

      const shouldShow = input.type === "password";
      input.type = shouldShow ? "text" : "password";
      if (icon) icon.textContent = shouldShow ? "visibility_off" : "visibility";
    }

    function setAuthMode(mode) {
      const nextMode = AUTH_MODES.has(mode) ? mode : "login";
      state.authMode = nextMode;
      state.authMessage = "";
      state.authMessageTone = "info";
      state.pendingVerificationEmail = "";
      if (nextMode !== "forgot") state.pendingRecoveryEmail = "";

      clearAuthInputs();
      renderAuthState();
      animateAuthViewChange();

      window.setTimeout(() => {
        const focusTarget = nextMode === "reset" ? getElement("auth-password") : getElement("auth-email");
        focusTarget?.focus();
      }, 80);
    }

    async function handleAuthBack() {
      if (state.loading) return false;
      if (state.authMode !== "reset") {
        setAuthMode("login");
        return true;
      }

      let client = null;
      try {
        client = await ensureSupabaseClient();
      } catch (error) {
        console.error(error);
      }
      if (!client) {
        showToast("Nao foi possivel encerrar a recuperacao agora.");
        return false;
      }

      setAuthBusy(true);
      try {
        const {error} = await client.auth.signOut({scope:"local"});
        if (error) throw error;

        setPasswordRecoveryMarker(false);
        state.authMode = "forgot";
        state.pendingRecoveryEmail = "";
        state.pendingVerificationEmail = "";
        state.authMessage = "Solicite um novo link seguro para redefinir sua senha.";
        state.authMessageTone = "info";
        syncSupabaseSession(null);
        clearAuthInputs({clearEmail: true});
        animateAuthViewChange();
        window.setTimeout(() => getElement("auth-email")?.focus(), 80);
        return true;
      } catch (error) {
        console.error(error);
        state.authMessage = formatAuthError(error, "Nao foi possivel sair desta recuperacao. Tente novamente.");
        state.authMessageTone = "error";
        showToast(state.authMessage);
        return false;
      } finally {
        setAuthBusy(false);
      }
    }

    async function submitAuthForm() {
      if (state.loading) return;
      if (state.authMode === "forgot") {
        await requestPasswordReset();
        return;
      }
      if (state.authMode === "reset") {
        await updatePassword();
        return;
      }

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

      const email = getElement("auth-email")?.value.trim() || "";
      const password = getElement("auth-password")?.value || "";
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!isValidEmail || !password) {
        showToast(isValidEmail ? "Informe sua senha." : "Informe um e-mail valido.");
        return;
      }

      if (state.authMode === "signup" && !isStrongPassword(password)) {
        showToast("Use 10+ caracteres com maiuscula, minuscula, numero e simbolo.");
        renderPasswordFeedback();
        return;
      }

      setAuthBusy(true);

      try {
        const action = state.authMode === "login"
          ? client.auth.signInWithPassword({email, password})
          : client.auth.signUp({
            email,
            password,
            options: {emailRedirectTo: getAuthRedirectUrl()},
          });

        const {data, error} = await action;
        if (error) throw error;

        clearAuthInputs();
        if (state.authMode === "signup" && !data.session) {
          state.pendingVerificationEmail = email;
          state.authMessage = "";
          renderAuthState();
          showToast("Conta criada. Verifique seu e-mail para ativar o acesso.");
          return;
        }

        state.pendingVerificationEmail = "";
        state.authMessage = "";
        syncSupabaseSession(data.session);
        await loadOrganizations();
        showInitialUserScreen();
        showToast(state.authMode === "login" ? "Login realizado." : "Conta criada e login realizado.");
      } catch (error) {
        console.error(error);
        clearAuthInputs();
        state.authMessage = formatAuthError(error, "Nao foi possivel acessar sua conta.");
        state.authMessageTone = "error";
        showToast(state.authMessage);
      } finally {
        setAuthBusy(false);
      }
    }

    async function requestPasswordReset(emailValue) {
      if (state.loading) return false;

      let client = null;
      try {
        client = await ensureSupabaseClient();
      } catch (error) {
        console.error(error);
      }

      if (!state.isSupabaseEnabled || !client) {
        showToast("Configure o Supabase antes de recuperar a senha.");
        return false;
      }

      const email = String(emailValue ?? getElement("auth-email")?.value ?? "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast("Informe um e-mail valido para receber o link.");
        getElement("auth-email")?.focus();
        return false;
      }

      setAuthBusy(true);
      try {
        const {error} = await client.auth.resetPasswordForEmail(email, {
          redirectTo: getAuthRedirectUrl(),
        });
        if (error) throw error;

        state.authMode = "forgot";
        state.pendingRecoveryEmail = email;
        state.authMessage = "Se a conta existir, enviaremos um link seguro. Confira tambem o spam.";
        state.authMessageTone = "success";
        showToast("Pedido enviado. Confira seu e-mail.");
        return true;
      } catch (error) {
        console.error(error);
        state.authMessage = formatAuthError(error, "Nao foi possivel enviar o link agora. Tente novamente.");
        state.authMessageTone = "error";
        showToast(state.authMessage);
        return false;
      } finally {
        setAuthBusy(false);
      }
    }

    async function updatePassword(passwordValue, confirmationValue) {
      if (state.loading) return false;

      let client = null;
      try {
        client = await ensureSupabaseClient();
      } catch (error) {
        console.error(error);
      }

      if (!state.isSupabaseEnabled || !client) {
        showToast("Configure o Supabase antes de redefinir a senha.");
        return false;
      }

      const password = String(passwordValue ?? getElement("auth-password")?.value ?? "");
      const confirmation = String(confirmationValue ?? getElement("auth-password-confirm")?.value ?? "");

      if (!isStrongPassword(password)) {
        state.authMessage = "Use 10+ caracteres com maiuscula, minuscula, numero e simbolo.";
        state.authMessageTone = "error";
        showToast(state.authMessage);
        renderAuthState();
        return false;
      }
      if (!confirmation || password !== confirmation) {
        state.authMessage = "As duas senhas precisam ser iguais.";
        state.authMessageTone = "error";
        showToast(state.authMessage);
        renderAuthState();
        return false;
      }

      setAuthBusy(true);
      try {
        if (!state.session) {
          const {data: sessionData, error: sessionError} = await client.auth.getSession();
          if (sessionError) throw sessionError;
          syncSupabaseSession(sessionData.session);
        }
        if (!state.session) {
          throw Object.assign(new Error("Recovery session unavailable."), {code: "otp_expired"});
        }

        const {data, error} = await client.auth.updateUser({password});
        if (error) throw error;

        if (data?.user && state.session) {
          syncSupabaseSession({...state.session, user: data.user});
        }
        setPasswordRecoveryMarker(false);
        state.authMode = "login";
        state.authMessage = "";
        state.pendingRecoveryEmail = "";
        clearAuthInputs({clearEmail: true});

        try {
          window.history.replaceState({}, document.title, getAuthRedirectUrl());
        } catch (historyError) {
          console.warn("Nao foi possivel limpar a URL apos redefinir a senha.", historyError);
        }

        await loadOrganizations();
        showInitialUserScreen();
        showToast("Senha atualizada com sucesso.");
        return true;
      } catch (error) {
        console.error(error);
        state.authMode = "reset";
        state.authMessage = formatAuthError(error, "Nao foi possivel atualizar a senha. Solicite um novo link.");
        state.authMessageTone = "error";
        clearAuthInputs();
        showToast(state.authMessage);
        return false;
      } finally {
        setAuthBusy(false);
      }
    }

    async function resendConfirmationEmail() {
      if (state.loading) return;

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

      setAuthBusy(true);
      try {
        const {error} = await client.auth.resend({
          type: "signup",
          email,
          options: {emailRedirectTo: getAuthRedirectUrl()},
        });
        if (error) throw error;

        state.authMessage = "E-mail de confirmacao reenviado.";
        state.authMessageTone = "success";
        showToast(state.authMessage);
      } catch (error) {
        console.error(error);
        state.authMessage = formatAuthError(error, "Nao foi possivel reenviar a confirmacao.");
        state.authMessageTone = "error";
        showToast(state.authMessage);
      } finally {
        setAuthBusy(false);
      }
    }

    function backToAuthForm() {
      state.pendingVerificationEmail = "";
      setAuthMode("login");
    }

    async function signOutAuth() {
      if (!state.client || state.loading) return;
      setAuthBusy(true);
      try {
        const {error} = await state.client.auth.signOut();
        if (error) throw error;
        state.authMode = "login";
        syncSupabaseSession(null);
        closeModal("modal-auth");
        if (typeof exitToStartView === "function") await exitToStartView();
        showToast("Sessao encerrada.");
      } catch (error) {
        console.error(error);
        showToast("Nao foi possivel sair.");
      } finally {
        setAuthBusy(false);
      }
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
      handleAuthBack,
      handlePasswordRecovery,
      initAuthSession,
      isStrongPassword,
      loadOrganizations,
      openAuthModal,
      renderAuthState,
      renderPasswordFeedback,
      requestPasswordReset,
      resendConfirmationEmail,
      selectOrganization,
      setAuthMode,
      signOutAuth,
      submitAuthForm,
      syncSupabaseSession,
      dispatchWorkspaceChange,
      getAuthRedirectUrl,
      togglePasswordConfirmationVisibility,
      togglePasswordVisibility,
      updatePassword,
    };
  }

  window.FichaTecAuthSession = {createAuthSessionModule};
})();
