import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import * as customerService from '../../services/customerService';
import type { CustomerAddress, CustomerAddressInput } from '../../types/customer';
import { fieldInput, fieldLabel } from './profileStyles';

const { formatCep, onlyDigits } = customerService;

const inputClass = fieldInput;
const labelClass = fieldLabel;

interface AddressFormProps {
  initial?: CustomerAddress;
  defaultRecipient: string;
  onSubmit: (input: CustomerAddressInput) => Promise<void>;
  onCancel: () => void;
}

export const AddressForm: React.FC<AddressFormProps> = ({ initial, defaultRecipient, onSubmit, onCancel }) => {
  const { showToast } = useCart();
  const [form, setForm] = useState<CustomerAddressInput>({
    label: initial?.label ?? '',
    recipientName: initial?.recipientName ?? defaultRecipient,
    cep: initial?.cep ? formatCep(initial.cep) : '',
    street: initial?.street ?? '',
    number: initial?.number ?? '',
    complement: initial?.complement ?? '',
    neighborhood: initial?.neighborhood ?? '',
    city: initial?.city ?? '',
    state: initial?.state ?? '',
    isDefault: initial?.isDefault ?? false
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof CustomerAddressInput>(key: K, value: CustomerAddressInput[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleCep = async (raw: string) => {
    const masked = formatCep(raw);
    set('cep', masked);
    if (onlyDigits(masked).length !== 8) return;
    setCepLoading(true);
    try {
      const found = await customerService.lookupCep(masked);
      setForm(prev => ({
        ...prev,
        street: found.street || prev.street,
        neighborhood: found.neighborhood || prev.neighborhood,
        city: found.city || prev.city,
        state: found.state || prev.state
      }));
    } catch (e: any) {
      showToast(e?.message || 'Não foi possível consultar o CEP. Preencha manualmente.', 'error');
    } finally {
      setCepLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível salvar o endereço.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="min-w-0 space-y-6 border border-line bg-ink-2 p-5 md:p-6">
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Rótulo (opcional)</span>
          <input value={form.label ?? ''} onChange={e => set('label', e.target.value)} maxLength={40} placeholder="Casa, Trabalho..." className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Destinatário</span>
          <input value={form.recipientName} onChange={e => set('recipientName', e.target.value)} maxLength={100} autoComplete="name" className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>CEP</span>
          <div className="relative">
            <input
              value={form.cep}
              onChange={e => handleCep(e.target.value)}
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="00000-000"
              className={inputClass}
            />
            {cepLoading && <Loader2 className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-mute motion-safe:animate-spin" />}
          </div>
        </label>
        <label className="block">
          <span className={labelClass}>Rua</span>
          <input value={form.street} onChange={e => set('street', e.target.value)} maxLength={150} autoComplete="street-address" className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Número</span>
          <input value={form.number} onChange={e => set('number', e.target.value)} maxLength={20} className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Complemento</span>
          <input value={form.complement ?? ''} onChange={e => set('complement', e.target.value)} maxLength={100} className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Bairro</span>
          <input value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} maxLength={100} className={inputClass} />
        </label>
        <div className="grid min-w-0 grid-cols-[1fr_5rem] gap-4">
          <label className="block min-w-0">
            <span className={labelClass}>Cidade</span>
            <input value={form.city} onChange={e => set('city', e.target.value)} maxLength={100} autoComplete="address-level2" className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>UF</span>
            <input value={form.state} onChange={e => set('state', e.target.value.toUpperCase().slice(0, 2))} maxLength={2} autoComplete="address-level1" className={inputClass} />
          </label>
        </div>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" checked={form.isDefault} onChange={e => set('isDefault', e.target.checked)} className="h-5 w-5 accent-paper" />
        Definir como endereço padrão
      </label>

      <div className="flex flex-col sm:flex-row gap-2">
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving && <Loader2 className="h-4 w-4 motion-safe:animate-spin" />} Salvar endereço
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="btn-secondary flex-1">
          Cancelar
        </button>
      </div>
    </form>
  );
};
