# Avisos do aplicativo

Alertas e confirmações necessárias aparecem no canto superior direito no desktop/mobile. A referência é uma cápsula de liquid glass: fundo escuro translúcido, reflexo discreto, Roboto branca, ícone colorido e X. CARD/Menu conservam sua identidade e o toast não desloca o menu fixo.

- Verde: sucesso. Vermelho: erro. Laranja: atenção. Azul: informação. Ícone e título também identificam a intenção.
- Entrada lateral pela direita com bounce suave de 480 ms; movimento reduzido dispensa animação. Fechamento automático após 3 segundos, ou imediato pelo X. Um novo aviso reinicia os 3 segundos e substitui o anterior.
- A abertura não toma foco nem abre teclado. Popover manual mantém visibilidade sobre dialogs; posição respeita viewport visível e áreas seguras. Vidro tem fallback opaco em navegadores sem suporte e para preferência por transparência reduzida.
- Sincronização bem-sucedida, login habitual e seleção de workspace não exibem toast. Erros dessas ações continuam comunicados. Confirmações de gravação, exclusão ou envio de e-mail permanecem quando necessárias.
- Explicações contextuais e erros de formulário permanecem também no local quando disponíveis. Não notificar cada tecla, carregamento ou recálculo.
- Usar `showToast(mensagem, {tone, title})` para novos avisos. Textos devem ser curtos, indicar a ação necessária e caber no tempo de leitura.

Validar temporização, substituição de mensagem, X, mobile/desktop, dialog nativo e preferência de movimento reduzido.
