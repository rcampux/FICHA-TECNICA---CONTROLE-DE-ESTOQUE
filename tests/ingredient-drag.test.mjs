import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

function dragHarness({reduced=false}={}) {
  const listeners={},body=[],moves=[];let cancelled=0,captured=false,animationCount=0;
  const classList=()=>{const names=new Set();return {add:n=>names.add(n),remove:n=>names.delete(n),contains:n=>names.has(n)};};
  const node=()=>({style:{},attributes:{},classList:classList(),setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},querySelectorAll:()=>[],appendChild(child){this.child=child;},remove(){body.splice(body.indexOf(this),1);},animate(){animationCount++;return {cancel(){},finished:Promise.resolve()};}});
  let order=[];
  const parent={appendChild(row){order=order.filter(r=>r!==row);order.push(row);}};
  const makeRow=index=>Object.assign(node(),{
    dataset:{ingredientIndex:String(index)},isConnected:true,parentElement:parent,
    getBoundingClientRect(){const top=100+order.indexOf(this)*50;return {top,bottom:top+50,left:20,right:320,width:300,height:50};},
    cloneNode(){return node();},
    before(row){order=order.filter(r=>r!==row);order.splice(order.indexOf(this),0,row);},
    get nextElementSibling(){return order[order.indexOf(this)+1]||null;},
  });
  const first=makeRow(0),second=makeRow(1);order=[first,second];
  for(const row of order)Object.defineProperty(row,'nextElementSibling',{get:()=>order[order.indexOf(row)+1]||null});
  const grip={focus(){},closest:()=>first};
  const container={classList:classList(),querySelectorAll:()=>order,addEventListener:(event,fn)=>{listeners[event]=fn;},setPointerCapture(){captured=true;},hasPointerCapture:()=>captured,releasePointerCapture(){captured=false;}};
  const context={window:{matchMedia:()=>({matches:reduced}),getComputedStyle:()=>({transform:'none'}),innerWidth:390,innerHeight:844,requestAnimationFrame:()=>1,cancelAnimationFrame(){},scrollBy(){},addEventListener(){}},document:{createElement:node,body:{appendChild:el=>body.push(el)}}};
  vm.runInNewContext(readFileSync(new URL('../src/modules/recipes/ingredientOrder.js',import.meta.url),'utf8'),context);
  context.window.FichaTecIngredientOrder.bindIngredientOrder(container,{onMove:(a,b)=>moves.push([a,b]),onCancel:()=>{cancelled++;order=[first,second];},canMove:()=>true});
  const send=(type,extra={})=>listeners[type]({target:{closest:()=>grip},button:0,pointerId:1,isPrimary:true,clientX:30,clientY:110,preventDefault(){},...extra});
  return {send,body,moves,first,get cancelled(){return cancelled;},get animationCount(){return animationCount;}};
}

test('arraste levanta uma prévia, acompanha o ponteiro e só confirma após soltar',async()=>{
  const h=dragHarness();h.send('pointerdown');h.send('pointermove',{clientY:113});assert.equal(h.body.length,0);
  h.send('pointermove',{clientY:190});assert.equal(h.body.length,1);
  assert.equal(h.body[0].attributes['aria-hidden'],'true');assert.equal(h.body[0].inert,true);
  assert.equal(h.body[0].style.transform,'translate3d(0px,80px,0)');
  assert.ok(h.first.classList.contains('is-reordering'));assert.equal(h.moves.length,0);
  h.send('pointerup',{clientY:190});await Promise.resolve();
  assert.deepEqual(h.moves,[[0,1]]);assert.equal(h.body.length,0);
  assert.equal(h.first.classList.contains('is-reordering'),false);
});
test('cancelamento de toque remove a prévia e preserva a ordem original',()=>{
  const h=dragHarness();h.send('pointerdown',{pointerType:'touch'});h.send('pointermove',{pointerType:'touch',clientY:190});
  h.send('pointercancel');assert.equal(h.body.length,0);assert.equal(h.moves.length,0);assert.equal(h.cancelled,1);
});
test('redução de movimento conserva arraste funcional sem animações',()=>{
  const h=dragHarness({reduced:true});h.send('pointerdown');h.send('pointermove',{clientY:190});h.send('pointerup');
  assert.deepEqual(h.moves,[[0,1]]);assert.equal(h.animationCount,0);assert.equal(h.body.length,0);
});
