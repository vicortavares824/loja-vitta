import React, { useState } from 'react';
import { ShieldAlert, ArrowRight, ArrowLeft } from 'lucide-react';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

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
  
  const { login } = useAuth();
  const { addToast } = useCart();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.signUp({ name, email, password }, secretKey);
      const success = await login({ email, password });
      if (success) {
        addToast('Conta Admin criada com sucesso!', 'success');
        onSignUpSuccess();
      } else {
        setError('Conta Admin criada, mas falha ao fazer login automático.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta Admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-gray-600/10 rounded-full blur-[150px] pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h2 className="text-3xl font-extrabold uppercase tracking-widest text-center text-white mb-2">
            Novo Admin
          </h2>
          <p className="text-gray-400 text-center mb-8 font-light tracking-wide text-sm">
            Acesso Restrito ao Sistema.
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">
                Nome
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
                E-mail Corporativo
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all font-light"
                placeholder="admin@vittabasics.com"
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

            <div>
              <label className="block text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2 flex items-center gap-2">
                Chave de Autorização <ShieldAlert className="w-3 h-3 text-yellow-500" />
              </label>
              <input
                type="password"
                required
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all font-light"
                placeholder="Sua chave secreta"
              />
              <p className="text-xs text-gray-500 mt-2">Necessária para conceder permissão de administrador.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-4 bg-white text-black rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processando...' : 'Cadastrar Admin'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={onNavigateToLogin}
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
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
