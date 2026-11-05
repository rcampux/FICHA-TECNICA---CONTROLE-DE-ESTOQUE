(function exposeRecipeJourney() {
  function createRecipeJourney({sheet, renderCategoryOptions, inferCategory, showToast}) {
    const el = id => document.getElementById(id);
    const dialog=el('recipe-ingredient-dialog'), cooking=el('recipe-cooking-dialog');
    const grid=el('ingredient-tiles'), add=el('ingredient-builder-toggle');
    const form=el('ingredient-builder'), status=el('recipe-journey-status');
    let library=null, busy=false, openingScroll=0, categoryEdited=false, lastRevision=-1;
    const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const format=value=>Number(value).toLocaleString('pt-BR',{maximumFractionDigits:4});
    const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function refresh() {
      const state=sheet.getJourneyState();
      document.querySelectorAll('[data-journey-source]').forEach(button=>{
        const selected=button.dataset.journeySource===state.source;
        button.setAttribute('aria-pressed',String(selected));
        button.classList.toggle('active',selected);
      });
      const items=[...state.confirmed.map((item,index)=>({...item,confirmed:true,index})),...state.pending];
      grid.innerHTML=items.map(item=>{
        const icon=library?.resolve(item.name,item.category);
        const quantity=format(item.unit==='kg'?item.qtyG/1000:item.qtyG)+' '+(item.unit||'g');
        return '<article class="ingredient-tile'+(item.confirmed?' is-confirmed':'')+'" title="'+escape(item.name+', '+quantity)+'">'+
          '<span class="ingredient-tile-image">'+(item.confirmed?'<button type="button" class="ingredient-tile-edit" data-edit-tile="'+item.index+'" aria-label="Editar quantidade de '+escape(item.name+', '+quantity)+'">':'')+
          (icon?'<img src="'+escape(icon.url)+'" alt="" width="80" height="80" decoding="async">':'<span class="ingredient-icon-loading" aria-hidden="true"></span>')+(item.confirmed?'</button>':'')+
          '<button type="button" class="ingredient-tile-remove" '+(item.confirmed?'data-remove-confirmed':'data-remove-pending')+'="'+escape(item.id)+'" aria-label="Remover '+escape(item.name)+'">×</button></span>'+
          '<strong>'+escape(item.name)+'</strong><span class="ingredient-tile-quantity">'+escape(quantity)+'</span></article>';
      }).join('');
      el('ingredient-selection-count').textContent=items.length?items.length+(items.length===1?' ingrediente':' ingredientes'):'';
      el('recipe-prepare-action').hidden=!state.pending.length&&!state.needsReprepare;
      el('recipe-prepare-button').innerHTML='<span class="material-symbols-rounded" aria-hidden="true">soup_kitchen</span>'+((state.needsReprepare||state.editing||state.confirmed.length)?'Recalcular receita':'Preparar receita');
      el('recipe-prepare-button').disabled=busy;
      el('recipe-prepare-help').textContent=state.needsReprepare||state.confirmed.length||state.editing
        ?'Ingredientes alterados. Recalcule para atualizar a receita.'
        :'Tudo separado? Confirme os ingredientes para continuar.';
      el('recipe-yield-section').hidden=!state.confirmed.length;
      if(lastRevision!==state.revision){status.textContent='';lastRevision=state.revision;}
    }
    function selectSource(source) {
      sheet.setIngSource(source);
      categoryEdited=false;
      el('ingredient-dialog-error').hidden=true;
      renderCategoryOptions('ing-category','');
    }
    function openIngredientDialog() {
      if(busy||dialog.open)return;
      openingScroll=window.scrollY;
      selectSource(sheet.getJourneyState().source);
      el('ing-qty').value='';el('ing-rendimento').value='';
      dialog.showModal();
      // Focus a heading, not a text field: mobile keyboards open only on demand.
      el('ingredient-dialog-title').focus({preventScroll:true});
      dialog.querySelector('.ingredient-dialog-body').scrollTop=0;
    }
    function closeIngredientDialog(force=false) {
      if(busy&&!force)return;
      document.activeElement?.blur();
      dialog.close();
      add.focus({preventScroll:true});
      if(window.matchMedia('(max-width:767px)').matches)
        requestAnimationFrame(()=>window.scrollTo({top:openingScroll,behavior:'instant'}));
    }
    async function prepareRecipe() {
      const snapshot=sheet.getJourneyState();
      if(busy||(!snapshot.pending.length&&!snapshot.needsReprepare))return;
      busy=true;refresh();
      document.activeElement?.blur();
      cooking.showModal();
      el('recipe-cooking-title').focus({preventScroll:true});
      try {
        await new Promise(resolve=>setTimeout(resolve,2000));
        // An account change or clearing/editing another recipe invalidates this selection.
        if(!sheet.prepareIngredients(snapshot.revision,snapshot.scope)) {
          status.textContent='A seleção não foi confirmada. Revise os ingredientes e tente novamente.';
          return;
        }
        cooking.close();
        refresh();
        status.textContent='Ingredientes confirmados. Agora você pode definir o rendimento e salvar a receita.';
        const list=el('ingredients-list');
        list.classList.remove('ingredients-focus');
        requestAnimationFrame(()=>{
          list.focus({preventScroll:true});
          if(window.matchMedia('(max-width:767px)').matches)
            list.scrollIntoView({behavior:reduced()?'instant':'smooth',block:'start'});
          else {
            list.classList.add('ingredients-focus');
            if(list.getBoundingClientRect().top<80)list.scrollIntoView({behavior:reduced()?'instant':'smooth',block:'start'});
          }
        });
      } catch(error) {
        console.error('Recipe preparation failed',error);
        status.textContent='Não foi possível confirmar. Seus ingredientes continuam na seleção.';
        showToast(status.textContent);
      } finally {
        if(cooking.open)cooking.close();
        busy=false;el('recipe-prepare-button').disabled=false;
      }
    }
    document.querySelectorAll('[data-journey-source]').forEach(button=>
      button.addEventListener('click',()=>{if(!busy)selectSource(button.dataset.journeySource);}));
    add.addEventListener('click',openIngredientDialog);
    dialog.querySelectorAll('[data-close-ingredient]').forEach(button=>button.addEventListener('click',()=>closeIngredientDialog()));
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeIngredientDialog();});
    let outside=false;
    dialog.addEventListener('pointerdown',event=>{outside=event.target===dialog;});
    dialog.addEventListener('click',event=>{
      if(outside&&event.target===dialog) {
        const r=dialog.getBoundingClientRect();
        if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeIngredientDialog();
      }
      outside=false;
    });
    el('ing-category').addEventListener('change',()=>{categoryEdited=true;});
    el('ing-search').addEventListener('input',()=>{
      if(sheet.getJourneyState().source==='manual'&&!categoryEdited)
        renderCategoryOptions('ing-category',inferCategory(el('ing-search').value));
    });
    form.addEventListener('input',()=>{el('ingredient-dialog-error').hidden=true;});
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(busy)return;
      busy=true;
      const controls=[...form.querySelectorAll('button,input,select')].map(control=>({control,disabled:control.disabled}));
      controls.forEach(({control})=>control.disabled=true);
      try {
        if(!await sheet.resolveSelectedMeasure())return;
        if(!sheet.queueIngredient())return;
        closeIngredientDialog(true);
        status.textContent='Ingrediente adicionado à seleção.';
      } finally {
        busy=false;controls.forEach(({control,disabled})=>control.disabled=disabled);
        sheet.calcIngCost();
        el('recipe-prepare-button').disabled=false;
      }
    });
    grid.addEventListener('click',async event=>{
      if(busy)return;
      const remove=event.target.closest('[data-remove-confirmed],[data-remove-pending]');
      if(remove){
        busy=true;
        try {
          if(remove.hasAttribute('data-remove-confirmed'))await sheet.removeIngredient(remove.dataset.removeConfirmed);
          else sheet.removeQueuedIngredient(remove.dataset.removePending);
        } finally {
          busy=false;refresh();
          add.focus({preventScroll:true});
        }
        return;
      }
      const tile=event.target.closest('[data-edit-tile]');
      if(tile)sheet.openIngredientEditor(Number(tile.dataset.editTile));
    });
    el('recipe-prepare-button').addEventListener('click',prepareRecipe);
    cooking.addEventListener('cancel',event=>event.preventDefault());
    el('ingredients-list').addEventListener('animationend',()=>el('ingredients-list').classList.remove('ingredients-focus'));
    window.FichaTecFoodIcons.loadLibrary().then(value=>{library=value;refresh();}).catch(()=>{
      status.textContent='As ilustrações estão indisponíveis. Seus ingredientes estão guardados; você pode continuar.';
    });
    refresh();
    return {refresh,openIngredientDialog,prepareRecipe};
  }
  window.FichaTecRecipeJourney={createRecipeJourney};
})();
