import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, LogOut, Search, Server } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import type { Currency } from '../types/ecommerce';
import { STORE_CONFIG } from '../config/storeConfig';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { EASE_OUT } from './home/motionTokens';

interface NavbarProps {
  currentTab?: string;
  onNavigate?: (tab: string) => void;
}

interface NavLink {
  tab: string;
  label: string;
}

const PRIMARY_LINKS: NavLink[] = [
  { tab: 'home', label: 'Início' },
  { tab: 'products', label: 'Catálogo' },
  { tab: 'categories', label: 'Categorias' },
  { tab: 'search', label: 'Busca' },
];

const CURRENCIES: Currency[] = ['BRL', 'USD', 'EUR'];
const SCROLLED_AT = 24;
const HIDE_AFTER = 160;

/** Estado do cabeçalho: com fundo depois de rolar, escondido ao descer. */
function useHeaderScroll(locked: boolean) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled(y > SCROLLED_AT);
      const delta = y - lastY.current;
      if (Math.abs(delta) > 6) {
        setHidden(delta > 0 && y > HIDE_AFTER);
        lastY.current = y;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return { scrolled, hidden: hidden && !locked };
}

export function Navbar({ currentTab = 'home', onNavigate }: NavbarProps) {
  const { itemsCount, wishlist, currency, setCurrency, toggleCartDrawer } = useCart();
  const { isAuthenticated, user, isAdmin, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrolled, hidden } = useHeaderScroll(menuOpen);

  const firstName = user?.name.split(' ')[0] ?? '';
  const bagCount = isAuthenticated && itemsCount > 0 ? itemsCount : 0;

  const go = (tab: string) => {
    onNavigate?.(tab);
    setMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    go('home');
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)] transition-[transform,background-color,border-color] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
          hidden ? '-translate-y-full' : 'translate-y-0'
        } ${
          scrolled || menuOpen
            ? 'border-b border-line bg-ink/85 backdrop-blur-md'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto grid h-16 max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center px-[var(--gutter)]">
          {/* Esquerda: links (desktop) / botão de menu (mobile) */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="tap-target -ml-2 flex items-center gap-3 px-2 lg:hidden"
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <span aria-hidden className="relative block h-3 w-5">
                <span
                  className={`absolute left-0 top-0 h-px w-5 bg-paper transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                    menuOpen ? 'translate-y-[6px] rotate-45' : ''
                  }`}
                />
                <span
                  className={`absolute bottom-0 left-0 h-px w-5 bg-paper transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                    menuOpen ? '-translate-y-[5px] -rotate-45' : ''
                  }`}
                />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.08em]">{menuOpen ? 'Fechar' : 'Menu'}</span>
            </button>

            <nav aria-label="Principal" className="hidden items-center gap-7 lg:flex">
              {PRIMARY_LINKS.map((link) => {
                const active = currentTab === link.tab;
                return (
                  <button
                    key={link.tab}
                    type="button"
                    onClick={() => go(link.tab)}
                    aria-current={active ? 'page' : undefined}
                    className={`relative py-2 font-display text-[12px] font-medium uppercase tracking-[0.08em] transition-colors duration-200 ${
                      active ? 'text-paper' : 'text-mute hover:text-paper'
                    }`}
                  >
                    {link.label}
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-x-0 -bottom-px h-px bg-paper"
                        transition={{ duration: 0.35, ease: EASE_OUT }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Centro: marca */}
          <button
            type="button"
            onClick={() => go('home')}
            className="flex items-center gap-2.5 justify-self-center"
            aria-label={`${STORE_CONFIG.name} — início`}
          >
            <img src="/logo.jpg" alt="" className="h-8 w-8 rounded-full object-cover" />
            <span className="font-display text-[15px] font-bold uppercase tracking-[0.22em] sm:text-base">
              Vitta<span className="hidden sm:inline"> Basics</span>
            </span>
          </button>

          {/* Direita: ações */}
          <div className="flex items-center justify-end gap-1 sm:gap-2">
            <label className="hidden items-center md:flex">
              <span className="sr-only">Moeda</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="cursor-pointer appearance-none bg-transparent px-2 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-mute transition-colors hover:text-paper focus:outline-none"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c} className="bg-ink text-paper">
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" onClick={() => go('search')} className="btn-icon hidden sm:inline-flex" aria-label="Buscar produtos">
              <Search className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={() => go('products')}
              className="btn-icon relative hidden sm:inline-flex"
              aria-label={`Favoritos${wishlist.length ? ` (${wishlist.length})` : ''}`}
            >
              <Heart className={`h-[18px] w-[18px] ${wishlist.length > 0 ? 'fill-paper' : ''}`} strokeWidth={1.5} />
              {wishlist.length > 0 && (
                <span className="absolute right-1.5 top-1.5 font-mono text-[9px] leading-none">{wishlist.length}</span>
              )}
            </button>

            {isAuthenticated && user ? (
              <>
                <button
                  type="button"
                  onClick={() => go('profile')}
                  className="link-line hidden max-w-[110px] truncate py-1 font-display text-[12px] font-medium uppercase tracking-[0.08em] sm:block"
                  title="Meu perfil"
                >
                  {firstName}
                </button>
                {isAdmin && (
                  <button type="button" onClick={() => go('admin')} className="btn-icon hidden sm:inline-flex" aria-label="Painel admin">
                    <Server className="h-[18px] w-[18px]" strokeWidth={1.5} />
                  </button>
                )}
                <button type="button" onClick={handleLogout} className="btn-icon hidden sm:inline-flex" aria-label="Sair">
                  <LogOut className="h-[18px] w-[18px]" strokeWidth={1.5} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => go('login-client')}
                className="link-line hidden py-1 font-display text-[12px] font-medium uppercase tracking-[0.08em] sm:block"
              >
                Entrar
              </button>
            )}

            <button
              type="button"
              onClick={() => toggleCartDrawer(true)}
              className="press tap-target -mr-2 flex items-center gap-1.5 px-2 font-display text-[12px] font-semibold uppercase tracking-[0.08em]"
              aria-label={`Abrir sacola${bagCount ? `, ${bagCount} ${bagCount === 1 ? 'item' : 'itens'}` : ''}`}
            >
              <span>Sacola</span>
              <span className="font-mono text-[11px] tabular-nums text-mute">({bagCount})</span>
            </button>
          </div>
        </div>
      </header>

      <MobileMenu
        open={menuOpen}
        currentTab={currentTab}
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        firstName={firstName}
        onNavigate={go}
        onLogout={handleLogout}
        onClose={() => setMenuOpen(false)}
      />
    </>
  );
}

interface MobileMenuProps {
  open: boolean;
  currentTab: string;
  isAuthenticated: boolean;
  isAdmin: boolean;
  firstName: string;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  onClose: () => void;
}

function MobileMenu({ open, currentTab, isAuthenticated, isAdmin, firstName, onNavigate, onLogout, onClose }: MobileMenuProps) {
  const reduced = usePrefersReducedMotion();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const links: NavLink[] = [
    ...PRIMARY_LINKS,
    ...(isAuthenticated ? [{ tab: 'profile', label: 'Meu perfil' }] : [{ tab: 'login-client', label: 'Entrar' }]),
    ...(isAdmin ? [{ tab: 'admin', label: 'Painel admin' }] : []),
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-30 flex flex-col bg-ink px-[var(--gutter)] pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(96px+env(safe-area-inset-top))] lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.2 }}
        >
          <nav aria-label="Menu móvel" className="flex-1 overflow-y-auto overscroll-contain">
            <ul className="border-t border-line">
              {links.map((link, i) => {
                const active = currentTab === link.tab;
                return (
                  <motion.li
                    key={link.tab}
                    className="border-b border-line"
                    initial={reduced ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.04 + i * 0.04, ease: EASE_OUT }}
                  >
                    <button
                      type="button"
                      onClick={() => onNavigate(link.tab)}
                      aria-current={active ? 'page' : undefined}
                      className="flex w-full items-baseline gap-4 py-4 text-left"
                    >
                      <span className="eyebrow w-6 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                      <span
                        className={`font-display text-[34px] font-semibold uppercase leading-none tracking-[-0.03em] ${
                          active ? 'text-paper' : 'text-paper/55'
                        }`}
                      >
                        {link.label}
                      </span>
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center justify-between pt-6">
            <span className="eyebrow">{STORE_CONFIG.social.instagram}</span>
            {isAuthenticated && (
              <button type="button" onClick={onLogout} className="eyebrow tap-target flex items-center gap-2 text-paper">
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
                Sair{firstName ? ` (${firstName})` : ''}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
