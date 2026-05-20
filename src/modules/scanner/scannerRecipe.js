(function exposeScannerRecipeModule() {
  function createScannerRecipeModule(deps) {
    const {
      calcCosts,
      closeModal,
      db: DB,
      findStockItem,
      getNutrition,
      getRecipes,
      getStock,
      pricePerUnit,
      renderRecipes,
      setRecipes,
      showPage,
      showToast,
      storageKeys: STORAGE_KEYS,
    } = deps;

    let scannedRecipeData = null;
    let stock = getStock();
    let recipes = getRecipes();

    function syncState() {
      stock = getStock();
      recipes = getRecipes();
    }

    function commitState() {
      setRecipes(recipes);
    }

    function openScanModal() {
      resetScan();
      document.getElementById("modal-scan").classList.add("open");
    }

    function resetScan() {
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
    }

    function setScanStatus(type, msg) {
      const icons = {loading:"hourglass_top",success:"check_circle",error:"error"};
      document.getElementById("scan-status-area").innerHTML =
        `<div class="scan-status-box ${type}">
          <span class="material-symbols-rounded ${type==="loading"?"spin":""}">${icons[type]}</span>
          <span>${msg}</span>
        </div>`;
    }

    async function handleScanFile(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (readEvent) => {
        const base64 = readEvent.target.result;
        document.getElementById("scan-preview-wrap").innerHTML = `<img src="${base64}" alt="Receita">`;
        document.getElementById("scan-result-area").style.display = "none";
        document.getElementById("scan-cancel-wrap").style.display = "none";
        const compressed = await compressImage(base64, 1400, 0.88);
        await analyzeRecipeImage(compressed);
      };
      reader.readAsDataURL(file);
    }

    function compressImage(base64, maxWidth, quality) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = base64;
      });
    }

    async function analyzeRecipeImage(base64) {
      setScanStatus("loading", "Lendo a receita com IA... aguarde alguns segundos.");
      try {
        const response = await fetch("/api/scan-recipe", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({image:base64}),
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "Erro ao processar imagem.");

        scannedRecipeData = data.recipe;
        renderScanResult(data.recipe);
        setScanStatus("success", "Receita lida! Revise e salve abaixo.");
        document.getElementById("scan-cancel-wrap").style.display = "none";
      } catch (error) {
        setScanStatus("error", "Erro: " + (error.message || "Falha ao processar. Tente outra foto."));
        document.getElementById("scan-cancel-wrap").style.display = "block";
        console.error("Scan error:", error);
      }
    }

    function renderScanResult(recipe) {
      document.getElementById("scan-nome").value = recipe.nome || "";
      document.getElementById("scan-rendimento").value = recipe.rendimento || "";
      document.getElementById("scan-porcoes").value = recipe.porcoes || "";

      const ingredients = recipe.ingredientes || [];
      document.getElementById("scan-ing-count-badge").textContent = ingredients.length;
      document.getElementById("scan-ing-list").innerHTML = ingredients.length
        ? ingredients.map((ingredient, index) => `
          <div class="scan-ing-row">
            <div class="scan-ing-name">${ingredient.nome}</div>
            <div class="scan-ing-qty">${ingredient.quantidade} ${ingredient.unidade}</div>
            <button class="scan-ing-del" onclick="removeScanIng(${index})" title="Remover">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>`).join("")
        : `<div style="font-size:13px;color:var(--n400);padding:8px">Nenhum ingrediente identificado</div>`;

      const prepWrap = document.getElementById("scan-modo-preparo-wrap");
      if (recipe.modoPreparo) {
        prepWrap.style.display = "block";
        document.getElementById("scan-modo-preparo").value = recipe.modoPreparo;
      } else {
        prepWrap.style.display = "none";
      }

      const obsWrap = document.getElementById("scan-obs-wrap");
      if (recipe.observacoes) {
        obsWrap.style.display = "block";
        document.getElementById("scan-obs").value = recipe.observacoes;
      } else {
        obsWrap.style.display = "none";
      }

      document.getElementById("scan-result-area").style.display = "block";
    }

    function removeScanIng(index) {
      if (!scannedRecipeData || !scannedRecipeData.ingredientes) return;
      scannedRecipeData.ingredientes.splice(index, 1);
      renderScanResult(scannedRecipeData);
    }

    function confirmScanSave() {
      syncState();

      const nome = document.getElementById("scan-nome").value.trim();
      if (!nome) {
        showToast("Informe o nome da receita.");
        return;
      }

      const scannedIngredients = scannedRecipeData?.ingredientes || [];
      if (!scannedIngredients.length) {
        showToast("Nenhum ingrediente para salvar.");
        return;
      }

      const rendimento = parseFloat(document.getElementById("scan-rendimento").value) || 0;
      const porcoes = Math.max(parseFloat(document.getElementById("scan-porcoes").value) || 1, 1);
      const mapped = scannedIngredients.map((ingredient) => {
        const isUnit = ingredient.unidade === "un";
        const qtyG = isUnit ? ingredient.quantidade : (ingredient.unidade === "kg" ? ingredient.quantidade * 1000 : ingredient.quantidade);
        const stockItem = stock.find((item) =>
          item.name.toLowerCase() === ingredient.nome.toLowerCase() ||
          item.name.toLowerCase().includes(ingredient.nome.toLowerCase()) ||
          ingredient.nome.toLowerCase().includes(item.name.toLowerCase())
        ) || null;
        const pricePerGram = stockItem ? pricePerUnit(stockItem) : 0;
        return {
          id: Date.now() + Math.random(),
          stockId: stockItem ? stockItem.id : null,
          physicalId: null,
          source: "virtual",
          name: ingredient.nome,
          qtyG,
          qtyBruta: qtyG,
          unit: ingredient.unidade,
          rendimento: 100,
          cost: pricePerGram * qtyG,
          nutrition: stockItem?.nutrition || getNutrition(ingredient.nome),
          savedPricePerG: pricePerGram,
        };
      });

      const {totalCost, venda} = calcCosts(mapped, 0);
      const modoPreparo = document.getElementById("scan-modo-preparo").value.trim() || null;
      const observacoes = document.getElementById("scan-obs").value.trim() || null;
      const recipe = {
        id: Date.now(),
        nome,
        ingredients: mapped,
        rendimento,
        porcoes,
        markup: 0,
        totalCost,
        venda,
        porcaoSize: 100,
        createdAt: new Date().toISOString(),
        origem: "scan",
        modoPreparo,
        observacoes,
      };

      const index = recipes.findIndex((item) => item.nome.toLowerCase() === nome.toLowerCase());
      if (index >= 0) {
        if (!confirm(`Receita "${nome}" ja existe. Sobrescrever?`)) return;
        recipes[index] = recipe;
      } else {
        recipes.push(recipe);
      }

      DB.save(STORAGE_KEYS.recipes, recipes);
      commitState();
      closeModal("modal-scan");
      resetScan();
      showPage("receitas", "nav-receitas");
      renderRecipes("", null);
      showToast(`"${nome}" digitalizada e salva.`);
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
    };
  }

  window.FichaTecScannerRecipe = {
    createScannerRecipeModule,
  };
})();
