const {brl:fmtBRL,quantity:fmtQty}=window.FichaTecFormatters;
const STORAGE_KEYS=window.FichaTecStorageKeys;
const DB=window.FichaTecRepository || window.FichaTecLocalStorageRepository;
const {pricePerUnit}=window.FichaTecStockPricing;

let stock=DB.mode?.()==='supabase'?[]:DB.load(STORAGE_KEYS.stock);
let physicalStock=DB.mode?.()==='supabase'?[]:DB.load(STORAGE_KEYS.physicalStock);
let recipes=DB.mode?.()==='supabase'?[]:DB.load(STORAGE_KEYS.recipes);
let categories=DB.load(STORAGE_KEYS.categories);

const {getNutrition}=window.FichaTecNutrition;
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);}
let pendingConfirmResolve=null;
function confirmAction(message,title='Confirmar exclusao',yesLabel='Sim, excluir'){
  const modal=document.getElementById('modal-confirm');
  document.getElementById('confirm-title').textContent=title;
  document.getElementById('confirm-message').textContent=message;
  document.getElementById('confirm-yes-btn').innerHTML=`<span class="material-symbols-rounded">delete</span> ${yesLabel}`;
  modal.classList.add('open');
  return new Promise(resolve=>{pendingConfirmResolve=resolve;});
}
function closeConfirmAction(confirmed){
  document.getElementById('modal-confirm').classList.remove('open');
  if(pendingConfirmResolve)pendingConfirmResolve(Boolean(confirmed));
  pendingConfirmResolve=null;
}
function showPage(page,navId){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.getElementById(navId).classList.add('active');
  if(page==='estoque')renderStock();
  if(page==='fisico')renderPhysical();
  if(page==='receitas')renderRecipes();
}
function closeModal(id){document.getElementById(id)?.classList.remove('open');}

const modalReturnFocus=new WeakMap();
let activeModal=null;

