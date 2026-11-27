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
  shippingCep: string; // 8 dígitos (pontuação é removida no servidor)
  shippingServiceId: number; // id de ShippingOption escolhido na cotação
  shippingAddressId?: string; // endereço salvo usado (habilita a etiqueta automática)
  card?: CardPaymentInput; // obrigatório quando paymentMethod === 'card'
}

/** Endereço em campos separados, copiado do endereço salvo no checkout (etiqueta). */
export interface ShippingAddressParts {
  recipientName: string;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
}

export interface ShippingOption {
  serviceId: number; // id do serviço no Melhor Envio (0 = frete padrão sem integração)
  name: string; // ex.: 'PAC'
  company: string; // ex.: 'Correios'
  priceCents: number; // preço cobrado do cliente (0 quando o frete é grátis)
  deliveryDays: number | null; // prazo em dias úteis
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

export type QuoteRequest = Pick<CheckoutRequest, 'items' | 'couponCode'> & {
  shippingCep?: string; // sem CEP, a cotação não traz opções de frete
  shippingServiceId?: number; // padrão: a opção mais barata
};

export interface QuoteResponse {
  pricing: PricingBreakdown;
  shippingOptions: ShippingOption[]; // vazio quando o CEP não foi informado
  shippingServiceId: number | null; // opção usada em pricing.shippingCents
}

export interface CancelOrderRequest {
  orderId: string;
}

export interface CancelOrderResponse {
  orderId: string;
  status: 'cancelled';
  refunded: boolean; // true quando o pedido já estava pago e o valor foi estornado
}

export interface ShippingLabelResponse {
  labelUrl?: string; // PDF da etiqueta (ação generate)
  trackingCode: string | null;
  status?: string; // status do pedido após sincronizar (ação refresh)
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
  | 'SHIPPING_UNAVAILABLE'
  | 'SHIPPING_OPTION_UNAVAILABLE'
  | 'ORDER_NOT_FOUND'
  | 'ORDER_NOT_CANCELLABLE'
  | 'FORBIDDEN'
  | 'LABEL_DATA_MISSING'
  | 'SHIPPING_LABEL_ERROR'
  | 'LABEL_IN_PROGRESS'
  | 'RATE_LIMITED'
  | 'TOO_MANY_PENDING_ORDERS'
  | 'SERVER_MISCONFIGURED'
  | 'INTERNAL_ERROR';

export interface ApiErrorBody {
  error: { code: CheckoutErrorCode; message: string; details?: unknown };
}
