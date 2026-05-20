# FichaTec - Arquitetura Tecnica

## 1. Objetivo Arquitetural

Criar uma base segura, escalavel e organizada para sair de um prototipo em `index.html` para um PWA com Node.js, Supabase, autenticacao, pagamentos recorrentes, recursos premium por plano e futuras extensoes de comunidade/marketplace.

## 2. Principios

- Seguranca primeiro.
- Multi-tenant desde o primeiro schema.
- Regras sensiveis no backend.
- Frontend sem chaves privadas.
- RLS habilitado em todas as tabelas de dados do usuario.
- Cada registro privado deve pertencer a uma organizacao.
- Assinatura e limites devem ser validados server-side.
- Recursos de IA e pagamentos devem passar por Edge Functions/API.
- Estrutura simples agora, mas preparada para crescer.

## 3. Stack Recomendada

### Frontend

- PWA.
- HTML, CSS e JavaScript separados na primeira refatoracao.
- Evolucao recomendada: Vite + TypeScript.
- Futuro possivel: React, se a complexidade de componentes e estados crescer.

### Backend

- Supabase Auth.
- Supabase Postgres.
- Supabase Storage para imagens de rotulos/receitas.
- Supabase Edge Functions para IA, pagamento, webhooks e buscas externas.
- Node.js quando houver necessidade de API propria fora do Supabase.

### Pagamentos

Opcoes recomendadas para avaliar:

- Pagar.me: forte para mercado brasileiro, Pix, cartao, boleto, assinaturas e recursos locais.
- Mercado Pago: forte em Pix/cartao no Brasil, bom alcance popular.
- Stripe: excelente para SaaS e Billing, mas validar suporte atual de Pix/recorrencia no Brasil antes da decisao final.

Decisao sugerida para MVP Brasil:

- Priorizar gateway brasileiro se Pix recorrente, debito e conciliacao local forem essenciais.
- Abstrair gateway em uma camada propria para trocar provedor sem reescrever produto.

## 4. Estrutura de Pastas Alvo

```text
FICHA-TECNICA---CONTROLE-DE-ESTOQUE/
  public/
    index.html
    manifest.webmanifest
    service-worker.js
    icons/
      icon-192.png
      icon-512.png
  src/
    app.js
    styles/
      tokens.css
      base.css
      layout.css
      components.css
      pages.css
    config/
      env.js
      supabase.js
    modules/
      auth/
      billing/
      recipes/
      stock/
      nutrition/
      scanner/
      community/
      marketplace/
    services/
      supabaseClient.js
      repositories/
      featureAccess.js
      offlineQueue.js
    utils/
      formatters.js
      validators.js
      sanitize.js
  supabase/
    migrations/
    functions/
      scan-recipe/
      scan-label/
      billing-webhook/
      create-checkout/
      search-products/
  docs/
    PRODUCT_GUIDELINES.md
    TECHNICAL_ARCHITECTURE.md
    ROADMAP.md
```

## 5. PWA

Arquivos obrigatorios:

- `manifest.webmanifest`
- `service-worker.js`
- Icones 192x192 e 512x512
- Registro do service worker
- `theme-color`
- HTTPS no dominio

Estrategia:

- Cache app shell: HTML, CSS, JS, fontes locais e icones.
- Dados privados ficam no Supabase.
- Offline futuro com IndexedDB e fila de sincronizacao.
- Primeira versao pode funcionar online-first.

## 6. Supabase

### Tabelas principais

```text
profiles
organizations
organization_members
subscriptions
plans
feature_limits
stock_items
stock_price_history
physical_stock_items
stock_movements
recipes
recipe_versions
recipe_ingredients
nutrition_facts
scan_jobs
uploaded_assets
community_recipes
community_interactions
sponsored_products
sponsor_campaigns
product_catalog
audit_logs
```

### Chaves de propriedade

Tabelas privadas devem ter:

- `id uuid primary key`
- `organization_id uuid not null`
- `created_by uuid`
- `created_at timestamptz`
- `updated_at timestamptz`
- `deleted_at timestamptz null`

### RLS

Regra base:

- Usuario autenticado so acessa registros de organizacoes das quais e membro.
- Escrita depende de papel: owner, admin, member.
- Tabelas publicas/comunidade usam politicas separadas.
- Dados patrocinados podem ser leitura publica ou segmentada, mas escrita apenas admin/backend.

Supabase Auth integra com RLS, e Edge Functions podem receber o header de autorizacao para aplicar o contexto do usuario.

Referencias:

- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/functions
- https://supabase.com/docs/guides/functions/secrets

## 7. Modelo de Acesso e Planos

### Planos iniciais sugeridos

Free ou Trial:

- Limite pequeno de receitas.
- Estoque basico.
- Sem IA ou com pouquissimos creditos.

Essencial:

- Receitas e fichas tecnicas.
- Estoque virtual/fisico.
- Exportacao PDF.
- Sem IA premium.

