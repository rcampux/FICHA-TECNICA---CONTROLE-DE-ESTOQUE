# Medidas de insumos — 5 de novembro de 2026

Os cadastros e seletores de insumos oferecem gramas (g), miligramas (mg) e mililitros (ml). A contagem por unidade não é mais uma opção para novos ingredientes ou produtos. O rendimento da receita pronta continua sendo dividido em porções ou peças, conforme o campo já existente.

Quantidades em mg são convertidas para g antes de calcular e salvar. A base persistida é g para massa e ml para volume. Cadastros antigos em kg são normalizados para g; litros para ml. O preço pago permanece igual. Volume e massa nunca são equiparados sem uma equivalência informada.

## Produtos antigos por unidade

Quando há peso/volume explícito na embalagem, em uma referência de compra ou em uma equivalência já informada, o app reaproveita esse dado. Exemplos: embalagem de 395 g; banana com 80 g previamente registrados. A normalização é idempotente, sem conversões repetidas.

Se o produto não possui essa informação, não se presume que uma embalagem pese 1 g ou 1 kg. O popup Adicionar ingrediente exibe o campo de peso/volume por embalagem ou peça e calcula o custo em tempo real. Ao adicionar, persiste essa referência e converte o produto e seu estoque físico correspondente, mantendo valor pago, meta, total usado e histórico. Falhas mantêm o formulário e permitem tentar novamente. Nenhum estoque é baixado nessa etapa; a baixa continua em Preparar receita.

Na leitura, produtos legados com informação suficiente são apresentados em medidas métricas e passam a ser gravados nesse formato ao salvar. Dados sem peso conhecido permanecem recuperáveis internamente até a pessoa informar o conteúdo. Não houve alteração em massa dos dados dos usuários, nem modificação de schema, Auth ou RLS.

O cadastro manual e a seleção de produto pela busca usam o mesmo padrão. Ofertas sem peso ou volume identificável deixam a quantidade para preenchimento, preservando o preço encontrado. Movimentar estoque físico não altera a embalagem de referência no catálogo virtual, evitando distorção no custo por grama.

## Ícones na seleção

Desktop e mobile mostram somente a imagem do ingrediente, sem nome, quantidade ou “Na ficha” abaixo. Nome e quantidade permanecem disponíveis para leitores de tela e como descrição ao passar o mouse. O botão de retirar um ingrediente pendente continua acessível. A lista confirmada mantém nome e quantidades para conferência. O mobile conserva três imagens por linha.

## Verificação

- Testes de conversão de massa/volume, embalagens antigas, normalização repetida, preço por grama, falha/reenvio, quantidade física e persistência do ingrediente.
- Jornada local no navegador em 390 px e 1500 px, CARD/Menu: arroz por embalagem → gramas, banana com peso conhecido, mg → g, ícones sem legendas, Preparar receita e reutilização da referência salva.
- Cadastro de estoque virtual/físico em mg e movimentação sem modificar o preço da embalagem virtual.
- Teclado via VisualViewport simulado: campo de equivalência visível e navegação restaurada ao fechar. Não equivale a teste em aparelho físico.
- Schema remoto conferido: quantidades numeric(14,4), unidades text e equivalência no JSON nutricional existente.

Próximo passo: no produto antigo que ainda não tem peso, informar o conteúdo real da embalagem na primeira adição à receita.
