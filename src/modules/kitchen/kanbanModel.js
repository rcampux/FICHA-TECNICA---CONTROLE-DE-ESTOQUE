(function exposeKitchenModel() {
  const types = {production:"Produção",purchase:"Compras",cleaning:"Higiene",maintenance:"Manutenção",other:"Outros"};
  const priorities = {urgent:"Urgente",high:"Alta",normal:"Normal",low:"Baixa"};
  const limits = {columns:8,tasks:500,checklist:30};
  const clean = (value, length) => String(value ?? "").trim().slice(0,length);
  const id = () => crypto.randomUUID();

  function defaultBoard() {
    return {name:"Rotina da cozinha",columns:[
      {id:"todo",name:"A fazer",color:"#6357BA",done:false},
      {id:"preparing",name:"Em preparo",color:"#D97706",done:false},
      {id:"review",name:"Em revisão",color:"#3273C8",done:false},
      {id:"done",name:"Concluído",color:"#378449",done:true},
    ],tasks:[]};
  }

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "";
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value ? value : "";
  }

  function todayKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  }

  function normalizeBoard(raw) {
    if (!raw || !Array.isArray(raw.columns) || !raw.columns.length) return defaultBoard();
    const columns = [], seen = new Set();
    for (const item of raw.columns.slice(0,limits.columns)) {
      const columnId = clean(item?.id,80);
      if (!columnId || seen.has(columnId)) continue;
      seen.add(columnId);
      columns.push({id:columnId,name:clean(item.name,48)||"Etapa",color:/^#[0-9a-f]{6}$/i.test(item.color)?item.color:"#6357BA",done:item.done===true});
    }
    if (!columns.length) return defaultBoard();
    const taskIds = new Set();
    const tasks = (Array.isArray(raw.tasks)?raw.tasks:[]).slice(0,limits.tasks).flatMap(item => {
      const taskId=clean(item?.id,80), title=clean(item?.title,160);
      if (!taskId || !title || taskIds.has(taskId)) return [];
      taskIds.add(taskId);
      return [{id:taskId,title,description:clean(item.description,3000),columnId:seen.has(item.columnId)?item.columnId:columns[0].id,
        type:Object.hasOwn(types,item.type)?item.type:"production",priority:Object.hasOwn(priorities,item.priority)?item.priority:"normal",
        assignee:clean(item.assignee,80),due:validDate(item.due),recipeId:clean(item.recipeId,100),archived:item.archived===true,
        checklist:(Array.isArray(item.checklist)?item.checklist:[]).slice(0,limits.checklist).filter(c=>clean(c?.text,180)).map(c=>({id:clean(c.id,80)||id(),text:clean(c.text,180),done:c.done===true})),
        createdAt:clean(item.createdAt,40),updatedAt:clean(item.updatedAt,40)}];
    });
    return {name:clean(raw.name,80)||"Rotina da cozinha",columns,tasks};
  }

  function saveTask(board, input) {
    if (!clean(input.title,160)) throw Error("Dê um título à tarefa.");
    if (!board.columns.some(c=>c.id===input.columnId)) throw Error("Escolha uma etapa válida.");
    if (input.due && !validDate(input.due)) throw Error("Informe uma data válida.");
    const current=board.tasks.find(t=>t.id===input.id);
    if (!current && board.tasks.length>=limits.tasks) throw Error("O quadro atingiu o limite de 500 tarefas, incluindo arquivadas.");
    const now=new Date().toISOString();
    const task={...current,...input,id:current?.id||id(),archived:current?.archived||false,createdAt:current?.createdAt||now,updatedAt:now};
    return normalizeBoard({...board,tasks:current?board.tasks.map(t=>t.id===current.id?task:t):[...board.tasks,task]});
  }

  function moveTask(board, taskId, columnId, beforeId = null) {
    if (!board.columns.some(c=>c.id===columnId)) throw Error("Esta etapa não existe mais. Atualize o quadro.");
    const task=board.tasks.find(t=>t.id===taskId);
    if (!task || task.archived || beforeId===taskId) return board;
    const tasks=board.tasks.filter(t=>t.id!==taskId);
    const before=tasks.findIndex(t=>t.id===beforeId&&t.columnId===columnId&&!t.archived);
    tasks.splice(before<0?tasks.length:before,0,{...task,columnId,updatedAt:new Date().toISOString()});
    return {...board,tasks};
  }

  function updateColumns(board, name, columns) {
    if (!clean(name,80)) throw Error("Dê um nome ao quadro.");
    if (!columns.length || columns.length>limits.columns) throw Error("Use de 1 a 8 etapas.");
    if (columns.some(c=>!clean(c.name,48))) throw Error("Preencha o nome de todas as etapas.");
    if (new Set(columns.map(c=>c.id)).size!==columns.length) throw Error("Etapas duplicadas.");
    return normalizeBoard({...board,name,columns});
  }

  function isDone(board, task) { return Boolean(board.columns.find(c=>c.id===task.columnId)?.done); }
  function isOverdue(board, task, today = todayKey()) { return !task.archived&&!isDone(board,task)&&Boolean(task.due&&task.due<today); }
  function filterTasks(board, filters = {}, today = todayKey()) {
    const query=String(filters.query||"").trim().toLocaleLowerCase("pt-BR");
    return board.tasks.filter(t=> t.archived===Boolean(filters.archived)
      && (!query || `${t.title} ${t.description} ${t.assignee}`.toLocaleLowerCase("pt-BR").includes(query))
      && (!filters.assignee || t.assignee===filters.assignee)
      && (!filters.priority || t.priority===filters.priority)
      && (filters.due!=="today" || t.due===today)
      && (filters.due!=="overdue" || isOverdue(board,t,today)));
  }

  window.FichaTecKitchenModel={types,priorities,limits,id,defaultBoard,validDate,todayKey,normalizeBoard,saveTask,moveTask,updateColumns,isDone,isOverdue,filterTasks};
})();
