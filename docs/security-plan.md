# Plano de Seguranca

## Objetivo

Documentar os controles de seguranca ja existentes no Catalogo Facil, os riscos conhecidos e os proximos reforcos necessarios para operar o produto com mais confiabilidade.

## Controles ja implementados

### Multi-tenant

- escopo de tenant por `brandId`
- isolamento server-side via `withBrand`
- APIs autenticadas exigem contexto de usuario e tenant
- marcas podem ser suspensas

### Autorizacao

- autenticacao via `NextAuth`
- protecao server-side com `requireRole`, `requireRoles` e `requirePlatformAdmin`
- separacao atual de papeis:
  - `SUPER_ADMIN`
  - `ADMIN`
  - `SELLER`
  - `VIEWER`

### Segredos e integracoes

- tokens OAuth mantidos apenas no servidor
- segredos da integracao criptografados antes de persistir
- validacao de CNPJ na conexao Varejonline
- politica read-only para Varejonline

### Operacao

- deploy por script oficial
- restart de PM2 com carregamento explicito do `.env`
- documentacao dedicada para deploy e restore

## Riscos conhecidos

- o modelo atual de autorizacao ainda depende demais de papeis fixos
- ainda faltam permissoes granulares por acao
- ainda falta auditoria estruturada de alteracoes sensiveis
- ainda precisamos reforcar revisao sistematica de todas as APIs por `brandId`
- a implementacao nova de preco por nome/ID e estoque oficial ainda aguarda validacao final em VPS

## Proximas implementacoes

### Alta prioridade

- permissoes granulares por recurso e acao
- auditoria de alteracoes criticas
- revisao server-side completa de acesso por tenant
- rotina operacional de backup e restore

### Media prioridade

- politica de senha mais explicita
- avaliacao de 2FA para Super Admin futuramente
- monitoramento mais estruturado de jobs e falhas

## Regras permanentes

- nunca commitar tokens ou credenciais
- nunca usar endpoint interno da Varejonline com cookie/sessao
- nunca fazer escrita no ERP sem aprovacao explicita
- seguranca de API vale mais que permissao visual de interface
