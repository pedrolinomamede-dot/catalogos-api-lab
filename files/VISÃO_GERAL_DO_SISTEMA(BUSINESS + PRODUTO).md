# Visão Geral do Sistema — Business & Produto

**Status:** Estado atual do sistema  
**Escopo:** Funcionamento real do produto, do ponto de vista de negócio e uso

> [!NOTE]
> Este documento descreve o funcionamento atual do sistema, com base no comportamento real implementado.
> Ele não representa planejamento futuro nem define decisões de evolução.

---

## 1. Visão Geral do Produto

O sistema é uma plataforma de catálogos digitais desenvolvida para distribuidores. Sua função principal é permitir a organização de produtos, a apresentação visual de informações comerciais e o compartilhamento de catálogos através de links públicos.

É importante destacar o que o sistema **não** é:
- O sistema não é um e-commerce.
- O sistema não realiza vendas, processamento de pedidos ou pagamentos.

---

## 2. Perfil do Usuário (Business)

### Usuário Principal
O usuário principal do sistema é o **Distribuidor** ou empresa que possui um portfólio de produtos e necessita de uma ferramenta para apresentá-los.

### Objetivos Práticos
- **Centralização:** Manter todos os produtos organizados em um único sistema.
- **Acessibilidade:** Criar um catálogo digital facilmente acessível em diversos dispositivos.
- **Compartilhamento:** Enviar o portfólio para clientes de forma simples e profissional.
- **Profissionalização:** Reduzir a dependência de processos manuais, planilhas complexas e PDFs improvisados.

---

## 3. Funcionamento Atual do Sistema (MVP v1)

Este comportamento reflete as funcionalidades já implementadas e em operação:

- **Gestão de Produtos:** O usuário realiza o cadastro, edição e exclusão de produtos na base.
- **Importação em Massa:** O sistema suporta a carga inicial e atualização de dados através de arquivos CSV.
- **Organização Básica:** Os produtos são mantidos de forma estruturada na base de dados.
- **Catálogo Único:** Existe um único catálogo digital implícito associado à marca (brand).
- **Visualização Pública:** O catálogo gerado fica disponível para acesso externo.
- **PWA e Mobile:** O sistema funciona como um Progressive Web App (PWA).
- **Acesso Offline:** O aplicativo permite acesso aos dados em modo offline, restrito apenas à leitura e consulta.

---

## 4. Experiência do Cliente Final (Link Público Atual)

O cliente final interage com o sistema da seguinte forma:

- **Acesso:** O cliente recebe e acessa o catálogo através de um link público.
- **Sem Barreiras:** Não é necessário realizar login ou criar conta para visualizar os produtos.
- **Navegação:** O cliente navega pela lista de produtos disponíveis.
- **Busca:** Utiliza uma ferramenta de busca simples para localizar itens específicos.
- **Detalhamento:** Visualiza as informações técnicas e comerciais de cada produto.
- **Disponibilidade Offline:** Caso já tenha acessado anteriormente, pode consultar os dados carregados mesmo sem conexão.

---

## 5. Limites Atuais do Sistema

As seguintes características descrevem os limites operacionais atuais do sistema (não são falhas, são o escopo atual):

- **Sem Vendas:** Não existe funcionalidade para fechar pedidos ou realizar transações financeiras.
- **Sem Checkout:** Não há carrinho de compras ou fluxo de pagamento.
- **Catálogo Único:** No MVP v1, não é possível criar múltiplos catálogos personalizados; a visualização é única por brand.
- **Layout Fixo:** Não há opções avançadas de personalização visual ou temas.
- **Offline Read-Only:** Todas as operações offline são estritamente de leitura; não há escrita ou sincronização de alterações feitas offline.

---

## 6. Evolução do Sistema (Contexto)

O sistema encontra-se em um processo de evolução conceitual para a versão V2. Esta evolução introduzirá novos conceitos estruturantes (como múltiplos catálogos e base geral de produtos). Vale ressaltar que essa evolução ainda não está totalmente implementada.

> [!TIP]
> As decisões da Evolução V2 estão registradas em `ADR_V2.md`.

---

## 7. Relação com Outros Documentos

Para uma visão completa do projeto, consulte os documentos oficiais:

- **`MASTER_CONTEXT.md`**: Define o contexto institucional, visão geral e a governança do projeto.
- **`ADR_V2.md`**: Fonte de verdade única para as decisões canônicas da evolução e regras de negócio da V2.
- **Contratos Técnicos**:
  - `BACKEND_SPEC.md`
  - `FRONTEND_SPEC.md`
  - `FEATURES_SPEC.md`
  - `INTEGRATION_SPEC.md`
- **`OUTPUTS_TRACKER.md`**: Registra o histórico de execução e o status das entregas.
