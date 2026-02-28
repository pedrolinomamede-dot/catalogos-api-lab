# Sistema de Catalogos Ipe

Aplicacao full-stack em `Next.js` para operacao de catalogos B2B.

## Escopo

- Admin V2 para Base Geral, categorias, catalogos e share links
- Importacao de CSV e imagens por SKU
- Catalogo publico por token em `/s/[token]`
- Geracao de PDF via engine HTML (`Playwright`)
- Persistencia com `PostgreSQL` + `Prisma`

## Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS`
- `NextAuth`
- `Prisma`
- `PostgreSQL`
- `playwright-core`

## Estrutura principal

- `app/`: rotas App Router, APIs e telas
- `components/`: UI admin, auth, publico e PDF
- `lib/`: clientes API, auth, PDF, storage, validacoes e utilitarios
- `prisma/`: schema, migrations e seed
- `public/`: assets publicos necessarios ao runtime
- `files/`: documentacao estrutural selecionada
- `v2/`: notas e mapeamentos da arquitetura V2

## O que esta nesta copia

Esta exportacao foi curada para manter apenas o que eh necessario para construir, executar e entender o projeto:

- codigo-fonte
- configuracoes de build e lint
- schema/migrations Prisma
- assets publicos do app
- documentacao principal da arquitetura

Nao foram incluidos:

- `public/uploads/`
- artefatos locais de analise
- dumps, PDFs e planilhas de referencia
- pastas auxiliares de agentes/IDE
- logs e arquivos temporarios

## Setup

1. Instale dependencias:

```bash
npm ci
```

2. Configure o ambiente:

```bash
cp .env.example .env
```

3. Aplique as migrations:

```bash
npx prisma migrate deploy
npx prisma generate
```

4. Rode localmente:

```bash
npm run dev
```

## Build de producao

```bash
npm run build
npm run start
```

## Observacoes de deploy

- O app espera `PostgreSQL` acessivel via `DATABASE_URL`.
- Para PDF HTML em producao, o servidor precisa de um navegador compativel e `PDF_HTML_BROWSER_PATH` configurado.
- Uploads de imagens nao fazem parte deste repositorio. Em runtime, use storage local ou S3 conforme as variaveis de ambiente.

## Documentacao adicional

Os arquivos em `files/` e `v2/` concentram o contexto arquitetural e funcional usado para continuidade do projeto.
