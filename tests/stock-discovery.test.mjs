import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {distanceInKm,filterNearbyStores,matchNearbyOffers} from '../api/product-search.js';

const elements = new Map();
const context = {window:{}, document:{getElementById:id=>elements.get(id)}};
vm.runInNewContext(readFileSync(new URL('../src/modules/stock/productDiscovery.js',import.meta.url),'utf8'),context);
const discovery=context.window.FichaTecProductDiscovery.createProductDiscoveryModule({formatCurrency:value=>`R$ ${value}`});

test('500 g por 19,95 escala corretamente em gramas e quilogramas',()=>{
  const reference={quantity:500,unit:'g',price:19.95};
  assert.equal(discovery.calculateProductPrice(reference,1000,'g'),39.9);
  assert.equal(discovery.calculateProductPrice(reference,1,'kg'),39.9);
  assert.equal(discovery.calculateProductPrice(reference,250,'g'),9.98);
  assert.equal(discovery.calculateProductPrice(reference,1,'ml'),null);
  assert.equal(discovery.calculateProductPrice(reference,1,'un'),null);
});

test('porcao e independente do preco e nao modifica a base nutricional',()=>{
  const original={kcal:219,prot:26,fat:13,sodium:66,portionSize:100};
  const scaled=discovery.scaleNutritionForPortion(original,50);
  assert.equal(scaled.kcal,109.5);
  assert.equal(scaled.prot,13);
  assert.equal(scaled.sodium,33);
  assert.equal(original.kcal,219);
  assert.equal(original.portionSize,100);
});

test('metadados de precos sobrevivem ao preenchimento e leitura dos dois editores',()=>{
  for(const type of ['virtual','physical']) {
    const prefix=type==='virtual'?'nut':'pnut';
    const stock=type==='virtual'?'stock':'pstock';
    for(const field of ['kcal','carb','prot','fat','sat-fat','trans-fat','fiber','sodium','portion-size']) {
      elements.set(`${prefix}-${field}`,{get value(){return this._v || '';},set value(v){this._v=String(v);}});
    }
    elements.set(`${stock}-qty`,{value:'1'});
    elements.set(`${stock}-unit`,{value:'kg'});
    elements.set(`${stock}-price`,{get value(){return this._v ?? '19.95';},set value(v){this._v=String(v);}});
    const nutrition={kcal:219,portionSize:50,priceReference:{quantity:500,unit:'g',price:19.95}};
    discovery.writeNutrition(type,nutrition);
    assert.equal(discovery.readNutrition(type).portionSize,50);
    assert.equal(discovery.readNutrition(type).priceReference.price,19.95);
    assert.equal(elements.get(`${stock}-price`).value,'19.95');
    discovery.updateProductPrice(type);
    assert.equal(elements.get(`${stock}-price`).value,'39.9');
    elements.get(`${stock}-unit`).value='un';
    discovery.changeProductUnit(type);
    assert.equal(elements.get(`${stock}-price`).value,'39.9');
    elements.get(`${stock}-price`).value='10';
    discovery.updateProductPrice(type,true);
    elements.get(`${stock}-qty`).value='3';
    discovery.updateProductPrice(type);
    assert.equal(elements.get(`${stock}-price`).value,'30');
  }
});

test('trocar unidade preserva preco; quantidade calcula embalagens nos dois estoques',()=>{
  for(const type of ['virtual','physical']) {
    const stock=type==='virtual'?'stock':'pstock';
    const qty=elements.get(`${stock}-qty`);
    const unit=elements.get(`${stock}-unit`);
    const price=elements.get(`${stock}-price`);
    qty.value='395'; unit.value='g'; price.value='5.69';
    discovery.writeNutrition(type,{kcal:61,priceReference:{quantity:395,unit:'g',price:5.69}});
    unit.value='un';
    discovery.changeProductUnit(type);
    assert.equal(price.value,'5.69');
    assert.equal(qty.value,'395');
    // Nutrition refresh and reopening the editor must not trigger price changes.
    discovery.writeNutrition(type,discovery.readNutrition(type));
    assert.equal(price.value,'5.69');
    qty.value='1'; discovery.updateProductPrice(type);
    assert.equal(price.value,'5.69');
    qty.value='2'; discovery.updateProductPrice(type);
    assert.equal(price.value,'11.38');
    assert.equal(discovery.readNutrition(type).kcal,61);
    unit.value='kg'; discovery.changeProductUnit(type);
    assert.equal(price.value,'11.38');
    qty.value='0.395'; discovery.updateProductPrice(type);
    assert.equal(price.value,'5.69');
    qty.value=''; discovery.updateProductPrice(type);
    assert.equal(price.value,'5.69');
    qty.value='0'; discovery.updateProductPrice(type);
    assert.equal(price.value,'5.69');
    qty.value='0.79'; discovery.updateProductPrice(type);
    assert.equal(price.value,'11.38');
  }
});

test('troca de peso para volume preserva valor e usa nova quantidade como base sem inventar densidade',()=>{
  const qty=elements.get('stock-qty'),unit=elements.get('stock-unit'),price=elements.get('stock-price');
  qty.value='395'; unit.value='g'; price.value='5.69';
  discovery.writeNutrition('virtual',{priceReference:{quantity:395,unit:'g',price:5.69}});
  unit.value='ml'; discovery.changeProductUnit('virtual');
  assert.equal(price.value,'5.69');
  qty.value='300'; discovery.updateProductPrice('virtual');
  assert.equal(price.value,'5.69');
  qty.value='600'; discovery.updateProductPrice('virtual');
  assert.equal(price.value,'11.38');
  price.value='20'; discovery.updateProductPrice('virtual',true);
  qty.value='300'; discovery.updateProductPrice('virtual');
  assert.equal(price.value,'10');
});

test('seletores de unidade usam evento separado dos campos de quantidade',()=>{
  const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  for(const type of ['virtual','physical']) {
    assert.ok(html.includes(`onchange="changeProductUnit('${type}')"`));
    assert.ok(html.includes(`oninput="updateProductPrice('${type}')"`));
  }
});

test('raio exclui coordenadas ausentes e mercados fora do limite',()=>{
  assert.equal(distanceInKm(0,0,0,0),0);
  const stores=filterNearbyStores([
    {title:'Mercado perto',gps_coordinates:{latitude:0.01,longitude:0}},
    {title:'Mercado longe',gps_coordinates:{latitude:1,longitude:0}},
    {title:'Sem localizacao'},
  ],0,0,5);
  assert.equal(stores.length,1);
  assert.ok(stores[0].distanceKm>1 && stores[0].distanceKm<2);
});

test('ofertas locais exigem uma rede correspondente com distancia conhecida',()=>{
  const offers=[{market:'Zaffari Online',price:20},{market:'Outra rede',price:10}];
  const results=matchNearbyOffers(offers,[{name:'Supermercado Zaffari Centro',distanceKm:2}]);
  assert.equal(results.length,1);
  assert.equal(results[0].price,20);
  assert.equal(results[0].distanceKm,2);
});
