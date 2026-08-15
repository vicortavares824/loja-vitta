import React, { useState, useEffect } from 'react';
import { ArrowUpRight, Layers, Sparkles } from 'lucide-react';
import type { Category } from '../../types/ecommerce';
import { tomatoApi } from '../../services/tomatoApi';

interface CategoriesPageProps {
  onSelectCategory: (categorySlug: string) => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({ onSelectCategory }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tomatoApi.getCategories().then(data => {
      setCategories(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="pt-28 pb-24 min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold uppercase tracking-[0.25em]">
            <Layers className="w-3.5 h-3.5" />
            <span>Curadoria Exclusiva</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight uppercase">
            Categorias & Linhas
          </h1>
          <p className="text-gray-300 text-sm sm:text-base font-normal max-w-xl mx-auto leading-relaxed">
            Descubra as diferentes divisões da nossa coleção, desde alfaiataria estruturada até o streetwear contemporâneo.
          </p>
        </div>

        {/* Categories Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className="h-96 rounded-3xl bg-white/5 animate-pulse border border-white/10" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((cat, idx) => (
              <div
                key={cat.id || idx}
                onClick={() => onSelectCategory(cat.slug)}
                className="group relative h-[380px] rounded-3xl overflow-hidden cursor-pointer border border-white/15 bg-white/5 flex flex-col justify-between p-8 transition-all duration-500 hover:border-white hover:-translate-y-2 shadow-2xl"
              >
                {/* Background Image with Gradient Overlay */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover object-center opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                </div>

                {/* Top Badge & Action */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white border border-white/20">
                    {cat.itemCount || 12} Peças
                  </span>
                  <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-45">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                </div>

                {/* Bottom Content */}
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-white opacity-80" />
                    <span className="text-xs uppercase tracking-widest text-gray-300 font-semibold">Linha Vitta</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white group-hover:underline">
                    {cat.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-300 font-normal leading-relaxed line-clamp-2">
                    {cat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
