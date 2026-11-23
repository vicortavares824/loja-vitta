import { createHash, timingSafeEqual } from 'node:crypto';
import { AppError } from '../_lib/errors';
import { route } from '../_lib/http';
import { expireStaleOrders } from '../_lib/orders/expire';
import { createMercadoPagoClient } from '../_lib/payments/mercadoPago';
import { createAdminClient } from '../_lib/supabase';

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/** Comparação em tempo constante; o hash iguala os comprimentos antes do timingSafeEqual. */
function secretMatches(provided: string, expected: string): boolean {
  return timingSafeEqual(sha256(provided), sha256(expected));
}

export default route({
  methods: ['GET'],
  cors: false,
  requireCron: true,
  handler: async ({ req, env, log }) => {
    const header = req.headers.authorization;
    const match = typeof header === 'string' ? /^Bearer (.+)$/.exec(header) : null;
    const secret = env.CRON_SECRET;
    if (!match || !secret || !secretMatches(match[1], secret)) {
      throw new AppError('UNAUTHENTICATED');
    }

    const supabase = createAdminClient(env);
    const mp = createMercadoPagoClient({
      accessToken: env.MERCADOPAGO_ACCESS_TOKEN,
      siteUrl: env.SITE_URL,
    });
    const { expired, confirmed } = await expireStaleOrders({ supabase, mp, log });
    log.info('cron.expire_orders', { expired, confirmed });

    return { status: 200, body: { expired, confirmed } };
  },
});
