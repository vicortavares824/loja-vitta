import { createHash, timingSafeEqual } from 'node:crypto';
import { AppError } from '../_lib/errors.js';
import { route } from '../_lib/http.js';
import { expireStaleOrders } from '../_lib/orders/expire.js';
import { createMercadoPagoClient } from '../_lib/payments/mercadoPago.js';
import { createLabelDeps, syncTrackings } from '../_lib/shipping/labelService.js';
import { createAdminClient } from '../_lib/supabase.js';

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

    // Rastreio diário das etiquetas (só com o Melhor Envio configurado; falha não derruba o cron).
    let trackingsSynced = 0;
    if (env.MELHORENVIO_TOKEN && env.MELHORENVIO_SENDER) {
      try {
        trackingsSynced = await syncTrackings(createLabelDeps(env, supabase, log));
      } catch (err) {
        log.warn('cron.sync_trackings_failed', { error: err });
      }
    }

    return { status: 200, body: { expired, confirmed, trackingsSynced } };
  },
});
