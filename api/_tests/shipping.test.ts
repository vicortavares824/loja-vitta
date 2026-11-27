import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../_lib/errors.js';
import { calculatePricing, type CatalogProduct } from '../_lib/pricing/engine.js';
import { checkoutSchema, quoteSchema } from '../_lib/schemas.js';
import {
  createMelhorEnvioClient,
  parseQuotedService,
  toCents,
} from '../_lib/shipping/melhorEnvio.js';
import {
  buildQuoteProducts,
  createShippingQuoter,
  selectShippingOption,
} from '../_lib/shipping/shippingService.js';

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const catalog = new Map<string, CatalogProduct>([
  [
    PRODUCT_ID,
    { id: PRODUCT_ID, name: 'Camiseta', priceCents: 3_800, colors: ['Preto'], sizes: ['M'], image: '' },
  ],
]);
const items = [
  { productId: PRODUCT_ID, color: 'Preto', size: 'M', quantity: 2 },
  { productId: PRODUCT_ID, color: 'Preto', size: 'M', quantity: 1 },
];

const ME_RESPONSE = [
  {
    id: 2,
    name: 'SEDEX',
    price: '40.10',
    custom_price: '35.90',
    delivery_time: 3,
    custom_delivery_time: 4,
    company: { id: 1, name: 'Correios' },
  },
  {
    id: 1,
    name: 'PAC',
    price: '22.50',
    custom_price: '22.50',
    delivery_time: 8,
    custom_delivery_time: 8,
    company: { id: 1, name: 'Correios' },
  },
  { id: 3, name: '.Package', error: 'Transportadora não atende este trecho.' },
];

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}

describe('toCents', () => {
  it('converts string and number prices to integer cents', () => {
    expect(toCents('23.45')).toBe(2345);
    expect(toCents(10)).toBe(1000);
  });

  it('rejects empty, negative and non numeric values', () => {
    expect(toCents('')).toBeNull();
    expect(toCents(undefined)).toBeNull();
    expect(toCents('-1')).toBeNull();
    expect(toCents('abc')).toBeNull();
  });
});

describe('parseQuotedService', () => {
  it('prefers custom price and custom delivery time', () => {
    expect(parseQuotedService(ME_RESPONSE[0])).toEqual({
      serviceId: 2,
      name: 'SEDEX',
      company: 'Correios',
      priceCents: 3590,
      deliveryDays: 4,
    });
  });

  it('drops services that come back with an error', () => {
    expect(parseQuotedService(ME_RESPONSE[2])).toBeNull();
  });
});

describe('createMelhorEnvioClient', () => {
  it('sends the quote request and returns available services sorted by price', async () => {
    const fetchImpl = fakeFetch(200, ME_RESPONSE);
    const client = createMelhorEnvioClient({
      token: 'test-token',
      environment: 'sandbox',
      userAgent: 'Loja Teste (dev@example.test)',
      fetchImpl,
    });

    const result = await client.quote({
      fromCep: '01001000',
      toCep: '13150000',
      products: buildQuoteProducts(items, catalog),
      serviceIds: [1, 2],
    });

    expect(result.map((s) => s.serviceId)).toEqual([1, 2]);
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate');
    expect(init.headers.Authorization).toBe('Bearer test-token');
    expect(init.headers['User-Agent']).toBe('Loja Teste (dev@example.test)');
    const body = JSON.parse(init.body);
    expect(body.from.postal_code).toBe('01001000');
    expect(body.to.postal_code).toBe('13150000');
    expect(body.services).toBe('1,2');
    expect(body.products).toEqual([
      expect.objectContaining({ id: PRODUCT_ID, quantity: 3, insurance_value: 38 }),
    ]);
  });

  it('maps provider HTTP errors to SHIPPING_UNAVAILABLE', async () => {
    const client = createMelhorEnvioClient({
      token: 't',
      environment: 'production',
      userAgent: 'ua',
      fetchImpl: fakeFetch(401, { message: 'Unauthenticated.' }),
    });
    await expect(
      client.quote({ fromCep: '01001000', toCep: '13150000', products: [], serviceIds: [1] }),
    ).rejects.toMatchObject({ code: 'SHIPPING_UNAVAILABLE' });
  });

  it('maps network failures to SHIPPING_UNAVAILABLE', async () => {
    const client = createMelhorEnvioClient({
      token: 't',
      environment: 'sandbox',
      userAgent: 'ua',
      fetchImpl: vi.fn(async () => {
        throw new TypeError('fetch failed');
      }) as unknown as typeof fetch,
    });
    await expect(
      client.quote({ fromCep: '01001000', toCep: '13150000', products: [], serviceIds: [1] }),
    ).rejects.toMatchObject({ code: 'SHIPPING_UNAVAILABLE' });
  });
});

