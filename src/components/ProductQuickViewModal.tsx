import { useRef, useState } from "react";
import { Heart, Minus, Plus } from "lucide-react";
import { useCart } from "../context/CartContext";
import type { Product, ProductColor } from "../types/ecommerce";
import { Sheet } from "./ui/Sheet";

const FALLBACK_COLOR: ProductColor = { name: "Padrão", hex: "#f2f0eb" };
const MAX_QTY_FALLBACK = 99;

const FACTS = [
  "Frete calculado na sacola",
  "Pix ou cartão",
  "Cancele antes do envio",
];

/** Visualização rápida: galeria + escolha de cor, tamanho e quantidade. */
export function ProductQuickViewModal() {
  const { quickViewProduct, setQuickViewProduct } = useCart();
  return (
    <Sheet
      open={quickViewProduct !== null}
      onClose={() => setQuickViewProduct(null)}
      title={quickViewProduct?.name ?? "Produto"}
      hideTitle
      desktop="center"
      widthClassName="md:max-w-5xl"
    >
      {quickViewProduct && (
        <QuickViewContent
          key={quickViewProduct.id}
          product={quickViewProduct}
        />
      )}
    </Sheet>
  );
}

function QuickViewContent({ product }: { product: Product }) {
  const {
    setQuickViewProduct,
    addToCart,
    toggleWishlist,
    isInWishlist,
    formatPrice,
  } = useCart();
  const colors = product.colors?.length ? product.colors : [FALLBACK_COLOR];
  const [selectedColor, setSelectedColor] = useState<ProductColor>(colors[0]);
  const [selectedSize, setSelectedSize] = useState<string>(
    product.sizes?.[0] ?? "",
  );
  const [quantity, setQuantity] = useState(1);

  const inWish = isInWishlist(product.id);
  const soldOut = product.inStock === false || product.stockCount === 0;
  const maxQty = product.stockCount > 0 ? product.stockCount : MAX_QTY_FALLBACK;

  const handleAdd = () => {
    addToCart(product, selectedColor, selectedSize || undefined, quantity);
    setQuickViewProduct(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2">
      <Gallery
        images={product.images ?? []}
        name={product.name}
        tag={product.tag}
      />

      <div className="flex flex-col gap-7 px-5 pb-6 pt-5 md:px-8 md:pb-8 md:pt-2">
        <div>
          <p className="eyebrow mb-3">{product.category}</p>
          <h3 className="break-words font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold uppercase leading-[0.95] tracking-[-0.035em] [overflow-wrap:anywhere]">
            {product.name}
          </h3>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-mono text-lg tabular-nums">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice !== undefined &&
              product.originalPrice > product.price && (
                <span className="font-mono text-sm tabular-nums text-mute line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            {product.reviewsCount > 0 && (
              <span className="eyebrow ml-auto">
                ★ {product.rating.toFixed(1)} ({product.reviewsCount})
              </span>
            )}
          </div>
          {product.description && (
            <p className="mt-4 text-[15px] leading-relaxed text-paper-2">
              {product.description}
            </p>
          )}
        </div>

        {/* Cor */}
        <fieldset>
          <legend className="eyebrow mb-3">
            Cor — <span className="text-paper">{selectedColor.name}</span>
          </legend>
          <div
            className="-ml-1.5 flex flex-wrap"
            role="radiogroup"
            aria-label="Cor"
          >
            {colors.map((color) => {
              const active = selectedColor.name === color.name;
              return (
                <button
                  key={color.name}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={color.name}
                  title={color.name}
                  onClick={() => setSelectedColor(color)}
                  className="flex h-11 w-11 items-center justify-center"
                >
                  <span
                    className={`block h-6 w-6 rounded-full ring-1 ring-offset-[3px] ring-offset-ink-2 transition-shadow duration-150 ${
                      active ? "ring-paper" : "ring-transparent"
                    }`}
                    style={{
                      backgroundColor: color.hex,
                      boxShadow: "inset 0 0 0 1px rgba(242,240,235,0.25)",
                    }}
                  />
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Tamanho */}
        {product.sizes?.length > 0 && (
          <fieldset>
            <legend className="eyebrow mb-3">Tamanho</legend>
            <div
              className="grid grid-cols-4 gap-2 sm:grid-cols-5"
              role="radiogroup"
              aria-label="Tamanho"
            >
              {product.sizes.map((size) => {
                const active = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSelectedSize(size)}
                    className={`press min-h-11 truncate border px-2 font-mono text-[13px] uppercase transition-colors duration-150 ${
                      active
                        ? "border-paper bg-paper text-ink"
                        : "border-line-strong hover:border-paper"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {/* Quantidade + ações */}
        <div className="mt-auto space-y-4 border-t border-line pt-6">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Quantidade</span>
            <div className="flex items-center border border-line-strong">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="flex h-11 w-11 items-center justify-center disabled:opacity-30"
                aria-label="Diminuir quantidade"
              >
                <Minus className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <span
                className="w-8 text-center font-mono text-sm tabular-nums"
                aria-live="polite"
              >
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                disabled={quantity >= maxQty}
                className="flex h-11 w-11 items-center justify-center disabled:opacity-30"
                aria-label="Aumentar quantidade"
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1 md:order-last">
          {FACTS.map((fact) => (
            <li key={fact} className="eyebrow">
              {fact}
            </li>
          ))}
        </ul>

        <div className="sticky bottom-0 z-10 -mx-5 -mb-6 flex gap-2 border-t border-line bg-ink-2 px-5 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 md:static md:order-none md:mx-0 md:mb-0 md:border-0 md:p-0">
          <button
            type="button"
            onClick={handleAdd}
            disabled={soldOut}
            className="btn-primary flex-1"
          >
            {soldOut
              ? "Esgotado"
              : `Adicionar à sacola — ${formatPrice(product.price * quantity)}`}
          </button>
          <button
            type="button"
            onClick={() => toggleWishlist(product)}
            aria-pressed={inWish}
            aria-label={
              inWish ? "Remover dos favoritos" : "Salvar nos favoritos"
            }
            className="press flex h-12 w-12 shrink-0 items-center justify-center border border-line-strong transition-colors hover:border-paper"
          >
            <Heart
              className={`h-5 w-5 ${inWish ? "fill-paper" : ""}`}
              strokeWidth={1.5}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

interface GalleryProps {
  images: string[];
  name: string;
  tag?: string;
}

/** Carrossel com snap (deslizar no celular) + miniaturas no desktop. */
function Gallery({ images, name, tag }: GalleryProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const list = images.length > 0 ? images : [""];

  const goTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
  };

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setIndex(Math.round(track.scrollLeft / track.clientWidth));
  };

  return (
    <div className="relative md:pl-8 md:pb-8">
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="scrollbar-none flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto overscroll-x-contain bg-ink-3"
        >
          {list.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className="h-full w-full shrink-0 snap-center"
            >
              {src && (
                <img
                  src={src}
                  alt={i === 0 ? name : `${name} — foto ${i + 1}`}
                  loading={i === 0 ? "eager" : "lazy"}
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          ))}
        </div>
        {tag && (
          <span className="eyebrow absolute left-3 top-3 bg-paper px-2 py-1 text-ink">
            {tag}
          </span>
        )}
        {list.length > 1 && (
          <span className="eyebrow absolute bottom-3 right-3 bg-ink/80 px-2 py-1 text-paper tabular-nums">
            {index + 1} / {list.length}
          </span>
        )}
      </div>

      {list.length > 1 && (
        <div className="mt-2 hidden gap-2 md:flex">
          {list.map((src, i) => (
            <button
              key={`${src}-thumb-${i}`}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={index === i}
              className={`h-16 w-12 overflow-hidden bg-ink-3 transition-opacity duration-200 ${
                index === i ? "opacity-100" : "opacity-40 hover:opacity-80"
              }`}
            >
              {src && (
                <img src={src} alt="" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
