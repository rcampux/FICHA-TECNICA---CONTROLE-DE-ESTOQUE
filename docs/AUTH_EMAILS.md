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

## Envio de produção — SMTP ativo

Em 05/11/2026, o projeto ainda usava o serviço de envio padrão do Supabase e os logs registraram `over_email_send_rate_limit`. Alterar o modelo não remove esse limite e não comprova entrega na caixa de entrada.

Em 05/11/2026, o subdomínio `app.tscheers.com.br` foi cadastrado no Resend (São Paulo) e verificado. Foram adicionados na Hostinger somente o TXT `resend._domainkey.app` e os CNAMEs `rsend.app` e `send.app`, com os valores fornecidos pelo painel Resend. Os registros existentes de site e e-mail foram preservados.

Configuração salva pelo proprietário e conferida no Supabase em 05/11/2026:

- Remetente: `FichaTec | NK Control <nao-responda@app.tscheers.com.br>`.
- Servidor: `smtp.resend.com`; porta: `465`; usuário: `resend`.
- Chave preparada com nome `FichaTec Supabase SMTP`, permissão `Sending access`, restrita a `app.tscheers.com.br`; credencial inserida diretamente pelo proprietário no painel.
- Verificação: SMTP habilitado, servidor e remetente persistidos, senha armazenada e oculta pelo Supabase.
- Teste de recuperação para o endereço autorizado `r.camposarch@gmail.com`: Resend registrou `Delivered`, mensagem `01a1acfe-8969-7171-8188-18235d1ffc63`. A senha não foi alterada. O assunto de recuperação ainda é o padrão `Reset your password`; a personalização aplicada refere-se à confirmação de cadastro.
- Próximo passo: validar cadastro e confirmação com endereço ainda não cadastrado. O endereço usado no teste de recuperação já estava confirmado; esse teste comprova envio SMTP e aceitação pelo servidor de destino, não a conclusão de um novo cadastro nem a pasta de destino no Gmail.

- Não colocar senha SMTP ou chave privada no frontend, Git ou nesta documentação.
- Desabilitar rastreamento de links no provedor para não reescrever URLs de autenticação.
- Manter a confirmação de e-mail habilitada.
- Após conectar o provedor, validar uma confirmação com um endereço de teste autorizado e verificar os registros de envio/entrega.

Referências: [SMTP do Supabase](https://supabase.com/docs/guides/auth/auth-smtp), [modelos de e-mail](https://supabase.com/docs/guides/auth/auth-email-templates), [Resend com Supabase](https://resend.com/docs/send-with-supabase-smtp).
