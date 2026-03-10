# PROJECT_STATE_CURRENT

Documento operacional de continuidade do projeto `Catálogo Fácil`.

Objetivo: permitir que uma nova sessão retome o trabalho no mesmo contexto, sem depender da memória da conversa anterior.

## 1. Identidade do projeto

- Produto: `Catálogo Fácil`
- Repositório alvo: `catalogos-api`
- Caminho local: `E:\SSD F\sistema-catalogos-api`
- Repositório remoto: `https://github.com/pedrolinomamede-dot/catalogos-api.git`
- Domínio de produção: `https://catalogofacil.solucaoviavel.com`
- Diretório de produção na VPS: `/var/www/catalogos-api`
- Stack principal:
  - `Next.js 16`
  - `React 19`
  - `TypeScript`
  - `Tailwind CSS`
  - `Prisma`
  - `PostgreSQL`
  - `NextAuth`
  - `playwright-core`

## 2. Objetivo e funcionamento atual

O sistema é uma aplicação full-stack para operação de catálogos B2B, com Base Geral local de produtos, composição de catálogos, publicação por share link e geração de PDF.

Fluxo funcional atual:

- Base Geral local (`ProductBaseV2`) alimentada por:
  - cadastro manual
  - importação CSV
  - estrutura preparada para integração ERP
- Categorias e subcategorias locais:
  - `CategoryV2`
  - `SubcategoryV2`
- Catálogos montados a partir da Base Geral:
  - `CatalogV2`
- Itens do catálogo com snapshot persistido:
  - `CatalogItemV2`
  - `CatalogItemSnapshotV2`
- Share links:
  - `ShareLinkV2`
  - `ShareLinkCatalogV2`
- Exportação de PDF em dois modos:
  - `final`
  - `editavel`

Regras importantes já definidas:

- O sistema continua suportando `manual_csv` e scaffold de integração ERP.
- O ERP não deve ser fonte viva do catálogo publicado.
- PDF e share link usam snapshot do catálogo, não leitura ao vivo do ERP.

## 3. Arquitetura atual

### 3.1 Banco e entidades centrais

Fonte principal: `prisma/schema.prisma`

Modelos relevantes:

- Infra e autenticação:
  - `Brand`
  - `User`
- Legado v1:
  - `Category`
  - `Product`
  - `ProductVariation`
  - `ProductImage`
- V2 em operação:
  - `ProductBaseV2`
  - `ProductBaseImageV2`
  - `CategoryV2`
  - `SubcategoryV2`
  - `CatalogV2`
  - `CatalogItemV2`
  - `CatalogItemSnapshotV2`
  - `ShareLinkV2`
  - `ShareLinkCatalogV2`
- Integração ERP:
  - `IntegrationConnectionV2`
  - enums e estruturas de sync relacionados

### 3.2 Papel dos snapshots

Os snapshots existem para congelar os dados usados na publicação:

- nome
- código
- categoria/subcategoria
- imagens
- atributos
- preço, quando houver

Consequência:

- PDF e share link não devem depender do ERP em tempo real.
- Atualizações do produto base não alteram automaticamente o catálogo publicado sem ação explícita.

### 3.3 Renderização de PDF

Arquivo de roteamento:

- `app/api/v2/share-links/[id]/pdf/route.ts`

Arquivo de decisão do renderer:

- `lib/pdf/render-pdf.ts`

Motores atuais:

1. `PDF final`
- variante: `final`
- renderer principal: HTML/Chromium
- arquivos-chave:
  - `lib/pdf/render-pdf.ts`
  - `lib/pdf/html/share-link-html-pdf.ts`
  - `components/pdf/catalog-pdf-document.tsx`

2. `PDF editavel`
- variante: `editable`
- renderer nativo, sem Chromium
- arquivo-chave:
  - `lib/pdf/editable-share-link-pdf.ts`

Motivação da separação:

- `final` prioriza fidelidade visual.
- `editavel` prioriza abertura mais previsível no Corel/Affinity.

