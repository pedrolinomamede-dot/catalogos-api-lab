# PROJECT_STATE_CURRENT

Documento operacional de continuidade do projeto `Catalogo Facil`.

Objetivo: permitir que uma nova sessao retome o trabalho no mesmo contexto, sem depender da memoria da conversa anterior.

## 1. Identidade do projeto

- Produto: `Catalogo Facil`
- Repositorio alvo: `catalogos-api`
- Caminho local: `E:\SSD F\sistema-catalogos-api`
- Repositorio remoto: `https://github.com/pedrolinomamede-dot/catalogos-api.git`
- Dominio de producao: `https://catalogofacil.solucaoviavel.com`
- Diretorio de producao na VPS: `/var/www/catalogos-api`
- Stack principal:
  - `Next.js 16`
  - `React 19`
  - `TypeScript`
  - `Tailwind CSS`
  - `Prisma`
  - `PostgreSQL`
  - `NextAuth`
  - `playwright-core`
  - `sharp`

## 2. Objetivo e funcionamento atual

O sistema e uma aplicacao full-stack para operacao de catalogos B2B, com Base Geral local de produtos, composicao de catalogos, publicacao por share link e geracao de PDF.

Fluxo funcional atual:

- Base Geral local (`ProductBaseV2`) alimentada por:
  - cadastro manual
  - importacao CSV
  - estrutura preparada para integracao ERP
- Categorias e subcategorias locais:
  - `CategoryV2`
  - `SubcategoryV2`
- Catalogos montados a partir da Base Geral:
  - `CatalogV2`
- Itens do catalogo com snapshot persistido:
  - `CatalogItemV2`
  - `CatalogItemSnapshotV2`
- Share links:
  - `ShareLinkV2`
  - `ShareLinkCatalogV2`
  - URL publica amigavel por `slug`, com fallback por `token`
- Exportacao de PDF em dois modos:
  - `final`
  - `editavel`

Regras importantes:

- O sistema continua suportando `manual_csv` e scaffold de integracao ERP.
- O ERP nao deve ser fonte viva do catalogo publicado.
- PDF e share link usam snapshot do catalogo, nao leitura ao vivo do ERP.

## 3. Arquitetura atual

### 3.1 Banco e entidades centrais

Fonte principal: `prisma/schema.prisma`

Modelos relevantes:

- Infra e autenticacao:
  - `Brand`
  - `User`
- Legado v1:
  - `Category`
  - `Product`
  - `ProductVariation`
  - `ProductImage`
- V2 em operacao:
  - `ProductBaseV2`
  - `ProductBaseImageV2`
  - `CategoryV2`
  - `SubcategoryV2`
  - `CatalogV2`
  - `CatalogItemV2`
  - `CatalogItemSnapshotV2`
  - `ShareLinkV2`
  - `ShareLinkCatalogV2`
- Integracao ERP:
  - `IntegrationConnectionV2`
  - enums e estruturas de sync relacionados

### 3.2 Papel dos snapshots

Os snapshots congelam os dados usados na publicacao:

- nome
- codigo
- categoria e subcategoria
- imagens
- atributos
- preco, quando houver

Consequencias:

- PDF e share link nao devem depender do ERP em tempo real.
- Atualizacoes do produto base nao alteram automaticamente o catalogo publicado sem acao explicita.
- Excecao atual: mudancas visuais relevantes de imagem/layout na Base Geral devem refrescar automaticamente os snapshots vinculados.

### 3.3 Renderizacao de PDF

Arquivo de roteamento:

- `app/api/v2/share-links/[id]/pdf/route.ts`

Arquivo de decisao do renderer:

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

3. `Fallback nativo do PDF final`
- usado quando o renderer HTML falha e fallback esta permitido
- arquivo-chave:
  - `lib/pdf/share-link-pdf.ts`

Motivacao da separacao:

- `final` prioriza fidelidade visual.
- `editavel` prioriza abertura mais previsivel no Corel/Affinity.

## 4. Estado de producao

Producao atual:

- URL publica: `https://catalogofacil.solucaoviavel.com`
- PM2 app: `catalogos-api`
- porta interna: `3001`
- Nginx na frente
- uploads persistentes fora da release

