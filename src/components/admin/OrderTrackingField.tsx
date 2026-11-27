import { useState } from 'react';
import { tomatoApi } from '../../services/tomatoApi';

export interface OrderTrackingFieldProps {
  orderId: string;
  initialCode: string | null | undefined;
  onSaved: (message: string, type: 'success' | 'error') => void;
}

const MAX_TRACKING_LENGTH = 60;

/** Campo do admin para informar o código de rastreio após postar o pedido. */
export function OrderTrackingField({ orderId, initialCode, onSaved }: OrderTrackingFieldProps) {
  const [code, setCode] = useState(initialCode ?? '');
  const [saving, setSaving] = useState(false);
  const inputId = `tracking-${orderId}`;

  const save = async () => {
    setSaving(true);
    try {
      await tomatoApi.setOrderTracking(orderId, code);
      onSaved(code.trim() ? 'Código de rastreio salvo.' : 'Código de rastreio removido.', 'success');
    } catch {
      onSaved('Não foi possível salvar o rastreio.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="text-gray-400">
        Código de rastreio:
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().slice(0, MAX_TRACKING_LENGTH))}
          placeholder="Ex.: AA123456789BR"
          className="flex-1 min-w-0 min-h-[36px] bg-black border border-white/20 rounded-xl px-3 font-mono text-white"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving || code.trim() === (initialCode ?? '')}
          className="min-h-[36px] px-3 rounded-xl bg-white text-black font-bold uppercase tracking-wider disabled:opacity-40"
        >
          {saving ? '...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
