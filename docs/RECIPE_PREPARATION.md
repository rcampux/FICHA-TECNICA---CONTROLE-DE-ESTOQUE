# Ordem dos ingredientes e modo de preparo

A quantidade na linha de cada ingrediente pode ser editada na ficha. O custo e os totais acompanham a edição. Salvar receita confirma as quantidades.

Na biblioteca, os ingredientes ficam recolhidos por padrão. O botão **Ver ingredientes** expande a lista completa do próprio card, respeitando a ordem salva; **Ocultar ingredientes** a recolhe. Expandir não abre o modal da receita. O PDF continua disponível ao lado.

A lista expandida também mostra a quantidade de cada ingrediente da receita-base, em g, ml ou un, usando a mesma quantidade bruta do guia de produção (inclui perdas quando cadastradas). Não usa o peso da embalagem contido no nome do produto, nem uma simulação temporária de produção.

- A ficha permite arrastar os ingredientes pela alça, usando mouse ou toque. Com foco na alça, as setas para cima e para baixo também alteram a ordem. Escape cancela um arraste em andamento.
- Durante o gesto, uma prévia elevada com sombra acompanha o ponteiro/dedo; o espaço reservado indica a posição e os vizinhos deslizam. Ao soltar, o cartão encaixa suavemente. Cancelar o toque, perder a captura ou sair da janela limpa a prévia sem confirmar a mudança. A preferência por movimento reduzido elimina as animações decorativas, mantendo o arraste funcional.
- A reordenação não altera quantidades, custos, nutrição ou estoque. A nova ordem é persistida ao salvar a receita e aparece na consulta, edição, guia de produção e PDF.
- O campo de modo de preparo fica imediatamente abaixo dos ingredientes, no mesmo bloco de composição tanto no desktop quanto no mobile. O texto preserva parágrafos e não é interpretado como HTML.
- A receita salva apresenta o botão **Modo de preparo**, que expande/recolhe as instruções. Receitas antigas sem instruções orientam a usar Editar. O PDF também inclui o texto.
- Salvar com sucesso limpa os filtros da biblioteca, abre Receitas e destaca a ficha salva. Uma falha mantém o formulário e seu conteúdo para nova tentativa.
- Preparação utiliza a coluna existente `recipes.preparation_method`. A migração `20261103014142_recipe_ingredient_order.sql` adiciona `recipe_ingredients.sort_order`; dados antigos ganham ordem inicial estável por criação e ID. As políticas RLS existentes permanecem.
- Ingredientes novos recebem UUID antes da gravação; os identificadores retornam ao estado local, evitando duplicação na próxima edição. O mecanismo de compensação existente restaura a ordem em falhas parciais.

Validação automatizada: reordenação sem mutação, posições no retorno remoto desordenado, salvamentos consecutivos sem duplicação, preservação do texto/metadados, falha de gravação sem redirecionar e escape do conteúdo.

Validação no navegador: arraste real por mouse, teclado, salvamento com navegação para Receitas, expansão do preparo e reabertura após recarga. No mobile (390 px), o conteúdo não ultrapassa a largura da tela e o preparo fica 20 px abaixo da lista. Verificação transacional no banco confirmou a gravação autenticada de posição/texto, com rollback dos dados de teste. RLS preservada e nenhuma posição inválida.

Auditoria Supabase: nenhum apontamento de RLS para a alteração. Aviso preexistente de Auth, fora desta entrega: [proteção contra senhas vazadas desabilitada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Nos cards, Ver ingredientes precede Modo de preparo. Ambos expandem seu conteúdo no próprio card, independentemente; o PDF permanece disponível. Nos detalhes, o atalho Ver ingredientes aparece antes de Modo de preparo e leva às quantidades abaixo do planejamento, preservando o ajuste de produção.

Na biblioteca, o botão Filtro abre o painel de ingredientes. Uma seleção fecha o painel e pode ser combinada com a busca por nome. O card exibe a venda do lote e a média por unidade ou porção.

No planejamento, a quantidade e o peso por peça determinam o peso final desejado. A razão entre esse peso e o peso pronto cadastrado dimensiona cada ingrediente e a perda. O markup pode ser simulado por lote. Calcular exibe os pesos, a perda percentual, os preços e a lista de ingredientes. Com o resultado aberto, os valores acompanham a edição. Fichas sem pesagem admitem planejamento por quantidade. Receitas com itens em ml ou unidades precisam de mais informação para expressar o peso bruto em gramas.

Na ficha, o peso pronto é opcional antes da pesagem. Depois de cozinhar, informe o peso sem o recipiente. Digitar a quantidade divide esse peso igualmente pelas peças. Digitar o peso de uma peça calcula a quantidade equivalente e mostra as peças inteiras e a sobra, quando houver. Uma nova pesagem mantém o último critério escolhido. Fichas antigas abrem divididas pela quantidade cadastrada.

O peso antes do preparo e o peso pronto determinam a perda percentual. O custo soma os ingredientes arredondados em centavos. Aplica-se primeiro o markup, depois o percentual de perda sobre a venda com markup. O adicional entra uma vez na venda e no lucro bruto. Ganho de peso, pesos iguais ou pesagem incompleta não geram adicional. A venda por peça e o lucro bruto por peça dividem os valores do lote pela quantidade equivalente.

No Brigadeiro com 445 g de ingredientes e 378,25 g de rendimento estimado, a perda de 15% acrescenta R$ 2,59 à venda de R$ 17,24 com markup de 100%. A venda final é R$ 19,83 e o lucro bruto sobre o custo de R$ 8,62 é R$ 11,21. A mesma regra vale para a ficha, os cards, o planejamento, a receita digitalizada e o PDF.

Para conferir um lote, abra a ficha em Receitas, informe a quantidade e o peso de cada peça e toque em Calcular.

O X no alto dos detalhes fecha a receita mesmo após rolar o conteúdo. O rodapé reúne Excluir, Editar e PDF. No card ou nos detalhes, PDF abre o caderno da receita. O botão **Salvar ou imprimir PDF** abre a impressão do navegador. A primeira parte reúne foto, rendimento, ingredientes na ordem salva e preparo. A ficha técnica reúne venda, lucro, perda e informação nutricional. O caderno usa os valores da receita-base e os preços vigentes de seus ingredientes.

No celular, a prévia do PDF abre no próprio app e tem um X para voltar à receita. O mesmo fluxo atende navegadores de desktop que bloqueiam novas abas.
