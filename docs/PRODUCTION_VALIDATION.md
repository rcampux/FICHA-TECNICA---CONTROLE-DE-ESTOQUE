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

## Pendente Com Usuario Autenticado

Estes testes exigem dois usuarios reais confirmados no Supabase Auth:

1. Entrar em producao com o usuario A.
2. Confirmar que o workspace automatico aparece no modal.
3. Criar um produto no estoque virtual.
4. Criar um produto no estoque fisico.
5. Criar uma receita usando ingrediente vinculado.
6. Recarregar a pagina e confirmar persistencia dos tres cadastros.
7. Editar os tres tipos de cadastro e recarregar novamente.
8. Excluir os tres tipos de cadastro.
9. Confirmar que excluir o ultimo item nao restaura dados apos reload.
10. Entrar com usuario B e confirmar isolamento de dados.
11. Rodar `supabase/rls_smoke_test.sql` com os UUIDs reais dos usuarios.

## Query de Apoio

- Use `supabase/production_validation_by_email.sql` para validar usuarios, workspaces, papeis e receitas a partir dos e-mails confirmados.
- Depois de obter `user_id` e `organization_id`, use `supabase/rls_smoke_test.sql` para validar isolamento RLS com contexto autenticado.

## Criterio Para Avancar

Somente avancar para Fase 3.1 quando:

- CRUD autenticado passar em producao.
- Persistencia apos reload estiver comprovada.
- Exclusao do ultimo item estiver comprovada.
- RLS estiver comprovado com dois usuarios diferentes.
- Nenhum dado privado aparecer sem login.

## Proxima Acao

Executar o checklist autenticado com dois usuarios de teste confirmados.
