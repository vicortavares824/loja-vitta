import type { CardPaymentInput, CardPaymentData, PixPaymentData } from '../../../src/types/checkout';
import { AppError } from '../errors';

/**
 * Cliente Mercado Pago por `fetch` (sem SDK).
 *
 * Formato de `date_of_expiration` (referência oficial da API de pagamentos do Mercado
 * Pago, `yyyy-MM-dd'T'HH:mm:ssz`, exemplo `2022-11-17T09:37:52.000-04:00`): ISO 8601 com
 * milissegundos e deslocamento de fuso explícito. Aqui usamos `-03:00` (Brasília, sem
 * horário de verão desde 2019). Confirmado por busca na web em páginas de referência da
 * API; a página de guia do Pix é renderizada por JS e não pôde ser lida pelo fetch.
 * Manifesto de assinatura de webhook: ver `webhookSignature.ts`.
 */

export type MpStatus =
  | 'pending'
  | 'approved'
  | 'authorized'
  | 'in_process'
  | 'in_mediation'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back';

const MP_STATUSES: ReadonlySet<string> = new Set<MpStatus>([
  'pending',
  'approved',
  'authorized',
  'in_process',
  'in_mediation',
  'rejected',
  'cancelled',
  'refunded',
  'charged_back',
]);

const API_BASE = 'https://api.mercadopago.com';
const DEFAULT_TIMEOUT_MS = 10_000;
const GET_PAYMENT_TIMEOUT_MS = 4_000;
const BRAZIL_OFFSET_MS = -3 * 60 * 60 * 1000;

export interface PixPaymentInput {
  orderId: string;
  totalCents: number;
  payerEmail: string;
  description: string;
  expiresAt: Date;
  idempotencyKey: string;
}

export interface CardPaymentRequestInput {
  orderId: string;
  totalCents: number;
  payerEmail: string;
  description: string;
  card: CardPaymentInput;
  idempotencyKey: string;
}

export interface MercadoPagoClient {
  createPixPayment(i: PixPaymentInput): Promise<PixPaymentData & { paymentId: string }>;
  createCardPayment(i: CardPaymentRequestInput): Promise<{
    paymentId: string;
    status: CardPaymentData['status'];
    last4?: string;
  }>;
  getPayment(
    paymentId: string,
  ): Promise<{ id: string; status: MpStatus; paidCents: number; externalReference: string }>;
  cancelPayment(paymentId: string): Promise<void>;
}

export interface MercadoPagoDeps {
  accessToken: string;
  siteUrl: string;
  fetchImpl?: typeof fetch;
}

/** Formata uma data como `yyyy-MM-ddTHH:mm:ss.SSS-03:00`. */
export function formatMpExpiration(date: Date): string {
  const local = new Date(date.getTime() + BRAZIL_OFFSET_MS);
  return `${local.toISOString().slice(0, 23)}-03:00`;
}

