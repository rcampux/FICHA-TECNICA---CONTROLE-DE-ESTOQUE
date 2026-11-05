# Avisos do aplicativo

Alertas, validações, erros e confirmações relevantes usam o toast global no canto superior direito, no desktop e no mobile. Mensagens explicam o problema e a próxima ação em português; salvar uma receita sem nome mostra **Falta o nome da receita**, com a orientação para preencher o campo.

- Atenção: âmbar, pelo menos 8 segundos. Erro: vermelho, pelo menos 10 segundos. Sucesso: verde, pelo menos 5 segundos. Informação: vinho, pelo menos 7 segundos. Textos longos ganham mais tempo, até 18 segundos.
- Cada aviso tem título, ícone e X para fechar; não depende apenas da cor. Hover e foco pausam o fechamento. A mensagem mais recente substitui a anterior, sem acumular avisos sobre a tela.
- O toast não rouba o foco, abre o teclado ou altera a posição da navegação. Respeita área segura e viewport visível, inclusive durante o teclado. Usa popover manual para aparecer sobre dialogs nativos, com fallback fixo para navegadores antigos.
- Mantém a superfície e o arredondamento da jornada CARD/Menu. Texto longo quebra dentro do aviso. Leitores de tela recebem alerta assertivo para erros/atenção e anúncio discreto para sucessos/informações.
- Explicações permanentes e estados de carregamento continuam perto dos controles. Não gerar um toast a cada tecla ou recálculo automático.
- Novas chamadas devem passar `showToast(mensagem, {tone, title})` quando souberem a intenção; a classificação por texto existe para compatibilidade com chamadas antigas.

Validação: fluxo real de receita sem nome e aviso sobre popup em viewport mobile/desktop, fechamento pelo X sem foco em input, e testes de substituição, temporização e acessibilidade. A emulação não substitui uma conferência final com teclado físico de iPhone/Android.
