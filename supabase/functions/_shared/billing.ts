// @ts-nocheck

export const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-fichatec-webhook-secret",
  "access-control-allow-methods": "POST, OPTIONS",
};

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export function handleOptions(request) {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch (_error) {
    throw httpError(400, "invalid_json", "O corpo da requisicao precisa ser um JSON valido.");
  }
}

export function httpError(status, code, message, details = null) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

export function requiredString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw httpError(400, "missing_field", `Campo obrigatorio ausente: ${fieldName}.`);
  }
  return value.trim();
}

export function getSupabaseConfig() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw httpError(500, "missing_env", "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao configurado.");
  }

  return { url, serviceRoleKey };
}

export function getBearerToken(request) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw httpError(401, "missing_auth", "Usuario precisa estar autenticado.");
  }

  return match[1];
}

export async function requireAuthenticatedUser(request, config) {
  const token = getBearerToken(request);
  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw httpError(401, "invalid_auth", "Sessao invalida ou expirada.");
  }

  return await response.json();
}

export async function supabaseRest(config, path, options = {}) {
  const response = await fetch(`${config.url}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw httpError(response.status, "supabase_error", "Falha ao acessar o Supabase.", body);
  }

  return body;
}

export function makeQuery(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });
  return searchParams.toString();
}

export async function getPlanByCode(config, planCode) {
  const query = makeQuery({
    select: "*",
    code: `eq.${planCode}`,
    is_active: "eq.true",
    limit: "1",
  });
  const plans = await supabaseRest(config, `/plans?${query}`);
  const plan = Array.isArray(plans) ? plans[0] : null;

  if (!plan) {
    throw httpError(404, "plan_not_found", "Plano nao encontrado ou inativo.");
  }

  return plan;
}

export async function requireOrganizationManager(config, userId, organizationId) {
  const query = makeQuery({
    select: "role",
    organization_id: `eq.${organizationId}`,
    user_id: `eq.${userId}`,
    role: "in.(owner,admin)",
    limit: "1",
  });
  const memberships = await supabaseRest(config, `/organization_members?${query}`);
  const membership = Array.isArray(memberships) ? memberships[0] : null;

  if (!membership) {
    throw httpError(403, "not_allowed", "Apenas owner ou admin pode gerenciar assinatura.");
  }

  return membership;
}

export async function requireOrganizationMember(config, userId, organizationId) {
  const query = makeQuery({
    select: "role",
    organization_id: `eq.${organizationId}`,
    user_id: `eq.${userId}`,
    limit: "1",
  });
  const memberships = await supabaseRest(config, `/organization_members?${query}`);
  const membership = Array.isArray(memberships) ? memberships[0] : null;

  if (!membership) {
    throw httpError(403, "not_member", "Usuario nao pertence a este workspace.");
  }

  return membership;
}

export async function getActiveSubscription(config, organizationId) {
  const query = makeQuery({
    select: "*,plan:plans(*)",
    organization_id: `eq.${organizationId}`,
    limit: "1",
  });
  const subscriptions = await supabaseRest(config, `/subscriptions?${query}`);
  return Array.isArray(subscriptions) ? subscriptions[0] : null;
}

export function getCurrentUsagePeriod() {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}-${month}-01`;
}

export async function getFeatureUsage(config, organizationId, featureKey) {
  const query = makeQuery({
    select: "used_count",
    organization_id: `eq.${organizationId}`,
    feature_key: `eq.${featureKey}`,
    usage_period: `eq.${getCurrentUsagePeriod()}`,
    limit: "1",
  });
  const rows = await supabaseRest(config, `/feature_usage?${query}`);
  const row = Array.isArray(rows) ? rows[0] : null;
  return Number(row?.used_count || 0);
}

export function getFeatureLimit(plan, featureKey) {
  const limits = {
    scanRecipe: "scan_recipe_monthly_limit",
    scanLabel: "scan_label_monthly_limit",
  };
  const column = limits[featureKey];
  if (!column) {
    throw httpError(400, "unknown_feature", "Recurso premium desconhecido.");
  }
  return plan?.[column] ?? 0;
}

export function isSubscriptionUsable(subscription) {
  return ["trialing", "active"].includes(subscription?.status);
}

export function handleError(error) {
  const status = error?.status || 500;
  return jsonResponse({
    ok: false,
    error: {
      code: error?.code || "internal_error",
      message: error?.message || "Erro interno.",
      details: error?.details || null,
    },
  }, status);
}
