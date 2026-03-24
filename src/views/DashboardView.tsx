import React, { useState, useEffect } from 'react';
import { KPICard } from '../components/KPICard';
import { StageFunnel } from '../components/StageFunnel';
import { ProjectTable } from '../components/ProjectTable';
import { AlertsPanel } from '../components/AlertsPanel';
import { MOCK_KPIS, MOCK_STAGES, MOCK_ALERTS } from '../constants';
import { motion } from 'motion/react';
import { projectsService } from '../services/firestoreService';
import { Project } from '../types';

export function DashboardView() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const unsubscribe = projectsService.subscribeToProjects((data) => {
      setProjects(data as Project[]);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="p-8 space-y-8 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {MOCK_KPIS.map((kpi) => (
          <KPICard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <div className="grid grid-cols-10 gap-6">
        <div className="col-span-10 lg:col-span-7 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <StageFunnel stages={MOCK_STAGES} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white elevation-1 rounded-xl p-6"
          >
            <ProjectTable projects={projects.length > 0 ? projects : []} />
            {projects.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                Nenhum projeto encontrado no banco de dados.
              </div>
            )}
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="col-span-10 lg:col-span-3"
        >
          <AlertsPanel alerts={MOCK_ALERTS} />
        </motion.div>
      </div>
    </div>
  );
}
