import { Truck } from 'lucide-react';
import type { ShippingOption } from '../../types/checkout';
import { cepDigits } from '../../hooks/useShippingQuote';
import { ShippingJourney } from './ShippingJourney';

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
  const selected = options.find(o => o.serviceId === selectedId) ?? null;

  return (
    <div className="space-y-3">
      <label htmlFor="shipping-cep" className="eyebrow flex items-center gap-2">
        <Truck className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
        CEP de entrega
      </label>
      <input
        id="shipping-cep"
        value={formatCepInput(cep)}
        onChange={e => onCepChange(cepDigits(e.target.value))}
        inputMode="numeric"
        autoComplete="postal-code"
        placeholder="00000-000"
        className="min-h-11 w-full border-b border-line-strong bg-transparent font-mono text-base tracking-[0.06em] text-paper placeholder:text-mute focus:border-paper focus:outline-none"
      />

      {isQuoting && (
        <p className="eyebrow pt-1" aria-live="polite">
          Calculando frete...
        </p>
      )}

      {!isQuoting && complete && options.length === 0 && (
        <p className="pt-1 text-xs text-danger" aria-live="polite">
          Nenhuma opção de entrega para este CEP. Confira o número.
        </p>
      )}

      {!isQuoting && options.length > 0 && (
        <div role="radiogroup" aria-label="Opções de frete" className="border-t border-line">
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
                className="flex min-h-14 w-full items-center gap-3 border-b border-line py-2 text-left text-sm"
              >
                <span
                  aria-hidden
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ${
                    checked ? 'border-paper' : 'border-line-strong'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full bg-paper transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                      checked ? 'scale-100' : 'scale-0'
                    }`}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${checked ? 'text-paper' : 'text-paper-2'}`}>{title}</span>
                  {option.deliveryDays !== null && (
                    <span className="eyebrow">{deliveryLabel(option.deliveryDays)}</span>
                  )}
                </span>
                <span className="whitespace-nowrap font-mono text-[13px] tabular-nums">
                  {option.priceCents === 0 ? 'Grátis' : formatPrice(option.priceCents / 100)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!isQuoting && selected && <ShippingJourney option={selected} />}
    </div>
  );
}
