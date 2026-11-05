import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const ctx={window:{}};
vm.runInNewContext(readFileSync(new URL('../src/utils/measurements.js',import.meta.url),'utf8'),ctx);
const m=ctx.window.FichaTecMeasurements;
test('conversão usa medidas explícitas e não inventa peso para unidade',()=>{
  assert.equal(m.packageSize('Banana unidade'),null);
  assert.equal(m.packageSize('Arroz Branco O Piemonte'),null);
  assert.deepEqual({...m.packageSize('Leite 6 x 1 L')},{quantity:6000,unit:'ml'});
  assert.deepEqual({...m.packageSize('Farinha 1,5 KG')},{quantity:1500,unit:'g'});
  assert.equal(m.toBase(250,'mg'),0.25);
  assert.equal(m.fromBase(0.25,'mg'),250);
});
test('normalização é idempotente e mantém valor pago, estoque e referência por embalagem',()=>{
  const product={unit:'un',qty:2,price:20,name:'Leite condensado 395 g'};
  const normalized=m.normalizeStock(product);
  assert.deepEqual([normalized.unit,normalized.qty,normalized.price],['g',790,20]);
  assert.deepEqual(m.normalizeStock(normalized),normalized);
  assert.equal(product.unit,'un');
  const physical=m.normalizePhysical({unit:'un',currentQty:3,desiredQty:4,usedTotal:1,history:[{qty:1,type:'entrada'}]},normalized);
  assert.equal(physical.currentQty,1185);assert.equal(physical.history[0].qty,395);
  assert.deepEqual(m.normalizePhysical(physical,normalized),physical);
});
test('equivalência de banana e receita antiga preservam custo e convertem uma única vez',()=>{
  const source={unit:'un',qty:1,price:1.39,name:'Banana',nutrition:{recipeEquivalence:{key:'g/un',value:80}}};
  const product=m.normalizeStock(source);
  const item=m.normalizeIngredient({name:'Banana',unit:'un',qtyG:2,qtyBruta:2,cost:2.78,savedPricePerG:1.39},product);
  assert.deepEqual([item.unit,item.qtyG,item.cost,item.savedPricePerG],['g',160,2.78,1.39/80]);
  assert.deepEqual(m.normalizeIngredient(item,product),item);
  assert.equal(m.normalizeStock({name:'Arroz sem peso',unit:'un',qty:1}).unit,'un');
});
