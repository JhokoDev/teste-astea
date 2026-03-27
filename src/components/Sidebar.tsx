import React from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  FileText, 
  Users, 
  Settings, 
  PanelLeftClose,
  Beaker,
  LogOut,
  UserCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../supabase';
import { UserRole } from '../types';

export type TabId = 'painel' | 'feiras' | 'explorar' | 'projetos' | 'avaliadores' | 'configuracoes' | 'perfil';

const navItems: { icon: any; label: string; id: TabId; roles: UserRole[] }[] = [
  { icon: LayoutDashboard, label: 'Painel', id: 'painel', roles: ['admin', 'manager', 'advisor', 'evaluator', 'student'] },
  { icon: CalendarDays, label: 'Feiras', id: 'feiras', roles: ['admin', 'manager'] },
  { icon: CalendarDays, label: 'Explorar Feiras', id: 'explorar', roles: ['admin', 'manager', 'advisor', 'evaluator', 'student'] },
  { icon: FileText, label: 'Projetos', id: 'projetos', roles: ['admin', 'manager', 'advisor', 'evaluator', 'student'] },
  { icon: Users, label: 'Avaliadores', id: 'avaliadores', roles: ['admin', 'manager'] },
  { icon: Settings, label: 'Configurações', id: 'configuracoes', roles: ['admin'] },
];

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
  onClose?: () => void;
  userRole?: UserRole;
}

export function Sidebar({ activeTab, onTabChange, onClose, userRole = 'student' }: SidebarProps) {
  const handleLogout = async () => {
    localStorage.removeItem('dev_user');
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleTabClick = (id: TabId) => {
    onTabChange(id);
    if (onClose) onClose();
  };

  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className="w-64 bg-background-light dark:bg-app-card border-r border-primary/10 dark:border-app-border flex flex-col justify-between p-4 sticky top-0 h-screen transition-colors duration-300">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 flex items-center justify-center overflow-hidden rounded-lg">
            <img 
              src="logo.png" 
              alt="Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-slate-900 dark:text-app-fg text-base font-bold leading-tight">Astea Scientific</h1>
            <p className="text-primary text-xs font-medium uppercase tracking-widest">Plataforma</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-left",
                activeTab === item.id 
                  ? "bg-primary text-white shadow-md elevation-1" 
                  : "text-slate-600 dark:text-app-muted hover:bg-primary/5 dark:hover:bg-primary/10 hover:text-primary dark:hover:text-primary"
              )}
            >
              <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-white" : "text-slate-500 dark:text-app-muted")} />
              <p className="text-sm font-semibold">{item.label}</p>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-2">
        <button 
          onClick={() => handleTabClick('perfil')}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-left font-semibold text-sm",
            activeTab === 'perfil' 
              ? "bg-primary text-white shadow-md elevation-1" 
              : "text-slate-600 dark:text-app-muted hover:bg-primary/5 dark:hover:bg-primary/10 hover:text-primary dark:hover:text-primary"
          )}
        >
          <UserCircle className={cn("w-5 h-5", activeTab === 'perfil' ? "text-white" : "text-slate-500 dark:text-app-muted")} />
          <span>Meu Perfil</span>
        </button>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 w-full text-left font-semibold text-sm"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair da Conta</span>
        </button>

        <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 dark:bg-primary/20 text-primary rounded-xl font-bold text-sm hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors">
          <PanelLeftClose className="w-4 h-4" />
          <span>Recolher</span>
        </button>
      </div>
    </aside>
  );
}
