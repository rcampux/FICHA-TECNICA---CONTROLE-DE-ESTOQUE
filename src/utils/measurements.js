(function exposeMeasurements() {
  const factors = {g:1, mg:0.001, kg:1000, ml:1, l:1000};
  const baseUnit = unit => ['mg','kg','g'].includes(unit) ? 'g' : ['l','ml'].includes(unit) ? 'ml' : unit;
  const toBase = (quantity, unit) => Number((Number(quantity) * (factors[unit] ?? 1)).toPrecision(15));
  const fromBase = (quantity, unit) => Number((Number(quantity) / (factors[unit] ?? 1)).toPrecision(15));
  const isMetric = unit => Object.hasOwn(factors, unit);

  // Only explicit package sizes are evidence. Product names such as "Banana unidade"
  // do not provide a weight and must never be assigned an invented one.
  function packageSize(name) {
    const text=String(name||'').replace(/,/g,'.');
    const match=text.match(/(?:(\d+)\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*(kg|mg|ml|g|l)(?![a-z])/i);
    if(!match)return null;
    const quantity=toBase(Number(match[2])*Number(match[1]||1),match[3].toLowerCase());
    return quantity>0?{quantity,unit:baseUnit(match[3].toLowerCase())}:null;
  }
  function countMeasure(item) {
    const nutrition=item?.nutrition||{};
    const equivalent=nutrition.recipeEquivalence;
    if(['g/un','ml/un'].includes(equivalent?.key) && equivalent.value>0)
      return {quantity:Number(equivalent.value),unit:equivalent.key.split('/')[0]};
    const reference=nutrition.priceReference;
    if(reference?.quantity>0 && isMetric(reference.unit))
      return {quantity:toBase(reference.quantity,reference.unit),unit:baseUnit(reference.unit)};
    return packageSize(item?.name);
  }
  function normalizeStock(item) {
    if(!item)return item;
    const measure=item.unit==='un'?countMeasure(item):null;
    if(item.unit==='un'&&!measure)return item;
    if(!isMetric(item.unit)&&!measure)return item;
    const factor=measure?.quantity??factors[item.unit];
    const unit=measure?.unit||baseUnit(item.unit);
    const nutrition=measure?{...item.nutrition,recipeEquivalence:{key:unit+'/un',value:factor}}:item.nutrition;
    return {...item,qty:toBase(item.qty*factor,'g'),unit,...(nutrition?{nutrition}:{})};
  }
  function normalizePhysical(item, catalog) {
    if(!item)return item;
    const measure=item.unit==='un'?countMeasure(catalog||item):null;
    if(item.unit==='un'&&!measure)return item;
    const factor=measure?.quantity??factors[item.unit];
    if(!(factor>0))return item;
    const scale=value=>Number((Number(value||0)*factor).toPrecision(15));
    return {...item,unit:measure?.unit||baseUnit(item.unit),currentQty:scale(item.currentQty),
      desiredQty:scale(item.desiredQty),usedTotal:scale(item.usedTotal),
      history:(item.history||[]).map(entry=>({...entry,qty:scale(entry.qty)}))};
  }
  function normalizeIngredient(item, catalog) {
    // Existing kg recipe quantities already use grams internally.
    if(item.unit==='kg')return {...item,unit:'g'};
    if(item.unit!=='un')return item;
    const measure=countMeasure({...catalog,name:item.name,nutrition:{...catalog?.nutrition,...item.nutrition}});
    if(!measure)return item;
    return {...item,unit:measure.unit,qtyG:toBase(item.qtyG*measure.quantity,'g'),
      qtyBruta:toBase((item.qtyBruta??item.qtyG)*measure.quantity,'g'),
      savedPricePerG:Number(item.savedPricePerG||0)/measure.quantity,
      nutrition:{...item.nutrition,recipeEquivalence:{key:measure.unit+'/un',value:measure.quantity}}};
  }
  window.FichaTecMeasurements={baseUnit,toBase,fromBase,isMetric,packageSize,countMeasure,normalizeStock,normalizePhysical,normalizeIngredient};
})();
