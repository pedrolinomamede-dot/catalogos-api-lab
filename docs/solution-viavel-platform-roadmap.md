# Roadmap da Plataforma Solucao Viavel

## Objetivo

Usar o Catalogo Facil como primeira base real da plataforma Solucao Viavel, evitando criar cada novo projeto do zero.

## Principio

Separar:

- base comum reutilizavel
- modulos de produto por cliente

## Base comum da plataforma

- autenticacao
- tenants
- usuarios
- permissoes
- dashboard
- auditoria
- integracoes
- storage
- deploy
- backup
- componentes de UI
- padroes de API

## Modulos por produto

- Catalogo Facil
- e-commerce assistido
- ERP comercial
- fiscal
- pedidos
- vendedores
- financeiro futuro

## Proximo projeto atacadista

Nao comecar do zero.

Reaproveitar da base:

- auth
- tenants
- usuarios
- permissoes
- produtos
- dashboard
- pedidos
- integracoes
- deploy
- backup

Construir como modulos novos:

- forca de vendas estilo Mercos
- carteira de clientes
- metas e metricas de vendedor
- camadas operacionais que hoje ficam no Bling

## Ordem recomendada

1. estabilizar a base atual
2. criar permissoes granulares
3. criar auditoria
4. criar padroes de arquitetura e restore
5. iniciar novos produtos a partir dessa base
