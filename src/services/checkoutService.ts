/**
 * Checkout Service
 * Cliente das rotas /api/quote e /api/checkout, mais leitura do status do próprio pedido.
 * Layer: services — depends only on types and config.
 */

import type {
  CheckoutErrorCode,
  CheckoutRequest,
  CheckoutResponse,
  QuoteRequest,
  QuoteResponse
} from '../types/checkout';
import type { Order } from '../types/ecommerce';
import { supabase } from '../config/supabase';

type ServiceErrorCode = CheckoutErrorCode | 'NETWORK_ERROR';

export const CHECKOUT_ERROR_MESSAGES_PT: Record<ServiceErrorCode, string> = {
  VALIDATION_ERROR: 'Os dados informados são inválidos. Revise e tente novamente.',
  UNAUTHENTICATED: 'Faça login para continuar com a compra.',
  METHOD_NOT_ALLOWED: 'Operação não permitida.',
  PRODUCT_NOT_FOUND: 'Algum produto da sacola não está mais disponível.',
  INVALID_VARIANT: 'Alguma cor ou tamanho da sacola não está mais disponível.',
  INVALID_COUPON: 'Cupom inválido ou indisponível.',
  COUPON_NOT_ELIGIBLE: 'Este cupom não pode ser usado neste pedido.',
  IDEMPOTENCY_KEY_REUSED: 'Esta solicitação já foi usada com outros dados. Revise sua sacola e tente novamente.',
  INSUFFICIENT_STOCK: 'Alguma peça da sacola não tem estoque suficiente. Ajuste as quantidades.',
  PRICE_CHANGED: 'Os preços foram atualizados. Revise sua sacola.',
  PAYMENT_REJECTED: 'Pagamento recusado. Tente outro cartão ou use Pix.',
  PAYMENT_PROVIDER_ERROR: 'Não foi possível processar o pagamento agora. Tente novamente em instantes.',
  SHIPPING_UNAVAILABLE: 'Não foi possível calcular o frete agora. Tente novamente em instantes.',
  SHIPPING_OPTION_UNAVAILABLE: 'A opção de frete escolhida não está disponível para este CEP. Escolha outra.',
  RATE_LIMITED: 'Muitas tentativas. Aguarde um momento e tente novamente.',
  TOO_MANY_PENDING_ORDERS: 'Você já tem pedidos aguardando pagamento. Conclua ou aguarde a expiração deles.',
  SERVER_MISCONFIGURED: 'Serviço temporariamente indisponível. Tente novamente mais tarde.',
  INTERNAL_ERROR: 'Ocorreu um erro inesperado. Tente novamente.',
  NETWORK_ERROR: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
};

export class CheckoutError extends Error {
  code: ServiceErrorCode;
  status: number;
  details?: unknown;

  constructor(code: ServiceErrorCode, status: number, details?: unknown) {
    super(CHECKOUT_ERROR_MESSAGES_PT[code] ?? CHECKOUT_ERROR_MESSAGES_PT.INTERNAL_ERROR);
    this.name = 'CheckoutError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const isKnownCode = (code: unknown): code is CheckoutErrorCode =>
  typeof code === 'string' &&
  code !== 'NETWORK_ERROR' &&
  Object.prototype.hasOwnProperty.call(CHECKOUT_ERROR_MESSAGES_PT, code);

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new CheckoutError('UNAUTHENTICATED', 401);
  return token;
}

async function post<TResponse>(
  url: string,
  body: unknown,
  extraHeaders: Record<string, string> = {}
): Promise<TResponse> {
  const token = await getAccessToken();

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...extraHeaders
      },
      body: JSON.stringify(body)
    });
  } catch {
    throw new CheckoutError('NETWORK_ERROR', 0);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new CheckoutError('INTERNAL_ERROR', response.status);
  }

  if (!response.ok) {
    const err = (payload as { error?: { code?: unknown; details?: unknown } } | null)?.error;
    const code = isKnownCode(err?.code) ? err.code : 'INTERNAL_ERROR';
    throw new CheckoutError(code, response.status, err?.details);
  }

  return payload as TResponse;
}

export const checkoutService = {
  async quote(req: QuoteRequest): Promise<QuoteResponse> {
    return post<QuoteResponse>('/api/quote', req);
  },

  async createCheckout(req: CheckoutRequest, idempotencyKey: string): Promise<CheckoutResponse> {
    return post<CheckoutResponse>('/api/checkout', req, { 'Idempotency-Key': idempotencyKey });
  },

  /** Única leitura direta ao banco: o cliente lê o próprio pedido (RLS). */
  async getOrderStatus(orderId: string): Promise<Order['status']> {
    const { data, error } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();
    if (error || !data) throw new CheckoutError('INTERNAL_ERROR', 500);
    const status = (data as { status: Order['status'] }).status;
    return status === 'pending' ? 'pending_payment' : status;
  }
};
