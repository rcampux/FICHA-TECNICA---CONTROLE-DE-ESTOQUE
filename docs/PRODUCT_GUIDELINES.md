# FichaTec - Diretrizes de Produto

## 1. Visao

FichaTec e um SaaS B2B para chefs, cozinhas profissionais, confeitarias, padarias, restaurantes, dark kitchens e pequenos negocios de alimentacao que precisam controlar receitas, fichas tecnicas, custos, estoque e margem com precisao.

O produto deve ser simples o bastante para um chef usar no celular durante a rotina da cozinha, mas robusto o suficiente para virar uma plataforma escalavel com assinatura, IA, comunidade, marketplace e patrocinio de grandes mercados.

## 2. Usuario Primario

### Perfil principal

- Chef de cozinha, confeiteiro, padeiro, gestor de cozinha ou empreendedor de alimentos.
- Trabalha com receitas recorrentes, ingredientes com precos variaveis e necessidade de margem clara.
- Precisa criar fichas tecnicas rapidamente, controlar custo por porcao e acompanhar estoque real.
- Usa celular com frequencia e pode nao ter paciencia para interfaces complexas.

### Necessidades

- Montar receitas com rapidez.
- Calcular custo real, margem, preco sugerido e custo por porcao.
- Manter ingredientes organizados por fornecedor, categoria e unidade.
- Atualizar precos sem refazer fichas antigas manualmente.
- Salvar receitas, imprimir ou exportar ficha tecnica.
- Fotografar receitas escritas ou impressas e transformar em ficha editavel.
- Fotografar rotulos para preencher dados nutricionais e informacoes de produto.
- Trabalhar com seguranca, privacidade e dados separados por usuario/empresa.

## 3. Posicionamento

FichaTec nao deve parecer uma planilha bonita. Deve parecer uma ferramenta operacional de cozinha profissional.

O app deve transmitir:

- Rapidez.
- Confianca.
- Precisao.
- Controle financeiro.
- Praticidade mobile.
- Visual familiar inspirado em produtos brasileiros de alta frequencia, especialmente iFood, sem copiar identidade visual proprietaria.

## 4. Principios de UX

### Mobile primeiro

A experiencia principal deve funcionar perfeitamente no celular. Desktop e tablet devem expandir densidade e comparacao, nao mudar a logica.

### Fluxo de acesso com cara de app

- Sempre iniciar com splash animada de 2 segundos (mobile e desktop).
- Depois da splash, exibir tela inicial de login quando nao houver sessao ativa.
- Ao autenticar com sucesso, ocultar tela inicial e abrir direto na experiencia principal.
- Ao encerrar sessao, voltar para uma experiencia de inicio com splash + tela de login.
- A tecla Enter no formulario de acesso deve submeter login/cadastro.
- A splash e apenas uma camada visual: autenticacao, cache, service worker ou token expirado nunca podem deixar o usuario preso nela. O app deve liberar a interface com timeout/failsafe e abrir login quando a sessao nao estiver pronta.

### Poucos passos por tarefa

Criar uma ficha tecnica deve ser um fluxo guiado:

1. Nome da receita.
2. Ingredientes.
3. Rendimento e porcoes.
4. Perdas/rendimento por ingrediente.
5. Custos e margem.
6. Revisao e salvamento.

### Sempre editavel

Tudo que a IA ler por foto deve ser apresentado como sugestao revisavel. O usuario nunca deve sentir que a IA gravou errado e estragou o cadastro.

### Custo sempre visivel

Em telas de receita, o custo total, custo por porcao e preco sugerido devem estar sempre proximos da acao principal.

### Estoque e ficha devem conversar

O usuario precisa entender quando uma receita apenas calcula custo e quando ela tambem da baixa no estoque real.

### Premium sem friccao abusiva

Recursos pagos devem ser claros:

- Plano base: fichas tecnicas, estoque, receitas e exportacao.
- Plano profissional: IA para leitura de receita e rotulo, historico avancado, relatorios e mais limites.
- Futuro: equipe, multiplas unidades, marketplace e integracoes.

## 5. Modulos do Produto

### Autenticacao e conta

- Login por email/senha e magic link.
- Recuperacao de senha.
- Perfil do usuario.
- Organizacao/empresa do usuario.
- Convites para equipe no futuro.

### Assinaturas e planos

