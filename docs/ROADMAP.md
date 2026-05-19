# FichaTec - Roadmap de Execucao

## Fase 0 - Alinhamento

Objetivo: transformar a visao em diretrizes claras antes de mexer pesado no codigo.

Entregas:

- Diretrizes de produto.
- Arquitetura tecnica.
- Estrutura de pastas alvo.
- Material Design 3 como fundacao visual.
- Lista de decisoes pendentes.
- Tokens e padroes responsivos documentados.

Status: em andamento.

## Fase 1 - Refatoracao sem mudar comportamento

Objetivo: separar o `index.html` atual em uma base organizada.

Entregas:

- `public/index.html`
- CSS separado por tokens, base, layout e componentes.
- JS separado por modulos.
- Utilitarios de formatacao e validacao.
- Camada de dados ainda usando `localStorage`, mas isolada em repositories.
- Nenhuma mudanca grande de regra de negocio nesta fase.

Criterio de aceite:

- O app continua funcionando igual ao atual.
- Fica facil trocar `localStorage` por Supabase depois.

## Fase 2 - PWA basico

Objetivo: preparar para Hostinger e instalacao no celular.

Entregas:

- `manifest.webmanifest`
- `service-worker.js`
- Icones.
- Registro do service worker.
- Cache do app shell.
- Ajustes de meta tags.

Criterio de aceite:

- Lighthouse reconhece o app como instalavel.
- App abre em modo standalone.
- Tela principal carrega mesmo com rede instavel quando ja visitada.

## Fase 3 - Supabase Auth e multi-tenant

Objetivo: criar area logada segura.

Entregas:

- Projeto Supabase.
- Tabelas base.
- RLS.
- Login/cadastro.
- Organizacao padrao por usuario.
- Migracao opcional de dados locais para conta.

Criterio de aceite:

- Usuario A nao ve dados do usuario B.
- Receita, estoque e ficha ficam vinculados a organizacao.

## Fase 4 - Banco real para receitas, estoque e fichas

Objetivo: substituir `localStorage` por Supabase.

Entregas:

- Repositories Supabase.
- CRUD de estoque virtual.
- CRUD de estoque fisico.
- CRUD de receitas.
- Versionamento de ficha tecnica.
- Historico de preco e movimentacao.

Criterio de aceite:

- Dados persistem entre dispositivos.
- Baixas de estoque sao rastreaveis.
- Receita salva preserva custo historico.

## Fase 5 - Refinamento profissional da ficha tecnica

Objetivo: deixar a funcao central perfeita para chefs.

Entregas:

- Fator de correcao/perda por ingrediente.
- Custo de embalagem.
- Custo indireto.
- Mao de obra opcional.
- Margem alvo.
- Preco sugerido.
- Preco final manual.
- Custo por receita, por kg, por unidade e por porcao.
- Recalculo com preco atual.
- Comparacao custo salvo vs custo atual.
- Exportacao PDF profissional.

Criterio de aceite:

- Chef consegue usar como documento operacional e financeiro.

## Fase 6 - Assinaturas e pagamentos

Objetivo: monetizacao B2B.

Entregas:

- Planos.
- Checkout.
- Webhook.
- Status de assinatura.
- Bloqueio por plano.
- Limites por recurso.
- Periodos mensal, trimestral e anual.

Criterio de aceite:

- Pagamento aprovado libera plano.
- Pagamento vencido/suspenso bloqueia premium.
- Webhook e idempotente.

## Fase 7 - IA premium

Objetivo: leitura por foto como diferencial pago.

Entregas:

- Upload seguro para Storage.
- Edge Function `scan-recipe`.
- Edge Function `scan-label`.
- Rascunho revisavel.
- Consumo de creditos.
- Historico de scans.

Criterio de aceite:

- Usuario sem plano premium nao consegue usar IA.
- Usuario premium consegue fotografar receita/rotulo e revisar antes de salvar.

## Fase 8 - Busca online de produtos

Objetivo: ajudar na atualizacao de precos sem comprometer confiabilidade.

Entregas:

- Edge Function `search-products`.
- Cache.
- Fonte dos dados.
- Sugestoes de preco.
- Confirmacao manual antes de alterar custos.

Criterio de aceite:

- O app sugere, mas nao altera preco critico sem aprovacao.

## Fase 9 - Comunidade

Objetivo: iniciar rede de receitas.

Entregas:

- Publicar receita.
- Copiar receita publica.
- Curtir/salvar.
- Comentarios.
- Moderacao basica.

Criterio de aceite:

- Dados privados de custo e estoque nao vazam na publicacao.

## Fase 10 - Marketplace e patrocinio

Objetivo: monetizacao com marcas e mercados.

Entregas:

- Catalogo de produtos.
- Produtos patrocinados.
- Campanhas.
- Promocoes por ingrediente/receita.
- Relatorios.
- Compra pelo app no futuro.

Criterio de aceite:

- Produto patrocinado aparece contextualizado e marcado como patrocinado.

## Decisoes Pendentes

- Gateway de pagamento principal.
- Vai existir plano gratuito ou apenas trial?
- O app tera uma organizacao por usuario no MVP ou equipe desde o inicio?
- Qual nivel de offline sera necessario no primeiro lancamento?
- Hostinger sera apenas frontend estatico ou tambem Node.js?
- Quais limites por plano: receitas, usuarios, scans de IA, estoque, PDFs?
- Retencao de imagens enviadas para IA: guardar, apagar apos processamento ou guardar opcionalmente?
- Politica de comunidade: curadoria manual ou publicacao livre com denuncia?
