import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../errors.js';
import type { Logger } from '../logger.js';
import type { MercadoPagoClient } from '../payments/mercadoPago.js';
import { releaseOrderStock } from '../stock/stockService.js';
import { CANCEL_REASON_EXPIRED, CANCEL_REASON_PAYMENT_REJECTED } from './orderService.js';
import { decidePaymentTransition, type OrderStatus } from './stateMachine.js';

export const EXPIRE_BATCH_LIMIT = 25;

export interface ExpireDeps {
  supabase: SupabaseClient;
  mp: MercadoPagoClient;
  now?: () => Date;
  log?: Logger;
  /** Máximo de pedidos por execução. Padrão: 25. */
  limit?: number;
}

export interface ExpireResult {
  /** Pedidos cancelados com estoque devolvido. */
  expired: number;
  /** Pedidos pagos no limite e confirmados. */
  confirmed: number;
}

interface StaleOrder {
  id: string;
  status: OrderStatus;
  payment_id: string | null;
  totalAmount: number | string;
}

/**
 * Cancela pedidos `pending_payment` vencidos. Com `payment_id`, consulta o Mercado Pago antes:
 * pago -> confirma; recusado/cancelado -> libera; ainda aberto -> cancela a cobrança e libera.
 * Sem `payment_id` apenas libera. Falha ao consultar o Mercado Pago deixa o pedido para a próxima execução.
 */
export async function expireStaleOrders(deps: ExpireDeps): Promise<ExpireResult> {
  const now = (deps.now ?? (() => new Date()))();
  const limit = Math.min(deps.limit ?? EXPIRE_BATCH_LIMIT, EXPIRE_BATCH_LIMIT);

  const { data, error } = await deps.supabase
    .from('orders')
    .select('id, status, payment_id, totalAmount')
    .eq('status', 'pending_payment')
    .lt('expires_at', now.toISOString())
    .order('expires_at', { ascending: true })
    .limit(limit);
  if (error) throw new AppError('INTERNAL_ERROR', { internal: { operation: 'expireStaleOrders', error } });

  const result: ExpireResult = { expired: 0, confirmed: 0 };

  for (const order of (data ?? []) as unknown as StaleOrder[]) {
    try {
      const outcome = await processOrder(deps, order);
      if (outcome === 'expired') result.expired += 1;
      else if (outcome === 'confirmed') result.confirmed += 1;
    } catch (err) {
      deps.log?.error('expire.order_failed', { orderId: order.id, error: err });
    }
  }
  return result;
}

async function processOrder(
  deps: ExpireDeps,
  order: StaleOrder,
): Promise<'expired' | 'confirmed' | 'skipped'> {
  if (!order.payment_id) {
    const released = await releaseOrderStock(deps.supabase, order.id, CANCEL_REASON_EXPIRED);
    return released ? 'expired' : 'skipped';
  }

  // Se a consulta falhar, o erro sobe e o pedido não é cancelado (pode ter sido pago).
  const payment = await deps.mp.getPayment(order.payment_id);
  const orderTotalCents = Math.round(Number(order.totalAmount) * 100);
  const decision = decidePaymentTransition({
    orderStatus: order.status,
    orderTotalCents,
    mpStatus: payment.status,
    paidCents: payment.paidCents,
  });

  if (decision.action === 'confirm') {
    const { data, error } = await deps.supabase.rpc('confirm_order_payment', {
      p_order_id: order.id,
      p_payment_id: order.payment_id,
      p_paid: payment.paidCents / 100,
    });
    if (error) throw new AppError('INTERNAL_ERROR', { internal: { operation: 'confirm_order_payment', error } });
    return data === 'confirmed' ? 'confirmed' : 'skipped';
  }

  if (decision.action === 'release') {
    const reason = payment.status === 'rejected' ? CANCEL_REASON_PAYMENT_REJECTED : CANCEL_REASON_EXPIRED;
    const released = await releaseOrderStock(deps.supabase, order.id, reason);
    return released ? 'expired' : 'skipped';
  }

  if (decision.reason === 'amount_mismatch') {
    deps.log?.warn('expire.amount_mismatch', {
      orderId: order.id,
      orderTotalCents,
      paidCents: payment.paidCents,
    });
    return 'skipped';
  }

  // Pagamento ainda aberto e pedido vencido: cancela a cobrança (best effort) e libera.
  try {
    await deps.mp.cancelPayment(order.payment_id);
  } catch (err) {
    deps.log?.warn('expire.cancel_payment_failed', { orderId: order.id, error: err });
  }
  const released = await releaseOrderStock(deps.supabase, order.id, CANCEL_REASON_EXPIRED);
  return released ? 'expired' : 'skipped';
}
