import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('assets/icons/food-flat-v1/manifest.json',root)));
const context={window:{}};
vm.runInNewContext(readFileSync(new URL('src/modules/recipes/foodIcons.js',root),'utf8'),context);
const resolve=context.window.FichaTecFoodIcons.createResolver(manifest.icons);

test('biblioteca ampliada mantém arquivos íntegros e nomes únicos',()=>{
  assert.equal(manifest.count,89);assert.equal(manifest.icons.length,89);
  assert.equal(new Set(manifest.icons.map(i=>i.id)).size,89);
  for(const item of manifest.icons){
    const bytes=readFileSync(new URL(item.path,root));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256,item.id);
    assert.equal(resolve(item.label,'').id,item.id,item.label);
  }
});
test('ícones reconhecem nomes, marcas, acentos e alternativas por categoria',()=>{
  for(const [name,category,id] of [
    ['Bacon fatiado','Carnes','bacon'],
    ['Ovo cozido','Proteínas','ovo-cozido'],
    ['Linguiça calabresa','Carnes','calabresa'],
    ['Linguiça toscana','Carnes','linguica'],
    ['Produto sem correspondência','Embutidos','embutidos'],
    ['Farinha de mandioca 500g','Farinhas','farinha-mandioca'],
    ['Farinha de banana','Farinhas','farinhas'],
    ['Cacau','Doces','cacau'],
    ['Cacau em pó 100%','Doces','cacau-po'],
    ['Chocolate em pó','Doces','chocolate-po'],
    ['Achocolatado Nescau','Doces','chocolate-po'],
    ['Black Skull Whey Protein 900g','Proteínas','whey-protein'],
    ['Produto sem correspondência','Suplementos alimentares','suplementos'],
    ['Brócolis congelado','Hortifruti','brocolis'],
    ['Banana Nanica Unidade','Hortifruti','banana'],
    ['PIRACANJUBA Leite Condensado semi 6% 395g','Laticínios','leite-condensado'],
    ['Leite condensado em lata','Laticínios','leite-condensado-lata'],
    ['Farinha da Tasmânia','Farinhas','farinhas'],
    ['Aveia em flocos Nestlé 170g','Cereais','cereais'],
    ['Produto sem correspondência','Farinhas','farinhas'],
    ['Produto sem correspondência','Categoria nova','outros'],
    ['Produto sem correspondência','','sem-categoria'],
    ['Leite integral','Laticínios','leite'],
    ['Doce de leite','Doces','doce-leite'],
    ['Maçã verde','Hortifruti','maca-verde'],
    ['Melancia','Hortifruti','melancia'],
  ]) assert.equal(resolve(name,category).id,id,name);
});
