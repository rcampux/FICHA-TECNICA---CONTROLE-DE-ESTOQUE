import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

test('filtros fecham pelo X, fora e Escape; selecionar dentro preserva o painel',()=>{
  const listeners={},panels=[],triggers=[];
  let focused=null,modalOpen=false;
  for(const id of ['stock-category-panel','pstock-category-panel']) {
    const trigger={id,contains:target=>target===trigger,setAttribute(key,value){this[key]=value;},focus(){focused=trigger;}};
    const panel={id,hidden:true,contains:target=>target.panel===panel,querySelector:()=>close};
    const close={panel,focus(){focused=close;},closest(selector){return selector==='[data-close-category-panel]'?close:panel;}};
    panels.push(panel);triggers.push(trigger);
  }
  const document={
    addEventListener:(type,fn)=>{listeners[type]=fn;},getElementById:id=>panels.find(p=>p.id===id),
    querySelectorAll:()=>panels.filter(p=>!p.hidden),
    querySelector:selector=>selector==='.modal-overlay.open'?(modalOpen?{}:null):selector.startsWith('[aria-controls=')?triggers.find(t=>selector===`[aria-controls="${t.id}"]`):panels.find(p=>!p.hidden),
  };
  const context={window:{},document};
  vm.runInNewContext(readFileSync(new URL('../src/modules/stock/categoryPanels.js',import.meta.url),'utf8'),context);
  const controller=context.window.FichaTecCategoryPanels;
  for(const [index,panel] of panels.entries()) {
    let renders=0;
    controller.toggle(panel.id,()=>renders++);
    assert.equal(renders,1);assert.equal(panel.hidden,false);
    assert.equal(triggers[index]['aria-expanded'],'true');
    listeners.pointerdown({target:{panel}});
    assert.equal(panel.hidden,false);
    listeners.click({target:panel.querySelector()});
    assert.equal(panel.hidden,true);assert.equal(focused,triggers[index]);
    controller.toggle(panel.id,()=>{});
    listeners.pointerdown({target:{}});
    assert.equal(panel.hidden,true);
    controller.toggle(panel.id,()=>{});
    modalOpen=true;
    listeners.keydown({key:'Escape',preventDefault(){}});
    assert.equal(panel.hidden,false);
    modalOpen=false;
    listeners.keydown({key:'Escape',preventDefault(){}});
    assert.equal(panel.hidden,true);assert.equal(triggers[index]['aria-expanded'],'false');
  }
  controller.toggle(panels[0].id,()=>{});
  controller.toggle(panels[1].id,()=>{});
  assert.equal(panels[0].hidden,true);assert.equal(panels[1].hidden,false);
  controller.closeAll();assert.ok(panels.every(p=>p.hidden));
  assert.ok(controller.panelHeader().includes('aria-label="Fechar filtros"'));
});
