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
| `showPage` | `src/app.js` | 12 | function showPage(page,navId){ |
| `closeModal` | `src/app.js` | 21 | function closeModal(id){document.getElementById(id).classList.remove('open');} |
| `hydrateWorkspaceData` | `src/app.js` | 105 | Carrega estoque, estoque fisico e receitas do Supabase quando um workspace e selecionado. |
| `applyRemoteSave` | `src/app.js` | 130 | Atualiza o estado em memoria depois que uma escrita remota retorna `remoteId`. |
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
| `initAuthSession` | `src/modules/auth/authSession.js` | 53 | Inicializa modo local ou Supabase Auth sem bloquear o prototipo. |
| `syncSupabaseSession` | `src/modules/auth/authSession.js` | 84 | Sincroniza sessao Supabase no estado local do modulo. |
| `loadOrganizations` | `src/modules/auth/authSession.js` | 94 | Carrega workspaces do usuario autenticado via `organization_members`. |
| `renderAuthState` | `src/modules/auth/authSession.js` | 131 | Renderiza botao de sessao, formulario e lista de workspaces. |
| `openAuthModal` | `src/modules/auth/authSession.js` | 195 | Abre o modal de acesso/workspace. |
| `setAuthMode` | `src/modules/auth/authSession.js` | 200 | Alterna entre login e criacao de conta. |
| `submitAuthForm` | `src/modules/auth/authSession.js` | 207 | Executa login ou cadastro usando Supabase Auth quando habilitado. |
| `signOutAuth` | `src/modules/auth/authSession.js` | 243 | Encerra a sessao autenticada no Supabase. |
| `selectOrganization` | `src/modules/auth/authSession.js` | 255 | Define o workspace ativo para futuras operacoes remotas. |
| `exposeRecipeSheetModule` | `src/modules/recipes/recipeSheet.js` | 1 | (function exposeRecipeSheetModule() { |
| `createRecipeSheetModule` | `src/modules/recipes/recipeSheet.js` | 2 | function createRecipeSheetModule(deps) { |
| `syncState` | `src/modules/recipes/recipeSheet.js` | 30 | function syncState() { |
| `commitState` | `src/modules/recipes/recipeSheet.js` | 36 | function commitState() { |
| `findStockItem` | `src/modules/recipes/recipeSheet.js` | 42 | function findStockItem(stockId,name){ |
| `calcCosts` | `src/modules/recipes/recipeSheet.js` | 46 | function calcCosts(ingredients,markup=0){ |
| `setIngSource` | `src/modules/recipes/recipeSheet.js` | 52 | function setIngSource(src){ |
| `searchIngredient` | `src/modules/recipes/recipeSheet.js` | 62 | function searchIngredient(){ |
| `selectIngredient` | `src/modules/recipes/recipeSheet.js` | 82 | function selectIngredient(id){ |
| `calcIngCost` | `src/modules/recipes/recipeSheet.js` | 97 | function calcIngCost(){ |
| `addIngredient` | `src/modules/recipes/recipeSheet.js` | 107 | function addIngredient(){ |
| `removeIngredient` | `src/modules/recipes/recipeSheet.js` | 139 | function removeIngredient(id){currentIngredients=currentIngredients.filter(i=>i.id!==id);renderIngredients();calcFicha();} |
| `renderIngredients` | `src/modules/recipes/recipeSheet.js` | 140 | function renderIngredients(){ |
| `calcFicha` | `src/modules/recipes/recipeSheet.js` | 155 | function calcFicha(){ |
| `calcNutrition` | `src/modules/recipes/recipeSheet.js` | 168 | function calcNutrition(){ |
| `clearFicha` | `src/modules/recipes/recipeSheet.js` | 196 | function clearFicha(){ |
| `saveRecipe` | `src/modules/recipes/recipeSheet.js` | 205 | function saveRecipe(){ |
| `hasPriceChanged` | `src/modules/recipes/recipeSheet.js` | 228 | function hasPriceChanged(refs){ |
| `renderRecipes` | `src/modules/recipes/recipeSheet.js` | 235 | function renderRecipes(filter='',ingFilter=null){ |
| `setIngFilter` | `src/modules/recipes/recipeSheet.js` | 274 | function setIngFilter(val){activeIngFilter=val;renderRecipes(document.getElementById('recipe-search').value,val);} |
| `viewRecipe` | `src/modules/recipes/recipeSheet.js` | 275 | function viewRecipe(id){ |
| `deleteCurrentRecipe` | `src/modules/recipes/recipeSheet.js` | 329 | function deleteCurrentRecipe(){ |
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
| `removeScanIng` | `src/modules/scanner/scannerRecipe.js` | 155 | function removeScanIng(index) { |
| `confirmScanSave` | `src/modules/scanner/scannerRecipe.js` | 161 | function confirmScanSave() { |
| `exposePhysicalStockModule` | `src/modules/stock/physicalStock.js` | 1 | (function exposePhysicalStockModule() { |
| `createPhysicalStockModule` | `src/modules/stock/physicalStock.js` | 2 | function createPhysicalStockModule(deps) { |
| `stockColor` | `src/modules/stock/physicalStock.js` | 23 | function stockColor(percent) { |
| `stockFlag` | `src/modules/stock/physicalStock.js` | 27 | function stockFlag(percent) { |
| `stockBar` | `src/modules/stock/physicalStock.js` | 33 | function stockBar(percent) { |
| `openPhysicalModal` | `src/modules/stock/physicalStock.js` | 37 | function openPhysicalModal(id = null) { |
| `savePhysical` | `src/modules/stock/physicalStock.js` | 61 | function savePhysical() { |
| `deletePhysical` | `src/modules/stock/physicalStock.js` | 109 | function deletePhysical(id) { |
| `renderPhysical` | `src/modules/stock/physicalStock.js` | 118 | function renderPhysical(filter = "") { |
| `openMove` | `src/modules/stock/physicalStock.js` | 167 | function openMove(id) { |
| `setMoveType` | `src/modules/stock/physicalStock.js` | 185 | function setMoveType(type) { |
| `confirmMove` | `src/modules/stock/physicalStock.js` | 193 | function confirmMove() { |
| `exposeStockPricing` | `src/modules/stock/stockPricing.js` | 1 | (function exposeStockPricing() { |
| `pricePerUnit` | `src/modules/stock/stockPricing.js` | 2 | function pricePerUnit(stockItem) { |
| `exposeVirtualStockModule` | `src/modules/stock/virtualStock.js` | 1 | (function exposeVirtualStockModule() { |
| `createVirtualStockModule` | `src/modules/stock/virtualStock.js` | 2 | function createVirtualStockModule(deps) { |
| `openStockModal` | `src/modules/stock/virtualStock.js` | 19 | function openStockModal(id=null){ |
| `updateGoogleLink` | `src/modules/stock/virtualStock.js` | 41 | function updateGoogleLink(){ |
| `handleGoogleSearch` | `src/modules/stock/virtualStock.js` | 46 | function handleGoogleSearch(e){const h=document.getElementById('google-search-link').href;if(!h\|\|h==='#'){e.preventDefault();return;}window.open(h,'_blank');e |
| `saveStock` | `src/modules/stock/virtualStock.js` | 47 | function saveStock(){ |
| `deleteStock` | `src/modules/stock/virtualStock.js` | 60 | function deleteStock(id){ |
| `renderStock` | `src/modules/stock/virtualStock.js` | 64 | function renderStock(filter=''){ |
| `registerFichaTecServiceWorker` | `src/pwa/registerServiceWorker.js` | 1 | (function registerFichaTecServiceWorker() { |
| `handleLaunchShortcut` | `src/pwa/registerServiceWorker.js` | 2 | function handleLaunchShortcut() { |
| `registerServiceWorker` | `src/pwa/registerServiceWorker.js` | 13 | function registerServiceWorker() { |
| `exposeHybridRepository` | `src/services/repositories/hybridRepository.js` | 1 | (function exposeHybridRepository() { |
| `getMode` | `src/services/repositories/hybridRepository.js` | 7 | Retorna `local` ou `supabase` conforme configuracao ativa. |
| `getSupabaseClient` | `src/services/repositories/hybridRepository.js` | 11 | Reusa a promise do cliente Supabase para leituras/escritas remotas. |
| `getActiveOrganizationId` | `src/services/repositories/hybridRepository.js` | 19 | Lê o workspace ativo a partir do estado de autenticacao. |
| `load` | `src/services/repositories/hybridRepository.js` | 23 | Carrega dados locais do `localStorage`. |
| `save` | `src/services/repositories/hybridRepository.js` | 27 | Salva localmente e enfileira sincronizacao remota quando habilitada. |
| `loadRemote` | `src/services/repositories/hybridRepository.js` | 32 | Carrega dados Supabase por chave de dominio e organizacao. |
| `saveRemote` | `src/services/repositories/hybridRepository.js` | 38 | Salva dados Supabase por chave de dominio e atualiza cache local. |
| `queueRemoteSave` | `src/services/repositories/hybridRepository.js` | 46 | Executa sincronizacao remota em background e emite evento de retorno. |
| `exposeSupabaseDomainRepository` | `src/services/repositories/supabaseDomainRepository.js` | 1 | Expõe o repository de dominio Supabase para estoque, fichas e receitas. |
| `normalizeNumber` | `src/services/repositories/supabaseDomainRepository.js` | 4 | Normaliza valores numericos vindos do app ou do banco. |
| `centsFromCurrency` | `src/services/repositories/supabaseDomainRepository.js` | 9 | Converte valores em reais para centavos inteiros. |
| `currencyFromCents` | `src/services/repositories/supabaseDomainRepository.js` | 13 | Converte centavos do banco para reais no app. |
| `getRemoteId` | `src/services/repositories/supabaseDomainRepository.js` | 17 | Resolve o identificador remoto sem quebrar IDs locais do prototipo. |
| `mapNutritionToRemote` | `src/services/repositories/supabaseDomainRepository.js` | 21 | Converte nutricao do app para `nutrition_facts`. |
| `mapNutritionFromRemote` | `src/services/repositories/supabaseDomainRepository.js` | 37 | Converte `nutrition_facts` para o formato usado no app. |
| `shouldReconcileDeletes` | `src/services/repositories/supabaseDomainRepository.js` | 49 | Define quando e seguro reconciliar exclusoes remotas. |
| `softDeleteMissingRows` | `src/services/repositories/supabaseDomainRepository.js` | 53 | Marca como deletadas linhas remotas ausentes do snapshot local seguro. |
| `deleteMissingRecipeIngredients` | `src/services/repositories/supabaseDomainRepository.js` | 67 | Remove ingredientes remotos ausentes da receita sincronizada. |
| `mapStockToRemote` | `src/services/repositories/supabaseDomainRepository.js` | 80 | Converte estoque virtual para `stock_items`. |
| `mapStockFromRemote` | `src/services/repositories/supabaseDomainRepository.js` | 95 | Converte `stock_items` para estoque virtual do app. |
| `mapPhysicalToRemote` | `src/services/repositories/supabaseDomainRepository.js` | 110 | Converte estoque fisico para `physical_stock_items`. |
| `mapPhysicalFromRemote` | `src/services/repositories/supabaseDomainRepository.js` | 126 | Converte `physical_stock_items` para estoque fisico do app. |
| `mapRecipeToRemote` | `src/services/repositories/supabaseDomainRepository.js` | 144 | Converte receita/ficha tecnica para `recipes`. |
| `mapRecipeFromRemote` | `src/services/repositories/supabaseDomainRepository.js` | 163 | Converte `recipes` com ingredientes para formato do app. |
| `mapRecipeIngredientToRemote` | `src/services/repositories/supabaseDomainRepository.js` | 183 | Converte ingrediente da ficha para `recipe_ingredients`. |
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
| `exposeSupabaseClientService` | `src/services/supabaseClient.js` | 1 | (function exposeSupabaseClientService() { |
| `getSupabaseGlobal` | `src/services/supabaseClient.js` | 5 | function getSupabaseGlobal() { |
| `loadSupabaseLibrary` | `src/services/supabaseClient.js` | 9 | function loadSupabaseLibrary() { |
| `createClient` | `src/services/supabaseClient.js` | 32 | async function createClient() { |
| `exposeFormatters` | `src/utils/formatters.js` | 1 | (function exposeFormatters() { |
| `brl` | `src/utils/formatters.js` | 3 | brl(value) { |
| `quantity` | `src/utils/formatters.js` | 9 | quantity(quantity, unit) { |
| `public.set_updated_at` | `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql` | 272 | create or replace function public.set_updated_at() |
| `public.current_user_role` | `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql` | 282 | create or replace function public.current_user_role(target_organization_id uuid) |
| `public.is_organization_member` | `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql` | 296 | create or replace function public.is_organization_member(target_organization_id uuid) |
| `public.can_manage_organization` | `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql` | 311 | create or replace function public.can_manage_organization(target_organization_id uuid) |
| `public.can_write_organization` | `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql` | 321 | create or replace function public.can_write_organization(target_organization_id uuid) |
| `public.handle_new_user` | `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql` | 331 | create or replace function public.handle_new_user() |
| `public.bootstrap_organization_owner` | `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql` | 350 | create or replace function public.bootstrap_organization_owner() |
