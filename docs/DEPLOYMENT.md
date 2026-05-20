# FichaTec - Deploy e Continuidade

## Como continuar em outro computador

```bash
git clone https://github.com/rcampux/FICHA-TECNICA---CONTROLE-DE-ESTOQUE.git
cd FICHA-TECNICA---CONTROLE-DE-ESTOQUE
npm run dev
```

Depois acesse:

```text
http://localhost:4173/public/index.html
```

## GitHub

O repositorio remoto principal e:

```text
https://github.com/rcampux/FICHA-TECNICA---CONTROLE-DE-ESTOQUE
```

## Vercel

Configuracao prevista:

- Framework Preset: Other.
- Build Command: vazio.
- Output Directory: vazio ou raiz do projeto.
- Install Command: vazio ou `npm install`.
- Root Directory: raiz do repositorio.

O arquivo `vercel.json` redireciona `/` para `/public/index.html`.

Link de importacao direta:

```text
https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frcampux%2FFICHA-TECNICA---CONTROLE-DE-ESTOQUE
```

Observacao: para deploy automatico pela assistente e necessario ter Vercel CLI autenticada ou `VERCEL_TOKEN` disponivel no ambiente.

## Link local de prototipo

Sempre que uma etapa visual ou funcional for concluida, manter uma forma clara de visualizar:

- Local file: `public/index.html`.
- Servidor local: `npm run dev`.
- URL local: `http://localhost:4173/public/index.html`.

## Preview publico atual

Vercel produção:

```text
https://ficha-tecnica-controle-de-estoque.vercel.app
```

GitHub Pages:

```text
https://rcampux.github.io/FICHA-TECNICA---CONTROLE-DE-ESTOQUE/
```

Este link serve para revisao rapida em celular, tablet e desktop enquanto o deploy Vercel nao estiver autenticado.

## Deploy Vercel com token

Nunca versionar token da Vercel no repositorio.

Fluxo recomendado:

1. Criar um token em `https://vercel.com/account/tokens`.
2. Disponibilizar o token apenas como variavel de ambiente local `VERCEL_TOKEN`.
3. Rodar deploy usando a CLI da Vercel.

Exemplo no PowerShell:

```powershell
$env:VERCEL_TOKEN="seu_token_aqui"
npx vercel --prod --token $env:VERCEL_TOKEN
```

Depois do deploy, remover a variavel da sessao:

```powershell
Remove-Item Env:VERCEL_TOKEN
```
