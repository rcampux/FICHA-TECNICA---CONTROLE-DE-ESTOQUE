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
    const editorVersions = {virtual:0, physical:0};

    function calculateProductPrice(reference, quantity, unit) {
      const units = {kg:{family:"mass",factor:1000},mg:{family:"mass",factor:0.001},g:{family:"mass",factor:1},ml:{family:"volume",factor:1},un:{family:"count",factor:1}};
      const from = units[reference?.unit];
      const to = units[unit];
      if (!from || !to || from.family !== to.family || !(reference.quantity > 0) || !(quantity > 0)) return null;
      return Math.round(reference.price * (quantity * to.factor) / (reference.quantity * from.factor) * 100) / 100;
    }

    function updateProductPrice(type, manualPrice = false) {
      const stockType = normalizeStockType(type);
      const config = editorConfig[stockType];
      const metadata = nutritionMetadata[stockType];
      const quantity = readNumberInput(config.qtyId);
      const unit = document.getElementById(config.unitId).value;
      const hint = document.getElementById(`${config.priceId}-hint`);
      if (manualPrice && quantity > 0) {
        const price = readNumberInput(config.priceId);
        if (price !== null && price >= 0) metadata.priceReference = {quantity,unit,price};
      }
      let reference = metadata.priceReference;
      if (!reference) { if (hint) hint.textContent = ""; return; }
      let price = calculateProductPrice(reference, quantity, unit);
      if (price === null && !manualPrice && quantity > 0) {
        if (unit === "un") {
          // One unit represents one package of the recorded reference quantity.
          price = calculateProductPrice({quantity:1,unit,price:reference.price}, quantity, unit);
        } else {
          // No density or package weight is known: the entered quantity defines
          // the new base while preserving the amount already paid.
          const paid = readNumberInput(config.priceId);
          if (paid !== null && paid >= 0) {
            reference = metadata.priceReference = {quantity,unit,price:paid};
            price = paid;
          }
        }
      }
      if (price !== null && !manualPrice) writeNumberInput(config.priceId, price);
      if (hint) hint.textContent = price === null
        ? "Preço mantido. Informe uma quantidade válida para calcular."
        : unit === "un" && reference.unit !== "un"
        ? `Cada unidade corresponde à embalagem de ${reference.quantity} ${reference.unit} por ${formatCurrency(reference.price)}.`
        : `Preço proporcional à base de ${reference.quantity} ${reference.unit} por ${formatCurrency(reference.price)}.`;
    }

    function changeProductUnit(type) {
      const config = editorConfig[normalizeStockType(type)];
      const hint = document.getElementById(`${config.priceId}-hint`);
      if (hint) hint.textContent = "Preço mantido. Ajuste a quantidade para recalcular o valor.";
    }

    function editNutritionPortion(type) {
      const config = editorConfig[normalizeStockType(type)];
      const panel = document.getElementById(`${config.prefix}-portion-editor`);
      if (!panel) return;
      panel.hidden = !panel.hidden;
      document.getElementById(`${config.prefix}-portion-toggle`)?.setAttribute("aria-expanded", String(!panel.hidden));
      if (!panel.hidden) {
        const input = document.getElementById(`${config.prefix}-portion-inline`);
        input.focus(); input.select();
      }
    }

    function setNutritionPortion(type, value) {
      const config = editorConfig[normalizeStockType(type)];
      const size = Number(value);
      if (!Number.isFinite(size) || size <= 0) return;
      writeNumberInput(`${config.prefix}-portion-size`, size);
      updateNutritionPreview(type, true);
    }

    function updateSearchRadius() {
      const radius = document.getElementById("product-search-radius");
      document.getElementById("product-search-radius-value").textContent = `${radius.value} km`;
      productSearchController?.abort();
      productSearchResults = [];
      document.getElementById("product-search-results").innerHTML = "";
      setSearchStatus("Clique em Pesquisar para aplicar o novo raio.");
    }

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
      editorVersions[stockType] += 1;
      setNutritionMessage(stockType);
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
      const hint = document.getElementById(`${config.priceId}-hint`);
      if (hint) hint.textContent = nutrition.priceReference
        ? "Ajuste a quantidade para recalcular o valor. Trocar apenas a unidade mantém o preço."
        : "";
    }

    function setNutritionMessage(type, message = "", tone = "neutral") {
      const element = document.getElementById(editorConfig[normalizeStockType(type)].messageId);
      if (!element) return;
      element.textContent = message;
      element.dataset.tone = tone;
      element.hidden = !message;
    }

    function updateNutritionPreview(type = "virtual", preserveEditor = false) {
      const config = editorConfig[normalizeStockType(type)];
      const preview = document.getElementById(config.previewId);
      if (!preview) return;
      const nutrition = readNutrition(type);
      const portionSize = getNutritionPortionSize(nutrition);
      const scaled = scaleNutritionForPortion(nutrition, portionSize);
      const cards = `
          <span><strong>${formatNutritionMetric(scaled.kcal, "kcal")}</strong><small>Calorias</small></span>
          <span><strong>${formatNutritionMetric(scaled.carb, "g")}</strong><small>Carboidratos</small></span>
          <span><strong>${formatNutritionMetric(scaled.prot, "g")}</strong><small>Proteínas</small></span>
          <span><strong>${formatNutritionMetric(scaled.fat, "g")}</strong><small>Gorduras</small></span>
          <span><strong>${formatNutritionMetric(scaled.satFat, "g")}</strong><small>Saturada</small></span>
          <span><strong>${formatNutritionMetric(scaled.transFat, "g")}</strong><small>Trans</small></span>
          <span><strong>${formatNutritionMetric(scaled.fiber, "g")}</strong><small>Fibras</small></span>
          <span><strong>${formatNutritionMetric(scaled.sodium, "mg")}</strong><small>Sódio</small></span>`;
      const heading = `Estimativa por porção de ${formatNutritionMetric(portionSize, "g/ml")}`;
      if (preserveEditor && preview.querySelector(".nutrition-preview-grid")) {
        preview.querySelector(".nutrition-preview-grid").innerHTML = cards;
        preview.querySelector(".nutrition-preview-title").textContent = heading;
        return;
      }
      preview.innerHTML = `<div class="nutrition-preview-head"><span class="nutrition-preview-title">${heading}</span>
        <button type="button" class="nutrition-edit-portion" id="${config.prefix}-portion-toggle" aria-expanded="false" aria-controls="${config.prefix}-portion-editor" onclick="editNutritionPortion('${normalizeStockType(type)}')">Editar porção</button></div>
        <div class="nutrition-inline-portion" id="${config.prefix}-portion-editor" hidden>
          <label for="${config.prefix}-portion-inline">Porção (g/ml)</label>
          <input id="${config.prefix}-portion-inline" type="number" min="0.1" step="any" value="${portionSize}" oninput="setNutritionPortion('${normalizeStockType(type)}',this.value)">
          <small>Os nutrientes abaixo acompanham a porção. A base por 100 g/ml é preservada.</small>
        </div><div class="nutrition-preview-grid">${cards}</div>`;
    }

    function hasNutritionValues(nutrition = {}) {
      return ["kcal", "carb", "prot", "fat", "fiber", "sodium"]
        .some((key) => nutrition[key] != null && nutrition[key] !== "" && Number.isFinite(Number(nutrition[key])));
    }

    function roundNutritionValues(nutrition) {
      const rounded = {...nutrition};
      for (const key of ['kcal', 'carb', 'prot', 'fat', 'satFat', 'transFat', 'fiber', 'sodium']) {
        const value = nutrition[key];
        rounded[key] = value == null || value === '' || !Number.isFinite(Number(value)) ? null : Math.round(Number(value));
      }
      return rounded;
    }

    async function fetchNutrition(productName) {
      const response = await fetch(`/api/nutrition-search?q=${encodeURIComponent(productName)}`, {
        headers: {accept: 'application/json'},
        signal: AbortSignal.timeout(15000),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.nutrition) throw new Error(payload?.error || 'Tabela não encontrada. Você pode preencher os valores manualmente.');
      return roundNutritionValues(payload.nutrition);
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
      const version = ++editorVersions[stockType];
      try {
        const foundNutrition = await fetchNutrition(name);

        if (version !== editorVersions[stockType] || document.getElementById(config.nameId).value.trim() !== name) return null;
        const nutrition = {...readNutrition(stockType), ...foundNutrition, portionSize: getNutritionPortionSize(readNutrition(stockType))};
        writeNutrition(stockType, nutrition);
        setNutritionMessage(
          stockType,
          `Tabela preenchida por 100 g com referência de ${nutrition.sourceProduct || "produto equivalente"}${nutrition.sourceBrand ? ` · ${nutrition.sourceBrand}` : ""}. Revise o rótulo antes de salvar.`,
          "success",
        );
        if (!options.silent) showToast("Tabela nutricional preenchida.");
        return nutrition;
      } catch (error) {
        if (version !== editorVersions[stockType] || document.getElementById(config.nameId).value.trim() !== name) return null;
        const fallback = getNutrition?.(name) || {};
        if (fallback !== window.FichaTecNutrition?.defaultNutrition?.default && hasNutritionValues(fallback)) {
          const nutrition = {...readNutrition(stockType), ...roundNutritionValues(fallback), portionSize: getNutritionPortionSize(readNutrition(stockType)), source: "local-estimate"};
          writeNutrition(stockType, nutrition);
          setNutritionMessage(stockType, "Estimativa inicial preenchida. Compare com o rótulo do produto antes de salvar.", "warning");
          if (!options.silent) showToast("Estimativa nutricional preenchida. Confira com o rótulo antes de salvar.",{tone:'warning'});
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
      if(message&&tone==='error')showToast(message,{tone:'error'});
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
            ${result.distanceKm != null ? `<small>${Number(result.distanceKm).toLocaleString("pt-BR",{maximumFractionDigits:1})} km · ${escapeHtml(result.nearbyStore)} — preço online da rede; confirme na unidade.</small>` : ""}
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
      const controller = productSearchController;
      setSearchBusy(true);
      setSearchStatus(activeSearchMode === "near" ? "Localizando mercados próximos…" : "Consultando preços no Google Shopping…", "loading");

      try {
        const params = new URLSearchParams({q:query, mode:activeSearchMode});
        if (activeSearchMode === "near") {
          const position = await requestCurrentPosition();
          params.set("lat", String(position.coords.latitude));
          params.set("lng", String(position.coords.longitude));
          params.set("radius", document.getElementById("product-search-radius").value);
        }
        if (controller.signal.aborted) return;
        const response = await fetch(`/api/product-search?${params}`, {
          headers:{accept:"application/json"},
          signal:controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Pesquisa indisponível.");
        if (controller !== productSearchController || controller.signal.aborted) return;

        productSearchResults = (payload.results || []).slice(0, 10).sort((left, right) => Number(left.price) - Number(right.price));
        renderProductSearchResults();
        const locationLabel = payload.location ? ` em ${payload.location}` : "";
        setSearchStatus(payload.notice || `${productSearchResults.length} oferta(s) ordenada(s) do menor para o maior preço${locationLabel}.`, "success");
        if (payload.nearbyStores?.length) {
          const nearby = document.createElement("div");
          nearby.className = "nearby-stores";
          nearby.innerHTML = `<strong>Mercados no raio de ${Number(payload.radiusKm)} km</strong>${payload.nearbyStores.map(store => `<p>${escapeHtml(store.name)} · ${Number(store.distanceKm).toLocaleString("pt-BR",{maximumFractionDigits:1})} km<br><small>${escapeHtml(store.address)}</small></p>`).join("")}`;
          document.getElementById("product-search-results").append(nearby);
        }
      } catch (error) {
        if (error?.name === "AbortError") return;
        productSearchResults = [];
        renderProductSearchResults();
        setSearchStatus(error?.message || "Não foi possível pesquisar agora.", "error");
      } finally {
        if (controller === productSearchController) setSearchBusy(false);
      }
    }

    function setProductSearchMode(mode, options = {}) {
      activeSearchMode = mode === "near" ? "near" : "general";
      productSearchController?.abort();
      document.getElementById("product-search-radius-panel").hidden = activeSearchMode !== "near";
      document.getElementById("product-search-general")?.classList.toggle("active", activeSearchMode === "general");
      document.getElementById("product-search-near")?.classList.toggle("active", activeSearchMode === "near");
      document.getElementById("product-search-general")?.setAttribute("aria-pressed", String(activeSearchMode === "general"));
      document.getElementById("product-search-near")?.setAttribute("aria-pressed", String(activeSearchMode === "near"));
      if (options.search !== false) {
        productSearchResults = [];
        document.getElementById("product-search-results").innerHTML = "";
        setSearchStatus(activeSearchMode === "near" ? "Escolha o raio e clique em Pesquisar. Precisaremos da sua localização." : "Clique em Pesquisar para comparar as ofertas.");
      }
    }

    function inferPackage(title) {
      return window.FichaTecMeasurements.packageSize(title) || {quantity:'',unit:'g'};
    }

    function inferCategory(title) {
      const name = String(title || "").toLocaleLowerCase("pt-BR");
      const rules = [
        ["Bebidas", /refrigerante|suco|água|agua|café|cafe|cerveja|vinho/],
        ["Confeitaria", /chocolate|cacau|sorvete|gelatina|granulado/],
        ["Carnes", /carne|acém|acem|patinho|frango|peixe|linguiça|bovina|suína|suino/],
        ["Laticínios", /leite|queijo|manteiga|iogurte|creme de leite/],
        ["Farinhas", /farinha|trigo|polvilho|amido/],
        ["Açúcares", /açúcar|acucar|\bmel\b|adoçante|adocante/],
        ["Leguminosas", /feijão|feijao|grão.de.bico|grao.de.bico|lentilha|ervilha|soja/],
        ["Cereais", /arroz|aveia|milho|grão|grao/],
        ["Óleos e Gorduras", /azeite|óleo|oleo|banha/],
        ["Hortifruti", /banana|maçã|maca|morango|laranja|limão|limao|tomate|batata|cenoura|abobrinha|alface|fruta|legume|alcachofra|brócolis|brocolis|couve|berinjela|pimentão|pimentao|abacate|abacaxi|manga|coco|melancia|melão|melao|kiwi|mirtilo|pepino/],
        ["Proteinas", /whey|proteína|proteina|ovo/],
        ["Temperos", /\bsal\b|pimenta|alho|cebola|tempero|vinagre/],
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

      const nameField = document.getElementById(config.nameId);
      if (!nameField.readOnly) nameField.value = result.title;
      document.getElementById(config.qtyId).value = packageInfo.quantity;
      document.getElementById(config.unitId).value = packageInfo.unit;
      document.getElementById(config.priceId).value = Number(result.price).toFixed(2);
      if (config.desiredId) document.getElementById(config.desiredId).value = packageInfo.quantity;
      renderCategoryOptions?.(config.categoryId, category);
      document.getElementById(config.categoryId).value = category;

      closeProductSearch();
      writeNutrition(type, {
        portionSize:100,
        ...(packageInfo.quantity>0?{priceReference:{quantity:packageInfo.quantity,unit:packageInfo.unit,price:result.price}}:{}),
        sourceMarket:result.market,sourcePrice:result.price,sourceLink:result.link,
      });
      setNutritionMessage(type, "Produto selecionado. Preenchendo a tabela nutricional…", "loading");
      await generateNutrition(type, result.title, {silent:true});
      showToast(packageInfo.quantity>0?"Produto selecionado e formulário preenchido.":"Informe o peso ou volume da embalagem para concluir o cadastro.");
    }

    function handleProductSearchKeydown(event) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      runProductSearch();
    }

    return {
      calculateProductPrice,
      updateProductPrice,
      changeProductUnit,
      editNutritionPortion,
      setNutritionPortion,
      updateSearchRadius,
      closeProductSearch,
      formatNutritionMetric,
      generateNutrition,
      fetchNutrition,
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
