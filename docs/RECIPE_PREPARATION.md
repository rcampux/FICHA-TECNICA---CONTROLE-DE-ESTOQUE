# Ordem dos ingredientes e modo de preparo

Na biblioteca, os ingredientes ficam recolhidos por padrão. O botão **Ver ingredientes** expande a lista completa do próprio card, respeitando a ordem salva; **Ocultar ingredientes** a recolhe. Expandir não abre o modal da receita. O PDF continua disponível ao lado.

- A ficha permite arrastar os ingredientes pela alça, usando mouse ou toque. Com foco na alça, as setas para cima e para baixo também alteram a ordem. Escape cancela um arraste em andamento.
- A reordenação não altera quantidades, custos, nutrição ou estoque. A nova ordem é persistida ao salvar a receita e aparece na consulta, edição, guia de produção e PDF.
- O campo de modo de preparo fica imediatamente abaixo dos ingredientes, no mesmo bloco de composição tanto no desktop quanto no mobile. O texto preserva parágrafos e não é interpretado como HTML.
- A receita salva apresenta o botão **Modo de preparo**, que expande/recolhe as instruções. Receitas antigas sem instruções orientam a usar Editar. O PDF também inclui o texto.
- Salvar com sucesso limpa os filtros da biblioteca, abre Receitas e destaca a ficha salva. Uma falha mantém o formulário e seu conteúdo para nova tentativa.
- Preparação utiliza a coluna existente `recipes.preparation_method`. A migração `20261103014142_recipe_ingredient_order.sql` adiciona `recipe_ingredients.sort_order`; dados antigos ganham ordem inicial estável por criação e ID. As políticas RLS existentes permanecem.
- Ingredientes novos recebem UUID antes da gravação; os identificadores retornam ao estado local, evitando duplicação na próxima edição. O mecanismo de compensação existente restaura a ordem em falhas parciais.

Validação automatizada: reordenação sem mutação, posições no retorno remoto desordenado, salvamentos consecutivos sem duplicação, preservação do texto/metadados, falha de gravação sem redirecionar e escape do conteúdo.

Validação no navegador: arraste real por mouse, teclado, salvamento com navegação para Receitas, expansão do preparo e reabertura após recarga. No mobile (390 px), o conteúdo não ultrapassa a largura da tela e o preparo fica 20 px abaixo da lista. Verificação transacional no banco confirmou a gravação autenticada de posição/texto, com rollback dos dados de teste. RLS preservada e nenhuma posição inválida.

Auditoria Supabase: nenhum apontamento de RLS para a alteração. Aviso preexistente de Auth, fora desta entrega: [proteção contra senhas vazadas desabilitada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Próximo passo: abrir uma receita existente, ordenar os ingredientes, completar o preparo e salvar.