function getModalFocusableElements(modal){
  if(!modal)return[];
  return[...modal.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
    .filter(element=>!element.hidden&&element.getAttribute('aria-hidden')!=='true'&&element.getClientRects().length>0);
}

function syncModalAccessibility(){
  const modals=[...document.querySelectorAll('.modal-overlay')];
  const openModals=modals.filter(modal=>modal.classList.contains('open'));
  const nextModal=openModals.at(-1)||null;
  modals.forEach(modal=>{
    const isOpen=openModals.includes(modal);
    modal.setAttribute('aria-hidden',String(!isOpen));
    if('inert' in modal)modal.inert=!isOpen;
  });
  if(nextModal===activeModal)return;

  const previousModal=activeModal;
  activeModal=nextModal;
  if(nextModal){
    if(!modalReturnFocus.has(nextModal))modalReturnFocus.set(nextModal,document.activeElement);
    const nestedReturnTarget=previousModal?modalReturnFocus.get(previousModal):null;
    if(previousModal&&!previousModal.classList.contains('open'))modalReturnFocus.delete(previousModal);
    window.requestAnimationFrame(()=>{
      if(nestedReturnTarget instanceof HTMLElement&&nextModal.contains(nestedReturnTarget)){
        nestedReturnTarget.focus();
        return;
      }
      getModalFocusableElements(nextModal)[0]?.focus();
    });
    return;
  }

  const returnTarget=previousModal?modalReturnFocus.get(previousModal):null;
  if(previousModal)modalReturnFocus.delete(previousModal);
  if(returnTarget instanceof HTMLElement&&document.contains(returnTarget)){
    window.requestAnimationFrame(()=>returnTarget.focus());
  }
}

const BOOT_DURATION_MS=1650;
const AUTH_INIT_TIMEOUT_MS=3200;
let bootTimerId=null;

function setAppShellVisible(isVisible){
  const shell=document.getElementById('app-shell');
  if(!shell)return;
  shell.hidden=!isVisible;
  shell.setAttribute('aria-hidden',String(!isVisible));
  if('inert' in shell)shell.inert=!isVisible;
}

function stopBootTimer(){
  if(!bootTimerId)return;
  window.clearTimeout(bootTimerId);
  bootTimerId=null;
}

function hideBootScreen(options={}){
  const boot=document.getElementById('app-boot');
  document.body.classList.remove('app-booting');
  if(!boot)return Promise.resolve();
  if(boot.hidden)return Promise.resolve();
  boot.classList.remove('is-active');
  boot.classList.add('is-leaving');

  const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const finalize=()=>{
    boot.classList.remove('is-leaving');
    boot.hidden=true;
  };
  if(options.immediate||reduceMotion){finalize();return Promise.resolve();}

  return new Promise(resolve=>{
    let finished=false;
    const finish=()=>{
      if(finished)return;
      finished=true;
      finalize();
      resolve();
    };
    boot.addEventListener('animationend',finish,{once:true});
    window.setTimeout(finish,520);
  });
}

function showBootSplash(duration=BOOT_DURATION_MS){
  const boot=document.getElementById('app-boot');
  const start=document.getElementById('app-start');
  document.body.classList.add('app-booting');
  document.body.classList.remove('app-start-mode');
  if(start){start.hidden=true;start.classList.remove('is-active');}
  setAppShellVisible(false);

  if(!boot){
    document.body.classList.remove('app-booting');
    return Promise.resolve();
  }

  boot.hidden=false;
  boot.style.setProperty('--boot-progress-duration',`${Math.max(300,duration-120)}ms`);
  boot.classList.remove('is-active','is-leaving');
  void boot.offsetWidth;
  window.requestAnimationFrame(()=>boot.classList.add('is-active'));

  return new Promise(resolve=>{
    stopBootTimer();
    bootTimerId=window.setTimeout(async()=>{
      await hideBootScreen();
      resolve();
    },duration);
  });
}

function showStartScreen(){
  const start=document.getElementById('app-start');
  void hideBootScreen();
  if(start){start.hidden=true;start.classList.remove('is-active');}
  document.body.classList.add('app-start-mode');
  setAppShellVisible(false);
  openStartLogin();
}

function enterAppExperience(){
  const start=document.getElementById('app-start');
  void hideBootScreen();
  document.body.classList.remove('app-start-mode');
  if(start){
    start.hidden=true;
    start.classList.remove('is-active');
  }
  document.getElementById('modal-auth')?.classList.remove('open');
  setAppShellVisible(true);
  showPage('ficha','nav-ficha');
}

async function exitToStartExperience(){
  await showBootSplash(720);
  showStartScreen();
}

function openStartLogin(){
  const authState=typeof window.getAuthState==='function'?window.getAuthState():null;
  if(typeof window.setAuthMode==='function'&&!authState?.isPasswordRecovery)window.setAuthMode('login');
  if(typeof window.openAuthModal==='function'){
    window.openAuthModal();
    return;
  }
  const authModal=document.getElementById('modal-auth');
  if(authModal)authModal.classList.add('open');
}

function failSafeReleaseBoot(openAuth=true){
  void hideBootScreen({immediate:true});
  document.body.classList.remove('app-start-mode');
  const start=document.getElementById('app-start');
  if(start){start.hidden=true;start.classList.remove('is-active');}
  const supabaseEnabled=Boolean(window.FichaTecSupabaseConfig?.enabled);
  if(openAuth&&supabaseEnabled){setAppShellVisible(false);openStartLogin();return;}
  enterAppExperience();
}

function wait(ms){
  return new Promise(resolve=>window.setTimeout(resolve,ms));
}

async function resolveWithTimeout(promise,timeoutMs,label){
  let timedOut=false;
  const timeout=wait(timeoutMs).then(()=>{
    timedOut=true;
    return {timedOut:true,label};
  });
  const result=await Promise.race([promise,timeout]);
  if(timedOut)console.warn(`${label} demorou mais que ${timeoutMs}ms. Liberando interface.`);
  return result;
}

const RECIPE_IMAGE_MAX_FILE_BYTES=10*1024*1024;
const RECIPE_IMAGE_TARGET_BYTES=420*1024;
const RECIPE_IMAGE_MAX_DIMENSION=1280;

function readBlobAsDataUrl(blob){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||''));
    reader.onerror=()=>reject(reader.error||new Error('Nao foi possivel ler a imagem.'));
    reader.readAsDataURL(blob);
  });
}

