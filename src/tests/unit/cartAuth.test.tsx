import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CartProvider, useCart } from '../../context/CartContext';
import * as CartContextModule from '../../context/CartContext';
import * as AuthContextModule from '../../context/AuthContext';
import { CartDrawer } from '../../components/CartDrawer';
import type { Product } from '../../types/ecommerce';

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Camiseta Algodão Pima',
  category: 'Camisetas',
  price: 189,
  images: ['/img1.jpg'],
  colors: [{ name: 'Preto', hex: '#000000' }],
  sizes: ['M', 'G'],
  tags: ['Novidade'],
  isNew: true,
  isFeatured: true
};

describe('Cart Authentication Interceptor & Blocked Drawer', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.scrollTo = vi.fn();
    vi.restoreAllMocks();
  });

  const TestConsumer = () => {
    const { cart, isCartOpen, addToCart, toggleCartDrawer, toasts } = useCart();
    return (
      <div>
        <div data-testid="cart-count">{cart.length}</div>
        <div data-testid="is-cart-open">{isCartOpen ? 'open' : 'closed'}</div>
        <div data-testid="toasts">{toasts.map(t => t.message).join('|')}</div>
        <button onClick={() => addToCart(mockProduct)}>Adicionar</button>
        <button onClick={() => toggleCartDrawer(true)}>Abrir Drawer</button>
      </div>
    );
  };

  it('should block unauthenticated users from adding to cart, show toast and not open drawer', () => {
    vi.spyOn(AuthContextModule, 'useOptionalAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      isAdmin: false
    });

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );

    const addButton = screen.getByText('Adicionar');
    act(() => {
      fireEvent.click(addButton);
    });

    expect(screen.getByTestId('cart-count').textContent).toBe('0');
    expect(screen.getByTestId('is-cart-open').textContent).toBe('closed');
    expect(screen.getByTestId('toasts').textContent).toContain('Faça login ou cadastre-se para ver seu carrinho');
  });

  it('should block unauthenticated users from opening cart drawer via toggleCartDrawer', () => {
    vi.spyOn(AuthContextModule, 'useOptionalAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      isAdmin: false
    });

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );

    const openButton = screen.getByText('Abrir Drawer');
    act(() => {
      fireEvent.click(openButton);
    });

    expect(screen.getByTestId('is-cart-open').textContent).toBe('closed');
    expect(screen.getByTestId('toasts').textContent).toContain('Faça login ou cadastre-se para ver seu carrinho');
  });

  it('should allow authenticated users to add to cart and open drawer', () => {
    vi.spyOn(AuthContextModule, 'useOptionalAuth').mockReturnValue({
      user: { id: 'u1', name: 'Cliente Vitta', email: 'cliente@vitta.com', role: 'customer' },
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      isAdmin: false
    });

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );

    const addButton = screen.getByText('Adicionar');
    act(() => {
      fireEvent.click(addButton);
    });

    expect(screen.getByTestId('cart-count').textContent).toBe('1');
    expect(screen.getByTestId('is-cart-open').textContent).toBe('open');
    expect(screen.getByTestId('toasts').textContent).toContain('"Camiseta Algodão Pima" adicionado ao carrinho!');
  });

  it('should render blocked empty state with CTA "Criar minha conta para comprar" in CartDrawer when unauthenticated', () => {
    vi.spyOn(AuthContextModule, 'useOptionalAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      isAdmin: false
    });

    vi.spyOn(CartContextModule, 'useCart').mockReturnValue({
      cart: [],
      wishlist: [],
      currency: 'BRL',
      isCartOpen: true,
      isSearchOpen: false,
      quickViewProduct: null,
      toasts: [],
      addToCart: vi.fn(),
      removeFromCart: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
      toggleWishlist: vi.fn(),
      isInWishlist: vi.fn(),
      setCurrency: vi.fn(),
      setIsCartOpen: vi.fn(),
      toggleCartDrawer: vi.fn(),
      setIsSearchOpen: vi.fn(),
      setQuickViewProduct: vi.fn(),
      showToast: vi.fn(),
      formatPrice: (v: number) => `R$ ${v}`,
      subtotal: 0,
      total: 0,
      itemsCount: 0
    });

    render(<CartDrawer />);

    expect(screen.getByText('Sacola Bloqueada')).toBeInTheDocument();
    expect(screen.getByText('Acesso Exclusivo')).toBeInTheDocument();
    expect(screen.getByText('Criar minha conta para comprar')).toBeInTheDocument();
    expect(screen.getByText(/Já possuo uma conta • Entrar/i)).toBeInTheDocument();
  });
});
