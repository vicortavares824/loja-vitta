import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, ArrowUp } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { STORE_CONFIG } from '../config/storeConfig';
import { LineReveal } from './home/HomeMotion';

interface FooterProps {
  onNavigate?: (tab: string) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SHOP_LINKS = [
  { tab: 'products', label: 'Catálogo' },
  { tab: 'categories', label: 'Categorias' },
  { tab: 'search', label: 'Busca' },
  { tab: 'profile', label: 'Meus pedidos' },
];

const HELP_ITEMS = ['Guia de medidas', 'Trocas e devoluções', 'Termos e privacidade'];

export function Footer({ onNavigate }: FooterProps) {
  const [email, setEmail] = useState('');
  const { showToast } = useCart();

  const handleSubscribe = (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_PATTERN.test(email.trim())) {
      showToast('Informe um e-mail válido.', 'error');
      return;
    }
    showToast('Inscrição confirmada. Você vai receber nossos lançamentos.', 'success');
    setEmail('');
  };

  const backToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="relative overflow-hidden border-t border-line bg-ink pb-[env(safe-area-inset-bottom)] text-paper">
      <div className="mx-auto max-w-[1600px] px-[var(--gutter)]">
        {/* Newsletter */}
        <div className="grid grid-cols-1 gap-10 border-b border-line py-16 md:grid-cols-12 md:py-24">
          <div className="md:col-span-6">
            <p className="eyebrow mb-5">Newsletter</p>
            <h2 className="font-display text-[clamp(2rem,5vw,4rem)] font-semibold uppercase leading-[0.95] tracking-[-0.035em]">
              <LineReveal
                lines={['Lançamentos', <>em <span className="font-serif-accent">primeira mão</span></>]}
                label="Lançamentos em primeira mão"
              />
            </h2>
          </div>
          <form onSubmit={handleSubscribe} className="self-end md:col-span-5 md:col-start-8" noValidate>
            <label htmlFor="footer-email" className="eyebrow mb-3 block">
              Seu e-mail
            </label>
            <div className="group flex items-center border-b border-line-strong transition-colors focus-within:border-paper">
              <input
                id="footer-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="nome@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-w-0 flex-1 bg-transparent py-4 text-base text-paper placeholder:text-mute focus:outline-none"
              />
              <button type="submit" className="btn-icon shrink-0" aria-label="Inscrever">
                <ArrowRight className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
            <p className="mt-3 text-xs text-mute">Sem spam. Só novidades e reposições.</p>
          </form>
        </div>

        {/* Colunas */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-14 md:grid-cols-12">
          <div className="col-span-2 md:col-span-5">
            <p className="max-w-sm text-sm leading-relaxed text-paper-2">{STORE_CONFIG.description}</p>
          </div>

          <div className="md:col-span-2 md:col-start-7">
            <p className="eyebrow mb-4">Loja</p>
            <ul className="space-y-2.5 text-sm">
              {SHOP_LINKS.map((link) => (
                <li key={link.tab}>
                  <button type="button" onClick={() => onNavigate?.(link.tab)} className="link-line py-0.5 text-left">
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="eyebrow mb-4">Ajuda</p>
            <ul className="space-y-2.5 text-sm text-paper-2">
              {HELP_ITEMS.map((item) => (
                <li key={item} className="py-0.5">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 md:col-span-2">
            <p className="eyebrow mb-4">Contato</p>
            <ul className="space-y-2.5 text-sm">
              <li className="py-0.5">{STORE_CONFIG.social.instagram}</li>
              <li className="break-all py-0.5">
                <a href={`mailto:${STORE_CONFIG.contactEmail}`} className="link-line">
                  {STORE_CONFIG.contactEmail}
                </a>
              </li>
              <li className="py-0.5 text-paper-2">{STORE_CONFIG.social.atelier}, Brasil</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Marca gigante */}
      <div aria-hidden className="select-none overflow-hidden">
        <p className="display-xl -mb-[0.1em] whitespace-nowrap text-center text-[15vw] text-paper">Vitta Basics</p>
      </div>

      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-4 border-t border-line px-[var(--gutter)] py-3">
        <p className="eyebrow">
          © {new Date().getFullYear()} {STORE_CONFIG.name}
        </p>
        <button type="button" onClick={() => onNavigate?.('admin')} className="eyebrow tap-target transition-colors hover:text-paper">
          Acesso restrito
        </button>
        <button type="button" onClick={backToTop} className="eyebrow tap-target flex items-center gap-2 transition-colors hover:text-paper">
          Voltar ao topo
          <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </footer>
  );
}
