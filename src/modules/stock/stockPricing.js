(function exposeStockPricing() {
  function pricePerUnit(stockItem) {
    if (stockItem.unit === "un") return stockItem.price / stockItem.qty;
    return stockItem.price / window.FichaTecMeasurements.toBase(stockItem.qty, stockItem.unit);
  }

  window.FichaTecStockPricing = {
    pricePerUnit,
  };
})();

