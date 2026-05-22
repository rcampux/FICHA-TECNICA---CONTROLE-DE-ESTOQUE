(function exposeVirtualStockModule() {
  function createVirtualStockModule(deps) {
    const {
      closeModal,
      db,
      formatCurrency,
      getActiveIngredientFilter,
      getStock,
      pricePerUnit,
      renderRecipes,
      setStock,
      showToast,
      storageKeys,
    } = deps;

    let editingStockId = null;

    
    function openStockModal(id=null){
      editingStockId=id;
      const nf=['nut-kcal','nut-carb','nut-prot','nut-fat','nut-fiber','nut-sodium'];
      if(id!==null){
        const s=getStock().find(x=>x.id===id);
        document.getElementById('modal-stock-title').textContent='Editar Produto';
        document.getElementById('stock-name').value=s.name;
        document.getElementById('stock-qty').value=s.qty;
        document.getElementById('stock-unit').value=s.unit;
        document.getElementById('stock-price').value=s.price;
        document.getElementById('stock-category').value=s.category||'';
        const n=s.nutrition||{};
        nf.forEach(f=>document.getElementById(f).value=n[f.replace('nut-','')]||'');
      }else{
        document.getElementById('modal-stock-title').textContent='Novo Produto';
        ['stock-name','stock-qty','stock-price',...nf].forEach(f=>document.getElementById(f).value='');
        document.getElementById('stock-unit').value='kg';
        document.getElementById('stock-category').value='';
      }
      updateGoogleLink();
      document.getElementById('modal-stock').classList.add('open');
    }
    function updateGoogleLink(){
      const name=document.getElementById('stock-name').value.trim();
      const link=document.getElementById('google-search-link');
      link.href=name?`https://www.google.com/search?q=tabela+nutricional+${encodeURIComponent(name)}+por+100g`:'#';
    }
    function handleGoogleSearch(e){const h=document.getElementById('google-search-link').href;if(!h||h==='#'){e.preventDefault();return;}window.open(h,'_blank');e.preventDefault();}
    function saveStock(){
      const name=document.getElementById('stock-name').value.trim();
      const qty=parseFloat(document.getElementById('stock-qty').value);
      const price=parseFloat(document.getElementById('stock-price').value);
      if(!name||isNaN(qty)||qty<=0||isNaN(price)||price<0){showToast('Preencha nome, quantidade e valor.');return;}
      const nutrition={kcal:parseFloat(document.getElementById('nut-kcal').value)||null,carb:parseFloat(document.getElementById('nut-carb').value)||null,prot:parseFloat(document.getElementById('nut-prot').value)||null,fat:parseFloat(document.getElementById('nut-fat').value)||null,fiber:parseFloat(document.getElementById('nut-fiber').value)||null,sodium:parseFloat(document.getElementById('nut-sodium').value)||null};
      const item={id:editingStockId||Date.now(),name,qty,unit:document.getElementById('stock-unit').value,price,category:document.getElementById('stock-category').value,nutrition};
      setStock(editingStockId?getStock().map(s=>s.id===editingStockId?item:s):[...getStock(),item]);
      db.save(storageKeys.stock,getStock());
      closeModal('modal-stock');renderStock();
      renderRecipes(document.getElementById('recipe-search').value,getActiveIngredientFilter());
      showToast(editingStockId?'Produto atualizado!':'Produto adicionado!');
    }
    function deleteStock(id){
      if(!confirm('Remover este produto?'))return;
      setStock(getStock().filter(s=>s.id!==id));db.save(storageKeys.stock,getStock());renderStock();showToast('Removido.');
    }
    function renderStock(filter=''){
      const el=document.getElementById('stock-list');
      const f=getStock().filter(s=>s.name.toLowerCase().includes(filter.toLowerCase()));
      if(!f.length){
        el.innerHTML=`<div class="empty-state"><span class="empty-icon"><span class="material-symbols-rounded" style="font-size:52px;font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 48">inventory_2</span></span><div class="empty-text">${filter?'Nenhum produto encontrado.':'Estoque vazio. Clique em "+ Novo"!'}</div></div>`;
        return;
      }
      el.innerHTML=f.map(s=>{
        const ppg=pricePerUnit(s);
        const ps=s.unit==='ml'?formatCurrency(ppg*1000)+'/L · '+formatCurrency(ppg*100)+'/100ml':s.unit==='un'?formatCurrency(ppg)+'/un':formatCurrency(ppg*1000)+'/kg · '+formatCurrency(ppg*100)+'/100g';
        return`<div class="swipe-row">
          <div class="swipe-actions" aria-hidden="true">
            <button class="swipe-action edit" onclick="openStockModal(${s.id})" type="button"><span class="material-symbols-rounded">edit</span><span>Editar</span></button>
            <button class="swipe-action delete" onclick="deleteStock(${s.id})" type="button"><span class="material-symbols-rounded">delete</span><span>Excluir</span></button>
          </div>
          <div class="swipe-content item-card">
          <div style="flex:1;min-width:0">
            <div class="item-name">${s.name}${s.category?` <span class="tag" style="margin-left:4px;font-size:10px">${s.category}</span>`:''}</div>
            <div class="item-meta">${s.qty}${s.unit} · ${formatCurrency(s.price)}</div>
            <div class="item-price">${ps}</div>
          </div>
          <div class="item-actions inline-actions">
            <button class="btn btn-secondary btn-icon" onclick="openStockModal(${s.id})" type="button"><span class="material-symbols-rounded">edit</span></button>
            <button class="btn btn-danger btn-icon" onclick="deleteStock(${s.id})" type="button"><span class="material-symbols-rounded">delete</span></button>
          </div>
          </div>
        </div>`;
      }).join('');
    }
    
    

    return {
      openStockModal,
      updateGoogleLink,
      handleGoogleSearch,
      saveStock,
      deleteStock,
      renderStock,
    };
  }

  window.FichaTecVirtualStock = {
    createVirtualStockModule,
  };
})();
