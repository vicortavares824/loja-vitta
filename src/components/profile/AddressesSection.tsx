import React, { useEffect, useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, Star, Loader2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import * as customerService from '../../services/customerService';
import type { CustomerAddress, CustomerAddressInput } from '../../types/customer';
import { AddressForm } from './AddressForm';

const MAX_ADDRESSES = 10;

interface AddressesSectionProps {
  userName: string;
}

export const AddressesSection: React.FC<AddressesSectionProps> = ({ userName }) => {
  const { showToast } = useCart();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [formMode, setFormMode] = useState<'closed' | 'new' | string>('closed');
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => {
    setAddresses(await customerService.listAddresses());
  };

  useEffect(() => {
    let active = true;
    customerService
      .listAddresses()
      .then(data => { if (active) setAddresses(data); })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const atLimit = addresses.length >= MAX_ADDRESSES;

  const handleSubmit = async (input: CustomerAddressInput) => {
    if (formMode === 'new') {
      await customerService.createAddress(input);
    } else {
      await customerService.updateAddress(formMode, input);
    }
    await reload();
    setFormMode('closed');
    showToast('Endereço salvo.', 'success');
  };

  const handleDelete = async (address: CustomerAddress) => {
    if (!window.confirm('Excluir este endereço?')) return;
    setBusyId(address.id);
    try {
      await customerService.deleteAddress(address.id);
      await reload();
      showToast('Endereço excluído.', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Não foi possível excluir o endereço.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDefault = async (address: CustomerAddress) => {
    setBusyId(address.id);
    try {
      await customerService.setDefaultAddress(address.id);
      await reload();
      showToast('Endereço padrão atualizado.', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Não foi possível definir o endereço padrão.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const iconBtn = 'tap-target flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-50';

  return (
    <section className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-5 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-300 flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Meus endereços
        </h2>
        <button
          onClick={() => setFormMode('new')}
          disabled={atLimit || loading || loadError || formMode !== 'closed'}
          className="min-h-[44px] flex items-center justify-center gap-2 px-5 bg-white text-black rounded-full text-xs font-bold uppercase tracking-wider disabled:opacity-40"
        >
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </div>
      {atLimit && <p className="text-xs text-gray-400">Limite de {MAX_ADDRESSES} endereços atingido. Exclua um para adicionar outro.</p>}

      {formMode === 'new' && (
        <AddressForm defaultRecipient={userName} onSubmit={handleSubmit} onCancel={() => setFormMode('closed')} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : loadError ? (
        <p className="text-sm text-red-300 py-6 text-center">Não foi possível carregar seus endereços. Tente novamente mais tarde.</p>
      ) : addresses.length === 0 && formMode === 'closed' ? (
        <p className="text-sm text-gray-400 py-6 text-center">Você ainda não tem endereços salvos.</p>
      ) : (
        <ul className="space-y-4">
          {addresses.map(address =>
            formMode === address.id ? (
              <li key={address.id}>
                <AddressForm initial={address} defaultRecipient={userName} onSubmit={handleSubmit} onCancel={() => setFormMode('closed')} />
              </li>
            ) : (
              <li key={address.id} className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold break-words min-w-0">{address.label || address.recipientName}</span>
                  {address.isDefault && (
                    <span className="inline-flex px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border bg-green-500/15 text-green-300 border-green-500/30">
                      Padrão
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-300 break-words">{customerService.formatAddress(address)}</p>
                <div className="flex flex-wrap gap-2">
                  {!address.isDefault && (
                    <button onClick={() => handleDefault(address)} disabled={busyId === address.id} className={`${iconBtn} px-3 gap-2 text-xs font-bold`} aria-label="Definir como padrão">
                      <Star className="w-4 h-4" /> <span>Tornar padrão</span>
                    </button>
                  )}
                  <button onClick={() => setFormMode(address.id)} disabled={busyId === address.id || formMode !== 'closed'} className={iconBtn} aria-label="Editar endereço">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(address)} disabled={busyId === address.id} className={iconBtn} aria-label="Excluir endereço">
                    {busyId === address.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </section>
  );
};
