import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { COLLECTION_PHOTOS } from '../config/collectionPhotos';
import { LineReveal, Reveal } from './home/HomeMotion';
import { EASE_IN_OUT, EASE_OUT } from './home/motionTokens';

interface HeroSectionProps {
  onNavigate: (tab: string) => void;
}

const HERO_IMAGES = [COLLECTION_PHOTOS.heroLeft, COLLECTION_PHOTOS.heroRight];

const FACTS = [
  { label: 'Frete', value: 'Calculado na sacola' },
  { label: 'Pagamento', value: 'Pix ou cartão' },
  { label: 'Pedido', value: 'Cancele antes do envio' },
];

/**
 * Hero editorial em tela cheia.
 *
 * Coreografia (só na primeira visita da página):
 *  0ms     cortina da foto recolhe (1.1s, ease-in-out) e a foto assenta de 1.12 → 1
 *  250ms   rótulos do topo aparecem (fade)
 *  350ms   título sobe linha a linha (stagger 90ms, 0.9s)
 *  650ms   texto de apoio e botões (fade + 16px)
 * Ao rolar: a foto aproxima levemente e escurece; o texto sobe mais rápido que a foto.
 */
export function HeroSection({ onNavigate }: HeroSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const shade = useTransform(scrollYProgress, [0, 1], [0, 0.6]);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '-18%']);

  return (
    <section ref={ref} aria-label="Destaque da coleção" className="relative flex min-h-[100svh] flex-col overflow-hidden bg-ink">
      {/* Foto */}
      <div className="absolute inset-0">
        {/* Duas fotos lado a lado (preta | vinho); no celular só a vinho. */}
        <motion.div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2" style={reduced ? undefined : { scale: imageScale }}>
          {HERO_IMAGES.map((image, i) => (
            <motion.img
              key={image.src}
              src={image.src}
              alt={image.alt}
              fetchPriority="high"
              decoding="async"
              draggable={false}
              className={`h-full w-full object-cover object-[50%_25%] brightness-[0.8] ${i === 0 ? 'hidden md:block' : ''}`}
              initial={reduced ? false : { scale: 1.12 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.6, delay: i * 0.08, ease: EASE_OUT }}
            />
          ))}
        </motion.div>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-ink/40" />
        {!reduced && <motion.div aria-hidden className="absolute inset-0 bg-ink" style={{ opacity: shade }} />}
        {!reduced && (
          <motion.div
            aria-hidden
            className="absolute inset-0 origin-top bg-ink"
            initial={{ scaleY: 1 }}
            animate={{ scaleY: 0 }}
            transition={{ duration: 1.1, ease: EASE_IN_OUT }}
          />
        )}
      </div>

      {/* Conteúdo */}
      <motion.div
        className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 flex-col justify-between px-[var(--gutter)] pb-8 pt-28 md:pb-12"
        style={reduced ? undefined : { y: contentY }}
      >
        <Reveal onMount delay={0.25} y={0} className="flex items-start justify-between gap-6">
          <p className="eyebrow text-paper-2">
            Coleção 2026
            <br />
            N°01 — Essenciais
          </p>
          <p className="eyebrow hidden text-right text-paper-2 sm:block">
            Essencial é
            <br />
            estar bem
          </p>
        </Reveal>

        <div className="grid grid-cols-1 items-end gap-8 md:grid-cols-12">
          <h1 className="font-display text-[clamp(3rem,10.5vw,10rem)] font-semibold uppercase leading-[0.86] tracking-[-0.05em] md:col-span-8">
            <LineReveal
              onMount
              delay={0.35}
              stagger={0.09}
              label="O básico, feito para durar."
              lines={[
                'O básico,',
                <>
                  feito para <span className="font-serif-accent text-[1.08em] tracking-[-0.02em]">durar.</span>
                </>,
              ]}
            />
          </h1>

          <Reveal onMount delay={0.65} className="md:col-span-4 md:pb-3">
            <p className="mb-6 max-w-sm text-[15px] leading-relaxed text-paper-2">
              Peças essenciais em cortes limpos e tecidos macios, pensadas para combinar entre si e acompanhar todos os seus dias.
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => onNavigate('products')} className="btn-primary group">
                Ver coleção
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.75} />
              </button>
              <button type="button" onClick={() => onNavigate('categories')} className="btn-secondary">
                Categorias
              </button>
            </div>
          </Reveal>
        </div>
      </motion.div>

      {/* Faixa de fatos */}
      <div className="relative z-10 border-t border-line bg-ink">
        <ul className="mx-auto grid max-w-[1600px] grid-cols-1 sm:grid-cols-3">
          {FACTS.map((fact, i) => (
            <li
              key={fact.label}
              className={`flex items-baseline justify-between gap-4 px-[var(--gutter)] py-4 ${
                i > 0 ? 'border-t border-line sm:border-l sm:border-t-0' : ''
              }`}
            >
              <span className="eyebrow">
                {String(i + 1).padStart(2, '0')} / {fact.label}
              </span>
              <span className="text-[13px] text-paper">{fact.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
