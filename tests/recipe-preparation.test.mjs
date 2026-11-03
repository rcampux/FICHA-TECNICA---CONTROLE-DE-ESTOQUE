import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';

const read=file=>readFileSync(new URL(`../src/${file}`,import.meta.url),'utf8');
const modelContext={window:{FichaTecStorageKeys:{recipes:'recipes'}},crypto:webcrypto};
vm.runInNewContext(read('modules/recipes/ingredientOrder.js'),modelContext);
vm.runInNewContext(read('modules/recipes/productionPlan.js'),modelContext);
vm.runInNewContext(read('services/repositories/supabaseDomainRepository.js'),modelContext);
const order=modelContext.window.FichaTecIngredientOrder;
const repo=modelContext.window.FichaTecSupabaseDomainRepository;

test('reordenar preserva objetos, quantidades, custo e nutrição sem mutar a lista',()=>{
  const original=[{id:'a',qtyG:100,cost:3,nutrition:{kcal:200}},{id:'b',qtyG:20},{id:'c',qtyG:5}];
  const result=order.moveIngredient(original,0,2);
  assert.equal(result.map(i=>i.id).join(','),'b,c,a');
  assert.equal(original.map(i=>i.id).join(','),'a,b,c');
  assert.equal(result[2],original[0]);
  assert.equal(order.moveIngredient(original,-1,2),original);
  assert.equal(order.moveIngredient(original,0,3),original);
  assert.equal(order.moveIngredient(original,1,1),original);
});
test('ordem persistida e preparo sobrevivem ao retorno desordenado do banco',()=>{
  const ingredients=[{id:'a',name:'Leite',qtyG:360,qtyBruta:360},{id:'b',name:'Manteiga',qtyG:20,qtyBruta:20}];
  const payloads=ingredients.map((i,index)=>repo.mapRecipeIngredientToRemote(i,'recipe','org',index));
  assert.equal(payloads[0].sort_order,0);assert.equal(payloads[1].sort_order,1);
  const recipe=repo.mapRecipeFromRemote({id:'recipe',name:'Brigadeiro',preparation_method:'1. Misture.\n2. Cozinhe.',recipe_ingredients:[payloads[1],payloads[0]]});
  assert.equal(recipe.ingredients.map(i=>i.name).join(','),'Leite,Manteiga');
  assert.equal(recipe.modoPreparo,'1. Misture.\n2. Cozinhe.');
  assert.equal(repo.mapRecipeToRemote(recipe,'org').preparation_method,recipe.modoPreparo);
});

test('salvar e reordenar na mesma sessão reutiliza IDs e não duplica ingredientes',async()=>{
  const tables={recipes:new Map(),recipe_ingredients:new Map()};
  const client={from(table){
    let action='select',payload,single=false;const predicates=[];
    const q={select(){return q;},eq(key,value){predicates.push(row=>row[key]===value);return q;},is(key,value){predicates.push(row=>(row[key]??null)===value);return q;},not(key,_op,value){const excluded=value.slice(1,-1).split(',');predicates.push(row=>!excluded.includes(row[key]));return q;},upsert(value){action='upsert';payload=value;return q;},update(value){action='update';payload=value;return q;},delete(){action='delete';return q;},single(){single=true;return q;},maybeSingle(){single=true;return q;},then(resolve){
      let result=[...tables[table].values()].filter(row=>predicates.every(p=>p(row)));
      if(action==='upsert')result=(Array.isArray(payload)?payload:[payload]).map(row=>{const saved={...row,id:row.id||webcrypto.randomUUID()};tables[table].set(saved.id,saved);return saved;});
      if(action==='delete')result.forEach(row=>tables[table].delete(row.id));
      if(action==='update')result.forEach(row=>Object.assign(row,payload));
      if(table==='recipes'&&action==='select')result=result.map(row=>({...row,recipe_ingredients:[...tables.recipe_ingredients.values()].filter(i=>i.recipe_id===row.id)}));
      return Promise.resolve(resolve({data:single?(result[0]||null):result,error:null}));
    }};return q;
  }};
  let [saved]=await repo.saveRecipes(client,'org',[{id:1,nome:'Teste',modoPreparo:'Misturar.',ingredients:[{id:10,name:'A',qtyG:10},{id:20,name:'B',qtyG:20}]}]);
  assert.equal(tables.recipe_ingredients.size,2);
  const firstId=saved.ingredients[0].remoteId;
  saved={...saved,ingredients:[...saved.ingredients].reverse()};
  [saved]=await repo.saveRecipes(client,'org',[saved]);
  assert.equal(tables.recipe_ingredients.size,2);
  assert.equal(saved.ingredients[1].remoteId,firstId);
  assert.equal(tables.recipe_ingredients.get(firstId).sort_order,1);
  const loaded=repo.mapRecipeFromRemote({...tables.recipes.get(saved.remoteId),recipe_ingredients:[...tables.recipe_ingredients.values()]});
  assert.equal(loaded.ingredients.map(i=>i.name).join(','),'B,A');
});

