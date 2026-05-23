(function exposeVirtualStockModule() {
  function createVirtualStockModule(deps) {
    const {
      closeModal,
      confirmAction,
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
    let currentStockFilter = "";
    let selectedStockCategories = new Set();
    let stockViewMode = localStorage.getItem("fichatec.stock.viewMode") || "grid";

    function applyStockViewMode() {
      const listElement = document.getElementById("stock-list");
      listElement?.classList.toggle("view-list", stockViewMode === "list");
      listElement?.classList.toggle("view-grid", stockViewMode !== "list");
      document.getElementById("stock-view-grid")?.classList.toggle("active", stockViewMode !== "list");
      document.getElementById("stock-view-list")?.classList.toggle("active", stockViewMode === "list");
    }

    function setStockViewMode(mode) {
      stockViewMode = mode === "list" ? "list" : "grid";
      localStorage.setItem("fichatec.stock.viewMode", stockViewMode);
      applyStockViewMode();
      renderStock(currentStockFilter);
    }

    function getStockCategories() {
      return [...new Set(getStock().map((item) => item.category).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
    }

    function renderStockCategoryFilters() {
      const panel = document.getElementById("stock-category-panel");
      if (!panel) return;

      const query = (document.getElementById("stock-category-search")?.value || "").trim().toLowerCase();
      const categories = getStockCategories().filter((category) => category.toLowerCase().includes(query));

      if (!categories.length) {
        panel.innerHTML = '<div class="category-filter-empty">Nenhuma categoria encontrada.</div>';
        return;
      }

      panel.innerHTML = `
        <div class="category-filter-title">Filtrar por categoria</div>
        <div class="category-filter-options">
          ${categories.map((category) => `
            <label class="category-filter-option">
              <input type="checkbox" ${selectedStockCategories.has(category) ? "checked" : ""} onchange="toggleStockCategoryFilter('${category.replace(/'/g, "\\'")}')">
              <span>${category}</span>
            </label>
          `).join("")}
        </div>
        <button class="category-clear-btn" onclick="clearStockCategoryFilters()" type="button">Limpar filtros</button>`;
    }

    function toggleStockCategoryPanel() {
      const panel = document.getElementById("stock-category-panel");
      if (!panel) return;
      const shouldOpen = panel.hidden;
      panel.hidden = !shouldOpen;
      if (shouldOpen) renderStockCategoryFilters();
    }

    function toggleStockCategoryFilter(category) {
      if (selectedStockCategories.has(category)) {
        selectedStockCategories.delete(category);
      } else {
        selectedStockCategories.add(category);
      }
      renderStockCategoryFilters();
      renderStock(currentStockFilter);
    }

    function clearStockCategoryFilters() {
      selectedStockCategories = new Set();
      renderStockCategoryFilters();
      renderStock(currentStockFilter);
    }

    
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
      closeModal('modal-stock');renderStock();renderStockCategoryFilters();
      renderRecipes(document.getElementById('recipe-search').value,getActiveIngredientFilter());
      showToast(editingStockId?'Produto atualizado!':'Produto adicionado!');
    }
    async function deleteStock(id){
      if(!await confirmAction('Deseja excluir este produto do estoque virtual?','Excluir produto'))return;
      setStock(getStock().filter(s=>s.id!==id));db.save(storageKeys.stock,getStock());renderStock();renderStockCategoryFilters();showToast('Removido.');
    }
    function renderStock(filter=''){
      currentStockFilter = filter || "";
      const el=document.getElementById('stock-list');
      applyStockViewMode();
      renderStockCategoryFilters();
      const f=getStock().filter((s) => {
        const matchesName = s.name.toLowerCase().includes(filter.toLowerCase());
        const matchesCategory = !selectedStockCategories.size || selectedStockCategories.has(s.category);
        return matchesName && matchesCategory;
      });
      if(!f.length){
        el.innerHTML=`<div class="empty-state"><span class="empty-icon"><span class="material-symbols-rounded" style="font-size:52px;font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 48">inventory_2</span></span><div class="empty-text">${filter?'Nenhum produto encontrado.':'Estoque vazio. Clique em "+ Novo"!'}</div></div>`;
        return;
      }
      el.innerHTML=f.map(s=>{
        const ppg=pricePerUnit(s);
        const ps=s.unit==='ml'?formatCurrency(ppg*1000)+'/L · '+formatCurrency(ppg*100)+'/100ml':s.unit==='un'?formatCurrency(ppg)+'/un':formatCurrency(ppg*1000)+'/kg · '+formatCurrency(ppg*100)+'/100g';
        return`<div class="item-card">
          <div style="flex:1;min-width:0">
            <div class="item-name">${s.name}${s.category?` <span class="tag" style="margin-left:4px;font-size:10px">${s.category}</span>`:''}</div>
            <div class="item-meta">${s.qty}${s.unit} · ${formatCurrency(s.price)}</div>
            <div class="item-price">${ps}</div>
          </div>
          <div class="item-actions">
            <button class="btn btn-secondary btn-icon" onclick="openStockModal(${s.id})" type="button"><span class="material-symbols-rounded">edit</span></button>
            <button class="btn btn-danger btn-icon" onclick="deleteStock(${s.id})" type="button"><span class="material-symbols-rounded">delete</span></button>
          </div>
        </div>`;
      }).join('');
    }
    
    

    return {
      openStockModal,
      applyStockViewMode,
      setStockViewMode,
      renderStockCategoryFilters,
      toggleStockCategoryPanel,
      toggleStockCategoryFilter,
      clearStockCategoryFilters,
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
