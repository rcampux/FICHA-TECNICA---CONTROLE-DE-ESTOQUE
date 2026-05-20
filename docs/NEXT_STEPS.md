# FichaTec - Proximo Passo Sequencial

## Estado Atual

O projeto esta em fase de prototipo estruturado:

- Diretrizes de produto documentadas.
- Arquitetura tecnica documentada.
- Design system baseado em Material 3 documentado.
- HTML, CSS e JS separados.
- Tokens visuais iniciais aplicados.
- Layout mobile/tablet/desktop iniciado.
- Revisao visual inicial aplicada: layout responsivo polido, paleta gastronomica/premium refinada, fundo sem ornamentos circulares/decorativos e hierarquia de cards ajustada.
- Repository local isolando `localStorage`.
- Formatadores extraidos para `src/utils/formatters.js`.
- Chaves de storage extraidas para `src/config/storageKeys.js`.
- Nutricao padrao extraida para `src/modules/nutrition/nutritionDefaults.js`.
- Precificacao por unidade extraida para `src/modules/stock/stockPricing.js`.
- Estoque virtual extraido para `src/modules/stock/virtualStock.js`.
- Estoque fisico extraido para `src/modules/stock/physicalStock.js`.
- Receitas e ficha tecnica extraidas para `src/modules/recipes/recipeSheet.js`.
- Scanner de receita extraido para `src/modules/scanner/scannerRecipe.js`.
- Plano de execucao continuo criado em `docs/PROJECT_EXECUTION_PLAN.md`.
- Inventario vivo de funcoes criado em `docs/FUNCTION_INVENTORY.md` e atualizado a cada mudanca de funcao.
- Estrutura futura para Supabase e Edge Functions criada.

## Proximo Passo Recomendado

### Fase 1.2 - Modularizacao do JS

Depois da revisao visual inicial, o proximo passo e quebrar o `src/app.js` por dominio sem mudar comportamento.

Ordem recomendada:

1. Concluido: extrair utilitarios de formatacao.
2. Concluido: extrair constantes e chaves de storage.
3. Concluido: extrair repository e manter `localStorage` como implementacao atual.
4. Concluido: extrair nutricao padrao e precificacao por unidade.
5. Concluido: extrair modulo de estoque virtual.
6. Concluido: extrair modulo de estoque fisico.
7. Concluido: extrair modulo de receitas/ficha tecnica.
8. Concluido: extrair modulo de scanner.
9. Proximo: fechar commit completo da modularizacao e iniciar PWA real.

## Checklist Visual Continuo

Continuar revisando o prototipo renderizado em:

- Mobile: 390px a 430px.
- Tablet: 768px a 1024px.
- Desktop: 1200px ou maior.

Checklist:

- Navegacao inferior no mobile.
- Navigation rail no tablet.
- Navigation drawer no desktop.
- Ficha tecnica em duas colunas no tablet/desktop.
- Cards de estoque e receitas em grid.
- Hierarquia de custo, margem e preco sugerido.
- Logo generico provisorio.
- Paleta gastronomica/premium.

## Proximo Marco

Fase 1.3 - PWA real:

1. Criar `manifest.webmanifest`.
2. Criar `service-worker.js`.
3. Adicionar icones temporarios.
4. Validar instalabilidade em mobile.
5. Preparar deploy Vercel apos commit completo.
