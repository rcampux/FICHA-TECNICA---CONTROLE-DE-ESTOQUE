import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const sandbox={window:{}};
vm.runInNewContext(readFileSync(new URL('../src/modules/tutorial/tutorialProgress.js',import.meta.url),'utf8'),sandbox);
const {createProgress}=sandbox.window.FichaTecTutorialProgress;
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
function fixture(){let user={id:'alice'};const local=storage(),session=storage();return {local,session,user:v=>user=v,create:()=>createProgress({getAuth:()=>({user,isSupabaseEnabled:true}),createClient:async()=>null,local,session})};}
test('only three sessions offer the tour; bootstrap/reload does not count twice',()=>{
  const f=fixture();
  for(let n=1;n<=5;n++){
    const p=f.create();assert.equal(p.begin(),n<=3);assert.equal(p.begin(),false);
    assert.equal(f.create().begin(),false);p.resetSession();
  }
});
test('X pauses this session; first-use actions and permanent opt-out survive return',()=>{
  const f=fixture(),p=f.create();p.begin();p.mark('prepare');p.pause();
  assert.equal(p.allowed('virtual'),false);p.resetSession();p.begin();
  assert.equal(p.allowed('virtual'),true);assert.equal(p.allowed('prepare'),false);
  p.pause(true);p.resetSession();assert.equal(p.begin(),false);assert.equal(p.allowed('virtual'),false);
});
test('different accounts never inherit another account progress',()=>{
  const f=fixture(),p=f.create();p.begin();p.pause(true);p.mark('prepare');p.resetSession();
  f.user({id:'bob'});assert.equal(p.begin(),true);assert.equal(p.allowed('prepare'),true);
});
test('remote preferences merge with local preferences, without overwriting metadata',async()=>{
  let saved;
  const user={id:'remote',user_metadata:{fichatec_tutorial:{visits:2,seen:['virtual']}}};
  const auth={getUser:async()=>({data:{user}}),updateUser:async value=>{saved=value;return {error:null};}};
  const p=createProgress({getAuth:()=>({user}),createClient:async()=>({auth}),local:storage(),session:storage()});
  assert.equal(p.begin(),true);assert.equal(p.allowed('virtual'),false);p.mark('prepare');
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(saved.data.fichatec_tutorial.visits,3);assert.ok(saved.data.fichatec_tutorial.seen.includes('prepare'));
  assert.equal(Object.keys(saved.data).length,1);
});
test('blocked storage never prevents using the app',()=>{
  const blocked={getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}};
  const p=createProgress({getAuth:()=>({isSupabaseEnabled:false}),createClient:async()=>null,local:blocked,session:blocked});
  assert.equal(p.begin(),true);p.mark('prepare');p.pause(true);assert.equal(p.allowed('x'),false);
});

test('X also pauses when browser storage is unavailable',()=>{
  const p=createProgress({getAuth:()=>({isSupabaseEnabled:false}),createClient:async()=>null});
  assert.equal(p.begin(),true);p.pause();assert.equal(p.allowed('virtual'),false);
});

test('queued preference saves never write into a different logged-in account',async()=>{
  let user={id:'alice'}, writes=0;
  const p=createProgress({getAuth:()=>({user}),createClient:async()=>({auth:{
    getUser:async()=>({data:{user:{id:'bob'}}}),
    updateUser:async()=>{writes++;return {};}
  }}),local:storage(),session:storage()});
  p.begin();p.mark('prepare');user={id:'bob'};
  await new Promise(resolve=>setTimeout(resolve,20));assert.equal(writes,0);
});
