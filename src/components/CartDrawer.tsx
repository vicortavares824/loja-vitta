import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCart } from '../context/CartContext';
import { useOptionalAuth } from '../context/AuthContext';
import { checkoutService, CheckoutError, CHECKOUT_ERROR_MESSAGES_PT } from '../services/checkoutService';
import type {
  CardPaymentInput,
  CheckoutItemInput,
  CheckoutRequest,
  CheckoutResponse,
  PaymentMethod,
} from '../types/checkout';
import { CardPaymentBrick } from './CardPaymentBrick';
import { ShippingSelector } from './cart/ShippingSelector';
import { CartItemRow } from './cart/CartItemRow';
import { CartLockedView } from './cart/CartLockedView';
import { CartSuccessView } from './cart/CartSuccessView';
import { Sheet } from './ui/Sheet';
import { cepDigits, useShippingQuote } from '../hooks/useShippingQuote';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { EASE_OUT } from './home/motionTokens';
import { newUuid } from '../services/uuid';

import * as customerService from '../services/customerService';
import type { CustomerAddress } from '../types/customer';

const OTHER_ADDRESS = '__other__';
/** Espelha FREE_SHIPPING_THRESHOLD_CENTS em api/_lib/config/shipping.ts. */
const FREE_SHIPPING_THRESHOLD = 1500;

type Step = 'bag' | 'checkout';

export interface CartDrawerProps {
  onNavigate?: (tab: string) => void;
}

