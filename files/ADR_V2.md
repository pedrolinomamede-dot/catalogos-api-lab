# ADR_V2 — Decisões Canônicas da Evolução do Sistema

**Status:** Em vigor (V2)  
**Escopo:** Decisões de domínio, produto e convivência MVP v1 × V2

> [!NOTE]
> Este documento registra decisões já tomadas para a Evolução V2 do sistema.
> Nenhuma decisão é criada neste documento.
> Onde houver ambiguidade, ela é explicitamente documentada.

---

## ADR-001 — Base Geral de Produtos

### Contexto
No MVP v1, os produtos existem dentro de um único catálogo implícito por brand, limitando reutilização e flexibilidade.

### Decisão
Foi decidido criar uma Base Geral de Produtos por Brand, que representa todos os produtos da empresa, independentemente de catálogo.
- Produtos passam a existir de forma neutra
- Não pertencem implicitamente a nenhum catálogo
- Não representam venda
- Não exigem preço obrigatório

### Consequências
**Positivas:**
- Evita duplicação de produtos
- Facilita reutilização em múltiplos contextos
- Permite múltiplos catálogos simultâneos

**Trade-offs / Limites:**
- Exige camada adicional de organização
- Requer adaptação do fluxo de importação

---

## ADR-002 — Categorias e Subcategorias

### Contexto
Categorias no MVP v1 já são classificatórias.

### Decisão
Categorias continuam sendo classificação, não cópia de produto.
- Um produto pertence a uma única categoria no modelo inicial
- Subcategorias são permitidas
- Categoria não cria produto novo

### Consequências
**Positivas:**
- Organização simples e previsível
- Evita duplicação e inconsistência

**Trade-offs / Limites:**
- Não permite múltiplas categorias por produto neste modelo inicial

---

## ADR-003 — Catálogos como Agrupadores

### Contexto
O MVP v1 possui apenas um catálogo implícito por brand.

### Decisão
Foi decidido introduzir Catálogos explícitos, que são agrupadores intencionais de produtos existentes.
- Catálogos começam vazios
- Não criam produtos
- Não duplicam dados
- Um produto pode pertencer a N catálogos simultaneamente
- Catálogos existem para contextos comerciais (promoção, cliente, sazonalidade)

### Consequências
**Positivas:**
- Flexibilidade máxima de apresentação
- Reuso da base geral

**Trade-offs / Limites:**
- Introduz nova camada conceitual ao usuário

---

## ADR-004 — Links Públicos (Share Links)

### Contexto
No MVP v1, a visualização pública é fixa por brand.

### Decisão
Foi decidido que Links Públicos passam a ser entidades persistidas, que representam uma combinação fixa de catálogos.
- Um link pode incluir um ou mais catálogos
- O link pode ser revogado a qualquer momento
- Revogação invalida o acesso imediatamente

### Consequências
**Positivas:**
- Permite compartilhar diferentes combinações de catálogos para contextos comerciais distintos, sem duplicar produtos
- Permite controle operacional do que é compartilhado (criar, listar, copiar e revogar links)

**Trade-offs / Limites:**
- Introduz necessidade de governança de links (quem criou, quais catálogos inclui, e quando revogar)
- Mantém em aberto a definição de comportamento do link (snapshot vs dinâmico), o que impactará expectativas de atualização do catálogo compartilhado

### Ambiguidade (Decisão em aberto)
> [!IMPORTANT]
> Ainda não foi decidido se o link:
> A) representa um snapshot do estado no momento da criação
> B) reflete dinamicamente o estado atual dos catálogos
> Esta ambiguidade está registrada e não resolvida.

---

## ADR-005 — Experiência Pública do Cliente Final

### Contexto
A experiência pública atual é única e estática.

### Decisão
A experiência pública via link deve permitir:
- Visualização de múltiplos catálogos na mesma página
- Troca fluida entre catálogos
- Busca global sobre todos os catálogos liberados
- Navegação sem autenticação

### Consequências
**Positivas:**
- UX mais rica e comercial

**Trade-offs / Limites:**
- Maior complexidade de UI pública

---

## ADR-006 — PDF como Artefato Comercial

### Contexto
Exportações técnicas não atendem ao uso comercial.

### Decisão
O PDF passa a ser tratado como artefato comercial, não como print técnico.
- Estruturado
- Organizado por catálogo e categoria
- Visualmente profissional

### Consequências
**Positivas:**
- Gera um material de apresentação comercial mais profissional e adequado para envio a clientes
- Padroniza a apresentação dos produtos por catálogo e categoria, reduzindo dependência de “prints” e improvisos

**Trade-offs / Limites (Limites do MVP V2):**
- Layout fixo
- Sem customização avançada
- Volume limitado de produtos

---

## ADR-007 — Offline e PWA

### Contexto
O sistema já possui PWA e offline no MVP v1.

### Decisão
Offline permanece read-only na Evolução V2.
- Nenhuma escrita offline
- Nenhum sync ou replay no MVP

### Consequências
**Positivas:**
- Mantém simplicidade operacional e reduz risco de inconsistência de dados ao evitar escrita offline
- Preserva a filosofia já existente do sistema: acesso offline como apoio de consulta e apresentação (read-only)

**Trade-offs / Limites:**
- Não atende casos de uso que exigem operação offline com edição, fila de sincronização ou replay
- Evoluções futuras (escrita offline) exigirão decisões e escopo dedicados, fora do MVP V2

---

## ADR-008 — Convivência MVP v1 × Evolução V2

### Contexto
O sistema já está funcional e em uso.

### Decisão
A Evolução V2 será implementada por expansão, não substituição.
- MVP v1 continua funcionando
- Não há cutover automático
- Funcionalidades existentes permanecem válidas

### Consequências
**Positivas:**
- Reduz risco de regressão ao permitir que o MVP v1 continue funcionando enquanto a V2 é implementada incrementalmente
- Permite evolução por adição, com validações por etapas, sem exigir migração completa imediata

**Trade-offs / Limites:**
- Aumenta complexidade temporária por coexistência de conceitos e rotas entre v1 e v2 durante a transição
- Exige comunicação clara na documentação e na UI para evitar confusão entre áreas/fluxos do v1 e do v2

---

## Decisões em Aberto

**Tema:** Comportamento de atualização dos Links Públicos
**Opções conhecidas:**
1. Snapshot do estado na criação
2. Reflexo dinâmico do estado atual
**Status:** Em aberto
