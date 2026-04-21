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
**Funcao:** Sistema SaaS multi-tenant para distribuidoras criarem catalogos, compartilhar links publicos, operar carrinho assistido por WhatsApp e exportar PDFs
**Dominio:** catalogofacil.solucaoviavel.com

### Funcionalidades principais
1. **Dashboard** — Visao geral com contadores, acoes rapidas, busca (visual glassmorphism com purple accents)
2. **Produtos Base V2** — CRUD com imagens otimizadas (Sharp → WebP), categorias, subcategorias
3. **Catalogos V2** — Montar catalogos selecionando produtos, customizar visual (cores stripe, fontes, logo)
4. **Share Links** — Links publicos com token, carrinho local e finalizacao assistida via WhatsApp do vendedor dono do link
5. **Pedidos (Fase 0)** — `OrderIntent` criada antes do WhatsApp, status `OPEN/BILLED/CANCELED/EXPIRED` e backoffice em `/dashboard/orders`
6. **Reservas de Estoque (Fase 0)** — `StockReservation` criada no fechamento para WhatsApp, convertida ao faturar e liberada ao cancelar
7. **Clientes e Demanda (Fase 0)** — `CustomerProfile` opcional no checkout assistido e `ProductRequest` publico para produtos que nao estao no link
8. **Analytics Base (Fase 0)** — `AnalyticsEvent` first-party para share link, carrinho, checkout e solicitacoes
9. **Equipe e Permissoes** — `ADMIN`, `SELLER`, `VIEWER`, ownership de share links/pedidos/solicitacoes e tela `/dashboard/team`
10. **Exportacao PDF** — 3 templates (classic, dark_neon, glassmorphism) via Playwright HTML→PDF
11. **Integracoes ERP** — Varejonline com OAuth aceito, token por tenant e validacao por CNPJ; OMIE, Tiny e Bling como placeholders futuros
12. **Auth** — NextAuth.js com credentials (email/senha, bcrypt, JWT 7 dias) + suspensao de tenant por marca
13. **Storage** — Dual: local (`/public/uploads`) ou S3/Supabase Storage (abstracao pronta em `lib/storage/`)

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
- **Branch atualmente publicada na VPS:** `codex/super-admin-platform-foundation`
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
- **main** — branch de referencia/estabilidade publicada antes da Fase 0
- **codex/main-updated-continuation** — branch de continuidade usada para seller ownership + carrinho WhatsApp
- **codex/phase0-order-intent-foundation** — branch da Fase 0, preservada como historico funcional
- **codex/super-admin-platform-foundation** — branch atual publicada na VPS, com super admin, tenants zerados, Varejonline OAuth e validacao por CNPJ
- **Branches historicas preservadas:** `codex/dashboard-overview-functional`, `codex/dashboard-overview-functional-0Gl51`

### Arquivos locais fora do Git
- **CLAUDE.md** — fonte oficial de contexto persistente do projeto
- **AGENTS.md** — arquivo local mantido apenas como registro historico; nao e fonte oficial de verdade
- **.codex** — arquivo/pasta local de ferramenta; nao faz parte do projeto e deve permanecer fora do Git
- **Regra pratica:** nao versionar `AGENTS.md` nem `.codex`; toda decisao operacional duradoura deve ser registrada no `CLAUDE.md`

---

## Estrutura de Pastas Chave

