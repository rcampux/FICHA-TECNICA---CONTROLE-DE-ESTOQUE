(function exposeTutorialProgress() {
  // Fixed rollout boundary from Supabase. Never replace this with the current date:
  // doing so would turn new accounts into existing accounts on every release.
  const EXISTING_USERS_BEFORE = '2026-11-05T20:14:25.139Z';
  const EXISTING_TOUR_RECEIPT = 'fichatec_tutorial_existing_20261105';
  const fresh = () => ({version:2, visits:0, disabled:false, existingUserTourOffered:false, seen:[]});
  function isExistingUser(user) {
    const created=Date.parse(user?.created_at);
    return Number.isFinite(created)&&created<Date.parse(EXISTING_USERS_BEFORE);
  }
  function merge(a={}, b={}) {
    return {version:2, visits:Math.min(3,Math.max(Number(a.visits)||0,Number(b.visits)||0)),
      disabled:Boolean(a.disabled||b.disabled), existingUserTourOffered:Boolean(a.existingUserTourOffered||b.existingUserTourOffered),
      seen:[...new Set([...(Array.isArray(a.seen)?a.seen:[]),...(Array.isArray(b.seen)?b.seen:[])])].filter(v=>typeof v==='string').slice(0,150)};
  }
  function browserStorage(name) {try{return window[name];}catch{return null;}}
  function createProgress({getAuth,createClient,local=browserStorage('localStorage'),session=browserStorage('sessionStorage')}) {
    let userId=null, value=fresh(), paused=false, existing=false, existingAccess=false, serial=Promise.resolve();
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
        combined.existingUserTourOffered ||= data.user.user_metadata?.[EXISTING_TOUR_RECEIPT]===true;
        // Keep a separate receipt so an already-open v1 client cannot erase it
        // when updating its older nested tutorial preferences.
        const updates={fichatec_tutorial:combined};
        if(combined.existingUserTourOffered)updates[EXISTING_TOUR_RECEIPT]=true;
        const result=await client.auth.updateUser({data:updates});
        if(result.error)throw result.error;
      }).catch(()=>{/* Local copy retries on next visit/action; onboarding never blocks the app. */});
    }
    function begin() {
      const auth=getAuth();
      const next=auth?.user?.id||(auth?.isSupabaseEnabled?null:'local');
      if(!next||next===userId)return false;
      userId=next;
      paused=false;
      existing=isExistingUser(auth?.user);
      value=merge(read(local,'fichatec:tutorial:'+next)||fresh(),auth?.user?.user_metadata?.fichatec_tutorial);
      value.existingUserTourOffered ||= auth?.user?.user_metadata?.[EXISTING_TOUR_RECEIPT]===true;
      const sessionKey='fichatec:tutorial-session:'+next;
      const previous=read(session,sessionKey);
      paused=Boolean(previous?.paused);
      existingAccess=Boolean(previous?.existingUserTour);
      if(existing){
        // Previous v1 visits do not consume this one-time introduction. Opt-out does.
        if(value.disabled||value.existingUserTourOffered){persist();return false;}
        if(paused)return false;
        return true;
      }
      if(!previous){const offer=value.visits<3;value.visits=Math.min(3,value.visits+1);write(session,sessionKey,{paused:false});persist();return !value.disabled&&offer;}
      return false;
    }
    async function canPresentExistingTour() {
      if(!existing)return true;
      const owner=userId;
      let timer;
      try {
        const result=await Promise.race([
          (async()=>{const client=await createClient();return client?client.auth.getUser():null;})(),
          new Promise(resolve=>{timer=setTimeout(()=>resolve(null),4000);})
        ]);
        if(!result||result.error||result.data?.user?.id!==owner||getAuth()?.user?.id!==owner||userId!==owner)return false;
        const metadata=result.data.user.user_metadata;
        value=merge(value,metadata?.fichatec_tutorial);
        value.existingUserTourOffered ||= metadata?.[EXISTING_TOUR_RECEIPT]===true;
        write(local,'fichatec:tutorial:'+owner,value);
        return !value.disabled&&!paused&&!value.existingUserTourOffered;
      }catch{return false;}finally{clearTimeout(timer);}
    }
    function recordTourShown() {
      if(!userId||!existing||value.disabled||value.existingUserTourOffered)return;
      // Consume only when the tour is actually visible, not when another popup blocks it.
      value.existingUserTourOffered=true;
      existingAccess=true;
      write(session,'fichatec:tutorial-session:'+userId,{paused,existingUserTour:true});
      persist();
    }
    function pause(disable=false) {
      if(!userId)return;
      paused=true;
      write(session,'fichatec:tutorial-session:'+userId,{paused:true,existingUserTour:existingAccess});
      if(disable){value.disabled=true;persist();}
    }
    function allowed(id) {return Boolean(userId)&&(!existing||existingAccess)&&!value.disabled&&!paused&&!read(session,'fichatec:tutorial-session:'+userId)?.paused&&!value.seen.includes(id);}
    function mark(id) {if(!value.seen.includes(id)){value.seen.push(id);persist();}}
    function resetSession() {if(userId){try{session.removeItem('fichatec:tutorial-session:'+userId);}catch{}}userId=null;paused=false;existing=false;existingAccess=false;value=fresh();}
    return {begin,canPresentExistingTour,recordTourShown,pause,allowed,mark,resetSession,isExisting:()=>existing,get:()=>merge(value)};
  }
  window.FichaTecTutorialProgress={EXISTING_USERS_BEFORE,fresh,isExistingUser,merge,createProgress};
})();
