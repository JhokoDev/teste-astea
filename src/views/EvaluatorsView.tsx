import React, { useState, useEffect } from 'react';
import { UserSearch, ShieldCheck, ShieldAlert, EyeOff, Eye, UserPlus, CheckCircle2, AlertCircle, Loader2, Star, MessageSquare, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { supabase } from '../supabase';
import { evaluationsService, projectsService, fairsService } from '../services/supabaseService';
import { Project, Evaluation, UserRole, User, EvaluationCriteria } from '../types';
import { toast } from 'sonner';

interface EvaluatorsViewProps {
  profile?: User | null;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  manager: 'Gerenciador de Feira',
  advisor: 'Orientador',
  evaluator: 'Avaliador',
  student: 'Aluno'
};

export function EvaluatorsView({ profile }: EvaluatorsViewProps) {
  const userRole = profile?.role || 'student';
  const [isBlindMode, setIsBlindMode] = useState(true);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [evaluators, setEvaluators] = useState<any[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [realCriteria, setRealCriteria] = useState<EvaluationCriteria[]>([]);
  const [evaluatorStats, setEvaluatorStats] = useState({ completed: 0, total: 0 });
  const [pendingEvaluators, setPendingEvaluators] = useState(0);

  // Evaluation Form State
  const [evaluationData, setEvaluationData] = useState<Partial<Evaluation>>({
    scores: {},
    feedback: '',
    is_conflict_declared: false
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (userRole === 'admin') {
          // Admins see everyone
          const { data: users, error } = await supabase.from('users').select('*').order('displayName');
          if (error) throw error;
          setAllUsers(users || []);
        } else if (userRole === 'manager' && profile?.institutionId) {
          // Managers strictly see users from their own institution
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*')
            .eq('institutionId', profile.institutionId)
            .order('displayName');
          
          if (usersError) throw usersError;
          setAllUsers(users || []);
        }

        // Fetch evaluators for the summary/list (filtered by institution for managers)
        let evalsQuery = supabase.from('users').select('*').eq('role', 'evaluator');
        if (userRole === 'manager' && profile?.institutionId) {
          evalsQuery = evalsQuery.eq('institutionId', profile.institutionId);
        }
        const { data: evals, error: evalsError } = await evalsQuery;
        if (evalsError) throw evalsError;
        setEvaluators(evals || []);

        // Fetch projects assigned to the current evaluator
        if (profile?.uid) {
          // Get fairs where user is approved evaluator
          const { data: apps } = await supabase
            .from('evaluator_applications')
            .select('fairId')
            .eq('userId', profile.uid)
            .eq('status', 'aprovado');
          
          const approvedFairIds = apps?.map(a => a.fairId) || [];
          
          if (approvedFairIds.length > 0) {
            const { data: projs } = await supabase
              .from('projects')
              .select('*')
              .in('fairId', approvedFairIds)
              .neq('creatorId', profile.uid); // Don't evaluate own projects
            
            setAssignedProjects(projs || []);

            // Get completed evaluations to calculate progress
            const { data: evals } = await supabase
              .from('evaluations')
              .select('projectId')
              .eq('evaluatorId', profile.uid)
              .eq('status', 'finalizado');
            
            setEvaluatorStats({
              completed: evals?.length || 0,
              total: projs?.length || 0
            });
          }

          // Fetch pending applications for the summary
          let pendingQuery = supabase.from('evaluator_applications').select('id', { count: 'exact' }).eq('status', 'pendente');
          if (userRole === 'manager' && profile?.institutionId) {
            pendingQuery = pendingQuery.eq('institutionId', profile.institutionId);
          }
          const { count: pendingCount } = await pendingQuery;
          setPendingEvaluators(pendingCount || 0);
        }
      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast.error('Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Real-time subscription for users
    const subscription = supabase
      .channel('users_management')
      .on('postgres_changes' as any, { event: '*', table: 'users' }, () => {
        fetchData(); // Re-fetch with filters
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userRole, profile?.uid, profile?.institutionId]);

  useEffect(() => {
    const fetchCriteria = async () => {
      if (selectedProject) {
        const criteria = await fairsService.getEvaluationCriteria(selectedProject.fairId);
        setRealCriteria(criteria);
        
        // Reset scores with new criteria
        const initialScores: Record<string, number> = {};
        criteria.forEach(c => {
          initialScores[c.name] = 0;
        });
        setEvaluationData(prev => ({ ...prev, scores: initialScores }));
      }
    };
    fetchCriteria();
  }, [selectedProject]);

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('uid', userId);
      
      if (error) throw error;
      toast.success(`Usuário atualizado para ${ROLE_LABELS[newRole]}`);
    } catch (error: any) {
      toast.error('Erro ao atualizar cargo.');
    }
  };

  const handleSubmitEvaluation = async () => {
    if (!selectedProject) return;
    
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const mockUserStr = localStorage.getItem('dev_user');
      const mockUser = mockUserStr ? JSON.parse(mockUserStr) : null;
      const userId = user?.id || mockUser?.id;

      await evaluationsService.submitEvaluation({
        ...evaluationData,
        projectId: selectedProject.id,
        evaluatorId: userId
      } as any);
      
      toast.success('Avaliação submetida com sucesso!');
      setSelectedProject(null);
      setEvaluationData({ scores: {}, feedback: '', is_conflict_declared: false });
    } catch (error) {
      toast.error('Erro ao submeter avaliação.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = allUsers.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedProject) {
    // ... (keep existing evaluation form logic)
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6 lg:space-y-8">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedProject(null)} className="text-slate-400 dark:text-app-muted hover:text-primary transition-colors">
            <ShieldAlert className="w-6 h-6 rotate-180" />
          </button>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-app-fg">Avaliar: {selectedProject.title}</h2>
        </div>

        <div className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-6 lg:p-8 space-y-8">
          {/* Conflict Declaration (RF09) */}
          <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-sm font-bold text-amber-900 dark:text-amber-400">Declaração de Conflito (RF09)</p>
                <p className="text-xs text-amber-700 dark:text-amber-500">Você possui algum vínculo com este projeto ou seus autores?</p>
              </div>
            </div>
            <button 
              onClick={() => setEvaluationData({...evaluationData, is_conflict_declared: !evaluationData.is_conflict_declared})}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                evaluationData.is_conflict_declared 
                  ? "bg-amber-600 text-white" 
                  : "bg-white dark:bg-app-surface text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30"
              )}
            >
              {evaluationData.is_conflict_declared ? 'Conflito Declarado' : 'Declarar Conflito'}
            </button>
          </div>

          {!evaluationData.is_conflict_declared && (
            <>
              {/* Criteria (RF04, RF08) */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  Critérios de Avaliação (RF04)
                </h3>
                <div className="grid gap-6">
                  {realCriteria.length > 0 ? realCriteria.map(criterion => (
                    <div key={criterion.id} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <label className="text-sm font-bold text-slate-700 dark:text-app-fg">{criterion.name}</label>
                          {criterion.description && <p className="text-xs text-slate-400 dark:text-app-muted">{criterion.description}</p>}
                        </div>
                        <span className="text-sm font-bold text-primary">{evaluationData.scores?.[criterion.name] || 0}/{criterion.max_score}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max={criterion.max_score} 
                        step={criterion.scale_type === 'numeric' ? "0.5" : "1"}
                        value={evaluationData.scores?.[criterion.name] || 0}
                        onChange={e => setEvaluationData({
                          ...evaluationData, 
                          scores: { ...evaluationData.scores, [criterion.name]: parseFloat(e.target.value) }
                        })}
                        className="w-full h-2 bg-slate-100 dark:bg-app-surface rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  )) : (
                    ['Inovação', 'Metodologia', 'Apresentação', 'Viabilidade'].map(criterion => (
                      <div key={criterion} className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-bold text-slate-700 dark:text-app-fg">{criterion}</label>
                          <span className="text-sm font-bold text-primary">{evaluationData.scores?.[criterion] || 0}/10</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="10" 
                          step="0.5"
                          value={evaluationData.scores?.[criterion] || 0}
                          onChange={e => setEvaluationData({
                            ...evaluationData, 
                            scores: { ...evaluationData.scores, [criterion]: parseFloat(e.target.value) }
                          })}
                          className="w-full h-2 bg-slate-100 dark:bg-app-surface rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Feedback (RF12) */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 dark:text-app-fg">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Feedback Construtivo (RF12)
                </h3>
                <textarea 
                  value={evaluationData.feedback}
                  onChange={e => setEvaluationData({...evaluationData, feedback: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-app-surface border-none rounded-xl p-4 outline-none focus:ring-2 focus:ring-primary/20 h-32 dark:text-app-fg" 
                  placeholder="Escreva sugestões e observações para os autores..." 
                />
              </div>
            </>
          )}

          <div className="pt-6 flex justify-end gap-4">
            <button 
              onClick={() => setSelectedProject(null)}
              className="px-6 py-2 rounded-xl border border-slate-200 dark:border-app-border text-slate-600 dark:text-app-muted font-bold text-sm hover:bg-slate-50 dark:hover:bg-app-surface"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSubmitEvaluation}
              disabled={loading}
              className="px-6 py-2 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 shadow-md flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Finalizar Avaliação
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Management View for Managers/Admins
  if (userRole === 'admin' || userRole === 'manager') {
    return (
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-background-light dark:bg-app-bg min-h-full transition-colors duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-app-fg">Gestão de Usuários e Avaliadores</h2>
            <p className="text-xs lg:text-sm text-slate-500 dark:text-app-muted">Promova usuários a avaliadores ou gerencie permissões.</p>
          </div>
          <button className="w-full sm:w-auto px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 shadow-md flex items-center justify-center gap-2 transition-all active:scale-95">
            <UserPlus className="w-4 h-4" />
            Convidar Avaliador
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-4 flex items-center gap-3">
              <UserSearch className="w-5 h-5 text-slate-400 dark:text-app-muted" />
              <input 
                type="text" 
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm dark:text-app-fg"
              />
            </div>

            <div className="bg-white dark:bg-app-card elevation-1 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-app-surface border-b border-slate-100 dark:border-app-border">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Usuário</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Cargo Atual</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-app-muted uppercase text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-app-border">
                    {filteredUsers.map(user => (
                      <tr key={user.uid} className="hover:bg-slate-50/50 dark:hover:bg-primary/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                              {user.displayName?.charAt(0) || user.email?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-app-fg">{user.displayName}</p>
                              <p className="text-xs text-slate-500 dark:text-app-muted">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                            user.role === 'admin' && "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
                            user.role === 'manager' && "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
                            user.role === 'evaluator' && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
                            user.role === 'advisor' && "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
                            user.role === 'student' && "bg-slate-100 dark:bg-app-surface text-slate-700 dark:text-app-muted"
                          )}>
                            {ROLE_LABELS[user.role as UserRole] || user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {user.role !== 'evaluator' ? (
                              <button 
                                onClick={() => handleUpdateRole(user.uid, 'evaluator')}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                title="Promover a Avaliador"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleUpdateRole(user.uid, 'student')}
                                className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                title="Rebaixar a Aluno"
                              >
                                <ShieldAlert className="w-4 h-4" />
                              </button>
                            )}
                            <button className="p-2 text-slate-400 dark:text-app-muted hover:bg-slate-100 dark:hover:bg-app-surface rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2 dark:text-app-fg">
                <Shield className="w-5 h-5 text-primary" />
                Resumo da Banca
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-app-surface rounded-xl">
                  <span className="text-sm text-slate-600 dark:text-app-muted">Total de Avaliadores</span>
                  <span className="text-lg font-bold text-primary">{evaluators.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-app-surface rounded-xl">
                  <span className="text-sm text-slate-600 dark:text-app-muted">Aguardando Convite</span>
                  <span className="text-lg font-bold text-amber-600">{pendingEvaluators}</span>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="w-5 h-5" />
                <h4 className="font-bold text-sm">Dica de Gestão</h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-app-muted leading-relaxed">
                Você pode promover qualquer usuário cadastrado para o cargo de avaliador clicando no ícone de escudo verde.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default View for Evaluators
  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-background-light dark:bg-app-bg min-h-full transition-colors duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-app-fg">Minhas Avaliações</h2>
          <p className="text-xs lg:text-sm text-slate-500 dark:text-app-muted">Projetos atribuídos para sua análise.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setIsBlindMode(!isBlindMode)}
            className={cn(
              "px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all",
              isBlindMode 
                ? "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30" 
                : "bg-slate-100 dark:bg-app-surface text-slate-600 dark:text-app-muted border border-slate-200 dark:border-app-border"
            )}
          >
            {isBlindMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="whitespace-nowrap">Avaliação Cega: {isBlindMode ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-4">
          {assignedProjects.map(project => (
            <div key={project.id} className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-app-fg">{project.title}</h3>
                <p className="text-xs text-slate-400 dark:text-app-muted uppercase font-bold">{project.category}</p>
              </div>
              <button 
                onClick={() => setSelectedProject(project)}
                className="w-full sm:w-auto px-6 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 shadow-sm transition-all active:scale-95"
              >
                Avaliar Agora
              </button>
            </div>
          ))}
          {assignedProjects.length === 0 && (
            <div className="py-20 text-center text-slate-400 dark:text-app-muted border-2 border-dashed border-slate-100 dark:border-app-border rounded-2xl">
              Nenhum projeto atribuído no momento.
            </div>
          )}
        </div>

        <div className="space-y-4 lg:space-y-6">
          <div className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-4 lg:p-6 space-y-4">
            <h3 className="text-lg font-bold dark:text-app-fg">Resumo do Progresso</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="dark:text-app-muted">Concluído</span>
                  <span className="text-primary">{evaluatorStats.completed}/{evaluatorStats.total}</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-app-surface rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500" 
                    style={{ width: `${evaluatorStats.total > 0 ? (evaluatorStats.completed / evaluatorStats.total) * 100 : 0}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl p-4 lg:p-6 space-y-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-5 h-5" />
              <h4 className="font-bold text-sm">Integridade (RF09)</h4>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-500 leading-relaxed">
              Lembre-se de declarar conflitos de interesse antes de iniciar qualquer avaliação.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
