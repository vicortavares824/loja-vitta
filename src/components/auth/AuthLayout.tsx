import { forwardRef, useId, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { ImageReveal, LineReveal, Reveal } from '../home/HomeMotion';
import { COLLECTION_PHOTOS } from '../../config/collectionPhotos';

interface AuthLayoutProps {
  eyebrow: string;
  /** Linhas do título (reveladas por máscara). */
  titleLines: ReactNode[];
  titleLabel: string;
  intro?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  image?: string;
}

/**
 * Tela de conta em duas colunas: foto editorial à esquerda (só desktop) e
 * formulário à direita. No celular vira uma coluna só.
 */
export function AuthLayout({
  eyebrow,
  titleLines,
  titleLabel,
  intro,
  children,
  footer,
  image = COLLECTION_PHOTOS.login.src,
}: AuthLayoutProps) {
  return (
    <section className="grid min-h-[100svh] grid-cols-1 bg-ink text-paper lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <ImageReveal
          src={image}
          alt=""
          onMount
          loading="eager"
          className="sticky top-0 h-[100svh]"
          imgClassName="object-[50%_20%] brightness-[0.85]"
        />
        {/* Sombra no topo (legibilidade do cabeçalho) e na base (legibilidade da marca) */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink/80 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-ink/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-10">
          <p className="display-xl text-[7vw] text-paper">Vitta</p>
          <p className="eyebrow pb-3 text-right text-paper-2">
            Essencial é
            <br />
            estar bem
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center px-[var(--gutter)] pb-16 pt-28 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <Reveal onMount delay={0.05} y={0}>
            <p className="eyebrow mb-5">{eyebrow}</p>
          </Reveal>
          <h1 className="font-display text-[clamp(2.75rem,6vw,5rem)] font-semibold uppercase leading-[0.9] tracking-[-0.045em]">
            <LineReveal onMount delay={0.1} label={titleLabel} lines={titleLines} />
          </h1>
          {intro && (
            <Reveal onMount delay={0.2}>
              <p className="mt-5 text-[15px] leading-relaxed text-paper-2">{intro}</p>
            </Reveal>
          )}
          <Reveal onMount delay={0.25} className="mt-10">
            {children}
          </Reveal>
          {footer && (
            <Reveal onMount delay={0.3} className="mt-10 border-t border-line pt-6">
              {footer}
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

/** Campo sublinhado com rótulo em mono; senhas ganham botão de mostrar/ocultar. */
export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  { label, hint, type = 'text', id, className = '', ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className={className}>
      <label htmlFor={inputId} className="eyebrow block">
        {label}
      </label>
      <div className="flex items-center border-b border-line-strong transition-colors focus-within:border-paper">
        <input
          ref={ref}
          id={inputId}
          type={isPassword && visible ? 'text' : type}
          className="min-h-12 min-w-0 flex-1 bg-transparent text-base text-paper placeholder:text-mute focus:outline-none"
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="btn-icon -mr-2 h-10 w-10 shrink-0 text-mute hover:text-paper"
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visible}
          >
            {visible ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
          </button>
        )}
      </div>
      {hint && <p className="mt-2 text-xs text-mute">{hint}</p>}
    </div>
  );
});

/** Mensagem de erro do formulário (anunciada a leitores de tela). */
export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="border-l-2 border-danger pl-3 text-sm text-paper">
      {message}
    </p>
  );
}
