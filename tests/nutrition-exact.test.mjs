import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const api=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../api/nutrition-search.js',import.meta.url),'utf8')).toString('base64'));
test('busca nutricional rejeita queijo com alho e cebola frita para ingredientes puros',()=>{
 const product=name=>({product_name:name,nutriments:{'energy-kcal_100g':100}});
 assert.equal(api.chooseNutritionProduct([product('Queijo fresco ervas e alho')],'Alho'),null);
 assert.equal(api.chooseNutritionProduct([product('Cebolla Cebola Frita')],'Cebola'),null);
 assert.equal(api.chooseNutritionProduct([product('Alho'),product('Queijo com alho')],'alho').product_name,'Alho');
 assert.equal(api.chooseNutritionProduct([product('Cebola')],'cebola').product_name,'Cebola');
});
