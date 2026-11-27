import type { ShippingOption } from '../../types/checkout';
import { JourneyTrack } from '../delivery/JourneyTrack';

/** Dias úteis de separação antes da postagem (somados ao prazo da transportadora). */
const HANDLING_BUSINESS_DAYS = 1;

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

/** Prévia animada do caminho do pedido, com a previsão de entrega do frete escolhido. */
export function ShippingJourney({ option, now }: ShippingJourneyProps) {
  const carrier = option.company || 'Transportadora';
  const eta =
    option.deliveryDays === null
      ? null
      : addBusinessDays(now ?? new Date(), option.deliveryDays + HANDLING_BUSINESS_DAYS);
  const etaLabel = eta?.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });

  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 space-y-3"
      role="img"
      aria-label={`Seu pedido vai por ${carrier} ${option.name}${etaLabel ? `, previsão de entrega até ${etaLabel}` : ''}.`}
    >
      <JourneyTrack carrierLabel={carrier} />
      {etaLabel && (
        <p className="text-center text-[11px] text-gray-300">
          Previsão de entrega: <strong className="text-white">até {etaLabel}</strong>
        </p>
      )}
    </div>
  );
}
