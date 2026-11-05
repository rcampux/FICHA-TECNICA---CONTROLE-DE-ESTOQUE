(function exposeRecipeStockBatch() {
  const nutrientFields = [
    ['kcal', 'Calorias', 'kcal'], ['carb', 'Carboidratos', 'g'],
    ['prot', 'Proteínas', 'g'], ['fat', 'Gorduras totais', 'g'],
    ['satFat', 'Gorduras saturadas', 'g'], ['transFat', 'Gorduras trans', 'g'],
    ['fiber', 'Fibras', 'g'], ['sodium', 'Sódio', 'mg'],
  ];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  }[char]));
  const normalizeName = name => name.trim().toLocaleLowerCase('pt-BR');
  const unitFamily = unit => unit === 'kg' ? 'g' : unit;

  function createRecipeStockBatch({db, getStock, getPhysicalStock, getCategoryNames, saveCategoryRecord,
    inferCategory, fetchNutrition, scaleNutritionForPortion, formatNutritionMetric,
    applyStockPrices, renderStocks, showToast, getRecipe, calcCosts, showRecipes}) {
    const dialog = document.getElementById('recipe-stock-batch');
    const body = dialog.querySelector('[data-batch-body]');
    const form = dialog.querySelector('form');
    const status = dialog.querySelector('[data-batch-status]');
    const saveButton = dialog.querySelector('[data-batch-save]');
    let rows = [], destination = null, recipe = null, scope = null, busy = false, generation = 0;
    let nutritionRequests = 0;
    let categorySaving = false;
    let draftMarkup = '0';
    let phase = 'destination', savedProducts = [];

    function open(value) {
      if (busy || categorySaving || !value) return;
      recipe = value;
      draftMarkup = String(Number.isFinite(Number(recipe.markup)) && Number(recipe.markup) >= 0 ? Number(recipe.markup) : 0);
      scope = db.activeOrganizationId?.();
      rows = [];
      destination = null;
      phase = 'destination';
      savedProducts = [];
      dialog.dataset.batchPhase=phase;
      generation++;
      nutritionRequests = 0;
      status.textContent = '';
      saveButton.hidden = true;
      saveButton.textContent='Salvar no estoque';
      dialog.querySelector('[data-batch-title]').textContent = 'Adicionar ao estoque';
      body.innerHTML = '<p>Escolha onde cadastrar os ingredientes de <strong>' + escape(recipe.nome) + '</strong>.</p>' +
        '<div class="batch-destinations"><button type="button" data-batch-destination="virtual"><span class="material-symbols-rounded">inventory_2</span><strong>Estoque virtual</strong><small>Catálogo, preços e nutrição</small></button>' +
        '<button type="button" data-batch-destination="physical"><span class="material-symbols-rounded">storefront</span><strong>Estoque físico</strong><small>Quantidades reais e catálogo virtual</small></button></div>';
      dialog.showModal();
      body.scrollTop = 0;
    }

    function chooseDestination(value) {
      destination = value;
      phase = 'ingredients';
      dialog.dataset.batchPhase=phase;
      const unique = new Map();
      for (const ingredient of recipe.ingredients) {
        const key = normalizeName(ingredient.name);
        if (unique.has(key)) {
          unique.get(key).ingredients.push(ingredient);
          continue;
        }
        const existing = getStock().find(item => normalizeName(item.name) === key);
        const physical = getPhysicalStock().find(item => normalizeName(item.name) === key);
        unique.set(key, {
          ingredients: [ingredient],
          product: {...existing, id:existing?.id || crypto.randomUUID(),
            name:ingredient.name, qty:existing?.qty ?? '', price:existing?.price ?? '',
            unit:existing?.unit || ingredient.unit || 'g',
            category:existing?.category || ingredient.category || inferCategory(ingredient.name),
            nutrition:{...(existing?.nutrition || {}), portionSize:existing?.nutrition?.portionSize || 100}},
          physical: physical || {id:crypto.randomUUID()},
          desiredQty: physical?.desiredQty || '',
          existing: Boolean(existing),
        });
      }
      rows = [...unique.values()];
      body.innerHTML = '<p class="batch-intro">Informe a quantidade comprada e o valor pago por essa quantidade. O custo da receita será proporcional ao uso.</p>' +
        '<p class="batch-destination-label">' + (value === 'physical' ? 'Destino — físico e virtual' : 'Destino — virtual') + '</p>' +
        rows.map(renderRow).join('');
      body.scrollTop = 0;
      saveButton.hidden = false;
      status.textContent = 'Revise todos os ingredientes antes de salvar.';
    }

    function renderMarkup() {
      return `<section class="batch-markup" aria-labelledby="batch-markup-title">
        <div class="batch-markup-heading"><span id="batch-markup-title"><span class="material-symbols-rounded" aria-hidden="true">trending_up</span>Adicionar markup</span>
          <label for="batch-markup"><span class="visually-hidden">Markup da receita em porcentagem</span><span class="batch-markup-input"><input id="batch-markup" data-batch-markup type="number" inputmode="decimal" min="0" step="any" required value="${escape(draftMarkup)}" aria-describedby="batch-markup-help"><span aria-hidden="true">%</span></span></label>
        </div>
        <p id="batch-markup-help">Percentual acrescentado ao custo da receita para definir o preço de venda.</p>
        <small>Os ingredientes já estão no estoque. Salve para atualizar o preço desta receita.</small>
      </section>`;
    }

    function focusBatchHeading() {
      document.activeElement?.blur();
      const heading=dialog.querySelector('[data-batch-title]');
      heading.tabIndex=-1;
      heading.focus({preventScroll:true});
      body.scrollTop=0;
    }
    function showMarkupStep() {
      phase='markup';dialog.dataset.batchPhase=phase;
      dialog.querySelector('[data-batch-title]').textContent='Definir preço de venda';
      body.innerHTML='<p class="batch-step-intro">Ingredientes cadastrados para <strong>'+escape(recipe.nome)+'</strong>. Agora escolha o percentual que deseja acrescentar ao custo.</p>'+renderMarkup();
      saveButton.textContent='Salvar';
      saveButton.hidden=false;
      status.textContent='';
      focusBatchHeading();
    }
    function showFinancialSummary() {
      const updated=getRecipe(recipe.id);
      if(updated)recipe=updated;
      const values=calcCosts(recipe.ingredients,recipe.markup,recipe.rendimento);
      const number=value=>Number(value).toLocaleString('pt-BR',{maximumFractionDigits:2});
      const money=value=>Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
      const count=Number(recipe.porcoes)||1;
      const unit=recipe.yieldUnit==='unit'?'unidade':'porção';
      const loss=values.lossPercent===null?'Sem pesagem completa':money(values.lossPremium);
      const lossLabel=values.lossPercent===null?'Adicional pela perda':'Adicional pela perda ('+number(Math.max(0,values.lossPercent))+'%)';
      const row=(label,value)=>'<div><dt>'+label+'</dt><dd>'+value+'</dd></div>';
      phase='summary';dialog.dataset.batchPhase=phase;
      dialog.querySelector('[data-batch-title]').textContent='Receita atualizada';
      body.innerHTML='<p class="batch-success-message" role="status">Custos e preço de venda atualizados.</p>'+
        '<h3 class="batch-summary-name">'+escape(recipe.nome)+'</h3>'+
        '<div class="batch-markup batch-markup-result"><span>Markup</span><strong>'+number(recipe.markup)+'%</strong></div>'+
        '<section class="batch-financial-summary" aria-label="Resumo financeiro da receita"><dl class="batch-summary-totals">'+
        row('Custo total',money(values.totalCost))+row('Venda do lote',money(values.venda))+
        row('Venda por '+unit,money(values.venda/count))+row('Custo por kg',recipe.rendimento>0?money(values.totalCost/(recipe.rendimento/1000)):'—')+
        '</dl><dl class="batch-summary-details">'+row('Venda com markup',money(values.saleBeforeLoss))+
        row(lossLabel,loss)+row('Lucro bruto do lote',money(values.grossProfit))+
        row('Lucro bruto por '+unit,money(values.grossProfit/count))+'</dl>'+
        '<p>A perda acrescenta ao lucro a mesma porcentagem sobre a venda com markup.</p></section>';
      saveButton.hidden=true;
      status.textContent='Feche no X para voltar às suas receitas.';
      focusBatchHeading();
    }
    async function saveMarkup() {
      const input=body.querySelector('[data-batch-markup]');
      const markup=input.valueAsNumber;
      if(!Number.isFinite(markup)||markup<0){
        status.textContent='Informe um markup maior ou igual a zero.';
        input.reportValidity();return;
      }
      if(db.mode?.()==='supabase'&&(!scope||scope!==db.activeOrganizationId())){
        status.textContent='A cozinha mudou. Feche e abra novamente a receita.';return;
      }
      busy=true;
      form.querySelectorAll('button,input,select').forEach(control=>{control.disabled=true;});
      status.textContent='Atualizando custos e preço de venda…';
      try {
        await applyStockPrices(savedProducts,{strict:true,recipePricing:{id:recipe.id,markup}});
        renderStocks();
        showFinancialSummary();
        showToast('Custos e preço de venda atualizados.');
      } catch(error) {
        console.error('Recipe markup save failed',error);
        status.textContent='Os ingredientes já estão no estoque. Não foi possível salvar o markup; tente novamente.';
      } finally {
        busy=false;
        form.querySelectorAll('button,input,select').forEach(control=>{control.disabled=false;});
      }
    }
    function closeBatch() {
      if(busy||categorySaving)return;
      document.activeElement?.blur();
      dialog.close();
      if(phase==='markup'||phase==='summary')showRecipes();
    }

    function categoryOptions(selected) {
      return [...new Set([...getCategoryNames(), selected].filter(Boolean))]
        .sort((a,b) => a.localeCompare(b, 'pt-BR'))
        .map(name => `<option value="${escape(name)}" ${name === selected ? 'selected' : ''}>${escape(name)}</option>`).join('');
    }

    function renderRow(row, index) {
      const product = row.product;
      const used = row.ingredients.map(item => (item.qtyOriginal ?? item.qtyG) + ' ' + item.unit).join(' + ');
      return `<article class="batch-product" data-batch-row="${index}">
        <div class="batch-product-heading"><div><strong>${escape(product.name)}</strong><small>Na receita · ${escape(used)}</small><small>${row.existing ? 'Produto cadastrado — os dados serão atualizados ao salvar.' : 'Novo produto no catálogo'}</small><small data-batch-summary></small></div>
        <button class="btn btn-secondary" type="button" data-batch-edit aria-expanded="false"><span class="material-symbols-rounded" aria-hidden="true">edit</span>Editar</button></div>
        <div class="batch-fields" hidden>
          <div class="batch-category-select"><label for="batch-category-${index}">Categoria / tag</label>
            <div class="batch-category-controls"><select id="batch-category-${index}" data-field="category">${categoryOptions(product.category)}</select>
              <button class="btn btn-secondary" type="button" data-batch-category-toggle aria-label="Criar categoria para ${escape(product.name)}" aria-expanded="false" aria-controls="batch-new-category-${index}"><span class="material-symbols-rounded" aria-hidden="true">add</span></button></div>
          </div>
          <div class="batch-category-create" id="batch-new-category-${index}" role="group" aria-label="Nova categoria" hidden>
            <label>Nome da nova categoria<input data-new-category type="text" maxlength="80" autocomplete="off" placeholder="Ex.: Panificação"></label>
            <div class="batch-category-actions"><button type="button" class="btn btn-secondary" data-batch-category-cancel>Cancelar</button><button type="button" class="btn btn-primary" data-batch-category-save>Criar categoria</button></div>
            <p data-batch-category-status role="status"></p>
          </div>
          <div class="batch-field-grid">
            <label>Quantidade comprada<input data-field="qty" type="number" inputmode="decimal" step="any" min="0.000001" required value="${product.qty}"></label>
            <label>Unidade<select data-field="unit">${[['g','Gramas'],['kg','Quilogramas'],['ml','Mililitros'],['un','Unidades']].map(([unit,label]) => `<option value="${unit}" ${unit === product.unit ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
            <label>Valor pago (R$)<input data-field="price" type="number" inputmode="decimal" step="0.01" min="0" required value="${product.price}"></label>
            ${destination === 'physical' ? `<label>Quantidade desejada<input data-field="desiredQty" type="number" inputmode="decimal" step="any" min="0.000001" value="${row.desiredQty}" placeholder="Igual à comprada"></label>` : ''}
          </div>
          <button class="btn btn-primary batch-nutrition-button" type="button" data-batch-nutrition><span class="material-symbols-rounded" aria-hidden="true">nutrition</span>Tabela nutricional</button>
          <details class="batch-nutrition"><summary>Revisar tabela nutricional</summary>
            <p class="batch-nutrition-status" role="status"></p>
            <p>Valores por 100 g/ml. Confira a referência e ajuste conforme o rótulo.</p>
            <div class="batch-field-grid">${nutrientFields.map(([key,label,unit]) => `<label>${label} (${unit})<input data-nutrient="${key}" type="number" inputmode="decimal" min="0" step="any" value="${product.nutrition[key] ?? ''}"></label>`).join('')}</div>
            <label>Porção para visualizar (g/ml)<input data-field="portionSize" type="number" inputmode="decimal" min="0.1" step="any" value="${product.nutrition.portionSize}"></label>
            <div class="batch-nutrition-preview"></div>
          </details>
        </div></article>`;
    }

    function toggleCategoryCreation(article, visible) {
      const editor = article.querySelector('.batch-category-create');
      editor.hidden = !visible;
      article.querySelector('[data-batch-category-toggle]').setAttribute('aria-expanded', String(visible));
      if (!visible) article.querySelector('[data-batch-category-toggle]').focus({preventScroll:true});
      // Revealing a form does not request the keyboard. Only tapping its input does.
    }

    async function createCategory(article) {
      if (categorySaving || busy) return;
      const editor = article.querySelector('.batch-category-create');
      const message = editor.querySelector('[data-batch-category-status]');
      const row = readRow(article);
      categorySaving = true;
      editor.querySelectorAll('button,input').forEach(control => {control.disabled = true;});
      message.textContent = 'Salvando categoria…';
      try {
        const name = await saveCategoryRecord(editor.querySelector('input').value, undefined, scope);
        row.product.category = name;
        body.querySelectorAll('[data-field="category"]').forEach(select => {
          const selected = select.closest('[data-batch-row]') === article ? name : select.value;
          select.innerHTML = categoryOptions(selected);
        });
        toggleCategoryCreation(article, false);
        editor.querySelector('input').value = '';
        message.textContent = '';
        status.textContent = 'Categoria criada e selecionada. Salve os ingredientes quando terminar.';
      } catch (error) {
        message.textContent = error.message || 'Não foi possível criar a categoria. Tente novamente.';
      } finally {
        categorySaving = false;
        editor.querySelectorAll('button,input').forEach(control => {control.disabled = false;});
      }
    }

    function updatePreview(article, row) {
      const scaled = scaleNutritionForPortion(row.product.nutrition, row.product.nutrition.portionSize);
      article.querySelector('.batch-nutrition-preview').innerHTML = nutrientFields.map(([key,label,unit]) =>
        '<div><small>' + label + '</small><strong>' + formatNutritionMetric(scaled[key], unit) + '</strong></div>').join('');
    }

    function readRow(article) {
      const row = rows[Number(article.dataset.batchRow)];
      article.querySelectorAll('[data-field]').forEach(input => {
        const field = input.dataset.field;
        const value = input.type === 'number' ? (input.value === '' ? '' : Number(input.value)) : input.value;
        if (field === 'desiredQty') row.desiredQty = value;
        else if (field === 'portionSize') row.product.nutrition.portionSize = value;
        else row.product[field] = value;
      });
      article.querySelectorAll('[data-nutrient]').forEach(input => {
        row.product.nutrition[input.dataset.nutrient] = input.value === '' ? null : Number(input.value);
      });
      article.querySelector('[data-batch-summary]').textContent = row.product.qty > 0 && row.product.price !== ''
        ? row.product.qty + ' ' + row.product.unit + ' · ' + Number(row.product.price).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})
        : 'Quantidade e valor a preencher';
      updatePreview(article, row);
      return row;
    }

    async function loadNutrition(article, button) {
      if (button.disabled) return;
      const focused = document.activeElement;
      if (dialog.contains(focused) && focused.matches('input, textarea')) focused.blur();
      const row = readRow(article);
      const version = generation;
      const message = article.querySelector('.batch-nutrition-status');
      const details = article.querySelector('.batch-nutrition');
      const buttonContent = button.innerHTML;
      nutritionRequests++;
      button.disabled = true;
      button.textContent = 'Buscando tabela…';
      details.open = true;
      details.setAttribute('aria-busy', 'true');
      details.querySelectorAll('[data-nutrient]').forEach(input => {input.disabled = true;});
      message.textContent = 'Buscando referência nutricional na internet…';
      window.requestAnimationFrame(() => {
        if (!dialog.open || generation !== version || !details.open) return;
        // Scroll only this dialog; opening the table never requests the keyboard.
        const top = details.getBoundingClientRect().top;
        const bounds = body.getBoundingClientRect();
        body.scrollTop += top - bounds.top - 12;
      });
      try {
        const nutrition = await fetchNutrition(row.product.name);
        if (version !== generation || !dialog.open) return;
        row.product.nutrition = {...row.product.nutrition, ...nutrition, portionSize:row.product.nutrition.portionSize};
        for (const [key] of nutrientFields) article.querySelector('[data-nutrient="' + key + '"]').value = nutrition[key] ?? '';
        message.textContent = 'Referência encontrada — ' + (nutrition.sourceProduct || row.product.name) + '. Confira com o rótulo.';
        updatePreview(article, row);
      } catch (error) {
        if (version !== generation) return;
        message.textContent = error.message;
      } finally {
        button.disabled = false;
        button.innerHTML = buttonContent;
        details.setAttribute('aria-busy', 'false');
        details.querySelectorAll('[data-nutrient]').forEach(input => {input.disabled = false;});
        if (version === generation) nutritionRequests--;
      }
    }

    function validateRows() {
      for (const article of body.querySelectorAll('[data-batch-row]')) {
        const row = readRow(article);
        const product = row.product;
        const invalid = article.querySelector('input:invalid');
        const incompatible = row.ingredients.some(item => unitFamily(item.unit) !== unitFamily(product.unit));
        if (invalid || incompatible) {
          article.querySelector('.batch-fields').hidden = false;
          article.querySelector('[data-batch-edit]').setAttribute('aria-expanded', 'true');
          article.scrollIntoView({block:'center', behavior:'smooth'});
          if (invalid) invalid.reportValidity();
          status.textContent = incompatible ? 'Use uma unidade compatível com a receita para ' + product.name + '.' : 'Preencha quantidade e valor de ' + product.name + '.';
          return false;
        }
        product.category = product.category.trim() || inferCategory(product.name);
      }
      return true;
    }

    async function save(event) {
      event.preventDefault();
      if (busy) return;
      if (phase === 'markup') { await saveMarkup(); return; }
      if (phase !== 'ingredients' || !destination) return;
      if (categorySaving) return;
      if (body.querySelector('.batch-category-create:not([hidden])')) {
        status.textContent = 'Crie ou cancele a nova categoria antes de salvar os ingredientes.';
        return;
      }
      if (nutritionRequests) {
        status.textContent = 'Aguarde a busca nutricional terminar antes de salvar.';
        return;
      }
      if (!validateRows()) return;
      if (db.mode?.() === 'supabase' && (!scope || scope !== db.activeOrganizationId())) {
        status.textContent = 'A cozinha mudou. Feche e abra novamente este cadastro.';
        return;
      }
      busy = true;
      form.querySelectorAll('button, input, select').forEach(control => {control.disabled = true;});
      status.textContent = 'Salvando os ingredientes e calculando a receita…';
      try {
        const products = rows.map(row => {
          const product = row.product;
          if (db.mode?.() === 'supabase' && !product.remoteId) product.remoteId = crypto.randomUUID();
          return {...product, nutrition:{...product.nutrition, priceReference:{quantity:product.qty, unit:product.unit, price:product.price}}, updatedAt:new Date().toISOString()};
        });
        const physicalItems = destination === 'physical' ? rows.map((row,index) => {
          if (db.mode?.() === 'supabase' && !row.physical.remoteId) row.physical.remoteId = crypto.randomUUID();
          const product = products[index];
          return {...row.physical, name:product.name, category:product.category, unit:product.unit,
            price:product.price, nutrition:product.nutrition, currentQty:product.qty,
            desiredQty:row.desiredQty || product.qty, stockId:product.id,
            stockRemoteId:product.remoteId || null, usedTotal:row.physical.usedTotal || 0};
        }) : [];
        await db.upsertStockBatch(products, physicalItems, scope);
        if (db.mode?.() === 'supabase' && scope !== db.activeOrganizationId()) throw new Error('A cozinha mudou durante o salvamento.');
        await applyStockPrices(products, {strict:true});
        savedProducts=products;
        renderStocks();
        showMarkupStep();
        showToast('Ingredientes salvos no estoque. Agora defina o markup.');
      } catch (error) {
        console.error('Recipe stock batch failed', error);
        status.textContent = 'Não foi possível concluir todas as etapas. Os dados preenchidos foram mantidos. Clique em Salvar novamente para concluir.';
      } finally {
        busy = false;
        form.querySelectorAll('button, input, select').forEach(control => {control.disabled = false;});
      }
    }

    form.addEventListener('submit', save);
    body.addEventListener('input', event => {
      if (event.target.matches('[data-batch-markup]')) {
        draftMarkup = event.target.value;
        status.textContent = 'Clique em Salvar para atualizar o preço da receita.';
        return;
      }
      const article = event.target.closest('[data-batch-row]');
      if (article) {
        readRow(article);
        status.textContent = 'Os ingredientes serão registrados ao clicar em Salvar no estoque.';
      }
    });
    body.addEventListener('change', event => {
      const article = event.target.closest('[data-batch-row]');
      if (article) readRow(article);
    });
    body.addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.target.matches('[data-new-category]')) {
        event.preventDefault();
        createCategory(event.target.closest('[data-batch-row]'));
      }
    });
    dialog.addEventListener('cancel', event => {event.preventDefault();closeBatch();});
    dialog.addEventListener('click', event => {
      if (busy || categorySaving) return;
      if (event.target === dialog || event.target.closest('[data-batch-close]')) {closeBatch(); return;}
      const destinationButton = event.target.closest('[data-batch-destination]');
      if (destinationButton) {chooseDestination(destinationButton.dataset.batchDestination); return;}
      const article = event.target.closest('[data-batch-row]');
      if (!article) return;
      if (event.target.closest('[data-batch-category-toggle]')) {
        toggleCategoryCreation(article, article.querySelector('.batch-category-create').hidden);
        return;
      }
      if (event.target.closest('[data-batch-category-cancel]')) {toggleCategoryCreation(article, false); return;}
      if (event.target.closest('[data-batch-category-save]')) {createCategory(article); return;}
      const edit = event.target.closest('[data-batch-edit]');
      if (edit) {
        const fields = article.querySelector('.batch-fields');
        fields.hidden = !fields.hidden;
        edit.setAttribute('aria-expanded', String(!fields.hidden));
        updatePreview(article, rows[Number(article.dataset.batchRow)]);
      }
      const nutrition = event.target.closest('[data-batch-nutrition]');
      if (nutrition) loadNutrition(article, nutrition);
    });
    return {open};
  }
  window.FichaTecRecipeStockBatch = {createRecipeStockBatch};
})();

