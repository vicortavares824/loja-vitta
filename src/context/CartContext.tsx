import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Product, ProductColor, CartItem, Currency } from '../types/ecommerce';
import { useOptionalAuth } from './AuthContext';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'error';
}

interface CartContextType {
  cart: CartItem[];
  wishlist: (number | string)[];
  currency: Currency;
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
  setIsCartOpen: (open: boolean) => void;
  toggleCartDrawer: (open?: boolean) => void;
  setIsSearchOpen: (open: boolean) => void;
  setQuickViewProduct: (product: Product | null) => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  formatPrice: (amountInBRL: number) => string;
  
  // Computed
  subtotal: number;
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
  const auth = useOptionalAuth();
  const user = auth?.user ?? null;

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('noir_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [wishlist, setWishlist] = useState<(number | string)[]>(() => {
    const saved = localStorage.getItem('noir_wishlist');
    return saved ? JSON.parse(saved) : [];
  });

  const [currency, setCurrency] = useState<Currency>('BRL');
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

  // Se o usuário deslogar enquanto o carrinho estiver aberto, fecha o drawer
  useEffect(() => {
    if (!user && isCartOpen) {
      setIsCartOpen(false);
    }
  }, [user, isCartOpen]);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const redirectToLogin = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  /**
   * Interceptador de autenticação para proteção do carrinho:
   * Bloqueia acesso a usuários não logados, dispara Toast e redireciona para /login.
   */
  const checkAuthInterceptor = useCallback((): boolean => {
    if (!user) {
      setIsCartOpen(false);
      showToast('Faça login ou cadastre-se para ver seu carrinho', 'info');
      redirectToLogin();
      return false;
    }
    return true;
  }, [user, showToast, redirectToLogin]);

  const addToCart = (
    product: Product,
    selectedColor?: ProductColor,
    selectedSize?: string,
    quantity: number = 1
  ) => {
    if (!checkAuthInterceptor()) {
      return;
    }

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

  const toggleCartDrawer = (open?: boolean) => {
    const shouldOpen = open !== undefined ? open : !isCartOpen;
    if (shouldOpen) {
      if (!checkAuthInterceptor()) {
        return;
      }
      setIsCartOpen(true);
    } else {
      setIsCartOpen(false);
    }
  };

  const safeSetIsCartOpen = (open: boolean) => {
    if (open && !user) {
      checkAuthInterceptor();
      return;
    }
    setIsCartOpen(open);
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

  const formatPrice = (amountInBRL: number) => {
    const { rate, prefix } = CURRENCY_RATES[currency];
    const converted = amountInBRL * rate;

    if (currency === 'BRL') {
      return `${prefix}${converted.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${prefix}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const total = subtotal;
  const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        wishlist,
        currency,
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
        setIsCartOpen: safeSetIsCartOpen,
        toggleCartDrawer,
        setIsSearchOpen,
        setQuickViewProduct,
        showToast,
        formatPrice,
        subtotal,
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
