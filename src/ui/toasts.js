(function exposeToasts() {
  const tones={
    warning:{title:'Atenção',icon:'!'},
    error:{title:'Não foi possível concluir',icon:'!'},
    success:{title:'Tudo certo',icon:'✓'},
    info:{title:'Informação',icon:'i'}
  };
  function inferTone(message) {
    const text=String(message).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if(/nao foi possivel|erro|falhou|nao encontrado|nao esta mais disponivel|invalido|expirad/.test(text))return 'error';
    if(/^(informe|preencha|adicione|selecione|escolha|aguarde|use |revise|nenhum|configure|clique|digite|mantenha|atualize)|ja existe|maior que o estoque|nao suportado/.test(text))return 'warning';
    if(/salv[oa]|atualizad|adicionad|removid|excluid|sucesso|cadastrad|preenchid|realizad|encerrad|enviad|sincronizad|retirad|arquivad|restaurad|selecionad/.test(text))return 'success';
    return 'info';
  }
  function createToasts() {
    const host=document.getElementById('toast');
    let timer=0,frame=0,open=false,arrival=null;
    host.className='app-toast';host.hidden=true;
    if(typeof host.showPopover==='function')host.setAttribute('popover','manual');
    host.innerHTML='<span class="app-toast-icon" aria-hidden="true"></span><div class="app-toast-copy" aria-atomic="true"><strong class="app-toast-title"></strong><p class="app-toast-message"></p></div><button type="button" class="app-toast-close" aria-label="Fechar aviso">×</button>';
    const copy=host.querySelector('.app-toast-copy');
    function position() {
      frame=0;
      const vp=window.visualViewport;
      host.style.setProperty('--toast-vv-top',(vp?.offsetTop||0)+'px');
      host.style.setProperty('--toast-vv-right',Math.max(0,window.innerWidth-(vp?.offsetLeft||0)-(vp?.width||window.innerWidth))+'px');
      host.style.setProperty('--toast-vv-width',(vp?.width||window.innerWidth)+'px');
      host.style.setProperty('--toast-vv-height',(vp?.height||window.innerHeight)+'px');
    }
    function schedulePosition(){if(open&&!frame)frame=requestAnimationFrame(position);}
    function place() {
      if(!open)return;
      const dialogs=[...document.querySelectorAll('dialog[open]')];
      const parent=dialogs.at(-1)||document.body;
      if(host.parentNode!==parent)parent.append(host);
      // A manual popover stays above native dialogs without blocking the page or opening a keyboard.
      if(typeof host.showPopover==='function'&&!host.matches(':popover-open')){
        try{host.showPopover();}catch{/* Older browsers use the fixed-position fallback. */}
      }
      position();
    }
    function dismiss() {
      clearTimeout(timer);timer=0;open=false;
      if(host.contains(document.activeElement))document.activeElement.blur();
      if(typeof host.hidePopover==='function'){try{host.hidePopover();}catch{}}
      arrival?.cancel();arrival=null;host.hidden=true;
    }
    function startTimer() {
      clearTimeout(timer);timer=0;
      if(open)timer=setTimeout(dismiss,3000);
    }
    function animateArrival(){
      arrival?.cancel();arrival=null;
      if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
      arrival=host.animate?.([
        {transform:'translateX(calc(100% + 40px))',offset:0},
        {transform:'translateX(-4px)',offset:.70},
        {transform:'translateX(1px)',offset:.88},
        {transform:'translateX(0)',offset:1}
      ],{duration:420,easing:'cubic-bezier(.22,.72,.26,1)'});
    }
    function show(message,options={}) {
      if(!message)return;
      if(typeof options==='string')options={tone:options};
      const tone=tones[options.tone]?options.tone:inferTone(message);
      const config=tones[tone];
      clearTimeout(timer);host.dataset.tone=tone;
      copy.setAttribute('role',tone==='error'||tone==='warning'?'alert':'status');
      copy.setAttribute('aria-live',tone==='error'||tone==='warning'?'assertive':'polite');
      host.querySelector('.app-toast-icon').textContent=config.icon;
      host.querySelector('.app-toast-title').textContent=options.title||config.title;
      host.querySelector('.app-toast-message').textContent=String(message);
      open=true;host.hidden=false;place();animateArrival();startTimer();
    }
    host.querySelector('.app-toast-close').addEventListener('click',dismiss);
    new MutationObserver(()=>{if(open)place();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
    window.addEventListener('resize',schedulePosition,{passive:true});
    window.visualViewport?.addEventListener('resize',schedulePosition,{passive:true});
    window.visualViewport?.addEventListener('scroll',schedulePosition,{passive:true});
    let invalidPending=false;
    document.addEventListener('invalid',event=>{
      event.preventDefault();event.target.setAttribute('aria-invalid','true');
      if(invalidPending)return;invalidPending=true;setTimeout(()=>{invalidPending=false;},0);
      const label=event.target.labels?.[0]?.textContent?.trim().replace(/\s*\*$/,'')||event.target.getAttribute('aria-label')||'campo obrigatório';
      show('Revise '+label.toLocaleLowerCase('pt-BR')+'. '+(event.target.validationMessage||'Informe um valor válido.'),{tone:'warning',title:'Revise os dados'});
    },true);
    document.addEventListener('input',event=>event.target.removeAttribute?.('aria-invalid'),true);
    return {show,dismiss};
  }
  window.FichaTecToasts={createToasts,inferTone};
})();
