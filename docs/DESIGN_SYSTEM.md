# FichaTec — Design System

## Direção

O FichaTec é uma ferramenta de produção para cozinhas: precisa transmitir precisão, ritmo e confiança sem ficar frio. A linguagem combina a objetividade de produtos de delivery com uma identidade própria de cozinha profissional.

Princípios:

- Direto ao ponto: uma ação principal clara por contexto.
- Comida em primeiro plano: fotografia somente quando ajuda a reconhecer uma receita ou situar a experiência.
- Operação legível: custos, estoque e rendimento têm hierarquia forte.
- Calor com precisão: superfícies claras e quentes, vermelho culinário para ação e verde manjericão para estoque, lucro e sucesso.
- Mobile first: alvos de toque de pelo menos 44 px e campos de 16 px no celular.

## Paleta semântica

| Papel | Cor | Uso |
| --- | --- | --- |
| Primária | `#B4232F` | Marca, CTA principal, seleção e foco |
| Primária pressionada | `#8F1724` | Hover/pressed de CTA |
| Container primário | `#FFDAD9` | Seleção suave e destaques |
| Manjericão | `#2F6B4F` | Estoque, margem, sucesso |
| Container verde | `#B4F1CC` | Feedback positivo |
| Superfície | `#FFF8F7` | Fundo geral |
| Superfície baixa | `#FFF1EF` | Agrupamentos e campos auxiliares |
| Superfície elevada | `#FFFFFF` | Cards, modais e formulários |
| Texto principal | `#221918` | Títulos e conteúdo prioritário |
| Texto secundário | `#58413E` | Apoio e metadados |
| Contorno | `#8C716D` | Bordas e divisores |
| Erro | `#BA1A1A` | Erro destrutivo, sempre com texto/ícone |
| Alerta | `#8A4F00` | Atenção sem caráter destrutivo |

Os tokens canônicos ficam em `src/styles/tokens.css`. Aliases legados existem apenas para compatibilidade durante a migração.

## Tipografia e hierarquia

- `Roboto`: família única em toda a experiência, incluindo interface, títulos, formulários, preços, pesos e medidas.
- `Material Symbols Rounded`: ícones servidos localmente para preservar a interface offline.
- Títulos usam peso 700–850, espaçamento levemente negativo e frases curtas.
- Texto de apoio não deve depender apenas de cor para comunicar estado.

## Componentes

### Splash

- Estado único `boot → auth → app`, controlado pelo JavaScript.
- Marca central, órbita curta e barra de progresso.
- Saída animada antes de ocultar o elemento.
- Em movimento reduzido, a animação termina quase imediatamente.

### Autenticação

- Desktop: composição dividida entre imagem editorial e formulário.
- Mobile: imagem vira cabeçalho compacto; formulário ocupa a área útil.
- Estados: entrar, criar conta, recuperar acesso, definir nova senha, verificar e-mail e workspace.
- Mensagens de recuperação são neutras para não revelar se um e-mail possui conta.

### Cards

- Fundo branco sem moldura aparente, separado do plano por espaço e sombra ampla de baixa opacidade.
- Imagem tem função de reconhecimento; sem imagem, o sistema usa ícone e paleta determinísticos pelo ID da receita, sem mudar ao renomeá-la.
- Ações secundárias não disputam atenção com preço, nome ou estado.

### Superfícies e contornos

- Bordas contrastantes não são usadas como decoração ou para delimitar todos os elementos.
- Cards, modais e painéis criam hierarquia por diferença sutil de superfície, espaçamento e elevação difusa.
- Campos usam preenchimento cinza quente sem contorno no repouso; o anel de foco aparece somente durante a interação.
- Contornos ficam reservados para foco, erro, seleção necessária ou áreas de upload.

### Formulários e ações

- Botão preenchido: ação principal.
- Botão tonal/quiet: ação secundária.
- Botão de perigo: exclusão e ações irreversíveis.
- Campos têm foco visível e altura mínima de 48 px.
- Upload de capa aceita JPG, PNG e WebP, otimiza para JPEG e remove metadados no navegador.

### Rendimento e planejamento de produção

- A criação da ficha começa com um rendimento operacional explícito: tipo (`porções` ou `unidades`) e quantidade-base.
- O peso final estimado continua separado, pois atende custo por quilo e cálculos nutricionais existentes.
- O detalhe da receita possui um planejador leve, próximo aos ingredientes, que aceita a quantidade desejada e atualiza somente as quantidades exibidas.
- O planejador nunca sobrescreve o cadastro original e não recalcula custos, preço de venda ou tabela nutricional.
- Cards, detalhe e PDF usam o tipo de rendimento escolhido, com singular e plural corretos; registros antigos assumem `porções` por compatibilidade.

## Movimento

- Curto e funcional: 160–420 ms.
- Curva de entrada: `cubic-bezier(0.16, 1, 0.3, 1)`.
- Evitar rotação 3D, parallax longo ou animação que atrase a tarefa.
- `prefers-reduced-motion` reduz animações, transições e rolagem suave.

## Imagens

- A imagem editorial aparece somente no acesso, onde cria contexto e identidade.
- Fotos de receita são adicionadas pelo usuário e sempre possuem alternativa visual.
- O asset editorial local é `assets/images/fichatec-kitchen-hero.jpg`.
- Créditos e origem ficam em `docs/ASSET_LICENSES.md`.

## Responsividade

- Até 767 px: experiência operacional curta, navegação inferior, formulários em uma coluna, cards de toque e autenticação em tela cheia.
- 768–1199 px: rail lateral, cabeçalho de contexto, editor de ficha em duas áreas e grids de duas colunas.
- 1200 px ou mais: workspace SaaS com drawer escuro permanente, barra de ações, cabeçalhos editoriais com fotografia, largura fluida e painéis lado a lado.
- 1680 px ou mais: catálogos e biblioteca chegam a quatro cards por linha para aproveitar monitores amplos sem esticar o conteúdo interno dos cards.
- Mobile e desktop compartilham funções e identidade, mas não a mesma composição: no mobile a prioridade é alcance e velocidade; no desktop, visão simultânea e densidade informacional.

## Acessibilidade

- Contraste AA para textos e controles essenciais.
- Navegação por teclado e foco visível.
- Labels associados aos campos e mensagens com `role=status` ou `role=alert`.
- Ícones de ação possuem texto ou nome acessível.
- Cor nunca é a única forma de indicar erro, sucesso ou alteração de preço.

## Arquivos de referência

- `src/styles/tokens.css`: tokens semânticos.
- `src/styles/experience.css`: splash, acesso, capas e acabamentos de marca.
- `src/styles/components.css`: componentes reutilizáveis.
- `src/styles/layout.css`: breakpoints e navegação adaptativa.
- `src/styles/pages.css`: composição das páginas.
- `src/styles/saas-workspace.css`: adaptação estrutural mobile/desktop, drawer SaaS e grids fluidos.
