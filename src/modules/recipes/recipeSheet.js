(function exposeRecipeSheetModule() {
  function createRecipeSheetModule(deps) {
    const {
      closeModal,
      confirmAction,
      db: DB,
      formatCurrency: fmtBRL,
      formatQuantity: fmtQty,
      getNutrition,
      getPhysicalStock,
      getRecipes,
      getStock,
      pricePerUnit,
      setPhysicalStock,
      setRecipes,
      setStock,
      showPage,
      showToast,
      storageKeys: STORAGE_KEYS,
    } = deps;

    let currentIngredients = [];
    let selectedIngredient = null;
    let currentRecipeId = null;
    let activeIngFilter = null;
    let ingSource = 'virtual';
    let stock = getStock();
    let physicalStock = getPhysicalStock();
    let recipes = getRecipes();

    function syncState() {
      stock = getStock();
      physicalStock = getPhysicalStock();
      recipes = getRecipes();
    }

    function commitState() {
      setStock(stock);
      setPhysicalStock(physicalStock);
      setRecipes(recipes);
    }

    async function persistRecipesSnapshot(nextRecipes) {
      recipes = nextRecipes;
      setRecipes(recipes);
      if (DB.saveLocal) DB.saveLocal(STORAGE_KEYS.recipes, recipes);
      else DB.save(STORAGE_KEYS.recipes, recipes);

      const organizationId = DB.activeOrganizationId?.();
      if (DB.mode?.() === "supabase" && !organizationId) {
        throw new Error("Workspace Supabase ativo nao encontrado.");
      }
      if (DB.mode?.() === "supabase" && DB.saveRemote && organizationId) {
        try {
          const savedRecipes = await DB.saveRemote(STORAGE_KEYS.recipes, recipes, organizationId);
          if (Array.isArray(savedRecipes)) {
            recipes = savedRecipes;
            setRecipes(recipes);
          }
        } catch (error) {
          console.error("Recipe remote sync failed", error);
          throw error;
        }
      }

      return recipes;
    }

    function focusRecipeCard(recipeId) {
      window.requestAnimationFrame(() => {
        const card = [...document.querySelectorAll("#recipes-list .recipe-card")]
          .find((element) => String(element.dataset.recipeId) === String(recipeId));
        if (!card) return;

        card.classList.add("recipe-card-focus");
        card.scrollIntoView({behavior:"smooth", block:"center"});
        window.setTimeout(() => card.classList.remove("recipe-card-focus"), 1800);
      });
    }

    function escapeAttribute(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    function bindRecipeCardActions(listElement) {
      listElement.onclick = async (event) => {
        const card = event.target.closest(".recipe-card");
        if (!card || !listElement.contains(card)) return;

        const id = card.dataset.recipeId;
        const actionElement = event.target.closest("[data-recipe-action]");
        const action = actionElement?.dataset.recipeAction || "view";
        if (action === "edit") {
          editRecipe(id);
          return;
        }
        if (action === "delete") {
          await deleteRecipe(id);
          return;
        }
        if (action === "pdf") {
          exportRecipePDF(id);
          return;
        }
        viewRecipe(id);
      };
    }

    function findStockItem(stockId,name){
      if(stockId&&!String(stockId).startsWith('pf_')){const s=stock.find(x=>x.id===stockId||x.id===parseInt(stockId));if(s)return s;}
      return stock.find(x=>x.name.toLowerCase()===name.toLowerCase())||null;
    }
    function calcCosts(ingredients,markup=0){
      const list=ingredients.map(i=>{const s=findStockItem(i.stockId,i.name);const ppg=s?pricePerUnit(s):0;return{...i,cost:ppg*i.qtyBruta,currentPricePerG:ppg};});
      const totalCost=list.reduce((a,i)=>a+i.cost,0);
      return{ingredients:list,totalCost,venda:totalCost*(1+(markup||0)/100)};
    }
    /* ══ FICHA ══ */
    function setIngSource(src){
      ingSource=src;
      document.getElementById('src-btn-virtual').classList.toggle('active',src==='virtual');
      document.getElementById('src-btn-fisico').classList.toggle('active',src==='fisico');
      document.getElementById('ing-search').value='';
      document.getElementById('ing-dropdown').classList.remove('open');
      document.getElementById('ing-selected-info').style.display='none';
      document.getElementById('ing-cost-preview').style.display='none';
      selectedIngredient=null;
    }
    function searchIngredient(){
      const q=document.getElementById('ing-search').value.toLowerCase().trim();
      const dd=document.getElementById('ing-dropdown');
      if(!q){dd.classList.remove('open');return;}
      const matches=ingSource==='fisico'
        ?physicalStock.filter(p=>p.name.toLowerCase().includes(q)&&p.currentQty>0).slice(0,8).map(p=>({id:'pf_'+p.id,name:p.name,unit:p.unit,price:p.price,qty:p.currentQty,_physicalId:p.id,nutrition:getNutrition(p.name)}))
        :stock.filter(s=>s.name.toLowerCase().includes(q)).slice(0,8);
      if(!matches.length){dd.innerHTML=`<div class="autocomplete-item" style="color:var(--n400)">Nenhum ingrediente encontrado</div>`;}
      else{
        dd.innerHTML=matches.map(s=>{
          const ppg=pricePerUnit(s);
          const sub=s.unit==='ml'?fmtBRL(ppg*1000)+'/L':s.unit==='un'?fmtBRL(ppg)+'/un':fmtBRL(ppg*1000)+'/kg';
          return`<div class="autocomplete-item" onclick="selectIngredient('${s.id}')">
            <div>${s.name}${ingSource==='fisico'?` <span style="font-size:11px;color:var(--g500);font-weight:700">${fmtQty(s.qty,s.unit)} disp.</span>`:''}</div>
            <div class="sub">${s.qty}${s.unit} · ${fmtBRL(s.price)} · ${sub}</div>
          </div>`;
        }).join('');
      }
      dd.classList.add('open');
    }
    function selectIngredient(id){
      if(ingSource==='fisico'&&String(id).startsWith('pf_')){
        const rawId=String(id).replace('pf_','');
        const numericId=Number(rawId);
        const pid=Number.isFinite(numericId)&&String(numericId)===rawId?numericId:rawId;
        const p=physicalStock.find(x=>x.id===pid);if(!p)return;
        selectedIngredient={id:'pf_'+p.id,name:p.name,unit:p.unit,price:p.price,qty:p.currentQty,_physicalId:p.id,nutrition:getNutrition(p.name)};
      }else{selectedIngredient=stock.find(s=>s.id===parseInt(id)||s.id===id);}
      if(!selectedIngredient)return;
      document.getElementById('ing-search').value=selectedIngredient.name;
      document.getElementById('ing-dropdown').classList.remove('open');
      const ppg=pricePerUnit(selectedIngredient),u=selectedIngredient.unit;
      document.getElementById('ing-sel-name').textContent=selectedIngredient.name;
      document.getElementById('ing-sel-price').textContent=u==='ml'?`${fmtBRL(ppg*1000)}/L · ${fmtBRL(ppg*100)}/100ml`:u==='un'?`${fmtBRL(ppg)}/unidade`:`${fmtBRL(ppg*1000)}/kg · ${fmtBRL(ppg*100)}/100g`;
      document.getElementById('ing-selected-info').style.display='block';
      calcIngCost();
    }
    function calcIngCost(){
      if(!selectedIngredient)return;
      const qty=parseFloat(document.getElementById('ing-qty').value)||0;
      const unit=document.getElementById('ing-unit').value;
      const qtyG=unit==='kg'?qty*1000:qty;
      const cost=unit==='un'?pricePerUnit(selectedIngredient)*qty:pricePerUnit(selectedIngredient)*qtyG;
      const el=document.getElementById('ing-cost-preview');
      if(qty>0){el.style.display='block';el.textContent=`Custo estimado: ${fmtBRL(cost)}`;}
      else el.style.display='none';
    }
    function addIngredient(){
      if(!selectedIngredient){showToast('Selecione um ingrediente.');return;}
      const qty=parseFloat(document.getElementById('ing-qty').value);
      const unit=document.getElementById('ing-unit').value;
      const rend=parseFloat(document.getElementById('ing-rendimento').value)||100;
      if(!qty||qty<=0){showToast('Informe a quantidade.');return;}
      const isUn=unit==='un';
      const qtyG=isUn?qty:(unit==='kg'?qty*1000:qty);
      const qtyBruta=isUn?qty:qtyG/(rend/100);
      currentIngredients.push({
        id:Date.now(),stockId:selectedIngredient.id,physicalId:selectedIngredient._physicalId||null,
        source:ingSource,name:selectedIngredient.name,qtyG,qtyBruta,unit,rendimento:rend,
        cost:pricePerUnit(selectedIngredient)*qtyBruta,
        nutrition:selectedIngredient.nutrition||getNutrition(selectedIngredient.name)
      });
      if(ingSource==='fisico'&&selectedIngredient._physicalId){
        const pid=selectedIngredient._physicalId;
        physicalStock=physicalStock.map(p=>{
          if(p.id!==pid)return p;
          return{...p,currentQty:Math.max(parseFloat((p.currentQty-qtyBruta).toFixed(6)),0),usedTotal:(p.usedTotal||0)+qtyBruta,history:[...(p.history||[]),{type:'saida',qty:qtyBruta,date:new Date().toISOString()}]};
        });
        DB.save(STORAGE_KEYS.physicalStock,physicalStock);
        const vn=selectedIngredient.name.toLowerCase();
        stock=stock.map(s=>s.name.toLowerCase()===vn?{...s,qty:Math.max(parseFloat((s.qty-qtyBruta).toFixed(6)),0)}:s);
        DB.save(STORAGE_KEYS.stock,stock);
      }
      ['ing-search','ing-qty','ing-rendimento'].forEach(f=>document.getElementById(f).value='');
      document.getElementById('ing-selected-info').style.display='none';
      document.getElementById('ing-cost-preview').style.display='none';
      selectedIngredient=null;
      renderIngredients();calcFicha();
    }
    async function removeIngredient(id){
      if(!await confirmAction('Deseja remover este ingrediente da ficha tecnica?','Remover ingrediente'))return;
      currentIngredients=currentIngredients.filter(i=>i.id!==id);renderIngredients();calcFicha();
    }
    function renderIngredients(){
      const el=document.getElementById('ingredients-list');
      if(!currentIngredients.length){el.innerHTML='';return;}
      el.innerHTML=`<div class="card">
        <div class="card-title"><span class="material-symbols-rounded icon-sm">format_list_bulleted</span> Ingredientes (${currentIngredients.length})</div>
        ${currentIngredients.map(i=>`<div class="ingredient-row">
          <div style="flex:1;min-width:0">
            <div class="ing-name">${i.name}</div>
            <div class="ing-qty">${i.unit==='un'?i.qtyG+'un':i.unit==='ml'?i.qtyG+'ml':i.qtyG+'g'} usados${i.unit!=='un'&&i.rendimento<100?' → '+i.qtyBruta.toFixed(0)+(i.unit==='ml'?'ml':'g')+' bruto':''}</div>
          </div>
          <div class="ing-cost">${fmtBRL(i.cost)}</div>
          <button class="ing-del" onclick="removeIngredient(${i.id})"><span class="material-symbols-rounded">close</span></button>
        </div>`).join('')}
      </div>`;
    }
    function calcFicha(){
      if(!currentIngredients.length){document.getElementById('ficha-totals').style.display='none';return;}
      const markup=parseFloat(document.getElementById('markup-pct').value)||0;
      const {totalCost,venda}=calcCosts(currentIngredients,markup);
      const rend=parseFloat(document.getElementById('ficha-rendimento').value)||0;
      const porcoes=Math.max(parseFloat(document.getElementById('ficha-porcoes').value)||1,1);
      document.getElementById('total-custo').textContent=fmtBRL(totalCost);
      document.getElementById('total-venda').textContent=fmtBRL(venda);
      document.getElementById('total-porcao').textContent=fmtBRL(totalCost/porcoes);
      document.getElementById('total-kg').textContent=rend>0?fmtBRL(totalCost/(rend/1000)):'—';
      document.getElementById('ficha-totals').style.display='block';
      calcNutrition();
    }
    function calcNutrition(){
      const portion=parseFloat(document.getElementById('portion-size').value)||100;
      document.getElementById('nut-portion-label').textContent=`${portion}g`;
      const totalQtyG=currentIngredients.reduce((s,i)=>s+i.qtyBruta,0)||1;
      const tot={kcal:0,carb:0,prot:0,fat:0,fiber:0,sodium:0};
      currentIngredients.forEach(i=>{
        const ratio=i.qtyBruta/totalQtyG;
        const n=(i.nutrition&&i.nutrition.kcal)?i.nutrition:getNutrition(i.name);
        Object.keys(tot).forEach(k=>tot[k]+=(n[k]||0)*ratio);
      });
      const sc=portion/100;
      const vd={kcal:2500,carb:375,prot:75,fat:83,fiber:25,sodium:2400};
      const rows=[
        ['Valor Energético',`${(tot.kcal*sc).toFixed(0)} kcal`,tot.kcal*sc/vd.kcal],
        ['Carboidratos',`${(tot.carb*sc).toFixed(1)} g`,tot.carb*sc/vd.carb],
        ['Proteínas',`${(tot.prot*sc).toFixed(1)} g`,tot.prot*sc/vd.prot],
        ['Gorduras Totais',`${(tot.fat*sc).toFixed(1)} g`,tot.fat*sc/vd.fat],
        ['Fibra Alimentar',`${(tot.fiber*sc).toFixed(1)} g`,tot.fiber*sc/vd.fiber],
        ['Sódio',`${(tot.sodium*sc).toFixed(0)} mg`,tot.sodium*sc/vd.sodium],
      ];
      document.getElementById('nutrition-body').innerHTML=rows.map(([n,v,pct])=>`<tr>
        <td>${n}</td><td class="val">${v}</td>
        <td style="text-align:right;min-width:88px">
          <div class="nut-pct">${Math.round(pct*100)}%</div>
          <div class="progress-bar" style="width:76px;margin-left:auto"><div class="progress-fill" style="width:${Math.min(pct*100,100).toFixed(1)}%"></div></div>
        </td>
      </tr>`).join('');
    }
    async function clearFicha(options = {}){
      if(currentIngredients.length&&!options.force&&!await confirmAction('Deseja limpar todos os dados desta ficha tecnica?','Limpar ficha','Sim, limpar'))return;
      currentIngredients=[];
      ['ficha-nome','ficha-rendimento','ficha-porcoes','markup-pct'].forEach(f=>document.getElementById(f).value='');
      document.getElementById('portion-size').value='100';
      document.getElementById('ficha-totals').style.display='none';
      document.getElementById('ingredients-list').innerHTML='';
      if(!options.silent)showToast('Ficha limpa.');
    }
    async function saveRecipe(){
      const nome=document.getElementById('ficha-nome').value.trim();
      if(!nome){showToast('Informe o nome da receita.');return;}
      if(!currentIngredients.length){showToast('Adicione pelo menos um ingrediente.');return;}
      const markup=parseFloat(document.getElementById('markup-pct').value)||0;
      const ingredientRefs=currentIngredients.map(i=>({...i,savedPricePerG:pricePerUnit(findStockItem(i.stockId,i.name)||{price:0,qty:1,unit:'kg'})}));
      const {totalCost,venda}=calcCosts(ingredientRefs,markup);
      const idx=recipes.findIndex(r=>r.nome.toLowerCase()===nome.toLowerCase());
      const existingRecipe=idx>=0?recipes[idx]:null;
      const now=new Date().toISOString();
      const recipe={
        id:existingRecipe?.id||Date.now(),remoteId:existingRecipe?.remoteId,nome,ingredients:ingredientRefs,
        rendimento:parseFloat(document.getElementById('ficha-rendimento').value)||0,
        porcoes:parseFloat(document.getElementById('ficha-porcoes').value)||1,
        markup,totalCost,venda,
        porcaoSize:parseFloat(document.getElementById('portion-size').value)||100,
        createdAt:existingRecipe?.createdAt||now,
        updatedAt:now
      };
      if(idx>=0){if(!await confirmAction(`Receita "${nome}" ja existe. Deseja sobrescrever?`,'Sobrescrever receita','Sim, sobrescrever'))return;recipes[idx]=recipe;}
      else recipes.push(recipe);
      try {
        await persistRecipesSnapshot(recipes);
      } catch (error) {
        console.error(error);
        showToast("Nao foi possivel salvar a receita no Supabase.");
        return;
      }
      showToast(DB.mode?.() === "supabase" ? `"${nome}" salva no banco!` : `"${nome}" salva!`);
      showPage('receitas','nav-receitas');
      renderRecipes('',null);
      focusRecipeCard(recipe.id);
      await clearFicha({force:true,silent:true});
    }
    
    /* ══ RECEITAS ══ */
    function hasPriceChanged(refs){
      return refs.some(i=>{
        if(!i.savedPricePerG)return false;
        const s=findStockItem(i.stockId,i.name);
        return s&&Math.abs(pricePerUnit(s)-i.savedPricePerG)>0.000001;
      });
    }
    function renderRecipes(filter='',ingFilter=null){
      const allIng=[...new Set(recipes.flatMap(r=>r.ingredients.map(i=>i.name)))].slice(0,15);
      document.getElementById('ingredient-filter-chips').innerHTML=
        `<div class="chip ${!ingFilter?'active':''}" onclick="setIngFilter(null)"><span class="material-symbols-rounded" style="font-size:14px">grid_view</span> Todas</div>`+
        allIng.map(n=>`<div class="chip ${ingFilter===n?'active':''}" onclick="setIngFilter('${n.replace(/'/g,"\\'")}')">${n}</div>`).join('');
      let f=recipes.filter(r=>r.nome.toLowerCase().includes((filter||'').toLowerCase()));
      if(ingFilter)f=f.filter(r=>r.ingredients.some(i=>i.name===ingFilter));
      const el=document.getElementById('recipes-list');
      if(!f.length){
        el.onclick = null;
        el.innerHTML=`<div class="empty-state"><span class="empty-icon"><span class="material-symbols-rounded" style="font-size:52px;font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 48">menu_book</span></span><div class="empty-text">${filter||ingFilter?'Nenhuma receita encontrada.':'Nenhuma receita salva ainda.'}</div></div>`;
        return;
      }
      el.innerHTML=f.map(r=>{
        const {totalCost,venda}=calcCosts(r.ingredients,r.markup);
        const changed=hasPriceChanged(r.ingredients);
        const diff=totalCost-r.totalCost;
        const recipeId=escapeAttribute(r.id);
        return`<div class="recipe-card" data-recipe-id="${recipeId}">
          <div class="recipe-card-heading">
            <div class="recipe-card-title">${r.nome}${r.origem==='scan'?` <span class="scan-badge" style="font-size:10px"><span class="material-symbols-rounded" style="font-size:12px">document_scanner</span>Scan</span>`:''}</div>
            <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
              ${changed?`<span style="font-size:11px;background:${diff>0?'var(--r100)':'var(--g50)'};color:${diff>0?'var(--r400)':'var(--g600)'};padding:2px 8px;border-radius:var(--r-pill);font-weight:700">${diff>0?'▲':'▼'} ${fmtBRL(Math.abs(diff))}</span>`:''}
              <span class="badge badge-green">${fmtBRL(totalCost)}</span>
              <span class="recipe-card-actions">
                <button class="btn btn-secondary btn-icon" data-recipe-action="edit" type="button"><span class="material-symbols-rounded">edit</span></button>
                <button class="btn btn-danger btn-icon" data-recipe-action="delete" type="button"><span class="material-symbols-rounded">delete</span></button>
              </span>
            </div>
          </div>
          <div class="recipe-card-meta"><span class="material-symbols-rounded">fork_spoon</span>${r.ingredients.length} ingrediente(s) · ${r.porcoes} porção(ões)${r.rendimento?' · '+r.rendimento+'g':''} · Markup ${r.markup}%</div>
          <div class="recipe-card-meta" style="color:var(--g600);font-weight:700"><span class="material-symbols-rounded" style="color:var(--g500)">payments</span> Venda: ${fmtBRL(venda)}</div>
          ${changed?`<div class="recipe-card-meta" style="font-size:11px;color:var(--n400)"><span class="material-symbols-rounded" style="font-size:13px">sync</span> Preços atualizados</div>`:''}
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--s3)">
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              ${r.ingredients.slice(0,4).map(i=>`<span class="tag">${i.name}</span>`).join('')}
              ${r.ingredients.length>4?`<span class="tag">+${r.ingredients.length-4}</span>`:''}
            </div>
            <button class="btn btn-outlined btn-xs" data-recipe-action="pdf" style="margin-left:var(--s2)" type="button">
              <span class="material-symbols-rounded" style="font-size:14px">picture_as_pdf</span> PDF
            </button>
          </div>
        </div>`;
      }).join('');
      bindRecipeCardActions(el);
    }
    function setIngFilter(val){activeIngFilter=val;renderRecipes(document.getElementById('recipe-search').value,val);}
    function viewRecipe(id){
      const r=recipes.find(x=>String(x.id)===String(id));if(!r)return;
      currentRecipeId=id;
      const {ingredients,totalCost,venda}=calcCosts(r.ingredients,r.markup);
      const porcoes=Math.max(r.porcoes||1,1);
      const changed=hasPriceChanged(r.ingredients);
      const diff=totalCost-r.totalCost;
      document.getElementById('recipe-detail-content').innerHTML=`
        <div style="font-size:20px;font-weight:800;margin-bottom:4px;letter-spacing:-0.4px">${r.nome}${r.origem==='scan'?` <span class="scan-badge" style="font-size:10px"><span class="material-symbols-rounded" style="font-size:12px">document_scanner</span>Scan</span>`:''}</div>
        <div style="font-size:12px;color:var(--n600);margin-bottom:${changed?'12px':'20px'};font-weight:500;display:flex;align-items:center;gap:4px">
          <span class="material-symbols-rounded" style="font-size:14px">calendar_today</span>
          Criada em ${new Date(r.createdAt).toLocaleDateString('pt-BR')} · ${r.ingredients.length} ingrediente(s)
        </div>
        ${changed?`<div style="background:${diff>0?'var(--r100)':'var(--g50)'};border:1px solid ${diff>0?'var(--r400)':'var(--g200)'};border-radius:var(--r-md);padding:var(--s3) var(--s4);margin-bottom:var(--s4);font-size:12px;color:${diff>0?'var(--r400)':'var(--g600)'};display:flex;align-items:flex-start;gap:var(--s2)">
          <span class="material-symbols-rounded" style="font-size:16px;flex-shrink:0">sync</span>
          <span><strong>Preços atualizados</strong><br>Custo salvo: ${fmtBRL(r.totalCost)} → Atual: <strong>${fmtBRL(totalCost)}</strong>${diff!==0?` (${diff>0?'+':''}${fmtBRL(diff)})`:''}  </span>
        </div>`:''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s2);margin-bottom:var(--s4)">
          ${[['Custo Total',fmtBRL(totalCost),'var(--n50)','var(--n900)','payments'],
             ['Preço de Venda',fmtBRL(venda),'var(--g50)','var(--g600)','sell'],
             ['Markup',r.markup+'%','var(--n50)','var(--n900)','trending_up'],
             ['Por Porção',fmtBRL(totalCost/porcoes),'var(--n50)','var(--n900)','restaurant']
            ].map(([l,v,bg,c,ico])=>`<div style="background:${bg};padding:var(--s3) var(--s4);border-radius:var(--r-md)">
              <div style="font-size:11px;color:var(--n600);font-weight:600;margin-bottom:3px;display:flex;align-items:center;gap:4px">
                <span class="material-symbols-rounded" style="font-size:13px">${ico}</span>${l}
              </div>
              <div style="font-size:16px;font-weight:800;font-family:'Roboto Mono',monospace;color:${c}">${v}</div>
            </div>`).join('')}
        </div>
        <div style="font-size:11px;font-weight:700;color:var(--n600);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:var(--s2);display:flex;align-items:center;gap:4px">
          <span class="material-symbols-rounded" style="font-size:14px">format_list_bulleted</span> Ingredientes
        </div>
        ${ingredients.map(i=>{
          const s=findStockItem(i.stockId,i.name);
          const curPPG=s?pricePerUnit(s):0;
          const ingChanged=i.savedPricePerG&&Math.abs(curPPG-i.savedPricePerG)>0.000001;
          return`<div class="ingredient-row">
            <div style="flex:1;min-width:0">
              <div class="ing-name">${i.name}${ingChanged?` <span style="font-size:10px;font-weight:700;color:${curPPG>i.savedPricePerG?'var(--r400)':'var(--g500)'}">${curPPG>i.savedPricePerG?'▲':'▼'}</span>`:''}</div>
              <div class="ing-qty">${i.qtyBruta.toFixed(0)}${i.unit==='ml'?'ml':'g'}</div>
            </div>
            <div class="ing-cost" style="${ingChanged?'color:'+(curPPG>i.savedPricePerG?'var(--r400)':'var(--g500)'):''}"> ${fmtBRL(i.cost)}</div>
          </div>`;
        }).join('')}
        ${r.modoPreparo?`<div style="margin-top:var(--s4)">
          <div style="font-size:11px;font-weight:700;color:var(--n600);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:var(--s2);display:flex;align-items:center;gap:4px">
            <span class="material-symbols-rounded" style="font-size:14px">menu_book</span> Modo de Preparo
          </div>
          <div style="font-size:13px;color:var(--n800);line-height:1.7;background:var(--n50);border-radius:var(--r-md);padding:var(--s3) var(--s4)">${r.modoPreparo.replace(/\n/g,'<br>')}</div>
        </div>`:''}
        ${r.observacoes?`<div style="margin-top:var(--s3);font-size:12px;color:var(--n600);background:var(--warn-bg);border-radius:var(--r-md);padding:var(--s3) var(--s4);line-height:1.6">
          <strong>Obs:</strong> ${r.observacoes}</div>`:''}`;
      document.getElementById('modal-recipe').classList.add('open');
    }
    async function deleteCurrentRecipe(){
      if(!await confirmAction('Deseja excluir esta receita salva?','Excluir receita'))return;
      recipes=recipes.filter(r=>String(r.id)!==String(currentRecipeId));
      try {
        await persistRecipesSnapshot(recipes);
      } catch (error) {
        console.error(error);
        showToast("Nao foi possivel excluir a receita no Supabase.");
        return;
      }
      closeModal('modal-recipe');
      renderRecipes(document.getElementById('recipe-search').value,activeIngFilter);
      showToast('Receita excluída.');
    }
    function editRecipe(id){
      currentRecipeId=id;
      loadRecipeToFicha();
    }
    async function deleteRecipe(id){
      currentRecipeId=id;
      await deleteCurrentRecipe();
    }
    function loadRecipeToFicha(){
      const r=recipes.find(x=>String(x.id)===String(currentRecipeId));if(!r)return;
      closeModal('modal-recipe');
      currentIngredients=[...r.ingredients];
      document.getElementById('ficha-nome').value=r.nome;
      document.getElementById('ficha-rendimento').value=r.rendimento||'';
      document.getElementById('ficha-porcoes').value=r.porcoes||'';
      document.getElementById('markup-pct').value=r.markup||'';
      document.getElementById('portion-size').value=r.porcaoSize||100;
      renderIngredients();calcFicha();showPage('ficha','nav-ficha');
    }
    
    /* ══ PDF ══ */
    function exportRecipePDF(id){
      const r=recipes.find(x=>String(x.id)===String(id));if(!r)return;
      const {ingredients,totalCost,venda}=calcCosts(r.ingredients,r.markup);
      const porcoes=Math.max(r.porcoes||1,1);
      const now=new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
      const criado=new Date(r.createdAt).toLocaleDateString('pt-BR');
      const changed=hasPriceChanged(r.ingredients);
      const rows=ingredients.map(i=>`<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #F0F0F0;font-size:13px;font-weight:500">${i.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #F0F0F0;font-size:12px;color:#717171;font-family:monospace">${i.qtyBruta.toFixed(0)}${i.unit==='ml'?'ml':'g'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #F0F0F0;font-size:12px;color:#27AE60;font-family:monospace;font-weight:700;text-align:right">${fmtBRL(i.cost)}</td>
      </tr>`).join('');
      const html=`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Ficha — ${r.nome}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Roboto+Mono:wght@400;500&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter',sans-serif;color:#3E3E3E;padding:36px 40px;max-width:720px;margin:0 auto;line-height:1.5;-webkit-font-smoothing:antialiased}
        @media print{body{padding:20px 24px}.no-print{display:none!important}@page{margin:15mm 18mm;size:A4}}
        .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #27AE60}
        .logo{display:flex;align-items:center;gap:12px}
        .logo-box{width:40px;height:40px;background:#27AE60;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:800}
        .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px 0 24px}
        .si{background:#F7F7F7;border-radius:12px;padding:12px 14px}
        .si.hl{background:#27AE60}
        .sl{font-size:10px;color:#717171;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:4px;font-weight:700}
        .sl.hl{color:rgba(255,255,255,0.8)}
        .sv{font-size:16px;font-weight:800;font-family:'Roboto Mono',monospace;color:#3E3E3E}
        .sv.hl{color:#fff}
        table{width:100%;border-collapse:collapse;border:1px solid #E0E0E0;border-radius:12px;overflow:hidden}
        thead tr{background:#F7F7F7}
        th{padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#717171;text-transform:uppercase;letter-spacing:0.5px}
        th:last-child{text-align:right}
        tfoot td{padding:10px 12px;font-size:13px;font-weight:800;border-top:2px solid #E0E0E0;background:#F7F7F7}
        tfoot td:last-child{text-align:right;color:#27AE60;font-family:'Roboto Mono',monospace}
        footer{margin-top:28px;padding-top:12px;border-top:1px solid #E0E0E0;display:flex;justify-content:space-between;font-size:11px;color:#BDBDBD}
        .btn-print{display:inline-flex;align-items:center;gap:8px;background:#27AE60;color:#fff;border:none;padding:12px 24px;border-radius:999px;font-size:14px;font-family:'Inter',sans-serif;font-weight:700;cursor:pointer;margin-bottom:20px}
        .prep{background:#F7F7F7;border-radius:10px;padding:14px 16px;margin-top:20px;font-size:13px;line-height:1.8;color:#3E3E3E}
        .prep-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#717171;margin-bottom:8px}
      </style></head><body>
      <div class="no-print" style="display:flex;gap:12px;align-items:center;margin-bottom:20px">
        <button class="btn-print" onclick="window.print()">Salvar / Imprimir PDF</button>
        <span style="font-size:12px;color:#BDBDBD">Selecione "Salvar como PDF"</span>
      </div>
      <div class="header">
        <div class="logo">
          <div class="logo-box">FT</div>
          <div><div style="font-size:18px;font-weight:800;color:#1A1A1A">FichaTec</div><div style="font-size:11px;color:#BDBDBD">Fichas Técnicas & Estoque</div></div>
        </div>
        <div style="text-align:right;font-size:11px;color:#BDBDBD;line-height:2"><div>Gerado em ${now}</div><div>Criado em ${criado}</div>${r.origem==='scan'?'<div style="color:#27AE60;font-weight:700">📷 Digitalizada</div>':''}</div>
      </div>
      <div style="margin-bottom:20px">
        <div style="font-size:22px;font-weight:800;margin-bottom:4px;letter-spacing:-0.5px">${r.nome}</div>
        <div style="font-size:12px;color:#717171;font-weight:500">${r.ingredients.length} ingrediente(s) · ${r.porcoes} porção(ões)${r.rendimento?' · Rendimento: '+r.rendimento+'g':''}${r.markup?' · Markup: '+r.markup+'%':''}</div>
      </div>
      ${changed?`<div style="background:#E8F8EE;border:1px solid #8FD9AB;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#1E8449;font-weight:600">Precos atualizados. Custo original: ${fmtBRL(r.totalCost)}.</div>`:''}
      <div class="summary">
        <div class="si"><div class="sl">Custo Total</div><div class="sv">${fmtBRL(totalCost)}</div></div>
        <div class="si hl"><div class="sl hl">Preco de Venda</div><div class="sv hl">${fmtBRL(venda)}</div></div>
        <div class="si"><div class="sl">Por Porcao</div><div class="sv">${fmtBRL(totalCost/porcoes)}</div></div>
        <div class="si"><div class="sl">Markup</div><div class="sv">${r.markup||0}%</div></div>
      </div>
      <table><thead><tr><th>Ingrediente</th><th>Quantidade</th><th style="text-align:right">Custo</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="2">Total</td><td>${fmtBRL(totalCost)}</td></tr></tfoot></table>
      ${r.modoPreparo?`<div class="prep"><div class="prep-title">Modo de Preparo</div>${r.modoPreparo.replace(/\n/g,'<br>')}</div>`:''}
      ${r.observacoes?`<div style="margin-top:12px;background:#FFF4E5;border-radius:10px;padding:12px 16px;font-size:12px;color:#FF8C00"><strong>Observações:</strong> ${r.observacoes}</div>`:''}
      <footer><span>FichaTec</span><span>${r.nome} · ${now}</span></footer>
      </body></html>`;
      const win=window.open('','_blank','width=800,height=920');
      if(!win){showToast('Permita pop-ups para gerar o PDF.');return;}
      win.document.write(html);win.document.close();
    }
    
    

    function runWithState(fn, options = {}) {
      const shouldCommit = options.commit !== false;
      return function wrappedRecipeFunction(...args) {
        syncState();
        const result = fn(...args);
        if (result && typeof result.then === 'function') {
          return result.then(value => {
            if (shouldCommit) commitState();
            return value;
          });
        }
        if (shouldCommit) commitState();
        return result;
      };
    }

    function getActiveIngredientFilter() { return activeIngFilter; }
    function getCurrentRecipeId() { return currentRecipeId; }

    return {
      findStockItem: runWithState(findStockItem, {commit:false}),
      calcCosts: runWithState(calcCosts, {commit:false}),
      setIngSource: runWithState(setIngSource),
      searchIngredient: runWithState(searchIngredient),
      selectIngredient: runWithState(selectIngredient),
      calcIngCost: runWithState(calcIngCost),
      addIngredient: runWithState(addIngredient),
      removeIngredient: runWithState(removeIngredient),
      renderIngredients: runWithState(renderIngredients),
      calcFicha: runWithState(calcFicha),
      calcNutrition: runWithState(calcNutrition),
      clearFicha: runWithState(clearFicha),
      saveRecipe: runWithState(saveRecipe),
      hasPriceChanged: runWithState(hasPriceChanged, {commit:false}),
      renderRecipes: runWithState(renderRecipes),
      setIngFilter: runWithState(setIngFilter),
      viewRecipe: runWithState(viewRecipe),
      deleteCurrentRecipe: runWithState(deleteCurrentRecipe),
      editRecipe: runWithState(editRecipe),
      deleteRecipe: runWithState(deleteRecipe),
      loadRecipeToFicha: runWithState(loadRecipeToFicha),
      exportRecipePDF: runWithState(exportRecipePDF, {commit:false}),
      getActiveIngredientFilter,
      getCurrentRecipeId,
    };
  }

  window.FichaTecRecipeSheet = { createRecipeSheetModule };
})();
