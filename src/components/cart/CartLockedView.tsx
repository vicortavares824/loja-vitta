import { ArrowRight, Lock } from 'lucide-react';

interface CartLockedViewProps {
  onSignUp: () => void;
  onLogin: () => void;
}

const BENEFITS = ['Sua sacola salva entre visitas', 'Frete grátis acima de R$ 1.500', 'Acompanhe o pedido até a sua casa'];

/** Sacola para visitante sem login: convida a criar conta ou entrar. */
export function CartLockedView({ onSignUp, onLogin }: CartLockedViewProps) {
  return (
    <div className="flex min-h-full flex-col justify-between gap-10 px-5 pb-6 pt-6 md:px-6">
      <div>
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line-strong">
          <Lock className="h-5 w-5" strokeWidth={1.5} />
        </span>
        <p className="eyebrow mt-8">Acesso Exclusivo</p>
        <h3 className="mt-3 font-display text-4xl font-semibold uppercase leading-[0.95] tracking-[-0.04em]">Sacola Bloqueada</h3>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-paper-2">
          Entre ou crie sua conta para ver suas peças, calcular o frete e finalizar o pedido.
        </p>
        <ul className="mt-8 border-t border-line">
          {BENEFITS.map((benefit, i) => (
            <li key={benefit} className="flex items-baseline gap-4 border-b border-line py-3 text-sm">
              <span className="eyebrow tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <button type="button" onClick={onSignUp} className="btn-primary group w-full">
          <span>Criar minha conta para comprar</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.75} />
        </button>
        <button type="button" onClick={onLogin} className="btn-secondary w-full">
          Já possuo uma conta • Entrar
        </button>
      </div>
    </div>
  );
}
