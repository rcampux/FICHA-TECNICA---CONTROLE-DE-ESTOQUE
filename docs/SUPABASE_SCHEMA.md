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

## Papeis

- `owner`: dono da organizacao, gerencia tudo.
- `admin`: gerencia membros, assinatura e operacao.
- `chef`: cria e edita receitas, estoque e scanner.
- `viewer`: leitura operacional.

## RLS Base

Funcoes auxiliares:

- `current_user_role(organization_id)`.
- `is_organization_member(organization_id)`.
- `can_manage_organization(organization_id)`.
- `can_write_organization(organization_id)`.
- `handle_new_user()`: cria `profiles` automaticamente a partir do Supabase Auth.
- `bootstrap_organization_owner()`: cria o membro `owner` automaticamente quando a organizacao nasce.

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
5. Proximo: criar repositories remotos por dominio.
6. Depois: testar RLS com dois usuarios em organizacoes diferentes.

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
- A proxima etapa e mapear `stock_items`, `physical_stock_items`, `recipes` e `recipe_ingredients` em repositories remotos.
