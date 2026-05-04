# Plano de Seguranca

## Objetivo

Reduzir risco operacional e proteger tenants, usuarios, dados e integracoes do Catalogo Facil.

## Frentes principais

### Multi-tenant

- revisar todas as APIs para garantir escopo por `brandId`
- impedir acesso cruzado entre tenants
- reforcar `withBrand` como padrao

### Permissoes

- sair de roles fixas apenas
- adotar permissoes granulares
- proteger APIs no servidor, nao apenas a UI

### Segredos

- manter tokens e segredos apenas no servidor
- revisar `.env`
- manter copia segura fora da VPS
- nunca expor credenciais em logs ou respostas

### Integracoes

- Varejonline continua read-only
- nao usar endpoint interno autenticado por cookie
- nao fazer escrita no ERP sem aprovacao explicita

### Auditoria

- registrar alteracoes de usuario
- registrar alteracoes de permissao
- registrar sincronizacoes ERP
- registrar alteracoes manuais criticas

### VPS e operacao

- deploy sempre por script oficial
- restart de PM2 com carregamento explicito do `.env`
- snapshots regulares
- plano de restore testado

## Pendencias prioritarias

1. sistema de permissoes por acao
2. auditoria
3. revisao server-side de acesso por tenant
4. politica de backup e restore
