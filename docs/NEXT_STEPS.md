# FichaTec - Proximo Passo Sequencial

## Estado Atual

O projeto esta em fase de prototipo estruturado com Supabase ja conectado em producao.

- Diretrizes de produto, arquitetura tecnica, design system, PWA e Supabase documentados.
- HTML, CSS e JS estao separados por dominio.
- Base visual mobile-first aplicada com Material 3 e identidade gastronomica premium.
- `src/app.js` foi reduzido para orquestracao dos modulos.
- Estoque virtual, estoque fisico, receitas/ficha tecnica, scanner, auth, repositories e utilitarios foram modularizados.
- `docs/FUNCTION_INVENTORY.md` e o inventario vivo das funcoes usadas no projeto.
- PWA publicado com manifest, icones temporarios, service worker resiliente e cache que nao bloqueia Auth/CRUD/Supabase.
- Supabase foi ativado com Auth, RLS, profiles, organizations, organization_members, recipes, recipe_ingredients, stock_items e physical_stock_items.
- Vercel esta configurada para build com variaveis de ambiente Supabase.
- GitHub e Vercel devem permanecer sincronizados: todo commit exige push e deploy de producao.
- CRUD visual voltou para icones explicitos de editar/excluir nos cards, em mobile e desktop.
- Exclusoes remotas foram ajustadas para funcionar tambem quando o usuario remove o ultimo item de uma lista.
- RLS foi validado em producao com dois usuarios reais: `Achocolatado` ficou isolado em `r.camposarch@gmail.com` e `Bolo de whey` ficou isolado em `r.camposdesign@gmail.com`.
- Security Advisor reportou warnings de funcoes internas; a migration `20260523090000_harden_internal_functions.sql` foi preparada para hardening.
- Especificacao de evolucao de Estoque/Receitas registrada em `docs/STOCK_RECIPES_FEATURE_SPEC.md`.
- Categorias agora podem ser cadastradas independentemente de produtos e reutilizadas no Estoque Virtual e Fisico; a vinculacao pode acontecer depois editando o produto.
- Migration e repository de `product_categories` foram preparados para persistir categorias no Supabase por workspace.
- Migration de categorias foi aplicada no Supabase e a persistencia apos `F5` foi validada em producao.
- RLS de categorias foi validado em producao: leituras cruzadas entre `r.camposarch@gmail.com` e `r.camposdesign@gmail.com` retornaram `0` e `PASS`.
- Migration de hardening `20260523090000_harden_internal_functions.sql` foi aplicada no Supabase com sucesso.
- Validacao de hardening aprovada: funcoes publicas internas removidas, helpers privados presentes e `public.set_updated_at()` sem execucao por `anon`/`authenticated`.
- RLS pos-hardening aprovado para receitas, estoque virtual e estoque fisico entre `r.camposarch@gmail.com` e `r.camposdesign@gmail.com`.
- Security Advisor reexecutado apos o hardening: `0 errors` e `1 warning` residual confirmado. O warning restante e `Leaked Password Protection Disabled`, que e configuracao de Supabase Auth, nao falha de RLS/schema.
- Fase 3.1 validada no Supabase: catalogo com 10 planos ativos, intervalos mensal/trimestral/anual, assinaturas Trial por workspace e limites de scanner aprovados com `PASS`.
- Fase 3.2 validada no Supabase: tabelas de billing, RLS, policies, idempotencia de webhook e colunas de gateway aprovadas com 5 checks `PASS`.
- Edge Functions de billing publicadas no Supabase: `create-checkout`, `billing-webhook` e `validate-feature-access`; secrets `BILLING_WEBHOOK_SECRET` e `BILLING_PROVIDER=manual` configurados.
- `supabase/config.toml` versiona a regra de seguranca das Edge Functions: `billing-webhook` aceita chamada externa sem JWT e valida o segredo proprio; `create-checkout` e `validate-feature-access` continuam exigindo JWT de usuario logado.
- Smoke test da `billing-webhook` aprovado em producao: segredo invalido retorna `invalid_webhook_secret`; segredo correto entra na funcao e valida campos obrigatorios.

## Proximo Passo Recomendado

### Fase 2.5 - Persistencia Supabase Para Categorias

Objetivo: levar o catalogo de categorias, hoje local e compartilhado na UI, para uma tabela multi-tenant com RLS.

Ordem recomendada:

