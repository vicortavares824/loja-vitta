import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { ShippingAddressParts } from '../../../src/types/checkout.js';
import { DEFAULT_ITEM_PACKAGE, FALLBACK_SHIPPING_SERVICE_ID } from '../config/shipping.js';
import type { ServerEnv } from '../env.js';
import { AppError } from '../errors.js';
import type { Logger } from '../logger.js';
import {
  createMelhorEnvioLabelClient,
  type MeCartInput,
  type MelhorEnvioLabelClient,
  type MeParty,
  type MeShipmentStatus,
} from './melhorEnvioLabels.js';

/** Maior lado aceito pelos Correios, em cm. */
const MAX_SIDE_CM = 100;
const PLATFORM = 'Loja Vitta';
const SYNC_LIMIT = 25;

/** Remetente (MELHORENVIO_SENDER, JSON). CPF (document) ou CNPJ (company_document). */
const senderSchema = z
  .object({
    name: z.string().min(1),
    phone: z.string().transform(v => v.replace(/\D/g, '')).pipe(z.string().min(10).max(11)),
    email: z.string().email(),
    document: z.string().transform(v => v.replace(/\D/g, '')).pipe(z.string().length(11)).optional(),
    company_document: z.string().transform(v => v.replace(/\D/g, '')).pipe(z.string().length(14)).optional(),
    address: z.string().min(1),
    number: z.string().min(1),
    complement: z.string().optional(),
    district: z.string().min(1),
    city: z.string().min(1),
    state_abbr: z.string().length(2),
  })
  .refine(s => s.document || s.company_document, { message: 'document ou company_document' });

export type SenderConfig = z.infer<typeof senderSchema>;

export interface LabelDeps {
  supabase: SupabaseClient;
  me: MelhorEnvioLabelClient;
  sender: SenderConfig;
  fromCep: string;
  log?: Logger;
}

interface OrderItemRow {
  productName: string;
  quantity: number;
  price: number | string;
}

interface LabelOrderRow {
  id: string;
  status: string;
  user_id: string | null;
  customerEmail: string | null;
  cancel_requested_at: string | null;
  shipping_service_id: number | null;
  shipping_address_parts: ShippingAddressParts | null;
  me_order_id: string | null;
  label_url: string | null;
  tracking_code: string | null;
  subtotalAmount: number | string | null;
  totalAmount: number | string;
  order_items: OrderItemRow[] | null;
}

const ORDER_COLUMNS =
  'id, status, user_id, customerEmail, cancel_requested_at, shipping_service_id, shipping_address_parts, ' +
  'me_order_id, label_url, tracking_code, subtotalAmount, totalAmount, order_items(productName, quantity, price)';

function dbError(operation: string, error: unknown): AppError {
  return new AppError('INTERNAL_ERROR', { internal: { operation, error } });
}

function missingData(missing: string[]): AppError {
  return new AppError('LABEL_DATA_MISSING', { details: { missing } });
}

/** Monta as dependências a partir do ambiente. Configuração incompleta vira LABEL_DATA_MISSING. */
export function createLabelDeps(env: ServerEnv, supabase: SupabaseClient, log?: Logger): LabelDeps {
  const missing: string[] = [];
  if (!env.MELHORENVIO_TOKEN) missing.push('MELHORENVIO_TOKEN');
  if (!env.MELHORENVIO_FROM_CEP) missing.push('MELHORENVIO_FROM_CEP');
  if (!env.MELHORENVIO_USER_AGENT) missing.push('MELHORENVIO_USER_AGENT');

  let sender: SenderConfig | null = null;
  try {
    const parsed = senderSchema.safeParse(env.MELHORENVIO_SENDER ? JSON.parse(env.MELHORENVIO_SENDER) : null);
    if (parsed.success) sender = parsed.data;
  } catch {
    sender = null;
  }
  if (!sender) missing.push('MELHORENVIO_SENDER');
  if (missing.length > 0 || !sender) throw missingData(missing);

  return {
    supabase,
    sender,
    fromCep: env.MELHORENVIO_FROM_CEP as string,
    log,
    me: createMelhorEnvioLabelClient({
      token: env.MELHORENVIO_TOKEN as string,
      environment: env.MELHORENVIO_ENV,
      userAgent: env.MELHORENVIO_USER_AGENT as string,
    }),
  };
}