## 4. Estado de produção

Produção atual:

- URL pública: `https://catalogofacil.solucaoviavel.com`
- PM2 app: `catalogos-api`
- porta interna: `3001`
- Nginx na frente
- uploads persistentes fora da release

Diretórios relevantes na VPS:

- app: `/var/www/catalogos-api`
- uploads: `/srv/catalogos-api/uploads`

Variáveis críticas já usadas em produção:

- `NEXTAUTH_URL=https://catalogofacil.solucaoviavel.com`
- `PUBLIC_BASE_URL=https://catalogofacil.solucaoviavel.com`
- `PDF_RENDER_BASE_URL=http://127.0.0.1:3001`
- `VAREJONLINE_REDIRECT_URI=https://catalogofacil.solucaoviavel.com/api/v2/integrations/callback/VAREJONLINE`

Observações operacionais:

- O `PDF final` depende de navegador compatível no servidor para a engine HTML.
- O deploy atual na VPS já foi validado repetidas vezes com sucesso.

Fluxo padrão de deploy:

1. `git fetch origin main --prune`
2. `git pull --ff-only origin main`
3. `npm ci --no-audit --no-fund`
4. `npx prisma migrate deploy`
5. `npx prisma generate`
6. `npm run build`
7. `pm2 restart catalogos-api --update-env`
8. healthcheck local e público

## 5. Estado atual do código

Branch local:

- `main`

Remoto correto para este projeto:

- `catalogos-api -> https://github.com/pedrolinomamede-dot/catalogos-api.git`

Observacao importante:

- neste clone local, `origin` aponta para outro repositorio
- o tracking atual da branch `main` esta em `catalogos-api/main`
- antes de qualquer `pull` ou `push`, validar `git remote -v`

Commits recentes mais importantes:

- `07e07ab` `docs: add current project state and sync final pdf layout changes`
- `da9ad0b` `refactor(pdf): align editable export layout with final catalog`
- `4271fb7` `feat(pdf): add editable catalog export mode for Corel and Affinity`
- `ad129bd` `fix(pdf): opaque product images and compact header with aligned larger SKU`
- `67bf39e` `fix(pdf): soften white image panel with blend and opacity`
- `6a3d77c` `feat(pdf): compact intro header, elevate measure stripe and simplify product image layer`
- `4070265` `feat(base-products): safe image replace import and enable name edit`
- `e2cffc7` `refine pdf header and expose logo/style editor in catalog details`
- `fa9fe7e` `feat(pdf): add catalog header logos and stripe grouping by measure`
- `0d173f0` `feat(integrations): scaffold multi-erp hybrid core`

Status local conhecido no momento:

- `git status -sb` deve estar limpo quando o repositório estiver sincronizado com `catalogos-api/main`
- no estado confirmado em `2026-03-10`, nao existe alteracao local pendente
- a pendencia antiga em `components/pdf/catalog-pdf-document.tsx` foi resolvida e publicada

Regra importante:

- antes de qualquer novo trabalho, rodar `git status -sb`
- se surgirem alteracoes locais novas, validar se pertencem ao escopo atual antes de commitar

## 6. Fluxos recentes implementados

### 6.1 PDF

Entrou recentemente:

- logos e estilo do PDF por catálogo
- agrupamento por categoria e medida
- `PDF final`
- `PDF editavel`
- refinamentos do header, tarja e cards
- aproximação visual do `editavel` ao `final`

UI atual relacionada:

- em `components/admin/catalog-details.tsx`:
  - `Exportar PDF final`
  - `Exportar PDF editavel`
  - `Fundo do PDF`
  - `Logos e estilo PDF`
- em `components/admin/share-links-page.tsx`:
  - `PDF final`
  - `PDF editavel`

### 6.2 Base Geral

Entrou recentemente:

- importação de imagens por SKU com política:
  - `append`
  - `replace`
- replace seguro por lote
- edição do nome do produto na Base Geral

