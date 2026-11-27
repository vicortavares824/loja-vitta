import { ArrowRight } from 'lucide-react';
import { HeroSection } from '../HeroSection';
import { CategorySection } from '../CategorySection';
import { LookbookSection } from '../LookbookSection';
import { ProductGrid } from '../ProductGrid';
import { CustomCursor, Reveal, ScrollProgress, ScrollTrack, ScrollWords } from './HomeMotion';

interface HomePageProps {
  onNavigate: (tab: string) => void;
  onSelectCategory: (slug: string) => void;
}

const PRINCIPLES = [
  { title: 'Corte', text: 'Modelagens limpas, sem excesso, pensadas para vestir bem em qualquer corpo.' },
  { title: 'Tecido', text: 'Toque macio e boa durabilidade, escolhidos para o uso de todos os dias.' },
  { title: 'Combinação', text: 'Uma paleta neutra em que tudo conversa: menos peças, mais looks.' },
];

const TRACK_WORDS = ['Essencial é estar bem', 'Vitta Basics', 'Coleção 2026'];

/** Home editorial: hero, faixa de texto, índice, novidades, lookbook, manifesto e princípios. */
export function HomePage({ onNavigate, onSelectCategory }: HomePageProps) {
  return (
    <main className="animate-fadeIn">
      <ScrollProgress />
      <CustomCursor />

      <HeroSection onNavigate={onNavigate} />

      {/* Faixa de texto que anda com a rolagem */}
      <div aria-hidden className="border-b border-line py-10 md:py-14">
        <ScrollTrack distance={30} className="display-xl text-[clamp(3.5rem,11vw,11rem)] text-paper">
          {[...TRACK_WORDS, ...TRACK_WORDS].map((word, i) => (
            <span key={i} className="inline-flex items-center">
              <span className={i % 3 === 0 ? 'font-serif-accent text-[1.05em]' : ''}>{word}</span>
              <span className="mx-[0.35em] inline-block h-[0.12em] w-[0.12em] rounded-full bg-paper/40" />
            </span>
          ))}
        </ScrollTrack>
      </div>

      <CategorySection onSelectCategory={onSelectCategory} />

      <div className="border-t border-line py-20 md:py-32">
        <ProductGrid maxItems={6} onCategoryChange={onSelectCategory} />
        <div className="mx-auto mt-14 flex max-w-[1600px] justify-center px-[var(--gutter)]">
          <button type="button" onClick={() => onNavigate('products')} className="btn-secondary group">
            Ver catálogo completo
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <LookbookSection onNavigate={onNavigate} />

      {/* Manifesto */}
      <section aria-label="Manifesto" className="border-t border-line py-24 md:py-40">
        <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-8 px-[var(--gutter)] md:grid-cols-12">
          <p className="eyebrow md:col-span-2">Manifesto</p>
          <ScrollWords
            text="A Vitta acredita que o básico também pode ser *extraordinário.* Peças essenciais que unem conforto, qualidade e um estilo que não sai de *moda.*"
            className="font-display text-[clamp(1.75rem,4.2vw,4rem)] font-medium leading-[1.08] tracking-[-0.03em] md:col-span-10"
          />
        </div>
      </section>

      {/* Princípios */}
      <section aria-label="Princípios" className="border-t border-line py-20 md:py-28">
        <ol className="mx-auto grid max-w-[1600px] grid-cols-1 gap-y-12 px-[var(--gutter)] md:grid-cols-3 md:gap-x-6">
          {PRINCIPLES.map((item, i) => (
            <li key={item.title}>
              <Reveal delay={i * 0.08} className="border-t border-line-strong pt-5">
                <span className="eyebrow tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-8 font-display text-3xl font-semibold uppercase tracking-[-0.03em]">{item.title}</h3>
                <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-paper-2">{item.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
