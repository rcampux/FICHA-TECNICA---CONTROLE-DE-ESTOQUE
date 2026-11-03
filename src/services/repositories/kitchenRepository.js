(function exposeKitchenRepository() {
  const localKey="fichatec_kitchen_local";
  function createKitchenRepository({db,createClient}) {
    async function load(organizationId) {
      if (db.mode?.()!=="supabase") return {board:db.load(localKey),revision:0};
      if (!organizationId) throw Error("Entre em um workspace para abrir o quadro.");
      const client=await createClient();
      const {data,error}=await client.from("kitchen_boards").select("payload,revision").eq("organization_id",organizationId).maybeSingle();
      if (error) throw error;
      return {board:data?.payload,revision:data?.revision||0};
    }

    async function save(board, revision, organizationId) {
      if (db.mode?.()!=="supabase") { db.saveLocal?db.saveLocal(localKey,board):db.save(localKey,board); return {board,revision:0}; }
      if (!organizationId) throw Error("Workspace indisponível.");
      const client=await createClient();
      const query=revision===0
        ? client.from("kitchen_boards").insert({organization_id:organizationId,payload:board,revision:1})
        : client.from("kitchen_boards").update({payload:board,revision:revision+1}).eq("organization_id",organizationId).eq("revision",revision);
      const {data,error}=await query.select("payload,revision").maybeSingle();
      if (error && error.code!=="23505") throw error;
      if (!data || error?.code==="23505") {
        const conflict=Error("O quadro mudou em outra sessão. Feche o formulário e clique em Atualizar antes de tentar novamente.");
        conflict.code="KANBAN_CONFLICT";
        throw conflict;
      }
      return {board:data.payload,revision:data.revision};
    }
    return {load,save};
  }
  window.FichaTecKitchenRepository={createKitchenRepository};
})();
