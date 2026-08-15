# 🤖 Regras Obrigatórias para Agentes de IA (AI Agents Instructions)

Este arquivo contém as instruções e regras mandatórias que **todo agente de IA (qualquer modelo ou provedor)** DEVE seguir ao atuar neste repositório.

---

## 📋 Regra 1: Workflow de Issues e PRs no GitHub
1. Para cada tarefa recebida (seja Correção, Melhoria ou Nova Função), você deve identificar ou estruturar a Issue correspondente.
2. Todo deploy e entrega deve ser planejado como um Pull Request (PR).
3. **Sempre mencione a Issue na descrição do PR** utilizando `Closes #<numero_da_issue>` ou `Resolves #<numero_da_issue>`.
4. Mantenha os arquivos `.md` do projeto atualizados com as decisões tomadas.

---

## 📋 Regra 2: Motion Principles (`github.com/kylezantos/design-principles`)
1. **Skeletons em 100% dos estados de carregamento**: Nunca renderize layouts vazios ou flashes brancos enquanto dados são buscados na Tomato API.
2. **Lazy Loading**: Utilize o componente `LazyImage` em todas as imagens com efeito shimmer e progressive load.
3. **Transições Suaves**: Toda entrada, saída, troca de aba e ação deve ter animação suave (`cubic-bezier(0.16, 1, 0.3, 1)` ou spring).
4. **Sem referências a premiações obsoletas**: Mantenha a identidade minimalista da marca Vitta Basics em Preto & Branco.

---

## 📋 Regra 3: Observabilidade, Qualidade e Testes
1. **Observabilidade Ativa**: Use `src/services/observability.ts` para reportar erros ao Sentry e registrar telemetria (OpenTelemetry / Datadog / NewRelic).
2. **Qualidade de Código**: Respeite os contratos arquiteturais (`Arch-contract`), Biome, Commitlint e Knip.
3. **Testes**: Adicione testes unitários (Vitest) e testes ponta a ponta (Playwright) para cada nova regra de negócio ou tela adicionada.
