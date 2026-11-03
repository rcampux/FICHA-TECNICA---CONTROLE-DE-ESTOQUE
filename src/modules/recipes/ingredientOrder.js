(function exposeIngredientOrder() {
  function moveIngredient(items, from, to) {
    if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=items.length||to>=items.length||from===to)return items;
    const next=[...items];
    next.splice(to,0,next.splice(from,1)[0]);
    return next;
  }

  // Pointer events support mouse, pen and touch; only the grip starts a drag.
  function bindIngredientOrder(container,{onMove,onCancel,canMove}) {
    let drag=null,frame=0;
    const rows=()=>[...container.querySelectorAll('[data-ingredient-index]')];
    function placeAtPointer() {
      if(!drag?.started)return;
      const over=document.elementsFromPoint(drag.x,drag.y).map(el=>el.closest('[data-ingredient-index]')).find(row=>row&&container.contains(row));
      if(!over||over===drag.row)return;
      const rect=over.getBoundingClientRect();
      if(drag.y<rect.top+rect.height/2)over.before(drag.row);else over.after(drag.row);
    }
    function scrollWhileDragging() {
      if(!drag?.started)return;
      const delta=drag.y<80?-12:drag.y>window.innerHeight-80?12:0;
      if(delta){window.scrollBy(0,delta);placeAtPointer();}
      frame=window.requestAnimationFrame(scrollWhileDragging);
    }
    function finish(cancel=false) {
      if(!drag)return;
      const current=drag;drag=null;
      window.cancelAnimationFrame(frame);
      current.row.classList.remove('is-reordering');
      container.classList.remove('is-reordering');
      if(container.hasPointerCapture(current.pointerId))container.releasePointerCapture(current.pointerId);
      if(!current.started)return;
      if(cancel||!canMove())onCancel();else onMove(current.from,rows().indexOf(current.row));
    }
    container.addEventListener('pointerdown',event=>{
      const grip=event.target.closest('[data-ingredient-grip]');
      if(!grip||!canMove()||event.button!==0||drag)return;
      const row=grip.closest('[data-ingredient-index]');
      event.preventDefault();grip.focus();
      drag={row,from:Number(row.dataset.ingredientIndex),pointerId:event.pointerId,x:event.clientX,y:event.clientY,startY:event.clientY,started:false};
      container.setPointerCapture(event.pointerId);
    });
    container.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.pointerId)return;
      drag.x=event.clientX;drag.y=event.clientY;
      if(!drag.started&&Math.abs(drag.y-drag.startY)>5){
        drag.started=true;drag.row.classList.add('is-reordering');container.classList.add('is-reordering');
        frame=window.requestAnimationFrame(scrollWhileDragging);
      }
      placeAtPointer();
    });
    container.addEventListener('pointerup',event=>{if(event.pointerId===drag?.pointerId)finish();});
    container.addEventListener('pointercancel',()=>finish(true));
    container.addEventListener('lostpointercapture',()=>finish(true));
    container.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&drag){event.preventDefault();finish(true);return;}
      const grip=event.target.closest('[data-ingredient-grip]');
      if(!grip||!canMove()||!['ArrowUp','ArrowDown'].includes(event.key))return;
      event.preventDefault();
      const from=Number(grip.closest('[data-ingredient-index]').dataset.ingredientIndex);
      const to=from+(event.key==='ArrowUp'?-1:1);
      if(to>=0&&to<rows().length)onMove(from,to);
    });
    window.addEventListener('blur',()=>finish(true));
  }
  window.FichaTecIngredientOrder={moveIngredient,bindIngredientOrder};
})();
