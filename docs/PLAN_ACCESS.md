# FichaTec - Planos, Limites e Permissoes

Este documento registra a Fase 3.1: base de planos e permissoes antes da integracao com gateway de pagamento.

## Objetivo

Preparar o app para vender assinaturas B2B sem liberar recursos premium apenas pelo frontend. O frontend pode orientar a UX, mas a validacao definitiva deve acontecer no Supabase/Edge Functions antes de OCR, IA, pagamento e webhooks.

## Matriz Inicial De Planos

| Plano | Intervalo | Receitas | Membros | Scanner receita/mes | Scanner rotulo/mes |
|---|---|---:|---:|---:|---:|
| Trial | Mensal | 20 | 1 | 3 | 1 |
| Essencial | Mensal, trimestral, anual | 300 | 3 | 0 | 0 |
| Profissional | Mensal, trimestral, anual | 1000 | 8 | 100 | 100 |
| Equipe | Mensal, trimestral, anual | Ilimitado | 25 | 300 | 300 |

## Regras De Produto

- Scanner de receitas escritas a mao e leitura de rotulos por foto sao recursos premium.
- O plano Essencial nao acessa scanner de IA.
- Trial acessa scanner com limite pequeno para demonstracao.
- Profissional e Equipe acessam scanner com limites mensais.
- A organizacao/workspace e a unidade de assinatura.
- Cada workspace deve ter uma linha em `subscriptions`; se ainda nao houver pagamento real, o status inicial pode ser `trialing`.

## Implementacao Atual

- `supabase/migrations/20260524170000_plan_catalog_and_default_subscriptions.sql` atualiza o catalogo de planos e cria assinatura Trial para workspaces sem assinatura.
- `src/modules/billing/planAccess.js` carrega `subscriptions` + `plans`, aplica fallback Trial e expoe gates de recurso.
- O scanner de receita ja chama `requireFeature("scanRecipe")` antes de abrir o modal.
- `supabase/plan_access_validation.sql` valida catalogo, intervalos, assinatura por workspace e limites de scanner.

## Regras De Seguranca

- Nunca confiar apenas em bloqueio visual.
- Antes de conectar OCR/IA real, criar Edge Function que valide plano, status da assinatura e consumo mensal.
- Webhooks de pagamento devem atualizar `subscriptions` usando chave de servidor, nunca chave publica.
- `feature_usage` deve contabilizar uso mensal por `organization_id`, `feature_key` e periodo.

## Proxima Etapa

1. Aplicar a migration de planos no Supabase.
2. Rodar `supabase/plan_access_validation.sql`.
3. Testar que o scanner abre no Trial/Profissional/Equipe e bloqueia no Essencial.
4. Criar Edge Function de checkout somente depois que a matriz de planos estiver validada.
