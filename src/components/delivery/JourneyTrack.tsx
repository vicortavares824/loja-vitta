import { motion } from 'framer-motion';
import { CreditCard, Home, Package, Truck } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

/** Posição de cada etapa no trilho, em % da largura. */
const STOP_PCTS = [0, 33.3, 66.6, 100];
const STOPS = STOP_PCTS.map(p => `${p}%`);
const STOP_TIMES = [0, 0.3, 0.62, 1];
const LAST_STEP = STOPS.length - 1;

/** Fio ondulado: período e amplitude da onda (unidades do viewBox) e velocidade do fluxo. */
const WAVE_PERIOD = 5;
const WAVE_AMPLITUDE = 3.5;
const WAVE_HEIGHT = 12;
const WAVE_FLOW_SECONDS = 15;
const STEPS = [
  { key: 'payment', label: 'Pagamento', Icon: CreditCard },
  { key: 'packing', label: 'Separação', Icon: Package },
  { key: 'carrier', label: 'Correios', Icon: Truck },
  { key: 'home', label: 'Sua casa', Icon: Home },
] as const;

/** Senoide de `periods` ciclos (curvas quadráticas), centrada na altura do viewBox. */
function wavePath(periods: number): string {
  const mid = WAVE_HEIGHT / 2;
  const half = WAVE_PERIOD / 2;
  let d = `M0 ${mid}`;
  for (let i = 0; i < periods * 2; i += 1) {
    const x = i * half;
    const peak = i % 2 === 0 ? mid - WAVE_AMPLITUDE : mid + WAVE_AMPLITUDE;
    d += ` Q${x + half / 2} ${peak} ${x + half} ${mid}`;
  }
  return d;
}

const WAVE_PERIODS = 12;
const WAVE_D = wavePath(WAVE_PERIODS * 2); // dobro: metade fica fora e entra rolando
const WAVE_VIEWBOX_WIDTH = WAVE_PERIODS * 2 * WAVE_PERIOD;

export interface JourneyTrackProps {
  carrierLabel: string;
  currentStep?: number;                                                                                               
}

/** Trecho atual em forma de fio ondulado, com a onda correndo no sentido da entrega. */
function WaveSegment({ from, to, animate }: { from: number; to: number; animate: boolean }) {
  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 overflow-hidden"
      style={{ left: `${from}%`, width: `${to - from}%`, height: WAVE_HEIGHT }}
    >
      <motion.svg
        className="h-full text-white"
        style={{ width: '200%' }}
        viewBox={`0 0 ${WAVE_VIEWBOX_WIDTH} ${WAVE_HEIGHT}`}
        preserveAspectRatio="none"
        initial={{ x: '-50%' }}
        animate={animate ? { x: '0%' } : { x: '-50%' }}
        transition={animate ? { duration: WAVE_FLOW_SECONDS, ease: 'linear', repeat: Infinity } : { duration: 0 }}
      >
        <path d={WAVE_D} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </motion.svg>
    </div>
  );
}

/** Trilho com caminhão e as quatro etapas da entrega. Decorativo (aria-hidden). */
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
  const animatePreview = !tracking && !reduceMotion;

  // Acompanhamento: caminhão parado no meio do trecho entre a etapa atual e a próxima.
  const inTransit = tracking && step < LAST_STEP;
  const segmentFrom = STOP_PCTS[step];
  const segmentTo = inTransit ? STOP_PCTS[step + 1] : segmentFrom;
  const truckLeft = tracking
    ? `${inTransit ? (segmentFrom + segmentTo) / 2 : STOP_PCTS[LAST_STEP]}%`
    : STOPS[2];

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
            style={{ width: tracking ? STOPS[step] : STOPS[2] }}
          />
        )}

        {inTransit && <WaveSegment from={segmentFrom} to={segmentTo} animate={!reduceMotion} />}

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
          initial={{ left: animatePreview ? STOPS[0] : truckLeft }}
          animate={animatePreview ? { left: STOPS } : { left: truckLeft }}
          transition={animatePreview ? previewLoop : { duration: 0 }}
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
