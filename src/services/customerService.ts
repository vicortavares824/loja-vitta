/**
 * Customer Service
 * Dados pessoais (telefone, CPF) e endereços salvos do cliente, mais consulta de CEP.
 * Layer: services — depends only on types and config.
 *
 * LGPD: o CPF é dado pessoal; não registrar em logs nem em mensagens de erro.
 */
import type { CustomerAddress, CustomerAddressInput, CustomerDetails } from '../types/customer';
import { supabase } from '../config/supabase';

const GENERIC_ERROR = 'Não foi possível concluir a operação. Tente novamente.';
const AUTH_ERROR = 'Faça login para continuar.';
const MAX_ADDRESSES = 10;
const MAX_FORMATTED_ADDRESS = 300;
const CEP_TIMEOUT_MS = 5000;

// ---------------------------------------------------------------------------
// Helpers puros
// ---------------------------------------------------------------------------

export const onlyDigits = (value: string): string => value.replace(/\D/g, '');

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const check = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) sum += Number(cpf[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(cpf[9]) && check(10) === Number(cpf[10]);
}

export function formatCep(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function formatCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// ---------------------------------------------------------------------------
// Internos
// ---------------------------------------------------------------------------

interface AddressRow {
  id: string;
  label: string | null;
  recipient_name: string;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  is_default: boolean;
  created_at: string;
}

const ADDRESS_COLUMNS =
  'id, label, recipient_name, cep, street, number, complement, neighborhood, city, state, is_default, created_at';

const mapAddress = (row: AddressRow): CustomerAddress => ({
  id: row.id,
  label: row.label,
  recipientName: row.recipient_name,
  cep: row.cep,
  street: row.street,
  number: row.number,
  complement: row.complement,
  neighborhood: row.neighborhood,
  city: row.city,
  state: row.state,
  isDefault: row.is_default,
  createdAt: row.created_at
});

/** Registra só o código do erro (sem payload, para não vazar CPF) e devolve um Error em pt-BR. */
function toError(error: { code?: string } | null | undefined, fallback = GENERIC_ERROR): Error {
  if (error?.code === '23514') {
    return new Error(`Limite de ${MAX_ADDRESSES} endereços atingido ou dados inválidos.`);
  }
  if (error?.code === '42501') return new Error(AUTH_ERROR);
  return new Error(fallback);
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data?.session?.user?.id;
  if (!id) throw new Error(AUTH_ERROR);
  return id;
}

const emptyToNull = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
};

interface AddressPayload {
  label: string | null;
  recipient_name: string;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
}

function buildAddressPayload(input: CustomerAddressInput): AddressPayload {
  const recipientName = input.recipientName.trim();
  const street = input.street.trim();
  const number = input.number.trim();
  const neighborhood = input.neighborhood.trim();
  const city = input.city.trim();
  const state = input.state.trim().toUpperCase();
  const cep = onlyDigits(input.cep);
  const label = emptyToNull(input.label);
  const complement = emptyToNull(input.complement);

  if (!recipientName) throw new Error('Informe o nome do destinatário.');
  if (recipientName.length > 100) throw new Error('O nome do destinatário deve ter até 100 caracteres.');
  if (cep.length !== 8) throw new Error('Informe um CEP válido com 8 dígitos.');
  if (!street) throw new Error('Informe a rua.');
  if (street.length > 150) throw new Error('A rua deve ter até 150 caracteres.');
  if (!number) throw new Error('Informe o número.');
  if (number.length > 20) throw new Error('O número deve ter até 20 caracteres.');
  if (!neighborhood) throw new Error('Informe o bairro.');
  if (neighborhood.length > 100) throw new Error('O bairro deve ter até 100 caracteres.');
  if (!city) throw new Error('Informe a cidade.');
  if (city.length > 100) throw new Error('A cidade deve ter até 100 caracteres.');
  if (!/^[A-Z]{2}$/.test(state)) throw new Error('Informe a UF com 2 letras.');
  if (label && label.length > 40) throw new Error('O apelido deve ter até 40 caracteres.');
  if (complement && complement.length > 100) throw new Error('O complemento deve ter até 100 caracteres.');

  return {
    label,
    recipient_name: recipientName,
    cep,
    street,
    number,
    complement,
    neighborhood,
    city,
    state
  };
}

/** Desmarca o endereço padrão atual (o índice único parcial só admite um por usuário). */
async function clearDefault(userId: string, exceptId?: string): Promise<void> {
  let query = supabase
    .from('customer_addresses')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('is_default', true);
  if (exceptId) query = query.neq('id', exceptId);
  const { error } = await query;
  if (error) throw toError(error);
}

// ---------------------------------------------------------------------------
// Dados pessoais
// ---------------------------------------------------------------------------

export async function getDetails(): Promise<CustomerDetails> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('customer_details')
    .select('phone, cpf')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw toError(error, 'Não foi possível carregar seus dados.');
  return { phone: data?.phone ?? null, cpf: data?.cpf ?? null };
}

