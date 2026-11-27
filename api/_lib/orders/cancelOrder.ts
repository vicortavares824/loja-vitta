import type { SupabaseClient } from '@supabase/supabase-js';
import type { CancelOrderResponse } from '../../../src/types/checkout.js';
import { AppError } from '../errors.js';
import type { Logger } from '../logger.js';
import type { MercadoPagoClient, MpStatus } from '../payments/mercadoPago.js';
import { releaseOrderStock } from '../stock/stockService.js';

export const CANCEL_REASON_CUSTOMER = 'customer_cancelled';

/** Pagamentos ainda em aberto no Mercado Pago, que podem ser cancelados. */
const OPEN_PAYMENT_STATUSES: ReadonlySet<MpStatus> = new Set<MpStatus>(['pending', 'in_process', 'authorized']);

export interface CancelOrderDeps {
  supabase: SupabaseClient;
  mp: MercadoPagoClient;
  log?: Logger;
}

interface OrderRow {
  id: string;
  user_id: string | null;
  status: string;
  payment_id: string | null;
}

function notCancellable(internal: Record<string, unknown>): AppError {
  return new AppError('ORDER_NOT_CANCELLABLE', { internal });
}

async function loadOwnOrder(supabase: SupabaseClient, userId: string, orderId: string): Promise<OrderRow> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, user_id, status, payment_id')
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw new AppError('INTERNAL_ERROR', { internal: { operation: 'loadOrder', error } });
  const order = data as OrderRow | null;
  // Pedido de outro cliente responde igual a inexistente (não revela que existe).
  if (!order || order.user_id !== userId) throw new AppError('ORDER_NOT_FOUND');
  return order;
}

/** Marca o pedido para revisão manual (estorno feito, mas o cancelamento não fechou). */
async function flagForReview(deps: CancelOrderDeps, orderId: string, reason: string): Promise<void> {
  const { error } = await deps.supabase.from('orders').update({ needs_review: true }).eq('id', orderId);
  deps.log?.error('order.cancel.needs_review', { orderId, reason, updateError: error ?? null });
}

/** Aguardando pagamento: cancela a cobrança em aberto e devolve o estoque. */
async function cancelUnpaid(deps: CancelOrderDeps, order: OrderRow): Promise<CancelOrderResponse> {
  if (order.payment_id) {
    const payment = await deps.mp.getPayment(order.payment_id);
    // Pago neste instante: o webhook vai movê-lo para "pago"; o cliente cancela de novo (com estorno).
    if (payment.status === 'approved') {
      throw notCancellable({ orderId: order.id, reason: 'payment_just_approved' });
    }
    if (OPEN_PAYMENT_STATUSES.has(payment.status)) await deps.mp.cancelPayment(order.payment_id);
  }
  const released = await releaseOrderStock(deps.supabase, order.id, CANCEL_REASON_CUSTOMER);
  if (!released) throw notCancellable({ orderId: order.id, reason: 'status_changed' });
  return { orderId: order.id, status: 'cancelled', refunded: false };
}

function dbError(operation: string, error: unknown): AppError {
  return new AppError('INTERNAL_ERROR', { internal: { operation, error } });
}

/**
 * Trava o pedido pago para cancelamento (cancel_requested_at). Com a trava, o trigger
 * orders_guard_update impede o admin de marcar como enviado durante o estorno.
 * Condicional ao status: só trava se ainda estiver 'processing'. Repetir é permitido.
 */
async function claimForCancel(deps: CancelOrderDeps, orderId: string): Promise<boolean> {
  const { data, error } = await deps.supabase
    .from('orders')
    .update({ cancel_requested_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('status', 'processing')
    // Etiqueta sendo gerada ou já comprada no Melhor Envio: o cliente não cancela sozinho.
    .is('label_claimed_at', null)
    .is('me_order_id', null)
    .select('id');
  if (error) throw dbError('claimForCancel', error);
  return (data?.length ?? 0) > 0;
}

/** Solta a trava quando o estorno falhou (o pedido volta a poder ser enviado). */
async function releaseClaim(deps: CancelOrderDeps, orderId: string): Promise<void> {
  const { error } = await deps.supabase
    .from('orders')
    .update({ cancel_requested_at: null })
    .eq('id', orderId)
    .eq('status', 'processing');
  if (error) deps.log?.error('order.cancel.release_claim_failed', { orderId, error });
}

/** Outra requisição (clique duplo) já cancelou este pedido a pedido do cliente. */
async function alreadyCancelledByCustomer(deps: CancelOrderDeps, orderId: string): Promise<boolean> {
  const { data, error } = await deps.supabase
    .from('orders')
    .select('status, cancel_reason')
    .eq('id', orderId)
    .maybeSingle();
  if (error || !data) return false;
  const row = data as { status: string; cancel_reason: string | null };
  return row.status === 'cancelled' && row.cancel_reason === CANCEL_REASON_CUSTOMER;
}

/** Estorno total; "já estornado" (repetição depois de falha) conta como sucesso. */
async function refundOnce(deps: CancelOrderDeps, paymentId: string): Promise<void> {
  try {
    await deps.mp.refundPayment(paymentId);
  } catch (err) {
    const payment = await deps.mp.getPayment(paymentId).catch(() => null);
    if (payment?.status === 'refunded') return;
    throw err;
  }
}

/**
 * Pago e ainda não enviado: trava o pedido, estorna no Mercado Pago, depois devolve o
 * estoque e cancela. Se o estorno falhar, solta a trava e nada muda.
 */
async function cancelPaid(deps: CancelOrderDeps, order: OrderRow): Promise<CancelOrderResponse> {
  if (!order.payment_id) throw notCancellable({ orderId: order.id, reason: 'missing_payment_id' });
  const done: CancelOrderResponse = { orderId: order.id, status: 'cancelled', refunded: true };

  if (!(await claimForCancel(deps, order.id))) {
    if (await alreadyCancelledByCustomer(deps, order.id)) return done;
    throw notCancellable({ orderId: order.id, reason: 'status_changed' });
  }

  try {
    await refundOnce(deps, order.payment_id);
  } catch (err) {
    await releaseClaim(deps, order.id);
    throw err;
  }

  const { data, error } = await deps.supabase.rpc('cancel_paid_order', {
    p_order_id: order.id,
    p_reason: CANCEL_REASON_CUSTOMER,
  });
  if (error) {
    // Estornado e ainda travado: o admin não consegue enviar; repetir o cancelamento conclui.
    await flagForReview(deps, order.id, 'cancel_rpc_failed_after_refund');
    throw dbError('cancel_paid_order', error);
  }
  if (data !== true) {
    if (await alreadyCancelledByCustomer(deps, order.id)) return done;
    await flagForReview(deps, order.id, 'status_changed_after_refund');
    throw notCancellable({ orderId: order.id, reason: 'status_changed_after_refund' });
  }
  return done;
}

/**
 * Cancelamento pelo próprio cliente, permitido até antes do envio:
 * aguardando pagamento (sem estorno) ou pago em preparação (com estorno total).
 */
export async function cancelOrder(
  deps: CancelOrderDeps,
  input: { userId: string; orderId: string },
): Promise<CancelOrderResponse> {
  const order = await loadOwnOrder(deps.supabase, input.userId, input.orderId);

  switch (order.status) {
    case 'pending':
    case 'pending_payment':
      return cancelUnpaid(deps, order);
    case 'processing':
      return cancelPaid(deps, order);
    default:
      throw notCancellable({ orderId: order.id, status: order.status });
  }
}
