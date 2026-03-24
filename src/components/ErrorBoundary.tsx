import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const isConfigError = this.state.error?.message.includes('Supabase configuration');

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FBFDF9] p-4">
          <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-lg border border-red-50 space-y-6 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Ops! Algo deu errado.</h2>
              <p className="text-sm text-slate-500">
                {isConfigError 
                  ? "Parece que as configurações do Supabase estão faltando. Por favor, configure as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY."
                  : "Ocorreu um erro inesperado ao carregar a aplicação."}
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-slate-50 rounded-xl text-left overflow-auto max-h-32">
                <code className="text-xs text-red-600 font-mono">
                  {this.state.error.message}
                </code>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
