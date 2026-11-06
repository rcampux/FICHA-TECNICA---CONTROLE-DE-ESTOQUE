import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';

test('lote vincula todos os ingredientes e refaz os custos numa única gravação', async () => {
  const stock = [];
  const h = recipeHarness(null, stock);
  h.module.setIngSource('manual');
  for (const [name, qty] of [['Farinha', 250], ['Açúcar', 50]]) {
    h.element('ing-search').value = name;
    h.element('ing-unit').value = 'g';
    h.element('ing-qty').value = qty;
    h.module.addIngredient();
  }
  h.element('ficha-nome').value = 'Lote';
  h.element('ficha-porcoes').value = 1;
  h.element('markup-pct').value = 50;
  await h.module.saveRecipe();
  stock.push({id:10,name:'Farinha',qty:1000,unit:'g',price:8}, {id:11,name:'Açúcar',qty:500,unit:'g',price:2});
  h.setFail(true);
  await assert.rejects(h.module.applyStockPrices(stock, {strict:true}));
  assert.ok(h.getRecipes().find(r => r.nome === 'Lote').ingredients.every(i => i.source === 'manual'));
  h.setFail(false);
  await h.module.applyStockPrices(stock, {strict:true});
  const saved = h.getRecipes().find(r => r.nome === 'Lote');
  assert.equal(saved.totalCost, 2.2);
  assert.equal(saved.venda, 3.3);
  assert.ok(saved.ingredients.every(i => i.source === 'virtual'));
});

test('gravação aditiva de estoque mantém produtos alheios ao lote e permite retentativa', async () => {
  const tables = {stock_items:new Map([['existing',{id:'existing'}]]), physical_stock_items:new Map()};
  let failPhysical = true;
  const client = {from(table) {
    let payload;
    const query = {
      upsert(value) {payload=value;return query;},
      select() {return query;},
      single() {
        if (table === 'physical_stock_items' && failPhysical) return Promise.resolve({error:new Error('offline')});
        tables[table].set(payload.id, payload);
        return Promise.resolve({data:payload,error:null});
      },
      update() {throw Error('Não deve excluir registros fora do lote');},
    };
    return query;
  }};
  const products = [{id:'batch-product',remoteId:'batch-product',name:'Farinha',qty:1,unit:'kg',price:8}];
  const physical = [{id:'batch-physical',remoteId:'batch-physical',name:'Farinha',stockRemoteId:'batch-product',currentQty:1,desiredQty:2,unit:'kg'}];
  await repo.saveStockItems(client,'org',products,{prune:false});
  await assert.rejects(repo.savePhysicalStockItems(client,'org',physical,{prune:false}));
  failPhysical = false;
  await repo.saveStockItems(client,'org',products,{prune:false});
  await repo.savePhysicalStockItems(client,'org',physical,{prune:false});
  assert.equal(tables.stock_items.size, 2);
  assert.equal(tables.physical_stock_items.size, 1);
  assert.equal(tables.physical_stock_items.get('batch-physical').stock_item_id, 'batch-product');
});

test('markup do cadastro aplica somente à receita escolhida, preserva falhas e aceita reenvio', async () => {
  const stock=[{id:1,name:'Leite',qty:1000,unit:'g',price:10},{id:2,name:'Manteiga',qty:100,unit:'g',price:1}];
  const h=recipeHarness(null,stock);
  const target=h.getRecipes()[0];
  target.markup=10;
  target.ingredients.forEach(item=>{item.source='manual';});
  h.getRecipes().push({...structuredClone(target),id:'other',nome:'Outra receita',markup:25});
  const snapshot=JSON.stringify(h.getRecipes());
  h.setFail(true);
  await assert.rejects(h.module.applyStockPrices(stock,{strict:true,recipePricing:{id:target.id,markup:50}}));
  assert.equal(JSON.stringify(h.getRecipes()),snapshot);
  h.setFail(false);
  await h.module.applyStockPrices(stock,{strict:true,recipePricing:{id:target.id,markup:50}});
  const [saved,other]=h.getRecipes();
  assert.equal(saved.markup,50);assert.equal(saved.totalCost,3.8);assert.equal(saved.venda,5.7);
  assert.equal(other.markup,25);assert.equal(other.venda,4.75);
  // Reapplying after the stock links exist must still persist a new markup, including zero.
  await h.module.applyStockPrices(stock,{strict:true,recipePricing:{id:target.id,markup:0}});
  assert.equal(h.getRecipes()[0].markup,0);assert.equal(h.getRecipes()[0].venda,3.8);
  const linked=JSON.stringify(h.getRecipes());
  for(const markup of [-1,NaN,Infinity]) await assert.rejects(h.module.applyStockPrices(stock,{strict:true,recipePricing:{id:target.id,markup}}));
  await assert.rejects(h.module.applyStockPrices(stock,{strict:true,recipePricing:{id:'missing',markup:50}}));
  assert.equal(JSON.stringify(h.getRecipes()),linked);
});