function loadRecipeImageSource(url){
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error('O arquivo selecionado nao e uma imagem valida.'));
    image.src=url;
  });
}

function exportRecipeImageCanvas(canvas,quality){
  return new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>{
      if(blob){resolve(blob);return;}
      reject(new Error('Nao foi possivel otimizar a imagem.'));
    },'image/jpeg',quality);
  });
}

async function prepareRecipeImage({file}){
  if(!file)return undefined;
  if(!/^image\/(?:jpeg|png|webp)$/i.test(file.type||'')){
    throw new Error('Escolha uma imagem JPG, PNG ou WebP.');
  }
  if(file.size>RECIPE_IMAGE_MAX_FILE_BYTES){
    throw new Error('A imagem deve ter no maximo 10 MB.');
  }

  const objectUrl=URL.createObjectURL(file);
  try{
    const image=await loadRecipeImageSource(objectUrl);
    const naturalWidth=Math.max(1,image.naturalWidth||image.width||1);
    const naturalHeight=Math.max(1,image.naturalHeight||image.height||1);
    const scale=Math.min(1,RECIPE_IMAGE_MAX_DIMENSION/Math.max(naturalWidth,naturalHeight));
    const width=Math.max(1,Math.round(naturalWidth*scale));
    const height=Math.max(1,Math.round(naturalHeight*scale));
    const canvas=document.createElement('canvas');
    canvas.width=width;
    canvas.height=height;
    const context=canvas.getContext('2d',{alpha:false});
    if(!context)throw new Error('Este navegador nao conseguiu processar a imagem.');
    context.fillStyle='#FFF8F7';
    context.fillRect(0,0,width,height);
    context.drawImage(image,0,0,width,height);

    let quality=.82;
    let blob=await exportRecipeImageCanvas(canvas,quality);
    while(blob.size>RECIPE_IMAGE_TARGET_BYTES&&quality>.54){
      quality-=.07;
      blob=await exportRecipeImageCanvas(canvas,quality);
    }

    const stem=String(file.name||'receita').replace(/\.[^.]+$/,'').replace(/[^a-z0-9_-]+/gi,'-').slice(0,90)||'receita';
    return{
      src:await readBlobAsDataUrl(blob),
      name:`${stem}.jpg`,
      type:'image/jpeg',
      size:blob.size,
      width,
      height,
      updatedAt:new Date().toISOString(),
    };
  }finally{
    URL.revokeObjectURL(objectUrl);
  }
}

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
  readRecipeImage:prepareRecipeImage,
  writeRecipeImage:image=>{
    const message=document.getElementById('recipe-image-message');
    if(!message)return;
    const dimensions=image?.width&&image?.height?`${image.width} × ${image.height}px`:'';
    const fileSize=image?.size?`${Math.max(1,Math.round(image.size/1024))} KB`:'';
    message.textContent=[dimensions,fileSize].filter(Boolean).join(' · ')||'Imagem salva. Você pode substituir ou remover.';
  },
  clearRecipeImage:()=>{
    const message=document.getElementById('recipe-image-message');
    if(message)message.textContent='JPG, PNG ou WebP. A imagem será otimizada antes de salvar.';
  },
  setPhysicalStock:value=>{physicalStock=value;},
  setRecipes:value=>{recipes=value;},
  setStock:value=>{stock=value;},
  showPage,
  showToast,
  confirmAction,
  storageKeys:STORAGE_KEYS,
});
const {findStockItem,calcCosts,setIngSource,searchIngredient,selectIngredient,calcIngCost,addIngredient,removeIngredient,renderIngredients,calcFicha,calcNutrition,clearFicha,saveRecipe,hasPriceChanged,renderRecipes,setIngFilter,viewRecipe,deleteCurrentRecipe,editRecipe,deleteRecipe,loadRecipeToFicha,exportRecipePDF,handleRecipeImageInput,removeRecipeImage,renderRecipeImageEditor,getCurrentRecipeImage}=recipeSheetModule;
Object.assign(window,{findStockItem,calcCosts,setIngSource,searchIngredient,selectIngredient,calcIngCost,addIngredient,removeIngredient,renderIngredients,calcFicha,calcNutrition,clearFicha,saveRecipe,hasPriceChanged,renderRecipes,setIngFilter,viewRecipe,deleteCurrentRecipe,editRecipe,deleteRecipe,loadRecipeToFicha,exportRecipePDF,handleRecipeImageInput,removeRecipeImage,renderRecipeImageEditor,getCurrentRecipeImage});
Object.defineProperty(window,'activeIngFilter',{get:()=>recipeSheetModule.getActiveIngredientFilter()});
Object.defineProperty(window,'currentRecipeId',{get:()=>recipeSheetModule.getCurrentRecipeId()});

