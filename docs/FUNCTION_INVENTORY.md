# FichaTec - Inventário de Funções

Este arquivo é um inventário vivo das funções utilizadas no projeto. Toda nova função criada, movida, renomeada ou removida deve ser refletida aqui durante a mesma etapa de trabalho.

## Regra

- Registrar nome da função, arquivo, linha aproximada e responsabilidade.
- Manter este arquivo atualizado antes de commit/push.
- Quando a função for parte de um módulo, indicar o módulo no caminho do arquivo.
- Este inventário apoia a documentação final, auditoria técnica e futuras refatorações para Supabase, PWA e assinaturas.

## Funções Atuais

| Função | Arquivo | Linha | Responsabilidade inicial |
| --- | --- | ---: | --- |
| `resolveRequestPath` | `scripts/dev-server.mjs` | 19 | function resolveRequestPath(url) { |
| `findStockItem` | `src/app.js` | 18 | function findStockItem(stockId,name){ |
| `calcCosts` | `src/app.js` | 22 | function calcCosts(ingredients,markup=0){ |
| `showToast` | `src/app.js` | 27 | function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);} |
| `showPage` | `src/app.js` | 28 | function showPage(page,navId){ |
| `closeModal` | `src/app.js` | 37 | function closeModal(id){document.getElementById(id).classList.remove('open');} |
| `stockColor` | `src/app.js` | 55 | function stockColor(p){return p>=80?'green':p>=50?'orange':'red';} |
| `stockFlag` | `src/app.js` | 56 | function stockFlag(p){ |
| `stockBar` | `src/app.js` | 61 | function stockBar(p){return`<div class="stock-bar-bg"><div class="stock-bar-fill ${stockColor(p)}" style="width:${Math.min(p,100).toFixed(1)}%"></div></div>`;} |
| `openPhysicalModal` | `src/app.js` | 63 | function openPhysicalModal(id=null){ |
| `savePhysical` | `src/app.js` | 78 | function savePhysical(){ |
| `deletePhysical` | `src/app.js` | 100 | function deletePhysical(id){ |
| `renderPhysical` | `src/app.js` | 104 | function renderPhysical(filter=''){ |
| `openMove` | `src/app.js` | 143 | function openMove(id){ |
| `setMoveType` | `src/app.js` | 157 | function setMoveType(type){ |
| `confirmMove` | `src/app.js` | 164 | function confirmMove(){ |
| `setIngSource` | `src/app.js` | 182 | function setIngSource(src){ |
| `searchIngredient` | `src/app.js` | 192 | function searchIngredient(){ |
| `selectIngredient` | `src/app.js` | 212 | function selectIngredient(id){ |
| `calcIngCost` | `src/app.js` | 227 | function calcIngCost(){ |
| `addIngredient` | `src/app.js` | 237 | function addIngredient(){ |
| `removeIngredient` | `src/app.js` | 269 | function removeIngredient(id){currentIngredients=currentIngredients.filter(i=>i.id!==id);renderIngredients();calcFicha();} |
| `renderIngredients` | `src/app.js` | 270 | function renderIngredients(){ |
| `calcFicha` | `src/app.js` | 285 | function calcFicha(){ |
| `calcNutrition` | `src/app.js` | 298 | function calcNutrition(){ |
| `clearFicha` | `src/app.js` | 326 | function clearFicha(){ |
| `saveRecipe` | `src/app.js` | 335 | function saveRecipe(){ |
| `hasPriceChanged` | `src/app.js` | 358 | function hasPriceChanged(refs){ |
| `renderRecipes` | `src/app.js` | 365 | function renderRecipes(filter='',ingFilter=null){ |
| `setIngFilter` | `src/app.js` | 404 | function setIngFilter(val){activeIngFilter=val;renderRecipes(document.getElementById('recipe-search').value,val);} |
| `viewRecipe` | `src/app.js` | 405 | function viewRecipe(id){ |
| `deleteCurrentRecipe` | `src/app.js` | 459 | function deleteCurrentRecipe(){ |
| `loadRecipeToFicha` | `src/app.js` | 467 | function loadRecipeToFicha(){ |
| `exportRecipePDF` | `src/app.js` | 480 | function exportRecipePDF(id){ |
| `openScanModal` | `src/app.js` | 554 | function openScanModal(){ |
| `resetScan` | `src/app.js` | 559 | function resetScan(){ |
| `setScanStatus` | `src/app.js` | 573 | function setScanStatus(type,msg){ |
| `handleScanFile` | `src/app.js` | 582 | async function handleScanFile(event){ |
| `compressImage` | `src/app.js` | 598 | function compressImage(base64,maxWidth,quality){ |
| `analyzeRecipeImage` | `src/app.js` | 613 | async function analyzeRecipeImage(base64){ |
| `renderScanResult` | `src/app.js` | 634 | function renderScanResult(recipe){ |
| `removeScanIng` | `src/app.js` | 668 | function removeScanIng(index){ |
| `confirmScanSave` | `src/app.js` | 674 | function confirmScanSave(){ |
| `exposeStorageKeys` | `src/config/storageKeys.js` | 1 | (function exposeStorageKeys() { |
| `exposeNutrition` | `src/modules/nutrition/nutritionDefaults.js` | 1 | (function exposeNutrition() { |
| `getNutrition` | `src/modules/nutrition/nutritionDefaults.js` | 30 | function getNutrition(name) { |
| `exposeStockPricing` | `src/modules/stock/stockPricing.js` | 1 | (function exposeStockPricing() { |
| `pricePerUnit` | `src/modules/stock/stockPricing.js` | 2 | function pricePerUnit(stockItem) { |
| `exposeVirtualStockModule` | `src/modules/stock/virtualStock.js` | 1 | (function exposeVirtualStockModule() { |
| `createVirtualStockModule` | `src/modules/stock/virtualStock.js` | 2 | function createVirtualStockModule(deps) { |
| `openStockModal` | `src/modules/stock/virtualStock.js` | 19 | function openStockModal(id=null){ |
| `updateGoogleLink` | `src/modules/stock/virtualStock.js` | 41 | function updateGoogleLink(){ |
| `handleGoogleSearch` | `src/modules/stock/virtualStock.js` | 46 | function handleGoogleSearch(e){const h=document.getElementById('google-search-link').href;if(!h\|\|h==='#'){e.preventDefault();return;}window.open(h,'_blank');e.preventDefault();} |
| `saveStock` | `src/modules/stock/virtualStock.js` | 47 | function saveStock(){ |
| `deleteStock` | `src/modules/stock/virtualStock.js` | 60 | function deleteStock(id){ |
| `renderStock` | `src/modules/stock/virtualStock.js` | 64 | function renderStock(filter=''){ |
| `exposeLocalStorageRepository` | `src/services/repositories/localStorageRepository.js` | 1 | (function exposeLocalStorageRepository() { |
| `load` | `src/services/repositories/localStorageRepository.js` | 3 | load(key) { |
| `save` | `src/services/repositories/localStorageRepository.js` | 6 | save(key, value) { |
| `exposeFormatters` | `src/utils/formatters.js` | 1 | (function exposeFormatters() { |
| `brl` | `src/utils/formatters.js` | 3 | brl(value) { |
| `quantity` | `src/utils/formatters.js` | 9 | quantity(quantity, unit) { |
