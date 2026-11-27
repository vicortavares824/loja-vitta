import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cancelOrder, CANCEL_REASON_CUSTOMER } from '../_lib/orders/cancelOrder.js';
import type { MercadoPagoClient, MpStatus } from '../_lib/payments/mercadoPago.js';

const USER = 'user-1';
const ORDER = '22222222-2222-4222-8222-222222222222';

interface FakeOrder {
  id: string;
  user_id: string;
  status: string;
  payment_id: string | null;
  cancel_reason?: string | null;
}

interface FakeOptions {
  rpc?: Record<string, { data: unknown; error: unknown }>;
  /** Linhas devolvidas pela trava condicional (0 = status mudou). */
  claimRows?: number;
  /** Pedido devolvido nas leituras seguintes à primeira. */
  reread?: FakeOrder;
}

/**
 * Supabase mínimo e encadeável: select/eq/maybeSingle, update/eq/select e rpc.
 * Registra os updates para os testes conferirem trava, soltura e needs_review.
 */
function fakeSupabase(order: FakeOrder | null, opts: FakeOptions = {}) {
  const rpc = vi.fn(async (name: string) => opts.rpc?.[name] ?? { data: true, error: null });
  const updates: Array<Record<string, unknown>> = [];
  let reads = 0;

  const from = () => {
    let updating = false;
    const query = {
      select: () =>
        updating
          ? { ...query, then: (resolve: (v: unknown) => void) => resolve({ data: Array(opts.claimRows ?? 1).fill({ id: ORDER }), error: null }) }
          : query,
      update: (values: Record<string, unknown>) => {
        updating = true;
        updates.push(values);
        return query;
      },
      eq: () => query,
      maybeSingle: async () => ({ data: reads++ === 0 ? order : (opts.reread ?? order), error: null }),
      then: (resolve: (v: unknown) => void) => resolve({ error: null }),
    };
    return query;
  };

  return { client: { from, rpc } as unknown as SupabaseClient, rpc, updates };
}

function fakeMp(paymentStatus: MpStatus = 'pending') {
  return {
    createPixPayment: vi.fn(),
    createCardPayment: vi.fn(),
    getPayment: vi.fn(async () => ({ id: 'p1', status: paymentStatus, paidCents: 8800, externalReference: ORDER })),
    cancelPayment: vi.fn(async () => undefined),
    refundPayment: vi.fn(async () => undefined),
  } satisfies MercadoPagoClient;
}

const order = (status: string, extra: Partial<FakeOrder> = {}): FakeOrder => ({
  id: ORDER,
  user_id: USER,
  status,
  payment_id: 'p1',
  ...extra,
});
const cancelledByCustomer = order('cancelled', { cancel_reason: CANCEL_REASON_CUSTOMER });
const input = { userId: USER, orderId: ORDER };

