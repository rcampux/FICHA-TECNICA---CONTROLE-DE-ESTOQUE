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
| `syncPublicAssets` | `scripts/sync-public-assets.mjs` | 8 | async function syncPublicAssets() { |
| `showToast` | `src/app.js` | 11 | function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);} |
| `showPage` | `src/app.js` | 12 | function showPage(page,navId){ |
| `closeModal` | `src/app.js` | 21 | function closeModal(id){document.getElementById(id).classList.remove('open');} |
| `exposeStorageKeys` | `src/config/storageKeys.js` | 1 | (function exposeStorageKeys() { |
| `exposeNutrition` | `src/modules/nutrition/nutritionDefaults.js` | 1 | (function exposeNutrition() { |
| `getNutrition` | `src/modules/nutrition/nutritionDefaults.js` | 30 | function getNutrition(name) { |
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
| `exposeLocalStorageRepository` | `src/services/repositories/localStorageRepository.js` | 1 | (function exposeLocalStorageRepository() { |
| `load` | `src/services/repositories/localStorageRepository.js` | 3 | load(key) { |
| `save` | `src/services/repositories/localStorageRepository.js` | 6 | save(key, value) { |
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
