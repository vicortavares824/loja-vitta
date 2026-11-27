import { useEffect, useId, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

type DesktopPlacement = 'right' | 'center';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Esconde o título visualmente (continua para leitores de tela). */
  hideTitle?: boolean;
  /** Como o painel aparece a partir de 768px. No celular é sempre folha inferior. */
  desktop?: DesktopPlacement;
  /** Classe de largura do painel no desktop (ex.: 'md:max-w-md'). */
  widthClassName?: string;
  children: ReactNode;
  footer?: ReactNode;
}

const DRAWER_EASE = [0.32, 0.72, 0, 1] as const;
const DISMISS_OFFSET = 120;
const DISMISS_VELOCITY = 500;

/**
 * Painel modal único para o site: folha inferior arrastável no celular,
 * gaveta lateral ou janela central no desktop.
 *  - Trava a rolagem da página, fecha com Esc e clique fora.
 *  - Move o foco para o painel ao abrir e devolve ao elemento anterior ao fechar.
 *  - Arrastar para baixo (celular) fecha quando passa de 120px ou é jogado rápido.
 */
export function Sheet({
  open,
  onClose,
  title,
  hideTitle = false,
  desktop = 'right',
  widthClassName = 'md:max-w-md',
  children,
  footer,
}: SheetProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const reduced = usePrefersReducedMotion();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const dragControls = useDragControls();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => panelRef.current?.focus({ preventScroll: true }), 30);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, [open]);

  const placement: 'bottom' | DesktopPlacement = isDesktop ? desktop : 'bottom';

  const hidden =
    reduced || placement === 'center'
      ? { opacity: 0, ...(placement === 'center' && !reduced ? { scale: 0.97 } : {}) }
      : placement === 'right'
        ? { x: '100%' }
        : { y: '100%' };
  const shown = { opacity: 1, x: 0, y: 0, scale: 1 };

  // Posicionamento por flex no contêiner: o framer-motion controla o `transform`
  // do painel, então não dá para centralizar com translate do Tailwind.
  const containerLayout =
    placement === 'right' ? 'justify-end' : placement === 'center' ? 'items-center justify-center p-6' : 'items-end';
  const panelShape =
    placement === 'right'
      ? 'h-full w-full border-l'
      : placement === 'center'
        ? 'max-h-[88vh] w-full border'
        : 'max-h-[92dvh] w-full rounded-t-[10px] border-t';
  const canDrag = placement === 'bottom' && !reduced;
  const startDrag = (e: ReactPointerEvent) => {
    if (canDrag) dragControls.start(e);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > DISMISS_OFFSET || info.velocity.y > DISMISS_VELOCITY) onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 z-[60] flex ${containerLayout}`} role="presentation">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-ink/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={`relative flex flex-col border-line bg-ink-2 text-paper outline-none ${panelShape} ${widthClassName}`}
            initial={hidden}
            animate={shown}
            exit={{ ...hidden, transition: { duration: reduced ? 0.15 : 0.3, ease: DRAWER_EASE } }}
            transition={{ duration: reduced ? 0.2 : 0.5, ease: DRAWER_EASE }}
            drag={canDrag ? 'y' : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={handleDragEnd}
          >
            <SheetHeader
              titleId={titleId}
              title={title}
              hideTitle={hideTitle}
              onClose={onClose}
              draggable={canDrag}
              onDragStart={startDrag}
            />
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
            {footer && (
              <div className="border-t border-line px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 md:px-6">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

interface SheetHeaderProps {
  titleId: string;
  title: string;
  hideTitle: boolean;
  onClose: () => void;
  draggable: boolean;
  onDragStart: (e: ReactPointerEvent) => void;
}

function SheetHeader({ titleId, title, hideTitle, onClose, draggable, onDragStart }: SheetHeaderProps) {
  return (
    <div
      onPointerDown={onDragStart}
      className={`relative flex shrink-0 items-center justify-between gap-4 px-5 pb-3 pt-3 md:px-6 md:pt-5 ${draggable ? 'touch-none' : ''}`}
    >
      {draggable && <span aria-hidden className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-paper/25" />}
      <h2 id={titleId} className={hideTitle ? 'sr-only' : 'eyebrow pt-3 text-paper md:pt-0'}>
        {title}
      </h2>
      <button type="button" onClick={onClose} className="btn-icon -mr-2 ml-auto mt-2 md:mt-0" aria-label="Fechar">
        <X className="h-5 w-5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
