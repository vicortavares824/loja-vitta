import { Truck } from 'lucide-react';
import type { ShippingOption } from '../../types/checkout';
import { cepDigits } from '../../hooks/useShippingQuote';

export interface ShippingSelectorProps {
  cep: string;
  onCepChange: (cep: string) => void;
  options: ShippingOption[];
  selectedId: number | null;
  onSelect: (serviceId: number) => void;
  isQuoting: boolean;
  formatPrice: (value: number) => string;
}

const formatCepInput = (value: string): string => {
  const digits = cepDigits(value);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};

const deliveryLabel = (days: number): string => `${days} ${days === 1 ? 'dia útil' : 'dias úteis'}`;

/** CEP de entrega e lista de opções de frete (Correios via Melhor Envio). */
export function ShippingSelector({
  cep,
  onCepChange,
  options,
  selectedId,
  onSelect,
  isQuoting,
  formatPrice,
}: ShippingSelectorProps) {
  const complete = cepDigits(cep).length === 8;

  return (
    <div className="space-y-2">
      <label
        htmlFor="shipping-cep"
        className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-300"
      >
        <Truck className="w-4 h-4" aria-hidden="true" />
        CEP de entrega
      </label>
      <input
        id="shipping-cep"
        value={formatCepInput(cep)}
        onChange={e => onCepChange(cepDigits(e.target.value))}
        inputMode="numeric"
        autoComplete="postal-code"
        placeholder="00000-000"
        className="w-full min-h-[44px] bg-black/60 border border-white/15 rounded-full px-4 text-xs text-white placeholder-gray-500"
      />

      {isQuoting && (
        <p className="text-[11px] text-gray-400" aria-live="polite">
          Calculando frete...
        </p>
      )}

      {!isQuoting && complete && options.length === 0 && (
        <p className="text-[11px] text-red-300" aria-live="polite">
          Nenhuma opção de entrega para este CEP. Confira o número.
        </p>
      )}

      {!isQuoting && options.length > 0 && (
        <div role="radiogroup" aria-label="Opções de frete" className="space-y-1.5">
          {options.map(option => {
            const checked = option.serviceId === selectedId;
            const title = [option.company, option.name].filter(Boolean).join(' ');
            return (
              <button
                key={option.serviceId}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => onSelect(option.serviceId)}
                className={`w-full min-h-[44px] flex items-center justify-between gap-3 rounded-2xl border px-4 py-2 text-left text-xs ${
                  checked ? 'bg-white text-black border-white' : 'border-white/15 bg-white/5 text-white'
                }`}
              >
                <span className="min-w-0">
                  <span className="block font-bold">{title}</span>
                  {option.deliveryDays !== null && (
                    <span className={checked ? 'text-gray-600' : 'text-gray-400'}>
                      {deliveryLabel(option.deliveryDays)}
                    </span>
                  )}
                </span>
                <span className="font-extrabold whitespace-nowrap">
                  {option.priceCents === 0 ? 'GRÁTIS' : formatPrice(option.priceCents / 100)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
