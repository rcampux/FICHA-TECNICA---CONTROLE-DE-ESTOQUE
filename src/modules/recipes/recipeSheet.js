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

    let currentIngredients = [];
    let selectedIngredient = null;
    let currentRecipeId = null;
    let activeIngFilter = null;
    let ingSource = 'virtual';
    let stock = getStock();
    let physicalStock = getPhysicalStock();
    let recipes = getRecipes();
    let currentRecipeImage = null;
    let recipeImageDirty = false;
    let recipeImageOperationId = 0;
    let recipeImageProcessing = false;
    let recipeSaveInFlight = false;

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
            recipeId: currentRecipeId,
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
          recipeId: currentRecipeId,
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
        const action = actionElement?.dataset.recipeAction || "view";
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
        viewRecipe(id);
      };
      listElement.onkeydown = (event) => {
        if (!["Enter", " "].includes(event.key)) return;
        const card = event.target.closest(".recipe-card");
        if (!card || event.target !== card || !listElement.contains(card)) return;
        event.preventDefault();
        viewRecipe(card.dataset.recipeId);
      };
    }

    function bindRecipeFilterActions(filterElement) {
      filterElement.onclick = (event) => {
        const chip = event.target.closest("[data-ingredient-filter]");
        if (!chip || !filterElement.contains(chip)) return;
        setIngFilter(chip.dataset.ingredientFilter || null);
      };
    }

    const nutritionFields = [
      ["kcal", "Valor Energetico", "kcal", 2500],
      ["carb", "Carboidratos", "g", 375],
      ["prot", "Proteinas", "g", 75],
      ["fat", "Gorduras Totais", "g", 83],
      ["satFat", "Gordura Saturada", "g", 20],
      ["transFat", "Gordura Trans", "g", null],
      ["fiber", "Fibra Alimentar", "g", 25],
      ["sodium", "Sodio", "mg", 2400],
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
      if(stockId&&!String(stockId).startsWith('pf_')){const s=stock.find(x=>x.id===stockId||x.id===parseInt(stockId));if(s)return s;}
      return stock.find(x=>x.name.toLowerCase()===name.toLowerCase())||null;
    }
    function calcCosts(ingredients,markup=0){
      const list=ingredients.map(i=>{const s=findStockItem(i.stockId,i.name);const ppg=s?pricePerUnit(s):0;return{...i,cost:ppg*i.qtyBruta,currentPricePerG:ppg};});
      const totalCost=list.reduce((a,i)=>a+i.cost,0);
      return{ingredients:list,totalCost,venda:totalCost*(1+(markup||0)/100)};
    }
    /* ══ FICHA ══ */
    function setIngSource(src){
      ingSource=src;
      document.getElementById('src-btn-virtual').classList.toggle('active',src==='virtual');
      document.getElementById('src-btn-fisico').classList.toggle('active',src==='fisico');
      document.getElementById('ing-search').value='';
      document.getElementById('ing-dropdown').classList.remove('open');
      document.getElementById('ing-selected-info').style.display='none';
      document.getElementById('ing-cost-preview').style.display='none';
      selectedIngredient=null;
    }
    function searchIngredient(){
      const q=document.getElementById('ing-search').value.toLowerCase().trim();
      const dd=document.getElementById('ing-dropdown');
      if(!q){dd.classList.remove('open');return;}
      const matches=ingSource==='fisico'
        ?physicalStock.filter(p=>p.name.toLowerCase().includes(q)&&p.currentQty>0).slice(0,8).map(p=>({id:'pf_'+p.id,name:p.name,unit:p.unit,price:p.price,qty:p.currentQty,_physicalId:p.id,nutrition:getNutrition(p.name)}))
        :stock.filter(s=>s.name.toLowerCase().includes(q)).slice(0,8);
      if(!matches.length){dd.innerHTML=`<div class="autocomplete-item" style="color:var(--n400)">Nenhum ingrediente encontrado</div>`;}
      else{
        dd.innerHTML=matches.map(s=>{
          const ppg=pricePerUnit(s);
          const sub=s.unit==='ml'?fmtBRL(ppg*1000)+'/L':s.unit==='un'?fmtBRL(ppg)+'/un':fmtBRL(ppg*1000)+'/kg';
          return`<div class="autocomplete-item" onclick="selectIngredient('${s.id}')">
            <div>${s.name}${ingSource==='fisico'?` <span style="font-size:11px;color:var(--g500);font-weight:700">${fmtQty(s.qty,s.unit)} disp.</span>`:''}</div>
            <div class="sub">${s.qty}${s.unit} · ${fmtBRL(s.price)} · ${sub}</div>
          </div>`;
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
        selectedIngredient={id:'pf_'+p.id,name:p.name,unit:p.unit,price:p.price,qty:p.currentQty,_physicalId:p.id,nutrition:getNutrition(p.name)};
      }else{selectedIngredient=stock.find(s=>s.id===parseInt(id)||s.id===id);}
      if(!selectedIngredient)return;
      document.getElementById('ing-search').value=selectedIngredient.name;
      document.getElementById('ing-dropdown').classList.remove('open');
      const ppg=pricePerUnit(selectedIngredient),u=selectedIngredient.unit;
      document.getElementById('ing-sel-name').textContent=selectedIngredient.name;
      document.getElementById('ing-sel-price').textContent=u==='ml'?`${fmtBRL(ppg*1000)}/L · ${fmtBRL(ppg*100)}/100ml`:u==='un'?`${fmtBRL(ppg)}/unidade`:`${fmtBRL(ppg*1000)}/kg · ${fmtBRL(ppg*100)}/100g`;
      document.getElementById('ing-selected-info').style.display='block';
      calcIngCost();
    }
    function calcIngCost(){
      if(!selectedIngredient)return;
      const qty=parseFloat(document.getElementById('ing-qty').value)||0;
      const unit=document.getElementById('ing-unit').value;
      const qtyG=unit==='kg'?qty*1000:qty;
      const cost=unit==='un'?pricePerUnit(selectedIngredient)*qty:pricePerUnit(selectedIngredient)*qtyG;
      const el=document.getElementById('ing-cost-preview');
      if(qty>0){el.style.display='block';el.textContent=`Custo estimado: ${fmtBRL(cost)}`;}
      else el.style.display='none';
    }
    function addIngredient(){
      if(!selectedIngredient){showToast('Selecione um ingrediente.');return;}
      const qty=parseFloat(document.getElementById('ing-qty').value);
      const unit=document.getElementById('ing-unit').value;
      const rend=parseFloat(document.getElementById('ing-rendimento').value)||100;
      if(!qty||qty<=0){showToast('Informe a quantidade.');return;}
      const isUn=unit==='un';
      const qtyG=isUn?qty:(unit==='kg'?qty*1000:qty);
      const qtyBruta=isUn?qty:qtyG/(rend/100);
      currentIngredients.push({
        id:Date.now(),stockId:selectedIngredient.id,physicalId:selectedIngredient._physicalId||null,
        source:ingSource,name:selectedIngredient.name,qtyG,qtyBruta,unit,rendimento:rend,
        cost:pricePerUnit(selectedIngredient)*qtyBruta,
        nutrition:selectedIngredient.nutrition||getNutrition(selectedIngredient.name)
      });
      if(ingSource==='fisico'&&selectedIngredient._physicalId){
        const pid=selectedIngredient._physicalId;
        physicalStock=physicalStock.map(p=>{
          if(p.id!==pid)return p;
          return{...p,currentQty:Math.max(parseFloat((p.currentQty-qtyBruta).toFixed(6)),0),usedTotal:(p.usedTotal||0)+qtyBruta,history:[...(p.history||[]),{type:'saida',qty:qtyBruta,date:new Date().toISOString()}]};
        });
        DB.save(STORAGE_KEYS.physicalStock,physicalStock);
        const vn=selectedIngredient.name.toLowerCase();
        stock=stock.map(s=>s.name.toLowerCase()===vn?{...s,qty:Math.max(parseFloat((s.qty-qtyBruta).toFixed(6)),0)}:s);
        DB.save(STORAGE_KEYS.stock,stock);
      }
      ['ing-search','ing-qty','ing-rendimento'].forEach(f=>document.getElementById(f).value='');
      document.getElementById('ing-selected-info').style.display='none';
      document.getElementById('ing-cost-preview').style.display='none';
      selectedIngredient=null;
      renderIngredients();calcFicha();
    }
    async function removeIngredient(id){
      if(!await confirmAction('Deseja remover este ingrediente da ficha tecnica?','Remover ingrediente'))return;
      currentIngredients=currentIngredients.filter(i=>i.id!==id);renderIngredients();calcFicha();
    }
    function renderIngredients(){
      const el=document.getElementById('ingredients-list');
      if(!currentIngredients.length){el.innerHTML='';return;}
      el.innerHTML=`<div class="card">
        <div class="card-title"><span class="material-symbols-rounded icon-sm">format_list_bulleted</span> Ingredientes (${currentIngredients.length})</div>
        ${currentIngredients.map(i=>`<div class="ingredient-row">
          <div style="flex:1;min-width:0">
            <div class="ing-name">${i.name}</div>
            <div class="ing-qty">${i.unit==='un'?i.qtyG+'un':i.unit==='ml'?i.qtyG+'ml':i.qtyG+'g'} usados${i.unit!=='un'&&i.rendimento<100?' → '+i.qtyBruta.toFixed(0)+(i.unit==='ml'?'ml':'g')+' bruto':''}</div>
          </div>
          <div class="ing-cost">${fmtBRL(i.cost)}</div>
          <button class="ing-del" onclick="removeIngredient(${i.id})"><span class="material-symbols-rounded">close</span></button>
        </div>`).join('')}
      </div>`;
    }
    function calcFicha(){
      if(!currentIngredients.length){document.getElementById('ficha-totals').style.display='none';return;}
      const markup=parseFloat(document.getElementById('markup-pct').value)||0;
      const {totalCost,venda}=calcCosts(currentIngredients,markup);
      const rend=parseFloat(document.getElementById('ficha-rendimento').value)||0;
      const porcoes=Math.max(parseFloat(document.getElementById('ficha-porcoes').value)||1,1);
      document.getElementById('total-custo').textContent=fmtBRL(totalCost);
      document.getElementById('total-venda').textContent=fmtBRL(venda);
      document.getElementById('total-porcao').textContent=fmtBRL(totalCost/porcoes);
      document.getElementById('total-kg').textContent=rend>0?fmtBRL(totalCost/(rend/1000)):'—';
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
      if(currentIngredients.length&&!options.force&&!await confirmAction('Deseja limpar todos os dados desta ficha tecnica?','Limpar ficha','Sim, limpar'))return;
      currentIngredients=[];
      currentRecipeId=null;
      recipeImageDirty=false;
      currentRecipeImage=null;
      recipeImageOperationId+=1;
      setRecipeImageProcessing(false);
      ['ficha-nome','ficha-rendimento','ficha-porcoes','markup-pct'].forEach(f=>document.getElementById(f).value='');
      document.getElementById('portion-size').value='100';
      document.getElementById('ficha-totals').style.display='none';
      document.getElementById('ingredients-list').innerHTML='';
      const {input} = getRecipeImageElements();
      if(input)input.value='';
      renderRecipeImageEditor();
      if(!options.silent)showToast('Ficha limpa.');
    }
    async function saveRecipe(){
      if(recipeImageProcessing){showToast('Aguarde a imagem terminar de ser otimizada.');return;}
      if(recipeSaveInFlight)return;
      setRecipeSaveBusy(true);
      try{
      const nome=document.getElementById('ficha-nome').value.trim();
      if(!nome){showToast('Informe o nome da receita.');return;}
      if(!currentIngredients.length){showToast('Adicione pelo menos um ingrediente.');return;}
      const markup=parseFloat(document.getElementById('markup-pct').value)||0;
      const ingredientRefs=currentIngredients.map(i=>({...i,savedPricePerG:pricePerUnit(findStockItem(i.stockId,i.name)||{price:0,qty:1,unit:'kg'})}));
      const {totalCost,venda}=calcCosts(ingredientRefs,markup);
      const editingIndex=currentRecipeId===null? -1 : recipes.findIndex(r=>String(r.id)===String(currentRecipeId));
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
      const recipeYield=parseFloat(document.getElementById('ficha-rendimento').value)||0;
      const recipePortionSize=parseFloat(document.getElementById('portion-size').value)||100;
      const recipe={
        id:existingRecipe?.id||Date.now(),remoteId:existingRecipe?.remoteId,nome,ingredients:ingredientRefs,
        rendimento:recipeYield,
        porcoes:parseFloat(document.getElementById('ficha-porcoes').value)||1,
        markup,totalCost,venda,
        porcaoSize:recipePortionSize,
        nutritionTotals:calculateRecipeNutritionTotals(ingredientRefs),
        nutritionPortion:calculateRecipeNutritionPortion(ingredientRefs,recipePortionSize,recipeYield),
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
        return s&&Math.abs(pricePerUnit(s)-i.savedPricePerG)>0.000001;
      });
    }
    function renderRecipes(filter='',ingFilter=null){
      const allIng=[...new Set(recipes.flatMap(r=>r.ingredients.map(i=>i.name)))].slice(0,15);
      const filterElement=document.getElementById('ingredient-filter-chips');
      filterElement.innerHTML=
        `<div class="chip ${!ingFilter?'active':''}" data-ingredient-filter=""><span class="material-symbols-rounded" style="font-size:14px">grid_view</span> Todas</div>`+
        allIng.map(n=>`<div class="chip ${ingFilter===n?'active':''}" data-ingredient-filter="${escapeAttribute(n)}">${escapeHtml(n)}</div>`).join('');
      bindRecipeFilterActions(filterElement);
      let f=recipes.filter(r=>r.nome.toLowerCase().includes((filter||'').toLowerCase()));
      if(ingFilter)f=f.filter(r=>r.ingredients.some(i=>i.name===ingFilter));
      const el=document.getElementById('recipes-list');
      if(!f.length){
        el.onclick = null;
        el.onkeydown = null;
        el.innerHTML=`<div class="empty-state"><span class="empty-icon"><span class="material-symbols-rounded" style="font-size:52px;font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 48">menu_book</span></span><div class="empty-text">${filter||ingFilter?'Nenhuma receita encontrada.':'Nenhuma receita salva ainda.'}</div></div>`;
        return;
      }
      el.innerHTML=f.map(r=>{
        const {totalCost,venda}=calcCosts(r.ingredients,r.markup);
        const changed=hasPriceChanged(r.ingredients);
        const diff=totalCost-r.totalCost;
        const recipeId=escapeAttribute(r.id);
        const nutritionSummary=getRecipeNutritionSummary(r);
        return`<div class="recipe-card" data-recipe-id="${recipeId}" tabindex="0" role="group" aria-label="Abrir detalhes da receita ${escapeAttribute(r.nome)}">
          ${renderRecipeMedia(r,"card")}
          <div class="recipe-card-heading">
            <div class="recipe-card-title">${escapeHtml(r.nome)}${r.origem==='scan'?` <span class="scan-badge" style="font-size:10px"><span class="material-symbols-rounded" style="font-size:12px">document_scanner</span>Scan</span>`:''}</div>
            <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
              ${changed?`<span style="font-size:11px;background:${diff>0?'var(--r100)':'var(--g50)'};color:${diff>0?'var(--r400)':'var(--g600)'};padding:2px 8px;border-radius:var(--r-pill);font-weight:700">${diff>0?'▲':'▼'} ${fmtBRL(Math.abs(diff))}</span>`:''}
              <span class="badge badge-green">${fmtBRL(totalCost)}</span>
              <span class="recipe-card-actions">
                <button class="btn btn-secondary btn-icon" data-recipe-action="edit" type="button" aria-label="Editar ${escapeAttribute(r.nome)}"><span class="material-symbols-rounded" aria-hidden="true">edit</span></button>
                <button class="btn btn-danger btn-icon" data-recipe-action="delete" type="button" aria-label="Excluir ${escapeAttribute(r.nome)}"><span class="material-symbols-rounded" aria-hidden="true">delete</span></button>
              </span>
            </div>
          </div>
          <div class="recipe-card-meta"><span class="material-symbols-rounded">fork_spoon</span>${r.ingredients.length} ingrediente(s) · ${r.porcoes} porção(ões)${r.rendimento?' · '+r.rendimento+'g':''} · Markup ${r.markup}%</div>
          <div class="recipe-card-meta" style="color:var(--g600);font-weight:700"><span class="material-symbols-rounded" style="color:var(--g500)">payments</span> Venda: ${fmtBRL(venda)}</div>
          <div class="recipe-card-meta" style="font-size:11px;color:var(--n500)"><span class="material-symbols-rounded" style="font-size:13px">nutrition</span> ${nutritionSummary.label}</div>
          ${changed?`<div class="recipe-card-meta" style="font-size:11px;color:var(--n400)"><span class="material-symbols-rounded" style="font-size:13px">sync</span> Preços atualizados</div>`:''}
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--s3)">
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              ${r.ingredients.slice(0,4).map(i=>`<span class="tag">${escapeHtml(i.name)}</span>`).join('')}
              ${r.ingredients.length>4?`<span class="tag">+${r.ingredients.length-4}</span>`:''}
            </div>
            <button class="btn btn-outlined btn-xs" data-recipe-action="pdf" style="margin-left:var(--s2)" type="button">
              <span class="material-symbols-rounded" style="font-size:14px">picture_as_pdf</span> PDF
            </button>
          </div>
        </div>`;
      }).join('');
      bindRecipeCardActions(el);
    }
    function setIngFilter(val){activeIngFilter=val;renderRecipes(document.getElementById('recipe-search').value,val);}
    function viewRecipe(id){
      const r=recipes.find(x=>String(x.id)===String(id));if(!r)return;
      currentRecipeId=id;
      const {ingredients,totalCost,venda}=calcCosts(r.ingredients,r.markup);
      const porcoes=Math.max(r.porcoes||1,1);
      const changed=hasPriceChanged(r.ingredients);
      const diff=totalCost-r.totalCost;
      const nutritionSummary=getRecipeNutritionSummary(r);
      document.getElementById('recipe-detail-content').innerHTML=`
        ${renderRecipeMedia(r,"modal")}
        <div style="font-size:20px;font-weight:800;margin-bottom:4px;letter-spacing:-0.4px">${escapeHtml(r.nome)}${r.origem==='scan'?` <span class="scan-badge" style="font-size:10px"><span class="material-symbols-rounded" style="font-size:12px">document_scanner</span>Scan</span>`:''}</div>
        <div style="font-size:12px;color:var(--n600);margin-bottom:${changed?'12px':'20px'};font-weight:500;display:flex;align-items:center;gap:4px">
          <span class="material-symbols-rounded" style="font-size:14px">calendar_today</span>
          Criada em ${new Date(r.createdAt).toLocaleDateString('pt-BR')} · ${r.ingredients.length} ingrediente(s)
        </div>
        ${changed?`<div style="background:${diff>0?'var(--r100)':'var(--g50)'};border:1px solid ${diff>0?'var(--r400)':'var(--g200)'};border-radius:var(--r-md);padding:var(--s3) var(--s4);margin-bottom:var(--s4);font-size:12px;color:${diff>0?'var(--r400)':'var(--g600)'};display:flex;align-items:flex-start;gap:var(--s2)">
          <span class="material-symbols-rounded" style="font-size:16px;flex-shrink:0">sync</span>
          <span><strong>Preços atualizados</strong><br>Custo salvo: ${fmtBRL(r.totalCost)} → Atual: <strong>${fmtBRL(totalCost)}</strong>${diff!==0?` (${diff>0?'+':''}${fmtBRL(diff)})`:''}  </span>
        </div>`:''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s2);margin-bottom:var(--s4)">
          ${[['Custo Total',fmtBRL(totalCost),'var(--n50)','var(--n900)','payments'],
             ['Preço de Venda',fmtBRL(venda),'var(--g50)','var(--g600)','sell'],
             ['Markup',r.markup+'%','var(--n50)','var(--n900)','trending_up'],
             ['Por Porção',fmtBRL(totalCost/porcoes),'var(--n50)','var(--n900)','restaurant']
            ].map(([l,v,bg,c,ico])=>`<div style="background:${bg};padding:var(--s3) var(--s4);border-radius:var(--r-md)">
              <div style="font-size:11px;color:var(--n600);font-weight:600;margin-bottom:3px;display:flex;align-items:center;gap:4px">
                <span class="material-symbols-rounded" style="font-size:13px">${ico}</span>${l}
              </div>
              <div style="font-size:16px;font-weight:800;font-family:'Roboto',sans-serif;color:${c}">${v}</div>
            </div>`).join('')}
        </div>
        <div style="font-size:11px;font-weight:700;color:var(--n600);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:var(--s2);display:flex;align-items:center;gap:4px">
          <span class="material-symbols-rounded" style="font-size:14px">nutrition</span> Nutricao por ${nutritionSummary.portion}g
        </div>
        <table class="nutrition-table" style="margin-bottom:var(--s4)">
          <tbody>${renderNutritionRows(nutritionSummary.nutrition)}</tbody>
        </table>
        <div style="font-size:11px;font-weight:700;color:var(--n600);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:var(--s2);display:flex;align-items:center;gap:4px">
          <span class="material-symbols-rounded" style="font-size:14px">format_list_bulleted</span> Ingredientes
        </div>
        ${ingredients.map(i=>{
          const s=findStockItem(i.stockId,i.name);
          const curPPG=s?pricePerUnit(s):0;
          const ingChanged=i.savedPricePerG&&Math.abs(curPPG-i.savedPricePerG)>0.000001;
          return`<div class="ingredient-row">
            <div style="flex:1;min-width:0">
              <div class="ing-name">${escapeHtml(i.name)}${ingChanged?` <span style="font-size:10px;font-weight:700;color:${curPPG>i.savedPricePerG?'var(--r400)':'var(--g500)'}">${curPPG>i.savedPricePerG?'▲':'▼'}</span>`:''}</div>
              <div class="ing-qty">${i.qtyBruta.toFixed(0)}${i.unit==='ml'?'ml':'g'}</div>
            </div>
            <div class="ing-cost" style="${ingChanged?'color:'+(curPPG>i.savedPricePerG?'var(--r400)':'var(--g500)'):''}"> ${fmtBRL(i.cost)}</div>
          </div>`;
        }).join('')}
        ${r.modoPreparo?`<div style="margin-top:var(--s4)">
          <div style="font-size:11px;font-weight:700;color:var(--n600);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:var(--s2);display:flex;align-items:center;gap:4px">
            <span class="material-symbols-rounded" style="font-size:14px">menu_book</span> Modo de Preparo
          </div>
          <div style="font-size:13px;color:var(--n800);line-height:1.7;background:var(--n50);border-radius:var(--r-md);padding:var(--s3) var(--s4)">${escapeHtml(r.modoPreparo).replace(/\n/g,'<br>')}</div>
        </div>`:''}
        ${r.observacoes?`<div style="margin-top:var(--s3);font-size:12px;color:var(--n600);background:var(--warn-bg);border-radius:var(--r-md);padding:var(--s3) var(--s4);line-height:1.6">
          <strong>Obs:</strong> ${escapeHtml(r.observacoes).replace(/\n/g,'<br>')}</div>`:''}`;
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
      currentIngredients=[...r.ingredients];
      recipeImageOperationId+=1;
      setRecipeImageProcessing(false);
      document.getElementById('ficha-nome').value=r.nome;
      document.getElementById('ficha-rendimento').value=r.rendimento||'';
      document.getElementById('ficha-porcoes').value=r.porcoes||'';
      document.getElementById('markup-pct').value=r.markup||'';
      document.getElementById('portion-size').value=r.porcaoSize||100;
      currentRecipeImage=normalizeRecipeImage(r.image);
      recipeImageDirty=false;
      const {input}=getRecipeImageElements();
      if(input)input.value='';
      bindRecipeImageEditor();
      renderRecipeImageEditor();
      renderIngredients();calcFicha();showPage('ficha','nav-ficha');
    }
    
    /* ══ PDF ══ */
    function exportRecipePDF(id){
      const r=recipes.find(x=>String(x.id)===String(id));if(!r)return;
      const {ingredients,totalCost,venda}=calcCosts(r.ingredients,r.markup);
      const porcoes=Math.max(r.porcoes||1,1);
      const now=new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
      const criado=new Date(r.createdAt).toLocaleDateString('pt-BR');
      const changed=hasPriceChanged(r.ingredients);
      const nutritionSummary=getRecipeNutritionSummary(r);
      const recipeImageSource=resolveImageSource(normalizeRecipeImage(r.image),r);
      const safeRecipeName=escapeHtml(r.nome);
      const rows=ingredients.map(i=>`<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #F0F0F0;font-size:13px;font-weight:500">${escapeHtml(i.name)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #F0F0F0;font-size:12px;color:#717171;font-family:monospace">${i.qtyBruta.toFixed(0)}${i.unit==='ml'?'ml':'g'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #F0F0F0;font-size:12px;color:#27AE60;font-family:monospace;font-weight:700;text-align:right">${fmtBRL(i.cost)}</td>
      </tr>`).join('');
      const nutritionRows=nutritionFields.map(([key,label,unit,dailyValue])=>{
        const value=readNumericValue(nutritionSummary.nutrition[key],0);
        const pct=dailyValue?`${Math.round((value/dailyValue)*100)}%`:'-';
        return`<tr>
          <td>${label}</td>
          <td>${formatNutritionValue(value,unit)}</td>
          <td>${pct}</td>
        </tr>`;
      }).join('');
      const html=`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Ficha — ${safeRecipeName}</title>
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Roboto',sans-serif;color:#3E3E3E;padding:36px 40px;max-width:720px;margin:0 auto;line-height:1.5;-webkit-font-smoothing:antialiased}
        @media print{body{padding:20px 24px}.no-print{display:none!important}@page{margin:15mm 18mm;size:A4}}
        .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #27AE60}
        .logo{display:flex;align-items:center;gap:12px}
        .logo-box{width:40px;height:40px;background:#27AE60;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:800}
        .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px 0 24px}
        .si{background:#F7F7F7;border-radius:12px;padding:12px 14px}
        .si.hl{background:#27AE60}
        .sl{font-size:10px;color:#717171;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:4px;font-weight:700}
        .sl.hl{color:rgba(255,255,255,0.8)}
        .sv{font-size:16px;font-weight:800;font-family:'Roboto',sans-serif;color:#3E3E3E}
        .sv.hl{color:#fff}
        table{width:100%;border-collapse:collapse;border:1px solid #E0E0E0;border-radius:12px;overflow:hidden}
        thead tr{background:#F7F7F7}
        th{padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#717171;text-transform:uppercase;letter-spacing:0.5px}
        th:last-child{text-align:right}
        .section-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.7px;color:#717171;margin:22px 0 8px}
        .nutrition-report{margin-bottom:18px;page-break-inside:avoid}
        .nutrition-report td{padding:9px 12px;border-bottom:1px solid #F0F0F0;font-size:12px;color:#3E3E3E}
        .nutrition-report td:nth-child(2){font-family:'Roboto',sans-serif;font-weight:700;text-align:right}
        .nutrition-report td:last-child{font-family:'Roboto',sans-serif;text-align:right;color:#4A7745}
        .nutrition-report tr:last-child td{border-bottom:none}
        tfoot td{padding:10px 12px;font-size:13px;font-weight:800;border-top:2px solid #E0E0E0;background:#F7F7F7}
        tfoot td:last-child{text-align:right;color:#27AE60;font-family:'Roboto',sans-serif}
        footer{margin-top:28px;padding-top:12px;border-top:1px solid #E0E0E0;display:flex;justify-content:space-between;font-size:11px;color:#BDBDBD}
        .btn-print{display:inline-flex;align-items:center;gap:8px;background:#27AE60;color:#fff;border:none;padding:12px 24px;border-radius:999px;font-size:14px;font-family:'Roboto',sans-serif;font-weight:700;cursor:pointer;margin-bottom:20px}
        .prep{background:#F7F7F7;border-radius:10px;padding:14px 16px;margin-top:20px;font-size:13px;line-height:1.8;color:#3E3E3E}
        .prep-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#717171;margin-bottom:8px}
        .recipe-cover{width:100%;height:220px;object-fit:cover;border-radius:16px;margin:0 0 20px;display:block;page-break-inside:avoid}
      </style></head><body>
      <div class="no-print" style="display:flex;gap:12px;align-items:center;margin-bottom:20px">
        <button class="btn-print" onclick="window.print()">Salvar / Imprimir PDF</button>
        <span style="font-size:12px;color:#BDBDBD">Selecione "Salvar como PDF"</span>
      </div>
      <div class="header">
        <div class="logo">
          <div class="logo-box">FT</div>
          <div><div style="font-size:18px;font-weight:800;color:#1A1A1A">FichaTec</div><div style="font-size:11px;color:#BDBDBD">Fichas Técnicas & Estoque</div></div>
        </div>
        <div style="text-align:right;font-size:11px;color:#BDBDBD;line-height:2"><div>Gerado em ${now}</div><div>Criado em ${criado}</div>${r.origem==='scan'?'<div style="color:#27AE60;font-weight:700">📷 Digitalizada</div>':''}</div>
      </div>
      ${recipeImageSource?`<img class="recipe-cover" src="${escapeAttribute(recipeImageSource)}" alt="Imagem da receita ${escapeAttribute(r.nome)}" width="640" height="360">`:''}
      <div style="margin-bottom:20px">
        <div style="font-size:22px;font-weight:800;margin-bottom:4px;letter-spacing:-0.5px">${safeRecipeName}</div>
        <div style="font-size:12px;color:#717171;font-weight:500">${r.ingredients.length} ingrediente(s) · ${r.porcoes} porção(ões)${r.rendimento?' · Rendimento: '+r.rendimento+'g':''}${r.markup?' · Markup: '+r.markup+'%':''}</div>
      </div>
      ${changed?`<div style="background:#E8F8EE;border:1px solid #8FD9AB;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#1E8449;font-weight:600">Precos atualizados. Custo original: ${fmtBRL(r.totalCost)}.</div>`:''}
      <div class="summary">
        <div class="si"><div class="sl">Custo Total</div><div class="sv">${fmtBRL(totalCost)}</div></div>
        <div class="si hl"><div class="sl hl">Preco de Venda</div><div class="sv hl">${fmtBRL(venda)}</div></div>
        <div class="si"><div class="sl">Por Porcao</div><div class="sv">${fmtBRL(totalCost/porcoes)}</div></div>
        <div class="si"><div class="sl">Markup</div><div class="sv">${r.markup||0}%</div></div>
      </div>
      <div class="section-title">Nutricao por ${nutritionSummary.portion}g</div>
      <table class="nutrition-report">
        <thead><tr><th>Nutriente</th><th style="text-align:right">Valor</th><th style="text-align:right">%VD</th></tr></thead>
        <tbody>${nutritionRows}</tbody>
      </table>
      <div class="section-title">Ingredientes</div>
      <table><thead><tr><th>Ingrediente</th><th>Quantidade</th><th style="text-align:right">Custo</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="2">Total</td><td>${fmtBRL(totalCost)}</td></tr></tfoot></table>
      ${r.modoPreparo?`<div class="prep"><div class="prep-title">Modo de Preparo</div>${escapeHtml(r.modoPreparo).replace(/\n/g,'<br>')}</div>`:''}
      ${r.observacoes?`<div style="margin-top:12px;background:#FFF4E5;border-radius:10px;padding:12px 16px;font-size:12px;color:#FF8C00"><strong>Observações:</strong> ${escapeHtml(r.observacoes).replace(/\n/g,'<br>')}</div>`:''}
      <footer><span>FichaTec</span><span>${safeRecipeName} · ${now}</span></footer>
      </body></html>`;
      const win=window.open('','_blank','width=800,height=920');
      if(!win){showToast('Permita pop-ups para gerar o PDF.');return;}
      win.document.write(html);win.document.close();
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

    return {
      findStockItem: runWithState(findStockItem, {commit:false}),
      calcCosts: runWithState(calcCosts, {commit:false}),
      setIngSource: runWithState(setIngSource),
      searchIngredient: runWithState(searchIngredient),
      selectIngredient: runWithState(selectIngredient),
      calcIngCost: runWithState(calcIngCost),
      addIngredient: runWithState(addIngredient),
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
