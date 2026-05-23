(function exposeCategoryCatalogModule() {
  function createCategoryCatalogModule(deps) {
    const {
      closeModal,
      db,
      getCategories,
      getPhysicalStock,
      getStock,
      renderPhysical,
      renderStock,
      setCategories,
      showToast,
      storageKeys,
    } = deps;

    const defaultCategories = [
      "Proteinas",
      "Carboidratos",
      "Laticinios",
      "Carnes",
      "Cereais",
      "Farinhas",
      "Acucares",
      "Oleos e Gorduras",
      "Temperos",
      "Hortifruti",
      "Leguminosas",
      "Outros",
    ];

    function normalizeCategoryName(name) {
      return String(name || "").trim().replace(/[<>]/g, "").replace(/\s+/g, " ");
    }

    function escapeOptionValue(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;");
    }

    function getDefaultCategoryNames() {
      return [...defaultCategories];
    }

    function getCategoryNames() {
      const explicit = Array.isArray(getCategories()) ? getCategories() : [];
      const fromVirtual = getStock().map((item) => item.category);
      const fromPhysical = getPhysicalStock().map((item) => item.category);
      const merged = [...defaultCategories, ...explicit, ...fromVirtual, ...fromPhysical]
        .map(normalizeCategoryName)
        .filter(Boolean);

      return [...new Set(merged)].sort((a, b) => a.localeCompare(b, "pt-BR"));
    }

    function persistCategories(nextCategories) {
      const normalized = [...new Set(nextCategories.map(normalizeCategoryName).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
      setCategories(normalized);
      db.save(storageKeys.categories, normalized);
      return normalized;
    }

    function ensureCategory(name) {
      const normalized = normalizeCategoryName(name);
      if (!normalized) return "";

      const existing = getCategoryNames().find((category) => category.toLowerCase() === normalized.toLowerCase());
      if (existing) return existing;

      persistCategories([...(getCategories() || []), normalized]);
      return normalized;
    }

    function renderCategoryOptions(selectId, selectedValue = "") {
      const select = document.getElementById(selectId);
      if (!select) return;

      const selected = normalizeCategoryName(selectedValue);
      const categories = selected && !getCategoryNames().includes(selected)
        ? [...getCategoryNames(), selected].sort((a, b) => a.localeCompare(b, "pt-BR"))
        : getCategoryNames();

      select.innerHTML = [
        '<option value="">Sem categoria</option>',
        ...categories.map((category) => `<option value="${escapeOptionValue(category)}">${category}</option>`),
      ].join("");
      select.value = selected;
    }

    function openCategoryModal(source = "virtual") {
      document.getElementById("category-source").value = source;
      document.getElementById("category-name").value = "";
      document.getElementById("modal-category-title").textContent = "Nova Categoria";
      document.getElementById("modal-category").classList.add("open");
      setTimeout(() => document.getElementById("category-name")?.focus(), 80);
    }

    function saveCategory() {
      const name = normalizeCategoryName(document.getElementById("category-name")?.value);
      if (!name) {
        showToast("Informe o nome da categoria.");
        return;
      }

      const alreadyExists = getCategoryNames().some((category) => category.toLowerCase() === name.toLowerCase());
      const savedName = ensureCategory(name);
      renderCategoryOptions("stock-category", savedName);
      renderCategoryOptions("pstock-category", savedName);
      renderStock();
      renderPhysical();
      closeModal("modal-category");
      showToast(alreadyExists ? "Categoria ja existia." : "Categoria cadastrada.");
    }

    function handleCategoryKeydown(event) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      saveCategory();
    }

    return {
      ensureCategory,
      getCategoryNames,
      getDefaultCategoryNames,
      handleCategoryKeydown,
      normalizeCategoryName,
      openCategoryModal,
      persistCategories,
      renderCategoryOptions,
      saveCategory,
    };
  }

  window.FichaTecCategoryCatalog = {
    createCategoryCatalogModule,
  };
})();
