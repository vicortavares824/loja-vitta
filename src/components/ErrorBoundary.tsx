import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { observability } from '../services/observability';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    observability.captureException(error, {
      componentStack: errorInfo.componentStack
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-[#121216] border border-white/20 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold uppercase tracking-tight text-white">
                Algo inesperado ocorreu
              </h1>
              <p className="text-gray-400 text-xs leading-relaxed">
                O erro foi capturado e reportado automaticamente à nossa camada de observabilidade (Sentry).
              </p>
            </div>

            {this.state.error && (
              <div className="bg-black/60 p-4 rounded-xl border border-white/10 text-left text-xs font-mono text-gray-300 max-h-32 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-full border border-white/15 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar</span>
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 bg-white text-black text-xs font-extrabold uppercase tracking-wider py-3 px-4 rounded-full hover:bg-gray-200 transition-all shadow-lg"
              >
                <Home className="w-4 h-4" />
                <span>Início</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
