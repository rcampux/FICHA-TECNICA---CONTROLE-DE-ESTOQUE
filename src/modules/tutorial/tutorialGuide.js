(function exposeTutorialGuide() {
  function createGuide({getAuth,createClient,getStock,getPhysical,openProduct}) {
    const {topics,tour}=window.FichaTecTutorialCatalog;
    const progress=window.FichaTecTutorialProgress.createProgress({getAuth,createClient});
    const dialog=document.createElement('dialog');
    dialog.id='tutorial-guide';
    dialog.setAttribute('aria-labelledby','tutorial-title');
    dialog.innerHTML='<div class="tutorial-focus" aria-hidden="true" hidden></div><section class="tutorial-panel"><header><span class="tutorial-label">Guia da cozinha</span><button type="button" class="tutorial-close" aria-label="Encerrar tutorial neste acesso">×</button></header><div class="tutorial-content"></div><footer></footer></section>';
    document.body.append(dialog);
    const panel=dialog.querySelector('.tutorial-panel'), content=dialog.querySelector('.tutorial-content'), footer=dialog.querySelector('footer'), ring=dialog.querySelector('.tutorial-focus');
    let target=null,returnFocus=null,mode='',step=0,current=null,continuation=null,bypass=null,frame=0,beginTimer=0;
    const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const button=(action,text,primary=false)=>'<button type="button" class="tutorial-button'+(primary?' is-primary':'')+'" data-tutorial-action="'+action+'">'+text+'</button>';
    function visibleTarget(selector) {return selector?[...document.querySelectorAll(selector)].find(el=>el.getClientRects().length&&!el.closest('[hidden]')):null;}
    function position() {
      frame=0;if(!dialog.open)return;
      const vp=window.visualViewport, height=vp?.height||innerHeight, top=vp?.offsetTop||0,width=vp?.width||innerWidth,left=vp?.offsetLeft||0;
      dialog.style.setProperty('--tutorial-height',height+'px');dialog.style.top=top+'px';dialog.style.left=left+'px';dialog.style.width=width+'px';
      const bounds=target?.isConnected?target.getBoundingClientRect():null;
      const gap=14, ph=panel.offsetHeight, pw=panel.offsetWidth;
      let y=Math.max(gap,(height-ph)/2),x=Math.max(gap,(width-pw)/2);
      ring.hidden=true;
      if(mode!=='library'&&bounds&&bounds.width&&bounds.height){
        const bt=bounds.top-top,bl=bounds.left-left;
        y=bt+bounds.height+gap+ph<=height-gap?bt+bounds.height+gap:bt-ph-gap>=gap?bt-ph-gap:y;
        x=Math.max(gap,Math.min(width-pw-gap,bl));
        const overlap=y<bt+bounds.height&&y+ph>bt;
        if(!overlap&&bt>=0&&bt+bounds.height<=height){
          ring.hidden=false;Object.assign(ring.style,{top:Math.max(2,bt-5)+'px',left:Math.max(2,bl-5)+'px',width:Math.min(width-4,bounds.width+10)+'px',height:bounds.height+10+'px'});
        }
      }
      panel.style.top=Math.max(gap,y)+'px';panel.style.left=x+'px';
    }
    function schedulePosition(){if(!frame)frame=requestAnimationFrame(position);}
    function show() {
      if(!dialog.open){returnFocus=document.activeElement;dialog.showModal();}
      position();
      // Focus text, never an input: opening a tutorial must not summon a keyboard.
      content.querySelector('h2')?.focus({preventScroll:true});
    }
    function close({pause=false,disable=false}={}) {
      if(pause||disable)progress.pause(disable);
      dialog.close();target=null;continuation=null;mode='';
      if(returnFocus?.isConnected&&!returnFocus.matches('input,textarea,select'))returnFocus.focus({preventScroll:true});
    }
    function renderTopic(topic,source=null,isTour=false) {
      current=topic;target=source||visibleTarget(topic.selector);mode=isTour?'tour':'topic';
      const stockKind=source?.dataset.journeySource||(topic.id==='ingredient'?document.querySelector('[data-journey-source][aria-pressed="true"]')?.dataset.journeySource:null);
      dialog.dataset.stockKind=stockKind||'';
      current={...topic,progressId:source?.dataset.journeySource?topic.id+':source':topic.id};
      const empty=(stockKind==='virtual'&&getStock().length===0)||(stockKind==='fisico'&&getPhysical().length===0);
      content.innerHTML='<p class="tutorial-step">'+(isTour?'Conheça a plataforma · '+(step+1)+' de '+tour.length:topic.group+' · Guia de uso')+'</p><h2 id="tutorial-title" tabindex="-1">'+escape(empty?'Seu estoque ainda está vazio':topic.title)+'</h2><p>'+escape(topic.body)+'</p>'+(empty?'<div class="tutorial-note">Para usar esta origem, cadastre primeiro um produto com a quantidade comprada e o valor pago. Você também pode anotar a receita sem estoque e precificar depois.</div>':'');
      if(isTour&&step===0)content.insertAdjacentHTML('beforeend','<div class="tutorial-note">'+(progress.isExisting()?'Você já faz parte da cozinha! Este tour será apresentado automaticamente só desta vez. X encerra as dicas deste acesso; Não exibir novamente desativa as dicas automáticas. Depois, você pode rever tudo em Tutoriais.':'O tour aparece nos três primeiros acessos. X encerra as dicas neste acesso; Não exibir novamente desativa as dicas automáticas. Você pode rever tudo em Tutoriais.')+'</div>');
      footer.innerHTML=(isTour?(step?button('back','Voltar'):'')+button('next',step===tour.length-1?'Começar a usar':'Próximo',true):button('continue',continuation?'Entendi, continuar':'Voltar aos tutoriais',true))+(empty?button('stock','Cadastrar primeiro produto'):'')+button('disable','Não exibir novamente');
      if(target&&!dialog.open)target.scrollIntoView({block:'nearest',behavior:'instant'});
      show();
    }
    function startTour() {step=0;continuation=null;renderTopic(topics.find(t=>t.id===tour[step]),null,true);progress.recordTourShown();}
    function library() {
      mode='library';target=null;continuation=null;
      content.innerHTML='<h2 id="tutorial-title" tabindex="-1">Aprenda no seu ritmo</h2><p>Da primeira receita à rotina da cozinha. Consulte qualquer função, mesmo com as dicas automáticas desativadas.</p><label class="tutorial-search-label">Buscar tutorial<input type="search" id="tutorial-search" placeholder="Ex.: estoque, markup, produção" autocomplete="off"></label><div class="tutorial-topic-list"></div>';
      footer.innerHTML=button('tour','Rever tour da plataforma',true)+button('disable','Não exibir novamente');
      renderLibrary('');show();
    }
    function renderLibrary(query) {
      const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\bnutri\w*/g,'nutri');
      const filtered=topics.filter(t=>norm(t.title+' '+t.group+' '+t.body).includes(norm(query)));
      content.querySelector('.tutorial-topic-list').innerHTML=filtered.map(t=>'<button type="button" data-tutorial-topic="'+t.id+'"><small>'+escape(t.group)+'</small><strong>'+escape(t.title)+'</strong><span>'+(progress.get().seen.includes(t.id)?'Já consultado':'Ver orientação')+'</span></button>').join('')||'<p>Nenhum tutorial encontrado. Tente outra palavra.</p>';
    }
    function intercept(event) {
      if(bypass){const match=event.target.closest('button,summary');if(match===bypass)return;}
      if(dialog.open||document.getElementById('app-shell')?.hidden)return;
      const control=event.target.closest('button,summary');
      if(!control||control.disabled||control.closest('#modal-auth')&&!control.matches('#auth-status-btn'))return;
      const topic=topics.find(t=>t.selector&&control.matches(t.selector));
      if(!topic||!progress.allowed(control.dataset.journeySource?topic.id+':source':topic.id))return;
      event.preventDefault();event.stopImmediatePropagation();
      continuation=()=>{if(!control.isConnected)return;bypass=control;try{control.click();}finally{bypass=null;}};
      renderTopic(topic,control);
    }
    dialog.addEventListener('click',event=>{
      const topicId=event.target.closest('[data-tutorial-topic]')?.dataset.tutorialTopic;
      if(topicId){renderTopic(topics.find(t=>t.id===topicId));return;}
      if(event.target.closest('.tutorial-close')){close({pause:true});return;}
      const action=event.target.closest('[data-tutorial-action]')?.dataset.tutorialAction;
      if(action==='disable'){close({disable:true});return;}
      if(action==='tour'){startTour();return;}
      if(action==='back'){step--;renderTopic(topics.find(t=>t.id===tour[step]),null,true);return;}
      if(action==='next'){
        progress.mark(current.id);
        if(++step>=tour.length){close();return;}
        renderTopic(topics.find(t=>t.id===tour[step]),null,true);return;
      }
      if(action==='continue'){
        progress.mark(current.progressId||current.id);
        if(!continuation){library();return;}
        const run=continuation;close();run();
      }
      if(action==='stock'){
        const kind=dialog.dataset.stockKind==='fisico'?'physical':'virtual';
        const selectOrigin=continuation;close();selectOrigin?.();
        document.getElementById('recipe-ingredient-dialog')?.close();
        openProduct(kind);
        // Keep source tutorial unseen until used: an empty-stock prerequisite isn't completion.
        window.showToast('Cadastre o produto e volte em Adicionar ingrediente. Sua ficha continua aberta.');
      }
    });
    dialog.addEventListener('input',event=>{if(event.target.id==='tutorial-search'){renderLibrary(event.target.value);schedulePosition();}});
    dialog.addEventListener('cancel',event=>{event.preventDefault();close({pause:true});});
    // Native dialog handles focus containment, including tutorials over an ingredient dialog.
    document.addEventListener('click',intercept,true);
    window.addEventListener('resize',schedulePosition,{passive:true});
    document.addEventListener('scroll',schedulePosition,{passive:true,capture:true});
    window.visualViewport?.addEventListener('resize',schedulePosition,{passive:true});
    window.visualViewport?.addEventListener('scroll',schedulePosition,{passive:true});
    window.addEventListener('fichatec:auth-signed-out',()=>{clearTimeout(beginTimer);close();progress.resetSession();});
    function begin() {
      if(!progress.begin())return;
      clearTimeout(beginTimer);
      beginTimer=setTimeout(async()=>{if(await progress.canPresentExistingTour()&&!document.getElementById('app-shell')?.hidden&&!dialog.open&&!document.querySelector('dialog[open],.modal-overlay.open'))startTour();},550);
    }
    return {begin,library,startTour,progress};
  }
  window.FichaTecTutorialGuide={createGuide};
})();
