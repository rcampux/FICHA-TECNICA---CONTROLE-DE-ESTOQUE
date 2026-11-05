import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const sandbox={window:{}};
vm.runInNewContext(readFileSync(new URL('../src/modules/tutorial/tutorialProgress.js',import.meta.url),'utf8'),sandbox);
const {createProgress,isExistingUser,EXISTING_USERS_BEFORE}=sandbox.window.FichaTecTutorialProgress;
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
function fixture(initialUser={id:'alice',created_at:'2026-11-06T00:00:00Z'}){let user=initialUser;const local=storage(),session=storage();return {local,session,user:v=>user=v,create:()=>createProgress({getAuth:()=>({user,isSupabaseEnabled:true}),createClient:async()=>null,local,session})};}
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

const existingUser=(metadata={})=>({id:'existing',created_at:'2026-10-17T12:00:00Z',user_metadata:{fichatec_tutorial:metadata}});

test('rollout cohort uses a fixed account creation date, not visits or today',()=>{
  assert.equal(isExistingUser(existingUser()),true);
  assert.equal(isExistingUser({created_at:EXISTING_USERS_BEFORE}),false);
  assert.equal(isExistingUser({created_at:'2026-11-06T00:00:00Z'}),false);
  assert.equal(isExistingUser({created_at:'invalid'}),false);
});

test('existing accounts get one visible tour even if all three old visits were used',()=>{
  const f=fixture(existingUser({version:1,visits:3,seen:['virtual']}));
  const p=f.create();assert.equal(p.begin(),true);assert.equal(p.isExisting(),true);
  assert.equal(p.begin(),false);p.recordTourShown();
  assert.equal(p.get().existingUserTourOffered,true);
  assert.equal(p.allowed('prepare'),true);assert.equal(p.allowed('virtual'),false);
  assert.equal(f.create().begin(),false);
  for(let n=0;n<4;n++){
    p.resetSession();assert.equal(p.begin(),false);assert.equal(p.allowed('prepare'),false);
  }
});

test('closing the existing-user tour with X never triggers it on a later access',()=>{
  const f=fixture(existingUser()),p=f.create();p.begin();p.recordTourShown();p.pause();
  assert.equal(p.allowed('prepare'),false);p.resetSession();
  assert.equal(p.begin(),false);assert.equal(p.allowed('prepare'),false);
});

test('existing accounts keep permanent opt-out before and after this rollout',()=>{
  const f=fixture(existingUser({disabled:true})),p=f.create();
  assert.equal(p.begin(),false);p.recordTourShown();assert.equal(p.get().existingUserTourOffered,false);
  assert.equal(p.allowed('prepare'),false);
  const g=fixture(existingUser()),q=g.create();q.begin();q.recordTourShown();q.pause(true);q.resetSession();
  assert.equal(q.begin(),false);assert.equal(q.get().disabled,true);
});

test('a blocked tour is not consumed before actually appearing',()=>{
  const f=fixture(existingUser()),p=f.create();assert.equal(p.begin(),true);
  assert.equal(p.get().existingUserTourOffered,false);
  const afterReload=f.create();assert.equal(afterReload.begin(),true);
  afterReload.recordTourShown();assert.equal(f.create().begin(),false);
});

test('existing-account rollout persists across devices and merges older metadata',async()=>{
  let user=existingUser({version:1,visits:2,seen:['virtual']}),saved;
  const auth={getUser:async()=>({data:{user}}),updateUser:async payload=>{
    saved=payload;user={...user,user_metadata:{...user.user_metadata,...payload.data}};return {error:null};
  }};
  const createDevice=()=>createProgress({getAuth:()=>({user}),createClient:async()=>({auth}),local:storage(),session:storage()});
  const first=createDevice();assert.equal(first.begin(),true);first.recordTourShown();
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(saved.data.fichatec_tutorial.existingUserTourOffered,true);
  assert.equal(createDevice().begin(),false);
  assert.equal(saved.data.fichatec_tutorial_existing_20261105,true);
  user={...user,user_metadata:{...user.user_metadata,fichatec_tutorial:{version:1,visits:3}}};
  assert.equal(createDevice().begin(),false); // v1 browser cannot erase the separate receipt
  first.mark('prepare');
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(saved.data.fichatec_tutorial.existingUserTourOffered,true);
});

test('paused old session waits for next access without spending the one-time tour',()=>{
  const f=fixture(existingUser());f.session.setItem('fichatec:tutorial-session:existing',JSON.stringify({paused:true}));
  const p=f.create();assert.equal(p.begin(),false);assert.equal(p.get().existingUserTourOffered,false);
  p.resetSession();assert.equal(p.begin(),true);
});