function providerError(internal: Record<string, unknown>): AppError {
  return new AppError('PAYMENT_PROVIDER_ERROR', { internal });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function str(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

export function createMercadoPagoClient(deps: MercadoPagoDeps): MercadoPagoClient {
  const doFetch = deps.fetchImpl ?? fetch;
  const notificationUrl = `${deps.siteUrl.replace(/\/+$/, '')}/api/webhooks/mercadopago`;

  async function request(
    operation: string,
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    options: { body?: Record<string, unknown>; idempotencyKey?: string; timeoutMs: number },
  ): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${deps.accessToken}`,
      Accept: 'application/json',
    };
    if (options.body) headers['Content-Type'] = 'application/json';
    if (options.idempotencyKey) headers['X-Idempotency-Key'] = options.idempotencyKey;

    try {
      const response = await doFetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      if (!response.ok) {
        // Corpo da resposta não é repassado nem registrado: só o status.
        throw providerError({ operation, httpStatus: response.status });
      }
      const json: unknown = await response.json().catch(() => null);
      if (!isRecord(json)) throw providerError({ operation, reason: 'invalid_json' });
      return json;
    } catch (err) {
      if (err instanceof AppError) throw err;
      const aborted = err instanceof Error && err.name === 'AbortError';
      throw providerError({
        operation,
        reason: aborted ? 'timeout' : 'network',
        errorName: err instanceof Error ? err.name : 'unknown',
      });
    } finally {
      clearTimeout(timer);
    }
  }

  function amount(totalCents: number): number {
    return Math.round(totalCents) / 100;
  }

  return {
    async createPixPayment(i) {
      // Corpo montado campo a campo (lista branca).
      const body: Record<string, unknown> = {
        transaction_amount: amount(i.totalCents),
        description: i.description,
        payment_method_id: 'pix',
        payer: { email: i.payerEmail },
        external_reference: i.orderId,
        notification_url: notificationUrl,
        date_of_expiration: formatMpExpiration(i.expiresAt),
      };
      const data = await request('createPixPayment', 'POST', '/v1/payments', {
        body,
        idempotencyKey: i.idempotencyKey,
        timeoutMs: DEFAULT_TIMEOUT_MS,
      });
      const paymentId = str(data.id);
      const poi = isRecord(data.point_of_interaction) ? data.point_of_interaction : undefined;
      const tx = poi && isRecord(poi.transaction_data) ? poi.transaction_data : undefined;
      const qrCode = str(tx?.qr_code);
      const qrCodeBase64 = str(tx?.qr_code_base64);
      if (!paymentId || !qrCode || !qrCodeBase64) {
        throw providerError({ operation: 'createPixPayment', reason: 'missing_fields' });
      }
      const returned = str(data.date_of_expiration);
      const parsed = returned ? new Date(returned) : null;
      const expiresAt = parsed && !Number.isNaN(parsed.getTime()) ? parsed : i.expiresAt;
      return {
        kind: 'pix',
        paymentId,
        qrCode,
        qrCodeBase64,
        expiresAt: expiresAt.toISOString(),
      };
    },

    async createCardPayment(i) {
      const payer = { email: i.payerEmail };
      const body: Record<string, unknown> = {
        transaction_amount: amount(i.totalCents),
        description: i.description,
        token: i.card.token,
        installments: i.card.installments,
        payment_method_id: i.card.paymentMethodId,
        payer,
        external_reference: i.orderId,
        notification_url: notificationUrl,
      };
      if (i.card.issuerId) body.issuer_id = i.card.issuerId;

      const data = await request('createCardPayment', 'POST', '/v1/payments', {
        body,
        idempotencyKey: i.idempotencyKey,
        timeoutMs: DEFAULT_TIMEOUT_MS,
      });
      const paymentId = str(data.id);
      const status = str(data.status);
      if (!paymentId || !status) {
        throw providerError({ operation: 'createCardPayment', reason: 'missing_fields' });
      }
      if (status === 'rejected' || status === 'cancelled') {
        throw new AppError('PAYMENT_REJECTED', {
          internal: { paymentId, status, statusDetail: str(data.status_detail) },
        });
      }
      const cardInfo = isRecord(data.card) ? data.card : undefined;
      const last4 = str(cardInfo?.last_four_digits);
      const mapped: CardPaymentData['status'] = status === 'approved' ? 'approved' : 'in_process';
      return last4 ? { paymentId, status: mapped, last4 } : { paymentId, status: mapped };
    },

    async getPayment(paymentId) {
      const data = await request(
        'getPayment',
        'GET',
        `/v1/payments/${encodeURIComponent(paymentId)}`,
        { timeoutMs: GET_PAYMENT_TIMEOUT_MS },
      );
      const id = str(data.id);
      const rawStatus = str(data.status);
      const reference = str(data.external_reference);
      const rawAmount = data.transaction_amount;
      if (
        !id ||
        !rawStatus ||
        !reference ||
        typeof rawAmount !== 'number' ||
        !Number.isFinite(rawAmount)
      ) {
        throw providerError({ operation: 'getPayment', reason: 'missing_fields' });
      }
      // Status desconhecido nunca confirma nem libera: trata como não final.
      const status: MpStatus = MP_STATUSES.has(rawStatus) ? (rawStatus as MpStatus) : 'pending';
      return {
        id,
        status,
        paidCents: Math.round(rawAmount * 100),
        externalReference: reference,
      };
    },

    async cancelPayment(paymentId) {
      await request('cancelPayment', 'PUT', `/v1/payments/${encodeURIComponent(paymentId)}`, {
        body: { status: 'cancelled' },
        idempotencyKey: `cancel-${paymentId}`,
        timeoutMs: DEFAULT_TIMEOUT_MS,
      });
    },
  };
}
