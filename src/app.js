const {brl:fmtBRL,quantity:fmtQty}=window.FichaTecFormatters;
const STORAGE_KEYS=window.FichaTecStorageKeys;
const DB=window.FichaTecRepository || window.FichaTecLocalStorageRepository;
const {pricePerUnit}=window.FichaTecStockPricing;

let stock=DB.mode?.()==='supabase'?[]:DB.load(STORAGE_KEYS.stock);
let physicalStock=DB.mode?.()==='supabase'?[]:DB.load(STORAGE_KEYS.physicalStock);
let recipes=DB.mode?.()==='supabase'?[]:DB.load(STORAGE_KEYS.recipes);

const {getNutrition}=window.FichaTecNutrition;
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);}
function showPage(page,navId){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.getElementById(navId).classList.add('active');
  if(page==='estoque')renderStock();
  if(page==='fisico')renderPhysical();
  if(page==='receitas')renderRecipes();
}
function closeModal(id){document.getElementById(id).classList.remove('open');}

const recipeSheetModule=window.FichaTecRecipeSheet.createRecipeSheetModule({
  closeModal,
  db:DB,
  formatCurrency:fmtBRL,
  formatQuantity:fmtQty,
  getNutrition,
  getPhysicalStock:()=>physicalStock,
  getRecipes:()=>recipes,
  getStock:()=>stock,
  pricePerUnit,
  setPhysicalStock:value=>{physicalStock=value;},
  setRecipes:value=>{recipes=value;},
  setStock:value=>{stock=value;},
  showPage,
  showToast,
  storageKeys:STORAGE_KEYS,
});
const {findStockItem,calcCosts,setIngSource,searchIngredient,selectIngredient,calcIngCost,addIngredient,removeIngredient,renderIngredients,calcFicha,calcNutrition,clearFicha,saveRecipe,hasPriceChanged,renderRecipes,setIngFilter,viewRecipe,deleteCurrentRecipe,loadRecipeToFicha,exportRecipePDF}=recipeSheetModule;
Object.assign(window,{findStockItem,calcCosts,setIngSource,searchIngredient,selectIngredient,calcIngCost,addIngredient,removeIngredient,renderIngredients,calcFicha,calcNutrition,clearFicha,saveRecipe,hasPriceChanged,renderRecipes,setIngFilter,viewRecipe,deleteCurrentRecipe,loadRecipeToFicha,exportRecipePDF});
Object.defineProperty(window,'activeIngFilter',{get:()=>recipeSheetModule.getActiveIngredientFilter()});
Object.defineProperty(window,'currentRecipeId',{get:()=>recipeSheetModule.getCurrentRecipeId()});

const scannerRecipeModule=window.FichaTecScannerRecipe.createScannerRecipeModule({
  calcCosts,
  closeModal,
  db:DB,
  findStockItem,
  getNutrition,
  getRecipes:()=>recipes,
  getStock:()=>stock,
  pricePerUnit,
  renderRecipes,
  setRecipes:value=>{recipes=value;},
  showPage,
  showToast,
  storageKeys:STORAGE_KEYS,
});
const {openScanModal,resetScan,setScanStatus,handleScanFile,compressImage,analyzeRecipeImage,renderScanResult,removeScanIng,confirmScanSave}=scannerRecipeModule;
Object.assign(window,{openScanModal,resetScan,setScanStatus,handleScanFile,compressImage,analyzeRecipeImage,renderScanResult,removeScanIng,confirmScanSave});

const virtualStockModule=window.FichaTecVirtualStock.createVirtualStockModule({
  closeModal,
  db:DB,
  formatCurrency:fmtBRL,
  getActiveIngredientFilter:()=>recipeSheetModule.getActiveIngredientFilter(),
  getStock:()=>stock,
  pricePerUnit,
  renderRecipes,
  setStock:value=>{stock=value;},
  showToast,
  storageKeys:STORAGE_KEYS,
});
const {openStockModal,updateGoogleLink,handleGoogleSearch,saveStock,deleteStock,renderStock}=virtualStockModule;
Object.assign(window,{openStockModal,updateGoogleLink,handleGoogleSearch,saveStock,deleteStock,renderStock});

