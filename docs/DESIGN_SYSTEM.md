# FichaTec - Design System

## 1. Direcao Visual

O FichaTec usara Material Design 3 como fundacao de UX/UI:

- Tokens semanticos de cor, tipografia, espacamento e elevacao.
- Componentes consistentes e acessiveis.
- Estados claros: hover, focus, pressed, disabled, loading e error.
- Layout mobile first com adaptacao real para tablet e desktop.
- Interface operacional, densa na medida certa e otimizada para rotina de cozinha.

Referencia principal:

- https://m3.material.io/get-started
- https://tech.ifood.com.br/en/front-end/ifds-por-dentro-dos-padroes-de-engenharia-e-arquitetura-de-componentes-do-ifood-design-system/

## 1.1. Aprendizados do iFood Design System

A inspiracao no iFood deve ser principalmente estrutural:

- Separar linguagem visual de implementacao.
- Usar tokens como fonte de verdade.
- Evitar valores soltos e duplicados no CSS.
- Dividir componentes em camadas: fundamentos reutilizaveis, padroes globais e componentes especificos de produto.
- Manter consistencia entre mobile, tablet e desktop sem duplicar logica visual.

O FichaTec nao deve copiar a marca iFood. A referencia e a maturidade do sistema: clareza, agilidade, componentes consistentes, hierarquia forte e experiencia familiar para comida/operacao.

## 2. Interpretacao Para o Produto

Material 3 sera a base, mas o FichaTec precisa ter identidade propria.

O app deve parecer:

- Profissional.
- Rapido.
- Confiavel.
- Moderno.
- Familiar para usuarios brasileiros.
- Inspirado na fluidez de apps como iFood, sem copiar marca, cores proprietarias ou componentes identicos.

## 3. Mobile First

### Mobile

- Navegacao principal inferior.
- Acoes primarias sempre ao alcance do polegar.
- Formularios em etapas curtas.
- Cards com informacao essencial.
- Modais devem virar bottom sheets quando fizer sentido.
- Scanner e criacao de ficha devem ser fluxos muito rapidos.

### Tablet

- Aproveitar largura com duas colunas.
- Lista de receitas/estoque de um lado e detalhe do outro.
- Menos modais, mais paineis laterais.
- Melhor uso para edicao de ficha tecnica completa.

### Desktop

- Layout com navegacao lateral.
- Tabelas mais completas.
- Painel de detalhes persistente.
- Mais densidade para gestao de estoque, historico e relatorios.
- Evitar cara de landing page; desktop e ferramenta de trabalho.

## 4. Componentes Base

Priorizar componentes Material 3 equivalentes:

- Navigation bar no mobile.
- Navigation rail/tablet.
- Navigation drawer/desktop.
- Top app bar.
- Filled button para acao primaria.
- Outlined/text buttons para acoes secundarias.
- Floating action button apenas para a acao dominante da tela.
- Cards para receitas, ingredientes e produtos.
- Chips para filtros, tags e categorias.
- Dialogs e bottom sheets.
- Text fields.
- Search bar.
- Segmented buttons.
- Tabs quando houver secoes irmas.
- Snackbars/toasts.
- Progress indicators.
- Badges para status, plano e premium.

## 5. Tokens Iniciais

Os tokens finais devem ser ajustados durante a implementacao visual, mas a estrutura deve nascer assim:

```css
:root {
  --md-sys-color-primary: #BA1A1A;
  --md-sys-color-on-primary: #FFFFFF;
  --md-sys-color-primary-container: #FFDAD6;
  --md-sys-color-on-primary-container: #410002;

  --md-sys-color-secondary: #775653;
  --md-sys-color-on-secondary: #FFFFFF;
  --md-sys-color-secondary-container: #FFDAD6;
  --md-sys-color-on-secondary-container: #2C1513;

  --md-sys-color-surface: #FFFBFF;
  --md-sys-color-on-surface: #201A19;
  --md-sys-color-surface-container-low: #FFF8F7;
  --md-sys-color-surface-container: #F5EEEC;
  --md-sys-color-surface-container-high: #EFE9E7;

  --md-sys-color-outline: #857371;
  --md-sys-color-error: #BA1A1A;
  --md-sys-color-success: #1E7D42;
  --md-sys-color-warning: #8A5700;

  --md-sys-shape-corner-small: 8px;
  --md-sys-shape-corner-medium: 12px;
  --md-sys-shape-corner-large: 16px;
  --md-sys-shape-corner-extra-large: 24px;
}
```

Observacao: vermelho pode ser usado como acento inspirado no mercado food delivery, mas a paleta final deve equilibrar vermelho com neutros quentes, verdes de sucesso/estoque e tons funcionais. O app nao deve virar uma tela monocromatica vermelha.

## 6. Tipografia

Usar escala baseada em Material 3:

- Display: evitar no app operacional, usar apenas em onboarding/marketing.
- Headline: titulos de paginas principais.
- Title: cards, secoes e modais.
- Body: conteudo e formularios.
- Label: botoes, chips, metadados e campos.

Regras:

- Nada de textos gigantes dentro de cards operacionais.
- Numeros financeiros devem ter excelente legibilidade.
- Custos, unidades e valores podem usar fonte monoespacada em contextos de calculo.
- Mobile precisa de hierarquia clara sem desperdiçar altura.

## 7. Padroes de Tela

### Home logada

- Resumo de receitas.
- Alertas de estoque.
- Atalhos: Nova ficha, Novo produto, Digitalizar receita, Digitalizar rotulo.
- Indicador de plano e uso de IA se aplicavel.

### Ficha tecnica

- Fluxo guiado.
- Total sempre visivel em area sticky ou resumo fixo.
- Ingredientes editaveis rapidamente.
- Custo por porcao, custo por kg/unidade, preco sugerido e margem.

### Estoque

- Busca forte.
- Filtros por categoria, fornecedor e status.
- Indicadores de baixo estoque.
- Historico de movimentacao acessivel.

### Scanner IA

- Captura.
- Processamento.
- Rascunho revisavel.
- Match com ingredientes existentes.
- Salvamento explicito.

### Planos

- Comparacao clara.
- Destaque honesto para plano recomendado.
- Recursos premium explicados com exemplos concretos.

## 8. Acessibilidade

- Contraste adequado.
- Estados de foco visiveis.
- Labels reais nos campos.
- Botoes com area de toque confortavel.
- Icones acompanhados de texto quando a acao nao for obvia.
- Feedback claro de erros de formulario.

## 9. Proximo Uso na Implementacao

Na fase de refatoracao, criar:

- `src/styles/tokens.css`
- `src/styles/base.css`
- `src/styles/components.css`
- `src/styles/layout.css`
- `src/styles/pages.css`

A primeira entrega visual deve converter a interface atual para tokens Material 3 sem quebrar regra de negocio.