```
app/
  api/
    auth/           — NextAuth ([...nextauth], signup, me)
    v2/
      analytics-events/ — Eventos publicos first-party
      base-products/ — CRUD produtos
      catalogs/      — CRUD catalogos + items + snapshots + PDF
      categories/    — Categorias hierarquicas
      dashboard/     — Summary endpoint
      integrations/  — ERP connections, sync, webhooks, callbacks
      order-intents/ — Intencoes de pedido + status + reserva
      product-requests/ — Solicitacoes publicas de produtos ausentes
      share-links/   — Links publicos + PDF export
  dashboard/         — UI pages (overview, products, catalogs, settings, share-links, integrations, orders, product-requests, team)
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
  customer-profiles/
    upsert-customer-profile.ts — Reuso de perfil do cliente por email/whatsapp
  order-intents/
    stock-reservations.ts      — Criacao, expiracao e conversao de reservas
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
  schema.prisma                — 28 models, PostgreSQL
  migrations/                  — 26 migrations
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

15. **Seller ownership (2026-04-05)** — Share links passaram a ter ownership por usuario vendedor (`ownerUserId`), `SELLER` ganhou permissao operacional propria e o admin ganhou gestao de equipe em `/dashboard/team`.

16. **Carrinho WhatsApp no share link (2026-04-05)** — O link publico passou a ter carrinho local com persistencia e finalizacao no WhatsApp do vendedor dono do link.

17. **OrderIntent foundation (2026-04-06)** — No clique para WhatsApp, o sistema passa a criar `OrderIntent` e `OrderIntentItem` antes do redirecionamento, preservando origem, itens, subtotal e forma de pagamento.

18. **Pedidos no backoffice (2026-04-06)** — Dashboard ganhou `/dashboard/orders` com listagem por ownership; `ADMIN` ve todos e pode `Faturar` ou `Cancelar`, `SELLER` ve apenas leitura dos proprios.

19. **StockReservation foundation (2026-04-06)** — Cada `OrderIntent` cria `StockReservation` com expiracao; `Faturar` converte a reserva e `Cancelar` libera a reserva.

20. **AnalyticsEvent foundation (2026-04-07)** — Share links passaram a registrar eventos first-party como `share_link_viewed`, `share_link_add_to_cart`, `share_link_remove_from_cart`, `share_link_checkout_started` e `product_request_created`.

21. **CustomerProfile foundation (2026-04-07)** — O checkout assistido e as solicitacoes de produto agora podem identificar o cliente por nome/email/whatsapp e reutilizar esse perfil no banco.

22. **ProductRequest foundation (2026-04-07)** — O share link ganhou formulario "Nao encontrou o que procura?" e o backoffice ganhou `/dashboard/product-requests` para acompanhar demanda reprimida por vendedor e origem.

23. **Brand suspension control (2026-04-07)** — `Brand.isActive` passou a controlar suspensao total do tenant. Quando suspensa, a marca perde acesso ao dashboard, APIs autenticadas, site publico e share links.

24. **Super Admin + tenants zerados (2026-04-07)** — Plataforma passou a ter `SUPER_ADMIN` para criar clientes/tenants isolados, cada um com admin proprio, base zerada e controle de suspensao.

25. **Varejonline OAuth aceito e validado por CNPJ (2026-04-21)** — App "Catalogo Facil" foi aceito na Store Varejonline. A conexao OAuth grava token criptografado em `IntegrationConnectionV2` por `brandId + provider` e so salva a conexao quando o CNPJ retornado pela Varejonline bate com o CNPJ cadastrado no tenant.

26. **Politica read-only para Varejonline (2026-04-21)** — Por seguranca operacional, qualquer integracao com a conta Varejonline do cliente deve ser tratada como leitura por padrao. Nao criar, editar, excluir, reservar, faturar, baixar estoque, alterar preco ou enviar pedido/orcamento na Varejonline sem aprovacao explicita do Pedro e sem registrar a decisao no contexto.

27. **Primeira sync read-only Varejonline (2026-04-21)** — Botao "Sincronizar agora" passou a importar produtos via `GET /apps/api/produtos`, gravando apenas no banco do Catalogo Facil (`ProductBaseV2`, categorias, subcategorias, imagens e metadata externa). A implementacao nao escreve nada na Varejonline e persiste localmente em lotes pequenos para evitar timeout de transacao.

28. **Mapeamento enriquecido Varejonline (2026-04-21)** — A sync read-only passou a transformar campos ricos do payload de produto em colunas locais: niveis mercadologicos (departamento, setor, grupo, subgrupo), EANs adicionais, unidade, medidas, custo, estoque minimo/maximo, NCM, CEST, origem fiscal, FCI, beneficio fiscal, classificacao, metodo de controle, flags de venda/ecommerce/marketplace e JSONs estruturados de fiscal/comercial/logistica/fornecedores/grade. O payload bruto continua salvo em `externalMetadataJson`. Continua proibida qualquer escrita na Varejonline.

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

### Fase 4: Site + Dados Comerciais (EM EXPANSAO)
- Fundacao de dados da Fase 0 ja entregue:
  - `OrderIntent`
  - `StockReservation`
  - `AnalyticsEvent`
  - `CustomerProfile`
  - `ProductRequest`
- Proximos blocos naturais:
  - dashboards e metricas sobre eventos
  - site publico alimentado pela Base Geral
  - frete unificado entre site e share link
  - pedidos assistidos com reserva de estoque
  - politicas futuras de preco, atacado/varejo, descontos progressivos e nota fiscal

### Fase 5: Integracao Varejonline (EM VALIDACAO CONTROLADA)
- App Catalogo Facil aceito/publicado na Store Varejonline
- OAuth funcionando: cliente autoriza, token e salvo no banco por tenant, e a tela de integracoes mostra "Conectado"
- Validacao de seguranca ativa: CNPJ do tenant deve bater com o CNPJ retornado pela Varejonline
- Correção aplicada: callback OAuth deve redirecionar usando `PUBLIC_BASE_URL`/`NEXTAUTH_URL`, nunca host interno `0.0.0.0`
- Regra operacional: sincronizacao inicialmente deve ser **read-only** (produtos, categorias, imagens, preco e estoque)
- Primeira sync implementada: produtos via `GET /produtos`, com limite configuravel por env
- Operacoes de escrita na Varejonline ficam bloqueadas por decisao ate haver aprovacao explicita

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
Apos commit+push para `origin main`, a fonte de verdade do deploy passa a ser:

```bash
cd /var/www/catalogos-api-lab/app
bash ./scripts/deploy-platon-vps.sh
```

Bloco equivalente (referencia operacional do script):

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

# Deploy/update na Platon
cd /var/www/catalogos-api-lab/app
bash ./scripts/deploy-platon-vps.sh
```

