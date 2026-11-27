import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Order } from '../../types/ecommerce';
import { checkoutService, CheckoutError, CHECKOUT_ERROR_MESSAGES_PT } from '../../services/checkoutService';

/** Status em que o cliente ainda pode cancelar (antes do envio). */
const CANCELLABLE: ReadonlySet<Order['status']> = new Set(['pending', 'pending_payment', 'processing']);

export const isCancellable = (status: Order['status']): boolean => CANCELLABLE.has(status);

export interface CancelOrderButtonProps {
  order: Pick<Order, 'id' | 'status'>;
  onCancelled: (orderId: string, refunded: boolean) => void;
  onError: (message: string) => void;
}

/** Botão com confirmação em duas etapas para o cliente cancelar o próprio pedido. */
export function CancelOrderButton({ order, onCancelled, onError }: CancelOrderButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!isCancellable(order.status)) return null;

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
        className="min-h-[44px] px-2 text-[11px] font-bold uppercase tracking-widest text-red-300 hover:text-red-200 underline underline-offset-4"
      >
        Cancelar pedido
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 space-y-2" role="alertdialog" aria-live="polite">
      <p className="text-xs text-red-100">{warning} Deseja continuar?</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="min-h-[44px] flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-red-500 text-white text-xs font-bold uppercase tracking-widest disabled:opacity-60"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {busy ? 'Cancelando...' : 'Sim, cancelar'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="min-h-[44px] flex-1 rounded-full border border-white/20 text-white text-xs font-bold uppercase tracking-widest disabled:opacity-60"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}
