import React, { useState } from 'react';
import { LogIn, Beaker, ShieldCheck, Globe, Loader2, Mail, Lock, UserPlus } from 'lucide-react';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import logoUrl from '../assets/logo.png';

export function LoginView() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Check for recovery hash on mount
  React.useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      setMode('reset');
    }
  }, []);

  const handleGoogleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      toast.success('Redirecionando para o Google...');
    } catch (error: any) {
      if (error.message?.includes('For security purposes, you can only request this after')) {
        const seconds = error.message.match(/\d+/)?.[0] || 'alguns';
        toast.error(`Muitas tentativas! Por segurança, aguarde ${seconds} segundos antes de tentar novamente.`);
      } else if (error.message === 'email rate limit exceeded') {
        toast.error('Limite de envio de e-mails do Supabase excedido. Tente usar o "Entrar com Google" ou aguarde alguns minutos.');
      } else if (error.message?.includes('Unsupported provider')) {
        toast.error('O login com Google não está ativado no painel do Supabase. Por favor, use e-mail e senha ou ative o provedor Google no Supabase.');
      } else {
        toast.error(`Erro: ${error.message}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    
    if (mode === 'forgot') {
      if (!email) {
        toast.error('Por favor, informe seu e-mail.');
        return;
      }
      setIsLoggingIn(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/#type=recovery`,
        });
        if (error) throw error;
        toast.success('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
        setMode('login');
      } catch (error: any) {
        toast.error(`Erro: ${error.message}`);
      } finally {
        setIsLoggingIn(false);
      }
      return;
    }

    if (mode === 'reset') {
      if (!password) {
        toast.error('Por favor, informe a nova senha.');
        return;
      }
      setIsLoggingIn(true);
      try {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success('Senha atualizada com sucesso!');
        setMode('login');
        window.location.hash = '';
      } catch (error: any) {
        toast.error(`Erro: ${error.message}`);
      } finally {
        setIsLoggingIn(false);
      }
      return;
    }

    if (!email || !password || (mode === 'register' && !name)) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoggingIn(true);
    console.log(`Attempting ${mode} for ${email}`);
    try {
      if (mode === 'login') {
        // Hardcoded bypass for development
        const mockUsers: Record<string, any> = {
          'admin@ifmaker.com': {
            id: '00000000-0000-0000-0000-000000000000',
            email: 'admin@ifmaker.com',
            user_metadata: { full_name: 'Admin IFMaker (Dev)' },
            role: 'admin',
            password: 'iLy831104'
          },
          'user@gmail.com': {
            id: '11111111-1111-1111-1111-111111111111',
            email: 'user@gmail.com',
            user_metadata: { full_name: 'Aluno Teste (Dev)' },
            role: 'student',
            password: 'mudar123'
          },
          'gerenciador@gmail.com': {
            id: '22222222-2222-2222-2222-222222222222',
            email: 'gerenciador@gmail.com',
            user_metadata: { full_name: 'Gerenciador Teste (Dev)' },
            role: 'manager',
            password: 'mudar123'
          }
        };

        const mockUser = mockUsers[email];
        if (mockUser && password === mockUser.password) {
          const { password: _, ...userToStore } = mockUser;
          localStorage.setItem('dev_user', JSON.stringify(userToStore));
          toast.success(`Login de ${mockUser.role} realizado!`);
          window.location.reload();
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Login realizado com sucesso!');
      } else {
        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });
        
        if (signUpError) throw signUpError;
        
        if (user) {
          console.log("User created in Auth, creating profile...", user.id);
          // Determine role based on email
          const isAdminEmail = email === 'admin@gmail.com' || email === 'aistudiojhoko@gmail.com';
          const role = isAdminEmail ? 'admin' : 'student';
          
          const insertData: any = {
            uid: user.id,
            email: user.email,
            role: role,
            displayname: name,
            photourl: null,
            institutionid: 'default-inst'
          };

          // Create user profile in Supabase table
          const { error: insertError } = await supabase.from('users').insert(insertData);

          if (insertError) {
            console.error("Error creating user profile:", insertError);
            // We don't throw here because the user is already created in Auth
            // They might just need to sync later or we can try again
            toast.warning(`Conta criada, mas houve um erro ao salvar seu perfil: ${insertError.message}. Tente entrar novamente.`);
          } else {
            toast.success('Conta criada com sucesso! Verifique seu e-mail se necessário.');
            // Send confirmation email via Mailpit (server-side endpoint)
            try {
              await fetch('http://localhost:8080/api/send-confirmation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: insertData.email })
              });
            } catch (e) {
              console.warn('Failed to send confirmation email:', e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.message === 'Invalid login credentials') {
        toast.error('E-mail ou senha incorretos. Se ainda não tem uma conta, use a aba "Cadastrar".');
      } else if (error.message?.includes('For security purposes, you can only request this after')) {
        const seconds = error.message.match(/\d+/)?.[0] || 'alguns';
        toast.error(`Muitas tentativas! Por segurança, aguarde ${seconds} segundos antes de tentar novamente.`);
      } else if (error.message === 'Email not confirmed') {
        toast.error('Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada (e a pasta de spam) para o link de ativação.');
      } else if (error.message === 'email rate limit exceeded') {
        toast.error('Limite de envio de e-mails do Supabase excedido. Tente usar o "Entrar com Google" ou aguarde alguns minutos.');
      } else {
        toast.error(`Erro: ${error.message}`);
      }
      console.error("Auth error:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FBFDF9] dark:bg-[#121212] p-4 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full mx-auto bg-white dark:bg-[#212121] elevation-1 rounded-3xl p-6 sm:p-8 space-y-6 sm:space-y-8 border border-slate-100 dark:border-[#424242]"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex bg-primary/10 dark:bg-primary/20 rounded-3xl p-1 mb-2 sm:mb-4 shadow-sm overflow-hidden w-20 h-20 mx-auto">
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Astea Scientific</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Gestão Inteligente de Feiras Científicas</p>
        </div>

        <div className="flex p-1 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
          <button 
            onClick={() => setMode('login')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'login' || mode === 'forgot' || mode === 'reset' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary' : 'text-slate-400 dark:text-slate-500'}`}
          >
            Entrar
          </button>
          <button 
            onClick={() => setMode('register')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'register' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary' : 'text-slate-400 dark:text-slate-500'}`}
          >
            Cadastrar
          </button>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <AnimatePresence mode="wait">
            {mode === 'register' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1"
              >
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Nome Completo</label>
                <div className="relative">
                  <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-600" />
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-primary/30 transition-all dark:text-white"
                    placeholder="Seu nome"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {mode !== 'reset' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-600" />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-primary/30 transition-all dark:text-white"
                  placeholder="exemplo@gmail.com"
                />
              </div>
            </div>
          )}

          {mode !== 'forgot' && (
            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">{mode === 'reset' ? 'Nova Senha' : 'Senha'}</label>
                {mode === 'login' && (
                  <button 
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-600" />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-primary/30 transition-all dark:text-white"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-primary text-white py-4 rounded-xl font-bold shadow-lg hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-70"
          >
            {isLoggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              mode === 'login' ? <LogIn className="w-5 h-5" /> : 
              mode === 'register' ? <UserPlus className="w-5 h-5" /> :
              mode === 'forgot' ? <Mail className="w-5 h-5" /> :
              <Lock className="w-5 h-5" />
            )}
            {mode === 'login' ? (isLoggingIn ? 'Entrando...' : 'Entrar') : 
             mode === 'register' ? (isLoggingIn ? 'Cadastrando...' : 'Criar Conta') :
             mode === 'forgot' ? (isLoggingIn ? 'Enviando...' : 'Recuperar Senha') :
             (isLoggingIn ? 'Redefinindo...' : 'Redefinir Senha')}
          </button>
          
          {(mode === 'forgot' || mode === 'reset') && (
            <button 
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-center text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-primary transition-colors"
            >
              Voltar para o Login
            </button>
          )}
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100 dark:border-[#424242]"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-[#212121] px-4 text-slate-400 dark:text-[#9e9e9e] font-bold">Ou</span>
          </div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={isLoggingIn}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-[#212121] border border-slate-100 dark:border-[#424242] text-slate-600 dark:text-[#f8fafc] py-4 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-[#2c2c2c] transition-all active:scale-95 disabled:opacity-70"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Entrar com Google
        </button>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 p-3 bg-primary/5 dark:bg-primary/10 rounded-xl">
            <ShieldCheck className="text-primary w-4 h-4" />
            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Seguro</p>
          </div>
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
            <Globe className="text-blue-600 w-4 h-4" />
            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Global</p>
          </div>
        </div>

        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20 space-y-2">
          <p className="text-[11px] text-amber-700 dark:text-amber-500 leading-relaxed">
            <span className="font-bold">Dica:</span> Se você ainda não criou uma conta neste novo sistema (Supabase), use a aba <span className="font-bold italic">Cadastrar</span> acima.
          </p>
          <div className="pt-2 border-t border-amber-200/50 dark:border-amber-900/30 space-y-1">
            <p className="text-[10px] text-amber-600/80 dark:text-amber-500/80 italic">
              <span className="font-bold">Admin:</span> <span className="font-mono bg-amber-100/50 dark:bg-amber-900/20 px-1 rounded">admin@ifmaker.com</span> / <span className="font-mono bg-amber-100/50 dark:bg-amber-900/20 px-1 rounded">iLy831104</span>
            </p>
            <p className="text-[10px] text-amber-600/80 dark:text-amber-500/80 italic">
              <span className="font-bold">Aluno:</span> <span className="font-mono bg-amber-100/50 dark:bg-amber-900/20 px-1 rounded">user@gmail.com</span> / <span className="font-mono bg-amber-100/50 dark:bg-amber-900/20 px-1 rounded">mudar123</span>
            </p>
            <p className="text-[10px] text-amber-600/80 dark:text-amber-500/80 italic">
              <span className="font-bold">Gerenciador:</span> <span className="font-mono bg-amber-100/50 dark:bg-amber-900/20 px-1 rounded">gerenciador@gmail.com</span> / <span className="font-mono bg-amber-100/50 dark:bg-amber-900/20 px-1 rounded">mudar123</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