export function CartDrawer({ onNavigate }: CartDrawerProps) {
  const { cart, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, clearCart, subtotal, formatPrice, showToast } =
    useCart();

  const auth = useOptionalAuth();
  const user = auth?.user ?? null;
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const reduced = usePrefersReducedMotion();

  const [step, setStep] = useState<Step>('bag');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [result, setResult] = useState<CheckoutResponse | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>('pending_payment');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [address, setAddress] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(OTHER_ADDRESS);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | undefined>(undefined);
  const [shippingCep, setShippingCep] = useState('');

  const mpPublicKey = (import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY as string | undefined) || '';
  const cardEnabled = mpPublicKey.length > 0;

  const idempotencyKey = useRef<string>(newUuid());
  const renewKey = () => {
    idempotencyKey.current = newUuid();
  };

  const buildItems = (): CheckoutItemInput[] =>
    cart.map((item) => ({
      productId: String(item.product.id),
      color: item.selectedColor.name,
      size: item.selectedSize,
      quantity: item.quantity,
    }));

  // Mudanca no carrinho: nova chave e cotacao anterior descartada.
  const cartSignature = JSON.stringify(cart.map((i) => [i.product.id, i.selectedColor.name, i.selectedSize, i.quantity]));
  useEffect(() => {
    idempotencyKey.current = newUuid();
  }, [cartSignature]);

  // Sacola esvaziada durante o checkout: volta para a lista.
  useEffect(() => {
    if (cart.length === 0 && !checkoutSuccess) setStep('bag');
  }, [cart.length, checkoutSuccess]);

  const handleCheckoutError = (err: unknown) => {
    if (err instanceof CheckoutError) {
      if (err.code === 'PRICE_CHANGED' || err.code === 'INSUFFICIENT_STOCK' || err.code === 'IDEMPOTENCY_KEY_REUSED') {
        renewKey();
      }
      if (err.code === 'INVALID_COUPON' || err.code === 'COUPON_NOT_ELIGIBLE') {
        setAppliedCoupon(undefined);
      }
      // NETWORK_ERROR mantem a chave para repetir a mesma requisicao com seguranca.
      showToast(err.message, 'error');
    } else {
      showToast(CHECKOUT_ERROR_MESSAGES_PT.INTERNAL_ERROR, 'error');
    }
  };

  // Frete e total calculados no servidor a partir do CEP (Melhor Envio).
  const shipping = useShippingQuote({
    items: buildItems(),
    itemsKey: cartSignature,
    cep: shippingCep,
    couponCode: appliedCoupon,
    enabled: isCartOpen && isAuthenticated && !checkoutSuccess,
    onError: handleCheckoutError,
  });
  const pricing = shipping.pricing;

  // Polling do status do pedido Pix a cada 5 s.
  const pixOrderId = result?.payment.kind === 'pix' ? result.orderId : null;
  useEffect(() => {
    if (!pixOrderId || orderStatus !== 'pending_payment') return;
    const timer = setInterval(async () => {
      try {
        const status = await checkoutService.getOrderStatus(pixOrderId);
        setOrderStatus(status);
      } catch {
        /* tenta novamente no proximo ciclo */
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [pixOrderId, orderStatus]);

  // Endereços salvos: carregados uma vez por abertura do carrinho (falha não bloqueia o checkout).
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!isCartOpen || !isAuthenticated || !userId) return;
    let cancelled = false;
    customerService
      .listAddresses()
      .then((list) => {
        if (cancelled) return;
        setSavedAddresses(list);
        const preferred = list.find((a) => a.isDefault) ?? list[0];
        if (preferred) {
          setSelectedAddressId(preferred.id);
          setAddress(customerService.formatAddress(preferred).slice(0, 300));
          setShippingCep(cepDigits(preferred.cep));
        }
      })
      .catch(() => {
        if (!cancelled) setSavedAddresses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isCartOpen, isAuthenticated, userId]);

  const handleSelectAddress = (id: string) => {
    setSelectedAddressId(id);
    if (id === OTHER_ADDRESS) {
      setAddress('');
      setShippingCep('');
      return;
    }
    const found = savedAddresses.find((a) => a.id === id);
    if (found) {
      setAddress(customerService.formatAddress(found).slice(0, 300));
      setShippingCep(cepDigits(found.cep));
    }
  };

  const navigateAway = (tab: 'login-client' | 'signup-client' | 'profile') => {
    setIsCartOpen(false);
    if (onNavigate) {
      onNavigate(tab);
      return;
    }
    const path = tab === 'login-client' ? '/login' : tab === 'signup-client' ? '/signup' : '/profile';
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeDrawer = () => {
    setIsCartOpen(false);
    setCheckoutSuccess(false);
    setResult(null);
    setStep('bag');
  };

  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShippingProgress = Math.min(1, subtotal / FREE_SHIPPING_THRESHOLD);

  // O hook refaz a cotacao com o cupom; cupom invalido volta como erro e e descartado.
  const handleApplyCoupon = () => {
    setAppliedCoupon(couponInput.trim() || undefined);
  };

  const submitCheckout = async (card?: CardPaymentInput) => {
    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      showToast('Informe o endereço de entrega.', 'error');
      throw new Error('address-required');
    }
    const selectedShipping = shipping.selected;
    if (!selectedShipping || cepDigits(shippingCep).length !== 8) {
      showToast('Informe o CEP e escolha uma opção de frete.', 'error');
      throw new Error('shipping-required');
    }
    const request: CheckoutRequest = {
      items: buildItems(),
      // Só o cupom aplicado (o mesmo da cotação exibida e do valor do Brick).
      couponCode: appliedCoupon,
      paymentMethod,
      shippingAddress: trimmedAddress.slice(0, 300),
      shippingCep: cepDigits(shippingCep),
      shippingServiceId: selectedShipping.serviceId,
      // Endereço salvo permite gerar a etiqueta automática (o servidor confere dono e CEP).
      ...(selectedAddressId !== OTHER_ADDRESS ? { shippingAddressId: selectedAddressId } : {}),
      ...(paymentMethod === 'card' && card ? { card } : {}),
    };

    setIsCheckingOut(true);
    try {
      const res = await checkoutService.createCheckout(request, idempotencyKey.current);
      renewKey();
      setResult(res);
      setOrderStatus(res.payment.kind === 'card' && res.payment.status === 'approved' ? 'processing' : res.status);
      setCheckoutSuccess(true);
      clearCart();
      if (!reduced) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#f2f0eb', '#8a8a86', '#d9d6d0'] });
      }
    } catch (err) {
      handleCheckoutError(err);
      throw err;
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handlePixCheckout = () => {
    submitCheckout().catch(() => undefined);
  };

  const copyPix = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Código Pix copiado.', 'success');
    } catch {
      showToast('Não foi possível copiar. Selecione o código manualmente.', 'error');
    }
  };

  const isPaid = orderStatus !== 'pending_payment' && orderStatus !== 'pending' && orderStatus !== 'cancelled';
  // Sem cotacao ainda (sem CEP), o total mostra so os produtos.
  const displayTotal = pricing ? pricing.totalCents / 100 : subtotal;
  const canPay = shipping.selected !== null && !shipping.isQuoting;
  const shippingLabel = shipping.selected
    ? shipping.selected.priceCents === 0
      ? 'Grátis'
      : formatPrice(shipping.selected.priceCents / 100)
    : '—';
  const itemsCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const locked = !isAuthenticated || !user;
  const view: 'locked' | 'success' | Step = locked ? 'locked' : checkoutSuccess ? 'success' : step;

  const title =
    view === 'locked'
      ? 'Sacola'
      : view === 'success'
        ? 'Pedido'
        : view === 'checkout'
          ? 'Entrega e pagamento'
          : `Sacola (${itemsCount})`;

  const footer =
    view === 'bag' && cart.length > 0 ? (
      <div className="space-y-3">
        <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
        <button type="button" onClick={() => setStep('checkout')} className="btn-primary group w-full">
          Continuar
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.75} />
        </button>
      </div>
    ) : view === 'checkout' ? (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <SummaryRow label="Produtos" value={formatPrice(subtotal)} muted />
          <SummaryRow label={`Frete${shipping.selected ? ` · ${shipping.selected.name}` : ''}`} value={shippingLabel} muted />
          {pricing && pricing.discountCents > 0 && (
            <SummaryRow
              label={`Desconto${pricing.couponCode ? ` · ${pricing.couponCode}` : ''}`}
              value={`− ${formatPrice(pricing.discountCents / 100)}`}
              muted
            />
          )}
          <SummaryRow label="Total" value={formatPrice(displayTotal)} strong />
        </div>
        {!canPay ? (
          <p className="eyebrow py-2 text-center">Informe o CEP e escolha o frete para finalizar</p>
        ) : paymentMethod === 'pix' || !cardEnabled ? (
          <button type="button" onClick={handlePixCheckout} disabled={isCheckingOut} className="btn-primary w-full">
            {isCheckingOut ? 'Processando…' : `Pagar com Pix — ${formatPrice(displayTotal)}`}
          </button>
        ) : (
          <p className="eyebrow py-2 text-center">Preencha os dados do cartão acima</p>
        )}
      </div>
    ) : undefined;

  const swap = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: step === 'checkout' ? 16 : -16 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, transition: { duration: 0.12 } },
      };

  return (
    <Sheet open={isCartOpen} onClose={closeDrawer} title={title} desktop="right" widthClassName="md:max-w-[480px]" footer={footer}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={view} {...swap} transition={{ duration: 0.25, ease: EASE_OUT }} className="min-h-full">
          {view === 'locked' && (
            <CartLockedView onSignUp={() => navigateAway('signup-client')} onLogin={() => navigateAway('login-client')} />
          )}

          {view === 'success' && (
            <CartSuccessView
              result={result}
              orderStatus={orderStatus}
              isPaid={isPaid}
              onCopyPix={copyPix}
              onContinue={closeDrawer}
            />
          )}

          {view === 'bag' && (
            <div className="px-5 md:px-6">
              {cart.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="eyebrow mb-3">Sacola vazia</p>
                  <p className="mb-8 text-paper-2">Que tal começar pelo essencial?</p>
                  <button type="button" onClick={closeDrawer} className="btn-secondary">
                    Continuar comprando
                  </button>
                </div>
              ) : (
                <>
                  <FreeShippingMeter
                    remaining={remainingForFreeShipping}
                    progress={freeShippingProgress}
                    formatPrice={formatPrice}
                  />
                  <ul className="border-t border-line">
                    <AnimatePresence initial={false}>
                      {cart.map((item) => (
                        <CartItemRow
                          key={`${item.product.id}-${item.selectedColor.name}-${item.selectedSize}`}
                          item={item}
                          formatPrice={formatPrice}
                          reduced={reduced}
                          onChangeQuantity={(delta) =>
                            updateQuantity(item.product.id, item.selectedColor.name, item.selectedSize, delta)
                          }
                          onRemove={() => removeFromCart(item.product.id, item.selectedColor.name, item.selectedSize)}
                        />
                      ))}
                    </AnimatePresence>
                  </ul>
                </>
              )}
            </div>
          )}

          {view === 'checkout' && (
            <div className="space-y-8 px-5 pb-6 md:px-6">
              <button
                type="button"
                onClick={() => setStep('bag')}
                className="eyebrow tap-target -ml-1 flex items-center gap-2 hover:text-paper"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                Voltar para a sacola ({itemsCount})
              </button>

              <CheckoutSection index={1} title="Entrega">
                {savedAddresses.length > 0 && (
                  <select
                    value={selectedAddressId}
                    onChange={(e) => handleSelectAddress(e.target.value)}
                    aria-label="Endereços salvos"
                    className="mb-3 min-h-11 w-full cursor-pointer border border-line-strong bg-ink px-3 text-sm text-paper focus:border-paper focus:outline-none"
                  >
                    {savedAddresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {`${a.label || a.recipientName} — ${a.street}, ${a.number} — ${a.city}/${a.state}`}
                      </option>
                    ))}
                    <option value={OTHER_ADDRESS}>Outro endereço</option>
                  </select>
                )}
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value.slice(0, 300))}
                  rows={2}
                  required
                  placeholder="Rua, número, complemento, bairro, cidade/UF"
                  aria-label="Endereço de entrega"
                  className="w-full resize-none border-b border-line-strong bg-transparent py-2 text-sm text-paper placeholder:text-mute focus:border-paper focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => navigateAway('profile')}
                  className="eyebrow link-line tap-target hover:text-paper"
                >
                  Gerenciar endereços
                </button>
              </CheckoutSection>

              <CheckoutSection index={2} title="Frete">
                <ShippingSelector
                  cep={shippingCep}
                  onCepChange={setShippingCep}
                  options={shipping.options}
                  selectedId={shipping.selectedId}
                  onSelect={shipping.select}
                  isQuoting={shipping.isQuoting}
                  formatPrice={formatPrice}
                />
              </CheckoutSection>

              <CheckoutSection index={3} title="Cupom">
                <div className="flex items-end gap-3 border-b border-line-strong focus-within:border-paper">
                  <input
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.slice(0, 32));
                      setAppliedCoupon(undefined);
                    }}
                    placeholder="Código do cupom"
                    aria-label="Cupom de desconto"
                    autoCapitalize="characters"
                    className="min-h-11 min-w-0 flex-1 bg-transparent font-mono text-sm uppercase text-paper placeholder:normal-case placeholder:text-mute focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={shipping.isQuoting || !couponInput.trim()}
                    className="tap-target font-display text-[12px] font-semibold uppercase tracking-[0.08em] disabled:opacity-40"
                  >
                    {shipping.isQuoting && appliedCoupon ? '…' : 'Aplicar'}
                  </button>
                </div>
                {pricing && pricing.discountCents > 0 && (
                  <p className="eyebrow mt-2 text-paper">Cupom aplicado: − {formatPrice(pricing.discountCents / 100)}</p>
                )}
              </CheckoutSection>

              <CheckoutSection index={4} title="Pagamento">
                <div className="grid grid-cols-2 border border-line-strong" role="radiogroup" aria-label="Forma de pagamento">
                  {(['pix', 'card'] as const).map((method) => {
                    const active = paymentMethod === method;
                    const disabled = method === 'card' && !cardEnabled;
                    return (
                      <button
                        key={method}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={disabled}
                        onClick={() => setPaymentMethod(method)}
                        className={`relative min-h-11 font-display text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors duration-200 disabled:opacity-40 ${
                          active ? 'text-ink' : 'text-paper'
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="payment-pill"
                            className="absolute inset-0 bg-paper"
                            transition={{ duration: reduced ? 0 : 0.3, ease: EASE_OUT }}
                          />
                        )}
                        <span className="relative">{method === 'pix' ? 'Pix' : 'Cartão'}</span>
                      </button>
                    );
                  })}
                </div>
                {!cardEnabled && <p className="mt-2 text-xs text-mute">Pagamento com cartão indisponível no momento. Use Pix.</p>}
                {paymentMethod === 'pix' && (
                  <p className="mt-3 text-xs text-mute">O QR Code aparece depois de finalizar. A confirmação é automática.</p>
                )}
                {canPay && paymentMethod === 'card' && cardEnabled && (
                  <div className="mt-4">
                    <CardPaymentBrick
                      publicKey={mpPublicKey}
                      amount={Math.round(displayTotal * 100) / 100}
                      onSubmit={(card) => submitCheckout(card)}
                      onLoadError={() => showToast('Não foi possível carregar o pagamento por cartão.', 'error')}
                    />
                  </div>
                )}
              </CheckoutSection>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Sheet>
  );
}

interface SummaryRowProps {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}

function SummaryRow({ label, value, muted = false, strong = false }: SummaryRowProps) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${strong ? 'border-t border-line pt-2' : ''}`}>
      <span className={strong ? 'font-display text-[12px] font-semibold uppercase tracking-[0.08em]' : 'eyebrow truncate'}>
        {label}
      </span>
      <span className={`shrink-0 font-mono tabular-nums ${strong ? 'text-base' : muted ? 'text-[13px] text-paper-2' : 'text-[13px]'}`}>
        {value}
      </span>
    </div>
  );
}

interface CheckoutSectionProps {
  index: number;
  title: string;
  children: ReactNode;
}

function CheckoutSection({ index, title, children }: CheckoutSectionProps) {
  return (
    <section className="border-t border-line pt-4">
      <h3 className="eyebrow mb-4 flex gap-3 text-paper">
        <span className="tabular-nums text-mute">{String(index).padStart(2, '0')}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

interface FreeShippingMeterProps {
  remaining: number;
  progress: number;
  formatPrice: (value: number) => string;
}

/** Barra de 1px que enche (scaleX) até o frete grátis. */
function FreeShippingMeter({ remaining, progress, formatPrice }: FreeShippingMeterProps) {
  return (
    <div className="pb-5 pt-1">
      <p className="mb-2.5 text-[13px] text-paper-2">
        {remaining > 0 ? (
          <>
            Faltam <span className="font-mono text-paper">{formatPrice(remaining)}</span> para o frete grátis
          </>
        ) : (
          <span className="text-paper">Você ganhou frete grátis</span>
        )}
      </p>
      <div className="h-px w-full bg-line-strong" aria-hidden>
        <div
          className="h-px w-full origin-left bg-paper transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
}
