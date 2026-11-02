# Cores das categorias

- Dez presets, circulo cromatico de matiz/saturacao, controle de luminosidade e HEX (#RGB ou #RRGGBB).
- Preview ao vivo, operacao por mouse/toque/teclado e validacao antes de salvar.
- Categorias padrao possuem cores distintas; nomes antigos recebem cor deterministica sem precisar recriar produtos. Nomes com/sem acento compartilham a cor padrao.
- A cor aparece nas etiquetas de produtos e filtros dos estoques virtual/fisico. O botao de paleta do filtro abre a edicao da cor.
- Chips usam texto branco e cor solida. Tons claros sao escurecidos somente na exibicao para garantir contraste minimo 5:1; o HEX escolhido/salvo permanece intacto. Checkboxes possuem tamanho nativo de 18px, sem herdar padding/altura de campos de texto.
- Painel compacto com duas colunas no desktop e uma no mobile. X e limpar filtros permanecem acessiveis durante a rolagem das categorias.
- X, clique/toque fora e Escape fecham o painel sem apagar a selecao. Escape respeita um modal de edicao aberto. Trocar de pagina fecha filtros antigos.
- Catalogo local aceita strings antigas e novos objetos `{name, color}`. Produtos continuam vinculados pelo nome; quantidades e precos nao mudam.
- `product_categories.color` guarda HEX validado no Supabase, por organizacao, sob as politicas RLS existentes. A migracao preenche categorias ja cadastradas. Clientes antigos que enviam strings nao apagam cores salvas.
- O modal aguarda a gravacao remota antes de confirmar. Em falha, permanece aberto para nova tentativa.

## Verificacao

`node --test tests/category-colors.test.mjs tests/category-panels.test.mjs tests/stock-discovery.test.mjs`

`npm run dev` disponibiliza a previa local; o link de producao e https://nk-control.vercel.app/.

Proximo passo recomendado: escolher uma categoria no filtro, editar sua cor e conferir a mesma etiqueta nos dois estoques.
