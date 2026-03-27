/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar, TabId } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { FairsView } from './views/FairsView';
import { ExploreFairsView } from './views/ExploreFairsView';
import { ProjectsView } from './views/ProjectsView';
import { EvaluatorsView } from './views/EvaluatorsView';
import { SettingsView } from './views/SettingsView';
import { ProfileView } from './views/ProfileView';
import { LoginView } from './views/LoginView';
import { Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './supabase';
import { Toaster } from 'sonner';
import { cn } from './lib/utils';
import { UserRole } from './types';

export default function App() {
  const [authUser, setAuthUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('painel');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  useEffect(() => {
    const savedSimulatedRole = localStorage.getItem('simulated_role') as UserRole;
    if (savedSimulatedRole) {
      setSimulatedRole(savedSimulatedRole);
    }
  }, []);

  const handleSimulateRole = (role: UserRole | null) => {
    if (role) {
      localStorage.setItem('simulated_role', role);
    } else {
      localStorage.removeItem('simulated_role');
    }
    setSimulatedRole(role);
  };

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
        setAuthUser(mockUser);
        setProfile(mockUser);
        setLoading(false);
        setIsAuthReady(true);
        return;
      } catch (e) {
        localStorage.removeItem('dev_user');
      }
    }

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
      if (!session) setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // If we have a dev user, don't let Supabase override it unless it's a real login
      if (localStorage.getItem('dev_user') && !session) return;
      
      setAuthUser(session?.user ?? null);
      if (!session) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const syncUser = async () => {
      if (authUser && !localStorage.getItem('dev_user')) {
        const { data: userProfile, error } = await supabase
          .from('users')
          .select('*')
          .eq('uid', authUser.id)
          .single();

        if (error && error.code === 'PGRST116') { // Not found
          const isAdminEmail = authUser.email === 'admin@gmail.com' || authUser.email === 'aistudiojhoko@gmail.com';
          const { data: newProfile, error: insertError } = await supabase.from('users').insert({
            uid: authUser.id,
            email: authUser.email,
            display_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
            photo_url: authUser.user_metadata?.avatar_url,
            role: isAdminEmail ? 'admin' : 'student',
            institution_id: 'default-inst'
          }).select().single();
          
          if (insertError) {
            console.error('Error creating user profile in App.tsx:', insertError);
          } else {
            setProfile(newProfile);
          }
        } else if (userProfile) {
          setProfile(userProfile);
        } else if (error) {
          console.error('Error fetching user profile in App.tsx:', error);
        }
        setLoading(false);
        setIsAuthReady(true);
      } else {
        setIsAuthReady(false);
      }
    };
    if (authUser || !loading) syncUser();
  }, [authUser, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const effectiveRole = (profile?.role === 'admin' && simulatedRole) ? simulatedRole : profile?.role;

  const renderView = () => {
    switch (activeTab) {
      case 'painel': return <DashboardView userRole={effectiveRole} userId={profile?.uid} />;
      case 'feiras': return <FairsView profile={profile} />;
      case 'explorar': return <ExploreFairsView profile={profile} />;
      case 'projetos': return <ProjectsView profile={profile} />;
      case 'avaliadores': return <EvaluatorsView profile={profile} />;
      case 'configuracoes': return <SettingsView />;
      case 'perfil': return <ProfileView onSimulateRole={handleSimulateRole} simulatedRole={simulatedRole} theme={theme} onThemeChange={handleThemeChange} />;
      default: return <DashboardView userRole={effectiveRole} userId={profile?.uid} />;
    }
  };

  return (
    <div className={cn("min-h-screen bg-[#FBFDF9] dark:bg-app-bg text-app-fg transition-colors duration-300", authUser && "flex")}>
      <Toaster position="top-right" richColors />
      
      {!authUser ? (
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
                className="fixed inset-0 bg-black/50 z-[60] lg:hidden backdrop-blur-sm"
              />
            )}
          </AnimatePresence>

          <div className={cn(
            "fixed inset-y-0 left-0 z-[70] transform transition-transform duration-300 lg:relative lg:translate-x-0",
            isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <Sidebar 
              activeTab={activeTab} 
              onTabChange={setActiveTab}
              onClose={() => setIsMobileSidebarOpen(false)}
              userRole={effectiveRole}
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
