// src/components/pages/AdminLoginPage.tsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/login.css';

interface AdminLoginPageProps {
  onLoginSuccess: () => void;
  onNavigateToSignUp?: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess, onNavigateToSignUp }) => {
  const [email, setEmail]       = useState('admin@vittabasics.com');
  const [password, setPassword] = useState('admin123');
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
      setError('Credenciais de administrador inválidas.');
    }
    setLoading(false);
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center bg-black overflow-hidden">
      <div className="login-bg-grid" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo mark */}
        <div className="flex justify-center mb-10">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-luxury">
            <span className="font-extrabold text-xs tracking-widest text-black">ADM</span>
          </div>
        </div>

        <div className="glass-panel glass-panel-hover rounded-2xl p-8 shadow-luxury">
          <h1 className="store-title text-2xl text-center mb-1">Painel Admin</h1>
          <p className="text-center text-xs text-gray-400 tracking-widest mb-8">ACESSO RESTRITO</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label className="login-label">E-mail Admin</label>
              <input
                id="admin-email"
                type="email"
                className="login-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@vittabasics.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="login-field">
              <label className="login-label">Senha</label>
              <input
                id="admin-password"
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
              {loading ? 'Verificando…' : 'Entrar como Admin'}
            </button>

            <div className="mt-6 text-center">
              <button 
                type="button"
                onClick={onNavigateToSignUp}
                className="text-xs text-gray-400 hover:text-white transition-colors tracking-widest uppercase"
              >
                Novo Admin? Solicite Acesso
              </button>
            </div>
          </form>

          {/* Hint for demo */}
          <p className="text-center text-[10px] text-gray-600 mt-6 tracking-wider">
            Demo: admin@vittabasics.com / admin123
          </p>
        </div>
      </div>
    </section>
  );
};
