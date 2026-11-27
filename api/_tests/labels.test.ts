import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildCartInput,
  buildVolume,
  generateLabel,
  trackingUpdate,
  type SenderConfig,
} from '../_lib/shipping/labelService.js';
import { parseShipmentStatus, type MeShipmentStatus } from '../_lib/shipping/melhorEnvioLabels.js';

const ORDER_ID = '33333333-3333-4333-8333-333333333333';

const sender: SenderConfig = {
  name: 'Loja Teste',
  phone: '11999990000',
  email: 'loja@example.test',
  document: '12345678909',
  address: 'Rua da Loja',
  number: '10',
  district: 'Centro',
  city: 'São Paulo',
  state_abbr: 'SP',
};

const parts = {
  recipientName: 'Cliente Teste',
  cep: '13887002',
  street: 'Rua do Cliente',
  number: '176',
  complement: null,
  neighborhood: 'Jardim',
  city: 'Vargem Grande do Sul',
  state: 'SP',
};

const baseOrder = {
  id: ORDER_ID,
  status: 'processing',
  user_id: 'user-1',
  customerEmail: 'cliente@example.test',
  cancel_requested_at: null,
  shipping_service_id: 2,
  shipping_address_parts: parts,
  me_order_id: null,
  label_url: null,
  tracking_code: null,
  subtotalAmount: 76,
  totalAmount: 86.69,
  order_items: [{ productName: 'Camiseta', quantity: 2, price: 38 }],
};
const contact = { cpf: '98765432100', phone: '19988887777' };

const shipment = (over: Partial<MeShipmentStatus> = {}): MeShipmentStatus => ({
  id: 'me-1',
  status: 'released',
  tracking: null,
  melhorenvioTracking: null,
  paidAt: null,
  generatedAt: null,
  postedAt: null,
  deliveredAt: null,
  canceledAt: null,
  ...over,
});

describe('buildCartInput', () => {
  it('maps the order, customer and sender to the Melhor Envio cart body', () => {
    const input = buildCartInput(baseOrder, contact, sender, '01001000');

    expect(input.service).toBe(2);
    expect(input.from).toMatchObject({ document: '12345678909', postal_code: '01001000', state_abbr: 'SP' });
    expect(input.to).toMatchObject({
      name: 'Cliente Teste',
      document: '98765432100',
      phone: '19988887777',
      address: 'Rua do Cliente',
      district: 'Jardim',
      postal_code: '13887002',
    });
    expect(input.products).toEqual([{ name: 'Camiseta', quantity: '2', unitary_value: '38.00' }]);
    expect(input.options).toMatchObject({ insurance_value: 76, non_commercial: true });
    expect(input.volumes).toEqual([buildVolume(2)]);
  });

  it('lists every missing piece instead of sending an incomplete label', () => {
    const order = { ...baseOrder, shipping_address_parts: null, shipping_service_id: 0 };
    expect(() => buildCartInput(order, { cpf: null, phone: null }, sender, '01001000')).toThrow(
      expect.objectContaining({
        code: 'LABEL_DATA_MISSING',
        details: { missing: expect.arrayContaining(['CPF do cliente', 'telefone do cliente']) },
      }),
    );
  });
});

describe('buildVolume', () => {
  it('grows the box with the number of pieces and caps the side at 100 cm', () => {
    expect(buildVolume(1)).toEqual({ width: 20, length: 25, height: 5, weight: 0.3 });
    expect(buildVolume(3).weight).toBe(0.9);
    expect(buildVolume(50).height).toBe(100);
  });
});

describe('trackingUpdate', () => {
  const order = { status: 'processing', tracking_code: null, cancel_requested_at: null };

  it('stores the Melhor Envio code until the Correios code exists', () => {
    expect(trackingUpdate(order, shipment({ melhorenvioTracking: 'ME123' }))).toEqual({ tracking_code: 'ME123' });
    expect(trackingUpdate(order, shipment({ melhorenvioTracking: 'ME123', tracking: 'AA123BR' }))).toEqual({
      tracking_code: 'AA123BR',
    });
  });

  it('marks the order shipped when posted and delivered when delivered', () => {
    expect(trackingUpdate(order, shipment({ postedAt: '2026-11-28' })).status).toBe('shipped');
    expect(
      trackingUpdate({ ...order, status: 'shipped' }, shipment({ postedAt: 'x', deliveredAt: 'y' })).status,
    ).toBe('delivered');
  });

  it('never changes the status of an order being cancelled', () => {
    const update = trackingUpdate({ ...order, cancel_requested_at: 'now' }, shipment({ postedAt: 'x' }));
    expect(update.status).toBeUndefined();
  });
});

describe('parseShipmentStatus', () => {
  it('reads the entry keyed by shipment id', () => {
    const parsed = parseShipmentStatus(
      { 'me-1': { status: 'posted', tracking: 'AA1BR', melhorenvio_tracking: 'ME1', posted_at: '2026-11-28' } },
      'me-1',
    );
    expect(parsed).toMatchObject({
      status: 'posted',
      tracking: 'AA1BR',
      melhorenvioTracking: 'ME1',
      postedAt: '2026-11-28',
    });
  });
});