const physicalStockModule=window.FichaTecPhysicalStock.createPhysicalStockModule({
  closeModal,
  db:DB,
  formatCurrency:fmtBRL,
  formatQuantity:fmtQty,
  getActiveIngredientFilter:()=>recipeSheetModule.getActiveIngredientFilter(),
  getNutrition,
  getPhysicalStock:()=>physicalStock,
  getStock:()=>stock,
  renderRecipes,
  setPhysicalStock:value=>{physicalStock=value;},
  setStock:value=>{stock=value;},
  showToast,
  storageKeys:STORAGE_KEYS,
});
const {stockColor,stockFlag,stockBar,openPhysicalModal,savePhysical,deletePhysical,renderPhysical,openMove,setMoveType,confirmMove}=physicalStockModule;
Object.assign(window,{stockColor,stockFlag,stockBar,openPhysicalModal,savePhysical,deletePhysical,renderPhysical,openMove,setMoveType,confirmMove});

const authSessionModule=window.FichaTecAuthSession.createAuthSessionModule({
  closeModal,
  config:window.FichaTecSupabaseConfig,
  createSupabaseClient:window.FichaTecSupabaseClientService.createClient,
  showToast,
});
const {backToAuthForm,clearAuthInputs,getAuthState,getPasswordValidation,initAuthSession,isStrongPassword,loadOrganizations,openAuthModal,renderAuthState,renderPasswordFeedback,resendConfirmationEmail,selectOrganization,setAuthMode,signOutAuth,submitAuthForm,syncSupabaseSession,togglePasswordVisibility}=authSessionModule;
Object.assign(window,{backToAuthForm,clearAuthInputs,getAuthState,getPasswordValidation,initAuthSession,isStrongPassword,loadOrganizations,openAuthModal,renderAuthState,renderPasswordFeedback,resendConfirmationEmail,selectOrganization,setAuthMode,signOutAuth,submitAuthForm,syncSupabaseSession,togglePasswordVisibility});

async function hydrateWorkspaceData(event){
  const organizationId=event?.detail?.organizationId || DB.activeOrganizationId?.();
  if(DB.mode()!=='supabase'||!organizationId)return;

  try{
    const [remoteStock,remotePhysicalStock,remoteRecipes]=await Promise.all([
      DB.loadRemote(STORAGE_KEYS.stock,organizationId),
      DB.loadRemote(STORAGE_KEYS.physicalStock,organizationId),
      DB.loadRemote(STORAGE_KEYS.recipes,organizationId),
    ]);

    if(Array.isArray(remoteStock)){stock=remoteStock;DB.save(STORAGE_KEYS.stock,stock);}
    if(Array.isArray(remotePhysicalStock)){physicalStock=remotePhysicalStock;DB.save(STORAGE_KEYS.physicalStock,physicalStock);}
    if(Array.isArray(remoteRecipes)){recipes=remoteRecipes;DB.save(STORAGE_KEYS.recipes,recipes);}

    renderStock();renderPhysical();renderRecipes();
    showToast('Workspace sincronizado.');
  }catch(error){
    console.error(error);
    showToast('Nao foi possivel sincronizar o workspace.');
  }
}
Object.assign(window,{hydrateWorkspaceData});
window.addEventListener('fichatec:workspace-change',hydrateWorkspaceData);

function applyRemoteSave(event){
  const {key,value}=event.detail || {};
  if(!Array.isArray(value))return;
  if(key===STORAGE_KEYS.stock)stock=value;
  if(key===STORAGE_KEYS.physicalStock)physicalStock=value;
  if(key===STORAGE_KEYS.recipes)recipes=value;
}
Object.assign(window,{applyRemoteSave});
window.addEventListener('fichatec:remote-save',applyRemoteSave);

function clearSessionData(){
  if(DB.mode()!=='supabase')return;
  stock=[];physicalStock=[];recipes=[];
  [STORAGE_KEYS.stock,STORAGE_KEYS.physicalStock,STORAGE_KEYS.recipes].forEach(key=>DB.remove?.(key));
  clearFicha({force:true,silent:true});
  renderStock();renderPhysical();renderRecipes();
}
Object.assign(window,{clearSessionData});
window.addEventListener('fichatec:auth-signed-out',clearSessionData);