function recipeHarness(preview = null){
  const elements=new Map(),routes=[],messages=[];
  let reorder,fail=false;
  const element=id=>{
    if(id.startsWith('recipe-image-'))return null;
    if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',textContent:'',dataset:{},style:{},hidden:false,classList:{add(){},remove(){},toggle(){}},setAttribute(){},getAttribute(){return null;},addEventListener(name,handler){this['on'+name]=handler;},querySelector(){return null;},querySelectorAll(){return [];}});
    return elements.get(id);
  };
  const ingredients=[{id:'uuid-a',stockId:1,name:'Leite',qtyG:360,qtyBruta:360,unit:'g',rendimento:100,cost:3,nutrition:{}},{id:'uuid-b',stockId:2,name:'Manteiga',qtyG:20,qtyBruta:20,unit:'g',rendimento:100,cost:1,nutrition:{}}];
  let recipes=[{id:'recipe-1',nome:'Brigadeiro',ingredients,modoPreparo:'Texto anterior',observacoes:'Manter refrigerado',origem:'scan',porcoes:20,yieldUnit:'unit',markup:0,createdAt:'2026-11-02',totalCost:4}];
  const baseURI='https://example.test/public/index.html';
  const context={URL,window:{location:{href:baseURI},open:()=>preview,FichaTecIngredientOrder:{...order,bindIngredientOrder:(_el,options)=>{reorder=options.onMove;}},requestAnimationFrame(){},setTimeout(){}},document:{baseURI,getElementById:element,querySelector(){return null;}},console:{error(){},warn(){}}};
  vm.runInNewContext(read('modules/recipes/productionPlan.js'),context);
  vm.runInNewContext(read('modules/recipes/recipePrint.js'),context);
  vm.runInNewContext(read('modules/recipes/recipeSheet.js'),context);
  const module=context.window.FichaTecRecipeSheet.createRecipeSheetModule({
    closeModal(){},confirmAction:async()=>true,
    db:{mode:()=>'supabase',activeOrganizationId:()=>'org',saveLocal(){},saveRemote:async(_key,value)=>{if(fail)throw Error('network');return value;}},
    formatCurrency:n=>String(n),formatQuantity:n=>String(n),getNutrition:()=>({}),
    getPhysicalStock:()=>[],getStock:()=>ingredients.map(i=>({id:i.stockId,name:i.name,price:1,qty:1,unit:'g'})),getRecipes:()=>recipes,
    pricePerUnit:()=>.01,setPhysicalStock(){},setStock(){},setRecipes:value=>{recipes=value;},showPage:page=>routes.push(page),showToast:m=>messages.push(m),storageKeys:{recipes:'recipes'},
  });
  return {module,element,routes,getRecipes:()=>recipes,reorder:(a,b)=>reorder(a,b),setFail:value=>{fail=value;}};
}
test('salvar edição mantém preparo, ordem e metadados e abre receitas apenas após sucesso',async()=>{
  const h=recipeHarness();h.module.editRecipe('recipe-1');
  assert.equal(h.element('ficha-modo-preparo').value,'Texto anterior');
  h.reorder(0,1);
  h.element('ficha-modo-preparo').value='1. Misture.\n2. Cozinhe <lentamente>.';
  h.element('recipe-search').value='filtro antigo';
  h.setFail(true);await h.module.saveRecipe();
  assert.equal(h.routes.at(-1),'ficha');
  assert.equal(h.element('ficha-modo-preparo').value,'1. Misture.\n2. Cozinhe <lentamente>.');
  h.setFail(false);await h.module.saveRecipe();
  assert.equal(h.routes.at(-1),'receitas');
  const saved=h.getRecipes()[0];
  assert.equal(saved.ingredients.map(i=>i.id).join(','),'uuid-b,uuid-a');
  assert.equal(saved.modoPreparo,'1. Misture.\n2. Cozinhe <lentamente>.');
  assert.equal(saved.observacoes,'Manter refrigerado');assert.equal(saved.origem,'scan');
  assert.equal(h.element('recipe-search').value,'');assert.equal(h.element('ficha-modo-preparo').value,'');
  h.module.viewRecipe('recipe-1');
  const detail=h.element('recipe-detail-content').innerHTML;
  assert.ok(detail.includes('id="recipe-preparation-toggle"'));
  assert.ok(detail.includes('&lt;lentamente&gt;'));assert.ok(!detail.includes('<lentamente>'));
  h.module.editRecipe('recipe-1');assert.equal(h.element('ficha-modo-preparo').value,saved.modoPreparo);
});


