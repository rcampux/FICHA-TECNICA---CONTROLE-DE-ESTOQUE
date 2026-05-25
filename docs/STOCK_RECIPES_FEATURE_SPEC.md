# FichaTec - Especificacao Estoque e Receitas

Este documento registra as features prioritarias para evoluir os modulos de Estoque Fisico, Estoque Virtual, Ficha e Receitas. A implementacao deve respeitar o schema multi-tenant, RLS, mobile first e a diretriz de nao duplicar logica.

## Principios Da Entrega

- Manter consistencia visual entre Estoque Fisico e Estoque Virtual.
- Separar mudancas visuais de mudancas de schema/Supabase.
- Toda persistencia deve ser por workspace/organizacao.
- Componentes interativos devem funcionar bem em mobile, tablet e desktop.
- Listas grandes devem prever paginacao, filtros eficientes ou virtualizacao.
- Acoes de criar, editar e excluir devem manter confirmacao visual em operacoes destrutivas.
- Nao alterar logica de CRUD/Supabase durante ajustes puramente visuais.

## 1. Estoques - Funcionalidades Comuns

### 1.1 Gestao De Categorias

- Adicionar botao `Criar Categoria` em Estoque Fisico e Estoque Virtual.
- Categorias devem ser definidas livremente pelo usuario.
- Exemplos: proteinas, carboidratos, gorduras, leguminosas, hortifruti, laticinios, bebidas.
- Categorias devem ser persistidas e reutilizaveis em ambos os estoques.
- O cadastro de categoria deve ser independente do cadastro de produto.
- O cadastro de produto deve aceitar categoria vazia; a vinculacao pode ser feita depois na edicao do produto.
- Quando o usuario escolher uma categoria inexistente em um produto, o app deve normalizar e reaproveitar essa categoria no catalogo.
- A modelagem deve suportar categoria e subcategoria para filtro taxonomico.

### 1.2 Modos De Visualizacao

- Adicionar toggle entre `Lista` e `Grid` nas duas secoes.
- Persistir a preferencia do usuario.
- Preferencia pode comecar em `localStorage`; no futuro deve migrar para perfil/workspace.

### 1.3 Filtros E Busca

- Implementar filtro taxonomico por categoria/subcategoria.
- Manter barra de busca por nome do produto.
- Filtros devem funcionar em conjunto com a busca.

## 2. Estoque Virtual - Tabela Nutricional

Ao cadastrar produto no Estoque Virtual, o app deve preencher automaticamente uma tabela nutricional base por 100g:

- Carboidratos.
- Proteinas.
- Gorduras totais.
- Gordura saturada.
- Gordura trans.
- Fibras.
- Sodio.

Regras:

- Todos os campos devem ser editaveis pelo dono do workspace.
- Adicionar campo `Porcao`.
- O usuario define a porcao desejada, por exemplo 30g ou 50g.
- Valores nutricionais exibidos devem recalcular proporcionalmente com base na porcao.
- Os valores base por 100g devem continuar armazenados para calculo correto.
- Implementado: o Estoque Virtual salva a base nutricional por 100g, inclui gordura saturada/trans e porcao customizavel, e exibe preview proporcional sem criar migration adicional. Os campos extras ficam preservados em `nutrition_facts.raw_payload`.
- Implementado: a aba Ficha consome a nutricao do ingrediente virtual, soma os nutrientes pela quantidade usada e exibe tabela estimada por porcao da receita. Quando um produto nao tem nutricao manual, o app usa fallback nutricional por nome.

## 3. Aba Ficha - UX De Montagem De Receita

Redesenhar o fluxo de adicionar ingredientes com hierarquia visual em tres linhas.

### Linha 1 - Origem Do Ingrediente

- Botao `Virtual`.
- Botao `Fisico`.

### Linha 2 - Selecao Do Ingrediente

- Dropdown `Ingrediente`.
- Ao abrir, mostrar lista completa da origem escolhida.
- Incluir busca integrada dentro do dropdown.

### Linha 3 - Parametros Do Ingrediente

Apos escolher o ingrediente, exibir:

