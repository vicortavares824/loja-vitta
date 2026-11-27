import { authenticate } from '../_lib/auth.js';
import { route } from '../_lib/http.js';
import { cancelOrder } from '../_lib/orders/cancelOrder.js';
import { createMercadoPagoClient } from '../_lib/payments/mercadoPago.js';
import { RATE_LIMITS } from '../_lib/rateLimit.js';
import { cancelOrderSchema, parseBody } from '../_lib/schemas.js';
import { createAdminClient } from '../_lib/supabase.js';

/**
 * POST /api/orders/cancel: o cliente cancela o próprio pedido até antes do envio.
 * Aguardando pagamento: cancela a cobrança e devolve o estoque.
 * Pago em preparação: estorno total no Mercado Pago, devolve o estoque e cancela.
 */
export default route({
  methods: ['POST'],
  rateLimit: { key: 'user', ...RATE_LIMITS.cancelPerUser },
  ipRateLimit: RATE_LIMITS.perIp,
  handler: async ({ req, env, log, enforceUserRateLimit }) => {
    const supabase = createAdminClient(env);
    const user = await authenticate(supabase, req.headers.authorization);
    enforceUserRateLimit(user.id);

    const { orderId } = parseBody(cancelOrderSchema, req.body);
    const mp = createMercadoPagoClient({
      accessToken: env.MERCADOPAGO_ACCESS_TOKEN,
      siteUrl: env.SITE_URL,
    });

    const result = await cancelOrder({ supabase, mp, log }, { userId: user.id, orderId });
    log.info('order.cancelled_by_customer', { orderId, refunded: result.refunded });
    return { status: 200, body: result };
  },
});
