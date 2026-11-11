# Continuar o FichaTec / NK Control em outro computador

## 1. Baixar o projeto

Instale Git e Node.js 24 (com npm). Entre na conta GitHub com acesso ao repositório.

```bash
git clone https://github.com/rcampux/FICHA-TECNICA---CONTROLE-DE-ESTOQUE.git
cd FICHA-TECNICA---CONTROLE-DE-ESTOQUE
npm ci
npm run build
npm run dev
```

Abra **http://localhost:4173/public/index.html**. Deixe o terminal aberto; Ctrl+C encerra o servidor. No editor ou no Codex, abra a pasta que contém `package.json`, `AGENTS.md`, `src` e `public`.

Esse primeiro fluxo usa dados locais do navegador. Não depende de serviços externos para abrir a interface. Dados criados apenas no modo local do navegador do PC antigo não acompanham o clone.

Após alterar `src/` ou `assets/`, execute `npm run build` novamente e atualize a página. `public/src/`, `public/assets/` e `public/release.json` são gerados pelo build; não edite essas cópias.

## 2. Conectar aos serviços já existentes

Não crie outro projeto de produção. O projeto Vercel existente é **nk-control**, na equipe **rcampuxs-projects**; o endereço é https://nk-control.vercel.app.

Para recuperar a configuração de desenvolvimento com sua própria sessão:

```bash
npm install --global vercel
vercel login
vercel link --project nk-control --scope rcampuxs-projects
vercel env pull .env.local --environment development
```

Confira no painel se as variáveis listadas em `.env.example` estão configuradas para Development. Se estiverem apenas em Production, configure os valores apropriados para desenvolvimento com o administrador do projeto. O clone não contém senhas ou chaves privadas. Não publique `.env.local`, tokens ou arquivos de sessão.

O projeto não carrega arquivos `.env` automaticamente. Para utilizar `.env.local` com Node.js 24:

```bash
node --env-file=.env.local scripts/sync-public-assets.mjs
node --env-file=.env.local scripts/dev-server.mjs
```

Para autenticação e dados remotos, são necessárias `FICHATEC_DATA_MODE=supabase`, `FICHATEC_SUPABASE_URL` e `FICHATEC_SUPABASE_ANON_KEY`. A pesquisa de preços utiliza `SERPAPI_API_KEY` somente no servidor. A pesquisa nutricional não exige chave adicional.

Receitas, produtos e imagens salvos online continuam na conta existente: acesse com o mesmo usuário. O repositório contém as migrations e funções, não uma exportação dos dados privados dos clientes. Não reaplique migrations nem redefina o serviço de produção só por trocar de computador. Veja `SUPABASE_SETUP.md` para infraestrutura e `AUTH_EMAILS.md` para e-mails; as configurações de envio continuam nos serviços existentes.

## 3. Arquivos incluídos

| Pasta | Conteúdo |
| --- | --- |
| `src`, `api`, `public`, `icons` | Aplicativo, endpoints e entradas públicas |
| `assets` | Fotografias, fontes e os 89 ícones WebP utilizados pelo app |
| `supabase` | Migrations, políticas, funções e template de confirmação |
| `tests`, `scripts` | Testes e ferramentas de desenvolvimento |
| `docs`, `AGENTS.md` | Regras, decisões, design, arquitetura e orientações |
| `output/food-icons` | 78 originais PNG, prompts, catálogo e pranchas da biblioteca inicial |
| `output/food-icons-extension` | 11 originais PNG dos ícones adicionais |
| `output/new-icons.json` | Manifesto da ampliação com caminhos relativos ao repositório |
| `output/new-food-icons-preview.png` | Prévia da ampliação |
| `output/pdf` | Catálogo PDF de revisão dos 78 ícones iniciais |
| `output/icon-tools` | Manifesto e lockfile da ferramenta opcional de imagens |

Os manifestos de geração apontam para os originais versionados, sem depender da pasta pessoal do computador antigo. A biblioteca atual de consumo está em `assets/icons/food-flat-v1/manifest.json`; o catálogo inicial de 78 itens é histórico. Não execute a reconstrução do catálogo inicial sobre a biblioteca atual sem incorporar também a ampliação de 11 ícones.

As ferramentas opcionais de catálogo usam Python, Pillow, ReportLab e pypdfium2. O script de PDF usa as fontes Arial do Windows. Isso não é necessário para iniciar, testar ou desenvolver o aplicativo. As ferramentas de imagem opcionais podem ser instaladas com `npm ci --prefix output/icon-tools`.

Caches, dependências instaladas, sessões de login, capturas privadas de QA e cópias de deploy antigas não fazem parte do código-fonte. São mantidos fora do Git. Os materiais de revisão em `output/` também são excluídos do envio pela CLI da Vercel.

## 4. Conferir e continuar trabalhando

```bash
npm run check
node --test tests/*.test.mjs
npm run build
git status
```

Antes de começar em outro PC, execute `git pull --ff-only` para obter mudanças mais recentes. Ao terminar uma etapa, faça commit e push dos arquivos desejados. Use `.env.example` apenas como referência sem segredos.

**Próximo passo:** clonar este repositório no novo PC, abrir o modo local e depois conectar a configuração de desenvolvimento para testar sua conta existente.
