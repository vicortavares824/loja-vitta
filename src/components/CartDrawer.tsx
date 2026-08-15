import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, Tag, Check, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { tomatoApi } from '../services/tomatoApi';
import { Magnet } from './react-bits/Magnet';
import confetti from 'canvas-confetti';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal,
    discountAmount,
    total,
    coupon,
    applyCouponCode,
    removeCoupon,
    formatPrice,
    showToast
  } = useCart();

  const [couponInput, setCouponInput] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  if (!isCartOpen) return null;

  const FREE_SHIPPING_THRESHOLD = 1500;
  const progressPercent = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setIsApplyingCoupon(true);
    await applyCouponCode(couponInput);
    setIsApplyingCoupon(false);
    setCouponInput('');
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    const orderPayload = {
      customerName: 'Cliente Vitta VIP',
      customerEmail: 'cliente.vip@vittabasics.com',
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
      couponUsed: coupon?.code,
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

          {/* Checkout Success Screen */}
          {checkoutSuccess ? (
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
                  {/* Coupon Form */}
                  {coupon ? (
                    <div className="bg-white/10 p-3 rounded-2xl flex items-center justify-between border border-white/20 text-xs">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-white" />
                        <div>
                          <strong className="text-white font-mono">{coupon.code}</strong>
                          <span className="text-gray-300 block text-[10px]">{coupon.description}</span>
                        </div>
                      </div>
                      <button
                        onClick={removeCoupon}
                        className="text-red-400 hover:underline text-[11px]"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Cupom (ex: VITTA15)"
                        value={couponInput}
                        onChange={e => setCouponInput(e.target.value)}
                        className="flex-1 bg-white/10 border border-white/20 text-xs py-2.5 px-3.5 rounded-full text-white uppercase placeholder:text-gray-500 focus:outline-none focus:border-white"
                      />
                      <button
                        type="submit"
                        disabled={isApplyingCoupon}
                        className="px-5 py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full hover:bg-gray-200 transition-colors"
                      >
                        Aplicar
                      </button>
                    </form>
                  )}

                  {/* Summary Rows */}
                  <div className="space-y-1.5 text-xs text-gray-300">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="text-white font-semibold">{formatPrice(subtotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-green-400 font-semibold">
                        <span>Desconto Cupom</span>
                        <span>-{formatPrice(discountAmount)}</span>
                      </div>
                    )}
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
