# Varejonline Integration Safety

## Objetivo

Este documento registra a regra operacional para qualquer trabalho na integracao entre Catalogo Facil e Varejonline.

A conta Varejonline da cliente e um ambiente de terceiro, usado na operacao real da empresa. Portanto, toda implementacao deve evitar alterar dados na Varejonline sem uma decisao explicita.

## Estado atual

- O aplicativo Catalogo Facil foi aceito/publicado na Store Varejonline.
- O cliente instala o app pela Store e autoriza o acesso via OAuth.
- O Catalogo Facil salva o token criptografado no banco em `IntegrationConnectionV2`.
- A conexao fica vinculada ao tenant por `brandId + provider`.
- A conexao com Varejonline exige CNPJ cadastrado na marca.
- O callback OAuth so salva o token quando o CNPJ retornado pela Varejonline corresponde ao CNPJ do tenant.

## Regra de ouro

A integracao com Varejonline deve ser **read-only por padrao**.

Nenhuma feature pode criar, editar, excluir ou movimentar dados na Varejonline sem aprovacao explicita do Pedro.

## Permitido sem nova aprovacao

Desde que usando endpoints de leitura e mantendo logs/erros seguros, e permitido:

- Ler produtos.
- Ler categorias/classificacoes.
- Ler imagens/metadados de produtos.
- Ler precos.
- Ler estoque/saldos.
- Salvar os dados lidos no banco do Catalogo Facil.
- Gerar relatorios internos a partir dos dados lidos.

## Proibido sem aprovacao explicita

Nao implementar nem executar automaticamente:

- Criacao de produto na Varejonline.
- Edicao de produto na Varejonline.
- Exclusao/desativacao de produto na Varejonline.
- Alteracao de preco na Varejonline.
- Alteracao/baixa/reserva de estoque na Varejonline.
- Criacao de pedido, orcamento, venda, faturamento ou nota na Varejonline.
- Cancelamento de pedido, venda, reserva ou faturamento na Varejonline.
- Qualquer webhook/rotina que escreva dados na Varejonline.

## Requisitos para liberar escrita no futuro

Antes de qualquer operacao de escrita, precisamos:

- Confirmacao explicita do Pedro no chat.
- Definir exatamente quais endpoints serao usados.
- Validar se a conta da cliente tem ambiente de teste ou forma segura de homologacao.
- Registrar a decisao no `CLAUDE.md`.
- Implementar logs/auditoria por tenant, usuario, endpoint, payload minimo e resultado.
- Criar modo de confirmacao manual antes de enviar a escrita.
- Ter plano de rollback ou compensacao quando a API permitir.

## Checklist antes de mexer na integracao

- Confirmar que o trabalho e apenas leitura.
- Confirmar que o token continua restrito ao servidor.
- Confirmar que a busca usa o `brandId` do tenant logado.
- Confirmar que o CNPJ do tenant esta preenchido.
- Confirmar que erros nao vazam token, client secret ou dados sensiveis.
- Confirmar que nao ha chamada `POST`, `PUT`, `PATCH` ou `DELETE` para a API Varejonline sem aprovacao explicita.

## Comportamento esperado no OAuth

1. Usuario admin do tenant acessa `Dashboard > Integracoes`.
2. Clica em `Conectar` no card da Varejonline.
3. Varejonline solicita permissao.
4. Callback retorna ao Catalogo Facil.
5. Sistema troca `code` por token.
6. Sistema valida CNPJ retornado contra o CNPJ do tenant.
7. Sistema salva token criptografado e marca a conexao como `CONNECTED`.
8. Redirecionamento final deve usar `PUBLIC_BASE_URL` ou `NEXTAUTH_URL`, nunca `0.0.0.0`.

## Observacao importante

Mesmo que a Varejonline conceda permissoes amplas no OAuth, o Catalogo Facil deve limitar seu comportamento por codigo e processo. Permissao tecnica nao significa permissao operacional.
