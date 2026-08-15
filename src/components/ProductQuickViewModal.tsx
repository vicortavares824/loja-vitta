import React, { useState } from 'react';
import { X, Star, ShoppingBag, Heart, ShieldCheck, Truck, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import type { ProductColor } from '../types/ecommerce';
import { Magnet } from './react-bits/Magnet';

export const ProductQuickViewModal: React.FC = () => {
  const { quickViewProduct, setQuickViewProduct, addToCart, toggleWishlist, isInWishlist, formatPrice } = useCart();
  
  if (!quickViewProduct) return null;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<ProductColor>(quickViewProduct.colors[0] || { name: 'Padrão', hex: '#ffffff' });
  const [selectedSize, setSelectedSize] = useState<string>(quickViewProduct.sizes[0] || 'M');
  const [quantity, setQuantity] = useState<number>(1);

  const inWish = isInWishlist(quickViewProduct.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-[#121216] rounded-3xl overflow-hidden border border-white/20 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => setQuickViewProduct(null)}
          className="absolute top-5 right-5 z-20 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white hover:text-black flex items-center justify-center transition-all"
          aria-label="Fechar modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 p-6 sm:p-10">
          {/* Left Column: Image Gallery */}
          <div className="md:col-span-6 space-y-4">
            <div className="relative h-80 sm:h-96 rounded-2xl overflow-hidden bg-black border border-white/10">
              <img
                src={quickViewProduct.images[activeImageIndex] || quickViewProduct.images[0]}
                alt={quickViewProduct.name}
                className="w-full h-full object-cover object-center"
              />
              {quickViewProduct.tag && (
                <span className="absolute top-4 left-4 bg-white text-black font-extrabold text-[10px] tracking-widest uppercase px-3 py-1 rounded-full shadow">
                  {quickViewProduct.tag}
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {quickViewProduct.images.length > 1 && (
              <div className="flex gap-3">
                {quickViewProduct.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      activeImageIndex === idx ? 'border-white scale-105' : 'border-white/10 opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Details */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-6">
            <div>
              {/* Category & Rating */}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="uppercase tracking-widest text-white font-bold">
                  {quickViewProduct.category}
                </span>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-white text-white" />
                  <span className="font-bold text-white">{quickViewProduct.rating}</span>
                  <span className="text-[11px] text-gray-400">({quickViewProduct.reviewsCount})</span>
                </div>
              </div>

              {/* Product Name */}
              <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white mt-2">
                {quickViewProduct.name}
              </h2>

              {/* Price */}
              <div className="flex items-baseline gap-3 mt-3">
                <span className="font-display font-extrabold text-2xl sm:text-3xl text-white">
                  {formatPrice(quickViewProduct.price)}
                </span>
                {quickViewProduct.originalPrice && (
                  <span className="text-sm text-gray-400 line-through">
                    {formatPrice(quickViewProduct.originalPrice)}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-gray-300 text-xs sm:text-sm mt-4 leading-relaxed font-light">
                {quickViewProduct.description}
              </p>

              {/* Color Selector */}
              {quickViewProduct.colors && quickViewProduct.colors.length > 0 && (
                <div className="mt-6 space-y-2">
                  <span className="text-xs text-gray-400 font-medium">
                    Cor selecionada: <strong className="text-white">{selectedColor.name}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    {quickViewProduct.colors.map(color => (
                      <button
                        key={color.name}
                        onClick={() => setSelectedColor(color)}
                        className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${
                          selectedColor.name === color.name
                            ? 'border-white scale-110 ring-2 ring-white/50'
                            : 'border-white/20 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        {selectedColor.name === color.name && (
                          <Check className="w-3.5 h-3.5 text-white stroke-[3] mix-blend-difference" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              {quickViewProduct.sizes && quickViewProduct.sizes.length > 0 && (
                <div className="mt-6 space-y-2">
                  <span className="text-xs text-gray-400 font-medium">Tamanho:</span>
                  <div className="flex flex-wrap gap-2">
                    {quickViewProduct.sizes.map(size => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          selectedSize === size
                            ? 'bg-white text-black shadow-lg'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="mt-6 flex items-center gap-4">
                <span className="text-xs text-gray-400 font-medium">Quantidade:</span>
                <div className="flex items-center gap-2 bg-white/10 rounded-xl border border-white/15 p-1">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20 font-bold"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-white">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4 pt-6 border-t border-white/10">
              <div className="flex items-center gap-3">
                <Magnet strength={16} className="flex-1">
                  <button
                    onClick={() => {
                      addToCart(quickViewProduct, selectedColor, selectedSize, quantity);
                      setQuickViewProduct(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-white text-black font-extrabold text-xs uppercase tracking-widest py-3.5 px-6 rounded-full hover:bg-gray-200 transition-all shadow-xl"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Adicionar ao Carrinho</span>
                  </button>
                </Magnet>
                <button
                  onClick={() => toggleWishlist(quickViewProduct)}
                  className={`w-12 h-12 rounded-full border border-white/20 flex items-center justify-center transition-all ${
                    inWish ? 'bg-red-500/20 text-red-500 border-red-500/50' : 'text-white hover:bg-white/10'
                  }`}
                  aria-label="Salvar nos favoritos"
                >
                  <Heart className={`w-5 h-5 ${inWish ? 'fill-red-500' : ''}`} />
                </button>
              </div>

              {/* Guarantees */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400 pt-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span>Autenticidade Garantida</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-white" />
                  <span>Frete Expresso Grátis</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
