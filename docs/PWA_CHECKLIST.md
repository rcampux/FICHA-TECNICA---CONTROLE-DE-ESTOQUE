# FichaTec - Checklist PWA

Este documento acompanha a evolucao do app como PWA instalavel.

## Implementado

- `manifest.webmanifest` na raiz do projeto.
- `service-worker.js` v14 com invalidação das versões anteriores, app shell visual completo e atualização imediata das abas controladas.
- Copia dos assets PWA em `public/` para publicacao correta na Vercel.
- Build `npm run build` sincroniza `src`, assets e o Service Worker canônico para `public/`, garantindo CSS, JS e estratégia de atualização coerentes na Vercel.
- Registro não bloqueante de `/service-worker.js` em `src/pwa/registerServiceWorker.js`, com limpeza única dos caches da interface por release sem apagar sessão ou dados do usuário.
- Atualizacao resiliente na inicializacao, no retorno da rede e ao retomar a pagina, com ativacao da nova versao e uma unica recarga controlada.
- Icone SVG temporario em `icons/icon.svg`.
- Icones PNG temporarios em `icons/icon-192.png` e `icons/icon-512.png`.
- Metatags mobile e `theme-color` no HTML principal.
- Atalho PWA para abrir o scanner via `?action=scanner`, aguardando splash e autenticacao sem bloquear a interface.

## Estrategia Atual

- Cache-first somente para arquivos estáticos não críticos; imagens e ícones publicados exigem revalidação HTTP em vez de permanecer imutáveis.
- Network-first para navegacao, com fallback para app shell.
- Sem cache para rotas `/api/`, porque scanner/IA e futuras chamadas autenticadas devem buscar dados atuais.
- O app shell inclui o controle de acesso por plano e a imagem principal da experiencia inicial.
- Cache inicial usa `Promise.allSettled` para que um asset 404 nao derrube o service worker nem cancele CRUD/Auth/Supabase.
- Falhas de registro ou atualizacao sao isoladas e nunca seguram o splash, o login ou o restante do app.

## Validacao Manual

1. Abrir a URL publicada no celular.
2. Verificar se o navegador oferece instalacao/adicionar a tela inicial.
3. Instalar o app.
4. Abrir instalado e navegar entre Ficha, Virtual, Fisico e Receitas.
5. Ativar modo aviao e validar se a interface base ainda abre.
6. Voltar online e confirmar que o app verifica atualizacoes sem travar a interface.
7. Abrir `/?action=scanner`, autenticar se necessario e confirmar que o scanner abre uma unica vez.
8. Testar scanner quando a API estiver configurada.

## Pendencias Futuras

- Trocar icone temporario pelo logo oficial.
- Revisar splash screen em iOS/Android depois do logo oficial.
- Adicionar pagina offline dedicada quando houver rotas reais.
- Ajustar estrategia de cache depois da migracao para Supabase.
- Validar instalabilidade com Lighthouse depois do deploy de producao.
