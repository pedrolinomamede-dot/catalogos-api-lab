# CLAUDE.md — Sistema de Catalogos API (LAB)

## Quem sou eu neste projeto

Sou o assistente de desenvolvimento do Pedro Mamede. Trabalho como engenheiro full-stack neste projeto, responsavel por implementar features, corrigir bugs, fazer deploys e tomar decisoes arquiteturais. Nao sou apenas um assistente de perguntas — eu codifico, commito, faço push, e entrego.

## Como eu trabalho

### Modo de raciocinio
- Antes de codar, leio os arquivos relevantes para entender o que ja existe
- Nunca proponho mudancas em codigo que nao li
- Prefiro editar arquivos existentes a criar novos (evita file bloat)
- Quando uma tarefa e grande, quebro em fases e uso agentes paralelos para acelerar
- Valido sempre com `npm run build` antes de commitar
- Mantenho respostas curtas e diretas — sem enrolacao

### Modo de acao
- Executo as tarefas direto, sem ficar perguntando demais. O Pedro prefere acao a discussao
- Quando preciso de clarificacao, pergunto de forma objetiva com opcoes claras
- Faco commit com mensagens semanticas (feat, fix, refactor, chore) e sempre incluo Co-Authored-By
- Nunca faco push sem confirmar com o Pedro primeiro
- Apos commit+push, forneço o bloco de deploy pronto para o servidor

### Padrao de comunicacao
- Respostas concisas, sem emoji (a menos que o Pedro peça)
- Uso tabelas para comparacoes
- Codigo em blocos formatados
- Status updates curtos em marcos naturais
- Nao repito o que o Pedro disse — apenas executo

---

## O Projeto

**Nome:** Catalogo Facil (Ipe Distribuidora)
**Stack:** Next.js 16.1.1 (App Router), React 19, TypeScript, Tailwind CSS 3.4, Prisma 7.2, PostgreSQL
**Funcao:** Sistema SaaS multi-tenant para distribuidoras criarem catalogos de produtos e exportarem como PDF
**Dominio:** catalogofacil.solucaoviavel.com

### Funcionalidades principais
1. **Dashboard** — Visao geral com contadores, acoes rapidas, busca (visual glassmorphism com purple accents)
2. **Produtos Base V2** — CRUD com imagens otimizadas (Sharp → WebP), categorias, subcategorias
3. **Catalogos V2** — Montar catalogos selecionando produtos, customizar visual (cores stripe, fontes, logo)
4. **Share Links** — Links publicos com token para compartilhar catalogos
5. **Exportacao PDF** — 3 templates (classic, dark_neon, glassmorphism) via Playwright HTML→PDF
6. **Integracoes ERP** — VarejoOnline, OMIE, Tiny, Bling (OAuth/credentials, sync, webhooks)
7. **Auth** — NextAuth.js com credentials (email/senha, bcrypt, JWT 7 dias)
8. **Storage** — Dual: local (`/public/uploads`) ou S3/Supabase Storage (abstracao pronta em `lib/storage/`)

### Arquitetura de PDFs (importante)
O motor de PDF e a feature mais complexa do sistema:

