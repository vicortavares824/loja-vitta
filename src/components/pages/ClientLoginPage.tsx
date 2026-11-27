// src/components/pages/ClientLoginPage.tsx
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthError, AuthField, AuthLayout } from '../auth/AuthLayout';

interface ClientLoginPageProps {
  onLoginSuccess: () => void;
  onNavigateToSignUp?: () => void;
  onNavigateAdmin?: () => void;
}

export function ClientLoginPage({ onLoginSuccess, onNavigateToSignUp }: ClientLoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const ok = await login({ email, password });
      if (ok) onLoginSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : 'E-mail ou senha incorretos. Tente novamente.');
    }
    setLoading(false);
  };

  return (
    <AuthLayout
      eyebrow="Área do cliente"
      titleLabel="Bem-vindo de volta"
      titleLines={[
        'Bem-vindo',
        <>
          de <span className="font-serif-accent">volta</span>
        </>,
      ]}
      intro="Entre para ver sua sacola, acompanhar pedidos e finalizar compras."
      footer={
        <button type="button" onClick={onNavigateToSignUp} className="group flex w-full items-center justify-between text-left">
          <span>
            <span className="eyebrow block">Ainda não tem conta?</span>
            <span className="mt-1 block font-display text-lg font-semibold uppercase tracking-[-0.01em]">Cadastre-se</span>
          </span>
          <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={1.5} />
        </button>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-7">
        <AuthField
          id="client-email"
          label="E-mail"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          autoComplete="email"
          required
        />
        <AuthField
          id="client-password"
          label="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
        <AuthError message={error} />
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </AuthLayout>
  );
}
