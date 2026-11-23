import type { QuoteResponse } from '../src/types/checkout';
import { authenticate } from './_lib/auth';
import { route } from './_lib/http';
import { hasPriorOrder, loadCatalog } from './_lib/orders/orderService';
import { calculatePricing } from './_lib/pricing/engine';
import { RATE_LIMITS } from './_lib/rateLimit';
import { parseBody, quoteSchema } from './_lib/schemas';
import { createAdminClient } from './_lib/supabase';

/** POST /api/quote: calcula o preço sem criar pedido, reservar estoque ou chamar o provedor de pagamento. */
export default route({
  methods: ['POST'],
  rateLimit: { key: 'user', ...RATE_LIMITS.quotePerUser },
  ipRateLimit: RATE_LIMITS.perIp,
  handler: async ({ req, env, enforceUserRateLimit }) => {
    const supabase = createAdminClient(env);
    const user = await authenticate(supabase, req.headers.authorization);
    enforceUserRateLimit(user.id);

    const body = parseBody(quoteSchema, req.body);

    const catalog = await loadCatalog(
      supabase,
      body.items.map((item) => item.productId),
    );
    const prior = body.couponCode ? await hasPriorOrder(supabase, user.id) : false;

    const pricing = calculatePricing({
      items: body.items,
      catalog,
      couponCode: body.couponCode,
      hasPriorOrder: prior,
    });

    const response: QuoteResponse = { pricing };
    return { status: 200, body: response };
  },
});
