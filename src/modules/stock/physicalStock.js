(function exposePhysicalStockModule() {
  function createPhysicalStockModule(deps) {
    const {
      closeModal,
      confirmAction,
      db,
      formatCurrency,
      formatQuantity,
      getActiveIngredientFilter,
      getNutrition,
      getPhysicalStock,
      getStock,
      renderRecipes,
      setPhysicalStock,
      setStock,
      showToast,
      storageKeys,
    } = deps;

    let editingPhysicalId = null;
    let moveType = "usar";
    let movingPhysicalId = null;
    let currentPhysicalFilter = "";
    let selectedPhysicalCategories = new Set();
    let physicalViewMode = localStorage.getItem("fichatec.physicalStock.viewMode") || "grid";

    function applyPhysicalViewMode() {
      const listElement = document.getElementById("pstock-list");
      listElement?.classList.toggle("view-list", physicalViewMode === "list");
      listElement?.classList.toggle("view-grid", physicalViewMode !== "list");
      document.getElementById("pstock-view-grid")?.classList.toggle("active", physicalViewMode !== "list");
      document.getElementById("pstock-view-list")?.classList.toggle("active", physicalViewMode === "list");
    }

    function setPhysicalViewMode(mode) {
      physicalViewMode = mode === "list" ? "list" : "grid";
      localStorage.setItem("fichatec.physicalStock.viewMode", physicalViewMode);
      applyPhysicalViewMode();
      renderPhysical(currentPhysicalFilter);
    }

    function getPhysicalCategories() {
      return [...new Set(getPhysicalStock().map((item) => item.category).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
    }

    function renderPhysicalCategoryFilters() {
      const panel = document.getElementById("pstock-category-panel");
      if (!panel) return;

      const query = (document.getElementById("pstock-category-search")?.value || "").trim().toLowerCase();
      const categories = getPhysicalCategories().filter((category) => category.toLowerCase().includes(query));

      if (!categories.length) {
        panel.innerHTML = '<div class="category-filter-empty">Nenhuma categoria encontrada.</div>';
        return;
      }

      panel.innerHTML = `
        <div class="category-filter-title">Filtrar por categoria</div>
        <div class="category-filter-options">
          ${categories.map((category) => `
            <label class="category-filter-option">
              <input type="checkbox" ${selectedPhysicalCategories.has(category) ? "checked" : ""} onchange="togglePhysicalCategoryFilter('${category.replace(/'/g, "\\'")}')">
              <span>${category}</span>
            </label>
          `).join("")}
        </div>
        <button class="category-clear-btn" onclick="clearPhysicalCategoryFilters()" type="button">Limpar filtros</button>`;
    }

    function togglePhysicalCategoryPanel() {
      const panel = document.getElementById("pstock-category-panel");
      if (!panel) return;
      const shouldOpen = panel.hidden;
      panel.hidden = !shouldOpen;
      if (shouldOpen) renderPhysicalCategoryFilters();
    }

    function togglePhysicalCategoryFilter(category) {
      if (selectedPhysicalCategories.has(category)) {
        selectedPhysicalCategories.delete(category);
      } else {
        selectedPhysicalCategories.add(category);
      }
      renderPhysicalCategoryFilters();
      renderPhysical(currentPhysicalFilter);
    }

    function clearPhysicalCategoryFilters() {
      selectedPhysicalCategories = new Set();
      renderPhysicalCategoryFilters();
      renderPhysical(currentPhysicalFilter);
    }

    function stockColor(percent) {
      return percent >= 80 ? "green" : percent >= 50 ? "orange" : "red";
    }

    function stockFlag(percent) {
      const color = stockColor(percent);
      const icon = percent >= 80 ? "check_circle" : percent >= 50 ? "warning" : "error";
      return `<span class="stock-flag ${color}"><span class="material-symbols-rounded" style="font-size:12px;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20">${icon}</span> ${percent.toFixed(0)}%</span>`;
    }

    function stockBar(percent) {
      return `<div class="stock-bar-bg"><div class="stock-bar-fill ${stockColor(percent)}" style="width:${Math.min(percent,100).toFixed(1)}%"></div></div>`;
    }

    function openPhysicalModal(id = null) {
      editingPhysicalId = id;

      if (id !== null) {
        const item = getPhysicalStock().find((entry) => entry.id === id);
        document.getElementById("modal-pstock-title").textContent = "Editar Produto";
        document.getElementById("pstock-name").value = item.name;
        document.getElementById("pstock-qty").value = item.currentQty;
        document.getElementById("pstock-unit").value = item.unit;
        document.getElementById("pstock-price").value = item.price;
        document.getElementById("pstock-desired").value = item.desiredQty;
        document.getElementById("pstock-category").value = item.category || "";
      } else {
        document.getElementById("modal-pstock-title").textContent = "Novo Produto Físico";
        ["pstock-name", "pstock-qty", "pstock-price", "pstock-desired"].forEach((field) => {
          document.getElementById(field).value = "";
        });
        document.getElementById("pstock-unit").value = "kg";
        document.getElementById("pstock-category").value = "";
      }

      document.getElementById("modal-pstock").classList.add("open");
    }

    function savePhysical() {
      const name = document.getElementById("pstock-name").value.trim();
      const qty = parseFloat(document.getElementById("pstock-qty").value);
      const unit = document.getElementById("pstock-unit").value;
      const price = parseFloat(document.getElementById("pstock-price").value);
      const desired = parseFloat(document.getElementById("pstock-desired").value);

      if (!name || isNaN(qty) || qty < 0 || isNaN(price) || price < 0 || isNaN(desired) || desired <= 0) {
        showToast("Preencha todos os campos.");
        return;
      }

      const category = document.getElementById("pstock-category").value;
      const nextPhysicalStock = editingPhysicalId !== null
        ? getPhysicalStock().map((item) => item.id === editingPhysicalId
          ? {...item,name,currentQty:qty,unit,price,desiredQty:desired,category}
          : item)
        : [...getPhysicalStock(), {
          id: Date.now(),
          name,
          currentQty: qty,
          desiredQty: desired,
          unit,
          price,
          category,
          usedTotal: 0,
          history: [{type:"entrada",qty,date:new Date().toISOString()}],
        }];

      setPhysicalStock(nextPhysicalStock);
      db.save(storageKeys.physicalStock, getPhysicalStock());

      const existing = getStock().find((item) => item.name.toLowerCase() === name.toLowerCase());
      const nextStock = existing
        ? getStock().map((item) => item.name.toLowerCase() === name.toLowerCase()
          ? {...item,price,qty,unit,category}
          : item)
        : [...getStock(), {id:Date.now()+1,name,qty,unit,price,category,nutrition:getNutrition(name)}];

      setStock(nextStock);
      db.save(storageKeys.stock, getStock());

      closeModal("modal-pstock");
      renderPhysical();
      renderPhysicalCategoryFilters();
      renderRecipes(document.getElementById("recipe-search").value, getActiveIngredientFilter());
      showToast(editingPhysicalId ? "Atualizado!" : "Adicionado e sincronizado!");
    }

    async function deletePhysical(id) {
      if (!await confirmAction("Deseja excluir este produto do estoque fisico?", "Excluir produto")) return;

      setPhysicalStock(getPhysicalStock().filter((item) => item.id !== id));
      db.save(storageKeys.physicalStock, getPhysicalStock());
      renderPhysical();
      renderPhysicalCategoryFilters();
      showToast("Removido.");
    }

    function renderPhysical(filter = "") {
      currentPhysicalFilter = filter || "";
      const listElement = document.getElementById("pstock-list");
      applyPhysicalViewMode();
      renderPhysicalCategoryFilters();
      const filtered = getPhysicalStock().filter((item) => {
        const matchesName = item.name.toLowerCase().includes(filter.toLowerCase());
        const matchesCategory = !selectedPhysicalCategories.size || selectedPhysicalCategories.has(item.category);
        return matchesName && matchesCategory;
      });
      const summaryElement = document.getElementById("pstock-summary");

      if (getPhysicalStock().length) {
        const ok = getPhysicalStock().filter((item) => (item.currentQty / item.desiredQty) * 100 >= 80).length;
        const warn = getPhysicalStock().filter((item) => {
          const percent = (item.currentQty / item.desiredQty) * 100;
          return percent >= 50 && percent < 80;
        }).length;
        const low = getPhysicalStock().filter((item) => (item.currentQty / item.desiredQty) * 100 < 50).length;

        summaryElement.style.display = "grid";
        summaryElement.innerHTML = `
          <div><div class="summary-item-label"><span class="material-symbols-rounded">grid_view</span> Total</div><div class="summary-item-val">${getPhysicalStock().length}</div></div>
          <div><div class="summary-item-label"><span class="material-symbols-rounded" style="color:var(--g500)">check_circle</span> Adequado</div><div class="summary-item-val" style="color:var(--g500)">${ok}</div></div>
          <div><div class="summary-item-label"><span class="material-symbols-rounded" style="color:var(--warn)">warning</span> Atenção</div><div class="summary-item-val" style="color:var(--warn)">${warn}</div></div>
          <div><div class="summary-item-label"><span class="material-symbols-rounded" style="color:var(--r400)">error</span> Crítico</div><div class="summary-item-val" style="color:var(--r400)">${low}</div></div>`;
      } else {
        summaryElement.style.display = "none";
      }

      if (!filtered.length) {
        listElement.innerHTML = `<div class="empty-state"><span class="empty-icon"><span class="material-symbols-rounded" style="font-size:52px;font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 48">storefront</span></span><div class="empty-text">${filter?'Nenhum produto encontrado.':'Estoque físico vazio. Clique em "+ Novo"!'}</div></div>`;
        return;
      }

      listElement.innerHTML = filtered.map((item) => {
        const percent = item.desiredQty > 0 ? (item.currentQty / item.desiredQty) * 100 : 0;
        return `<div class="pstock-card">
          <div class="pstock-header">
            <div class="pstock-name">${item.name}${item.category?` <span class="tag" style="font-size:10px">${item.category}</span>`:''}</div>
            <div class="item-actions">
              <button class="btn btn-secondary btn-icon" onclick="openPhysicalModal(${item.id})" type="button"><span class="material-symbols-rounded">edit</span></button>
              <button class="btn btn-danger btn-icon" onclick="deletePhysical(${item.id})" type="button"><span class="material-symbols-rounded">delete</span></button>
            </div>
          </div>
          <div class="pstock-qty">${formatQuantity(item.currentQty,item.unit)}</div>
          <div class="pstock-meta">Meta: ${formatQuantity(item.desiredQty,item.unit)} · Usado: ${formatQuantity(item.usedTotal||0,item.unit)} · ${formatCurrency(item.price)}</div>
          ${stockBar(percent)}${stockFlag(percent)}
          <div class="pstock-move-actions">
            <button class="btn btn-danger btn-sm" style="flex:1" onclick="openMove(${item.id})" type="button"><span class="material-symbols-rounded">output</span> Usar</button>
            <button class="btn btn-primary btn-sm" style="flex:1" onclick="openMove(${item.id});setMoveType('repor')" type="button"><span class="material-symbols-rounded">input</span> Repor</button>
          </div>
        </div>`;
      }).join("");
    }

    function openMove(id) {
      movingPhysicalId = id;
      const item = getPhysicalStock().find((entry) => entry.id === id);
      if (!item) return;

      setMoveType("usar");
      document.getElementById("modal-move-title").textContent = item.name;
      document.getElementById("move-unit-display").textContent = item.unit;
      document.getElementById("move-qty").value = "";

      const percent = item.desiredQty > 0 ? (item.currentQty / item.desiredQty) * 100 : 0;
      document.getElementById("modal-move-info").innerHTML =
        `<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Em estoque</span><strong style="font-family:'Roboto Mono',monospace">${formatQuantity(item.currentQty,item.unit)}</strong></div>
         <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Desejado</span><strong style="font-family:'Roboto Mono',monospace">${formatQuantity(item.desiredQty,item.unit)}</strong></div>
         ${stockBar(percent)}${stockFlag(percent)}`;
      document.getElementById("modal-move").classList.add("open");
    }

    function setMoveType(type) {
      moveType = type;
      document.getElementById("move-btn-usar").classList.toggle("active", type === "usar");
      document.getElementById("move-btn-repor").classList.toggle("active", type === "repor");
      document.getElementById("move-qty-label").textContent = type === "usar" ? "Quantidade a usar" : "Quantidade a repor";
      document.getElementById("move-confirm-btn").textContent = type === "usar" ? "Confirmar Uso" : "Confirmar Reposição";
    }

    function confirmMove() {
      const item = getPhysicalStock().find((entry) => entry.id === movingPhysicalId);
      if (!item) return;

      const qty = parseFloat(document.getElementById("move-qty").value);
      if (!qty || qty <= 0) {
        showToast("Informe uma quantidade válida.");
        return;
      }

      if (moveType === "usar" && qty > item.currentQty) {
        showToast("Quantidade maior que o estoque!");
        return;
      }

      const delta = moveType === "usar" ? -qty : qty;
      const nextPhysicalStock = getPhysicalStock().map((entry) => {
        if (entry.id !== movingPhysicalId) return entry;

        return {
          ...entry,
          currentQty: Math.max(parseFloat((entry.currentQty + delta).toFixed(6)), 0),
          usedTotal: moveType === "usar" ? (entry.usedTotal || 0) + qty : (entry.usedTotal || 0),
          history: [...(entry.history || []), {type:moveType==="usar"?"saida":"entrada",qty,date:new Date().toISOString()}],
        };
      });

      setPhysicalStock(nextPhysicalStock);
      db.save(storageKeys.physicalStock, getPhysicalStock());

      const movedItem = nextPhysicalStock.find((entry) => entry.id === movingPhysicalId);
      const normalizedName = movedItem.name.toLowerCase();
      setStock(getStock().map((stockItem) => stockItem.name.toLowerCase() === normalizedName
        ? {...stockItem,qty:Math.max(parseFloat((stockItem.qty+delta).toFixed(6)),0)}
        : stockItem));
      db.save(storageKeys.stock, getStock());

      showToast(moveType === "usar" ? `${formatQuantity(qty,movedItem.unit)} retirados.` : `${formatQuantity(qty,movedItem.unit)} adicionados.`);
      closeModal("modal-move");
      renderPhysical();
    }

    return {
      stockColor,
      stockFlag,
      stockBar,
      applyPhysicalViewMode,
      setPhysicalViewMode,
      renderPhysicalCategoryFilters,
      togglePhysicalCategoryPanel,
      togglePhysicalCategoryFilter,
      clearPhysicalCategoryFilters,
      openPhysicalModal,
      savePhysical,
      deletePhysical,
      renderPhysical,
      openMove,
      setMoveType,
      confirmMove,
    };
  }

  window.FichaTecPhysicalStock = {
    createPhysicalStockModule,
  };
})();