describe('cancelOrder: unpaid orders', () => {
  it('cancels the open payment and releases stock', async () => {
    const { client, rpc } = fakeSupabase(order('pending_payment'));
    const mp = fakeMp('pending');

    const result = await cancelOrder({ supabase: client, mp }, input);

    expect(result).toEqual({ orderId: ORDER, status: 'cancelled', refunded: false });
    expect(mp.cancelPayment).toHaveBeenCalledWith('p1');
    expect(mp.refundPayment).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith('release_order_stock', { p_order_id: ORDER, p_reason: CANCEL_REASON_CUSTOMER });
  });

  it('refuses when the payment was just approved', async () => {
    const { client, rpc } = fakeSupabase(order('pending_payment'));
    const mp = fakeMp('approved');

    await expect(cancelOrder({ supabase: client, mp }, input)).rejects.toMatchObject({ code: 'ORDER_NOT_CANCELLABLE' });
    expect(mp.cancelPayment).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('keeps the order when cancelling the payment fails', async () => {
    const { client, rpc } = fakeSupabase(order('pending_payment'));
    const mp = fakeMp('in_process');
    mp.cancelPayment.mockRejectedValueOnce(new Error('mp down'));

    await expect(cancelOrder({ supabase: client, mp }, input)).rejects.toThrow('mp down');
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('cancelOrder: paid orders', () => {
  it('claims the order, refunds, then cancels', async () => {
    const { client, rpc, updates } = fakeSupabase(order('processing'));
    const mp = fakeMp('approved');

    const result = await cancelOrder({ supabase: client, mp }, input);

    expect(result.refunded).toBe(true);
    expect(updates[0]).toHaveProperty('cancel_requested_at');
    expect(mp.refundPayment).toHaveBeenCalledWith('p1');
    expect(rpc).toHaveBeenCalledWith('cancel_paid_order', { p_order_id: ORDER, p_reason: CANCEL_REASON_CUSTOMER });
    expect(mp.refundPayment.mock.invocationCallOrder[0]).toBeLessThan(rpc.mock.invocationCallOrder[0]);
  });

  it('does not refund when the order can no longer be claimed (already shipped)', async () => {
    const { client, rpc } = fakeSupabase(order('processing'), { claimRows: 0, reread: order('shipped') });
    const mp = fakeMp('approved');

    await expect(cancelOrder({ supabase: client, mp }, input)).rejects.toMatchObject({ code: 'ORDER_NOT_CANCELLABLE' });
    expect(mp.refundPayment).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('releases the claim and keeps the order when the refund fails', async () => {
    const { client, rpc, updates } = fakeSupabase(order('processing'));
    const mp = fakeMp('approved');
    mp.refundPayment.mockRejectedValueOnce(new Error('mp down'));

    await expect(cancelOrder({ supabase: client, mp }, input)).rejects.toThrow('mp down');
    expect(updates).toContainEqual({ cancel_requested_at: null });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('treats an already refunded payment as success on retry', async () => {
    const { client, rpc } = fakeSupabase(order('processing'));
    const mp = fakeMp('refunded');
    mp.refundPayment.mockRejectedValueOnce(new Error('already refunded'));

    const result = await cancelOrder({ supabase: client, mp }, input);

    expect(result.refunded).toBe(true);
    expect(rpc).toHaveBeenCalledWith('cancel_paid_order', expect.anything());
  });

  it('returns success for a duplicate request that lost the race', async () => {
    const { client, updates } = fakeSupabase(order('processing'), {
      rpc: { cancel_paid_order: { data: false, error: null } },
      reread: cancelledByCustomer,
    });

    const result = await cancelOrder({ supabase: client, mp: fakeMp('approved') }, input);

    expect(result).toEqual({ orderId: ORDER, status: 'cancelled', refunded: true });
    expect(updates).not.toContainEqual({ needs_review: true });
  });

  it('flags for review when the order changed after the refund', async () => {
    const { client, updates } = fakeSupabase(order('processing'), {
      rpc: { cancel_paid_order: { data: false, error: null } },
      reread: order('shipped'),
    });

    await expect(cancelOrder({ supabase: client, mp: fakeMp('approved') }, input)).rejects.toMatchObject({
      code: 'ORDER_NOT_CANCELLABLE',
    });
    expect(updates).toContainEqual({ needs_review: true });
  });
});

describe('cancelOrder: guards', () => {
  it.each(['shipped', 'delivered', 'cancelled'])('refuses a %s order', async status => {
    const { client } = fakeSupabase(order(status));
    await expect(cancelOrder({ supabase: client, mp: fakeMp() }, input)).rejects.toMatchObject({
      code: 'ORDER_NOT_CANCELLABLE',
    });
  });

  it("hides other customers' orders", async () => {
    const { client } = fakeSupabase(order('pending_payment', { user_id: 'someone-else' }));
    await expect(cancelOrder({ supabase: client, mp: fakeMp() }, input)).rejects.toMatchObject({
      code: 'ORDER_NOT_FOUND',
    });
  });
});
