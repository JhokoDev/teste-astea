import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Building, Camera, Loader2, Save, Key, Bell, Palette, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { supabase } from '../supabase';
import { toast } from 'sonner';
import { UserRole } from '../types';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  manager: 'Gerenciador de Feira',
  advisor: 'Orientador',
  evaluator: 'Avaliador',
  student: 'Padrão (Aluno)'
};

interface ProfileViewProps {
  onSimulateRole?: (role: UserRole | null) => void;
  simulatedRole?: UserRole | null;
  theme?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
}

export function ProfileView({ onSimulateRole, simulatedRole, theme = 'light', onThemeChange }: ProfileViewProps) {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const mockUserStr = localStorage.getItem('dev_user');
      if (mockUserStr) {
        const mock = JSON.parse(mockUserStr);
        setUser(mock);
        setProfile(mock);
        setDisplayName(mock.displayName || '');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('uid', user.id)
          .single();
        
        if (profile) {
          setProfile(profile);
          setDisplayName(profile.displayName || '');
        }
      }
    };
    fetchUser();
  }, []);

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      if (localStorage.getItem('dev_user')) {
        const mock = JSON.parse(localStorage.getItem('dev_user')!);
        const updated = { ...mock, displayName };
        localStorage.setItem('dev_user', JSON.stringify(updated));
        setProfile(updated);
        toast.success('Perfil atualizado com sucesso!');
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ displayName })
        .eq('uid', user.id);

      if (error) throw error;
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao atualizar perfil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-slate-900">Meu Perfil</h2>
        <p className="text-slate-500">Gerencie suas informações pessoais e configurações de conta.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white elevation-1 rounded-2xl p-6 text-center space-y-4">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl overflow-hidden border-4 border-white shadow-sm">
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  profile.displayName?.[0] || 'U'
                )}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-slate-100 text-slate-600 hover:text-primary transition-colors">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">{profile.displayName}</h3>
              <p className="text-xs font-bold text-primary uppercase tracking-wider">
                {ROLE_LABELS[profile.role as UserRole] || profile.role}
              </p>
            </div>
            <div className="pt-4 border-t border-slate-50 space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="truncate">{profile.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Building className="w-4 h-4 text-slate-400" />
                <span>{profile.institutionId || 'Instituição Padrão'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white elevation-1 rounded-2xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Nível de Acesso
            </h4>
            <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-xs text-primary font-medium leading-relaxed">
                Você possui permissões de <strong>{ROLE_LABELS[profile.role as UserRole] || profile.role}</strong>. Algumas configurações avançadas podem estar restritas.
              </p>
            </div>
          </div>
        </div>

        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white elevation-1 rounded-2xl p-6 lg:p-8 space-y-8">
            <div className="space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Informações Pessoais
              </h3>
              
              <div className="grid gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nome de Exibição</label>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20" 
                    placeholder="Seu nome completo" 
                  />
                </div>
                
                {profile.role === 'admin' && (
                  <div className="space-y-1 p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <label className="text-xs font-bold text-amber-600 uppercase flex items-center gap-2">
                      <Shield className="w-3 h-3" />
                      Simular Nível de Acesso (Admin Only)
                    </label>
                    <p className="text-[10px] text-amber-500 mb-2">Use para testar a visualização de outros cargos sem perder seu acesso real de administrador.</p>
                    <select 
                      value={simulatedRole || 'admin'}
                      onChange={e => onSimulateRole?.(e.target.value as UserRole)}
                      className="w-full bg-white border border-amber-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-500/20 text-sm font-medium"
                    >
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">E-mail (Não editável)</label>
                  <input 
                    type="email" 
                    value={profile.email}
                    disabled
                    className="w-full bg-slate-100 border-none rounded-xl p-3 outline-none cursor-not-allowed text-slate-500" 
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={handleUpdateProfile}
                  disabled={loading}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-md hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Alterações
                </button>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-50 space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                Segurança
              </h3>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm font-bold">Senha da Conta</p>
                  <p className="text-xs text-slate-500">Altere sua senha de acesso periodicamente.</p>
                </div>
                <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">
                  Alterar Senha
                </button>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-50 space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notificações
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Notificações por E-mail</p>
                  <div className="w-10 h-5 bg-primary rounded-full relative">
                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Alertas de Prazos</p>
                  <div className="w-10 h-5 bg-primary rounded-full relative">
                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-50 space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Aparência
              </h3>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm font-bold">Tema do Sistema</p>
                  <p className="text-xs text-slate-500">Escolha entre o modo claro ou escuro.</p>
                </div>
                <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                  <button 
                    onClick={() => onThemeChange?.('light')}
                    className={cn(
                      "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                      theme === 'light' ? "bg-primary text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Claro
                  </button>
                  <button 
                    onClick={() => onThemeChange?.('dark')}
                    className={cn(
                      "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                      theme === 'dark' ? "bg-primary text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Escuro
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
