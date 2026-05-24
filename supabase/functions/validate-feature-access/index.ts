// @ts-nocheck
import {
  getActiveSubscription,
  getFeatureLimit,
  getFeatureUsage,
  getSupabaseConfig,
  handleError,
  handleOptions,
  httpError,
  isSubscriptionUsable,
  jsonResponse,
  readJson,
  requireAuthenticatedUser,
  requiredString,
  requireOrganizationMember,
} from "../_shared/billing.ts";

Deno.serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  try {
    if (request.method !== "POST") {
      throw httpError(405, "method_not_allowed", "Use POST para validar recurso.");
    }

    const config = getSupabaseConfig();
    const user = await requireAuthenticatedUser(request, config);
    const body = await readJson(request);
    const organizationId = requiredString(body.organizationId, "organizationId");
    const featureKey = requiredString(body.featureKey, "featureKey");

    await requireOrganizationMember(config, user.id, organizationId);

    const subscription = await getActiveSubscription(config, organizationId);
    if (!subscription || !subscription.plan) {
      return jsonResponse({
        ok: true,
        allowed: false,
        reason: "missing_subscription",
        message: "Workspace sem assinatura configurada.",
      });
    }

    const limit = getFeatureLimit(subscription.plan, featureKey);
    const used = await getFeatureUsage(config, organizationId, featureKey);
    const subscriptionUsable = isSubscriptionUsable(subscription);
    const allowed = subscriptionUsable && limit > 0 && used < limit;

    return jsonResponse({
      ok: true,
      allowed,
      reason: allowed ? null : subscriptionUsable ? "limit_reached_or_unavailable" : "subscription_inactive",
      featureKey,
      planCode: subscription.plan.code,
      subscriptionStatus: subscription.status,
      usagePeriod: new Date().toISOString().slice(0, 7),
      used,
      limit,
      remaining: Math.max(limit - used, 0),
    });
  } catch (error) {
    return handleError(error);
  }
});