test('planeja 10 peças de 25 g a partir de 20 de 50 g, sem alterar a base',()=>{
  const h=recipeHarness(),r=h.getRecipes()[0];
  r.rendimento=1000;r.porcoes=20;r.markup=100;
  r.ingredients[0].qtyG=r.ingredients[0].qtyBruta=900;
  r.ingredients[1].qtyG=r.ingredients[1].qtyBruta=200;
  const snapshot=JSON.stringify(r);
  const rows=r.ingredients.map((_,i)=>({dataset:{productionIngredient:String(i)},closest:()=>null}));
  const money={dataset:{planValue:'sale'}};
  const detail=h.element('recipe-detail-content');
  detail.querySelectorAll=selector=>selector==='[data-plan-value]'?[money]:rows;
  h.element('production-unit').value='unit';
  h.element('production-markup').value='100';
  h.element('recipe-production-quantity').value='10';
  h.element('production-weight').value='25';
  h.module.viewRecipe(r.id);
  assert.equal(h.element('production-loss').textContent,'25 g (9,09%)');
  assert.deepEqual(rows.map(x=>x.textContent),['225 g','50 g']);
  assert.equal(money.textContent,'6');
  h.element('production-markup').value='0';
  h.element('production-form').oninput();
  assert.equal(money.textContent,'3');
  h.element('production-unit').value='portion';
  h.element('recipe-production-quantity').value='2.5';
  h.element('production-form').onchange();
  assert.equal(h.element('production-piece-label').textContent,'Venda por porção');
  assert.equal(h.element('production-status').textContent,'2,5 porções de 25 g cada.');
  h.element('production-unit').value='unit';
  h.element('production-form').onchange();
  assert.equal(money.textContent,'—');
  assert.equal(JSON.stringify(r),snapshot);
});

test('editar quantidade recalcula a ficha e só modifica a receita registrada ao salvar', async () => {
  const h = recipeHarness();
  const recipe = h.getRecipes()[0];
  recipe.ingredients[0].rendimento = 80;
  h.module.editRecipe(recipe.id);
  const field = {dataset:{editAmount:'0'}, valueAsNumber:80, validity:{valid:true}, setCustomValidity(){},
    closest:selector=>selector === '[data-edit-amount]' ? field : {querySelector:()=>({})}};
  h.element('ingredients-list').oninput({target:field});
  assert.equal(recipe.ingredients[0].qtyG, 360);
  assert.equal(h.element('total-custo').textContent, '1.2');
  await h.module.saveRecipe();
  const saved = h.getRecipes()[0].ingredients[0];
  assert.equal(saved.qtyG, 80);
  assert.equal(saved.qtyBruta, 100);
});

