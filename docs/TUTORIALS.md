# Tutoriais de uso

## Comportamento

- Novas contas: tour de seis etapas nas três primeiras sessões de acesso. Recarregar a mesma aba não consome um acesso. Novo login ou nova sessão de aba conta como acesso.
- Contas existentes antes de `2026-11-05T20:14:25.139Z`: uma única apresentação automática a partir desta atualização, independente de quantas visitas tinham na versão anterior. A data de corte é fixa, obtida do servidor Supabase, e comparada com `user.created_at`. Não deve mudar em futuros deploys. A consulta de implantação encontrou 12 contas anteriores ao corte; nenhuma lista de e-mails ou IDs é enviada ao cliente.
- O recibo `existingUserTourOffered` só é salvo quando o tour aparece de fato. Um popup que impeça sua abertura não consome a apresentação. O recibo é mesclado entre armazenamento local e metadados da conta, inclusive entre dispositivos. Dicas contextuais automáticas para contas antigas ficam disponíveis somente naquele acesso; nos seguintes, a central continua disponível por iniciativa do usuário.
- O X e Escape encerram as dicas automáticas no acesso atual. Para contas antigas, o tour já apresentado não volta nos próximos acessos. Não exibir novamente desativa tanto o tour automático quanto as dicas contextuais permanentemente para aquela conta. Uma desativação anterior é preservada, inclusive para contas antigas.
- Cada função tem uma orientação contextual na primeira utilização. Entendi, continuar registra a orientação consultada e executa a ação original uma única vez. Cancelar a orientação não executa a ação nem a marca como consultada.
- O histórico é por função, não por receita/produto. Fechar, cancelar e navegar dentro de uma explicação não produzem novas dicas. Campos de digitação não são interceptados.
- A central continua disponível mesmo após a desativação: Tutoriais na lateral do desktop e Tutoriais e funções no perfil no mobile. Permite buscar, rever qualquer função e repetir o tour.
- Estoque vazio mostra o requisito de cadastrar produtos e oferece Cadastrar primeiro produto. A origem selecionada é preservada e o formulário de produto abre sobre a ficha, sem trocar de página ou apagar o rascunho.

## Arquitetura

`tutorialCatalog.js` é o catálogo de textos e seletores de controles reais. `tutorialProgress.js` guarda visitas, opção de desativação e funções consultadas. `tutorialGuide.js` apresenta o tour, central e foco contextual em um dialog nativo na camada superior.

O progresso local usa chaves isoladas pelo ID do usuário. A pausa dura a sessão da aba. Para usuários autenticados, o estado também é sincronizado em `user_metadata.fichatec_tutorial` pelo cliente Supabase do próprio usuário. Metadados são exclusivamente preferências de UX: não definem permissões, papéis ou acesso a dados. Falhas de rede/armazenamento não bloqueiam o aplicativo; a cópia local é reenviada na próxima visita/ação. A contagem é uma convenção de onboarding, não uma auditoria transacional de sessões simultâneas.

`USER_UPDATED` atualiza a identidade em memória sem reidratar a cozinha ou limpar a ficha. Nenhuma política RLS, tabela de negócio ou configuração de autenticação foi modificada.

O recibo da apresentação para contas antigas também fica em `user_metadata.fichatec_tutorial_existing_20261105`. Essa chave separada impede que abas ainda executando a versão 1 apaguem o recibo ao sobrescrever o objeto aninhado de preferências. Não há atualização em massa de contas; cada conta recebe a regra pela sua data de criação e registra o recibo ao ver o tour.

## Design e acessibilidade

- Herda os tokens de CARD/Menu, incluindo cor, fundo, tipografia e cantos.
- Foco inicial no título, sem teclado automático; X, Escape e contenção de foco do dialog nativo.
- O popover se posiciona na área do visual viewport; apenas o conteúdo interno rola. Nenhum ancestral da navegação fixa recebe transform, filter ou contain.
- A navegação mobile permanece visível durante o tour, mas continua recolhida durante formulários com teclado ou outros popups. O tutorial não altera o comportamento desses formulários.
- A animação curta respeita prefers-reduced-motion.

## Validação

A regra para contas existentes tem testes de fronteira da data, visitas da versão anterior, apresentação única, X, opt-out anterior/posterior, bloqueio por outro popup, sincronização entre dispositivos e preservação do recibo em merges. Contas novas continuam cobertas pelo teste dos três acessos.

Testes de progresso cobrem limite de três acessos, reload, pausa, opção permanente, funções já consultadas, contas diferentes, sincronização com metadados e armazenamento indisponível. Verificação no navegador cobre tour, central pelo perfil, busca, continuação de ação, estoque vazio e preservação da ficha. Testes de viewport existentes cobrem redimensionamento, teclado e rolagem interna. A emulação responsiva não substitui uma conferência em aparelho iOS/Android real.

## Manutenção

Ao adicionar uma função, inclua uma entrada no catálogo ou associe o novo seletor à orientação correspondente. Use IDs estáveis e não inclua dados pessoais nos textos. Próxima verificação recomendada: uma conta recém-criada em aparelho real, percorrendo cadastro do primeiro produto e primeira receita.
