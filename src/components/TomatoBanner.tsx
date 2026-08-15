import React from 'react';
import { Server, CheckCircle2, Code2, Database } from 'lucide-react';
import { Magnet } from './react-bits/Magnet';

export const TomatoBanner: React.FC = () => {
  return (
    <section id="tomatophp" className="py-20 relative z-10 bg-[#070709] border-t border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-[#d4af37]/30 bg-gradient-to-r from-[#12121c] via-[#0d0d14] to-[#140d1a] relative overflow-hidden">
          {/* Decorative Glow */}
          <div className="pointer-events-none absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-[#d4af37]/10 blur-3xl" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 badge-gold">
                <Server className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Powered by TomatoPHP Filament Ecommerce</span>
              </div>

              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white">
                INTEGRAÇÃO REST API EM TEMPO REAL
              </h2>

              <p className="text-gray-300 text-sm leading-relaxed font-normal">
                Esta aplicação frontend consome nativamente os endpoints da suíte <strong className="text-white">TomatoPHP (Filament Ecommerce)</strong> para listagem de produtos, filtros por categoria, sincronização de sacola e validação de cupons promocionais.
              </p>

              {/* Endpoints Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="glass-panel p-3 rounded-xl flex items-center gap-2 text-xs text-gray-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>GET /api/products</span>
                </div>
                <div className="glass-panel p-3 rounded-xl flex items-center gap-2 text-xs text-gray-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>GET /api/categories</span>
                </div>
                <div className="glass-panel p-3 rounded-xl flex items-center gap-2 text-xs text-gray-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>POST /api/coupons</span>
                </div>
              </div>
            </div>

            {/* Right Interactive Box */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full glass-panel p-6 rounded-2xl border border-white/15 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Database className="w-4 h-4 text-[#d4af37]" />
                    <span>TomatoPHP Engine Status</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    ONLINE / ACTIVE
                  </span>
                </div>

                <div className="space-y-2 text-xs text-gray-300 font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-500">API Provider:</span>
                    <span className="text-[#d4af37]">TomatoPHP Filament</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Response Mode:</span>
                    <span className="text-white">JSON / REST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Active Coupons:</span>
                    <span className="text-white">AWWARDS15, TOMATO20</span>
                  </div>
                </div>

                <Magnet strength={12} className="w-full">
                  <a
                    href="https://docs.tomatophp.com/filament/filament-ecommerce"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary w-full justify-center text-xs py-2.5"
                  >
                    <Code2 className="w-4 h-4 text-[#d4af37]" />
                    <span>Documentação TomatoPHP</span>
                  </a>
                </Magnet>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
