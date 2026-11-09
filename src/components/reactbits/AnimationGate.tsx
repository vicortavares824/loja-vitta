import type { ReactNode } from 'react';

import { useBreakpoint } from '../../hooks/useBreakpoint';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

/**
 * Props do {@link AnimationGate}.
 *
 * O gate decide qual das três visões montar com base na faixa de viewport
 * (`useBreakpoint`) e na preferência de movimento (`usePrefersReducedMotion`),
 * centralizando a política de degradação dos `Heavy_Animation_Component` — R11.
 */
export interface AnimationGateProps {
  /** Render completo (desktop/tablet, sem preferência de redução). */
  renderFull: () => ReactNode;
  /** Modo de custo reduzido (mobile) — opcional; se ausente, usa `renderStatic`. */
  renderReduced?: () => ReactNode;
  /** Fallback estático (prefers-reduced-motion ou falha de WebGL). */
  renderStatic: () => ReactNode;
}

/**
 * Wrapper de política que seleciona a variante de animação a montar:
 *
 * - `prefers-reduced-motion: reduce` → `renderStatic` (fallback estático) — R11.2.
 * - Mobile sem preferência de redução → `renderReduced` (ou `renderStatic`
 *   quando `renderReduced` ausente) — R11.1.
 * - Desktop e tablet sem preferência de redução → `renderFull`.
 *
 * A seleção é reativa: como os hooks assinam as media queries, mudar o tamanho
 * da janela ou a preferência do sistema re-renderiza e troca a variante sem
 * recarregar a página (R2.4). Em ambientes sem `window`/`matchMedia` os hooks
 * retornam padrões seguros (`desktop` / `false`), resultando em `renderFull`.
 */
export function AnimationGate({
  renderFull,
  renderReduced,
  renderStatic,
}: AnimationGateProps): ReactNode {
  const breakpoint = useBreakpoint();
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) {
    return renderStatic();
  }

  if (breakpoint === 'mobile') {
    return renderReduced ? renderReduced() : renderStatic();
  }

  return renderFull();
}

export default AnimationGate;
