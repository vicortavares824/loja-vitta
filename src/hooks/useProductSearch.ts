import { useEffect, useState } from 'react';
import type { Product } from '../types/ecommerce';
import { tomatoApi } from '../services/tomatoApi';

const DEBOUNCE_MS = 200;

interface ProductSearchState {
  results: Product[];
  loading: boolean;
  /** Termo (já sem espaços nas pontas) a que `results` se refere. */
  term: string;
}

/**
 * Busca de produtos com debounce. Respostas antigas são descartadas quando o
 * termo muda antes de a requisição terminar.
 */
export function useProductSearch(query: string): ProductSearchState {
  const term = query.trim();
  const [state, setState] = useState<ProductSearchState>({ results: [], loading: false, term: '' });

  useEffect(() => {
    if (!term) {
      setState({ results: [], loading: false, term: '' });
      return;
    }
    let alive = true;
    setState((prev) => ({ ...prev, loading: true }));
    const timer = window.setTimeout(() => {
      tomatoApi
        .getProducts(undefined, term)
        .then((data) => {
          if (alive) setState({ results: data, loading: false, term });
        })
        .catch(() => {
          if (alive) setState({ results: [], loading: false, term });
        });
    }, DEBOUNCE_MS);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [term]);

  return state;
}