test('brigadeiro: custo é a soma dos quatro itens em centavos e a perda acompanha a produção',()=>{
  const {calculatePlan} = modelContext.window.FichaTecProduction;
  const recipe = {porcoes:20,rendimento:378.25,ingredients:[
    {qtyBruta:360,rate:5.69/395},{qtyBruta:15,rate:9.9/100},
    {qtyBruta:20,rate:11.9/200},{qtyBruta:50,rate:2.99/200},
  ]};
  const draft = {count:20,weight:18.9125,unit:'portion',markup:100};
  const price = item=>item.rate;
  const base=calculatePlan(recipe,draft,price);
  assert.deepEqual(Array.from(base.ingredients,i=>i.cost),[5.19,1.49,1.19,.75]);
  assert.deepEqual([base.rawWeight,base.finalWeight,base.loss,base.lossPercent],[445,378.25,66.75,15]);
  assert.deepEqual([base.totalCost,base.markup,base.saleBeforeLoss,base.lossPremium,base.venda,base.grossProfit],[8.62,100,17.24,2.59,19.83,11.21]);
  assert.equal(base.salePerPiece.toFixed(2),'0.99');
  assert.equal((base.grossProfit / base.count).toFixed(2),'0.56');
  const batch=calculatePlan(recipe,{...draft,count:10,weight:25},price);
  assert.equal(batch.finalWeight,250);
  assert.ok(Math.abs(batch.rawWeight-250/.85)<1e-9);
  assert.ok(Math.abs(batch.lossPercent-15)<1e-9);
  assert.deepEqual([batch.totalCost,batch.saleBeforeLoss,batch.lossPremium,batch.venda,batch.grossProfit],[5.69,11.38,1.71,13.09,7.4]);
  assert.equal(batch.salePerPiece,batch.venda/10);
  const withoutWeight=calculatePlan({...recipe,rendimento:0},{...draft,count:5},price);
  assert.equal(withoutWeight.factor,.25);
  assert.equal(withoutWeight.loss,null);
  const mixed=calculatePlan({...recipe,ingredients:[{unit:'ml',qtyBruta:50,rate:.03}]},draft,price);
  assert.equal(mixed.rawWeight,null);
  assert.equal(mixed.loss,null);
  assert.equal(repo.mapRecipeIngredientToRemote({savedPricePerG:5.69/395},'recipe','org').saved_unit_price_cents,1.440506);
});

test('peso pronto vincula os dois campos e respeita o último valor digitado', async () => {
  const h = recipeHarness();
  h.module.editRecipe('recipe-1');
  const count = h.element('ficha-porcoes'), ready = h.element('ficha-rendimento'), piece = h.element('ficha-peso-unidade');
  assert.equal(piece.disabled, true);
  assert.equal(piece.value, '');
  ready.value = '1000';
  h.module.calcFicha();
  assert.equal(Number(piece.value), 50);
  piece.value = '25';
  h.module.calcFicha('piece');
  assert.equal(Number(count.value), 40);
  assert.equal(ready.value, '1000');
  ready.value = '500';
  h.module.calcFicha();
  assert.equal(Number(count.value), 20);
  assert.equal(Number(piece.value), 25);
  count.value = '10';
  h.module.calcFicha('count');
  assert.equal(Number(piece.value), 50);
  ready.value = '378.25';
  count.value = '20';
  h.module.calcFicha('count');
  assert.equal(Number(piece.value), 18.9125);
  await h.module.saveRecipe();
  h.module.editRecipe('recipe-1');
  assert.equal(Number(piece.value), 18.9125);
  assert.equal(h.getRecipes()[0].targetPieceWeightG, null);
  ready.value = '';
  h.module.calcFicha();
  assert.equal(piece.disabled, true);
  assert.equal(piece.value, '');
  await h.module.saveRecipe();
  assert.equal(h.getRecipes()[0].rendimento, 0);
  assert.equal(h.getRecipes()[0].porcoes, 20);
});

test('divisão por peso mantém a sobra, o preço, a precisão e o vínculo ao salvar e reabrir', async () => {
  const h = recipeHarness();
  h.module.editRecipe('recipe-1');
  h.element('ficha-rendimento').value = '323'; // 15% de perda sobre 380 g.
  h.element('markup-pct').value = '100';
  h.module.calcFicha();
  h.element('ficha-peso-unidade').value = '24';
  h.module.calcFicha('piece');
  assert.match(h.element('weight-summary').textContent, /57 g \(15%\).*13 unidades inteiras de 24 g e sobram 11 g/);
  assert.equal(Number(h.element('ficha-porcoes').value), 13.4583);
  assert.equal(h.element('total-adicional-perda').textContent, '1.14');
  assert.equal(h.element('total-venda').textContent, '8.74');
  assert.equal(h.element('total-lucro').textContent, '4.94');
  await h.module.saveRecipe();
  const saved = h.getRecipes()[0];
  assert.equal(saved.targetPieceWeightG, 24);
  assert.equal(saved.markup, 100);
  assert.equal(saved.venda, 8.74);
  const row = repo.mapRecipeToRemote(saved,'org');
  assert.equal(row.sale_price_cents, 874);
  const remote = repo.mapRecipeFromRemote({...row,portions:13.4583});
  assert.ok(Math.abs(remote.porcoes - 323 / 24) < 1e-12);
  assert.equal(remote.targetPieceWeightG, 24);
  h.module.editRecipe(saved.id);
  assert.equal(Number(h.element('ficha-peso-unidade').value), 24);
  h.element('ficha-rendimento').value = '480';
  h.module.calcFicha();
  assert.equal(Number(h.element('ficha-porcoes').value), 20);
  assert.equal(h.element('total-adicional-perda').textContent, '0');
});

