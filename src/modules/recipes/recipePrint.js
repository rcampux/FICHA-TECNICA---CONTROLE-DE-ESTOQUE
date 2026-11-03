(function exposeRecipePrint() {
  function choosePrintPhoto(name, ingredients) {
    const normalize = value => String(value ?? '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const title = normalize(name);
    const sweet = /\b(pudim|pudins|(?:brigadeiro|beijinho|doce|sobremesa|biscoito|bolo|brownie|chocolate|trufa|sorvete|pave|cookie|mousse)s?)\b/.test(title)
      || ingredients.some(item => /\b(cacau|chocolates?|leite condensado)\b/.test(normalize(item.name)));
    return sweet && !/\b(salgad[oa]s?|carnes?|frangos?|atum|peixes?)\b/.test(title)
      ? {file: 'caderno-confeitaria.jpg', caption: 'Fotografia editorial · Confeitaria', alt: 'Cacau em uma tigela de cerâmica, colher e gotas de chocolate sobre linho.'}
      : {file: 'caderno-cozinha.jpg', caption: 'Fotografia editorial · Cozinha', alt: 'Salsa fresca, alho e flor de sal sobre uma tábua de madeira.'};
  }

  function writeRecipeBook(preview, recipe, escape, baseUrl) {
    const art = choosePrintPhoto(recipe.name, recipe.ingredients);
    const editorialUrl = new URL('../assets/images/' + art.file, baseUrl).href;
    const stylesheet = new URL('../src/styles/recipe-print.css', baseUrl).href;
    const rows = recipe.ingredients.map(item => `<tr><th scope="row">${escape(item.name)}</th><td>${escape(item.quantity)}</td><td>${escape(item.cost)}</td></tr>`).join('');
    const nutrients = recipe.nutrients.map(item => `<tr><th scope="row">${escape(item.label)}</th><td>${escape(item.value)}</td><td>${escape(item.daily)}</td></tr>`).join('');
    const facts = entries => entries.map(([label, value, kind]) => `<div${kind === 'markup' ? ' class="markup-fact"' : ''}><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('');
    const safeName = escape(recipe.name);
    const doc = preview.document;
    doc.open();
    doc.write(`<!doctype html>
<html lang="pt-BR"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer">
  <title>${safeName} · FichaTec</title><link rel="stylesheet" href="${escape(stylesheet)}">
</head><body>
  <nav class="print-tools" aria-label="Exportar receita"><button type="button" id="print-recipe">Salvar ou imprimir PDF</button></nav>
  <main>
    <article class="book-leaf culinary" aria-labelledby="recipe-name">
      <header class="masthead"><span class="wordmark"><b aria-hidden="true">FT</b> FichaTec</span><span>Caderno de receitas</span></header>
      <div class="cover">
        <div class="cover-copy">
          <h1 id="recipe-name">${safeName}</h1>
          <dl class="yield-facts">${facts(recipe.yieldFacts)}</dl>
        </div>
        <figure class="cover-photo"><img id="cover-photo" src="${escape(recipe.cover || editorialUrl)}" alt="${escape(recipe.cover ? 'Foto da receita ' + recipe.name : art.alt)}" width="750" height="500">
          <figcaption id="cover-caption" ${recipe.cover ? 'hidden' : ''}>${escape(art.caption)}</figcaption></figure>
      </div>
      <section class="recipe-section"><h2>Ingredientes <span class="ingredient-count">(${recipe.ingredients.length})</span></h2>
        <table><thead><tr><th scope="col">Ingrediente</th><th scope="col">Quantidade</th><th scope="col">Custo</th></tr></thead>
        <tbody>${rows}</tbody><tfoot><tr><th scope="row" colspan="2">Custo dos ingredientes</th><td>${escape(recipe.cost)}</td></tr></tfoot></table>
      </section>
      ${recipe.preparation ? `<section class="recipe-section instructions"><h2>Modo de preparo</h2><p>${escape(recipe.preparation)}</p></section>` : ''}
      ${recipe.notes ? `<aside class="recipe-notes"><h3>Observações</h3><p>${escape(recipe.notes)}</p></aside>` : ''}
    </article>
    <article class="book-leaf technical" aria-labelledby="technical-title">
      <header class="masthead"><span class="wordmark"><b aria-hidden="true">FT</b> FichaTec</span><span>Ficha técnica</span></header>
      <div class="technical-intro">
        <div><p class="running-title">${safeName}</p><h2 id="technical-title">Custos e rendimento</h2></div>
        ${recipe.cover ? `<figure class="technical-photo"><img src="${escape(editorialUrl)}" alt="${escape(art.alt)}" width="420" height="200"><figcaption>${escape(art.caption)}</figcaption></figure>` : ''}
      </div>
      <dl class="sale-prices">${facts(recipe.saleFacts)}</dl>
      <dl class="cost-facts">${facts(recipe.costFacts)}</dl>
      ${recipe.priceNote ? `<p class="price-note">${escape(recipe.priceNote)}</p>` : ''}
      <section class="recipe-section nutrition"><h2>Informação nutricional</h2>
        <p class="section-note">Estimativa por ${escape(recipe.nutritionWeight)} g da receita.</p>
        <table><thead><tr><th scope="col">Nutriente</th><th scope="col">Quantidade</th><th scope="col">% VD</th></tr></thead><tbody>${nutrients}</tbody></table>
      </section>
      <footer class="edition"><span>${escape(recipe.origin)}</span><span>Emitida em ${escape(recipe.issuedOn)}</span></footer>
    </article>
  </main>
</body></html>`);
    doc.close();
    doc.getElementById('print-recipe').addEventListener('click', () => preview.print());
    const cover = doc.getElementById('cover-photo');
    const detail = doc.querySelector('.technical-photo');
    function recoverCover() {
      if (cover.getAttribute('src') === editorialUrl) {
        cover.closest('figure').hidden = true;
        return;
      }
      cover.src = editorialUrl;
      cover.alt = art.alt;
      doc.getElementById('cover-caption').hidden = false;
      if (detail) detail.hidden = true;
    }
    cover.addEventListener('error', recoverCover);
    if (cover.complete && !cover.naturalWidth) recoverCover();
    if (detail) {
      const image = detail.querySelector('img');
      image.addEventListener('error', () => { detail.hidden = true; });
      if (image.complete && !image.naturalWidth) detail.hidden = true;
    }
  }

  window.FichaTecRecipePrint = {writeRecipeBook};
})();