const read=file=>readFileSync(new URL(`../src/${file}`,import.meta.url),'utf8');
const modelContext={window:{FichaTecStorageKeys:{recipes:'recipes'}},crypto:webcrypto};
vm.runInNewContext(read('utils/measurements.js'),modelContext);
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

function recipeHarness(preview = null, stockOverride = null, physicalOverride = []){
  const elements=new Map(),routes=[],messages=[];
  let reorder,fail=false,physical=physicalOverride;
  const local=new Map();let user="test-user";
  const element=id=>{
    if(id.startsWith('recipe-image-'))return null;
    if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',textContent:'',dataset:{},style:{},hidden:false,focus(){},classList:{add(){},remove(){},toggle(){}},setAttribute(){},getAttribute(){return null;},addEventListener(name,handler){this['on'+name]=handler;},querySelector(){return null;},querySelectorAll(){return [];}});
    return elements.get(id);
  };
  const ingredients=[{id:'uuid-a',stockId:1,name:'Leite',qtyG:360,qtyBruta:360,unit:'g',rendimento:100,cost:3,nutrition:{}},{id:'uuid-b',stockId:2,name:'Manteiga',qtyG:20,qtyBruta:20,unit:'g',rendimento:100,cost:1,nutrition:{}}];
  let recipes=[{id:'recipe-1',nome:'Brigadeiro',ingredients,modoPreparo:'Texto anterior',observacoes:'Manter refrigerado',origem:'scan',porcoes:20,yieldUnit:'unit',markup:0,createdAt:'2026-11-02',totalCost:4}];
  const baseURI='https://example.test/public/index.html';
  const context={URL,localStorage:{getItem:key=>local.get(key),setItem:(key,value)=>local.set(key,value),removeItem:key=>local.delete(key)},window:{getAuthState:()=>({user:{id:user}}),location:{href:baseURI},open:()=>preview,FichaTecIngredientOrder:{...order,bindIngredientOrder:(_el,options)=>{reorder=options.onMove;}},requestAnimationFrame(){},setTimeout(){}},document:{body:{dataset:{}},baseURI,getElementById:element,querySelector(){return null;}},console:{error(){},warn(){}}};
  vm.runInNewContext(read('utils/measurements.js'),context);
  vm.runInNewContext(read('modules/stock/stockPricing.js'),context);
  vm.runInNewContext(read('modules/recipes/productionPlan.js'),context);
  vm.runInNewContext(read('modules/recipes/recipePrint.js'),context);
  vm.runInNewContext(read('modules/recipes/recipeFilters.js'),context);
  vm.runInNewContext(read('modules/recipes/recipeSheet.js'),context);
  const module=context.window.FichaTecRecipeSheet.createRecipeSheetModule({
    closeModal(){},confirmAction:async()=>true,
    db:{upsertStockBatch:async()=>{if(fail)throw Error('network');},mode:()=>'supabase',activeOrganizationId:()=>'org',save(key,value){if(fail)throw Error("network");local.set(key,JSON.stringify(value));},saveLocal(){},saveRemote:async(_key,value)=>{if(fail)throw Error('network');return value;}},
    formatCurrency:n=>String(n),formatQuantity:n=>String(n),getNutrition:()=>({}),
    getPhysicalStock:()=>physical,getStock:()=>stockOverride || ingredients.map(i=>({id:i.stockId,name:i.name,price:.01,qty:1,unit:'g'})),getRecipes:()=>recipes,
    pricePerUnit:context.window.FichaTecStockPricing.pricePerUnit,setPhysicalStock:value=>{physical=value;},setStock:value=>{stockOverride=value;},setRecipes:value=>{recipes=value;},showPage:page=>routes.push(page),showToast:m=>messages.push(m),storageKeys:{recipes:'recipes'},
  });
  return {module,element,routes,local,getPhysical:()=>physical,getStock:()=>stockOverride,messages,setUser:value=>{user=value;},getRecipes:()=>recipes,reorder:(a,b)=>reorder(a,b),setFail:value=>{fail=value;}};
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
  const dialog = h.element('ingredient-editor'), field = h.element('ingredient-edit-qty');
  dialog.showModal = dialog.close = field.focus = field.setCustomValidity = () => {};
  h.element('ingredients-list').onclick({target:{closest:()=>({dataset:{editIngredient:'0'}})}});
  assert.equal(field.value, 360);
  h.element('ingredient-edit-unit').value = 'kg';
  field.valueAsNumber = 0.08;
  h.element('ingredient-edit-form').onsubmit({preventDefault(){}});
  assert.equal(recipe.ingredients[0].qtyG, 360);
  assert.equal(h.element('total-custo').textContent, '1.2');
  const state=h.module.getJourneyState();
  assert.equal(state.needsReprepare,true);
  assert.equal(h.module.prepareIngredients(state.revision,state.scope),true);
  assert.equal(h.module.getJourneyState().needsReprepare,false);
  assert.equal(h.module.getJourneyState().confirmed.length,2);
  assert.equal(h.module.prepareIngredients(state.revision,state.scope),false);
  await h.module.saveRecipe();
  const saved = h.getRecipes()[0].ingredients[0];
  assert.equal(saved.qtyG, 80);
  assert.equal(saved.unit, 'g');
  assert.equal(saved.qtyBruta, 100);
});

