# FichaTec - Controle de Estoque e Ficha Tecnica

Aplicativo PWA em evolucao para chefs e negocios de alimentacao criarem receitas, fichas tecnicas, custos, estoque e futuramente recursos premium com IA, assinaturas, comunidade e marketplace.

## Diretrizes

- [Diretrizes de produto](docs/PRODUCT_GUIDELINES.md)
- [Arquitetura tecnica](docs/TECHNICAL_ARCHITECTURE.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Roadmap](docs/ROADMAP.md)

## Estrutura atual

- `public/index.html`: entrada principal do app.
- `src/app.js`: logica atual do aplicativo, extraida do HTML original.
- `src/styles/`: tokens Material 3, base visual e CSS legado extraido.
- `src/services/repositories/`: camada de acesso a dados, hoje usando `localStorage`.
- `supabase/`: estrutura reservada para migrations e Edge Functions.

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
