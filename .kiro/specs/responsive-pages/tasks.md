# Implementation Plan: Páginas Responsivas (Vitta Basics)

## Overview

Esta é a abordagem de implementação: padronizar o comportamento responsivo sobre os breakpoints padrão do Tailwind já em uso, fechar lacunas de cobertura, prevenir overflow horizontal de forma global, garantir alvos de toque de 44px no mobile e adicionar uma camada de detecção de viewport/movimento reduzido para degradar as animações pesadas. As tarefas começam pelas fundações (hooks, CSS global, utilitário de toque), seguem pelo `AnimationGate` e pela adaptação componente a componente das visões, e terminam com a suíte de testes de viewport (Playwright) e os testes unitários dos hooks e do gate. Conforme o design, **não há testes baseados em propriedades (PBT)**: este é trabalho de layout de UI e a verificação usa testes por exemplo (Vitest/RTL) e testes de viewport (Playwright) em 360/768/1280.

## Tasks

- [x] 1. Fundações: hooks de ambiente, guarda global de overflow e utilitário de toque
  - [x] 1.1 Criar o hook `useMediaQuery`
    - Criar `src/hooks/useMediaQuery.ts` com `useMediaQuery(query: string): boolean`
    - Calcular o estado inicial no primeiro render via `window.matchMedia(query).matches`
    - Registrar listener de `change` para re-renderizar ao cruzar o breakpoint; remover o listener no cleanup
    - Checar `typeof window !== 'undefined'` e `window.matchMedia` antes de assinar; retornar `false` como padrão seguro quando indisponível
    - _Requirements: R2.4, R11 (base)_

  - [ ]* 1.2 Escrever testes unitários para `useMediaQuery`
    - Vitest/RTL com `window.matchMedia` mockado; afirmar valor inicial para `matches: true/false`
    - Simular evento `change` e afirmar re-render com o novo valor
    - Caso de borda: `matchMedia` indisponível → retorna o padrão seguro
    - _Requirements: R2.4_

  - [x] 1.3 Criar o hook `useBreakpoint` e as faixas canônicas
    - Criar `src/hooks/useBreakpoint.ts` exportando `type Breakpoint = 'mobile' | 'tablet' | 'desktop'` e a constante `BREAKPOINTS` (`mobileMax: 639`, `tabletMin: 640`, `desktopMin: 1024`)
    - Derivar `useBreakpoint(): Breakpoint` de `useMediaQuery` com `(max-width: 639px)`, `(min-width:640px) and (max-width:1023px)` e `(min-width: 1024px)`
    - Retornar `desktop` como padrão seguro quando `matchMedia` indisponível
    - _Requirements: R2.4, R11.1_

  - [ ]* 1.4 Escrever testes unitários para `useBreakpoint`
    - Mockar `matchMedia` para cada faixa e afirmar o breakpoint resolvido (`mobile`/`tablet`/`desktop`)
    - Afirmar padrão `desktop` quando `matchMedia` indisponível
    - _Requirements: R2.4_

  - [x] 1.5 Criar o hook `usePrefersReducedMotion`
    - Criar `src/hooks/usePrefersReducedMotion.ts` como `useMediaQuery('(prefers-reduced-motion: reduce)')`
    - _Requirements: R11.2_

  - [ ]* 1.6 Escrever teste unitário para `usePrefersReducedMotion`
    - Mockar `(prefers-reduced-motion: reduce)` → afirmar `true` e `false`
    - _Requirements: R11.2_

  - [x] 1.7 Adicionar guarda global de overflow horizontal e utilitário de toque no CSS
    - Em `src/index.css`, adicionar `overflow-x: hidden` em `html, body` como rede de segurança contra blocos posicionados (overlays, blur, `absolute`)
    - Adicionar a classe utilitária compartilhada `.tap-target` com `min-width: 44px; min-height: 44px` (referência: `.btn-icon` já com 44×44)
    - _Requirements: R1.1, R1.4, R4.1, R4.4_

  - [x] 1.8 Verificar o container raiz em `App.tsx`
    - Confirmar que a `<div>` de nível superior aplica `overflow-x-hidden`; ajustar se ausente
    - _Requirements: R1.1_

