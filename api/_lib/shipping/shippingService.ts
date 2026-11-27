import type { CheckoutItemInput, ShippingOption } from '../../../src/types/checkout.js';
import {
  DEFAULT_ITEM_PACKAGE,
  FALLBACK_SHIPPING_FEE_CENTS,
  FALLBACK_SHIPPING_SERVICE_ID,
  FALLBACK_SHIPPING_SERVICE_NAME,
  SHIPPING_SERVICE_IDS,
} from '../config/shipping.js';
import type { ServerEnv } from '../env.js';
import { AppError } from '../errors.js';
import type { CatalogProduct } from '../pricing/engine.js';
import { createMelhorEnvioClient, type MelhorEnvioClient, type QuoteProduct } from './melhorEnvio.js';

export interface ShippingQuoteInput {
  items: readonly CheckoutItemInput[];
  catalog: ReadonlyMap<string, CatalogProduct>;
  /** CEP de destino já normalizado (8 dígitos). */
  toCep: string;
}

export type ShippingQuoter = (input: ShippingQuoteInput) => Promise<ShippingOption[]>;

const FALLBACK_OPTION: ShippingOption = {
  serviceId: FALLBACK_SHIPPING_SERVICE_ID,
  name: FALLBACK_SHIPPING_SERVICE_NAME,
  company: '',
  priceCents: FALLBACK_SHIPPING_FEE_CENTS,
  deliveryDays: null,
};

/** Soma as unidades por produto (cores/tamanhos diferentes viram a mesma caixa) com o preço do catálogo. */
export function buildQuoteProducts(
  items: readonly CheckoutItemInput[],
  catalog: ReadonlyMap<string, CatalogProduct>,
): QuoteProduct[] {
  const quantities = new Map<string, number>();
  for (const item of items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }
  return [...quantities].map(([productId, quantity]) => ({
    id: productId,
    widthCm: DEFAULT_ITEM_PACKAGE.widthCm,
    heightCm: DEFAULT_ITEM_PACKAGE.heightCm,
    lengthCm: DEFAULT_ITEM_PACKAGE.lengthCm,
    weightKg: DEFAULT_ITEM_PACKAGE.weightKg,
    unitValueCents: catalog.get(productId)?.priceCents ?? 0,
    quantity,
  }));
}

/**
 * Cotador conforme o ambiente: Melhor Envio quando MELHORENVIO_TOKEN existe,
 * senão uma única opção de frete fixo (comportamento anterior da loja).
 */
export function createShippingQuoter(
  env: Pick<
    ServerEnv,
    'MELHORENVIO_TOKEN' | 'MELHORENVIO_ENV' | 'MELHORENVIO_FROM_CEP' | 'MELHORENVIO_USER_AGENT'
  >,
  client?: MelhorEnvioClient,
): ShippingQuoter {
  if (!env.MELHORENVIO_TOKEN) return async () => [FALLBACK_OPTION];

  const fromCep = env.MELHORENVIO_FROM_CEP;
  const userAgent = env.MELHORENVIO_USER_AGENT;
  if (!fromCep || !userAgent) {
    throw new AppError('SERVER_MISCONFIGURED', {
      internal: { missing: ['MELHORENVIO_FROM_CEP', 'MELHORENVIO_USER_AGENT'] },
    });
  }
  const me =
    client ??
    createMelhorEnvioClient({
      token: env.MELHORENVIO_TOKEN,
      environment: env.MELHORENVIO_ENV,
      userAgent,
    });

  return async ({ items, catalog, toCep }) =>
    me.quote({
      fromCep,
      toCep,
      products: buildQuoteProducts(items, catalog),
      serviceIds: SHIPPING_SERVICE_IDS,
    });
}

/**
 * Escolhe a opção de frete: a pedida pelo cliente (que precisa existir na cotação atual)
 * ou, sem pedido, a mais barata. Sem opções retorna null.
 */
export function selectShippingOption(
  options: readonly ShippingOption[],
  serviceId: number | undefined,
): ShippingOption | null {
  if (serviceId === undefined) {
    return options.reduce<ShippingOption | null>(
      (best, o) => (best === null || o.priceCents < best.priceCents ? o : best),
      null,
    );
  }
  const found = options.find((o) => o.serviceId === serviceId);
  if (!found) {
    throw new AppError('SHIPPING_OPTION_UNAVAILABLE', { details: { serviceId } });
  }
  return found;
}
