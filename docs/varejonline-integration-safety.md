# Varejonline Integration Safety

## Objetivo

Registrar a regra operacional para qualquer trabalho na integracao entre Catalogo Facil e Varejonline.

A conta Varejonline do cliente e um ambiente de terceiro usado na operacao real da empresa. Por isso, toda implementacao deve evitar alterar dados na Varejonline sem decisao explicita.

## Regra de ouro

A integracao com Varejonline deve permanecer **read-only por padrao**.

Nenhuma feature pode criar, editar, excluir ou movimentar dados na Varejonline sem aprovacao explicita do Pedro.

## O que ja usamos hoje

### OAuth e seguranca

- o app Catalogo Facil foi aceito/publicado na Store Varejonline
- o cliente instala o app pela Store e autoriza via OAuth
- o token e salvo criptografado em `IntegrationConnectionV2`
- a conexao fica vinculada ao tenant por `brandId + provider`
- a conexao so e salva quando o CNPJ retornado bate com o CNPJ do tenant

### Endpoints oficiais confirmados

- `GET /apps/api/produtos`
- `GET /apps/api/tabelas-preco`
- `GET /apps/api/tabelas-preco/:id/produtos`
- `GET /apps/api/entidades`
- `GET /apps/api/saldos-mercadorias`
- `GET /apps/api/saldos-mercadorias/liquido`

### Sync atual validada

- importacao read-only de produtos para `ProductBaseV2`
- enriquecimento local com comercial, fiscal, logistica, grade, fornecedores e metadata externa
- configuracao de leitura por tenant
- politica de reimportacao e bloqueio por produto

### Implementado localmente, pendente de validacao final em VPS

- tabela de preco por nome ou ID
- tabelas adicionais por nome ou ID
- entidade de estoque por nome ou ID
- leitura de saldo liquido oficial por entidade
- preenchimento de `stockQuantity` com `saldoAtual`
- preservacao do saldo exato e da quantidade reservada em `logisticsInfoJson`

## Permitido sem nova aprovacao

- ler produtos
- ler categorias e classificacoes
- ler imagens e metadata
- ler precos
- ler tabelas de preco
- ler entidades
- ler saldos e estoque
- salvar os dados lidos no banco do Catalogo Facil
- gerar relatorios internos a partir desses dados

## O que continua proibido

- criacao de produto na Varejonline
- edicao de produto na Varejonline
- exclusao ou desativacao de produto na Varejonline
- alteracao de preco na Varejonline
- baixa, reserva ou movimentacao de estoque na Varejonline
- criacao de pedido, orcamento, venda, faturamento ou nota na Varejonline
- cancelamento de pedido, venda, reserva ou faturamento na Varejonline
- qualquer rotina que use `POST`, `PUT`, `PATCH` ou `DELETE` na Varejonline sem aprovacao explicita
- uso de endpoint interno `/server/api` ou fluxo de cookie/sessao web

## Checklist antes de mexer na integracao

- confirmar que o trabalho e apenas leitura
- confirmar que o token continua restrito ao servidor
- confirmar que o fluxo usa `brandId` do tenant correto
- confirmar que erros nao vazam token ou segredo
- confirmar que nao ha escrita no ERP

## Comportamento esperado no OAuth

1. usuario admin do tenant acessa `Dashboard > Integracoes`
2. clica em `Conectar` no card da Varejonline
3. Varejonline solicita permissao
4. callback retorna ao Catalogo Facil
5. sistema troca `code` por token
6. sistema valida CNPJ retornado contra o CNPJ do tenant
7. sistema salva token criptografado e marca a conexao como `CONNECTED`
8. redirecionamento final deve usar `PUBLIC_BASE_URL` ou `NEXTAUTH_URL`, nunca `0.0.0.0`

## Observacao importante

Mesmo que o OAuth conceda permissoes amplas, o Catalogo Facil deve limitar seu comportamento por codigo e processo. Permissao tecnica nao significa permissao operacional.
