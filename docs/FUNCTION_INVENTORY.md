# FichaTec - Inventario de Funcoes

Este arquivo e um inventario vivo das funcoes utilizadas no projeto. Toda nova funcao criada, movida, renomeada ou removida deve ser refletida aqui durante a mesma etapa de trabalho.

## Regra

- Registrar nome da funcao, arquivo, linha aproximada e responsabilidade.
- Manter este arquivo atualizado antes de commit/push.
- Quando a funcao for parte de um modulo, indicar o modulo no caminho do arquivo.
- Funcoes SQL de migrations tambem devem ser registradas.
- Este inventario apoia a documentacao final, auditoria tecnica e futuras refatoracoes para Supabase, PWA e assinaturas.

## Funcoes Atuais

| Funcao | Arquivo | Linha | Responsabilidade inicial |
| --- | --- | ---: | --- |
| `resolveRequestPath` | `scripts/dev-server.mjs` | 19 | function resolveRequestPath(url) { |
| `toQuotedString` | `scripts/sync-public-assets.mjs` | 9 | Serializa valores de ambiente para gerar JS publico seguro. |
| `buildPublicEnvConfig` | `scripts/sync-public-assets.mjs` | 13 | Gera `public/src/config/env.js` com modo local ou Supabase no build. |
| `syncPublicAssets` | `scripts/sync-public-assets.mjs` | 32 | Sincroniza `src` para `public/src` e injeta configuracao publica. |
| `showToast` | `src/app.js` | 11 | function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);} |
| `confirmAction` | `src/app.js` | 13 | Abre modal de confirmacao visual com opcoes de sim/nao para acoes destrutivas. |
| `closeConfirmAction` | `src/app.js` | 21 | Fecha o modal de confirmacao e resolve a decisao pendente. |
| `showPage` | `src/app.js` | 25 | function showPage(page,navId){ |
| `closeModal` | `src/app.js` | 34 | function closeModal(id){document.getElementById(id).classList.remove('open');} |
| `hydrateWorkspaceData` | `src/app.js` | 105 | Carrega estoque, estoque fisico e receitas do Supabase quando um workspace e selecionado. |
| `applyRemoteSave` | `src/app.js` | 130 | Atualiza o estado em memoria depois que uma escrita remota retorna `remoteId`. |
| `clearSessionData` | `src/app.js` | 143 | Limpa cache local, estado em memoria e telas quando nao ha sessao Supabase ativa. |
| `exposeStorageKeys` | `src/config/storageKeys.js` | 1 | (function exposeStorageKeys() { |
| `exposeSupabaseConfig` | `src/config/supabase.js` | 1 | (function exposeSupabaseConfig() { |
| `hasSupabaseConfig` | `src/config/supabase.js` | 5 | function hasSupabaseConfig() { |
| `exposeNutrition` | `src/modules/nutrition/nutritionDefaults.js` | 1 | (function exposeNutrition() { |
| `getNutrition` | `src/modules/nutrition/nutritionDefaults.js` | 30 | function getNutrition(name) { |
| `exposeAuthSessionModule` | `src/modules/auth/authSession.js` | 1 | Expõe o modulo de sessao, login e workspace para a aplicacao. |
| `createAuthSessionModule` | `src/modules/auth/authSession.js` | 2 | Cria a camada de autenticacao desacoplada do app principal. |
| `getElement` | `src/modules/auth/authSession.js` | 22 | Recupera elementos de UI usados no modal de acesso. |
| `getAuthState` | `src/modules/auth/authSession.js` | 26 | Retorna estado publico de autenticacao, usuario e workspace ativo. |
| `escapeHtml` | `src/modules/auth/authSession.js` | 36 | Escapa dados vindos do banco antes de renderizar workspaces. |
| `dispatchWorkspaceChange` | `src/modules/auth/authSession.js` | 46 | Dispara evento de mudanca de workspace para hidratar dados remotos. |
| `dispatchSignedOut` | `src/modules/auth/authSession.js` | 53 | Dispara evento para limpar dados locais quando a sessao Supabase termina. |
| `getAuthRedirectUrl` | `src/modules/auth/authSession.js` | 58 | Monta URL atual do app para redirecionamento de confirmacao de e-mail. |
| `getPasswordValidation` | `src/modules/auth/authSession.js` | 62 | Valida requisitos de senha forte para criacao de conta. |
| `isStrongPassword` | `src/modules/auth/authSession.js` | 73 | Confirma se todos os requisitos de senha forte foram atendidos. |
| `showInitialUserScreen` | `src/modules/auth/authSession.js` | 77 | Fecha o modal de acesso e retorna para a tela inicial do usuario apos login. |
| `handleAuthKeydown` | `src/modules/auth/authSession.js` | 84 | Submete login/cadastro ao pressionar Enter nos campos de acesso. |
| `clearAuthInputs` | `src/modules/auth/authSession.js` | 90 | Limpa campos sensiveis do formulario de acesso e restaura o campo de senha. |
| `initAuthSession` | `src/modules/auth/authSession.js` | 57 | Inicializa modo local ou Supabase Auth sem bloquear o prototipo. |
| `syncSupabaseSession` | `src/modules/auth/authSession.js` | 88 | Sincroniza sessao Supabase no estado local do modulo. |
| `loadOrganizations` | `src/modules/auth/authSession.js` | 98 | Carrega workspaces do usuario autenticado via `organization_members`. |
| `renderAuthState` | `src/modules/auth/authSession.js` | 135 | Renderiza botao de sessao, formulario e lista de workspaces. |
| `renderPasswordFeedback` | `src/modules/auth/authSession.js` | 207 | Renderiza checklist visual dos requisitos de senha forte. |
| `togglePasswordVisibility` | `src/modules/auth/authSession.js` | 228 | Alterna a visibilidade da senha no modal de acesso. |
| `openAuthModal` | `src/modules/auth/authSession.js` | 199 | Abre o modal de acesso/workspace. |
| `setAuthMode` | `src/modules/auth/authSession.js` | 204 | Alterna entre login e criacao de conta. |
| `submitAuthForm` | `src/modules/auth/authSession.js` | 211 | Executa login ou cadastro usando Supabase Auth quando habilitado. |
| `resendConfirmationEmail` | `src/modules/auth/authSession.js` | 251 | Reenvia o e-mail de confirmacao do Supabase Auth usando o redirect atual da Vercel. |
| `backToAuthForm` | `src/modules/auth/authSession.js` | 396 | Sai do estado de verificacao de email e volta para o formulario de login. |
| `signOutAuth` | `src/modules/auth/authSession.js` | 286 | Encerra a sessao autenticada no Supabase. |
| `selectOrganization` | `src/modules/auth/authSession.js` | 298 | Define o workspace ativo para futuras operacoes remotas. |
| `exposeRecipeSheetModule` | `src/modules/recipes/recipeSheet.js` | 1 | (function exposeRecipeSheetModule() { |
| `createRecipeSheetModule` | `src/modules/recipes/recipeSheet.js` | 2 | function createRecipeSheetModule(deps) { |
| `syncState` | `src/modules/recipes/recipeSheet.js` | 30 | function syncState() { |
| `commitState` | `src/modules/recipes/recipeSheet.js` | 36 | function commitState() { |
| `persistRecipesSnapshot` | `src/modules/recipes/recipeSheet.js` | 43 | Persiste receitas localmente e, quando Supabase esta ativo, aguarda a escrita remota para preservar `remoteId` em editar/deletar. |
| `focusRecipeCard` | `src/modules/recipes/recipeSheet.js` | 65 | Localiza a ultima receita salva, destaca o card e rola a aba Receitas ate ela. |
| `getActionIdArg` | `src/modules/recipes/recipeSheet.js` | 78 | Gera argumento seguro para handlers inline com IDs UUID sem quebrar atributos HTML. |
| `findStockItem` | `src/modules/recipes/recipeSheet.js` | 42 | function findStockItem(stockId,name){ |
| `calcCosts` | `src/modules/recipes/recipeSheet.js` | 46 | function calcCosts(ingredients,markup=0){ |
| `setIngSource` | `src/modules/recipes/recipeSheet.js` | 52 | function setIngSource(src){ |
| `searchIngredient` | `src/modules/recipes/recipeSheet.js` | 62 | function searchIngredient(){ |
| `selectIngredient` | `src/modules/recipes/recipeSheet.js` | 82 | function selectIngredient(id){ |
| `calcIngCost` | `src/modules/recipes/recipeSheet.js` | 97 | function calcIngCost(){ |
| `addIngredient` | `src/modules/recipes/recipeSheet.js` | 107 | function addIngredient(){ |
| `removeIngredient` | `src/modules/recipes/recipeSheet.js` | 139 | Remove ingrediente da ficha apos confirmacao visual. |
| `renderIngredients` | `src/modules/recipes/recipeSheet.js` | 140 | function renderIngredients(){ |
| `calcFicha` | `src/modules/recipes/recipeSheet.js` | 155 | function calcFicha(){ |
| `calcNutrition` | `src/modules/recipes/recipeSheet.js` | 168 | function calcNutrition(){ |
| `clearFicha` | `src/modules/recipes/recipeSheet.js` | 196 | Limpa a ficha atual apos confirmacao, com modo forcado/silencioso para logout seguro. |
| `saveRecipe` | `src/modules/recipes/recipeSheet.js` | 247 | Salva ou sobrescreve receita preservando `id/remoteId`, exige confirmacao do Supabase quando ativo, redireciona para Receitas, foca a ultima ficha salva e limpa a montagem. |
| `hasPriceChanged` | `src/modules/recipes/recipeSheet.js` | 228 | function hasPriceChanged(refs){ |
| `renderRecipes` | `src/modules/recipes/recipeSheet.js` | 280 | Renderiza cards de receitas com IDs seguros para UUID em editar, deletar, visualizar e exportar PDF. |
| `setIngFilter` | `src/modules/recipes/recipeSheet.js` | 274 | function setIngFilter(val){activeIngFilter=val;renderRecipes(document.getElementById('recipe-search').value,val);} |
| `viewRecipe` | `src/modules/recipes/recipeSheet.js` | 275 | function viewRecipe(id){ |
| `deleteCurrentRecipe` | `src/modules/recipes/recipeSheet.js` | 379 | Exclui a receita atual apos confirmacao visual e sincroniza o snapshot com Supabase quando ativo. |
| `editRecipe` | `src/modules/recipes/recipeSheet.js` | 343 | Define a receita atual e carrega seus dados na ficha tecnica para edicao. |
| `deleteRecipe` | `src/modules/recipes/recipeSheet.js` | 347 | Define a receita atual e reaproveita o fluxo existente de exclusao. |
| `loadRecipeToFicha` | `src/modules/recipes/recipeSheet.js` | 337 | function loadRecipeToFicha(){ |
| `exportRecipePDF` | `src/modules/recipes/recipeSheet.js` | 350 | function exportRecipePDF(id){ |
| `runWithState` | `src/modules/recipes/recipeSheet.js` | 425 | function runWithState(fn, options = {}) { |
| `wrappedRecipeFunction` | `src/modules/recipes/recipeSheet.js` | 427 | return function wrappedRecipeFunction(...args) { |
| `getActiveIngredientFilter` | `src/modules/recipes/recipeSheet.js` | 435 | function getActiveIngredientFilter() { return activeIngFilter; } |
| `getCurrentRecipeId` | `src/modules/recipes/recipeSheet.js` | 436 | function getCurrentRecipeId() { return currentRecipeId; } |
| `exposeScannerRecipeModule` | `src/modules/scanner/scannerRecipe.js` | 1 | (function exposeScannerRecipeModule() { |
| `createScannerRecipeModule` | `src/modules/scanner/scannerRecipe.js` | 2 | function createScannerRecipeModule(deps) { |
| `syncState` | `src/modules/scanner/scannerRecipe.js` | 23 | function syncState() { |
| `commitState` | `src/modules/scanner/scannerRecipe.js` | 28 | function commitState() { |
| `openScanModal` | `src/modules/scanner/scannerRecipe.js` | 32 | function openScanModal() { |
| `resetScan` | `src/modules/scanner/scannerRecipe.js` | 37 | function resetScan() { |
| `setScanStatus` | `src/modules/scanner/scannerRecipe.js` | 51 | function setScanStatus(type, msg) { |
| `handleScanFile` | `src/modules/scanner/scannerRecipe.js` | 60 | async function handleScanFile(event) { |
| `compressImage` | `src/modules/scanner/scannerRecipe.js` | 76 | function compressImage(base64, maxWidth, quality) { |
| `analyzeRecipeImage` | `src/modules/scanner/scannerRecipe.js` | 96 | async function analyzeRecipeImage(base64) { |
| `renderScanResult` | `src/modules/scanner/scannerRecipe.js` | 118 | function renderScanResult(recipe) { |
| `removeScanIng` | `src/modules/scanner/scannerRecipe.js` | 155 | Remove ingrediente digitalizado apos confirmacao visual. |
| `confirmScanSave` | `src/modules/scanner/scannerRecipe.js` | 161 | Salva receita digitalizada e confirma sobrescrita quando houver nome duplicado. |
| `exposePhysicalStockModule` | `src/modules/stock/physicalStock.js` | 1 | (function exposePhysicalStockModule() { |
| `createPhysicalStockModule` | `src/modules/stock/physicalStock.js` | 2 | function createPhysicalStockModule(deps) { |
| `getActionIdArg` | `src/modules/stock/physicalStock.js` | 30 | Gera argumento seguro para handlers inline com IDs UUID no estoque fisico. |
| `persistPhysicalSnapshot` | `src/modules/stock/physicalStock.js` | 34 | Persiste estoque fisico localmente e aguarda sincronizacao Supabase quando houver workspace ativo. |
| `persistVirtualStockSnapshot` | `src/modules/stock/physicalStock.js` | 51 | Sincroniza o estoque virtual gerado a partir do estoque fisico sem enfileirar escrita remota duplicada. |
| `applyPhysicalViewMode` | `src/modules/stock/physicalStock.js` | 26 | Aplica classe e estado visual do modo grid/lista no estoque fisico. |
| `setPhysicalViewMode` | `src/modules/stock/physicalStock.js` | 34 | Persiste a preferencia grid/lista do estoque fisico e re-renderiza a lista atual. |
| `getPhysicalCategories` | `src/modules/stock/physicalStock.js` | 42 | Retorna categorias do catalogo compartilhado para filtro multi-selecao no estoque fisico. |
| `renderPhysicalCategoryFilters` | `src/modules/stock/physicalStock.js` | 47 | Renderiza lista de categorias selecionaveis no painel do funil fisico. |
| `togglePhysicalCategoryPanel` | `src/modules/stock/physicalStock.js` | 72 | Abre ou fecha o painel de categorias do estoque fisico. |
| `togglePhysicalCategoryFilter` | `src/modules/stock/physicalStock.js` | 80 | Alterna uma categoria no filtro multi-selecao do estoque fisico. |
| `clearPhysicalCategoryFilters` | `src/modules/stock/physicalStock.js` | 90 | Limpa filtros de categoria aplicados ao estoque fisico. |
| `stockColor` | `src/modules/stock/physicalStock.js` | 96 | function stockColor(percent) { |
| `stockFlag` | `src/modules/stock/physicalStock.js` | 100 | function stockFlag(percent) { |
| `stockBar` | `src/modules/stock/physicalStock.js` | 106 | function stockBar(percent) { |
| `openPhysicalModal` | `src/modules/stock/physicalStock.js` | 110 | function openPhysicalModal(id = null) { |
| `savePhysical` | `src/modules/stock/physicalStock.js` | 171 | Salva ou edita produto fisico preservando IDs remotos e aguardando Supabase quando ativo. |
| `deletePhysical` | `src/modules/stock/physicalStock.js` | 223 | Exclui produto fisico apos confirmacao visual e sincroniza o snapshot remoto. |
| `renderPhysical` | `src/modules/stock/physicalStock.js` | 198 | Renderiza estoque fisico com botoes de editar/deletar/usar/repor usando IDs seguros para UUID. |
| `openMove` | `src/modules/stock/physicalStock.js` | 167 | function openMove(id) { |
| `setMoveType` | `src/modules/stock/physicalStock.js` | 185 | function setMoveType(type) { |
| `confirmMove` | `src/modules/stock/physicalStock.js` | 193 | function confirmMove() { |
| `exposeStockPricing` | `src/modules/stock/stockPricing.js` | 1 | (function exposeStockPricing() { |
| `pricePerUnit` | `src/modules/stock/stockPricing.js` | 2 | function pricePerUnit(stockItem) { |
| `exposeCategoryCatalogModule` | `src/modules/stock/categoryCatalog.js` | 1 | Expoe o catalogo compartilhado de categorias para estoque virtual e fisico. |
| `createCategoryCatalogModule` | `src/modules/stock/categoryCatalog.js` | 2 | Cria o modulo centralizado de cadastro, normalizacao e listagem de categorias. |
| `normalizeCategoryName` | `src/modules/stock/categoryCatalog.js` | 31 | Normaliza nome de categoria antes de salvar ou comparar. |
| `escapeOptionValue` | `src/modules/stock/categoryCatalog.js` | 35 | Escapa valores renderizados em `option` para evitar HTML invalido. |
| `getDefaultCategoryNames` | `src/modules/stock/categoryCatalog.js` | 41 | Retorna categorias padrao reutilizaveis nos dois estoques. |
| `getCategoryNames` | `src/modules/stock/categoryCatalog.js` | 45 | Mescla categorias padrao, cadastradas e usadas em produtos existentes. |
| `persistCategories` | `src/modules/stock/categoryCatalog.js` | 56 | Persiste o catalogo local de categorias reutilizaveis. |
| `ensureCategory` | `src/modules/stock/categoryCatalog.js` | 63 | Garante existencia de uma categoria antes de vincula-la a um produto. |
| `renderCategoryOptions` | `src/modules/stock/categoryCatalog.js` | 74 | Preenche selects de categoria do estoque virtual e fisico. |
| `openCategoryModal` | `src/modules/stock/categoryCatalog.js` | 90 | Abre modal de cadastro independente de categoria. |
| `saveCategory` | `src/modules/stock/categoryCatalog.js` | 98 | Salva categoria avulsa e atualiza filtros/opcoes dos estoques. |
| `handleCategoryKeydown` | `src/modules/stock/categoryCatalog.js` | 115 | Permite salvar categoria pressionando Enter no modal. |
| `exposeVirtualStockModule` | `src/modules/stock/virtualStock.js` | 1 | (function exposeVirtualStockModule() { |
| `createVirtualStockModule` | `src/modules/stock/virtualStock.js` | 2 | function createVirtualStockModule(deps) { |
| `getActionIdArg` | `src/modules/stock/virtualStock.js` | 25 | Gera argumento seguro para handlers inline com IDs UUID no estoque virtual. |
| `persistStockSnapshot` | `src/modules/stock/virtualStock.js` | 29 | Persiste estoque virtual localmente e aguarda sincronizacao Supabase quando houver workspace ativo. |
| `applyStockViewMode` | `src/modules/stock/virtualStock.js` | 21 | Aplica classe e estado visual do modo grid/lista no estoque virtual. |
| `setStockViewMode` | `src/modules/stock/virtualStock.js` | 29 | Persiste a preferencia grid/lista do estoque virtual e re-renderiza a lista atual. |
| `getStockCategories` | `src/modules/stock/virtualStock.js` | 37 | Retorna categorias do catalogo compartilhado para filtro multi-selecao no estoque virtual. |
| `renderStockCategoryFilters` | `src/modules/stock/virtualStock.js` | 42 | Renderiza lista de categorias selecionaveis no painel do funil virtual. |
| `toggleStockCategoryPanel` | `src/modules/stock/virtualStock.js` | 67 | Abre ou fecha o painel de categorias do estoque virtual. |
| `toggleStockCategoryFilter` | `src/modules/stock/virtualStock.js` | 75 | Alterna uma categoria no filtro multi-selecao do estoque virtual. |
| `clearStockCategoryFilters` | `src/modules/stock/virtualStock.js` | 85 | Limpa filtros de categoria aplicados ao estoque virtual. |
| `openStockModal` | `src/modules/stock/virtualStock.js` | 94 | function openStockModal(id=null){ |
| `updateGoogleLink` | `src/modules/stock/virtualStock.js` | 116 | function updateGoogleLink(){ |
| `handleGoogleSearch` | `src/modules/stock/virtualStock.js` | 121 | function handleGoogleSearch(e){const h=document.getElementById('google-search-link').href;if(!h\|\|h==='#'){e.preventDefault();return;}window.open(h,'_blank');e |
| `saveStock` | `src/modules/stock/virtualStock.js` | 145 | Salva ou edita produto virtual preservando IDs remotos e aguardando Supabase quando ativo. |
| `deleteStock` | `src/modules/stock/virtualStock.js` | 163 | Exclui produto virtual apos confirmacao visual e sincroniza o snapshot remoto. |
| `renderStock` | `src/modules/stock/virtualStock.js` | 143 | Renderiza estoque virtual com botoes de editar/deletar usando IDs seguros para UUID. |
| `registerFichaTecServiceWorker` | `src/pwa/registerServiceWorker.js` | 1 | (function registerFichaTecServiceWorker() { |
| `handleLaunchShortcut` | `src/pwa/registerServiceWorker.js` | 2 | function handleLaunchShortcut() { |
| `registerServiceWorker` | `src/pwa/registerServiceWorker.js` | 13 | function registerServiceWorker() { |
| `shouldCacheResponse` | `service-worker.js` / `public/service-worker.js` | 27 | Valida respostas antes de inserir no cache PWA, evitando cache de 404/HTML inesperado. |
| `cacheAppShell` | `service-worker.js` / `public/service-worker.js` | 31 | Pre-carrega assets principais com tolerancia a falhas individuais. |
| `deleteOldCaches` | `service-worker.js` / `public/service-worker.js` | 45 | Remove versoes antigas do cache PWA na ativacao. |
| `networkFirstNavigation` | `service-worker.js` / `public/service-worker.js` | 50 | Tenta navegacao online primeiro e usa app shell cacheado como fallback offline. |
| `cacheFirstAsset` | `service-worker.js` / `public/service-worker.js` | 65 | Entrega assets pelo cache quando possivel e grava apenas respostas validas. |
| `exposeHybridRepository` | `src/services/repositories/hybridRepository.js` | 1 | (function exposeHybridRepository() { |
| `getMode` | `src/services/repositories/hybridRepository.js` | 7 | Retorna `local` ou `supabase` conforme configuracao ativa. |
| `getSupabaseClient` | `src/services/repositories/hybridRepository.js` | 11 | Reusa a promise do cliente Supabase para leituras/escritas remotas. |
| `getActiveOrganizationId` | `src/services/repositories/hybridRepository.js` | 19 | Lê o workspace ativo a partir do estado de autenticacao. |
| `load` | `src/services/repositories/hybridRepository.js` | 23 | Carrega dados locais do `localStorage`. |
| `save` | `src/services/repositories/hybridRepository.js` | 27 | Salva localmente e enfileira sincronizacao remota quando habilitada. |
| `saveLocal` | `src/services/repositories/hybridRepository.js` | 32 | Salva somente no cache local para fluxos que aguardam `saveRemote` explicitamente e evitam sync duplicado. |
| `remove` | `src/services/repositories/hybridRepository.js` | 32 | Remove uma chave local sem afetar dados remotos no Supabase. |
| `loadRemote` | `src/services/repositories/hybridRepository.js` | 36 | Carrega dados Supabase por chave de dominio e organizacao. |
| `saveRemote` | `src/services/repositories/hybridRepository.js` | 42 | Salva dados Supabase por chave de dominio e atualiza cache local. |
| `queueRemoteSave` | `src/services/repositories/hybridRepository.js` | 50 | Executa sincronizacao remota em background e emite evento de retorno. |
| `exposeSupabaseDomainRepository` | `src/services/repositories/supabaseDomainRepository.js` | 1 | Expõe o repository de dominio Supabase para estoque, fichas e receitas. |
| `normalizeNumber` | `src/services/repositories/supabaseDomainRepository.js` | 4 | Normaliza valores numericos vindos do app ou do banco. |
| `centsFromCurrency` | `src/services/repositories/supabaseDomainRepository.js` | 9 | Converte valores em reais para centavos inteiros. |
| `currencyFromCents` | `src/services/repositories/supabaseDomainRepository.js` | 13 | Converte centavos do banco para reais no app. |
| `getRemoteId` | `src/services/repositories/supabaseDomainRepository.js` | 17 | Resolve o identificador remoto sem quebrar IDs locais do prototipo. |
| `mapNutritionToRemote` | `src/services/repositories/supabaseDomainRepository.js` | 21 | Converte nutricao do app para `nutrition_facts`. |
| `mapNutritionFromRemote` | `src/services/repositories/supabaseDomainRepository.js` | 37 | Converte `nutrition_facts` para o formato usado no app. |
| `shouldReconcileDeletes` | `src/services/repositories/supabaseDomainRepository.js` | 49 | Define quando e seguro reconciliar exclusoes remotas, incluindo snapshot vazio ja hidratado. |
| `softDeleteMissingRows` | `src/services/repositories/supabaseDomainRepository.js` | 53 | Marca como deletadas linhas remotas ausentes do snapshot local seguro, inclusive quando todos os itens foram removidos. |
| `deleteMissingRecipeIngredients` | `src/services/repositories/supabaseDomainRepository.js` | 73 | Remove ingredientes remotos ausentes da receita sincronizada, inclusive quando a lista fica vazia. |
| `mapStockToRemote` | `src/services/repositories/supabaseDomainRepository.js` | 80 | Converte estoque virtual para `stock_items`. |
| `mapStockFromRemote` | `src/services/repositories/supabaseDomainRepository.js` | 95 | Converte `stock_items` para estoque virtual do app. |
| `mapPhysicalToRemote` | `src/services/repositories/supabaseDomainRepository.js` | 110 | Converte estoque fisico para `physical_stock_items`. |
| `mapPhysicalFromRemote` | `src/services/repositories/supabaseDomainRepository.js` | 126 | Converte `physical_stock_items` para estoque fisico do app. |
| `mapRecipeToRemote` | `src/services/repositories/supabaseDomainRepository.js` | 144 | Converte receita/ficha tecnica para `recipes`. |
| `mapRecipeFromRemote` | `src/services/repositories/supabaseDomainRepository.js` | 163 | Converte `recipes` com ingredientes para formato do app. |
| `mapRecipeIngredientToRemote` | `src/services/repositories/supabaseDomainRepository.js` | 193 | Converte ingrediente da ficha para `recipe_ingredients`, separando corretamente itens virtuais e fisicos com UUID. |
| `mapRecipeIngredientFromRemote` | `src/services/repositories/supabaseDomainRepository.js` | 204 | Converte `recipe_ingredients` para ingrediente do app. |
| `upsertNutrition` | `src/services/repositories/supabaseDomainRepository.js` | 224 | Salva snapshot nutricional manual em `nutrition_facts`. |
| `listStockItems` | `src/services/repositories/supabaseDomainRepository.js` | 237 | Lista estoque virtual remoto por organizacao. |
| `saveStockItems` | `src/services/repositories/supabaseDomainRepository.js` | 249 | Salva estoque virtual remoto e retorna `remoteId`. |
| `listPhysicalStockItems` | `src/services/repositories/supabaseDomainRepository.js` | 268 | Lista estoque fisico remoto por organizacao. |
| `savePhysicalStockItems` | `src/services/repositories/supabaseDomainRepository.js` | 280 | Salva estoque fisico remoto e retorna `remoteId`. |
| `listRecipes` | `src/services/repositories/supabaseDomainRepository.js` | 298 | Lista receitas remotas com ingredientes. |
| `saveRecipes` | `src/services/repositories/supabaseDomainRepository.js` | 310 | Salva receitas e ingredientes no Supabase. |
| `resolveDomain` | `src/services/repositories/supabaseDomainRepository.js` | 342 | Mapeia chave local para funcoes remotas de dominio. |
| `loadByKey` | `src/services/repositories/supabaseDomainRepository.js` | 349 | Carrega dominio remoto a partir da chave local. |
| `saveByKey` | `src/services/repositories/supabaseDomainRepository.js` | 355 | Salva dominio remoto a partir da chave local. |
| `exposeLocalStorageRepository` | `src/services/repositories/localStorageRepository.js` | 1 | (function exposeLocalStorageRepository() { |
| `load` | `src/services/repositories/localStorageRepository.js` | 3 | load(key) { |
| `save` | `src/services/repositories/localStorageRepository.js` | 6 | save(key, value) { |
| `remove` | `src/services/repositories/localStorageRepository.js` | 9 | Remove uma chave local para limpar cache de sessao Supabase. |
| `exposeSupabaseClientService` | `src/services/supabaseClient.js` | 1 | (function exposeSupabaseClientService() { |
| `getSupabaseGlobal` | `src/services/supabaseClient.js` | 5 | function getSupabaseGlobal() { |
| `loadSupabaseLibrary` | `src/services/supabaseClient.js` | 9 | function loadSupabaseLibrary() { |
| `createClient` | `src/services/supabaseClient.js` | 33 | Cria e reutiliza uma unica instancia Supabase no navegador para evitar multiplos GoTrueClient. |
| `exposeFormatters` | `src/utils/formatters.js` | 1 | (function exposeFormatters() { |
| `brl` | `src/utils/formatters.js` | 3 | brl(value) { |
| `quantity` | `src/utils/formatters.js` | 9 | quantity(quantity, unit) { |
| `public.set_updated_at` | `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql` | 272 | create or replace function public.set_updated_at() |
| `public.current_user_role` | `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql` | 282 | create or replace function public.current_user_role(target_organization_id uuid) |
| `public.is_organization_member` | `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql` | 296 | create or replace function public.is_organization_member(target_organization_id uuid) |
| `public.can_manage_organization` | `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql` | 311 | create or replace function public.can_manage_organization(target_organization_id uuid) |
| `public.can_write_organization` | `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql` | 321 | create or replace function public.can_write_organization(target_organization_id uuid) |
| `public.handle_new_user` | `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql` | 331 | Cria profile e organizacao padrao quando um usuario nasce no Supabase Auth. |
| `public.bootstrap_organization_owner` | `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql` | 368 | Adiciona o usuario como owner da organizacao criada e define workspace padrao. |
| `private.set_updated_at` | `supabase/migrations/20260523090000_harden_internal_functions.sql` | 10 | Trigger interno com `search_path` fixo para atualizar `updated_at`. |
| `private.current_user_role` | `supabase/migrations/20260523090000_harden_internal_functions.sql` | 21 | Helper interno de RLS para papel do usuario no workspace. |
| `private.is_organization_member` | `supabase/migrations/20260523090000_harden_internal_functions.sql` | 35 | Helper interno de RLS para validar membro do workspace. |
| `private.can_manage_organization` | `supabase/migrations/20260523090000_harden_internal_functions.sql` | 50 | Helper interno de RLS para permissao administrativa. |
| `private.can_write_organization` | `supabase/migrations/20260523090000_harden_internal_functions.sql` | 60 | Helper interno de RLS para escrita operacional. |
| `private.handle_new_user` | `supabase/migrations/20260523090000_harden_internal_functions.sql` | 70 | Trigger interno para criar profile e organizacao inicial. |
| `private.bootstrap_organization_owner` | `supabase/migrations/20260523090000_harden_internal_functions.sql` | 108 | Trigger interno para vincular owner ao workspace inicial. |
