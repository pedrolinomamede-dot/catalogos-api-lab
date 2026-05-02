# Deploy na VPS Platon

## Baseline atual

- Dominio: `https://catalogofacil.solucaoviavel.com`
- App dir: `/var/www/catalogos-api-lab/app`
- PM2 app: `catalogos-api-lab`
- Porta interna: `3000`
- Runtime: `node .next/standalone/server.js`

## Primeiro setup

O setup inicial da VPS ja foi feito manualmente:

- Ubuntu 24.04
- Node.js 20
- Nginx + Certbot
- PM2
- Dependencias Linux do Playwright/Chromium
- `npx playwright install chromium`
- `.env` configurado
- Nginx apontando para `127.0.0.1:3000`

## Update rotineiro

Entrar na VPS como `ubuntu`, ir para o diretorio da aplicacao e rodar:

```bash
cd /var/www/catalogos-api-lab/app
bash ./scripts/deploy-platon-vps.sh
```

## O que o script faz

1. valida que so existe o remote `origin`
2. atualiza a branch alvo
3. roda `npm ci`
4. roda `prisma migrate deploy` e `prisma generate`
5. roda `npm run build`
6. prepara os assets do standalone
7. garante o Chromium do Playwright
8. carrega o `.env` e reinicia o PM2
9. valida `/dashboard` interna e externamente

## Variaveis opcionais

O script aceita overrides por ambiente:

```bash
APP_DIR=/var/www/catalogos-api-lab/app \
APP_NAME=catalogos-api-lab \
APP_PORT=3000 \
APP_DOMAIN=catalogofacil.solucaoviavel.com \
BRANCH=main \
bash ./scripts/deploy-platon-vps.sh
```

## Observacoes importantes

- O build usa `output: "standalone"`
- O `postbuild` copia `public/` e `.next/static` para dentro de `.next/standalone`
- `next start` nao deve ser usado na VPS atual
- Se o PDF falhar por browser ausente, validar `npx playwright install chromium`
- Se alterar variaveis da Varejonline no `.env`, rode:

```bash
cd /var/www/catalogos-api-lab/app
bash ./scripts/restart-platon-pm2-with-env.sh
```

- O ultimo `statsJson` da sync Varejonline registra os valores efetivos de:
  `maxItems`, `pageSize`, `batchSize` e `onlyActive`
