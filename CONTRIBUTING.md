# Guia de Contribuição & Governança de Engenharia - Vitta Basics

Este documento define o fluxo padrão de trabalho, engenharia de software e padrões de qualidade que **todos os desenvolvedores e agentes de Inteligência Artificial** devem seguir neste repositório.

---

## 1. 🔄 Fluxo de Trabalho (Issues & Pull Requests)

### A. Criação Prévia de Issue (Obrigatória)
Antes de qualquer alteração no código (seja Correção, Melhoria ou Nova Função), uma **Issue no GitHub** deve existir ou ser criada:
- `feat: [Título]` para novas funcionalidades.
- `fix: [Título]` para correções de bugs.
- `refactor: [Título]` para otimizações ou melhorias de arquitetura/motion.

### B. Gestão de Deploys via Pull Requests (PRs)
- **Nunca comite diretamente na branch principal sem revisão**.
- Toda alteração deve ser submetida via Pull Request.
- **Obrigatoriamente mencione a Issue no corpo do PR** usando palavras-chave do GitHub:
  ```markdown
  Closes #12
  Resolves #45
  ```
- O deploy contínuo (CI/CD) é disparado a partir da aprovação e merge dos PRs.

---

## 2. 🎬 Motion Principles & Design System (`github.com/kylezantos/design-principles`)

Toda e qualquer interface da loja Vitta Basics deve aderir aos princípios de movimento fluido:
1. **Skeletons Obrigatórios**: Nenhuma tela ou componente deve exibir tela em branco durante carregamento. Utilize sempre os componentes de Skeleton (`CardSkeleton`, `TableSkeleton`, etc.).
2. **Lazy Loading com Shimmer**: Todas as imagens e mídias devem usar lazy loading progressivo com efeito shimmer/blur-up (`LazyImage.tsx`).
3. **Curvas de Easing Naturais**: Transições e animações de entrada e saída devem utilizar `cubic-bezier(0.16, 1, 0.3, 1)` ou parâmetros de mola (`spring`).
4. **Micro-interações e Feedback**: Botões, seletores de cores e quantidade devem reagir imediatamente ao toque/hover.

---

## 3. 🛡️ Observabilidade, Qualidade de Código & Testes

### A. Observabilidade
- O sistema conta com telemetria unificada (`src/services/observability.ts`) com suporte a **Sentry, OpenTelemetry, Datadog e NewRelic**.
- Toda ação crítica (adicionar ao carrinho, checkout, erros de API) deve registrar breadcrumbs e métricas de Web Vitals (LCP, CLS, INP).
- `ErrorBoundary` cobre a árvore de componentes para prevenir quebras de tela.

### B. Qualidade e Linting
- **Biome / Oxlint**: Formatação e linting estrito.
- **Commitlint**: Validação de mensagens de commit seguindo a especificação Conventional Commits.
- **Knip**: Varredura regular de dependências órfãs e código morto.
- **Stryker**: Testes de mutação para garantir a resiliência dos testes.
- **Arch-Contract**: Preservar a separação em camadas (`components`, `pages`, `services`, `context`, `types`).

### C. Testes Unitários, Integração & E2E
- **Vitest & Codecov**: Testes unitários para regras de negócio (carrinho, cupons, cálculos).
- **Playwright**: Testes End-to-End cobrindo a jornada completa do cliente e do painel administrativo.
