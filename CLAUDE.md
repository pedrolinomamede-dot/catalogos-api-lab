# CLAUDE.md — Catalogo Facil

## Funcao deste arquivo

Este arquivo e a memoria operacional viva e canonica do Catalogo Facil.
Ele registra o contexto atual do projeto, as regras criticas de operacao, o estado real do sistema e os proximos passos.

Documentacao longa, runbooks e historico ficam em `docs/` e `archive/`.

## Contexto do projeto

- Produto: `Catalogo Facil`
- Tipo: SaaS multi-tenant para distribuidores
- Dominio: `https://catalogofacil.solucaoviavel.com`
- Empresa/contexto: o Catalogo Facil e um projeto da Solucao Viavel, mas este repositorio documenta apenas o produto Catalogo Facil
- Stack principal: `Next.js 16`, `React 19`, `TypeScript`, `Tailwind CSS`, `Prisma 7`, `PostgreSQL`, `NextAuth`, `Playwright`

## Infra atual

- VPS Platon para a aplicacao web
- Supabase Database para PostgreSQL
- Supabase Storage/S3 para imagens
- Nginx + PM2 na VPS
- App dir na VPS: `/var/www/catalogos-api-lab/app`
- PM2 app: `catalogos-api-lab`
- Porta interna: `3000`

## Repositorio e fluxo oficial

- Branch oficial do projeto: `main`
- Remote permitido: `origin`
- Nunca adicionar outro remote
- O deploy da VPS deve seguir a `main`

Validar sempre:

```bash
git remote -v
git branch --show-current
```

Fluxo normal:

```text
local -> testes/build -> commit -> push origin main -> deploy na VPS -> validacao funcional
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
- Confirmar branch e commit antes do deploy
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
- Usar apenas endpoints oficiais OAuth em `/apps/api`

## Implementado e validado

O sistema ja possui:

- Super Admin e tenants
- usuarios por tenant
- suspensao de tenant por marca
- Base Geral local (`ProductBaseV2`)
- categorias e subcategorias V2
- catalogos V2
- Share Links
- carrinho com finalizacao via WhatsApp
- `OrderIntent`
- `StockReservation`
- `CustomerProfile`
- `ProductRequest`
- analytics base
- exportacao PDF
- integracao Varejonline via OAuth
- validacao de CNPJ na conexao Varejonline
- politica de reimportacao
- bloqueio de reimportacao por produto
- deploy real em VPS com PM2, Nginx e Playwright

Na integracao Varejonline, ja estao confirmados e testados:

- `GET /apps/api/produtos`
- `GET /apps/api/tabelas-preco`
- `GET /apps/api/tabelas-preco/:id/produtos`
- `GET /apps/api/entidades`
- `GET /apps/api/saldos-mercadorias`
- `GET /apps/api/saldos-mercadorias/liquido`

## Implementado, mas ainda pendente de validacao final

Ja esta implementado localmente, com testes focados e `npm run build` passando, mas ainda aguardando deploy/validacao final na VPS:

- configuracao de tabela de preco Varejonline por nome ou ID
- configuracao de entidade de estoque por nome ou ID
- resolucao de tabela pelo endpoint oficial `/apps/api/tabelas-preco`
- resolucao de entidade pelo endpoint oficial `/apps/api/entidades`
- leitura de saldo liquido oficial por entidade via `/apps/api/saldos-mercadorias/liquido`
- preenchimento de `stockQuantity` a partir de `saldoAtual`
- preservacao do saldo exato e da quantidade reservada em `logisticsInfoJson`

Status esperado dessa validacao:

- tabela `TABELA ATACADO` resolvendo corretamente para ID `2`
- entidade `MAQUIADA MATRIZ` resolvendo corretamente para ID `4`
- SKU `VZ86/3` com estoque principal `0` para a entidade configurada

## Proximos passos

Bloco imediato:

- publicar e validar em VPS a implementacao de preco por nome/ID e estoque oficial por entidade
- confirmar o comportamento real na tela de integracoes

Bloco seguinte do produto:

- importacao real gradual em base maior
- validacao ampliada de categorias, fiscal e logistica
- observabilidade detalhada dos jobs de integracao
- permissoes granulares por usuario
- auditoria de alteracoes sensiveis
- motor local de descontos
- integracao de desconto progressivo
- e-commerce assistido com frete, desconto e escolha de vendedor

## Documentacao viva

- Roadmap do produto: [docs/catalogo-facil-roadmap.md](docs/catalogo-facil-roadmap.md)
- Arquitetura: [docs/architecture.md](docs/architecture.md)
- Plano de seguranca: [docs/security-plan.md](docs/security-plan.md)
- Deploy na VPS: [docs/platon-vps-deploy.md](docs/platon-vps-deploy.md)
- Backup e restore: [docs/disaster-recovery.md](docs/disaster-recovery.md)
- Seguranca da integracao Varejonline: [docs/varejonline-integration-safety.md](docs/varejonline-integration-safety.md)
- Contexto institucional da Solucao Viavel: [docs/solution-viavel-platform-roadmap.md](docs/solution-viavel-platform-roadmap.md)
- Cheatsheet da VPS: [docs/vps-terminal-cheatsheet.md](docs/vps-terminal-cheatsheet.md)

## O que manter fora daqui

Nao usar este arquivo para:

- historico longo de decisoes antigas
- especificacoes obsoletas
- logs de chats antigos
- documentacao operacional de outros projetos
- roadmap detalhado da plataforma Solucao Viavel

Esse conteudo deve ficar em `archive/legacy-docs/` ou em repositorio proprio no futuro.
