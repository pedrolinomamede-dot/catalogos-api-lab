# Roadmap do Catalogo Facil

## Objetivo

Fechar o Catalogo Facil como produto funcional, seguro e operavel para o cliente atual, sem perder a capacidade de evolucao para e-commerce assistido e modulos futuros.

## Prioridade imediata

1. Finalizar integracao Varejonline no escopo atual:
   - precos
   - importacao gradual em base maior
   - validacao fiscal, logistica e categorias
   - observabilidade dos jobs
   - estoque atual apenas quando existir endpoint oficial OAuth
2. Criar motor de permissoes personalizadas
3. Criar motor de descontos
4. Criar e-commerce assistido reaproveitando Base Geral, carrinho e WhatsApp

## Entregas do produto

### Fase 1

- estabilizacao de repositorio, docs e backup
- revisao basica de seguranca multi-tenant
- detalhe de deploy e restore

### Fase 2

- precos Varejonline
- importacao gradual 100 -> 300 -> 500 -> 1000 -> total
- validacao de categorias, fiscal e logistica
- tela de observabilidade de jobs

### Fase 3

- permissoes granulares por usuario
- auditoria de alteracoes de acesso

### Fase 4

- descontos locais
- integracao de desconto progressivo vindo da Varejonline
- aplicacao de desconto em Share Links

### Fase 5

- e-commerce assistido com:
  - todos os produtos ativos
  - carrinho
  - escolha de vendedor
  - desconto
  - frete
  - WhatsApp
  - `OrderIntent`

## Pendencias conhecidas

- estoque atual por entidade depende de endpoint oficial da Varejonline
- fiscal completo nao entra nesta etapa
- baixa real de estoque no ERP continua fora do escopo atual

## Criterio de pronto desta etapa

O Catalogo Facil desta fase estara pronto quando:

- a integracao importar os dados necessarios com confiabilidade
- o admin puder controlar reimportacao e permissoes
- descontos funcionarem no carrinho
- a vitrine/e-commerce assistido funcionar com WhatsApp
- backup, deploy e restore estiverem documentados