Profissional:

- Tudo do Essencial.
- Leitura de receitas por foto.
- Leitura de rotulos.
- Mais limites.
- Historico de precos e relatorios.

Equipe:

- Multiplos usuarios.
- Permissoes.
- Multiplas unidades no futuro.

### Validacao

Frontend pode esconder botoes, mas quem decide e o backend.

Edge Functions devem validar:

- Usuario autenticado.
- Organizacao ativa.
- Assinatura ativa.
- Plano com direito ao recurso.
- Limite mensal disponivel.

## 8. Pagamentos

### Entidades internas

```text
plans
subscriptions
payment_customers
payment_events
invoices
feature_usage
```

### Fluxo

1. Usuario escolhe plano.
2. Frontend chama `create-checkout`.
3. Edge Function cria checkout no gateway.
4. Usuario paga no ambiente seguro do gateway.
5. Gateway chama `billing-webhook`.
6. Webhook valida assinatura/evento.
7. Sistema atualiza `subscriptions`.
8. Recursos premium sao liberados.

### Metodos

- Cartao de credito.
- Debito quando o gateway escolhido suportar para assinatura/checkout.
- Pix.
- Pix recorrente deve ser validado no gateway escolhido, pois a experiencia pode variar entre pagamento recorrente automatico, cobrancas periodicas ou confirmacao manual.

## 9. IA e Imagens

### Leitura de receita manuscrita

Fluxo:

1. Usuario envia imagem.
2. App cria `scan_job`.
3. Imagem vai para Storage privado.
4. Edge Function valida plano/limite.
5. IA extrai receita estruturada.
6. Resultado volta como rascunho.
7. Usuario revisa.
8. Usuario salva como receita/ficha.

### Leitura de rotulo

Fluxo parecido, mas destino principal e `nutrition_facts` e `stock_items`.

Campos extraidos:

- Nome do produto.
- Marca.
- Porcao.
- Valor energetico.
- Carboidratos.
- Proteinas.
- Gorduras totais.
- Gorduras saturadas.
- Gorduras trans.
- Fibra alimentar.
- Sodio.
- Lista de ingredientes quando disponivel.
- Codigo de barras quando detectado.

### Seguranca

- Chaves de IA apenas em secrets.
- Nunca chamar IA direto do frontend.
- Limitar tamanho e tipo de arquivo.
- Registrar custo por chamada.
- Remover ou anonimizar imagens conforme politica de retencao.

## 10. Busca Online de Produtos

Arquitetura correta:

- `search-products` como Edge Function/API.
- Cache de resultados em `product_catalog`.
- Fonte identificada: manual, parceiro, API, patrocinado.
- Nunca misturar resultado patrocinado como se fosse resultado organico.
- Produto patrocinado precisa de label visual.

Evitar:

- Scraping direto do browser.
- Expor chaves de APIs externas.
- Atualizar custo de ficha automaticamente sem confirmacao do usuario.

## 11. Comunidade

Comunidade deve ser modelada separada da area privada.

- Receita privada vira publica apenas por acao explicita.
- Copiar receita publica cria uma copia privada.
- Comentarios e avaliacoes precisam de moderacao.
- Dados comerciais/custos privados nao devem ir para comunidade por padrao.

## 12. Marketplace e Patrocinio

Preparar agora:

- Ingredientes com categoria e sinonimos.
- Produto catalogado separado do ingrediente do usuario.
- Relacao `ingredient_match`.
- Campanhas com regiao, data, publico e categoria.

Futuro:

- Promocoes por geolocalizacao.
- Compra integrada.
- Relatorios para patrocinadores.
- Controle de inventario de anuncios.

## 13. Riscos Principais

- Misturar dados de usuarios por falha de RLS.
- Liberar IA premium apenas pelo frontend.
- Chaves secretas no cliente.
- Scraping instavel de busca online.
- Gateway sem suporte real a todos os meios desejados.
- Calculo de ficha tecnica incompleto para uso profissional.
- Baixa de estoque automatica sem rastreabilidade.
- Conteudo de comunidade expondo dados privados.

## 14. Padrao de Qualidade

Antes de deploy:

- Lighthouse PWA.
- Teste de login/logout.
- Teste de RLS com dois usuarios.
- Teste de plano sem acesso ao recurso premium.
- Teste de pagamento aprovado, recusado e cancelado.
- Teste de webhook idempotente.
- Teste de upload de imagem grande/invalida.
- Teste de exportacao PDF.
- Teste mobile real.

## 15. Inventario de Funcoes

O projeto deve manter um inventario vivo em `docs/FUNCTION_INVENTORY.md`.

Regras:

- Toda funcao criada, movida, renomeada ou removida deve ser registrada.
- O inventario deve ser atualizado antes de cada commit relevante.
- O objetivo e apoiar documentacao final, auditoria tecnica e refatoracoes futuras.
