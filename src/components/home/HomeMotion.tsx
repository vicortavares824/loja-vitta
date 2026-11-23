import { useEffect, useRef, useState } from 'react';
import type { ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

/**
 * Animações e interações da Home, inspiradas em sites editoriais de motion
 * design (ex.: motiondesignawards.com): cursor customizado, revelação de
 * texto por máscara, palavras que acendem com o scroll e parallax.
 *
 * Todos os componentes respeitam `prefers-reduced-motion` e renderizam a
 * versão estática quando o usuário pede menos movimento.
 */

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ */
/* Cursor customizado                                                  */
/* ------------------------------------------------------------------ */

type CursorVariant = 'default' | 'hover' | 'label';

/**
 * Círculo que segue o mouse com mola. Cresce sobre links/botões e mostra um
 * rótulo sobre elementos com `data-cursor="Texto"`. Só ativa em dispositivos
 * com mouse (pointer: fine) e sem preferência de movimento reduzido.
 */
export function CustomCursor() {
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');
  const reduced = usePrefersReducedMotion();
  const enabled = finePointer && !reduced;

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const springX = useSpring(x, { stiffness: 450, damping: 38, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 450, damping: 38, mass: 0.5 });

  const [variant, setVariant] = useState<CursorVariant>('default');
  const [label, setLabel] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const handleMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);

      const target = (e.target as Element | null)?.closest?.('[data-cursor], a, button');
      if (!target) {
        setVariant('default');
        setLabel('');
        return;
      }
      const text = target.getAttribute('data-cursor');
      if (text) {
        setVariant('label');
        setLabel(text);
      } else {
        setVariant('hover');
        setLabel('');
      }
    };
    const handleLeave = () => setVisible(false);

    window.addEventListener('pointermove', handleMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', handleLeave);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      document.documentElement.removeEventListener('pointerleave', handleLeave);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  const size = variant === 'label' ? 96 : variant === 'hover' ? 56 : 14;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[95] flex items-center justify-center rounded-full bg-white mix-blend-difference"
      style={{ x: springX, y: springY, translateX: '-50%', translateY: '-50%' }}
      animate={{ width: size, height: size, opacity: visible ? 1 : 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {variant === 'label' && (
        <motion.span
          key={label}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-[10px] font-extrabold uppercase tracking-widest text-black"
        >
          {label}
        </motion.span>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Barra de progresso do scroll                                        */
/* ------------------------------------------------------------------ */

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[90] h-[2px] origin-left bg-white"
      style={{ scaleX }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Texto revelado letra a letra por máscara                            */
/* ------------------------------------------------------------------ */

interface SplitRevealProps {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  /** Letras sobem levemente ao passar o mouse. */
  hoverLift?: boolean;
}

export function SplitReveal({ text, className = '', delay = 0, stagger = 0.06, hoverLift = false }: SplitRevealProps) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return <span className={className}>{text}</span>;

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      {Array.from(text).map((char, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: '110%', rotate: 6 }}
            animate={{ y: '0%', rotate: 0 }}
            whileHover={hoverLift ? { y: '-10%', transition: { duration: 0.25 } } : undefined}
            transition={{ duration: 1, delay: delay + i * stagger, ease: EASE_OUT_EXPO }}
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Entrada ao aparecer na tela                                         */
/* ------------------------------------------------------------------ */

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  /** Anima no mount em vez de ao entrar na viewport (útil no hero). */
  onMount?: boolean;
}

export function Reveal({ children, className = '', delay = 0, y = 40, onMount = false }: RevealProps) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  const hidden = { opacity: 0, y, filter: 'blur(8px)' };
  const shown = { opacity: 1, y: 0, filter: 'blur(0px)' };
  const transition = { duration: 0.9, delay, ease: EASE_OUT_EXPO };

  return onMount ? (
    <motion.div className={className} initial={hidden} animate={shown} transition={transition}>
      {children}
    </motion.div>
  ) : (
    <motion.div
      className={className}
      initial={hidden}
      whileInView={shown}
      viewport={{ once: true, margin: '-80px' }}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero: parallax com o mouse + saída suave ao rolar                   */
/* ------------------------------------------------------------------ */

export function HeroMotion({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduced = usePrefersReducedMotion();
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const px = useSpring(mx, { stiffness: 80, damping: 20 });
  const py = useSpring(my, { stiffness: 80, damping: 20 });

  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 600], [1, 0]);
  const scale = useTransform(scrollY, [0, 600], [1, 0.88]);
  const scrollShift = useTransform(scrollY, [0, 600], [0, 140]);
  const combinedY = useTransform([py, scrollShift], ([a, b]) => (a as number) + (b as number));

  useEffect(() => {
    if (reduced || !finePointer) return;
    const handle = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth - 0.5) * -30);
      my.set((e.clientY / window.innerHeight - 0.5) * -20);
    };
    window.addEventListener('pointermove', handle, { passive: true });
    return () => window.removeEventListener('pointermove', handle);
  }, [reduced, finePointer, mx, my]);

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} style={{ x: px, y: combinedY, opacity, scale }}>
      {children}
    </motion.div>
  );
}

/** Indicador "role para baixo" com linha animada. */
export function ScrollCue() {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="pointer-events-none absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.4em] text-white/60">
      <span>Scroll</span>
      <span className="relative block h-12 w-px overflow-hidden bg-white/20">
        {!reduced && (
          <motion.span
            className="absolute inset-x-0 top-0 h-1/2 bg-white"
            animate={{ y: ['-100%', '200%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Palavras que acendem conforme o scroll                              */
/* ------------------------------------------------------------------ */

function ScrollWord({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.12, 1]);
  const y = useTransform(progress, range, [8, 0]);
  return (
    <motion.span style={{ opacity, y }} className="mr-[0.25em] inline-block">
      {children}
    </motion.span>
  );
}

export function ScrollWords({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.4'] });

  const words = text.trim().split(/\s+/);

  if (reduced) return <p className={className}>{text}</p>;

  return (
    <p ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, i) => {
          const start = i / words.length;
          const end = start + 1 / words.length;
          return (
            <ScrollWord key={i} progress={scrollYProgress} range={[start, end]}>
              {word}
            </ScrollWord>
          );
        })}
      </span>
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Imagem com parallax interno                                         */
/* ------------------------------------------------------------------ */

export function ParallaxImage({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-10%', '10%']);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <motion.div className="absolute -inset-y-[12%] inset-x-0" style={reduced ? undefined : { y }}>
        <img src={src} alt={alt} className={className} />
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card com holofote seguindo o mouse + inclinação 3D                  */
/* ------------------------------------------------------------------ */

export function InteractiveCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 200, damping: 18 });
  const rotateY = useSpring(ry, { stiffness: 200, damping: 18 });

  const handleMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== 'mouse') return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.setProperty('--spot-x', `${px * 100}%`);
    el.style.setProperty('--spot-y', `${py * 100}%`);
    if (!reduced) {
      ry.set((px - 0.5) * 12);
      rx.set((0.5 - py) * 12);
    }
  };
  const handleLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className={`group relative overflow-hidden ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(420px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(255,255,255,0.16), transparent 45%)',
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
