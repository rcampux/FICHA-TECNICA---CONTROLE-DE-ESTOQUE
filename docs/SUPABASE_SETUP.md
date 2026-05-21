# FichaTec - Ativacao do Supabase

Este guia define o passo seguro para ligar o Supabase real sem versionar credenciais sensiveis.

## Estado Atual

- O app continua em modo local por padrao.
- A migration inicial esta em `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql`.
- Auth, workspaces, RLS e repositories remotos ja estao preparados.
- O build da Vercel gera `public/src/config/env.js` a partir de variaveis de ambiente.

## Variaveis da Vercel

Configurar no projeto Vercel, ambiente Production:

```text
FICHATEC_DATA_MODE=supabase
FICHATEC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
FICHATEC_SUPABASE_ANON_KEY=SUA_ANON_KEY_PUBLICA
```

Tambem sao aceitos os aliases:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
```

## Regra de Seguranca

- A `anon key` pode ir para o frontend porque e publica.
- A `service_role key` nunca deve entrar no frontend, no GitHub ou na Vercel como variavel exposta ao build estatico.
- Toda protecao real depende das policies RLS.

## Ordem Para Ligar

1. Criar o projeto no Supabase.
2. Rodar a migration SQL pelo Supabase SQL Editor ou CLI.
3. Criar um usuario de teste e confirmar que o trigger criou `profiles`, `organizations` e `organization_members`.
4. Configurar as variaveis acima na Vercel.
5. Fazer novo deploy de producao.
6. Criar dois usuarios de teste.
7. Rodar `supabase/rls_smoke_test.sql` com os UUIDs reais.
8. Confirmar que cada usuario ve somente os dados do seu workspace.

## Criterio de Validacao

- `window.FICHATEC_ENV.dataMode` deve retornar `supabase` em producao.
- O botao do topo deve permitir login/cadastro.
- Depois do login, o modal deve listar o workspace ativo.
- Criar/editar estoque e receitas deve persistir no Supabase.
- Um segundo usuario fora do workspace nao deve conseguir ler esses dados.

## Workspace Inicial

A migration cria automaticamente uma organizacao padrao quando um usuario nasce no Supabase Auth. O usuario vira `owner` dessa organizacao pelo trigger `bootstrap_organization_owner`.
