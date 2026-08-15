import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, Filter, X, ArrowUpDown, Sparkles, RefreshCw } from 'lucide-react';
import type { Product, Category } from '../../types/ecommerce';
import { tomatoApi } from '../../services/tomatoApi';
import { ProductCardModern } from '../ProductCardModern';
import { CardSkeleton } from '../ui/Skeleton';

interface ProductsPageProps {
  initialCategory?: string;
  onSelectCategory?: (slug: string) => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  initialCategory = 'all',
  onSelectCategory
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [selectedColor, setSelectedColor] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<number>(5000);
  const [sortOption, setSortOption] = useState<string>('default');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  useEffect(() => {
    tomatoApi.getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    setLoading(true);
    tomatoApi.getProducts(selectedCategory, searchQuery, sortOption).then(data => {
      let filtered = data.filter(p => p.price <= priceRange);
      
      if (selectedSize !== 'all') {
        filtered = filtered.filter(p => p.sizes && p.sizes.includes(selectedSize));
      }

      if (selectedColor !== 'all') {
        filtered = filtered.filter(p => p.colors && p.colors.some(c => c.name.toLowerCase().includes(selectedColor.toLowerCase())));
      }

      setProducts(filtered);
      setLoading(false);
    });
  }, [selectedCategory, searchQuery, sortOption, priceRange, selectedSize, selectedColor]);

  const allSizes = ['S', 'M', 'L', 'XL'];
  const allColorPresets = [
    { name: 'Preto', hex: '#000000' },
    { name: 'Branco', hex: '#ffffff' },
    { name: 'Cinza', hex: '#808080' },
    { name: 'Grafite', hex: '#333333' }
  ];

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedSize('all');
    setSelectedColor('all');
    setPriceRange(5000);
    setSearchQuery('');
    setSortOption('default');
    if (onSelectCategory) onSelectCategory('all');
  };

  const hasActiveFilters = selectedCategory !== 'all' || selectedSize !== 'all' || selectedColor !== 'all' || priceRange < 5000 || searchQuery !== '';

  return (
    <div className="pt-28 pb-24 min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Breadcrumbs / Title */}
        <div className="mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold uppercase tracking-widest mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Coleção Completa</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight uppercase">
              Catálogo de Peças
            </h1>
            <p className="text-gray-400 text-sm mt-2 max-w-xl">
              Navegue por nossa linha de alfaiataria, vestidos, jaquetas e streetwear de alta precisão.
            </p>
          </div>

          {/* Quick Stats & Mobile Toggle */}
          <div className="flex items-center justify-between sm:justify-end gap-4">
            <span className="text-xs font-medium text-gray-400">
              <strong className="text-white text-base">{products.length}</strong> produtos encontrados
            </span>

            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-full text-xs font-bold uppercase tracking-wider"
            >
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Filters */}
          <aside className={`lg:col-span-3 space-y-8 ${mobileFilterOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white/5 rounded-3xl p-6 border border-white/10 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-white" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
                    Filtros
                  </h3>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 font-medium transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Limpar
                  </button>
                )}
              </div>

              {/* Categorias */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block mb-3">
                  Categorias
                </label>
                <div className="space-y-1.5">
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      if (onSelectCategory) onSelectCategory('all');
                    }}
                    className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                      selectedCategory === 'all'
                        ? 'bg-white text-black font-bold'
                        : 'text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <span>Todas as Peças</span>
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.slug);
                        if (onSelectCategory) onSelectCategory(cat.slug);
                      }}
                      className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                        selectedCategory === cat.slug
                          ? 'bg-white text-black font-bold'
                          : 'text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className="text-[10px] opacity-70">({cat.itemCount || 10})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Faixa de Preço */}
              <div className="border-t border-white/10 pt-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                    Preço Máximo
                  </label>
                  <span className="text-xs font-bold text-white">
                    R$ {priceRange.toLocaleString('pt-BR')}
                  </span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="100"
                  value={priceRange}
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                  className="w-full accent-white cursor-pointer bg-white/20 h-1.5 rounded-lg"
                />
              </div>

              {/* Tamanho */}
              <div className="border-t border-white/10 pt-5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block mb-3">
                  Tamanho
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedSize('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedSize === 'all' ? 'bg-white text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    Todos
                  </button>
                  {allSizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[36px] h-8 px-2.5 rounded-lg text-xs font-bold transition-all ${
                        selectedSize === size ? 'bg-white text-black shadow-md' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cores */}
              <div className="border-t border-white/10 pt-5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block mb-3">
                  Cor Predominante
                </label>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => setSelectedColor('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedColor === 'all' ? 'bg-white text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    Todas
                  </button>
                  {allColorPresets.map(color => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        selectedColor === color.name
                          ? 'border-white scale-125 ring-2 ring-white/50'
                          : 'border-white/30 hover:scale-110'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Products Grid Column */}
          <main className="lg:col-span-9 space-y-6">
            {/* Top Toolbar (Sort & Active filter chips) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
              {/* Active Badges */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-gray-400">Ativos:</span>
                {selectedCategory !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 bg-white text-black font-bold px-3 py-1 rounded-full text-[11px]">
                    {selectedCategory}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCategory('all')} />
                  </span>
                )}
                {selectedSize !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 bg-white text-black font-bold px-3 py-1 rounded-full text-[11px]">
                    Tam: {selectedSize}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedSize('all')} />
                  </span>
                )}
                {selectedColor !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 bg-white text-black font-bold px-3 py-1 rounded-full text-[11px]">
                    Cor: {selectedColor}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedColor('all')} />
                  </span>
                )}
                {!hasActiveFilters && (
                  <span className="text-gray-500 italic text-[11px]">Nenhum filtro restritivo aplicado</span>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 justify-end">
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="bg-black text-white text-xs font-semibold rounded-xl px-3 py-2 border border-white/20 focus:outline-none cursor-pointer"
                >
                  <option value="default">Relevância / Lançamentos</option>
                  <option value="price-asc">Menor Preço</option>
                  <option value="price-desc">Maior Preço</option>
                  <option value="rating">Mais Bem Avaliados</option>
                </select>
              </div>
            </div>

            {/* Grid with Skeletons */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <CardSkeleton key={n} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-24 bg-white/5 rounded-3xl border border-white/10 p-8 space-y-4">
                <h3 className="text-xl font-bold text-white">Nenhum produto encontrado</h3>
                <p className="text-gray-400 text-sm max-w-md mx-auto">
                  Tente ajustar ou limpar seus filtros de categoria, tamanho ou faixa de preço.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-6 py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full hover:bg-gray-200 transition-colors"
                >
                  Limpar Todos os Filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(product => (
                  <ProductCardModern key={product.id} product={product} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
