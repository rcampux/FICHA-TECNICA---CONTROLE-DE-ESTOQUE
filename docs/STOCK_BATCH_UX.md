# Cadastro de ingredientes da receita no estoque

- A categoria é uma seleção nativa, com as categorias cadastradas, categorias dos dois estoques e opções padrão. Ela não é um campo de texto nem deve abrir o teclado de digitação.
- O botão `+` permite criar uma categoria dentro do mesmo popup. Após persistir, ela fica selecionada para o ingrediente e disponível para os demais. Quantidades, preços e nutrição já informados permanecem no formulário. O cadastro usa a mesma persistência e a mesma proteção de cozinha do cadastro de categorias existente, com cor automática estável.
- Abrir a edição de um ingrediente ou o cadastro inline não foca campos de texto automaticamente. Campos numéricos solicitam teclado decimal quando tocados.
- Nutrientes preenchidos pela busca ou estimativa são arredondados para inteiros. Dados ausentes continuam vazios. Quantidades compradas, valores, pesos e porções continuam aceitando decimais; valores manuais do rótulo não são arredondados automaticamente.
- Com o teclado aberto, o popup acompanha a área visível. Cabeçalho e ação de salvar permanecem acessíveis; o conteúdo tem sua própria rolagem e mantém visível o campo em edição. Instruções auxiliares são recolhidas para dar espaço à edição. A navegação inferior fica recolhida durante o teclado e os popups e retorna à borda inferior ao fechar.
- CARD e Menu mantêm suas cores, superfícies e cantos em toda essa jornada.
- O primeiro clique em Tabela nutricional já abre os campos, mostra a busca em andamento e posiciona a tabela na área visível do popup. O botão fica indisponível durante a consulta para evitar buscas duplicadas. Em caso de falha, a tabela permanece aberta para preenchimento manual.
- Adicionar markup aparece ao entrar no cadastro e permanece na revisão dos ingredientes. O valor inicial vem da receita; zero é permitido. A explicação informa que é um percentual acrescentado ao custo para formar o preço de venda. Ao confirmar, o percentual é salvo apenas nessa receita e seus preços são recalculados junto do vínculo dos produtos. Cancelar não modifica o markup registrado.

## Verificação desta correção

Testes automatizados cobrem persistência de categorias, falha de gravação, troca de cozinha, arredondamento nutricional, ciclos de teclado iOS/Android, fallback sem VisualViewport e rolagem interna do campo. A jornada foi exercitada em navegador isolado com dados locais: seleção e criação de categoria, preenchimento nutricional com resposta controlada, persistência de produtos e atualização do custo da receita, estilos CARD/Menu, desktop e emulação mobile. A altura visível do teclado foi simulada; isso não substitui uma conferência em aparelho físico.

Próximo passo recomendado: conferir esta jornada no iPhone que apresentou o problema, incluindo abrir e fechar o teclado em quantidade, preço e nome de categoria.
