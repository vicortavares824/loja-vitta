import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { Category } from '../types/ecommerce';
import { getStoreCategories } from '../services/storeCategories';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { LineReveal, Reveal } from './home/HomeMotion';
import { EASE_OUT } from './home/motionTokens';

interface CategorySectionProps {
  onSelectCategory: (categorySlug: string) => void;
}

const PREVIEW_W = 280;
const PREVIEW_H = 360;

/**
 * Índice editorial de categorias.
 * Desktop: linhas grandes numeradas; ao passar o mouse, uma prévia da foto
 * segue o cursor e as outras linhas esmaecem.
 * Celular: carrossel horizontal com snap e fotos 3:4.
 */
export function CategorySection({ onSelectCategory }: CategorySectionProps) {
  const [categories, setCategories] = useState<Category[] | null>(null);

  useEffect(() => {
    let alive = true;
    getStoreCategories()
      .then((cats) => {
        if (alive) setCategories(cats);
      })
      .catch(() => {
        if (alive) setCategories([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (categories !== null && categories.length === 0) return null;

  return (
    <section id="categorias" aria-labelledby="categorias-title" className="bg-ink py-20 md:py-32">
      <div className="mx-auto max-w-[1600px] px-[var(--gutter)]">
        <div className="mb-10 grid grid-cols-1 items-end gap-6 md:mb-16 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="eyebrow mb-5">
              Índice — {categories ? String(categories.length).padStart(2, '0') : '··'}{' '}
              {categories?.length === 1 ? 'linha' : 'linhas'}
            </p>
            <h2
              id="categorias-title"
              className="font-display text-[clamp(2.25rem,6vw,5.5rem)] font-semibold uppercase leading-[0.9] tracking-[-0.045em]"
            >
              <LineReveal
                label="Comece pelo essencial"
                lines={['Comece pelo', <span key="accent" className="font-serif-accent">essencial</span>]}
              />
            </h2>
          </div>
          <Reveal className="md:col-span-4 md:col-start-9">
            <p className="max-w-sm text-[15px] leading-relaxed text-paper-2">
              Cada linha foi pensada para formar um guarda-roupa enxuto: poucas peças, muitas combinações.
            </p>
          </Reveal>
        </div>

        {categories === null ? (
          <IndexSkeleton />
        ) : (
          <>
            <DesktopIndex categories={categories} onSelect={onSelectCategory} />
            <MobileCarousel categories={categories} onSelect={onSelectCategory} />
          </>
        )}
      </div>
    </section>
  );
}

function IndexSkeleton() {
  return (
    <ul aria-hidden className="border-t border-line">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex items-center gap-6 border-b border-line py-7">
          <span className="h-3 w-6 bg-ink-3" />
          <span className="h-10 w-1/3 bg-ink-2" />
        </li>
      ))}
    </ul>
  );
}

interface IndexProps {
  categories: Category[];
  onSelect: (slug: string) => void;
}

function DesktopIndex({ categories, onSelect }: IndexProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState<number | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 260, damping: 30, mass: 0.6 });
  const springY = useSpring(y, { stiffness: 260, damping: 30, mass: 0.6 });

  const showPreview = finePointer && !reduced;

  const handleMove = (e: ReactPointerEvent<HTMLUListElement>) => {
    const rect = listRef.current?.getBoundingClientRect();
    if (!rect) return;
    x.set(e.clientX - rect.left - PREVIEW_W / 2);
    y.set(e.clientY - rect.top - PREVIEW_H / 2);
  };

  const current = active !== null ? categories[active] : null;

  return (
    <ul
      ref={listRef}
      onPointerMove={showPreview ? handleMove : undefined}
      onPointerLeave={() => setActive(null)}
      className="relative hidden border-t border-line md:block"
    >
      {categories.map((cat, i) => {
        const dimmed = active !== null && active !== i;
        return (
          <li key={cat.id || cat.slug} className="border-b border-line">
            <button
              type="button"
              onClick={() => onSelect(cat.slug)}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className={`group grid w-full grid-cols-12 items-center gap-6 py-6 text-left transition-opacity duration-300 ${
                dimmed ? 'opacity-35' : 'opacity-100'
              }`}
            >
              <span className="eyebrow col-span-1 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              <span className="col-span-7 min-w-0 break-words font-display text-[clamp(2.5rem,5.2vw,5rem)] font-semibold uppercase leading-none tracking-[-0.04em] transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-4">
                {cat.name}
              </span>
              <span className="col-span-3 line-clamp-2 text-sm text-mute">{cat.description}</span>
              <span className="col-span-1 flex items-center justify-end gap-2">
                <span className="eyebrow tabular-nums">({cat.itemCount})</span>
                <ArrowUpRight
                  className="h-5 w-5 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  strokeWidth={1.5}
                />
              </span>
            </button>
          </li>
        );
      })}

      {showPreview && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-10"
          style={{ x: springX, y: springY, width: PREVIEW_W, height: PREVIEW_H }}
        >
          <AnimatePresence>
            {current?.image && (
              <motion.div
                key="preview"
                className="absolute inset-0 overflow-hidden bg-ink-2"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
              >
                <AnimatePresence initial={false}>
                  <motion.img
                    key={current.image}
                    src={current.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    initial={{ opacity: 0, scale: 1.08 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: EASE_OUT }}
                  />
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </ul>
  );
}

function MobileCarousel({ categories, onSelect }: IndexProps) {
  return (
    <ul className="scrollbar-none -mx-[var(--gutter)] flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-[var(--gutter)] pb-2 md:hidden">
      {categories.map((cat, i) => (
        <li key={cat.id || cat.slug} className="w-[72%] shrink-0 snap-start scroll-ml-[var(--gutter)]">
          <button type="button" onClick={() => onSelect(cat.slug)} className="press block w-full text-left">
            <div className="relative aspect-[3/4] overflow-hidden bg-ink-2">
              {cat.image && <img src={cat.image} alt="" loading="lazy" className="h-full w-full object-cover" />}
              <span className="eyebrow absolute left-3 top-3 text-paper">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3 pt-3">
              <span className="truncate font-display text-xl font-semibold uppercase tracking-[-0.02em]">{cat.name}</span>
              <span className="eyebrow shrink-0 tabular-nums">({cat.itemCount})</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
