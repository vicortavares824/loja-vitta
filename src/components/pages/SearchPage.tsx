import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import type { Category } from '../../types/ecommerce';
import { getStoreCategories } from '../../services/storeCategories';
import { useProductSearch } from '../../hooks/useProductSearch';
import { ProductCardModern } from '../ProductCardModern';
import { CardSkeleton } from '../ui/Skeleton';
import { Reveal } from '../home/HomeMotion';

const RECENT_KEY = 'vb_recent_searches';
const MAX_RECENT = 6;

function readRecent(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>(readRecent);
  const [categories, setCategories] = useState<Category[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, loading, term } = useProductSearch(query);

  useEffect(() => {
    let alive = true;
    getStoreCategories()
      .then((cats) => {
        if (alive) setCategories(cats);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  }, [recent]);

  // Guarda o termo como recente quando a busca retorna algo
  useEffect(() => {
    if (!term || loading || results.length === 0) return;
    setRecent((prev) => [term, ...prev.filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(0, MAX_RECENT));
  }, [term, loading, results.length]);

  const runSearch = (value: string) => {
    setQuery(value);
    inputRef.current?.focus();
  };

  const hasQuery = query.trim().length > 0;
  const showingStale = hasQuery && (loading || term !== query.trim());

  return (
    <div className="min-h-screen bg-ink pb-24 pt-28 text-paper md:pt-36">
      <div className="mx-auto max-w-[1600px] px-[var(--gutter)]">
        <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-12 md:mb-16">
          <label htmlFor="search-input" className="eyebrow mb-4 block">
            Buscar
          </label>
          <div className="flex items-center gap-4 border-b border-line-strong transition-colors focus-within:border-paper">
            <input
              ref={inputRef}
              id="search-input"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoFocus
              placeholder="Camiseta, calça, preto…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-w-0 flex-1 bg-transparent py-3 font-display text-[clamp(2rem,6vw,5.5rem)] font-semibold uppercase leading-none tracking-[-0.04em] text-paper placeholder:text-paper/20 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {hasQuery && (
              <button type="button" onClick={() => runSearch('')} className="btn-icon shrink-0" aria-label="Limpar busca">
                <X className="h-6 w-6" strokeWidth={1.25} />
              </button>
            )}
          </div>
          <p aria-live="polite" className="eyebrow mt-3 h-4">
            {hasQuery ? (showingStale ? 'Buscando…' : `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'}`) : ''}
          </p>
        </form>

        {!hasQuery ? (
          <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
            {categories.length > 0 && (
              <Reveal className="md:col-span-7">
                <p className="eyebrow mb-4">Navegue por linha</p>
                <ul className="border-t border-line">
                  {categories.map((cat, i) => (
                    <li key={cat.id || cat.slug} className="border-b border-line">
                      <button
                        type="button"
                        onClick={() => runSearch(cat.name)}
                        className="group flex w-full items-baseline gap-4 py-4 text-left"
                      >
                        <span className="eyebrow w-6 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                        <span className="flex-1 truncate font-display text-2xl font-semibold uppercase tracking-[-0.02em] transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-2 md:text-3xl">
                          {cat.name}
                        </span>
                        <ArrowUpRight className="h-5 w-5 shrink-0 text-mute transition-colors group-hover:text-paper" strokeWidth={1.5} />
                      </button>
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}

            {recent.length > 0 && (
              <Reveal delay={0.08} className="md:col-span-4 md:col-start-9">
                <div className="mb-4 flex items-baseline justify-between">
                  <p className="eyebrow">Buscas recentes</p>
                  <button type="button" onClick={() => setRecent([])} className="eyebrow link-line hover:text-paper">
                    Limpar
                  </button>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {recent.map((t) => (
                    <li key={t}>
                      <button
                        type="button"
                        onClick={() => runSearch(t)}
                        className="press max-w-[16rem] truncate border border-line-strong px-3 py-2 text-sm transition-colors hover:border-paper"
                      >
                        {t}
                      </button>
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
          </div>
        ) : showingStale && results.length === 0 ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-6 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, n) => (
              <CardSkeleton key={n} />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="border-y border-line py-20 text-center">
            <p className="eyebrow mb-3">Sem resultados</p>
            <p className="mx-auto max-w-md break-words text-paper-2">
              Nada encontrado para “{term}”. Tente um termo mais curto ou navegue pelas categorias.
            </p>
          </div>
        ) : (
          <div
            className={`grid grid-cols-2 gap-x-3 gap-y-10 transition-opacity duration-200 md:gap-x-6 lg:grid-cols-4 ${
              showingStale ? 'opacity-50' : 'opacity-100'
            }`}
          >
            {results.map((product) => (
              <ProductCardModern key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
