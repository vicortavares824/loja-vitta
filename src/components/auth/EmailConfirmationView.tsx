import { useEffect, useState } from 'react';
import { ArrowRight, Check, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { authService } from '../../services/authService';
import { useCart } from '../../context/CartContext';
import { AuthLayout } from './AuthLayout';

interface EmailConfirmationViewProps {
  email: string;
  isAdmin?: boolean;
  onNavigateToLogin: () => void;
}

const RESEND_COOLDOWN_S = 60;
const COPIED_RESET_MS = 2500;

const STEPS = [
  'Abra a caixa de entrada do seu e-mail.',
  'Clique no link de confirmação enviado pela Vitta Basics.',
  'Não encontrou? Veja as pastas de spam ou lixo eletrônico.',
];

function getWebmailUrl(emailAddress: string): string {
  const domain = emailAddress.split('@')[1]?.toLowerCase() || '';
  if (domain.includes('gmail')) return 'https://mail.google.com/';
  if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live')) return 'https://outlook.live.com/';
  if (domain.includes('yahoo')) return 'https://mail.yahoo.com/';
  if (domain.includes('icloud')) return 'https://www.icloud.com/mail';
  if (domain.includes('proton')) return 'https://mail.proton.me/';
  return `mailto:${emailAddress}`;
}

export function EmailConfirmationView({ email, isAdmin = false, onNavigateToLogin }: EmailConfirmationViewProps) {
  const { showToast } = useCart();
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const [copied, setCopied] = useState(false);
  const canResend = cooldown === 0;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      showToast('E-mail copiado.', 'info');
    } catch {
      showToast('Não foi possível copiar o e-mail.', 'error');
    }
  };

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    try {
      await authService.resendConfirmation(email);
      showToast('E-mail de confirmação reenviado.', 'success');
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err: unknown) {
      showToast(err instanceof Error && err.message ? err.message : 'Falha ao reenviar e-mail.', 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      eyebrow={isAdmin ? 'Conta de administrador' : 'Quase lá'}
      titleLabel="Confirme seu e-mail"
      titleLines={[
        'Confirme',
        <>
          seu <span className="font-serif-accent">e-mail</span>
        </>,
      ]}
      intro="Sua conta foi registrada. Enviamos um link de ativação para:"
      footer={
        <button type="button" onClick={onNavigateToLogin} className="group flex w-full items-center justify-between text-left">
          <span>
            <span className="eyebrow block">Já confirmou?</span>
            <span className="mt-1 block font-display text-lg font-semibold uppercase tracking-[-0.01em]">Fazer login</span>
          </span>
          <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={1.5} />
        </button>
      }
    >
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-3 border-b border-line-strong pb-3">
          <span className="min-w-0 select-all break-all font-mono text-sm">{email}</span>
          <button type="button" onClick={handleCopyEmail} className="btn-icon shrink-0" aria-label="Copiar e-mail">
            {copied ? <Check className="h-4 w-4" strokeWidth={1.75} /> : <Copy className="h-4 w-4" strokeWidth={1.5} />}
          </button>
        </div>

        <ol className="border-t border-line">
          {STEPS.map((step, i) => (
            <li key={step} className="flex gap-4 border-b border-line py-3 text-sm text-paper-2">
              <span className="eyebrow tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              {step}
            </li>
          ))}
        </ol>

        <div className="space-y-2">
          <a href={getWebmailUrl(email)} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">
            Abrir meu e-mail
            <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
          </a>
          <button type="button" onClick={handleResend} disabled={!canResend || resending} className="btn-secondary w-full">
            <RefreshCw className={`h-4 w-4 ${resending ? 'motion-safe:animate-spin' : ''}`} strokeWidth={1.5} />
            {canResend ? 'Reenviar e-mail' : `Reenviar em ${cooldown}s`}
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
