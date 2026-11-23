export type PaymentMethod = 'pix' | 'card';

export interface CheckoutItemInput {
  productId: string; // UUID de products.id
  color: string; // nome da cor, deve existir em products.colors
  size: string; // deve existir em products.sizes
  quantity: number; // inteiro 1..99
}

export interface CardPaymentInput {
  token: string; // token gerado pelo SDK do Mercado Pago no navegador
  paymentMethodId: string; // ex.: 'visa'
  installments: number; // 1..12
  issuerId?: string;
}

export interface CheckoutRequest {
  items: CheckoutItemInput[]; // 1..50 itens
  couponCode?: string; // até 32 caracteres
  paymentMethod: PaymentMethod;
  shippingAddress: string; // 1..300 caracteres após trim
  card?: CardPaymentInput; // obrigatório quando paymentMethod === 'card'
}

export interface PricingBreakdown {
  // valores em centavos inteiros
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  couponCode: string | null; // código normalizado, ou null
}

export interface PixPaymentData {
  kind: 'pix';
  qrCode: string; // copia-e-cola
  qrCodeBase64: string; // imagem PNG em base64
  expiresAt: string; // ISO 8601
}

export interface CardPaymentData {
  kind: 'card';
  status: 'approved' | 'in_process';
  last4?: string;
}

export interface CheckoutResponse {
  orderId: string;
  status: 'pending_payment' | 'processing';
  pricing: PricingBreakdown;
  payment: PixPaymentData | CardPaymentData;
  replayed: boolean; // true quando a Idempotency-Key já havia sido usada
}

export type QuoteRequest = Pick<CheckoutRequest, 'items' | 'couponCode'>;

export interface QuoteResponse {
  pricing: PricingBreakdown;
}

export type CheckoutErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'METHOD_NOT_ALLOWED'
  | 'PRODUCT_NOT_FOUND'
  | 'INVALID_VARIANT'
  | 'INVALID_COUPON'
  | 'COUPON_NOT_ELIGIBLE'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'INSUFFICIENT_STOCK'
  | 'PRICE_CHANGED'
  | 'PAYMENT_REJECTED'
  | 'PAYMENT_PROVIDER_ERROR'
  | 'RATE_LIMITED'
  | 'TOO_MANY_PENDING_ORDERS'
  | 'SERVER_MISCONFIGURED'
  | 'INTERNAL_ERROR';

export interface ApiErrorBody {
  error: { code: CheckoutErrorCode; message: string; details?: unknown };
}
