import React, { useState } from 'react';
import { LogIn, Beaker, ShieldCheck, Globe, Loader2, Mail, Lock, UserPlus } from 'lucide-react';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { doc, setDoc } from 'firebase/firestore';

export function LoginView() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleGoogleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success('Login realizado com sucesso!');
    } catch (error) {
      handleAuthError(error);
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

    setIsLoggingIn(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Login realizado com sucesso!');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Determine role based on email
        const role = email === 'admin@gmail.com' ? 'admin' : 'student';
        
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: name,
          photoURL: null,
          role: role,
          institutionId: 'default-inst'
        });
        
        toast.success('Conta criada com sucesso!');
      }
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAuthError = (error: any) => {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          toast.error('O login foi cancelado.');
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          toast.error('E-mail ou senha incorretos.');
          break;
        case 'auth/email-already-in-use':
          toast.error('Este e-mail já está em uso.');
          break;
        case 'auth/weak-password':
          toast.error('A senha deve ter pelo menos 6 caracteres.');
          break;
        default:
          toast.error(`Erro: ${error.message}`);
      }
    } else {
      toast.error('Ocorreu um erro inesperado.');
    }
    console.error("Auth error:", error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBFDF9] p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white elevation-1 rounded-3xl p-8 space-y-8 border border-slate-100"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex bg-primary rounded-2xl p-4 mb-4 shadow-sm">
            <Beaker className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Astea Scientific</h1>
          <p className="text-slate-500 text-sm">Gestão Inteligente de Feiras Científicas</p>
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
            {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
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
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
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
      </motion.div>
    </div>
  );
}
