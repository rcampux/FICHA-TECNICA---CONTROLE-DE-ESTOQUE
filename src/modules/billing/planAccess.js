(function exposePlanAccessModule() {
  const PLAN_DEFINITIONS = {
    trial: {
      code: "trial",
      name: "Trial",
      billingInterval: "monthly",
      priceCents: 0,
      maxRecipes: 20,
      maxMembers: 1,
      scanRecipeMonthlyLimit: 3,
      scanLabelMonthlyLimit: 1,
    },
    essential_monthly: {
      code: "essential_monthly",
      name: "Essencial Mensal",
      billingInterval: "monthly",
      priceCents: 4900,
      maxRecipes: 300,
      maxMembers: 3,
      scanRecipeMonthlyLimit: 0,
      scanLabelMonthlyLimit: 0,
    },
    professional_monthly: {
      code: "professional_monthly",
      name: "Profissional Mensal",
      billingInterval: "monthly",
      priceCents: 9900,
      maxRecipes: 1000,
      maxMembers: 8,
      scanRecipeMonthlyLimit: 100,
      scanLabelMonthlyLimit: 100,
    },
    team_monthly: {
      code: "team_monthly",
      name: "Equipe Mensal",
      billingInterval: "monthly",
      priceCents: 19900,
      maxRecipes: null,
      maxMembers: 25,
      scanRecipeMonthlyLimit: 300,
      scanLabelMonthlyLimit: 300,
    },
  };

  const FEATURE_LIMIT_MAP = {
    recipes: "maxRecipes",
    members: "maxMembers",
    scanRecipe: "scanRecipeMonthlyLimit",
    scanLabel: "scanLabelMonthlyLimit",
  };

  function createPlanAccessModule(deps) {
    const {createSupabaseClient, showToast} = deps;
    const state = {
      initialized: false,
      loading: false,
      organizationId: null,
      plan: PLAN_DEFINITIONS.trial,
      subscription: null,
    };

    function normalizeNumber(value, fallback = 0) {
      const number = Number(value);
      return Number.isFinite(number) ? number : fallback;
    }

    function normalizePlan(plan) {
      if (!plan) return PLAN_DEFINITIONS.trial;
      const fallback = PLAN_DEFINITIONS[plan.code] || PLAN_DEFINITIONS.trial;
      return {
        code: plan.code || fallback.code,
        name: plan.name || fallback.name,
        billingInterval: plan.billing_interval || plan.billingInterval || fallback.billingInterval,
        priceCents: normalizeNumber(plan.price_cents ?? plan.priceCents, fallback.priceCents),
        maxRecipes: plan.max_recipes ?? plan.maxRecipes ?? fallback.maxRecipes,
        maxMembers: plan.max_members ?? plan.maxMembers ?? fallback.maxMembers,
        scanRecipeMonthlyLimit: normalizeNumber(
          plan.scan_recipe_monthly_limit ?? plan.scanRecipeMonthlyLimit,
          fallback.scanRecipeMonthlyLimit
        ),
        scanLabelMonthlyLimit: normalizeNumber(
          plan.scan_label_monthly_limit ?? plan.scanLabelMonthlyLimit,
          fallback.scanLabelMonthlyLimit
        ),
      };
    }

    function isSubscriptionUsable(subscription) {
      if (!subscription) return false;
      return ["trialing", "active"].includes(subscription.status);
    }

    function getPlanAccessState() {
      return {
        initialized: state.initialized,
        loading: state.loading,
        organizationId: state.organizationId,
        plan: {...state.plan},
        subscription: state.subscription ? {...state.subscription} : null,
      };
    }

    async function loadPlanAccess(organizationId) {
      state.organizationId = organizationId || null;
      state.loading = true;

      if (!organizationId) {
        state.plan = PLAN_DEFINITIONS.trial;
        state.subscription = null;
        state.loading = false;
        state.initialized = true;
        return getPlanAccessState();
      }

      try {
        const client = await createSupabaseClient?.();
        if (!client) throw new Error("Supabase indisponivel.");

        const {data, error} = await client
          .from("subscriptions")
          .select("id, status, current_period_start, current_period_end, cancel_at_period_end, plan:plans(*)")
          .eq("organization_id", organizationId)
          .maybeSingle();

        if (error) throw error;

        state.subscription = data || null;
        state.plan = isSubscriptionUsable(data) ? normalizePlan(data.plan) : PLAN_DEFINITIONS.trial;
      } catch (error) {
        console.error("Plan access load failed", error);
        state.subscription = null;
        state.plan = PLAN_DEFINITIONS.trial;
        showToast?.("Plano nao carregado. Usando limites Trial.");
      }

      state.loading = false;
      state.initialized = true;
      return getPlanAccessState();
    }

    function getPlanLimit(featureKey) {
      const limitKey = FEATURE_LIMIT_MAP[featureKey];
      if (!limitKey) return null;
      return state.plan?.[limitKey] ?? PLAN_DEFINITIONS.trial[limitKey];
    }

    function canUseFeature(featureKey, usedCount = 0) {
      const limit = getPlanLimit(featureKey);
      if (limit === null) return true;
      return normalizeNumber(limit) > normalizeNumber(usedCount);
    }

    function describeFeatureLock(featureKey) {
      if (featureKey === "scanRecipe") {
        return "Scanner de receitas e rotulos e um recurso dos planos Profissional e Equipe.";
      }
      if (featureKey === "scanLabel") {
        return "Leitura de rotulos por foto e um recurso dos planos Profissional e Equipe.";
      }
      return "Este recurso exige um plano com limite disponivel.";
    }

    function requireFeature(featureKey, usedCount = 0) {
      if (canUseFeature(featureKey, usedCount)) return true;
      showToast?.(describeFeatureLock(featureKey));
      return false;
    }

    return {
      canUseFeature,
      describeFeatureLock,
      getPlanAccessState,
      getPlanLimit,
      loadPlanAccess,
      normalizePlan,
      requireFeature,
    };
  }

  window.FichaTecPlanAccess = {
    PLAN_DEFINITIONS,
    createPlanAccessModule,
  };
})();