const planAccessModule=window.FichaTecPlanAccess.createPlanAccessModule({
  createSupabaseClient:window.FichaTecSupabaseClientService.createClient,
  showToast,
});
const {canUseFeature,describeFeatureLock,getPlanAccessState,getPlanLimit,loadPlanAccess,requireFeature}=planAccessModule;
Object.assign(window,{canUseFeature,describeFeatureLock,getPlanAccessState,getPlanLimit,loadPlanAccess,requireFeature});

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
  requireFeature,
  setRecipes:value=>{recipes=value;},
  showPage,
  showToast,
  confirmAction,
  storageKeys:STORAGE_KEYS,
});
const {openScanModal,resetScan,setScanStatus,handleScanFile,compressImage,analyzeRecipeImage,renderScanResult,removeScanIng,confirmScanSave}=scannerRecipeModule;
Object.assign(window,{openScanModal,resetScan,setScanStatus,handleScanFile,compressImage,analyzeRecipeImage,renderScanResult,removeScanIng,confirmScanSave});

const categoryCatalogModule=window.FichaTecCategoryCatalog.createCategoryCatalogModule({
  closeModal,
  db:DB,
  getCategories:()=>categories,
  getPhysicalStock:()=>physicalStock,
  getStock:()=>stock,
  renderPhysical:()=>renderPhysical(),
  renderStock:()=>renderStock(),
  setCategories:value=>{categories=value;},
  showToast,
  storageKeys:STORAGE_KEYS,
});
const {ensureCategory,getCategoryNames,getDefaultCategoryNames,handleCategoryKeydown,normalizeCategoryName,openCategoryModal,persistCategories,renderCategoryOptions,saveCategory}=categoryCatalogModule;
Object.assign(window,{ensureCategory,getCategoryNames,getDefaultCategoryNames,handleCategoryKeydown,normalizeCategoryName,openCategoryModal,persistCategories,renderCategoryOptions,saveCategory});

const virtualStockModule=window.FichaTecVirtualStock.createVirtualStockModule({
  closeModal,
  db:DB,
  ensureCategory,
  formatCurrency:fmtBRL,
  getActiveIngredientFilter:()=>recipeSheetModule.getActiveIngredientFilter(),
  getCategoryNames,
  getStock:()=>stock,
  pricePerUnit,
  renderRecipes,
  renderCategoryOptions,
  setStock:value=>{stock=value;},
  showToast,
  confirmAction,
  storageKeys:STORAGE_KEYS,
});
const {openStockModal,applyStockViewMode,setStockViewMode,renderStockCategoryFilters,toggleStockCategoryPanel,toggleStockCategoryFilter,clearStockCategoryFilters,updateGoogleLink,handleGoogleSearch,updateNutritionPreview,getNutritionPortionSize,scaleNutritionForPortion,formatNutritionMetric,saveStock,deleteStock,renderStock}=virtualStockModule;
Object.assign(window,{openStockModal,applyStockViewMode,setStockViewMode,renderStockCategoryFilters,toggleStockCategoryPanel,toggleStockCategoryFilter,clearStockCategoryFilters,updateGoogleLink,handleGoogleSearch,updateNutritionPreview,getNutritionPortionSize,scaleNutritionForPortion,formatNutritionMetric,saveStock,deleteStock,renderStock});

