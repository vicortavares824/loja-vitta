export type CouponKind = 'percent' | 'fixed' | 'free_shipping';

export interface CouponRule {
  /** Já em maiúsculas. */
  code: string;
  /** Só regras confirmadas são aceitas pelo Pricing_Engine. */
  confirmed: boolean;
  kind: CouponKind | null;
  /** Pontos-base (1000 = 10%), se kind === 'percent'. */
  percentBps: number | null;
  /** Centavos, se kind === 'fixed'. */
  fixedCents: number | null;
  firstPurchaseOnly: boolean;
  minSubtotalCents: number | null;
  /** ISO 8601. */
  expiresAt: string | null;
}

/**
 * Nenhum valor de desconto foi definido. Todos os campos abaixo são
 * A CONFIRMAR PELO DONO DA LOJA. Enquanto `confirmed` for false, o cupom
 * é tratado como inexistente (INVALID_COUPON).
 */
export const COUPON_RULES: ReadonlyArray<CouponRule> = [
  {
    code: 'PRIMEIRACOMPRA',
    confirmed: false, // A CONFIRMAR PELO DONO DA LOJA
    kind: null, // A CONFIRMAR PELO DONO DA LOJA
    percentBps: null, // A CONFIRMAR PELO DONO DA LOJA
    fixedCents: null, // A CONFIRMAR PELO DONO DA LOJA
    firstPurchaseOnly: true, // A CONFIRMAR PELO DONO DA LOJA
    minSubtotalCents: null, // A CONFIRMAR PELO DONO DA LOJA
    expiresAt: null, // A CONFIRMAR PELO DONO DA LOJA
  },
  {
    code: 'VITTA10',
    confirmed: false, // A CONFIRMAR PELO DONO DA LOJA
    kind: null, // A CONFIRMAR PELO DONO DA LOJA
    percentBps: null, // A CONFIRMAR PELO DONO DA LOJA
    fixedCents: null, // A CONFIRMAR PELO DONO DA LOJA
    firstPurchaseOnly: false, // A CONFIRMAR PELO DONO DA LOJA
    minSubtotalCents: null, // A CONFIRMAR PELO DONO DA LOJA
    expiresAt: null, // A CONFIRMAR PELO DONO DA LOJA
  },
];
