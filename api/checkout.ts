import { waitUntil } from '@vercel/functions';
import { authenticate } from './_lib/auth.js';
import { route } from './_lib/http.js';
import { createCheckout } from './_lib/orders/orderService.js';
import { expireStaleOrders } from './_lib/orders/expire.js';
import { createMercadoPagoClient } from './_lib/payments/mercadoPago.js';
import { checkoutSchema, parseBody, parseIdempotencyKey } from './_lib/schemas.js';
import { createShippingQuoter } from './_lib/shipping/shippingService.js';
import { createAdminClient } from './_lib/supabase.js';

/** Limite de pedidos vencidos liberados por requisição (expiração preguiçosa). */
const LAZY_EXPIRE_LIMIT = 5;

/**
 * POST /api/checkout
 * Ordem: route() (método/CORS, limite por IP, ambiente) -> autenticação -> limite por usuário
 * -> validação (corpo e Idempotency-Key) -> createCheckout() -> 201 (200 em repetição).
 */
export default route({
  methods: ['POST'],
  rateLimit: { key: 'user', max: 10, windowMs: 60_000 },
  ipRateLimit: { max: 60, windowMs: 60_000 },
  handler: async ({ req, env, log, enforceUserRateLimit }) => {
    const supabase = createAdminClient(env);
    const user = await authenticate(supabase, req.headers.authorization);
    enforceUserRateLimit(user.id);

    const idempotencyKey = parseIdempotencyKey(req.headers['idempotency-key']);
    const request = parseBody(checkoutSchema, req.body);

    const mp = createMercadoPagoClient({
      accessToken: env.MERCADOPAGO_ACCESS_TOKEN,
      siteUrl: env.SITE_URL,
    });

    // Expiração preguiçosa fora do caminho crítico: a resposta não espera por ela.
    waitUntil(
      expireStaleOrders({ supabase, mp, log, limit: LAZY_EXPIRE_LIMIT }).catch((err: unknown) => {
        log.warn('checkout.lazy_expire_failed', { error: err });
      }),
    );

    const result = await createCheckout(
      {
        supabase,
        mp,
        log,
        quoteShipping: createShippingQuoter(env),
        pixExpirationMinutes: env.PIX_EXPIRATION_MINUTES,
      },
      { user, idempotencyKey, request },
    );

    return { status: result.status, body: result.body };
  },
});
