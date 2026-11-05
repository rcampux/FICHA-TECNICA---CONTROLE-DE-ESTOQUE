# Jornada de criação e precificação — 05/11/2026

## Diretriz de produto
A Ficha mantém a entrada Caderno de receitas. Ao abrir o editor, a pessoa escolhe a origem, informa nome e foto e separa ingredientes em um popup. “Preparar receita” confirma a seleção após uma animação de panela e colher de dois segundos; salvar no banco continua sendo a ação final “Salvar receita”.

As origens Sem estoque, Virtual e Físico podem ser usadas na mesma receita. A origem no topo é a seleção inicial do popup, que também permite trocá-la. Escolher um produto de estoque é obrigatório nos modos Virtual/Físico; nomes avulsos são exclusivos de Sem estoque.

A biblioteca original de 78 WebPs é usada **somente na área de seleção da Ficha**, após adicionar o ingrediente. Não aparece na busca, no popup nem na lista confirmada. Os tiles mostram somente as imagens; nome e quantidade ficam na descrição acessível e no título ao passar o mouse, sem legendas visíveis, tanto no desktop quanto no mobile. Correspondências específicas têm precedência (leite condensado, não leite). Ausências recorrem ao tipo/categoria, com alternativa Sem categoria/Outros. Arquivos não foram redesenhados.

No celular, Sem estoque ocupa a primeira linha; Virtual/Físico dividem a segunda. A grade tem três colunas. Desktop mantém o painel de identidade/seleção à esquerda e composição à direita. Preparar receita rola até a lista no mobile e destaca a lista no desktop. Respeitar redução de movimento.

O bloco **Rendimento da receita** fica completamente oculto até haver ingredientes confirmados por Preparar receita. Receitas já salvas abrem para edição com o rendimento existente. Novos itens pendentes não podem ser ignorados ao salvar. Remover todos os ingredientes confirmados volta a ocultar o rendimento.

O modo de preparo, os cálculos, o markup e o salvamento final seguem a lógica existente. O registro temporário de insumos inclui a seleção pendente de Virtual/Físico, identificada como pendente, sem baixar estoque durante seleção/restauração. Ingredientes manuais não são gravados nesse registro. Escopo por conta e organização; confirmação obsoleta é rejeitada.

## Direção visual e revisão
Reutilizar os tokens existentes: vermelho #b4232f (CARD), vinho #672c31 (Menu), branco #ffffff, papel #faf7f0, verde #114f39 e creme #fff0d4. Roboto nos controles e CARD; Georgia nas manchetes do estilo Menu. Textos à esquerda, imagens centralizadas sobre branco.

A composição prioriza a identidade vermelha e os ícones originais. Fontes, capas e navegação existentes não são substituídas. A animação responde ao clique, sem efeitos contínuos na página. Bordas, contraste e densidade respeitam CARD/Menu. CSS da nova jornada é isolado em recipe-journey.css; nenhum ancestral da navegação recebe transform/filter/contain.

## Confirmação e persistência
- Selecionar não grava a receita nem baixa estoque.
- Preparar valida o lote físico inteiro antes da baixa. Quilogramas são convertidos corretamente; cliques repetidos não duplicam baixas.
- O catálogo virtual conserva quantidade de compra e preço de referência. Baixar uma quantidade física não altera artificialmente o preço por grama.
- Categoria escolhida acompanha o ingrediente e usa o JSONB existente nutrition_snapshot no mapeamento remoto, sem migration ou alteração de RLS.
- Os 78 ícones permanecem no banco com suas políticas existentes. A cópia visual autorizada do manifesto/WebPs é entregue como asset do app; nenhum registro de receita, credencial ou dado pessoal acompanha esses assets.

## Receita sem preço → estoque → markup → resumo
1. Adicionar ao estoque abre somente a escolha Virtual/Físico.
2. Revisar todos os insumos (categoria, quantidade, unidade, preço, nutrição).
3. Salvar no estoque persiste os insumos e atualiza o vínculo/custo da receita.
4. Somente após sucesso aparece o popup verde “Adicionar markup”, com Salvar. Texto: “Percentual acrescentado ao custo da receita para definir o preço de venda.”
5. Salvar aplica o markup só à receita escolhida, sem regravar os insumos. Falha conserva o campo e permite nova tentativa.
6. Mostrar “Custos e preço de venda atualizados.” e resumo: custo total, venda do lote, venda por unidade/porção, custo/kg, venda com markup, adicional de perda, lucro bruto do lote e por unidade/porção.
7. X no canto superior direito fecha e retorna a Receitas. CARD/Menu acompanha toda a sequência.

A busca nutricional continua abrindo a tabela no primeiro clique, antes da resposta, preservando indicador de carregamento e arredondamento dos valores encontrados.

## Verificação
- 57 testes Node: biblioteca integral e hashes; correspondências; fila/confirmar; rendimento; prevenção de duplicação; saldo físico insuficiente; falha de gravação; sessão diferente; registro temporário; categoria no formato remoto; cálculos/edição/arraste existentes.
- Navegador isolado: desktop 1500 px e mobile 390 px, CARD/Menu; seleção, animação de 2 s, salvar/abrir Receitas; categorias; popup sem foco em input; teclado via VisualViewport simulado; três colunas; rolagem para lista e menu ancorado.
- Fluxo financeiro local: estoque virtual/físico, markup após estoque, falha e reenvio de markup sem segunda gravação de estoque, valores com 15% de perda, resumo e X.
- Supabase: conferidos 78 registros flat-warm-v1 na organização informada e nutrition_snapshot JSONB. Testes de persistência do formato remoto por harness; nenhuma receita real foi criada ou modificada para QA.
- O teste de teclado usa emulação; não representa execução em um aparelho físico.

Prototipar localmente com npm run build e npm run dev. Produção: https://nk-control.vercel.app/.
Próximo passo recomendado: conferir a jornada no iPhone/Android usado na operação com uma receita real.
