(function exposeRecipeSheetModule() {
  function createRecipeSheetModule(deps) {
    const {
      closeModal,
      confirmAction,
      db: DB,
      formatCurrency: fmtBRL,
      formatQuantity: fmtQty,
      getNutrition,
      getPhysicalStock,
      getRecipes,
      getStock,
      pricePerUnit,
      readRecipeImage,
      resolveRecipeImageUrl,
      setPhysicalStock,
      setRecipes,
      setStock,
      showPage,
      showToast,
      storageKeys: STORAGE_KEYS,
      writeRecipeImage,
      clearRecipeImage: clearRecipeImageView,
    } = deps;

    const measures = window.FichaTecMeasurements;
    let currentIngredients = [];
    let pendingIngredients = [];
    let journeyRevision = 0;
    let needsReprepare = false;
    let ingredientSequence = 0;
    let selectedIngredient = null;
    let currentRecipeId = null;
    let editingRecipeId = null;
    let activeIngFilter = null;
    let categoryFilter = null;
    let draftScope;

    function personalKey(feature) {
      if (DB.mode?.() !== 'supabase') return 'fichatec.local.' + feature;
      const user = window.getAuthState?.().user?.id;
      const org = DB.activeOrganizationId?.();
      return user && org ? 'fichatec.' + user + '.' + org + '.' + feature : null;
    }
    function restoreSupplies() {
      const key = personalKey('temporarySupplies');
      if (key === draftScope) return;
      currentIngredients = [];
      pendingIngredients = [];
      needsReprepare=false;
      journeyRevision++;
      editingRecipeId = null;
      currentRecipeId = null;
      draftScope = key;
      try {
        const saved = key ? JSON.parse(localStorage.getItem(key) || '[]') : [];
        if (Array.isArray(saved)) {
          const supplies = saved.filter(item => item &&
            ['virtual', 'fisico'].includes(item.source) && typeof item.name === 'string' &&
            Number.isFinite(item.qtyG) && item.qtyG > 0).map(item=>measures.normalizeIngredient(item,findStockItem(item.stockId,item.name)));
          currentIngredients = supplies.filter(item => !item.preparationPending);
          pendingIngredients = supplies.filter(item => item.preparationPending)
            .map(({preparationPending, ...item}) => item);
        }
      } catch {
        showToast('Não foi possível recuperar o registro temporário de insumos.');
      }
      renderIngredients();
      calcFicha();
    }
    function rememberSupplies() {
      const key = personalKey('temporarySupplies');
      if (!key || editingRecipeId !== null) return;
      try {
        const supplies = [...currentIngredients, ...pendingIngredients.map(item => ({...item,preparationPending:true}))]
          .filter(item => ['virtual', 'fisico'].includes(item.source));
        localStorage.setItem(key, JSON.stringify(supplies));
      } catch {
        showToast('Não foi possível guardar o registro temporário de insumos neste navegador.');
      }
    }
    function bindRecipeStyles() {
      const key=personalKey('recipeStyle');
      let style='card';
      try {if(key)style=JSON.parse(localStorage.getItem(key))==='menu'?'menu':'card';}catch{}
      function apply(value) {
        document.body.dataset.visualStyle=value;
        document.getElementById('recipes-list').classList.toggle('recipe-menu-view',value==='menu');
        document.getElementById('modal-recipe').classList.toggle('recipe-menu-theme',value==='menu');
        for(const option of ['card','menu'])document.getElementById('recipe-style-'+option).setAttribute('aria-pressed',String(option===value));
      }
      apply(style);
      for(const value of ['card','menu'])document.getElementById('recipe-style-'+value).onclick=()=>{
        apply(value);
        try{if(key)localStorage.setItem(key,JSON.stringify(value));}catch{showToast('Não foi possível salvar o estilo neste navegador.');}
      };
      const layoutKey = personalKey('recipeLayout');
      let layout = 'grid';
      try { if (layoutKey) layout = JSON.parse(localStorage.getItem(layoutKey)) === 'list' ? 'list' : 'grid'; } catch {}
      function applyLayout(value) {
        document.getElementById('recipes-list').classList.toggle('recipe-list-view', value === 'list');
        for (const option of ['list', 'grid']) {
          document.getElementById('recipe-layout-' + option).setAttribute('aria-pressed', String(option === value));
        }
      }
      applyLayout(layout);
      for (const value of ['list', 'grid']) document.getElementById('recipe-layout-' + value).onclick = () => {
        applyLayout(value);
        try { if (layoutKey) localStorage.setItem(layoutKey, JSON.stringify(value)); }
        catch { showToast('Não foi possível salvar a exibição neste navegador.'); }
      };
    }
    function ingredientCategory(item) {
      return item.category || findStockItem(item.stockRemoteId||item.stockId,item.name)?.category || '';
    }
    let ingSource = 'virtual';
    let stock = getStock();
    let physicalStock = getPhysicalStock();
    let recipes = getRecipes();
    let currentRecipeImage = null;
    let recipeImageDirty = false;
    let recipeImageOperationId = 0;
    let recipeImageProcessing = false;
    let recipeSaveInFlight = false;
    let yieldDriver = 'count';

    const recipeImageElementIds = {
      input: "recipe-image-input",
      preview: "recipe-image-preview",
      remove: "recipe-image-remove",
    };
    const recipePlaceholderIcons = [
      "restaurant",
      "skillet",
      "bakery_dining",
      "ramen_dining",
      "lunch_dining",
      "local_pizza",
      "soup_kitchen",
      "set_meal",
    ];
    const recipePlaceholderPalettes = [
      {background:"#FFF1ED", foreground:"#B83B21"},
      {background:"#FFF4D9", foreground:"#8A5700"},
      {background:"#EAF7EF", foreground:"#246B45"},
      {background:"#EAF2FF", foreground:"#315FA8"},
      {background:"#F3ECFF", foreground:"#7047A5"},
      {background:"#FFF0F4", foreground:"#A43D60"},
    ];

    function syncState() {
      stock = getStock();
      physicalStock = getPhysicalStock();
      recipes = getRecipes();
    }

    function commitState() {
      setStock(stock);
      setPhysicalStock(physicalStock);
      setRecipes(recipes);
    }

    async function persistRecipesSnapshot(nextRecipes) {
      const previousRecipes = recipes;
      const persistLocal = (value) => {
        if (DB.saveLocal) DB.saveLocal(STORAGE_KEYS.recipes, value);
        else DB.save(STORAGE_KEYS.recipes, value);
      };

      try {
        recipes = nextRecipes;
        setRecipes(recipes);
        persistLocal(recipes);

        const organizationId = DB.activeOrganizationId?.();
        if (DB.mode?.() === "supabase" && !organizationId) {
          throw new Error("Workspace Supabase ativo nao encontrado.");
        }
        if (DB.mode?.() === "supabase" && DB.saveRemote && organizationId) {
          const savedRecipes = await DB.saveRemote(STORAGE_KEYS.recipes, recipes, organizationId);
          if (Array.isArray(savedRecipes)) {
            recipes = savedRecipes;
            setRecipes(recipes);
            persistLocal(recipes);
          }
        }

        return recipes;
      } catch (error) {
        recipes = previousRecipes;
        setRecipes(recipes);
        persistLocal(recipes);
        console.error("Recipe persistence failed", error);
        throw error;
      }
    }

    function focusRecipeCard(recipeId) {
      window.requestAnimationFrame(() => {
        const card = [...document.querySelectorAll("#recipes-list .recipe-card")]
          .find((element) => String(element.dataset.recipeId) === String(recipeId));
        if (!card) return;

        card.classList.add("recipe-card-focus");
        card.scrollIntoView({behavior:"smooth", block:"center"});
        window.setTimeout(() => card.classList.remove("recipe-card-focus"), 1800);
      });
    }

    function escapeAttribute(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    function escapeHtml(value) {
      return escapeAttribute(value);
    }

    function sanitizeRecipeImageSource(value) {
      const source = String(value || "").trim();
      if (!source) return "";
      if (/^data:image\/(?:jpeg|jpg|png|webp);base64,[a-z0-9+/=\s]+$/i.test(source)) return source;

      try {
        const url = new URL(source, window.location.href);
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
      } catch (error) {
        return "";
      }
    }

    function normalizeRecipeImage(image, file = null) {
      if (image === null || image?.removed === true) return null;
      const source = typeof image === "string"
        ? image
        : image?.src || image?.url || image?.dataUrl || "";
      const src = sanitizeRecipeImageSource(source);
      const path = typeof image?.path === "string" ? image.path.trim() : "";
      if (!src && !path) return null;

      return {
        ...(path ? {path} : {}),
        ...(src ? {src} : {}),
        name: String(image?.name || file?.name || "cover.jpg").slice(0, 180),
        type: String(image?.type || file?.type || "image/jpeg").slice(0, 80),
        size: Math.max(0, readNumericValue(image?.size ?? file?.size, 0)),
        ...(readNumericValue(image?.width, 0) > 0 ? {width:readNumericValue(image.width)} : {}),
        ...(readNumericValue(image?.height, 0) > 0 ? {height:readNumericValue(image.height)} : {}),
        updatedAt: image?.updatedAt || new Date().toISOString(),
      };
    }

    function getRecipeImageElements() {
      return {
        input: document.getElementById(recipeImageElementIds.input),
        preview: document.getElementById(recipeImageElementIds.preview),
        remove: document.getElementById(recipeImageElementIds.remove),
      };
    }

    function resolveImageSource(image, recipe = null) {
      let source = image?.src || "";
      if (typeof resolveRecipeImageUrl === "function") {
        try {
          const resolved = resolveRecipeImageUrl(image, recipe);
          if (typeof resolved === "string") source = resolved;
        } catch (error) {
          console.warn("Nao foi possivel resolver a imagem da receita.", error);
        }
      }
      return sanitizeRecipeImageSource(source);
    }

    function hashRecipeIdentity(recipe) {
      const identity = String(recipe?.remoteId || recipe?.id || recipe?.nome || "receita").trim().toLocaleLowerCase("pt-BR");
      let hash = 0;
      for (let index = 0; index < identity.length; index += 1) {
        hash = ((hash << 5) - hash + identity.charCodeAt(index)) | 0;
      }
      return Math.abs(hash);
    }

    function getRecipePlaceholder(recipe) {
      const hash = hashRecipeIdentity(recipe);
      return {
        icon: recipePlaceholderIcons[hash % recipePlaceholderIcons.length],
        ...recipePlaceholderPalettes[hash % recipePlaceholderPalettes.length],
      };
    }

    function renderRecipeMedia(recipe, variant = "card") {
      const image = normalizeRecipeImage(recipe?.image);
      const source = resolveImageSource(image, recipe);
      const placeholder = getRecipePlaceholder(recipe);
      const isModal = variant === "modal";
      const height = isModal ? "210px" : "148px";
      const radius = isModal ? "var(--r-lg, 18px)" : "var(--r-md, 14px)";
      const label = `Imagem da receita ${recipe?.nome || "sem nome"}`;
      const imageMarkup = source ? `<img class="recipe-cover-image" src="${escapeAttribute(source)}" alt="${escapeAttribute(label)}" width="640" height="360" loading="${isModal ? "eager" : "lazy"}" decoding="async" onerror="this.hidden=true" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">` : "";

      return `<div class="recipe-cover recipe-cover--${escapeAttribute(variant)}" style="position:relative;display:grid;place-items:center;overflow:hidden;width:100%;height:${height};margin-bottom:var(--s3, 12px);border-radius:${radius};background:${placeholder.background};color:${placeholder.foreground}" role="img" aria-label="${escapeAttribute(label)}">
        <span class="material-symbols-rounded recipe-cover-placeholder-icon" aria-hidden="true" style="font-size:${isModal ? "64px" : "48px"};font-variation-settings:'FILL' 1">${placeholder.icon}</span>
        ${imageMarkup}
      </div>`;
    }

    function renderRecipeImageEditor() {
      const {preview, remove} = getRecipeImageElements();
      const source = resolveImageSource(currentRecipeImage);

      if (preview) {
        let imageElement = preview.matches?.("img")
          ? preview
          : preview.querySelector?.("img[data-recipe-image-generated], img");
        if (!imageElement && !preview.matches?.("img")) {
          imageElement = document.createElement("img");
          imageElement.dataset.recipeImageGenerated = "true";
          imageElement.alt = "Prévia da imagem da receita";
          preview.appendChild(imageElement);
        }
        if (imageElement) {
          imageElement.onload = () => preview.classList.toggle("has-image", Boolean(imageElement.src));
          imageElement.onerror = () => {
            imageElement.hidden = true;
            preview.classList.remove("has-image");
            const message = document.getElementById("recipe-image-message");
            if (message) message.textContent = "A imagem nao pode ser carregada. Substitua-a para atualizar a receita.";
          };
          if (source) {
            imageElement.src = source;
            imageElement.hidden = false;
          } else {
            imageElement.removeAttribute("src");
            imageElement.hidden = true;
          }
        }
        preview.classList.toggle("has-image", Boolean(source));
      }
      if (remove) {
        remove.hidden = !currentRecipeImage;
        remove.disabled = !currentRecipeImage;
      }

      const imageSnapshot = currentRecipeImage ? {...currentRecipeImage} : null;
      try {
        const result = currentRecipeImage
          ? writeRecipeImage?.(imageSnapshot)
          : clearRecipeImageView?.();
        if (result && typeof result.catch === "function") {
          result.catch((error) => console.warn("Nao foi possivel atualizar a pre-visualizacao da receita.", error));
        }
      } catch (error) {
        console.warn("Nao foi possivel atualizar a pre-visualizacao da receita.", error);
      }
    }

    function setRecipeImageProcessing(isProcessing) {
      recipeImageProcessing = Boolean(isProcessing);
      const {input, preview, remove} = getRecipeImageElements();
      const picker = preview?.closest(".recipe-cover-picker");
      const selectButton = document.getElementById("recipe-image-select");
      const saveButton = document.getElementById("recipe-save-button");
      const message = document.getElementById("recipe-image-message");
      picker?.setAttribute("aria-busy", String(Boolean(isProcessing)));
      if (input) input.disabled = Boolean(isProcessing);
      if (selectButton) selectButton.disabled = Boolean(isProcessing);
      if (saveButton) saveButton.disabled = recipeSaveInFlight || Boolean(isProcessing);
      if (remove) remove.disabled = Boolean(isProcessing) || !currentRecipeImage;
      if (isProcessing && message) message.textContent = "Otimizando imagem...";
    }

    function setRecipeSaveBusy(isBusy) {
      recipeSaveInFlight = Boolean(isBusy);
      const page = document.getElementById("page-ficha");
      const shell = document.getElementById("app-shell");
      const saveButton = document.getElementById("recipe-save-button");
      if (page) {
        page.setAttribute("aria-busy", String(recipeSaveInFlight));
      }
      if (shell) {
        shell.setAttribute("aria-busy", String(recipeSaveInFlight));
        if ("inert" in shell) {
          shell.inert = recipeSaveInFlight || shell.hidden || shell.getAttribute("aria-hidden") === "true";
        }
      }
      if (saveButton) {
        saveButton.disabled = recipeSaveInFlight || recipeImageProcessing;
        saveButton.setAttribute("aria-busy", String(recipeSaveInFlight));
      }
    }

    function setCurrentRecipeImage(image, options = {}) {
      currentRecipeImage = normalizeRecipeImage(image, options.file);
      recipeImageDirty = options.dirty !== false;
      if (options.render !== false) renderRecipeImageEditor();
      return currentRecipeImage;
    }

    function readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error("Nao foi possivel ler a imagem."));
        reader.readAsDataURL(file);
      });
    }

    async function handleRecipeImageInput(event) {
      if (recipeSaveInFlight) return currentRecipeImage;
      const {input, preview} = getRecipeImageElements();
      const sourceInput = event?.target || input;
      const file = sourceInput?.files?.[0];
      if (!file) return currentRecipeImage;
      const operationId = ++recipeImageOperationId;
      if (!/^image\/(?:jpeg|png|webp)$/i.test(file.type || "")) {
        if (sourceInput) sourceInput.value = "";
        showToast("Escolha uma imagem JPG, PNG ou WebP.");
        return currentRecipeImage;
      }

      setRecipeImageProcessing(true);
      try {
        let suppliedImage;
        if (typeof readRecipeImage === "function") {
          suppliedImage = await readRecipeImage({
            file,
            input: sourceInput,
            preview,
            currentImage: currentRecipeImage ? {...currentRecipeImage} : null,
            recipeId: editingRecipeId,
            reason: "selection",
          });
        }
        if (suppliedImage === undefined) {
          if (file.size > 2.5 * 1024 * 1024) {
            throw new Error("Comprima a imagem para menos de 2,5 MB antes de salvar.");
          }
          suppliedImage = {src:await readFileAsDataUrl(file)};
        }
        if (operationId !== recipeImageOperationId) return currentRecipeImage;
        if (suppliedImage === null) return removeRecipeImage();

        const normalized = setCurrentRecipeImage(suppliedImage, {file});
        if (!normalized) throw new Error("A imagem selecionada nao pode ser usada.");
        return normalized;
      } catch (error) {
        if (operationId !== recipeImageOperationId) return currentRecipeImage;
        console.error("Recipe image processing failed", error);
        if (sourceInput) sourceInput.value = "";
        const errorMessage = error?.message || "Nao foi possivel preparar a imagem da receita.";
        const message = document.getElementById("recipe-image-message");
        if (message) message.textContent = errorMessage;
        showToast(errorMessage);
        return currentRecipeImage;
      } finally {
        if (operationId === recipeImageOperationId) setRecipeImageProcessing(false);
      }
    }

    function removeRecipeImage() {
      if (recipeSaveInFlight) return currentRecipeImage;
      recipeImageOperationId += 1;
      const {input} = getRecipeImageElements();
      if (input) input.value = "";
      setCurrentRecipeImage(null);
      setRecipeImageProcessing(false);
      return null;
    }

    async function resolveRecipeImageForSave(existingRecipe = null) {
      const {input, preview} = getRecipeImageElements();
      if (input?.files?.[0] && !recipeImageDirty) {
        await handleRecipeImageInput({target:input});
      } else if (!recipeImageDirty && typeof readRecipeImage === "function") {
        const suppliedImage = await readRecipeImage({
          file: input?.files?.[0] || null,
          input,
          preview,
          currentImage: currentRecipeImage ? {...currentRecipeImage} : null,
          recipeId: editingRecipeId,
          reason: "save",
        });
        if (suppliedImage !== undefined) setCurrentRecipeImage(suppliedImage, {file:input?.files?.[0] || null});
      }

      if (!recipeImageDirty && !currentRecipeImage && existingRecipe?.image) {
        currentRecipeImage = normalizeRecipeImage(existingRecipe.image);
      }
      return currentRecipeImage ? {...currentRecipeImage} : null;
    }

    function bindRecipeImageEditor() {
      const {input, remove} = getRecipeImageElements();
      if (input && input.dataset.recipeImageBound !== "true") {
        input.addEventListener("change", handleRecipeImageInput);
        input.dataset.recipeImageBound = "true";
      }
      if (remove && remove.dataset.recipeImageBound !== "true") {
        remove.addEventListener("click", removeRecipeImage);
        remove.dataset.recipeImageBound = "true";
      }
    }

    function bindRecipeCardActions(listElement) {
      listElement.onclick = async (event) => {
        const card = event.target.closest(".recipe-card");
        if (!card || !listElement.contains(card)) return;

        const id = card.dataset.recipeId;
        const actionElement = event.target.closest("[data-recipe-action]");
        const action = actionElement?.dataset.recipeAction;
        if(!action)return;
        if (action === 'stock') {
          deps.openRecipeStockBatch(recipes.find(recipe => String(recipe.id) === String(id)));
          return;
        }
        if (action === "ingredients") {
          const panel=card.querySelector('[data-card-ingredients]');
          panel.hidden=!panel.hidden;
          actionElement.setAttribute('aria-expanded',String(!panel.hidden));
          actionElement.querySelector('[data-ingredients-label]').textContent=panel.hidden?'Ver ingredientes':'Ocultar ingredientes';
          return;
        }
        if (action === "preparation") {
          const panel=card.querySelector('[data-card-preparation]');
          panel.hidden=!panel.hidden;
          actionElement.setAttribute('aria-expanded',String(!panel.hidden));
          return;
        }
        if(event.target.closest('[data-card-ingredients], [data-card-preparation]'))return;
        if (action === "edit") {
          editRecipe(id);
          return;
        }
        if (action === "delete") {
          await deleteRecipe(id);
          return;
        }
        if (action === "pdf") {
          exportRecipePDF(id);
          return;
        }
        if(action!=='plan')return;
        viewRecipe(id);
        if(action==='plan')requestAnimationFrame(()=>{
          const heading=document.getElementById('production-planner-title');
          if(!heading)return;
          heading.setAttribute('tabindex','-1');
          heading.focus({preventScroll:true});
          heading.scrollIntoView({block:'start',behavior:'instant'});
        });
      };
      listElement.onkeydown = null;
    }

    function bindRecipeFilterActions() {
      const panel = document.getElementById('recipe-filter-panel');
      const trigger = document.getElementById('recipe-filter-trigger');
      trigger.onclick = () => window.FichaTecCategoryPanels.toggle(panel.id);
      panel.onclick = (event) => {
        const category=event.target.closest('[data-category-filter]');
        if(category){categoryFilter=categoryFilter===category.dataset.categoryFilter?null:category.dataset.categoryFilter;renderRecipes();return;}
        const option = event.target.closest('[data-ingredient-filter]');
        if (!option || !panel.contains(option)) return;
        const value=option.dataset.ingredientFilter;
        if(!value)categoryFilter=null;
        setIngFilter(value===activeIngFilter?null:value||null);
      };
    }

    function normalizeRecipeYieldUnit(value) {
      return String(value || "").toLowerCase() === "unit" ? "unit" : "portion";
    }

    function formatRecipeYield(quantity, yieldUnit) {
      const normalizedQuantity = Math.max(readNumericValue(quantity, 1), 0);
      const formattedQuantity = formatBatchNumber(normalizedQuantity);
      const normalizedUnit = normalizeRecipeYieldUnit(yieldUnit);
      const label = normalizedUnit === "unit"
        ? (normalizedQuantity === 1 ? "unidade" : "unidades")
        : (normalizedQuantity === 1 ? "porção" : "porções");
      return `${formattedQuantity} ${label}`;
    }

    function formatProductionIngredientQuantity(ingredient, factor = 1) {
      const baseQuantity = readNumericValue(ingredient?.qtyBruta ?? ingredient?.qtyG, 0);
      const suffix = ingredient?.unit === "un" ? " un" : ingredient?.unit === "ml" ? " ml" : " g";
      return (baseQuantity * factor).toLocaleString('pt-BR', {maximumFractionDigits: 3}) + suffix;
    }

    function updateRecipeProductionGuide(recipe) {
      const byId = id => document.getElementById(id);
      const countInput = byId('recipe-production-quantity');
      const unit = byId('production-unit').value;
      const piece = unit === 'unit' ? 'unidade' : 'porção';
      countInput.step = unit === 'unit' ? '1' : 'any';
      countInput.min = unit === 'unit' ? '1' : '0';
      byId('production-count-label').textContent = unit === 'unit' ? 'Quantas unidades?' : 'Quantas porções?';
      byId('production-weight-label').textContent = 'Peso por ' + piece + ' (g)';
      byId('production-piece-label').textContent = 'Venda por ' + piece;
      const plan = window.FichaTecProduction.calculatePlan(recipe, {
        count: countInput.value, weight: byId('production-weight').value,
        markup: byId('production-markup').value, unit
      }, getIngredientUnitPrice);
      const valid = !plan.error;
      const number = value => Number(value).toLocaleString('pt-BR', {maximumFractionDigits: 2});
      const grams = value => value == null ? 'Não informado' : number(value) + ' g';
      const amounts = valid ? {
        cost: fmtBRL(plan.totalCost), sale: fmtBRL(plan.venda), piece: fmtBRL(plan.salePerPiece),
        markup: number(plan.markup) + '%', raw: grams(plan.rawWeight), ready: grams(plan.finalWeight),
        beforeLoss: fmtBRL(plan.saleBeforeLoss), premium: plan.lossPercent === null ? 'Sem pesagem completa' : fmtBRL(plan.lossPremium),
        profit: fmtBRL(plan.grossProfit), pieceProfit: fmtBRL(plan.grossProfit / plan.count)
      } : {};
      const content = byId('recipe-detail-content');
      content.querySelectorAll('[data-plan-value]').forEach(node => {
        node.textContent = amounts[node.dataset.planValue] ?? '—';
      });
      const yieldText = valid ? formatRecipeYield(plan.count, plan.unit) : '';
      byId('production-status').textContent = valid
        ? yieldText + (plan.finalWeight === null ? ' no lote.' : ' de ' + grams(plan.finalWeight / plan.count) + ' cada.')
        : plan.error;
      byId('recipe-detail-ingredients').textContent = valid ? 'Ingredientes para ' + yieldText : 'Ingredientes do lote';
      byId('production-loss-label').textContent = valid && plan.loss < 0 ? 'Ganho de peso' : 'Perda de peso';
      let lossText = '—';
      if (valid && plan.loss !== null) {
        lossText = grams(Math.abs(plan.loss));
        if (plan.lossPercent !== null) lossText += ' (' + number(Math.abs(plan.lossPercent)) + '%)';
      }
      byId('production-loss').textContent = lossText;
      byId('production-weight-help').textContent = valid && plan.rawWeight === null
        ? 'Para calcular a perda em gramas, é preciso conhecer o peso de todos os ingredientes.' : '';
      byId('production-rounding').hidden = !valid || Math.abs(Math.round(plan.salePerPiece * 100) * plan.count - plan.venda * 100) < 0.5;
      content.querySelectorAll('[data-production-ingredient]').forEach(node => {
        const index = Number(node.dataset.productionIngredient);
        node.textContent = valid ? formatProductionIngredientQuantity(plan.ingredients[index], plan.factor) : '—';
        const cost = node.closest('.ingredient-row')?.querySelector('.ing-cost');
        if (cost) cost.textContent = valid ? fmtBRL(plan.ingredients[index].cost) : '—';
      });
      return valid;
    }

    function bindProductionPlanner(recipe) {
      const form = document.getElementById('production-form');
      const report = document.getElementById('production-report');
      const shortcut = document.getElementById('recipe-ingredients-shortcut');
      const refresh = () => updateRecipeProductionGuide(recipe);
      function revealProduction(event) {
        event.preventDefault();
        if (!form.reportValidity()) return;
        if (!refresh()) {
          document.getElementById('production-status').focus();
          return;
        }
        report.hidden = false;
        shortcut.setAttribute('aria-expanded', 'true');
        const headingId = 'recipe-detail-ingredients';
        const heading = document.getElementById(headingId);
        const keyboardWasOpen=document.body.classList.contains('mobile-keyboard-open');
        heading.focus({preventScroll: true});
        const scrollToIngredients=()=>{
          if(!document.getElementById('modal-recipe').classList.contains('open'))return;
          const content=document.getElementById('recipe-detail-content');
          const box=content.querySelector('.production-ingredients');
          if(!box)return;
          content.scrollTo({
            top:content.scrollTop+box.getBoundingClientRect().top-content.getBoundingClientRect().top-12,
            behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'
          });
        };
        // Scroll only the modal, after the mobile keyboard has finished closing.
        if(keyboardWasOpen)setTimeout(()=>requestAnimationFrame(scrollToIngredients),350);
        else requestAnimationFrame(scrollToIngredients);
      }
      form.oninput = refresh;
      form.onchange = refresh;
      form.onsubmit = revealProduction;
      shortcut.onclick = revealProduction;
      refresh();
    }

    const nutritionFields = [
      ["kcal", "Valor energético", "kcal", 2500],
      ["carb", "Carboidratos", "g", 375],
      ["prot", "Proteínas", "g", 75],
      ["fat", "Gorduras Totais", "g", 83],
      ["satFat", "Gordura Saturada", "g", 20],
      ["transFat", "Gordura Trans", "g", null],
      ["fiber", "Fibra Alimentar", "g", 25],
      ["sodium", "Sódio", "mg", 2400],
    ];

    function readNumericValue(value, fallback = 0) {
      const number = Number(value);
      return Number.isFinite(number) ? number : fallback;
    }

    function hasNutritionData(nutrition) {
      if (!nutrition || typeof nutrition !== "object") return false;
      return nutritionFields.some(([key]) => Number.isFinite(Number(nutrition[key])));
    }

    function getIngredientNutrition(ingredient) {
      const fallback = getNutrition(ingredient.name) || {};
      const source = hasNutritionData(ingredient.nutrition) ? ingredient.nutrition : {};
      return nutritionFields.reduce((result, [key]) => {
        result[key] = readNumericValue(source[key], readNumericValue(fallback[key], 0));
        return result;
      }, {});
    }

    function scaleNutritionByAmount(nutrition, grams) {
      const factor = readNumericValue(grams, 0) / 100;
      return nutritionFields.reduce((result, [key]) => {
        result[key] = readNumericValue(nutrition[key], 0) * factor;
        return result;
      }, {});
    }

    function calculateRecipeNutritionTotals(ingredients) {
      const totals = nutritionFields.reduce((result, [key]) => {
        result[key] = 0;
        return result;
      }, {});

      ingredients.forEach((ingredient) => {
        const nutrition = getIngredientNutrition(ingredient);
        const scaled = scaleNutritionByAmount(nutrition, ingredient.qtyG || ingredient.qtyBruta || 0);
        nutritionFields.forEach(([key]) => {
          totals[key] += scaled[key];
        });
      });

      return totals;
    }

    function getRecipeYieldG() {
      return readNumericValue(document.getElementById("ficha-rendimento")?.value, 0);
    }

    function calculateRecipeNutritionPortion(ingredients, portionSize = 100, recipeYieldG = getRecipeYieldG()) {
      const totals = calculateRecipeNutritionTotals(ingredients);
      const yieldG = readNumericValue(recipeYieldG, 0);
      const ingredientWeightG = ingredients.reduce((sum, ingredient) => {
        return sum + readNumericValue(ingredient.qtyG || ingredient.qtyBruta, 0);
      }, 0);
      const portion = readNumericValue(portionSize, 100);
      const baseWeightG = yieldG > 0 ? yieldG : ingredientWeightG;
      const factor = baseWeightG > 0 ? portion / baseWeightG : 1;

      return nutritionFields.reduce((result, [key]) => {
        result[key] = totals[key] * factor;
        return result;
      }, {});
    }

    function formatNutritionValue(value, unit) {
      const numericValue = readNumericValue(value, 0);
      const digits = Math.abs(numericValue) >= 10 || unit === "mg" || unit === "kcal" ? 0 : 1;
      return `${numericValue.toLocaleString("pt-BR", {maximumFractionDigits: digits})} ${unit}`;
    }

    function renderNutritionRows(portionNutrition) {
      return nutritionFields.map(([key, label, unit, dailyValue]) => {
        const value = readNumericValue(portionNutrition[key], 0);
        const pct = dailyValue ? value / dailyValue : null;
        return `<tr>
          <td>${label}</td><td class="val">${formatNutritionValue(value, unit)}</td>
          <td style="text-align:right;min-width:88px">
            <div class="nut-pct">${pct === null ? "-" : `${Math.round(pct * 100)}%`}</div>
            ${pct === null ? "" : `<div class="progress-bar" style="width:76px;margin-left:auto"><div class="progress-fill" style="width:${Math.min(pct * 100,100).toFixed(1)}%"></div></div>`}
          </td>
        </tr>`;
      }).join("");
    }

    function getRecipeNutritionSummary(recipe) {
      const portion = readNumericValue(recipe.porcaoSize, 100);
      const nutrition = calculateRecipeNutritionPortion(recipe.ingredients || [], portion, recipe.rendimento || 0);
      return {
        portion,
        nutrition,
        label: `${formatNutritionValue(nutrition.kcal, "kcal")} - ${formatNutritionValue(nutrition.prot, "g")} prot / ${portion}g`,
      };
    }

    function findStockItem(stockId,name){
      if(stockId&&!String(stockId).startsWith('pf_')){const s=stock.find(x=>x.remoteId===stockId||String(x.id)===String(stockId));if(s)return s;}
      return stock.find(x=>x.name.toLowerCase()===name.toLowerCase())||null;
    }
    function conversionFor(sourceUnit, unit) {
      const base = measures.baseUnit;
      const a = base(sourceUnit), b = base(unit);
      if (a === b) return null;
      const denominator = [a,b].includes('un') ? 'un' : 'ml';
      const numerator = a === denominator ? b : a;
      return {key:numerator+'/'+denominator, divide:a===denominator,
        label:(numerator==='g'?'Peso (g)':'Volume (ml)')+' de '+(denominator==='un'?'uma unidade':'1 ml')};
    }
    function knownEquivalence(item, source, conversion) {
      const saved = item.nutrition?.recipeEquivalence;
      if (saved?.key === conversion.key && saved.value > 0) return saved.value;
      const product = source?.nutrition?.recipeEquivalence;
      if (product?.key === conversion.key && product.value > 0) return product.value;
      const pack = source?.nutrition?.priceReference;
      if (source?.unit === 'un' && pack && conversionFor('un',pack.unit)?.key === conversion.key)
        return measures.toBase(pack.quantity,pack.unit);
      const measured=measures.countMeasure(source);
      if(measured && conversion.key===measured.unit+'/un')return measured.quantity;
      return 0;
    }
    function getIngredientUnitPrice(item) {
      if (item.source === 'manual') return 0;
      const source = findStockItem(item.stockRemoteId || item.stockId, item.name);
      if (source && Number(source.qty) > 0) {
        const conversion = conversionFor(source.unit,item.unit || 'g');
        if (!conversion) return pricePerUnit(source);
        const value = knownEquivalence(item,source,conversion);
        if (value > 0) return conversion.divide ? pricePerUnit(source)/value : pricePerUnit(source)*value;
      }
      const quantity = window.FichaTecProduction.grossQuantity(item);
      const savedRate = readNumericValue(item.savedPricePerG);
      const savedCost = readNumericValue(item.cost);
      // Older snapshots rounded the rate to whole cents per gram.
      if (quantity > 0 && savedCost > 0 && Math.round(savedRate * quantity * 100) !== Math.round(savedCost * 100)) {
        return savedCost / quantity;
      }
      return savedRate;
    }

    function calcCosts(ingredients, markup = 0, readyWeight = 0) {
      return window.FichaTecProduction.priceRecipe(ingredients, markup, getIngredientUnitPrice, 1, readyWeight);
    }
    /* ══ FICHA ══ */
    function setIngSource(src){
      if(!['manual','virtual','fisico'].includes(src))return;
      ingSource=src;
      const manual=src==='manual';
      document.getElementById('recipe-note-mode').setAttribute('aria-pressed',String(manual));
      document.getElementById('src-btn-manual').classList.toggle('active',manual);
      document.getElementById('ing-search').placeholder=manual?'Ex.: Farinha de trigo':'Buscar ingrediente...';
      document.getElementById('ing-source-help').textContent=manual?'Digite o nome. Você poderá cadastrar este produto no estoque depois.':'Pesquise pelo nome e selecione um produto cadastrado.';
      document.getElementById('src-btn-virtual').classList.toggle('active',src==='virtual');
      document.getElementById('src-btn-fisico').classList.toggle('active',src==='fisico');
      document.getElementById('ing-search').value='';
      document.getElementById('ing-dropdown').classList.remove('open');
      document.getElementById('ing-selected-info').style.display='none';
      document.getElementById('ing-cost-preview').style.display='none';
      selectedIngredient=null;
      draftMeasurement();
      deps.renderIngredientCategories?.('');
      deps.onJourneyChange?.();
    }
    function searchIngredient(){
      if(selectedIngredient && document.getElementById('ing-search').value !== selectedIngredient.name){
        selectedIngredient=null;
        document.getElementById('ing-selected-info').style.display='none';
        document.getElementById('ing-cost-preview').style.display='none';
      }
      const q=document.getElementById('ing-search').value.toLowerCase().trim();
      const dd=document.getElementById('ing-dropdown');
      if(ingSource==='manual'||!q){dd.classList.remove('open');return;}
      const matches=ingSource==='fisico'
        ?physicalStock.filter(p=>p.name.toLowerCase().includes(q)&&p.currentQty>0).slice(0,8).map(physicalIngredientProduct)
        :stock.filter(s=>s.name.toLowerCase().includes(q)).slice(0,8);
      if(!matches.length){dd.innerHTML=`<div class="autocomplete-item" style="color:var(--n400)">Nenhum ingrediente encontrado</div>`;}
      else{
        dd.innerHTML=matches.map(s=>{
          const ppg=pricePerUnit(s);
          const sub=s.unit==='ml'?fmtBRL(ppg*1000)+'/L':s.unit==='un'?'Peso ou volume pendente':fmtBRL(ppg*1000)+'/kg';
          return`<button type="button" class="autocomplete-item" onclick="selectIngredient('${s.id}')">
            <div>${escapeHtml(s.name)}${ingSource==='fisico'?` <span style="font-size:11px;color:var(--g500);font-weight:700">${fmtQty(s.availableQty,s.unit)} disp.</span>`:''}</div>
            <div class="sub">${s.unit==='un'?'Embalagem':fmtQty(s.qty,s.unit)} · ${fmtBRL(s.price)} · ${sub}</div>
          </button>`;
        }).join('');
      }
      dd.classList.add('open');
    }
    function selectIngredient(id){
      if(ingSource==='fisico'&&String(id).startsWith('pf_')){
        const rawId=String(id).replace('pf_','');
        const numericId=Number(rawId);
        const pid=Number.isFinite(numericId)&&String(numericId)===rawId?numericId:rawId;
        const p=physicalStock.find(x=>x.id===pid);if(!p)return;
        selectedIngredient=physicalIngredientProduct(p);
      }else{selectedIngredient=stock.find(s=>s.id===parseInt(id)||s.id===id);}
      if(!selectedIngredient)return;
      document.getElementById('ing-unit').value = measures.isMetric(selectedIngredient.unit) ? measures.baseUnit(selectedIngredient.unit) : measures.countMeasure(selectedIngredient)?.unit || 'g';
      document.getElementById('ing-equivalence').value='';
      document.getElementById('ing-equivalence').dataset.key='';
      document.getElementById('ing-search').value=selectedIngredient.name;
      document.getElementById('ing-dropdown').classList.remove('open');
      const ppg=pricePerUnit(selectedIngredient),u=selectedIngredient.unit;
      document.getElementById('ing-sel-name').textContent=selectedIngredient.name;
      document.getElementById('ing-sel-price').textContent=u==='ml'?`${fmtBRL(ppg*1000)}/L · ${fmtBRL(ppg*100)}/100ml`:u==='un'?`${fmtBRL(ppg)} por embalagem · informe o conteúdo abaixo`:`${fmtBRL(ppg*1000)}/kg · ${fmtBRL(ppg*100)}/100g`;
      document.getElementById('ing-selected-info').style.display='block';
      deps.renderIngredientCategories?.(selectedIngredient.category || deps.inferIngredientCategory?.(selectedIngredient.name) || '');
      calcIngCost();
    }
    function draftMeasurement() {
      const conversion=selectedIngredient && conversionFor(selectedIngredient.unit,document.getElementById('ing-unit').value);
      const field=document.getElementById('ing-equivalence');
      const group=document.getElementById('ing-equivalence-group');
      if(!conversion){group.hidden=true;field.disabled=true;field.required=false;return {conversion:null,value:0};}
      const known=knownEquivalence(selectedIngredient,selectedIngredient,conversion);
      if(field.dataset.key!==conversion.key){field.value=known||'';field.dataset.key=conversion.key;}
      group.hidden=Boolean(known);
      field.disabled=Boolean(known);field.required=!known;
      document.getElementById('ing-equivalence-label').textContent=conversion.label.replace('uma unidade','cada embalagem ou peça');
      return {conversion,value:known||Number(field.value)};
    }
    function calcIngCost(){
      const {conversion,value}=draftMeasurement();
      if(!selectedIngredient)return;
      const qty=Number(document.getElementById('ing-qty').value)||0;
      const unit=document.getElementById('ing-unit').value;
      const hint=document.getElementById('ing-cost-preview');
      if(conversion && !(value>0)){
        hint.style.display='block';hint.textContent='Informe o peso ou volume da embalagem para calcular o custo.';return;
      }
      const rate=pricePerUnit(selectedIngredient)*(!conversion?1:conversion.divide?1/value:value);
      const yieldPercent=Number(document.getElementById('ing-rendimento').value)||100;
      hint.style.display=qty>0?'block':'none';
      hint.textContent='Custo estimado: '+fmtBRL(rate*measures.toBase(qty,unit)/(yieldPercent/100));
    }
    async function resolveSelectedMeasure() {
      syncState();
      const draft=readIngredientDraft();
      if(!draft)return false;
      if(!selectedIngredient || selectedIngredient.unit!=='un')return true;
      const scope=personalKey('temporarySupplies'), selected=selectedIngredient;
      const catalog=findStockItem(selected.id,selected.name);
      if(!catalog)return ingredientInputError('Produto não encontrado. Selecione novamente.');
      const equivalent=draft.nutrition.recipeEquivalence;
      const product=measures.normalizeStock({...catalog,nutrition:{...catalog.nutrition,recipeEquivalence:equivalent}});
      if(product.unit==='un')return ingredientInputError('Informe o conteúdo de cada embalagem.');
      const physical=physicalStock.filter(item=>String(item.stockId)===String(catalog.id)
        || (catalog.remoteId && item.stockRemoteId===catalog.remoteId) || item.name.toLowerCase()===catalog.name.toLowerCase())
        .map(item=>measures.normalizePhysical(item,product));
      try {
        await DB.upsertStockBatch([product],physical,DB.activeOrganizationId?.());
        if(scope!==personalKey('temporarySupplies'))return false;
        stock=getStock().map(item=>String(item.id)===String(product.id)?product:item);
        physicalStock=getPhysicalStock().map(item=>physical.find(p=>String(p.id)===String(item.id))||item);
        commitState();
        selectedIngredient=ingSource==='fisico'?physicalIngredientProduct(physicalStock.find(item=>String(item.id)===String(selected._physicalId))):product;
        calcIngCost();
        return true;
      } catch(error) {
        console.error('Stock measurement save failed',error);
        return ingredientInputError('Não foi possível salvar o peso ou volume. Seus dados foram mantidos; tente novamente.');
      }
    }
    function physicalIngredientProduct(product) {
      const catalog = stock.find(item => String(item.id) === String(product.stockId)
        || (product.stockRemoteId && item.remoteId === product.stockRemoteId)
        || item.name.toLocaleLowerCase('pt-BR') === product.name.toLocaleLowerCase('pt-BR'));
      return {...product, id:'pf_'+product.id, _physicalId:product.id,
        qty:catalog?.qty || (Number(product.currentQty)+Number(product.usedTotal||0)),
        price:catalog?.price ?? product.price, availableQty:product.currentQty,
        nutrition:product.nutrition || catalog?.nutrition || getNutrition(product.name)};
    }
    function ingredientInputError(message) {
      const error = document.getElementById('ingredient-dialog-error');
      if(error){error.hidden=false;error.textContent=message;}
      showToast(message);
      return false;
    }
    function readIngredientDraft() {
      const manual=ingSource==='manual';
      const product=manual?{name:document.getElementById('ing-search').value.trim()}:selectedIngredient;
      if(!product?.name){ingredientInputError(manual?'Digite o nome do ingrediente.':'Selecione um ingrediente da lista.');return null;}
      const qty=Number(document.getElementById('ing-qty').value);
      const unit=document.getElementById('ing-unit').value;
      const rend=Number(document.getElementById('ing-rendimento').value || 100);
      if(!['g','mg','kg','ml'].includes(unit)){ingredientInputError('Selecione uma unidade de medida.');return null;}
      if(!Number.isFinite(rend)||rend<=0||rend>100){ingredientInputError('Informe um rendimento maior que zero e até 100%.');return null;}
      const {conversion,value:equivalent}=manual?{conversion:null,value:0}:draftMeasurement();
      if(conversion && !(equivalent>0)){ingredientInputError('Informe o peso ou volume de cada embalagem no campo acima.');return null;}
      if(!Number.isFinite(qty)||qty<=0||qty>999999999){ingredientInputError('Informe uma quantidade maior que zero.');return null;}
      const rate = manual ? 0 : pricePerUnit(product) * (!conversion ? 1 : conversion.divide ? 1/equivalent : equivalent);
      if(!Number.isFinite(rate)||rate<0){ingredientInputError('Revise o preço e a quantidade desse produto no estoque.');return null;}
      const qtyG=measures.toBase(qty,unit);
      if(qtyG<0.0001){ingredientInputError('A quantidade mínima é 0,1 mg, 0,0001 g ou 0,0001 ml.');return null;}
      const qtyBruta=qtyG/(rend/100);
      return {
        id:window.crypto?.randomUUID?.() || Date.now()+ingredientSequence++,
        stockId:product.id||null,physicalId:product._physicalId||null,
        source:ingSource,name:product.name,qtyG,qtyBruta,unit:measures.baseUnit(unit),rendimento:rend,
        category:document.getElementById('ing-category')?.value || product.category || deps.inferIngredientCategory?.(product.name) || '',
        cost:rate*qtyBruta,savedPricePerG:rate,nutrition:manual?{}:{...(product.nutrition||getNutrition(product.name)),...(conversion?{recipeEquivalence:{key:conversion.key,value:equivalent}}:{})}
      };
    }
    function resetIngredientFields() {
      ['ing-search','ing-qty','ing-rendimento'].forEach(id=>document.getElementById(id).value='');
      document.getElementById('ing-selected-info').style.display='none';
      document.getElementById('ing-cost-preview').style.display='none';
      document.getElementById('ing-dropdown').classList.remove('open');
      selectedIngredient=null;
    }
    function commitIngredientDrafts(items) {
      // Check the entire batch before deducting anything. The virtual catalog
      // retains its purchase quantity/price so its unit price never changes.
      let nextPhysical=physicalStock;
      for(const item of items.filter(item=>item.source==='fisico')){
        const product=nextPhysical.find(product=>String(product.id)===String(item.physicalId));
        const conversion=product && conversionFor(product.unit,item.unit);
        const equivalent=conversion && knownEquivalence(item,physicalIngredientProduct(product),conversion);
        const baseAmount=!conversion?item.qtyBruta:equivalent>0?(conversion.divide?item.qtyBruta/equivalent:item.qtyBruta*equivalent):NaN;
        const amount=measures.fromBase(baseAmount,product?.unit);
        if(!product || !(amount>0) || amount>Number(product.currentQty)+0.000001)
          return ingredientInputError('Estoque insuficiente para '+item.name+'. Revise a seleção antes de preparar.');
        nextPhysical=nextPhysical.map(p=>p!==product?p:{...p,
          currentQty:Number((p.currentQty-amount).toFixed(6)),usedTotal:Number(p.usedTotal||0)+amount,
          history:[...(p.history||[]),{type:'saida',qty:amount,date:new Date().toISOString()}]});
      }
      if(nextPhysical!==physicalStock){
        DB.save(STORAGE_KEYS.physicalStock,nextPhysical);
        physicalStock=nextPhysical;
      }
      currentIngredients.push(...items);
      return true;
    }
    function addIngredient() {
      if(recipeSaveInFlight)return false;
      const item=readIngredientDraft();
      if(!item || !commitIngredientDrafts([item]))return false;
      resetIngredientFields();
      renderIngredients();calcFicha();
      return true;
    }
    function queueIngredient() {
      if(recipeSaveInFlight)return false;
      const item=readIngredientDraft();
      if(!item)return false;
      pendingIngredients.push(item);
      journeyRevision++;
      resetIngredientFields();
      rememberSupplies();
      deps.onJourneyChange?.();
      return true;
    }
    function removeQueuedIngredient(id) {
      pendingIngredients=pendingIngredients.filter(item=>String(item.id)!==String(id));
      journeyRevision++;
      rememberSupplies();
      deps.onJourneyChange?.();
    }
    function prepareIngredients(revision,scope=personalKey('temporarySupplies')) {
      if(scope!==personalKey('temporarySupplies') || recipeSaveInFlight || revision!==journeyRevision || (!pendingIngredients.length&&!needsReprepare))return false;
      if(pendingIngredients.length&&!commitIngredientDrafts(pendingIngredients))return false;
      pendingIngredients=[];
      needsReprepare=false;
      journeyRevision++;
      renderIngredients();calcFicha();
      return true;
    }
    function getJourneyState() {
      return {source:ingSource,revision:journeyRevision,needsReprepare,editing:Boolean(editingRecipeId),scope:personalKey('temporarySupplies'),
        confirmed:currentIngredients.map(item=>({...item,category:ingredientCategory(item)})),
        pending:pendingIngredients.map(item=>({...item}))};
    }

    async function removeIngredient(id){
      if(recipeSaveInFlight)return;
      const revision=journeyRevision,scope=personalKey('temporarySupplies');
      if(!await confirmAction('Deseja remover este ingrediente da ficha tecnica?','Remover ingrediente'))return;
      if(recipeSaveInFlight||revision!==journeyRevision||scope!==personalKey('temporarySupplies')||!currentIngredients.some(i=>String(i.id)===String(id)))return;
      needsReprepare=true;
      journeyRevision++;
      currentIngredients=currentIngredients.filter(i=>String(i.id)!==String(id));renderIngredients();calcFicha();
    }
    function reorderIngredient(from,to){
      if(to<0||to>=currentIngredients.length){renderIngredients();return;}
      currentIngredients=window.FichaTecIngredientOrder.moveIngredient(currentIngredients,from,to);
      renderIngredients();
      document.querySelector(`#ingredients-list [data-ingredient-index="${to}"] [data-ingredient-grip]`)?.focus({preventScroll:true});
      document.getElementById('ingredient-order-status').textContent=`Ingrediente movido para a posição ${to+1}. Salve a receita para manter esta ordem.`;
    }
    function renderIngredients(){
      rememberSupplies();
      deps.onJourneyChange?.();
      const el=document.getElementById('ingredients-list');
      if(!currentIngredients.length){el.innerHTML='';return;}
      el.innerHTML=`<div class="card">
        <div class="card-title"><span class="material-symbols-rounded icon-sm">format_list_bulleted</span> Ingredientes (${currentIngredients.length})</div>
        <p class="ingredient-order-help">Arraste pelo ícone para organizar. Pelo teclado, use as setas ↑ e ↓.</p>
        <div role="list" aria-label="Ingredientes na ordem de preparo">
        ${calcCosts(currentIngredients).ingredients.map((i,index)=>`<div class="ingredient-row" role="listitem" data-ingredient-index="${index}">
          <button type="button" class="ingredient-grip" data-ingredient-grip aria-label="Reordenar ${escapeAttribute(i.name)}" title="Arrastar para reordenar"><span class="material-symbols-rounded" aria-hidden="true">drag_indicator</span></button>
          <div style="flex:1;min-width:0">
            <div class="ing-name">${escapeHtml(i.name)}</div>
            <div class="ing-qty">${formatBatchNumber(i.unit==='kg'?i.qtyG/1000:i.qtyG)} ${escapeHtml(i.unit||'g')}${i.unit!=='un'&&i.rendimento<100?' → '+formatProductionIngredientQuantity(i)+' bruto':''}</div>
          </div>
          <div class="ing-cost">${i.source==='manual'?'Sem preço':fmtBRL(i.cost)}</div>
          <button type="button" class="ingredient-edit-button" data-edit-ingredient="${index}" aria-label="Editar quantidade e unidade de ${escapeAttribute(i.name)}"><span class="material-symbols-rounded" aria-hidden="true">edit</span></button>
          <button type="button" class="ing-del" data-remove-ingredient="${escapeAttribute(i.id)}" aria-label="Remover ${escapeAttribute(i.name)}"><span class="material-symbols-rounded" aria-hidden="true">close</span></button>
        </div>`).join('')}
        </div><p class="ingredient-order-status" id="ingredient-order-status" role="status" aria-live="polite"></p>
      </div>`;
    }
    function formatBatchNumber(value) {
      return Number(value).toLocaleString('pt-BR', {maximumFractionDigits: 4});
    }

    function syncBaseYield(changedField) {
      const ready = getRecipeYieldG();
      const unit = document.getElementById('ficha-yield-unit').value;
      const countInput = document.getElementById('ficha-porcoes');
      const pieceInput = document.getElementById('ficha-peso-unidade');
      if (changedField === 'count' || changedField === 'piece') yieldDriver = changedField;
      const byPiece = yieldDriver === 'piece';
      const target = byPiece ? Number(pieceInput.value) : null;
      const division = window.FichaTecProduction.divideBatch(ready, byPiece ? null : countInput.value, target);
      const noun = unit === 'unit' ? 'unidade' : 'porção';
      const plural = unit === 'unit' ? 'unidades' : 'porções';
      pieceInput.disabled = !(ready > 0);
      pieceInput.placeholder = ready > 0 ? 'Ex.: 25' : 'Após a pesagem';
      countInput.step = unit === 'unit' && !byPiece ? '1' : 'any';
      countInput.min = unit === 'unit' && !byPiece ? '1' : '0.0001';
      if (byPiece) countInput.value = division.count > 0 ? Number(division.count.toFixed(4)) : '';
      else pieceInput.value = division.pieceWeight > 0 ? Number(division.pieceWeight.toFixed(4)) : '';
      document.getElementById('batch-count-label').textContent = 'Quantidade de ' + plural;
      document.getElementById('batch-piece-label').textContent = 'Peso por ' + noun + ' (g)';
      document.getElementById('batch-divide-help').textContent = 'Com o peso pronto, informe a quantidade ou o peso de cada ' + noun + '. A ficha calcula o outro campo.';
      return {...division, ready, unit, noun, target};
    }

    function weightSummary(rawWeight, batch) {
      if (!(batch.ready > 0)) return 'A perda será calculada quando você informar o peso pronto.';
      const {loss, lossPercent} = window.FichaTecProduction.weightChange(rawWeight, batch.ready);
      const parts = [];
      if (loss === null) parts.push('Para calcular a perda, é preciso conhecer o peso de todos os ingredientes em gramas.');
      else if (loss === 0) parts.push('Sem perda de peso no preparo (0%).');
      else parts.push((loss > 0 ? 'Perda' : 'Ganho') + ' no preparo de ' + formatBatchNumber(Math.abs(loss)) + ' g (' + Math.abs(lossPercent).toLocaleString('pt-BR', {maximumFractionDigits: 2}) + '%).');
      if (batch.target > 0 && batch.count > 0 && !Number.isInteger(batch.count)) {
        const whole = Math.floor(batch.count);
        const rest = batch.ready - whole * batch.target;
        parts.push('Cabem ' + whole + (batch.unit === 'unit' ? (whole === 1 ? ' unidade inteira' : ' unidades inteiras') : (whole === 1 ? ' porção inteira' : ' porções inteiras')) + ' de ' + formatBatchNumber(batch.target) + ' g e sobram ' + formatBatchNumber(rest) + ' g.');
      }
      return parts.join(' ');
    }

    function calcFicha(changedField){
      const yieldSection=document.getElementById('recipe-yield-section');
      if(yieldSection)yieldSection.hidden=!currentIngredients.length;
      const pending = currentIngredients.some(i=>i.source==='manual');
      document.getElementById('ficha-totals').classList.toggle('cost-pending',pending);
      document.getElementById('pending-cost-notice').hidden=!pending;
      const batch = syncBaseYield(changedField);
      const rawWeight = window.FichaTecProduction.ingredientMass(currentIngredients);
      document.getElementById('weight-raw').value = rawWeight === null ? '' : formatBatchNumber(rawWeight);
      document.getElementById('weight-summary').textContent = weightSummary(rawWeight, batch);
      if(!currentIngredients.length){document.getElementById('ficha-totals').style.display='none';return;}
      const markup=parseFloat(document.getElementById('markup-pct').value)||0;
      const {totalCost,venda,saleBeforeLoss,lossPremium,grossProfit,lossPercent}=calcCosts(currentIngredients,markup,batch.ready);
      document.getElementById('total-custo').textContent=fmtBRL(totalCost);
      document.getElementById('total-venda').textContent=fmtBRL(venda);
      document.getElementById('total-porcao').textContent = batch.count > 0 ? fmtBRL(venda / batch.count) : '—';
      document.getElementById('total-unit-label').textContent = 'Venda por ' + batch.noun;
      document.getElementById('total-kg').textContent=batch.ready>0?fmtBRL(totalCost/(batch.ready/1000)):'—';
      document.getElementById('total-antes-perda').textContent = fmtBRL(saleBeforeLoss);
      document.getElementById('sale-loss-rate').textContent = lossPercent === null ? '' : '(' + formatBatchNumber(Math.max(0, lossPercent)) + '%)';
      document.getElementById('total-adicional-perda').textContent = lossPercent === null ? 'Sem pesagem completa' : fmtBRL(lossPremium);
      document.getElementById('total-lucro').textContent = fmtBRL(grossProfit);
      document.getElementById('profit-unit-label').textContent = 'Lucro bruto por ' + batch.noun;
      document.getElementById('unit-lucro').textContent = batch.count > 0 ? fmtBRL(grossProfit / batch.count) : '—';
      document.getElementById('ficha-totals').style.display='block';
      calcNutrition();
    }
    function calcNutrition(){
      const portion=parseFloat(document.getElementById('portion-size').value)||100;
      document.getElementById('nut-portion-label').textContent=`${portion}g`;
      document.getElementById('nutrition-body').innerHTML=renderNutritionRows(
        calculateRecipeNutritionPortion(currentIngredients, portion)
      );
    }
    async function clearFicha(options = {}){
      if(recipeSaveInFlight&&!options.force)return;
      if((currentIngredients.length||pendingIngredients.length)&&!options.force&&!await confirmAction('Deseja limpar todos os dados desta ficha tecnica?','Limpar ficha','Sim, limpar'))return;
      currentIngredients=[];
      pendingIngredients=[];
      needsReprepare=false;
      journeyRevision++;
      try{const key=personalKey('temporarySupplies');if(key)localStorage.removeItem(key);}catch{}
      setIngSource('virtual');
      document.getElementById('page-ficha').classList.remove('editor-open');
      currentRecipeId=null;
      editingRecipeId=null;
      draftScope=personalKey('temporarySupplies');
      resetIngredientFields();
      document.getElementById('ficha-peso-unidade').value='';
      yieldDriver='count';
      recipeImageDirty=false;
      currentRecipeImage=null;
      recipeImageOperationId+=1;
      setRecipeImageProcessing(false);
      ['ficha-nome','ficha-rendimento','markup-pct','ficha-modo-preparo'].forEach(f=>document.getElementById(f).value='');
      document.getElementById('ficha-porcoes').value='1';
      document.getElementById('ficha-yield-unit').value='portion';
      document.getElementById('total-unit-label').textContent='Venda por porção';
      document.getElementById('portion-size').value='100';
      document.getElementById('ficha-totals').style.display='none';
      document.getElementById('ingredients-list').innerHTML='';
      calcFicha();
      document.querySelectorAll?.('#page-ficha .mobile-fold').forEach(button=>button.setAttribute('aria-expanded','false'));
      const {input} = getRecipeImageElements();
      if(input)input.value='';
      renderRecipeImageEditor();
      if(!options.silent)showToast('Ficha limpa.');
    }
    async function saveRecipe(){
      if(currentIngredients.some(item=>item.unit==='un')){showToast('Use o lápis para informar o peso ou volume dos ingredientes antigos antes de salvar.');return;}
      if(pendingIngredients.length){showToast('Clique em Preparar receita para confirmar os ingredientes selecionados antes de salvar.');return;}
      if(recipeImageProcessing){showToast('Aguarde a imagem terminar de ser otimizada.');return;}
      if(recipeSaveInFlight)return;
      setRecipeSaveBusy(true);
      try{
      const nome=document.getElementById('ficha-nome').value.trim();
      if(!nome){showToast('Informe o nome da receita.');return;}
      if(!currentIngredients.length){showToast('Adicione pelo menos um ingrediente.');return;}
      const markup=parseFloat(document.getElementById('markup-pct').value)||0;
      if (markup < 0) { showToast('Informe um markup maior ou igual a zero.'); return; }
      const batch = syncBaseYield();
      const readyInput = document.getElementById('ficha-rendimento');
      if (readyInput.validity?.badInput || (readyInput.value !== '' && (batch.ready < 0.0001 || !Number.isFinite(batch.ready)))) {
        showToast('Informe um peso pronto positivo ou deixe a pesagem para depois.'); return;
      }
      if (readyInput.validity?.stepMismatch || readyInput.validity?.rangeOverflow) {
        showToast('Revise o peso pronto e use até quatro casas decimais em gramas.'); return;
      }
      if (!(batch.count >= 0.0001) || !Number.isFinite(batch.count) || batch.count >= 1e10) {
        showToast('Revise a quantidade do lote ou o peso de cada ' + batch.noun + '.'); return;
      }
      if (batch.unit === 'unit' && yieldDriver === 'count' && !Number.isInteger(batch.count)) {
        showToast('Informe um número inteiro de unidades ou digite o peso por unidade.'); return;
      }
      if (yieldDriver === 'count' && Number(batch.count.toFixed(4)) !== batch.count) {
        showToast('Use até quatro casas decimais na quantidade de porções.'); return;
      }
      const {ingredients: priced, totalCost, venda} = calcCosts(currentIngredients, markup, batch.ready);
      const ingredientRefs = priced.map(({currentPricePerG, ...item}) => ({...item, savedPricePerG: currentPricePerG}));
      const editingIndex=editingRecipeId===null? -1 : recipes.findIndex(r=>String(r.id)===String(editingRecipeId));
      const namedIndex=recipes.findIndex(r=>r.nome.toLocaleLowerCase('pt-BR')===nome.toLocaleLowerCase('pt-BR'));
      if(editingIndex>=0&&namedIndex>=0&&editingIndex!==namedIndex){
        showToast('Ja existe outra receita com esse nome.');
        return;
      }
      const idx=editingIndex>=0?editingIndex:namedIndex;
      const existingRecipe=idx>=0?recipes[idx]:null;
      let recipeImage;
      try {
        recipeImage=await resolveRecipeImageForSave(existingRecipe);
      } catch (error) {
        console.error("Recipe image read failed",error);
        showToast("Nao foi possivel preparar a imagem da receita.");
        return;
      }
      const now=new Date().toISOString();
      const recipePortionSize=parseFloat(document.getElementById('portion-size').value)||100;
      const recipe={
        id:existingRecipe?.id||Date.now(),remoteId:existingRecipe?.remoteId,nome,ingredients:ingredientRefs,
        rendimento:batch.ready,
        porcoes:batch.count,
        targetPieceWeightG:batch.target,
        yieldUnit:normalizeRecipeYieldUnit(batch.unit),
        markup,totalCost,venda,
        porcaoSize:recipePortionSize,
        modoPreparo:document.getElementById('ficha-modo-preparo').value.trim(),
        observacoes:existingRecipe?.observacoes||'',
        origem:existingRecipe?.origem||'manual',
        nutritionTotals:calculateRecipeNutritionTotals(ingredientRefs),
        nutritionPortion:calculateRecipeNutritionPortion(ingredientRefs,recipePortionSize,batch.ready),
        image:recipeImage,
        imagePath:recipeImage?.path || existingRecipe?.image?.path || existingRecipe?.imagePath || null,
        createdAt:existingRecipe?.createdAt||now,
        updatedAt:now
      };
      if(editingIndex<0&&idx>=0&&!await confirmAction(`Receita "${nome}" ja existe. Deseja sobrescrever?`,'Sobrescrever receita','Sim, sobrescrever'))return;
      const nextRecipes=[...recipes];
      if(idx>=0)nextRecipes[idx]=recipe;
      else nextRecipes.push(recipe);
      try {
        await persistRecipesSnapshot(nextRecipes);
      } catch (error) {
        console.error(error);
        const quotaExceeded = error?.name === "QuotaExceededError" || /quota|storage.*full/i.test(error?.message || "");
        showToast(quotaExceeded
          ? "A imagem ficou grande demais para o armazenamento local. Escolha uma foto menor."
          : DB.mode?.() === "supabase"
            ? "Nao foi possivel salvar a receita no Supabase."
            : "Nao foi possivel salvar a receita neste dispositivo.");
        return;
      }
      showToast(DB.mode?.() === "supabase" ? `"${nome}" salva no banco!` : `"${nome}" salva!`);
      document.getElementById('recipe-search').value='';
      activeIngFilter=null;
      showPage('receitas','nav-receitas');
      renderRecipes('',null);
      focusRecipeCard(recipe.id);
      await clearFicha({force:true,silent:true});
      }finally{
        setRecipeSaveBusy(false);
      }
    }
    
    /* ══ RECEITAS ══ */
    function hasPriceChanged(refs){
      return refs.some(i=>{
        if(!i.savedPricePerG)return false;
        const s=findStockItem(i.stockId,i.name);
        return s&&Math.abs(getIngredientUnitPrice(i)-i.savedPricePerG)>0.000001;
      });
    }
    function renderRecipes(filter = document.getElementById('recipe-search').value, ingFilter = activeIngFilter) {
      bindRecipeStyles();
      const categories=[...new Set(recipes.flatMap(r=>r.ingredients.map(ingredientCategory)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
      if(!categories.includes(categoryFilter))categoryFilter=null;
      document.getElementById('recipe-category-chips').innerHTML=categories.map(c=>`<button type="button" class="recipe-filter-choice" aria-pressed="${c===categoryFilter}" data-category-filter="${escapeAttribute(c)}">${escapeHtml(c)}</button>`).join('')||'<span>Sem categorias cadastradas.</span>';
      const allIngredients = [...new Set(recipes.flatMap(recipe => recipe.ingredients.map(item => item.name)))].sort((a,b) => a.localeCompare(b,'pt-BR'));
      activeIngFilter = allIngredients.includes(ingFilter) ? ingFilter : null;
      ingFilter = activeIngFilter;
      document.getElementById('recipe-filter-count').hidden = !ingFilter&&!categoryFilter;
      document.getElementById('recipe-filter-count').textContent=Number(Boolean(ingFilter))+Number(Boolean(categoryFilter));
      const filterElement = document.getElementById('ingredient-filter-chips');
      filterElement.innerHTML = allIngredients.map(name => `<button type="button" class="recipe-filter-choice" aria-pressed="${name === ingFilter}" data-ingredient-filter="${escapeAttribute(name)}">${escapeHtml(name)}</button>`).join('') || '<p>Nenhum ingrediente nas receitas.</p>';
      bindRecipeFilterActions();
      let f=recipes.filter(r=>r.nome.toLowerCase().includes((filter||'').toLowerCase()));
      if(ingFilter)f=f.filter(r=>r.ingredients.some(i=>i.name===ingFilter));
      if(categoryFilter)f=f.filter(r=>r.ingredients.some(i=>ingredientCategory(i)===categoryFilter));
      const el=document.getElementById('recipes-list');
      if(!f.length){
        el.onclick = null;
        el.onkeydown = null;
        el.innerHTML=`<div class="empty-state"><span class="empty-icon"><span class="material-symbols-rounded" style="font-size:52px;font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 48">menu_book</span></span><div class="empty-text">${filter||ingFilter?'Nenhuma receita encontrada.':'Nenhuma receita salva ainda.'}</div></div>`;
        return;
      }
      el.innerHTML=f.map((r,cardIndex)=>{
        const pending=r.ingredients.some(i=>i.source==='manual');
        const {totalCost,venda}=calcCosts(r.ingredients,r.markup,r.rendimento);
        const changed=hasPriceChanged(r.ingredients);
        const diff=totalCost-r.totalCost;
        const recipeId=escapeAttribute(r.id);
        const nutritionSummary=getRecipeNutritionSummary(r);
        return`<div class="recipe-card" data-recipe-id="${recipeId}" role="group" aria-label="Receita ${escapeAttribute(r.nome)}">
          ${renderRecipeMedia(r,"card")}
          <div class="recipe-card-heading">
            <div class="recipe-card-title">${escapeHtml(r.nome)}${r.origem==='scan'?` <span class="scan-badge" style="font-size:10px"><span class="material-symbols-rounded" style="font-size:12px">document_scanner</span>Scan</span>`:''}</div>
            <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
              ${!pending && changed && Math.round(diff*100)!==0?`<span style="font-size:11px;background:${diff>0?'var(--r100)':'var(--g50)'};color:${diff>0?'var(--r400)':'var(--g600)'};padding:2px 8px;border-radius:var(--r-pill);font-weight:700">${diff>0?'▲':'▼'} ${fmtBRL(Math.abs(diff))}</span>`:''}
              ${pending?'<span class="pending-tag">Custo pendente</span>':`<span class="badge badge-green">Custo ${fmtBRL(totalCost)}</span>`}
              <span class="recipe-card-actions">
                <button class="btn btn-secondary btn-icon" data-recipe-action="edit" type="button" aria-label="Editar receita"><span class="material-symbols-rounded" aria-hidden="true">edit</span></button>
                <button class="btn btn-danger btn-icon" data-recipe-action="delete" type="button" aria-label="Excluir receita"><span class="material-symbols-rounded" aria-hidden="true">delete</span></button>
              </span>
            </div>
          </div>
          <div class="recipe-card-meta"><span class="material-symbols-rounded">fork_spoon</span>${r.ingredients.length} ingrediente(s) · ${formatRecipeYield(r.porcoes,r.yieldUnit)}${r.rendimento?' · '+formatBatchNumber(r.rendimento)+' g':''}${pending?'':' · Markup '+r.markup+'%'}</div>
          ${pending?`<button class="btn btn-secondary btn-sm recipe-stock-action" data-recipe-action="stock" type="button"><span class="material-symbols-rounded" aria-hidden="true">inventory_2</span>Adicionar ao estoque</button>`:`<div class="recipe-card-prices"><div>Venda do lote<strong>${fmtBRL(venda)}</strong></div><div>Venda por ${r.yieldUnit === 'unit' ? 'unidade' : 'porção'}<strong>${fmtBRL(venda / (Number(r.porcoes) || 1))}</strong></div></div>
          <div class="recipe-card-meta" style="font-size:11px;color:var(--n500)"><span class="material-symbols-rounded" style="font-size:13px">nutrition</span> ${nutritionSummary.label}</div>`}
          ${!pending && changed?`<div class="recipe-card-meta" style="font-size:11px;color:var(--n400)"><span class="material-symbols-rounded" style="font-size:13px">sync</span> Preços atualizados</div>`:''}
          <div class="recipe-card-footer">
            <div class="recipe-section-actions">
            <button class="btn btn-secondary btn-xs recipe-ingredients-toggle" data-recipe-action="ingredients" type="button" aria-expanded="false" aria-controls="recipe-card-ingredients-${cardIndex}"><span data-ingredients-label>Ver ingredientes</span><span class="material-symbols-rounded" aria-hidden="true">expand_more</span></button>
            <button class="btn btn-secondary btn-xs recipe-ingredients-toggle" data-recipe-action="preparation" type="button" aria-expanded="false" aria-controls="recipe-card-preparation-${cardIndex}">Modo de preparo<span class="material-symbols-rounded" aria-hidden="true">expand_more</span></button>
            </div>

          <ul class="recipe-card-ingredients" id="recipe-card-ingredients-${cardIndex}" data-card-ingredients hidden aria-label="Ingredientes e quantidades da receita-base de ${escapeAttribute(r.nome)}">${r.ingredients.map(i=>`<li><span>${escapeHtml(i.name)}</span><strong class="recipe-card-ingredient-quantity">${formatProductionIngredientQuantity(i)}</strong></li>`).join('')}</ul>
          <div class="recipe-preparation-content" id="recipe-card-preparation-${cardIndex}" data-card-preparation hidden aria-label="Modo de preparo de ${escapeAttribute(r.nome)}">${r.modoPreparo?escapeHtml(r.modoPreparo):'Modo de preparo ainda não informado. Clique em Editar para adicioná-lo.'}</div>
            <button class="btn recipe-plan-action" data-recipe-action="plan" type="button">Planejar produção</button>
          </div>
        </div>`;
      }).join('');
      bindRecipeCardActions(el);
    }
    function setIngFilter(val){activeIngFilter=val;renderRecipes(document.getElementById('recipe-search').value,val);}
    function sameProductName(a,b) {
      return a.trim().toLocaleLowerCase('pt-BR') === b.trim().toLocaleLowerCase('pt-BR');
    }

    async function applyStockPrice(product) {
      return applyStockPrices([product]);
    }
    async function applyStockPrices(products, {strict = false, recipePricing = null} = {}) {
      syncState();
      if (recipePricing && (!Number.isFinite(recipePricing.markup) || recipePricing.markup < 0 ||
          !recipes.some(recipe => String(recipe.id) === String(recipePricing.id)))) {
        throw new Error('Receita ou markup inválido. Abra o cadastro novamente.');
      }
      products = products.filter(product => product && product.qty > 0);
      if (!products.length) return false;
      let changed=false;
      const next=recipes.map(recipe=>{
        const items=recipe.ingredients.map(linkIngredient);
        const markup = recipePricing && String(recipe.id) === String(recipePricing.id) ? recipePricing.markup : recipe.markup;
        if(markup === recipe.markup && !items.some((item,index)=>item!==recipe.ingredients[index]))return recipe;
        changed=true;
        const price=calcCosts(items,markup,recipe.rendimento);
        const ingredients=price.ingredients.map(({currentPricePerG,...item})=>({...item,savedPricePerG:currentPricePerG}));
        return {...recipe,markup,ingredients,totalCost:price.totalCost,venda:price.venda,updatedAt:new Date().toISOString(),
          nutritionTotals:calculateRecipeNutritionTotals(ingredients),
          nutritionPortion:calculateRecipeNutritionPortion(ingredients,recipe.porcaoSize,recipe.rendimento)};
      });
      function linkIngredient(item) {
        if (item.source !== 'manual') return item;
        const product = products.find(product => sameProductName(item.name, product.name) && !conversionFor(product.unit, item.unit));
        if (!product) return item;
        const rate=pricePerUnit(product);
        return {...item,source:'virtual',stockId:product.id,stockRemoteId:product.remoteId||null,
            nutrition:{...product.nutrition},savedPricePerG:rate,cost:rate*window.FichaTecProduction.grossQuantity(item)};
      }
      if(!changed)return false;
      try {
        await persistRecipesSnapshot(next);
        if(editingRecipeId!==null){
          currentIngredients=currentIngredients.map(linkIngredient);
          if (recipePricing && String(editingRecipeId) === String(recipePricing.id)) document.getElementById('markup-pct').value = recipePricing.markup;
          renderIngredients();
          calcFicha();
        }
        renderRecipes();
        showToast('Preço vinculado. Receita atualizada!');
        return true;
      } catch (error) {
        if (strict) throw error;
        showToast('Produto salvo. Abra Adicionar ao estoque na receita e salve a lista para concluir o vínculo.');
        return false;
      }
    }

    function viewPendingRecipe(recipe) {
      const content=document.getElementById('recipe-detail-content');
      content.innerHTML=renderRecipeMedia(recipe,'modal')+`<h3>${escapeHtml(recipe.nome)}</h3>
        <span class="pending-tag">Custo pendente</span>
        <p>Revise os ingredientes, informe as quantidades compradas e os valores pagos para calcular esta receita.</p>
        <button type="button" class="btn recipe-stock-action" data-add-recipe-stock><span class="material-symbols-rounded" aria-hidden="true">inventory_2</span>Adicionar ao estoque</button>
        <p>Rendimento: ${formatRecipeYield(recipe.porcoes,recipe.yieldUnit)}</p>
        ${recipe.ingredients.map(item=>`<div class="pending-ingredient"><strong>${escapeHtml(item.name)}</strong> · ${formatProductionIngredientQuantity(item)}</div>`).join('')}
        <details><summary>Modo de preparo</summary><p class="recipe-preparation-content">${escapeHtml(recipe.modoPreparo||'Ainda não informado.')}</p></details>`;
      content.onclick = event => {
        if (!event.target.closest('[data-add-recipe-stock]')) return;
        closeModal('modal-recipe');
        deps.openRecipeStockBatch(recipe);
      };
      document.getElementById('modal-recipe').classList.add('open');
    }

    function viewRecipe(id){
      const r=recipes.find(x=>String(x.id)===String(id));if(!r)return;
      bindRecipeStyles();
      currentRecipeId=id;
      if(r.ingredients.some(i=>i.source==='manual')){viewPendingRecipe(r);return;}
      const {ingredients,totalCost,venda}=calcCosts(r.ingredients,r.markup,r.rendimento);
      const porcoes=Number(r.porcoes)||1;
      const changed=hasPriceChanged(r.ingredients);
      const diff=totalCost-r.totalCost;
      const nutritionSummary=getRecipeNutritionSummary(r);
      const yieldUnit=normalizeRecipeYieldUnit(r.yieldUnit);
      const plannedCount = yieldUnit === 'unit' ? Math.max(1, Math.floor(porcoes)) : porcoes;
      const basePiece = window.FichaTecProduction.divideBatch(r.rendimento,porcoes,r.targetPieceWeightG).pieceWeight;

      document.getElementById('recipe-detail-content').innerHTML=`
        ${renderRecipeMedia(r,"modal")}
        <div class="recipe-detail-name">${escapeHtml(r.nome)}${r.origem==='scan'?` <span class="scan-badge" style="font-size:10px"><span class="material-symbols-rounded" style="font-size:12px">document_scanner</span>Scan</span>`:''}</div>
        <div style="font-size:12px;color:var(--n600);margin-bottom:${changed?'12px':'20px'};font-weight:500;display:flex;align-items:center;gap:4px">
          <span class="material-symbols-rounded" style="font-size:14px">calendar_today</span>
          Criada em ${new Date(r.createdAt).toLocaleDateString('pt-BR')} · ${r.ingredients.length} ingrediente(s)
        </div>
        <div class="recipe-preparation-view">
          <div class="recipe-section-actions">
          <button type="button" class="btn btn-secondary" id="recipe-ingredients-shortcut" aria-controls="production-report" aria-expanded="false"><span class="material-symbols-rounded" aria-hidden="true">format_list_bulleted</span>Ver ingredientes</button>
          <button type="button" class="btn btn-secondary" id="recipe-preparation-toggle" aria-controls="recipe-preparation-content" aria-expanded="false"><span class="material-symbols-rounded" aria-hidden="true">menu_book</span>Modo de preparo<span class="material-symbols-rounded preparation-chevron" aria-hidden="true">expand_more</span></button>
          </div>
          <div id="recipe-preparation-content" class="recipe-preparation-content" hidden>${r.modoPreparo?escapeHtml(r.modoPreparo):'Modo de preparo ainda não informado. Clique em Editar para adicioná-lo.'}</div>
        </div>
        ${changed?`<div style="background:${diff>0?'var(--r100)':'var(--g50)'};border:1px solid ${diff>0?'var(--r400)':'var(--g200)'};border-radius:var(--r-md);padding:var(--s3) var(--s4);margin-bottom:var(--s4);font-size:12px;color:${diff>0?'var(--r400)':'var(--g600)'};display:flex;align-items:flex-start;gap:var(--s2)">
          <span class="material-symbols-rounded" style="font-size:16px;flex-shrink:0">sync</span>
          <span><strong>Preços atualizados</strong><br>Custo salvo: ${fmtBRL(r.totalCost)} → Atual: <strong>${fmtBRL(totalCost)}</strong>${diff!==0?` (${diff>0?'+':''}${fmtBRL(diff)})`:''}  </span>
        </div>`:''}
        <dl class="recipe-sale-summary">
          <div><dt>Venda do lote planejado</dt><dd data-plan-value="sale">—</dd></div>
          <div><dt id="production-piece-label">Venda por peça</dt><dd data-plan-value="piece">—</dd></div>
        </dl>
        <section class="production-planner" aria-labelledby="production-planner-title">
          <h3 class="production-planner-title" id="production-planner-title">Planejar esta produção</h3>
          <p class="production-base-line"><strong>Receita-base</strong> · ${formatRecipeYield(porcoes,yieldUnit)}${r.rendimento>0 ? ' · '+formatBatchNumber(Number(r.rendimento))+' g prontos' : ''} · ${fmtBRL(venda)} o lote · markup ${Number(r.markup)||0}%</p>
          ${plannedCount !== porcoes ? '<p class="production-base-line">Para planejar a produção, escolha um número inteiro de unidades.</p>' : ''}
          <form id="production-form">
            <div class="production-planner-control">
              <div class="input-group"><label class="input-label" for="production-unit">Produzir em</label>
                <select id="production-unit"><option value="portion" ${yieldUnit==='portion'?'selected':''}>Porções</option><option value="unit" ${yieldUnit==='unit'?'selected':''}>Unidades</option></select></div>
              <div class="input-group"><label class="input-label" id="production-count-label" for="recipe-production-quantity">Quantidade</label>
                <input id="recipe-production-quantity" type="number" required inputmode="decimal" value="${escapeAttribute(plannedCount)}"></div>
              <div class="input-group"><label class="input-label" id="production-weight-label" for="production-weight">Peso por peça (g)</label>
                <input id="production-weight" type="number" step="any" min="0" inputmode="decimal" ${basePiece>0?'required value="'+basePiece+'"':'disabled placeholder="Sem pesagem"'}></div>
              <div class="input-group"><label class="input-label markup-caption" for="production-markup"><span class="material-symbols-rounded" aria-hidden="true">trending_up</span>Markup (%)</label>
                <input id="production-markup" type="number" required min="0" step="any" inputmode="decimal" value="${Number(r.markup)||0}"></div>
            </div>
            ${r.rendimento>0?'':'<p class="production-base-line">Para planejar por peso, informe o peso da receita pronta em Editar.</p>'}
            <div class="production-calculate"><span id="production-status" role="status" tabindex="-1"></span><button type="submit" class="btn btn-primary" aria-controls="production-report"><span class="material-symbols-rounded" aria-hidden="true">calculate</span>Calcular</button></div>
          </form>
        </section>
        <section id="production-report" aria-labelledby="production-report-title" hidden>
          <div class="production-ingredients" role="region" aria-labelledby="recipe-detail-ingredients">
          <h4 id="recipe-detail-ingredients" tabindex="-1">Ingredientes do lote</h4>
        ${ingredients.map((i,ingredientIndex)=>{
          const s=findStockItem(i.stockId,i.name);
          const curPPG=s?getIngredientUnitPrice(i):0;
          const ingChanged=i.savedPricePerG&&Math.abs(curPPG-i.savedPricePerG)>0.000001;
          return`<div class="ingredient-row">
            <div style="flex:1;min-width:0">
              <div class="ing-name">${escapeHtml(i.name)}${ingChanged?` <span style="font-size:10px;font-weight:700;color:${curPPG>i.savedPricePerG?'var(--r400)':'var(--g500)'}">${curPPG>i.savedPricePerG?'▲':'▼'}</span>`:''}</div>
              <div class="ing-qty production-ingredient-quantity" data-production-ingredient="${ingredientIndex}">${formatProductionIngredientQuantity(i)}</div>
            </div>
            <div class="ing-cost" style="${ingChanged?'color:'+(curPPG>i.savedPricePerG?'var(--r400)':'var(--g500)'):''}"> ${fmtBRL(i.cost)}</div>
          </div>`;
        }).join('')}
          </div>
          <details class="production-preparation">
            <summary class="btn btn-primary"><span class="material-symbols-rounded" aria-hidden="true">menu_book</span><span class="preparation-show-label">Ver modo de preparo</span><span class="preparation-hide-label">Ocultar modo de preparo</span><span class="material-symbols-rounded preparation-chevron" aria-hidden="true">expand_more</span></summary>
            <div class="production-preparation-paper" role="region" aria-labelledby="production-preparation-title">
              <h4 id="production-preparation-title">Modo de preparo</h4>
              <p>${r.modoPreparo?escapeHtml(r.modoPreparo):'Modo de preparo ainda não informado. Clique em Editar para adicioná-lo.'}</p>
            </div>
          </details>
          <h3 id="production-report-title" tabindex="-1">Resultado do lote</h3>
          <dl class="production-facts">
            <div><dt>Ingredientes antes do preparo</dt><dd data-plan-value="raw">—</dd></div>
            <div><dt>Peso pronto</dt><dd data-plan-value="ready">—</dd></div>
            <div><dt id="production-loss-label">Perda de peso</dt><dd id="production-loss">—</dd></div>
            <div><dt>Markup aplicado</dt><dd data-plan-value="markup">—</dd></div>
            <div><dt>Custo dos ingredientes</dt><dd data-plan-value="cost">—</dd></div>
            <div><dt>Venda com markup</dt><dd data-plan-value="beforeLoss">—</dd></div>
            <div><dt>Adicional pela perda</dt><dd data-plan-value="premium">—</dd></div>
            <div><dt>Venda total do lote</dt><dd data-plan-value="sale">—</dd></div>
            <div><dt>Venda média por peça</dt><dd data-plan-value="piece">—</dd></div>
            <div><dt>Lucro bruto do lote</dt><dd data-plan-value="profit">—</dd></div>
            <div><dt>Lucro bruto por peça</dt><dd data-plan-value="pieceProfit">—</dd></div>
          </dl>
          <p class="production-footnote" id="production-weight-help"></p>
          <p class="production-footnote" id="production-rounding" hidden>O preço por peça é a média do lote arredondada para centavos.</p>

        </section>
        <details class="production-nutrition"><summary><span class="material-symbols-rounded" aria-hidden="true">nutrition</span> Nutrição da receita-base por ${nutritionSummary.portion} g</summary>
        <table class="nutrition-table" style="margin-bottom:var(--s4)">
          <tbody>${renderNutritionRows(nutritionSummary.nutrition)}</tbody>
        </table>
        </details>
        ${r.observacoes?`<div style="margin-top:var(--s3);font-size:12px;color:var(--n600);background:var(--warn-bg);border-radius:var(--r-md);padding:var(--s3) var(--s4);line-height:1.6">
          <strong>Obs:</strong> ${escapeHtml(r.observacoes).replace(/\n/g,'<br>')}</div>`:''}`;
      bindProductionPlanner(r);
      const prepToggle=document.getElementById('recipe-preparation-toggle');
      prepToggle?.addEventListener('click',()=>{
        const panel=document.getElementById('recipe-preparation-content');
        panel.hidden=!panel.hidden;
        prepToggle.setAttribute('aria-expanded',String(!panel.hidden));
      });
      document.getElementById('modal-recipe').classList.add('open');
    }
    async function deleteCurrentRecipe(){
      if(!await confirmAction('Deseja excluir esta receita salva?','Excluir receita'))return;
      const nextRecipes=recipes.filter(r=>String(r.id)!==String(currentRecipeId));
      try {
        await persistRecipesSnapshot(nextRecipes);
      } catch (error) {
        console.error(error);
        showToast("Nao foi possivel excluir a receita no Supabase.");
        return;
      }
      closeModal('modal-recipe');
      renderRecipes(document.getElementById('recipe-search').value,activeIngFilter);
      showToast('Receita excluída.');
    }
    function editRecipe(id){
      currentRecipeId=id;
      loadRecipeToFicha();
    }
    async function deleteRecipe(id){
      currentRecipeId=id;
      await deleteCurrentRecipe();
    }
    function loadRecipeToFicha(){
      const r=recipes.find(x=>String(x.id)===String(currentRecipeId));if(!r)return;
      closeModal('modal-recipe');
      editingRecipeId=r.id;
      draftScope=personalKey('temporarySupplies');
      currentIngredients=r.ingredients.map(item => measures.normalizeIngredient({...item},findStockItem(item.stockId,item.name)));
      pendingIngredients=[];
      needsReprepare=false;
      journeyRevision++;
      recipeImageOperationId+=1;
      setRecipeImageProcessing(false);
      document.getElementById('ficha-nome').value=r.nome;
      document.getElementById('ficha-modo-preparo').value=r.modoPreparo||'';
      document.getElementById('ficha-rendimento').value=r.rendimento||'';
      document.getElementById('ficha-porcoes').value=r.porcoes||'';
      yieldDriver = r.targetPieceWeightG > 0 && r.rendimento > 0 ? 'piece' : 'count';
      document.getElementById('ficha-peso-unidade').value = r.targetPieceWeightG || '';
      document.getElementById('ficha-yield-unit').value=normalizeRecipeYieldUnit(r.yieldUnit);
      document.getElementById('markup-pct').value=r.markup||'';
      document.getElementById('portion-size').value=r.porcaoSize||100;
      currentRecipeImage=normalizeRecipeImage(r.image);
      recipeImageDirty=false;
      const {input}=getRecipeImageElements();
      if(input)input.value='';
      bindRecipeImageEditor();
      renderRecipeImageEditor();
      setIngSource(r.ingredients.some(i=>i.source==='manual')?'manual':'virtual');
      renderIngredients();calcFicha();showPage('ficha','nav-ficha',true,true);
    }
    
    function exportRecipePDF(id) {
      const recipe = recipes.find(item => String(item.id) === String(id));
      if (!recipe) return;
      const pending=recipe.ingredients.some(i=>i.source==='manual');
      const preview = window.FichaTecRecipePrint.openRecipePreview();
      const price = calcCosts(recipe.ingredients, recipe.markup, recipe.rendimento);
      const count = Number(recipe.porcoes) || 1;
      const unit = normalizeRecipeYieldUnit(recipe.yieldUnit) === 'unit' ? 'unidade' : 'porção';
      const pieceWeight = window.FichaTecProduction.divideBatch(recipe.rendimento, count, recipe.targetPieceWeightG).pieceWeight;
      const nutrition = getRecipeNutritionSummary(recipe);
      const created = new Date(recipe.createdAt);
      const origin = [Number.isFinite(created.getTime()) ? 'Criada em ' + created.toLocaleDateString('pt-BR') : '', recipe.origem === 'scan' ? 'Receita digitalizada' : ''].filter(Boolean).join(' · ');
      const grams = value => formatBatchNumber(value) + ' g';
      const loss = price.loss === null ? 'Sem pesagem completa'
        : grams(Math.abs(price.loss)) + ' (' + formatBatchNumber(Math.abs(price.lossPercent)) + '%)';
      window.FichaTecRecipePrint.writeRecipeBook(preview, {
        name: recipe.nome, preparation: recipe.modoPreparo, notes: recipe.observacoes,
        cover: resolveImageSource(normalizeRecipeImage(recipe.image), recipe),
        origin, issuedOn: new Date().toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'}),
        yieldFacts: [
          ['Rendimento', formatRecipeYield(count, recipe.yieldUnit)],
          ['Peso pronto', recipe.rendimento > 0 ? grams(recipe.rendimento) : 'A pesar'],
          ...(pieceWeight > 0 ? [['Peso por ' + unit, grams(pieceWeight)]] : []),
        ],
        ingredients: price.ingredients.map(item => ({name:item.name, quantity:formatProductionIngredientQuantity(item), cost:item.source==='manual'?'Pendente':fmtBRL(item.cost)})),
        cost: pending?'Custo pendente':fmtBRL(price.totalCost),
        saleFacts: pending?[]:[['Venda do lote', fmtBRL(price.venda)], ['Venda por ' + unit, fmtBRL(price.venda / count)]],
        costFacts: pending?[]:[
          ['Custo dos ingredientes', fmtBRL(price.totalCost)], ['Markup', formatBatchNumber(Number(recipe.markup) || 0) + '%', 'markup'],
          ['Venda com markup', fmtBRL(price.saleBeforeLoss)], ['Adicional pela perda', price.lossPercent === null ? '—' : fmtBRL(price.lossPremium)],
          ['Lucro bruto do lote', fmtBRL(price.grossProfit)], ['Lucro bruto por ' + unit, fmtBRL(price.grossProfit / count)],
          ['Peso dos ingredientes', price.rawWeight === null ? 'A pesar' : grams(price.rawWeight)], [price.loss < 0 ? 'Ganho no preparo' : 'Perda no preparo', loss],
        ],
        priceNote: pending?'Custo pendente. Cadastre os ingredientes no estoque para calcular a venda.':hasPriceChanged(recipe.ingredients) ? 'Preços atualizados pelo estoque. Custo registrado na ficha: ' + fmtBRL(recipe.totalCost) + '.' : '',
        nutritionWeight: formatBatchNumber(nutrition.portion),
        nutrients: pending?[]:nutritionFields.map(([key, label, measure, daily]) => {
          const value = readNumericValue(nutrition.nutrition[key]);
          return {label, value:formatNutritionValue(value, measure), daily:daily ? Math.round(value / daily * 100) + '%' : '—'};
        }),
      }, escapeHtml, document.baseURI);
    }

    function runWithState(fn, options = {}) {
      const shouldCommit = options.commit !== false;
      return function wrappedRecipeFunction(...args) {
        syncState();
        const result = fn(...args);
        if (result && typeof result.then === 'function') {
          return result.then(value => {
            if (shouldCommit) commitState();
            return value;
          });
        }
        if (shouldCommit) commitState();
        return result;
      };
    }

    function getActiveIngredientFilter() { return activeIngFilter; }
    function getCurrentRecipeId() { return currentRecipeId; }
    function getCurrentRecipeImage() { return currentRecipeImage ? {...currentRecipeImage} : null; }

    bindRecipeImageEditor();
    const glow = document.querySelector('.markup-glow');
    if (glow && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.intersectionRatio < 0.5) return;
        observer.disconnect();
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        glow.addEventListener('animationend', () => glow.remove(), {once:true});
        glow.addEventListener('animationcancel', () => glow.remove(), {once:true});
        glow.classList.add('is-sweeping');
      }, {threshold:0.5});
      observer.observe(glow.parentElement);
    }
    const ingredientList=document.getElementById('ingredients-list');
    const editor = document.getElementById('ingredient-editor');
    const editUnit = document.getElementById('ingredient-edit-unit');
    const editQty = document.getElementById('ingredient-edit-qty');
    let editingItem;
    const equivalent = document.getElementById('ingredient-equivalence');
    function previewIngredientEdit(reset = false) {
      if (!editingItem) return null;
      const source = findStockItem(editingItem.stockId,editingItem.name);
      const unit = editUnit.value;
      const pricedSource = source && source.qty > 0 ? source : null;
      const c = editingItem.source!=='manual' && conversionFor(pricedSource?.unit || editingItem.unit || 'g',unit);
      document.getElementById('ingredient-equivalence-group').hidden = !c;
      equivalent.disabled = !c;
      equivalent.required = Boolean(c);
      if (c) {
        document.getElementById('ingredient-equivalence-label').textContent = c.label;
        if (reset) equivalent.value = knownEquivalence(editingItem,source,c) || '';
      }
      const amount = editQty.valueAsNumber;
      const value = Number(equivalent.value);
      const output = document.getElementById('ingredient-live-cost');
      editQty.setCustomValidity('');
      if (!(amount > 0) || (c && !(value > 0))) {
        output.textContent = c && !(value > 0) ? 'Informe a equivalência para calcular o custo.' : 'Informe uma quantidade maior que zero.';
        return null;
      }
      const base = source && source.qty > 0 ? pricePerUnit(source) : getIngredientUnitPrice(editingItem);
      const rate = editingItem.source==='manual'?0:!c ? base : c.divide ? base/value : base*value;
      const qtyG = measures.toBase(amount,unit);
      if (qtyG < 0.0001) {
        const message = 'A quantidade mínima é 0,1 mg, 0,0001 g ou 0,0001 ml.';
        output.textContent = message;
        editQty.setCustomValidity(message);
        return null;
      }
      const qtyBruta = unit==='un' ? qtyG : qtyG/((editingItem.rendimento || 100)/100);
      const cost = rate*qtyBruta;
      output.textContent = editingItem.source==='manual'?'Custo pendente': 'Custo do ingrediente: '+fmtBRL(Math.round((cost+Number.EPSILON)*100)/100);
      return {unit:measures.baseUnit(unit),qtyG,qtyBruta,cost,savedPricePerG:rate,nutrition:c
        ? {...editingItem.nutrition,recipeEquivalence:{key:c.key,value}} : editingItem.nutrition};
    }
    function openIngredientEditor(index) {
      editingItem = currentIngredients[index];
      if (!editingItem || recipeSaveInFlight) return;
      document.getElementById('ingredient-edit-name').textContent = editingItem.name;
      editUnit.innerHTML = document.getElementById('ing-unit').innerHTML;
      const normalized=measures.normalizeIngredient(editingItem,findStockItem(editingItem.stockId,editingItem.name));
      editUnit.value = measures.isMetric(normalized.unit)?measures.baseUnit(normalized.unit):'g';
      editQty.value = normalized.unit==='un'?'':normalized.qtyG;
      editQty.setCustomValidity('');
      previewIngredientEdit(true);
      editor.showModal();
      document.getElementById('ingredient-edit-name').setAttribute('tabindex','-1');
      document.getElementById('ingredient-edit-name').focus({preventScroll:true});
    }
    editQty.addEventListener('input', () => { editQty.setCustomValidity(''); previewIngredientEdit(); });
    editUnit.addEventListener('change', () => previewIngredientEdit(true));
    equivalent.addEventListener('input', () => previewIngredientEdit());
    document.getElementById('ingredient-edit-form').addEventListener('submit', event => {
      event.preventDefault();
      const index = currentIngredients.indexOf(editingItem);
      if (index < 0 || recipeSaveInFlight) return;
      const amount = editQty.valueAsNumber;
      if (!(amount > 0 && Number.isFinite(amount))) {
        editQty.setCustomValidity('Informe uma quantidade maior que zero.');
        editQty.reportValidity();
        return;
      }
      const draft = previewIngredientEdit();
      if (!draft) { if (!editQty.checkValidity()) editQty.reportValidity(); else equivalent.focus(); return; }
      const changed=['unit','qtyG','qtyBruta'].some(key=>draft[key]!==editingItem[key]) ||
        JSON.stringify(draft.nutrition?.recipeEquivalence)!==JSON.stringify(editingItem.nutrition?.recipeEquivalence);
      Object.assign(editingItem, draft);
      needsReprepare=needsReprepare||changed;
      journeyRevision++;
      editor.close();
      renderIngredients();
      calcFicha();
      ingredientList.querySelector('[data-edit-ingredient="'+index+'"]')?.focus();
    });
    window.FichaTecIngredientOrder.bindIngredientOrder(ingredientList,{onMove:reorderIngredient,onCancel:renderIngredients,canMove:()=>!recipeSaveInFlight});
    ingredientList.addEventListener('click',event=>{
      const pencil=event.target.closest('[data-edit-ingredient]');
      if(pencil){openIngredientEditor(Number(pencil.dataset.editIngredient));return;}
      const button=event.target.closest('[data-remove-ingredient]');
      if(button)removeIngredient(button.dataset.removeIngredient);
    });

    return {
      openIngredientEditor: runWithState(openIngredientEditor, {commit:false}),
      resolveSelectedMeasure,
      syncAppearance: bindRecipeStyles,
      restoreSupplies: runWithState(restoreSupplies),
      applyStockPrice,
      applyStockPrices,
      findStockItem: runWithState(findStockItem, {commit:false}),
      calcCosts: runWithState(calcCosts, {commit:false}),
      setIngSource: runWithState(setIngSource),
      searchIngredient: runWithState(searchIngredient),
      selectIngredient: runWithState(selectIngredient),
      calcIngCost: runWithState(calcIngCost),
      addIngredient: runWithState(addIngredient),
      queueIngredient: runWithState(queueIngredient),
      removeQueuedIngredient: runWithState(removeQueuedIngredient),
      prepareIngredients: runWithState(prepareIngredients),
      getJourneyState,
      removeIngredient: runWithState(removeIngredient),
      renderIngredients: runWithState(renderIngredients),
      calcFicha: runWithState(calcFicha),
      calcNutrition: runWithState(calcNutrition),
      clearFicha: runWithState(clearFicha),
      saveRecipe: runWithState(saveRecipe),
      hasPriceChanged: runWithState(hasPriceChanged, {commit:false}),
      renderRecipes: runWithState(renderRecipes),
      setIngFilter: runWithState(setIngFilter),
      viewRecipe: runWithState(viewRecipe),
      deleteCurrentRecipe: runWithState(deleteCurrentRecipe),
      editRecipe: runWithState(editRecipe),
      deleteRecipe: runWithState(deleteRecipe),
      loadRecipeToFicha: runWithState(loadRecipeToFicha),
      exportRecipePDF: runWithState(exportRecipePDF, {commit:false}),
      handleRecipeImageInput: runWithState(handleRecipeImageInput, {commit:false}),
      removeRecipeImage: runWithState(removeRecipeImage, {commit:false}),
      renderRecipeImageEditor: runWithState(renderRecipeImageEditor, {commit:false}),
      setRecipeImageProcessing: runWithState(setRecipeImageProcessing, {commit:false}),
      renderRecipeMedia: runWithState(renderRecipeMedia, {commit:false}),
      getActiveIngredientFilter,
      getCurrentRecipeId,
      getCurrentRecipeImage,
    };
  }

  window.FichaTecRecipeSheet = { createRecipeSheetModule };
})();
