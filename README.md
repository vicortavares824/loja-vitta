# Vitta Basics | Minimalist E-Commerce Platform

Plataforma de comércio eletrônico de alta performance e moda minimalista integrada com a **TomatoPHP REST API**, animações interativas **React Bits WebGL** e princípios de movimento **Motion Principles** (`github.com/kylezantos/design-principles`).

---

## 🚀 Funcionalidades Principais

- **Visual P&B Minimalista**: Design em alto contraste preto & branco puro, com tipografia refinada e espaçamento respirado.
- **Animações React Bits WebGL**: `MagicRings` 3D no Hero, `SplashCursor` interativo, `LaserFlow`, `Cubes` flutuantes e `ScrollVelocity`.
- **Cards de Produto Estilo Referência**: Seletor de cores, seletor de tamanhos (`S`, `M`, `L`, `XL`), seletor de quantidade (`- 1 +`), botão de compra em pílula e galeria com dots.
- **Catálogo de Peças Completo**: Filtros avançados por categoria, faixa de preço, cores, tamanhos e ordenação.
- **Painel Administrativo TomatoPHP (`/admin`)**:
  - Dashboard de métricas e KPIs em tempo real (Faturamento, Pedidos, Ticket Médio).
  - Gestão e CRUD de Produtos com modal de cadastro.
  - Gestão de Pedidos com alteração de status em tempo real.
  - Gestão de Cupons e Simulador interativo da REST API TomatoPHP.

---

## 📐 Padrões de Engenharia & Governança

### 1. Workflow GitHub (Issues & PRs)
Consulte [CONTRIBUTING.md](CONTRIBUTING.md) e [AGENTS.md](AGENTS.md).
- Toda tarefa (Correção, Melhoria ou Nova Função) deve ter sua **Issue correspondente no GitHub**.
- Deploys são gerenciados via **Pull Requests**, mencionando obrigatoriamente a Issue (`Closes #X`).

### 2. Motion Principles (`github.com/kylezantos/design-principles`)
- **Skeletons** em todos os estados assíncronos.
- **Lazy Loading** de imagens com shimmer progressivo.
- Curvas de aceleração suaves (`cubic-bezier(0.16, 1, 0.3, 1)`).

### 3. Observabilidade, Qualidade & Testes
- **Observabilidade**: Integração unificada com Sentry, OpenTelemetry, Datadog e NewRelic (`src/services/observability.ts`).
- **Qualidade & Lint**: Biome (`biome.json`), Commitlint (`commitlint.config.cjs`), Knip (`knip.json`), Stryker (`stryker.config.json`) e Arch-Contracts (`architecture.contract.json`).
- **Testes**: Suíte de testes unitários com Vitest/Codecov e testes End-to-End com Playwright (`playwright.config.ts`).

---

## 🛠️ Scripts Disponíveis

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Compilar para produção
npm run build

# Executar linter
npm run lint

# Executar testes unitários (Vitest)
npm run test

# Executar testes End-to-End (Playwright)
npm run test:e2e
```
