import React, { useState, useEffect } from 'react';
import { KPICard } from '../components/KPICard';
import { StageFunnel } from '../components/StageFunnel';
import { FairTimeline } from '../components/FairTimeline';
import { EvaluationRadarChart } from '../components/EvaluationRadarChart';
import { ProjectTable } from '../components/ProjectTable';
import { ProjectKanban } from '../components/ProjectKanban';
import { EvaluationHeatmap } from '../components/EvaluationHeatmap';
import { GeographicDistribution } from '../components/GeographicDistribution';
import { AlertsPanel } from '../components/AlertsPanel';
import { DashboardSkeleton } from '../components/Skeleton';
import { motion } from 'motion/react';
import { Loader2, LayoutGrid, List } from 'lucide-react';
import { cn } from '../lib/utils';
import { projectsService, fairsService, usersService, evaluationsService } from '../services/supabaseService';
import { supabase } from '../supabase';
import { Project, Fair, KPI, Stage, Alert, UserRole, User } from '../types';

interface DashboardViewProps {
  userRole?: UserRole;
  userId?: string;
  profile?: User | null;
}

export function DashboardView({ userRole = 'student', userId, profile }: DashboardViewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [fairs, setFairs] = useState<Fair[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [evaluatorStats, setEvaluatorStats] = useState({ completed: 0, drafts: 0, avgScore: '0.0' });

  useEffect(() => {
    const fetchInitialData = async () => {
      let initialProjects: Project[] = [];
      
      // Fetch projects user created or is a member of
      const { data: ownProjects } = await supabase.from('projects').select('*');
      if (ownProjects) {
        initialProjects = ownProjects;
      }

      // If advisor, fetch projects they advise
      if (userRole === 'advisor' && userId) {
        const { data: advisedProjects } = await projectsService.getAdvisorProjects(userId);
        if (advisedProjects) {
          // Merge and remove duplicates
          const existingIds = new Set(initialProjects.map(p => p.id));
          advisedProjects.forEach(p => {
            if (!existingIds.has(p.id)) {
              initialProjects.push(p);
            }
          });
        }
      }
      
      setProjects(initialProjects);
      setLoading(false);
    };

    fetchInitialData();

    const unsubProjects = projectsService.subscribeToProjects((event) => {
      if (event.type === 'INITIAL') return;

      if (event.type === 'INSERT') {
        const p = event.newItem;
        const isVisible = userRole !== 'student' || 
                          p.creatorid === userId || 
                          p.members.some(m => m.email === userId);
        if (isVisible) {
          setProjects(prev => [...prev, p]);
        }
      } else if (event.type === 'UPDATE') {
        const p = event.newItem;
        const isVisible = userRole !== 'student' || 
                          p.creatorid === userId || 
                          p.members.some(m => m.email === userId);
        if (isVisible) {
          setProjects(prev => prev.map(item => item.id === p.id ? p : item));
        } else {
          setProjects(prev => prev.filter(item => item.id !== p.id));
        }
      } else if (event.type === 'DELETE') {
        setProjects(prev => prev.filter(p => p.id !== event.oldItem.id));
      }
    });
    
    const unsubFairs = fairsService.subscribeToFairs((event) => {
      const filterFair = (f: Fair) => {
        if (userRole === 'manager') {
          return f.organizerid === userId || f.institutionid === profile?.institutionid;
        } else if (userRole === 'admin') {
          return true;
        } else {
          return f.status === 'publicado';
        }
      };

      if (event.type === 'INITIAL') {
        setFairs(event.data.filter(filterFair));
      } else if (event.type === 'INSERT') {
        if (filterFair(event.newItem)) {
          setFairs(prev => [...prev, event.newItem]);
        }
      } else if (event.type === 'UPDATE') {
        if (filterFair(event.newItem)) {
          setFairs(prev => {
            const exists = prev.some(f => f.id === event.newItem.id);
            if (exists) {
              return prev.map(f => f.id === event.newItem.id ? event.newItem : f);
            } else {
              return [...prev, event.newItem];
            }
          });
        } else {
          setFairs(prev => prev.filter(f => f.id !== event.newItem.id));
        }
      } else if (event.type === 'DELETE') {
        setFairs(prev => prev.filter(f => f.id !== event.oldItem.id));
      }
    });

    const unsubUsers = usersService.subscribeToUsers(async (event) => {
      if (event.type === 'INITIAL') {
        setUsers(event.data);
      } else if (event.type === 'INSERT') {
        setUsers(prev => [...prev, event.newItem]);
      } else if (event.type === 'UPDATE') {
        setUsers(prev => prev.map(u => u.uid === event.newItem.uid ? event.newItem : u));
      } else if (event.type === 'DELETE') {
        setUsers(prev => prev.filter(u => u.uid !== event.oldItem.uid));
      }

      if (userRole === 'evaluator' && userId) {
        const { data: stats } = await evaluationsService.getEvaluatorStats(userId);
        if (stats) {
          setEvaluatorStats(stats);
        }
      }
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
        { label: 'Projetos Avaliados', value: evaluatorStats.completed.toString(), icon: 'FileText' },
        { label: 'Avaliações Pendentes', value: evaluatorStats.drafts.toString(), icon: 'Clock', status: 'Atenção' },
        { label: 'Taxa de Conclusão', value: (evaluatorStats.completed + evaluatorStats.drafts) > 0 ? `${Math.round((evaluatorStats.completed / (evaluatorStats.completed + evaluatorStats.drafts)) * 100)}%` : '100%', icon: 'CheckCircle', status: 'Normal' },
        { label: 'Média de Notas', value: evaluatorStats.avgScore, icon: 'Star' }
      ];
    }

    // Student / Advisor
    const nextDeadline = fairs
      .filter(f => f.status === 'publicado' && f.dates.registration_end)
      .map(f => new Date(f.dates.registration_end!))
      .filter(d => d > new Date())
      .sort((a, b) => a.getTime() - b.getTime())[0];

    return [
      { label: 'Meus Projetos', value: filteredProjects.length.toString(), icon: 'FileText' },
      { label: 'Projetos Aprovados', value: filteredProjects.filter(p => p.status === 'aprovado').length.toString(), icon: 'CheckCircle', status: 'Normal' },
      { label: 'Em Avaliação', value: filteredProjects.filter(p => p.status === 'em_avaliacao').length.toString(), icon: 'Clock' },
      { label: 'Próximo Prazo', value: nextDeadline ? nextDeadline.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '--/--', icon: 'Calendar', status: 'Atenção' }
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
        { id: 1, label: 'Pendentes', count: evaluatorStats.drafts.toString(), status: 'active' },
        { id: 2, label: 'Concluídos', count: evaluatorStats.completed.toString(), status: 'completed' }
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
      if (evaluatorStats.drafts > 0) {
        alerts.push({ id: 'e1', title: 'Avaliações Pendentes', description: `Você possui ${evaluatorStats.drafts} avaliações em rascunho que precisam ser finalizadas.`, type: 'warning' });
      }
    } else {
      const rejectedProjects = filteredProjects.filter(p => p.status === 'rejeitado');
      if (rejectedProjects.length > 0) {
        alerts.push({ id: 's1', title: 'Projeto Rejeitado', description: 'Um de seus projetos foi rejeitado. Verifique o feedback para ajustes.', type: 'error' });
      }
      
      const openFairs = fairs.filter(f => {
        if (f.status !== 'publicado' || !f.dates.registration_start || !f.dates.registration_end) return false;
        const now = new Date();
        return now >= new Date(f.dates.registration_start) && now <= new Date(f.dates.registration_end);
      });

      if (openFairs.length > 0) {
        alerts.push({ id: 's2', title: 'Submissão Aberta', description: `${openFairs[0].name} está aceitando submissões.`, type: 'info' });
      }
    }

    return alerts;
  };

  const filteredProjects = projects.filter(p => {
    if (userRole === 'admin') return true;
    if (userRole === 'manager') {
      const managerFairIds = fairs.map(f => f.id);
      return managerFairIds.includes(p.fairid);
    }
    if (userRole === 'student' || userRole === 'advisor') {
      // For advisors, we've already merged their advised projects into the state
      // So we can just return true for all projects in the state
      // But for students, we still filter to be safe
      if (userRole === 'advisor') return true;
      return p.creatorid === userId || p.members.some(m => m.email === userId);
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

  const mockPhases = [
    { id: '1', label: 'Inscrições', startDate: '2026-03-01', endDate: '2026-03-20', status: 'past' as const },
    { id: '2', label: 'Avaliação', startDate: '2026-03-21', endDate: '2026-04-10', status: 'current' as const },
    { id: '3', label: 'Resultados', startDate: '2026-04-11', endDate: '2026-04-15', status: 'future' as const },
    { id: '4', label: 'Premiação', startDate: '2026-04-16', endDate: '2026-04-20', status: 'future' as const }
  ];

  const mockRadarData = [
    { subject: 'Inovação', A: 8.5, fullMark: 10 },
    { subject: 'Metodologia', A: 7.0, fullMark: 10 },
    { subject: 'Apresentação', A: 9.0, fullMark: 10 },
    { subject: 'Viabilidade', A: 6.5, fullMark: 10 },
    { subject: 'Impacto', A: 8.0, fullMark: 10 }
  ];

  const mockHeatmapData = [
    { category: 'Ciências Exatas', count: 45, intensity: 0.9 },
    { category: 'Ciências Humanas', count: 12, intensity: 0.3 },
    { category: 'Tecnologia', count: 38, intensity: 0.75 },
    { category: 'Meio Ambiente', count: 22, intensity: 0.5 },
    { category: 'Saúde', count: 15, intensity: 0.4 },
    { category: 'Educação', count: 8, intensity: 0.15 },
    { category: 'Artes', count: 5, intensity: 0.1 },
    { category: 'Engenharia', count: 31, intensity: 0.65 }
  ];

  const mockGeoData = [
    { region: 'São Paulo', count: 124, percentage: 42 },
    { region: 'Minas Gerais', count: 58, percentage: 20 },
    { region: 'Rio de Janeiro', count: 45, percentage: 15 },
    { region: 'Paraná', count: 32, percentage: 11 },
    { region: 'Outros', count: 35, percentage: 12 }
  ];

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

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-background-light dark:bg-app-bg transition-colors duration-300">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-app-fg">{getWelcomeMessage()}</h2>
        <p className="text-slate-500 dark:text-app-muted text-sm">Acompanhe o progresso e as métricas em tempo real.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <FairTimeline phases={mockPhases} />
      </motion.div>

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
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-app-fg uppercase tracking-wider">
                {viewMode === 'table' ? 'Tabela de Projetos' : 'Fluxo de Projetos (Kanban)'}
              </h3>
              {(userRole === 'admin' || userRole === 'manager') && (
                <div className="flex items-center bg-slate-100 dark:bg-app-surface p-1 rounded-lg">
                  <button 
                    onClick={() => setViewMode('table')}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      viewMode === 'table' ? "bg-white dark:bg-app-card shadow-sm text-primary" : "text-slate-400 dark:text-app-muted hover:text-slate-600"
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setViewMode('kanban')}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      viewMode === 'kanban' ? "bg-white dark:bg-app-card shadow-sm text-primary" : "text-slate-400 dark:text-app-muted hover:text-slate-600"
                    )}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {viewMode === 'table' ? (
              <ProjectTable projects={filteredProjects} />
            ) : (
              <ProjectKanban projects={filteredProjects} />
            )}

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
          className="lg:col-span-3 space-y-6"
        >
          {userRole === 'evaluator' && (
            <EvaluationRadarChart data={mockRadarData} title="Meu Perfil de Avaliação" />
          )}
          {userRole === 'admin' && (
            <>
              <EvaluationHeatmap data={mockHeatmapData} />
              <GeographicDistribution data={mockGeoData} />
            </>
          )}
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
