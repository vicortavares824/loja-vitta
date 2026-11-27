import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { EmailConfirmationView } from '../auth/EmailConfirmationView';
import { AuthError, AuthField, AuthLayout } from '../auth/AuthLayout';
import { COLLECTION_PHOTOS } from '../../config/collectionPhotos';

interface ClientSignUpPageProps {
  onSignUpSuccess: () => void;
  onNavigateToLogin: () => void;
}

const MIN_PASSWORD = 6;

export function ClientSignUpPage({ onSignUpSuccess, onNavigateToLogin }: ClientSignUpPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { login } = useAuth();
  const { showToast } = useCart();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.signUp({ name, email, password });
      try {
        await login({ email, password });
        showToast('Conta criada com sucesso!', 'success');
        onSignUpSuccess();
      } catch {
        // Login falhou — provavelmente precisa confirmar o e-mail
        setShowConfirmation(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  if (showConfirmation) {
    return <EmailConfirmationView email={email} isAdmin={false} onNavigateToLogin={onNavigateToLogin} />;
  }

  return (
    <AuthLayout
      eyebrow="Nova conta"
      titleLabel="Criar conta"
      image={COLLECTION_PHOTOS.signUp.src}
      titleLines={[
        'Criar',
        <span key="accent" className="font-serif-accent">
          conta
        </span>,
      ]}
      intro="Leva menos de um minuto. Sua sacola e seus pedidos ficam salvos."
      footer={
        <button type="button" onClick={onNavigateToLogin} className="group flex items-center gap-3 text-left">
          <ArrowLeft className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-1" strokeWidth={1.5} />
          <span>
            <span className="eyebrow block">Já tem uma conta?</span>
            <span className="mt-1 block font-display text-lg font-semibold uppercase tracking-[-0.01em]">Fazer login</span>
          </span>
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-7">
        <AuthField
          label="Nome completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          autoComplete="name"
          required
        />
        <AuthField
          label="E-mail"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nome@email.com"
          autoComplete="email"
          required
        />
        <AuthField
          label="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          hint={password && password.length < MIN_PASSWORD ? `Faltam ${MIN_PASSWORD - password.length} caracteres.` : undefined}
          required
        />
        <AuthError message={error || null} />
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Processando…' : 'Cadastrar'}
        </button>
      </form>
    </AuthLayout>
  );
}
