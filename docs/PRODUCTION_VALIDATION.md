# FichaTec - Validacao de Producao Supabase

Este documento acompanha a Fase 2.2: validar o app publicado com Supabase real antes de evoluir para planos, pagamentos e IA.

## URL Validada

- https://ficha-tecnica-controle-de-estoque.vercel.app

## Resultado Automatico Inicial

Data da validacao: 2026-05-22.

- Producao esta servindo `src/config/env.js`.
- Build publicado esta em modo Supabase.
- URL do projeto Supabase publicado corresponde ao projeto esperado.
- `service-worker.js` esta publicado em `fichatec-pwa-v4`.
- Service worker nao usa mais `cache.addAll`.
- App abriu em producao sem erros de console no estado deslogado.
- Modal de autenticacao abre em producao.
- Modal de autenticacao contem abas de entrar/criar conta.
- Toggle de visibilidade de senha existe no modal.
- Botao de reenvio de confirmacao existe no modal.
- Leitura anonima via REST recebeu `401 Nao Autorizado` para tabelas privadas testadas:
  - `profiles`
  - `organizations`
  - `organization_members`
  - `stock_items`
  - `physical_stock_items`
  - `recipes`
  - `recipe_ingredients`

## Validacao Com Usuario Autenticado

Data da validacao: 2026-05-23.

- `r.camposarch@gmail.com`: criou a receita `Achocolatado`.
- `r.camposdesign@gmail.com`: criou a receita `Bolo de whey`.
- `arch_reads_own_recipe`: retornou 1 linha com `Achocolatado`.
- `arch_reads_design_recipe`: retornou 0 linhas.
- `design_reads_own_recipe`: retornou 1 linha com `Bolo de whey`.
- `design_reads_arch_recipe`: retornou 0 linhas.
- Resultado: isolamento RLS entre os dois workspaces aprovado.

## Query de Apoio

- Use `supabase/production_validation_by_email.sql` para validar usuarios, workspaces, papeis e receitas a partir dos e-mails confirmados.
- Use `supabase/rls_smoke_test_by_email.sql` para validar isolamento RLS sem copiar UUIDs manualmente.
- Use `supabase/category_rls_smoke_test_by_email.sql` para validar isolamento RLS das categorias por workspace.
- Alternativa manual: depois de obter `user_id` e `organization_id`, use `supabase/rls_smoke_test.sql`.

## Resultado Manual Recebido

- `r.camposarch@gmail.com`: usuario confirmado, profile criado, workspace proprio, papel `owner`, 1 receita ativa.
- `r.camposdesign@gmail.com`: usuario confirmado, profile criado, workspace proprio, papel `owner`, 1 receita ativa.
- Os dois usuarios estao em `organization_id` diferentes, como esperado para isolamento multi-tenant.
- Validacao RLS autenticada comprovou que cada usuario acessa apenas a propria receita.

## Validacao De Categorias Supabase

Data da validacao funcional: 2026-05-24.

- Migration `20260524120000_product_categories.sql` aplicada no Supabase SQL Editor com sucesso.
- Categoria criada no app persistiu apos `F5`, confirmando escrita/leitura remota de `product_categories`.
- Script `supabase/category_rls_smoke_test_by_email.sql` ajustado para resolver usuarios/organizacoes antes de simular `authenticated`, sem quebrar quando um UUID estiver ausente; nunca conceder `SELECT` em `auth.users` para rodar teste de RLS.
- Proximo teste cirurgico: rodar `supabase/category_rls_smoke_test_by_email.sql` para validar que categorias tambem ficam isoladas entre `r.camposarch@gmail.com` e `r.camposdesign@gmail.com`.

## Warnings Do Security Advisor

Data de revisao: 2026-05-23.

- Foram reportados 16 warnings no Supabase Security Advisor.
- O warning `function_search_path_mutable` para `public.set_updated_at` foi enderecado na migration `20260523090000_harden_internal_functions.sql`.
- Os warnings de funcoes `SECURITY DEFINER` executaveis via RPC foram enderecados movendo helpers internos para o schema `private`, que nao deve ficar exposto pela API REST.
- As funcoes internas publicas antigas sao removidas ao final da migration de hardening.
- O warning `auth_leaked_password_protection` exige ajuste manual no painel do Supabase Auth: habilitar protecao contra senhas vazadas.

## Criterio Para Avancar

Somente avancar para Fase 3.1 quando:

- CRUD autenticado passar em producao.
- Persistencia apos reload estiver comprovada.
- Exclusao do ultimo item estiver comprovada.
- RLS estiver comprovado com dois usuarios diferentes. Concluido em 2026-05-23.
- Nenhum dado privado aparecer sem login.
- Security Advisor estiver sem warnings criticos relacionados a funcoes internas.

## Proxima Acao

Aplicar a migration `20260523090000_harden_internal_functions.sql`, reexecutar o teste RLS com dois usuarios e atualizar o Security Advisor.

## Regra Para Novos Testes

- Cada teste enviado ao usuario deve validar uma unica hipotese.
- Sempre enviar o SQL/comando completo e ja preenchido quando os dados forem conhecidos.
- Sempre informar antes do SQL:
  - objetivo do teste;
  - onde rodar;
  - o que copiar;
  - qual resultado aprova ou reprova.
- Evitar enviar alternativas simultaneas quando uma unica validacao cirurgica resolve a etapa.