export async function saveDetails(input: CustomerDetails): Promise<CustomerDetails> {
  const userId = await requireUserId();
  const phoneDigits = onlyDigits(input.phone ?? '');
  const cpfDigits = onlyDigits(input.cpf ?? '');
  const phone = phoneDigits === '' ? null : phoneDigits;
  const cpf = cpfDigits === '' ? null : cpfDigits;

  if (phone && (phone.length < 10 || phone.length > 11)) {
    throw new Error('Informe um telefone válido com DDD (10 ou 11 dígitos).');
  }
  if (cpf && !isValidCpf(cpf)) throw new Error('Informe um CPF válido.');

  const { error } = await supabase
    .from('customer_details')
    .upsert({ user_id: userId, phone, cpf }, { onConflict: 'user_id' });
  if (error) throw toError(error, 'Não foi possível salvar seus dados.');
  return { phone, cpf };
}

// ---------------------------------------------------------------------------
// Endereços
// ---------------------------------------------------------------------------

export async function listAddresses(): Promise<CustomerAddress[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('customer_addresses')
    .select(ADDRESS_COLUMNS)
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw toError(error, 'Não foi possível carregar seus endereços.');
  return ((data ?? []) as AddressRow[]).map(mapAddress);
}

export async function createAddress(input: CustomerAddressInput): Promise<CustomerAddress> {
  const userId = await requireUserId();
  const payload = buildAddressPayload(input);

  const { count, error: countError } = await supabase
    .from('customer_addresses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (countError) throw toError(countError, 'Não foi possível salvar o endereço.');
  if ((count ?? 0) >= MAX_ADDRESSES) {
    throw new Error(`Você pode salvar até ${MAX_ADDRESSES} endereços.`);
  }

  const makeDefault = input.isDefault || (count ?? 0) === 0;
  if (makeDefault) await clearDefault(userId);

  const { data, error } = await supabase
    .from('customer_addresses')
    .insert({ ...payload, user_id: userId, is_default: makeDefault })
    .select(ADDRESS_COLUMNS)
    .single();
  if (error || !data) throw toError(error, 'Não foi possível salvar o endereço.');
  return mapAddress(data as AddressRow);
}

export async function updateAddress(id: string, input: CustomerAddressInput): Promise<CustomerAddress> {
  const userId = await requireUserId();
  const payload = buildAddressPayload(input);

  if (input.isDefault) await clearDefault(userId, id);

  const { data, error } = await supabase
    .from('customer_addresses')
    .update({ ...payload, is_default: input.isDefault })
    .eq('id', id)
    .eq('user_id', userId)
    .select(ADDRESS_COLUMNS)
    .maybeSingle();
  if (error) throw toError(error, 'Não foi possível atualizar o endereço.');
  if (!data) throw new Error('Endereço não encontrado.');
  return mapAddress(data as AddressRow);
}

export async function deleteAddress(id: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from('customer_addresses').delete().eq('id', id).eq('user_id', userId);
  if (error) throw toError(error, 'Não foi possível excluir o endereço.');
}

export async function setDefaultAddress(id: string): Promise<void> {
  const userId = await requireUserId();
  await clearDefault(userId, id);
  const { data, error } = await supabase
    .from('customer_addresses')
    .update({ is_default: true })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();
  if (error) throw toError(error, 'Não foi possível definir o endereço padrão.');
  if (!data) throw new Error('Endereço não encontrado.');
}

// ---------------------------------------------------------------------------
// CEP e formatação
// ---------------------------------------------------------------------------

export interface CepLookupResult {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

export async function lookupCep(cep: string): Promise<CepLookupResult> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) throw new Error('Informe um CEP válido com 8 dígitos.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CEP_TIMEOUT_MS);
  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: controller.signal });
    if (!response.ok) throw new Error('Não foi possível consultar o CEP agora. Preencha o endereço manualmente.');
    const body = (await response.json()) as {
      erro?: boolean | string;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (body.erro) throw new Error('CEP não encontrado.');
    return {
      street: body.logradouro ?? '',
      neighborhood: body.bairro ?? '',
      city: body.localidade ?? '',
      state: (body.uf ?? '').toUpperCase()
    };
  } catch (err) {
    if (err instanceof Error && (err.message === 'CEP não encontrado.' || err.message.startsWith('Não foi possível'))) {
      throw err;
    }
    throw new Error('Não foi possível consultar o CEP agora. Preencha o endereço manualmente.');
  } finally {
    clearTimeout(timer);
  }
}

/** Endereço em uma linha para o checkout (limite de 300 caracteres). */
export function formatAddress(address: CustomerAddress | CustomerAddressInput): string {
  const streetPart = [address.street, address.number, address.complement].filter(Boolean).join(', ');
  const text =
    `${streetPart} - ${address.neighborhood}, ${address.city}/${address.state}, ` +
    `CEP ${formatCep(address.cep)} (A/C ${address.recipientName})`;
  return text.length > MAX_FORMATTED_ADDRESS ? `${text.slice(0, MAX_FORMATTED_ADDRESS - 1)}…` : text;
}
