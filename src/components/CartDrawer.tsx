import React, { useEffect, useRef, useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, Check, Sparkles, Lock, ShieldAlert, UserPlus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useOptionalAuth } from '../context/AuthContext';
import { checkoutService, CheckoutError, CHECKOUT_ERROR_MESSAGES_PT } from '../services/checkoutService';
import type {
  CardPaymentInput,
  CheckoutItemInput,
  CheckoutRequest,
  CheckoutResponse,
  PaymentMethod
} from '../types/checkout';
import { CardPaymentBrick } from './CardPaymentBrick';
import { ShippingSelector } from './cart/ShippingSelector';
import { cepDigits, useShippingQuote } from '../hooks/useShippingQuote';
import { Magnet } from './react-bits/Magnet';
import confetti from 'canvas-confetti';

import * as customerService from '../services/customerService';
import type { CustomerAddress } from '../types/customer';

const OTHER_ADDRESS = '__other__';

export interface CartDrawerProps {
  onNavigate?: (tab: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onNavigate }) => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal,
    formatPrice,
    showToast
  } = useCart();

  const auth = useOptionalAuth();
  const user = auth?.user ?? null;
  const isAuthenticated = auth?.isAuthenticated ?? false;

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

  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const renewKey = () => {
    idempotencyKey.current = crypto.randomUUID();
  };

  const buildItems = (): CheckoutItemInput[] =>
    cart.map(item => ({
      productId: String(item.product.id),
      color: item.selectedColor.name,
      size: item.selectedSize,
      quantity: item.quantity
    }));

  // Mudanca no carrinho: nova chave e cotacao anterior descartada.
  const cartSignature = JSON.stringify(
    cart.map(i => [i.product.id, i.selectedColor.name, i.selectedSize, i.quantity])
  );
  useEffect(() => {
    idempotencyKey.current = crypto.randomUUID();
  }, [cartSignature]);

  const handleCheckoutError = (err: unknown) => {
    if (err instanceof CheckoutError) {
      if (
        err.code === 'PRICE_CHANGED' ||
        err.code === 'INSUFFICIENT_STOCK' ||
        err.code === 'IDEMPOTENCY_KEY_REUSED'
      ) {
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
    onError: handleCheckoutError
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
      .then(list => {
        if (cancelled) return;
        setSavedAddresses(list);
        const preferred = list.find(a => a.isDefault) ?? list[0];
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

  if (!isCartOpen) return null;

  const handleSelectAddress = (id: string) => {
    setSelectedAddressId(id);
    if (id === OTHER_ADDRESS) {
      setAddress('');
      setShippingCep('');
      return;
    }
    const found = savedAddresses.find(a => a.id === id);
    if (found) {
      setAddress(customerService.formatAddress(found).slice(0, 300));
      setShippingCep(cepDigits(found.cep));
    }
  };

  const handleManageAddresses = () => {
    setIsCartOpen(false);
    if (onNavigate) {
      onNavigate('profile');
    } else {
      window.history.pushState({}, '', '/profile');
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const closeDrawer = () => {
    setIsCartOpen(false);
    setCheckoutSuccess(false);
    setResult(null);
  };

  const handleNavigateTo = (tab: 'login-client' | 'signup-client') => {
    setIsCartOpen(false);
    if (onNavigate) {
      onNavigate(tab);
    } else {
      const path = tab === 'login-client' ? '/login' : '/signup';
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const FREE_SHIPPING_THRESHOLD = 1500;
  const progressPercent = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  // O hook refaz a cotacao com o cupom; cupom invalido volta como erro e e descartado.
  const handleApplyCoupon = () => {
    setAppliedCoupon(couponInput.trim() || undefined);
  };

  const submitCheckout = async (card?: CardPaymentInput) => {
    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      showToast('Informe o endere\u00e7o de entrega.', 'error');
      throw new Error('address-required');
    }
    const selectedShipping = shipping.selected;
    if (!selectedShipping || cepDigits(shippingCep).length !== 8) {
      showToast('Informe o CEP e escolha uma op\u00e7\u00e3o de frete.', 'error');
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
      ...(paymentMethod === 'card' && card ? { card } : {})
    };

    setIsCheckingOut(true);
    try {
      const res = await checkoutService.createCheckout(request, idempotencyKey.current);
      renewKey();
      setResult(res);
      setOrderStatus(
        res.payment.kind === 'card' && res.payment.status === 'approved' ? 'processing' : res.status
      );
      setCheckoutSuccess(true);
      clearCart();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ffffff', '#000000', '#cccccc']
      });
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

  const isPaid = orderStatus !== 'pending_payment' && orderStatus !== 'pending' && orderStatus !== 'cancelled';
  // Sem cotacao ainda (sem CEP), o total mostra so os produtos.
  const displayTotal = pricing ? pricing.totalCents / 100 : subtotal;
  const canPay = shipping.selected !== null && !shipping.isQuoting;
  const shippingLabel = shipping.selected
    ? shipping.selected.priceCents === 0
      ? 'GR\u00c1TIS'
      : formatPrice(shipping.selected.priceCents / 100)
    : 'Informe o CEP';
  const copyPix = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('C\u00f3digo Pix copiado.', 'success');
    } catch {
      showToast('N\u00e3o foi poss\u00edvel copiar. Selecione o c\u00f3digo manualmente.', 'error');
    }
  };
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-full sm:max-w-md bg-[#111116] border-l border-white/15 flex flex-col justify-between shadow-2xl text-white">
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-white" />
              <h2 className="font-display font-extrabold text-xl text-white uppercase tracking-wider">Sua Sacola</h2>
            </div>
            <button
              onClick={closeDrawer}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Fechar carrinho"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* PROTEÇÃO: Estado Vazio Bloqueado (Unauthenticated Empty State) */}
          {!isAuthenticated || !user ? (
            <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 overflow-y-auto">
              <div className="my-auto text-center space-y-6">
                {/* Ícone com Aura de Proteção Luxury */}
                <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-white/5 border border-white/10 animate-pulse" />
                  <div className="w-18 h-18 rounded-full bg-gradient-to-b from-white/15 to-white/5 border border-white/20 flex items-center justify-center shadow-2xl">
                    <Lock className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Badge de Exclusividade */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase font-bold tracking-[0.2em] text-gray-300">
                  <ShieldAlert className="w-3.5 h-3.5 text-white" />
                  <span>Acesso Exclusivo</span>
                </div>

                {/* Título & Mensagem */}
                <div className="space-y-2.5 max-w-xs mx-auto">
                  <h3 className="font-display font-extrabold text-2xl text-white tracking-tight uppercase">
                    Sacola Bloqueada
                  </h3>
                  <p className="text-gray-400 text-xs sm:text-sm leading-relaxed font-light">
                    Para visualizar suas peças selecionadas, simular frete exclusivo e finalizar seu pedido, conecte-se ou crie sua conta na Vitta Basics.
                  </p>
                </div>

                {/* Benefícios Luxury Dark */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-left space-y-2.5 text-xs">
                  <div className="flex items-center gap-2.5 text-gray-300">
                    <Check className="w-4 h-4 text-white shrink-0" />
                    <span>Reserva e histórico de itens em tempo real</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-gray-300">
                    <Check className="w-4 h-4 text-white shrink-0" />
                    <span>Frete Grátis acima de R$ 1.500</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-gray-300">
                    <Check className="w-4 h-4 text-white shrink-0" />
                    <span>Checkout rápido e rastreamento de envio</span>
                  </div>
                </div>
              </div>

              {/* Botões CTA com visual Luxury Dark */}
              <div className="space-y-3 pt-6 border-t border-white/10">
                <Magnet strength={10}>
                  <button
                    onClick={() => handleNavigateTo('signup-client')}
                    className="w-full flex items-center justify-center gap-2.5 bg-white text-black font-extrabold text-xs uppercase tracking-widest py-4 px-6 rounded-full hover:bg-gray-200 transition-all duration-300 transform hover:scale-[1.02] shadow-2xl"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Criar minha conta para comprar</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Magnet>

                <button
                  onClick={() => handleNavigateTo('login-client')}
                  className="w-full py-3.5 px-6 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest transition-all text-center"
                >
                  Já possuo uma conta • Entrar
                </button>
              </div>
            </div>
          ) : checkoutSuccess ? (
            <div className="p-8 text-center my-auto space-y-6">
              <div className="w-20 h-20 rounded-full bg-white/10 border border-white text-white flex items-center justify-center mx-auto animate-bounce">
                <Sparkles className="w-10 h-10" />
              </div>
              <h3 className="font-display font-extrabold text-2xl text-white">
                {orderStatus === 'cancelled'
                  ? 'PEDIDO CANCELADO'
                  : isPaid
                    ? 'PAGAMENTO CONFIRMADO!'
                    : 'AGUARDANDO PAGAMENTO'}
              </h3>
              <p className="text-gray-300 text-xs leading-relaxed">
                {orderStatus === 'cancelled' ? (
                  <>O pedido <strong className="text-white">#{result?.orderId}</strong> expirou ou foi cancelado. Você pode refazer a compra.</>
                ) : isPaid ? (
                  <>Pagamento do pedido <strong className="text-white">#{result?.orderId}</strong> confirmado. Ele será encaminhado para separação.</>
                ) : (
                  <>Pedido <strong className="text-white">#{result?.orderId}</strong> criado. Ele será confirmado assim que o pagamento for aprovado.</>
                )}
              </p>
              {result?.payment.kind === 'pix' && orderStatus === 'pending_payment' && (
                <div className="bg-white/5 p-4 rounded-2xl text-xs text-gray-300 border border-white/10 space-y-3">
                  <img
                    src={`data:image/png;base64,${result.payment.qrCodeBase64}`}
                    alt="QR Code Pix"
                    className="w-44 h-44 mx-auto rounded-xl bg-white p-2"
                  />
                  <textarea
                    readOnly
                    value={result.payment.qrCode}
                    rows={3}
                    className="w-full bg-black/60 border border-white/15 rounded-xl p-2 text-[11px] text-gray-300 break-all"
                    aria-label="Pix copia e cola"
                  />
                  <button
                    onClick={() => result.payment.kind === 'pix' && copyPix(result.payment.qrCode)}
                    className="w-full min-h-[44px] rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest"
                  >
                    Copiar código Pix
                  </button>
                  <p className="text-gray-400">
                    Válido até {new Date(result.payment.expiresAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
              <Magnet strength={12}>
                <button
                  onClick={closeDrawer}
                  className="px-8 py-3 min-h-[44px] bg-white text-black font-extrabold text-xs uppercase tracking-widest rounded-full hover:bg-gray-200 transition-colors shadow-lg"
                >
                  Continuar Comprando
                </button>
              </Magnet>
            </div>
          ) : (
            <>
              {/* Free Shipping Progress Bar */}
              <div className="px-6 py-3.5 bg-white/5 border-b border-white/10 text-xs">
                {remainingForFreeShipping > 0 ? (
                  <p className="text-gray-300 mb-1.5 font-medium">
                    Faltam <strong className="text-white">{formatPrice(remainingForFreeShipping)}</strong> para Frete Grátis!
                  </p>
                ) : (
                  <p className="text-white font-bold flex items-center gap-1.5 mb-1.5">
                    <Check className="w-4 h-4 text-green-400" /> Parabéns! Você ganhou Frete Grátis!
                  </p>
                )}
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-white h-full transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-20 space-y-4">
                    <ShoppingBag className="w-12 h-12 text-gray-600 mx-auto" />
                    <p className="text-gray-400 text-sm font-semibold">Sua sacola está vazia.</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div
                      key={`${item.product.id}-${item.selectedColor.name}-${item.selectedSize}`}
                      className="bg-white/5 p-4 rounded-2xl border border-white/10 flex gap-4 items-center"
                    >
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-16 h-20 object-cover rounded-xl bg-black border border-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-white truncate">
                          {item.product.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1">
                          <span
                            className="w-3 h-3 rounded-full border border-white/30 inline-block"
                            style={{ backgroundColor: item.selectedColor.hex }}
                          />
                          <span>{item.selectedColor.name}</span>
                          <span>•</span>
                          <span className="font-bold text-white">Tam: {item.selectedSize}</span>
                        </div>
                        <div className="font-extrabold text-sm text-white mt-1.5">
                          {formatPrice(item.product.price * item.quantity)}
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between mt-2.5">
                          <div className="flex items-center gap-1 bg-black/60 rounded-full border border-white/15 px-2 py-0.5">
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.selectedColor.name,
                                  item.selectedSize,
                                  -1
                                )
                              }
                              className="w-5 h-5 flex items-center justify-center text-xs text-gray-400 hover:text-white"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-white">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.selectedColor.name,
                                  item.selectedSize,
                                  1
                                )
                              }
                              className="w-5 h-5 flex items-center justify-center text-xs text-gray-400 hover:text-white"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() =>
                              removeFromCart(
                                item.product.id,
                                item.selectedColor.name,
                                item.selectedSize
                              )
                            }
                            className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                            aria-label="Remover item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer Calculations */}
              {cart.length > 0 && (
                <div className="p-6 border-t border-white/10 space-y-4 bg-black/60 max-h-[60vh] overflow-y-auto">
                  {/* Summary Rows */}
                  <div className="space-y-1.5 text-xs text-gray-300">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="text-white font-semibold">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Frete{shipping.selected ? ` (${shipping.selected.name})` : ''}</span>
                      <span className="text-white font-semibold">{shippingLabel}</span>
                    </div>
                    {pricing && pricing.discountCents > 0 && (
                      <div className="flex justify-between text-green-400">
                        <span>Desconto{pricing.couponCode ? ` (${pricing.couponCode})` : ''}</span>
                        <span className="font-semibold">- {formatPrice(pricing.discountCents / 100)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-extrabold text-white pt-2.5 border-t border-white/10">
                      <span className="uppercase tracking-wider">Total</span>
                      <span className="text-lg text-white">{formatPrice(displayTotal)}</span>
                    </div>
                  </div>

                  {/* Cupom */}
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={e => {
                        setCouponInput(e.target.value.slice(0, 32));
                        setAppliedCoupon(undefined);
                      }}
                      placeholder="Cupom de desconto"
                      aria-label="Cupom de desconto"
                      className="flex-1 min-w-0 min-h-[44px] bg-black/60 border border-white/15 rounded-full px-4 text-xs text-white placeholder-gray-500"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={shipping.isQuoting}
                      className="min-h-[44px] px-4 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest disabled:opacity-50"
                    >
                      {shipping.isQuoting && appliedCoupon ? '...' : 'Aplicar'}
                    </button>
                  </div>

                  {/* Endereço */}
                  <div className="space-y-1.5">
                    {savedAddresses.length > 0 && (
                      <select
                        value={selectedAddressId}
                        onChange={e => handleSelectAddress(e.target.value)}
                        aria-label="Endereços salvos"
                        className="w-full min-h-[44px] bg-black/60 border border-white/15 rounded-2xl px-4 text-xs text-white"
                      >
                        {savedAddresses.map(a => (
                          <option key={a.id} value={a.id}>
                            {(a.label || a.recipientName) + ' - ' + a.street + ', ' + a.number + ' - ' + a.city + '/' + a.state}
                          </option>
                        ))}
                        <option value={OTHER_ADDRESS}>Outro endereço</option>
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={handleManageAddresses}
                      className="min-h-[44px] px-2 text-[11px] font-bold uppercase tracking-widest text-gray-300 hover:text-white underline underline-offset-4"
                    >
                      Gerenciar endereços
                    </button>
                  </div>
                  <textarea
                    value={address}
                    onChange={e => setAddress(e.target.value.slice(0, 300))}
                    rows={2}
                    required
                    placeholder="Endereço de entrega (obrigatório)"
                    aria-label="Endereço de entrega"
                    className="w-full bg-black/60 border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-gray-500"
                  />

                  {/* Frete */}
                  <ShippingSelector
                    cep={shippingCep}
                    onCepChange={setShippingCep}
                    options={shipping.options}
                    selectedId={shipping.selectedId}
                    onSelect={shipping.select}
                    isQuoting={shipping.isQuoting}
                    formatPrice={formatPrice}
                  />

                  {/* Método de pagamento */}
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Forma de pagamento">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={paymentMethod === 'pix'}
                      onClick={() => setPaymentMethod('pix')}
                      className={`min-h-[44px] rounded-full border text-xs font-bold uppercase tracking-widest ${
                        paymentMethod === 'pix' ? 'bg-white text-black border-white' : 'border-white/15 bg-white/5 text-white'
                      }`}
                    >
                      Pix
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={paymentMethod === 'card'}
                      disabled={!cardEnabled}
                      onClick={() => setPaymentMethod('card')}
                      className={`min-h-[44px] rounded-full border text-xs font-bold uppercase tracking-widest disabled:opacity-40 ${
                        paymentMethod === 'card' ? 'bg-white text-black border-white' : 'border-white/15 bg-white/5 text-white'
                      }`}
                    >
                      Cartão
                    </button>
                  </div>
                  {!cardEnabled && (
                    <p className="text-[11px] text-gray-500">
                      Pagamento com cartão indisponível no momento. Use Pix.
                    </p>
                  )}

                  {/* Checkout */}
                  {!canPay ? (
                    <p className="text-[11px] text-gray-400 text-center">
                      Informe o CEP e escolha o frete para finalizar.
                    </p>
                  ) : paymentMethod === 'card' && cardEnabled ? (
                    <CardPaymentBrick
                      publicKey={mpPublicKey}
                      amount={Math.round(displayTotal * 100) / 100}
                      onSubmit={card => submitCheckout(card)}
                      onLoadError={() => showToast('Não foi possível carregar o pagamento por cartão.', 'error')}
                    />
                  ) : (
                    <button
                      onClick={handlePixCheckout}
                      disabled={isCheckingOut}
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-white text-black font-extrabold text-xs uppercase tracking-widest py-4 px-6 rounded-full hover:bg-gray-200 transition-all shadow-xl disabled:opacity-60"
                    >
                      <span>{isCheckingOut ? 'Processando...' : 'Finalizar Compra'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
