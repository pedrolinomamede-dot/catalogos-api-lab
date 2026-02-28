# FRONTEND_SPEC — Contrato Conceitual do Frontend

**Escopo:** Regras de comportamento e responsabilidades da camada de frontend

> [!NOTE]
> Este documento descreve responsabilidades conceituais e regras de comportamento do frontend.
> Ele não define componentes, código, bibliotecas ou detalhes de implementação.

---

## MVP v1 — Contrato Conceitual do Frontend

O frontend do MVP v1 está **FINALIZADO**, é **estável** e **não será reescrito**.

### Comportamento
- **Gestão de Produtos:** Interface permite cadastro, edição e exclusão de produtos.
- **Importação:** Interface suporta upload e processamento de arquivos CSV.
- **Catálogo Digital:** Apresenta visualmente um catálogo único associado à marca (brand).
- **Visualização Pública:** Expõe o catálogo para acesso externo via link.

> [!CAUTION]
> **Regra de Estabilidade:** O MVP v1 não sofrerá refatoração. O fluxo atual deve ser preservado conforme está em produção.

---

## Evolução V2 — Frontend (Contrato Conceitual)

### 1. Princípios Gerais
A Evolução V2 do frontend é **aditiva**:
- Não quebra a experiência do usuário (UX) existente do MVP v1.
- Introduz novos fluxos de navegação e telas de forma incremental.
- Segue estritamente as decisões de produto registradas no `ADR_V2.md`.

### 2. Base Geral de Produtos (UI)
- A interface de administração da V2 trata produtos como **entidades neutras**.
- Produtos são geridos em uma lista centralizada, dissociada de apresentações comerciais específicas.
- Produtos não pertencem implicitamente a nenhum catálogo na tela de gestão.

### 3. Categorias e Subcategorias (UI)
- **Classificação:** A UI reflete a estrutura hierárquica de categorias.
- **Gestão:** A interface permite criar categorias e subcategorias.
- **Associação:** A interface permite associar produtos a uma única categoria no modelo inicial.

### 4. Catálogos (UI)
- **Criação:** A UI permite criar catálogos que iniciam vazios.
- **Seleção:** A interface oferece mecanismos para adicionar e remover produtos existentes em um catálogo.
- **Restrição:** A UI não permite a criação de novos produtos dentro do fluxo de edição de catálogo; apenas trata de associação.
- **Conceito:** A UI trata catálogos puramente como seletores/agrupadores de produtos.

### 5. Share Links (UI Pública)
- **Geração:** A UI administrativa permite gerar links públicos baseados na seleção de um ou mais catálogos.
- **Interface Pública:**
  - Apresenta os catálogos combinados em uma experiência unificada.
  - Oferece controles para alternar a visualização entre os catálogos compartilhados.
  - Mantém a navegação fluida em uma única página (Single Page Experience).

> [!IMPORTANT]
> O comportamento do link (snapshot vs dinâmico) é uma decisão em aberto, conforme documentado no `ADR_V2.md`. A UI não deve assumir nenhum comportamento definitivo até a resolução desta ambiguidade.

### 6. PDF (Frontend)
- **Solicitação:** A UI permite ao usuário solicitar a exportação de catálogos em formato PDF.
- **Conceito:** O PDF é tratado visualmente como um **artefato de apresentação comercial** estruturado, e não como um simples "print" técnico da tela.

### 7. Experiência do Cliente Final (V2)
- **Acesso:** O cliente acessa o catálogo via link público, sem necessidade de login ou autenticação.
- **Navegação:** O cliente pode navegar livremente entre os múltiplos catálogos disponibilizados no link.
- **Busca:** A interface oferece busca global para localizar produtos em todos os catálogos do link.
- **Fluidez:** Toda a experiência ocorre de forma fluida, sem recarregamentos de página desnecessários.

### 8. Convivência Frontend v1 × v2
- **Preservação:** A UX do MVP v1 permanece válida e operante.
- **Expansão:** Os novos fluxos da V2 são adicionados como extensões do sistema.
- **Transição:** Não há substituição imediata ou forçada das telas do v1; a convivência das interfaces é incremental.
