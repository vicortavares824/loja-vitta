import { useEffect, useState } from 'react';

/**
 * Assina uma media query via `window.matchMedia` e re-renderiza quando o
 * resultado muda (ex.: ao cruzar um breakpoint durante o redimensionamento).
 *
 * - Calcula o estado inicial no primeiro render.
 * - Registra um listener de `change` e o remove no cleanup.
 * - Em ambientes sem `window`/`matchMedia` (SSR/navegadores antigos),
 *   retorna `false` como padrão seguro, sem assinar nada.
 *
 * Base para R2.4 (re-layout ao redimensionar sem recarregar) e R11.
 */
export function useMediaQuery(query: string): boolean {
  const getMatches = (): boolean => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState<boolean>(getMatches);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQueryList = window.matchMedia(query);

    // Sincroniza caso a query tenha mudado entre o render inicial e o efeito.
    setMatches(mediaQueryList.matches);

    const handleChange = (event: MediaQueryListEvent): void => {
      setMatches(event.matches);
    };

    mediaQueryList.addEventListener('change', handleChange);

    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

export default useMediaQuery;