- **Engine HTML (principal):** Playwright abre Chromium headless, navega para `/pdf-render/catalog?token=X`, espera `[data-pdf-ready="true"]`, chama `page.pdf()`
- **Engine Nativo (fallback):** React server-side rendering direto para PDF
- **Browser resolution:** `@sparticuz/chromium` (containers/serverless) → local browsers (dev)
- **Pagination:** `lib/pdf/html/pdf-page-builder.ts` — engine compartilhada que calcula quebras de pagina em mm
- **3 temas visuais implementados:**
  - `catalog-pdf-classic.tsx` — Neumorphism (#E2E7E9, sombras embossadas, SKU laranja com glow)
  - `catalog-pdf-dark.tsx` — Dark Neon (#0A0A0B, cyan #00F2FF, grid tecnico, vignette)
  - `catalog-pdf-glass.tsx` — Glassmorphism (aurora orbs, glass panels, blur, #13c8ec accent)
- **Router:** `catalog-pdf-document.tsx` — thin router que delega ao tema correto baseado em `data.templateVersion`
- **Selecao de tema:** API aceita `?theme=dark_neon|glassmorphism|classic` no endpoint `/api/v2/share-links/[id]/pdf`
- **Dialog UI:** `components/pdf/pdf-theme-selector.tsx` — seletor visual na dashboard
- **Catalog-intro removido** — O header pill (logo + nome + ano) foi removido do PDF para maximizar espaco de produtos

### Paginacao PDF — Constantes atuais
```
PAGE_HEIGHT_MM = 373.3
SAFE_TOP_MM = 8
SAFE_BOTTOM_MM = 14
DATE_ROW_RESERVE_MM = 4
PAGE_CONTENT_HEIGHT_MM = 347.3  (373.3 - 8 - 14 - 4)

BLOCK_HEIGHT_MM:
  catalogIntro: 42  (nao usado — removido)
  lineHeader: 16
  groupLeadCompact: 85
  groupLeadWide: 95
  groupRowCompact: 68
  groupRowWide: 78
  catalogEmpty: 28

Meta: 4 fileiras de produtos por pagina (4 × 85 = 340 < 347.3)
```

### CSS Overrides criticos para PDF
Cada tema tem no `<style>` block overrides para anular interferencia do `globals.css`:
```css
html, body {
  margin: 0;
  padding: 0;
  overflow: visible !important;
  max-width: none !important;
  height: auto !important;
  background: transparent !important;
}
```
Sem isso, `overflow-x: clip` e `max-width: 100vw` do globals.css criam clipping contexts que impedem multi-pagina.

### Pagina dimensoes PDF
- `@page { size: 210mm 373.3mm; margin: 0; }`
- Fontes via Google Fonts `@import` no `<style>`
- `data-pdf-ready="true"` no `<main>` para Playwright detectar readiness

---

## Infraestrutura Atual

### Arquitetura
| Servico | Funcao | Status |
|---------|--------|--------|
| **VPS Platon 8GB** | Hospedar Next.js + Playwright/Chromium (PDFs) | ATIVO |
| **Supabase Database** | PostgreSQL gerenciado | ATIVO |
| **Supabase Storage** | Imagens de produtos (S3-compatible) | ATIVO |
| **Railway** | ABANDONADO — Chromium crasha por restricoes seccomp | DESATIVADO |

### VPS Platon Host
- **Plano:** VPS 8GB (4 vCPU, 8GB RAM, 100GB SSD)
- **SO:** Ubuntu 24.04 LTS
- **Zona:** Brasil - Sudeste
- **IP:** 104.234.41.50
- **Dominio:** https://catalogofacil.solucaoviavel.com
- **App dir:** `/var/www/catalogos-api-lab/app`
- **Uploads dir:** `/var/www/catalogos-api-lab/uploads`
- **PM2 app:** `catalogos-api-lab`
- **Porta interna:** `3000`
- **Nginx:** proxy reverso ativo com SSL via Let's Encrypt
- **Snapshot baseline:** `baseline-catalogofacil-2026-04-04`
- **Custo:** R$79,92/mês (com desconto primeira fatura)

### Supabase
- **Projeto:** sistema-catalogos-api-lab
- **URL:** https://lbrxgjueihahqlmnuvhk.supabase.co
- **Database:** PostgreSQL via Session Pooler (IPv4)
- **Storage bucket:** `product-images`
- **Storage mode na VPS:** `STORAGE_DRIVER=s3`

### Dominio
- **catalogofacil.solucaoviavel.com** — DNS apontado para `104.234.41.50`
- **HTTPS:** ATIVO

---

## Repositorio e Branches

### REGRAS CRITICAS — NUNCA VIOLAR
1. **Clonar APENAS de `catalogos-api-lab`** — nao ha conexao com repositorio principal
2. **Unica remote deve ser `origin` → LAB** — nenhuma outra remote deve existir
3. **Sempre validar com `git remote -v` antes de push** — deve mostrar APENAS origin

### Git Remote (esperado)
```
origin  → github.com/pedrolinomamede-dot/catalogos-api-lab.git (UNICO PERMITIDO)
```

### O que NAO deve existir
```
❌ catalogos-api  (NUNCA adicionar)
❌ principal      (NUNCA adicionar)
❌ nenhum outro remote
```

### Branches
- **main** — branch de producao atualmente publicada na VPS Platon
- **codex/main-updated-continuation** — branch local de continuidade para novos ajustes
- **Branches historicas preservadas:** `codex/dashboard-overview-functional`, `codex/dashboard-overview-functional-0Gl51`

---

## Estrutura de Pastas Chave

```
app/
  api/
    auth/           — NextAuth ([...nextauth], signup, me)
    v2/
      base-products/ — CRUD produtos
      catalogs/      — CRUD catalogos + items + snapshots + PDF
      categories/    — Categorias hierarquicas
      dashboard/     — Summary endpoint
      integrations/  — ERP connections, sync, webhooks, callbacks
      share-links/   — Links publicos + PDF export
  dashboard/         — UI pages (overview, products, catalogs, settings, share-links, integrations)
  pdf-render/        — Pagina interna que Playwright navega para gerar PDF

components/
  pdf/
    catalog-pdf-document.tsx  — Router de temas
    catalog-pdf-classic.tsx   — Tema Neumorphism
    catalog-pdf-dark.tsx      — Tema Dark Neon
    catalog-pdf-glass.tsx     — Tema Glassmorphism
  dashboard/                  — Componentes da dashboard (glassmorphism)
  auth/                       — LoginForm, SignupForm

lib/
  pdf/
    html/
      pdf-page-builder.ts      — Engine de paginacao compartilhada (buildPdfPages)
      share-link-html-pdf.ts   — Playwright PDF generation (usa @sparticuz/chromium em containers)
      pdf-render-payload-store.ts — Token-based temp storage
    render-pdf.ts              — Orquestrador de engines
    share-link-pdf.ts          — Tipos ShareLinkPdfData, ShareLinkPdfCatalog
    themes/corporate-v1.ts     — PdfTemplateVersion type
    product-row-layout.ts      — Grid 4/5 colunas
  catalog/
    line-grouping.ts           — Agrupamento Linha → Categoria → Medida
    image-layout.ts            — Zoom/offset/trim por produto
    image-size-band.ts         — Categorizacao de tamanho
  storage/
    index.ts                   — Factory (local ou S3, baseado em STORAGE_DRIVER env)
    local.ts                   — Storage local (/public/uploads)
    s3.ts                      — Storage S3 (Supabase Storage compatible)
    storage.ts                 — Interface StorageDriver
  uploads/
    image-upload.ts            — Handler de upload (Sharp → WebP + thumbnails)
  auth.ts                      — Config NextAuth
  integrations/
    core/secrets.ts            — Criptografia AES-256-GCM para tokens ERP
  prisma.ts                    — Prisma client singleton

prisma/
  schema.prisma                — 21 models, PostgreSQL
  migrations/                  — 19 migrations
```

---

## Historico de Decisoes Importantes

1. **Dashboard Glassmorphism** — Visual transformado de dark leather → glassmorphism com purple accents (`#9b8bf4`). Cards usam `bg-white/10 backdrop-blur-xl border border-white/50`.

2. **PDF Multi-Tema** — Arquitetura hibrida: engine de paginacao compartilhada (`buildPdfPages`) + 3 renderers visuais separados + router fino. Tema selecionado via `?theme=` query param.

3. **Classic = Neumorphism** — O tema Classic usa visual Neumorphism verdadeiro (nao flat): fundo `#E2E7E9`, sombras 4 camadas embossadas, SKU laranja com glow, pills, text-shadows.

4. **motion.div type fix** — `DashboardSurfaceCardProps` nao pode extender `HTMLAttributes<HTMLDivElement>` porque causa conflito de tipo com `onDrag` do motion.div. Props devem ser explicitas.

5. **PDF blank pages fix** — Removido `displayHeaderFooter: true` e setado margins para `"0mm"` no Playwright. A data ja e renderizada dentro do `PdfPageFrame` React.

6. **PDF multi-pagina fix (2026-03-30)** — O `globals.css` aplicava `overflow-x: clip` e `max-width: 100vw` no body, criando clipping contexts que impediam `page.pdf()` de gerar multiplas paginas. Fix: CSS overrides com `!important` nos `<style>` blocks de cada tema PDF.

7. **Catalog-intro removido (2026-03-30)** — Header pill (logo + nome catalogo + ano) removido do PDF para maximizar espaco. Cada pagina agora cabe 4 fileiras de produtos.

8. **Paginacao ajustada (2026-03-30)** — `groupLeadCompact` aumentado de 72→85mm para contabilizar PdfMeasureStripe (~10mm) e mt-3 (~3mm) que nao estavam no calculo.

9. **@sparticuz/chromium (2026-03-30)** — Playwright bundled Chromium e system Chromium crasham no Railway (SIGTRAP por seccomp). `@sparticuz/chromium` funciona em containers restritos. Adicionado como dependencia + `serverExternalPackages` no next.config.

10. **Abandono Railway → VPS Platon (2026-04-04)** — Railway deu muitos problemas: Chromium crashes, filesystem efemero (perde imagens), importacao de planilhas falhando. Decisao: migrar para VPS Platon 8GB (4 vCPU, 8GB RAM, 100GB SSD, Ubuntu 24.04 LTS, Sudeste BR) + manter Supabase para database. Custo: R$79,92/mês fixo vs Railway variavel.

11. **Baseline funcional na Platon (2026-04-04)** — App publicada em `https://catalogofacil.solucaoviavel.com` com Nginx + PM2 + Certbot. O runtime correto e `node .next/standalone/server.js`; `next start` nao funciona com `output: "standalone"`.

12. **Standalone exige assets copiados (2026-04-04)** — Para o frontend funcionar no modo standalone, foi necessario copiar `public/` para `.next/standalone/public` e `.next/static` para `.next/standalone/.next/static` antes de subir o servidor.

13. **Playwright browser real na VPS (2026-04-04)** — Mesmo com as libs Linux instaladas, a exportacao PDF so funcionou apos `npx playwright install chromium` e `sudo npx playwright install-deps chromium`. Resultado final: PDF validado com sucesso na VPS.

14. **Baseline congelada (2026-04-04)** — Backups locais criados: `.env.backup-2026-04-04`, `catalogos-api-lab.backup-2026-04-04` no Nginx, `pm2 save` executado e snapshot `baseline-catalogofacil-2026-04-04` criado na Platon.

---

## Plano de Migracao Atual

### Fase 1: VPS Platon (BASE FUNCIONAL CONCLUIDA)
1. Provisionar VPS → FEITO
2. Setup servidor (Node.js, Nginx, PM2, Certbot, Playwright) → FEITO
3. Clonar repo e deploy da aplicacao → FEITO
4. Apontar DNS catalogofacil.solucaoviavel.com para IP da VPS → FEITO
5. SSL com Let's Encrypt → FEITO
6. Validar dashboard + PDF real → FEITO

### Fase 2: Storage (ATIVO NO BASELINE)
- Bucket `product-images` em uso
- Env vars S3 configuradas na VPS
- `STORAGE_DRIVER=s3` ativo
- Revisar somente se houver necessidade de rotacao de credenciais ou reorganizacao de bucket

### Fase 3: Auth (FUTURO)
- Substituir NextAuth por Supabase Auth
- Arquivos a modificar:
  - `lib/auth.ts` → Supabase Auth
  - `middleware.ts` → Supabase session
  - `app/api/auth/[...nextauth]/route.ts` → Remover
  - `app/api/auth/signup/route.ts` → Reescrever
  - `components/auth/LoginForm.tsx` → Supabase signIn
  - `components/auth/SignupForm.tsx` → Supabase signUp

---

## Setup VPS (Ubuntu 24.04 LTS)

### Pacotes necessarios
```bash
# Base
apt update && apt upgrade -y
timedatectl set-timezone America/Sao_Paulo
apt install -y git curl ca-certificates gnupg build-essential pkg-config

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

# Nginx + Certbot
apt install -y nginx certbot python3-certbot-nginx

# Chromium deps (Ubuntu 24.04)
apt install -y \
  libnss3 \
  libatk1.0-0t64 \
  libatk-bridge2.0-0t64 \
  libcups2t64 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libpango-1.0-0 \
  libcairo2 \
  libasound2t64 \
  libxshmfence1 \
  fonts-noto-color-emoji \
  fonts-freefont-ttf

# Browser do Playwright
sudo npx playwright install-deps chromium
npx playwright install chromium
```

### Bloco de Deploy na VPS
Apos commit+push para `origin main`, fornecer este bloco para o Pedro executar no servidor:

```bash
set -euo pipefail
export PM2_HOME=/home/ubuntu/.pm2

APP_DIR="/var/www/catalogos-api-lab/app"
APP_NAME="catalogos-api-lab"
APP_PORT="3000"
BRANCH="main"

cd "$APP_DIR"

echo "== Validando remoto =="
git remote -v

echo "== Atualizando branch =="
git fetch origin "$BRANCH" --prune
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "== Instalando dependencias =="
npm ci --no-audit --no-fund

echo "== Prisma =="
npx prisma migrate deploy
npx prisma generate

echo "== Build =="
npm run build

echo "== Preparando standalone =="
mkdir -p .next/standalone/.next
rm -rf .next/standalone/public
rm -rf .next/standalone/.next/static
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

echo "== Garantindo Chromium do Playwright =="
npx playwright install chromium

echo "== Reiniciando app =="
pm2 restart "$APP_NAME" --update-env || \
  HOSTNAME=0.0.0.0 PORT="$APP_PORT" pm2 start .next/standalone/server.js --name "$APP_NAME"
pm2 save

echo "== Aguardando app subir =="
sleep 8

echo "== Validando =="
ss -ltnp | grep ":${APP_PORT}" || true
curl -fsSI "http://127.0.0.1:${APP_PORT}/dashboard" || true
curl -fsSI "https://catalogofacil.solucaoviavel.com/dashboard" || true

echo "DEPLOY_OK branch=${BRANCH}"
```

---

## Comandos Uteis (desenvolvimento)

```bash
# Dev local
npm run dev

# Build (sempre rodar antes de commit)
npm run build

# Prisma
npx prisma migrate deploy
npx prisma generate
npx prisma studio

# Push para main (producao)
git push origin main

# Push para branch de ajustes atual
git push origin codex/main-updated-continuation

# Verificar remotes (deve ser APENAS origin)
git remote -v

# Playwright deps/browser (Linux)
sudo npx playwright install-deps chromium
npx playwright install chromium

# PM2 standalone
HOSTNAME=0.0.0.0 PORT=3000 pm2 start .next/standalone/server.js --name catalogos-api-lab
pm2 restart catalogos-api-lab --update-env
```

---

## Seguranca: O que NUNCA fazer

- ❌ Adicionar remote `catalogos-api` ou `principal` — isso cria conexao com producao
- ❌ Fazer `git push` sem especificar o remote — sempre use `git push origin`
- ❌ Clonar de qualquer lugar que nao seja `catalogos-api-lab`
- ❌ Mergear branches de fora
- ❌ Commitar senhas, tokens ou chaves de API no repositorio

O LAB deve **sempre** ser isolado do principal.

---

## Sobre o Pedro

- Desenvolvedor full-stack construindo este SaaS para distribuidoras
- Prefere acao direta a discussao longa
- Gosta de ver resultados visuais rapido
- Trabalha com ambiente LAB isolado para experimentar antes de producao
- Migrou do Windows para Zorin OS (Linux)
- Usa Claude Code como ferramenta principal de desenvolvimento
