import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';
import type { Category, Product } from '../../types/ecommerce';
import { tomatoApi } from '../../services/tomatoApi';
import { getStoreCategories } from '../../services/storeCategories';
import { useCart } from '../../context/CartContext';
import { ProductCardModern } from '../ProductCardModern';
import { CardSkeleton } from '../ui/Skeleton';
import { Sheet } from '../ui/Sheet';
import { LineReveal } from '../home/HomeMotion';
import { EASE_OUT } from '../home/motionTokens';

interface ProductsPageProps {
  initialCategory?: string;
  onSelectCategory?: (slug: string) => void;
}

type Density = 2 | 3 | 4;

const SORT_OPTIONS = [
  { value: 'default', label: 'Destaques' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
  { value: 'rating', label: 'Mais bem avaliados' },
];

const SIZE_ORDER = ['PP', 'XS', 'P', 'S', 'M', 'G', 'L', 'GG', 'XL', 'XG', 'XXL', 'EG', 'EGG'];

const DENSITY_GRID: Record<Density, string> = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
};

function sortSizes(sizes: string[]): string[] {
  const rank = (s: string) => {
    const known = SIZE_ORDER.indexOf(s.toUpperCase());
    if (known !== -1) return known;
    const numeric = Number.parseInt(s, 10);
    return Number.isNaN(numeric) ? 999 : SIZE_ORDER.length + numeric;
  };
  return [...sizes].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export function ProductsPage({ initialCategory = 'all', onSelectCategory }: ProductsPageProps) {
  const { formatPrice } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedSize, setSelectedSize] = useState('all');
  const [selectedColor, setSelectedColor] = useState('all');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState('default');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [density, setDensity] = useState<Density>(3);

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
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    tomatoApi
      .getProducts(selectedCategory, undefined, sortOption)
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
  }, [selectedCategory, sortOption]);

  // Opções de filtro derivadas dos produtos reais da categoria atual
  const sizeOptions = useMemo(() => sortSizes([...new Set(products.flatMap((p) => p.sizes ?? []))]), [products]);
  const colorOptions = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => p.colors?.forEach((c) => map.set(c.name, c.hex)));
    return [...map].map(([name, hex]) => ({ name, hex }));
  }, [products]);
  const priceCeiling = useMemo(
    () => Math.max(0, ...products.map((p) => p.price)),
    [products],
  );

  const visible = useMemo(
    () =>
      products.filter(
        (p) =>
          (maxPrice === null || p.price <= maxPrice) &&
          (selectedSize === 'all' || p.sizes?.includes(selectedSize)) &&
          (selectedColor === 'all' || p.colors?.some((c) => c.name === selectedColor)),
      ),
    [products, maxPrice, selectedSize, selectedColor],
  );

  const selectCategory = (slug: string) => {
    setSelectedCategory(slug);
    setSelectedSize('all');
    setSelectedColor('all');
    setMaxPrice(null);
    onSelectCategory?.(slug);
  };

  const clearRefinements = () => {
    setSelectedSize('all');
    setSelectedColor('all');
    setMaxPrice(null);
  };

  const refinementCount = Number(selectedSize !== 'all') + Number(selectedColor !== 'all') + Number(maxPrice !== null);
  const activeCategory = categories.find((c) => c.slug === selectedCategory);

  const chips = [
    selectedSize !== 'all' && { key: 'size', label: `Tamanho ${selectedSize}`, clear: () => setSelectedSize('all') },
    selectedColor !== 'all' && { key: 'color', label: selectedColor, clear: () => setSelectedColor('all') },
    maxPrice !== null && { key: 'price', label: `Até ${formatPrice(maxPrice)}`, clear: () => setMaxPrice(null) },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  return (
    <div className="min-h-screen bg-ink pb-24 pt-28 text-paper md:pt-36">
      <div className="mx-auto max-w-[1600px] px-[var(--gutter)]">
        {/* Cabeçalho */}
        <header className="mb-10 grid grid-cols-1 items-end gap-6 md:mb-14 md:grid-cols-12">
          <div className="md:col-span-8">
            <p className="eyebrow mb-5">
              Catálogo — {loading ? '··' : String(visible.length).padStart(2, '0')} {visible.length === 1 ? 'peça' : 'peças'}
            </p>
            <h1 className="font-display text-[clamp(2.75rem,8vw,8rem)] font-semibold uppercase leading-[0.88] tracking-[-0.05em]">
              <LineReveal
                onMount
                key={activeCategory?.slug ?? 'all'}
                label={activeCategory?.name ?? 'Todas as peças'}
                lines={
                  activeCategory
                    ? [<span key="name" className="break-words">{activeCategory.name}</span>]
                    : [
                        'Todas as',
                        <span key="accent" className="font-serif-accent">
                          peças
                        </span>,
                      ]
                }
              />
            </h1>
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-paper-2 md:col-span-4">
            {activeCategory?.description || 'Básicos atemporais em cortes limpos. Filtre por tamanho, cor ou preço.'}
          </p>
        </header>

        {/* Barra de ferramentas */}
        <div className="sticky top-0 z-20 -mx-[var(--gutter)] mb-8 border-b border-line bg-ink/95 px-[var(--gutter)]">
          <div className="flex items-center gap-4">
            <div role="tablist" aria-label="Categorias" className="scrollbar-none flex min-w-0 flex-1 gap-6 overflow-x-auto">
              {[{ slug: 'all', name: 'Tudo', itemCount: undefined as number | undefined }, ...categories].map((cat) => {
                const active = selectedCategory === cat.slug;
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => selectCategory(cat.slug)}
                    className={`relative shrink-0 whitespace-nowrap py-4 font-display text-[12px] font-medium uppercase tracking-[0.08em] transition-colors duration-200 ${
                      active ? 'text-paper' : 'text-mute hover:text-paper'
                    }`}
                  >
                    {cat.name}
                    {cat.itemCount !== undefined && <sup className="ml-1 font-mono text-[9px] text-mute">{cat.itemCount}</sup>}
                    {active && (
                      <motion.span
                        layoutId="catalog-tab"
                        className="absolute inset-x-0 -bottom-px h-px bg-paper"
                        transition={{ duration: 0.35, ease: EASE_OUT }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-4">
              <div className="hidden items-center gap-1 lg:flex" role="group" aria-label="Colunas">
                {([2, 3, 4] as Density[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDensity(d)}
                    aria-pressed={density === d}
                    aria-label={`${d} colunas`}
                    className={`flex h-8 w-8 items-center justify-center font-mono text-[11px] transition-colors ${
                      density === d ? 'text-paper' : 'text-mute hover:text-paper'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <label className="hidden items-center gap-2 sm:flex">
                <span className="sr-only">Ordenar</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="cursor-pointer bg-transparent py-2 font-display text-[12px] font-medium uppercase tracking-[0.06em] text-paper focus:outline-none"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-ink text-paper">
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="press tap-target flex items-center gap-2 font-display text-[12px] font-semibold uppercase tracking-[0.08em]"
              >
                <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
                Filtros
                {refinementCount > 0 && <span className="font-mono text-[11px] text-mute">({refinementCount})</span>}
              </button>
            </div>
          </div>
        </div>

        {/* Filtros ativos */}
        {chips.length > 0 && (
          <div className="mb-8 flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.clear}
                className="press flex items-center gap-2 border border-line-strong px-3 py-2 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors hover:border-paper"
                aria-label={`Remover filtro ${chip.label}`}
              >
                {chip.label}
                <X className="h-3 w-3" strokeWidth={1.75} />
              </button>
            ))}
            <button type="button" onClick={clearRefinements} className="eyebrow link-line ml-2 py-2 hover:text-paper">
              Limpar tudo
            </button>
          </div>
        )}

        {/* Grade */}
        {loading ? (
          <div className={`grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-6 ${DENSITY_GRID[density]}`}>
            {Array.from({ length: density * 2 }, (_, n) => (
              <CardSkeleton key={n} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="border-y border-line py-24 text-center">
            <p className="eyebrow mb-3">Nada encontrado</p>
            <p className="mx-auto mb-8 max-w-sm text-paper-2">Nenhuma peça com esses filtros. Tente remover algum deles.</p>
            <button
              type="button"
              onClick={() => (refinementCount > 0 ? clearRefinements() : selectCategory('all'))}
              className="btn-secondary"
            >
              {refinementCount > 0 ? 'Limpar filtros' : 'Ver todas as peças'}
            </button>
          </div>
        ) : (
          <motion.div
            key={`${selectedCategory}-${sortOption}-${density}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className={`grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-6 ${DENSITY_GRID[density]}`}
          >
            {visible.map((product) => (
              <ProductCardModern key={product.id} product={product} />
            ))}
          </motion.div>
        )}
      </div>

      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtros"
        footer={
          <div className="flex items-center gap-3">
            <button type="button" onClick={clearRefinements} disabled={refinementCount === 0} className="btn-secondary flex-1">
              Limpar
            </button>
            <button type="button" onClick={() => setFiltersOpen(false)} className="btn-primary flex-[2]">
              Ver {visible.length} {visible.length === 1 ? 'peça' : 'peças'}
            </button>
          </div>
        }
      >
        <div className="space-y-8 px-5 pb-6 md:px-6">
          {/* Ordenar (no celular fica aqui) */}
          <fieldset className="sm:hidden">
            <legend className="eyebrow mb-3">Ordenar</legend>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((o) => (
                <OptionChip key={o.value} active={sortOption === o.value} onClick={() => setSortOption(o.value)}>
                  {o.label}
                </OptionChip>
              ))}
            </div>
          </fieldset>

          {sizeOptions.length > 0 && (
            <fieldset>
              <legend className="eyebrow mb-3">Tamanho</legend>
              <div className="grid grid-cols-4 gap-2">
                <OptionChip active={selectedSize === 'all'} onClick={() => setSelectedSize('all')}>
                  Todos
                </OptionChip>
                {sizeOptions.map((size) => (
                  <OptionChip key={size} active={selectedSize === size} onClick={() => setSelectedSize(size)}>
                    {size}
                  </OptionChip>
                ))}
              </div>
            </fieldset>
          )}

          {colorOptions.length > 0 && (
            <fieldset>
              <legend className="eyebrow mb-3">Cor</legend>
              <div className="flex flex-col">
                {[{ name: 'all', hex: '' }, ...colorOptions].map((color) => {
                  const active = selectedColor === color.name;
                  return (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setSelectedColor(color.name)}
                      aria-pressed={active}
                      className="flex items-center gap-3 border-b border-line py-3 text-left text-sm"
                    >
                      <span
                        className="h-4 w-4 shrink-0 rounded-full"
                        style={
                          color.hex
                            ? { backgroundColor: color.hex, boxShadow: 'inset 0 0 0 1px rgba(242,240,235,0.25)' }
                            : { boxShadow: 'inset 0 0 0 1px rgba(242,240,235,0.4)' }
                        }
                      />
                      <span className={`flex-1 truncate ${active ? 'text-paper' : 'text-paper-2'}`}>
                        {color.name === 'all' ? 'Todas as cores' : color.name}
                      </span>
                      {active && <span className="h-1.5 w-1.5 rounded-full bg-paper" />}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {priceCeiling > 0 && (
            <fieldset>
              <legend className="eyebrow mb-3 flex w-full justify-between">
                <span>Preço máximo</span>
              </legend>
              <div className="mb-3 flex items-baseline justify-between">
                <span className="font-mono text-sm tabular-nums">{formatPrice(maxPrice ?? priceCeiling)}</span>
                {maxPrice !== null && (
                  <button type="button" onClick={() => setMaxPrice(null)} className="eyebrow link-line hover:text-paper">
                    Sem limite
                  </button>
                )}
              </div>
              <input
                type="range"
                min={0}
                max={Math.ceil(priceCeiling)}
                step={1}
                value={maxPrice ?? Math.ceil(priceCeiling)}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setMaxPrice(value >= Math.ceil(priceCeiling) ? null : value);
                }}
                aria-label="Preço máximo"
                className="w-full cursor-pointer accent-paper"
              />
            </fieldset>
          )}
        </div>
      </Sheet>
    </div>
  );
}

interface OptionChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

function OptionChip({ active, onClick, children }: OptionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`press min-h-11 border px-3 font-mono text-[12px] uppercase tracking-[0.04em] transition-colors duration-150 ${
        active ? 'border-paper bg-paper text-ink' : 'border-line-strong text-paper hover:border-paper'
      }`}
    >
      {children}
    </button>
  );
}
