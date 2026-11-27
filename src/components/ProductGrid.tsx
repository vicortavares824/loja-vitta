import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Product } from '../types/ecommerce';
import { tomatoApi } from '../services/tomatoApi';
import { ProductCardModern } from './ProductCardModern';
import { CardSkeleton } from './ui/Skeleton';
import { LineReveal } from './home/HomeMotion';
import { EASE_OUT } from './home/motionTokens';

interface ProductGridProps {
  selectedCategorySlug?: string;
  onCategoryChange?: (slug: string) => void;
  maxItems?: number;
}

interface CategoryTab {
  name: string;
  slug: string;
}

const ALL_TAB: CategoryTab = { name: 'Tudo', slug: 'all' };

const SORT_OPTIONS = [
  { value: 'default', label: 'Destaques' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
  { value: 'rating', label: 'Mais bem avaliados' },
];

export function ProductGrid({ selectedCategorySlug = 'all', onCategoryChange, maxItems }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(selectedCategorySlug);
  const [sortOption, setSortOption] = useState('default');
  const [categories, setCategories] = useState<CategoryTab[]>([ALL_TAB]);

  useEffect(() => {
    setActiveCategory(selectedCategorySlug);
  }, [selectedCategorySlug]);

  useEffect(() => {
    let alive = true;
    tomatoApi
      .getCategories()
      .then((cats) => {
        if (alive && cats.length > 0) setCategories([ALL_TAB, ...cats.map((c) => ({ name: c.name, slug: c.slug }))]);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    tomatoApi
      .getProducts(activeCategory, undefined, sortOption)
      .then((data) => {
        if (alive) setProducts(data);
      })
      .catch(() => {
        if (alive) setProducts([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [activeCategory, sortOption]);

  const displayed = maxItems ? products.slice(0, maxItems) : products;
  const skeletonCount = maxItems ?? 6;

  const selectCategory = (slug: string) => {
    setActiveCategory(slug);
    onCategoryChange?.(slug);
  };

  return (
    <section id="colecao" aria-labelledby="colecao-title" className="relative bg-ink">
      <div className="mx-auto max-w-[1600px] px-[var(--gutter)]">
        <div className="mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow mb-5">Novidades</p>
            <h2
              id="colecao-title"
              className="font-display text-[clamp(2.25rem,6vw,5.5rem)] font-semibold uppercase leading-[0.9] tracking-[-0.045em]"
            >
              <LineReveal
                label="Recém-chegados"
                lines={[
                  <>
                    Recém-<span className="font-serif-accent">chegados</span>
                  </>,
                ]}
              />
            </h2>
          </div>

          <label className="flex items-center gap-3 self-start md:self-auto">
            <span className="eyebrow">Ordenar</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="cursor-pointer border-b border-line-strong bg-transparent py-1.5 pr-1 font-display text-[12px] font-medium uppercase tracking-[0.06em] text-paper focus:border-paper focus:outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-ink text-paper">
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Filtros de categoria em abas de texto */}
        <div
          role="tablist"
          aria-label="Filtrar por categoria"
          className="scrollbar-none -mx-[var(--gutter)] mb-10 flex gap-6 overflow-x-auto border-b border-line px-[var(--gutter)]"
        >
          {categories.map((cat) => {
            const active = activeCategory === cat.slug;
            return (
              <button
                key={cat.slug}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectCategory(cat.slug)}
                className={`relative shrink-0 whitespace-nowrap py-3 font-display text-[12px] font-medium uppercase tracking-[0.08em] transition-colors duration-200 ${
                  active ? 'text-paper' : 'text-mute hover:text-paper'
                }`}
              >
                {cat.name}
                {active && (
                  <motion.span
                    layoutId="grid-tab"
                    className="absolute inset-x-0 -bottom-px h-px bg-paper"
                    transition={{ duration: 0.35, ease: EASE_OUT }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-6 lg:grid-cols-3">
            {Array.from({ length: skeletonCount }, (_, n) => (
              <CardSkeleton key={n} />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="border-y border-line py-20 text-center">
            <p className="eyebrow mb-3">Nada por aqui</p>
            <p className="text-paper-2">Nenhuma peça nesta categoria ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-6 lg:grid-cols-3">
            {displayed.map((product) => (
              <ProductCardModern key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
