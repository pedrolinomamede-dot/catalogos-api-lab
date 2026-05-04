# Catalogo Facil

Catalogo Facil e um SaaS multi-tenant para distribuidores organizarem produtos, montarem catalogos, publicarem vitrines e fecharem pedidos assistidos via WhatsApp.

O projeto pertence ao contexto mais amplo da Solucao Viavel, empresa que esta estruturando produtos e sistemas sob medida para clientes reais. Neste repositorio, porem, a documentacao operacional, tecnica e de produto e dedicada exclusivamente ao Catalogo Facil.

## O que o sistema faz hoje

- Base Geral local de produtos por tenant
- importacao manual, CSV e integracao ERP read-only
- catalogos reutilizando a Base Geral
- Share Links publicos com carrinho
- finalizacao assistida via WhatsApp
- `OrderIntent` e reservas locais de estoque
- solicitacoes de produtos ausentes
- exportacao PDF
- integracao Varejonline via OAuth, validada por CNPJ
- Super Admin, tenants, usuarios por tenant e suspensao de marca

## Estado do projeto

- Estado operacional oficial: [CLAUDE.md](CLAUDE.md)
- Roadmap do produto: [docs/catalogo-facil-roadmap.md](docs/catalogo-facil-roadmap.md)
- Arquitetura atual: [docs/architecture.md](docs/architecture.md)

## Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS`
- `Prisma`
- `PostgreSQL`
- `NextAuth`
- `Playwright`

## Estrutura principal

- `app/`: rotas App Router, APIs e telas
- `components/`: UI admin, auth, publico e PDF
- `lib/`: dominio, auth, integracoes, PDF, storage, pedidos e utilitarios
- `prisma/`: schema e migrations
- `scripts/`: deploy, restart e utilitarios operacionais
- `docs/`: documentacao viva do Catalogo Facil
- `archive/legacy-docs/`: historico que nao guia mais o estado atual

## Setup local

```bash
npm ci
cp .env.example .env
npx prisma migrate deploy
npx prisma generate
npm run dev
```

## Build local

```bash
npm run build
```

## Deploy na VPS

```bash
cd /var/www/catalogos-api-lab/app
bash ./scripts/deploy-platon-vps.sh
```

Se alterar variaveis no `.env` da VPS:

```bash
cd /var/www/catalogos-api-lab/app
bash ./scripts/restart-platon-pm2-with-env.sh
```

## Documentacao

- Estado operacional e regras criticas: [CLAUDE.md](CLAUDE.md)
- Roadmap do Catalogo Facil: [docs/catalogo-facil-roadmap.md](docs/catalogo-facil-roadmap.md)
- Arquitetura: [docs/architecture.md](docs/architecture.md)
- Plano de seguranca: [docs/security-plan.md](docs/security-plan.md)
- Backup e restore: [docs/disaster-recovery.md](docs/disaster-recovery.md)
- Deploy na Platon: [docs/platon-vps-deploy.md](docs/platon-vps-deploy.md)
- Seguranca da integracao Varejonline: [docs/varejonline-integration-safety.md](docs/varejonline-integration-safety.md)
- Contexto institucional da Solucao Viavel: [docs/solution-viavel-platform-roadmap.md](docs/solution-viavel-platform-roadmap.md)
- Cheatsheet da VPS: [docs/vps-terminal-cheatsheet.md](docs/vps-terminal-cheatsheet.md)
