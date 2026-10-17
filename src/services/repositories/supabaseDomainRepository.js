(function exposeSupabaseDomainRepository() {
  const STORAGE_KEYS = window.FichaTecStorageKeys;
  const RECIPE_IMAGE_BUCKET = "recipe-images";
  const RECIPE_IMAGE_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

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

  function normalizeRecipeImageMetadata(image) {
    if (image === null || image?.removed === true) return null;
    const src = typeof image === "string"
      ? image.trim()
      : String(image?.src || image?.url || image?.dataUrl || "").trim();
    const path = typeof image?.path === "string" ? image.path.trim().replace(/^\/+/, "") : "";
    if (!src && !path) return null;

    return {
      ...(src ? {src} : {}),
      ...(path ? {path} : {}),
      name: String(image?.name || "cover.jpg").slice(0, 180),
      type: String(image?.type || "image/jpeg").slice(0, 80),
      size: Math.max(0, normalizeNumber(image?.size, 0)),
      ...(normalizeNumber(image?.width, 0) > 0 ? {width:normalizeNumber(image.width)} : {}),
      ...(normalizeNumber(image?.height, 0) > 0 ? {height:normalizeNumber(image.height)} : {}),
      updatedAt: image?.updatedAt || null,
    };
  }

  function isRecipeImageDataUrl(value) {
    return /^data:image\/(?:jpeg|jpg|png|webp);base64,/i.test(String(value || ""));
  }

  function dataUrlToBlob(dataUrl) {
    const match = String(dataUrl || "").match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([a-z0-9+/=\s]+)$/i);
    if (!match) throw new Error("Formato da imagem da receita invalido.");

    const binary = window.atob(match[2].replace(/\s/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], {type:match[1].toLowerCase().replace("image/jpg", "image/jpeg")});
  }

  function getRecipeImagePath(organizationId, recipeId) {
    return `${organizationId}/${recipeId}/cover.jpg`;
  }

  async function createRecipeImageSignedUrl(client, path) {
    if (!path) return "";
    const {data, error} = await client.storage
      .from(RECIPE_IMAGE_BUCKET)
      .createSignedUrl(path, RECIPE_IMAGE_SIGNED_URL_TTL_SECONDS);
    if (error) {
      console.warn("Nao foi possivel assinar a imagem privada da receita.", error);
      return "";
    }
    return data?.signedUrl || data?.signedURL || "";
  }

  async function uploadRecipeImage(client, organizationId, recipeId, image) {
    const normalized = normalizeRecipeImageMetadata(image);
    if (!normalized || !isRecipeImageDataUrl(normalized.src)) {
      throw new Error("A capa da receita precisa ser uma imagem preparada pelo aplicativo.");
    }

    const path = getRecipeImagePath(organizationId, recipeId);
    const blob = dataUrlToBlob(normalized.src);
    if (blob.size > 5 * 1024 * 1024) {
      throw new Error("A imagem da receita excede o limite de 5 MB.");
    }
    const {error} = await client.storage
      .from(RECIPE_IMAGE_BUCKET)
      .upload(path, blob, {
        cacheControl: "3600",
        contentType: blob.type || normalized.type || "image/jpeg",
        upsert: true,
      });
    if (error) throw error;
    return path;
  }

  async function removeRecipeImage(client, paths) {
    const uniquePaths = [...new Set((paths || []).filter(Boolean))];
    if (!uniquePaths.length) return;
    const {error} = await client.storage.from(RECIPE_IMAGE_BUCKET).remove(uniquePaths);
    if (error) throw error;
  }

  async function updateRecipeImagePath(client, organizationId, recipeId, imagePath) {
    const {data, error} = await client
      .from("recipes")
      .update({image_path: imagePath || null})
      .eq("id", recipeId)
      .eq("organization_id", organizationId)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async function hydrateRecipeImage(client, recipe) {
    const image = normalizeRecipeImageMetadata(recipe?.image);
    if (!image?.path) return recipe;
    const signedUrl = await createRecipeImageSignedUrl(client, image.path);
    return {
      ...recipe,
      image: {
        ...image,
        ...(signedUrl ? {src:signedUrl} : {}),
      },
    };
  }

  function getNutritionRawPayload(row) {
    const payload = row?.raw_payload;
    return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
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
      raw_payload: {
        ...(nutrition || {}),
        portionSize: normalizeNumber(nutrition.portionSize, 100),
        satFat: normalizeNumber(nutrition.satFat, 0),
        transFat: normalizeNumber(nutrition.transFat, 0),
      },
    };
  }

  function mapNutritionFromRemote(row) {
    if (!row) return null;
    const rawPayload = getNutritionRawPayload(row);
    return {
      kcal: normalizeNumber(row.kcal),
      carb: normalizeNumber(row.carb_g),
      prot: normalizeNumber(row.protein_g),
      fat: normalizeNumber(row.fat_g),
      satFat: normalizeNumber(rawPayload.satFat, null),
      transFat: normalizeNumber(rawPayload.transFat, null),
      fiber: normalizeNumber(row.fiber_g),
      sodium: normalizeNumber(row.sodium_mg),
      portionSize: normalizeNumber(rawPayload.portionSize, 100),
    };
  }

  function shouldReconcileDeletes(items) {
    return items.every((item) => Boolean(getRemoteId(item)));
  }

  function isMissingProductCategoriesTableError(error) {
    const message = `${error?.code || ""} ${error?.message || ""} ${error?.details || ""}`;
    return /42P01|PGRST205|product_categories/i.test(message)
      && /does not exist|not found|schema cache/i.test(message);
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
    const image = normalizeRecipeImageMetadata(recipe?.image);
    const canonicalImagePath = remoteId ? getRecipeImagePath(organizationId, remoteId) : "";
    return {
      ...(remoteId ? {id: remoteId} : {}),
      ...(Object.prototype.hasOwnProperty.call(recipe || {}, "image") && image?.path === canonicalImagePath
        ? {image_path:canonicalImagePath}
        : {}),
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
    const imagePath = String(row.image_path || "").trim().replace(/^\/+/, "");
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
      imagePath:imagePath || null,
      ...(imagePath ? {image:{
          path:imagePath,
          name:"cover.jpg",
          type:"image/jpeg",
          size:0,
          updatedAt:row.updated_at || null,
        }} : {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function mapRecipeIngredientToRemote(ingredient, recipeId, organizationId) {
    const remoteId = getRemoteId(ingredient);
    const rawStockId = String(ingredient.stockId || "");
    const rawPhysicalId = String(ingredient.physicalId || "").replace(/^pf_/, "");
    const isPhysicalSource = rawStockId.startsWith("pf_") || Boolean(ingredient.physicalRemoteId || ingredient.physicalId);
    const stockRemoteId = isPhysicalSource
      ? null
      : ingredient.stockRemoteId || (rawStockId.includes("-") ? rawStockId : null);
    const physicalRemoteId = ingredient.physicalRemoteId || (rawPhysicalId.includes("-") ? rawPhysicalId : null);
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
    return Promise.all((data || []).map((row) => hydrateRecipeImage(client, mapRecipeFromRemote(row))));
  }

  async function readRecipeImagePath(client, organizationId, recipe) {
    const remoteId = getRemoteId(recipe);
    if (!remoteId) return "";
    const {data, error} = await client
      .from("recipes")
      .select("image_path")
      .eq("id", remoteId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (error) throw error;
    const storedPath = String(data?.image_path || "").trim().replace(/^\/+/, "");
    const canonicalPath = getRecipeImagePath(organizationId, remoteId);
    if (storedPath && storedPath !== canonicalPath) {
      console.warn("Caminho de capa nao canonico ignorado.", {recipeId:remoteId});
      return "";
    }
    return storedPath;
  }

  async function persistRecipeImage(client, organizationId, recipe, savedRecipe, knownPreviousPath = "") {
    const hasImageIntent = Object.prototype.hasOwnProperty.call(recipe || {}, "image");
    const requestedImage = normalizeRecipeImageMetadata(recipe?.image);
    const canonicalPath = getRecipeImagePath(organizationId, savedRecipe.id);
    const previousCandidate = String(knownPreviousPath || savedRecipe?.image_path || "").trim().replace(/^\/+/, "");
    const previousPath = previousCandidate === canonicalPath ? canonicalPath : "";

    if (!hasImageIntent) {
      if (!previousPath) return null;
      const signedUrl = await createRecipeImageSignedUrl(client, previousPath);
      return normalizeRecipeImageMetadata({
        src:signedUrl,
        path:previousPath,
        name:"cover.jpg",
        type:"image/jpeg",
        updatedAt:savedRecipe.updated_at,
      });
    }

    if (!requestedImage) {
      if (!previousPath) return null;
      await updateRecipeImagePath(client, organizationId, savedRecipe.id, null);
      try {
        await removeRecipeImage(client, [canonicalPath]);
      } catch (error) {
        console.warn("A referencia da capa foi limpa, mas o arquivo antigo nao pode ser removido.", error);
      }
      return null;
    }

    if (isRecipeImageDataUrl(requestedImage.src)) {
      const uploadedPath = await uploadRecipeImage(client, organizationId, savedRecipe.id, requestedImage);
      // An existing cover already points at this canonical object. Skipping a
      // redundant row update leaves no fallible step after replacing the binary.
      const updatedRecipe = previousPath === uploadedPath
        ? savedRecipe
        : await updateRecipeImagePath(client, organizationId, savedRecipe.id, uploadedPath);
      if (previousPath && previousPath !== uploadedPath) {
        try {
          await removeRecipeImage(client, [previousPath]);
        } catch (error) {
          console.warn("Nao foi possivel remover a capa antiga da receita.", error);
        }
      }
      const signedUrl = await createRecipeImageSignedUrl(client, uploadedPath);
      return normalizeRecipeImageMetadata({
        ...requestedImage,
        src:signedUrl || requestedImage.src,
        path:uploadedPath,
        updatedAt:updatedRecipe.updated_at || requestedImage.updatedAt,
      });
    }

    const requestedPath = requestedImage.path === canonicalPath ? canonicalPath : "";
    const finalPath = previousPath || requestedPath;
    if (!finalPath) return null;
    if (finalPath !== previousPath) {
      await updateRecipeImagePath(client, organizationId, savedRecipe.id, finalPath);
    }
    const signedUrl = requestedImage.src || await createRecipeImageSignedUrl(client, finalPath);
    return normalizeRecipeImageMetadata({
      ...requestedImage,
      ...(signedUrl ? {src:signedUrl} : {}),
      path:finalPath,
    });
  }

  async function readRecipeSaveSnapshot(client, organizationId, recipe) {
    const remoteId = getRemoteId(recipe);
    if (!remoteId) return null;
    const {data, error} = await client
      .from("recipes")
      .select("*, recipe_ingredients(*)")
      .eq("id", remoteId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function rollbackRecipeSave(client, organizationId, recipeId, snapshot) {
    const canonicalPath = getRecipeImagePath(organizationId, recipeId);
    if (!snapshot) {
      const {error:ingredientsError} = await client
        .from("recipe_ingredients")
        .delete()
        .eq("recipe_id", recipeId)
        .eq("organization_id", organizationId);
      if (ingredientsError) throw ingredientsError;

      const {error:recipeError} = await client
        .from("recipes")
        .update({deleted_at:new Date().toISOString(), image_path:null})
        .eq("id", recipeId)
        .eq("organization_id", organizationId);
      if (recipeError) throw recipeError;
      try {
        await removeRecipeImage(client, [canonicalPath]);
      } catch (error) {
        console.warn("A receita foi revertida, mas a capa parcial nao pode ser removida.", error);
      }
      return;
    }

    const {error:recipeError} = await client
      .from("recipes")
      .update({
        name:snapshot.name,
        yield_g:snapshot.yield_g,
        portions:snapshot.portions,
        markup_percent:snapshot.markup_percent,
        portion_size_g:snapshot.portion_size_g,
        total_cost_cents:snapshot.total_cost_cents,
        sale_price_cents:snapshot.sale_price_cents,
        preparation_method:snapshot.preparation_method,
        notes:snapshot.notes,
        origin:snapshot.origin,
        image_path:snapshot.image_path || null,
        deleted_at:snapshot.deleted_at || null,
      })
      .eq("id", recipeId)
      .eq("organization_id", organizationId);
    if (recipeError) throw recipeError;

    if (!snapshot.image_path) {
      try {
        await removeRecipeImage(client, [canonicalPath]);
      } catch (error) {
        console.warn("A receita foi restaurada sem capa, mas o upload parcial nao pode ser removido.", error);
      }
    }

    const previousIngredients = Array.isArray(snapshot.recipe_ingredients)
      ? snapshot.recipe_ingredients
      : [];
    if (previousIngredients.length) {
      const rows = previousIngredients.map((ingredient) => ({
        id:ingredient.id,
        organization_id:ingredient.organization_id,
        recipe_id:ingredient.recipe_id,
        stock_item_id:ingredient.stock_item_id,
        physical_stock_item_id:ingredient.physical_stock_item_id,
        name:ingredient.name,
        unit:ingredient.unit,
        used_quantity:ingredient.used_quantity,
        gross_quantity:ingredient.gross_quantity,
        yield_percent:ingredient.yield_percent,
        cost_cents:ingredient.cost_cents,
        saved_unit_price_cents:ingredient.saved_unit_price_cents,
        nutrition_snapshot:ingredient.nutrition_snapshot || {},
      }));
      const {error:restoreError} = await client.from("recipe_ingredients").upsert(rows);
      if (restoreError) throw restoreError;
    }

    const previousIds = previousIngredients.map((ingredient) => ingredient.id).filter(Boolean);
    let cleanupQuery = client
      .from("recipe_ingredients")
      .delete()
      .eq("recipe_id", recipeId)
      .eq("organization_id", organizationId);
    if (previousIds.length) cleanupQuery = cleanupQuery.not("id", "in", `(${previousIds.join(",")})`);
    const {error:cleanupError} = await cleanupQuery;
    if (cleanupError) throw cleanupError;
  }

  async function saveRecipes(client, organizationId, recipes) {
    const saved = [];

    for (const recipe of recipes) {
      const previousSnapshot = await readRecipeSaveSnapshot(client, organizationId, recipe);
      const previousImagePath = await readRecipeImagePath(client, organizationId, recipe);
      const recipePayload = mapRecipeToRemote(recipe, organizationId);
      if (!Object.prototype.hasOwnProperty.call(recipe || {}, "image") && previousImagePath) {
        recipePayload.image_path = previousImagePath;
      }
      let savedRecipe = null;
      try {
        const {data, error:recipeError} = await client
          .from("recipes")
          .upsert(recipePayload, {defaultToNull:false})
          .select("*")
          .single();

        if (recipeError) throw recipeError;
        savedRecipe = data;

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
        const image = await persistRecipeImage(client, organizationId, recipe, savedRecipe, previousImagePath);
        const savedItem = {
          ...recipe,
          remoteId:savedRecipe.id,
          imagePath:image?.path || null,
        };
        if (image) savedItem.image = image;
        else delete savedItem.image;
        saved.push(savedItem);
      } catch (error) {
        if (savedRecipe?.id) {
          try {
            await rollbackRecipeSave(client, organizationId, savedRecipe.id, previousSnapshot);
          } catch (rollbackError) {
            console.error("Nao foi possivel reverter completamente a receita remota.", rollbackError);
          }
        }
        throw error;
      }
    }

    let deletedRecipeImagePaths = [];
    if (shouldReconcileDeletes(saved)) {
      const remoteIds = saved.map(getRemoteId);
      let deletedRecipesQuery = client
        .from("recipes")
        .select("id, image_path")
        .eq("organization_id", organizationId)
        .is("deleted_at", null);
      if (remoteIds.length) {
        deletedRecipesQuery = deletedRecipesQuery.not("id", "in", `(${remoteIds.join(",")})`);
      }
      const {data:deletedRecipes, error:deletedRecipesError} = await deletedRecipesQuery;
      if (deletedRecipesError) throw deletedRecipesError;
      deletedRecipeImagePaths = (deletedRecipes || [])
        .map((row) => {
          const path = String(row.image_path || "").trim().replace(/^\/+/, "");
          return path === getRecipeImagePath(organizationId, row.id) ? path : "";
        })
        .filter(Boolean);
    }

    await softDeleteMissingRows(client, "recipes", organizationId, saved);
    if (deletedRecipeImagePaths.length) {
      try {
        await removeRecipeImage(client, deletedRecipeImagePaths);
      } catch (error) {
        console.warn("Receitas removidas, mas algumas capas antigas ficaram para limpeza posterior.", error);
      }
    }
    return saved;
  }

  function normalizeCategoryName(name) {
    return String(name || "").trim().replace(/[<>]/g, "").replace(/\s+/g, " ");
  }

  async function listCategories(client, organizationId) {
    const {data, error} = await client
      .from("product_categories")
      .select("id, name, parent_id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name", {ascending: true});

    if (error) {
      if (isMissingProductCategoriesTableError(error)) {
        console.warn("Tabela product_categories ainda nao existe no Supabase. Usando categorias locais.");
        return null;
      }
      throw error;
    }

    return (data || []).map((row) => normalizeCategoryName(row.name)).filter(Boolean);
  }

  async function saveCategories(client, organizationId, categories) {
    const normalized = [...new Set((categories || []).map(normalizeCategoryName).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
    const saved = [];

    for (const name of normalized) {
      const {data, error} = await client
        .from("product_categories")
        .upsert({
          organization_id: organizationId,
          name,
          deleted_at: null,
        }, {onConflict: "organization_id,name"})
        .select("id, name")
        .single();

      if (error) {
        if (isMissingProductCategoriesTableError(error)) {
          console.warn("Tabela product_categories ainda nao existe no Supabase. Mantendo categorias locais.");
          return normalized;
        }
        throw error;
      }
      saved.push(data);
    }

    let query = client
      .from("product_categories")
      .update({deleted_at: new Date().toISOString()})
      .eq("organization_id", organizationId)
      .is("deleted_at", null);

    if (saved.length) {
      query = query.not("id", "in", `(${saved.map((row) => row.id).join(",")})`);
    }

    const {error} = await query;
    if (error) {
      if (isMissingProductCategoriesTableError(error)) return normalized;
      throw error;
    }

    return saved.map((row) => normalizeCategoryName(row.name)).filter(Boolean);
  }

  function resolveDomain(key) {
    if (key === STORAGE_KEYS.stock) return {list:listStockItems, save:saveStockItems};
    if (key === STORAGE_KEYS.physicalStock) return {list:listPhysicalStockItems, save:savePhysicalStockItems};
    if (key === STORAGE_KEYS.recipes) return {list:listRecipes, save:saveRecipes};
    if (key === STORAGE_KEYS.categories) return {list:listCategories, save:saveCategories};
    return null;
  }

  function canSyncKey(key) {
    return Boolean(resolveDomain(key));
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
    getNutritionRawPayload,
    getRecipeImagePath,
    createRecipeImageSignedUrl,
    dataUrlToBlob,
    hydrateRecipeImage,
    isRecipeImageDataUrl,
    listPhysicalStockItems,
    listRecipes,
    listStockItems,
    listCategories,
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
    normalizeRecipeImageMetadata,
    normalizeNumber,
    saveByKey,
    savePhysicalStockItems,
    saveRecipes,
    saveStockItems,
    saveCategories,
    uploadRecipeImage,
    removeRecipeImage,
    readRecipeImagePath,
    updateRecipeImagePath,
    persistRecipeImage,
    canSyncKey,
    deleteMissingRecipeIngredients,
    isMissingProductCategoriesTableError,
    normalizeCategoryName,
    shouldReconcileDeletes,
    softDeleteMissingRows,
    upsertNutrition,
  };
})();
