# FichaTec - Proximo Passo Sequencial

## Estado atual

O projeto esta em fase de prototipo estruturado:

- Diretrizes de produto documentadas.
- Arquitetura tecnica documentada.
- Design system baseado em Material 3 documentado.
- HTML, CSS e JS separados.
- Tokens visuais iniciais aplicados.
- Layout mobile/tablet/desktop iniciado.
- Repository local isolando `localStorage`.
- Estrutura futura para Supabase e Edge Functions criada.

## Proximo passo recomendado

### Fase 1.1 - Revisao visual guiada do prototipo

Antes de quebrar mais o JavaScript em modulos, revisar o prototipo renderizado em:

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
- Logo generico provisório.
- Paleta gastronomica/premium.

### Fase 1.2 - Modularizacao do JS

Depois da revisao visual:

1. Extrair utilitarios de formatacao.
2. Extrair repository e chaves de storage.
3. Extrair modulo de estoque virtual.
4. Extrair modulo de estoque fisico.
5. Extrair modulo de receitas.
6. Extrair modulo de scanner.
7. Manter compatibilidade funcional a cada extracao.

