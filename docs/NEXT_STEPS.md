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
- Diretriz adicionada: todo commit deve ser seguido de push para GitHub e deploy de producao na Vercel.
- Base PWA criada com manifest, service worker, registro e icones temporarios.
- Migration inicial Supabase multiempresa criada com Auth/RLS, receitas, estoque, scanner e assinaturas.
- Cliente Supabase e repository hibrido criados no frontend, mantendo `localStorage` como modo padrao.
- Fluxo visual de acesso criado: estado local, modal de login/cadastro, sessao Supabase e selecao de workspace.
- Repository Supabase por dominio criado para estoque virtual, estoque fisico, receitas, ingredientes e nutricao.
- Hidratação de dados por workspace criada e escrita remota em background preparada.
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
9. Concluido: fechar base PWA real.

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

Fase 2.1 - Supabase seguro:

1. Definir schema inicial multiempresa.
2. Concluido: criar tabelas de usuarios, workspaces, receitas, ingredientes e estoque.
3. Concluido: definir Auth e papeis: owner, admin, chef, viewer.
4. Concluido: escrever politicas RLS por workspace.
5. Concluido: criar cliente Supabase no frontend e repository hibrido.
6. Concluido: criar fluxo visual de login e estado autenticado.
7. Concluido: mapear repositories remotos por dominio mantendo `localStorage` como fallback.
8. Proximo: configurar projeto Supabase real, aplicar migration e testar Auth/RLS com dois usuarios.
