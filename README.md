# Catalogo Facil

Aplicacao full-stack em `Next.js` para operacao de catalogos B2B, com Base Geral local, composicao de catalogos, publicacao por Share Link e geracao de PDF.

## Escopo

- Admin V2 para Base Geral, categorias, catalogos, integracoes e share links
- Importacao de CSV e imagens por SKU
- Base Geral multi-origem: `manual`, `csv` e `integration`
- Catalogo publico por token em `/s/[token]`
- Geracao de PDF via engine HTML (`Playwright`)
- Persistencia com `PostgreSQL` + `Prisma`
- Core generico de integracoes ERP com primeiro provider previsto: `Varejonline`

## Modos de operacao

- `manual_csv`: a Base Geral pode ser alimentada manualmente ou por planilha, como no fluxo atual
- `integration`: a Base Geral continua local, mas pode ser sincronizada a partir de um ERP

Em ambos os casos:

- a importacao CSV da Base Geral continua disponivel
- a importacao de codigos dentro do catalogo continua disponivel
- PDF e Share Link dependem de snapshot do item do catalogo, nao do ERP ao vivo

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
- `lib/`: clientes API, auth, PDF, storage, snapshots, integracoes e utilitarios
- `prisma/`: schema, migrations e seed
- `public/`: assets publicos necessarios ao runtime
- `files/`: documentacao estrutural selecionada
- `v2/`: notas e mapeamentos da arquitetura V2

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
- Defina `PDF_RENDER_BASE_URL` para a URL interna do app no servidor, por exemplo `http://127.0.0.1:3000`.
- Em producao, mantenha `PDF_HTML_ALLOW_NATIVE_FALLBACK=false` para evitar regressao silenciosa para o layout nativo.
- Para uploads locais persistentes, use `LOCAL_UPLOAD_DIR` absoluto fora da release, por exemplo `/srv/catalogo-facil/uploads`.
- Sirva `/uploads/` diretamente pelo `Nginx` com `alias` para o diretorio persistente.
- Uploads de imagens nao devem depender da pasta versionada do repositorio.
- Para integracoes ERP, defina `INTEGRATIONS_SECRET_KEY` ou reaproveite `NEXTAUTH_SECRET`.
- O callback OAuth deve apontar para `/api/v2/integrations/callback/[PROVIDER]`.
- O provider Varejonline ja possui scaffold de OAuth; sincronizacao real de produtos depende do contrato oficial dos endpoints de negocio.

Exemplo de bloco `Nginx` para uploads persistentes:

```nginx
location /uploads/ {
    alias /srv/catalogo-facil/uploads/;
    try_files $uri =404;
    access_log off;
    expires 7d;
    add_header Cache-Control "public, max-age=604800";
}
```

## Documentacao adicional

Os arquivos em `files/` e `v2/` concentram o contexto arquitetural e funcional usado para continuidade do projeto.
