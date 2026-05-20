(function exposeStockPricing() {
  function pricePerUnit(stockItem) {
    if (stockItem.unit === "un") return stockItem.price / stockItem.qty;
    return stockItem.price / (stockItem.unit === "kg" ? stockItem.qty * 1000 : stockItem.qty);
  }

  window.FichaTecStockPricing = {
    pricePerUnit,
  };
})();

