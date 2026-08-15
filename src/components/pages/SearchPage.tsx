import React, { useState, useEffect } from 'react';
import { Search, X, TrendingUp, Sparkles } from 'lucide-react';
import type { Product } from '../../types/ecommerce';
import { tomatoApi } from '../../services/tomatoApi';
import { ProductCardModern } from '../ProductCardModern';
import { CardSkeleton } from '../ui/Skeleton';

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Blazer', 'Seda', 'Couro', 'Hoodie', 'Sobretudo'
  ]);

  const trendingTags = [
    'Blazer Alfaiataria',
    'Vestido Seda Runway',
    'Jaqueta Couro Lambskin',
    'Hoodie 500 GSM',
    'Cashmere',
    'Preto Minimalista'
  ];

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const handler = setTimeout(() => {
      tomatoApi.getProducts(undefined, query).then(data => {
        setResults(data);
        setLoading(false);
      });
    }, 200);

    return () => clearTimeout(handler);
  }, [query]);

  const handleSelectSearch = (term: string) => {
    setQuery(term);
    if (!recentSearches.includes(term)) {
      setRecentSearches(prev => [term, ...prev.slice(0, 4)]);
    }
  };

  return (
    <div className="pt-28 pb-24 min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Hero Header */}
        <div className="max-w-3xl mx-auto text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold uppercase tracking-[0.25em]">
            <Search className="w-3.5 h-3.5" />
            <span>Busca Inteligente</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold uppercase tracking-tight">
            Encontre sua Peça
          </h1>
          <p className="text-gray-400 text-sm">
            Pesquise por nome, tecido (lã, seda, couro), categoria ou modelagem.
          </p>

          {/* Search Input Box */}
          <div className="relative mt-6">
            <div className="relative flex items-center bg-white/10 rounded-full border border-white/20 px-6 py-4 shadow-2xl focus-within:border-white focus-within:bg-white/15 transition-all">
              <Search className="w-5 h-5 text-gray-400 shrink-0 mr-3" />
              <input
                type="text"
                placeholder="Ex: blazer alfaiataria, vestido de seda, jaqueta biker..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                className="w-full bg-transparent border-none text-white text-base sm:text-lg focus:outline-none placeholder:text-gray-500 font-medium"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                  aria-label="Limpar pesquisa"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Trending & Quick Filters (when query is empty) */}
        {!query && (
          <div className="max-w-3xl mx-auto space-y-8 py-6">
            {/* Trending Tags */}
            <div className="bg-white/5 rounded-3xl p-6 sm:p-8 border border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-widest">
                <TrendingUp className="w-4 h-4 text-white" />
                <span>Termos em Alta</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {trendingTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleSelectSearch(tag)}
                    className="px-4 py-2 rounded-full text-xs font-semibold bg-white/10 hover:bg-white text-gray-200 hover:text-black border border-white/15 transition-all duration-300"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="bg-white/5 rounded-3xl p-6 sm:p-8 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-300 font-bold text-xs uppercase tracking-widest">
                    <Sparkles className="w-4 h-4 text-gray-400" />
                    <span>Buscas Recentes</span>
                  </div>
                  <button
                    onClick={() => setRecentSearches([])}
                    className="text-[11px] text-gray-500 hover:text-white transition-colors"
                  >
                    Limpar histórico
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map(term => (
                    <button
                      key={term}
                      onClick={() => handleSelectSearch(term)}
                      className="px-3.5 py-1.5 rounded-full text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/15 transition-colors border border-white/10"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search Results Area */}
        {query && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-300">
                Resultados para "<span className="text-white">{query}</span>"
              </h2>
              <span className="text-xs text-gray-400 font-semibold">
                {loading ? 'Buscando...' : `${results.length} peças encontradas`}
              </span>
            </div>

            {/* Grid with Skeletons */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map(n => (
                  <CardSkeleton key={n} />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-24 bg-white/5 rounded-3xl border border-white/10 p-8 space-y-4">
                <h3 className="text-xl font-bold text-white">Nenhum resultado encontrado</h3>
                <p className="text-gray-400 text-sm max-w-md mx-auto">
                  Não encontramos peças correspondentes a "{query}". Tente buscar por outros termos como "blazer", "vestido" ou "streetwear".
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  {['Blazer', 'Vestido', 'Streetwear'].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => handleSelectSearch(suggestion)}
                      className="px-4 py-2 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full hover:bg-gray-200"
                    >
                      Buscar {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {results.map(product => (
                  <ProductCardModern key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