Diretorios relevantes na VPS:

- app: `/var/www/catalogos-api`
- uploads: `/srv/catalogos-api/uploads`

Variaveis criticas ja usadas em producao:

- `NEXTAUTH_URL=https://catalogofacil.solucaoviavel.com`
- `PUBLIC_BASE_URL=https://catalogofacil.solucaoviavel.com`
- `PDF_RENDER_BASE_URL=http://127.0.0.1:3001`
- `VAREJONLINE_REDIRECT_URI=https://catalogofacil.solucaoviavel.com/api/v2/integrations/callback/VAREJONLINE`

Observacoes operacionais:

- O `PDF final` depende de navegador compativel no servidor para a engine HTML.
- O deploy atual na VPS ja foi validado repetidas vezes com sucesso.
- Estado validado mais recente em producao:
  - commit ativo confirmado: `a74b6e4`
  - `pm2 restart catalogos-api --update-env` validado
  - healthcheck local e publico aprovados

Regras operacionais de deploy na VPS:

- sempre entrar em `/var/www/catalogos-api` antes de validar ou atualizar o projeto
- sempre validar `git remote -v` antes do deploy manual
- o remoto esperado no servidor e `https://github.com/pedrolinomamede-dot/catalogos-api.git`
- se `origin` apontar para outro repositorio, nao executar `git pull origin main` automaticamente
- nao misturar este projeto com outros repositorios do mesmo ambiente

Fluxo padrao de deploy:

1. `git fetch origin main --prune`
2. `git pull --ff-only origin main`
3. `npm ci --no-audit --no-fund`
4. `npx prisma migrate deploy`
5. `npx prisma generate`
6. `npm run build`
7. `pm2 restart catalogos-api --update-env`
8. healthcheck local e publico

Comando completo usado neste projeto:

```bash
set -euo pipefail

export PM2_HOME=/root/.pm2
APP_DIR="/var/www/catalogos-api"
APP_NAME="catalogos-api"
APP_PORT="3001"
PUBLIC_URL="https://catalogofacil.solucaoviavel.com"

cd "$APP_DIR"

git remote -v
git fetch origin main --prune
git pull --ff-only origin main

npm ci --no-audit --no-fund
npx prisma migrate deploy
npx prisma generate
npm run build

pm2 restart "$APP_NAME" --update-env || \
pm2 start npm --name "$APP_NAME" --cwd "$APP_DIR" -- start -- -H 0.0.0.0 -p "$APP_PORT"
pm2 save

sleep 8
ss -ltnp | grep ":${APP_PORT}" || true
curl -fsSI "http://127.0.0.1:${APP_PORT}/login" >/dev/null
curl -fsSI "${PUBLIC_URL}/login" >/dev/null

echo "DEPLOY_OK ${PUBLIC_URL}"
```

Checklist minimo se o deploy falhar:

- `pm2 status`
- `pm2 logs catalogos-api --lines 80 --nostream`
- `ss -ltnp | grep :3001`
- `curl -fsSI http://127.0.0.1:3001/login`
- `curl -fsSI https://catalogofacil.solucaoviavel.com/login`

## 5. Estado atual do codigo

Branch local:

- `main`

Remoto correto para este projeto:

- `catalogos-api -> https://github.com/pedrolinomamede-dot/catalogos-api.git`

Observacao importante:

- neste clone local, `origin` aponta para outro repositorio
- o tracking atual da branch `main` esta em `catalogos-api/main`
- antes de qualquer `pull` ou `push`, validar `git remote -v`

Commits recentes mais importantes:

- `a74b6e4` `fix(pdf): prevent product cards from clipping page bottom`
- `5e056e9` `feat(pdf): switch to mobile-first page format`
- `01e06c2` `refactor(pdf): optimize page density and card spacing`
- `22297f3` `fix(catalog): hide missing measure labels`
- `8946de6` `fix(catalog): refresh snapshots after image updates`
- `885f906` `fix(pdf): compact product card text block`
- `40dda89` `fix(pdf): polish modal controls and card text layout`
- `35ffb84` `fix(pdf): refine line headers and zoom limits`
- `0fcc680` `feat(catalog): add smart product image layout`
- `a73c6af` `feat(catalog): scale product images by size band`
- `e754f8b` `feat(catalog): group products by line`
- `7da2710` `fix(pdf): soften product image panel opacity`
- `0db9ab8` `feat(share-links): add bulk delete selection`
- `1ca1d73` `docs: expand server deploy and pdf diagnostics context`
- `cde0da1` `feat(share-links): add friendly public slugs`

