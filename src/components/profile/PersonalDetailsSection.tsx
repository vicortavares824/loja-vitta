import React, { useEffect, useState } from 'react';
import { IdCard, Pencil, Loader2, Check, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import * as customerService from '../../services/customerService';
import type { CustomerDetails } from '../../types/customer';

const { formatPhone, formatCpf, isValidCpf, onlyDigits } = customerService;

/** Mostra só os 5 dígitos do meio: ***.456.789-** */
const maskCpf = (cpf: string): string => {
  const d = onlyDigits(cpf);
  if (d.length !== 11) return '***.***.***-**';
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
};

const inputClass =
  'w-full min-w-0 min-h-[44px] bg-black/60 border border-white/20 rounded-xl px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40';

export const PersonalDetailsSection: React.FC = () => {
  const { showToast } = useCart();
  const [details, setDetails] = useState<CustomerDetails>({ phone: null, cpf: null });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [cpfDraft, setCpfDraft] = useState('');

  useEffect(() => {
    let active = true;
    customerService
      .getDetails()
      .then(data => { if (active) setDetails(data); })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const startEdit = () => {
    setPhoneDraft(details.phone ? formatPhone(details.phone) : '');
    setCpfDraft(details.cpf ? formatCpf(details.cpf) : '');
    setEditing(true);
  };

  const save = async () => {
    const phoneDigits = onlyDigits(phoneDraft);
    if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 11)) {
      showToast('Informe um telefone válido com DDD.', 'error');
      return;
    }
    if (cpfDraft && !isValidCpf(cpfDraft)) {
      showToast('Informe um CPF válido.', 'error');
      return;
    }
    setSaving(true);
    try {
      const saved = await customerService.saveDetails({ phone: phoneDigits, cpf: onlyDigits(cpfDraft) });
      setDetails(saved);
      setEditing(false);
      showToast('Dados pessoais salvos.', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Não foi possível salvar seus dados.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-5 h-fit min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-300 flex items-center gap-2">
          <IdCard className="w-4 h-4" /> Dados pessoais
        </h2>
        {!loading && !loadError && !editing && (
          <button onClick={startEdit} className="tap-target flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white" aria-label="Editar dados pessoais">
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : loadError ? (
        <p className="text-sm text-red-300">Não foi possível carregar seus dados pessoais.</p>
      ) : editing ? (
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[11px] uppercase font-bold tracking-wider text-gray-500">Telefone</span>
            <input
              value={phoneDraft}
              onChange={e => setPhoneDraft(formatPhone(e.target.value))}
              inputMode="numeric"
              autoComplete="tel"
              placeholder="(11) 91234-5678"
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] uppercase font-bold tracking-wider text-gray-500">CPF</span>
            <input
              value={cpfDraft}
              onChange={e => setCpfDraft(formatCpf(e.target.value))}
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              className={inputClass}
            />
          </label>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-full bg-white text-black text-xs font-bold uppercase tracking-wider disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salvar
            </button>
            <button onClick={() => setEditing(false)} disabled={saving} className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider">
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1">
            <span className="text-[11px] uppercase font-bold tracking-wider text-gray-500">Telefone</span>
            <p className="text-sm text-gray-200 break-words">{details.phone ? formatPhone(details.phone) : 'Não informado'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] uppercase font-bold tracking-wider text-gray-500">CPF</span>
            <p className="text-sm text-gray-200 break-words">{details.cpf ? maskCpf(details.cpf) : 'Não informado'}</p>
          </div>
        </div>
      )}
    </section>
  );
};
