(function exposeKitchenBoard() {
  function createKitchenBoard({repository,getScope,canWrite,getRecipes,viewRecipe,closeModal,showToast}) {
    const M=window.FichaTecKitchenModel;
    const colorStyle=window.FichaTecCategoryColors.categoryColorStyle;
    const host=document.getElementById("page-cozinha");
    const el=id=>document.getElementById(id);
    const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    let board=M.defaultBoard(), revision=0, scope=null, generation=0, loaded=false, loading=false, busy=false, conflict=false;
    let activeColumn=board.columns[0].id, editingTask=null;
    let filters={query:"",assignee:"",priority:"",due:"",archived:false};

    host.innerHTML=`<header class="kitchen-heading"><div><span class="kitchen-eyebrow">Operação da cozinha</span><h1 id="kitchen-name">Rotina da cozinha</h1><p>Planeje o trabalho. Acompanhe cada preparo.</p></div><div class="kitchen-actions"><button class="btn btn-secondary" data-action="refresh" aria-label="Atualizar quadro"><span class="material-symbols-rounded">refresh</span></button><button class="btn btn-secondary" data-action="settings" data-write><span class="material-symbols-rounded">tune</span>Personalizar</button><button class="btn btn-primary" data-action="new" data-write><span class="material-symbols-rounded">add</span>Nova tarefa</button></div></header>
      <div id="kitchen-summary" class="kitchen-summary"></div>
      <div class="kitchen-toolbar"><label class="kitchen-search"><span class="material-symbols-rounded" aria-hidden="true">search</span><input id="kitchen-search" type="search" placeholder="Buscar tarefa ou responsável" aria-label="Buscar tarefa ou responsável"></label>
        <select id="kitchen-owner-filter" aria-label="Filtrar responsável"><option value="">Todos os responsáveis</option></select>
        <select id="kitchen-priority-filter" aria-label="Filtrar prioridade"><option value="">Todas as prioridades</option>${Object.entries(M.priorities).map(([v,n])=>`<option value="${v}">${n}</option>`).join("")}</select>
        <select id="kitchen-due-filter" aria-label="Filtrar prazo"><option value="">Todos os prazos</option><option value="today">Para hoje</option><option value="overdue">Atrasadas</option></select>
        <button class="btn btn-secondary" data-action="archive-view" id="kitchen-archive-toggle" aria-pressed="false"><span class="material-symbols-rounded">inventory_2</span>Arquivadas</button>
      </div><p id="kitchen-status" class="kitchen-status" role="status" aria-live="polite"></p>
      <div id="kitchen-column-tabs" class="kitchen-column-tabs" aria-label="Etapas do quadro"></div><div id="kitchen-board" class="kitchen-board"></div>`;

    function writable() { return loaded&&!loading&&!busy&&!conflict&&canWrite(); }
    function status(message="", error=false) {
      el("kitchen-status").textContent=message;
      el("kitchen-status").classList.toggle("is-error",error);
    }
    function setBusy(value) {
      busy=value;
      for (const id of ["modal-kitchen-task","modal-kitchen-settings"]) {
        const modal=el(id);
        modal.dataset.busy=String(value);
        modal.querySelectorAll("button,input,select,textarea").forEach(control=>{control.disabled=value||(!control.hasAttribute("data-close-kitchen")&&(!canWrite()||conflict));});
      }
      host.querySelectorAll("[data-write]").forEach(button=>{button.disabled=!writable();});
      host.querySelector('[data-action="refresh"]').disabled=value||loading;
    }

    async function load(requestedScope=getScope()) {
      const token=++generation;
      const changed=requestedScope!==scope;
      scope=requestedScope; loading=true; loaded=false; conflict=false; busy=false;
      if (changed) {
        board=M.defaultBoard(); revision=0; filters={query:"",assignee:"",priority:"",due:"",archived:false};
        el("kitchen-search").value="";el("kitchen-priority-filter").value="";el("kitchen-due-filter").value="";
        closeModal("modal-kitchen-task");closeModal("modal-kitchen-settings");
      }
      status("Carregando o quadro…"); render();
      try {
        if (!scope) throw Error("Entre em um workspace para abrir a cozinha.");
        const saved=await repository.load(scope);
        if (token!==generation || scope!==getScope()) return;
        board=M.normalizeBoard(saved.board); revision=saved.revision; loaded=true;
        status(canWrite()?"":"Você pode consultar este quadro. Edições estão disponíveis para responsáveis pela cozinha.");
      } catch(error) {
        if(token!==generation)return;
        status("Não foi possível carregar o quadro. Use Atualizar para tentar novamente.",true);
        console.error("Kitchen board load failed",error);
      } finally {
        if(token===generation){loading=false;render();}
      }
    }

    function reset() {
      generation++; scope=null; loaded=false; loading=false; busy=false; conflict=false;
      board=M.defaultBoard();revision=0;
      closeModal("modal-kitchen-task");closeModal("modal-kitchen-settings");render();
    }
    function show() { if(!loaded||scope!==getScope())load();else render(); }

    async function persist(next) {
      if (!writable() || scope!==getScope()) {showToast("Atualize o quadro antes de editar.");return false;}
      const token=generation;
      setBusy(true);status("Salvando alterações…");
      try {
        const saved=await repository.save(next,revision,scope);
        if(token!==generation||scope!==getScope())return false;
        board=M.normalizeBoard(saved.board);revision=saved.revision;
        status("Alterações salvas.");return true;
      } catch(error) {
        if(token!==generation)return false;
        conflict=error.code==="KANBAN_CONFLICT";
        const message=conflict?error.message:"Não foi possível salvar. Suas alterações continuam no formulário; tente novamente.";
        status(message,true);
        document.querySelectorAll(".kitchen-form-error").forEach(node=>{node.textContent=message;});
        showToast(conflict?"O quadro mudou. Atualize antes de editar.":"Não foi possível salvar o quadro.");
        console.error("Kitchen board save failed",error);return false;
      } finally { if(token===generation){setBusy(false);render();} }
    }

    function render() {
      el("kitchen-name").textContent=board.name;
      const currentOwner=filters.assignee;
      const owners=[...new Set(board.tasks.map(t=>t.assignee).filter(Boolean))].sort();
      el("kitchen-owner-filter").innerHTML='<option value="">Todos os responsáveis</option>'+owners.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join("");
      if (currentOwner&&!owners.includes(currentOwner)) filters.assignee="";
      el("kitchen-owner-filter").value=filters.assignee;
      el("kitchen-archive-toggle").setAttribute("aria-pressed",String(filters.archived));
      el("kitchen-archive-toggle").innerHTML=`<span class="material-symbols-rounded">${filters.archived?"view_kanban":"inventory_2"}</span>${filters.archived?"Voltar ao quadro":"Arquivadas"}`;
      setBusy(busy);renderCards();
    }

    function renderCards() {
      const active=board.tasks.filter(t=>!t.archived), today=M.todayKey();
      el("kitchen-summary").innerHTML=[
        [active.filter(t=>!M.isDone(board,t)).length,"abertas","pending_actions"],
        [active.filter(t=>t.due===today&&!M.isDone(board,t)).length,"para hoje","today"],
        [active.filter(t=>M.isOverdue(board,t,today)).length,"atrasadas","schedule"],
        [active.filter(t=>M.isDone(board,t)).length,"concluídas","task_alt"],
      ].map(([count,label,icon])=>`<span><span class="material-symbols-rounded" aria-hidden="true">${icon}</span><strong>${count}</strong> ${label}</span>`).join("");
      if (!loaded) {
        el("kitchen-column-tabs").innerHTML="";
        el("kitchen-board").innerHTML=`<div class="kitchen-unavailable"><span class="material-symbols-rounded">view_kanban</span><strong>${loading?"Preparando sua cozinha…":"Quadro indisponível"}</strong><p>${loading?"As etapas e tarefas aparecerão aqui.":"Clique em Atualizar para carregar suas tarefas."}</p></div>`;
        return;
      }
      if (!board.columns.some(c=>c.id===activeColumn))activeColumn=board.columns[0].id;
      const tasks=M.filterTasks(board,filters);
      el("kitchen-column-tabs").innerHTML=board.columns.map(c=>`<button type="button" data-action="tab" data-column="${esc(c.id)}" aria-pressed="${c.id===activeColumn}" style="${colorStyle(c.color)}">${esc(c.name)}<span>${tasks.filter(t=>t.columnId===c.id).length}</span></button>`).join("");
      const filtered=Boolean(filters.query||filters.assignee||filters.priority||filters.due||filters.archived);
      el("kitchen-board").innerHTML=board.columns.map(column=>{
        const columnTasks=tasks.filter(t=>t.columnId===column.id);
        return `<section class="kitchen-column ${column.id===activeColumn?"is-active":""}" data-column="${esc(column.id)}" aria-label="${esc(column.name)}" style="${colorStyle(column.color)}">
          <header><span class="kitchen-column-dot" aria-hidden="true"></span><h2>${esc(column.name)}</h2><span class="kitchen-count">${columnTasks.length}</span><button type="button" class="kitchen-icon" data-action="new" data-column="${esc(column.id)}" aria-label="Adicionar tarefa em ${esc(column.name)}" ${writable()&&!filters.archived?"":"disabled"}><span class="material-symbols-rounded">add</span></button></header>
          <div class="kitchen-task-list">${columnTasks.map(task=>renderTask(task,!filtered)).join("")||`<div class="kitchen-empty"><span class="material-symbols-rounded">${column.done?"task_alt":"restaurant"}</span><strong>${filtered?"Nenhuma tarefa encontrada":"Tudo pronto para começar"}</strong><p>${filtered?"Ajuste os filtros para ver outras tarefas.":"Adicione uma tarefa para esta etapa."}</p>${!filtered&&writable()?`<button class="btn btn-secondary btn-sm" data-action="new" data-column="${esc(column.id)}" type="button">Adicionar tarefa</button>`:""}</div>`}</div>
        </section>`;
      }).join("");
    }

    function renderTask(task, allowDrag) {
      const done=task.checklist.filter(c=>c.done).length;
      const recipe=getRecipes().find(r=>String(r.id)===task.recipeId);
      const date=task.due?new Date(`${task.due}T12:00:00`).toLocaleDateString("pt-BR",{day:"2-digit",month:"short"}):"";
      const overdue=M.isOverdue(board,task);
      return `<article class="kitchen-task" data-task-id="${esc(task.id)}" draggable="${writable()&&allowDrag&&!task.archived}">
        <div class="kitchen-task-labels"><span class="kitchen-type">${M.types[task.type]}</span><span class="kitchen-priority priority-${task.priority}">${M.priorities[task.priority]}</span></div>
        <button type="button" class="kitchen-task-title" data-action="edit" data-task="${esc(task.id)}" ${task.archived?"disabled":""}>${esc(task.title)}</button>
        ${task.description?`<p class="kitchen-task-description">${esc(task.description)}</p>`:""}
        ${recipe?`<button class="kitchen-recipe-link" data-action="recipe" data-task="${esc(task.id)}" type="button"><span class="material-symbols-rounded">menu_book</span>${esc(recipe.name)}</button>`:""}
        ${task.checklist.length?`<div class="kitchen-progress"><span>Checklist ${done}/${task.checklist.length}</span><progress value="${done}" max="${task.checklist.length}">${done}/${task.checklist.length}</progress></div>`:""}
        <div class="kitchen-task-meta"><span><span class="material-symbols-rounded">person</span>${esc(task.assignee||"Sem responsável")}</span>${date?`<span class="${overdue?"is-overdue":""}"><span class="material-symbols-rounded">schedule</span>${overdue?"Atrasada · ":""}${date}</span>`:""}</div>
        ${task.archived?`<button class="btn btn-secondary btn-sm" type="button" data-action="restore" data-task="${esc(task.id)}" ${writable()?"":"disabled"}>Restaurar tarefa</button>`:`<label class="kitchen-move"><span>Mover para</span><select data-move-task="${esc(task.id)}" aria-label="Mover ${esc(task.title)} para outra etapa" ${writable()?"":"disabled"}>${board.columns.map(c=>`<option value="${esc(c.id)}" ${c.id===task.columnId?"selected":""}>${esc(c.name)}</option>`).join("")}</select></label>`}
      </article>`;
    }

    function checklistRow(item={id:M.id(),text:"",done:false}) {
      return `<div class="kitchen-check-row" data-check-id="${esc(item.id)}"><input type="checkbox" aria-label="Item concluído" ${item.done?"checked":""}><input type="text" maxlength="180" aria-label="Descrição do item" placeholder="Ex.: separar os ingredientes" value="${esc(item.text)}"><button type="button" class="kitchen-icon" data-remove-check aria-label="Remover item"><span class="material-symbols-rounded">close</span></button></div>`;
    }

    function openTask(taskId=null,columnId=activeColumn) {
      if(!loaded||busy)return;
      const task=board.tasks.find(t=>t.id===taskId);
      if(task?.archived)return;
      if(!task&&!writable())return;
      editingTask=task?.id||null;
      const value=task||{title:"",columnId,type:"production",priority:"normal",assignee:"",due:"",description:"",recipeId:"",checklist:[]};
      const recipes=getRecipes();
      const owners=[...new Set(board.tasks.map(t=>t.assignee).filter(Boolean))];
      el("kitchen-task-form").innerHTML=`<div class="kitchen-modal-heading"><h2 id="kitchen-task-title">${task?"Detalhes da tarefa":"Nova tarefa"}</h2><button class="kitchen-icon" type="button" data-close-kitchen="modal-kitchen-task" aria-label="Fechar tarefa"><span class="material-symbols-rounded">close</span></button></div>
        <div class="kitchen-modal-body"><label class="input-group">Título da tarefa *<input name="title" required maxlength="160" placeholder="Ex.: preparar a produção de amanhã" value="${esc(value.title)}"></label>
        <div class="kitchen-form-grid"><label class="input-group">Etapa<select name="columnId">${board.columns.map(c=>`<option value="${esc(c.id)}" ${c.id===value.columnId?"selected":""}>${esc(c.name)}</option>`).join("")}</select></label>
        <label class="input-group">Tipo<select name="type">${Object.entries(M.types).map(([key,label])=>`<option value="${key}" ${key===value.type?"selected":""}>${label}</option>`).join("")}</select></label>
        <label class="input-group">Prioridade<select name="priority">${Object.entries(M.priorities).map(([key,label])=>`<option value="${key}" ${key===value.priority?"selected":""}>${label}</option>`).join("")}</select></label>
        <label class="input-group">Prazo<input type="date" name="due" value="${esc(value.due)}"></label>
        <label class="input-group">Responsável<input name="assignee" maxlength="80" list="kitchen-assignees" placeholder="Nome da pessoa" value="${esc(value.assignee)}"><datalist id="kitchen-assignees">${owners.map(name=>`<option value="${esc(name)}"></option>`).join("")}</datalist></label>
        <label class="input-group">Receita vinculada<select name="recipeId"><option value="">Sem receita</option>${recipes.map(r=>`<option value="${esc(r.id)}" ${String(r.id)===value.recipeId?"selected":""}>${esc(r.name)}</option>`).join("")}${value.recipeId&&!recipes.some(r=>String(r.id)===value.recipeId)?`<option value="${esc(value.recipeId)}" selected>Receita indisponível</option>`:""}</select></label></div>
        <label class="input-group">Orientações<textarea name="description" rows="3" maxlength="3000" placeholder="Quantidades, cuidados e detalhes para a equipe">${esc(value.description)}</textarea></label>
        <div class="kitchen-check-heading"><h3>Checklist</h3><button type="button" class="btn btn-secondary btn-sm" data-add-check>+ Adicionar item</button></div><div id="kitchen-checklist">${value.checklist.map(checklistRow).join("")}</div>
        <p class="kitchen-form-error" role="alert"></p></div>
        <div class="kitchen-modal-footer">${task?'<button class="btn btn-secondary" type="button" data-archive-task>Arquivar</button>':'<button class="btn btn-secondary" type="button" data-close-kitchen="modal-kitchen-task">Cancelar</button>'}<button class="btn btn-primary" type="submit">Salvar tarefa</button></div>`;
      if(!canWrite())el("kitchen-task-form").querySelectorAll("input,textarea,select,button:not([data-close-kitchen])").forEach(control=>{control.disabled=true;});
      el("modal-kitchen-task").classList.add("open");
      el("kitchen-task-form").elements.title.focus();
    }

    async function submitTask(event) {
      event.preventDefault();if(!writable())return;
      const form=event.currentTarget;
      if(!form.reportValidity())return;
      try {
        const input=Object.fromEntries(new FormData(form));
        input.id=editingTask;
        input.checklist=[...el("kitchen-checklist").children].map(row=>({id:row.dataset.checkId,text:row.querySelector('input[type="text"]').value,done:row.querySelector('input[type="checkbox"]').checked}));
        if(await persist(M.saveTask(board,input))){activeColumn=input.columnId;renderCards();closeModal("modal-kitchen-task");showToast("Tarefa salva.");}
      }catch(error){form.querySelector(".kitchen-form-error").textContent=error.message;}
    }

    function columnRow(column) {
      return `<div class="kitchen-column-setting" data-column-id="${esc(column.id)}"><input type="color" value="${esc(column.color)}" aria-label="Cor da etapa"><input type="text" maxlength="48" required value="${esc(column.name)}" aria-label="Nome da etapa"><label class="kitchen-done-toggle"><input type="checkbox" ${column.done?"checked":""}>Conclui tarefas</label><div class="kitchen-column-tools"><button class="kitchen-icon" type="button" data-column-shift="-1" aria-label="Mover etapa para cima"><span class="material-symbols-rounded">arrow_upward</span></button><button class="kitchen-icon" type="button" data-column-shift="1" aria-label="Mover etapa para baixo"><span class="material-symbols-rounded">arrow_downward</span></button><button class="kitchen-icon" type="button" data-remove-column aria-label="Remover etapa"><span class="material-symbols-rounded">delete</span></button></div></div>`;
    }

    function openSettings() {
      if(!writable())return;
      el("kitchen-settings-form").innerHTML=`<div class="kitchen-modal-heading"><h2 id="kitchen-settings-title">Personalizar quadro</h2><button type="button" class="kitchen-icon" data-close-kitchen="modal-kitchen-settings" aria-label="Fechar personalização"><span class="material-symbols-rounded">close</span></button></div><div class="kitchen-modal-body"><label class="input-group">Nome do quadro<input name="boardName" required maxlength="80" value="${esc(board.name)}"></label><div class="kitchen-check-heading"><h3>Etapas do trabalho</h3><button class="btn btn-secondary btn-sm" type="button" data-add-column>+ Nova etapa</button></div><p class="kitchen-help">Escolha nomes e cores. Use as setas para ordenar as etapas e marque aquelas que concluem as tarefas.</p><div id="kitchen-settings-columns">${board.columns.map(columnRow).join("")}</div><p class="kitchen-help">Ao remover uma etapa, suas tarefas vão para a primeira etapa restante. Nenhuma tarefa será excluída.</p><p class="kitchen-form-error" role="alert"></p></div><div class="kitchen-modal-footer"><button class="btn btn-secondary" type="button" data-close-kitchen="modal-kitchen-settings">Cancelar</button><button class="btn btn-primary" type="submit">Salvar quadro</button></div>`;
      el("modal-kitchen-settings").classList.add("open");
      el("kitchen-settings-form").elements.boardName.focus();
    }

    async function submitSettings(event) {
      event.preventDefault();if(!writable())return;
      const form=event.currentTarget;
      if(!form.reportValidity())return;
      try {
        const columns=[...el("kitchen-settings-columns").children].map(row=>({id:row.dataset.columnId,name:row.querySelector('input[type="text"]').value,color:row.querySelector('input[type="color"]').value,done:row.querySelector('input[type="checkbox"]').checked}));
        if(await persist(M.updateColumns(board,form.elements.boardName.value,columns))){closeModal("modal-kitchen-settings");showToast("Quadro atualizado.");}
      }catch(error){form.querySelector(".kitchen-form-error").textContent=error.message;}
    }

    async function setArchived(taskId, archived) {
      const next={...board,tasks:board.tasks.map(task=>task.id===taskId?{...task,archived,updatedAt:new Date().toISOString()}:task)};
      if(await persist(next)){closeModal("modal-kitchen-task");showToast(archived?"Tarefa arquivada. Você pode restaurá-la em Arquivadas.":"Tarefa restaurada.");}
    }

    async function handleAction(event) {
      const button=event.target.closest("[data-action]");
      if(!button||!host.contains(button)||busy)return;
      const action=button.dataset.action;
      if(action==="refresh")return load();
      if(action==="new")return openTask(null,button.dataset.column||activeColumn);
      if(action==="edit")return openTask(button.dataset.task);
      if(action==="settings")return openSettings();
      if(action==="tab"){activeColumn=button.dataset.column;renderCards();return;}
      if(action==="archive-view"){filters.archived=!filters.archived;render();return;}
      if(action==="restore")return setArchived(button.dataset.task,false);
      if(action==="recipe"){
        const task=board.tasks.find(t=>t.id===button.dataset.task);
        const recipe=getRecipes().find(r=>String(r.id)===task?.recipeId);
        if(recipe)viewRecipe(recipe.id);else showToast("Esta receita não está mais disponível.");
      }
    }

    function handleFormClick(event) {
      if(busy)return;
      const close=event.target.closest("[data-close-kitchen]");
      if(close){closeModal(close.dataset.closeKitchen);return;}
      if(!writable())return;
      if(event.target.closest("[data-add-check]")){
        if(el("kitchen-checklist").children.length>=M.limits.checklist){showToast("Use até 30 itens no checklist.");return;}
        el("kitchen-checklist").insertAdjacentHTML("beforeend",checklistRow());
        el("kitchen-checklist").lastElementChild.querySelector('input[type="text"]').focus();
      }
      event.target.closest("[data-remove-check]")?.closest(".kitchen-check-row").remove();
      if(event.target.closest("[data-archive-task]"))setArchived(editingTask,true);
      if(event.target.closest("[data-add-column]")){
        if(el("kitchen-settings-columns").children.length>=M.limits.columns){showToast("Use até 8 etapas.");return;}
        el("kitchen-settings-columns").insertAdjacentHTML("beforeend",columnRow({id:M.id(),name:"Nova etapa",color:"#6357BA",done:false}));
      }
      const remove=event.target.closest("[data-remove-column]");
      if(remove){if(el("kitchen-settings-columns").children.length>1)remove.closest(".kitchen-column-setting").remove();else showToast("Mantenha pelo menos uma etapa.");}
      const move=event.target.closest("[data-column-shift]");
      if(move){const row=move.closest(".kitchen-column-setting");if(move.dataset.columnShift==="-1"&&row.previousElementSibling)row.previousElementSibling.before(row);if(move.dataset.columnShift==="1"&&row.nextElementSibling)row.nextElementSibling.after(row);}
    }

    host.addEventListener("click",handleAction);
    for(const [input,key] of [["kitchen-search","query"],["kitchen-owner-filter","assignee"],["kitchen-priority-filter","priority"],["kitchen-due-filter","due"]])el(input).addEventListener("input",event=>{filters[key]=event.target.value;renderCards();});
    host.addEventListener("change",async event=>{
      const select=event.target.closest("[data-move-task]");if(!select||!writable())return;
      const target=select.value;
      try{if(await persist(M.moveTask(board,select.dataset.moveTask,target))){activeColumn=target;renderCards();}}catch(error){showToast(error.message);render();}
    });
    host.addEventListener("dragstart",event=>{
      const card=event.target.closest(".kitchen-task[draggable='true']");if(!card){event.preventDefault();return;}
      event.dataTransfer.setData("text/plain",card.dataset.taskId);event.dataTransfer.effectAllowed="move";
    });
    host.addEventListener("dragover",event=>{if(writable()&&event.target.closest(".kitchen-column")){event.preventDefault();event.dataTransfer.dropEffect="move";}});
    host.addEventListener("drop",async event=>{
      const column=event.target.closest(".kitchen-column");if(!column||!writable())return;
      event.preventDefault();const taskId=event.dataTransfer.getData("text/plain");
      if(!board.tasks.some(t=>t.id===taskId))return;
      const before=event.target.closest(".kitchen-task")?.dataset.taskId;
      try{await persist(M.moveTask(board,taskId,column.dataset.column,before));}catch(error){showToast(error.message);}
    });
    el("kitchen-task-form").addEventListener("submit",submitTask);
    el("kitchen-settings-form").addEventListener("submit",submitSettings);
    el("kitchen-task-form").addEventListener("click",handleFormClick);
    el("kitchen-settings-form").addEventListener("click",handleFormClick);
    return {load,show,reset,render};
  }
  window.FichaTecKitchenBoard={createKitchenBoard};
})();