Status local conhecido no momento:

- `git status -sb` esta limpo
- o repositorio local esta sincronizado com `catalogos-api/main`

Regra importante:

- antes de qualquer novo trabalho, rodar `git status -sb`
- se surgirem alteracoes locais novas, validar se pertencem ao escopo atual antes de commitar

## 6. Fluxos recentes implementados

### 6.1 PDF

Entrou recentemente:

- logos e estilo do PDF por catalogo
- agrupamento por categoria e medida
- `PDF final`
- `PDF editavel`
- refinamentos de header, tarja e cards
- aproximacao visual do `editavel` ao `final`
- agrupamento por `linha`
- escala visual automatica da imagem por faixa de medida
- suporte a ajuste manual global de zoom/posicao da imagem do produto
- painel branco atras da imagem configurado em 50% de opacidade
- nome do produto sem texto secundario separado no card
- codigo imediatamente abaixo do nome no card
- formato de pagina mobile-first
- reducao de densidade vazia por pagina
- correcoes para evitar clipping de cards na borda inferior
- quando nao houver medida, o label do grupo fica em branco em vez de `Sem medida`

UI relacionada:

- em `components/admin/catalog-details.tsx`:
  - `Exportar PDF final`
  - `Exportar PDF editavel`
  - `Fundo do PDF`
  - `Logos e estilo PDF`
- em `components/admin/share-links-page.tsx`:
  - `PDF final`
  - `PDF editavel`

Observacoes operacionais importantes:

- `PDF final` usa renderizacao HTML e depende de navegador compativel no servidor.
- `PDF final` passa por pipeline Chromium/Chrome para gerar o PDF visual final.
- `PDF editavel` usa renderer nativo e nao depende do mesmo pipeline HTML/Chromium.
- falha no `PDF final` nao implica automaticamente erro de layout ou erro de codigo do catalogo.
- `PDF editavel` pode continuar funcionando mesmo quando o `PDF final` falha.
- o PDF atual foi otimizado para consumo em celular, com pagina vertical maior que A4.

### 6.2 Base Geral

Entrou recentemente:

- importacao de imagens por SKU com politica:
  - `append`
  - `replace`
- replace seguro por lote
- edicao do nome do produto na Base Geral
- suporte ao campo fixo `linha` no produto base
- importacao CSV da Base Geral passa a aceitar a coluna `linha`
- snapshots do catalogo passam a carregar `linha` em `attributesJson`
- `ProductBaseV2` suporta metadados globais de layout da imagem (`imageLayoutJson`)
- editor do produto da Base Geral permite ajuste manual de zoom e posicao da imagem principal
- upload de imagem aplica `trim` automatico para reduzir bordas vazias em novas imagens
- mudancas visuais relevantes de imagem/layout refrescam automaticamente os snapshots dos catalogos vinculados

Arquivos relacionados:

- `components/admin/base-products-import-images-dialog.tsx`
- `components/admin/base-product-edit-dialog.tsx`
- `lib/api/v2/base-products.ts`
- `lib/api/hooks.ts`

### 6.3 Share links

Direcao atual:

- share links possuem URL amigavel por `slug`, com fallback por `token`
- links antigos continuam compativeis
- a tela de share links suporta exclusao em massa na pagina atual

### 6.4 Integracao ERP

Direcao escolhida:

- modelo hibrido
- Base Geral local como centro da composicao
- integracao preparada para multiplos ERPs
- provider inicial previsto: `Varejonline`

Arquitetura:

- conexao por `brandId`
- sync para Base Geral local
- catalogo usa snapshot

### 6.5 Diagnostico de PDF final

Quando o `PDF final` falhar em producao, as primeiras hipoteses sao:

- navegador ausente no servidor
- caminho incorreto do navegador
- erro na engine HTML
- falha de acesso ao render interno

