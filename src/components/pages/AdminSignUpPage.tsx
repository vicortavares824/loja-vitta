import React, { useState } from 'react';
import { ShieldAlert, ArrowRight, ArrowLeft } from 'lucide-react';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { EmailConfirmationView } from '../auth/EmailConfirmationView';

interface AdminSignUpPageProps {
  onSignUpSuccess: () => void;
  onNavigateToLogin: () => void;
}

export const AdminSignUpPage: React.FC<AdminSignUpPageProps> = ({ onSignUpSuccess, onNavigateToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const { login } = useAuth();
  const { showToast } = useCart();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.signUp({ name, email, password }, secretKey);
      try {
        await login({ email, password });
        showToast('Conta Admin criada com sucesso!', 'success');
        onSignUpSuccess();
      } catch {
        // Login failed — likely email confirmation required
        setShowConfirmation(true);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta Admin');
    } finally {
      setLoading(false);
    }
  };

  if (showConfirmation) {
    return (
      <EmailConfirmationView
        email={email}
        isAdmin={true}
        onNavigateToLogin={onNavigateToLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-ink-2 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-gray-600/10 rounded-full blur-[150px] pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-ink border border-line rounded-[2px] p-8 sm:p-12">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-ink-2 flex items-center justify-center border border-line">
              <ShieldAlert className="w-8 h-8 text-paper" />
            </div>
          </div>
          
          <h2 className="text-3xl font-extrabold uppercase tracking-widest text-center text-paper mb-2">
            Novo Admin
          </h2>
          <p className="text-mute text-center mb-8 font-light tracking-wide text-sm">
            Acesso Restrito ao Sistema.
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-[2px] bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold tracking-widest text-mute uppercase mb-2">
                Nome
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-5 py-4 bg-ink-2 border border-line rounded-[2px] text-paper placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-line-strong focus:border-line-strong transition-all font-light"
                placeholder="Seu nome"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-widest text-mute uppercase mb-2">
                E-mail Corporativo
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-ink-2 border border-line rounded-[2px] text-paper placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-line-strong focus:border-line-strong transition-all font-light"
                placeholder="admin@vittabasics.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-widest text-mute uppercase mb-2">
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-ink-2 border border-line rounded-[2px] text-paper placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-line-strong focus:border-line-strong transition-all font-light"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-widest text-mute uppercase mb-2 flex items-center gap-2">
                Chave de Autorização <ShieldAlert className="w-3 h-3 text-yellow-500" />
              </label>
              <input
                type="password"
                required
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="w-full px-5 py-4 bg-ink-2 border border-line rounded-[2px] text-paper placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all font-light"
                placeholder="Sua chave secreta"
              />
              <p className="text-xs text-mute mt-2">Necessária para conceder permissão de administrador.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-4 bg-paper text-ink rounded-[2px] font-bold uppercase tracking-widest text-sm hover:bg-paper-2 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processando...' : 'Cadastrar Admin'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={onNavigateToLogin}
              className="inline-flex items-center gap-2 text-sm text-mute hover:text-paper transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Login Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
