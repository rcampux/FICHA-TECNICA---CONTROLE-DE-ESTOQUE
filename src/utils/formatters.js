(function exposeFormatters() {
  window.FichaTecFormatters = {
    brl(value) {
      return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
    },
    quantity(quantity, unit) {
      const normalized = quantity % 1 === 0 ? quantity : parseFloat(quantity.toFixed(3));
      return `${normalized}${unit}`;
    },
  };
})();

