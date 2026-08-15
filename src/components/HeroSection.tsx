import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Award } from 'lucide-react';
import { WavesBackground } from './react-bits/WavesBackground';
import { BlurText } from './react-bits/BlurText';
import { Magnet } from './react-bits/Magnet';
import { TiltedCard } from './react-bits/TiltedCard';
import { STORE_CONFIG } from '../config/storeConfig';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-28 pb-16 overflow-hidden">
      {/* Canvas Waves Background */}
      <WavesBackground lineColor="rgba(212, 175, 55, 0.15)" particleColor="rgba(139, 92, 246, 0.35)" />

      {/* Glow Radial Orbs */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[#d4af37]/10 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-[#8b5cf6]/10 blur-[140px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Headline & CTA */}
        <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 badge-gold">
            <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>{STORE_CONFIG.heroBadge}</span>
          </div>

          {/* Main Animated Title */}
          <h1 className="font-display font-extrabold text-4xl sm:text-6xl lg:text-7xl leading-[1.08] tracking-tight text-white">
            <BlurText
              text={STORE_CONFIG.heroTitle}
              animateBy="words"
              delay={80}
              className="text-gradient-gold"
            />
          </h1>

          {/* Description */}
          <p className="text-gray-300 text-base sm:text-lg max-w-2xl font-normal leading-relaxed mx-auto lg:mx-0">
            {STORE_CONFIG.description} Integração nativa de estoque e cupons via <strong className="text-[#d4af37] font-semibold">TomatoPHP API</strong>.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
            <Magnet strength={20}>
              <a href="#colecao" className="btn-primary group">
                <span>Explorar Coleção</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </Magnet>

            <Magnet strength={20}>
              <a href="#lookbook" className="btn-secondary">
                <Award className="w-4 h-4 text-[#d4af37]" />
                <span>Ver Lookbook</span>
              </a>
            </Magnet>
          </div>

          {/* Stats Bar */}
          <div className="pt-8 border-t border-white/10 grid grid-cols-3 gap-6 max-w-lg mx-auto lg:mx-0">
            <div>
              <div className="font-display font-extrabold text-2xl sm:text-3xl text-white">100%</div>
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">Lã & Seda Pura</div>
            </div>
            <div>
              <div className="font-display font-extrabold text-2xl sm:text-3xl text-white">LIMITED</div>
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">Exclusividade</div>
            </div>
            <div>
              <div className="font-display font-extrabold text-2xl sm:text-3xl text-white">REST API</div>
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">TomatoPHP Engine</div>
            </div>
          </div>
        </div>

        {/* Right Column: Hero Visual Card (Tilted 3D Showcase) */}
        <div className="lg:col-span-5 flex justify-center">
          <TiltedCard maxRotateX={18} maxRotateY={18} scaleOnHover={1.04} className="max-w-md">
            <div className="relative rounded-2xl overflow-hidden glass-panel border border-[#d4af37]/30 shadow-2xl group">
              <img
                src="/images/hero-fashion.jpg"
                alt={`${STORE_CONFIG.name} Editorial`}
                className="w-full h-[520px] object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-transparent to-transparent opacity-90" />

              {/* Floating Badge on Card */}
              <div className="absolute bottom-6 left-6 right-6 glass-panel p-5 rounded-xl border border-white/15 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] tracking-[0.2em] font-bold text-[#d4af37] uppercase">
                      PEÇA DE DESFILE
                    </span>
                    <h3 className="font-display font-bold text-lg text-white mt-0.5">
                      Sobretudo Velvet Noir
                    </h3>
                  </div>
                  <span className="font-display font-extrabold text-lg text-[#d4af37]">R$ 3.890</span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-300">
                  <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
                  <span>Edição Limitada 01 / 50</span>
                </div>
              </div>
            </div>
          </TiltedCard>
        </div>
      </div>
    </section>
  );
};