describe('createShippingQuoter', () => {
  const baseEnv = { MELHORENVIO_ENV: 'sandbox' as const };

  it('falls back to the fixed fee when Melhor Envio is not configured', async () => {
    const quote = createShippingQuoter(baseEnv);
    const options = await quote({ items, catalog, toCep: '13150000' });
    expect(options).toEqual([expect.objectContaining({ serviceId: 0, priceCents: 5_000 })]);
  });

  it('requires origin CEP and User-Agent when a token is set', () => {
    expect(() => createShippingQuoter({ ...baseEnv, MELHORENVIO_TOKEN: 'tok' })).toThrow(AppError);
  });

  it('quotes through the client with the configured origin', async () => {
    const client = { quote: vi.fn(async () => []) };
    const quote = createShippingQuoter(
      {
        ...baseEnv,
        MELHORENVIO_TOKEN: 'tok',
        MELHORENVIO_FROM_CEP: '01001000',
        MELHORENVIO_USER_AGENT: 'ua',
      },
      client,
    );
    await quote({ items, catalog, toCep: '13150000' });
    expect(client.quote).toHaveBeenCalledWith(
      expect.objectContaining({ fromCep: '01001000', toCep: '13150000', serviceIds: [1, 2] }),
    );
  });
});

describe('selectShippingOption', () => {
  const options = [
    { serviceId: 2, name: 'SEDEX', company: 'Correios', priceCents: 3590, deliveryDays: 4 },
    { serviceId: 1, name: 'PAC', company: 'Correios', priceCents: 2250, deliveryDays: 8 },
  ];

  it('picks the cheapest option when none is requested', () => {
    expect(selectShippingOption(options, undefined)?.serviceId).toBe(1);
  });

  it('returns null when there are no options', () => {
    expect(selectShippingOption([], undefined)).toBeNull();
  });

  it('rejects a service that is not in the current quote', () => {
    expect(() => selectShippingOption(options, 99)).toThrow(
      expect.objectContaining({ code: 'SHIPPING_OPTION_UNAVAILABLE' }),
    );
  });
});

describe('calculatePricing with quoted shipping', () => {
  it('adds the quoted shipping price to the total', () => {
    const pricing = calculatePricing({ items, catalog, hasPriorOrder: false, shippingBaseCents: 2250 });
    expect(pricing).toMatchObject({ subtotalCents: 11_400, shippingCents: 2250, totalCents: 13_650 });
  });

  it('makes shipping free above the threshold', () => {
    const many = [{ productId: PRODUCT_ID, color: 'Preto', size: 'M', quantity: 40 }];
    const pricing = calculatePricing({ items: many, catalog, hasPriorOrder: false, shippingBaseCents: 2250 });
    expect(pricing.shippingCents).toBe(0);
    expect(pricing.totalCents).toBe(pricing.subtotalCents);
  });
});

describe('request schemas', () => {
  const base = {
    items: [{ productId: PRODUCT_ID, color: 'Preto', size: 'M', quantity: 1 }],
    paymentMethod: 'pix',
    shippingAddress: 'Rua A, 1',
  };

  it('normalizes a formatted CEP on checkout', () => {
    const parsed = checkoutSchema.parse({ ...base, shippingCep: '13150-000', shippingServiceId: 1 });
    expect(parsed.shippingCep).toBe('13150000');
  });

  it('requires CEP and shipping service on checkout', () => {
    expect(checkoutSchema.safeParse(base).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, shippingCep: '1315', shippingServiceId: 1 }).success).toBe(
      false,
    );
  });

  it('keeps CEP optional on quote', () => {
    expect(quoteSchema.safeParse({ items: base.items }).success).toBe(true);
  });
});
