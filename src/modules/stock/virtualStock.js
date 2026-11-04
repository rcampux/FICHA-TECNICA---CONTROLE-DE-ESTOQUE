(function exposeVirtualStockModule() {
  function createVirtualStockModule(deps) {
    const {
      closeModal,
      confirmAction,
      db,
      ensureCategory,
      formatCurrency,
      getActiveIngredientFilter,
      getCategoryNames,
      getCategoryStyle,
      openCategoryModal,
      getStock,
      pricePerUnit,
      readNutrition,
      renderRecipes,
      renderCategoryOptions,
      setStock,
      showToast,
      storageKeys,
      updateNutritionPreview,
      writeNutrition,
    } = deps;

    let editingStockId = null;
    let currentStockFilter = "";
    let selectedStockCategories = new Set();
    const stockViewModeKey = "fichatec.stock.viewMode";
    let stockViewMode = readViewMode(stockViewModeKey);

    function readViewMode(key) {
      const rawValue = localStorage.getItem(key);
      if (!rawValue) return "grid";
      try {
        const parsedValue = JSON.parse(rawValue);
        return parsedValue === "list" ? "list" : "grid";
      } catch (_error) {
        return rawValue === "list" ? "list" : "grid";
      }
    }

    function writeViewMode(key, mode) {
      localStorage.setItem(key, JSON.stringify(mode === "list" ? "list" : "grid"));
    }

    function escapeAttribute(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    function bindStockCardActions(listElement) {
      listElement.onclick = async (event) => {
        const button = event.target.closest("[data-stock-action]");
        if (!button || !listElement.contains(button)) return;

        const id = button.dataset.stockId;
        if (button.dataset.stockAction === "edit") {
          openStockModal(id);
          return;
        }

        if (button.dataset.stockAction === "delete") {
          await deleteStock(id);
        }
      };
    }

    function bindStockCategoryPanel(panel) {
      panel.onchange = (event) => {
        const input = event.target.closest("[data-stock-category]");
        if (!input || !panel.contains(input)) return;
        toggleStockCategoryFilter(input.dataset.stockCategory || "");
      };

      panel.onclick = (event) => {
        const editButton = event.target.closest("[data-edit-category]");
        if (editButton && panel.contains(editButton)) {
          window.FichaTecCategoryPanels.closePanel(panel);
          openCategoryModal("virtual", editButton.dataset.editCategory);
          return;
        }
        const clearButton = event.target.closest("[data-clear-stock-categories]");
        if (!clearButton || !panel.contains(clearButton)) return;
        clearStockCategoryFilters();
      };
    }

    async function persistStockSnapshot(nextStock) {
      setStock(nextStock);
      if (db.saveLocal) db.saveLocal(storageKeys.stock, nextStock);
      else db.save(storageKeys.stock, nextStock);

      const organizationId = db.activeOrganizationId?.();
      if (db.mode?.() === "supabase" && !organizationId) {
        throw new Error("Workspace Supabase ativo nao encontrado.");
      }
      if (db.mode?.() === "supabase" && db.saveRemote && organizationId) {
        const savedStock = await db.saveRemote(storageKeys.stock, nextStock, organizationId);
        if (Array.isArray(savedStock)) {
          setStock(savedStock);
          return savedStock;
        }
      }

      return nextStock;
    }

    function applyStockViewMode() {
      const listElement = document.getElementById("stock-list");
      listElement?.classList.toggle("view-list", stockViewMode === "list");
      listElement?.classList.toggle("view-grid", stockViewMode !== "list");
      document.getElementById("stock-view-grid")?.classList.toggle("active", stockViewMode !== "list");
      document.getElementById("stock-view-list")?.classList.toggle("active", stockViewMode === "list");
    }

    function setStockViewMode(mode) {
      stockViewMode = mode === "list" ? "list" : "grid";
      writeViewMode(stockViewModeKey, stockViewMode);
      applyStockViewMode();
      renderStock(currentStockFilter);
    }

    function getStockCategories() {
      return getCategoryNames ? getCategoryNames() : [...new Set(getStock().map((item) => item.category).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
    }

    function renderStockCategoryFilters() {
      const panel = document.getElementById("stock-category-panel");
      if (!panel) return;

      const query = (document.getElementById("stock-category-search")?.value || "").trim().toLowerCase();
      const categories = getStockCategories().filter((category) => category.toLowerCase().includes(query));

      if (!categories.length) {
        panel.innerHTML = window.FichaTecCategoryPanels.panelHeader() + '<div class="category-filter-empty">Nenhuma categoria encontrada.</div>';
        return;
      }

      panel.innerHTML = `
        ${window.FichaTecCategoryPanels.panelHeader()}
        <div class="category-filter-options">
          ${categories.map((category) => `
            <div class="category-filter-entry" style="${getCategoryStyle(category)}"><label class="category-filter-option">
              <input type="checkbox" data-stock-category="${escapeAttribute(category)}" ${selectedStockCategories.has(category) ? "checked" : ""}>
              <span class="category-colored-tag">${escapeAttribute(category)}</span>
            </label>
            <button class="category-color-edit" type="button" data-edit-category="${escapeAttribute(category)}" aria-label="Editar cor de ${escapeAttribute(category)}" title="Editar cor"><span class="material-symbols-rounded" aria-hidden="true">palette</span></button></div>
          `).join("")}
        </div>
        <button class="category-clear-btn" data-clear-stock-categories type="button">Limpar filtros</button>`;
      bindStockCategoryPanel(panel);
    }

    function toggleStockCategoryPanel() {
      window.FichaTecCategoryPanels.toggle("stock-category-panel", renderStockCategoryFilters);
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

    
    let linkingIngredient=null;
    let savingProduct=false;
    function openStockModal(id=null,ingredient=null){
      linkingIngredient=ingredient;
      document.getElementById('stock-name').readOnly=Boolean(ingredient);
      editingStockId=id;
      if(id!==null){
        const s=getStock().find(x=>String(x.id)===String(id));
        if(!s){showToast('Produto nao encontrado.');return;}
        renderCategoryOptions?.('stock-category',s.category||'');
        document.getElementById('modal-stock-title').textContent='Editar Produto';
        document.getElementById('stock-name').value=s.name;
        document.getElementById('stock-qty').value=s.qty;
        document.getElementById('stock-unit').value=s.unit;
        document.getElementById('stock-price').value=s.price;
        document.getElementById('stock-category').value=s.category||'';
        writeNutrition("virtual",s.nutrition||{});
      }else{
        renderCategoryOptions?.('stock-category','');
        document.getElementById('modal-stock-title').textContent='Novo Produto';
        ['stock-name','stock-qty','stock-price'].forEach(f=>document.getElementById(f).value='');
        writeNutrition("virtual",{portionSize: 100});
        document.getElementById('stock-unit').value='kg';
        document.getElementById('stock-category').value='';
      }
      updateNutritionPreview("virtual");
      document.getElementById('modal-stock').classList.add('open');
    }
    async function saveStock(){
      if(savingProduct)return;
      savingProduct=true;
      try {await persistProductForm();} finally {savingProduct=false;}
    }
    async function persistProductForm(){
      const name=document.getElementById('stock-name').value.trim();
      const qty=parseFloat(document.getElementById('stock-qty').value);
      const price=parseFloat(document.getElementById('stock-price').value);
      if(!name||isNaN(qty)||qty<=0||isNaN(price)||price<0){showToast('Preencha nome, quantidade e valor.');return;}
      if(linkingIngredient && (qty<=0 || (document.getElementById('stock-unit').value==='kg'?'g':document.getElementById('stock-unit').value) !== (linkingIngredient.unit==='kg'?'g':linkingIngredient.unit))) {
        showToast('Informe a quantidade comprada em uma unidade compatível com a receita ('+linkingIngredient.unit+').');return;
      }
      const nutrition=readNutrition("virtual");
      const category = ensureCategory ? ensureCategory(document.getElementById('stock-category').value) : document.getElementById('stock-category').value;
      const existing=editingStockId!==null?getStock().find(s=>String(s.id)===String(editingStockId)):null;
      const item={...(existing||{}),id:existing?.id||editingStockId||Date.now(),name,qty,unit:document.getElementById('stock-unit').value,price,category,nutrition,updatedAt:new Date().toISOString()};
      const previousStock=getStock();
      const nextStock=editingStockId!==null?previousStock.map(s=>String(s.id)===String(editingStockId)?item:s):[...getStock(),item];
      try{await persistStockSnapshot(nextStock);}
      catch(error){
        setStock(previousStock);
        if(db.saveLocal)db.saveLocal(storageKeys.stock,previousStock);
        console.error(error);showToast('Nao foi possivel salvar o produto no Supabase.');return;
      }
      closeModal('modal-stock');renderStock();renderStockCategoryFilters();
      renderRecipes(document.getElementById('recipe-search').value,getActiveIngredientFilter());
      showToast(editingStockId?'Produto atualizado!':'Produto adicionado!');
      const savedProduct=getStock().find(p=>String(p.id)===String(item.id)) || getStock().find(p=>p.name.toLowerCase()===name.toLowerCase());
      await deps.applyStockPrice?.(savedProduct);
    }
    async function deleteStock(id){
      if(!await confirmAction('Deseja excluir este produto do estoque virtual?','Excluir produto'))return;
      const nextStock=getStock().filter(s=>String(s.id)!==String(id));
      try{await persistStockSnapshot(nextStock);}
      catch(error){console.error(error);showToast('Nao foi possivel excluir o produto no Supabase.');return;}
      renderStock();renderStockCategoryFilters();showToast('Removido.');
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
        el.onclick = null;
        if(filter){
          el.innerHTML='<div class="empty-state"><span class="empty-icon"><span class="material-symbols-rounded">search_off</span></span><div class="empty-text">Nenhum produto encontrado.</div></div>';
        }else{
          el.innerHTML='<button class="empty-state stock-empty-action" data-empty-new-stock type="button"><span class="empty-icon"><span class="material-symbols-rounded">inventory_2</span></span><strong>Estoque vazio</strong><span class="empty-text">Clique aqui para gravar o primeiro produto.</span><span class="empty-state-cta"><span class="material-symbols-rounded">add</span> Novo produto</span></button>';
          el.querySelector('[data-empty-new-stock]')?.addEventListener('click',()=>openStockModal());
        }
        return;
      }
      const rows=f.map(s=>{
        const ppg=pricePerUnit(s);
        const stockId=escapeAttribute(s.id);
        const ps=s.unit==='ml'?formatCurrency(ppg*1000)+'/L · '+formatCurrency(ppg*100)+'/100ml':s.unit==='un'?formatCurrency(ppg)+'/un':formatCurrency(ppg*1000)+'/kg · '+formatCurrency(ppg*100)+'/100g';
        const name=escapeAttribute(s.name);
        const category=s.category?` <span class="tag stock-list-category category-colored-tag" style="${getCategoryStyle(s.category)}">${escapeAttribute(s.category)}</span>`:'';
        if(stockViewMode==='list'){
          return`<div class="stock-list-item item-card">
            <div class="stock-list-product"><div class="item-name">${name}${category}</div><div class="item-meta">${escapeAttribute(s.qty)} ${escapeAttribute(s.unit)}</div></div>
            <div class="stock-list-unit"><div class="item-price">${ps}</div></div>
            <div class="stock-list-total"><strong>${formatCurrency(s.price)}</strong><div class="item-actions">
              <button class="btn btn-secondary btn-icon" data-stock-action="edit" data-stock-id="${stockId}" type="button" aria-label="Editar ${name}"><span class="material-symbols-rounded">edit</span></button>
              <button class="btn btn-danger btn-icon" data-stock-action="delete" data-stock-id="${stockId}" type="button" aria-label="Excluir ${name}"><span class="material-symbols-rounded">delete</span></button>
            </div></div>
          </div>`;
        }
        return`<div class="item-card">
          <div style="flex:1;min-width:0">
            <div class="item-name">${name}${category}</div>
            <div class="item-meta">${escapeAttribute(s.qty)} ${escapeAttribute(s.unit)} · ${formatCurrency(s.price)}</div>
            <div class="item-price">${ps}</div>
          </div>
          <div class="item-actions">
            <button class="btn btn-secondary btn-icon" data-stock-action="edit" data-stock-id="${stockId}" type="button"><span class="material-symbols-rounded">edit</span></button>
            <button class="btn btn-danger btn-icon" data-stock-action="delete" data-stock-id="${stockId}" type="button"><span class="material-symbols-rounded">delete</span></button>
          </div>
        </div>`;
      }).join('');
      el.innerHTML=stockViewMode==='list'
        ? `<div class="stock-list-header"><span>Produto e quantidade</span><span>Preço unitário</span><span>Valor total</span></div>${rows}`
        : rows;
      bindStockCardActions(el);
    }
    
    

    return {
      openStockModal,
      applyStockViewMode,
      setStockViewMode,
      renderStockCategoryFilters,
      toggleStockCategoryPanel,
      toggleStockCategoryFilter,
      clearStockCategoryFilters,
      saveStock,
      deleteStock,
      renderStock,
    };
  }

  window.FichaTecVirtualStock = {
    createVirtualStockModule,
  };
})();
