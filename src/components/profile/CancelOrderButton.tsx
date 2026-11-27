import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Order } from '../../types/ecommerce';
import { checkoutService, CheckoutError, CHECKOUT_ERROR_MESSAGES_PT } from '../../services/checkoutService';

/** Status em que o cliente ainda pode cancelar (antes do envio). */
const CANCELLABLE: ReadonlySet<Order['status']> = new Set(['pending', 'pending_payment', 'processing']);

export const isCancellable = (status: Order['status']): boolean => CANCELLABLE.has(status);

export interface CancelOrderButtonProps {
  order: Pick<Order, 'id' | 'status' | 'labelUrl'>;
  onCancelled: (orderId: string, refunded: boolean) => void;
  onError: (message: string) => void;
}

/** Botão com confirmação em duas etapas para o cliente cancelar o próprio pedido. */
export function CancelOrderButton({ order, onCancelled, onError }: CancelOrderButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  // Com etiqueta comprada, o cancelamento passa pelo atendimento (o servidor também recusa).
  if (!isCancellable(order.status) || order.labelUrl) return null;

  const paid = order.status === 'processing';
  const warning = paid
    ? 'O pedido será cancelado e o valor pago estornado para a mesma forma de pagamento.'
    : 'O pedido será cancelado e o pagamento pendente deixará de valer.';

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await checkoutService.cancelOrder(order.id);
      onCancelled(order.id, res.refunded);
    } catch (err) {
      onError(err instanceof CheckoutError ? err.message : CHECKOUT_ERROR_MESSAGES_PT.INTERNAL_ERROR);
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="eyebrow link-line tap-target text-danger"
      >
        Cancelar pedido
      </button>
    );
  }

  return (
    <div className="space-y-3 border-l-2 border-danger bg-ink-2 p-4" role="alertdialog" aria-live="polite">
      <p className="text-sm text-paper">{warning} Deseja continuar?</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="btn-primary flex-1 !border-danger !bg-danger !text-paper"
        >
          {busy && <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
          {busy ? 'Cancelando...' : 'Sim, cancelar'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="btn-secondary flex-1"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}
