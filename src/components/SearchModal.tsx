import React, { useState, useEffect } from 'react';
import { Search, X, ShoppingBag, Eye } from 'lucide-react';
import { useCart } from '../context/CartContext';
import type { Product } from '../types/ecommerce';
import { tomatoApi } from '../services/tomatoApi';

export const SearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, formatPrice, setQuickViewProduct, addToCart } = useCart();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(() => {
      tomatoApi.getProducts(undefined, query).then(data => {
        setResults(data);
        setLoading(false);
      });
    }, 200);

    return () => clearTimeout(timeout);
  }, [query]);

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#121216] rounded-3xl overflow-hidden border border-white/20 shadow-2xl">
        {/* Search Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center gap-3">
          <Search className="w-5 h-5 text-white" />
          <input
            type="text"
            placeholder="Buscar por blazer, vestido, couro, alfaiataria..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent border-none text-white text-base focus:outline-none placeholder:text-gray-500 font-medium"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-white text-xs">
              Limpar
            </button>
          )}
          <button
            onClick={() => setIsSearchOpen(false)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Fechar busca"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="text-center py-8 text-xs text-gray-400 animate-pulse">
              Buscando na API TomatoPHP...
            </div>
          ) : query && results.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              Nenhuma peça encontrada para "<strong className="text-white">{query}</strong>".
            </div>
          ) : !query ? (
            <div className="space-y-4">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Tendências de Busca
              </span>
              <div className="flex flex-wrap gap-2">
                {['Blazer Alfaiataria', 'Vestido Seda', 'Couro Lambskin', 'Hoodie Oversized', 'Sobretudo Wool'].map(
                  term => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="px-4 py-2 rounded-full text-xs text-gray-300 hover:text-black hover:bg-white bg-white/5 border border-white/10 transition-all"
                    >
                      {term}
                    </button>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map(product => (
                <div
                  key={product.id}
                  className="p-3 rounded-2xl border border-white/10 bg-white/5 hover:border-white/30 flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-14 h-16 object-cover rounded-xl bg-black border border-white/10"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-white group-hover:underline transition-colors">
                        {product.name}
                      </h4>
                      <span className="text-xs text-gray-400 block">{product.category}</span>
                      <span className="font-extrabold text-sm text-white mt-0.5 block">
                        {formatPrice(product.price)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setQuickViewProduct(product);
                        setIsSearchOpen(false);
                      }}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                      title="Ver detalhes"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        addToCart(product);
                        setIsSearchOpen(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white text-black font-bold rounded-full text-xs hover:bg-gray-200 transition-colors"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Comprar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