const physicalStockModule=window.FichaTecPhysicalStock.createPhysicalStockModule({
  closeModal,
  db:DB,
  ensureCategory,
  formatCurrency:fmtBRL,
  formatQuantity:fmtQty,
  getActiveIngredientFilter:()=>recipeSheetModule.getActiveIngredientFilter(),
  getCategoryNames,
  getNutrition,
  getPhysicalStock:()=>physicalStock,
  getStock:()=>stock,
  renderCategoryOptions,
  renderRecipes,
  setPhysicalStock:value=>{physicalStock=value;},
  setStock:value=>{stock=value;},
  showToast,
  confirmAction,
  storageKeys:STORAGE_KEYS,
});
const {stockColor,stockFlag,stockBar,applyPhysicalViewMode,setPhysicalViewMode,renderPhysicalCategoryFilters,togglePhysicalCategoryPanel,togglePhysicalCategoryFilter,clearPhysicalCategoryFilters,openPhysicalModal,savePhysical,deletePhysical,renderPhysical,openMove,setMoveType,confirmMove}=physicalStockModule;
Object.assign(window,{stockColor,stockFlag,stockBar,applyPhysicalViewMode,setPhysicalViewMode,renderPhysicalCategoryFilters,togglePhysicalCategoryPanel,togglePhysicalCategoryFilter,clearPhysicalCategoryFilters,openPhysicalModal,savePhysical,deletePhysical,renderPhysical,openMove,setMoveType,confirmMove});

const authSessionModule=window.FichaTecAuthSession.createAuthSessionModule({
  closeModal,
  config:window.FichaTecSupabaseConfig,
  createSupabaseClient:window.FichaTecSupabaseClientService.createClient,
  enterAppView:enterAppExperience,
  exitToStartView:exitToStartExperience,
  showToast,
});
const {backToAuthForm,clearAuthInputs,getAuthRedirectUrl,getAuthState,getPasswordValidation,handleAuthBack,handleAuthKeydown,handlePasswordRecovery,initAuthSession,isStrongPassword,loadOrganizations,openAuthModal,renderAuthState,renderPasswordFeedback,requestPasswordReset,resendConfirmationEmail,selectOrganization,setAuthMode,signOutAuth,submitAuthForm,syncSupabaseSession,togglePasswordConfirmationVisibility,togglePasswordVisibility,updatePassword}=authSessionModule;
Object.assign(window,{backToAuthForm,clearAuthInputs,getAuthRedirectUrl,getAuthState,getPasswordValidation,handleAuthBack,handleAuthKeydown,handlePasswordRecovery,initAuthSession,isStrongPassword,loadOrganizations,openAuthModal,renderAuthState,renderPasswordFeedback,requestPasswordReset,resendConfirmationEmail,selectOrganization,setAuthMode,signOutAuth,submitAuthForm,syncSupabaseSession,togglePasswordConfirmationVisibility,togglePasswordVisibility,updatePassword,openStartLogin,showBootSplash,showStartScreen,enterAppExperience,exitToStartExperience});

async function hydrateWorkspaceData(event){
  const organizationId=event?.detail?.organizationId || DB.activeOrganizationId?.();
  if(DB.mode()!=='supabase'||!organizationId)return;

  try{
    const [remoteStock,remotePhysicalStock,remoteRecipes,remoteCategories,_planAccess]=await Promise.all([
      DB.loadRemote(STORAGE_KEYS.stock,organizationId),
      DB.loadRemote(STORAGE_KEYS.physicalStock,organizationId),
      DB.loadRemote(STORAGE_KEYS.recipes,organizationId),
      DB.loadRemote(STORAGE_KEYS.categories,organizationId),
      loadPlanAccess(organizationId),
    ]);

    if(Array.isArray(remoteStock)){stock=remoteStock;DB.saveLocal?.(STORAGE_KEYS.stock,stock);}
    if(Array.isArray(remotePhysicalStock)){physicalStock=remotePhysicalStock;DB.saveLocal?.(STORAGE_KEYS.physicalStock,physicalStock);}
    if(Array.isArray(remoteRecipes)){recipes=remoteRecipes;DB.saveLocal?.(STORAGE_KEYS.recipes,recipes);}
    if(Array.isArray(remoteCategories)){categories=remoteCategories;DB.saveLocal?.(STORAGE_KEYS.categories,categories);}

    renderStock();renderPhysical();renderRecipes();
    showToast('Workspace sincronizado.');
  }catch(error){
    console.error(error);
    showToast('Nao foi possivel sincronizar o workspace.');
  }
}
Object.assign(window,{confirmAction,closeConfirmAction,hydrateWorkspaceData});
window.addEventListener('fichatec:workspace-change',hydrateWorkspaceData);

