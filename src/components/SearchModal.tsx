import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useProductSearch } from '../hooks/useProductSearch';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { EASE_OUT } from './home/motionTokens';

const MAX_RESULTS = 8;

/** Busca rápida em painel que desce do topo (aberta via `setIsSearchOpen(true)`). */
export function SearchModal() {
  const { isSearchOpen, setIsSearchOpen, formatPrice, setQuickViewProduct } = useCart();
  const [query, setQuery] = useState('');
  const { results, loading, term } = useProductSearch(query);
  const reduced = usePrefersReducedMotion();

  const close = () => {
    setIsSearchOpen(false);
    setQuery('');
  };

  useEffect(() => {
    if (!isSearchOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [isSearchOpen, setIsSearchOpen]);

  const hasQuery = query.trim().length > 0;

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <div className="fixed inset-0 z-[60]" role="presentation">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-ink/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Buscar produtos"
            className="relative border-b border-line bg-ink-2 pt-[env(safe-area-inset-top)]"
            initial={reduced ? { opacity: 0 } : { y: '-100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: '-100%', transition: { duration: 0.25, ease: EASE_OUT } }}
            transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="mx-auto max-w-[1600px] px-[var(--gutter)] py-6">
              <div className="flex items-center gap-4 border-b border-line-strong focus-within:border-paper">
                <input
                  type="search"
                  autoFocus
                  enterKeyHint="search"
                  autoComplete="off"
                  aria-label="Buscar"
                  placeholder="Buscar peças…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent py-3 font-display text-3xl font-semibold uppercase tracking-[-0.03em] text-paper placeholder:text-paper/25 focus:outline-none md:text-5xl [&::-webkit-search-cancel-button]:hidden"
                />
                <button type="button" onClick={close} className="btn-icon shrink-0" aria-label="Fechar busca">
                  <X className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </div>

              <div className="max-h-[60dvh] overflow-y-auto overscroll-contain pt-4" aria-live="polite">
                {!hasQuery ? (
                  <p className="eyebrow py-4">Digite o nome de uma peça, cor ou categoria.</p>
                ) : loading && results.length === 0 ? (
                  <p className="eyebrow py-4">Buscando…</p>
                ) : results.length === 0 ? (
                  <p className="py-4 text-paper-2">Nada encontrado para “{term}”.</p>
                ) : (
                  <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                    {results.slice(0, MAX_RESULTS).map((product) => (
                      <li key={product.id} className="border-b border-line">
                        <button
                          type="button"
                          onClick={() => {
                            setQuickViewProduct(product);
                            close();
                          }}
                          className="group flex w-full items-center gap-4 py-3 text-left"
                        >
                          <span className="h-16 w-12 shrink-0 overflow-hidden bg-ink-3">
                            {product.images?.[0] && (
                              <img src={product.images[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm group-hover:underline">{product.name}</span>
                            <span className="eyebrow block truncate">{product.category}</span>
                          </span>
                          <span className="shrink-0 font-mono text-[12px] tabular-nums">{formatPrice(product.price)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
