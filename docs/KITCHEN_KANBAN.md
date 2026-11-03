# Quadro de operação da cozinha

O pedido de CRM foi delimitado pelo usuário para **operação da cozinha**, sem cadastro de clientes ou funil comercial. A navegação principal ganha **Cozinha**.

## Funcionalidades

- Um quadro por workspace, com nome editável e até oito etapas. Padrão: A fazer, Em preparo, Em revisão e Concluído.
- Personalização dos nomes, cores, ordem e indicação de etapas que concluem tarefas. Remover uma etapa transfere seus cartões para a primeira restante, sem apagá-los.
- Tarefas com título, orientações, responsável informado por nome, prazo, prioridade, tipo de operação, receita vinculada e checklist.
- Tipos: produção, compras, higiene, manutenção e outros. Prioridades: urgente, alta, normal e baixa.
- Arrastar cartões entre etapas e antes de outro cartão no desktop; seletor de etapa acessível por teclado e toque. O arraste é desabilitado quando há filtros ou visualização de arquivadas, evitando reordenação de listas incompletas.
- No celular, abas de etapas exibem uma coluna por vez. Formulários têm conteúdo rolável e ações sempre acessíveis.
- Busca, filtros por responsável/prioridade/prazo e resumo de abertas, para hoje, atrasadas e concluídas.
- Arquivar/restaurar tarefas, preservando informações. Limites desta versão: 500 tarefas por quadro incluindo arquivadas, 30 itens por checklist, título de 160 e orientações de 3.000 caracteres.
- Vincular uma receita permite abri-la; concluir tarefas não altera receitas, nutrição nem movimenta o estoque automaticamente.

## Persistência e acesso

`public.kitchen_boards` guarda o documento JSON e uma revisão por organização. A migração `20261103011322_kitchen_kanban.sql` habilita RLS: membros podem consultar; owner/admin/chef podem inserir e atualizar. Não há acesso anônimo nem exclusão direta pelo cliente.

Atualizações comparam a revisão carregada. Se outra sessão salvou primeiro, a alteração é rejeitada e a interface pede para atualizar o quadro. Conflitos no primeiro insert também são tratados. Uma falha nunca é apresentada como salvamento concluído. Mudanças de conta invalidam requisições pendentes e limpam o quadro da interface.

No modo Supabase, os cartões não são armazenados em localStorage. O protótipo local usa exclusivamente `fichatec_kitchen_local`. Não há nova integração externa, chave secreta ou serviço pago.

## Validação

- `node --test tests/*.test.mjs`: regras de tarefas, filtros, datas, reordenação, remoção de etapas, normalização, armazenamento local, escopo de organização e conflitos de revisão.
- Validação transacional no Supabase: escrita como owner, rejeição de revisão obsoleta, isolamento de outro usuário e leitura sem escrita como viewer. Rollback integral, sem dados de teste permanentes.
- Verificação visual e funcional em navegador, incluindo criação, checklist, alteração de etapa, personalização, recarga, arquivo e layout mobile.

Próximo passo recomendado: configurar as etapas e os responsáveis usados pela cozinha e registrar a primeira rotina de produção.
