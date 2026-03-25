import React, { useState, useEffect } from 'react';
import { Shield, Lock, History, Database, Users, Bell, Globe, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
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
        // Fetch user profile to get institutionId
        const { data: userProfile } = await supabase
          .from('users')
          .select('institutionId')
          .eq('uid', user.id)
          .single();

        if (userProfile) {
          // Fetch institution settings
          const { data: instData } = await supabase
            .from('institutions')
            .select('settings')
            .eq('id', userProfile.institutionId)
            .single();
          
          if (instData) {
            setSettings(instData.settings || {});
          }
        }
      }

      // Fetch audit logs
      const { data: logsData } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(5);
      
      if (logsData) {
        setLogs(logsData);
      }
      setLoading(false);
    };

    // Real-time subscription for logs
    const subscription = supabase
      .channel('audit_logs_changes')
      .on('postgres_changes' as any, { event: 'INSERT', table: 'audit_logs' }, async () => {
        const { data } = await supabase
          .from('audit_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(5);
        if (data) setLogs(data);
      })
      .subscribe();

    fetchSettingsAndLogs();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const toggleSetting = async (key: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!settings || !user) return;
    
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);

    const { data: userProfile } = await supabase
      .from('users')
      .select('institutionId')
      .eq('uid', user.id)
      .single();

    if (userProfile) {
      await supabase
        .from('institutions')
        .update({ settings: newSettings })
        .eq('id', userProfile.institutionId);
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
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 max-w-4xl mx-auto">
      <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Configurações do Sistema</h2>

      <div className="grid gap-6">
        <section className="bg-white elevation-1 rounded-2xl p-4 lg:p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <Shield className="text-primary w-6 h-6 shrink-0" />
            <div>
              <h3 className="text-lg font-bold">Segurança e Privacidade (RF15)</h3>
              <p className="text-xs text-slate-400">Controle de isolamento por silos institucionais.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-xl gap-4">
              <div>
                <p className="text-sm font-bold">Isolamento de Dados</p>
                <p className="text-xs text-slate-500">Impedir que usuários vejam projetos de outras instituições.</p>
              </div>
              <div 
                onClick={() => toggleSetting('dataIsolation')}
                className={cn(
                  "w-12 h-6 rounded-full relative cursor-pointer transition-colors shrink-0",
                  settings?.dataIsolation ? "bg-primary" : "bg-slate-200"
                )}
              >
                <motion.div 
                  animate={{ x: settings?.dataIsolation ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" 
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-xl gap-4">
              <div>
                <p className="text-sm font-bold">Anonimização Automática</p>
                <p className="text-xs text-slate-500">Remover nomes de autores em exportações públicas.</p>
              </div>
              <div 
                onClick={() => toggleSetting('autoAnonymization')}
                className={cn(
                  "w-12 h-6 rounded-full relative cursor-pointer transition-colors shrink-0",
                  settings?.autoAnonymization ? "bg-primary" : "bg-slate-200"
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

        <section className="bg-white elevation-1 rounded-2xl p-4 lg:p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <History className="text-primary w-6 h-6 shrink-0" />
            <div>
              <h3 className="text-lg font-bold">Trilha de Auditoria (RF16)</h3>
              <p className="text-xs text-slate-400">Registros imutáveis de acessos e alterações.</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {logs.length > 0 ? logs.map((log, idx) => (
              <div key={log.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border-b border-slate-50 last:border-none gap-2">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-primary/40 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{log.action}</p>
                    <p className="text-[10px] text-slate-400">Por {log.userName} em {log.target}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-300 uppercase">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )) : (
              <p className="text-xs text-slate-400 text-center py-4">Nenhum log de auditoria encontrado.</p>
            )}
            <button className="w-full py-2 text-xs font-bold text-primary hover:underline">Ver Log Completo</button>
          </div>
        </section>

        <section className="bg-white elevation-1 rounded-2xl p-4 lg:p-6 space-y-4">
          <h3 className="text-lg font-bold">Integrações e API</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 border border-slate-100 rounded-xl hover:border-primary/20 transition-all cursor-pointer">
              <Database className="w-5 h-5 text-slate-400 mb-2" />
              <p className="text-sm font-bold">Webhooks</p>
              <p className="text-[10px] text-slate-400">Notificações em tempo real.</p>
            </div>
            <div className="p-4 border border-slate-100 rounded-xl hover:border-primary/20 transition-all cursor-pointer">
              <Globe className="w-5 h-5 text-slate-400 mb-2" />
              <p className="text-sm font-bold">API Access</p>
              <p className="text-[10px] text-slate-400">Tokens de acesso programático.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
