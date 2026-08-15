# 🏛️ Contratos Arquiteturais (Arch-Contracts) - Vitta Basics

Este documento define a hierarquia de camadas estrita e os contratos de dependência do projeto.

---

## 📐 Estrutura de Camadas (Layered Architecture)

```
┌─────────────────────────────────────────────────────────┐
│                       App.tsx                           │
└──────┬───────────────────────┬───────────────────┬──────┘
       │                       │                   │
       ▼                       ▼                   ▼
┌──────────────┐       ┌──────────────┐     ┌─────────────┐
│  pages/      │       │  admin/      │     │ components/ │
└──────┬───────┘       └───────┬──────┘     └──────┬──────┘
       │                       │                   │
       └───────────────┬───────┴───────────────────┘
                       │
                       ▼
               ┌───────────────┐
               │   context/    │
               └───────┬───────┘
                       │
                       ▼
               ┌───────────────┐
               │   services/   │ (Tomato API, Observability)
               └───────┬───────┘
                       │
                       ▼
               ┌───────────────┐
               │    types/     │ (Zero dependências externas)
               └───────────────┘
```

---

## 🔒 Regras de Integridade (Contracts)

1. **Camada de Types (`src/types/`)**:
   - É a base do sistema. **Não pode importar nenhuma outra camada**.
2. **Camada de Serviços (`src/services/`)**:
   - Contém comunicação de rede (Tomato API REST) e Observabilidade. Só pode importar `types`.
3. **Camada de Estado (`src/context/`)**:
   - Controla o ciclo de vida do carrinho e modais. Só pode importar `services` e `types`.
4. **Camada de Componentes UI (`src/components/ui/`)**:
   - Componentes puros (Skeletons, LazyImage). Devem ser agnósticos a regras de negócio.
5. **Prevenção de Dependências Circulares**:
   - É terminantemente proibido importar um componente de página dentro de um serviço ou contexto.