async function loadOrder(supabase: SupabaseClient, orderId: string): Promise<LabelOrderRow> {
  const { data, error } = await supabase.from('orders').select(ORDER_COLUMNS).eq('id', orderId).maybeSingle();
  if (error) throw dbError('loadOrder', error);
  if (!data) throw new AppError('ORDER_NOT_FOUND');
  return data as unknown as LabelOrderRow;
}

async function loadRecipientContact(
  supabase: SupabaseClient,
  userId: string | null,
): Promise<{ cpf: string | null; phone: string | null }> {
  if (!userId) return { cpf: null, phone: null };
  const { data, error } = await supabase
    .from('customer_details')
    .select('cpf, phone')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw dbError('loadRecipientContact', error);
  const row = data as { cpf: string | null; phone: string | null } | null;
  return { cpf: row?.cpf ?? null, phone: row?.phone ?? null };
}

/** Uma caixa por pedido (os Correios aceitam um volume por envio), crescendo com as peças. */
export function buildVolume(units: number): MeCartInput['volumes'][number] {
  const count = Math.max(1, units);
  return {
    width: DEFAULT_ITEM_PACKAGE.widthCm,
    length: DEFAULT_ITEM_PACKAGE.lengthCm,
    height: Math.min(DEFAULT_ITEM_PACKAGE.heightCm * count, MAX_SIDE_CM),
    weight: Math.round(DEFAULT_ITEM_PACKAGE.weightKg * count * 1000) / 1000,
  };
}

/** Converte o pedido no corpo do POST /me/cart. Lista o que faltar em vez de enviar incompleto. */
export function buildCartInput(
  order: LabelOrderRow,
  contact: { cpf: string | null; phone: string | null },
  sender: SenderConfig,
  fromCep: string,
): MeCartInput {
  const parts = order.shipping_address_parts;
  const missing: string[] = [];
  if (!parts) missing.push('endereço salvo do cliente (o pedido usou endereço digitado)');
  if (!contact.cpf) missing.push('CPF do cliente');
  if (!contact.phone) missing.push('telefone do cliente');
  if (!order.shipping_service_id || order.shipping_service_id === FALLBACK_SHIPPING_SERVICE_ID) {
    missing.push('serviço de frete do Melhor Envio');
  }
  if (missing.length > 0 || !parts) throw missingData(missing);

  const items = order.order_items ?? [];
  const units = items.reduce((sum, i) => sum + Number(i.quantity), 0);
  const subtotal = Number(order.subtotalAmount ?? order.totalAmount);

  const from: MeParty = {
    name: sender.name,
    phone: sender.phone,
    email: sender.email,
    ...(sender.document ? { document: sender.document } : {}),
    ...(sender.company_document ? { company_document: sender.company_document } : {}),
    address: sender.address,
    ...(sender.complement ? { complement: sender.complement } : {}),
    number: sender.number,
    district: sender.district,
    city: sender.city,
    state_abbr: sender.state_abbr.toUpperCase(),
    country_id: 'BR',
    postal_code: fromCep,
  };
  const to: MeParty = {
    name: parts.recipientName,
    phone: contact.phone as string,
    ...(order.customerEmail ? { email: order.customerEmail } : {}),
    document: contact.cpf as string,
    address: parts.street,
    ...(parts.complement ? { complement: parts.complement } : {}),
    number: parts.number,
    district: parts.neighborhood,
    city: parts.city,
    state_abbr: parts.state,
    country_id: 'BR',
    postal_code: parts.cep,
  };

  return {
    service: order.shipping_service_id as number,
    from,
    to,
    products: items.map(i => ({
      name: i.productName,
      quantity: String(i.quantity),
      unitary_value: Number(i.price).toFixed(2),
    })),
    volumes: [buildVolume(units)],
    options: {
      insurance_value: Math.round(subtotal * 100) / 100,
      receipt: false,
      own_hand: false,
      reverse: false,
      non_commercial: true, // declaração de conteúdo (sem nota fiscal)
      platform: PLATFORM,
    },
  };
}

