# FichaTec - Proximo Passo Sequencial

## Estado Atual

O projeto esta em fase de prototipo estruturado com Supabase ja conectado em producao.

- Diretrizes de produto, arquitetura tecnica, design system, PWA e Supabase documentados.
- HTML, CSS e JS estao separados por dominio.
- Base visual mobile-first aplicada com Material 3 e identidade gastronomica premium.
- `src/app.js` foi reduzido para orquestracao dos modulos.
- Estoque virtual, estoque fisico, receitas/ficha tecnica, scanner, auth, repositories e utilitarios foram modularizados.
- `docs/FUNCTION_INVENTORY.md` e o inventario vivo das funcoes usadas no projeto.
- PWA publicado com manifest, icones temporarios, service worker resiliente e cache que nao bloqueia Auth/CRUD/Supabase.
- Supabase foi ativado com Auth, RLS, profiles, organizations, organization_members, recipes, recipe_ingredients, stock_items e physical_stock_items.
- Vercel esta configurada para build com variaveis de ambiente Supabase.
- GitHub e Vercel devem permanecer sincronizados: todo commit exige push e deploy de producao.
- CRUD visual voltou para icones explicitos de editar/excluir nos cards, em mobile e desktop.
- Exclusoes remotas foram ajustadas para funcionar tambem quando o usuario remove o ultimo item de uma lista.

## Proximo Passo Recomendado

### Fase 2.2 - Validacao de Producao Supabase

Objetivo: provar que o app esta confiavel para uso B2B inicial com dados reais, antes de avancar para pagamento, IA e recursos premium.

Ordem recomendada:

1. Criar dois usuarios de teste confirmados no Supabase Auth.
2. Validar que cada usuario recebe automaticamente `profile`, `organization` e papel `owner`.
3. Em producao, com o usuario A, criar:
   - 1 produto no estoque virtual.
   - 1 produto no estoque fisico.
   - 1 receita com ingrediente vinculado.
4. Recarregar a pagina e confirmar que os dados persistem.
5. Editar os tres tipos de item e confirmar persistencia depois do reload.
6. Excluir os tres tipos de item, incluindo o caso de ser o ultimo item da lista.
7. Confirmar no Supabase que os registros privados ficam com `deleted_at` quando aplicavel.
8. Entrar com o usuario B e confirmar que ele nao ve dados do usuario A.
9. Rodar `supabase/rls_smoke_test.sql` com UUIDs reais para validar isolamento por workspace.
10. Registrar qualquer falha encontrada antes de iniciar novas features.

## Checklist de Aceite

- Login e cadastro funcionam na URL de producao.
- Confirmacao de e-mail redireciona para a Vercel.
- Modal de auth nao preserva senha entre fluxos.
- Senha forte e validada no cadastro.
- Logout limpa dados privados do navegador.
- Criar, editar e excluir funciona para estoque virtual.
- Criar, editar e excluir funciona para estoque fisico.
- Criar, editar e excluir funciona para receitas.
- Excluir o ultimo item de uma lista tambem sincroniza com Supabase.
- Recarregar a pagina nao restaura itens excluidos.
- Usuario fora do workspace nao acessa dados de outro workspace.
- Service worker nao mostra erro de `addAll` nem cancela assets essenciais.

## Se Tudo Passar

Avancar para Fase 3.1 - Estrutura de planos e permissoes:

1. Definir matriz de planos: trial, essencial, profissional e equipe.
2. Implementar gate de recursos no frontend e preparar validacao backend.
3. Criar base para limites de receitas, usuarios, scanner de rotulos e scanner de receitas.
4. Preparar integracao com gateway de pagamento recorrente.
5. Documentar webhooks e estados de assinatura antes de conectar cobranca real.

## Link de Producao

- https://ficha-tecnica-controle-de-estoque.vercel.app
