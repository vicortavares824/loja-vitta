import { AppError } from '../errors.js';

/**
 * Cliente do Melhor Envio por `fetch` (sem SDK), só para cotação.
 * POST /api/v2/me/shipment/calculate (docs.melhorenvio.com.br, "Cálculo de fretes por produtos").
 * A resposta é um array por serviço; preços vêm como string. Usamos `custom_price` e
 * `custom_delivery_time`, que refletem as regras configuradas na conta.
 * Serviço indisponível para o trecho volta com `error` e sem preço: é descartado.
 */

export const BASE_URLS = {
  sandbox: 'https://sandbox.melhorenvio.com.br',
  production: 'https://melhorenvio.com.br',
} as const;

const QUOTE_TIMEOUT_MS = 8_000;

export interface QuoteProduct {
  id: string;
  widthCm: number;
  heightCm: number;
  lengthCm: number;
  weightKg: number;
  /** Valor declarado por unidade, em centavos. */
  unitValueCents: number;
  quantity: number;
}

export interface QuotedService {
  serviceId: number;
  name: string;
  company: string;
  priceCents: number;
  deliveryDays: number | null;
}

export interface MelhorEnvioClient {
  quote(input: {
    fromCep: string;
    toCep: string;
    products: readonly QuoteProduct[];
    serviceIds: readonly number[];
  }): Promise<QuotedService[]>;
}

export interface MelhorEnvioDeps {
  token: string;
  environment: keyof typeof BASE_URLS;
  userAgent: string;
  fetchImpl?: typeof fetch;
}

function shippingError(internal: Record<string, unknown>): AppError {
  return new AppError('SHIPPING_UNAVAILABLE', { internal });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Converte "23.45" ou 23.45 em centavos; inválido vira null. */
export function toCents(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function toDays(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

/** Lê um item da resposta. Retorna null para serviço indisponível ou malformado. */
export function parseQuotedService(raw: unknown): QuotedService | null {
  if (!isRecord(raw) || raw.error !== undefined) return null;
  const serviceId = raw.id;
  if (typeof serviceId !== 'number' || !Number.isInteger(serviceId)) return null;
  const priceCents = toCents(raw.custom_price) ?? toCents(raw.price);
  if (priceCents === null) return null;
  const name = typeof raw.name === 'string' && raw.name ? raw.name : `Serviço ${serviceId}`;
  const company =
    isRecord(raw.company) && typeof raw.company.name === 'string' ? raw.company.name : '';
  return {
    serviceId,
    name,
    company,
    priceCents,
    deliveryDays: toDays(raw.custom_delivery_time) ?? toDays(raw.delivery_time),
  };
}

export function createMelhorEnvioClient(deps: MelhorEnvioDeps): MelhorEnvioClient {
  const doFetch = deps.fetchImpl ?? fetch;
  const url = `${BASE_URLS[deps.environment]}/api/v2/me/shipment/calculate`;

  return {
    async quote({ fromCep, toCep, products, serviceIds }) {
      const body = {
        from: { postal_code: fromCep },
        to: { postal_code: toCep },
        products: products.map((p) => ({
          id: p.id,
          width: p.widthCm,
          height: p.heightCm,
          length: p.lengthCm,
          weight: p.weightKg,
          insurance_value: p.unitValueCents / 100,
          quantity: p.quantity,
        })),
        options: { receipt: false, own_hand: false },
        services: serviceIds.join(','),
      };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), QUOTE_TIMEOUT_MS);
      let json: unknown;
      try {
        const response = await doFetch(url, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${deps.token}`,
            'User-Agent': deps.userAgent,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!response.ok) {
          // Corpo da resposta não é repassado nem registrado: só o status.
          throw shippingError({ operation: 'quote', httpStatus: response.status });
        }
        json = await response.json().catch(() => null);
      } catch (err) {
        if (err instanceof AppError) throw err;
        const aborted = err instanceof Error && err.name === 'AbortError';
        throw shippingError({ operation: 'quote', reason: aborted ? 'timeout' : 'network' });
      } finally {
        clearTimeout(timer);
      }

      if (!Array.isArray(json)) throw shippingError({ operation: 'quote', reason: 'invalid_json' });
      return json
        .map(parseQuotedService)
        .filter((s): s is QuotedService => s !== null)
        .sort((a, b) => a.priceCents - b.priceCents);
    },
  };
}
