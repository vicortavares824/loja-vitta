import React, { useEffect, useState } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import * as customerService from '../../services/customerService';
import type { CustomerDetails } from '../../types/customer';
import { fieldInput, fieldLabel } from './profileStyles';

const { formatPhone, formatCpf, isValidCpf, onlyDigits } = customerService;

/** Mostra só os 5 dígitos do meio: ***.456.789-** */
const maskCpf = (cpf: string): string => {
  const d = onlyDigits(cpf);
  if (d.length !== 11) return '***.***.***-**';
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
};

const inputClass = fieldInput;

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
    <section className="min-w-0 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="eyebrow text-paper">Dados pessoais</h3>
        {!loading && !loadError && !editing && (
          <button onClick={startEdit} className="btn-icon -mr-2" aria-label="Editar dados pessoais">
            <Pencil className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 text-mute motion-safe:animate-spin" />
        </div>
      ) : loadError ? (
        <p className="text-sm text-paper-2">Não foi possível carregar seus dados pessoais.</p>
      ) : editing ? (
        <div className="space-y-4">
          <label className="block">
            <span className={fieldLabel}>Telefone</span>
            <input
              value={phoneDraft}
              onChange={e => setPhoneDraft(formatPhone(e.target.value))}
              inputMode="numeric"
              autoComplete="tel"
              placeholder="(11) 91234-5678"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={fieldLabel}>CPF</span>
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
            <button onClick={save} disabled={saving} className="btn-primary flex-1">
              {saving && <Loader2 className="h-4 w-4 motion-safe:animate-spin" />} Salvar
            </button>
            <button onClick={() => setEditing(false)} disabled={saving} className="btn-secondary flex-1">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <span className={fieldLabel}>Telefone</span>
            <p className="flex min-h-12 items-center break-words border-b border-line">{details.phone ? formatPhone(details.phone) : 'Não informado'}</p>
          </div>
          <div>
            <span className={fieldLabel}>CPF</span>
            <p className="flex min-h-12 items-center break-words border-b border-line font-mono text-sm">{details.cpf ? maskCpf(details.cpf) : 'Não informado'}</p>
          </div>
        </div>
      )}
    </section>
  );
};
