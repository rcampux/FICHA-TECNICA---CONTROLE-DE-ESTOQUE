(function exposeRecipeProduction() {
  function grossQuantity(ingredient) {
    return Number(ingredient.qtyBruta ?? ingredient.qtyG ?? 0);
  }

  function ingredientMass(ingredients) {
    if (!ingredients.length || ingredients.some(item => item.unit === 'ml' || item.unit === 'un')) return null;
    // The recipe editor stores both g and kg in grams.
    return ingredients.reduce((grams, item) => grams + grossQuantity(item), 0);
  }

  function priceRecipe(ingredients, markup, getUnitPrice, factor = 1) {
    let costCents = 0;
    const lines = ingredients.map(item => {
      const price = getUnitPrice(item);
      const quantity = grossQuantity(item) * factor;
      // Round each displayed line once so the total matches the list.
      const cents = Math.round((price * quantity + Number.EPSILON) * 100);
      costCents += cents;
      return {...item, currentPricePerG: price, cost: cents / 100};
    });
    const saleCents = Math.round(costCents * (100 + Number(markup)) / 100);
    return {ingredients: lines, totalCost: costCents / 100, venda: saleCents / 100};
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
    const priced = priceRecipe(recipe.ingredients, markup, getUnitPrice, factor);
    if (!Number.isFinite(priced.venda) || !Number.isFinite(factor)) return {error: 'Revise os valores deste lote.'};
    const rawBase = ingredientMass(recipe.ingredients);
    const rawWeight = rawBase === null ? null : rawBase * factor;
    const loss = rawWeight !== null && finalWeight !== null ? rawWeight - finalWeight : null;
    const lossPercent = loss !== null && rawWeight > 0 ? 100 * loss / rawWeight : null;
    return {...priced, count, unit, markup, factor, rawWeight, finalWeight, loss, lossPercent, salePerPiece: priced.venda / count};
  }

  window.FichaTecProduction = {grossQuantity, ingredientMass, priceRecipe, calculatePlan};
})();
