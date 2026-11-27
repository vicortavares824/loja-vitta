import { useState } from 'react';
import type { MouseEvent } from 'react';
import { ArrowUpRight, Heart, Plus } from 'lucide-react';
import type { Product, ProductColor } from '../types/ecommerce';
import { useCart } from '../context/CartContext';

interface ProductCardModernProps {
  product: Product;
  className?: string;
}

const FALLBACK_COLOR: ProductColor = { name: 'Padrão', hex: '#f2f0eb' };
/** Bolinhas de cor visíveis no card; o resto aparece como "+N" (abre a visualização rápida). */
const MAX_SWATCHES = 5;

/**
 * Card editorial: foto 3:4 sem moldura, nome e preço em linha.
 *  - Mouse: a segunda foto entra por cima no hover e uma barra de tamanhos
 *    sobe da base da foto; clicar num tamanho já adiciona à sacola.
 *  - Toque: botão "+" fixo abre a visualização rápida (escolha de cor/tamanho).
 */
export function ProductCardModern({ product, className = '' }: ProductCardModernProps) {
  const { addToCart, toggleWishlist, isInWishlist, formatPrice, setQuickViewProduct } = useCart();
  const colors = product.colors?.length ? product.colors : [FALLBACK_COLOR];
  const [selectedColor, setSelectedColor] = useState<ProductColor>(colors[0]);
  const inWishlist = isInWishlist(product.id);
  const soldOut = product.inStock === false || product.stockCount === 0;

  const primary = product.images?.[0] ?? '';
  const secondary = product.images?.[1];

  const openQuickView = () => setQuickViewProduct(product);

  const stop = (e: MouseEvent) => e.stopPropagation();

  const addSize = (e: MouseEvent, size: string) => {
    e.stopPropagation();
    addToCart(product, selectedColor, size, 1);
  };

  return (
    <article className={`group/card relative flex flex-col ${className}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={openQuickView}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openQuickView();
          }
        }}
        data-cursor="Ver"
        aria-label={`Ver ${product.name}`}
        className="relative aspect-[3/4] cursor-pointer overflow-hidden bg-ink-2"
      >
        {!primary && (
          <span className="eyebrow absolute inset-0 flex items-center justify-center" aria-hidden>
            Sem foto
          </span>
        )}
        {primary && (
          <img
            src={primary}
            alt={product.name}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)]:group-hover/card:scale-[1.03]"
          />
        )}
        {secondary && (
          <img
            src={secondary}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)]:group-hover/card:opacity-100"
          />
        )}

        {/* Selos */}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {soldOut ? (
            <span className="eyebrow bg-ink/80 px-2 py-1 text-paper">Esgotado</span>
          ) : (
            product.tag && <span className="eyebrow max-w-[8rem] truncate bg-paper px-2 py-1 text-ink">{product.tag}</span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            stop(e);
            toggleWishlist(product);
          }}
          aria-pressed={inWishlist}
          aria-label={inWishlist ? `Remover ${product.name} dos favoritos` : `Favoritar ${product.name}`}
          className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center text-paper transition-transform duration-150 active:scale-90"
        >
          <Heart className={`h-[18px] w-[18px] drop-shadow ${inWishlist ? 'fill-paper' : ''}`} strokeWidth={1.5} />
        </button>

        {/* Barra de tamanhos (mouse) */}
        {!soldOut && product.sizes?.length > 0 && (
          <div
            onClick={stop}
            className="absolute inset-x-2 bottom-2 hidden translate-y-[calc(100%+8px)] bg-ink/90 p-1.5 backdrop-blur-sm transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-focus-within/card:translate-y-0 group-hover/card:translate-y-0 [@media(hover:hover)_and_(pointer:fine)]:block"
          >
            <p className="eyebrow px-1.5 pb-1 pt-0.5">Adicionar tamanho</p>
            <div className="flex flex-wrap gap-1">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={(e) => addSize(e, size)}
                  className="min-w-9 flex-1 py-2 font-mono text-[12px] text-paper transition-colors duration-150 hover:bg-paper hover:text-ink active:scale-95"
                  aria-label={`Adicionar ${product.name} tamanho ${size} à sacola`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Botão rápido (toque) */}
        {!soldOut && (
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              openQuickView();
            }}
            aria-label={`Escolher tamanho de ${product.name}`}
            className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-paper text-ink active:scale-90 [@media(hover:hover)_and_(pointer:fine)]:hidden"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Informações */}
      <div className="flex flex-1 flex-col gap-2 pt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 font-display text-[13px] font-medium uppercase leading-snug tracking-[0.02em] sm:text-sm">
            <button type="button" onClick={openQuickView} className="line-clamp-2 text-left [overflow-wrap:anywhere]">
              {product.name}
            </button>
          </h3>
          <div className="shrink-0 text-right">
            <p className="font-mono text-[12px] tabular-nums text-paper sm:text-[13px]">{formatPrice(product.price)}</p>
            {product.originalPrice !== undefined && product.originalPrice > product.price && (
              <p className="font-mono text-[11px] tabular-nums text-mute line-through">{formatPrice(product.originalPrice)}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          {colors.length > 1 ? (
            <div className="-ml-1.5 flex flex-wrap items-center" role="radiogroup" aria-label="Cor">
              {colors.slice(0, MAX_SWATCHES).map((color) => {
                const selected = selectedColor.name === color.name;
                return (
                  <button
                    key={color.name}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSelectedColor(color)}
                    title={color.name}
                    aria-label={color.name}
                    className="flex h-7 w-7 items-center justify-center"
                  >
                    <span
                      className={`block h-3 w-3 rounded-full ring-1 ring-offset-2 ring-offset-ink transition-shadow ${
                        selected ? 'ring-paper' : 'ring-transparent'
                      }`}
                      style={{ backgroundColor: color.hex, boxShadow: 'inset 0 0 0 1px rgba(242,240,235,0.25)' }}
                    />
                  </button>
                );
              })}
              {colors.length > MAX_SWATCHES && (
                <button
                  type="button"
                  onClick={openQuickView}
                  className="eyebrow h-7 px-1 hover:text-paper"
                  aria-label={`Ver todas as ${colors.length} cores`}
                >
                  +{colors.length - MAX_SWATCHES}
                </button>
              )}
            </div>
          ) : (
            <span className="eyebrow truncate">{colors[0].name}</span>
          )}

          {product.shopeeUrl && (
            <a
              href={product.shopeeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="eyebrow link-line flex shrink-0 items-center gap-1 hover:text-paper"
            >
              Shopee
              <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
