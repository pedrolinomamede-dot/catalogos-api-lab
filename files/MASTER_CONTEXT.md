# MASTER_CONTEXT — Contexto Geral do Projeto

**Status:** Ativo  
**Escopo:** Contexto institucional, visão geral e governança do sistema

> [!NOTE]
> Este documento descreve o contexto geral do projeto, o estado atual do sistema e a visão de evolução.
> Ele não define detalhes de implementação nem substitui documentos de decisão ou especificações técnicas.

---

## 1. Visão Geral do Sistema

O sistema é uma plataforma de catálogos digitais para distribuidores, projetada para permitir a organização de produtos, a apresentação de informações comerciais e o compartilhamento de visualizações públicas com clientes.

Este documento não descreve o sistema em detalhe técnico. O estado real e detalhado do sistema deve ser consultado nos documentos específicos:

- **Visão de Negócio e Produto:** `VISÃO_GERAL_DO_SISTEMA(BUSINESS + PRODUTO).md`
- **Auditoria Técnica:** `RELATORIO_AUDITORIA_TECNICA.md`

---

## 2. Estado Atual — MVP v1 (Congelado)

O MVP v1 está **FINALIZADO** e funcional. Ele representa a base estável do sistema sobre a qual novas funcionalidades são construídas.

### Princípios do MVP v1
- **Catálogo único implícito:** Existência de um catálogo por brand.
- **Gerenciamento de Produtos:** CRUD funcional para administração dos itens.
- **Importação:** Suporte a carga de dados via arquivos CSV.
- **Visualização Pública:** Interface básica para apresentação dos produtos.
- **Offline / PWA:** Funcionalidade offline em modo somente leitura (read-only).

> [!IMPORTANT]
> **Regra de Estabilidade:** O MVP v1 não é reescrito. Alterações só ocorrem via hotfix pontual, estritamente quando necessário.

---

## 3. Evolução V2 — Visão de Alto Nível

A Evolução V2 introduz novos conceitos ao sistema sem quebrar a estabilidade do MVP v1. A estratégia adotada é de expansão incremental.

### Escopo do legado v1
- **Base Geral de Produtos:** Centralização dos produtos da marca, independente de catálogo.
- **Categorias e Subcategorias:** Organização hierárquica para classificação.
- **Múltiplos Catálogos:** Criação de agrupadores de produtos para diferentes contextos.
- **Links Públicos (Share Links):** Compartilhamento flexível de seleções de catálogos.
- **PDF como Artefato Comercial:** Geração de documentos estruturados para uso comercial.

> [!TIP]
> As decisões canônicas da Evolução V2 estão registradas em `ADR_V2.md`, que é a autoridade e fonte de verdade para essa fase.

---

## 4. Convivência MVP v1 × Evolução V2

- **Coexistência:** O MVP v1 e a Evolução V2 convivem no mesmo ecossistema.
- **Expansão:** A evolução ocorre por adição de novas capacidades, não por substituição imediata.
- **Sem Cutover:** Não existe virada de chave automática; funcionalidades, rotas e dados do v1 permanecem válidos e operantes.

---

## 5. Governança do Projeto

A estrutura de governança define responsabilidades claras para manter a integridade do projeto:

- **Planner:** Define o escopo, toma as decisões de produto/arquitetura e determina a sequência de execução.
- **Executor:** Implementa as soluções técnicas exatamente conforme o solicitado e especificado.
- **Escrivão:** Redige, organiza e mantém a documentação seguindo instruções explícitas, sem criar decisões.
- **Validador:** Audita o código produzido e a execução das tarefas para garantir aderência às regras e qualidade.

---

## 6. Fontes de Verdade Oficiais

Estes são os documentos canônicos que regem o projeto:

### Decisões
- `ADR_V2.md`

### Estado Real
- `VISÃO_GERAL_DO_SISTEMA(BUSINESS + PRODUTO).md`
- `RELATORIO_AUDITORIA_TECNICA.md`

### Contratos Técnicos
- `BACKEND_SPEC.md`
- `FRONTEND_SPEC.md`
- `FEATURES_SPEC.md`
- `INTEGRATION_SPEC.md`

### Execução e Status
- `OUTPUTS_TRACKER.md`

---

## 7. Glossário Canônico

Definições conceituais de alto nível para alinhamento de entendimento:

- **Produto (Base Geral):** Entidade neutra que representa um item vendável, independente de sua apresentação em catálogos.
- **Categoria / Subcategoria:** Estrutura de classificação hierárquica à qual um produto pertence.
- **Catálogo:** Agrupador lógico de produtos criado para atender a contextos comerciais específicos (ex: sazonalidade, perfil de cliente).
- **Share Link:** Link público gerado para compartilhar uma combinação específica de catálogos com terceiros.
- **MVP v1:** Versão inicial e estável do sistema, focada em catálogo único por brand e funcionalidades essenciais.
- **Evolução V2:** Fase de expansão do sistema que introduz múltiplos catálogos e maior flexibilidade comercial, mantendo o legado funcional.
