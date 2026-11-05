(function exposeTutorialProgress() {
  const fresh = () => ({version:1, visits:0, disabled:false, seen:[]});
  function merge(a={}, b={}) {
    return {version:1, visits:Math.min(3,Math.max(Number(a.visits)||0,Number(b.visits)||0)),
      disabled:Boolean(a.disabled||b.disabled), seen:[...new Set([...(Array.isArray(a.seen)?a.seen:[]),...(Array.isArray(b.seen)?b.seen:[])])].filter(v=>typeof v==='string').slice(0,150)};
  }
  function browserStorage(name) {try{return window[name];}catch{return null;}}
  function createProgress({getAuth,createClient,local=browserStorage('localStorage'),session=browserStorage('sessionStorage')}) {
    let userId=null, value=fresh(), paused=false, serial=Promise.resolve();
    const read=(storage,key)=>{try{return JSON.parse(storage.getItem(key)||'null');}catch{return null;}};
    const write=(storage,key,data)=>{try{storage.setItem(key,JSON.stringify(data));}catch{/* Storage blocked: keep in-memory progress. */}};
    function persist() {
      const owner=userId, snapshot=merge(value), key='fichatec:tutorial:'+owner;
      write(local,key,snapshot);
      if(owner==='local')return;
      // Run outside the auth state-change callback. Metadata holds UX preferences only.
      serial=serial.catch(()=>{}).then(async()=>{
        const client=await createClient();
        if(!client||getAuth()?.user?.id!==owner)return;
        const {data,error}=await client.auth.getUser();
        if(error||data?.user?.id!==owner||getAuth()?.user?.id!==owner)return;
        const combined=merge(data.user.user_metadata?.fichatec_tutorial,snapshot);
        const result=await client.auth.updateUser({data:{fichatec_tutorial:combined}});
        if(result.error)throw result.error;
      }).catch(()=>{/* Local copy retries on next visit/action; onboarding never blocks the app. */});
    }
    function begin() {
      const auth=getAuth();
      const next=auth?.user?.id||(auth?.isSupabaseEnabled?null:'local');
      if(!next||next===userId)return false;
      userId=next;
      paused=false;
      value=merge(read(local,'fichatec:tutorial:'+next)||fresh(),auth?.user?.user_metadata?.fichatec_tutorial);
      const sessionKey='fichatec:tutorial-session:'+next;
      const previous=read(session,sessionKey);
      paused=Boolean(previous?.paused);
      if(!previous){const offer=value.visits<3;value.visits=Math.min(3,value.visits+1);write(session,sessionKey,{paused:false});persist();return !value.disabled&&offer;}
      return false;
    }
    function pause(disable=false) {
      if(!userId)return;
      paused=true;
      write(session,'fichatec:tutorial-session:'+userId,{paused:true});
      if(disable){value.disabled=true;persist();}
    }
    function allowed(id) {return Boolean(userId)&&!value.disabled&&!paused&&!read(session,'fichatec:tutorial-session:'+userId)?.paused&&!value.seen.includes(id);}
    function mark(id) {if(!value.seen.includes(id)){value.seen.push(id);persist();}}
    function resetSession() {if(userId){try{session.removeItem('fichatec:tutorial-session:'+userId);}catch{}}userId=null;paused=false;value=fresh();}
    return {begin,pause,allowed,mark,resetSession,get:()=>merge(value)};
  }
  window.FichaTecTutorialProgress={fresh,merge,createProgress};
})();
