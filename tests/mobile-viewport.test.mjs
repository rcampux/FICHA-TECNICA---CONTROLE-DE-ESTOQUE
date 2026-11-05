import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../src/ui/mobileViewport.js', import.meta.url), 'utf8');
function harness({visual = true, width = 390} = {}) {
  const classes = new Set(), frames = new Map(), timers = new Map();
  let sequence = 0;
  const win = new EventTarget(), doc = new EventTarget(), viewport = new EventTarget();
  Object.assign(viewport, {height:844, offsetTop:0, scale:1});
  Object.assign(win, {
    innerHeight:844, innerWidth:width, visualViewport:visual ? viewport : undefined,
    matchMedia:query => ({get matches() {return query.includes('max-width') ? win.innerWidth <= 767 : true;}}),
    requestAnimationFrame:callback => {frames.set(++sequence, callback); return sequence;},
    setTimeout:callback => {timers.set(++sequence, callback); return sequence;},
    clearTimeout:id => timers.delete(id),
  });
  Object.assign(doc, {
    activeElement:null,
    body:{classList:{toggle(name, value) {if (value) classes.add(name); else classes.delete(name);}}},
    documentElement:{style:{setProperty() {}}},
    getElementById() {return null;},
  });
  vm.runInNewContext(source, {window:win, document:doc, navigator:{maxTouchPoints:1}});
  win.FichaTecMobileViewport.initialize();
  function flush() {for (const [id, callback] of frames) {frames.delete(id);callback();}}
  return {
    win, doc, viewport,
    hidden:() => classes.has('mobile-keyboard-open'),
    focus(type = 'text') {
      doc.activeElement = {type, matches:selector => selector === 'input'};
      doc.dispatchEvent(new Event('focusin'));flush();
    },
    blur() {doc.activeElement=null;doc.dispatchEvent(new Event('focusout'));flush();},
    settle() {for (const [id, callback] of timers) {timers.delete(id);callback();}flush();},
    resize(height, layout = false) {
      viewport.height=height;
      if (layout || !visual) win.innerHeight=height;
      (visual ? viewport : win).dispatchEvent(new Event('resize'));flush();
    },
  };
}

test('iOS: menu recolhe antes do teclado e só volta depois da animação de fechar', () => {
  const h=harness();h.focus();assert.equal(h.hidden(),true);
  h.resize(460);h.settle();assert.equal(h.hidden(),true);
  h.blur();assert.equal(h.hidden(),true);
  h.resize(844);assert.equal(h.hidden(),false);
});

test('Android: preserva altura de referência mesmo quando ambos viewports encolhem', () => {
  const h=harness();h.focus('number');h.resize(420,true);h.settle();
  h.blur();assert.equal(h.hidden(),true);
  h.resize(844,true);assert.equal(h.hidden(),false);
});

test('fechar teclado sem desfocar restaura navegação; toolbar do navegador não é teclado', () => {
  const h=harness();h.focus('search');h.resize(480);h.settle();
  h.resize(844);assert.equal(h.hidden(),false);
  h.resize(780);assert.equal(h.hidden(),false);
  h.blur();h.resize(844);assert.equal(h.hidden(),false);
});

test('sem VisualViewport mantém fallback e recupera o rodapé', () => {
  const h=harness({visual:false});h.focus('email');h.resize(420);h.settle();
  assert.equal(h.hidden(),true);h.blur();assert.equal(h.hidden(),true);
  h.resize(844);assert.equal(h.hidden(),false);
});

test('desktop, campos sem teclado e zoom manual não acionam recolhimento', () => {
  const desktop=harness({width:1500});desktop.focus();desktop.resize(420);desktop.settle();
  assert.equal(desktop.hidden(),false);
  const h=harness();h.focus('checkbox');assert.equal(h.hidden(),false);
  h.viewport.scale=1.5;h.focus();h.settle();h.resize(560);assert.equal(h.hidden(),false);
});

test('rotação recalibra a referência e trocar campos não exibe o rodapé entre eles', () => {
  const h=harness();h.focus();h.resize(420);h.settle();h.blur();h.focus('number');
  assert.equal(h.hidden(),true);
  h.win.innerWidth=844;h.resize(390,true);h.settle();assert.equal(h.hidden(),false);
  h.win.innerWidth=390;h.blur();h.resize(844,true);assert.equal(h.hidden(),false);
});