test('ganho de peso, pesagem ausente ou ingredientes sem massa conhecida preservam a venda com markup', () => {
  const {priceRecipe,divideBatch} = modelContext.window.FichaTecProduction;
  for (const [unit,ready] of [['g',120],['g',100],['g',0],['ml',85],['un',85],['l',85]]) {
    const price = priceRecipe([{qtyG:100,unit}],100,()=>0.1,1,ready);
    assert.equal(price.lossPremium,0);
    assert.equal(price.grossProfit,10);
    assert.equal(price.venda,20);
  }
  assert.equal(divideBatch(.3,null,.1).count,3);
});

test('PDF da receita preserva ordem, custos e preparo e recupera uma foto indisponível', () => {
  let html, printAction, imageError, printed = false;
  const coverFigure = {}, caption = {hidden:true};
  const cover = {
    src:'https://example.test/foto.jpg',
    getAttribute(){ return this.src; },
    closest(){ return coverFigure; },
    addEventListener(_name, callback){ imageError = callback; },
  };
  const technicalPhoto = {querySelector:()=>({addEventListener(){}})};
  const controls = {
    'print-recipe':{addEventListener(_name, callback){ printAction = callback; }},
    'cover-photo':cover, 'cover-caption':caption,
  };
  const preview = {
    document:{open(){}, write(value){ html = value; }, close(){}, getElementById:id=>controls[id], querySelector:()=>technicalPhoto},
    print(){ printed = true; },
  };
  const h = recipeHarness(preview), recipe = h.getRecipes()[0];
  Object.assign(recipe, {nome:'Brigadeiro <teste>', image:cover.src, modoPreparo:'Misture <devagar>.', rendimento:323, markup:100});
  const snapshot = JSON.stringify(recipe);
  h.module.exportRecipePDF(recipe.id);
  assert.equal(preview.opener, null);
  assert.equal(JSON.stringify(recipe), snapshot);
  assert.match(html, /Brigadeiro &lt;teste&gt;/);
  assert.match(html, /Misture &lt;devagar&gt;\./);
  assert.match(html, /Leite<\/th><td>360 g<\/td>[\s\S]*Manteiga<\/th><td>20 g/);
  assert.match(html, /Venda do lote<\/dt><dd>8\.74<\/dd>/);
  assert.match(html, /Perda no preparo<\/dt><dd>57 g \(15%\)/);
  assert.match(html, /id="cover-photo" src="https:\/\/example\.test\/foto\.jpg"/);
  assert.match(html, /src="https:\/\/example\.test\/assets\/images\/caderno-confeitaria\.jpg"/);
  printAction();
  assert.equal(printed, true);
  imageError();
  assert.equal(cover.src, 'https://example.test/assets/images/caderno-confeitaria.jpg');
  assert.equal(caption.hidden, false);
  assert.equal(technicalPhoto.hidden, true);
  imageError();
  assert.equal(coverFigure.hidden, true);

  recipe.nome = 'Bolo salgado de frango';
  recipe.image = 'javascript:alert(1)';
  h.module.exportRecipePDF(recipe.id);
  assert.match(html, /id="cover-photo" src="https:\/\/example\.test\/assets\/images\/caderno-cozinha\.jpg"/);
  assert.doesNotMatch(html, /javascript:|<figure class="technical-photo">/);
});

test('prévia embutida funciona no celular e com popups bloqueados no desktop', () => {
  for (const mobile of [true, false]) {
    let opens = 0, shown = false, removed = false, onClose;
    const frame = {contentWindow:{}, remove(){ removed = true; }};
    const dialog = {
      append(element){ assert.equal(element, frame); },
      addEventListener(event, listener){ assert.equal(event, 'close'); onClose = listener; },
      showModal(){ shown = true; },
    };
    const ctx = {
      window:{matchMedia:()=>({matches:mobile}), open(){ opens++; return null; }},
      document:{getElementById:()=>dialog, createElement:()=>frame},
    };
    vm.runInNewContext(read('modules/recipes/recipePrint.js'), ctx);
    assert.equal(ctx.window.FichaTecRecipePrint.openRecipePreview(), frame.contentWindow);
    assert.equal(opens, mobile ? 0 : 1);
    assert.equal(shown, true);
    onClose();
    assert.equal(removed, true);
  }
});
