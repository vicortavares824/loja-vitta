import type { Order } from '../../../src/types/ecommerce.js';

export type OrderStatus = Order['status'];

export type MpStatus =
  | 'pending'
  | 'approved'
  | 'authorized'
  | 'in_process'
  | 'in_mediation'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back';

export type PaymentDecision =
  | { action: 'confirm' }
  | { action: 'release' }
  | { action: 'ignore'; reason: 'already_final' | 'amount_mismatch' | 'not_final' };

export interface PaymentTransitionInput {
  orderStatus: OrderStatus;
  orderTotalCents: number;
  mpStatus: MpStatus;
  paidCents: number;
}

/**
 * Decisão pura usada pelo webhook e pelo cron (sem I/O).
 * `pending` (legado) é tratado como `pending_payment`.
 * Um Pix vencido chega como `cancelled`, o que cobre o requisito 7.5.
 */
export function decidePaymentTransition(input: PaymentTransitionInput): PaymentDecision {
  const { orderStatus, orderTotalCents, mpStatus, paidCents } = input;

  if (orderStatus !== 'pending_payment' && orderStatus !== 'pending') {
    return { action: 'ignore', reason: 'already_final' };
  }

  switch (mpStatus) {
    case 'approved':
      return paidCents === orderTotalCents
        ? { action: 'confirm' }
        : { action: 'ignore', reason: 'amount_mismatch' };
    case 'rejected':
    case 'cancelled':
      return { action: 'release' };
    default:
      return { action: 'ignore', reason: 'not_final' };
  }
}