- Planos mensal, trimestral e anual.
- Assinatura recorrente.
- Pagamento por cartao de credito, debito quando suportado pelo gateway, Pix e possivelmente boleto.
- Bloqueio por recurso, limite e status da assinatura.
- Portal para atualizar pagamento, cancelar ou trocar plano.

### Estoque virtual

Banco de ingredientes usado para precificacao.

Campos recomendados:

- Nome.
- Marca.
- Categoria.
- Unidade base.
- Quantidade comprada.
- Valor pago.
- Preco por grama/ml/unidade.
- Fornecedor.
- Codigo de barras.
- Dados nutricionais por 100g/ml.
- Origem do dado: manual, rotulo, online, patrocinado, importado.

### Estoque fisico

Controle operacional de quantidade real.

Deve registrar:

- Saldo atual.
- Meta de estoque.
- Entradas.
- Saidas.
- Ajustes manuais.
- Motivo da movimentacao.
- Vinculo com receitas quando houver baixa automatica.

### Receitas e fichas tecnicas

Cada receita deve gerar uma ficha tecnica completa.

Campos recomendados:

- Nome.
- Categoria.
- Tags.
- Ingredientes.
- Quantidade bruta.
- Quantidade liquida.
- Fator de correcao/perda.
- Unidade.
- Custo individual.
- Custo total.
- Rendimento total.
- Porcoes.
- Custo por porcao.
- Markup.
- Margem alvo.
- Preco sugerido.
- Preco manual.
- Modo de preparo.
- Observacoes.
- Validade.
- Embalagem.
- Mao de obra opcional.
- Custos indiretos opcionais.
- Historico de versoes.

### Leitura por IA

Recursos premium.

- Foto de receita manuscrita.
- Foto de receita impressa.
- Foto de rotulo nutricional.
- Foto de nota/etiqueta de compra no futuro.

Regras:

- A imagem vai para backend/Edge Function, nunca direto com chave secreta no frontend.
- A resposta da IA deve voltar como rascunho estruturado.
- O usuario revisa antes de salvar.
- Cada execucao deve consumir creditos/limites do plano.
- Deve haver historico de erros para melhoria, sem expor dados sensiveis.

### Busca online de produtos e valores

Funcao futura com cuidado juridico e tecnico.

Uso desejado:

- Buscar produto por nome, marca, codigo de barras ou categoria.
- Sugerir preco medio ou ofertas de mercados parceiros.
- Separar claramente preco pesquisado, preco informado pelo usuario e produto patrocinado.

Observacao:

- Evitar scraping fragil do Google como base critica. Melhor arquitetura: usar APIs oficiais, provedores de catalogo, parcerias comerciais, feeds de mercado ou busca server-side com cache e auditoria.

### Comunidade

Fase futura.

- Receitas publicas.
- Receitas privadas.
- Curtidas, salvamentos e comentarios.
- Denuncia/moderacao.
- Perfil publico.
- Copiar receita da comunidade para area privada.
- Separar dados privados de comunidade via permissoes claras.

### Marketplace e patrocinio

Fase futura.

- Produtos patrocinados vinculados a ingredientes.
- Campanhas por regiao, categoria, marca e tipo de usuario.
- Promocoes relacionadas a receitas.
- Compra pelo app no futuro.
- Marcacao visual obrigatoria de conteudo patrocinado.

## 6. Regras de Produto Essenciais

- Nenhum usuario pode acessar dados de outro usuario/organizacao.
- IA nunca salva direto sem revisao.
- Dados usados para calculo devem ser versionados quando afetam custo historico.
- Uma receita salva deve manter o custo original e tambem permitir recalculo com precos atuais.
- Exclusoes importantes devem ser soft delete quando houver historico financeiro.
- Todo recurso premium deve ser validado no backend, nao apenas escondido no frontend.
- O app deve continuar util mesmo sem IA.

## 7. Pontos Cegos Cobertos

- Fator de correcao/perda por ingrediente.
- Custos indiretos: gas, energia, embalagem, taxa de app, mao de obra.
- Preco sugerido por margem alvo, nao apenas markup.
- Historico de preco de ingredientes.
- Versoes de ficha tecnica.
- Controle de baixa de estoque separado de simulacao de custo.
- Auditoria de movimentacoes de estoque.
- Limites por plano para IA e quantidade de receitas.
- Separacao entre dado privado, dado comunitario e dado patrocinado.
- Consentimento para uso de receitas em comunidade.
- Tratamento de LGPD: exportar dados, apagar conta e politica de privacidade.
