# FichaTec - Billing Server Foundation

Este documento registra a base server-side para checkout, webhook e validacao de recursos premium.

## Objetivo

Preparar pagamentos recorrentes sem expor chaves secretas no frontend e sem confiar em bloqueio visual para liberar recursos premium.

## O Que Foi Criado

- `supabase/migrations/20260524190000_billing_server_foundation.sql`
- `supabase/billing_foundation_validation.sql`
- `supabase/functions/create-checkout/index.ts`
- `supabase/functions/billing-webhook/index.ts`
- `supabase/functions/validate-feature-access/index.ts`
- `supabase/functions/_shared/billing.ts`

## Tabelas

- `payment_customers`: cliente do gateway por workspace.
- `checkout_sessions`: tentativa/auditoria de checkout.
- `payment_events`: eventos idempotentes recebidos por webhook.
- `invoices`: faturas futuras do gateway.

Todas usam RLS. Leitura segue membership do workspace; gestao exige `owner` ou `admin`. Webhook e atualizacoes reais devem usar Edge Function com service role no ambiente server-side.

## Edge Functions

### `create-checkout`

Cria uma sessao interna de checkout para um plano pago.

Status atual: modo `gateway_pending`. A funcao registra a tentativa no banco, valida usuario e plano, mas ainda nao cria checkout no provedor real.

Entrada esperada:

```json
{
  "organizationId": "uuid",
  "planCode": "professional_monthly",
  "provider": "manual",
  "successUrl": "https://app/sucesso",
  "cancelUrl": "https://app/cancelado"
}
```

### `billing-webhook`

Recebe eventos de pagamento e atualiza `subscriptions`.

Seguranca: exige header `x-fichatec-webhook-secret` igual ao segredo `BILLING_WEBHOOK_SECRET` configurado no Supabase.

Entrada esperada para teste manual:

```json
{
  "provider": "manual",
  "eventId": "evt_001",
  "type": "subscription.updated",
  "organizationId": "uuid",
  "planCode": "professional_monthly",
  "status": "active",
  "gatewayCustomerId": "cus_001",
  "gatewaySubscriptionId": "sub_001",
  "currentPeriodStart": "2026-05-24T00:00:00.000Z",
  "currentPeriodEnd": "2026-06-24T00:00:00.000Z"
}
```

### `validate-feature-access`

Valida server-side se um workspace pode usar recurso premium.

Entrada esperada:

```json
{
  "organizationId": "uuid",
  "featureKey": "scanRecipe"
}
```

Recursos aceitos agora:

- `scanRecipe`
- `scanLabel`

## Variaveis De Ambiente Necessarias No Supabase

- `SUPABASE_URL`: ja existe automaticamente em Edge Functions.
- `SUPABASE_SERVICE_ROLE_KEY`: secret server-side, nunca vai para frontend.
- `BILLING_WEBHOOK_SECRET`: segredo proprio do FichaTec para validar webhook.
- `BILLING_PROVIDER`: opcional; padrao atual `manual`.

## Comandos De Deploy Supabase

Aplicar migration:

```powershell
Get-Content .\supabase\migrations\20260524190000_billing_server_foundation.sql -Raw | Set-Clipboard
```

Depois cole no SQL Editor e rode.

Validar migration:

```powershell
Get-Content .\supabase\billing_foundation_validation.sql -Raw | Set-Clipboard
```

Deploy das Edge Functions, quando Supabase CLI estiver logado:

```powershell
supabase functions deploy create-checkout
supabase functions deploy billing-webhook
supabase functions deploy validate-feature-access
```

Configurar secrets:

```powershell
supabase secrets set BILLING_WEBHOOK_SECRET="troque-por-um-segredo-forte"
supabase secrets set BILLING_PROVIDER="manual"
```

## Proxima Decisao De Produto

Escolher gateway real:

- Mercado Pago: forte para Pix/cartao no Brasil, mas validar recorrencia e Pix recorrente.
- Pagar.me/Stone: forte para operacao nacional B2B e conciliacao.
- Stripe: excelente para assinatura internacional, mas Pix/debito no Brasil precisa ser validado no escopo real.

Depois da escolha, `create-checkout` deve chamar o SDK/API do gateway e `billing-webhook` deve validar assinatura criptografica real do provedor.