- Input `Quantidade usada`.
- Dropdown `Unidade de medida`: gramas, quilogramas, mililitros, unidades.
- Input `Rendimento do ingrediente`.
- Botao `Adicionar Ingrediente`.

### Comportamento Apos Adicionar

- Ingrediente entra na receita como card ou linha listada.
- Exibir botao `+` para adicionar novo ingrediente.
- O botao `+` repete o fluxo completo de origem, ingrediente e parametros.

### Ao Salvar Receita

- Redirecionar para a aba Receitas.
- Dar foco/scroll na ultima receita adicionada.
- Limpar a aba Ficha para uma nova montagem.

## 4. Dashboard De Controle De Estoque

Disponivel em Estoque Fisico e Estoque Virtual.

### 4.1 Grafico Por Categoria

- Grafico de pizza ou barras com distribuicao de produtos por categoria.
- Usuario pode selecionar quais categorias entram no grafico.
- Atualizacao deve acontecer em tempo real conforme filtros.

### 4.2 Grafico Geral De Produtos

- Grafico de barras para consumo/uso de produtos ao longo do tempo.
- Usuario pode escolher quais produtos comparar.
- Filtros de periodo:
  - Semanal.
  - Mensal.
  - Anual.
  - Personalizado com data inicial e final.
- Objetivo: identificar sazonalidade e receitas vinculadas a cada produto.

## 5. Estoque Fisico - Validade E Lote

### 5.1 Campos Adicionais

Adicionar no cadastro do produto fisico:

- Lote de fabricacao.
- Data de fabricacao.
- Data de vencimento.

### 5.2 FEFO

- Ordenar e destacar produtos proximos do vencimento.
- Seguir logica FEFO: First Expire, First Out.

### 5.3 Grafico De Produtos A Vencer

- Grafico dedicado para produtos proximos do vencimento agrupados por categoria.
- Alertas visuais:
  - Verde: longe do vencimento.
  - Amarelo: atencao.
  - Vermelho: vence em breve ou vencido.

## Resumo De Entregas

| # | Feature | Local |
|---|---------|-------|
| 1 | Criar categorias | Estoque Fisico + Virtual |
| 2 | Toggle Lista/Grid | Estoque Fisico + Virtual |
| 3 | Tabela nutricional automatica + porcao customizavel | Estoque Virtual |
| 4 | Novo UX de adicionar ingredientes | Aba Ficha |
| 5 | Redirect + refresh ao salvar receita | Ficha para Receitas |
| 6 | Filtro taxonomico + busca por produto | Estoque Fisico + Virtual |
| 7 | Dashboard com graficos por categoria e produto | Estoque Fisico + Virtual |
| 8 | Lote, data de fabricacao e vencimento | Estoque Fisico |
| 9 | Grafico de produtos a vencer | Estoque Fisico |

## Fatiamento Tecnico Recomendado

### Fase A - UX Sem Alterar Schema

- Melhorar hierarquia da aba Ficha.
- Melhorar espacamentos, controles e responsividade dos estoques.
- Adicionar toggle Lista/Grid com preferencia local.
- Implementado: catalogo local compartilhado de categorias para cadastro independente e vinculacao posterior via edicao do produto.
- Preservar CRUD e repositories existentes.

### Fase B - Schema E Persistencia

- Criar tabela de categorias multi-tenant.
- Migrar o catalogo local de categorias para Supabase com RLS por organizacao.
- Adicionar suporte a subcategorias.
- Adicionar campos de lote/fabricacao/vencimento no estoque fisico.
- Revisar repositories Supabase e conversores.
- Atualizar RLS e testes por usuario.

### Fase C - Nutricao E Receita

- Concluido no codigo: consolidar tabela nutricional por 100g no estoque virtual.
- Concluido no codigo: adicionar porcao customizavel e recalculo proporcional no modal de produto virtual.
- Concluido no codigo: refinar calculo da ficha tecnica usando valores nutricionais, rendimento e porcao.
- Proximo: validar com receitas reais e ajustar UX de exibicao nutricional nos PDFs/relatorios.

### Fase D - Analytics

- Criar origem de dados de movimentos/uso por periodo.
- Implementar graficos por categoria, produto e vencimento.
- Adicionar filtros de periodo e selecao de produtos/categorias.
