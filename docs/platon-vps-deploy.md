# Deploy na VPS Platon

## Baseline atual

- Dominio: `https://catalogofacil.solucaoviavel.com`
- App dir: `/var/www/catalogos-api-lab/app`
- PM2 app: `catalogos-api-lab`
- Porta interna: `3000`
- Runtime: `node .next/standalone/server.js`
- Branch oficial da VPS: `main`

## Setup base ja realizado

- Ubuntu 24.04
- Node.js 20
- Nginx + Certbot
- PM2
- dependencias Linux do Playwright/Chromium
- `npx playwright install chromium`
- `.env` configurado
- Nginx apontando para `127.0.0.1:3000`

## Deploy rotineiro

Entrar na VPS como `ubuntu`, ir para o diretorio da aplicacao e rodar:

```bash
cd /var/www/catalogos-api-lab/app
bash ./scripts/deploy-platon-vps.sh
```

## O que o script faz

1. valida que existe apenas o remote `origin`
2. atualiza a branch alvo
3. roda `npm ci`
4. roda `prisma migrate deploy` e `prisma generate`
5. limpa `.next` e roda `npm run build`
6. garante Chromium do Playwright
7. reinicia a app com `.env` carregado
8. valida `/dashboard` interna e externamente

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

## Restart de env

Se alterar variaveis no `.env`, rode:

```bash
cd /var/www/catalogos-api-lab/app
bash ./scripts/restart-platon-pm2-with-env.sh
```

## Checklist pos-deploy

- confirmar `git branch --show-current` em `main`
- conferir `git log -1 --oneline`
- conferir `pm2 status`
- testar `curl -fsSI http://127.0.0.1:3000/dashboard`
- validar acesso externo em `/dashboard`
- validar login
- validar tela de integracoes
- validar exportacao PDF se a entrega mexer nisso

## Observacoes importantes

- o build usa `output: "standalone"`
- o `postbuild` prepara os assets do standalone
- `next start` nao deve ser usado nesta VPS
- se o PDF falhar por browser ausente, validar `npx playwright install chromium`
- para importar todos os produtos da Varejonline, `VAREJONLINE_PRODUCTS_MAX_ITEMS` pode ficar vazio ou usar `all`/`0`
- o ultimo `statsJson` da sync Varejonline registra `maxItems`, `pageSize`, `batchSize` e `onlyActive`
