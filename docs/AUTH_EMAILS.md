# E-mails de autenticação

## Identidade

- Nome exibido no aplicativo: FichaTec; projeto: NK Control.
- A confirmação de cadastro usa português, o monograma FT, vermelho da marca e botão de confirmação destacado.
- O monograma é composto em HTML para continuar legível quando o leitor de e-mail bloqueia imagens externas.
- Assunto: `Confirme seu e-mail | FichaTec — NK Control`.
- Fonte do corpo: `supabase/templates/confirmation.html`.
- O botão e o link alternativo preservam `{{ .ConfirmationURL }}` do Supabase. Não criar tokens ou links de autenticação fixos.
- Este arquivo é uma cópia versionada; o deploy da Vercel não configura o modelo automaticamente. A aplicação ocorre em Authentication > Emails > Confirm sign up, no projeto `gzyecgwpaooyaqmzxvwv`.
- Aplicado no Supabase em 05/11/2026 e conferido na prévia do painel. Não foi enviado e-mail de teste nesta etapa.

## Envio de produção — pendente

Em 05/11/2026, o projeto ainda usava o serviço de envio padrão do Supabase e os logs registraram `over_email_send_rate_limit`. Alterar o modelo não remove esse limite e não comprova entrega na caixa de entrada.

Em 05/11/2026, o subdomínio `app.tscheers.com.br` foi cadastrado no Resend (São Paulo) e verificado. Foram adicionados na Hostinger somente o TXT `resend._domainkey.app` e os CNAMEs `rsend.app` e `send.app`, com os valores fornecidos pelo painel Resend. Os registros existentes de site e e-mail foram preservados.

Configuração preparada, mas ainda não salva/ativada no Supabase:

- Remetente: `FichaTec | NK Control <nao-responda@app.tscheers.com.br>`.
- Servidor: `smtp.resend.com`; porta: `465`; usuário: `resend`.
- Chave a criar: `FichaTec Supabase SMTP`, permissão `Sending access`, restrita a `app.tscheers.com.br`.
- Pendente: proprietário gerar a chave, inseri-la diretamente no campo Password do Supabase e salvar. Nenhuma chave foi criada ou armazenada nesta etapa.
- Próximo passo: conferir a ativação e testar o envio e a entrega. Domínio verificado não comprova funcionamento do SMTP nem entrega na caixa de entrada.

- Não colocar senha SMTP ou chave privada no frontend, Git ou nesta documentação.
- Desabilitar rastreamento de links no provedor para não reescrever URLs de autenticação.
- Manter a confirmação de e-mail habilitada.
- Após conectar o provedor, validar uma confirmação com um endereço de teste autorizado e verificar os registros de envio/entrega.

Referências: [SMTP do Supabase](https://supabase.com/docs/guides/auth/auth-smtp), [modelos de e-mail](https://supabase.com/docs/guides/auth/auth-email-templates), [Resend com Supabase](https://resend.com/docs/send-with-supabase-smtp).
