import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const ctx={window:{}};vm.runInNewContext(readFileSync(new URL('../src/modules/recipes/recipeFilters.js',import.meta.url),'utf8'),ctx);
const {filter,normalize}=ctx.window.FichaTecRecipeFilters;
const recipes=[{nome:'Massa de alho',recipeCategories:['Massas'],ingredients:[{name:'Alho'},{name:'Azeite'}]},{nome:'Salada',recipeCategories:['Entradas'],ingredients:[{name:'Alho'}]},{nome:'Bolo',recipeCategories:['Sobremesas'],ingredients:[{name:'Açúcar'}]}];
test('combina tipos alternativos com todos os ingredientes selecionados',()=>{
 assert.equal(filter(recipes,{types:['Massas','Entradas']}).length,2);
 assert.equal(filter(recipes,{types:['Massas','Entradas'],ingredients:['Alho','Azeite']})[0].nome,'Massa de alho');
 assert.equal(filter(recipes,{types:['Sobremesas'],ingredients:['Alho']}).length,0);
 assert.equal(filter(recipes,{ingredients:['Alho']}).length,2);
 assert.equal(filter(recipes,{}).length,3);
});
test('busca incremental ignora caixa e acentos e combina com seleções',()=>{
 assert.equal(normalize('AÇÚCAR').includes(normalize('açu')),true);
 assert.equal(filter(recipes,{name:'ma',types:['Massas']}).length,1);
 assert.equal(filter(recipes,{name:'bolo',ingredients:['Alho']}).length,0);
});
