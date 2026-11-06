# Avisos do aplicativo

Alertas e confirmações necessárias aparecem no canto superior direito no desktop/mobile. A referência é uma cápsula de liquid glass: fundo escuro translúcido, reflexo discreto, Roboto branca, ícone colorido e X. CARD/Menu conservam sua identidade e o toast não desloca o menu fixo.

- Verde: sucesso. Vermelho: erro. Laranja: atenção. Azul: informação. Ícone e título também identificam a intenção.
- Entrada lateral pela direita com bounce discreto de 420 ms; movimento reduzido dispensa animação. Fechamento automático após 3 segundos, ou imediato pelo X. Um novo aviso reinicia os 3 segundos e substitui o anterior.
- A abertura não toma foco nem abre teclado. Popover manual mantém visibilidade sobre dialogs; posição respeita viewport visível e áreas seguras. Vidro tem fallback opaco em navegadores sem suporte e para preferência por transparência reduzida.
- Sincronização bem-sucedida, login habitual e seleção de workspace não exibem toast. Erros dessas ações continuam comunicados. Confirmações de gravação, exclusão ou envio de e-mail permanecem quando necessárias.
- Explicações contextuais e erros de formulário permanecem também no local quando disponíveis. Não notificar cada tecla, carregamento ou recálculo.
- Usar `showToast(mensagem, {tone, title})` para novos avisos. Textos devem ser curtos, indicar a ação necessária e caber no tempo de leitura.

Validar temporização, substituição de mensagem, X, mobile/desktop, dialog nativo e preferência de movimento reduzido.

Revisão visual: fita compacta de 380 px no desktop e no máximo 330 px no mobile, a 30 px do topo visível (respeitando a área segura). Altura mínima de 76 px e crescimento natural para mensagens longas. Texto inteiramente branco; ícones em verde #20d661, laranja #ff9500, azul #168bff e vermelho #ff343b. Fundo neutro escuro, vidro translúcido e reflexo sutil, sem faixa marrom saturada.

O host do popover apenas posiciona: não recebe blur nem animação. A superfície interna usa flex e animação; o vidro fica em uma camada própria atrás do texto, ícone e X. Isso desacopla a composição visual do top layer dos dialogs. Sem alterações nos ancestrais da navegação fixa.

Verificação desta revisão: testes de duração, substituição, fechamento e todas as naturezas; visualização com CSS completo e dialog nativo em viewport mobile/desktop. Em Chrome, mensagem curta ~77 px e longa ~127 px, sem extravasamento. O comportamento em iPhone físico ainda precisa de confirmação no dispositivo após publicação.

Mensagens ao usuário nunca mencionam banco, Supabase ou arquitetura. Descrever o problema e a ação possível. Confirmação de receita: Sua receita foi salva. Erro de ingrediente indisponível orienta selecionar novamente o produto.
