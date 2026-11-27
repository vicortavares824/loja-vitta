import { ArrowRight } from 'lucide-react';
import { ImageReveal, LineReveal, Reveal } from './home/HomeMotion';
import { COLLECTION_PHOTOS } from '../config/collectionPhotos';

interface LookbookSectionProps {
  onNavigate: (tab: string) => void;
}

const LOOKS = [
  { ...COLLECTION_PHOTOS.lookPrimary, caption: 'Look 01 — Oversized vinho' },
  { ...COLLECTION_PHOTOS.lookSecondary, caption: 'Look 02 — Oversized preta' },
];

/**
 * Lookbook assimétrico: uma foto grande à esquerda, uma menor deslocada à
 * direita, cada uma com parallax interno leve.
 */
export function LookbookSection({ onNavigate }: LookbookSectionProps) {
  const [first, second] = LOOKS;

  return (
    <section id="lookbook" aria-labelledby="lookbook-title" className="border-t border-line bg-ink py-20 md:py-32">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-x-6 gap-y-12 px-[var(--gutter)] md:grid-cols-12">
        <figure className="md:col-span-7">
          <button
            type="button"
            onClick={() => onNavigate('products')}
            data-cursor="Ver"
            className="block w-full"
            aria-label="Ver peças do look 01"
          >
            <ImageReveal src={first.src} alt={first.alt} parallax className="aspect-[4/5]" />
          </button>
          <figcaption className="eyebrow mt-3 flex justify-between">
            <span>{first.caption}</span>
            <span>Fig. 01</span>
          </figcaption>
        </figure>

        <div className="flex flex-col justify-between gap-12 md:col-span-4 md:col-start-9">
          <div>
            <p className="eyebrow mb-5">Lookbook</p>
            <h2
              id="lookbook-title"
              className="font-display text-[clamp(2rem,3.5vw,4rem)] break-words font-semibold uppercase leading-[0.92] tracking-[-0.04em]"
            >
              <LineReveal
                label="Menos peças. Mais combinações."
                lines={[
                  'Menos peças.',
                  <>
                    <span className="font-serif-accent">Mais</span> combinações.
                  </>,
                ]}
              />
            </h2>
            <Reveal delay={0.15}>
              <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-paper-2">
                Cores neutras e modelagens limpas que conversam entre si. Monte o dia a dia com poucas escolhas certas.
              </p>
              <button type="button" onClick={() => onNavigate('products')} className="btn-secondary group mt-8">
                Explorar peças
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.75} />
              </button>
            </Reveal>
          </div>

          <figure className="md:mt-24">
            <button
              type="button"
              onClick={() => onNavigate('products')}
              data-cursor="Ver"
              className="block w-full"
              aria-label="Ver peças do look 02"
            >
              <ImageReveal src={second.src} alt={second.alt} parallax delay={0.1} className="aspect-[3/4]" />
            </button>
            <figcaption className="eyebrow mt-3 flex justify-between">
              <span>{second.caption}</span>
              <span>Fig. 02</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
