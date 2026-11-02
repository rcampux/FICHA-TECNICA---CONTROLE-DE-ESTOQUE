(function exposeProductDiscoveryModule() {
  function createProductDiscoveryModule(deps) {
    const {
      closeModal,
      ensureCategory,
      formatCurrency,
      getNutrition,
      renderCategoryOptions,
      showToast,
    } = deps;

    const editorConfig = {
      virtual: {
        prefix: "nut",
        nameId: "stock-name",
        qtyId: "stock-qty",
        unitId: "stock-unit",
        priceId: "stock-price",
        categoryId: "stock-category",
        previewId: "nutrition-portion-preview",
        messageId: "stock-nutrition-message",
      },
      physical: {
        prefix: "pnut",
        nameId: "pstock-name",
        qtyId: "pstock-qty",
        unitId: "pstock-unit",
        priceId: "pstock-price",
        desiredId: "pstock-desired",
        categoryId: "pstock-category",
        previewId: "pnutrition-portion-preview",
        messageId: "pstock-nutrition-message",
      },
    };
    let activeStockType = "virtual";
    let activeSearchMode = "general";
    let productSearchResults = [];
    let productSearchController = null;
    const nutritionMetadata = {virtual:{}, physical:{}};

    function normalizeStockType(type) {
      return type === "physical" ? "physical" : "virtual";
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function readNumberInput(id, fallback = null) {
      const rawValue = document.getElementById(id)?.value?.trim();
      if (rawValue === "" || rawValue === undefined) return fallback;
      const number = Number(rawValue.replace?.(",", ".") ?? rawValue);
      return Number.isFinite(number) ? number : fallback;
    }

    function writeNumberInput(id, value) {
      const element = document.getElementById(id);
      if (!element) return;
      element.value = value === null || value === undefined || !Number.isFinite(Number(value)) ? "" : Number(value);
    }

    function getNutritionPortionSize(nutrition = {}) {
      const portionSize = Number(nutrition.portionSize);
      return Number.isFinite(portionSize) && portionSize > 0 ? portionSize : 100;
    }

    function scaleNutritionForPortion(nutrition = {}, portionSize = getNutritionPortionSize(nutrition)) {
      const factor = portionSize / 100;
      return {
        kcal: nutrition.kcal == null ? null : Number(nutrition.kcal) * factor,
        carb: nutrition.carb == null ? null : Number(nutrition.carb) * factor,
        prot: nutrition.prot == null ? null : Number(nutrition.prot) * factor,
        fat: nutrition.fat == null ? null : Number(nutrition.fat) * factor,
        satFat: nutrition.satFat == null ? null : Number(nutrition.satFat) * factor,
        transFat: nutrition.transFat == null ? null : Number(nutrition.transFat) * factor,
        fiber: nutrition.fiber == null ? null : Number(nutrition.fiber) * factor,
        sodium: nutrition.sodium == null ? null : Number(nutrition.sodium) * factor,
      };
    }

    function formatNutritionMetric(value, unit) {
      if (value === null || value === undefined || !Number.isFinite(Number(value))) return "-";
      const digits = Math.abs(value) >= 10 || unit === "mg" || unit === "kcal" ? 0 : 1;
      return `${Number(value).toLocaleString("pt-BR", {maximumFractionDigits: digits})}${unit ? ` ${unit}` : ""}`;
    }

    function readNutrition(type = "virtual") {
      const stockType = normalizeStockType(type);
      const config = editorConfig[stockType];
      const prefix = config.prefix;
      return {
        ...nutritionMetadata[stockType],
        kcal: readNumberInput(`${prefix}-kcal`),
        carb: readNumberInput(`${prefix}-carb`),
        prot: readNumberInput(`${prefix}-prot`),
        fat: readNumberInput(`${prefix}-fat`),
        satFat: readNumberInput(`${prefix}-sat-fat`),
        transFat: readNumberInput(`${prefix}-trans-fat`),
        fiber: readNumberInput(`${prefix}-fiber`),
        sodium: readNumberInput(`${prefix}-sodium`),
        portionSize: readNumberInput(`${prefix}-portion-size`, 100),
      };
    }

    function writeNutrition(type = "virtual", nutrition = {}) {
      const stockType = normalizeStockType(type);
      const config = editorConfig[stockType];
      const prefix = config.prefix;
      const numericKeys = new Set(["kcal", "carb", "prot", "fat", "satFat", "transFat", "fiber", "sodium", "portionSize"]);
      nutritionMetadata[stockType] = Object.fromEntries(
        Object.entries(nutrition).filter(([key]) => !numericKeys.has(key)),
      );
      writeNumberInput(`${prefix}-kcal`, nutrition.kcal);
      writeNumberInput(`${prefix}-carb`, nutrition.carb);
      writeNumberInput(`${prefix}-prot`, nutrition.prot);
      writeNumberInput(`${prefix}-fat`, nutrition.fat);
      writeNumberInput(`${prefix}-sat-fat`, nutrition.satFat);
      writeNumberInput(`${prefix}-trans-fat`, nutrition.transFat);
      writeNumberInput(`${prefix}-fiber`, nutrition.fiber);
      writeNumberInput(`${prefix}-sodium`, nutrition.sodium);
      writeNumberInput(`${prefix}-portion-size`, getNutritionPortionSize(nutrition));
      updateNutritionPreview(type);
    }

    function setNutritionMessage(type, message = "", tone = "neutral") {
      const element = document.getElementById(editorConfig[normalizeStockType(type)].messageId);
      if (!element) return;
      element.textContent = message;
      element.dataset.tone = tone;
      element.hidden = !message;
    }

    function updateNutritionPreview(type = "virtual") {
      const config = editorConfig[normalizeStockType(type)];
      const preview = document.getElementById(config.previewId);
      if (!preview) return;
      const nutrition = readNutrition(type);
      const portionSize = getNutritionPortionSize(nutrition);
      const scaled = scaleNutritionForPortion(nutrition, portionSize);
      preview.innerHTML = `
        <div class="nutrition-preview-head">Estimativa por porção de ${formatNutritionMetric(portionSize, "g")}</div>
        <div class="nutrition-preview-grid">
          <span><strong>${formatNutritionMetric(scaled.kcal, "kcal")}</strong><small>Calorias</small></span>
          <span><strong>${formatNutritionMetric(scaled.carb, "g")}</strong><small>Carboidratos</small></span>
          <span><strong>${formatNutritionMetric(scaled.prot, "g")}</strong><small>Proteínas</small></span>
          <span><strong>${formatNutritionMetric(scaled.fat, "g")}</strong><small>Gorduras</small></span>
          <span><strong>${formatNutritionMetric(scaled.satFat, "g")}</strong><small>Saturada</small></span>
          <span><strong>${formatNutritionMetric(scaled.transFat, "g")}</strong><small>Trans</small></span>
          <span><strong>${formatNutritionMetric(scaled.fiber, "g")}</strong><small>Fibras</small></span>
          <span><strong>${formatNutritionMetric(scaled.sodium, "mg")}</strong><small>Sódio</small></span>
        </div>`;
    }

    function hasNutritionValues(nutrition = {}) {
      return ["kcal", "carb", "prot", "fat", "fiber", "sodium"]
        .some((key) => nutrition[key] != null && nutrition[key] !== "" && Number.isFinite(Number(nutrition[key])));
    }

    async function generateNutrition(type = "virtual", productName = "", options = {}) {
      const stockType = normalizeStockType(type);
      const config = editorConfig[stockType];
      const name = String(productName || document.getElementById(config.nameId)?.value || "").trim();
      if (name.length < 2) {
        showToast("Digite o nome do produto para gerar a tabela.");
        document.getElementById(config.nameId)?.focus();
        return null;
      }

      setNutritionMessage(stockType, "Buscando uma referência nutricional por 100 g…", "loading");
      try {
        const response = await fetch(`/api/nutrition-search?q=${encodeURIComponent(name)}`, {headers:{accept:"application/json"}});
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.nutrition) throw new Error(payload?.error || "Tabela não encontrada.");

        const nutrition = {...payload.nutrition, portionSize: 100};
        writeNutrition(stockType, nutrition);
        setNutritionMessage(
          stockType,
          `Tabela preenchida por 100 g com referência de ${nutrition.sourceProduct || "produto equivalente"}${nutrition.sourceBrand ? ` · ${nutrition.sourceBrand}` : ""}. Revise o rótulo antes de salvar.`,
          "success",
        );
        if (!options.silent) showToast("Tabela nutricional preenchida.");
        return nutrition;
      } catch (error) {
        const fallback = getNutrition?.(name) || {};
        if (fallback !== window.FichaTecNutrition?.defaultNutrition?.default && hasNutritionValues(fallback)) {
          const nutrition = {...fallback, portionSize: 100, source: "local-estimate"};
          writeNutrition(stockType, nutrition);
          setNutritionMessage(stockType, "Estimativa inicial preenchida. Compare com o rótulo do produto antes de salvar.", "warning");
          if (!options.silent) showToast("Estimativa nutricional preenchida para revisão.");
          return nutrition;
        }
        setNutritionMessage(stockType, error?.message || "Não foi possível gerar a tabela. Preencha os valores manualmente.", "error");
        if (!options.silent) showToast("Não foi possível gerar a tabela agora.");
        return null;
      }
    }

    function setSearchStatus(message = "", tone = "neutral") {
      const status = document.getElementById("product-search-status");
      if (!status) return;
      status.textContent = message;
      status.dataset.tone = tone;
      status.hidden = !message;
    }

    function setSearchBusy(isBusy) {
      const button = document.getElementById("product-search-submit");
      const input = document.getElementById("product-search-input");
      document.getElementById("modal-product-search")?.classList.toggle("is-searching", Boolean(isBusy));
      if (button) {
        button.disabled = Boolean(isBusy);
        button.innerHTML = isBusy
          ? '<span class="material-symbols-rounded product-search-spin">progress_activity</span> Pesquisando'
          : '<span class="material-symbols-rounded">search</span> Pesquisar';
      }
      if (input) input.disabled = Boolean(isBusy);
    }

    function renderProductSearchResults() {
      const container = document.getElementById("product-search-results");
      if (!container) return;
      if (!productSearchResults.length) {
        container.innerHTML = '<div class="product-search-empty"><span class="material-symbols-rounded">travel_explore</span><strong>Nenhum preço encontrado</strong><span>Tente um nome mais específico, incluindo marca ou embalagem.</span></div>';
        return;
      }

      container.innerHTML = productSearchResults.map((result, index) => {
        const thumbnail = /^https:\/\//i.test(result.thumbnail || "")
          ? `<img src="${escapeHtml(result.thumbnail)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
          : '<span class="material-symbols-rounded">grocery</span>';
        return `<button class="product-result" data-product-index="${index}" type="button" aria-label="Selecionar ${escapeHtml(result.title)} por ${escapeHtml(formatCurrency(result.price))}">
          <span class="product-result-media">${thumbnail}</span>
          <span class="product-result-copy">
            <strong>${escapeHtml(result.title)}</strong>
            <small>${escapeHtml(result.market || "Loja online")}${result.delivery ? ` · ${escapeHtml(result.delivery)}` : ""}</small>
          </span>
          <span class="product-result-price"><strong>${escapeHtml(formatCurrency(result.price))}</strong><small>Selecionar</small></span>
        </button>`;
      }).join("");

      container.onclick = (event) => {
        const button = event.target.closest("[data-product-index]");
        if (!button || !container.contains(button)) return;
        selectProductResult(Number(button.dataset.productIndex));
      };
    }

    function openProductSearch(type = "virtual") {
      activeStockType = normalizeStockType(type);
      activeSearchMode = "general";
      productSearchResults = [];
      const config = editorConfig[activeStockType];
      const input = document.getElementById("product-search-input");
      if (input) input.value = document.getElementById(config.nameId)?.value?.trim() || "";
      document.getElementById("product-search-results").innerHTML = '<div class="product-search-prompt"><span class="material-symbols-rounded">manage_search</span><strong>Pesquise o nome do seu produto</strong><span>Compare até 10 ofertas e escolha a melhor para preencher o estoque.</span></div>';
      setSearchStatus("", "neutral");
      setProductSearchMode("general", {search:false});
      document.getElementById("modal-product-search")?.classList.add("open");
      window.setTimeout(() => input?.focus(), 80);
    }

    function closeProductSearch() {
      productSearchController?.abort();
      productSearchController = null;
      setSearchBusy(false);
      closeModal("modal-product-search");
    }

    function requestCurrentPosition() {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Localização não disponível neste navegador."));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error("Permita a localização para ver mercados próximos.")), {
          enableHighAccuracy: false,
          maximumAge: 5 * 60 * 1000,
          timeout: 9000,
        });
      });
    }

    async function runProductSearch() {
      const input = document.getElementById("product-search-input");
      const query = input?.value?.trim() || "";
      if (query.length < 2) {
        setSearchStatus("Digite ao menos dois caracteres.", "error");
        input?.focus();
        return;
      }

      productSearchController?.abort();
      productSearchController = new AbortController();
      setSearchBusy(true);
      setSearchStatus(activeSearchMode === "near" ? "Localizando mercados próximos…" : "Consultando preços no Google Shopping…", "loading");

      try {
        const params = new URLSearchParams({q:query, mode:activeSearchMode});
        if (activeSearchMode === "near") {
          const position = await requestCurrentPosition();
          params.set("lat", String(position.coords.latitude));
          params.set("lng", String(position.coords.longitude));
        }
        const response = await fetch(`/api/product-search?${params}`, {
          headers:{accept:"application/json"},
          signal:productSearchController.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Pesquisa indisponível.");

        productSearchResults = (payload.results || []).slice(0, 10).sort((left, right) => Number(left.price) - Number(right.price));
        renderProductSearchResults();
        const locationLabel = payload.location ? ` em ${payload.location}` : "";
        setSearchStatus(`${productSearchResults.length} oferta(s) ordenada(s) do menor para o maior preço${locationLabel}.`, "success");
      } catch (error) {
        if (error?.name === "AbortError") return;
        productSearchResults = [];
        renderProductSearchResults();
        setSearchStatus(error?.message || "Não foi possível pesquisar agora.", "error");
      } finally {
        setSearchBusy(false);
      }
    }

    function setProductSearchMode(mode, options = {}) {
      activeSearchMode = mode === "near" ? "near" : "general";
      document.getElementById("product-search-general")?.classList.toggle("active", activeSearchMode === "general");
      document.getElementById("product-search-near")?.classList.toggle("active", activeSearchMode === "near");
      document.getElementById("product-search-general")?.setAttribute("aria-pressed", String(activeSearchMode === "general"));
      document.getElementById("product-search-near")?.setAttribute("aria-pressed", String(activeSearchMode === "near"));
      if (options.search !== false && document.getElementById("product-search-input")?.value?.trim()) runProductSearch();
    }

    function inferPackage(title) {
      const normalized = String(title || "").replace(/,/g, ".");
      const multipack = normalized.match(/(\d+)\s*[xX]\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|l|un(?:idades?)?)/i);
      const single = normalized.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l|un(?:idades?)?)(?![a-z])/i);
      const match = multipack || single;
      if (!match) return {quantity:1, unit:"un"};

      const multiplier = multipack ? Number(match[1]) : 1;
      let quantity = Number(multipack ? match[2] : match[1]) * multiplier;
      let unit = String(multipack ? match[3] : match[2]).toLocaleLowerCase("pt-BR");
      if (unit === "l") {
        quantity *= 1000;
        unit = "ml";
      } else if (unit.startsWith("un")) {
        unit = "un";
      }
      return {quantity:Number(quantity.toFixed(3)), unit};
    }

    function inferCategory(title) {
      const name = String(title || "").toLocaleLowerCase("pt-BR");
      const rules = [
        ["Carnes", /carne|acém|acem|patinho|frango|peixe|linguiça|bovina|suína|suino/],
        ["Laticínios", /leite|queijo|manteiga|iogurte|creme de leite/],
        ["Farinhas", /farinha|trigo|polvilho|amido/],
        ["Açúcares", /açúcar|acucar|mel|adoçante|adocante/],
        ["Cereais", /arroz|aveia|milho|feijão|feijao|grão|grao/],
        ["Temperos", /sal|pimenta|alho|cebola|tempero|vinagre|azeite|óleo|oleo/],
      ];
      return rules.find(([, pattern]) => pattern.test(name))?.[0] || "Outros";
    }

    async function selectProductResult(index) {
      const result = productSearchResults[index];
      if (!result) return;
      const type = activeStockType;
      const config = editorConfig[type];
      const packageInfo = inferPackage(result.title);
      const category = ensureCategory ? ensureCategory(inferCategory(result.title)) : inferCategory(result.title);

      document.getElementById(config.nameId).value = result.title;
      document.getElementById(config.qtyId).value = packageInfo.quantity;
      document.getElementById(config.unitId).value = packageInfo.unit;
      document.getElementById(config.priceId).value = Number(result.price).toFixed(2);
      if (config.desiredId) document.getElementById(config.desiredId).value = packageInfo.quantity;
      renderCategoryOptions?.(config.categoryId, category);
      document.getElementById(config.categoryId).value = category;

      closeProductSearch();
      setNutritionMessage(type, "Produto selecionado. Preenchendo a tabela nutricional…", "loading");
      const nutrition = await generateNutrition(type, result.title, {silent:true});
      const current = readNutrition(type);
      writeNutrition(type, {
        ...current,
        ...(nutrition || {}),
        sourceMarket: result.market,
        sourcePrice: result.price,
        sourceLink: result.link,
        portionSize: getNutritionPortionSize(nutrition || current),
      });
      showToast("Produto selecionado e formulário preenchido.");
    }

    function handleProductSearchKeydown(event) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      runProductSearch();
    }

    return {
      closeProductSearch,
      formatNutritionMetric,
      generateNutrition,
      getNutritionPortionSize,
      handleProductSearchKeydown,
      inferCategory,
      inferPackage,
      openProductSearch,
      readNutrition,
      runProductSearch,
      scaleNutritionForPortion,
      selectProductResult,
      setNutritionMessage,
      setProductSearchMode,
      updateNutritionPreview,
      writeNutrition,
    };
  }

  window.FichaTecProductDiscovery = {createProductDiscoveryModule};
})();
