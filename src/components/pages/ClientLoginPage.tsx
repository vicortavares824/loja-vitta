// src/components/pages/ClientLoginPage.tsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/login.css';

interface ClientLoginPageProps {
  onLoginSuccess: () => void;
  onNavigateToSignUp?: () => void;
  onNavigateAdmin?: () => void;
}

export const ClientLoginPage: React.FC<ClientLoginPageProps> = ({ onLoginSuccess, onNavigateToSignUp }) => {
  const [email, setEmail]       = useState('cliente@vittabasics.com');
  const [password, setPassword] = useState('cliente123');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const ok = await login({ email, password });
    if (ok) {
      onLoginSuccess();
    } else {
      setError('E-mail ou senha incorretos. Tente novamente.');
    }
    setLoading(false);
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center bg-black overflow-hidden">
      {/* subtle bg texture */}
      <div className="login-bg-grid" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo mark */}
        <div className="flex justify-center mb-10">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-luxury">
            <span className="font-extrabold text-xs tracking-widest text-black">VB</span>
          </div>
        </div>

        <div className="glass-panel glass-panel-hover rounded-2xl p-8 shadow-luxury">
          <h1 className="store-title text-2xl text-center mb-1">Área do Cliente</h1>
          <p className="text-center text-xs text-gray-400 tracking-widest mb-8">VITTA BASICS</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label className="login-label">E-mail</label>
              <input
                id="client-email"
                type="email"
                className="login-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="login-field">
              <label className="login-label">Senha</label>
              <input
                id="client-password"
                type="password"
                className="login-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {error && <p className="login-error mt-3">{error}</p>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="login-spinner" /> : null}
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
            
            <div className="mt-6 text-center">
              <button 
                type="button"
                onClick={onNavigateToSignUp}
                className="text-xs text-gray-400 hover:text-white transition-colors tracking-widest uppercase"
              >
                Ainda não tem conta? Cadastre-se
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6 tracking-widest">
          © 2026 Vitta Basics
        </p>
      </div>
    </section>
  );
};
