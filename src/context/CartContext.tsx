import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Product, ProductColor, CartItem, Coupon, Currency } from '../types/ecommerce';
import { tomatoApi } from '../services/tomatoApi';
import confetti from 'canvas-confetti';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'error';
}

interface CartContextType {
  cart: CartItem[];
  wishlist: (number | string)[];
  currency: Currency;
  coupon: Coupon | null;
  isCartOpen: boolean;
  isSearchOpen: boolean;
  quickViewProduct: Product | null;
  toasts: Toast[];
  
  // Actions
  addToCart: (product: Product, selectedColor?: ProductColor, selectedSize?: string, quantity?: number) => void;
  removeFromCart: (productId: number | string, colorName: string, size: string) => void;
  updateQuantity: (productId: number | string, colorName: string, size: string, delta: number) => void;
  clearCart: () => void;
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: number | string) => boolean;
  setCurrency: (c: Currency) => void;
  applyCouponCode: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  setIsCartOpen: (open: boolean) => void;
  setIsSearchOpen: (open: boolean) => void;
  setQuickViewProduct: (product: Product | null) => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  formatPrice: (amountInBRL: number) => string;
  
  // Computed
  subtotal: number;
  discountAmount: number;
  total: number;
  itemsCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CURRENCY_RATES: Record<Currency, { rate: number; symbol: string; prefix: string }> = {
  BRL: { rate: 1, symbol: 'R$', prefix: 'R$ ' },
  USD: { rate: 0.18, symbol: '$', prefix: '$' },
  EUR: { rate: 0.16, symbol: '€', prefix: '€' }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('noir_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [wishlist, setWishlist] = useState<(number | string)[]>(() => {
    const saved = localStorage.getItem('noir_wishlist');
    return saved ? JSON.parse(saved) : [];
  });

  const [currency, setCurrency] = useState<Currency>('BRL');
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    localStorage.setItem('noir_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('noir_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const addToCart = (
    product: Product,
    selectedColor?: ProductColor,
    selectedSize?: string,
    quantity: number = 1
  ) => {
    const color = selectedColor || product.colors[0];
    const size = selectedSize || product.sizes[0];

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(
        item =>
          item.product.id === product.id &&
          item.selectedColor.name === color.name &&
          item.selectedSize === size
      );

      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += quantity;
        return updated;
      } else {
        return [...prevCart, { product, quantity, selectedColor: color, selectedSize: size }];
      }
    });

    showToast(`"${product.name}" adicionado ao carrinho!`, 'success');
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: number | string, colorName: string, size: string) => {
    setCart(prev =>
      prev.filter(
        item =>
          !(item.product.id === productId && item.selectedColor.name === colorName && item.selectedSize === size)
      )
    );
    showToast('Item removido do carrinho.', 'info');
  };

  const updateQuantity = (
    productId: number | string,
    colorName: string,
    size: string,
    delta: number
  ) => {
    setCart(prev =>
      prev
        .map(item => {
          if (
            item.product.id === productId &&
            item.selectedColor.name === colorName &&
            item.selectedSize === size
          ) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const toggleWishlist = (product: Product) => {
    const exists = wishlist.includes(product.id);
    if (exists) {
      setWishlist(prev => prev.filter(id => id !== product.id));
      showToast(`"${product.name}" removido dos salvos.`, 'info');
    } else {
      setWishlist(prev => [...prev, product.id]);
      showToast(`"${product.name}" salvo nos favoritos!`, 'success');
    }
  };

  const isInWishlist = (productId: number | string) => wishlist.includes(productId);

  const applyCouponCode = async (code: string): Promise<boolean> => {
    const res = await tomatoApi.applyCoupon(code);
    if (res) {
      setCoupon(res);
      showToast(`Cupom "${res.code}" aplicado com sucesso!`, 'success');
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#d4af37', '#ffffff', '#8b5cf6']
      });
      return true;
    } else {
      showToast('Cupom inválido ou expirado.', 'error');
      return false;
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    showToast('Cupom removido.', 'info');
  };

  const formatPrice = (amountInBRL: number) => {
    const { rate, prefix } = CURRENCY_RATES[currency];
    const converted = amountInBRL * rate;

    if (currency === 'BRL') {
      return `${prefix}${converted.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${prefix}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  let discountAmount = 0;
  if (coupon) {
    if (coupon.discountPercentage) {
      discountAmount = (subtotal * coupon.discountPercentage) / 100;
    } else if (coupon.discountFixed) {
      discountAmount = coupon.discountFixed;
    }
  }

  const total = Math.max(0, subtotal - discountAmount);
  const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        wishlist,
        currency,
        coupon,
        isCartOpen,
        isSearchOpen,
        quickViewProduct,
        toasts,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        toggleWishlist,
        isInWishlist,
        setCurrency,
        applyCouponCode,
        removeCoupon,
        setIsCartOpen,
        setIsSearchOpen,
        setQuickViewProduct,
        showToast,
        formatPrice,
        subtotal,
        discountAmount,
        total,
        itemsCount
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
