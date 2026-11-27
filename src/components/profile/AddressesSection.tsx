import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import * as customerService from '../../services/customerService';
import type { CustomerAddress, CustomerAddressInput } from '../../types/customer';
import { AddressForm } from './AddressForm';
import { sectionTitle } from './profileStyles';

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

  const iconBtn = 'btn-icon disabled:opacity-40';

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className={`${sectionTitle} mb-0`}>Endereços</h2>
        <button
          onClick={() => setFormMode('new')}
          disabled={atLimit || loading || loadError || formMode !== 'closed'}
          className="btn-secondary"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} /> Adicionar
        </button>
      </div>
      {atLimit && <p className="text-xs text-mute">Limite de {MAX_ADDRESSES} endereços atingido. Exclua um para adicionar outro.</p>}

      {formMode === 'new' && (
        <AddressForm defaultRecipient={userName} onSubmit={handleSubmit} onCancel={() => setFormMode('closed')} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 text-mute motion-safe:animate-spin" />
        </div>
      ) : loadError ? (
        <p className="border-y border-line py-8 text-center text-sm text-paper-2">Não foi possível carregar seus endereços. Tente novamente mais tarde.</p>
      ) : addresses.length === 0 && formMode === 'closed' ? (
        <p className="border-y border-line py-8 text-center text-sm text-paper-2">Você ainda não tem endereços salvos.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
          {addresses.map(address =>
            formMode === address.id ? (
              <li key={address.id} className="bg-ink sm:col-span-2">
                <AddressForm initial={address} defaultRecipient={userName} onSubmit={handleSubmit} onCancel={() => setFormMode('closed')} />
              </li>
            ) : (
              <li key={address.id} className="flex min-w-0 flex-col gap-3 bg-ink p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 break-words font-display text-sm font-semibold uppercase tracking-[0.04em]">{address.label || address.recipientName}</span>
                  {address.isDefault && (
                    <span className="eyebrow border border-paper px-2 py-0.5 text-paper">
                      Padrão
                    </span>
                  )}
                </div>
                <p className="flex-1 break-words text-sm text-paper-2">{customerService.formatAddress(address)}</p>
                <div className="-ml-2 flex flex-wrap items-center gap-1">
                  {!address.isDefault && (
                    <button onClick={() => handleDefault(address)} disabled={busyId === address.id} className="eyebrow link-line tap-target px-2 hover:text-paper disabled:opacity-40" aria-label="Definir como padrão">
                      Tornar padrão
                    </button>
                  )}
                  <button onClick={() => setFormMode(address.id)} disabled={busyId === address.id || formMode !== 'closed'} className={iconBtn} aria-label="Editar endereço">
                    <Pencil className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  <button onClick={() => handleDelete(address)} disabled={busyId === address.id} className={iconBtn} aria-label="Excluir endereço">
                    {busyId === address.id ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" /> : <Trash2 className="h-4 w-4" strokeWidth={1.5} />}
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
};