test('banana vendida por unidade mostra a prévia em gramas e conserva a equivalência ao salvar', async () => {
  const stock = [{id:1,name:'Banana',qty:1,price:1.39,unit:'un'}];
  const h = recipeHarness(null,stock), recipe = h.getRecipes()[0];
  Object.assign(recipe.ingredients[0], {name:'Banana',unit:'un',qtyG:2,qtyBruta:2,cost:2.78});
  h.module.editRecipe(recipe.id);
  const field = h.element('ingredient-edit-qty'), unit = h.element('ingredient-edit-unit');
  const equivalent = h.element('ingredient-equivalence'), output = h.element('ingredient-live-cost');
  h.element('ingredient-editor').showModal = h.element('ingredient-editor').close = field.focus = field.setCustomValidity = () => {};
  h.element('ingredients-list').onclick({target:{closest:()=>({dataset:{editIngredient:'0'}})}});
  field.valueAsNumber=160; unit.value='g'; unit.onchange();
  assert.match(output.textContent,/equivalência/);
  equivalent.value='80'; equivalent.oninput();
  assert.match(output.textContent,/2\.78$/);
  field.valueAsNumber=80; field.oninput(); assert.match(output.textContent,/1\.39$/);
  field.valueAsNumber=160; h.element('ingredient-edit-form').onsubmit({preventDefault(){}});
  await h.module.saveRecipe();
  const saved=h.getRecipes()[0].ingredients[0];
  assert.equal(saved.cost,2.78);
  assert.equal(saved.nutrition.recipeEquivalence.value,80);
  stock[0].price=2;
  assert.equal(h.module.calcCosts([saved]).totalCost,4);
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

test('anotação sem estoque recebe preços proporcionais e perde a pendência só após o último vínculo', async () => {
  const stock=[];
  const h=recipeHarness(null,stock);
  h.module.setIngSource('manual');
  for(const [name,qty] of [['Farinha',250],['Açúcar',50]]) {
    h.element('ing-search').value=name;
    h.element('ing-unit').value='g';
    h.element('ing-qty').value=qty;
    h.module.addIngredient();
  }
  h.element('ficha-nome').value='Bolo anotado';
  h.element('ficha-porcoes').value=2;
  h.element('markup-pct').value=50;
  await h.module.saveRecipe();
  const saved=()=>h.getRecipes().find(r=>r.nome==='Bolo anotado');
  assert.ok(saved().ingredients.every(i=>i.source==='manual'));
  const row=repo.mapRecipeIngredientToRemote(saved().ingredients[0],'recipe','org');
  assert.equal(repo.mapRecipeIngredientFromRemote(row).source,'manual');
  const wrong={id:9,name:'Farinha',price:8,qty:1,unit:'un'};
  assert.equal(await h.module.applyStockPrice(wrong),false);
  const flour={id:3,name:'Farinha',price:8,qty:1000,unit:'g',nutrition:{kcal:360}};
  stock.push(flour);
  h.setFail(true);
  assert.equal(await h.module.applyStockPrice(flour),false);
  assert.equal(saved().ingredients[0].source,'manual');
  h.setFail(false);
  await h.module.applyStockPrice(flour);
  assert.equal(saved().ingredients[0].cost,2);
  assert.equal(saved().ingredients[0].nutrition.kcal,360);
  assert.equal(saved().ingredients[1].source,'manual');
  h.module.viewRecipe(saved().id);
  assert.match(h.element('recipe-detail-content').innerHTML,/Custo pendente/);
  const sugar={id:4,name:'Açúcar',price:4,qty:1000,unit:'g'};
  stock.push(sugar);
  await h.module.applyStockPrice(sugar);
  assert.equal(saved().totalCost,2.2);
  assert.equal(saved().venda,3.3);
  assert.equal(await h.module.applyStockPrice(sugar),false);
  h.module.viewRecipe(saved().id);
  assert.doesNotMatch(h.element('recipe-detail-content').innerHTML,/Custo pendente/);
});


test('remoção pede recálculo, invalida preparo anterior e não altera a receita salva',async()=>{
  const h=recipeHarness();
  h.module.editRecipe('recipe-1');
  const before=h.module.getJourneyState();
  await h.module.removeIngredient(before.confirmed[0].id);
  const removed=h.module.getJourneyState();
  assert.equal(removed.needsReprepare,true);
  assert.equal(removed.confirmed.length,1);
  assert.equal(h.getRecipes()[0].ingredients.length,2);
  assert.equal(h.module.prepareIngredients(before.revision,before.scope),false);
  assert.equal(h.module.prepareIngredients(removed.revision,removed.scope),true);
  assert.equal(h.module.getJourneyState().needsReprepare,false);
  await h.module.removeIngredient(removed.confirmed[0].id);
  const empty=h.module.getJourneyState();
  assert.equal(empty.needsReprepare,true);
  assert.equal(h.module.prepareIngredients(empty.revision,empty.scope),true);
  assert.equal(h.module.getJourneyState().confirmed.length,0);
});

test('confirmar quantidade intacta, markup e preparo não solicitam recálculo de ingredientes',()=>{
  const h=recipeHarness();
  h.module.editRecipe('recipe-1');
  const field=h.element('ingredient-edit-qty');
  h.element('ingredient-editor').showModal=h.element('ingredient-editor').close=field.setCustomValidity=()=>{};
  h.module.openIngredientEditor(0);
  field.valueAsNumber=360;
  h.element('ingredient-edit-form').onsubmit({preventDefault(){}});
  assert.equal(h.module.getJourneyState().needsReprepare,false);
  h.element('markup-pct').value=85;
  h.element('ficha-modo-preparo').value='Misture e cozinhe.';
  h.module.calcFicha();
  assert.equal(h.module.getJourneyState().needsReprepare,false);
});

test('seleção só libera rendimento após preparar e salvar nunca ignora ingredientes pendentes',async()=>{
  const h=recipeHarness();
  h.module.restoreSupplies();
  h.module.setIngSource('manual');
  h.element('ing-search').value='Farinha da Tasmânia';
  h.element('ing-category').value='Farinhas';
  h.element('ing-qty').value=100;
  h.element('ing-unit').value='g';
  assert.equal(h.module.queueIngredient(),true);
  const state=h.module.getJourneyState();
  assert.equal(state.pending.length,1);
  assert.equal(state.confirmed.length,0);
  assert.equal(h.element('recipe-yield-section').hidden,true);
  h.element('ficha-nome').value='Nova receita';
  await h.module.saveRecipe();
  assert.equal(h.getRecipes().length,1);
  assert.equal(h.module.prepareIngredients(state.revision,state.scope),true);
  assert.equal(h.element('recipe-yield-section').hidden,false);
  assert.equal(h.module.getJourneyState().confirmed[0].category,'Farinhas');
  assert.equal(h.module.prepareIngredients(state.revision,state.scope),false);
  h.element('ficha-porcoes').value=1;
  await h.module.saveRecipe();
  assert.equal(h.getRecipes().find(r=>r.nome==='Nova receita').ingredients.length,1);
  assert.equal(h.element('recipe-yield-section').hidden,true);
});

test('preparação física valida todo o lote, baixa uma vez e preserva preço por grama',()=>{
  const stock=[{id:1,name:'Farinha',qty:2,unit:'kg',price:20}];
  const h=recipeHarness(null,stock,[{id:2,stockId:1,name:'Farinha',currentQty:2,unit:'kg',price:20}]);
  h.module.restoreSupplies();
  h.module.setIngSource('fisico');
  const add=qty=>{
    h.module.selectIngredient('pf_2');
    h.element('ing-unit').value='g';h.element('ing-qty').value=qty;
    return h.module.queueIngredient();
  };
  assert.equal(add(1000),true);assert.equal(add(1500),true);
  let state=h.module.getJourneyState();
  assert.equal(h.getPhysical()[0].currentQty,2);
  assert.equal(h.module.prepareIngredients(state.revision),false);
  assert.equal(h.getPhysical()[0].currentQty,2);
  assert.equal(h.module.getJourneyState().confirmed.length,0);
  h.module.removeQueuedIngredient(state.pending[1].id);
  state=h.module.getJourneyState();
  h.setFail(true);
  assert.throws(()=>h.module.prepareIngredients(state.revision));
  assert.equal(h.module.getJourneyState().pending.length,1);
  assert.equal(h.getPhysical()[0].currentQty,2);
  h.setFail(false);
  assert.equal(h.module.prepareIngredients(state.revision),true);
  assert.equal(h.getPhysical()[0].currentQty,1);
  assert.equal(h.module.getJourneyState().confirmed[0].cost,10);
  assert.equal(stock[0].qty,2);
  assert.equal(stock[0].price,20);
  assert.equal(h.module.prepareIngredients(state.revision),false);
  assert.equal(h.getPhysical()[0].history.length,1);
});

test('registro temporário guarda apenas insumos de estoque e rejeita preparo de outra sessão',()=>{
  const h=recipeHarness(null,[{id:1,name:'Arroz',qty:1000,unit:'g',price:10}]);
  h.module.restoreSupplies();
  h.module.setIngSource('virtual');h.module.selectIngredient(1);
  h.element('ing-unit').value='g';h.element('ing-qty').value=100;
  h.module.queueIngredient();
  h.module.setIngSource('manual');h.element('ing-search').value='Sem estoque';
  h.element('ing-qty').value=20;h.module.queueIngredient();
  const key='fichatec.test-user.org.temporarySupplies';
  const stored=JSON.parse(h.local.get(key));
  assert.equal(stored.length,1);assert.equal(stored[0].preparationPending,true);
  const state=h.module.getJourneyState();
  h.setUser('outra-conta');
  assert.equal(h.module.prepareIngredients(state.revision,state.scope),false);
  h.module.restoreSupplies();
  assert.equal(h.module.getJourneyState().pending.length,0);
  h.setUser('test-user');h.module.restoreSupplies();
  assert.equal(h.module.getJourneyState().pending.length,1);
  assert.equal(h.module.getJourneyState().confirmed.length,0);
  assert.equal(h.element('recipe-yield-section').hidden,true);
});

test('categoria do ingrediente sobrevive ao banco e segue para o cadastro de estoque',()=>{
  const item={id:1,source:'manual',name:'Farinha da Tasmânia',category:'Farinhas',qtyG:10,nutrition:{}};
  const remote=repo.mapRecipeIngredientToRemote(item,'recipe','org');
  assert.equal(remote.nutrition_snapshot.ingredientCategory,'Farinhas');
  const loaded=repo.mapRecipeIngredientFromRemote(remote);
  assert.equal(loaded.category,'Farinhas');
  assert.equal(loaded.source,'manual');
});


test('arroz antigo por embalagem aceita gramas no primeiro popup e guarda o peso informado', async()=>{
  const h=recipeHarness(null,[{id:5,name:'Arroz Branco O Piemonte',qty:1,unit:'un',price:4.18}]);
  h.module.selectIngredient(5);h.element('ing-qty').value=250;
  h.module.calcIngCost();
  assert.equal(h.element('ing-equivalence-group').hidden,false);
  assert.equal(h.module.queueIngredient(),false);
  h.element('ing-equivalence').value=1000;h.module.calcIngCost();
  assert.match(h.element('ing-cost-preview').textContent,/1.045/);
  h.setFail(true);assert.equal(await h.module.resolveSelectedMeasure(),false);
  assert.equal(h.getStock()[0].unit,'un');assert.equal(h.module.getJourneyState().pending.length,0);
  h.setFail(false);assert.equal(await h.module.resolveSelectedMeasure(),true);
  assert.equal(h.getStock()[0].unit,'g');assert.equal(h.getStock()[0].qty,1000);
  assert.equal(h.getStock()[0].price,4.18);
  assert.equal(h.module.queueIngredient(),true);
  const item=h.module.getJourneyState().pending[0];
  assert.equal(item.unit,'g');assert.equal(item.qtyG,250);
  assert.equal(h.module.calcCosts([item]).totalCost,1.05);
  h.module.selectIngredient(5);h.element('ing-qty').value=500;h.module.calcIngCost();
  assert.equal(h.element('ing-equivalence-group').hidden,true);
  assert.match(h.element('ing-cost-preview').textContent,/2.09/);
});

test('medida física convertida mantém embalagem virtual e baixa somente os gramas utilizados', async()=>{
  const catalog=[{id:7,name:'Arroz 500 g',qty:1,unit:'un',price:5}];
  const h=recipeHarness(null,catalog,[{id:8,stockId:7,name:'Arroz 500 g',unit:'un',currentQty:3,desiredQty:4,usedTotal:1}]);
  h.module.setIngSource('fisico');h.module.selectIngredient('pf_8');h.element('ing-qty').value=250;
  assert.equal(await h.module.resolveSelectedMeasure(),true);
  assert.deepEqual([h.getPhysical()[0].unit,h.getPhysical()[0].currentQty,h.getPhysical()[0].desiredQty,h.getPhysical()[0].usedTotal],['g',1500,2000,500]);
  assert.equal(h.module.queueIngredient(),true);
  const snapshot=h.module.getJourneyState();assert.equal(h.module.prepareIngredients(snapshot.revision),true);
  assert.equal(h.getPhysical()[0].currentQty,1250);assert.equal(h.getStock()[0].qty,500);
  assert.equal(h.module.calcCosts(h.module.getJourneyState().confirmed).totalCost,2.5);
});

test('miligramas são convertidos em gramas para custo, massa, nutrição e persistência', async()=>{
  const h=recipeHarness(null,[{id:7,name:'Tempero',qty:100,unit:'g',price:100,nutrition:{kcal:200}}]);
  h.module.selectIngredient(7);h.element('ing-unit').value='mg';h.element('ing-qty').value=250;
  assert.equal(h.module.queueIngredient(),true);
  const state=h.module.getJourneyState();assert.equal(h.module.prepareIngredients(state.revision),true);
  const [item]=h.module.getJourneyState().confirmed;
  assert.equal(item.unit,'g');assert.equal(item.qtyG,0.25);assert.equal(item.cost,0.25);
  assert.equal(modelContext.window.FichaTecProduction.ingredientMass([item]),0.25);
  const restored=repo.mapRecipeIngredientFromRemote(repo.mapRecipeIngredientToRemote(item,'recipe','org'));
  assert.equal(restored.unit,'g');assert.equal(restored.qtyG,0.25);assert.equal(restored.cost,0.25);
});

test('volume não é confundido com massa e novos ingredientes não aceitam contagem',()=>{
  const h=recipeHarness(null,[{id:7,name:'Leite',qty:1000,unit:'ml',price:6}]);
  h.module.selectIngredient(7);h.element('ing-qty').value=250;
  assert.equal(h.module.queueIngredient(),true);
  const item=h.module.getJourneyState().pending[0];assert.equal(item.unit,'ml');assert.equal(item.cost,1.5);
  h.module.setIngSource('manual');h.element('ing-search').value='Ovo';h.element('ing-qty').value=2;h.element('ing-unit').value='un';
  assert.equal(h.module.queueIngredient(),false);
});

test('editar seleção pendente troca produto e quantidade sem duplicar ingredientes',()=>{
  const h=recipeHarness(null,[{id:1,name:'Arroz',qty:1000,unit:'g',price:10},{id:2,name:'Farinha',qty:1000,unit:'g',price:20}]);
  h.module.setIngSource('virtual');h.module.selectIngredient(1);h.element('ing-qty').value=100;
  assert.equal(h.module.queueIngredient(),true);
  const before=h.module.getJourneyState();
  h.module.selectIngredient(2);h.element('ing-qty').value=250;
  assert.equal(h.module.queueIngredient({id:before.pending[0].id,confirmed:false,revision:before.revision}),true);
  const after=h.module.getJourneyState();
  assert.equal(after.pending.length,1);assert.equal(after.confirmed.length,0);
  assert.equal(after.pending[0].id,before.pending[0].id);
  assert.equal(after.pending[0].name,'Farinha');assert.equal(after.pending[0].qtyG,250);
  assert.equal(after.pending[0].cost,5);
  assert.equal(h.module.prepareIngredients(after.revision),true);
  assert.equal(h.module.getJourneyState().confirmed.length,1);
});

test('editar ícone manual mantém posição e pede recálculo somente quando muda',()=>{
  const h=recipeHarness();h.module.setIngSource('manual');
  h.element('ing-search').value='Cacau';h.element('ing-qty').value=20;h.element('ing-unit').value='g';
  assert.equal(h.module.queueIngredient(),true);
  let state=h.module.getJourneyState();h.module.prepareIngredients(state.revision);
  state=h.module.getJourneyState();
  h.element('ing-search').value='Cacau';h.element('ing-qty').value=20;
  assert.equal(h.module.queueIngredient({id:state.confirmed[0].id,confirmed:true,revision:state.revision}),true);
  assert.equal(h.module.getJourneyState().needsReprepare,false);
  state=h.module.getJourneyState();h.element('ing-search').value='Chocolate';h.element('ing-qty').value=30;
  assert.equal(h.module.queueIngredient({id:state.confirmed[0].id,confirmed:true,revision:state.revision}),true);
  state=h.module.getJourneyState();assert.equal(state.confirmed.length,1);assert.equal(state.needsReprepare,true);
  assert.equal(state.confirmed[0].name,'Chocolate');assert.equal(state.confirmed[0].qtyG,30);
});

test('categorias e divisão por lote sobrevivem ao salvamento sem alterar observações',()=>{
  const mapped=repo.mapRecipeToRemote({nome:'QA',recipeCategories:['Massas','Entradas'],yieldUnit:'batch',observacoes:'Nota original'},'org');
  const restored=repo.mapRecipeFromRemote(mapped);
  assert.deepEqual(Array.from(restored.recipeCategories),['Massas','Entradas']);
  assert.equal(restored.yieldUnit,'batch');assert.equal(restored.observacoes,'Nota original');
  assert.equal(repo.mapRecipeFromRemote({notes:'Nota antiga'}).observacoes,'Nota antiga');
});

test('preparo soma massas nas três origens e mantém volume separado',()=>{
  for(const source of ['manual','virtual','fisico']){
    assert.equal(modelContext.window.FichaTecProduction.ingredientMass([{source,unit:'g',qtyG:500},{source,unit:'g',qtyG:300}]),800);
  }
  assert.equal(modelContext.window.FichaTecProduction.ingredientMass([{unit:'g',qtyG:500},{unit:'ml',qtyG:80}]),null);
});
