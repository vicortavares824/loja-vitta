import type { QuoteResponse, ShippingOption } from '../src/types/checkout.js';
import { authenticate } from './_lib/auth.js';
import { route } from './_lib/http.js';
import { hasPriorOrder, loadCatalog } from './_lib/orders/orderService.js';
import { calculatePricing } from './_lib/pricing/engine.js';
import { RATE_LIMITS } from './_lib/rateLimit.js';
import { parseBody, quoteSchema } from './_lib/schemas.js';
import { createShippingQuoter, selectShippingOption } from './_lib/shipping/shippingService.js';
import { createAdminClient } from './_lib/supabase.js';

/**
 * POST /api/quote: calcula o preço sem criar pedido, reservar estoque ou chamar o provedor de pagamento.
 * Com `shippingCep`, cota o frete e devolve as opções; o total usa a opção pedida ou a mais barata.
 */
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

    const quoted: ShippingOption[] = body.shippingCep
      ? await createShippingQuoter(env)({ items: body.items, catalog, toCep: body.shippingCep })
      : [];
    const selected = selectShippingOption(quoted, body.shippingServiceId);

    const pricing = calculatePricing({
      items: body.items,
      catalog,
      couponCode: body.couponCode,
      hasPriorOrder: prior,
      shippingBaseCents: selected?.priceCents ?? 0,
    });

    // Frete grátis (cupom ou valor mínimo) vale para qualquer opção.
    const isFree = selected !== null && selected.priceCents > 0 && pricing.shippingCents === 0;
    const shippingOptions = isFree ? quoted.map((o) => ({ ...o, priceCents: 0 })) : quoted;

    const response: QuoteResponse = {
      pricing,
      shippingOptions,
      shippingServiceId: selected?.serviceId ?? null,
    };
    return { status: 200, body: response };
  },
});