Variaveis e contexto relevantes:

- `PDF_RENDER_BASE_URL=http://127.0.0.1:3001`
- em alguns cenarios pode ser necessario validar `PDF_HTML_BROWSER_PATH`

Checklist minimo:

1. confirmar se a aplicacao esta no ar:
   - `pm2 status`
   - `ss -ltnp | grep :3001`
   - `curl -I http://127.0.0.1:3001/login`
2. confirmar se o dominio esta respondendo:
   - `curl -I https://catalogofacil.solucaoviavel.com/login`
3. verificar navegador disponivel no servidor:
   - `which google-chrome`
   - `which chromium`
   - `which chromium-browser`
4. verificar configuracao do caminho do browser:
   - `grep -n 'PDF_HTML_BROWSER_PATH' /var/www/catalogos-api/.env`
5. analisar logs da app:
   - `pm2 logs catalogos-api --lines 100 --nostream`

Interpretacao correta:

- separar problema de deploy, problema da app, problema do `PDF final` e problema do `PDF editavel`
- antes de concluir erro de codigo, investigar browser e engine HTML

## 7. Modo de operacao do agente

Regras praticas para continuidade:

- atuar sempre sobre o repositorio correto antes de editar
- quando o alvo for este projeto, trabalhar em `catalogos-api`
- nao tocar `ipe-distribuidora` quando o trabalho for do catalogo
- validar `git status -sb` antes de qualquer edicao
- se houver mudancas locais pendentes, isolar commits para nao misturar contextos
- executar build antes de commit sempre que possivel
- commitar apenas o escopo da tarefa atual
- usar deploy padronizado da VPS

Comportamento esperado do agente em retomadas:

- ler os arquivos de contexto obrigatorios
- conferir o estado do git
- identificar o que esta em producao e o que esta apenas local
- nunca assumir que alteracao local pendente ja foi publicada

## 8. Arquivos obrigatorios para contextualizacao

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

Observacao:

- `files/PROJECT_PROTOCOL.md` e historico de fase anterior e nao deve ser tratado como regra operacional principal sem leitura critica

## 9. Proximo ponto de retomada

Ponto atual mais provavel de continuidade:

- continuar refinando o PDF mobile-first no uso real em celular, mantendo o `PDF editavel` proximo do `PDF final`

Pendencias praticas antes de novos commits nessa area:

- comparar visualmente `PDF final` e `PDF editavel` no mesmo catalogo
- validar no celular:
  - densidade por pagina
  - ausencia de clipping
  - legibilidade de nome e codigo
  - aproveitamento de topo, laterais e rodape
- manter o `PDF final` intocado quando o objetivo for apenas melhorar o `PDF editavel`

Se o objetivo for retomar trabalho de PDF, a ordem pratica recomendada e:

1. `git status -sb`
2. revisar `lib/pdf/editable-share-link-pdf.ts`
3. revisar `components/pdf/catalog-pdf-document.tsx`
4. comparar `PDF final` vs `PDF editavel`
5. so entao decidir novos ajustes

## 10. Estado confirmado em 2026-03-13

Resumo objetivo do ponto atual:

- producao ativa e saudavel em `https://catalogofacil.solucaoviavel.com`
- commit mais recente validado em producao: `a74b6e4`
- `PDF final` e `PDF editavel` disponiveis na UI
- repositorio local sincronizado e sem pendencias
- features recentes em producao:
  - URL amigavel de share links
  - exclusao em massa de share links
  - agrupamento por linha
  - ajuste manual de imagem por produto
  - refresh automatico de snapshots apos mudanca de imagem/layout
  - painel da imagem com 50% de opacidade
  - formato mobile-first do PDF
  - correcao de clipping na borda inferior
  - medida ausente sem exibir `Sem medida`

## 11. Criterio de qualidade deste documento

Este arquivo cumpre sua funcao se uma nova sessao conseguir:

1. identificar rapidamente qual projeto e o alvo
2. entender a arquitetura vigente
3. saber o que ja esta em producao
4. saber o que ainda esta so local
5. descobrir quais arquivos abrir primeiro
6. retomar o trabalho de PDF e integracao sem depender da conversa anterior