---

## Seguranca: O que NUNCA fazer

- ❌ Adicionar remote `catalogos-api` ou `principal` — isso cria conexao com producao
- ❌ Fazer `git push` sem especificar o remote — sempre use `git push origin`
- ❌ Clonar de qualquer lugar que nao seja `catalogos-api-lab`
- ❌ Mergear branches de fora
- ❌ Commitar senhas, tokens ou chaves de API no repositorio
- ❌ Fazer qualquer escrita na Varejonline do cliente sem autorizacao explicita: criar/editar/excluir produto, preco, estoque, pedido, orcamento, reserva ou faturamento

### Varejonline — Regra de Ouro
- A conta Varejonline da cliente e ambiente sensivel de terceiro.
- A integracao deve operar em modo leitura por padrao.
- Qualquer endpoint ou feature que altere dados na Varejonline exige pausa, confirmacao explicita do Pedro, logica de auditoria e documentacao previa.
- Documento dedicado: `docs/varejonline-integration-safety.md`

O LAB deve **sempre** ser isolado do principal.

---

## Sobre o Pedro

- Desenvolvedor full-stack construindo este SaaS para distribuidoras
- Prefere acao direta a discussao longa
- Gosta de ver resultados visuais rapido
- Trabalha com ambiente LAB isolado para experimentar antes de producao
- Migrou do Windows para Zorin OS (Linux)
- Usa Claude Code como ferramenta principal de desenvolvimento
