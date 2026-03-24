import React from 'react';
import { Search, Bell, ChevronRight, LogOut } from 'lucide-react';
import { supabase } from '../supabase';
import { useState, useEffect } from 'react';

export function Header() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleLogout = () => {
    supabase.auth.signOut();
  };

  return (
    <header className="flex items-center justify-between px-8 py-4 bg-[#FBFDF9] border-b border-primary/5 sticky top-0 z-10">
      <div className="flex items-center gap-8">
        <nav className="flex items-center gap-2 text-sm">
          <span className="text-primary font-medium hover:underline cursor-pointer">Feiras</span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-900 font-bold">Nome da Feira</span>
        </nav>
        
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search" 
            className="w-full bg-primary/5 border-none rounded-xl pl-10 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-600 hover:bg-primary/5 rounded-full relative transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
          <div className="w-10 h-10 rounded-full border-2 border-primary/20 overflow-hidden cursor-pointer hover:border-primary/40 transition-all">
            <img 
              src={user?.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100"} 
              alt="User profile"
              className="w-full h-full object-cover"
            />
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
