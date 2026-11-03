(function exposeRecipeProduction() {
  function grossQuantity(ingredient) {
    return Number(ingredient.qtyBruta ?? ingredient.qtyG ?? 0);
  }

  function ingredientMass(ingredients) {
    if (!ingredients.length || ingredients.some(item => item.unit && !['g', 'kg'].includes(item.unit))) return null;
    // The recipe editor stores both g and kg in grams.
    return ingredients.reduce((grams, item) => grams + grossQuantity(item), 0);
  }

  function divideBatch(readyWeight, count, targetPieceWeight) {
    const ready = Number(readyWeight);
    const target = Number(targetPieceWeight);
    if (!(ready > 0)) return {count: Number(count) || null, pieceWeight: null};
    if (target > 0) {
      // Remove binary noise such as 0.3 / 0.1 = 2.9999999999999996.
      return {count: Number((ready / target).toPrecision(15)), pieceWeight: target};
    }
    return {count: Number(count) || null, pieceWeight: count > 0 ? ready / count : null};
  }

  function weightChange(rawWeight, readyWeight) {
    if (!(rawWeight > 0 && readyWeight > 0)) return {loss: null, lossPercent: null};
    const loss = rawWeight - readyWeight;
    return {loss, lossPercent: 100 * loss / rawWeight};
  }

  function priceRecipe(ingredients, markup, getUnitPrice, factor = 1, readyWeight = 0) {
    let costCents = 0;
    const lines = ingredients.map(item => {
      const price = getUnitPrice(item);
      const quantity = grossQuantity(item) * factor;
      // Round each displayed line once so the total matches the list.
      const cents = Math.round((price * quantity + Number.EPSILON) * 100);
      costCents += cents;
      return {...item, currentPricePerG: price, cost: cents / 100};
    });
    const rawBase = ingredientMass(ingredients);
    const change = weightChange(rawBase, readyWeight);
    const markedUpCents = Math.round(costCents * (100 + Number(markup)) / 100);
    const lossRate = Math.max(0, change.lossPercent ?? 0);
    const extraCents = Math.round(Number((markedUpCents * lossRate / 100).toPrecision(15)));
    const saleCents = markedUpCents + extraCents;
    return {
      ingredients: lines, totalCost: costCents / 100, venda: saleCents / 100,
      saleBeforeLoss: markedUpCents / 100, lossPremium: extraCents / 100, grossProfit: (saleCents - costCents) / 100,
      rawWeight: rawBase === null ? null : rawBase * factor,
      loss: change.loss === null ? null : change.loss * factor, lossPercent: change.lossPercent,
    };
  }

  function calculatePlan(recipe, draft, getUnitPrice) {
    const count = Number(draft.count);
    const weight = Number(draft.weight);
    const markup = Number(draft.markup);
    const unit = draft.unit === 'unit' ? 'unit' : 'portion';
    if (!Number.isFinite(count) || count <= 0 || (unit === 'unit' && !Number.isInteger(count))) {
      return {error: unit === 'unit' ? 'Informe um número inteiro de unidades maior que zero.' : 'Informe uma quantidade de porções maior que zero.'};
    }
    if (String(draft.markup).trim() === '' || !Number.isFinite(markup) || markup < 0) {
      return {error: 'Informe o markup. Para vender pelo custo, use 0%.'};
    }
    const baseWeight = Number(recipe.rendimento);
    const hasWeight = baseWeight > 0;
    if (hasWeight && (!Number.isFinite(weight) || weight <= 0)) return {error: 'Informe o peso de cada peça em gramas.'};
    const finalWeight = hasWeight ? count * weight : null;
    const factor = hasWeight ? finalWeight / baseWeight : count / (Number(recipe.porcoes) || 1);
    const priced = priceRecipe(recipe.ingredients, markup, getUnitPrice, factor, baseWeight);
    if (!Number.isFinite(priced.venda) || !Number.isFinite(factor)) return {error: 'Revise os valores deste lote.'};
    return {...priced, count, unit, markup, factor, finalWeight, salePerPiece: priced.venda / count};
  }

  window.FichaTecProduction = {grossQuantity, ingredientMass, divideBatch, weightChange, priceRecipe, calculatePlan};
})();
