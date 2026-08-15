import React, { useState } from 'react';
import { Heart, ShoppingBag, Eye, Plus, Minus, Check } from 'lucide-react';
import type { Product, ProductColor } from '../types/ecommerce';
import { useCart } from '../context/CartContext';
import { LazyImage } from './ui/LazyImage';

interface ProductCardModernProps {
  product: Product;
  className?: string;
}

export const ProductCardModern: React.FC<ProductCardModernProps> = ({ product, className = '' }) => {
  const { addToCart, toggleWishlist, isInWishlist, formatPrice, setQuickViewProduct } = useCart();
  const [selectedColor, setSelectedColor] = useState<ProductColor>(product.colors[0] || { name: 'Padrão', hex: '#ffffff' });
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes[0] || 'M');
  const [quantity, setQuantity] = useState<number>(1);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, selectedColor, selectedSize, quantity);
  };

  const handleDecrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quantity > 1) setQuantity(prev => prev - 1);
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quantity < (product.stockCount || 99)) setQuantity(prev => prev + 1);
  };

  return (
    <div 
      className={`group relative bg-white text-black rounded-[28px] p-4 sm:p-5 shadow-2xl transition-all duration-500 hover:-translate-y-2.5 flex flex-col justify-between border border-gray-100 ${className}`}
      style={{
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 255, 255, 0.05)'
      }}
    >
      {/* Top Image Area with LazyImage */}
      <div 
        onClick={() => setQuickViewProduct(product)}
        className="relative w-full h-64 sm:h-72 rounded-[22px] overflow-hidden bg-gray-50 flex items-center justify-center cursor-pointer"
      >
        <LazyImage
          src={product.images[activeImageIndex] || product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700 ease-out"
          containerClassName="w-full h-full"
        />

        {/* Tag Badge */}
        {product.tag && (
          <div className="absolute top-3 left-3 z-10">
            <span className="bg-black text-white text-[10px] font-extrabold tracking-widest uppercase px-3 py-1 rounded-full shadow-md">
              {product.tag}
            </span>
          </div>
        )}

        {/* Top Right Action Buttons (Wishlist & Quick View) */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product);
            }}
            className={`w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center transition-all shadow-md hover:scale-110 ${
              inWishlist ? 'text-red-500 fill-red-500' : 'text-gray-700 hover:text-black'
            }`}
            aria-label="Favoritar produto"
          >
            <Heart className={`w-4 h-4 ${inWishlist ? 'fill-red-500' : ''}`} />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setQuickViewProduct(product);
            }}
            className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-gray-700 hover:text-black transition-all shadow-md hover:scale-110 opacity-0 group-hover:opacity-100"
            title="Visualização Rápida"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Image Pagination Dots (if multiple images) */}
        {product.images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
            {product.images.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex(idx);
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  activeImageIndex === idx ? 'w-4 bg-white' : 'bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Ver imagem ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="pt-4 flex-1 flex flex-col justify-between space-y-4">
        {/* Title & Price */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 
              onClick={() => setQuickViewProduct(product)}
              className="font-bold text-base sm:text-lg text-black tracking-tight line-clamp-1 hover:underline cursor-pointer"
            >
              {product.name}
            </h3>
          </div>
          
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-extrabold text-xl sm:text-2xl text-black">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>

          <p className="text-xs text-gray-600 font-normal line-clamp-2 mt-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Interactive Selectors (Colors, Sizes, Quantity) */}
        <div className="space-y-3 pt-1 border-t border-gray-100">
          {/* Colors */}
          {product.colors && product.colors.length > 0 && (
            <div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                Cores
              </span>
              <div className="flex items-center gap-2">
                {product.colors.map((color) => {
                  const isSelected = selectedColor.name === color.name;
                  return (
                    <button
                      key={color.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedColor(color);
                      }}
                      className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
                        isSelected 
                          ? 'border-black scale-125 shadow-sm ring-2 ring-black/20' 
                          : 'border-gray-200 hover:scale-110'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                      aria-label={`Selecionar cor ${color.name}`}
                    >
                      {isSelected && (
                        <Check className="w-2.5 h-2.5 text-white stroke-[3] mix-blend-difference" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sizes */}
          {product.sizes && product.sizes.length > 0 && (
            <div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                Tamanho
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {product.sizes.map((size) => {
                  const isSelected = selectedSize === size;
                  return (
                    <button
                      key={size}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSize(size);
                      }}
                      className={`min-w-[32px] h-7 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center ${
                        isSelected
                          ? 'bg-black text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity & Add to Cart Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            {/* Quantity Stepper */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden sm:inline">
                Qtd
              </span>
              <div className="flex items-center bg-gray-100 rounded-full px-2 py-1 border border-gray-200">
                <button
                  onClick={handleDecrease}
                  disabled={quantity <= 1}
                  className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-black disabled:opacity-30"
                  aria-label="Diminuir quantidade"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center text-xs font-bold text-black">
                  {quantity}
                </span>
                <button
                  onClick={handleIncrease}
                  disabled={quantity >= (product.stockCount || 99)}
                  className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-black disabled:opacity-30"
                  aria-label="Aumentar quantidade"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Cart Button Pill (Ref visual da imagem) */}
            <button
              onClick={handleAddToCart}
              className="bg-black hover:bg-gray-800 text-white p-3 sm:px-4 sm:py-2.5 rounded-full flex items-center gap-2 shadow-lg transition-all transform hover:scale-105 active:scale-95 group/btn"
              title="Adicionar ao Carrinho"
            >
              <ShoppingBag className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
              <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
                Comprar
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
