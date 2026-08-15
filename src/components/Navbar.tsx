import React, { useState, useEffect } from 'react';
import { ShoppingBag, Heart, Search, Globe, Menu, X, Server, Layers, Package, Home } from 'lucide-react';
import { useCart } from '../context/CartContext';
import type { Currency } from '../types/ecommerce';
import { Magnet } from './react-bits/Magnet';
import { STORE_CONFIG } from '../config/storeConfig';

interface NavbarProps {
  currentTab?: string;
  onNavigate?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab = 'home', onNavigate }) => {
  const { itemsCount, wishlist, currency, setCurrency, setIsCartOpen } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const currencies: Currency[] = ['BRL', 'USD', 'EUR'];

  const handleNavClick = (tab: string) => {
    onNavigate?.(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
          scrolled
            ? 'bg-black/90 backdrop-blur-xl border-b border-white/10 py-3.5 shadow-2xl'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo */}
          <button 
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-3 group text-left focus:outline-none"
          >
            <div className="w-9 h-9 rounded-full bg-white p-[1px] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
                <span className="font-display font-bold text-xs text-white tracking-widest">
                  {STORE_CONFIG.shortName}
                </span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-lg sm:text-xl tracking-[0.18em] text-white transition-colors">
                {STORE_CONFIG.name}
              </span>
              <span className="text-[9px] tracking-[0.25em] text-gray-400 uppercase -mt-1 font-semibold">
                {STORE_CONFIG.subtitle}
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/10 backdrop-blur-md px-3 py-1.5 border border-white/15 rounded-full">
            <button
              onClick={() => handleNavClick('home')}
              className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-[0.15em] font-semibold transition-all ${
                currentTab === 'home' ? 'bg-white text-black font-bold shadow' : 'text-gray-300 hover:text-white'
              }`}
            >
              Início
            </button>
            <button
              onClick={() => handleNavClick('products')}
              className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-[0.15em] font-semibold transition-all ${
                currentTab === 'products' ? 'bg-white text-black font-bold shadow' : 'text-gray-300 hover:text-white'
              }`}
            >
              Catálogo
            </button>
            <button
              onClick={() => handleNavClick('categories')}
              className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-[0.15em] font-semibold transition-all ${
                currentTab === 'categories' ? 'bg-white text-black font-bold shadow' : 'text-gray-300 hover:text-white'
              }`}
            >
              Categorias
            </button>
            <button
              onClick={() => handleNavClick('search')}
              className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-[0.15em] font-semibold transition-all flex items-center gap-1.5 ${
                currentTab === 'search' ? 'bg-white text-black font-bold shadow' : 'text-gray-300 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Busca</span>
            </button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Currency Selector */}
            <div className="relative group hidden md:flex items-center gap-1 bg-white/10 px-3 py-1.5 text-xs text-gray-300 border border-white/15 rounded-full">
              <Globe className="w-3.5 h-3.5 text-white" />
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as Currency)}
                className="bg-transparent text-xs text-gray-200 font-semibold focus:outline-none cursor-pointer border-none p-0 pr-1"
              >
                {currencies.map(c => (
                  <option key={c} value={c} className="bg-black text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Search Button */}
            <Magnet strength={10}>
              <button
                onClick={() => handleNavClick('search')}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border border-white/10"
                aria-label="Buscar produtos"
              >
                <Search className="w-4 h-4" />
              </button>
            </Magnet>

            {/* Wishlist Trigger */}
            <Magnet strength={10}>
              <button
                onClick={() => handleNavClick('products')}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border border-white/10 relative"
                aria-label="Lista de desejos"
                title="Favoritos"
              >
                <Heart className={`w-4 h-4 ${wishlist.length > 0 ? 'text-red-500 fill-red-500' : 'text-gray-300'}`} />
                {wishlist.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {wishlist.length}
                  </span>
                )}
              </button>
            </Magnet>

            {/* Shopping Cart Drawer Trigger */}
            <Magnet strength={14}>
              <button
                onClick={() => setIsCartOpen(true)}
                className="flex items-center gap-2 bg-white text-black text-xs font-bold uppercase tracking-wider py-2.5 px-4 sm:px-5 rounded-full hover:bg-gray-200 transition-all duration-300 shadow-lg shadow-white/10"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Carrinho</span>
                {itemsCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-black text-white text-[11px] font-extrabold flex items-center justify-center ml-0.5">
                    {itemsCount}
                  </span>
                )}
              </button>
            </Magnet>

            {/* Mobile Menu Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-black/95 backdrop-blur-xl pt-28 px-6 pb-10 flex flex-col justify-between lg:hidden animate-fadeIn">
          <div className="space-y-4">
            <span className="text-xs uppercase font-extrabold tracking-widest text-gray-500">Navegação</span>
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => handleNavClick('home')}
                className={`flex items-center gap-3 p-4 rounded-2xl text-base font-bold uppercase tracking-wider text-left transition-all ${
                  currentTab === 'home' ? 'bg-white text-black' : 'text-gray-300 bg-white/5'
                }`}
              >
                <Home className="w-5 h-5" />
                <span>Início</span>
              </button>

              <button
                onClick={() => handleNavClick('products')}
                className={`flex items-center gap-3 p-4 rounded-2xl text-base font-bold uppercase tracking-wider text-left transition-all ${
                  currentTab === 'products' ? 'bg-white text-black' : 'text-gray-300 bg-white/5'
                }`}
              >
                <Package className="w-5 h-5" />
                <span>Catálogo de Produtos</span>
              </button>

              <button
                onClick={() => handleNavClick('categories')}
                className={`flex items-center gap-3 p-4 rounded-2xl text-base font-bold uppercase tracking-wider text-left transition-all ${
                  currentTab === 'categories' ? 'bg-white text-black' : 'text-gray-300 bg-white/5'
                }`}
              >
                <Layers className="w-5 h-5" />
                <span>Categorias</span>
              </button>

              <button
                onClick={() => handleNavClick('search')}
                className={`flex items-center gap-3 p-4 rounded-2xl text-base font-bold uppercase tracking-wider text-left transition-all ${
                  currentTab === 'search' ? 'bg-white text-black' : 'text-gray-300 bg-white/5'
                }`}
              >
                <Search className="w-5 h-5" />
                <span>Busca Avançada</span>
              </button>

              <button
                onClick={() => handleNavClick('admin')}
                className={`flex items-center gap-3 p-4 rounded-2xl text-base font-bold uppercase tracking-wider text-left transition-all ${
                  currentTab === 'admin' ? 'bg-white text-black' : 'text-white bg-white/15'
                }`}
              >
                <Server className="w-5 h-5" />
                <span>Painel Tomato Admin</span>
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 text-xs text-gray-400 text-center">
            © 2026 {STORE_CONFIG.name}. Minimalist E-Commerce.
          </div>
        </div>
      )}
    </>
  );
};
