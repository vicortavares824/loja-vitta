import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { AnimatePresence, motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { EASE_IN_OUT, EASE_OUT } from './motionTokens';

/**
 * Primitivas de movimento do design "Editorial Monocromo".
 *
 * Uma única família de curvas para o site inteiro:
 *  - EASE_OUT para tudo que entra (resposta imediata, assentamento suave)
 *  - EASE_IN_OUT para o que se move na tela (cortinas de imagem)
 *
 * Tudo respeita `prefers-reduced-motion`: nesse caso o conteúdo aparece direto,
 * sem deslocamento.
 */


/* ------------------------------------------------------------------ */
/* Cursor com rótulo (apenas sobre elementos com data-cursor)          */
/* ------------------------------------------------------------------ */

/**
 * Círculo com rótulo ("Ver", "Abrir") que segue o mouse com mola, mas só
 * aparece sobre elementos marcados com `data-cursor="Texto"`. O cursor nativo
 * continua visível no resto do site. Desligado em toque e em movimento reduzido.
 */
export function CustomCursor() {
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');
  const reduced = usePrefersReducedMotion();
  const enabled = finePointer && !reduced;

  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const springX = useSpring(x, { stiffness: 500, damping: 40, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 500, damping: 40, mass: 0.4 });
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const handleMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const target = (e.target as Element | null)?.closest?.('[data-cursor]');
      setLabel(target ? target.getAttribute('data-cursor') : null);
    };
    const handleLeave = () => setLabel(null);
    window.addEventListener('pointermove', handleMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', handleLeave);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      document.documentElement.removeEventListener('pointerleave', handleLeave);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  return (
    <motion.div aria-hidden className="pointer-events-none fixed left-0 top-0 z-[95]" style={{ x: springX, y: springY }}>
      <AnimatePresence>
        {label && (
          <motion.div
            key="cursor"
            className="-ml-10 -mt-10 flex h-20 w-20 items-center justify-center rounded-full bg-paper text-ink"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.08em]">{label}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Barra de progresso do scroll                                        */
/* ------------------------------------------------------------------ */

export function ScrollProgress() {
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  if (reduced) return null;
  return <motion.div aria-hidden className="fixed inset-x-0 top-0 z-[90] h-px origin-left bg-paper" style={{ scaleX }} />;
}

/* ------------------------------------------------------------------ */
/* Linhas de título reveladas por máscara                              */
/* ------------------------------------------------------------------ */

interface LineRevealProps {
  /** Cada item vira uma linha com máscara própria. */
  lines: ReactNode[];
  className?: string;
  lineClassName?: string;
  delay?: number;
  stagger?: number;
  /** Anima ao montar (hero) em vez de ao entrar na tela. */
  onMount?: boolean;
  /** Texto para leitores de tela (as linhas visuais ficam aria-hidden). */
  label?: string;
}

export function LineReveal({
  lines,
  className = '',
  lineClassName = '',
  delay = 0,
  stagger = 0.08,
  onMount = false,
  label,
}: LineRevealProps) {
  const reduced = usePrefersReducedMotion();

  if (reduced) {
    return (
      <span className={className}>
        {label && <span className="sr-only">{label}</span>}
        {lines.map((line, i) => (
          <span key={i} aria-hidden={label ? true : undefined} className={`block ${lineClassName}`}>
            {line}
          </span>
        ))}
      </span>
    );
  }

  const trigger = onMount
    ? { animate: 'shown' as const }
    : { whileInView: 'shown' as const, viewport: { once: true, margin: '-10% 0px' } };

  return (
    <motion.span className={className} initial="hidden" {...trigger}>
      {label && <span className="sr-only">{label}</span>}
      {lines.map((line, i) => (
        <span key={i} aria-hidden={label ? true : undefined} className={`-mt-[0.14em] block overflow-hidden pb-[0.06em] pt-[0.14em] ${lineClassName}`}>
          <motion.span
            className="block"
            variants={{ hidden: { y: '105%' }, shown: { y: '0%' } }}
            transition={{ duration: 0.9, delay: delay + i * stagger, ease: EASE_OUT }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

/* ------------------------------------------------------------------ */
/* Entrada simples ao aparecer na tela                                 */
/* ------------------------------------------------------------------ */

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  onMount?: boolean;
}

export function Reveal({ children, className = '', delay = 0, y = 16, onMount = false }: RevealProps) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  const hidden = { opacity: 0, y };
  const shown = { opacity: 1, y: 0 };
  const transition = { duration: 0.7, delay, ease: EASE_OUT };

  return onMount ? (
    <motion.div className={className} initial={hidden} animate={shown} transition={transition}>
      {children}
    </motion.div>
  ) : (
    <motion.div
      className={className}
      initial={hidden}
      whileInView={shown}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Imagem revelada por cortina + zoom que assenta                      */
/* ------------------------------------------------------------------ */

interface ImageRevealProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  delay?: number;
  onMount?: boolean;
  /** Parallax interno leve ao rolar (desligado em movimento reduzido). */
  parallax?: boolean;
  loading?: 'eager' | 'lazy';
  style?: CSSProperties;
}

/**
 * Cortina cor de tinta que recolhe para cima (scaleY, só transform) enquanto
 * a foto assenta de 1.15 para 1. Tudo em propriedades compostas pela GPU.
 */
export function ImageReveal({
  src,
  alt,
  className = '',
  imgClassName = '',
  delay = 0,
  onMount = false,
  parallax = false,
  loading = 'lazy',
  style,
}: ImageRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['-6%', '6%']);

  const img = (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      draggable={false}
      className={`h-full w-full object-cover ${imgClassName}`}
    />
  );

  if (reduced) {
    return (
      <div ref={ref} className={`relative overflow-hidden ${className}`} style={style}>
        {img}
      </div>
    );
  }

  const trigger = onMount
    ? { animate: 'shown' as const }
    : { whileInView: 'shown' as const, viewport: { once: true, margin: '-10% 0px' } };

  return (
    <motion.div ref={ref} className={`relative overflow-hidden ${className}`} style={style} initial="hidden" {...trigger}>
      <motion.div className="absolute inset-x-0 -inset-y-[7%]" style={parallax ? { y: parallaxY } : undefined}>
        <motion.div
          className="h-full w-full"
          variants={{ hidden: { scale: 1.15 }, shown: { scale: 1 } }}
          transition={{ duration: 1.4, delay, ease: EASE_OUT }}
        >
          {img}
        </motion.div>
      </motion.div>
      <motion.div
        aria-hidden
        className="absolute inset-0 origin-top bg-ink"
        variants={{ hidden: { scaleY: 1 }, shown: { scaleY: 0 } }}
        transition={{ duration: 1, delay, ease: EASE_IN_OUT }}
      />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Faixa de texto que anda com o scroll (não fica em loop)             */
/* ------------------------------------------------------------------ */

interface ScrollTrackProps {
  children: ReactNode;
  className?: string;
  /** Quanto (em % da largura) a faixa anda durante a passagem pela tela. */
  distance?: number;
}

export function ScrollTrack({ children, className = '', distance = 25 }: ScrollTrackProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const x = useTransform(scrollYProgress, [0, 1], ['0%', `-${distance}%`]);

  return (
    <div ref={ref} className="overflow-hidden">
      <motion.div className={`whitespace-nowrap ${className}`} style={reduced ? undefined : { x }}>
        {children}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Palavras que acendem conforme o scroll                              */
/* ------------------------------------------------------------------ */

interface ScrollWordProps {
  children: ReactNode;
  progress: MotionValue<number>;
  range: [number, number];
}

function ScrollWord({ children, progress, range }: ScrollWordProps) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <motion.span style={{ opacity }} className="mr-[0.25em] inline-block">
      {children}
    </motion.span>
  );
}

const ACCENT_WORD = /^\*.+\*[.,;:!?]?$/;

function renderWord(word: string): ReactNode {
  if (!ACCENT_WORD.test(word)) return word;
  return <span className="font-serif-accent">{word.replace(/\*/g, '')}</span>;
}

/**
 * Parágrafo cujas palavras acendem de acordo com o scroll. Palavras envoltas
 * em `*asteriscos*` ganham a serifa itálica de acento.
 */
export function ScrollWords({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.45'] });

  const words = text.trim().split(/\s+/);
  const plain = text.replace(/\*/g, '');

  if (reduced) {
    return (
      <p className={className}>
        {words.map((w, i) => (
          <span key={i} className="mr-[0.25em] inline-block">
            {renderWord(w)}
          </span>
        ))}
      </p>
    );
  }

  return (
    <p ref={ref} className={className}>
      <span className="sr-only">{plain}</span>
      <span aria-hidden>
        {words.map((word, i) => {
          const start = i / words.length;
          const end = start + 1 / words.length;
          return (
            <ScrollWord key={i} progress={scrollYProgress} range={[start, end]}>
              {renderWord(word)}
            </ScrollWord>
          );
        })}
      </span>
    </p>
  );
}
