import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CardPaymentData,
  CheckoutRequest,
  CheckoutResponse,
  PixPaymentData,
  PricingBreakdown,
  ShippingAddressParts,
  ShippingOption,
} from '../../../src/types/checkout.js';
import { AppError } from '../errors.js';
import type { AuthenticatedUser } from '../auth.js';
import type { Logger } from '../logger.js';
import type { MercadoPagoClient } from '../payments/mercadoPago.js';
import { type CatalogProduct, calculatePricing, normalizeCouponCode } from '../pricing/engine.js';
import { selectShippingOption, type ShippingQuoter } from '../shipping/shippingService.js';
import { releaseOrderStock, reserveAndCreateOrder } from '../stock/stockService.js';

const DEFAULT_PIX_EXPIRATION_MINUTES = 30;
const CARD_SAFETY_EXPIRATION_MINUTES = 15;

export const CANCEL_REASON_PAYMENT_REJECTED = 'payment_rejected';
export const CANCEL_REASON_PROVIDER_ERROR = 'payment_provider_error';
export const CANCEL_REASON_EXPIRED = 'expired';

export interface CheckoutDeps {
  supabase: SupabaseClient;
  mp: MercadoPagoClient;
  /** Cota o frete no servidor; o preço enviado pelo navegador nunca é usado. */
  quoteShipping: ShippingQuoter;
  now?: () => Date;
  /** Validade do Pix em minutos. Padrão: 30. */
  pixExpirationMinutes?: number;
  log?: Logger;
}

export interface CheckoutInput {
  user: AuthenticatedUser;
  idempotencyKey: string;
  request: CheckoutRequest;
}

export interface CheckoutResult {
  /** 201 para pedido novo, 200 para repetição idempotente. */
  status: 200 | 201;
  body: CheckoutResponse;
}

interface OrderRow {
  id: string;
  status: string;
  payment_id: string | null;
  expires_at: string | null;
  cancel_reason: string | null;
  request_hash: string | null;
  paymentMethod: string | null;
  couponUsed: string | null;
  totalAmount: number | string;
  subtotalAmount: number | string | null;
  discountAmount: number | string | null;
  shippingAmount: number | string | null;
}

const ORDER_COLUMNS =
  'id, status, payment_id, expires_at, cancel_reason, request_hash, paymentMethod, couponUsed, totalAmount, subtotalAmount, discountAmount, shippingAmount';

function toCents(value: number | string | null | undefined): number {
  return Math.round(Number(value ?? 0) * 100);
}

function dbError(operation: string, error: unknown): AppError {
  return new AppError('INTERNAL_ERROR', { internal: { operation, error } });
}

/** Hash SHA-256 do corpo normalizado (itens ordenados, cupom normalizado, método, endereço). O cartão não entra: o token muda a cada tentativa. */
export function computeRequestHash(request: CheckoutRequest): string {
  const items = request.items
    .map((i) => ({ productId: i.productId, color: i.color, size: i.size, quantity: i.quantity }))
    .sort((a, b) =>
      `${a.productId}|${a.color}|${a.size}`.localeCompare(`${b.productId}|${b.color}|${b.size}`),
    );
  const normalized = {
    items,
    couponCode: request.couponCode ? normalizeCouponCode(request.couponCode) : '',
    paymentMethod: request.paymentMethod,
    shippingAddress: request.shippingAddress.trim(),
    shippingCep: request.shippingCep,
    shippingServiceId: request.shippingServiceId,
  };
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

function colorNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const names: string[] = [];
  for (const entry of raw) {
    if (typeof entry === 'string') names.push(entry);
    else if (typeof entry === 'object' && entry !== null) {
      const name = (entry as { name?: unknown }).name;
      if (typeof name === 'string') names.push(name);
    }
  }
  return names;
}

function stringList(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : [];
}

/** Lê os produtos pedidos e monta o catálogo em centavos. */
export async function loadCatalog(
  supabase: SupabaseClient,
  productIds: readonly string[],
): Promise<Map<string, CatalogProduct>> {
  const ids = [...new Set(productIds)];
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, colors, sizes, images')
    .in('id', ids);
  if (error) throw dbError('loadCatalog', error);

  const catalog = new Map<string, CatalogProduct>();
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const images = stringList(row.images);
    catalog.set(String(row.id), {
      id: String(row.id),
      name: String(row.name),
      priceCents: toCents(row.price as number | string),
      colors: colorNames(row.colors),
      sizes: stringList(row.sizes),
      image: images[0] ?? '',
    });
  }
  return catalog;
}

/** Existe pedido do usuário com status diferente de `cancelled`. */
export async function hasPriorOrder(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('orders')
    .select('id')
    .eq('user_id', userId)
    .neq('status', 'cancelled')
    .limit(1);
  if (error) throw dbError('hasPriorOrder', error);
  return (data?.length ?? 0) > 0;
}

