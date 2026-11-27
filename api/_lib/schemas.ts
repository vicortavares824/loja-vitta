import { z } from 'zod';
import type { CancelOrderRequest, CheckoutRequest, QuoteRequest } from '../../src/types/checkout.js';
import { AppError } from './errors.js';

const itemSchema = z
  .object({
    productId: z.string().uuid(),
    color: z.string().min(1).max(60),
    size: z.string().min(1).max(20),
    quantity: z.number().int().min(1).max(99),
  })
  .strict();

const cardSchema = z
  .object({
    token: z.string().min(1).max(200),
    paymentMethodId: z.string().min(1).max(40),
    installments: z.number().int().min(1).max(12),
    issuerId: z.string().max(20).optional(),
  })
  .strict();

/** CEP com ou sem pontuação; sai só com os 8 dígitos. */
const cepSchema = z
  .string()
  .max(12)
  .transform((v) => v.replace(/\D/g, ''))
  .pipe(z.string().length(8, 'CEP deve ter 8 dígitos'));

const shippingServiceIdSchema = z.number().int().min(0).max(1_000_000);

/**
 * `.strip()` na raiz descarta campos desconhecidos (price, total, shipping, cardNumber...).
 * `itemSchema` é `.strict()`: item com campo extra é erro de validação.
 */
export const checkoutSchema = z
  .object({
    items: z.array(itemSchema).min(1).max(50),
    couponCode: z.string().trim().max(32).optional(),
    paymentMethod: z.enum(['pix', 'card']),
    shippingAddress: z.string().trim().min(1).max(300),
    shippingCep: cepSchema,
    shippingServiceId: shippingServiceIdSchema,
    card: cardSchema.optional(),
  })
  .strip()
  .refine((v) => v.paymentMethod !== 'card' || v.card !== undefined, {
    path: ['card'],
    message: 'card é obrigatório para pagamento com cartão',
  }) satisfies z.ZodType<CheckoutRequest>;

export const quoteSchema = z
  .object({
    items: z.array(itemSchema).min(1).max(50),
    couponCode: z.string().trim().max(32).optional(),
    shippingCep: cepSchema.optional(),
    shippingServiceId: shippingServiceIdSchema.optional(),
  })
  .strip() satisfies z.ZodType<QuoteRequest>;

export const cancelOrderSchema = z
  .object({ orderId: z.string().uuid() })
  .strip() satisfies z.ZodType<CancelOrderRequest>;

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const idempotencyKeySchema = z.string().regex(UUID_V4);

export interface ValidationIssue {
  path: string;
  message: string;
}

function toIssues(error: z.ZodError, prefix?: string): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: [...(prefix ? [prefix] : []), ...issue.path.map(String)].join('.'),
    message: issue.message,
  }));
}

/** Valida o corpo com o esquema. Falha vira VALIDATION_ERROR (400) com `details` { path, message }. */
export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', { details: toIssues(parsed.error) });
  }
  return parsed.data;
}

/** Valida o cabeçalho `Idempotency-Key` (UUID v4). Ausente ou inválido vira VALIDATION_ERROR. */
export function parseIdempotencyKey(header: string | string[] | undefined): string {
  const value = Array.isArray(header) ? header[0] : header;
  const parsed = idempotencyKeySchema.safeParse(value);
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', {
      details: [{ path: 'Idempotency-Key', message: 'Deve ser um UUID v4.' }],
    });
  }
  return parsed.data.toLowerCase();
}
