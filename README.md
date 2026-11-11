# FichaTec - Controle de Estoque e Ficha Tecnica

Aplicativo PWA em evolucao para chefs e negocios de alimentacao criarem receitas, fichas tecnicas, custos, estoque e futuramente recursos premium com IA, assinaturas, comunidade e marketplace.

## Diretrizes

- [Começar em outro computador](docs/NOVO_COMPUTADOR.md)
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
- Estoques virtual e físico com busca de preços, cadastro assistido, tabela nutricional proporcional e sincronização físico → virtual.

Para habilitar capas remotas, aplique as migrations de `supabase/migrations/`, incluindo `20261017163649_recipe_images_storage.sql`, no projeto Supabase do ambiente.

O scanner por IA exige um endpoint `POST /api/scan-recipe`; quando ele nao existe no ambiente, a interface informa claramente que a digitalizacao ainda nao foi configurada.

A pesquisa de preços exige `SERPAPI_API_KEY` somente no servidor. Copie `.env.example` como referência e configure essa variável na Vercel; nunca coloque a chave em `public/`.

Para testar o app, use o servidor local abaixo; não abra o HTML diretamente pelo explorador de arquivos.

## Prototipo local

Com Node.js 24 e Git instalados, execute na pasta do projeto:

```bash
npm ci
npm run build
npm run dev
```

Depois acesse:

```text
http://localhost:4173/public/index.html
```

Sem configuração adicional, esse fluxo abre o modo local de desenvolvimento. Para acessar os serviços existentes e continuar em outro PC, siga [o guia de configuração](docs/NOVO_COMPUTADOR.md). Chaves privadas e dados dos clientes não são distribuídos pelo GitHub.

## Deploy Vercel

Importe o repositorio na Vercel por este link:

[Deploy na Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frcampux%2FFICHA-TECNICA---CONTROLE-DE-ESTOQUE)

## Preview publico

Vercel produção:

[https://nk-control.vercel.app](https://nk-control.vercel.app)

GitHub Pages:

[https://rcampux.github.io/FICHA-TECNICA---CONTROLE-DE-ESTOQUE/](https://rcampux.github.io/FICHA-TECNICA---CONTROLE-DE-ESTOQUE/)
