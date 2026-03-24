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
import { auth, db } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Toaster } from 'sonner';

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [activeTab, setActiveTab] = useState<TabId>('painel');
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const syncUser = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          const isAdminEmail = user.email === 'admin@gmail.com' || user.email === 'aistudiojhoko@gmail.com';
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0],
            photoURL: user.photoURL,
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

  if (!user) {
    return <LoginView />;
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
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 flex flex-col min-w-0">
        <Header />
        
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
        className="fixed bottom-8 right-8 bg-primary text-white px-6 py-4 rounded-full elevation-1 flex items-center gap-3 shadow-lg hover:bg-primary/90 transition-all z-20"
      >
        <Plus className="w-5 h-5" />
        <span className="font-bold">Nova Etapa</span>
      </motion.button>
    </div>
  );
}
