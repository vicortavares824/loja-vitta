import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProductGrid } from './components/ProductGrid';
import { CartProvider, useCart } from './context/CartContext';
import { ProductQuickViewModal } from './components/ProductQuickViewModal';
import { CartDrawer } from './components/CartDrawer';
import { SearchModal } from './components/SearchModal';
import { CheckCircle2, Info, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';

// New Pages
import { ProductsPage } from './components/pages/ProductsPage';
import { CategoriesPage } from './components/pages/CategoriesPage';
import { SearchPage } from './components/pages/SearchPage';
import { TomatoAdminPanel } from './components/admin/TomatoAdminPanel';

// React Bits Animations
import MagicRings from './components/reactbits/MagicRings';
import WarpText from './components/reactbits/WarpText';
import ScrollVelocity from './components/reactbits/ScrollVelocity';
import ScrollExpand from './components/reactbits/ScrollExpand';

import LaserFlow from './components/reactbits/LaserFlow';
import Cubes from './components/reactbits/Cubes';

const ToastContainer = () => {
  const { toasts } = useCart();

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white text-black font-semibold p-4 rounded-2xl border border-gray-200 shadow-2xl flex items-center gap-3 text-xs max-w-sm"
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          ) : toast.type === 'info' ? (
            <Info className="w-5 h-5 text-gray-700 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          )}
          <p>{toast.message}</p>
        </div>
      ))}
    </div>
  );
};

