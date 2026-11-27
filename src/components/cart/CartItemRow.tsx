import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import type { CartItem } from '../../types/ecommerce';
import { EASE_OUT } from '../home/motionTokens';

interface CartItemRowProps {
  item: CartItem;
  formatPrice: (value: number) => string;
  onChangeQuantity: (delta: 1 | -1) => void;
  onRemove: () => void;
  reduced: boolean;
}

/**
 * Linha da sacola. Ao remover, a linha some e encolhe (altura → 0) enquanto as
 * de baixo sobem para fechar o espaço — tudo de uma vez, sem cascata.
 */
export const CartItemRow = forwardRef<HTMLLIElement, CartItemRowProps>(function CartItemRow(
  { item, formatPrice, onChangeQuantity, onRemove, reduced },
  ref,
) {
  const { product, selectedColor, selectedSize, quantity } = item;

  return (
    <motion.li
      ref={ref}
      layout={!reduced}
      initial={false}
      exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0, transition: { duration: 0.28, ease: EASE_OUT } }}
      className="overflow-hidden border-b border-line"
    >
      <div className="flex gap-4 py-4">
        <div className="aspect-[3/4] w-20 shrink-0 overflow-hidden bg-ink-3">
          {product.images?.[0] && <img src={product.images[0]} alt="" className="h-full w-full object-cover" />}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <h4 className="line-clamp-2 min-w-0 text-sm leading-snug [overflow-wrap:anywhere]">{product.name}</h4>
            <span className="shrink-0 font-mono text-[13px] tabular-nums">{formatPrice(product.price * quantity)}</span>
          </div>
          <p className="eyebrow mt-1.5 flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: selectedColor.hex, boxShadow: 'inset 0 0 0 1px rgba(242,240,235,0.3)' }}
            />
            <span className="truncate">{selectedColor.name}</span>
            <span aria-hidden>·</span>
            <span>Tam. {selectedSize}</span>
          </p>

          <div className="mt-auto flex items-center justify-between pt-3">
            <div className="flex items-center border border-line-strong">
              <button
                type="button"
                onClick={() => onChangeQuantity(-1)}
                disabled={quantity <= 1}
                className="flex h-9 w-9 items-center justify-center disabled:opacity-30"
                aria-label={`Diminuir quantidade de ${product.name}`}
              >
                <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <span className="w-7 text-center font-mono text-[13px] tabular-nums">{quantity}</span>
              <button
                type="button"
                onClick={() => onChangeQuantity(1)}
                className="flex h-9 w-9 items-center justify-center"
                aria-label={`Aumentar quantidade de ${product.name}`}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="eyebrow link-line tap-target hover:text-paper"
              aria-label={`Remover ${product.name}`}
            >
              Remover
            </button>
          </div>
        </div>
      </div>
    </motion.li>
  );
});
