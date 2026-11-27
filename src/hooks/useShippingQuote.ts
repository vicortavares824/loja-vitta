import { useEffect, useRef, useState } from 'react';
import { checkoutService } from '../services/checkoutService';
import type { CheckoutItemInput, PricingBreakdown, ShippingOption } from '../types/checkout';

const QUOTE_DEBOUNCE_MS = 400;
const CEP_LENGTH = 8;

export const cepDigits = (value: string): string => value.replace(/\D/g, '').slice(0, CEP_LENGTH);

export interface UseShippingQuoteArgs {
  items: CheckoutItemInput[];
  /** Muda sempre que o carrinho muda (evita comparar arrays a cada render). */
  itemsKey: string;
  cep: string;
  /** Cupom já aplicado pelo cliente (undefined = sem cupom). */
  couponCode: string | undefined;
  enabled: boolean;
  onError: (err: unknown) => void;
}

export interface ShippingQuoteState {
  options: ShippingOption[];
  selectedId: number | null;
  selected: ShippingOption | null;
  pricing: PricingBreakdown | null;
  isQuoting: boolean;
  select: (serviceId: number) => void;
}

/**
 * Cota frete e total no servidor (/api/quote) quando o CEP tem 8 dígitos ou há cupom.
 * Trocar a opção recalcula o total localmente: o desconto não depende do frete e os
 * preços das opções já chegam zerados quando o frete é grátis. O servidor confere tudo no checkout.
 */
export function useShippingQuote({
  items,
  itemsKey,
  cep,
  couponCode,
  enabled,
  onError,
}: UseShippingQuoteArgs): ShippingQuoteState {
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);

  const itemsRef = useRef(items);
  const onErrorRef = useRef(onError);
  itemsRef.current = items;
  onErrorRef.current = onError;

  const digits = cepDigits(cep);
  const hasCep = digits.length === CEP_LENGTH;

  useEffect(() => {
    setOptions([]);
    setSelectedId(null);
    setPricing(null);
    if (!enabled || (!hasCep && !couponCode) || itemsRef.current.length === 0) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      setIsQuoting(true);
      checkoutService
        .quote({
          items: itemsRef.current,
          couponCode,
          ...(hasCep ? { shippingCep: digits } : {}),
        })
        .then(res => {
          if (cancelled) return;
          setOptions(res.shippingOptions);
          setSelectedId(res.shippingServiceId);
          setPricing(res.pricing);
        })
        .catch(err => {
          if (!cancelled) onErrorRef.current(err);
        })
        .finally(() => {
          if (!cancelled) setIsQuoting(false);
        });
    }, QUOTE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setIsQuoting(false);
    };
  }, [enabled, itemsKey, digits, hasCep, couponCode]);

  const select = (serviceId: number) => {
    const option = options.find(o => o.serviceId === serviceId);
    if (!option) return;
    setSelectedId(serviceId);
    setPricing(prev =>
      prev
        ? {
            ...prev,
            shippingCents: option.priceCents,
            totalCents: prev.totalCents - prev.shippingCents + option.priceCents,
          }
        : prev
    );
  };

  const selected = options.find(o => o.serviceId === selectedId) ?? null;
  return { options, selectedId, selected, pricing, isQuoting, select };
}
