# FichaTec - Controle de Estoque e Ficha Tecnica

Aplicativo PWA em evolucao para chefs e negocios de alimentacao criarem receitas, fichas tecnicas, custos, estoque e futuramente recursos premium com IA, assinaturas, comunidade e marketplace.

## Diretrizes

- [Diretrizes de produto](docs/PRODUCT_GUIDELINES.md)
- [Arquitetura tecnica](docs/TECHNICAL_ARCHITECTURE.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Licenças e origem dos assets](docs/ASSET_LICENSES.md)
- [Inventário de funções](docs/FUNCTION_INVENTORY.md)
- [Roadmap](docs/ROADMAP.md)

## Estrutura atual

- `public/index.html`: entrada principal do app.
- `src/app.js`: logica atual do aplicativo, extraida do HTML original.
- `src/styles/`: tokens Material 3, base visual e CSS legado extraido.
- `src/services/repositories/`: camada híbrida para `localStorage` e Supabase.
- `supabase/`: migrations, políticas RLS, Storage privado e Edge Functions.

## Experiência atual

- Splash animada com suporte a movimento reduzido.
- Login, cadastro, confirmação de e-mail e recuperação de senha via Supabase Auth.
- Fichas e receitas com capa editável, otimização automática e fallback culinário por cor/ícone.
- Bucket privado `recipe-images`, com isolamento por organização, quando o Supabase está ativo.
- PWA instalável com atualização segura e funcionamento básico offline.

Para habilitar capas remotas, aplique as migrations de `supabase/migrations/`, incluindo `20261017163649_recipe_images_storage.sql`, no projeto Supabase do ambiente.

O scanner por IA exige um endpoint `POST /api/scan-recipe`; quando ele nao existe no ambiente, a interface informa claramente que a digitalizacao ainda nao foi configurada.

Nesta fase, abra `public/index.html` para testar o app.

## Prototipo local

Para servir o projeto localmente com Node:

```bash
node scripts/dev-server.mjs
```

Depois acesse:

```text
http://localhost:4173/public/index.html
```

## Deploy Vercel

Importe o repositorio na Vercel por este link:

[Deploy na Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frcampux%2FFICHA-TECNICA---CONTROLE-DE-ESTOQUE)

## Preview publico

Vercel produção:

[https://ficha-tecnica-controle-de-estoque.vercel.app](https://ficha-tecnica-controle-de-estoque.vercel.app)

GitHub Pages:

[https://rcampux.github.io/FICHA-TECNICA---CONTROLE-DE-ESTOQUE/](https://rcampux.github.io/FICHA-TECNICA---CONTROLE-DE-ESTOQUE/)
