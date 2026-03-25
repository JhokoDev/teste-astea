import React, { useState, useEffect } from 'react';
import { KPICard } from '../components/KPICard';
import { StageFunnel } from '../components/StageFunnel';
import { ProjectTable } from '../components/ProjectTable';
import { AlertsPanel } from '../components/AlertsPanel';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { projectsService, fairsService, usersService } from '../services/supabaseService';
import { Project, Fair, KPI, Stage, Alert, UserRole } from '../types';

interface DashboardViewProps {
  userRole?: UserRole;
  userId?: string;
}

export function DashboardView({ userRole = 'student', userId }: DashboardViewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [fairs, setFairs] = useState<Fair[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubProjects = projectsService.subscribeToProjects((data) => {
      // Filter projects based on role
      if (userRole === 'student' || userRole === 'advisor') {
        setProjects(data.filter(p => p.creatorId === userId || p.members.some(m => m.email === userId)));
      } else {
        setProjects(data);
      }
    });
    
    const unsubFairs = fairsService.subscribeToFairs((data) => {
      if (userRole === 'manager') {
        setFairs(data.filter(f => f.organizerId === userId || f.organizerId === null));
      } else if (userRole === 'admin') {
        setFairs(data);
      } else {
        setFairs(data.filter(f => f.status === 'publicado'));
      }
    });

    const unsubUsers = usersService.subscribeToUsers((data) => {
      setUsers(data);
      setLoading(false);
    });

    return () => {
      unsubProjects();
      unsubFairs();
      unsubUsers();
    };
  }, [userRole, userId]);

  // Role-based KPI calculation
  const getKPIs = (): KPI[] => {
    if (userRole === 'admin' || userRole === 'manager') {
      return [
        { label: 'Total de Projetos', value: filteredProjects.length.toString(), icon: 'FileText' },
        { label: 'Feiras Ativas', value: fairs.filter(f => f.status === 'publicado').length.toString(), icon: 'Calendar', status: 'Normal' },
        { label: 'Avaliadores', value: users.filter(u => u.role === 'evaluator').length.toString(), icon: 'Users' },
        { label: 'Taxa de Aprovação', value: filteredProjects.length > 0 ? `${Math.round((filteredProjects.filter(p => p.status === 'aprovado').length / filteredProjects.length) * 100)}%` : '0%', icon: 'CheckCircle', status: 'Atenção' }
      ];
    }

    if (userRole === 'evaluator') {
      return [
        { label: 'Projetos Atribuídos', value: '12', icon: 'FileText' }, // Mock for now
        { label: 'Avaliações Pendentes', value: '5', icon: 'Clock', status: 'Atenção' },
        { label: 'Avaliações Concluídas', value: '7', icon: 'CheckCircle', status: 'Normal' },
        { label: 'Média de Notas', value: '8.5', icon: 'Star' }
      ];
    }

    // Student / Advisor
    return [
      { label: 'Meus Projetos', value: filteredProjects.length.toString(), icon: 'FileText' },
      { label: 'Projetos Aprovados', value: filteredProjects.filter(p => p.status === 'aprovado').length.toString(), icon: 'CheckCircle', status: 'Normal' },
      { label: 'Em Avaliação', value: filteredProjects.filter(p => p.status === 'em_avaliacao').length.toString(), icon: 'Clock' },
      { label: 'Próximo Prazo', value: '15/04', icon: 'Calendar', status: 'Atenção' }
    ];
  };

  // Role-based Stage calculation
  const getStages = (): Stage[] => {
    if (userRole === 'admin' || userRole === 'manager') {
      return [
        { id: 1, label: 'Submetidos', count: filteredProjects.filter(p => p.status === 'submetido').length.toString(), status: 'completed' },
        { id: 2, label: 'Em Avaliação', count: filteredProjects.filter(p => p.status === 'em_avaliacao').length.toString(), status: 'active' },
        { id: 3, label: 'Avaliados', count: filteredProjects.filter(p => p.status === 'avaliado').length.toString(), status: 'pending' },
        { id: 4, label: 'Finalizados', count: filteredProjects.filter(p => p.status === 'aprovado' || p.status === 'rejeitado').length.toString(), status: 'pending' }
      ];
    }

    if (userRole === 'evaluator') {
      return [
        { id: 1, label: 'Atribuídos', count: '12', status: 'completed' },
        { id: 2, label: 'Em Avaliação', count: '5', status: 'active' },
        { id: 3, label: 'Concluídos', count: '7', status: 'pending' }
      ];
    }

    return [
      { id: 1, label: 'Submissão', count: filteredProjects.filter(p => p.status === 'rascunho' || p.status === 'submetido').length.toString(), status: 'completed' },
      { id: 2, label: 'Avaliação', count: filteredProjects.filter(p => p.status === 'em_avaliacao').length.toString(), status: 'active' },
      { id: 3, label: 'Resultado', count: filteredProjects.filter(p => p.status === 'aprovado' || p.status === 'rejeitado').length.toString(), status: 'pending' }
    ];
  };

  // Role-based Alerts
  const getAlerts = (): Alert[] => {
    const alerts: Alert[] = [];
    
    if (userRole === 'admin' || userRole === 'manager') {
      const pendingProjects = filteredProjects.filter(p => p.status === 'submetido');
      if (pendingProjects.length > 0) {
        alerts.push({ id: '1', title: 'Projetos Pendentes', description: `Existem ${pendingProjects.length} projetos aguardando aprovação inicial.`, type: 'warning' });
      }
      const draftFairs = fairs.filter(f => f.status === 'rascunho');
      if (draftFairs.length > 0) {
        alerts.push({ id: '2', title: 'Feiras em Rascunho', description: `Você tem ${draftFairs.length} feiras que ainda não foram publicadas.`, type: 'info' });
      }
      if (filteredProjects.length > 0 && users.filter(u => u.role === 'evaluator').length === 0) {
        alerts.push({ id: '3', title: 'Sem Avaliadores', description: 'Existem projetos submetidos mas nenhum avaliador cadastrado no sistema.', type: 'error' });
      }
    } else if (userRole === 'evaluator') {
      alerts.push({ id: 'e1', title: 'Prazo de Avaliação', description: 'Você tem 5 projetos com prazo de avaliação vencendo em 48h.', type: 'warning' });
    } else {
      const rejectedProjects = filteredProjects.filter(p => p.status === 'rejeitado');
      if (rejectedProjects.length > 0) {
        alerts.push({ id: 's1', title: 'Projeto Rejeitado', description: 'Um de seus projetos foi rejeitado. Verifique o feedback para ajustes.', type: 'error' });
      }
      alerts.push({ id: 's2', title: 'Submissão Aberta', description: 'A Feira de Ciências 2024 está aceitando submissões até 30/04.', type: 'info' });
    }

    return alerts;
  };

  const filteredProjects = projects.filter(p => {
    if (userRole === 'admin') return true;
    if (userRole === 'manager') {
      const managerFairIds = fairs.map(f => f.id);
      return managerFairIds.includes(p.fairId);
    }
    if (userRole === 'student' || userRole === 'advisor') {
      return p.creatorId === userId || p.members.some(m => m.email === userId);
    }
    if (userRole === 'evaluator') {
      // Evaluators see assigned projects (mocked for now)
      return true; 
    }
    return false;
  });

  const kpis = getKPIs();
  const stages = getStages();
  const alerts = getAlerts();

  const getWelcomeMessage = () => {
    switch (userRole) {
      case 'admin': return 'Painel do Administrador';
      case 'manager': return 'Gestão de Feiras';
      case 'advisor': return 'Painel do Orientador';
      case 'evaluator': return 'Minhas Avaliações';
      case 'student': return 'Meu Painel Científico';
      default: return 'Bem-vindo ao Astea';
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 overflow-y-auto bg-background-light dark:bg-app-bg transition-colors duration-300 min-h-full">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-app-fg">{getWelcomeMessage()}</h2>
        <p className="text-slate-500 dark:text-app-muted text-sm">Acompanhe o progresso e as métricas em tempo real.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 lg:gap-6">
        <div className="lg:col-span-7 space-y-4 lg:space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <StageFunnel stages={stages} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-app-card elevation-1 rounded-xl p-6"
          >
            <ProjectTable projects={filteredProjects} />
            {filteredProjects.length === 0 && !loading && (
              <div className="py-12 text-center text-slate-400 dark:text-app-muted">
                Nenhum projeto encontrado no banco de dados.
              </div>
            )}
            {loading && (
              <div className="py-12 text-center text-slate-400 dark:text-app-muted flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando dados...
              </div>
            )}
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-3"
        >
          <AlertsPanel alerts={alerts} />
          {alerts.length === 0 && !loading && (
            <div className="bg-white dark:bg-app-card elevation-1 rounded-xl p-6 text-center text-slate-400 dark:text-app-muted text-sm">
              Tudo em ordem! Não há alertas pendentes.
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
