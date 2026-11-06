(function(){
  let selected=[];
  const defaults=['Massas','Sobremesas','Crustáceos','Churrasco','Sushi','Entradas','Saladas','Carnes','Aves','Peixes','Acompanhamentos','Bebidas'];
  const trigger=document.getElementById('recipe-types-open');
  const dialog=document.createElement('dialog');dialog.className='recipe-types-dialog';
  dialog.innerHTML='<header><h2>Categorias da receita</h2><button type="button" class="btn btn-icon" data-close aria-label="Fechar">×</button></header><p>Escolha uma ou mais categorias para organizar suas receitas.</p><div data-options></div><form><label>Nova categoria<input maxlength="60" placeholder="Ex.: Sopas" required></label><button class="btn btn-secondary">Criar categoria</button></form><button type="button" class="btn btn-primary" data-close>Concluir</button>';
  document.body.append(dialog);
  const scope=()=>{const state=window.getAuthState?.();return 'fichatec.recipeTypes.'+(state?.user?.id||'local');};
  const custom=()=>{try{return JSON.parse(localStorage.getItem(scope())||'[]');}catch{return [];}};
  function render(){
    const choices=[...new Set([...defaults,...custom(),...selected])];
    const options=dialog.querySelector('[data-options]');options.replaceChildren();
    choices.forEach(name=>{const label=document.createElement('label');const box=document.createElement('input');box.type='checkbox';box.checked=selected.includes(name);box.addEventListener('change',()=>{selected=box.checked?[...selected,name]:selected.filter(v=>v!==name);showSelected();});label.append(box,document.createTextNode(name));options.append(label);});
  }
  function showSelected(){document.getElementById('recipe-types-selected').textContent=selected.join(' · ');}
  trigger.addEventListener('click',()=>{render();dialog.showModal();});
  dialog.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>dialog.close()));
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  dialog.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const input=dialog.querySelector('form input');const name=input.value.trim();if(!name)return;selected=[...new Set([...selected,name])];try{localStorage.setItem(scope(),JSON.stringify([...new Set([...custom(),name])]))}catch{}input.value='';render();showSelected();});
  window.FichaTecRecipeCategories={list:()=>[...new Set([...defaults,...custom()])],get:()=>[...selected],set:value=>{selected=Array.isArray(value)?value.filter(v=>typeof v==='string'):[];showSelected();}};
})();