1. Concluido no codigo: criar tabela `product_categories` com `organization_id`, `name`, `parent_id`, `deleted_at` e unicidade por workspace.
2. Concluido no codigo: criar policies RLS por `organization_members`.
3. Concluido no codigo: atualizar repository Supabase para carregar/salvar categorias por workspace.
4. Concluido: aplicar `supabase/migrations/20260524120000_product_categories.sql` no Supabase SQL Editor.
5. Concluido: criar categoria de teste e revalidar isolamento com `supabase/category_rls_smoke_test_by_email.sql`.
6. Resultado: Fase 2.5 aprovada.

### Proximo Passo - Fase 2.3 Hardening Supabase

Objetivo: remover warnings de seguranca do Supabase antes de avancar para pagamento, IA e recursos premium.

Ordem recomendada:

1. Concluido: aplicar `supabase/migrations/20260523090000_harden_internal_functions.sql` no Supabase.
2. Concluido: rodar `supabase/hardening_validation.sql` e confirmar que funcoes publicas antigas sumiram e helpers privados existem.
3. Concluido: reexecutar o teste de isolamento com os dois usuarios reais.
4. Concluido: atualizar o Security Advisor e confirmar que os warnings de funcoes internas sairam.
5. Pendente operacional: habilitar `Leaked Password Protection` no painel Supabase Auth quando o plano do Supabase permitir.
6. Concluido: registrar warning residual antes de iniciar novas features.

### Fase 2.4 - UX Estoque/Receitas Sem Alterar Logica

Objetivo: melhorar a experiencia visual antes de alterar schema, mantendo CRUD, Supabase e regras de negocio intactos.

Ordem recomendada:

1. Redesenhar visualmente a aba Ficha para separar origem, selecao e parametros do ingrediente.
2. Melhorar consistencia visual entre Estoque Fisico e Estoque Virtual.
3. Adicionar toggle visual Lista/Grid com persistencia local, sem mudar estrutura remota.
4. Revisar responsividade de cards, filtros, botoes e modais em mobile, tablet e desktop.
5. Validar que criar, editar, excluir e salvar receita continuam funcionando igual.

## Checklist de Aceite

- Login e cadastro funcionam na URL de producao.
- Confirmacao de e-mail redireciona para a Vercel.
- Modal de auth nao preserva senha entre fluxos.
- Senha forte e validada no cadastro.
- Logout limpa dados privados do navegador.
- Criar, editar e excluir funciona para estoque virtual.
- Criar, editar e excluir funciona para estoque fisico.
- Criar, editar e excluir funciona para receitas.
- Excluir o ultimo item de uma lista tambem sincroniza com Supabase.
- Recarregar a pagina nao restaura itens excluidos.
- Usuario fora do workspace nao acessa dados de outro workspace.
- Service worker nao mostra erro de `addAll` nem cancela assets essenciais.
- Funcoes internas `SECURITY DEFINER` nao ficam expostas via `/rpc`.
- `Leaked Password Protection` fica habilitado no Supabase Auth antes de producao paga, ou registrado como pendencia do plano atual.

## Proximo Passo - Fase 3.1 Planos e Permissoes

Objetivo: preparar assinatura B2B antes de conectar gateway de pagamento real.

1. Concluido no codigo: definir matriz de planos trial, essencial, profissional e equipe.
2. Concluido no codigo: criar gate de recursos no frontend com fallback Trial.
3. Concluido no codigo: bloquear abertura do scanner quando o plano nao tem limite de scanner.
4. Concluido no Supabase: aplicar `supabase/migrations/20260524170000_plan_catalog_and_default_subscriptions.sql`.
5. Concluido no Supabase: rodar `supabase/plan_access_validation.sql` com 5 checks `PASS`.
6. Concluido no codigo: criar Edge Functions `create-checkout`, `billing-webhook` e `validate-feature-access`.
7. Concluido no Supabase: aplicar `supabase/migrations/20260524190000_billing_server_foundation.sql`.
8. Concluido no Supabase: rodar `supabase/billing_foundation_validation.sql` com 5 checks `PASS`.
9. Concluido no Supabase: configurar `BILLING_WEBHOOK_SECRET`, `BILLING_PROVIDER=manual` e fazer deploy das Edge Functions.
10. Proximo: testar evento completo de assinatura via `billing-webhook`, validar `create-checkout`/`validate-feature-access` com usuario logado e depois escolher gateway real para conectar API/assinatura/webhook assinado.

Depois disso, seguir o fatiamento de `docs/STOCK_RECIPES_FEATURE_SPEC.md` para categorias, nutricao, validade/lote e dashboards.

## Link de Producao

- https://ficha-tecnica-controle-de-estoque.vercel.app
