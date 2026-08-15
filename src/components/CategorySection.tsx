import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Layers } from 'lucide-react';
import type { Category } from '../types/ecommerce';
import { tomatoApi } from '../services/tomatoApi';
import { SpotlightCard } from './react-bits/SpotlightCard';

interface CategorySectionProps {
  onSelectCategory: (categorySlug: string) => void;
}

export const CategorySection: React.FC<CategorySectionProps> = ({ onSelectCategory }) => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    tomatoApi.getCategories().then(setCategories);
  }, []);

  return (
    <section id="categorias" className="py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 badge-gold mb-3">
              <Layers className="w-3.5 h-3.5" />
              <span>Linhas Exclusivas</span>
            </div>
            <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-white">
              EXPLORE POR CATEGORIA
            </h2>
          </div>
          <p className="text-gray-400 text-sm max-w-md font-normal leading-relaxed">
            Cada linha foi curada para traduzir sofisticação, precisão geométrica de cortes e atemporalidade.
          </p>
        </div>

        {/* Categories Grid with Spotlight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((cat, idx) => (
            <SpotlightCard
              key={cat.id || idx}
              onClick={() => {
                onSelectCategory(cat.slug);
                const gridEl = document.getElementById('colecao');
                gridEl?.scrollIntoView({ behavior: 'smooth' });
              }}
              spotlightColor="rgba(212, 175, 55, 0.22)"
              className="cursor-pointer group h-[320px] flex flex-col justify-between"
            >
              {/* Category Image Background */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover object-center opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-[#070709]/50 to-transparent" />
              </div>

              {/* Content Top */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="glass-pill px-3 py-1 text-[11px] font-bold text-[#d4af37] tracking-widest uppercase">
                  {cat.itemCount} PEÇAS
                </span>
                <div className="w-10 h-10 rounded-full bg-white/10 group-hover:bg-[#d4af37] group-hover:text-black text-white flex items-center justify-center transition-all duration-300">
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>

              {/* Content Bottom */}
              <div className="relative z-10 mt-auto">
                <h3 className="font-display font-extrabold text-2xl text-white group-hover:text-[#d4af37] transition-colors">
                  {cat.name}
                </h3>
                <p className="text-gray-300 text-xs mt-2 font-normal line-clamp-2 leading-relaxed">
                  {cat.description}
                </p>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
};
