import { useState } from 'react';
import { Loader2, Printer, RefreshCw, Tag } from 'lucide-react';
import type { Order } from '../../types/ecommerce';
import { checkoutService, CheckoutError, CHECKOUT_ERROR_MESSAGES_PT } from '../../services/checkoutService';

export interface ShippingLabelActionsProps {
  order: Pick<Order, 'id' | 'status' | 'labelUrl' | 'trackingCode'>;
  /** Mensagem para o toast e se deve recarregar os pedidos. */
  onDone: (message: string, type: 'success' | 'error', reload: boolean) => void;
}

/** Lista "faltam: x, y" quando o servidor devolve LABEL_DATA_MISSING. */
function errorMessage(err: unknown): string {
  if (!(err instanceof CheckoutError)) return CHECKOUT_ERROR_MESSAGES_PT.INTERNAL_ERROR;
  const missing = (err.details as { missing?: unknown } | undefined)?.missing;
  if (err.code === 'LABEL_DATA_MISSING' && Array.isArray(missing) && missing.length > 0) {
    return `Faltam dados para a etiqueta: ${missing.join(', ')}.`;
  }
  return err.message;
}

const BUTTON_CLASS =
  'min-h-[36px] inline-flex items-center gap-1.5 px-3 rounded-[2px] font-bold uppercase tracking-wider disabled:opacity-40';

/** Botões do admin: gerar etiqueta no Melhor Envio, imprimir e atualizar o rastreio. */
export function ShippingLabelActions({ order, onDone }: ShippingLabelActionsProps) {
  const [busy, setBusy] = useState<'generate' | 'refresh' | null>(null);

  const canGenerate = !order.labelUrl && order.status === 'processing';
  const canRefresh = Boolean(order.labelUrl) && (order.status === 'processing' || order.status === 'shipped');
  if (!canGenerate && !order.labelUrl) return null;

  const run = async (action: 'generate' | 'refresh') => {
    setBusy(action);
    try {
      const res = await checkoutService.shippingLabel(order.id, action);
      if (action === 'generate' && res.labelUrl) window.open(res.labelUrl, '_blank', 'noopener,noreferrer');
      const tracking = res.trackingCode ? ` Rastreio: ${res.trackingCode}.` : '';
      onDone(action === 'generate' ? `Etiqueta gerada.${tracking}` : `Rastreio atualizado.${tracking}`, 'success', true);
    } catch (err) {
      onDone(errorMessage(err), 'error', false);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {canGenerate && (
        <button
          type="button"
          onClick={() => run('generate')}
          disabled={busy !== null}
          className={`${BUTTON_CLASS} bg-paper text-ink`}
        >
          {busy === 'generate' ? (
            <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" aria-hidden="true" />
          ) : (
            <Tag className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          {busy === 'generate' ? 'Gerando...' : 'Gerar etiqueta'}
        </button>
      )}
      {order.labelUrl && (
        <a
          href={order.labelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${BUTTON_CLASS} border border-line-strong text-paper`}
        >
          <Printer className="w-3.5 h-3.5" aria-hidden="true" />
          Imprimir etiqueta
        </a>
      )}
      {canRefresh && (
        <button
          type="button"
          onClick={() => run('refresh')}
          disabled={busy !== null}
          className={`${BUTTON_CLASS} border border-line-strong text-paper`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${busy === 'refresh' ? 'motion-safe:animate-spin' : ''}`} aria-hidden="true" />
          Atualizar rastreio
        </button>
      )}
    </div>
  );
}
