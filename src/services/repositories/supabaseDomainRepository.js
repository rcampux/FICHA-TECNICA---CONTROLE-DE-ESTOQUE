(function exposeSupabaseDomainRepository() {
  const STORAGE_KEYS = window.FichaTecStorageKeys;

  function normalizeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function centsFromCurrency(value) {
    return Math.round(normalizeNumber(value) * 100);
  }

  function currencyFromCents(value) {
    return normalizeNumber(value) / 100;
  }

  function getRemoteId(item) {
    return item?.remoteId || (typeof item?.id === "string" && item.id.includes("-") ? item.id : null);
  }

  function mapNutritionToRemote(nutrition = {}, organizationId, productName) {
    return {
      organization_id: organizationId,
      source: "manual",
      product_name: productName,
      serving_size_g: 100,
      kcal: normalizeNumber(nutrition.kcal),
      carb_g: normalizeNumber(nutrition.carb),
      protein_g: normalizeNumber(nutrition.prot),
      fat_g: normalizeNumber(nutrition.fat),
      fiber_g: normalizeNumber(nutrition.fiber),
      sodium_mg: normalizeNumber(nutrition.sodium),
      raw_payload: nutrition || {},
    };
  }

  function mapNutritionFromRemote(row) {
    if (!row) return null;
    return {
      kcal: normalizeNumber(row.kcal),
      carb: normalizeNumber(row.carb_g),
      prot: normalizeNumber(row.protein_g),
      fat: normalizeNumber(row.fat_g),
      fiber: normalizeNumber(row.fiber_g),
      sodium: normalizeNumber(row.sodium_mg),
    };
  }

  function shouldReconcileDeletes(items) {
    return items.every((item) => Boolean(getRemoteId(item)));
  }

  async function softDeleteMissingRows(client, table, organizationId, items) {
    if (!shouldReconcileDeletes(items)) return;

    const remoteIds = items.map(getRemoteId);
    let query = client
      .from(table)
      .update({deleted_at: new Date().toISOString()})
      .eq("organization_id", organizationId)
      .is("deleted_at", null);

    if (remoteIds.length) {
      query = query.not("id", "in", `(${remoteIds.join(",")})`);
    }

    const {error} = await query;

    if (error) throw error;
  }

  async function deleteMissingRecipeIngredients(client, recipeId, ingredients) {
    if (!shouldReconcileDeletes(ingredients)) return;

    const remoteIds = ingredients.map(getRemoteId);
    let query = client
      .from("recipe_ingredients")
      .delete()
      .eq("recipe_id", recipeId);

    if (remoteIds.length) {
      query = query.not("id", "in", `(${remoteIds.join(",")})`);
    }

    const {error} = await query;

    if (error) throw error;
  }

  function mapStockToRemote(item, organizationId, nutritionFactId = null) {
    const remoteId = getRemoteId(item);
    return {
      ...(remoteId ? {id: remoteId} : {}),
      organization_id: organizationId,
      name: item.name,
      category: item.category || null,
      unit: item.unit || "kg",
      package_quantity: normalizeNumber(item.qty, 1),
      package_price_cents: centsFromCurrency(item.price),
      nutrition_fact_id: nutritionFactId,
      deleted_at: null,
    };
  }

  function mapStockFromRemote(row) {
    return {
      id: row.localId || row.id,
      remoteId: row.id,
      name: row.name,
      qty: normalizeNumber(row.package_quantity, 1),
      unit: row.unit || "kg",
      price: currencyFromCents(row.package_price_cents),
      category: row.category || "",
      nutrition: mapNutritionFromRemote(row.nutrition_facts) || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function mapPhysicalToRemote(item, organizationId, stockItemId = null) {
    const remoteId = getRemoteId(item);
    return {
      ...(remoteId ? {id: remoteId} : {}),
      organization_id: organizationId,
      stock_item_id: stockItemId,
      name: item.name,
      category: item.category || null,
      unit: item.unit || "kg",
      current_quantity: normalizeNumber(item.currentQty),
      desired_quantity: normalizeNumber(item.desiredQty),
      used_total: normalizeNumber(item.usedTotal),
      deleted_at: null,
    };
  }

  function mapPhysicalFromRemote(row) {
    return {
      id: row.localId || row.id,
      remoteId: row.id,
      stockRemoteId: row.stock_item_id,
      name: row.name,
      currentQty: normalizeNumber(row.current_quantity),
      desiredQty: normalizeNumber(row.desired_quantity),
      unit: row.unit || "kg",
      price: currencyFromCents(row.stock_items?.package_price_cents),
      category: row.category || row.stock_items?.category || "",
      usedTotal: normalizeNumber(row.used_total),
      history: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function mapRecipeToRemote(recipe, organizationId) {
    const remoteId = getRemoteId(recipe);
    return {
      ...(remoteId ? {id: remoteId} : {}),
      organization_id: organizationId,
      name: recipe.nome,
      yield_g: normalizeNumber(recipe.rendimento),
      portions: normalizeNumber(recipe.porcoes, 1),
      markup_percent: normalizeNumber(recipe.markup),
      portion_size_g: normalizeNumber(recipe.porcaoSize, 100),
      total_cost_cents: centsFromCurrency(recipe.totalCost),
      sale_price_cents: centsFromCurrency(recipe.venda),
      preparation_method: recipe.modoPreparo || null,
      notes: recipe.observacoes || null,
      origin: recipe.origem || "manual",
      deleted_at: null,
    };
  }

  function mapRecipeFromRemote(row) {
    return {
      id: row.localId || row.id,
      remoteId: row.id,
      nome: row.name,
      ingredients: (row.recipe_ingredients || []).map(mapRecipeIngredientFromRemote),
      rendimento: normalizeNumber(row.yield_g),
      porcoes: normalizeNumber(row.portions, 1),
      markup: normalizeNumber(row.markup_percent),
      totalCost: currencyFromCents(row.total_cost_cents),
      venda: currencyFromCents(row.sale_price_cents),
      porcaoSize: normalizeNumber(row.portion_size_g, 100),
      modoPreparo: row.preparation_method || "",
      observacoes: row.notes || "",
      origem: row.origin || "manual",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function mapRecipeIngredientToRemote(ingredient, recipeId, organizationId) {
    const remoteId = getRemoteId(ingredient);
    const stockRemoteId = ingredient.stockRemoteId || (typeof ingredient.stockId === "string" && ingredient.stockId.includes("-") ? ingredient.stockId : null);
    const physicalRemoteId = ingredient.physicalRemoteId || null;
    return {
      ...(remoteId ? {id: remoteId} : {}),
      organization_id: organizationId,
      recipe_id: recipeId,
      stock_item_id: stockRemoteId,
      physical_stock_item_id: physicalRemoteId,
      name: ingredient.name,
      unit: ingredient.unit || "g",
      used_quantity: normalizeNumber(ingredient.qtyG),
      gross_quantity: normalizeNumber(ingredient.qtyBruta),
      yield_percent: normalizeNumber(ingredient.rendimento, 100),
      cost_cents: centsFromCurrency(ingredient.cost),
      saved_unit_price_cents: centsFromCurrency(ingredient.savedPricePerG || 0),
      nutrition_snapshot: ingredient.nutrition || {},
    };
  }

  function mapRecipeIngredientFromRemote(row) {
    return {
      id: row.localId || row.id,
      remoteId: row.id,
      stockId: row.stock_item_id,
      stockRemoteId: row.stock_item_id,
      physicalId: row.physical_stock_item_id,
      physicalRemoteId: row.physical_stock_item_id,
      source: row.physical_stock_item_id ? "fisico" : "virtual",
      name: row.name,
      qtyG: normalizeNumber(row.used_quantity),
      qtyBruta: normalizeNumber(row.gross_quantity),
      unit: row.unit || "g",
      rendimento: normalizeNumber(row.yield_percent, 100),
      cost: currencyFromCents(row.cost_cents),
      savedPricePerG: currencyFromCents(row.saved_unit_price_cents),
      nutrition: row.nutrition_snapshot || {},
    };
  }

  async function upsertNutrition(client, item, organizationId) {
    if (!item?.nutrition) return null;
    const payload = mapNutritionToRemote(item.nutrition, organizationId, item.name);
    const {data, error} = await client
      .from("nutrition_facts")
      .insert(payload)
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  }

  async function listStockItems(client, organizationId) {
    const {data, error} = await client
      .from("stock_items")
      .select("*, nutrition_facts(*)")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name", {ascending: true});

    if (error) throw error;
    return (data || []).map(mapStockFromRemote);
  }

  async function saveStockItems(client, organizationId, items) {
    const saved = [];

    for (const item of items) {
      const nutritionFactId = await upsertNutrition(client, item, organizationId);
      const {data, error} = await client
        .from("stock_items")
        .upsert(mapStockToRemote(item, organizationId, nutritionFactId))
        .select("*, nutrition_facts(*)")
        .single();

      if (error) throw error;
      saved.push({...item, remoteId: data.id});
    }

    await softDeleteMissingRows(client, "stock_items", organizationId, saved);
    return saved;
  }

  async function listPhysicalStockItems(client, organizationId) {
    const {data, error} = await client
      .from("physical_stock_items")
      .select("*, stock_items(package_price_cents, category)")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name", {ascending: true});

    if (error) throw error;
    return (data || []).map(mapPhysicalFromRemote);
  }

  async function savePhysicalStockItems(client, organizationId, items) {
    const saved = [];

    for (const item of items) {
      const {data, error} = await client
        .from("physical_stock_items")
        .upsert(mapPhysicalToRemote(item, organizationId, item.stockRemoteId || null))
        .select("*")
        .single();

      if (error) throw error;
      saved.push({...item, remoteId: data.id});
    }

    await softDeleteMissingRows(client, "physical_stock_items", organizationId, saved);
    return saved;
  }

  async function listRecipes(client, organizationId) {
    const {data, error} = await client
      .from("recipes")
      .select("*, recipe_ingredients(*)")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("created_at", {ascending: false});

    if (error) throw error;
    return (data || []).map(mapRecipeFromRemote);
  }

  async function saveRecipes(client, organizationId, recipes) {
    const saved = [];

    for (const recipe of recipes) {
      const {data: savedRecipe, error: recipeError} = await client
        .from("recipes")
        .upsert(mapRecipeToRemote(recipe, organizationId))
        .select("*")
        .single();

      if (recipeError) throw recipeError;

      const ingredientRows = (recipe.ingredients || []).map((ingredient) =>
        mapRecipeIngredientToRemote(ingredient, savedRecipe.id, organizationId)
      );

      if (ingredientRows.length) {
        const {error: ingredientError} = await client
          .from("recipe_ingredients")
          .upsert(ingredientRows);

        if (ingredientError) throw ingredientError;
      }

      await deleteMissingRecipeIngredients(client, savedRecipe.id, recipe.ingredients || []);
      saved.push({...recipe, remoteId: savedRecipe.id});
    }

    await softDeleteMissingRows(client, "recipes", organizationId, saved);
    return saved;
  }

  function resolveDomain(key) {
    if (key === STORAGE_KEYS.stock) return {list:listStockItems, save:saveStockItems};
    if (key === STORAGE_KEYS.physicalStock) return {list:listPhysicalStockItems, save:savePhysicalStockItems};
    if (key === STORAGE_KEYS.recipes) return {list:listRecipes, save:saveRecipes};
    return null;
  }

  async function loadByKey(client, key, organizationId) {
    const domain = resolveDomain(key);
    if (!domain || !organizationId) return [];
    return domain.list(client, organizationId);
  }

  async function saveByKey(client, key, organizationId, value) {
    const domain = resolveDomain(key);
    if (!domain || !organizationId) return value;
    return domain.save(client, organizationId, value);
  }

  window.FichaTecSupabaseDomainRepository = {
    centsFromCurrency,
    currencyFromCents,
    getRemoteId,
    listPhysicalStockItems,
    listRecipes,
    listStockItems,
    loadByKey,
    mapPhysicalFromRemote,
    mapPhysicalToRemote,
    mapRecipeFromRemote,
    mapRecipeIngredientFromRemote,
    mapRecipeIngredientToRemote,
    mapRecipeToRemote,
    mapStockFromRemote,
    mapStockToRemote,
    mapNutritionFromRemote,
    mapNutritionToRemote,
    normalizeNumber,
    saveByKey,
    savePhysicalStockItems,
    saveRecipes,
    saveStockItems,
    deleteMissingRecipeIngredients,
    shouldReconcileDeletes,
    softDeleteMissingRows,
    upsertNutrition,
  };
})();