- [x] 2. Camada de degradação de animações pesadas (AnimationGate)
  - [x] 2.1 Implementar o wrapper `AnimationGate`
    - Criar `src/components/reactbits/AnimationGate.tsx` com `AnimationGateProps` (`renderFull`, `renderReduced?`, `renderStatic`)
    - Decidir o branch com base em `useBreakpoint()` e `usePrefersReducedMotion()`:
      - `prefers-reduced-motion: reduce` → `renderStatic` (fallback estático)
      - mobile sem preferência → `renderReduced` (ou `renderStatic` quando `renderReduced` ausente)
      - desktop sem preferência → `renderFull`
    - _Requirements: R11.1, R11.2_

  - [ ]* 2.2 Escrever testes unitários para `AnimationGate`
    - Para cada combinação (desktop/mobile × reduce/no-preference), afirmar o branch renderizado (full/reduced/static)
    - Afirmar fallback para `renderStatic` quando `renderReduced` ausente em mobile
    - _Requirements: R11.1, R11.2_

  - [x] 2.3 Conectar os Heavy_Animation_Components ao `AnimationGate` na home
    - Envolver `MagicRings`, `Cubes`, `LaserFlow`, `WavesBackground`, `ScrollVelocity`, `ScrollExpand` e `WarpText` com `AnimationGate` em `src/App.tsx` (seções da home)
    - Modo custo reduzido por componente: reduzir `ringCount` do `MagicRings`, desabilitar `followMouse`, reduzir `velocity` do `ScrollVelocity`, desabilitar `autoAnimate` do `Cubes`; usar fallback estático onde não houver modo barato
    - _Requirements: R11.1, R11.2, R11.3_

  - [x] 2.4 Formalizar o fallback de inicialização WebGL e envolver seções com ErrorBoundary
    - Garantir que cada componente WebGL trate falha de contexto em `try/catch` e renderize fallback estático visível (ou nada) sem quebrar o layout; manter o fundo em ancestral `relative overflow-hidden` com `absolute inset-0`
    - Envolver as seções de animação da home com o `ErrorBoundary` existente (`src/components/ErrorBoundary.tsx`) como rede de segurança
    - _Requirements: R11.3, R11.4_

- [x] 3. Navegação responsiva (Navbar)
  - [x] 3.1 Verificar e ajustar o `Navbar` para alvos de toque e ausência de overflow
    - Em `src/components/Navbar.tsx`, confirmar a troca no limite `lg` (`hidden lg:flex` inline / `lg:hidden` hambúrguer) e a sobreposição `fixed inset-0 ... lg:hidden`
    - Elevar a área tocável dos botões de ícone do cabeçalho (`w-10 h-10`, `w-9 h-9`) para 44×44 no mobile via `.tap-target`
    - Garantir que a sobreposição mobile mantenha itens `w-full` com `px-6` sem overflow e que a seleção navegue e feche (`handleNavClick`)
    - _Requirements: R5.1, R5.2, R5.3, R5.4, R5.5, R4.1, R4.4_

- [x] 4. Grade de produtos e cards de produto
  - [x] 4.1 Verificar e ajustar `Product_Grid` e `Product_Card`
    - Confirmar `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` em `src/components/ProductGrid.tsx` e `src/components/pages/ProductsPage.tsx` (sem mudar valores)
    - Em `src/components/ProductCardModern.tsx`, adicionar `flex-wrap` ao seletor de cor para quebrar em novas linhas (o seletor de tamanho já tem `flex-wrap`)
    - Confirmar imagem/textos contidos (`line-clamp-1`/`line-clamp-2`) e a linha de ação (`Comprar` + `Shopee`, botões `flex-1`) sem overflow dentro do card
    - Confirmar a fileira de categorias com `overflow-x-auto ... scrollbar-none` e `whitespace-nowrap` confinando a rolagem
    - _Requirements: R6.1, R6.2, R6.3, R6.4, R6.5, R1.2_

- [x] 5. Filtros de catálogo responsivos (ProductsPage)
  - [x] 5.1 Ajustar sidebar de filtros vs. toggle mobile e toolbar
    - Em `src/components/pages/ProductsPage.tsx`, confirmar que a `aside` de filtros fica oculta abaixo de `lg` (`hidden lg:block`) e é revelada pelo toggle `mobileFilterOpen` com `w-full`, sem largura fixa que estoure a tela
    - Confirmar sidebar ao lado da grade em `lg` (`lg:col-span-3` + `lg:col-span-9`)
    - Garantir toolbar superior (chips de filtro ativo + ordenação) com `flex flex-col sm:flex-row` e `flex-wrap` dentro da largura no mobile
    - _Requirements: R7.1, R7.2, R7.3, R7.4, R1.2_

