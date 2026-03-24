import React from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  FileText, 
  Users, 
  Settings, 
  PanelLeftClose,
  Beaker,
  LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../supabase';

export type TabId = 'painel' | 'feiras' | 'projetos' | 'avaliadores' | 'configuracoes';

const navItems: { icon: any; label: string; id: TabId }[] = [
  { icon: LayoutDashboard, label: 'Painel', id: 'painel' },
  { icon: CalendarDays, label: 'Feiras', id: 'feiras' },
  { icon: FileText, label: 'Projetos', id: 'projetos' },
  { icon: Users, label: 'Avaliadores', id: 'avaliadores' },
  { icon: Settings, label: 'Configurações', id: 'configuracoes' },
];

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const handleLogout = async () => {
    localStorage.removeItem('dev_user');
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <aside className="w-64 bg-background-light border-r border-primary/10 flex flex-col justify-between p-4 sticky top-0 h-screen">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-primary rounded-lg p-2 flex items-center justify-center">
            <Beaker className="text-white w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-slate-900 text-base font-bold leading-tight">Astea Scientific</h1>
            <p className="text-primary text-xs font-medium">Management</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-left",
                activeTab === item.id 
                  ? "bg-primary text-white shadow-md elevation-1" 
                  : "text-slate-600 hover:bg-primary/5 hover:text-primary"
              )}
            >
              <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-white" : "text-slate-500")} />
              <p className="text-sm font-semibold">{item.label}</p>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-2">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-all duration-200 w-full text-left font-semibold text-sm"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair da Conta</span>
        </button>

        <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-xl font-bold text-sm hover:bg-primary/20 transition-colors">
          <PanelLeftClose className="w-4 h-4" />
          <span>Recolher</span>
        </button>
      </div>
    </aside>
  );
}
