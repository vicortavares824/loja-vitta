import { useMediaQuery } from './useMediaQuery';

/**
 * Faixa de viewport canônica usada por componentes que precisam alternar
 * comportamento em JS (não apenas em CSS), como a degradação de animações.
 */
export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

/**
 * Faixas canônicas (px CSS) — espelham o glossário e os breakpoints do
 * Tailwind v4 já usados no projeto (`sm = 640px`, `lg = 1024px`).
 *
 * - `Mobile_Breakpoint`:  360–639  (base, até `sm`)
 * - `Tablet_Breakpoint`:  640–1023 (`sm` ativo, `lg` inativo)
 * - `Desktop_Breakpoint`: >= 1024  (`lg` ativo)
 */
export const BREAKPOINTS = {
  mobileMax: 639,
  tabletMin: 640,
  desktopMin: 1024,
} as const;

/**
 * Resolve a faixa de viewport atual derivando de `useMediaQuery` com as media
 * queries canônicas:
 *
 * - `(max-width: 639px)` → `mobile`
 * - `(min-width: 640px) and (max-width: 1023px)` → `tablet`
 * - `(min-width: 1024px)` → `desktop`
 *
 * Em ambientes sem `window`/`matchMedia` (SSR/navegadores antigos), nenhuma
 * query corresponde e o hook retorna `desktop` como padrão seguro, evitando
 * que a ausência de API quebre a montagem.
 *
 * Base para R2.4 (re-layout ao redimensionar sem recarregar) e R11.1.
 */
export function useBreakpoint(): Breakpoint {
  const isMobile = useMediaQuery(`(max-width: ${BREAKPOINTS.mobileMax}px)`);
  const isTablet = useMediaQuery(
    `(min-width: ${BREAKPOINTS.tabletMin}px) and (max-width: ${BREAKPOINTS.desktopMin - 1}px)`,
  );

  if (isMobile) {
    return 'mobile';
  }
  if (isTablet) {
    return 'tablet';
  }
  return 'desktop';
}

export default useBreakpoint;
