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
    elements.set(`${stock}-price`,{value:''});
    const nutrition={kcal:219,portionSize:50,priceReference:{quantity:500,unit:'g',price:19.95}};
    discovery.writeNutrition(type,nutrition);
    assert.equal(discovery.readNutrition(type).portionSize,50);
    assert.equal(discovery.readNutrition(type).priceReference.price,19.95);
    assert.equal(elements.get(`${stock}-price`).value,39.9);
    elements.get(`${stock}-unit`).value='un';
    discovery.updateProductPrice(type);
    assert.equal(elements.get(`${stock}-price`).value,'');
    elements.get(`${stock}-price`).value='10';
    discovery.updateProductPrice(type,true);
    elements.get(`${stock}-qty`).value='3';
    discovery.updateProductPrice(type);
    assert.equal(elements.get(`${stock}-price`).value,30);
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
