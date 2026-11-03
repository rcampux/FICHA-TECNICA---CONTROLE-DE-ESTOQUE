(function exposeIngredientOrder() {
  function moveIngredient(items, from, to) {
    if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=items.length||to>=items.length||from===to)return items;
    const next=[...items];
    next.splice(to,0,next.splice(from,1)[0]);
    return next;
  }

  // Pointer events support mouse, pen and touch; only the grip starts a drag.
  function bindIngredientOrder(container,{onMove,onCancel,canMove}) {
    let drag=null,frame=0,settling=false;
    const animations=new Map();
    const reducedMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rows=()=>[...container.querySelectorAll('[data-ingredient-index]')];
    function layoutTop(row) {
      const transform=window.getComputedStyle(row).transform;
      const offset=transform==='none'?0:new DOMMatrixReadOnly(transform).m42;
      return row.getBoundingClientRect().top-offset;
    }
    function liftCard() {
      const rect=drag.row.getBoundingClientRect();
      const preview=document.createElement('div');
      preview.className='ingredient-drag-preview';
      preview.setAttribute('aria-hidden','true');
      preview.inert=true;
      Object.assign(preview.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});
      const card=drag.row.cloneNode(true);
      card.removeAttribute('data-ingredient-index');
      card.removeAttribute('id');
      card.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
      card.classList.add('ingredient-drag-card');
      preview.appendChild(card);document.body.appendChild(preview);
      Object.assign(drag,{preview,card,rect});
      drag.row.classList.add('is-reordering');container.classList.add('is-reordering');
      if(!reducedMotion())card.animate([{transform:'scale(1) rotate(0deg)',boxShadow:'0 0 0 transparent'},{transform:'scale(1.015) rotate(.35deg)',boxShadow:'0 16px 36px #39211c26'}],{duration:170,easing:'ease-out'});
      positionPreview();
    }
    function positionPreview() {
      if(!drag?.preview)return;
      const dx=Math.max(8-drag.rect.left,Math.min(drag.x-drag.startX,window.innerWidth-drag.rect.right-8));
      drag.preview.style.transform=`translate3d(${dx}px,${drag.y-drag.startY}px,0)`;
    }
    function placeAtPointer() {
      if(!drag?.started)return;
      const siblings=rows().filter(row=>row!==drag.row);
      const before=siblings.find(row=>drag.y<layoutTop(row)+row.getBoundingClientRect().height/2);
      if((before&&drag.row.nextElementSibling===before)||(!before&&!drag.row.nextElementSibling))return;
      const positions=new Map(siblings.map(row=>[row,row.getBoundingClientRect().top]));
      animations.forEach(animation=>animation.cancel());animations.clear();
      if(before)before.before(drag.row);else drag.row.parentElement.appendChild(drag.row);
      if(reducedMotion())return;
      siblings.forEach(row=>{
        const offset=positions.get(row)-row.getBoundingClientRect().top;
        if(offset)animations.set(row,row.animate([{transform:`translateY(${offset}px)`},{transform:'translateY(0)'}],{duration:180,easing:'cubic-bezier(.2,.8,.2,1)'}));
      });
    }
    function scrollWhileDragging() {
      if(!drag?.started)return;
      if(!drag.row.isConnected){finish(true);return;}
      const delta=drag.y<80?-12:drag.y>window.innerHeight-80?12:0;
      if(delta){window.scrollBy(0,delta);placeAtPointer();}
      frame=window.requestAnimationFrame(scrollWhileDragging);
    }
    function finish(cancel=false) {
      if(!drag)return;
      const current=drag;drag=null;
      window.cancelAnimationFrame(frame);
      if(container.hasPointerCapture(current.pointerId))container.releasePointerCapture(current.pointerId);
      if(!current.started)return;
      settling=true;
      const complete=()=>{
        current.preview.remove();current.row.classList.remove('is-reordering');container.classList.remove('is-reordering');
        animations.forEach(animation=>animation.cancel());animations.clear();settling=false;
        if(!current.row.isConnected)return;
        if(cancel||!canMove())onCancel();else onMove(current.from,rows().indexOf(current.row));
      };
      if(cancel||!canMove()||!current.row.isConnected||reducedMotion()){complete();return;}
      const target=current.row.getBoundingClientRect();
      current.card.classList.add('is-settling');
      const landing=current.preview.animate([{transform:current.preview.style.transform},{transform:`translate3d(${target.left-current.rect.left}px,${target.top-current.rect.top}px,0)`}],{duration:190,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
      landing.finished.then(complete,complete);
    }
    container.addEventListener('pointerdown',event=>{
      const grip=event.target.closest('[data-ingredient-grip]');
      if(!grip||!canMove()||event.button!==0||drag||settling||event.isPrimary===false)return;
      const row=grip.closest('[data-ingredient-index]');
      event.preventDefault();grip.focus();
      drag={row,from:Number(row.dataset.ingredientIndex),pointerId:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,started:false};
      container.setPointerCapture(event.pointerId);
    });
    container.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.pointerId)return;
      drag.x=event.clientX;drag.y=event.clientY;
      if(!drag.started&&Math.abs(drag.y-drag.startY)>5){
        drag.started=true;liftCard();
        frame=window.requestAnimationFrame(scrollWhileDragging);
      }
      positionPreview();placeAtPointer();
    });
    container.addEventListener('pointerup',event=>{if(event.pointerId===drag?.pointerId)finish();});
    container.addEventListener('pointercancel',()=>finish(true));
    container.addEventListener('lostpointercapture',()=>finish(true));
    container.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&drag){event.preventDefault();finish(true);return;}
      const grip=event.target.closest('[data-ingredient-grip]');
      if(!grip||!canMove()||drag||settling||!['ArrowUp','ArrowDown'].includes(event.key))return;
      event.preventDefault();
      const from=Number(grip.closest('[data-ingredient-index]').dataset.ingredientIndex);
      const to=from+(event.key==='ArrowUp'?-1:1);
      if(to>=0&&to<rows().length)onMove(from,to);
    });
    window.addEventListener('blur',()=>finish(true));
  }
  window.FichaTecIngredientOrder={moveIngredient,bindIngredientOrder};
})();
