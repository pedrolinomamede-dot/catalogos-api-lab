# Arquitetura

## Visao geral

O Catalogo Facil e um SaaS multi-tenant com base local de produtos, composicao de catalogos, vitrines publicas e integracao ERP read-only.

O sistema foi estruturado para crescer por dominios reutilizaveis, mas este repositorio continua documentando apenas o Catalogo Facil.

## Blocos principais

### Multi-tenant e autenticacao

- `Brand` representa o tenant
- `User` representa usuarios por tenant
- o acesso autenticado usa `NextAuth`
- a autorizacao passa por `requireRole` e derivacoes server-side
- o isolamento por tenant usa `brandId` e `withBrand`

### Base Geral V2

- `ProductBaseV2` e a fonte local principal de produtos
- concentra dados comerciais, fiscais, logisticos, imagens e metadata externa
- aceita origem manual, CSV e integracao
- possui bloqueio de reimportacao por produto

### Organizacao comercial

- `CategoryV2` e `SubcategoryV2` organizam a Base Geral
- `CatalogV2` monta catalogos reutilizando produtos da Base Geral
- `CatalogItemV2` e `CatalogItemSnapshotV2` preservam a apresentacao do catalogo

### Share Links e vitrine assistida

- `ShareLinkV2` publica catalogos para acesso externo
- o cliente navega, adiciona ao carrinho e finaliza via WhatsApp
- o link pertence a um vendedor/usuario responsavel
- o fluxo atual e assistido, sem pagamento online

### Pedidos e estoque local

- `OrderIntent` registra a intencao de pedido antes do WhatsApp
- `OrderIntentItem` armazena os itens do carrinho
- `StockReservation` e `StockReservationItem` sustentam a reserva local de estoque
- o sistema ainda nao baixa estoque no ERP externo

### Demanda e analytics

- `CustomerProfile` reaproveita informacoes de clientes
- `ProductRequest` registra produtos ausentes solicitados pelo cliente
- `AnalyticsEvent` registra eventos first-party do funil publico

### Integracao Varejonline

- `IntegrationConnectionV2` guarda conexoes por tenant e provider
- o token OAuth e mantido criptografado
- a sync atual e read-only
- o sistema ja usa endpoints oficiais para produtos, tabelas de preco, entidades e saldos
- `IntegrationSyncJobV2` registra execucoes e stats

### Exportacao PDF

- a exportacao usa Playwright
- o sistema gera PDF a partir de renderizacao HTML/React
- os catalogos possuem configuracoes visuais e temas

### Infra e armazenamento

- app web na VPS Platon
- banco em Supabase/PostgreSQL
- imagens em Supabase Storage/S3
- Nginx + PM2 na publicacao

## Fluxo resumido de dados

1. usuario autentica no tenant
2. produtos entram por cadastro manual, CSV ou ERP read-only
3. produtos alimentam a Base Geral
4. catalogos reutilizam itens da Base Geral
5. Share Links publicam catalogos para acesso externo
6. carrinho gera `OrderIntent` e reserva local
7. backoffice acompanha pedidos, solicitacoes e integracoes

## Direcao de evolucao

A arquitetura foi pensada para permitir evolucao futura dentro da proposta da Solucao Viavel, mas sem transformar este repositório em repositório de plataforma.

No Catalogo Facil, os proximos blocos naturais de crescimento sao:

- observabilidade de integracoes
- permissoes granulares
- auditoria
- descontos
- e-commerce assistido
