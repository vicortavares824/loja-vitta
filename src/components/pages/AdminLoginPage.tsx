// src/components/pages/AdminLoginPage.tsx
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthError, AuthField, AuthLayout } from '../auth/AuthLayout';

interface AdminLoginPageProps {
  onLoginSuccess: () => void;
  onNavigateToSignUp?: () => void;
}

export function AdminLoginPage({ onLoginSuccess, onNavigateToSignUp }: AdminLoginPageProps) {
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
      setError(err instanceof Error && err.message ? err.message : 'Credenciais de administrador inválidas.');
    }
    setLoading(false);
  };

  return (
    <AuthLayout
      eyebrow="Acesso restrito"
      titleLabel="Painel admin"
      titleLines={[
        'Painel',
        <span key="accent" className="font-serif-accent">
          admin
        </span>,
      ]}
      intro="Entre com uma conta de administrador para gerenciar produtos, estoque e pedidos."
      footer={
        <button type="button" onClick={onNavigateToSignUp} className="group flex w-full items-center justify-between text-left">
          <span>
            <span className="eyebrow block">Novo administrador?</span>
            <span className="mt-1 block font-display text-lg font-semibold uppercase tracking-[-0.01em]">Solicitar acesso</span>
          </span>
          <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={1.5} />
        </button>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-7">
        <AuthField
          id="admin-email"
          label="E-mail admin"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@vittabasics.com"
          autoComplete="email"
          required
        />
        <AuthField
          id="admin-password"
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
          {loading ? 'Verificando…' : 'Entrar como admin'}
        </button>
      </form>
    </AuthLayout>
  );
}
