import { motion } from 'framer-motion';
import { CreditCard, Home, Package, Truck } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

/** Posição de cada etapa no trilho. */
const STOPS = ['0%', '33.3%', '66.6%', '100%'];
const STOP_TIMES = [0, 0.3, 0.62, 1];
/** Quanto o caminhão avança rumo à próxima etapa no modo acompanhamento. */
const NUDGE = [0, 11, 22];
const LAST_STEP = STOPS.length - 1;

const STEPS = [
  { key: 'payment', label: 'Pagamento', Icon: CreditCard },
  { key: 'packing', label: 'Separação', Icon: Package },
  { key: 'carrier', label: 'Correios', Icon: Truck },
  { key: 'home', label: 'Sua casa', Icon: Home },
] as const;

export interface JourneyTrackProps {
  /** Nome exibido na etapa de transporte (ex.: 'Correios'). */
  carrierLabel: string;
  /**
   * Etapa atual (0 = pagamento ... 3 = entregue). Sem valor, o caminhão percorre
   * o trajeto inteiro em loop (prévia no carrinho).
   */
  currentStep?: number;
}

/** Trilho com caminhão animado e as quatro etapas da entrega. Decorativo (aria-hidden). */
export function JourneyTrack({ carrierLabel, currentStep }: JourneyTrackProps) {
  const reduceMotion = usePrefersReducedMotion();
  const tracking = currentStep !== undefined;
  const step = tracking ? Math.min(Math.max(currentStep, 0), LAST_STEP) : LAST_STEP;
  const steps = STEPS.map(s => (s.key === 'carrier' ? { ...s, label: carrierLabel } : s));

  const previewLoop = {
    duration: 4.5,
    times: STOP_TIMES,
    ease: 'easeInOut' as const,
    repeat: Infinity,
    repeatDelay: 1,
  };

  // Acompanhamento: o caminhão "anda" da etapa atual em direção à próxima e volta.
  const base = Number.parseFloat(STOPS[step]);
  const nudgeLeft = NUDGE.map(n => `${Math.min(base + n, 100)}%`);
  const animatePreview = !tracking && !reduceMotion;
  const animateNudge = tracking && step < LAST_STEP && !reduceMotion;
  const staticLeft = tracking ? STOPS[step] : STOPS[2];
  const filledWidth = tracking ? STOPS[step] : STOPS[2];

  const truckAnimate = animatePreview
    ? { left: STOPS }
    : animateNudge
      ? { left: nudgeLeft }
      : { left: staticLeft };
  const truckTransition = animatePreview
    ? previewLoop
    : animateNudge
      ? { duration: 1.6, ease: 'easeInOut' as const, repeat: Infinity, repeatType: 'reverse' as const }
      : { duration: 0 };
  const truckInitial = animatePreview ? STOPS[0] : animateNudge ? nudgeLeft[0] : staticLeft;

  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="relative mx-3 h-8">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 rounded-full bg-white/15" />
        {animatePreview ? (
          <motion.div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 rounded-full bg-white"
            initial={{ width: '0%' }}
            animate={{ width: STOPS }}
            transition={previewLoop}
          />
        ) : (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 rounded-full bg-white/80"
            style={{ width: filledWidth }}
          />
        )}
        {STOPS.map((left, i) => (
          <span
            key={left}
            className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
              tracking && i <= step ? 'bg-white' : 'bg-white/40'
            }`}
            style={{ left }}
          />
        ))}
        <motion.div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-lg"
          initial={{ left: truckInitial }}
          animate={truckAnimate}
          transition={truckTransition}
        >
          {tracking && step === LAST_STEP ? <Home className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
        </motion.div>
      </div>

      <ol className="grid grid-cols-4 gap-1 text-center">
        {steps.map(({ key, label, Icon }, i) => {
          const reached = !tracking || i <= step;
          const tone =
            tracking && i === step ? 'font-bold text-white' : reached ? 'text-gray-400' : 'text-gray-600';
          return (
            <li key={key} className={`flex flex-col items-center gap-1 text-[10px] ${tone}`}>
              <Icon className={`h-3.5 w-3.5 ${reached ? 'text-gray-300' : 'text-gray-600'}`} />
              <span className="leading-tight">{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