async function findOrderById(supabase: SupabaseClient, orderId: string): Promise<OrderRow> {
  const { data, error } = await supabase.from('orders').select(ORDER_COLUMNS).eq('id', orderId).maybeSingle();
  if (error || !data) throw dbError('findOrderById', error ?? 'not_found');
  return data as unknown as OrderRow;
}

async function findOrderByKey(
  supabase: SupabaseClient,
  userId: string,
  idempotencyKey: string,
): Promise<OrderRow | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_COLUMNS)
    .eq('user_id', userId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (error) throw dbError('findOrderByKey', error);
  return (data as unknown as OrderRow | null) ?? null;
}

function pricingFromOrder(order: OrderRow): PricingBreakdown {
  const totalCents = toCents(order.totalAmount);
  const discountCents = toCents(order.discountAmount);
  const shippingCents = toCents(order.shippingAmount);
  const subtotalCents =
    order.subtotalAmount === null ? totalCents + discountCents - shippingCents : toCents(order.subtotalAmount);
  return {
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents,
    couponCode: order.couponUsed ?? null,
  };
}

interface ChargeContext {
  deps: CheckoutDeps;
  user: AuthenticatedUser;
  idempotencyKey: string;
  request: CheckoutRequest;
  orderId: string;
  totalCents: number;
  expiresAt: Date;
  /** Frete escolhido, gravado no pedido antes da cobrança (ausente na repetição). */
  shipping?: ShippingOption;
}

/**
 * Cópia do endereço salvo usado no checkout, com os campos que a etiqueta exige.
 * Só vale se o endereço for do próprio cliente e tiver o mesmo CEP cotado; senão, null
 * (o pedido segue normalmente e a etiqueta é feita pelo painel do Melhor Envio).
 */