- [x] 6. Painel administrativo responsivo
  - [x] 6.1 Empilhar cabeçalho, ajustar KPIs e abas roláveis no admin
    - Em `src/components/admin/TomatoAdminPanel.tsx`, ajustar o cabeçalho (título + ações) para `flex-col sm:flex-row` (empilhar em toda a faixa mobile)
    - Confirmar cards de KPI `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (1/2/4 colunas)
    - Confirmar barra de abas `flex ... overflow-x-auto scrollbar-none` com abas `whitespace-nowrap`, rolável dentro do próprio container
    - _Requirements: R8.1, R8.2, R8.5_

  - [x] 6.2 Envolver cada Data_Table em `overflow-x-auto` nos subpainéis
    - Garantir wrapper `overflow-x-auto` em cada tabela de `TomatoAdminPanel.tsx`, `src/components/admin/InventoryPanel.tsx`, `src/components/admin/BulkInventoryPanel.tsx` e `src/components/admin/CategoryAdminPanel.tsx`, confinando a rolagem horizontal ao container
    - Aplicar `truncate`/`break-words` em tokens inquebráveis de células (ex.: e-mails longos)
    - _Requirements: R8.3, R1.3, R3.4_

  - [x] 6.3 Ajustar o modal de edição de produto para caber no mobile
    - No modal de edição de produto do admin, aplicar `w-full max-w-*` com margens laterais e corpo `max-h-[90vh] overflow-y-auto` para rolagem vertical (padrão do `Quick_View_Modal`)
    - _Requirements: R8.4_

- [x] 7. Sobreposições: Cart_Drawer, Quick_View_Modal, Search_Modal
  - [x] 7.1 Ajustar o `Cart_Drawer` para largura total no mobile
    - Em `src/components/CartDrawer.tsx`, remover o padding esquerdo externo no mobile (`pl-0 sm:pl-10`) e permitir painel `w-full` até `sm`, mantendo `max-w-md` a partir de `sm` ancorado à direita
    - Confirmar lista `flex-1 overflow-y-auto` com header e footer de checkout fora da área rolável (visíveis)
    - _Requirements: R9.1, R9.2, R9.3_

  - [x] 7.2 Verificar o empilhamento e a rolagem do `Quick_View_Modal`
    - Em `src/components/ProductQuickViewModal.tsx`, confirmar `grid grid-cols-1 md:grid-cols-12` (coluna única no mobile), container `max-w-4xl max-h-[90vh] overflow-y-auto` e `p-4 sm:p-6` com `w-full` cabendo na Viewport
    - _Requirements: R9.4, R9.6_

  - [x] 7.3 Verificar a largura e a rolagem do `Search_Modal`
    - Em `src/components/SearchModal.tsx`, confirmar `w-full max-w-2xl`, wrapper externo com `px-4` no mobile e corpo `max-h-[60vh] overflow-y-auto` sem overflow
    - _Requirements: R9.5, R9.6_

- [x] 8. Checkpoint - Garantir que fundações, animações, grade, filtros, admin e overlays estejam consistentes
  - Garanta que todos os testes passem; pergunte à pessoa usuária se surgirem dúvidas.

- [x] 9. Formulários de autenticação e cadastro responsivos
  - [x] 9.1 Ajustar o CSS compartilhado de login para largura total e toque de 44px
    - Em `src/styles/login.css`, garantir `.login-input` e `.btn-primary` com `width: 100%` no contexto de login
    - Definir `min-height: 44px` em `.login-input` com padding vertical adequado (área tocável ≥ 44px)
    - Aplicar `overflow-wrap`/`break-words` em `.login-error` para não estourar a largura
    - _Requirements: R10.2, R10.3, R10.4_

  - [x] 9.2 Aplicar o padrão de card centralizado nas quatro Auth_Page
    - Em `ClientLoginPage`, `AdminLoginPage`, `ClientSignUpPage` e `AdminSignUpPage`, confirmar `section` centralizada (`flex min-h-screen items-center justify-center`) e card `w-full max-w-md px-6` em todas as larguras suportadas
    - Confirmar campos e botão de envio com largura total do card e mensagens de erro dentro do card
    - _Requirements: R10.1, R10.2, R10.4_

- [x] 10. Escala tipográfica
  - [x] 10.1 Reduzir títulos de destaque e reforçar pisos de texto no mobile
    - Ajustar os títulos de destaque da home (ex.: H1 `text-6xl sm:text-8xl`) para começarem dentro de 20–40px no mobile (ex.: `text-3xl`/`text-4xl` na base, escalando com `sm:`/`md:`) em `src/App.tsx` e seções correlatas
    - Garantir texto de corpo com mínimo efetivo de 14px (`text-sm`) e `line-height` ≥ 1.4 (`leading-relaxed`/`leading-normal`); evitar `text-xs` para leitura contínua no mobile
    - Aplicar `break-words`/`overflow-wrap: anywhere` em containers de texto livre e `truncate`/`line-clamp` para tokens inquebráveis
    - _Requirements: R3.1, R3.2, R3.3, R3.4, R3.5_

- [x] 11. Ajuste de layout do rodapé
  - [x] 11.1 Reduzir o tamanho da logo do `Footer` no mobile
    - Em `src/components/Footer.tsx`, reduzir a logo (`w-50 h-50`) para um tamanho coerente (ex.: `w-16 h-16` ou `w-20 h-20`), evitando comprometer o layout de coluna única
    - _Requirements: R1.1, R2.1_

- [x] 12. Verificação de meta viewport
  - [x] 12.1 Verificar a tag de meta viewport em `index.html`
    - Confirmar que `index.html` declara `<meta name="viewport" content="width=device-width, initial-scale=1.0" />` e garantir que não seja removida
    - _Requirements: R12.1, R12.2_

- [ ] 13. Testes de viewport e de interação (Playwright)
  - [ ]* 13.1 Criar `e2e/responsive.spec.ts` parametrizado em 360/768/1280
    - Para cada visão (`home`, `products`, `categories`, `search`, `admin` e uma `Auth_Page`), afirmar `document.body.scrollWidth <= window.innerWidth` em 360, 768, 1280 e na largura exata de 360px; afirmar `scrollWidth <= clientWidth` no `body`
    - Contagem de colunas comparando `getBoundingClientRect().top` dos `Product_Card` (1/2/3) e KPIs do admin (1/2/4)
    - Navbar (R5): 360/768 hambúrguer visível e inline oculta, seleção navega e fecha; 1280 inline visível
    - Filtros (R7): 360/768 sidebar oculta + toggle presente, painel revelado sem overflow; 1280 sidebar ao lado
    - Admin (R8.2, R8.3): wrapper da `Data_Table` rolável e barra de abas rolável enquanto `body` sem scroll lateral
    - Overlays (R9): em 360 `Cart_Drawer` full-width; abrir `Quick_View_Modal`/`Search_Modal` sem overflow e com rolagem vertical
    - Alvos de toque (R4): medir `getBoundingClientRect()` de controles-chave no mobile e afirmar `width >= 44 && height >= 44`
    - Tipografia (R3): `fontSize >= 14px` e `lineHeight >= 1.4 * fontSize` no corpo; `20px <= fontSize <= 40px` nos títulos de destaque no mobile
    - Meta viewport (R12): afirmar `meta[name="viewport"]` com `width=device-width` e `initial-scale=1`
    - _Requirements: R1.1, R1.2, R1.3, R1.4, R2.2, R2.3, R3.1, R3.2, R4.1, R5.1, R5.2, R6.1, R6.2, R6.3, R7.1, R7.2, R7.3, R8.1, R8.2, R8.3, R9.1, R9.4, R9.5, R12.1_

  - [ ]* 13.2 Adicionar testes de movimento reduzido e falha de WebGL (Playwright)
    - Usar `test.use({ reducedMotion: 'reduce' })` e afirmar fallback estático nas seções de animação (canvas ativo ausente / elemento de fallback presente) sem overflow
    - Nos projetos mobile (`Pixel 5`, `iPhone 12`), afirmar montagem em modo reduzido (canvas ausente ou parâmetros reduzidos) sem overflow
    - Simular contexto WebGL indisponível via `addInitScript` e afirmar render da visão sem a animação e sem overflow
    - _Requirements: R11.1, R11.2, R11.3, R11.4_

- [x] 14. Checkpoint final - Garantir que toda a suíte passe
  - Garanta que todos os testes (unitários e de viewport) passem; pergunte à pessoa usuária se surgirem dúvidas.

## Notes

- As tarefas marcadas com `*` são opcionais (testes) e podem ser puladas para um MVP mais rápido.
- Cada tarefa referencia requisitos específicos (R1–R12) para rastreabilidade.
- Os checkpoints garantem validação incremental.
- Conforme o design, **não há testes baseados em propriedades**: a verificação usa testes por exemplo (Vitest/RTL) e testes de viewport determinísticos (Playwright) em 360/768/1280.
- As fundações (hooks, CSS global, utilitário de toque) vêm primeiro; o `AnimationGate` precede a conexão das animações; os testes vêm após a implementação que eles exercem.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.7", "1.8", "12.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.5", "3.1", "4.1", "5.1", "6.1", "6.2", "6.3", "7.1", "7.2", "7.3", "9.1", "10.1", "11.1"] },
    { "id": 2, "tasks": ["1.4", "1.6", "2.1", "9.2"] },
    { "id": 3, "tasks": ["2.2", "2.3"] },
    { "id": 4, "tasks": ["2.4"] },
    { "id": 5, "tasks": ["13.1", "13.2"] }
  ]
}
```
