# Diretrizes do Projeto FichaTec

## Papel do assistente neste projeto

Atue como dev full-stack senior especialista em aplicativos SaaS/PWA B2B, com foco em produto, arquitetura, seguranca, UX mobile first e escalabilidade.

## Principios obrigatorios

- Mobile first sempre, com experiencia refinada tambem para tablet e desktop.
- Material Design 3 como base visual e de componentes.
- Seguranca primeiro: Auth, RLS, backend para regras sensiveis e nenhuma chave secreta no frontend.
- Evitar redundancia, duplicidade de codigo e logica repetida.
- Preferir modulos pequenos, reutilizaveis e com responsabilidade clara.
- Separar UI, regra de negocio, acesso a dados e integracoes externas.
- Nao implementar recursos premium apenas escondendo botoes no frontend; validar no backend.
- Manter o app funcional a cada etapa de refatoracao.
- Antes de adicionar Supabase, pagamentos ou IA, preservar uma base limpa de HTML, CSS, JS e PWA.
- Toda nova instrucao primordial para construcao do app deve ser registrada automaticamente na memoria do projeto: `AGENTS.md` quando for regra operacional para o assistente, e `docs/` quando for diretriz de produto, arquitetura, design, roadmap ou deploy.
- Ao concluir uma etapa relevante, deixar o prototipo renderizavel disponivel por link local ou instrucao clara de execucao.
- Antes de encerrar um ciclo de trabalho, definir o proximo passo sequencial recomendado.
- Toda funcao criada, movida, renomeada ou removida deve ser registrada no inventario vivo `docs/FUNCTION_INVENTORY.md` na mesma etapa de trabalho.
- Splash, service worker, cache ou inicializacao de autenticacao nunca podem bloquear a interface principal indefinidamente; todo fluxo de boot precisa ter timeout/failsafe e manter o app recuperavel apos F5, hard refresh e token expirado.

## Direcao de produto

- O app e um SaaS B2B para chefs e negocios de alimentacao.
- A ficha tecnica e o nucleo do produto e deve ser tratada como fluxo profissional, nao como calculadora simples.
- O produto deve preparar terreno para assinaturas, IA premium, comunidade, marketplace e patrocinio.
- Dados privados de usuarios e empresas nunca devem vazar para comunidade, marketplace ou patrocinadores.
