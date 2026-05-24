// @ts-nocheck
import {
  getPlanByCode,
  getSupabaseConfig,
  handleError,
  handleOptions,
  httpError,
  jsonResponse,
  makeQuery,
  readJson,
  requiredString,
  supabaseRest,
} from "../_shared/billing.ts";

function normalizeSubscriptionStatus(status) {
  const allowed = ["trialing", "active", "past_due", "canceled", "paused"];
  if (!allowed.includes(status)) {
    throw httpError(400, "invalid_status", "Status de assinatura invalido.");
  }
  return status;
}

Deno.serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  try {
    if (request.method !== "POST") {
      throw httpError(405, "method_not_allowed", "Use POST para webhooks de pagamento.");
    }

    const secret = Deno.env.get("BILLING_WEBHOOK_SECRET");
    const receivedSecret = request.headers.get("x-fichatec-webhook-secret");
    if (!secret || receivedSecret !== secret) {
      throw httpError(401, "invalid_webhook_secret", "Webhook nao autorizado.");
    }

    const config = getSupabaseConfig();
    const body = await readJson(request);
    const provider = requiredString(body.provider, "provider");
    const eventId = requiredString(body.eventId, "eventId");
    const eventType = requiredString(body.type, "type");
    const organizationId = requiredString(body.organizationId, "organizationId");
    const planCode = requiredString(body.planCode, "planCode");
    const status = normalizeSubscriptionStatus(requiredString(body.status, "status"));
    const plan = await getPlanByCode(config, planCode);

    const eventQuery = makeQuery({ on_conflict: "provider,provider_event_id" });
    await supabaseRest(config, `/payment_events?${eventQuery}`, {
      method: "POST",
      headers: { prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({
        provider,
        provider_event_id: eventId,
        event_type: eventType,
        organization_id: organizationId,
        payload: body,
        processed_at: new Date().toISOString(),
      }),
    });

    const subscriptionPayload = {
      organization_id: organizationId,
      plan_id: plan.id,
      status,
      gateway: provider,
      gateway_customer_id: body.gatewayCustomerId || null,
      gateway_subscription_id: body.gatewaySubscriptionId || null,
      current_period_start: body.currentPeriodStart || null,
      current_period_end: body.currentPeriodEnd || null,
      cancel_at_period_end: Boolean(body.cancelAtPeriodEnd),
    };

    const upsertQuery = makeQuery({ on_conflict: "organization_id" });
    const subscriptionRows = await supabaseRest(config, `/subscriptions?${upsertQuery}`, {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(subscriptionPayload),
    });
    const subscription = Array.isArray(subscriptionRows) ? subscriptionRows[0] : subscriptionRows;

    if (body.gatewayCustomerId) {
      const customerQuery = makeQuery({ on_conflict: "organization_id,provider" });
      await supabaseRest(config, `/payment_customers?${customerQuery}`, {
        method: "POST",
        headers: { prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          organization_id: organizationId,
          provider,
          gateway_customer_id: body.gatewayCustomerId,
          billing_email: body.billingEmail || null,
          metadata: body.customerMetadata || {},
        }),
      });
    }

    return jsonResponse({
      ok: true,
      eventId,
      provider,
      subscriptionId: subscription?.id || null,
      status,
    });
  } catch (error) {
    return handleError(error);
  }
});
