# FichaTec - Próximo Passo Sequencial

## Estado Atual

O projeto está em fase de protótipo estruturado:

- Diretrizes de produto documentadas.
- Arquitetura técnica documentada.
- Design system baseado em Material 3 documentado.
- HTML, CSS e JS separados.
- Tokens visuais iniciais aplicados.
- Layout mobile/tablet/desktop iniciado.
- Revisão visual inicial aplicada: layout responsivo polido, paleta gastronômica/premium refinada, fundo sem ornamentos circulares/decorativos e hierarquia de cards ajustada.
- Repository local isolando `localStorage`.
- Formatadores extraídos para `src/utils/formatters.js`.
- Chaves de storage extraídas para `src/config/storageKeys.js`.
- Nutrição padrão extraída para `src/modules/nutrition/nutritionDefaults.js`.
- Precificação por unidade extraída para `src/modules/stock/stockPricing.js`.
- Estrutura futura para Supabase e Edge Functions criada.

## Próximo Passo Recomendado

### Fase 1.2 - Modularização do JS

Depois da revisão visual inicial, o próximo passo é quebrar o `src/app.js` por domínio sem mudar comportamento.

Ordem recomendada:

1. Concluído: extrair utilitários de formatação.
2. Concluído: extrair constantes e chaves de storage.
3. Concluído: extrair repository e manter `localStorage` como implementação atual.
4. Concluído: extrair nutrição padrão e precificação por unidade.
5. Próximo: extrair módulo de estoque virtual.
6. Depois: extrair módulo de estoque físico.
7. Depois: extrair módulo de receitas/ficha técnica.
8. Depois: extrair módulo de scanner.
9. Validar app a cada extração.

## Checklist Visual Contínuo

Continuar revisando o protótipo renderizado em:

- Mobile: 390px a 430px.
- Tablet: 768px a 1024px.
- Desktop: 1200px ou maior.

Checklist:

- Navegação inferior no mobile.
- Navigation rail no tablet.
- Navigation drawer no desktop.
- Ficha técnica em duas colunas no tablet/desktop.
- Cards de estoque e receitas em grid.
- Hierarquia de custo, margem e preço sugerido.
- Logo genérico provisório.
- Paleta gastronômica/premium.
