import { AppError } from '../errors.js';
import { BASE_URLS } from './melhorEnvio.js';

/**
 * Cliente de etiquetas do Melhor Envio (fetch, sem SDK).
 * Fluxo: POST /me/cart -> /me/shipment/checkout (paga com o saldo) -> /me/shipment/generate
 *        -> /me/shipment/print (URL do PDF). Rastreio: /me/shipment/tracking.
 * Escopos do token: cart-write, shipping-checkout, shipping-generate, shipping-print, shipping-tracking.
 * O código dos Correios só aparece depois da postagem; antes disso há o `melhorenvio_tracking`.
 */

const LABEL_TIMEOUT_MS = 15_000;

export interface MeParty {
  name: string;
  phone?: string;
  email?: string;
  document?: string;
  company_document?: string;
  address: string;
  complement?: string;
  number: string;
  district: string;
  city: string;
  state_abbr: string;
  country_id: 'BR';
  postal_code: string;
}

export interface MeCartInput {
  service: number;
  from: MeParty;
  to: MeParty;
  products: Array<{ name: string; quantity: string; unitary_value: string }>;
  volumes: Array<{ height: number; width: number; length: number; weight: number }>;
  options: {
    insurance_value: number;
    receipt: boolean;
    own_hand: boolean;
    reverse: boolean;
    non_commercial: boolean;
    platform: string;
  };
}

export interface MeShipmentStatus {
  id: string;
  status: string;
  /** Código da transportadora (Correios), disponível após a postagem. */
  tracking: string | null;
  /** Código do Melhor Envio (melhorrastreio), disponível antes. */
  melhorenvioTracking: string | null;
  paidAt: string | null;
  generatedAt: string | null;
  postedAt: string | null;
  deliveredAt: string | null;
  canceledAt: string | null;
}

export interface MelhorEnvioLabelClient {
  addToCart(input: MeCartInput): Promise<string>;
  checkout(shipmentId: string): Promise<void>;
  generate(shipmentId: string): Promise<void>;
  print(shipmentId: string): Promise<string>;
  tracking(shipmentId: string): Promise<MeShipmentStatus>;
}

export interface MelhorEnvioLabelDeps {
  token: string;
  environment: keyof typeof BASE_URLS;
  userAgent: string;
  fetchImpl?: typeof fetch;
}

function labelError(internal: Record<string, unknown>): AppError {
  return new AppError('SHIPPING_LABEL_ERROR', { internal });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Lê o status de um envio na resposta do /shipment/tracking (indexada pelo id). */
export function parseShipmentStatus(json: unknown, shipmentId: string): MeShipmentStatus {
  const entry = isRecord(json) ? json[shipmentId] : undefined;
  if (!isRecord(entry)) throw labelError({ operation: 'tracking', reason: 'missing_entry' });
  return {
    id: shipmentId,
    status: str(entry.status) ?? 'unknown',
    tracking: str(entry.tracking),
    melhorenvioTracking: str(entry.melhorenvio_tracking),
    paidAt: str(entry.paid_at),
    generatedAt: str(entry.generated_at),
    postedAt: str(entry.posted_at),
    deliveredAt: str(entry.delivered_at),
    canceledAt: str(entry.canceled_at),
  };
}

export function createMelhorEnvioLabelClient(deps: MelhorEnvioLabelDeps): MelhorEnvioLabelClient {
  const doFetch = deps.fetchImpl ?? fetch;
  const base = `${BASE_URLS[deps.environment]}/api/v2/me`;

  async function post(operation: string, path: string, body: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LABEL_TIMEOUT_MS);
    try {
      const response = await doFetch(`${base}${path}`, {
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
      const json: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        // Só a mensagem de validação vai para o log interno (nunca o token).
        const message = isRecord(json) ? (str(json.message) ?? str(json.error)) : null;
        throw labelError({ operation, httpStatus: response.status, message });
      }
      return json;
    } catch (err) {
      if (err instanceof AppError) throw err;
      const aborted = err instanceof Error && err.name === 'AbortError';
      throw labelError({ operation, reason: aborted ? 'timeout' : 'network' });
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async addToCart(input) {
      const json = await post('addToCart', '/cart', input);
      const id = isRecord(json) ? str(json.id) : null;
      if (!id) throw labelError({ operation: 'addToCart', reason: 'missing_id' });
      return id;
    },

    async checkout(shipmentId) {
      await post('checkout', '/shipment/checkout', { orders: [shipmentId] });
    },

    async generate(shipmentId) {
      const json = await post('generate', '/shipment/generate', { orders: [shipmentId] });
      const entry = isRecord(json) ? json[shipmentId] : undefined;
      if (isRecord(entry) && entry.status === false) {
        throw labelError({ operation: 'generate', message: str(entry.message) });
      }
    },

    async print(shipmentId) {
      const json = await post('print', '/shipment/print', { mode: 'public', orders: [shipmentId] });
      const url = isRecord(json) ? str(json.url) : null;
      if (!url) throw labelError({ operation: 'print', reason: 'missing_url' });
      return url;
    },

    async tracking(shipmentId) {
      const json = await post('tracking', '/shipment/tracking', { orders: [shipmentId] });
      return parseShipmentStatus(json, shipmentId);
    },
  };
}
