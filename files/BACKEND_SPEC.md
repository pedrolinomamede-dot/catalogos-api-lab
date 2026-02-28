# BACKEND_SPEC — Contrato Conceitual do Backend

**Escopo:** Contrato conceitual e regras de domínio do backend

> [!NOTE]
> Este documento descreve responsabilidades e regras conceituais do backend.
> Ele não define implementação, schema, endpoints ou detalhes técnicos.

---

## MVP v1 — Contrato Conceitual do Backend

O backend do MVP v1 está **FINALIZADO**, é **estável** e **não será reescrito**. Ele atua como base para a operação atual do sistema.

### Responsabilidades
- **Gestão de Produtos:** Suporta o cadastro, edição e exclusão de produtos e variações.
- **Importação:** Suporta a carga de dados em massa via arquivos CSV.
- **Exposição de Dados:** Fornece os dados necessários para a visualização pública do catálogo único por brand.
- **Autenticação:** Gerencia o acesso administrativo seguro (Multi-tenant).

> [!CAUTION]
> **Regra de Estabilidade:** O MVP v1 só recebe alterações via hotfix pontual. Nenhuma refatoração ou mudança de contrato deve ser feita nesta camada.

---

## Evolução V2 — Backend (Contrato Conceitual)

### 1. Princípios Gerais
A Evolução V2 do backend é **aditiva**:
- Não quebra contratos do MVP v1.
- Introduz novos recursos de forma isolada.
- Segue o modelo conceitual: **Base Geral de Produtos → Catálogos → Share Links**.

### 2. Base Geral de Produtos
Existe uma **Base Geral de Produtos por Brand**.
- **Produtos:**
  - Existem independentemente de catálogo.
  - Não representam venda.
  - Não exigem preço obrigatório.
- A Base Geral é a fonte primária para categorias, catálogos, links públicos e PDFs.

### 3. Categorias e Subcategorias
- **Categorias:** São classificação, não criam nem duplicam produtos.
- Um produto pertence a uma única categoria no modelo inicial.
- Subcategorias são permitidas.

### 4. Catálogos
- **Catálogos:** Agrupadores intencionais de produtos existentes.
- Não criam produtos nem duplicam dados.
- Um produto pode estar em N catálogos simultaneamente.
- Catálogos começam vazios.

### 5. Share Links (Links Públicos)
- **Share Links:** Entidades persistidas.
- Representam uma combinação fixa de catálogos.
- Podem ser criados, listados e revogados.
- Revogação invalida o acesso imediatamente.

> [!IMPORTANT]
> O comportamento do link (snapshot vs dinâmico) é uma decisão em aberto, documentada no `ADR_V2.md`.

### 6. PDF (Responsabilidade do Backend)
O backend fornece dados estruturados para geração de PDF e organiza os produtos por **catálogo** e **categoria**.

### 7. Autenticação e Autorização (V2)
- A V2 mantém o mesmo modelo de autenticação do MVP v1 e não introduz novos mecanismos.
- Operações administrativas continuam protegidas.
- Share Links não exigem autenticação.

### 8. Convivência Backend v1 × v2
- Recursos do v1 continuam válidos.
- Recursos da V2 são adicionados.
- Não há migração forçada nem quebra de compatibilidade.