/**
 * Mudanças no pedido a partir do status do envio: código de rastreio (Correios, ou do
 * Melhor Envio enquanto não houver) e status Enviado/Entregue. Pedido em cancelamento não muda.
 */
export function trackingUpdate(
  order: Pick<LabelOrderRow, 'status' | 'tracking_code' | 'cancel_requested_at'>,
  shipment: MeShipmentStatus,
): Record<string, string> {
  const update: Record<string, string> = {};
  const code = shipment.tracking ?? shipment.melhorenvioTracking;
  if (code && code !== order.tracking_code) update.tracking_code = code.slice(0, 60);
  if (order.cancel_requested_at || order.status === 'cancelled') return update;
  if (shipment.deliveredAt && (order.status === 'processing' || order.status === 'shipped')) {
    update.status = 'delivered';
  } else if (shipment.postedAt && order.status === 'processing') {
    update.status = 'shipped';
  }
  return update;
}

/** Trava de geração vencida (processo caiu no meio) pode ser retomada depois deste tempo. */
const CLAIM_TTL_MS = 5 * 60_000;

async function saveOrder(supabase: SupabaseClient, orderId: string, values: Record<string, unknown>): Promise<void> {
  if (Object.keys(values).length === 0) return;
  const { error } = await supabase.from('orders').update(values).eq('id', orderId);
  if (error) throw dbError('saveOrder', error);
}

/**
 * Grava rastreio e status. O status só muda se o pedido continuar como foi lido e sem
 * cancelamento em andamento (o cliente pode ter cancelado durante a chamada ao Melhor Envio).
 */
async function saveTracking(
  supabase: SupabaseClient,
  order: Pick<LabelOrderRow, 'id' | 'status'>,
  update: Record<string, string>,
): Promise<string> {
  const { status, ...rest } = update;
  if (status) {
    const { data, error } = await supabase
      .from('orders')
      .update(update)
      .eq('id', order.id)
      .eq('status', order.status)
      .is('cancel_requested_at', null)
      .select('id');
    if (error) throw dbError('saveTracking', error);
    if ((data?.length ?? 0) > 0) return status;
  }
  await saveOrder(supabase, order.id, rest);
  return order.status;
}

/**
 * Trava atômica: só um pedido pago, sem cancelamento e sem etiqueta pode ser travado, e por
 * uma requisição de cada vez. O cancelamento do cliente recusa pedido travado ou com envio.
 */
