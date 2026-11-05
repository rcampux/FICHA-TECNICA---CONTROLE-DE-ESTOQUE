# Revisão da jornada — 05/11/2026

Esta orientação substitui a solicitação anterior de tiles sem legenda: os ícones de ingredientes na Ficha mostram novamente nome e quantidade, em desktop e mobile. Ingredientes confirmados são acionáveis por clique, toque, Enter e espaço; abrem o editor existente de quantidade e medida.

Ao confirmar a edição, a prévia recalcula e aparece Refazer receita. Essa ação usa a animação de dois segundos, recalcula a ficha e destaca a lista, sem duplicar os ingredientes ou baixar outra vez os itens já confirmados. Novos ingredientes pendentes continuam sendo confirmados pelo mesmo fluxo. Limpar a ficha, trocar de conta e abrir outra receita reiniciam o estado de refazer.

Na biblioteca, os cards CARD/Menu mantêm Ver ingredientes e Modo de preparo. A linha seguinte contém Planejar produção com largura total. PDF fica somente nos detalhes. Em revisão posterior, editar e excluir retornam aos cards. O corpo do card não abre mais o popup, inclusive por teclado: apenas Planejar produção abre os detalhes e leva ao planejador quando a receita tem custos definidos.

Ao calcular, o popup revela primeiro os ingredientes dimensionados, com nomes e quantidades em destaque, e depois Resultado do lote. O foco e a rolagem levam ao título dos ingredientes. A nutrição da receita-base fica em um painel recolhido, aberto somente por ação no título; calcular não expande esse painel nem modifica a nutrição-base.

Placeholders passam a cinza claro, diferenciando dicas de valores digitados. Nenhum posicionamento da navegação mobile é alterado.

Ao expandir Ver ingredientes ou Modo de preparo no card, os painéis ficam entre a linha desses dois botões e Planejar produção, empurrando essa última ação para baixo. Vale para CARD/Menu, Lista/Blocos e mobile.

Próximo passo: conferir as quantidades pelo ícone, refazer e salvar a receita para persistir a edição.
