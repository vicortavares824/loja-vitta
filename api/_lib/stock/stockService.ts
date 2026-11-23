import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../errors.js';

/** Item enviado à RPC. `color` e `size` são obrigatórios (order_items.selectedColor/selectedSize são NOT NULL). */
export interface ReserveItem {
  product_id: string;
  quantity: number;
  color: string;
  size: string;
}

export interface ReserveOrderInput {
  userId: string;
  idempotencyKey: string;
  requestHash: string;
  customerName: string;
  customerEmail: string;
  paymentMethod: string;
  shippingAddress: string;
  coupon: string | null;
  /** Valores em reais (DECIMAL). */
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  expiresAt: Date;
  items: ReserveItem[];
}

export interface ReserveOrderResult {
  orderId: string;
  /** true quando a mesma Idempotency-Key e o mesmo hash já haviam criado o pedido. */
  replayed: boolean;
}

export interface StockShortage {
  productId: string;
  requested: number;
  available: number;
}

interface RpcError {
  message?: string;
  details?: string | null;
}

/** Tenta ler o JSON de DETAIL da exceção INSUFFICIENT_STOCK. Falha de parse resulta em lista vazia. */
function parseShortages(details: string | null | undefined): StockShortage[] {
  if (!details) return [];
  try {
    const parsed: unknown = JSON.parse(details);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is StockShortage =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as StockShortage).productId === 'string' &&
        typeof (entry as StockShortage).requested === 'number' &&
        typeof (entry as StockShortage).available === 'number',
    );
  } catch {
    return [];
  }
}

const IDEMPOTENT_RACE = 'IDEMPOTENT_RACE';
const MAX_RACE_RETRIES = 2;

/** Converte a exceção do Postgres (pelo `message`) em AppError. */
function mapReserveError(error: RpcError): AppError {
  const message = error.message ?? '';
  if (message.includes('INSUFFICIENT_STOCK')) {
    return new AppError('INSUFFICIENT_STOCK', {
      details: { products: parseShortages(error.details) },
      internal: error,
    });
  }
  if (message.includes('PRICE_CHANGED')) return new AppError('PRICE_CHANGED', { internal: error });
  if (message.includes('IDEMPOTENCY_KEY_REUSED')) {
    return new AppError('IDEMPOTENCY_KEY_REUSED', { internal: error });
  }
  if (message.includes('TOO_MANY_PENDING_ORDERS')) {
    return new AppError('TOO_MANY_PENDING_ORDERS', { internal: error });
  }
  if (message.includes('PRODUCT_NOT_FOUND')) {
    return new AppError('PRODUCT_NOT_FOUND', { internal: error });
  }
  if (message.includes('INVALID_ITEMS')) return new AppError('VALIDATION_ERROR', { internal: error });
  return new AppError('INTERNAL_ERROR', { internal: error });
}

/**
 * Reserva estoque e cria o pedido `pending_payment` numa transação (RPC `create_order_reserving_stock`).
 *
 * `IDEMPOTENT_RACE` indica que outra requisição com a mesma chave confirmou o pedido primeiro.
 * Como a transação desta chamada foi desfeita, repetir a RPC cai no caminho de repetição
 * (`replayed: true`) com o pedido existente. Se persistir, vira INTERNAL_ERROR.
 */
export async function reserveAndCreateOrder(
  client: SupabaseClient,
  input: ReserveOrderInput,
): Promise<ReserveOrderResult> {
  const params = {
    p_user_id: input.userId,
    p_idempotency_key: input.idempotencyKey,
    p_request_hash: input.requestHash,
    p_customer_name: input.customerName,
    p_customer_email: input.customerEmail,
    p_payment_method: input.paymentMethod,
    p_shipping_address: input.shippingAddress,
    p_coupon: input.coupon,
    p_subtotal: input.subtotal,
    p_discount: input.discount,
    p_shipping: input.shipping,
    p_total: input.total,
    p_expires_at: input.expiresAt.toISOString(),
    p_items: input.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      color: item.color,
      size: item.size,
    })),
  };

  let lastError: RpcError | null = null;
  for (let attempt = 0; attempt <= MAX_RACE_RETRIES; attempt += 1) {
    const { data, error } = await client.rpc('create_order_reserving_stock', params);
    if (!error) {
      const row = data as { order_id?: unknown; replayed?: unknown } | null;
      if (!row || typeof row.order_id !== 'string') {
        throw new AppError('INTERNAL_ERROR', { internal: { rpc: 'create_order_reserving_stock', data } });
      }
      return { orderId: row.order_id, replayed: row.replayed === true };
    }
    lastError = error;
    if (!(error.message ?? '').includes(IDEMPOTENT_RACE)) throw mapReserveError(error);
  }
  throw new AppError('INTERNAL_ERROR', { internal: lastError });
}

/**
 * Devolve o estoque e cancela o pedido (RPC `release_order_stock`).
 * Retorna true se cancelou; false se o pedido não estava `pending_payment` (idempotente).
 */
export async function releaseOrderStock(
  client: SupabaseClient,
  orderId: string,
  reason: string,
): Promise<boolean> {
  const { data, error } = await client.rpc('release_order_stock', {
    p_order_id: orderId,
    p_reason: reason,
  });
  if (error) throw new AppError('INTERNAL_ERROR', { internal: error });
  return data === true;
}
