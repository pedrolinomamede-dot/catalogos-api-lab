# INTEGRATION_SPEC — Contrato Conceitual de Integrações

**Escopo:** Comportamentos transversais e integrações entre partes do sistema

> [!NOTE]
> Este documento descreve integrações e comportamentos globais do sistema em nível conceitual.
> Ele não define implementação técnica, infraestrutura ou detalhes de código.

---

## MVP v1 — Integrações Existentes

As integrações do MVP v1 estão **FINALIZADAS**, **estáveis** e **não serão reescritas**.

### Comportamento Integrado
- **Gestão:** Backend e Frontend integram-se para permitir a criação, edição e exclusão de produtos.
- **Visualização Pública:** O sistema expõe o catálogo único para acesso externo sem autenticação.
- **Offline / PWA:** 
  - O sistema opera em modo Progressive Web App com suporte offline.
  - A integração garante acesso **somente leitura** (read-only) aos dados carregados.
  - Mutações (escrita) são bloqueadas enquanto o dispositivo estiver offline.

---

## Evolução V2 — Integrações (Contrato Conceitual)

### 1. Princípios de Integração da V2
- A Evolução V2 é **aditiva** e **não quebra** as integrações estáveis do MVP v1.
- As novas integrações respeitam a hierarquia de dados: **Base Geral de Produtos → Categorias → Catálogos → Share Links**.
- Nenhuma integração da V2 introduz comportamento comercial de venda (checkout/pagamento).

### 2. Integração Base Geral ↔ Categorias ↔ Catálogos
- **Base Geral:** Fonte única da verdade para os produtos.
- **Categorias:** Camada de classificação que organiza os produtos da Base Geral.
- **Catálogos:** Camada de seleção que aponta para produtos existentes na Base Geral.
- **Integridade:** O sistema garante que não há duplicação física de dados de produtos entre essas camadas; apenas referências.

### 3. Integração Catálogos ↔ Share Links
- **Referência:** Share Links apontam para um ou mais catálogos existentes.
- **Combinação:** Um link integra múltiplos catálogos em uma única visualização.
- **Consistência:** A integração garante que o link sempre reflita os catálogos associados de forma consistente.
- **Revogação:** Ao revogar um link, a integração invalida o acesso público imediatamente, bloqueando a visualização dos dados.

> [!IMPORTANT]
> O comportamento do link (se é um snapshot estático ou reflete o estado dinâmico) é uma decisão em aberto, documentada no `ADR_V2.md`.

### 4. Integração UI Pública ↔ Dados
- **Consumo:** A interface pública consome estritamente os dados "liberados" pelos Share Links válidos.
- **Acesso:** Não há barreira de autenticação para leitura pública.
- **Segurança:** A integração impede qualquer operação de escrita ou mutação a partir da interface pública.

### 5. Integração PDF
- **Fonte de Dados:** A geração de PDF consome a mesma fonte de dados utilizada pelos Links Públicos.
- **Estrutura:** O PDF integra dados de múltiplos catálogos, mantendo a organização visual por catálogo e categoria.
- **Natureza:** O documento gerado é um artefato nativo, não uma "captura de tela" (print) da UI.

### 6. Integração Offline / PWA
- **Persistência:** O comportamento offline permanece estritamente **read-only**.
- **Capacidade:** Suporta navegação entre catálogos e visualização de produtos previamente carregados em cache.
- **Limites:** A integração bloqueia tentativas de criação, edição ou sincronização posterior de dados gerados offline.

### 7. Autenticação e Acesso (Integrações)
- **Área Administrativa:** Todas as operações de gestão exigem token de autenticação válido.
- **Área Pública:** Share Links são acessíveis sem token.
- **Modelo:** A V2 reutiliza integralmente o serviço de autenticação do MVP v1, sem introduzir novos mecanismos.

### 8. Convivência Integrações v1 × v2
- **Validade:** As integrações e fluxos do MVP v1 continuam operando normalmente.
- **Adição:** As integrações da V2 são acopladas ao sistema sem forçar migração de dados ou usuários.
- **Estabilidade:** Não há quebra de contratos ou fluxos já existentes na produção.
