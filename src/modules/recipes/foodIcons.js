(function exposeFoodIcons() {
  const libraryUrl = typeof document === 'undefined' ? null
    : new URL('../../../assets/icons/food-flat-v1/manifest.json', document.currentScript.src);
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  // Specific phrases outrank single words (condensed milk must never become milk).
  const aliases = {
    'bacon':['bacon','toucinho defumado'],
    'ovo-cozido':['ovo cozido','ovos cozidos','ovo de codorna cozido'],
    'calabresa':['calabresa','linguica calabresa'],
    'linguica':['linguica','linguicas','linguica toscana'],
    'embutidos':['embutido','embutidos','presunto','mortadela','salame','salsicha'],
    'farinha-mandioca':['farinha de mandioca','farinha mandioca','farinha de aipim'],
    'cacau':['cacau'], 'cacau-po':['cacau em po','cacau po','cacau 100 em po'],
    'chocolate-po':['chocolate em po','achocolatado','nescau','toddy'],
    'whey-protein':['whey','whey protein','proteina do soro do leite'],
    'suplementos':['suplemento','suplementos','suplemento alimentar','creatina','colageno'],
    'farinha-trigo':['farinha de trigo','farinha trigo'],
    'leite-condensado':['leite condensado'], 'doce-leite':['doce de leite'],
    'leite-condensado-lata':['leite condensado lata','leite condensado em lata'],
    'atum-lata':['atum','atum em lata'], 'sardinha-lata':['sardinha','sardinhas'],
    'ervilha-lata':['ervilha em conserva','ervilha em lata','ervilha lata'],
    'milho-lata':['milho verde em conserva','milho em conserva','milho em lata','milho lata'],
    'enlatados':['conserva','enlatado','enlatados'],
    'limao-siciliano':['limao siciliano'], 'limao':['limao','limoes'],
    'maca-vermelha':['maca','macas','maca vermelha'], 'maca-verde':['maca verde'],
    'tangerina':['tangerina','mexerica','bergamota','laranja'],
    'mirtilo':['mirtilo','mirtilos','blueberry'], 'uva':['uva','uvas'],
    'banana':['banana','bananas'], 'brocolis':['brocolis','broccoli'],
    'morango':['morango','morangos'], 'cereja':['cereja','cerejas'],
    'feijao':['feijao','feijoes'], 'arroz':['arroz'], 'coco':['coco'],
    'abacaxi':['abacaxi','abacaxis'], 'folhas':['alface','couve','rucula','espinafre','acelga'],
    'ervilha-vagem':['ervilha','ervilhas','vagem'], 'raiz':['mandioca','aipim','inhame','batata doce','mandioquinha'],
    'pimenta':['pimenta','pimentas'], 'pimentao':['pimentao','pimentoes'],
    'castanha':['castanha','castanhas','nozes','amendoa','amendoas'],
    'cogumelo':['cogumelo','cogumelos','champignon','shiitake','shimeji'],
    'carne-crua':['carne bovina','carne crua','acem','patinho','musculo','alcatra','file mignon'],
    'ovo':['ovo','ovos','gema','gemas','clara','claras'], 'queijo':['queijo','queijos','mussarela','mucarela','ricota'],
    'manteiga':['manteiga','margarina'], 'leite':['leite','creme de leite'],
    'sorvete-massa':['sorvete','sorvetes'], 'sal':['sal'], 'mel':['mel'],
    'camarao':['camarao','camaroes'], 'ostra':['ostra','ostras'],
    'ervas':['ervas','salsinha','salsa','coentro','manjericao','oregano','salvia','alecrim'],
    'acucares':['acucar','acucares','adocante'], 'farinhas':['farinha','farinhas','polvilho','amido'],
    'cereais':['aveia','granola','cereal','cereais'], 'carboidratos':['pao','macarrao','massa','tapioca'],
    'carnes':['carne','frango','suino','bovina','peixe'],
    'leguminosas':['lentilha','soja','grao de bico'], 'oleaginosas':['oleaginosa','oleaginosas'],
    'oleos-gorduras':['oleo','azeite','banha'], 'proteinas':['proteina','proteinas'],
    'laticinios-iogurte':['iogurte','iogurtes'], 'laticinios-leite':['laticinio','laticinios'],
    'temperos':['tempero','temperos','vinagre'], 'hortifruti':['fruta','legume','verdura'],
  };
  const categoryAliases = {
    'suplementos alimentares':'suplementos','embutidos e frios':'embutidos','frios':'embutidos',
    'laticinios':'laticinios-leite','laticinios leite':'laticinios-leite',
    'laticinios iogurte':'laticinios-iogurte','oleos e gorduras':'oleos-gorduras',
    'confeitaria':'acucares','doces':'acucares','frutas':'hortifruti','verduras':'hortifruti',
    'legumes':'hortifruti','carnes e aves':'carnes','pescados':'proteinas','bebidas':'outros',
  };
  function createResolver(icons) {
    const byId = new Map(icons.map(icon => [icon.id, icon]));
    const terms = icons.flatMap(icon => [...new Set([
      normalize(icon.label), normalize(icon.id), ...(aliases[icon.id] || []).map(normalize)
    ])].map(term => ({term, icon}))).sort((a,b) => b.term.length - a.term.length);
    function match(text) {
      const name = ' ' + normalize(text) + ' ';
      return terms.find(({term}) => term && name.includes(' ' + term + ' '))?.icon;
    }
    return function resolveIngredientIcon(name, category) {
      // Flour is a prepared ingredient, never the raw root/fruit named after it.
      const flour = /\b(farinha|farinhas|polvilho|amido)\b/.test(normalize(name));
      const direct = flour
        ? (['farinha-mandioca','farinha-trigo'].includes(match(name)?.id) ? match(name) : byId.get('farinhas'))
        : match(name);
      if (direct) return direct;
      const key = normalize(category);
      return byId.get(categoryAliases[key] || key.replace(/ /g, '-')) || match(category)
        || byId.get(category ? 'outros' : 'sem-categoria') || icons[0];
    };
  }
  let pending;
  function loadLibrary() {
    if (!pending) pending = fetch(libraryUrl, {cache:'no-cache'})
      .then(response => { if (!response.ok) throw Error('Biblioteca indisponível'); return response.json(); })
      .then(manifest => {
        if (!manifest.icons?.length || manifest.count !== manifest.icons.length) throw Error('Biblioteca incompleta');
        const icons = manifest.icons.map(icon => ({
          ...icon, url:new URL(icon.id + '.webp', libraryUrl).href
        }));
        return {icons, resolve:createResolver(icons)};
      }).catch(error => { pending = null; throw error; });
    return pending;
  }
  window.FichaTecFoodIcons = {normalize, createResolver, loadLibrary};
})();
