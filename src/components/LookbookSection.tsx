import React, { useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Magnet } from './react-bits/Magnet';

const LOOKBOOK_ITEMS = [
  {
    id: 1,
    title: 'NIGHT IN PARIS',
    subtitle: 'COLEÇÃO EDITORIAL OUTONO/INVERNO',
    image: '/images/hero-fashion.jpg',
    quote: '"A simplicidade é o último grau da sofisticação e da elegância."',
    designer: 'Maison Noir Atelier Paris',
    featuredProduct: 'Sobretudo Velvet Noir',
    price: 3890
  },
  {
    id: 2,
    title: 'AVANT-GARDE TAILORING',
    subtitle: 'ALFAIATARIA DE ALTA PRECISÃO',
    image: '/images/product-blazer.jpg',
    quote: '"Geometria perfeita traduzida em lã pura e detalhes folheados."',
    designer: 'Couture Studio Milan',
    featuredProduct: 'Blazer Alfaiataria Noir Gold',
    price: 1890
  },
  {
    id: 3,
    title: 'RUNWAY EMERALD DREAMS',
    subtitle: 'DESFILE DE GALA',
    image: '/images/product-dress.jpg',
    quote: '"Fluidez incomparável da seda natural sob as luzes da passarela."',
    designer: 'Haute Couture Atelier',
    featuredProduct: 'Vestido de Seda Esmeralda',
    price: 2650
  }
];

export const LookbookSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = LOOKBOOK_ITEMS[currentIndex];

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % LOOKBOOK_ITEMS.length);
  };

  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + LOOKBOOK_ITEMS.length) % LOOKBOOK_ITEMS.length);
  };

  return (
    <section id="lookbook" className="py-24 relative z-10 overflow-hidden bg-[#070709]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 badge-gold mb-3">
              <Camera className="w-3.5 h-3.5" />
              <span>Editorial de Moda</span>
            </div>
            <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-white">
              EDITORIAL LOOKBOOK 2026
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Magnet strength={12}>
              <button
                onClick={handlePrev}
                className="btn-icon"
                aria-label="Look anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </Magnet>
            <span className="font-display font-bold text-xs text-[#d4af37]">
              0{currentIndex + 1} / 0{LOOKBOOK_ITEMS.length}
            </span>
            <Magnet strength={12}>
              <button
                onClick={handleNext}
                className="btn-icon"
                aria-label="Próximo look"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </Magnet>
          </div>
        </div>

        {/* Main Editorial Card Container */}
        <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
          {/* Left Column: Image */}
          <div className="lg:col-span-7 relative h-[400px] lg:h-full overflow-hidden bg-black">
            <img
              src={current.image}
              alt={current.title}
              className="w-full h-full object-cover object-center transition-all duration-700 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-transparent to-transparent lg:hidden" />
          </div>

          {/* Right Column: Editorial Text */}
          <div className="lg:col-span-5 p-8 sm:p-12 flex flex-col justify-between space-y-6">
            <div>
              <span className="text-[11px] font-bold tracking-[0.25em] text-[#d4af37] uppercase">
                {current.subtitle}
              </span>
              <h3 className="font-display font-extrabold text-3xl sm:text-4xl text-white mt-2">
                {current.title}
              </h3>
              <p className="text-gray-300 italic text-base mt-6 border-l-2 border-[#d4af37] pl-4 py-1">
                {current.quote}
              </p>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-3">
                — {current.designer}
              </p>
            </div>

            {/* Featured Item Box inside Lookbook */}
            <div className="glass-panel p-5 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Destaque do Look
                </span>
                <div className="font-display font-bold text-white text-base mt-0.5">
                  {current.featuredProduct}
                </div>
                <div className="text-[#d4af37] font-extrabold text-sm mt-0.5">
                  R$ {current.price.toLocaleString('pt-BR')}
                </div>
              </div>
              <Magnet strength={12}>
                <a
                  href="#colecao"
                  className="btn-primary text-xs py-2 px-3"
                >
                  <span>Comprar Peça</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </Magnet>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
