import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const elements = new Map();
const context = {window:{FichaTecStorageKeys:{categories:'categories'}}, console:{error(){}}, document:{getElementById:id=>elements.get(id)}};
for (const path of ['modules/stock/categoryColors.js','modules/stock/categoryCatalog.js','services/repositories/supabaseDomainRepository.js']) {
  vm.runInNewContext(readFileSync(new URL(`../src/${path}`,import.meta.url),'utf8'),context);
}
const colors = context.window.FichaTecCategoryColors;

test('dez presets, validacao hexadecimal e conversao cromatica sem perda',()=>{
  assert.equal(colors.presets.length,10);
  assert.equal(new Set(colors.presets.map(p=>p[1])).size,10);
  assert.equal(colors.normalizeHex('abc'),'#AABBCC');
  assert.equal(colors.normalizeHex(' #12abCd '),'#12ABCD');
  for(const invalid of ['red','#xyz123','#123456;display:none','#12345678','']) assert.equal(colors.normalizeHex(invalid),null);
  for(const hex of ['#000000','#FFFFFF','#B4232F','#00857D','#12ABCD']) {
    const {h,s,v} = colors.hexToHsv(hex);
    assert.equal(colors.hsvToHex(h,s,v),hex);
  }
});

test('categorias antigas recebem cores estaveis, distintas e consistentes com acentos',()=>{
  const names=['Carnes','Cereais','Laticínios','Farinhas','Açúcares','Temperos','Outros'];
  assert.equal(new Set(names.map(colors.defaultCategoryColor)).size,names.length);
  assert.equal(colors.defaultCategoryColor('Laticínios'),colors.defaultCategoryColor('Laticinios'));
  assert.equal(colors.defaultCategoryColor('Bebidas'),colors.defaultCategoryColor('Bebidas'));
  assert.ok(!colors.categoryColorStyle('red;display:none').includes('display'));
});

test('salvar cor conserva categorias legadas e aguarda persistencia; erro conserva formulario',async()=>{
  let records=['Carnes',{name:'Cereais',color:'#ABCDEF'}];
  let remote, closed=false, fail=false;
  const catalog=context.window.FichaTecCategoryCatalog.createCategoryCatalogModule({
    getCategories:()=>records,getStock:()=>[],getPhysicalStock:()=>[],setCategories:value=>{records=value;},
    db:{mode:()=> 'supabase',activeOrganizationId:()=> 'org-test',saveLocal(){},saveRemote:async(_key,value)=>{if(fail)throw Error('offline'); remote=value; return value;}},
    storageKeys:{categories:'categories'},renderStock(){},renderPhysical(){},closeModal(){closed=true;},showToast(){},
  });
  elements.set('category-name',{value:'Carnes'});
  elements.set('category-color-hex',{value:'#123ABC'});
  elements.set('category-save',{disabled:false});
  await catalog.saveCategory();
  assert.ok(closed);
  assert.equal(remote.find(item=>item.name==='Carnes').color,'#123ABC');
  assert.equal(catalog.getCategoryColor('Carnes'),'#123ABC');
  assert.equal(catalog.getCategoryColor('Cereais'),'#ABCDEF');
  assert.ok(catalog.getCategoryNames().includes('Carnes'));
  assert.ok(!catalog.getCategoryNames().includes('[object Object]'));
  closed=false;fail=true;elements.get('category-color-hex').value='#654321';
  await catalog.saveCategory();
  assert.equal(closed,false);
  assert.equal(catalog.getCategoryColor('Carnes'),'#123ABC');
  assert.equal(elements.get('category-save').disabled,false);
});

test('repositorio faz ida e volta de cores e nao sobrescreve cor de cliente legado',async()=>{
  const rows=new Map([['Carnes',{id:'c1',name:'Carnes',color:'#ABCDEF'}]]);
  const client={from(table){
    assert.equal(table,'product_categories');
    let action='list',payload;
    const builder={
      select(){return builder;},eq(){return builder;},is(){return builder;},not(){return builder;},order(){return builder;},
      upsert(value){action='upsert';payload=value;return builder;},update(){action='delete';return builder;},single(){return builder;},
      then(resolve){
        if(action==='upsert') {const row={id:payload.name,...rows.get(payload.name),...payload};rows.set(payload.name,row);return Promise.resolve(resolve({data:row,error:null}));}
        return Promise.resolve(resolve({data:action==='list'?[...rows.values()]:null,error:null}));
      },
    };
    return builder;
  }};
  const repo=context.window.FichaTecSupabaseDomainRepository;
  await repo.saveCategories(client,'org-test',['Carnes',{name:'Bebidas',color:'#123abc'}]);
  const loaded=await repo.listCategories(client,'org-test');
  assert.equal(loaded.find(row=>row.name==='Carnes').color,'#ABCDEF');
  assert.equal(loaded.find(row=>row.name==='Bebidas').color,'#123ABC');
  assert.ok(loaded.every(row=>row.organization_id===undefined));
});