async function claimLabel(supabase: SupabaseClient, orderId: string): Promise<void> {
  const staleBefore = new Date(Date.now() - CLAIM_TTL_MS).toISOString();
  const { data, error } = await supabase
    .from('orders')
    .update({ label_claimed_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('status', 'processing')
    .is('cancel_requested_at', null)
    .is('label_url', null)
    .or(`label_claimed_at.is.null,label_claimed_at.lt.${staleBefore}`)
    .select('id');
  if (error) throw dbError('claimLabel', error);
  if ((data?.length ?? 0) === 0) throw new AppError('LABEL_IN_PROGRESS');
}

/** Solta a trava quando a geração falhou (o id do envio, se existir, fica para retomar). */
async function releaseLabelClaim(deps: LabelDeps, orderId: string): Promise<void> {
  const { error } = await deps.supabase.from('orders').update({ label_claimed_at: null }).eq('id', orderId);
  if (error) deps.log?.error('label.release_claim_failed', { orderId, error });
}

/** Grava o id do envio só se ainda não houver um (nunca sobrescreve um envio já pago). */
async function saveShipmentId(deps: LabelDeps, orderId: string, shipmentId: string): Promise<string> {
  const { data, error } = await deps.supabase
    .from('orders')
    .update({ me_order_id: shipmentId })
    .eq('id', orderId)
    .is('me_order_id', null)
    .select('id');
  if (error) throw dbError('saveShipmentId', error);
  if ((data?.length ?? 0) > 0) return shipmentId;
  const current = await loadOrder(deps.supabase, orderId);
  deps.log?.warn('label.orphan_cart_item', { orderId, orphanShipmentId: shipmentId });
  return current.me_order_id ?? shipmentId;
}

export interface LabelResult {
  labelUrl: string;
  trackingCode: string | null;
}

/** Passos do Melhor Envio para um envio já no carrinho; cada um só roda se ainda faltar. */
async function payGenerateAndPrint(deps: LabelDeps, shipmentId: string): Promise<{ labelUrl: string; shipment: MeShipmentStatus }> {
  let shipment = await deps.me.tracking(shipmentId);
  if (!shipment.paidAt) {
    await deps.me.checkout(shipmentId);
    shipment = await deps.me.tracking(shipmentId);
  }
  if (!shipment.generatedAt) await deps.me.generate(shipmentId);
  const labelUrl = await deps.me.print(shipmentId);
  return { labelUrl, shipment: await deps.me.tracking(shipmentId) };
}

/**
 * Compra e gera a etiqueta do pedido pago. Travada (uma geração por vez, exclusiva com o
 * cancelamento do cliente) e retomável: o id do envio é gravado logo após o carrinho e cada
 * passo consulta o status para não pagar nem gerar duas vezes.
 */
export async function generateLabel(deps: LabelDeps, orderId: string): Promise<LabelResult> {
  const order = await loadOrder(deps.supabase, orderId);
  if (order.label_url) return { labelUrl: order.label_url, trackingCode: order.tracking_code };
  if (order.status !== 'processing' || order.cancel_requested_at) {
    throw missingData(['pedido pago e em preparação (status atual não permite etiqueta)']);
  }

  await claimLabel(deps.supabase, orderId);
  try {
    let shipmentId = order.me_order_id;
    if (!shipmentId) {
      const contact = await loadRecipientContact(deps.supabase, order.user_id);
      const input = buildCartInput(order, contact, deps.sender, deps.fromCep);
      shipmentId = await saveShipmentId(deps, orderId, await deps.me.addToCart(input));
    }

    const { labelUrl, shipment } = await payGenerateAndPrint(deps, shipmentId);
    const update = trackingUpdate(order, shipment);
    await saveOrder(deps.supabase, orderId, {
      label_url: labelUrl,
      label_generated_at: new Date().toISOString(),
      ...(update.tracking_code ? { tracking_code: update.tracking_code } : {}),
    });
    if (update.status) await saveTracking(deps.supabase, order, { status: update.status });
    deps.log?.info('label.generated', { orderId, shipmentId });
    return { labelUrl, trackingCode: update.tracking_code ?? order.tracking_code };
  } catch (err) {
    await releaseLabelClaim(deps, orderId);
    throw err;
  }
}

/** Atualiza rastreio e status de um pedido com etiqueta. */
export async function refreshTracking(
  deps: Pick<LabelDeps, 'supabase' | 'me' | 'log'>,
  orderId: string,
): Promise<{ trackingCode: string | null; status: string }> {
  const order = await loadOrder(deps.supabase, orderId);
  if (!order.me_order_id) {
    throw new AppError('LABEL_DATA_MISSING', { details: { missing: ['etiqueta gerada pela loja'] } });
  }
  const shipment = await deps.me.tracking(order.me_order_id);
  const update = trackingUpdate(order, shipment);
  const status = await saveTracking(deps.supabase, order, update);
  return { trackingCode: update.tracking_code ?? order.tracking_code, status };
}

/** Sincronização diária (cron): pedidos com etiqueta ainda em processamento ou enviados. */
export async function syncTrackings(deps: Pick<LabelDeps, 'supabase' | 'me' | 'log'>): Promise<number> {
  const { data, error } = await deps.supabase
    .from('orders')
    .select('id')
    .not('me_order_id', 'is', null)
    .in('status', ['processing', 'shipped'])
    .order('label_generated_at', { ascending: true })
    .limit(SYNC_LIMIT);
  if (error) throw dbError('syncTrackings', error);

  let synced = 0;
  for (const row of (data ?? []) as Array<{ id: string }>) {
    try {
      await refreshTracking(deps, row.id);
      synced += 1;
    } catch (err) {
      deps.log?.warn('label.sync_failed', { orderId: row.id, error: err });
    }
  }
  return synced;
}
