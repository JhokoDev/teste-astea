import React, { useState, useEffect } from 'react';
import { Search, Bell, ChevronRight, LogOut, Menu, User, Settings, LayoutDashboard, CalendarDays, Beaker, Users, UserCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { TabId } from './Sidebar';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface HeaderProps {
  onMenuClick?: () => void;
  profile?: any;
  activeTab: TabId;
}

export function Header({ onMenuClick, profile, activeTab }: HeaderProps) {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bom dia');
    else if (hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');
  }, []);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('dev_user');
      localStorage.removeItem('simulated_role');
      await supabase.auth.signOut();
      toast.success('Sessão encerrada com sucesso');
      // Small delay to let toast show before reload
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      toast.error('Erro ao encerrar sessão');
    }
  };

  const getTabInfo = (tab: TabId) => {
    switch (tab) {
      case 'painel': return { label: 'Painel Geral', icon: LayoutDashboard };
      case 'feiras': return { label: 'Minhas Feiras', icon: CalendarDays };
      case 'explorar': return { label: 'Explorar Feiras', icon: Search };
      case 'projetos': return { label: 'Projetos', icon: Beaker };
      case 'avaliadores': return { label: 'Avaliadores', icon: Users };
      case 'configuracoes': return { label: 'Configurações', icon: Settings };
      case 'perfil': return { label: 'Meu Perfil', icon: UserCircle };
      default: return { label: 'Astea', icon: LayoutDashboard };
    }
  };

  const currentTab = getTabInfo(activeTab);
  const displayName = profile?.displayname || profile?.email?.split('@')[0] || 'Usuário';
  const photoUrl = profile?.photourl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`;

  return (
    <header className="flex items-center justify-between px-4 lg:px-8 py-4 bg-[#FBFDF9] dark:bg-app-card border-b border-primary/5 dark:border-app-border sticky top-0 z-50 transition-all duration-300 backdrop-blur-md bg-white/80 dark:bg-app-card/80">
      <div className="flex items-center gap-4 lg:gap-8">
        <button 
          onClick={onMenuClick}
          className="p-2 -ml-2 text-slate-600 dark:text-app-fg hover:bg-primary/5 dark:hover:bg-primary/10 rounded-lg lg:hidden transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex flex-col">
          <nav className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary font-bold mb-0.5">
            <span className="opacity-60">Astea</span>
            <ChevronRight className="w-3 h-3 opacity-40" />
            <span>{currentTab.label}</span>
          </nav>
          <h1 className="text-lg font-black text-slate-900 dark:text-app-fg flex items-center gap-2">
            <currentTab.icon className="w-5 h-5 text-primary" />
            {currentTab.label}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-6">
        <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-primary/5 dark:bg-app-surface rounded-2xl border border-primary/10">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 dark:text-app-muted font-medium leading-none">{greeting},</span>
            <span className="text-xs font-bold text-slate-900 dark:text-app-fg leading-tight">{displayName}</span>
          </div>
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 overflow-hidden shadow-sm">
            <img 
              src={photoUrl} 
              alt={displayName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 lg:gap-2">
          <button className="p-2.5 text-slate-600 dark:text-app-muted hover:bg-primary/5 dark:hover:bg-primary/10 rounded-xl relative transition-all hover:scale-105 active:scale-95">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-app-card"></span>
          </button>
          
          <button 
            onClick={handleLogout}
            className="p-2.5 text-slate-400 dark:text-app-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all hover:scale-105 active:scale-95"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
