import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/ui/toasts.js',import.meta.url),'utf8');
function fixture(){
  let now=0,nextTimer=0,observer;
  const timers=new Map(),dialogs=[];
  function node(){return {hidden:false,dataset:{},attrs:{},listeners:{},textContent:'',style:{setProperty(){}},
    setAttribute(key,value){this.attrs[key]=value;},getAttribute(key){return this.attrs[key];},removeAttribute(key){delete this.attrs[key];},
    addEventListener(name,fn){this.listeners[name]=fn;},append(child){child.parentNode=this;}};}
  const host=node(),body=node(),input=node(),parts=Object.fromEntries(['copy','icon','title','message','close'].map(key=>[key,node()]));
  host.parentNode=body;host.querySelector=selector=>parts[selector.replace('.app-toast-','')];
  host.contains=el=>Object.values(parts).includes(el);host.showPopover=()=>{host.popped=true;};host.hidePopover=()=>{host.popped=false;};host.matches=()=>host.popped;
  const document={body,activeElement:input,getElementById:()=>host,querySelectorAll:()=>dialogs,addEventListener(){}};
  parts.close.blur=()=>{document.activeElement=body;};
  const window={innerWidth:390,innerHeight:844,visualViewport:{width:390,height:400,offsetTop:20,offsetLeft:0,addEventListener(){}},addEventListener(){}};
  vm.runInNewContext(source,{window,document,Date:{now:()=>now},requestAnimationFrame:fn=>{fn();return 1;},
    MutationObserver:class{constructor(fn){observer=fn;}observe(){}},
    setTimeout:(fn,delay)=>{const id=++nextTimer;timers.set(id,{fn,at:now+delay});return id;},clearTimeout:id=>timers.delete(id)});
  function advance(ms){const end=now+ms;while(true){const pending=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!pending)break;now=pending[1].at;timers.delete(pending[0]);pending[1].fn();}now=end;}
  return {controller:window.FichaTecToasts.createToasts(),host,parts,document,input,advance,openDialog(){const dialog=node();dialogs.push(dialog);observer();return dialog;}};
}
test('a new warning keeps its full reading time after replacing a success',()=>{
  const f=fixture();f.controller.show('Receita salva.',{tone:'success'});f.advance(4500);
  f.controller.show('Informe o nome da receita.',{tone:'warning',title:'Falta o nome da receita'});
  f.advance(500);assert.equal(f.host.hidden,false);assert.equal(f.parts.title.textContent,'Falta o nome da receita');
  assert.equal(f.parts.copy.attrs.role,'alert');f.advance(7499);assert.equal(f.host.hidden,false);
  f.advance(1);assert.equal(f.host.hidden,true);
});
test('hover pauses dismissal and the close button dismisses without refocusing an input',()=>{
  const f=fixture();f.controller.show('Revise os dados.',{tone:'warning'});f.advance(2000);
  f.host.listeners.pointerenter({pointerType:'mouse'});f.advance(20000);assert.equal(f.host.hidden,false);
  f.host.listeners.pointerleave();f.advance(5999);assert.equal(f.host.hidden,false);
  f.document.activeElement=f.parts.close;f.parts.close.listeners.click();
  assert.equal(f.host.hidden,true);assert.equal(f.host.popped,false);assert.equal(f.document.activeElement,f.document.body);
});
test('messages remain plain text and follow native dialogs without stealing input focus',()=>{
  const f=fixture();const message='<img src=x onerror=alert(1)> não foi salvo';
  f.controller.show(message,{tone:'error'});const dialog=f.openDialog();
  assert.equal(f.host.parentNode,dialog);assert.equal(f.host.popped,true);
  assert.equal(f.parts.message.textContent,message);assert.equal(f.document.activeElement,f.input);
  assert.equal(f.parts.copy.attrs['aria-live'],'assertive');
  f.controller.show('Produto salvo.',{tone:'success'});assert.equal(f.parts.copy.attrs.role,'status');assert.equal(f.parts.copy.attrs['aria-live'],'polite');
});
