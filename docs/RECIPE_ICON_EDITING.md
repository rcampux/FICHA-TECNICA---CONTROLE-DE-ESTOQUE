# Revisão da jornada — 05/11/2026

No planejamento calculado, **Ver modo de preparo** fica entre a folha de ingredientes e Resultado do lote. Expande/recolhe o preparo registrado em outra folha com as mesmas pautas, fonte Kalam e borda rasgada. Começa fechado a cada abertura da receita, preserva quebras de linha e mostra orientação para Editar quando o preparo está vazio. CARD/Menu e mobile/desktop compartilham essa posição; os cálculos e a receita original não são alterados.

Revisão de recálculo: todos os ícones têm X para remover, separado do botão de editar a quantidade. Após inclusão, exclusão ou alteração de ingredientes/quantidades numa receita preparada, aparece **Recalcular receita** abaixo das legendas dos ícones e antes do texto informativo, em desktop e mobile. Ao recalcular, o botão desaparece até outra mudança. Markup, modo de preparo e confirmar uma quantidade sem alteração não acionam esse estado. A primeira confirmação de uma receita nova continua sendo **Preparar receita**. Os botões são nativos, com ações independentes por teclado e toque.

Esta orientação substitui a solicitação anterior de tiles sem legenda: os ícones de ingredientes na Ficha mostram novamente nome e quantidade, em desktop e mobile. Ingredientes confirmados são acionáveis por clique, toque, Enter e espaço; abrem o editor existente de quantidade e medida.

Ao confirmar a edição, a prévia recalcula e aparece Refazer receita. Essa ação usa a animação de dois segundos, recalcula a ficha e destaca a lista, sem duplicar os ingredientes ou baixar outra vez os itens já confirmados. Novos ingredientes pendentes continuam sendo confirmados pelo mesmo fluxo. Limpar a ficha, trocar de conta e abrir outra receita reiniciam o estado de refazer.

Na biblioteca, os cards CARD/Menu mantêm Ver ingredientes e Modo de preparo. A linha seguinte contém Planejar produção com largura total. PDF fica somente nos detalhes. Em revisão posterior, editar e excluir retornam aos cards. O corpo do card não abre mais o popup, inclusive por teclado: apenas Planejar produção abre os detalhes e leva ao planejador quando a receita tem custos definidos.

Ao calcular, o popup revela primeiro os ingredientes dimensionados, com nomes e quantidades em destaque, e depois Resultado do lote. O foco e a rolagem levam ao título dos ingredientes. A nutrição da receita-base fica em um painel recolhido, aberto somente por ação no título; calcular não expande esse painel nem modifica a nutrição-base.

Placeholders passam a cinza claro, diferenciando dicas de valores digitados. Nenhum posicionamento da navegação mobile é alterado.

Ao expandir Ver ingredientes ou Modo de preparo no card, os painéis ficam entre a linha desses dois botões e Planejar produção, empurrando essa última ação para baixo. Vale para CARD/Menu, Lista/Blocos e mobile.

Próximo passo: conferir as quantidades pelo ícone, refazer e salvar a receita para persistir a edição.

## Refinamento e nova receita limpa
Os ícones ficam em uma superfície quadrada; nome e quantidade são legendas externas abaixo dela. A lista dimensionada no planejamento usa divisórias sutis, tipografia contida e quantidades alinhadas à direita, sem caixas grandes ou etiquetas chamativas.

Revisão visual seguinte: os ingredientes calculados ficam em um box de papel claro, pautas discretas e margem de caderno. As quantidades mantêm destaque contido. Calcular e Ver ingredientes rolam somente o conteúdo interno do popup até o topo desse box, aguardando o fechamento do teclado quando necessário; a navegação e a página de fundo não são roladas.

O papel usa fonte manuscrita Kalam (arquivos locais e licença OFL em assets/fonts/kalam). Título, nomes, quantidades, preços e espaçamentos compartilham ritmo de 32 px alinhado às pautas, inclusive quando nomes quebram linha. A borda esquerda simula papel rasgado. Abaixo de 360 px, o nome ocupa a largura inteira e quantidade/preço vêm na linha seguinte para conservar legibilidade.

Ao editar uma receita existente, a confirmação de novos ingredientes usa Refazer receita. Entrar pela Ficha, Criar receita ou Nova ficha limpa nome, foto, ingredientes pendentes/confirmados, rendimento, markup e preparo. Essa instrução substitui a restauração automática de insumos ao entrar pela navegação: o registro temporário não deve repovoar uma nova receita. Apenas a entrada explícita Editar preserva e carrega a receita escolhida. As receitas salvas permanecem intactas.
