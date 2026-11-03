import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';

const context={window:{},crypto:webcrypto};
for(const file of ['modules/kitchen/kanbanModel.js','services/repositories/kitchenRepository.js'])
  vm.runInNewContext(readFileSync(new URL(`../src/${file}`,import.meta.url),'utf8'),context);
const M=context.window.FichaTecKitchenModel;
const createRepo=context.window.FichaTecKitchenRepository.createKitchenRepository;
const plain=value=>JSON.parse(JSON.stringify(value));
const add=(board,overrides={})=>M.saveTask(board,{title:'Preparar biscoitos',columnId:'todo',type:'production',priority:'high',assignee:'Cozinha',due:'2026-11-02',recipeId:'recipe-1',checklist:[{text:'Separar ingredientes',done:true}],...overrides});

test('cria e edita tarefa sem mutar a base, preservando receita e checklist',()=>{
  const initial=M.defaultBoard(), board=add(initial);
  assert.equal(initial.tasks.length,0);
  assert.equal(board.tasks.length,1);
  const task=board.tasks[0];
  const edited=M.saveTask(board,{...task,title:'Produzir 20 unidades'});
  assert.equal(edited.tasks[0].id,task.id);
  assert.equal(edited.tasks[0].createdAt,task.createdAt);
  assert.equal(edited.tasks[0].recipeId,'recipe-1');
  assert.equal(edited.tasks[0].checklist[0].done,true);
  assert.equal(board.tasks[0].title,'Preparar biscoitos');
});
test('mover e ordenar cartões preserva seus dados e o snapshot anterior',()=>{
  let board=add(M.defaultBoard());board=add(board,{title:'Higienizar bancada',columnId:'preparing'});
  const [first,second]=board.tasks;
  const next=M.moveTask(board,first.id,'preparing',second.id);
  assert.deepEqual(plain(next.tasks.map(t=>t.id)),[first.id,second.id]);
  assert.equal(next.tasks[0].columnId,'preparing');assert.equal(first.columnId,'todo');
  assert.equal(next.tasks[0].recipeId,first.recipeId);
  assert.equal(M.moveTask(next,first.id,'preparing',first.id),next);
  assert.throws(()=>M.moveTask(board,first.id,'missing'));
});
test('remover etapa realoca tarefas sem exclusão e mantém ordem, cores e conclusão',()=>{
  const board=add(M.defaultBoard());
  const columns=[board.columns[3],{...board.columns[1],name:'Forno',color:'#123456'}];
  const next=M.updateColumns(board,'Produção diária',columns);
  assert.equal(next.tasks.length,1);assert.equal(next.tasks[0].columnId,'done');
  assert.equal(next.columns[1].color,'#123456');assert.equal(M.isDone(next,next.tasks[0]),true);
  assert.equal(board.columns.length,4);
  assert.throws(()=>M.updateColumns(board,'Quadro',[]));
});
test('prazos, filtros combinados e arquivo respeitam tarefas concluídas',()=>{
  let board=add(M.defaultBoard());
  board=add(board,{title:'Concluída',columnId:'done'});
  board=add(board,{title:'Outra',priority:'low',assignee:'Turno B',due:'2026-11-03'});
  board.tasks[2].archived=true;
  assert.equal(M.filterTasks(board,{due:'overdue'},'2026-11-03').length,1);
  assert.equal(M.filterTasks(board,{query:'BISCOITOS',priority:'high',assignee:'Cozinha'}).length,1);
  assert.equal(M.filterTasks(board,{archived:true}).length,1);
  assert.equal(M.moveTask(board,board.tasks[2].id,'done'),board);
  assert.equal(M.validDate('2026-02-30'),'');
  assert.equal(M.validDate('2028-02-29'),'2028-02-29');
  assert.throws(()=>add(board,{title:'   '}));
  assert.throws(()=>add(board,{due:'invalid'}));
});
test('normalização ignora campos desconhecidos e valores inválidos',()=>{
  const board=M.normalizeBoard({name:'Quadro',columns:[{id:'a',name:'A',color:'url(evil)',done:'true'}],tasks:[{id:'x',title:'Tarefa',columnId:'missing',priority:'__proto__',type:'constructor',secret:'no'},{id:'x',title:'Duplicada'},null]});
  assert.equal(board.tasks.length,1);assert.equal(board.tasks[0].columnId,'a');
  assert.equal(board.tasks[0].priority,'normal');assert.equal(board.tasks[0].type,'production');
  assert.equal(board.tasks[0].secret,undefined);assert.equal(board.columns[0].color,'#6357BA');
  assert.equal(board.columns[0].done,false);
});

function remoteMock(result){
  const calls=[];
  const query={};
  for(const method of ['from','select','eq','insert','update'])query[method]=(...args)=>{calls.push([method,...args]);return query;};
  query.maybeSingle=async()=>result;
  return {calls,repo:createRepo({db:{mode:()=>'supabase'},createClient:async()=>query})};
}
test('leitura e gravação remotas sempre filtram workspace e revisão',async()=>{
  const payload=M.defaultBoard(),{repo,calls}=remoteMock({data:{payload,revision:4},error:null});
  assert.equal((await repo.load('workspace-a')).revision,4);
  assert.equal((await repo.save(payload,3,'workspace-a')).revision,4);
  assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='organization_id'&&c[2]==='workspace-a'));
  assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='revision'&&c[2]===3));
  await assert.rejects(repo.load(null));await assert.rejects(repo.save(payload,1,null));
});
test('concorrência no primeiro salvamento e em atualizações nunca sobrescreve outra sessão',async()=>{
  for(const result of [{data:null,error:null},{data:null,error:{code:'23505'}}]){
    const {repo}=remoteMock(result);
    await assert.rejects(repo.save(M.defaultBoard(),result.error?0:3,'org'),e=>e.code==='KANBAN_CONFLICT');
  }
  const {repo}=remoteMock({data:null,error:{code:'42501',message:'denied'}});
  await assert.rejects(repo.save(M.defaultBoard(),0,'org'),e=>e.code==='42501');
});
test('modo local usa chave isolada, persiste e propaga erro de armazenamento',async()=>{
  const values=new Map(),board=M.defaultBoard();
  const db={mode:()=>'local',load:key=>values.get(key),saveLocal:(key,value)=>values.set(key,value)};
  const repo=createRepo({db,createClient:()=>{throw Error('remote forbidden');}});
  await repo.save(board,0,'local');assert.equal(values.get('fichatec_kitchen_local'),board);
  assert.equal((await repo.load('local')).board,board);
  db.saveLocal=()=>{throw Error('quota');};await assert.rejects(repo.save(board,0,'local'),/quota/);
});
