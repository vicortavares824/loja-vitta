/**
 * Tipos do perfil do cliente (dados pessoais e endereços salvos).
 * Mapeiam as tabelas customer_details e customer_addresses
 * (supabase/migrations/20261124000000_customer_profile.sql).
 */

/** customer_details: phone e cpf guardados só com dígitos. */
export interface CustomerDetails {
  phone: string | null;
  cpf: string | null;
}

/** customer_addresses (recipient_name -> recipientName, is_default -> isDefault, created_at -> createdAt). */
export interface CustomerAddress {
  id: string;
  label: string | null;
  recipientName: string;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  isDefault: boolean;
  createdAt: string;
}

export type CustomerAddressInput = Omit<CustomerAddress, 'id' | 'createdAt'>;
