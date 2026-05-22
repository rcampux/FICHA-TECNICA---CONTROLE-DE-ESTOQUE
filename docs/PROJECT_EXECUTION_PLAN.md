# FichaTec - Plano de Execucao do Projeto

Este documento deve ser seguido a cada nova etapa do projeto. Ele consolida diretrizes, ordem de trabalho, criterio de pronto e o que precisa ser informado ao final de cada task.

## Regras Fixas

- O app e mobile first, mas deve ficar bonito e funcional em tablet e desktop.
- A base visual segue Material Design 3, com identidade gastronomica premium inspirada na experiencia fluida de apps de delivery.
- Evitar redundancia de codigo, duplicidade de funcoes e logica espalhada.
- Toda nova funcao criada, movida, renomeada ou removida deve ser registrada em `docs/FUNCTION_INVENTORY.md`.
- Toda diretriz primordial para o produto deve ser adicionada na documentacao do projeto.
- A cada etapa relevante, validar localmente antes de finalizar.
- Toda vez que um commit for criado, fazer tambem o push para GitHub e o deploy de producao na Vercel na mesma etapa.
- Deploy de producao so deve acontecer depois do GitHub estar atualizado com o commit correspondente.
- Se push ou deploy falhar, registrar o motivo no fechamento da task e deixar o comando de retomada claro.
- Em modo Supabase, dados privados em cache local devem ser limpos quando nao houver sessao autenticada ou quando o usuario fizer logout.
- Cadastro deve exigir senha forte com pelo menos 8 caracteres, letra maiuscula, letra minuscula, numero e caractere especial.
- O formulario de autenticacao nao deve manter senha ou dados sensiveis ao alternar entre login/cadastro, apos erro, ou apos envio de cadastro.
- Apos criar conta com confirmacao de e-mail obrigatoria, o modal deve explicar que o usuario precisa verificar o e-mail antes de acessar o app.
- No mobile e desktop, listas de produtos e receitas devem manter apenas icones explicitos de editar/excluir nos cards, sem depender de gesto para acessar CRUD.
- Acoes destrutivas devem pedir confirmacao visual com opcoes claras de sim/nao antes de excluir ou sobrescrever dados.

## Ordem Atual de Execucao

1. Concluir modularizacao do prototipo atual.
2. Validar PWA basico: manifest, service worker, icones e instalabilidade.
3. Desenhar schema Supabase com Auth, RLS e multiempresa.
4. Migrar persistencia de `localStorage` para camada repository compativel com Supabase.
5. Criar estrutura de planos e permissao por recurso.
6. Integrar gateway de pagamento com webhooks.
7. Evoluir scanner/OCR com fila, revisao e limite por plano.
8. Preparar busca de precos online com fonte/API definida.
9. Preparar arquitetura futura para comunidade e patrocinadores.

## Criterio de Pronto Por Etapa

- Codigo separado por dominio quando a mudanca envolver logica grande.
- Nenhuma funcao nova sem inventario atualizado.
- `docs/NEXT_STEPS.md` atualizado com o proximo passo sequencial.
- Scripts principais passam em validacao de sintaxe.
- Prototipo local abre no link disponivel.
- Commit criado implica push e deploy concluido na mesma etapa.
- Ao final, responder sempre:
  - O que foi feito.
  - O que ainda falta.
  - Link de visualizacao local ou publicado.
  - Se houve ou nao commit/deploy.

## Estado Modular Atual

- `src/config/storageKeys.js`: chaves de storage.
- `src/utils/formatters.js`: formatacao de moeda e quantidade.
- `src/services/repositories/localStorageRepository.js`: repository local temporario.
- `src/services/repositories/hybridRepository.js`: ponte local/Supabase sem quebrar o prototipo atual.
- `src/services/repositories/supabaseDomainRepository.js`: conversores e repositories remotos por dominio.
- `src/services/supabaseClient.js`: carregamento seguro do client Supabase com anon key publica.
- `src/config/supabase.js`: configuracao de modo local/Supabase.
- `src/modules/auth/authSession.js`: estado de sessao, login/cadastro Supabase e selecao de workspace.
- `scripts/sync-public-assets.mjs`: sincroniza assets e injeta configuracao publica Supabase no build.
- `src/modules/nutrition/nutritionDefaults.js`: nutricao padrao.
- `src/modules/stock/stockPricing.js`: calculo de preco por unidade base.
- `src/modules/stock/virtualStock.js`: estoque virtual.
- `src/modules/stock/physicalStock.js`: estoque fisico.
- `src/modules/recipes/recipeSheet.js`: ficha tecnica e receitas.
- `src/modules/scanner/scannerRecipe.js`: scanner de receita por imagem.
- `src/pwa/registerServiceWorker.js`: registro PWA e atalhos de inicializacao.
- `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql`: schema inicial multiempresa com RLS.

## Proximo Marco Recomendado

Depois de concluir a base PWA, iniciar Fase 2.1: desenho do Supabase.

Entregaveis da Fase 2.1:

- Concluido: fluxo visual de login.
- Concluido: tela de estado autenticado.
- Concluido: selecao de organizacao/workspace.
- Concluido: repositories remotos para estoque, receitas e ficha tecnica.
- Concluido: preparar build/env para ativar Supabase na Vercel.
- Proximo: configurar Supabase real e testar RLS com dois usuarios.
