(function(){
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
 function filter(recipes,{name='',types=[],ingredients=[]}={}){
  return recipes.filter(recipe=>normalize(recipe.nome).includes(normalize(name))
   &&(!types.length||types.some(type=>(recipe.recipeCategories||[]).includes(type)))
   &&ingredients.every(name=>recipe.ingredients.some(item=>item.name===name)));
 }
 window.FichaTecRecipeFilters={normalize,filter};
})();