describe('generateLabel', () => {
  /**
   * Supabase encadeável: leituras devolvem o pedido ou o contato; updates registram os
   * valores e, quando terminam em select(), devolvem `updatedRows` linhas (trava condicional).
   */
  function fakeSupabase(order: Record<string, unknown>, updatedRows = 1) {
    const updates: Array<Record<string, unknown>> = [];
    const from = (table: string) => {
      let updating = false;
      const query = {
        select: () =>
          updating
            ? { then: (resolve: (v: unknown) => void) => resolve({ data: Array(updatedRows).fill({ id: ORDER_ID }), error: null }) }
            : query,
        update: (values: Record<string, unknown>) => {
          updating = true;
          updates.push(values);
          return query;
        },
        eq: () => query,
        is: () => query,
        or: () => query,
        maybeSingle: async () => ({ data: table === 'orders' ? order : contact, error: null }),
        then: (resolve: (v: unknown) => void) => resolve({ error: null }),
      };
      return query;
    };
    return { client: { from } as unknown as SupabaseClient, updates };
  }

  function fakeMe(status: MeShipmentStatus) {
    return {
      addToCart: vi.fn(async () => 'me-1'),
      checkout: vi.fn(async () => undefined),
      generate: vi.fn(async () => undefined),
      print: vi.fn(async () => 'https://label.example/pdf'),
      tracking: vi.fn(async () => status),
    };
  }

  it('creates, pays, generates and prints, saving the shipment id first', async () => {
    const { client, updates } = fakeSupabase(baseOrder);
    const me = fakeMe(shipment({ melhorenvioTracking: 'ME777' }));

    const result = await generateLabel({ supabase: client, me, sender, fromCep: '01001000' }, ORDER_ID);

    expect(result).toEqual({ labelUrl: 'https://label.example/pdf', trackingCode: 'ME777' });
    expect(updates[0]).toHaveProperty('label_claimed_at');
    expect(updates[1]).toEqual({ me_order_id: 'me-1' });
    expect(me.checkout).toHaveBeenCalledWith('me-1');
    expect(me.generate).toHaveBeenCalledWith('me-1');
    expect(updates[2]).toMatchObject({ label_url: 'https://label.example/pdf', tracking_code: 'ME777' });
  });

  it('resumes an interrupted label without buying it again', async () => {
    const { client } = fakeSupabase({ ...baseOrder, me_order_id: 'me-1' });
    const me = fakeMe(shipment({ paidAt: '2026-11-28', generatedAt: '2026-11-28' }));

    await generateLabel({ supabase: client, me, sender, fromCep: '01001000' }, ORDER_ID);

    expect(me.addToCart).not.toHaveBeenCalled();
    expect(me.checkout).not.toHaveBeenCalled();
    expect(me.generate).not.toHaveBeenCalled();
    expect(me.print).toHaveBeenCalledWith('me-1');
  });

  it('returns the existing label without calling Melhor Envio', async () => {
    const { client } = fakeSupabase({ ...baseOrder, label_url: 'https://old', tracking_code: 'AA1BR' });
    const me = fakeMe(shipment());

    const result = await generateLabel({ supabase: client, me, sender, fromCep: '01001000' }, ORDER_ID);

    expect(result).toEqual({ labelUrl: 'https://old', trackingCode: 'AA1BR' });
    expect(me.tracking).not.toHaveBeenCalled();
  });

  it('refuses unpaid or cancelling orders', async () => {
    for (const order of [
      { ...baseOrder, status: 'pending_payment' },
      { ...baseOrder, cancel_requested_at: 'now' },
    ]) {
      const { client } = fakeSupabase(order);
      await expect(
        generateLabel({ supabase: client, me: fakeMe(shipment()), sender, fromCep: '01001000' }, ORDER_ID),
      ).rejects.toMatchObject({ code: 'LABEL_DATA_MISSING' });
    }
  });

  it('refuses a second generation while another one holds the lock', async () => {
    const { client } = fakeSupabase(baseOrder, 0);
    const me = fakeMe(shipment());

    await expect(
      generateLabel({ supabase: client, me, sender, fromCep: '01001000' }, ORDER_ID),
    ).rejects.toMatchObject({ code: 'LABEL_IN_PROGRESS' });
    expect(me.addToCart).not.toHaveBeenCalled();
    expect(me.checkout).not.toHaveBeenCalled();
  });

  it('releases the lock when Melhor Envio fails', async () => {
    const { client, updates } = fakeSupabase(baseOrder);
    const me = fakeMe(shipment());
    me.checkout.mockRejectedValueOnce(new Error('sem saldo'));

    await expect(
      generateLabel({ supabase: client, me, sender, fromCep: '01001000' }, ORDER_ID),
    ).rejects.toThrow('sem saldo');
    expect(updates).toContainEqual({ label_claimed_at: null });
  });
});
