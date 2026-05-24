// @ts-nocheck
import {
  getPlanByCode,
  getSupabaseConfig,
  handleError,
  handleOptions,
  httpError,
  jsonResponse,
  readJson,
  requireAuthenticatedUser,
  requiredString,
  requireOrganizationManager,
  supabaseRest,
} from "../_shared/billing.ts";

Deno.serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  try {
    if (request.method !== "POST") {
      throw httpError(405, "method_not_allowed", "Use POST para criar checkout.");
    }

    const config = getSupabaseConfig();
    const user = await requireAuthenticatedUser(request, config);
    const body = await readJson(request);
    const organizationId = requiredString(body.organizationId, "organizationId");
    const planCode = requiredString(body.planCode, "planCode");
    const provider = (body.provider || Deno.env.get("BILLING_PROVIDER") || "manual").trim();

    await requireOrganizationManager(config, user.id, organizationId);
    const plan = await getPlanByCode(config, planCode);

    if (plan.price_cents <= 0) {
      throw httpError(400, "free_plan_checkout", "Plano gratuito nao precisa de checkout.");
    }

    const successUrl = typeof body.successUrl === "string" ? body.successUrl.trim() : null;
    const cancelUrl = typeof body.cancelUrl === "string" ? body.cancelUrl.trim() : null;
    const metadata = {
      requested_user_id: user.id,
      gateway_pending: true,
      note: "Checkout real ainda depende da escolha/configuracao do gateway.",
    };

    const created = await supabaseRest(config, "/checkout_sessions", {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({
        organization_id: organizationId,
        plan_id: plan.id,
        requested_by: user.id,
        provider,
        status: "pending",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
    });
    const checkoutSession = Array.isArray(created) ? created[0] : created;

    return jsonResponse({
      ok: true,
      provider,
      mode: "gateway_pending",
      checkoutSessionId: checkoutSession.id,
      checkoutUrl: checkoutSession.checkout_url,
      plan: {
        code: plan.code,
        name: plan.name,
        priceCents: plan.price_cents,
        currency: plan.currency,
        billingInterval: plan.billing_interval,
      },
      message: "Sessao de checkout registrada. Conectar gateway real na proxima etapa.",
    });
  } catch (error) {
    return handleError(error);
  }
});