/* ══ EVENTOS ══ */
document.querySelectorAll('.modal-overlay').forEach(m=>{
  m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');});
});
document.addEventListener('click',e=>{
  if(!document.getElementById('ing-search-wrap').contains(e.target))
    document.getElementById('ing-dropdown').classList.remove('open');
});

// Oculta o FAB do scanner quando qualquer modal está aberto
const scanFabBtn=document.getElementById('scan-fab-btn');
const fabObserver=new MutationObserver(()=>{
  const anyOpen=document.querySelector('.modal-overlay.open');
  scanFabBtn.style.opacity=anyOpen?'0':'1';
  scanFabBtn.style.pointerEvents=anyOpen?'none':'auto';
});
document.querySelectorAll('.modal-overlay').forEach(m=>{
  fabObserver.observe(m,{attributes:true,attributeFilter:['class']});
});

/* ══ SEED ══ */
if(DB.mode() === 'local' && !stock.length){
  stock=[
    {id:1,name:'Açúcar refinado',qty:1,unit:'kg',price:26.82,category:'Açúcares',nutrition:{kcal:399,carb:99.6,prot:0,fat:0,fiber:0,sodium:1}},
    {id:2,name:'Arroz branco',qty:1,unit:'kg',price:11.37,category:'Cereais',nutrition:{kcal:358,carb:79,prot:7.4,fat:0.3,fiber:1.6,sodium:1}},
    {id:3,name:'Bicarbonato de sódio',qty:1,unit:'kg',price:15.35,category:'Outros',nutrition:{kcal:0,carb:0,prot:0,fat:0,fiber:0,sodium:27360}},
    {id:4,name:'Doce de leite',qty:1,unit:'kg',price:14.88,category:'Laticínios',nutrition:{kcal:295,carb:55,prot:7,fat:6,fiber:0,sodium:100}},
    {id:5,name:'Extrato de tomate',qty:1,unit:'kg',price:28.27,category:'Outros',nutrition:{kcal:80,carb:16,prot:4,fat:0.5,fiber:3,sodium:700}},
    {id:6,name:'Fermento biológico',qty:1,unit:'kg',price:22.00,category:'Outros',nutrition:{kcal:105,carb:8,prot:12,fat:2,fiber:4,sodium:50}},
    {id:7,name:'Manteiga',qty:1,unit:'kg',price:35.00,category:'Laticínios',nutrition:{kcal:741,carb:0,prot:0.5,fat:83,fiber:0,sodium:576}},
    {id:8,name:'Patinho',qty:1,unit:'kg',price:32.00,category:'Carnes',nutrition:{kcal:219,carb:0,prot:26,fat:13,fiber:0,sodium:66}},
    {id:9,name:'Sal',qty:1,unit:'kg',price:2.90,category:'Temperos',nutrition:{kcal:0,carb:0,prot:0,fat:0,fiber:0,sodium:39300}},
    {id:10,name:'Trigo fino claro',qty:1,unit:'kg',price:17.00,category:'Farinhas',nutrition:{kcal:361,carb:75,prot:9.8,fat:1.4,fiber:2.3,sodium:2}},
    {id:11,name:'Vinagre de maçã',qty:1,unit:'kg',price:5.00,category:'Temperos',nutrition:{kcal:22,carb:5,prot:0,fat:0,fiber:0,sodium:2}},
    {id:12,name:'Azeitona preta',qty:1,unit:'kg',price:6.71,category:'Outros',nutrition:{kcal:145,carb:4,prot:1,fat:15,fiber:3,sodium:1400}},
  ];
  DB.save(STORAGE_KEYS.stock,stock);
}
recipes=recipes.map(r=>({...r,ingredients:r.ingredients.map(i=>{
  if(i.savedPricePerG!==undefined)return i;
  const s=findStockItem(i.stockId,i.name);
  return{...i,savedPricePerG:s?pricePerUnit(s):0};
})}));
renderStock();renderRecipes();renderPhysical();initAuthSession();
