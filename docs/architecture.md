# Arquitetura

## Visao geral

O Catalogo Facil e um SaaS multi-tenant com base local de produtos, composicao de catalogos, vitrine publica e integracoes ERP read-only.

## Componentes principais

### Aplicacao

- `app/`: rotas App Router, paginas e APIs
- `components/`: UI admin, publico e PDF
- `lib/`: dominio, auth, integracoes, storage, pedidos, snapshots e utilitarios
- `prisma/`: schema e migrations
- `scripts/`: deploy e operacao

### Infra

- VPS Platon para app web
- Supabase para banco
- Supabase Storage/S3 para imagens
- Nginx + PM2

## Dominios atuais

- tenants e usuarios
- Base Geral
- catalogos
- Share Links
- pedidos assistidos
- reservas de estoque locais
- analytics
- integracoes ERP

## Direcao arquitetural

Nao crescer por telas isoladas.
Crescer por modulos de dominio:

- produtos
- catalogos
- pedidos
- descontos
- integracoes
- permissoes
- auditoria
- e-commerce assistido

## Regra de evolucao

Tudo que for reutilizavel entre clientes deve caminhar para a base da plataforma Solucao Viavel.
Tudo que for especifico de negocio deve virar modulo configuravel, nao fork solto.