async function loadAddressParts(
  deps: CheckoutDeps,
  userId: string,
  addressId: string | undefined,
  cep: string,
): Promise<ShippingAddressParts | null> {
  if (!addressId) return null;
  const { data, error } = await deps.supabase
    .from('customer_addresses')
    .select('recipient_name, cep, street, number, complement, neighborhood, city, state')
    .eq('id', addressId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw dbError('loadAddressParts', error);
  const row = data as Record<string, string | null> | null;
  if (!row || row.cep !== cep) return null;
  return {
    recipientName: String(row.recipient_name),
    cep: String(row.cep),
    street: String(row.street),
    number: String(row.number),
    complement: row.complement ?? null,
    neighborhood: String(row.neighborhood),
    city: String(row.city),
    state: String(row.state),
  };
}

/** Grava CEP, serviço de frete e endereço estruturado no pedido. */
async function recordShipping(
  deps: CheckoutDeps,
  orderId: string,
  userId: string,
  request: CheckoutRequest,
  shipping: ShippingOption,
): Promise<void> {
  const parts = await loadAddressParts(deps, userId, request.shippingAddressId, request.shippingCep);
  const { error } = await deps.supabase
    .from('orders')
    .update({
      shipping_cep: request.shippingCep,
      shipping_service_id: shipping.serviceId,
      shipping_service_name: [shipping.company, shipping.name].filter(Boolean).join(' '),
      shipping_address_parts: parts,
    })
    .eq('id', orderId);
  if (error) throw dbError('recordShipping', error);
}

/**
 * Cobra no Mercado Pago e grava o `payment_id`. Se qualquer passo falhar, libera o estoque
 * (e cancela a cobrança, se já criada) em `finally`, para o pedido não ficar com reserva presa.
 */
async function chargeWithCompensation(ctx: ChargeContext): Promise<PixPaymentData | CardPaymentData> {
  const { deps, user, request, orderId } = ctx;
  const description = `Pedido Loja Vitta #${orderId.slice(0, 8)}`;
  let completed = false;
  let releaseReason = CANCEL_REASON_PROVIDER_ERROR;
  let createdPaymentId: string | null = null;

  try {
    if (ctx.shipping) await recordShipping(deps, orderId, user.id, request, ctx.shipping);

    let payment: PixPaymentData | CardPaymentData;
    let paymentId: string;

    if (request.paymentMethod === 'pix') {
      const pix = await deps.mp.createPixPayment({
        orderId,
        totalCents: ctx.totalCents,
        payerEmail: user.email,
        description,
        expiresAt: ctx.expiresAt,
        idempotencyKey: ctx.idempotencyKey,
      });
      createdPaymentId = pix.paymentId;
      paymentId = pix.paymentId;
      payment = { kind: 'pix', qrCode: pix.qrCode, qrCodeBase64: pix.qrCodeBase64, expiresAt: pix.expiresAt };
    } else {
      if (!request.card) throw new AppError('VALIDATION_ERROR');
      const card = await deps.mp.createCardPayment({
        orderId,
        totalCents: ctx.totalCents,
        payerEmail: user.email,
        description,
        card: request.card,
        idempotencyKey: ctx.idempotencyKey,
      });
      createdPaymentId = card.paymentId;
      paymentId = card.paymentId;
      payment = card.last4
        ? { kind: 'card', status: card.status, last4: card.last4 }
        : { kind: 'card', status: card.status };
    }

    const { error } = await deps.supabase.rpc('attach_order_payment', {
      p_order_id: orderId,
      p_payment_id: paymentId,
    });
    if (error) throw dbError('attach_order_payment', error);

    completed = true;
    return payment;
  } catch (err) {
    // Recusa imediata do cartão (PAYMENT_REJECTED) vem do cliente do Mercado Pago.
    if (err instanceof AppError && err.code === 'PAYMENT_REJECTED') {
      releaseReason = CANCEL_REASON_PAYMENT_REJECTED;
    }
    throw err;
  } finally {
    if (!completed) {
      if (createdPaymentId) {
        try {
          await deps.mp.cancelPayment(createdPaymentId);
        } catch (cancelErr) {
          deps.log?.warn('checkout.compensation.cancel_payment_failed', {
            orderId,
            error: cancelErr,
          });
        }
      }
      try {
        await releaseOrderStock(deps.supabase, orderId, releaseReason);
      } catch (releaseErr) {
        deps.log?.error('checkout.compensation.release_failed', { orderId, error: releaseErr });
      }
    }
  }
}

function buildResponse(
  orderId: string,
  pricing: PricingBreakdown,
  payment: PixPaymentData | CardPaymentData,
  replayed: boolean,
  status: CheckoutResponse['status'],
): CheckoutResponse {
  return { orderId, status, pricing, payment, replayed };
}

function expiresAtFor(deps: CheckoutDeps, method: CheckoutRequest['paymentMethod']): Date {
  const now = (deps.now ?? (() => new Date()))();
  const minutes =
    method === 'pix'
      ? (deps.pixExpirationMinutes ?? DEFAULT_PIX_EXPIRATION_MINUTES)
      : CARD_SAFETY_EXPIRATION_MINUTES;
  return new Date(now.getTime() + minutes * 60_000);
}

/** Reconstrói a resposta de um pedido já existente com a mesma Idempotency-Key. */
async function replayOrder(
  deps: CheckoutDeps,
  input: CheckoutInput,
  order: OrderRow,
  requestHash: string,
): Promise<CheckoutResult> {
  if (order.request_hash !== requestHash) throw new AppError('IDEMPOTENCY_KEY_REUSED');

  const pricing = pricingFromOrder(order);
  const now = (deps.now ?? (() => new Date()))();

  if (order.status === 'cancelled') {
    throw new AppError(
      order.cancel_reason === CANCEL_REASON_PAYMENT_REJECTED ? 'PAYMENT_REJECTED' : 'PAYMENT_PROVIDER_ERROR',
      { internal: { orderId: order.id, cancelReason: order.cancel_reason } },
    );
  }

  const orderStatus: CheckoutResponse['status'] = order.status === 'processing' ? 'processing' : 'pending_payment';
  const expiresAt = order.expires_at ? new Date(order.expires_at) : expiresAtFor(deps, input.request.paymentMethod);

  if (order.payment_id) {
    if (input.request.paymentMethod === 'pix') {
      // A mesma X-Idempotency-Key devolve o mesmo pagamento, com QR e expiração.
      const pix = await deps.mp.createPixPayment({
        orderId: order.id,
        totalCents: pricing.totalCents,
        payerEmail: input.user.email,
        description: `Pedido Loja Vitta #${order.id.slice(0, 8)}`,
        expiresAt,
        idempotencyKey: input.idempotencyKey,
      });
      if (pix.paymentId !== order.payment_id) {
        deps.log?.warn('checkout.replay.payment_id_mismatch', { orderId: order.id });
      }
      const payment: PixPaymentData = {
        kind: 'pix',
        qrCode: pix.qrCode,
        qrCodeBase64: pix.qrCodeBase64,
        expiresAt: pix.expiresAt,
      };
      return { status: 200, body: buildResponse(order.id, pricing, payment, true, orderStatus) };
    }
    const payment: CardPaymentData = {
      kind: 'card',
      status: order.status === 'processing' ? 'approved' : 'in_process',
    };
    return { status: 200, body: buildResponse(order.id, pricing, payment, true, orderStatus) };
  }

  // Sem payment_id: o servidor caiu entre a reserva e a cobrança.
  if (order.status !== 'pending_payment' && order.status !== 'pending') {
    throw new AppError('PAYMENT_PROVIDER_ERROR', { internal: { orderId: order.id, status: order.status } });
  }
  if (order.expires_at && new Date(order.expires_at).getTime() <= now.getTime()) {
    await releaseOrderStock(deps.supabase, order.id, CANCEL_REASON_EXPIRED);
    throw new AppError('PAYMENT_PROVIDER_ERROR', { internal: { orderId: order.id, reason: 'expired' } });
  }

  const payment = await chargeWithCompensation({
    deps,
    user: input.user,
    idempotencyKey: input.idempotencyKey,
    request: input.request,
    orderId: order.id,
    totalCents: pricing.totalCents,
    expiresAt,
    shipping: await shippingForReplay(deps, input.request, pricing.shippingCents),
  });
  const status = payment.kind === 'card' && payment.status === 'approved' ? 'processing' : 'pending_payment';
  return { status: 200, body: buildResponse(order.id, pricing, payment, true, status) };
}

/**
 * Frete a gravar quando a repetição cobra um pedido que caiu antes de `recordShipping`.
 * O valor já está fixado no pedido; a cotação só recupera o nome do serviço e, se falhar,
 * o pedido fica com o id do serviço e um nome genérico em vez de colunas vazias.
 */
async function shippingForReplay(
  deps: CheckoutDeps,
  request: CheckoutRequest,
  shippingCents: number,
): Promise<ShippingOption> {
  const fallback: ShippingOption = {
    serviceId: request.shippingServiceId,
    name: `Serviço ${request.shippingServiceId}`,
    company: '',
    priceCents: shippingCents,
    deliveryDays: null,
  };
  try {
    const catalog = await loadCatalog(deps.supabase, request.items.map((i) => i.productId));
    const options = await deps.quoteShipping({ items: request.items, catalog, toCep: request.shippingCep });
    const found = options.find((o) => o.serviceId === request.shippingServiceId);
    return found ? { ...found, priceCents: shippingCents } : fallback;
  } catch (err) {
    deps.log?.warn('checkout.replay.shipping_quote_failed', { error: err });
    return fallback;
  }
}

/**
 * Fluxo de checkout: repetição idempotente, preço no servidor, reserva atômica,
 * cobrança (Pix ou cartão), `attach_order_payment` e compensação em caso de falha.
 */
export async function createCheckout(deps: CheckoutDeps, input: CheckoutInput): Promise<CheckoutResult> {
  const { user, request, idempotencyKey } = input;
  const requestHash = computeRequestHash(request);

  // Repetição: verificada antes do cálculo, pois o próprio pedido existente tornaria
  // `hasPriorOrder` verdadeiro e quebraria cupons de primeira compra.
  const existing = await findOrderByKey(deps.supabase, user.id, idempotencyKey);
  if (existing) return replayOrder(deps, input, existing, requestHash);

  const catalog = await loadCatalog(
    deps.supabase,
    request.items.map((i) => i.productId),
  );
  const prior = request.couponCode ? await hasPriorOrder(deps.supabase, user.id) : false;
  const shippingOptions = await deps.quoteShipping({
    items: request.items,
    catalog,
    toCep: request.shippingCep,
  });
  // Com serviceId definido, nunca é null: opção ausente lança SHIPPING_OPTION_UNAVAILABLE.
  const shipping = selectShippingOption(shippingOptions, request.shippingServiceId) as ShippingOption;
  const now = (deps.now ?? (() => new Date()))();
  const pricing = calculatePricing({
    items: request.items,
    catalog,
    ...(request.couponCode !== undefined ? { couponCode: request.couponCode } : {}),
    hasPriorOrder: prior,
    shippingBaseCents: shipping.priceCents,
    now,
  });

  const expiresAt = expiresAtFor(deps, request.paymentMethod);
  const reserved = await reserveAndCreateOrder(deps.supabase, {
    userId: user.id,
    idempotencyKey,
    requestHash,
    customerName: user.name,
    customerEmail: user.email,
    paymentMethod: request.paymentMethod,
    shippingAddress: request.shippingAddress.trim(),
    coupon: pricing.couponCode,
    subtotal: pricing.subtotalCents / 100,
    discount: pricing.discountCents / 100,
    shipping: pricing.shippingCents / 100,
    total: pricing.totalCents / 100,
    expiresAt,
    items: request.items.map((i) => ({
      product_id: i.productId,
      quantity: i.quantity,
      color: i.color,
      size: i.size,
    })),
  });

  if (reserved.replayed) {
    const order = await findOrderById(deps.supabase, reserved.orderId);
    return replayOrder(deps, input, order, requestHash);
  }

  const payment = await chargeWithCompensation({
    deps,
    user,
    idempotencyKey,
    request,
    orderId: reserved.orderId,
    totalCents: pricing.totalCents,
    expiresAt,
    shipping,
  });
  const status = payment.kind === 'card' && payment.status === 'approved' ? 'processing' : 'pending_payment';
  return { status: 201, body: buildResponse(reserved.orderId, pricing, payment, false, status) };
}
