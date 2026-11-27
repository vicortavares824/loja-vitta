import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { Category } from '../../types/ecommerce';
import { getStoreCategories } from '../../services/storeCategories';
import { ImageReveal, LineReveal } from '../home/HomeMotion';

interface CategoriesPageProps {
  onSelectCategory: (categorySlug: string) => void;
}

/**
 * Categorias em grade editorial de duas colunas; a coluna da direita desce
 * no desktop para criar ritmo. Fotos em P&B que ganham cor no hover.
 */
export function CategoriesPage({ onSelectCategory }: CategoriesPageProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getStoreCategories()
      .then((data) => {
        if (alive) setCategories(data);
      })
      .catch(() => {
        if (alive) setCategories([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-ink pb-24 pt-28 text-paper md:pt-36">
      <div className="mx-auto max-w-[1600px] px-[var(--gutter)]">
        <header className="mb-14 grid grid-cols-1 items-end gap-6 border-b border-line pb-10 md:mb-20 md:grid-cols-12">
          <div className="md:col-span-8">
            <p className="eyebrow mb-5">Categorias — {loading ? '··' : String(categories.length).padStart(2, '0')}</p>
            <h1 className="font-display text-[clamp(2.75rem,8vw,8rem)] font-semibold uppercase leading-[0.88] tracking-[-0.05em]">
              <LineReveal
                onMount
                label="Linhas essenciais"
                lines={[
                  'Linhas',
                  <span key="accent" className="font-serif-accent">
                    essenciais
                  </span>,
                ]}
              />
            </h1>
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-paper-2 md:col-span-4">
            Escolha uma linha para ver todas as peças dela, já filtradas no catálogo.
          </p>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-14 md:grid-cols-2">
            {[0, 1].map((n) => (
              <div key={n} aria-hidden className={`aspect-[4/5] bg-ink-2 motion-safe:animate-pulse ${n === 1 ? 'md:mt-32' : ''}`} />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="border-y border-line py-24 text-center text-paper-2">Nenhuma categoria cadastrada ainda.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-x-6 gap-y-14 md:grid-cols-2 md:gap-y-24">
            {categories.map((cat, i) => (
              <li key={cat.id || cat.slug} className={i % 2 === 1 ? 'md:mt-32' : ''}>
                <button
                  type="button"
                  onClick={() => onSelectCategory(cat.slug)}
                  data-cursor="Abrir"
                  className="group block w-full text-left"
                >
                  {cat.image ? (
                    <ImageReveal
                      src={cat.image}
                      alt={cat.name}
                      delay={(i % 2) * 0.08}
                      onMount={i < 2}
                      className="aspect-[4/5] bg-ink-2"
                      imgClassName="transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)]:group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="aspect-[4/5] bg-ink-2" />
                  )}
                  <div className="mt-4 flex items-start justify-between gap-4 border-t border-line pt-4">
                    <div className="min-w-0">
                      <span className="eyebrow tabular-nums">
                        {String(i + 1).padStart(2, '0')} — {cat.itemCount} {cat.itemCount === 1 ? 'peça' : 'peças'}
                      </span>
                      <h2 className="mt-2 break-words font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold uppercase leading-[0.95] tracking-[-0.04em]">
                        {cat.name}
                      </h2>
                      {cat.description && <p className="mt-2 line-clamp-2 max-w-md text-sm text-mute">{cat.description}</p>}
                    </div>
                    <ArrowUpRight
                      className="mt-6 h-6 w-6 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-1 group-hover:translate-x-1"
                      strokeWidth={1.25}
                    />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