Arquivos relacionados:

- `components/admin/base-products-import-images-dialog.tsx`
- `components/admin/base-product-edit-dialog.tsx`
- `lib/api/v2/base-products.ts`
- `lib/api/hooks.ts`

### 6.3 Integração ERP

Direção escolhida:

- modelo híbrido
- Base Geral local como centro da composição
- integração preparada para múltiplos ERPs
- provider inicial previsto: `Varejonline`

Arquitetura:

- conexão por `brandId`
- sync para Base Geral local
- catálogo usa snapshot

## 7. Modo de operação do agente

Regras práticas para continuidade:

- atuar sempre sobre o repositório correto antes de editar
- quando o alvo for este projeto, trabalhar em `catalogos-api`
- não tocar `ipe-distribuidora` quando o trabalho for do catálogo
- validar `git status -sb` antes de qualquer edição
- se houver mudanças locais pendentes, isolar commits para não misturar contextos
- executar build antes de commit sempre que possível
- commitar apenas o escopo da tarefa atual
- usar deploy padronizado da VPS

Comportamento esperado do agente em retomadas:

- ler os arquivos de contexto obrigatórios
- conferir o estado do git
- identificar o que está em produção e o que está apenas local
- nunca assumir que alteração local pendente já foi publicada

## 8. Arquivos obrigatórios para contextualização

Leitura principal:

- `README.md`
- `prisma/schema.prisma`
- `lib/pdf/render-pdf.ts`
- `lib/pdf/html/share-link-html-pdf.ts`
- `lib/pdf/editable-share-link-pdf.ts`
- `components/pdf/catalog-pdf-document.tsx`
- `app/api/v2/share-links/[id]/pdf/route.ts`
- `components/admin/catalog-details.tsx`
- `components/admin/share-links-page.tsx`
- `lib/api/hooks.ts`
- `lib/api/v2/share-links.ts`
- `types/api.ts`

Leitura complementar:

- `v2/DOMAIN_MAP.md`
- `files/OUTPUTS_TRACKER.md`
- `files/PROJECT_PROTOCOL.md`

Observação:

- `files/PROJECT_PROTOCOL.md` é histórico de uma fase anterior de múltiplos chats e não deve ser tratado como regra operacional principal sem leitura crítica.

## 9. Próximo ponto de retomada

Ponto atual mais provável de continuidade:

- refinar o `PDF editavel` para ficar ainda mais próximo do `PDF final`, sem perder editabilidade em Corel/Affinity

Pendência crítica antes de novos commits nessa área:

- comparar visualmente `PDF final` e `PDF editavel` no mesmo catalogo apos cada refinamento
- manter o `PDF final` intocado quando o objetivo for apenas melhorar o `PDF editavel`

Se o objetivo for retomar trabalho de PDF, a ordem prática recomendada é:

1. `git status -sb`
2. revisar `lib/pdf/editable-share-link-pdf.ts`
3. revisar `components/pdf/catalog-pdf-document.tsx`
4. comparar `PDF final` vs `PDF editavel`
5. so entao decidir novos ajustes

## 10. Estado confirmado em 2026-03-10

Resumo objetivo do ponto atual:

- producao ativa em `https://catalogofacil.solucaoviavel.com`
- `PDF final` e `PDF editavel` ja estao disponiveis na UI
- ultimo commit publicado relacionado ao estado operacional: `07e07ab`
- repositorio local sincronizado e sem pendencias
- proximo trabalho esperado: refinamento fino do `PDF editavel` para aproximar ainda mais do `PDF final`

## 11. Critério de qualidade deste documento

Este arquivo cumpre sua função se uma nova sessão conseguir:

1. identificar rapidamente qual projeto é o alvo
2. entender a arquitetura vigente
3. saber o que já está em produção
4. saber o que ainda está só local
5. descobrir quais arquivos abrir primeiro
6. retomar o trabalho de PDF e integração sem depender da conversa anterior
