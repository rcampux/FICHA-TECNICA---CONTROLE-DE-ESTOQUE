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
- Estrutura futura para Supabase e Edge Functions criada.

## Próximo Passo Recomendado

### Fase 1.2 - Modularização do JS

Depois da revisão visual inicial, o próximo passo é quebrar o `src/app.js` por domínio sem mudar comportamento.

Ordem recomendada:

1. Extrair utilitários de formatação.
2. Extrair constantes e chaves de storage.
3. Extrair repository e manter `localStorage` como implementação atual.
4. Extrair módulo de estoque virtual.
5. Extrair módulo de estoque físico.
6. Extrair módulo de receitas/ficha técnica.
7. Extrair módulo de scanner.
8. Validar app a cada extração.

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

