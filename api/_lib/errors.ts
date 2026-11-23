import type { ApiErrorBody, CheckoutErrorCode } from '../../src/types/checkout.js';

interface ErrorCatalogEntry {
  status: number;
  message: string;
}

/** Status HTTP e mensagem fixa por código. A mensagem nunca inclui detalhes internos. */
export const ERROR_CATALOG: Readonly<Record<CheckoutErrorCode, ErrorCatalogEntry>> = {
  VALIDATION_ERROR: { status: 400, message: 'Dados da requisição inválidos.' },
  UNAUTHENTICATED: { status: 401, message: 'Autenticação necessária ou inválida.' },
  METHOD_NOT_ALLOWED: { status: 405, message: 'Método não permitido.' },
  PAYMENT_REJECTED: { status: 402, message: 'Pagamento recusado.' },
  PRODUCT_NOT_FOUND: { status: 422, message: 'Produto não encontrado.' },
  INVALID_VARIANT: { status: 422, message: 'Cor ou tamanho inválido para o produto.' },
  INVALID_COUPON: { status: 422, message: 'Cupom inválido.' },
  COUPON_NOT_ELIGIBLE: { status: 422, message: 'Cupom não aplicável a este pedido.' },
  IDEMPOTENCY_KEY_REUSED: {
    status: 422,
    message: 'A chave de idempotência já foi usada com outro pedido.',
  },
  INSUFFICIENT_STOCK: { status: 409, message: 'Estoque insuficiente.' },
  PRICE_CHANGED: { status: 409, message: 'O preço de um item mudou. Revise o carrinho.' },
  RATE_LIMITED: { status: 429, message: 'Muitas requisições. Tente novamente em instantes.' },
  TOO_MANY_PENDING_ORDERS: {
    status: 429,
    message: 'Há pedidos pendentes demais. Conclua ou aguarde a expiração.',
  },
  PAYMENT_PROVIDER_ERROR: {
    status: 502,
    message: 'O provedor de pagamento está indisponível. Tente novamente.',
  },
  SERVER_MISCONFIGURED: { status: 500, message: 'Erro interno do servidor.' },
  INTERNAL_ERROR: { status: 500, message: 'Erro interno do servidor.' },
};

export class AppError extends Error {
  readonly code: CheckoutErrorCode;
  readonly status: number;
  /** Enviado ao cliente em `error.details`. */
  readonly details?: unknown;
  /** Somente para log do servidor. Nunca vai na resposta. */
  readonly internal?: unknown;

  constructor(code: CheckoutErrorCode, options: { details?: unknown; internal?: unknown } = {}) {
    super(ERROR_CATALOG[code].message);
    this.name = 'AppError';
    this.code = code;
    this.status = ERROR_CATALOG[code].status;
    this.details = options.details;
    this.internal = options.internal;
  }

  toBody(): ApiErrorBody {
    const error: ApiErrorBody['error'] = { code: this.code, message: this.message };
    if (this.details !== undefined) error.details = this.details;
    return { error };
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

/** Converte qualquer erro em resposta segura. Erros desconhecidos viram INTERNAL_ERROR genérico. */
export function toErrorResponse(err: unknown): { status: number; body: ApiErrorBody } {
  const appError = isAppError(err) ? err : new AppError('INTERNAL_ERROR');
  return { status: appError.status, body: appError.toBody() };
}
