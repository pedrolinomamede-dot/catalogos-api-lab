# Roadmap do Catalogo Facil

## Objetivo

Fechar o Catalogo Facil como produto funcional, seguro e operavel para o cliente atual, mantendo a base preparada para evolucao futura sem misturar esse repositorio com a documentacao de outros projetos.

## Concluido

- estabilizacao principal do repositório e da documentacao
- definicao de `main` como branch oficial
- deploy real em VPS Platon com PM2, Nginx e Playwright
- Super Admin, tenants e usuarios por tenant
- Base Geral local
- catalogos V2
- Share Links publicos com carrinho
- finalizacao assistida por WhatsApp
- `OrderIntent`
- `StockReservation`
- `CustomerProfile`
- `ProductRequest`
- analytics base
- OAuth Varejonline com validacao por CNPJ
- sync read-only de produtos via endpoint oficial
- configuracao de leitura da integracao
- politica de reimportacao e bloqueio por produto

## Em andamento

- fechamento operacional da integracao Varejonline no escopo atual
- revisao e fortalecimento da documentacao tecnica e operacional

## Implementado, mas pendente de validacao final

- tabela de preco Varejonline por nome ou ID
- entidades Varejonline por nome ou ID
- uso de `/apps/api/tabelas-preco` para resolver tabela principal e tabelas adicionais
- uso de `/apps/api/entidades` para resolver entidade de estoque
- uso de `/apps/api/saldos-mercadorias/liquido` para estoque atual oficial por entidade
- gravacao de `stockQuantity` a partir de `saldoAtual`
- preservacao do saldo exato, reservado e em transito em `logisticsInfoJson`

Status atual desse bloco:

- implementado localmente
- testes focados passando
- `npm run build` passando
- aguardando deploy e validacao real na VPS

## Proximo bloco de implementacao

### Integracao Varejonline

- validar em VPS o fluxo de preco por nome/ID
- validar em VPS o estoque oficial por entidade
- ampliar importacao real de 100 para 300, 500, 1000 e total
- validar categorias, fiscal e logistica com base maior
- melhorar observabilidade de jobs

### Produto

- permissoes granulares por usuario
- auditoria de alteracoes sensiveis
- motor local de descontos
- integracao de desconto progressivo
- e-commerce assistido com todos os produtos ativos
- escolha de vendedor
- frete
- desconto no carrinho

## Pendencias conhecidas

- a implementacao atual de preco por nome/ID e estoque oficial ainda precisa de validacao final na VPS
- baixa real de estoque no ERP continua fora do escopo
- escrita na Varejonline continua proibida sem aprovacao explicita
- fiscal completo e modulos ERP continuam fora desta etapa
