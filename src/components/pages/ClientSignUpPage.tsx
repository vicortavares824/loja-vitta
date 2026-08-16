import React, { useState } from 'react';
import { ArrowRight, UserPlus, ArrowLeft } from 'lucide-react';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

interface ClientSignUpPageProps {
  onSignUpSuccess: () => void;
  onNavigateToLogin: () => void;
}

export const ClientSignUpPage: React.FC<ClientSignUpPageProps> = ({ onSignUpSuccess, onNavigateToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const { addToast } = useCart();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.signUp({ name, email, password });
      const success = await login({ email, password });
      if (success) {
        addToast('Conta criada com sucesso!', 'success');
        onSignUpSuccess();
      } else {
        setError('Conta criada, mas falha ao fazer login automático.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-gray-600/10 rounded-full blur-[150px] pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h2 className="text-3xl font-extrabold uppercase tracking-widest text-center text-white mb-2">
            Criar Conta
          </h2>
          <p className="text-gray-400 text-center mb-8 font-light tracking-wide text-sm">
            Junte-se à Vitta Basics.
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all font-light"
                placeholder="Seu nome"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all font-light"
                placeholder="nome@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all font-light"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-4 bg-white text-black rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processando...' : 'Cadastrar'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={onNavigateToLogin}
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Já tem uma conta? Fazer Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
