import { useMediaQuery } from './useMediaQuery';

/**
 * Indica se o usuário prefere movimento reduzido (`prefers-reduced-motion: reduce`).
 *
 * Derivado de {@link useMediaQuery}; re-renderiza quando a preferência do
 * sistema muda. Em ambientes sem `window`/`matchMedia` retorna `false`.
 *
 * Base para R11.2: montar o fallback estático das animações pesadas quando o
 * usuário sinaliza preferência por movimento reduzido.
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

export default usePrefersReducedMotion;
