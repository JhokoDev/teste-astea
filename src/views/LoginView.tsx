import React, { useState } from 'react';
import { LogIn, Beaker, ShieldCheck, Globe, Loader2, Mail, Lock, UserPlus } from 'lucide-react';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export function LoginView() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

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
          
          // Create user profile in Supabase table
          const { error: insertError } = await supabase.from('users').insert({
            uid: user.id,
            email: user.email,
            displayName: name,
            photoURL: null,
            role: role,
            institutionId: 'default-inst'
          });

          if (insertError) {
            console.error("Error creating user profile:", insertError);
            // We don't throw here because the user is already created in Auth
            // They might just need to sync later or we can try again
            toast.warning('Conta criada, mas houve um erro ao salvar seu perfil. Tente entrar novamente.');
          } else {
            toast.success('Conta criada com sucesso! Verifique seu e-mail se necessário.');
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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FBFDF9] p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full mx-auto bg-white elevation-1 rounded-3xl p-6 sm:p-8 space-y-6 sm:space-y-8 border border-slate-100"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex bg-primary rounded-2xl p-3 sm:p-4 mb-2 sm:mb-4 shadow-sm">
            <Beaker className="text-white w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Astea Scientific</h1>
          <p className="text-slate-500 text-xs sm:text-sm">Gestão Inteligente de Feiras Científicas</p>
        </div>

        <div className="flex p-1 bg-slate-50 rounded-xl">
          <button 
            onClick={() => setMode('login')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'login' ? 'bg-white shadow-sm text-primary' : 'text-slate-400'}`}
          >
            Entrar
          </button>
          <button 
            onClick={() => setMode('register')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'register' ? 'bg-white shadow-sm text-primary' : 'text-slate-400'}`}
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
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nome Completo</label>
                <div className="relative">
                  <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-primary/30 transition-all"
                    placeholder="Seu nome"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-primary/30 transition-all"
                placeholder="exemplo@gmail.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-primary/30 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-primary text-white py-4 rounded-xl font-bold shadow-lg hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-70"
          >
            {isLoggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />
            )}
            {mode === 'login' ? (isLoggingIn ? 'Entrando...' : 'Entrar') : (isLoggingIn ? 'Cadastrando...' : 'Criar Conta')}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-4 text-slate-400 font-bold">Ou</span>
          </div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={isLoggingIn}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-100 text-slate-600 py-4 rounded-xl font-bold hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-70"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Entrar com Google
        </button>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl">
            <ShieldCheck className="text-primary w-4 h-4" />
            <p className="text-[10px] font-bold text-slate-600 uppercase">Seguro</p>
          </div>
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
            <Globe className="text-blue-600 w-4 h-4" />
            <p className="text-[10px] font-bold text-slate-600 uppercase">Global</p>
          </div>
        </div>

        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-2">
          <p className="text-[11px] text-amber-700 leading-relaxed">
            <span className="font-bold">Dica:</span> Se você ainda não criou uma conta neste novo sistema (Supabase), use a aba <span className="font-bold italic">Cadastrar</span> acima.
          </p>
          <div className="pt-2 border-t border-amber-200/50 space-y-1">
            <p className="text-[10px] text-amber-600/80 italic">
              <span className="font-bold">Admin:</span> <span className="font-mono bg-amber-100/50 px-1 rounded">admin@ifmaker.com</span> / <span className="font-mono bg-amber-100/50 px-1 rounded">iLy831104</span>
            </p>
            <p className="text-[10px] text-amber-600/80 italic">
              <span className="font-bold">Aluno:</span> <span className="font-mono bg-amber-100/50 px-1 rounded">user@gmail.com</span> / <span className="font-mono bg-amber-100/50 px-1 rounded">mudar123</span>
            </p>
            <p className="text-[10px] text-amber-600/80 italic">
              <span className="font-bold">Gerenciador:</span> <span className="font-mono bg-amber-100/50 px-1 rounded">gerenciador@gmail.com</span> / <span className="font-mono bg-amber-100/50 px-1 rounded">mudar123</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
