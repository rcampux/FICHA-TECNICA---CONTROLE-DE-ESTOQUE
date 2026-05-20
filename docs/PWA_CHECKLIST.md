# FichaTec - Checklist PWA

Este documento acompanha a evolucao do app como PWA instalavel.

## Implementado

- `manifest.webmanifest` na raiz do projeto.
- `service-worker.js` com cache do app shell.
- Copia dos assets PWA em `public/` para publicacao correta na Vercel.
- Registro do service worker em `src/pwa/registerServiceWorker.js`.
- Icone SVG temporario em `icons/icon.svg`.
- Icones PNG temporarios em `icons/icon-192.png` e `icons/icon-512.png`.
- Metatags mobile e `theme-color` no HTML principal.
- Atalho PWA para abrir o scanner via `?action=scanner`.

## Estrategia Atual

- Cache-first para arquivos estaticos do app.
- Network-first para navegacao, com fallback para app shell.
- Sem cache para rotas `/api/`, porque scanner/IA e futuras chamadas autenticadas devem buscar dados atuais.

## Validacao Manual

1. Abrir a URL publicada no celular.
2. Verificar se o navegador oferece instalacao/adicionar a tela inicial.
3. Instalar o app.
4. Abrir instalado e navegar entre Ficha, Virtual, Fisico e Receitas.
5. Ativar modo aviao e validar se a interface base ainda abre.
6. Voltar online e testar scanner quando a API estiver configurada.

## Pendencias Futuras

- Trocar icone temporario pelo logo oficial.
- Revisar splash screen em iOS/Android depois do logo oficial.
- Adicionar pagina offline dedicada quando houver rotas reais.
- Ajustar estrategia de cache depois da migracao para Supabase.
- Validar instalabilidade com Lighthouse depois do deploy de producao.
