import { motion } from 'framer-motion';
import { CreditCard, Home, Package, Truck } from 'lucide-react';
import type { ShippingOption } from '../../types/checkout';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

/** Dias úteis de separação antes da postagem (somados ao prazo da transportadora). */
const HANDLING_BUSINESS_DAYS = 1;
const LOOP_SECONDS = 4.5;
const LOOP_PAUSE_SECONDS = 1;
/** Paradas do caminhão em cada etapa (fração do trajeto e do tempo). */
const STOPS = ['0%', '33.3%', '66.6%', '100%'];
const STOP_TIMES = [0, 0.3, 0.62, 1];

const STEPS = [
  { key: 'payment', label: 'Pagamento', Icon: CreditCard },
  { key: 'packing', label: 'Separação', Icon: Package },
  { key: 'carrier', label: 'Correios', Icon: Truck },
  { key: 'home', label: 'Sua casa', Icon: Home },
] as const;

/** Soma dias úteis (seg a sex) a uma data. Feriados não são considerados. */
export function addBusinessDays(start: Date, days: number): Date {
  const date = new Date(start);
  let remaining = days;
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    const weekday = date.getDay();
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }
  return date;
}

export interface ShippingJourneyProps {
  option: ShippingOption;
  /** Data de referência (injetável nos testes). Padrão: agora. */
  now?: Date;
}

/** Animação do caminho do pedido até o cliente, com a previsão de entrega do frete escolhido. */
export function ShippingJourney({ option, now }: ShippingJourneyProps) {
  const reduceMotion = usePrefersReducedMotion();
  const carrier = option.company || 'Transportadora';
  const steps = STEPS.map(step => (step.key === 'carrier' ? { ...step, label: carrier } : step));

  const eta =
    option.deliveryDays === null
      ? null
      : addBusinessDays(now ?? new Date(), option.deliveryDays + HANDLING_BUSINESS_DAYS);
  const etaLabel = eta?.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });

  const loop = {
    duration: LOOP_SECONDS,
    times: STOP_TIMES,
    ease: 'easeInOut' as const,
    repeat: Infinity,
    repeatDelay: LOOP_PAUSE_SECONDS,
  };

  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 space-y-3"
      role="img"
      aria-label={`Seu pedido vai por ${carrier} ${option.name}${etaLabel ? `, previsão de entrega até ${etaLabel}` : ''}.`}
    >
      {/* Trilho com o caminhão */}
      <div className="relative mx-3 h-8" aria-hidden="true">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 rounded-full bg-white/15" />
        {reduceMotion ? (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-2/3 rounded-full bg-white/70" />
        ) : (
          <motion.div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 rounded-full bg-white"
            initial={{ width: '0%' }}
            animate={{ width: STOPS }}
            transition={loop}
          />
        )}
        {STOPS.map(left => (
          <span
            key={left}
            className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60"
            style={{ left }}
          />
        ))}
        <motion.div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-lg"
          initial={{ left: reduceMotion ? '66.6%' : '0%' }}
          animate={reduceMotion ? { left: '66.6%' } : { left: STOPS }}
          transition={reduceMotion ? { duration: 0 } : loop}
        >
          <Truck className="h-4 w-4" />
        </motion.div>
      </div>

      {/* Etapas */}
      <ol className="grid grid-cols-4 gap-1 text-center" aria-hidden="true">
        {steps.map(({ key, label, Icon }) => (
          <li key={key} className="flex flex-col items-center gap-1 text-[10px] text-gray-400">
            <Icon className="h-3.5 w-3.5 text-gray-300" />
            <span className="leading-tight">{label}</span>
          </li>
        ))}
      </ol>

      {etaLabel && (
        <p className="text-center text-[11px] text-gray-300">
          Previsão de entrega: <strong className="text-white">até {etaLabel}</strong>
        </p>
      )}
    </div>
  );
}
