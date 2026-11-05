# Biblioteca de ícones alimentares

Diretriz aprovada em 05/11/2026: produzir e guardar os ícones para atribuição futura, sem alterar as categorias atuais.

## Identidade
Ilustrações flat com formas orgânicas arredondadas, cores quentes, pequenos realces e sombreamento discreto. A imagem de referência fornecida pelo usuário orienta as 15 categorias, incluindo as duas alternativas de laticínios. A biblioteca final não contém a categoria de teste.

## Conteúdo
78 imagens individuais: 15 categorias, 12 ingredientes especiais, 20 frutas, 18 vegetais e grãos, 13 ingredientes e frutos do mar. Os arquivos de consumo são WebP de 512 × 512, com fundo branco, identificador estável e SHA-256 no manifesto. Os PNGs originais e os prompts ficam em output/food-icons.

Fonte de seleção: [Unicode Emoji 18.0](https://unicode.org/emoji/charts/emoji-list.html), consultada em 05/11/2026. Foram consideradas todas as frutas e vegetais da lista oficial. Feijão está no grupo especial, sem cópia redundante. Os frutos do mar são representados como ingredientes. Ervas e arroz em grãos complementam os símbolos botânicos.

Pratos preparados, doces, confeitaria, frituras e bebidas prontas foram excluídos. A lista atual 18.0 também foi conferida: picles (U+1FADD) foi excluído por ser processado. Os itens da referência e os solicitados nominalmente são exceções autorizadas: categorias com pão, massa, iogurte, queijo e proteína preparada; leite condensado, doce de leite, enlatados e sorvete. Sorvete é representado por um recipiente de massa e bolas, sem casquinha ou máquina de soft serve. Cogumelo foi representado como variedade comestível marrom; não se produziu o cogumelo vermelho associado à toxicidade.

## Persistência e uso posterior
Tabela public.food_icon_library, isolada por organization_id e com RLS baseada nos helpers existentes de associação e escrita. Cada registro contém os bytes reais da imagem, MIME, dimensões, rótulo, coleção, Unicode e hash. Não há nova coluna de ícone em product_categories nem atribuição automática.

A biblioteca pertence à organização do cadastro original de categorias de r.camposdesign. A política de acesso não torna imagens nem dados do usuário públicos. Não usar chave privilegiada no navegador.

- Arquivos: assets/icons/food-flat-v1/manifest.json.
- PDF de revisão: output/pdf/biblioteca-icones-alimentares.pdf.
- Fontes de geração: output/food-icons/generation-manifest.json.
- Esquema de referência: docs/schema/food_icon_library.sql; migração aplicada via Supabase MCP.
- Reconstrução do PDF: executar scripts/build-food-icon-catalog.py com o Python do runtime que fornece Pillow, ReportLab e pypdfium2.

Atualização autorizada em 05/11/2026: reutilizar os 78 ícones na seleção de ingredientes da Ficha, somente depois da inclusão no popup. Correspondência por nome/tipo e alternativa por categoria, sem exibição de ícones alimentares no popup, na busca ou na lista confirmada. O manifesto e os WebPs são assets visuais do app; as políticas da tabela permanecem intactas. Especificação e validação em RECIPE_CREATION_JOURNEY.md.
