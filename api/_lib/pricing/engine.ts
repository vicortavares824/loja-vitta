import type { CheckoutItemInput, PricingBreakdown } from '../../../src/types/checkout';
import { AppError } from '../errors';
import { COUPON_RULES, type CouponRule } from '../config/coupons';
import { FREE_SHIPPING_THRESHOLD_CENTS, SHIPPING_FEE_CENTS } from '../config/shipping';

export interface CatalogProduct {
  id: string;
  name: string;
  priceCents: number;
  colors: string[];
  sizes: string[];
  image: string;
}

export interface PricingInput {
  items: CheckoutItemInput[];
  catalog: ReadonlyMap<string, CatalogProduct>;
  couponCode?: string;
  /** Existe pedido não cancelado do usuário. */
  hasPriorOrder: boolean;
  rules?: ReadonlyArray<CouponRule>;
  /** Instante de referência para validade do cupom. Padrão: agora. */
  now?: Date;
}

export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase();
}

function computeDiscount(rule: CouponRule, subtotalCents: number): { discount: number; freeShipping: boolean } {
  switch (rule.kind) {
    case 'percent': {
      if (rule.percentBps === null) throw new AppError('INVALID_COUPON');
      return { discount: Math.floor((subtotalCents * rule.percentBps) / 10_000), freeShipping: false };
    }
    case 'fixed': {
      if (rule.fixedCents === null) throw new AppError('INVALID_COUPON');
      return { discount: rule.fixedCents, freeShipping: false };
    }
    case 'free_shipping':
      return { discount: 0, freeShipping: true };
    default:
      throw new AppError('INVALID_COUPON');
  }
}

export function calculatePricing(input: PricingInput): PricingBreakdown {
  const { items, catalog, hasPriorOrder } = input;

  const missing: string[] = [];
  for (const item of items) {
    if (!catalog.has(item.productId) && !missing.includes(item.productId)) missing.push(item.productId);
  }
  if (missing.length > 0) {
    throw new AppError('PRODUCT_NOT_FOUND', { details: { productIds: missing } });
  }

  let subtotalCents = 0;
  for (const item of items) {
    const product = catalog.get(item.productId) as CatalogProduct;
    if (!product.colors.includes(item.color) || !product.sizes.includes(item.size)) {
      throw new AppError('INVALID_VARIANT', {
        details: { productId: item.productId, color: item.color, size: item.size },
      });
    }
    subtotalCents += product.priceCents * item.quantity;
  }

  let discountCents = 0;
  let freeShippingCoupon = false;
  let couponCode: string | null = null;

  const normalized = input.couponCode === undefined ? '' : normalizeCouponCode(input.couponCode);
  if (normalized !== '') {
    const rules = input.rules ?? COUPON_RULES;
    const rule = rules.find((r) => r.code === normalized && r.confirmed);
    if (!rule) throw new AppError('INVALID_COUPON');

    const now = input.now ?? new Date();
    if (rule.expiresAt !== null && new Date(rule.expiresAt).getTime() <= now.getTime()) {
      throw new AppError('INVALID_COUPON');
    }
    if (rule.firstPurchaseOnly && hasPriorOrder) throw new AppError('COUPON_NOT_ELIGIBLE');
    if (rule.minSubtotalCents !== null && subtotalCents < rule.minSubtotalCents) {
      throw new AppError('COUPON_NOT_ELIGIBLE');
    }

    const result = computeDiscount(rule, subtotalCents);
    discountCents = Math.min(Math.max(result.discount, 0), subtotalCents);
    freeShippingCoupon = result.freeShipping;
    couponCode = rule.code;
  }

  const shippingCents =
    freeShippingCoupon || subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FEE_CENTS;
  const totalCents = subtotalCents - discountCents + shippingCents;

  return { subtotalCents, discountCents, shippingCents, totalCents, couponCode };
}
