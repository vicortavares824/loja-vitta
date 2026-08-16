import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, ArrowRight, RefreshCw, ExternalLink, ShieldCheck, Copy, Check } from 'lucide-react';
import { authService } from '../../services/authService';
import { useCart } from '../../context/CartContext';

interface EmailConfirmationViewProps {
  email: string;
  isAdmin?: boolean;
  onNavigateToLogin: () => void;
}

export const EmailConfirmationView: React.FC<EmailConfirmationViewProps> = ({
  email,
  isAdmin = false,
  onNavigateToLogin
}) => {
  const { showToast } = useCart();
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [cooldown]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    showToast('E-mail copiado para a área de transferência!', 'info');
    setTimeout(() => setCopied(false), 2500);
  };

  const getWebmailUrl = (emailAddress: string): string => {
    const domain = emailAddress.split('@')[1]?.toLowerCase() || '';
    if (domain.includes('gmail')) return 'https://mail.google.com/';
    if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live')) return 'https://outlook.live.com/';
    if (domain.includes('yahoo')) return 'https://mail.yahoo.com/';
    if (domain.includes('icloud')) return 'https://www.icloud.com/mail';
    if (domain.includes('proton')) return 'https://mail.proton.me/';
    return `mailto:${emailAddress}`;
  };

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    try {
      await authService.resendConfirmation(email);
      showToast('E-mail de confirmação reenviado com sucesso!', 'success');
      setCooldown(60);
      setCanResend(false);
    } catch (err: any) {
      showToast(err.message || 'Falha ao reenviar e-mail.', 'error');
    } finally {
      setResending(false);
    }
  };

  const webmailUrl = getWebmailUrl(email);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden animate-fadeIn">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/3 w-[30rem] h-[30rem] bg-white/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[26rem] h-[26rem] bg-gray-500/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        <div className="bg-[#0c0c0e]/80 backdrop-blur-2xl border border-white/15 rounded-3xl p-8 sm:p-12 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] text-center">
          
          {/* Animated Mail Icon Badge */}
          <div className="relative flex justify-center mb-8">
            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/20 flex items-center justify-center relative shadow-2xl">
              <Mail className="w-10 h-10 text-white animate-pulse" />
              <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold shadow-lg">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Header Title */}
          <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-widest text-white mb-3">
            Confirme seu E-mail
          </h2>

          <p className="text-gray-400 font-light text-sm sm:text-base leading-relaxed mb-6">
            Sua conta {isAdmin ? 'de Administrador ' : ''}foi registrada. Enviamos um link de ativação para:
          </p>

          {/* Email Address Highlight Pill */}
          <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 mb-8 max-w-md mx-auto">
            <span className="font-mono text-sm text-white font-semibold truncate select-all">
              {email}
            </span>
            <button
              onClick={handleCopyEmail}
              className="p-2 rounded-xl bg-white/10 hover:bg-white text-gray-300 hover:text-black transition-all"
              title="Copiar e-mail"
              aria-label="Copiar e-mail"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Instructions List */}
          <div className="space-y-3.5 text-left bg-white/[0.03] border border-white/10 rounded-2xl p-5 mb-8 text-xs sm:text-sm text-gray-300">
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <span>Abra a caixa de entrada do seu provedor de e-mail.</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <span>Clique no link de confirmação enviado pelo <strong>Supabase / Vitta</strong>.</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <span className="text-gray-400">
                Não encontrou? Verifique a pasta de <em>Spam</em> ou <em>Lixo Eletrônico</em>.
              </span>
            </div>
          </div>

          {/* Main Action Buttons */}
          <div className="space-y-3">
            <a
              href={webmailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-white text-black rounded-xl font-bold uppercase tracking-widest text-xs sm:text-sm hover:bg-gray-200 transition-all flex items-center justify-center gap-2 shadow-xl hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>Abrir Provedor de E-mail</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={handleResend}
              disabled={!canResend || resending}
              className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-xl font-semibold tracking-wider text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              {canResend
                ? 'Reenviar E-mail de Confirmação'
                : `Reenviar disponível em ${cooldown}s`}
            </button>
          </div>

          {/* Return to Login */}
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
            <div className="flex items-center gap-1.5 text-gray-500">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Autenticação Segura</span>
            </div>
            <button
              onClick={onNavigateToLogin}
              className="inline-flex items-center gap-1.5 text-white font-semibold hover:underline uppercase tracking-wider text-[11px]"
            >
              <span>Já confirmei, Fazer Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