export default function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'products' | 'categories' | 'search' | 'admin'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Configuração global para fundo escuro
  useEffect(() => {
    document.body.style.backgroundColor = '#000000';
    document.body.style.color = '#ffffff';
  }, []);

  const handleNavigate = (tab: string, categorySlug?: string) => {
    if (categorySlug) {
      setSelectedCategory(categorySlug);
    }
    setCurrentTab(tab as any);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategoryFromHomeOrPage = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setCurrentTab('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <CartProvider>
      <div className="min-h-screen relative overflow-x-hidden text-white bg-black font-sans selection:bg-white selection:text-black">
      

        {/* Dynamic Global Navbar */}
        <Navbar currentTab={currentTab} onNavigate={handleNavigate} />

        {/* VIEW 1: HOME PAGE WITH REACT BITS ANIMATIONS */}
        {currentTab === 'home' && (
          <main className="animate-fadeIn">
            {/* HERO SECTION - MAGIC RINGS */}
            <section className="relative h-screen flex items-center justify-center overflow-hidden bg-black">
              <div className="absolute inset-0 z-0 opacity-70">
                <MagicRings 
                  color="#ffffff" 
                  colorTwo="#999999"
                  ringCount={8} 
                  speed={1.4}
                  followMouse={true}
                  blur={1}
                />
              </div>
              
              <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold uppercase tracking-[0.25em] backdrop-blur-md border border-white/15">
                  <Sparkles className="w-3.5 h-3.5" />
                  <p>Nova Coleção 2026</p>
                </div>

                <h1 className="text-6xl sm:text-8xl md:text-[10rem] font-extrabold tracking-tighter uppercase leading-none text-white">
                  VITTA
                </h1>
                
                <h2 className="text-2xl sm:text-4xl md:text-5xl font-light tracking-[0.3em] uppercase text-gray-300">
                  Basics
                </h2>

                <p className="text-gray-400 text-xs sm:text-sm max-w-md mx-auto font-light tracking-widest uppercase pt-2">
                  Simplicity is the ultimate sophistication
                </p>

                <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                  <button
                    onClick={() => handleNavigate('products')}
                    className="px-8 py-3.5 bg-white text-black font-extrabold text-xs uppercase tracking-widest rounded-full hover:bg-gray-200 transition-all transform hover:scale-105 shadow-2xl flex items-center gap-2"
                  >
                    <p>Ver Catálogo</p>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleNavigate('categories')}
                    className="px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-widest rounded-full border border-white/20 transition-all backdrop-blur-md"
                  >
                    Categorias
                  </button>
                </div>
              </div>
            </section>

            {/* MARQUEE TEXT */}
            <section className="py-20 bg-black border-y border-white/10">
              <ScrollVelocity
                texts={['ESSENTIALS FOR EVERYDAY', 'SIMPLICITY IS THE ULTIMATE SOPHISTICATION', 'MINIMALIST FASHION']}
                className="text-4xl md:text-6xl font-extrabold uppercase tracking-tight text-white"
                velocity={45}
              />
            </section>

            {/* SCROLL EXPAND - SHOWCASE */}
            <section className="py-28 bg-[#050507] relative flex flex-col items-center border-b border-white/10">
              <div className="container mx-auto px-4 mb-16 text-center">
                <h2 className="text-3xl md:text-5xl font-extrabold uppercase tracking-tight text-white mx-auto">
                  <WarpText text="THE NEW COLLECTION" />
                </h2>
                <p className="text-gray-400 text-sm mt-3 font-normal max-w-md mx-auto">
                  Silhuetas minimalistas com corte sob medida e precisão artesanal.
                </p>
              </div>
              
              <div className="w-full max-w-6xl px-4">
                <ScrollExpand scaleFrom={0.75} scaleTo={1} borderRadius="28px">
                  <div className="relative w-full h-[65vh] group overflow-hidden border border-white/20 rounded-[28px] shadow-2xl">
                    <img 
                      src="https://images.unsplash.com/photo-1550614000-4b95d415d140?auto=format&fit=crop&q=80&w=2000" 
                      alt="New Collection Showcase" 
                      className="w-full h-full object-cover grayscale contrast-125 group-hover:scale-105 transition-transform duration-1000"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <button 
                        onClick={() => handleNavigate('products')}
                        className="px-8 py-4 bg-white text-black font-extrabold text-xs uppercase tracking-widest rounded-full hover:bg-gray-200 transition-colors shadow-2xl"
                      >
                        Explorar Todas as Peças
                      </button>
                    </div>
                  </div>
                </ScrollExpand>
              </div>
            </section>

            {/* PRODUCT GRID SECTION (LATEST ARRIVALS) */}
            <section className="py-24 bg-black relative z-10" id="shop">
              <ProductGrid maxItems={6} onCategoryChange={handleSelectCategoryFromHomeOrPage} />
              
              <div className="text-center mt-12">
                <button
                  onClick={() => handleNavigate('products')}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-bold text-xs uppercase tracking-widest rounded-full hover:bg-gray-200 transition-all shadow-xl hover:scale-105"
                >
                  <p>Abrir Catálogo Completo com Filtros</p>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>

            {/* LASER FLOW SECTION */}
            <section className="relative h-[75vh] flex items-center justify-center overflow-hidden bg-black border-y border-white/10">
              <div className="absolute inset-0 z-0 opacity-30">
                <LaserFlow 
                  color="#ffffff" 
                  flowSpeed={1.4}
                />
              </div>
              <div className="relative z-10 max-w-3xl mx-auto px-6 text-center mix-blend-difference pointer-events-none space-y-4">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400 font-extrabold block">
                  Manifesto Vitta
                </p>
                <h3 className="text-3xl md:text-5xl font-extrabold uppercase tracking-tight leading-tight text-white">
                  Redefining the standard of basic wear through uncompromised quality.
                </h3>
              </div>
            </section>

            {/* CUBES FEATURE GRID */}
            <section className="py-28 bg-[#0a0a0c] relative overflow-hidden">
              <div className="absolute inset-0 opacity-15 pointer-events-none">
                <Cubes faceColor="#ffffff" autoAnimate={true} />
              </div>
              <div className="container mx-auto px-4 relative z-10 flex flex-col items-center">
                <h2 className="text-3xl font-extrabold uppercase tracking-[0.2em] mb-16 text-white text-center">
                  <WarpText text="PURE FORM & MATERIAL" />
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
                  {[
                    { title: "Design", desc: "Geometria minimalista e proporções milimétricas." },
                    { title: "Tecidos", desc: "Algodão orgânico, lã fria e seda pura de alta durabilidade." },
                    { title: "Sustentabilidade", desc: "Produção consciente com tiragens limitadas e atemporais." }
                  ].map((item, i) => (
                    <div key={i} className="text-center p-10 border border-white/15 bg-white/5 backdrop-blur-md rounded-3xl shadow-2xl transition-all duration-300 hover:border-white hover:-translate-y-2">
                      <h4 className="text-xl font-extrabold mb-3 uppercase tracking-wider text-white">{item.title}</h4>
                      <p className="text-gray-400 font-normal text-xs sm:text-sm tracking-wide leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>
        )}

        {/* VIEW 2: PRODUCTS CATALOG PAGE */}
        {currentTab === 'products' && (
          <div className="animate-fadeIn">
            <ProductsPage initialCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
          </div>
        )}

        {/* VIEW 3: CATEGORIES PAGE */}
        {currentTab === 'categories' && (
          <div className="animate-fadeIn">
            <CategoriesPage onSelectCategory={handleSelectCategoryFromHomeOrPage} />
          </div>
        )}

        {/* VIEW 4: SEARCH PAGE */}
        {currentTab === 'search' && (
          <div className="animate-fadeIn">
            <SearchPage />
          </div>
        )}

        {/* VIEW 5: TOMATO ADMIN PANEL */}
        {currentTab === 'admin' && (
          <div className="animate-fadeIn">
            <TomatoAdminPanel />
          </div>
        )}

        {/* Global Modals & Drawers */}
        <Footer onNavigate={handleNavigate} />
        <ToastContainer />
        <CartDrawer />
        <SearchModal />
        <ProductQuickViewModal />
      </div>
    </CartProvider>
  );
}
