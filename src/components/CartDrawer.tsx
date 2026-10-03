import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, Check, Sparkles, Lock, ShieldAlert, UserPlus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useOptionalAuth } from '../context/AuthContext';
import { tomatoApi } from '../services/tomatoApi';
import { Magnet } from './react-bits/Magnet';
import confetti from 'canvas-confetti';

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
    total,
    formatPrice,
    showToast
  } = useCart();

  const auth = useOptionalAuth();
  const user = auth?.user ?? null;
  const isAuthenticated = auth?.isAuthenticated ?? false;

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  if (!isCartOpen) return null;

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

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    const orderPayload = {
      customerName: user?.name || 'Cliente Vitta VIP',
      customerEmail: user?.email || 'cliente.vip@vittabasics.com',
      items: cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        selectedColor: item.selectedColor.name,
        selectedSize: item.selectedSize,
        image: item.product.images[0]
      })),
      totalAmount: total,
      paymentMethod: 'PIX / Cartão Seguro',
      shippingAddress: 'Endereço Principal - Entrega Expressa'
    };

    const res = await tomatoApi.createOrder(orderPayload);
    setIsCheckingOut(false);

    if (res.success) {
      setOrderId(res.orderId);
      setCheckoutSuccess(true);
      clearCart();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ffffff', '#000000', '#cccccc']
      });
    } else {
      showToast('Erro ao processar pedido.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => {
          setIsCartOpen(false);
          setCheckoutSuccess(false);
        }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-md bg-[#111116] border-l border-white/15 flex flex-col justify-between shadow-2xl text-white">
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-white" />
              <h2 className="font-display font-extrabold text-xl text-white uppercase tracking-wider">Sua Sacola</h2>
            </div>
            <button
              onClick={() => {
                setIsCartOpen(false);
                setCheckoutSuccess(false);
              }}
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
                    <span>Frete Expresso Grátis acima de R$ 1.500</span>
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
              <h3 className="font-display font-extrabold text-2xl text-white">PEDIDO CONFIRMADO!</h3>
              <p className="text-gray-300 text-xs leading-relaxed">
                Seu pedido <strong className="text-white">#{orderId}</strong> foi registrado com sucesso na TomatoPHP API e encaminhado para separação.
              </p>
              <div className="bg-white/5 p-4 rounded-2xl text-xs text-gray-400 border border-white/10">
                Você pode acompanhar o status deste pedido a qualquer momento no Painel Administrativo.
              </div>
              <Magnet strength={12}>
                <button
                  onClick={() => {
                    setCheckoutSuccess(false);
                    setIsCartOpen(false);
                  }}
                  className="px-8 py-3 bg-white text-black font-extrabold text-xs uppercase tracking-widest rounded-full hover:bg-gray-200 transition-colors shadow-lg"
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
                    Faltam <strong className="text-white">{formatPrice(remainingForFreeShipping)}</strong> para Frete Expresso Grátis!
                  </p>
                ) : (
                  <p className="text-white font-bold flex items-center gap-1.5 mb-1.5">
                    <Check className="w-4 h-4 text-green-400" /> Parabéns! Você ganhou Frete Expresso Grátis!
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
                <div className="p-6 border-t border-white/10 space-y-4 bg-black/60">
                  {/* Summary Rows */}
                  <div className="space-y-1.5 text-xs text-gray-300">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="text-white font-semibold">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Frete Expresso</span>
                      <span className="text-white font-semibold">
                        {remainingForFreeShipping === 0 ? 'GRÁTIS' : formatPrice(50)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold text-white pt-2.5 border-t border-white/10">
                      <span className="uppercase tracking-wider">Total</span>
                      <span className="text-lg text-white">{formatPrice(total)}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className="w-full flex items-center justify-center gap-2 bg-white text-black font-extrabold text-xs uppercase tracking-widest py-4 px-6 rounded-full hover:bg-gray-200 transition-all shadow-xl"
                  >
                    <span>{isCheckingOut ? 'Registrando Pedido...' : 'Finalizar Compra'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
