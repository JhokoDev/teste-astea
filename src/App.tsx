/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar, TabId } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { FairsView } from './views/FairsView';
import { ProjectsView } from './views/ProjectsView';
import { EvaluatorsView } from './views/EvaluatorsView';
import { SettingsView } from './views/SettingsView';
import { LoginView } from './views/LoginView';
import { Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './supabase';
import { Toaster } from 'sonner';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('painel');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    // Check for mock dev user first
    const mockUserStr = localStorage.getItem('dev_user');
    if (mockUserStr) {
      try {
        const mockUser = JSON.parse(mockUserStr);
        // If it's the old ID, clear it and let them log in again
        if (mockUser.id === 'dev-admin-id') {
          localStorage.removeItem('dev_user');
          window.location.reload();
          return;
        }
        setUser(mockUser);
        setLoading(false);
        setIsAuthReady(true);
        return;
      } catch (e) {
        localStorage.removeItem('dev_user');
      }
    }

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // If we have a dev user, don't let Supabase override it unless it's a real login
      if (localStorage.getItem('dev_user') && !session) return;
      
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const syncUser = async () => {
      if (user && !localStorage.getItem('dev_user')) {
        const { data: userProfile, error } = await supabase
          .from('users')
          .select('*')
          .eq('uid', user.id)
          .single();

        if (error && error.code === 'PGRST116') { // Not found
          const isAdminEmail = user.email === 'admin@gmail.com' || user.email === 'aistudiojhoko@gmail.com';
          await supabase.from('users').insert({
            uid: user.id,
            email: user.email,
            displayName: user.user_metadata?.full_name || user.email?.split('@')[0],
            photoURL: user.user_metadata?.avatar_url,
            role: isAdminEmail ? 'admin' : 'student',
            institutionId: 'default-inst'
          });
        }
        setIsAuthReady(true);
      } else {
        setIsAuthReady(false);
      }
    };
    if (!loading) syncUser();
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const renderView = () => {
    switch (activeTab) {
      case 'painel': return <DashboardView />;
      case 'feiras': return <FairsView />;
      case 'projetos': return <ProjectsView />;
      case 'avaliadores': return <EvaluatorsView />;
      case 'configuracoes': return <SettingsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FBFDF9]">
      <Toaster position="top-right" richColors />
      
      {!user ? (
        <LoginView />
      ) : (
        <>
          {/* Mobile Sidebar Overlay */}
          <AnimatePresence>
            {isMobileSidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileSidebarOpen(false)}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
              />
            )}
          </AnimatePresence>

          <div className={cn(
            "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0",
            isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <Sidebar 
              activeTab={activeTab} 
              onTabChange={setActiveTab}
              onClose={() => setIsMobileSidebarOpen(false)}
            />
          </div>
          
          <main className="flex-1 flex flex-col min-w-0 w-full">
            <Header onMenuClick={() => setIsMobileSidebarOpen(true)} />
            
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderView()}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          {/* Floating Action Button */}
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 bg-primary text-white p-4 lg:px-6 lg:py-4 rounded-full elevation-1 flex items-center gap-3 shadow-lg hover:bg-primary/90 transition-all z-20"
          >
            <Plus className="w-5 h-5" />
            <span className="font-bold hidden lg:inline">Nova Etapa</span>
          </motion.button>
        </>
      )}
    </div>
  );
}
