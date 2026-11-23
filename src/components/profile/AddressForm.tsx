import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import * as customerService from '../../services/customerService';
import type { CustomerAddress, CustomerAddressInput } from '../../types/customer';

const { formatCep, onlyDigits } = customerService;

const inputClass =
  'w-full min-w-0 min-h-[44px] bg-black/60 border border-white/20 rounded-xl px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40';
const labelClass = 'text-[11px] uppercase font-bold tracking-wider text-gray-500';

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
    <form onSubmit={submit} className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-4 min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5">
          <span className={labelClass}>Rótulo (opcional)</span>
          <input value={form.label ?? ''} onChange={e => set('label', e.target.value)} maxLength={40} placeholder="Casa, Trabalho..." className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className={labelClass}>Destinatário</span>
          <input value={form.recipientName} onChange={e => set('recipientName', e.target.value)} maxLength={100} autoComplete="name" className={inputClass} />
        </label>
        <label className="block space-y-1.5">
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
            {cepLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />}
          </div>
        </label>
        <label className="block space-y-1.5">
          <span className={labelClass}>Rua</span>
          <input value={form.street} onChange={e => set('street', e.target.value)} maxLength={150} autoComplete="street-address" className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className={labelClass}>Número</span>
          <input value={form.number} onChange={e => set('number', e.target.value)} maxLength={20} className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className={labelClass}>Complemento</span>
          <input value={form.complement ?? ''} onChange={e => set('complement', e.target.value)} maxLength={100} className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className={labelClass}>Bairro</span>
          <input value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} maxLength={100} className={inputClass} />
        </label>
        <div className="grid grid-cols-[1fr_5rem] gap-4 min-w-0">
          <label className="block space-y-1.5 min-w-0">
            <span className={labelClass}>Cidade</span>
            <input value={form.city} onChange={e => set('city', e.target.value)} maxLength={100} autoComplete="address-level2" className={inputClass} />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>UF</span>
            <input value={form.state} onChange={e => set('state', e.target.value.toUpperCase().slice(0, 2))} maxLength={2} autoComplete="address-level1" className={inputClass} />
          </label>
        </div>
      </div>

      <label className="flex items-center gap-3 min-h-[44px] text-sm text-gray-200 cursor-pointer">
        <input type="checkbox" checked={form.isDefault} onChange={e => set('isDefault', e.target.checked)} className="w-5 h-5 accent-white" />
        Definir como endereço padrão
      </label>

      <div className="flex flex-col sm:flex-row gap-2">
        <button type="submit" disabled={saving} className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-full bg-white text-black text-xs font-bold uppercase tracking-wider disabled:opacity-50">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar endereço
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="flex-1 min-h-[44px] rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider">
          Cancelar
        </button>
      </div>
    </form>
  );
};
