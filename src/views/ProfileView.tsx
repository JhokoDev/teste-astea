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
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [deadlineAlerts, setDeadlineAlerts] = useState(true);
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const mockUserStr = localStorage.getItem('dev_user');
      if (mockUserStr) {
        const mock = JSON.parse(mockUserStr);
        setUser(mock);
        setProfile(mock);
        setDisplayName(mock.displayName || '');
        setEmailNotifications(mock.settings?.emailNotifications ?? true);
        setDeadlineAlerts(mock.settings?.deadlineAlerts ?? true);
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
          setEmailNotifications(profile.settings?.emailNotifications ?? true);
          setDeadlineAlerts(profile.settings?.deadlineAlerts ?? true);
        }
      }
    };
    fetchUser();
  }, []);

  const handleUpdateProfile = async (updates: any = {}) => {
    try {
      setLoading(true);
      const newSettings = {
        emailNotifications,
        deadlineAlerts,
        ...updates.settings
      };

      const finalDisplayName = updates.displayName !== undefined ? updates.displayName : displayName;
      const finalPhotoURL = updates.photoURL !== undefined ? updates.photoURL : profile.photoURL;

      if (localStorage.getItem('dev_user')) {
        const mock = JSON.parse(localStorage.getItem('dev_user')!);
        const updated = { 
          ...mock, 
          displayName: finalDisplayName,
          photoURL: finalPhotoURL,
          settings: newSettings 
        };
        localStorage.setItem('dev_user', JSON.stringify(updated));
        setProfile(updated);
        toast.success('Perfil atualizado com sucesso!');
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ 
          displayName: finalDisplayName,
          photoURL: finalPhotoURL,
          settings: newSettings 
        })
        .eq('uid', user.id);

      if (error) throw error;
      
      setProfile({ ...profile, displayName: finalDisplayName, photoURL: finalPhotoURL, settings: newSettings });
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao atualizar perfil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      await handleUpdateProfile({ photoURL: base64String });
    };
    reader.readAsDataURL(file);
  };

  const handleResetPassword = async () => {
    if (!profile?.email) return;
    
    try {
      setResettingPassword(true);
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      toast.success('E-mail de redefinição de senha enviado!');
    } catch (error: any) {
      toast.error('Erro ao enviar e-mail: ' + error.message);
    } finally {
      setResettingPassword(false);
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
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-8 bg-background-light dark:bg-app-bg min-h-full transition-colors duration-300">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-app-fg">Meu Perfil</h2>
        <p className="text-slate-500 dark:text-app-muted">Gerencie suas informações pessoais e configurações de conta.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-6 text-center space-y-4">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-primary-light font-bold text-3xl overflow-hidden border-4 border-white dark:border-app-card shadow-sm">
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  profile.displayName?.[0] || 'U'
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-white dark:bg-app-surface rounded-full shadow-md border border-slate-100 dark:border-app-border text-slate-600 dark:text-app-muted hover:text-primary dark:hover:text-primary-light transition-colors cursor-pointer">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-app-fg">{profile.displayName}</h3>
              <p className="text-xs font-bold text-primary dark:text-primary-light uppercase tracking-wider">
                {ROLE_LABELS[profile.role as UserRole] || profile.role}
              </p>
            </div>
            <div className="pt-4 border-t border-slate-50 dark:border-app-border space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-app-muted">
                <Mail className="w-4 h-4 text-slate-400 dark:text-app-muted/60" />
                <span className="truncate">{profile.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-app-muted">
                <Building className="w-4 h-4 text-slate-400 dark:text-app-muted/60" />
                <span>{profile.institutionId || 'Instituição Padrão'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-app-fg flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary dark:text-primary-light" />
              Nível de Acesso
            </h4>
            <div className="p-3 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/10 dark:border-primary/20">
              <p className="text-xs text-primary dark:text-primary-light font-medium leading-relaxed">
                Você possui permissões de <strong>{ROLE_LABELS[profile.role as UserRole] || profile.role}</strong>. Algumas configurações avançadas podem estar restritas.
              </p>
            </div>
          </div>
        </div>

        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-6 lg:p-8 space-y-8">
            <div className="space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2 dark:text-app-fg">
                <User className="w-5 h-5 text-primary dark:text-primary-light" />
                Informações Pessoais
              </h3>
              
              <div className="grid gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Nome de Exibição</label>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg" 
                    placeholder="Seu nome completo" 
                  />
                </div>
                
                {profile.role === 'admin' && (
                  <div className="space-y-1 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20">
                    <label className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase flex items-center gap-2">
                      <Shield className="w-3 h-3" />
                      Simular Nível de Acesso (Admin Only)
                    </label>
                    <p className="text-[10px] text-amber-500 dark:text-amber-400/60 mb-2">Use para testar a visualização de outros cargos sem perder seu acesso real de administrador.</p>
                    <select 
                      value={simulatedRole || 'admin'}
                      onChange={e => onSimulateRole?.(e.target.value as UserRole)}
                      className="w-full bg-white dark:bg-app-surface border border-amber-200 dark:border-amber-900/30 rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-500/20 text-sm font-medium dark:text-app-fg"
                    >
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase">E-mail (Não editável)</label>
                  <input 
                    type="email" 
                    value={profile.email}
                    disabled
                    className="w-full bg-slate-100 dark:bg-app-surface/50 border-none rounded-xl p-3 outline-none cursor-not-allowed text-slate-500 dark:text-app-muted/40" 
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={() => handleUpdateProfile()}
                  disabled={loading}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-md hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Alterações
                </button>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-50 dark:border-app-border space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2 dark:text-app-fg">
                <Key className="w-5 h-5 text-primary dark:text-primary-light" />
                Segurança
              </h3>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-app-surface rounded-xl">
                <div>
                  <p className="text-sm font-bold dark:text-app-fg">Senha da Conta</p>
                  <p className="text-xs text-slate-500 dark:text-app-muted">Altere sua senha de acesso periodicamente.</p>
                </div>
                <button 
                  onClick={handleResetPassword}
                  disabled={resettingPassword}
                  className="px-4 py-2 bg-white dark:bg-app-card border border-slate-200 dark:border-app-border rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-app-surface transition-colors dark:text-app-fg disabled:opacity-50"
                >
                  {resettingPassword ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Alterar Senha'}
                </button>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-50 dark:border-app-border space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2 dark:text-app-fg">
                <Bell className="w-5 h-5 text-primary dark:text-primary-light" />
                Notificações
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium dark:text-app-fg">Notificações por E-mail</p>
                  <div 
                    onClick={() => {
                      const newVal = !emailNotifications;
                      setEmailNotifications(newVal);
                      handleUpdateProfile({ settings: { emailNotifications: newVal, deadlineAlerts } });
                    }}
                    className={cn(
                      "w-10 h-5 rounded-full relative cursor-pointer transition-colors",
                      emailNotifications ? "bg-primary" : "bg-slate-200 dark:bg-app-surface"
                    )}
                  >
                    <motion.div 
                      animate={{ x: emailNotifications ? 20 : 4 }}
                      className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm" 
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium dark:text-app-fg">Alertas de Prazos</p>
                  <div 
                    onClick={() => {
                      const newVal = !deadlineAlerts;
                      setDeadlineAlerts(newVal);
                      handleUpdateProfile({ settings: { emailNotifications, deadlineAlerts: newVal } });
                    }}
                    className={cn(
                      "w-10 h-5 rounded-full relative cursor-pointer transition-colors",
                      deadlineAlerts ? "bg-primary" : "bg-slate-200 dark:bg-app-surface"
                    )}
                  >
                    <motion.div 
                      animate={{ x: deadlineAlerts ? 20 : 4 }}
                      className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-50 dark:border-app-border space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2 dark:text-app-fg">
                <Palette className="w-5 h-5 text-primary dark:text-primary-light" />
                Aparência
              </h3>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-app-surface rounded-xl">
                <div>
                  <p className="text-sm font-bold dark:text-app-fg">Tema do Sistema</p>
                  <p className="text-xs text-slate-500 dark:text-app-muted">Escolha entre o modo claro ou escuro.</p>
                </div>
                <div className="flex bg-white dark:bg-app-card p-1 rounded-lg border border-slate-200 dark:border-app-border">
                  <button 
                    onClick={() => onThemeChange?.('light')}
                    className={cn(
                      "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                      theme === 'light' ? "bg-primary text-white shadow-sm" : "text-slate-400 dark:text-app-muted hover:text-slate-600 dark:hover:text-app-fg"
                    )}
                  >
                    Claro
                  </button>
                  <button 
                    onClick={() => onThemeChange?.('dark')}
                    className={cn(
                      "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                      theme === 'dark' ? "bg-primary text-white shadow-sm" : "text-slate-400 dark:text-app-muted hover:text-slate-600 dark:hover:text-app-fg"
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
