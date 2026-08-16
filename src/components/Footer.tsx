import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { STORE_CONFIG } from '../config/storeConfig';

interface FooterProps {
  onNavigate?: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const { showToast } = useCart();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showToast('Por favor, informe um e-mail válido.', 'error');
      return;
    }
    showToast('Inscrição confirmada! Você receberá nossos lançamentos exclusivos.', 'success');
    setEmail('');
  };

  return (
    <footer className="relative bg-black pt-20 pb-12 border-t border-white/10 text-gray-400 text-sm overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-white/10">
          {/* Brand Col */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white p-[1px] flex items-center justify-center">
                <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
                  <span className="font-display font-bold text-[10px] text-white">
                    {STORE_CONFIG.shortName}
                  </span>
                </div>
              </div>
              <span className="font-display font-extrabold text-xl tracking-[0.2em] text-white">
                {STORE_CONFIG.name}
              </span>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed max-w-sm">
              {STORE_CONFIG.description}
            </p>
            <div className="flex items-center gap-3 text-xs text-white font-medium pt-2">
              <Sparkles className="w-4 h-4 text-white" />
              <span>Coleção Minimalista 2026</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-4 grid grid-cols-2 gap-8 text-xs">
            <div>
              <h4 className="font-display font-bold text-white uppercase tracking-widest mb-4">
                Navegação
              </h4>
              <ul className="space-y-3">
                <li>
                  <button 
                    onClick={() => onNavigate?.('home')} 
                    className="hover:text-white transition-colors text-left"
                  >
                    Início
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => onNavigate?.('products')} 
                    className="hover:text-white transition-colors text-left"
                  >
                    Catálogo de Produtos
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => onNavigate?.('categories')} 
                    className="hover:text-white transition-colors text-left"
                  >
                    Categorias
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => onNavigate?.('search')} 
                    className="hover:text-white transition-colors text-left"
                  >
                    Buscar Peças
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-bold text-white uppercase tracking-widest mb-4">
                Atendimento
              </h4>
              <ul className="space-y-3">
                <li><span className="hover:text-white transition-colors cursor-pointer">Guia de Medidas</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Política de Devolução</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Termos & Privacidade</span></li>
              </ul>
            </div>
          </div>

          {/* Newsletter Col */}
          <div className="md:col-span-4 space-y-4">
            <h4 className="font-display font-bold text-white uppercase tracking-widest">
              Lançamentos Privados
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              Receba convites para pré-vendas de edições limitadas e lançamentos da coleção.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                placeholder="Seu melhor e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="flex-1 bg-white/5 border border-white/20 text-xs py-2.5 px-3.5 rounded-full text-white placeholder:text-gray-500 focus:outline-none focus:border-white transition-colors"
              />
              <button type="submit" className="bg-white text-black p-2.5 rounded-full hover:bg-gray-200 transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between border-t border-white/10 text-[10px] text-gray-500 tracking-wider">
          <p>
            &copy; {new Date().getFullYear()} {STORE_CONFIG.name}. Todos os direitos reservados.
          </p>
          <button 
            onClick={() => onNavigate?.('admin')} 
            className="mt-4 sm:mt-0 hover:text-white transition-colors uppercase tracking-[0.2em]"
          >
            Acesso Restrito (Admin)
          </button>
        </div>
      </div>
    </footer>
  );
};
