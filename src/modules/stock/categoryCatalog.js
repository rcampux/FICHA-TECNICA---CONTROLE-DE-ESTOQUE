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
    const {presets, normalizeHex, defaultCategoryColor, categoryColorStyle, createCategoryColorPicker} = window.FichaTecCategoryColors;
    const colorPicker = createCategoryColorPicker();
    let savingCategory = false;

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
      return String((typeof name === "object" ? name?.name : name) || "").trim().replace(/[<>]/g, "").replace(/\s+/g, " ");
    }

    function getCategoryColor(name) {
      const record = (getCategories() || []).find(item => normalizeCategoryName(item).toLowerCase() === normalizeCategoryName(name).toLowerCase());
      return normalizeHex(record?.color) || defaultCategoryColor(normalizeCategoryName(name));
    }

    function getCategoryStyle(name) {
      return categoryColorStyle(getCategoryColor(name));
    }

    function normalizeCategoryRecords(items) {
      const records = new Map();
      for (const item of items) {
        const name = normalizeCategoryName(item);
        if (name) records.set(name.toLowerCase(), {name, color:normalizeHex(item?.color) || getCategoryColor(name)});
      }
      return [...records.values()].sort((a,b) => a.name.localeCompare(b.name, "pt-BR"));
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
      const normalized = normalizeCategoryRecords(nextCategories);
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

    function openCategoryModal(source = "virtual", name = "") {
      document.getElementById("category-source").value = source;
      document.getElementById("category-name").value = normalizeCategoryName(name);
      document.getElementById("category-name").readOnly = Boolean(name);
      document.getElementById("modal-category-title").textContent = name ? "Cor da categoria" : "Nova Categoria";
      colorPicker.open(name ? getCategoryColor(name) : presets[(getCategories() || []).length % presets.length][1]);
      document.getElementById("modal-category").classList.add("open");
      setTimeout(() => document.getElementById("category-name")?.focus(), 80);
    }

    async function saveCategoryRecord(value, color, expectedOrganizationId = db.activeOrganizationId?.()) {
      if (savingCategory) throw new Error("Aguarde o cadastro da categoria terminar.");
      const name = normalizeCategoryName(value);
      if (!name || name.length > 80) throw new Error("Informe um nome de categoria com até 80 caracteres.");
      const savedName = getCategoryNames().find(category => category.toLowerCase() === name.toLowerCase()) || name;
      const next = normalizeCategoryRecords([...(getCategories() || []), {name:savedName, color:normalizeHex(color) || getCategoryColor(savedName)}]);
      savingCategory = true;
      try {
        let saved = next;
        if (db.mode?.() === "supabase") {
          if (!expectedOrganizationId || expectedOrganizationId !== db.activeOrganizationId?.()) throw new Error("A cozinha mudou. Abra o cadastro novamente.");
          saved = await db.saveRemote(storageKeys.categories, next, expectedOrganizationId);
          if (expectedOrganizationId !== db.activeOrganizationId?.()) throw new Error("A cozinha mudou. Abra o cadastro novamente.");
        } else {
          await db.save(storageKeys.categories, next);
        }
        setCategories(saved);
        db.saveLocal?.(storageKeys.categories, saved);
        renderStock();
        renderPhysical();
        return savedName;
      } finally {
        savingCategory = false;
      }
    }

    async function saveCategory() {
      if (savingCategory) return;
      const name = normalizeCategoryName(document.getElementById("category-name")?.value);
      if (!name) {
        showToast("Informe o nome da categoria.");
        return;
      }

      const color = normalizeHex(document.getElementById("category-color-hex").value);
      if (!color) {
        colorPicker.setColor("");
        document.getElementById("category-color-hex").focus();
        return;
      }
      const existingName = getCategoryNames().find(category => category.toLowerCase() === name.toLowerCase());
      const button = document.getElementById("category-save");
      button.disabled = true;
      try {
        const savedName = await saveCategoryRecord(name, color);
        renderCategoryOptions("stock-category", savedName);
        renderCategoryOptions("pstock-category", savedName);
        closeModal("modal-category");
        showToast(existingName ? "Cor da categoria atualizada." : "Categoria cadastrada.");
      } catch (error) {
        console.error("Category color save failed", error);
        showToast("Não foi possível salvar a categoria. Tente novamente.");
      } finally {
        button.disabled = false;
      }
    }

    function handleCategoryKeydown(event) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      saveCategory();
    }

    return {
      ensureCategory,
      getCategoryColor,
      getCategoryStyle,
      normalizeCategoryRecords,
      getCategoryNames,
      getDefaultCategoryNames,
      handleCategoryKeydown,
      normalizeCategoryName,
      openCategoryModal,
      persistCategories,
      renderCategoryOptions,
      saveCategory,
      saveCategoryRecord,
    };
  }

  window.FichaTecCategoryCatalog = {
    createCategoryCatalogModule,
  };
})();
