import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, Sparkles } from 'lucide-react';
import type { Product } from '../types/ecommerce';
import { tomatoApi } from '../services/tomatoApi';
import { ProductCardModern } from './ProductCardModern';
import { CardSkeleton } from './ui/Skeleton';

interface ProductGridProps {
  selectedCategorySlug?: string;
  onCategoryChange?: (slug: string) => void;
  maxItems?: number;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  selectedCategorySlug = 'all',
  onCategoryChange,
  maxItems
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(selectedCategorySlug);
  const [sortOption, setSortOption] = useState<string>('default');

  useEffect(() => {
    setActiveCategory(selectedCategorySlug);
  }, [selectedCategorySlug]);

  useEffect(() => {
    setLoading(true);
    tomatoApi.getProducts(activeCategory, undefined, sortOption).then(data => {
      setProducts(data);
      setLoading(false);
    });
  }, [activeCategory, sortOption]);

  const categoriesFilter = [
    { name: 'Todas as Peças', slug: 'all' },
    { name: 'Alfaiataria', slug: 'tailoring' },
    { name: 'Vestidos', slug: 'dresses' },
    { name: 'Jaquetas', slug: 'jackets' },
    { name: 'Streetwear', slug: 'streetwear' },
    { name: 'Acessórios', slug: 'accessories' }
  ];

  const displayedProducts = maxItems ? products.slice(0, maxItems) : products;

  return (
    <section id="colecao" className="py-20 relative z-10 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold uppercase tracking-[0.25em] mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Coleção Essencial</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-white uppercase tracking-tight">
            Vitta Collection
          </h2>
          <p className="text-gray-300 text-sm mt-3 font-normal max-w-xl mx-auto leading-relaxed">
            Peças desenvolvidas com tecidos premium, caimento impecável e acabamento minucioso para o guarda-roupa contemporâneo.
          </p>
        </div>

        {/* Filter & Sort Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-5 mb-12 pb-6 border-b border-white/10">
          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {categoriesFilter.map(cat => (
              <button
                key={cat.slug}
                onClick={() => {
                  setActiveCategory(cat.slug);
                  if (onCategoryChange) onCategoryChange(cat.slug);
                }}
                className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeCategory === cat.slug
                    ? 'bg-white text-black shadow-lg shadow-white/10'
                    : 'bg-white/5 text-gray-300 hover:bg-white/15 hover:text-white border border-white/10'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <SlidersHorizontal className="w-4 h-4 text-white" />
            <select
              value={sortOption}
              onChange={e => setSortOption(e.target.value)}
              className="bg-white/10 text-xs text-white font-semibold focus:outline-none rounded-full px-4 py-2.5 border border-white/20 cursor-pointer"
            >
              <option value="default" className="bg-black text-white">Relevância / Destaques</option>
              <option value="price-asc" className="bg-black text-white">Menor Preço</option>
              <option value="price-desc" className="bg-black text-white">Maior Preço</option>
              <option value="rating" className="bg-black text-white">Melhores Avaliações</option>
            </select>
          </div>
        </div>

        {/* Product Grid with Skeletons */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <CardSkeleton key={n} />
            ))}
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
            <p className="text-gray-300 text-base font-semibold">Nenhuma peça encontrada nesta categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayedProducts.map(product => (
              <ProductCardModern key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
