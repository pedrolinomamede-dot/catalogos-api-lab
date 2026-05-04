# CLAUDE.md — Catalogo Facil

## Funcao deste arquivo

Este arquivo e a memoria operacional curta e canônica do projeto.
Ele existe para orientar trabalho, deploy, contexto vivo e regras criticas.
Documentacao longa, roadmap e historico ficam em `docs/` e `archive/`.

## Resumo do projeto

- Produto: `Catalogo Facil`
- Tipo: SaaS multi-tenant para distribuidores
- Dominio: `https://catalogofacil.solucaoviavel.com`
- Stack: `Next.js 16`, `React 19`, `TypeScript`, `Tailwind CSS`, `Prisma 7`, `PostgreSQL`, `NextAuth`, `Playwright`
- Infra atual:
  - VPS Platon
  - Supabase Database
  - Supabase Storage/S3

## Estado atual

O sistema ja possui:

- Super Admin e tenants
- usuarios por tenant
- Base Geral local
- catalogos
- Share Links
- carrinho com finalizacao via WhatsApp
- `OrderIntent`
- `StockReservation`
- `CustomerProfile`
- `ProductRequest`
- analytics base
- integracao Varejonline via OAuth
- politica de reimportacao
- bloqueio de reimportacao por produto

## Branch e repositorio

- Branch operacional atual: `codex/super-admin-platform-foundation`
- Remote permitido: `origin`
- Nunca adicionar outro remote

Validar sempre:

```bash
git remote -v
git branch --show-current
```

## Regras criticas

### Trabalho no codigo

- Ler antes de alterar
- Preferir editar arquivos existentes
- Validar com `npm run build` antes de subir alteracoes relevantes
- Nao versionar `.codex`
- `AGENTS.md` nao e fonte oficial do projeto

### Deploy na VPS

- Nunca assumir que `app online` significa `codigo novo publicado`
- Confirmar branch e commit
- Esperar o build terminar completamente
- Nunca reiniciar PM2 antes de `standalone-assets-ready`
- Se alterar `.env`, usar o restart que carrega env:

```bash
cd /var/www/catalogos-api-lab/app
bash ./scripts/restart-platon-pm2-with-env.sh
```

### Varejonline

- Integracao deve permanecer `read-only` por padrao
- Nao usar endpoints internos com cookie/sessao
- Nao criar, editar, excluir, reservar, faturar ou baixar estoque na Varejonline sem aprovacao explicita do Pedro

## Caminhos operacionais

- App na VPS: `/var/www/catalogos-api-lab/app`
- PM2 app: `catalogos-api-lab`
- Porta interna: `3000`

## Fluxo de trabalho

Fluxo normal:

```text
local -> commit -> push -> deploy na VPS -> validacao funcional
```

Deploy rotineiro:

```bash
cd /var/www/catalogos-api-lab/app
bash ./scripts/deploy-platon-vps.sh
```

## Documentacao viva

- Roadmap do produto: [docs/catalogo-facil-roadmap.md](docs/catalogo-facil-roadmap.md)
- Roadmap da plataforma: [docs/solution-viavel-platform-roadmap.md](docs/solution-viavel-platform-roadmap.md)
- Arquitetura: [docs/architecture.md](docs/architecture.md)
- Plano de seguranca: [docs/security-plan.md](docs/security-plan.md)
- Deploy na VPS: [docs/platon-vps-deploy.md](docs/platon-vps-deploy.md)
- Backup e restore: [docs/disaster-recovery.md](docs/disaster-recovery.md)
- Seguranca da integracao Varejonline: [docs/varejonline-integration-safety.md](docs/varejonline-integration-safety.md)
- Cheatsheet da VPS: [docs/vps-terminal-cheatsheet.md](docs/vps-terminal-cheatsheet.md)

## O que manter fora daqui

Nao usar este arquivo para:

- historico longo de decisoes antigas
- especificacoes obsoletas do MVP v1
- logs de chats antigos
- materiais de transicao que nao guiam mais o estado atual

Esse conteudo deve ficar em `archive/legacy-docs/`.
