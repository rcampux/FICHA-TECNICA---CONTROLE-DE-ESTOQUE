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

## Link local de prototipo

Sempre que uma etapa visual ou funcional for concluida, manter uma forma clara de visualizar:

- Local file: `public/index.html`.
- Servidor local: `npm run dev`.
- URL local: `http://localhost:4173/public/index.html`.

