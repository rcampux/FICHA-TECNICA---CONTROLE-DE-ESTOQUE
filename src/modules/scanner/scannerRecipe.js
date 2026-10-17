(function exposeScannerRecipeModule() {
  function createScannerRecipeModule(deps) {
    const {
      calcCosts,
      closeModal,
      confirmAction,
      db: DB,
      findStockItem,
      getNutrition,
      getRecipes,
      getStock,
      pricePerUnit,
      renderRecipes,
      requireFeature,
      setRecipes,
      showPage,
      showToast,
      storageKeys: STORAGE_KEYS,
    } = deps;

    let scannedRecipeData = null;
    let stock = getStock();
    let recipes = getRecipes();
    let scanOperationId = 0;
    let scanAbortController = null;
    let scanSaveInFlight = false;
    const ALLOWED_SCAN_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
    const MAX_SCAN_IMAGE_BYTES = 10 * 1024 * 1024;

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]);
    }

    function syncState() {
      stock = getStock();
      recipes = getRecipes();
    }

    function commitState() {
      setRecipes(recipes);
    }

    function openScanModal() {
      if (requireFeature && !requireFeature("scanRecipe")) return;
      resetScan();
      document.getElementById("modal-scan").classList.add("open");
    }

    function resetScan() {
      scanOperationId += 1;
      scanAbortController?.abort();
      scanAbortController = null;
      scannedRecipeData = null;
      document.getElementById("scan-preview-wrap").innerHTML = `
        <div class="scan-preview-placeholder">
          <span class="material-symbols-rounded">image_search</span>
          <p>A foto da receita aparecera aqui</p>
        </div>`;
      document.getElementById("scan-status-area").innerHTML = "";
      document.getElementById("scan-result-area").style.display = "none";
      document.getElementById("scan-cancel-wrap").style.display = "block";
      document.getElementById("scan-input-camera").value = "";
      document.getElementById("scan-input-gallery").value = "";
      document.getElementById("scan-nome").value = "";
      document.getElementById("scan-rendimento").value = "";
      document.getElementById("scan-porcoes").value = "";
      document.getElementById("scan-modo-preparo").value = "";
      document.getElementById("scan-obs").value = "";
      document.getElementById("scan-modo-preparo-wrap").style.display = "none";
      document.getElementById("scan-obs-wrap").style.display = "none";
    }

    function setScanStatus(type, msg) {
      const icons = {loading:"hourglass_top",success:"check_circle",error:"error"};
      const safeType = Object.hasOwn(icons, type) ? type : "error";
      document.getElementById("scan-status-area").innerHTML =
        `<div class="scan-status-box ${safeType}">
          <span class="material-symbols-rounded ${safeType==="loading"?"spin":""}">${icons[safeType]}</span>
          <span>${escapeHtml(msg)}</span>
        </div>`;
    }

    function setScanSaveBusy(isBusy) {
      scanSaveInFlight = Boolean(isBusy);
      const shell = document.getElementById("app-shell");
      const modalOverlay = document.getElementById("modal-scan");
      const modalPanel = document.querySelector("#modal-scan > .modal");
      const saveButton = document.getElementById("scan-save-button");
      const newPhotoButton = document.getElementById("scan-new-photo-button");
      if (shell) {
        shell.setAttribute("aria-busy", String(scanSaveInFlight));
        if ("inert" in shell) {
          shell.inert = scanSaveInFlight || shell.hidden || shell.getAttribute("aria-hidden") === "true";
        }
      }
      if (modalOverlay) {
        modalOverlay.setAttribute("aria-busy", String(scanSaveInFlight));
        if (scanSaveInFlight) modalOverlay.dataset.busy = "true";
        else delete modalOverlay.dataset.busy;
      }
      if (modalPanel) {
        modalPanel.setAttribute("aria-busy", String(scanSaveInFlight));
        if ("inert" in modalPanel) modalPanel.inert = scanSaveInFlight;
      }
      if (saveButton) {
        saveButton.disabled = scanSaveInFlight;
        saveButton.setAttribute("aria-busy", String(scanSaveInFlight));
      }
      if (newPhotoButton) newPhotoButton.disabled = scanSaveInFlight;
    }

    async function handleScanFile(event) {
      const input = event?.target;
      const file = input?.files?.[0];
      if (!file) return;
      const operationId = ++scanOperationId;
      scanAbortController?.abort();
      scanAbortController = null;
      scannedRecipeData = null;
      document.getElementById("scan-preview-wrap").innerHTML = `
        <div class="scan-preview-placeholder">
          <span class="material-symbols-rounded">image_search</span>
          <p>Preparando a nova foto...</p>
        </div>`;
      document.getElementById("scan-status-area").innerHTML = "";
      document.getElementById("scan-result-area").style.display = "none";
      document.getElementById("scan-cancel-wrap").style.display = "block";
      document.getElementById("scan-nome").value = "";
      document.getElementById("scan-rendimento").value = "";
      document.getElementById("scan-porcoes").value = "";
      document.getElementById("scan-modo-preparo").value = "";
      document.getElementById("scan-obs").value = "";
      document.getElementById("scan-modo-preparo-wrap").style.display = "none";
      document.getElementById("scan-obs-wrap").style.display = "none";
      if (!ALLOWED_SCAN_IMAGE_TYPES.has(file.type)) {
        setScanStatus("error", "Use uma imagem JPG, PNG ou WebP.");
        showToast("Formato de imagem nao suportado.");
        input.value = "";
        return;
      }
      if (file.size > MAX_SCAN_IMAGE_BYTES) {
        setScanStatus("error", "A imagem deve ter no maximo 10 MB.");
        showToast("Escolha uma imagem de ate 10 MB.");
        input.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = async (readEvent) => {
        if (operationId !== scanOperationId) return;
        try {
          const base64 = readEvent.target?.result;
          if (typeof base64 !== "string") throw new Error("Nao foi possivel ler a imagem.");
          const previewImage = document.createElement("img");
          previewImage.src = base64;
          previewImage.alt = "Receita enviada para digitalizacao";
          document.getElementById("scan-preview-wrap").replaceChildren(previewImage);
          document.getElementById("scan-result-area").style.display = "none";
          document.getElementById("scan-cancel-wrap").style.display = "none";
          setScanStatus("loading", "Preparando a imagem...");
          const compressed = await compressImage(base64, 1400, 0.88);
          if (operationId !== scanOperationId) return;
          await analyzeRecipeImage(compressed, operationId);
        } catch (error) {
          if (operationId !== scanOperationId || error?.name === "AbortError") return;
          console.error("Scan image error:", error);
          setScanStatus("error", error?.message || "Nao foi possivel preparar esta imagem.");
          document.getElementById("scan-cancel-wrap").style.display = "block";
        }
      };
      reader.onerror = () => {
        if (operationId !== scanOperationId) return;
        setScanStatus("error", "Nao foi possivel ler este arquivo. Escolha outra imagem.");
        document.getElementById("scan-cancel-wrap").style.display = "block";
      };
      reader.readAsDataURL(file);
    }

    function compressImage(base64, maxDimension, quality) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;
            if (!width || !height) throw new Error("A imagem esta vazia ou corrompida.");
            const scale = Math.min(1, maxDimension / Math.max(width, height));
            width = Math.max(1, Math.round(width * scale));
            height = Math.max(1, Math.round(height * scale));
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d");
            if (!context) throw new Error("O navegador nao conseguiu preparar a imagem.");
            context.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", quality));
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error("A imagem esta corrompida ou nao pode ser aberta."));
        img.src = base64;
      });
    }

    async function analyzeRecipeImage(base64, operationId = scanOperationId) {
      const controller = new AbortController();
      scanAbortController?.abort();
      scanAbortController = controller;
      setScanStatus("loading", "Lendo a receita com IA... aguarde alguns segundos.");
      try {
        const response = await fetch("/api/scan-recipe", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({image:base64}),
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (operationId !== scanOperationId) return;
        if (response.status === 404) {
          throw new Error("A digitalizacao por IA ainda nao esta configurada neste ambiente.");
        }
        if (!response.ok || !data.success) throw new Error(data.error || "Erro ao processar imagem.");

        scannedRecipeData = data.recipe;
        renderScanResult(data.recipe);
        setScanStatus("success", "Receita lida! Revise e salve abaixo.");
        document.getElementById("scan-cancel-wrap").style.display = "none";
      } catch (error) {
        if (error?.name === "AbortError" || operationId !== scanOperationId) return;
        setScanStatus("error", "Erro: " + (error.message || "Falha ao processar. Tente outra foto."));
        document.getElementById("scan-cancel-wrap").style.display = "block";
        console.error("Scan error:", error);
      } finally {
        if (operationId === scanOperationId && scanAbortController === controller) {
          scanAbortController = null;
        }
      }
    }

    function renderScanResult(recipe) {
      document.getElementById("scan-nome").value = String(recipe?.nome || "");
      document.getElementById("scan-rendimento").value = Number(recipe?.rendimento) || "";
      document.getElementById("scan-porcoes").value = Number(recipe?.porcoes) || "";

      const ingredients = Array.isArray(recipe?.ingredientes) ? recipe.ingredientes : [];
      document.getElementById("scan-ing-count-badge").textContent = ingredients.length;
      document.getElementById("scan-ing-list").innerHTML = ingredients.length
        ? ingredients.map((ingredient, index) => `
          <div class="scan-ing-row">
            <div class="scan-ing-name">${escapeHtml(ingredient?.nome)}</div>
            <div class="scan-ing-qty">${escapeHtml(ingredient?.quantidade)} ${escapeHtml(ingredient?.unidade)}</div>
            <button class="scan-ing-del" onclick="removeScanIng(${index})" type="button" title="Remover" aria-label="Remover ingrediente">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>`).join("")
        : `<div style="font-size:13px;color:var(--n400);padding:8px">Nenhum ingrediente identificado</div>`;

      const prepWrap = document.getElementById("scan-modo-preparo-wrap");
      if (recipe?.modoPreparo) {
        prepWrap.style.display = "block";
        document.getElementById("scan-modo-preparo").value = String(recipe.modoPreparo);
      } else {
        prepWrap.style.display = "none";
        document.getElementById("scan-modo-preparo").value = "";
      }

      const obsWrap = document.getElementById("scan-obs-wrap");
      if (recipe?.observacoes) {
        obsWrap.style.display = "block";
        document.getElementById("scan-obs").value = String(recipe.observacoes);
      } else {
        obsWrap.style.display = "none";
        document.getElementById("scan-obs").value = "";
      }

      document.getElementById("scan-result-area").style.display = "block";
    }

    async function removeScanIng(index) {
      if (scanSaveInFlight) return;
      if (!scannedRecipeData || !scannedRecipeData.ingredientes) return;
      if (!await confirmAction("Deseja remover este ingrediente digitalizado?", "Remover ingrediente")) return;
      scannedRecipeData.ingredientes.splice(index, 1);
      renderScanResult(scannedRecipeData);
    }

    async function confirmScanSave() {
      if (scanSaveInFlight) return;
      setScanSaveBusy(true);
      try {
      syncState();

      const nome = document.getElementById("scan-nome").value.trim();
      if (!nome) {
        showToast("Informe o nome da receita.");
        return;
      }

      const scannedIngredients = (Array.isArray(scannedRecipeData?.ingredientes)
        ? scannedRecipeData.ingredientes
        : [])
        .map((ingredient) => ({
          name: String(ingredient?.nome || "").trim(),
          quantity: Number(ingredient?.quantidade),
          unit: String(ingredient?.unidade || "g").trim().toLocaleLowerCase("pt-BR"),
        }))
        .filter((ingredient) => ingredient.name && Number.isFinite(ingredient.quantity) && ingredient.quantity > 0);
      if (!scannedIngredients.length) {
        showToast("Nenhum ingrediente para salvar.");
        return;
      }

      const rendimento = parseFloat(document.getElementById("scan-rendimento").value) || 0;
      const porcoes = Math.max(parseFloat(document.getElementById("scan-porcoes").value) || 1, 1);
      const mapped = scannedIngredients.map((ingredient) => {
        const isUnit = ingredient.unit === "un";
        const qtyG = isUnit ? ingredient.quantity : (ingredient.unit === "kg" ? ingredient.quantity * 1000 : ingredient.quantity);
        const ingredientSearchName = ingredient.name.toLocaleLowerCase("pt-BR");
        const stockItem = stock.find((item) => {
          const stockName = String(item?.name || "").toLocaleLowerCase("pt-BR");
          return stockName === ingredientSearchName
            || stockName.includes(ingredientSearchName)
            || ingredientSearchName.includes(stockName);
        }
        ) || null;
        const pricePerGram = stockItem ? pricePerUnit(stockItem) : 0;
        return {
          id: Date.now() + Math.random(),
          stockId: stockItem ? stockItem.id : null,
          physicalId: null,
          source: "virtual",
          name: ingredient.name,
          qtyG,
          qtyBruta: qtyG,
          unit: ingredient.unit,
          rendimento: 100,
          cost: pricePerGram * qtyG,
          nutrition: stockItem?.nutrition || getNutrition(ingredient.name),
          savedPricePerG: pricePerGram,
        };
      });

      const {totalCost, venda} = calcCosts(mapped, 0);
      const modoPreparo = document.getElementById("scan-modo-preparo").value.trim() || null;
      const observacoes = document.getElementById("scan-obs").value.trim() || null;
      const index = recipes.findIndex((item) => item.nome.toLowerCase() === nome.toLowerCase());
      const existingRecipe = index >= 0 ? recipes[index] : null;
      const previousRecipes = [...recipes];
      const recipe = {
        id: existingRecipe?.id || Date.now(),
        remoteId: existingRecipe?.remoteId,
        nome,
        ingredients: mapped,
        rendimento,
        porcoes,
        yieldUnit: existingRecipe?.yieldUnit === "unit" ? "unit" : "portion",
        markup: 0,
        totalCost,
        venda,
        porcaoSize: 100,
        image: existingRecipe?.image || null,
        imagePath: existingRecipe?.image?.path || existingRecipe?.imagePath || null,
        createdAt: existingRecipe?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        origem: "scan",
        modoPreparo,
        observacoes,
      };

      const nextRecipes = [...recipes];
      if (index >= 0) {
        if (!await confirmAction(`Receita "${nome}" ja existe. Deseja sobrescrever?`, "Sobrescrever receita", "Sim, sobrescrever")) return;
        nextRecipes[index] = recipe;
      } else {
        nextRecipes.push(recipe);
      }
      recipes = nextRecipes;

      const organizationId = DB.activeOrganizationId?.();
      if (DB.mode?.() === "supabase" && !organizationId) {
        showToast("Workspace Supabase ativo nao encontrado.");
        return;
      }
      if (DB.mode?.() === "supabase" && DB.saveRemote && organizationId) {
        try {
          const savedRecipes = await DB.saveRemote(STORAGE_KEYS.recipes, recipes, organizationId);
          if (Array.isArray(savedRecipes)) recipes = savedRecipes;
        } catch (error) {
          console.error(error);
          recipes = previousRecipes;
          if (DB.saveLocal) DB.saveLocal(STORAGE_KEYS.recipes, previousRecipes);
          else DB.save(STORAGE_KEYS.recipes, previousRecipes);
          showToast("Nao foi possivel salvar a receita digitalizada no Supabase.");
          return;
        }
      }

      if (DB.saveLocal) DB.saveLocal(STORAGE_KEYS.recipes, recipes);
      else DB.save(STORAGE_KEYS.recipes, recipes);
      commitState();
      closeModal("modal-scan");
      resetScan();
      showPage("receitas", "nav-receitas");
      renderRecipes("", null);
      showToast(`"${nome}" digitalizada e salva.`);
      } finally {
        setScanSaveBusy(false);
      }
    }

    return {
      openScanModal,
      resetScan,
      setScanStatus,
      handleScanFile,
      compressImage,
      analyzeRecipeImage,
      renderScanResult,
      removeScanIng,
      confirmScanSave,
      escapeHtml,
    };
  }

  window.FichaTecScannerRecipe = {
    createScannerRecipeModule,
  };
})();
