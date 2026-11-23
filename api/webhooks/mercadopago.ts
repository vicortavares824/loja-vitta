import { AppError, isAppError } from '../_lib/errors.js';
import { route } from '../_lib/http.js';
import { decidePaymentTransition, type OrderStatus } from '../_lib/orders/stateMachine.js';
import {
  CANCEL_REASON_EXPIRED,
  CANCEL_REASON_PAYMENT_REJECTED,
} from '../_lib/orders/orderService.js';
import { createMercadoPagoClient } from '../_lib/payments/mercadoPago.js';
import { verifyMercadoPagoSignature } from '../_lib/payments/webhookSignature.js';
import { releaseOrderStock } from '../_lib/stock/stockService.js';
import { createAdminClient } from '../_lib/supabase.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Lê `data.id` e `type` da query string (o Mercado Pago os envia ali). */
function readQuery(url: string | undefined): { dataId?: string; type?: string } {
  const search = new URL(url ?? '', 'http://localhost').searchParams;
  return {
    dataId: search.get('data.id') ?? search.get('id') ?? undefined,
    type: search.get('type') ?? search.get('topic') ?? undefined,
  };
}

/** Falha transitória: o Mercado Pago repete a entrega quando recebe 500. */
function transient(operation: string, error: unknown): AppError {
  return new AppError('INTERNAL_ERROR', { internal: { operation, error } });
}

export default route({
  methods: ['POST'],
  cors: false,
  async handler({ req, env, log }) {
    const { dataId, type } = readQuery(req.url);

    const valid = verifyMercadoPagoSignature({
      secret: env.MERCADOPAGO_WEBHOOK_SECRET,
      signatureHeader: firstHeader(req.headers['x-signature']),
      requestId: firstHeader(req.headers['x-request-id']),
      dataId,
    });
    if (!valid) {
      log.warn('webhook.invalid_signature');
      throw new AppError('UNAUTHENTICATED');
    }

    if (type !== 'payment' || !dataId) {
      log.info('webhook.ignored_type', { type });
      return { status: 200, body: { received: true } };
    }

    const mp = createMercadoPagoClient({
      accessToken: env.MERCADOPAGO_ACCESS_TOKEN,
      siteUrl: env.SITE_URL,
    });

    let payment: Awaited<ReturnType<typeof mp.getPayment>>;
    try {
      payment = await mp.getPayment(dataId);
    } catch (err) {
      throw transient('getPayment', isAppError(err) ? (err.internal ?? err) : err);
    }

    const orderId = payment.externalReference;
    if (!UUID.test(orderId)) {
      log.warn('webhook.order_not_found', { paymentId: payment.id, reason: 'invalid_external_reference' });
      return { status: 200, body: { received: true } };
    }

    const supabase = createAdminClient(env);
    const { data: order, error: selectError } = await supabase
      .from('orders')
      .select('id, status, payment_id, totalAmount')
      .eq('id', orderId)
      .maybeSingle();
    if (selectError) throw transient('selectOrder', selectError);

    if (!order || String(order.payment_id ?? '') !== String(payment.id)) {
      log.warn('webhook.order_not_found', { orderId, paymentId: payment.id });
      return { status: 200, body: { received: true } };
    }

    const orderTotalCents = Math.round(Number(order.totalAmount) * 100);
    const decision = decidePaymentTransition({
      orderStatus: order.status as OrderStatus,
      orderTotalCents,
      mpStatus: payment.status,
      paidCents: payment.paidCents,
    });

    try {
      // Pagamento aprovado depois do cancelamento: a RPC marca needs_review (design: pagamento tardio).
      const latePayment = order.status === 'cancelled' && payment.status === 'approved';
      if (decision.action === 'confirm' || latePayment) {
        const { data, error } = await supabase.rpc('confirm_order_payment', {
          p_order_id: orderId,
          p_payment_id: String(payment.id),
          p_paid: payment.paidCents / 100,
        });
        if (error) throw transient('confirm_order_payment', error);
        if (data === 'late_payment') log.warn('webhook.late_payment', { orderId, paymentId: payment.id });
        else if (data === 'amount_mismatch') {
          log.warn('webhook.amount_mismatch', { orderId, orderTotalCents, paidCents: payment.paidCents });
        } else log.info('webhook.confirm', { orderId, result: data });
      } else if (decision.action === 'release') {
        const reason =
          payment.status === 'rejected' ? CANCEL_REASON_PAYMENT_REJECTED : CANCEL_REASON_EXPIRED;
        const released = await releaseOrderStock(supabase, orderId, reason);
        log.info('webhook.release', { orderId, released, mpStatus: payment.status });
      } else if (decision.reason === 'amount_mismatch') {
        log.warn('webhook.amount_mismatch', { orderId, orderTotalCents, paidCents: payment.paidCents });
      } else {
        log.info('webhook.no_action', { orderId, reason: decision.reason, mpStatus: payment.status });
      }
    } catch (err) {
      if (isAppError(err) && err.code === 'INTERNAL_ERROR') throw err;
      throw transient('applyTransition', err);
    }

    return { status: 200, body: { received: true } };
  },
});
