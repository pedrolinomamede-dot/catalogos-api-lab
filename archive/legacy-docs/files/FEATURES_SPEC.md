# FEATURES_SPEC — Capacidades Funcionais do Sistema

**Escopo:** Funcionalidades e capacidades do sistema do ponto de vista de produto

> [!NOTE]
> Este documento descreve o que o sistema é capaz de fazer.
> Ele não define implementação, UX detalhada ou decisões técnicas.

---

## MVP v1 — Features Existentes

O MVP v1 está **FINALIZADO**, é **estável** e **não será reescrito**.

### Funcionalidades
- **Gestão de Produtos:** Cadastro, edição e exclusão de produtos.
- **Importação:** Carga de produtos via arquivo CSV.
- **Organização Básica:** Estruturação de dados de produtos.
- **Catálogo Digital:** Visualização única de catálogo por marca (brand).
- **Acesso Público:** Link para visualização externa do catálogo.
- **PWA / Offline:** Acesso ao catálogo via Progressive Web App com suporte a modo offline (somente leitura).

---

## Evolução V2 — Features (Capacidades Funcionais)

### 1. Princípios Funcionais da V2
- A V2 adiciona **novas capacidades funcionais** ao sistema.
- **Não remove** nenhuma funcionalidade existente do MVP v1.
- O sistema **não se torna um e-commerce**: não há venda, checkout, pagamentos ou carrinho comercial.
- Todas as novas features operam sobre o conceito de **Base Geral de Produtos**.

### 2. Base Geral de Produtos
- O sistema mantém uma Base Geral de Produtos unificada.
- **Flexibilidade:** Produtos podem existir no sistema sem pertencer a nenhum catálogo e sem ter preço obrigatório.
- **Centralização:** A Base Geral alimenta categorias, catálogos, links públicos e a geração de PDFs.

### 3. Categorias e Subcategorias
- **Criação:** Usuário pode criar categorias e subcategorias.
- **Associação:** Usuário pode associar produtos a categorias.
- **Regra:** Cada produto pertence a uma única categoria no modelo inicial.

### 4. Catálogos
- **Múltiplos Catálogos:** Usuário pode criar e manter diversos catálogos simultaneamente.
- **Estado Inicial:** Catálogos começam vazios.
- **Gestão de Itens:** Usuário pode adicionar ou remover produtos existentes em cada catálogo.
- **Reutilização:** Um mesmo produto pode pertencer a vários catálogos diferentes.
- **Escopo:** Catálogos não criam produtos novos; apenas agrupam os existentes.

### 5. Importação via CSV
- **Destino Base Geral:** Importação de CSV para popular ou atualizar a Base Geral de Produtos.
- **Destino Catálogo:** Importação de CSV para selecionar produtos dentro de um catálogo específico.
- **Validação:** Sistema identifica produtos já existentes e produtos inexistentes na base.
- **Decisão:** Usuário decide se deseja adicionar os novos produtos encontrados ou ignorá-los.

### 6. Share Links (Links Públicos)
- **Geração:** Usuário pode gerar links públicos de compartilhamento.
- **Combinação:** Cada link representa uma combinação fixa de um ou mais catálogos.
- **Gestão:** Usuário pode listar todos os links gerados.
- **Revogação:** Usuário pode revogar links a qualquer momento; o acesso é invalidado imediatamente.

> [!IMPORTANT]
> O comportamento do link (se reflete um snapshot estático ou o estado dinâmico atual) é uma decisão em aberto, documentada no `ADR_V2.md`.

### 7. Experiência Pública do Cliente Final
- **Acesso Fácil:** Cliente acessa o link público sem necessidade de autenticação ou cadastro.
- **Navegação:** Cliente navega fluidamente entre os múltiplos catálogos incluídos no link.
- **Busca:** Cliente utiliza busca global para encontrar produtos em todo o conteúdo compartilhado.
- **Visualização:** A experiência ocorre em uma interface unificada e fluida.

### 8. Exportação de PDF
- **Geração:** Usuário pode gerar arquivos PDF a partir de um ou mais catálogos.
- **Estrutura:** O documento é organizado visualmente por catálogo e categoria.
- **Propósito:** O PDF é formatado como material de apresentação comercial.

### 9. Limites Funcionais da V2
Estão explicitamente **FORA DO ESCOPO** da V2:
- Checkout e Pagamento.
- Pedido e Carrinho Comercial.
- Controle de Estoque.
- Personalização avançada de layout (nível MVP).

### 10. Convivência MVP v1 × Evolução V2
- **Disponibilidade:** Todas as funcionalidades do MVP v1 permanecem acessíveis e operantes.
- **Progressão:** As features da V2 são adicionadas ao sistema de forma progressiva.
- **Simultaneidade:** O usuário pode operar funcionalidades do v1 e da V2 simultaneamente no mesmo ambiente.
