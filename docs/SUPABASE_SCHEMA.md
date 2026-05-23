# FichaTec - Supabase Schema

Este documento descreve a primeira base segura do Supabase para transformar o prototipo em SaaS B2B.

## Objetivo

Criar um banco multiempresa com seguranca por RLS desde o inicio. Cada chef/usuario acessa dados pela organizacao/cozinha em que e membro.

## Migration

Arquivo:

`supabase/migrations/20260520190000_initial_multi_tenant_schema.sql`

## Modelo B2B

- `profiles`: perfil publico privado do usuario autenticado.
- `organizations`: empresa, cozinha ou workspace.
- `organization_members`: vinculo usuario x organizacao com papel.
- `plans`: catalogo interno de planos.
- `subscriptions`: assinatura ativa da organizacao.
- `feature_usage`: uso mensal de recursos premium, como scanner.

## Estoque e Ficha Tecnica

- `nutrition_facts`: informacoes nutricionais manuais, estimadas ou lidas por rotulo.
- `stock_items`: estoque virtual para precificacao.
- `stock_price_history`: historico de precos por produto.
- `physical_stock_items`: estoque fisico real.
- `stock_movements`: entradas, saidas, ajustes e perdas.
- `recipes`: ficha tecnica principal.
- `recipe_ingredients`: ingredientes vinculados a cada receita.

## Scanner e Imagens

- `uploaded_assets`: imagens/documentos salvos no Supabase Storage.
- `scan_jobs`: processamento de receita/rotulo por IA.

## Auditoria

- `audit_logs`: trilha futura para eventos sensiveis.

## Provisionamento Inicial

Quando um usuario e criado no Supabase Auth:

1. `handle_new_user()` cria o registro em `profiles`.
2. `handle_new_user()` cria uma organizacao padrao usando nome da organizacao, nome do usuario ou prefixo do e-mail.
3. O trigger `bootstrap_organization_owner()` adiciona o usuario como `owner`.
4. O mesmo trigger define `profiles.default_organization_id` quando ainda estiver vazio.

## Papeis

- `owner`: dono da organizacao, gerencia tudo.
- `admin`: gerencia membros, assinatura e operacao.
- `chef`: cria e edita receitas, estoque e scanner.
- `viewer`: leitura operacional.

## RLS Base

Funcoes auxiliares internas:

- `private.current_user_role(organization_id)`.
- `private.is_organization_member(organization_id)`.
- `private.can_manage_organization(organization_id)`.
- `private.can_write_organization(organization_id)`.
- `private.handle_new_user()`: cria `profiles` e organizacao padrao automaticamente a partir do Supabase Auth.
- `private.bootstrap_organization_owner()`: cria o membro `owner` automaticamente quando a organizacao nasce.

Essas funcoes devem permanecer fora do schema `public` exposto pela API REST. Elas existem para policies RLS e triggers internas, nao para chamadas diretas via `/rpc`.

Regras:

- Dados privados sempre exigem `organization_id`.
- Leitura exige membro da organizacao.
- Escrita operacional exige `owner`, `admin` ou `chef`.
- Gestao de organizacao/assinatura/membros exige `owner` ou `admin`.
- Planos ativos podem ser lidos por usuarios autenticados.
- `audit_logs` so pode ser lido por administradores da organizacao.

## Aplicacao da Migration

Quando o projeto Supabase estiver conectado:

```bash
supabase db push
```

Ou aplicar o SQL no painel do Supabase em SQL Editor durante a fase inicial.

## Proximo Passo Tecnico

1. Concluido: criar `src/config/supabase.js`.
2. Concluido: criar `src/services/supabaseClient.js`.
3. Concluido: criar repository hibrido: `localStorage` agora, Supabase quando autenticado.
4. Concluido: adicionar tela/fluxo de login e selecao de workspace.
5. Concluido: criar repositories remotos por dominio.
6. Concluido: preparar build/env da Vercel para ativar Supabase.
7. Proximo: configurar projeto Supabase real e aplicar migration.
8. Depois: testar RLS com dois usuarios em organizacoes diferentes.

## Configuracao Frontend

O app segue em modo local por padrao:

```js
window.FICHATEC_ENV = {
  appName: "FichaTec",
  dataMode: "local",
  supabase: {
    url: "",
    anonKey: ""
  }
};
```

Para ativar Supabase no frontend, configurar:

- `dataMode: "supabase"`.
- `supabase.url` com a Project URL.
- `supabase.anonKey` com a chave publica anon.

A chave `anon` e publica, mas RLS precisa estar correto. Chaves `service_role` nunca entram no frontend.

## Fluxo Antes de Ligar Supabase

- O app continua em `dataMode: "local"` para preservar o prototipo atual.
- O modal de acesso ja renderiza login, cadastro e workspace quando `dataMode` for `supabase`.
- O workspace ativo fica disponivel por `getAuthState().activeOrganizationId`.
- Nenhuma escrita remota deve acontecer sem usuario autenticado e workspace ativo.
- `stock_items`, `physical_stock_items`, `recipes`, `recipe_ingredients` e `nutrition_facts` ja possuem conversores no frontend.
- Escritas remotas rodam em background quando `dataMode` e `supabase` e existe workspace ativo.
- O build da Vercel aceita `FICHATEC_DATA_MODE`, `FICHATEC_SUPABASE_URL` e `FICHATEC_SUPABASE_ANON_KEY`.
- A proxima etapa e aplicar a migration no Supabase real e validar RLS/Auth.
