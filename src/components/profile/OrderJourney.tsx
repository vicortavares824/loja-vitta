import type { Order } from '../../types/ecommerce';
import { JourneyTrack } from '../delivery/JourneyTrack';

const DEFAULT_CARRIER = 'Correios';

type ActiveStatus = Exclude<Order['status'], 'cancelled'>;

/** Etapa do trilho e frase para cada status. Cancelado não tem jornada. */
const STATUS_STEP: Record<ActiveStatus, { step: number; text: (carrier: string) => string }> = {
  pending: { step: 0, text: () => 'Aguardando a confirmação do pagamento.' },
  pending_payment: { step: 0, text: () => 'Aguardando a confirmação do pagamento.' },
  processing: { step: 1, text: () => 'Pagamento aprovado. Estamos separando seu pedido.' },
  shipped: { step: 2, text: carrier => `Pedido postado. Em trânsito com ${carrier}.` },
  delivered: { step: 3, text: () => 'Pedido entregue. Aproveite!' },
};

export interface OrderJourneyProps {
  order: Pick<Order, 'status' | 'shippingServiceName'>;
}

/** Acompanhamento animado do pedido conforme o status atual. */
export function OrderJourney({ order }: OrderJourneyProps) {
  if (order.status === 'cancelled') return null;
  const entry = STATUS_STEP[order.status];
  if (!entry) return null;

  // 'Correios SEDEX' -> 'Correios'; pedidos antigos não têm serviço gravado.
  const carrier = order.shippingServiceName?.trim().split(/\s+/)[0] || DEFAULT_CARRIER;
  const text = entry.text(carrier);

  return (
    <div className="space-y-3 border border-line bg-ink-2 px-4 py-4" role="img" aria-label={text}>
      <JourneyTrack carrierLabel={carrier} currentStep={entry.step} />
      <p className="eyebrow text-center text-paper-2">{text}</p>
    </div>
  );
}
