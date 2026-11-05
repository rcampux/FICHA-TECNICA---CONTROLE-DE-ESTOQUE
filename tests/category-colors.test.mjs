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

test('chips usam texto branco com contraste minimo 5:1 sem modificar a cor escolhida',()=>{
  for(const hex of [...colors.presets.map(p=>p[1]),'#000000','#FFFFFF','#777777','#FFFF00','#12ABCD']) {
    const displayColor=colors.categoryChipColor(hex);
    const values=displayColor.slice(1).match(/../g).map(c=>{
      const v=parseInt(c,16)/255;
      return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
    });
    const luminance=.2126*values[0]+.7152*values[1]+.0722*values[2];
    const contrast=1.05/(luminance+.05);
    assert.ok(contrast>=5,`${hex}: ${contrast}`);
    assert.ok(colors.categoryColorStyle(hex).includes('--category-ink:#FFFFFF'));
    assert.ok(colors.categoryColorStyle(hex).includes(`--category-color:${displayColor}`));
  }
  assert.equal(colors.categoryChipColor('#B4232F'),'#B4232F');
  assert.equal(colors.presets.find(([name])=>name==='Amarelo')[1],'#CAAA20');
});

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

test('cadastro direto de categoria preserva cores e exige a mesma cozinha até concluir', async () => {
  let records=[{name:'Cereais',color:'#ABCDEF'}], organization='a', fail=false, switchDuringSave=false;
  const catalog=context.window.FichaTecCategoryCatalog.createCategoryCatalogModule({
    getCategories:()=>records,getStock:()=>[{category:'Panificação'}],getPhysicalStock:()=>[],setCategories:value=>{records=value;},
    db:{mode:()=> 'supabase',activeOrganizationId:()=>organization,saveLocal(){},saveRemote:async(_key,value,scope)=>{
      assert.equal(scope,'a');if(fail)throw Error('offline');if(switchDuringSave)organization='b';return value;
    }},storageKeys:{categories:'categories'},renderStock(){},renderPhysical(){},
  });
  assert.ok(catalog.getCategoryNames().includes('Panificação'));
  assert.equal(await catalog.saveCategoryRecord('  Sobremesas  ',undefined,'a'),'Sobremesas');
  assert.equal(records.find(row=>row.name==='Cereais').color,'#ABCDEF');
  const color=catalog.getCategoryColor('Sobremesas');
  assert.equal(await catalog.saveCategoryRecord('sobremesas',undefined,'a'),'Sobremesas');
  assert.equal(records.filter(row=>row.name==='Sobremesas').length,1);
  assert.equal(catalog.getCategoryColor('Sobremesas'),color);
  fail=true;await assert.rejects(catalog.saveCategoryRecord('Falhou',undefined,'a'),/offline/);
  assert.ok(!catalog.getCategoryNames().includes('Falhou'));
  fail=false;switchDuringSave=true;
  await assert.rejects(catalog.saveCategoryRecord('Outra cozinha',undefined,'a'),/cozinha mudou/);
  assert.ok(!catalog.getCategoryNames().includes('Outra cozinha'));
  await assert.rejects(catalog.saveCategoryRecord('Bloqueada',undefined,'a'),/cozinha mudou/);
});