function applyRemoteSave(event){
  const {key,value}=event.detail || {};
  if(!Array.isArray(value))return;
  if(key===STORAGE_KEYS.stock)stock=value;
  if(key===STORAGE_KEYS.physicalStock)physicalStock=value;
  if(key===STORAGE_KEYS.recipes)recipes=value;
  if(key===STORAGE_KEYS.categories)categories=value;
}
Object.assign(window,{applyRemoteSave});
window.addEventListener('fichatec:remote-save',applyRemoteSave);

function clearSessionData(){
  if(DB.mode()!=='supabase')return;
  stock=[];physicalStock=[];recipes=[];categories=[];
  [STORAGE_KEYS.stock,STORAGE_KEYS.physicalStock,STORAGE_KEYS.recipes,STORAGE_KEYS.categories].forEach(key=>DB.remove?.(key));
  clearFicha({force:true,silent:true});
  renderStock();renderPhysical();renderRecipes();
}
Object.assign(window,{clearSessionData});
window.addEventListener('fichatec:auth-signed-out',clearSessionData);

/* ══ EVENTOS ══ */
document.querySelectorAll('.modal-overlay').forEach(m=>{
  m.addEventListener('click',e=>{
    if(e.target!==m)return;
    if(m.id==='modal-confirm'){closeConfirmAction(false);return;}
    if(m.id==='modal-auth'&&m.classList.contains('auth-gate'))return;
    if(m.dataset.busy==='true')return;
    m.classList.remove('open');
  });
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
  syncModalAccessibility();
});
document.querySelectorAll('.modal-overlay').forEach(m=>{
  fabObserver.observe(m,{attributes:true,attributeFilter:['class']});
});
syncModalAccessibility();

document.addEventListener('keydown',event=>{
  if(!activeModal)return;
  if(event.key==='Escape'){
    if(activeModal.id==='modal-auth'&&activeModal.classList.contains('auth-gate'))return;
    if(activeModal.dataset.busy==='true')return;
    event.preventDefault();
    if(activeModal.id==='modal-confirm')closeConfirmAction(false);
    else closeModal(activeModal.id);
    return;
  }
  if(event.key!=='Tab')return;
  const focusable=getModalFocusableElements(activeModal);
  if(!focusable.length){event.preventDefault();return;}
  const first=focusable[0];
  const last=focusable.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
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
renderStock();
renderRecipes();
renderPhysical();
bootstrapAppExperience();

async function bootstrapAppExperience(){
  const splashDone=showBootSplash(BOOT_DURATION_MS);
  const authPromise=initAuthSession();

  authPromise
    .then(async authState=>{
      await splashDone;
      if(authState?.isPasswordRecovery){
        showStartScreen();
        return;
      }
      if(authState?.isAuthenticated)enterAppExperience();
    })
    .catch(error=>console.error('Late auth init failed:',error));

  try{
    const authState=await resolveWithTimeout(authPromise,AUTH_INIT_TIMEOUT_MS,'Auth init');
    await splashDone;
    const latestAuthState=typeof getAuthState==='function'?getAuthState():authState;
    if(!latestAuthState?.isSupabaseEnabled){
      enterAppExperience();
      return;
    }
    if(latestAuthState?.isPasswordRecovery){
      showStartScreen();
      return;
    }
    if(latestAuthState?.isAuthenticated){
      enterAppExperience();
      return;
    }
    showStartScreen();
  }catch(error){
    console.error('Bootstrap failed:',error);
    await splashDone.catch(()=>undefined);
    failSafeReleaseBoot(true);
  }
}

window.addEventListener('error',()=>{
  if(document.body.classList.contains('app-booting'))failSafeReleaseBoot(true);
});
window.addEventListener('unhandledrejection',()=>{
  if(document.body.classList.contains('app-booting'))failSafeReleaseBoot(true);
});
