# FichaTec - Inventario de Funcoes

Este arquivo e um inventario vivo das funcoes utilizadas no projeto. Toda nova funcao criada, movida, renomeada ou removida deve ser refletida aqui durante a mesma etapa de trabalho.

## Regra

- Registrar nome da funcao, arquivo, linha aproximada e responsabilidade.
- Manter este arquivo atualizado antes de commit/push.
- Quando a funcao for parte de um modulo, indicar o modulo no caminho do arquivo.
- Funcoes SQL de migrations tambem devem ser registradas.
- Este inventario apoia a documentacao final, auditoria tecnica e futuras refatoracoes para Supabase, PWA e assinaturas.

## Funcoes Atuais

| Funcao | Arquivo | Linha | Responsabilidade inicial |
| --- | --- | ---: | --- |
| `resolveRequestPath` | `scripts/dev-server.mjs` | 19 | function resolveRequestPath(url) { |
| `toQuotedString` | `scripts/sync-public-assets.mjs` | 9 | Serializa valores de ambiente para gerar JS publico seguro. |
| `buildPublicEnvConfig` | `scripts/sync-public-assets.mjs` | 13 | Gera `public/src/config/env.js` com modo local ou Supabase no build. |
| `syncPublicAssets` | `scripts/sync-public-assets.mjs` | 34 | Sincroniza codigo e assets locais para `public/` e injeta a configuracao publica. |
| `showToast` | `src/app.js` | 11 | function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);} |
| `confirmAction` | `src/app.js` | 13 | Abre modal de confirmacao visual com opcoes de sim/nao para acoes destrutivas. |
| `closeConfirmAction` | `src/app.js` | 21 | Fecha o modal de confirmacao e resolve a decisao pendente. |
| `showPage` | `src/app.js` | 25 | function showPage(page,navId){ |
| `closeModal` | `src/app.js` | 34 | function closeModal(id){document.getElementById(id).classList.remove('open');} |
| `getModalFocusableElements` | `src/app.js` | 41 | Lista controles visiveis e habilitados usados pelo ciclo de foco dos dialogs. |
| `syncModalAccessibility` | `src/app.js` | 47 | Sincroniza `aria-hidden`/`inert`, foco inicial e restauracao de foco entre modais simples ou aninhados. |
| `setAppShellVisible` | `src/app.js` | 42 | Alterna visibilidade, `aria-hidden` e `inert` da area autenticada. |
| `stopBootTimer` | `src/app.js` | 50 | Cancela o temporizador ativo da splash sem afetar o restante do bootstrap. |
| `hideBootScreen` | `src/app.js` | 56 | Executa a saida visual da splash e so entao oculta o elemento, com fallback e movimento reduzido. |
| `showBootSplash` | `src/app.js` | 84 | Exibe a splash moderna e mantem a area interna inerte ate a decisao de acesso. |
| `showStartScreen` | `src/app.js` | 111 | Abre diretamente a autenticacao quando nao existe sessao valida. |
| `enterAppExperience` | `src/app.js` | 120 | Fecha o gate de acesso, libera a aplicacao e abre a ficha tecnica. |
| `exitToStartExperience` | `src/app.js` | 133 | Faz transicao curta de saida e retorna ao login depois do logout. |
| `openStartLogin` | `src/app.js` | 138 | Abre o login sem sobrescrever o modo de recuperacao de senha. |
| `failSafeReleaseBoot` | `src/app.js` | 149 | Libera a interface em falhas de bootstrap, respeitando modo local ou Supabase. |
| `wait` | `src/app.js` | 159 | Cria espera controlada para timeouts de boot e autenticacao. |
| `resolveWithTimeout` | `src/app.js` | 163 | Libera o bootstrap quando a autenticacao demora demais, evitando splash travada. |
| `readBlobAsDataUrl` | `src/app.js` | 178 | Converte a capa otimizada em data URL para modo local e upload remoto. |
| `loadRecipeImageSource` | `src/app.js` | 187 | Decodifica o arquivo de imagem e rejeita conteúdo inválido. |
| `exportRecipeImageCanvas` | `src/app.js` | 196 | Exporta o canvas da capa como JPEG com qualidade controlada. |
| `prepareRecipeImage` | `src/app.js` | 205 | Valida, redimensiona, comprime e remove metadados da imagem da receita antes de salvar. |
| `bootstrapAppExperience` | `src/app.js` | 486 | Coordena splash, modo local, recuperacao, login e sessao restaurada sem estados concorrentes. |
| `hydrateWorkspaceData` | `src/app.js` | 105 | Carrega estoque, estoque fisico e receitas do Supabase quando um workspace e selecionado. |
| `applyRemoteSave` | `src/app.js` | 130 | Atualiza o estado em memoria depois que uma escrita remota retorna `remoteId`. |
| `clearSessionData` | `src/app.js` | 143 | Limpa cache local, estado em memoria e telas quando nao ha sessao Supabase ativa. |
| `exposeStorageKeys` | `src/config/storageKeys.js` | 1 | (function exposeStorageKeys() { |
| `exposeSupabaseConfig` | `src/config/supabase.js` | 1 | (function exposeSupabaseConfig() { |
| `hasSupabaseConfig` | `src/config/supabase.js` | 5 | function hasSupabaseConfig() { |
| `exposeNutrition` | `src/modules/nutrition/nutritionDefaults.js` | 1 | (function exposeNutrition() { |
| `getNutrition` | `src/modules/nutrition/nutritionDefaults.js` | 30 | function getNutrition(name) { |
| `exposeAuthSessionModule` | `src/modules/auth/authSession.js` | 1 | Expõe o modulo de sessao, login e workspace para a aplicacao. |
| `createAuthSessionModule` | `src/modules/auth/authSession.js` | 2 | Cria a camada de autenticacao desacoplada do app principal. |
| `getElement` | `src/modules/auth/authSession.js` | 22 | Recupera elementos de UI usados no modal de acesso. |
| `setPasswordRecoveryMarker` | `src/modules/auth/authSession.js` | 46 | Persiste ou limpa na aba o estado curto de recuperacao para impedir que um refresh libere a sessao antes da troca de senha. |
| `hasPendingPasswordRecovery` | `src/modules/auth/authSession.js` | 58 | Valida o marcador temporario de recuperacao e descarta estados expirados. |
| `getAuthState` | `src/modules/auth/authSession.js` | 26 | Retorna estado publico de autenticacao, usuario e workspace ativo. |
| `escapeHtml` | `src/modules/auth/authSession.js` | 36 | Escapa dados vindos do banco antes de renderizar workspaces. |
| `dispatchWorkspaceChange` | `src/modules/auth/authSession.js` | 46 | Dispara evento de mudanca de workspace para hidratar dados remotos. |
| `dispatchSignedOut` | `src/modules/auth/authSession.js` | 53 | Dispara evento para limpar dados locais quando a sessao Supabase termina. |
| `getAuthRedirectUrl` | `src/modules/auth/authSession.js` | 58 | Monta URL atual do app para redirecionamento de confirmacao de e-mail. |
| `getPasswordValidation` | `src/modules/auth/authSession.js` | 62 | Valida requisitos de senha forte para criacao de conta. |
| `isStrongPassword` | `src/modules/auth/authSession.js` | 73 | Confirma se todos os requisitos de senha forte foram atendidos. |
| `ensureSupabaseClient` | `src/modules/auth/authSession.js` | 79 | Recria ou retorna o client Supabase para login/cadastro mesmo quando o boot de sessao demorou. |
| `animateAuthViewChange` | `src/modules/auth/authSession.js` | 198 | Aplica transicao curta de opacidade e deslocamento entre os estados de autenticacao. |
| `showInitialUserScreen` | `src/modules/auth/authSession.js` | 77 | Fecha o modal de acesso e retorna para a tela inicial do usuario apos login. |
| `handleAuthKeydown` | `src/modules/auth/authSession.js` | 84 | Submete login/cadastro ao pressionar Enter nos campos de acesso. |
| `clearAuthInputs` | `src/modules/auth/authSession.js` | 90 | Limpa campos sensiveis do formulario de acesso e restaura o campo de senha. |
| `initAuthSession` | `src/modules/auth/authSession.js` | 57 | Inicializa modo local ou Supabase Auth sem bloquear o prototipo. |
| `syncSupabaseSession` | `src/modules/auth/authSession.js` | 88 | Sincroniza sessao Supabase no estado local do modulo. |
| `loadOrganizations` | `src/modules/auth/authSession.js` | 98 | Carrega workspaces do usuario autenticado via `organization_members`. |
| `renderAuthState` | `src/modules/auth/authSession.js` | 135 | Renderiza botao de sessao, formulario e lista de workspaces. |
| `renderPasswordFeedback` | `src/modules/auth/authSession.js` | 207 | Renderiza checklist visual dos requisitos de senha forte. |
| `togglePasswordVisibility` | `src/modules/auth/authSession.js` | 228 | Alterna a visibilidade da senha no modal de acesso. |
| `openAuthModal` | `src/modules/auth/authSession.js` | 199 | Abre o modal de acesso/workspace. |
| `setAuthMode` | `src/modules/auth/authSession.js` | 204 | Alterna entre login e criacao de conta. |
| `submitAuthForm` | `src/modules/auth/authSession.js` | 211 | Executa login ou cadastro usando Supabase Auth quando habilitado. |
| `resendConfirmationEmail` | `src/modules/auth/authSession.js` | 251 | Reenvia o e-mail de confirmacao do Supabase Auth usando o redirect atual da Vercel. |
| `backToAuthForm` | `src/modules/auth/authSession.js` | 396 | Sai do estado de verificacao de email e volta para o formulario de login. |
| `signOutAuth` | `src/modules/auth/authSession.js` | 286 | Encerra a sessao autenticada no Supabase. |
| `selectOrganization` | `src/modules/auth/authSession.js` | 298 | Define o workspace ativo para futuras operacoes remotas. |
| `formatAuthError` | `src/modules/auth/authSession.js` | 108 | Converte erros tecnicos do Supabase Auth em mensagens curtas, seguras e acionaveis. |
| `setAuthBusy` | `src/modules/auth/authSession.js` | 148 | Centraliza o estado de processamento e atualiza controles e feedback do modal de acesso. |
| `handlePasswordRecovery` | `src/modules/auth/authSession.js` | 208 | Ativa o modo de nova senha ao receber `PASSWORD_RECOVERY` e remove credenciais da URL. |
| `handleAuthBack` | `src/modules/auth/authSession.js` | 650 | Volta ao login ou encerra localmente a sessao de recovery antes de permitir a solicitacao de um novo link. |
| `togglePasswordConfirmationVisibility` | `src/modules/auth/authSession.js` | 575 | Alterna a visibilidade da confirmacao da nova senha. |
| `requestPasswordReset` | `src/modules/auth/authSession.js` | 681 | Solicita e-mail de recuperacao sem revelar se a conta existe e usa redirect da origem atual. |
| `updatePassword` | `src/modules/auth/authSession.js` | 727 | Valida e confirma a nova senha antes de atualiza-la na sessao de recuperacao Supabase. |
| `exposePlanAccessModule` | `src/modules/billing/planAccess.js` | 1 | Expoe a matriz e os gates de planos/permissoes para o app. |
| `createPlanAccessModule` | `src/modules/billing/planAccess.js` | 52 | Cria o estado de plano ativo, assinatura e limites por workspace. |
| `normalizeNumber` | `src/modules/billing/planAccess.js` | 62 | Normaliza valores numericos de planos e limites. |
| `normalizePlan` | `src/modules/billing/planAccess.js` | 67 | Converte plano vindo do Supabase para formato de acesso usado no frontend. |
| `isSubscriptionUsable` | `src/modules/billing/planAccess.js` | 88 | Verifica se uma assinatura `trialing` ou `active` pode liberar recursos. |
| `getPlanAccessState` | `src/modules/billing/planAccess.js` | 93 | Retorna estado publico de plano, assinatura e workspace. |
| `loadPlanAccess` | `src/modules/billing/planAccess.js` | 103 | Carrega `subscriptions` + `plans` do Supabase e aplica fallback Trial. |
| `getPlanLimit` | `src/modules/billing/planAccess.js` | 141 | Resolve limite de recurso a partir do plano ativo. |
| `canUseFeature` | `src/modules/billing/planAccess.js` | 147 | Valida se um recurso ainda pode ser usado dentro do limite do plano. |
| `describeFeatureLock` | `src/modules/billing/planAccess.js` | 153 | Retorna mensagem de bloqueio para recursos premium. |
| `requireFeature` | `src/modules/billing/planAccess.js` | 163 | Aplica gate de recurso e mostra feedback quando o plano nao libera. |
| `jsonResponse` | `supabase/functions/_shared/billing.ts` | 10 | Retorna resposta JSON padronizada para Edge Functions. |
| `handleOptions` | `supabase/functions/_shared/billing.ts` | 21 | Responde preflight CORS das Edge Functions. |
| `readJson` | `supabase/functions/_shared/billing.ts` | 28 | Le corpo JSON e falha com erro padronizado quando invalido. |
| `httpError` | `supabase/functions/_shared/billing.ts` | 36 | Cria erro HTTP com codigo, mensagem e detalhes. |
| `requiredString` | `supabase/functions/_shared/billing.ts` | 45 | Valida strings obrigatorias no payload server-side. |
| `getSupabaseConfig` | `supabase/functions/_shared/billing.ts` | 52 | Carrega `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` das Edge Functions. |
| `getBearerToken` | `supabase/functions/_shared/billing.ts` | 65 | Extrai token Bearer do usuario autenticado. |
| `requireAuthenticatedUser` | `supabase/functions/_shared/billing.ts` | 76 | Valida sessao Supabase Auth no server-side. |
| `supabaseRest` | `supabase/functions/_shared/billing.ts` | 96 | Executa chamadas REST ao Supabase com service role server-side. |
| `makeQuery` | `supabase/functions/_shared/billing.ts` | 119 | Monta query string segura para PostgREST. |
| `getPlanByCode` | `supabase/functions/_shared/billing.ts` | 130 | Busca plano ativo pelo codigo. |
| `requireOrganizationManager` | `supabase/functions/_shared/billing.ts` | 149 | Exige papel `owner` ou `admin` para assinatura/checkout. |
| `requireOrganizationMember` | `supabase/functions/_shared/billing.ts` | 172 | Confirma membership do usuario no workspace. |
| `getActiveSubscription` | `supabase/functions/_shared/billing.ts` | 191 | Carrega assinatura do workspace com plano associado. |
| `getCurrentUsagePeriod` | `supabase/functions/_shared/billing.ts` | 202 | Resolve periodo mensal de uso premium. |
| `getFeatureUsage` | `supabase/functions/_shared/billing.ts` | 209 | Carrega uso mensal atual de um recurso premium. |
| `getFeatureLimit` | `supabase/functions/_shared/billing.ts` | 225 | Mapeia recurso premium para limite do plano. |
| `isSubscriptionUsable` | `supabase/functions/_shared/billing.ts` | 238 | Confirma se assinatura `trialing` ou `active` libera recurso. |
| `handleError` | `supabase/functions/_shared/billing.ts` | 242 | Converte excecoes em resposta JSON de erro. |
| `normalizeSubscriptionStatus` | `supabase/functions/billing-webhook/index.ts` | 13 | Valida status recebido do gateway antes de atualizar assinatura. |
| `exposeRecipeSheetModule` | `src/modules/recipes/recipeSheet.js` | 1 | (function exposeRecipeSheetModule() { |
| `createRecipeSheetModule` | `src/modules/recipes/recipeSheet.js` | 2 | function createRecipeSheetModule(deps) { |
| `syncState` | `src/modules/recipes/recipeSheet.js` | 30 | function syncState() { |
| `commitState` | `src/modules/recipes/recipeSheet.js` | 36 | function commitState() { |
| `persistRecipesSnapshot` | `src/modules/recipes/recipeSheet.js` | 73 | Persiste receitas local/remotamente, grava o retorno canonico no cache e restaura o snapshot anterior quando a sincronizacao falha. |
| `persistLocal` | `src/modules/recipes/recipeSheet.js` | 75 | Helper interno de `persistRecipesSnapshot` para manter o cache local coerente com o estado confirmado. |
| `focusRecipeCard` | `src/modules/recipes/recipeSheet.js` | 65 | Localiza a ultima receita salva, destaca o card e rola a aba Receitas ate ela. |
| `escapeAttribute` | `src/modules/recipes/recipeSheet.js` | 111 | Escapa IDs, URLs e textos antes de inseri-los em atributos HTML. |
| `escapeHtml` | `src/modules/recipes/recipeSheet.js` | 120 | Escapa nomes e textos de receita renderizados com `innerHTML`. |
| `sanitizeRecipeImageSource` | `src/modules/recipes/recipeSheet.js` | 124 | Aceita somente fontes HTTP(S) ou data URLs raster seguras para capas de receita. |
| `normalizeRecipeImage` | `src/modules/recipes/recipeSheet.js` | 137 | Normaliza string/objeto de imagem para metadados de capa retrocompativeis. |
| `getRecipeImageElements` | `src/modules/recipes/recipeSheet.js` | 158 | Resolve os controles opcionais `recipe-image-input`, `recipe-image-preview` e `recipe-image-remove`. |
| `resolveImageSource` | `src/modules/recipes/recipeSheet.js` | 166 | Resolve a URL exibivel via dependencia opcional e aplica validacao de protocolo. |
| `hashRecipeIdentity` | `src/modules/recipes/recipeSheet.js` | 188 | Gera hash estavel por `remoteId`/`id`, preservando cor e icone do placeholder ao renomear a receita. |
| `getRecipePlaceholder` | `src/modules/recipes/recipeSheet.js` | 188 | Seleciona icone culinario e paleta deterministica quando nao existe capa. |
| `renderRecipeMedia` | `src/modules/recipes/recipeSheet.js` | 196 | Renderiza capa ou placeholder consistente nos cards e no detalhe da receita. |
| `renderRecipeImageEditor` | `src/modules/recipes/recipeSheet.js` | 212 | Sincroniza preview/remocao de capa no DOM e nas dependencias opcionais do app. |
| `setRecipeImageProcessing` | `src/modules/recipes/recipeSheet.js` | 272 | Expõe estado ocupado acessivel, bloqueia acoes concorrentes e informa a otimizacao da capa. |
| `setRecipeSaveBusy` | `src/modules/recipes/recipeSheet.js` | 289 | Torna o shell do app inerte durante a persistencia para impedir navegacao ou edicoes concorrentes. |
| `setCurrentRecipeImage` | `src/modules/recipes/recipeSheet.js` | 255 | Atualiza a capa em edicao e registra se houve alteracao explicita. |
| `readFileAsDataUrl` | `src/modules/recipes/recipeSheet.js` | 262 | Le arquivo raster como data URL no fallback local sem compressor externo. |
| `handleRecipeImageInput` | `src/modules/recipes/recipeSheet.js` | 271 | Valida a selecao de capa e usa `readRecipeImage` para receber a versao comprimida, com fallback local limitado. |
| `removeRecipeImage` | `src/modules/recipes/recipeSheet.js` | 313 | Marca a remocao explicita da capa e limpa input/preview. |
| `resolveRecipeImageForSave` | `src/modules/recipes/recipeSheet.js` | 320 | Resolve a capa antes de salvar, preservando a imagem existente quando o seletor nao mudou. |
| `bindRecipeImageEditor` | `src/modules/recipes/recipeSheet.js` | 342 | Conecta uma unica vez os controles opcionais de selecao e remocao de capa. |
| `bindRecipeCardActions` | `src/modules/recipes/recipeSheet.js` | 86 | Centraliza cliques de visualizar, editar, deletar e exportar PDF sem handlers inline. |
| `bindRecipeFilterActions` | `src/modules/recipes/recipeSheet.js` | 378 | Delega cliques dos filtros de ingrediente via `data-*`, sem interpolar nomes em JavaScript inline. |
| `readNumericValue` | `src/modules/recipes/recipeSheet.js` | 124 | Normaliza valores numericos de formularios e objetos nutricionais com fallback seguro. |
| `hasNutritionData` | `src/modules/recipes/recipeSheet.js` | 129 | Verifica se um ingrediente/produto possui dados nutricionais manuais aproveitaveis. |
| `getIngredientNutrition` | `src/modules/recipes/recipeSheet.js` | 134 | Combina nutricao manual do estoque virtual com fallback por nome do ingrediente. |
| `scaleNutritionByAmount` | `src/modules/recipes/recipeSheet.js` | 143 | Escala nutricao base de 100g para a quantidade real usada na ficha. |
| `calculateRecipeNutritionTotals` | `src/modules/recipes/recipeSheet.js` | 151 | Soma os nutrientes totais da receita a partir dos ingredientes adicionados. |
| `getRecipeYieldG` | `src/modules/recipes/recipeSheet.js` | 168 | Le o rendimento atual da ficha para calcular nutricao por porcao. |
| `calculateRecipeNutritionPortion` | `src/modules/recipes/recipeSheet.js` | 172 | Converte totais nutricionais da receita para a porcao selecionada, usando rendimento ou peso dos ingredientes. |
| `formatNutritionValue` | `src/modules/recipes/recipeSheet.js` | 188 | Formata valores nutricionais com unidade curta e casas decimais adequadas. |
| `renderNutritionRows` | `src/modules/recipes/recipeSheet.js` | 194 | Renderiza linhas da tabela nutricional com valor por porcao e percentual diario. |
| `getRecipeNutritionSummary` | `src/modules/recipes/recipeSheet.js` | 208 | Gera resumo curto de calorias/proteinas por porcao para cards e detalhe da receita. |
| `findStockItem` | `src/modules/recipes/recipeSheet.js` | 42 | function findStockItem(stockId,name){ |
| `calcCosts` | `src/modules/recipes/recipeSheet.js` | 46 | function calcCosts(ingredients,markup=0){ |
| `setIngSource` | `src/modules/recipes/recipeSheet.js` | 52 | function setIngSource(src){ |
| `searchIngredient` | `src/modules/recipes/recipeSheet.js` | 62 | function searchIngredient(){ |
| `selectIngredient` | `src/modules/recipes/recipeSheet.js` | 82 | function selectIngredient(id){ |
| `calcIngCost` | `src/modules/recipes/recipeSheet.js` | 97 | function calcIngCost(){ |
| `addIngredient` | `src/modules/recipes/recipeSheet.js` | 107 | function addIngredient(){ |
| `removeIngredient` | `src/modules/recipes/recipeSheet.js` | 139 | Remove ingrediente da ficha apos confirmacao visual. |
| `renderIngredients` | `src/modules/recipes/recipeSheet.js` | 140 | function renderIngredients(){ |
| `calcFicha` | `src/modules/recipes/recipeSheet.js` | 155 | function calcFicha(){ |
| `calcNutrition` | `src/modules/recipes/recipeSheet.js` | 349 | Atualiza a tabela nutricional da ficha com base nos ingredientes e na porcao selecionada. |
| `clearFicha` | `src/modules/recipes/recipeSheet.js` | 629 | Limpa ingredientes, campos, contexto de edicao e preview da capa, com modo forcado/silencioso. |
| `saveRecipe` | `src/modules/recipes/recipeSheet.js` | 644 | Salva ou sobrescreve receita preservando `id/remoteId`, capa/metadados e snapshot nutricional; depois foca a ficha salva. |
| `hasPriceChanged` | `src/modules/recipes/recipeSheet.js` | 228 | function hasPriceChanged(refs){ |
| `renderRecipes` | `src/modules/recipes/recipeSheet.js` | 706 | Renderiza cards com capa ou placeholder culinario, custo, nutricao e delegacao segura de eventos/filtros. |
| `setIngFilter` | `src/modules/recipes/recipeSheet.js` | 274 | function setIngFilter(val){activeIngFilter=val;renderRecipes(document.getElementById('recipe-search').value,val);} |
| `viewRecipe` | `src/modules/recipes/recipeSheet.js` | 758 | Abre detalhe da receita com capa/placeholder, custo, ingredientes e nutricao por porcao. |
| `deleteCurrentRecipe` | `src/modules/recipes/recipeSheet.js` | 379 | Exclui a receita atual apos confirmacao visual e sincroniza o snapshot com Supabase quando ativo. |
| `editRecipe` | `src/modules/recipes/recipeSheet.js` | 343 | Define a receita atual e carrega seus dados na ficha tecnica para edicao. |
| `deleteRecipe` | `src/modules/recipes/recipeSheet.js` | 347 | Define a receita atual e reaproveita o fluxo existente de exclusao. |
| `loadRecipeToFicha` | `src/modules/recipes/recipeSheet.js` | 842 | Carrega ingredientes, valores e capa existentes na ficha para edicao sem perda da imagem. |
| `exportRecipePDF` | `src/modules/recipes/recipeSheet.js` | 861 | Exporta HTML imprimivel/PDF incluindo a capa quando houver, resumo financeiro, nutricao e ingredientes. |
| `runWithState` | `src/modules/recipes/recipeSheet.js` | 425 | function runWithState(fn, options = {}) { |
| `wrappedRecipeFunction` | `src/modules/recipes/recipeSheet.js` | 427 | return function wrappedRecipeFunction(...args) { |
| `getActiveIngredientFilter` | `src/modules/recipes/recipeSheet.js` | 435 | function getActiveIngredientFilter() { return activeIngFilter; } |
| `getCurrentRecipeId` | `src/modules/recipes/recipeSheet.js` | 436 | function getCurrentRecipeId() { return currentRecipeId; } |
| `getCurrentRecipeImage` | `src/modules/recipes/recipeSheet.js` | 980 | Retorna uma copia dos metadados da capa em edicao. |
| `exposeScannerRecipeModule` | `src/modules/scanner/scannerRecipe.js` | 1 | (function exposeScannerRecipeModule() { |
| `createScannerRecipeModule` | `src/modules/scanner/scannerRecipe.js` | 2 | function createScannerRecipeModule(deps) { |
| `syncState` | `src/modules/scanner/scannerRecipe.js` | 23 | function syncState() { |
| `commitState` | `src/modules/scanner/scannerRecipe.js` | 28 | function commitState() { |
| `escapeHtml` | `src/modules/scanner/scannerRecipe.js` | 29 | Escapa nomes, unidades e mensagens externas antes de renderizar resultados do scanner. |
| `openScanModal` | `src/modules/scanner/scannerRecipe.js` | 32 | function openScanModal() { |
| `resetScan` | `src/modules/scanner/scannerRecipe.js` | 37 | function resetScan() { |
| `setScanStatus` | `src/modules/scanner/scannerRecipe.js` | 51 | function setScanStatus(type, msg) { |
| `setScanSaveBusy` | `src/modules/scanner/scannerRecipe.js` | 61 | Torna shell e scanner inertes durante a persistencia, bloqueia fechamento acidental e sincroniza os controles. |
| `handleScanFile` | `src/modules/scanner/scannerRecipe.js` | 60 | async function handleScanFile(event) { |
| `compressImage` | `src/modules/scanner/scannerRecipe.js` | 132 | Redimensiona ambos os eixos da imagem com limite de dimensao e rejeita arquivos corrompidos. |
| `analyzeRecipeImage` | `src/modules/scanner/scannerRecipe.js` | 164 | Envia a imagem ao endpoint de IA com cancelamento e ignora respostas antigas concorrentes. |
| `renderScanResult` | `src/modules/scanner/scannerRecipe.js` | 118 | function renderScanResult(recipe) { |
| `removeScanIng` | `src/modules/scanner/scannerRecipe.js` | 155 | Remove ingrediente digitalizado apos confirmacao visual. |
| `confirmScanSave` | `src/modules/scanner/scannerRecipe.js` | 161 | Salva receita digitalizada e confirma sobrescrita quando houver nome duplicado. |
| `exposePhysicalStockModule` | `src/modules/stock/physicalStock.js` | 1 | (function exposePhysicalStockModule() { |
| `createPhysicalStockModule` | `src/modules/stock/physicalStock.js` | 2 | function createPhysicalStockModule(deps) { |
| `readViewMode` | `src/modules/stock/physicalStock.js` | 31 | Le preferencia grid/lista em JSON ou formato legado sem quebrar o render. |
| `writeViewMode` | `src/modules/stock/physicalStock.js` | 42 | Salva preferencia grid/lista do estoque fisico em JSON valido. |
| `escapeAttribute` | `src/modules/stock/physicalStock.js` | 30 | Escapa IDs remotos antes de inserir nos atributos dos cards de estoque fisico. |
| `bindPhysicalCardActions` | `src/modules/stock/physicalStock.js` | 38 | Centraliza acoes de editar, deletar, usar e repor estoque fisico via eventos `data-*`. |
| `persistPhysicalSnapshot` | `src/modules/stock/physicalStock.js` | 34 | Persiste estoque fisico localmente e aguarda sincronizacao Supabase quando houver workspace ativo. |
| `persistVirtualStockSnapshot` | `src/modules/stock/physicalStock.js` | 51 | Sincroniza o estoque virtual gerado a partir do estoque fisico sem enfileirar escrita remota duplicada. |
| `applyPhysicalViewMode` | `src/modules/stock/physicalStock.js` | 26 | Aplica classe e estado visual do modo grid/lista no estoque fisico. |
| `setPhysicalViewMode` | `src/modules/stock/physicalStock.js` | 34 | Persiste a preferencia grid/lista do estoque fisico e re-renderiza a lista atual. |
| `getPhysicalCategories` | `src/modules/stock/physicalStock.js` | 42 | Retorna categorias do catalogo compartilhado para filtro multi-selecao no estoque fisico. |
| `renderPhysicalCategoryFilters` | `src/modules/stock/physicalStock.js` | 47 | Renderiza lista de categorias selecionaveis no painel do funil fisico. |
| `togglePhysicalCategoryPanel` | `src/modules/stock/physicalStock.js` | 72 | Abre ou fecha o painel de categorias do estoque fisico. |
| `togglePhysicalCategoryFilter` | `src/modules/stock/physicalStock.js` | 80 | Alterna uma categoria no filtro multi-selecao do estoque fisico. |
| `clearPhysicalCategoryFilters` | `src/modules/stock/physicalStock.js` | 90 | Limpa filtros de categoria aplicados ao estoque fisico. |
| `stockColor` | `src/modules/stock/physicalStock.js` | 96 | function stockColor(percent) { |
| `stockFlag` | `src/modules/stock/physicalStock.js` | 100 | function stockFlag(percent) { |
| `stockBar` | `src/modules/stock/physicalStock.js` | 106 | function stockBar(percent) { |
| `openPhysicalModal` | `src/modules/stock/physicalStock.js` | 110 | function openPhysicalModal(id = null) { |
| `savePhysical` | `src/modules/stock/physicalStock.js` | 171 | Salva ou edita produto fisico preservando IDs remotos e aguardando Supabase quando ativo. |
| `deletePhysical` | `src/modules/stock/physicalStock.js` | 223 | Exclui produto fisico apos confirmacao visual e sincroniza o snapshot remoto. |
| `renderPhysical` | `src/modules/stock/physicalStock.js` | 198 | Renderiza estoque fisico com `data-physical-id` e delegacao de eventos para CRUD estavel apos refresh. |
| `openMove` | `src/modules/stock/physicalStock.js` | 167 | function openMove(id) { |
| `setMoveType` | `src/modules/stock/physicalStock.js` | 185 | function setMoveType(type) { |
| `confirmMove` | `src/modules/stock/physicalStock.js` | 193 | function confirmMove() { |
| `exposeStockPricing` | `src/modules/stock/stockPricing.js` | 1 | (function exposeStockPricing() { |
| `pricePerUnit` | `src/modules/stock/stockPricing.js` | 2 | function pricePerUnit(stockItem) { |
| `exposeCategoryCatalogModule` | `src/modules/stock/categoryCatalog.js` | 1 | Expoe o catalogo compartilhado de categorias para estoque virtual e fisico. |
| `createCategoryCatalogModule` | `src/modules/stock/categoryCatalog.js` | 2 | Cria o modulo centralizado de cadastro, normalizacao e listagem de categorias. |
| `normalizeCategoryName` | `src/modules/stock/categoryCatalog.js` | 31 | Normaliza nome de categoria antes de salvar ou comparar. |
| `escapeOptionValue` | `src/modules/stock/categoryCatalog.js` | 35 | Escapa valores renderizados em `option` para evitar HTML invalido. |
| `getDefaultCategoryNames` | `src/modules/stock/categoryCatalog.js` | 41 | Retorna categorias padrao reutilizaveis nos dois estoques. |
| `getCategoryNames` | `src/modules/stock/categoryCatalog.js` | 45 | Mescla categorias padrao, cadastradas e usadas em produtos existentes. |
| `persistCategories` | `src/modules/stock/categoryCatalog.js` | 56 | Persiste o catalogo local de categorias reutilizaveis. |
| `ensureCategory` | `src/modules/stock/categoryCatalog.js` | 63 | Garante existencia de uma categoria antes de vincula-la a um produto. |
| `renderCategoryOptions` | `src/modules/stock/categoryCatalog.js` | 74 | Preenche selects de categoria do estoque virtual e fisico. |
| `openCategoryModal` | `src/modules/stock/categoryCatalog.js` | 90 | Abre modal de cadastro independente de categoria. |
| `saveCategory` | `src/modules/stock/categoryCatalog.js` | 98 | Salva categoria avulsa e atualiza filtros/opcoes dos estoques. |
| `handleCategoryKeydown` | `src/modules/stock/categoryCatalog.js` | 115 | Permite salvar categoria pressionando Enter no modal. |
| `exposeVirtualStockModule` | `src/modules/stock/virtualStock.js` | 1 | (function exposeVirtualStockModule() { |
| `createVirtualStockModule` | `src/modules/stock/virtualStock.js` | 2 | function createVirtualStockModule(deps) { |
| `readViewMode` | `src/modules/stock/virtualStock.js` | 26 | Le preferencia grid/lista em JSON ou formato legado sem quebrar o render. |
| `writeViewMode` | `src/modules/stock/virtualStock.js` | 37 | Salva preferencia grid/lista do estoque virtual em JSON valido. |
| `escapeAttribute` | `src/modules/stock/virtualStock.js` | 25 | Escapa IDs remotos antes de inserir nos atributos dos cards de estoque virtual. |
| `bindStockCardActions` | `src/modules/stock/virtualStock.js` | 33 | Centraliza cliques de editar/deletar estoque virtual via eventos `data-*`, sem JavaScript inline. |
| `persistStockSnapshot` | `src/modules/stock/virtualStock.js` | 29 | Persiste estoque virtual localmente e aguarda sincronizacao Supabase quando houver workspace ativo. |
| `applyStockViewMode` | `src/modules/stock/virtualStock.js` | 21 | Aplica classe e estado visual do modo grid/lista no estoque virtual. |
| `setStockViewMode` | `src/modules/stock/virtualStock.js` | 29 | Persiste a preferencia grid/lista do estoque virtual e re-renderiza a lista atual. |
| `getStockCategories` | `src/modules/stock/virtualStock.js` | 37 | Retorna categorias do catalogo compartilhado para filtro multi-selecao no estoque virtual. |
| `renderStockCategoryFilters` | `src/modules/stock/virtualStock.js` | 42 | Renderiza lista de categorias selecionaveis no painel do funil virtual. |
| `toggleStockCategoryPanel` | `src/modules/stock/virtualStock.js` | 67 | Abre ou fecha o painel de categorias do estoque virtual. |
| `toggleStockCategoryFilter` | `src/modules/stock/virtualStock.js` | 75 | Alterna uma categoria no filtro multi-selecao do estoque virtual. |
| `clearStockCategoryFilters` | `src/modules/stock/virtualStock.js` | 85 | Limpa filtros de categoria aplicados ao estoque virtual. |
| `readNumberInput` | `src/modules/stock/virtualStock.js` | 49 | Le campos numericos do modal de estoque virtual com fallback seguro. |
| `writeNumberInput` | `src/modules/stock/virtualStock.js` | 57 | Preenche campos numericos do modal sem gravar valores invalidos. |
| `getNutritionPortionSize` | `src/modules/stock/virtualStock.js` | 63 | Resolve a porcao customizada usada para exibicao proporcional da tabela nutricional. |
| `scaleNutritionForPortion` | `src/modules/stock/virtualStock.js` | 68 | Recalcula valores nutricionais da base por 100g para a porcao escolhida. |
| `formatNutritionMetric` | `src/modules/stock/virtualStock.js` | 82 | Formata numeros nutricionais com unidade curta para o preview. |
| `readNutritionFromForm` | `src/modules/stock/virtualStock.js` | 88 | Coleta tabela nutricional completa do modal, incluindo porcao, gordura saturada e trans. |
| `writeNutritionToForm` | `src/modules/stock/virtualStock.js` | 102 | Restaura tabela nutricional no modal ao editar produto virtual. |
| `updateNutritionPreview` | `src/modules/stock/virtualStock.js` | 114 | Renderiza preview proporcional da nutricao conforme a porcao informada. |
| `openStockModal` | `src/modules/stock/virtualStock.js` | 94 | function openStockModal(id=null){ |
| `updateGoogleLink` | `src/modules/stock/virtualStock.js` | 116 | function updateGoogleLink(){ |
| `handleGoogleSearch` | `src/modules/stock/virtualStock.js` | 121 | function handleGoogleSearch(e){const h=document.getElementById('google-search-link').href;if(!h\|\|h==='#'){e.preventDefault();return;}window.open(h,'_blank');e |
| `saveStock` | `src/modules/stock/virtualStock.js` | 145 | Salva ou edita produto virtual preservando IDs remotos e aguardando Supabase quando ativo. |
| `deleteStock` | `src/modules/stock/virtualStock.js` | 163 | Exclui produto virtual apos confirmacao visual e sincroniza o snapshot remoto. |
| `renderStock` | `src/modules/stock/virtualStock.js` | 143 | Renderiza estoque virtual com `data-stock-id` e delegacao de eventos para CRUD estavel apos refresh. |
| `registerFichaTecServiceWorker` | `src/pwa/registerServiceWorker.js` | 1 | Inicializa, sem bloquear o boot, o atalho do scanner e o ciclo de registro/atualizacao da PWA. |
| `handleLaunchShortcut` | `src/pwa/registerServiceWorker.js` | 7 | Preserva `?action=scanner` durante splash/login e abre o scanner assim que a interface autenticada estiver disponivel. |
| `stopWatching` | `src/pwa/registerServiceWorker.js` | 14 | Encerra o observer e o timeout usados pelo atalho do scanner. |
| `tryOpenScanner` | `src/pwa/registerServiceWorker.js` | 19 | Tenta abrir o scanner apenas fora do boot e do modal de autenticacao, consumindo a acao da URL apos sucesso. |
| `watchUntilScannerIsAvailable` | `src/pwa/registerServiceWorker.js` | 35 | Observa mudancas de boot/autenticacao por tempo limitado sem bloquear a interface. |
| `requestServiceWorkerUpdate` | `src/pwa/registerServiceWorker.js` | 57 | Solicita uma verificacao de atualizacao e trata falhas de rede sem interromper o app. |
| `monitorServiceWorkerUpdates` | `src/pwa/registerServiceWorker.js` | 63 | Ativa workers em espera e verifica novas versoes ao registrar, voltar online ou retomar a pagina. |
| `activateWaitingWorker` | `src/pwa/registerServiceWorker.js` | 64 | Solicita ativacao imediata de uma versao do worker que ja esteja aguardando. |
| `registerServiceWorker` | `src/pwa/registerServiceWorker.js` | 91 | Registra `/service-worker.js` com escopo raiz, atualizacao fora do cache HTTP e recarga unica ao trocar o controlador. |
| `shouldCacheResponse` | `service-worker.js` / `public/service-worker.js` | 39 | Valida respostas antes de inserir no cache PWA, evitando cache de 404/HTML inesperado. |
| `cacheAppShell` | `service-worker.js` / `public/service-worker.js` | 43 | Pre-carrega assets principais, incluindo controle de planos e imagem principal, com tolerancia a falhas individuais. |
| `deleteOldCaches` | `service-worker.js` / `public/service-worker.js` | 56 | Remove versoes antigas do cache PWA na ativacao. |
| `networkFirstNavigation` | `service-worker.js` / `public/service-worker.js` | 61 | Tenta navegacao online primeiro e usa app shell cacheado como fallback offline. |
| `cacheFirstAsset` | `service-worker.js` / `public/service-worker.js` | 76 | Entrega imagens/icones pelo cache quando possivel e grava apenas respostas validas. |
| `shouldUseNetworkFirstAsset` | `service-worker.js` / `public/service-worker.js` | 88 | Identifica HTML, JS, CSS e manifest como assets criticos que devem buscar rede antes do cache. |
| `networkFirstAsset` | `service-worker.js` / `public/service-worker.js` | 94 | Busca assets criticos na rede primeiro e usa cache apenas como fallback offline, evitando JS antigo apos F5. |
| `exposeHybridRepository` | `src/services/repositories/hybridRepository.js` | 1 | (function exposeHybridRepository() { |
| `getMode` | `src/services/repositories/hybridRepository.js` | 7 | Retorna `local` ou `supabase` conforme configuracao ativa. |
| `getSupabaseClient` | `src/services/repositories/hybridRepository.js` | 11 | Reusa a promise do cliente Supabase para leituras/escritas remotas. |
| `getActiveOrganizationId` | `src/services/repositories/hybridRepository.js` | 19 | Lê o workspace ativo a partir do estado de autenticacao. |
| `load` | `src/services/repositories/hybridRepository.js` | 23 | Carrega dados locais do `localStorage`. |
| `save` | `src/services/repositories/hybridRepository.js` | 27 | Salva localmente e enfileira sincronizacao remota quando habilitada. |
| `saveLocal` | `src/services/repositories/hybridRepository.js` | 32 | Salva somente no cache local para fluxos que aguardam `saveRemote` explicitamente e evitam sync duplicado. |
| `remove` | `src/services/repositories/hybridRepository.js` | 32 | Remove uma chave local sem afetar dados remotos no Supabase. |
| `loadRemote` | `src/services/repositories/hybridRepository.js` | 36 | Carrega dados Supabase por chave de dominio e organizacao. |
| `saveRemote` | `src/services/repositories/hybridRepository.js` | 42 | Salva dados Supabase por chave de dominio e atualiza cache local. |
| `queueRemoteSave` | `src/services/repositories/hybridRepository.js` | 50 | Executa sincronizacao remota em background e emite evento de retorno. |
| `exposeSupabaseDomainRepository` | `src/services/repositories/supabaseDomainRepository.js` | 1 | Expõe o repository de dominio Supabase para estoque, fichas e receitas. |
| `normalizeNumber` | `src/services/repositories/supabaseDomainRepository.js` | 4 | Normaliza valores numericos vindos do app ou do banco. |
| `centsFromCurrency` | `src/services/repositories/supabaseDomainRepository.js` | 9 | Converte valores em reais para centavos inteiros. |
| `currencyFromCents` | `src/services/repositories/supabaseDomainRepository.js` | 13 | Converte centavos do banco para reais no app. |
| `getRemoteId` | `src/services/repositories/supabaseDomainRepository.js` | 17 | Resolve o identificador remoto sem quebrar IDs locais do prototipo. |
| `normalizeRecipeImageMetadata` | `src/services/repositories/supabaseDomainRepository.js` | 23 | Normaliza fonte, caminho e metadados da capa antes de sincronizar com o Supabase. |
| `isRecipeImageDataUrl` | `src/services/repositories/supabaseDomainRepository.js` | 43 | Identifica data URLs raster aceitas para upload de capa. |
| `dataUrlToBlob` | `src/services/repositories/supabaseDomainRepository.js` | 47 | Converte data URL validada em `Blob` para o Storage, rejeitando SVG e formatos inesperados. |
| `getRecipeImagePath` | `src/services/repositories/supabaseDomainRepository.js` | 57 | Monta o caminho privado deterministico `{organizationId}/{recipeId}/cover.jpg`. |
| `createRecipeImageSignedUrl` | `src/services/repositories/supabaseDomainRepository.js` | 61 | Cria URL assinada temporaria da capa privada sem impedir o carregamento da receita em caso de falha. |
| `uploadRecipeImage` | `src/services/repositories/supabaseDomainRepository.js` | 73 | Envia a capa raster ao bucket privado `recipe-images` com `upsert` e limite de 5 MB. |
| `removeRecipeImage` | `src/services/repositories/supabaseDomainRepository.js` | 95 | Remove objetos de capa substituidos ou explicitamente excluidos do Storage. |
| `updateRecipeImagePath` | `src/services/repositories/supabaseDomainRepository.js` | 102 | Atualiza `recipes.image_path` dentro do workspace ativo. |
| `hydrateRecipeImage` | `src/services/repositories/supabaseDomainRepository.js` | 114 | Acrescenta URL assinada aos metadados de imagem carregados do banco. |
| `getNutritionRawPayload` | `src/services/repositories/supabaseDomainRepository.js` | 21 | Recupera campos nutricionais extras salvos em `nutrition_facts.raw_payload`. |
| `mapNutritionToRemote` | `src/services/repositories/supabaseDomainRepository.js` | 26 | Converte nutricao do app para `nutrition_facts`, preservando porcao e gorduras extras em `raw_payload`. |
| `mapNutritionFromRemote` | `src/services/repositories/supabaseDomainRepository.js` | 47 | Converte `nutrition_facts` para o formato usado no app, incluindo extras de `raw_payload`. |
| `shouldReconcileDeletes` | `src/services/repositories/supabaseDomainRepository.js` | 49 | Define quando e seguro reconciliar exclusoes remotas, incluindo snapshot vazio ja hidratado. |
| `softDeleteMissingRows` | `src/services/repositories/supabaseDomainRepository.js` | 53 | Marca como deletadas linhas remotas ausentes do snapshot local seguro, inclusive quando todos os itens foram removidos. |
| `deleteMissingRecipeIngredients` | `src/services/repositories/supabaseDomainRepository.js` | 73 | Remove ingredientes remotos ausentes da receita sincronizada, inclusive quando a lista fica vazia. |
| `mapStockToRemote` | `src/services/repositories/supabaseDomainRepository.js` | 80 | Converte estoque virtual para `stock_items`. |
| `mapStockFromRemote` | `src/services/repositories/supabaseDomainRepository.js` | 95 | Converte `stock_items` para estoque virtual do app. |
| `mapPhysicalToRemote` | `src/services/repositories/supabaseDomainRepository.js` | 110 | Converte estoque fisico para `physical_stock_items`. |
| `mapPhysicalFromRemote` | `src/services/repositories/supabaseDomainRepository.js` | 126 | Converte `physical_stock_items` para estoque fisico do app. |
| `mapRecipeToRemote` | `src/services/repositories/supabaseDomainRepository.js` | 280 | Converte receita para o banco e aceita `image_path` apenas quando coincide com o caminho canonico da propria receita. |
| `mapRecipeFromRemote` | `src/services/repositories/supabaseDomainRepository.js` | 303 | Converte `recipes` com ingredientes e metadados de capa para o formato do app. |
| `mapRecipeIngredientToRemote` | `src/services/repositories/supabaseDomainRepository.js` | 193 | Converte ingrediente da ficha para `recipe_ingredients`, separando corretamente itens virtuais e fisicos com UUID. |
| `mapRecipeIngredientFromRemote` | `src/services/repositories/supabaseDomainRepository.js` | 204 | Converte `recipe_ingredients` para ingrediente do app. |
| `upsertNutrition` | `src/services/repositories/supabaseDomainRepository.js` | 224 | Salva snapshot nutricional manual em `nutrition_facts`. |
| `listStockItems` | `src/services/repositories/supabaseDomainRepository.js` | 237 | Lista estoque virtual remoto por organizacao. |
| `saveStockItems` | `src/services/repositories/supabaseDomainRepository.js` | 249 | Salva estoque virtual remoto e retorna `remoteId`. |
| `listPhysicalStockItems` | `src/services/repositories/supabaseDomainRepository.js` | 268 | Lista estoque fisico remoto por organizacao. |
| `savePhysicalStockItems` | `src/services/repositories/supabaseDomainRepository.js` | 280 | Salva estoque fisico remoto e retorna `remoteId`. |
| `listRecipes` | `src/services/repositories/supabaseDomainRepository.js` | 452 | Lista receitas remotas com ingredientes e hidrata capas por URLs assinadas. |
| `readRecipeImagePath` | `src/services/repositories/supabaseDomainRepository.js` | 465 | Consulta no banco o caminho autoritativo e ignora referencias que nao correspondem a organizacao/receita. |
| `persistRecipeImage` | `src/services/repositories/supabaseDomainRepository.js` | 484 | Preserva/substitui/remove somente a capa canonica; limpa a referencia antes da exclusao best-effort do arquivo. |
| `readRecipeSaveSnapshot` | `src/services/repositories/supabaseDomainRepository.js` | 547 | Captura receita e ingredientes remotos antes da escrita para permitir compensacao em falhas parciais. |
| `rollbackRecipeSave` | `src/services/repositories/supabaseDomainRepository.js` | 560 | Restaura uma edicao remota anterior ou inativa uma receita nova quando ingredientes/capa falham depois do upsert. |
| `saveRecipes` | `src/services/repositories/supabaseDomainRepository.js` | 641 | Salva receitas/ingredientes, sincroniza capas privadas, compensa falhas parciais e limpa capas canonicas de receitas removidas. |
| `normalizeCategoryName` | `src/services/repositories/supabaseDomainRepository.js` | 357 | Normaliza nomes de categorias antes de salvar/carregar do Supabase. |
| `listCategories` | `src/services/repositories/supabaseDomainRepository.js` | 361 | Lista categorias remotas por organizacao, com fallback local quando a tabela ainda nao existe. |
| `saveCategories` | `src/services/repositories/supabaseDomainRepository.js` | 382 | Salva catalogo de categorias no Supabase e remove logicamente categorias ausentes do snapshot. |
| `isMissingProductCategoriesTableError` | `src/services/repositories/supabaseDomainRepository.js` | 53 | Detecta ambiente Supabase ainda sem a tabela `product_categories` para nao quebrar a UI. |
| `resolveDomain` | `src/services/repositories/supabaseDomainRepository.js` | 342 | Mapeia chave local para funcoes remotas de dominio. |
| `canSyncKey` | `src/services/repositories/supabaseDomainRepository.js` | 348 | Informa se uma chave local tem dominio remoto seguro antes de tentar sync Supabase. |
| `loadByKey` | `src/services/repositories/supabaseDomainRepository.js` | 349 | Carrega dominio remoto a partir da chave local. |
| `saveByKey` | `src/services/repositories/supabaseDomainRepository.js` | 355 | Salva dominio remoto a partir da chave local. |
| `exposeLocalStorageRepository` | `src/services/repositories/localStorageRepository.js` | 1 | (function exposeLocalStorageRepository() { |
| `load` | `src/services/repositories/localStorageRepository.js` | 3 | Carrega cache local com `try/catch`, limpa JSON corrompido e retorna lista vazia como fallback seguro. |
| `save` | `src/services/repositories/localStorageRepository.js` | 6 | Salva cache local sempre como JSON valido, usando lista vazia quando o valor vier nulo. |
| `remove` | `src/services/repositories/localStorageRepository.js` | 9 | Remove uma chave local para limpar cache de sessao Supabase. |
| `exposeSupabaseClientService` | `src/services/supabaseClient.js` | 1 | (function exposeSupabaseClientService() { |
| `getSupabaseGlobal` | `src/services/supabaseClient.js` | 5 | function getSupabaseGlobal() { |
| `loadSupabaseLibrary` | `src/services/supabaseClient.js` | 9 | function loadSupabaseLibrary() { |
| `createClient` | `src/services/supabaseClient.js` | 33 | Cria e reutiliza uma unica instancia Supabase no navegador para evitar multiplos GoTrueClient. |
| `exposeFormatters` | `src/utils/formatters.js` | 1 | (function exposeFormatters() { |
| `brl` | `src/utils/formatters.js` | 3 | brl(value) { |
| `quantity` | `src/utils/formatters.js` | 9 | quantity(quantity, unit) { |
| `public.set_updated_at` | `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql` | 272 | create or replace function public.set_updated_at() |
| `public.current_user_role` | `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql` | 282 | create or replace function public.current_user_role(target_organization_id uuid) |
| `public.is_organization_member` | `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql` | 296 | create or replace function public.is_organization_member(target_organization_id uuid) |
| `public.can_manage_organization` | `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql` | 311 | create or replace function public.can_manage_organization(target_organization_id uuid) |
| `public.can_write_organization` | `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql` | 321 | create or replace function public.can_write_organization(target_organization_id uuid) |
| `public.handle_new_user` | `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql` | 331 | Cria profile e organizacao padrao quando um usuario nasce no Supabase Auth. |
| `public.bootstrap_organization_owner` | `supabase/migrations/20260520190000_initial_multi_tenant_schema.sql` | 368 | Adiciona o usuario como owner da organizacao criada e define workspace padrao. |
| `private.set_updated_at` | `supabase/migrations/20260523090000_harden_internal_functions.sql` | 10 | Trigger interno com `search_path` fixo para atualizar `updated_at`. |
| `private.current_user_role` | `supabase/migrations/20260523090000_harden_internal_functions.sql` | 21 | Helper interno de RLS para papel do usuario no workspace. |
| `private.is_organization_member` | `supabase/migrations/20260523090000_harden_internal_functions.sql` | 35 | Helper interno de RLS para validar membro do workspace. |
| `private.can_manage_organization` | `supabase/migrations/20260523090000_harden_internal_functions.sql` | 50 | Helper interno de RLS para permissao administrativa. |
| `private.can_write_organization` | `supabase/migrations/20260523090000_harden_internal_functions.sql` | 60 | Helper interno de RLS para escrita operacional. |
| `private.handle_new_user` | `supabase/migrations/20260523090000_harden_internal_functions.sql` | 70 | Trigger interno para criar profile e organizacao inicial. |
| `private.bootstrap_organization_owner` | `supabase/migrations/20260523090000_harden_internal_functions.sql` | 108 | Trigger interno para vincular owner ao workspace inicial. |
| `private.recipe_image_organization_id` | `supabase/migrations/20261017163649_recipe_images_storage.sql` | 50 | Extrai com seguranca o workspace do caminho da capa para as politicas privadas do Storage. |
