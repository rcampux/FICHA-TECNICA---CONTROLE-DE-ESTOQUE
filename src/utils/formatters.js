(function exposeFormatters() {
  window.FichaTecFormatters = {
    brl(value) {
      return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
    },
    quantity(quantity, unit) {
      if(unit==='un')return 'Peso ou volume pendente';
      if(['kg','l'].includes(unit)){quantity=window.FichaTecMeasurements.toBase(quantity,unit);unit=window.FichaTecMeasurements.baseUnit(unit);}
      const normalized = quantity % 1 === 0 ? quantity : parseFloat(quantity.toFixed(3));
      return `${normalized}${unit}`;
    },
  };
})();

