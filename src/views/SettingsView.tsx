import React, { useState, useEffect } from 'react';
import { Shield, Lock, History, Database, Users, Bell, Globe, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { settingsService, usersService } from '../services/supabaseService';
import { supabase } from '../supabase';
import { cn } from '../lib/utils';

export function SettingsView() {
  const [settings, setSettings] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettingsAndLogs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userProfile } = await usersService.getProfile(user.id);

        if (userProfile) {
          const { data: instData } = await settingsService.getInstitutionSettings(userProfile.institutionid);
          
          if (instData) {
            setSettings(instData.settings || {});
          }
        }
      }

      const { data: logsData } = await settingsService.getAuditLogs(5);
      
      if (logsData) {
        setLogs(logsData);
      }
      setLoading(false);
    };

    const unsubscribe = settingsService.subscribeToAuditLogs(async (event) => {
      if (event.type === 'INSERT') {
        const { data } = await settingsService.getAuditLogs(5);
        if (data) setLogs(data);
      }
    });

    fetchSettingsAndLogs();
    return () => {
      unsubscribe();
    };
  }, []);

  const toggleSetting = async (key: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!settings || !user) return;
    
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);

    const { data: userProfile } = await usersService.getProfile(user.id);

    if (userProfile) {
      await settingsService.updateInstitutionSettings(userProfile.institutionid, newSettings);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 max-w-4xl mx-auto bg-background-light dark:bg-app-bg transition-colors duration-300">
      <h2 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-app-fg">Configurações do Sistema</h2>

      <div className="grid gap-6">
        <section className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-4 lg:p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 dark:border-app-border pb-4">
            <Shield className="text-primary dark:text-primary-light w-6 h-6 shrink-0" />
            <div>
              <h3 className="text-lg font-bold dark:text-app-fg">Segurança e Privacidade (RF15)</h3>
              <p className="text-xs text-slate-400 dark:text-app-muted">Controle de isolamento por silos institucionais.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 dark:bg-app-surface rounded-xl gap-4">
              <div>
                <p className="text-sm font-bold dark:text-app-fg">Isolamento de Dados</p>
                <p className="text-xs text-slate-500 dark:text-app-muted">Impedir que usuários vejam projetos de outras instituições.</p>
              </div>
              <div 
                onClick={() => toggleSetting('dataIsolation')}
                className={cn(
                  "w-12 h-6 rounded-full relative cursor-pointer transition-colors shrink-0",
                  settings?.dataIsolation ? "bg-primary" : "bg-slate-200 dark:bg-app-border"
                )}
              >
                <motion.div 
                  animate={{ x: settings?.dataIsolation ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" 
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 dark:bg-app-surface rounded-xl gap-4">
              <div>
                <p className="text-sm font-bold dark:text-app-fg">Anonimização Automática</p>
                <p className="text-xs text-slate-500 dark:text-app-muted">Remover nomes de autores em exportações públicas.</p>
              </div>
              <div 
                onClick={() => toggleSetting('autoAnonymization')}
                className={cn(
                  "w-12 h-6 rounded-full relative cursor-pointer transition-colors shrink-0",
                  settings?.autoAnonymization ? "bg-primary" : "bg-slate-200 dark:bg-app-border"
                )}
              >
                <motion.div 
                  animate={{ x: settings?.autoAnonymization ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" 
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-4 lg:p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 dark:border-app-border pb-4">
            <History className="text-primary dark:text-primary-light w-6 h-6 shrink-0" />
            <div>
              <h3 className="text-lg font-bold dark:text-app-fg">Trilha de Auditoria (RF16)</h3>
              <p className="text-xs text-slate-400 dark:text-app-muted">Registros imutáveis de acessos e alterações.</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {logs.length > 0 ? logs.map((log, idx) => (
              <div key={log.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border-b border-slate-50 dark:border-app-border last:border-none gap-2">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-primary/40 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-app-fg">{log.action}</p>
                    <p className="text-[10px] text-slate-400 dark:text-app-muted">Por {log.users?.displayname || 'Sistema'} em {log.targettable}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-300 dark:text-app-muted/40 uppercase">
                  {new Date(log.createdat).toLocaleTimeString()}
                </span>
              </div>
            )) : (
              <p className="text-xs text-slate-400 dark:text-app-muted text-center py-4">Nenhum log de auditoria encontrado.</p>
            )}
            <button className="w-full py-2 text-xs font-bold text-primary dark:text-primary-light hover:underline">Ver Log Completo</button>
          </div>
        </section>

        <section className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-4 lg:p-6 space-y-4">
          <h3 className="text-lg font-bold dark:text-app-fg">Integrações e API</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 border border-slate-100 dark:border-app-border rounded-xl hover:border-primary/20 transition-all cursor-pointer">
              <Database className="w-5 h-5 text-slate-400 dark:text-app-muted mb-2" />
              <p className="text-sm font-bold dark:text-app-fg">Webhooks</p>
              <p className="text-[10px] text-slate-400 dark:text-app-muted">Notificações em tempo real.</p>
            </div>
            <div className="p-4 border border-slate-100 dark:border-app-border rounded-xl hover:border-primary/20 transition-all cursor-pointer">
              <Globe className="w-5 h-5 text-slate-400 dark:text-app-muted mb-2" />
              <p className="text-sm font-bold dark:text-app-fg">API Access</p>
              <p className="text-[10px] text-slate-400 dark:text-app-muted">Tokens de acesso programático.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
