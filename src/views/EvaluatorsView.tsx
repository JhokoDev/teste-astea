import React, { useState, useEffect } from 'react';
import { 
  UserSearch, 
  ShieldCheck, 
  ShieldAlert, 
  EyeOff, 
  Eye, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Star, 
  MessageSquare, 
  Trash2, 
  Shield, 
  User as UserIcon,
  Maximize2
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { EvaluatorSkeleton } from '../components/Skeleton';
import { supabase } from '../supabase';
import { usersService, evaluationsService, projectsService, fairsService } from '../services/supabaseService';
import { Project, Evaluation, UserRole, User, EvaluationCriteria } from '../types';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

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
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [evaluators, setEvaluators] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
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
    criterion_feedback: {},
    feedback: '',
    is_conflict_declared: false
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (userRole === 'admin') {
          const { data: users, error } = await usersService.getUsers({});
          if (error) throw error;
          setAllUsers(users || []);
        } else if (userRole === 'manager' && profile?.institution_id) {
          const { data: users, error } = await usersService.getUsers({ institution_id: profile.institution_id });
          if (error) throw error;
          setAllUsers(users || []);
        }

        // Fetch evaluators
        const { data: evals, error: evalsError } = await usersService.getUsers({ 
          role: 'evaluator',
          ...(userRole === 'manager' ? { institution_id: profile?.institution_id } : {})
        });
        if (evalsError) throw evalsError;
        setEvaluators(evals || []);

        // Fetch projects assigned to the current evaluator
        if (profile?.uid) {
          const { data: projs, error: projsError } = await evaluationsService.getAssignedProjects(profile.uid);
          if (projsError) throw projsError;
          setAssignedProjects(projs || []);

          const { data: stats, error: statsError } = await evaluationsService.getEvaluatorStats(profile.uid);
          if (statsError) throw statsError;
          if (stats) {
            setEvaluatorStats({
              completed: stats.completed,
              total: projs?.length || 0
            });
          }

          // Fetch pending applications
          const { data: pending, error: pendingError } = await evaluationsService.getEvaluatorApplications({
            status: 'pendente',
            ...(userRole === 'manager' ? { institution_id: profile?.institution_id } : {})
          });
          if (pendingError) throw pendingError;
          setApplications(pending || []);
          setPendingEvaluators(pending?.length || 0);
        }
      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast.error(`Erro ao carregar dados: ${error.message || 'Erro desconhecido'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Real-time subscription for users
    const unsubscribe = usersService.subscribeToUsers((event) => {
      if (event.type === 'INITIAL') {
        // We handle initial fetch in fetchData for more complex filtering
        return;
      }
      
      const filterUser = (u: any) => {
        if (userRole === 'admin') return true;
        if (userRole === 'manager') return u.institution_id === profile?.institution_id;
        return false;
      };

      if (event.type === 'INSERT') {
        if (filterUser(event.newItem)) {
          setAllUsers(prev => [...prev, event.newItem]);
          if (event.newItem.role === 'evaluator') {
            setEvaluators(prev => [...prev, event.newItem]);
          }
        }
      } else if (event.type === 'UPDATE') {
        if (filterUser(event.newItem)) {
          setAllUsers(prev => prev.map(u => u.uid === event.newItem.uid ? event.newItem : u));
          
          // Update evaluators list
          if (event.newItem.role === 'evaluator') {
            setEvaluators(prev => {
              const exists = prev.some(u => u.uid === event.newItem.uid);
              if (exists) return prev.map(u => u.uid === event.newItem.uid ? event.newItem : u);
              return [...prev, event.newItem];
            });
          } else {
            setEvaluators(prev => prev.filter(u => u.uid !== event.newItem.uid));
          }
        } else {
          setAllUsers(prev => prev.filter(u => u.uid !== event.newItem.uid));
          setEvaluators(prev => prev.filter(u => u.uid !== event.newItem.uid));
        }
      } else if (event.type === 'DELETE') {
        setAllUsers(prev => prev.filter(u => u.uid !== event.oldItem.uid));
        setEvaluators(prev => prev.filter(u => u.uid !== event.oldItem.uid));
      }
    });

    return () => unsubscribe();
  }, [userRole, profile?.uid, profile?.institution_id]);

  useEffect(() => {
    const fetchCriteria = async () => {
      if (selectedProject) {
        const { data: criteria, error } = await fairsService.getEvaluationCriteria(selectedProject.fair_id);
        if (error) {
          toast.error('Erro ao carregar critérios.');
          return;
        }
        setRealCriteria(criteria || []);
        
        // Reset scores with new criteria
        const initialScores: Record<string, number> = {};
        const initialFeedback: Record<string, string> = {};
        if (criteria) {
          criteria.forEach(c => {
            initialScores[c.name] = 0;
            initialFeedback[c.name] = '';
          });
        }
        setEvaluationData(prev => ({ ...prev, scores: initialScores, criterion_feedback: initialFeedback }));
      }
    };
    fetchCriteria();
  }, [selectedProject]);

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await usersService.updateUserRole(userId, newRole);
      if (error) throw error;
      toast.success(`Usuário atualizado para ${ROLE_LABELS[newRole]}`);
    } catch (error: any) {
      toast.error('Erro ao atualizar cargo: ' + error.message);
    }
  };

  const handleUpdateApplicationStatus = async (applicationId: string, status: 'aprovado' | 'rejeitado') => {
    try {
      setLoading(true);
      const { error } = await evaluationsService.updateEvaluatorApplicationStatus(applicationId, status);
      if (error) throw error;
      
      toast.success(status === 'aprovado' ? 'Candidatura aprovada!' : 'Candidatura rejeitada.');
      
      // Refresh applications and evaluators
      const { data: pending } = await evaluationsService.getEvaluatorApplications({
        status: 'pendente',
        ...(userRole === 'manager' ? { institution_id: profile?.institution_id } : {})
      });
      setApplications(pending || []);
      setPendingEvaluators(pending?.length || 0);

      const { data: evals } = await usersService.getUsers({ 
        role: 'evaluator',
        ...(userRole === 'manager' ? { institution_id: profile?.institution_id } : {})
      });
      setEvaluators(evals || []);
    } catch (error: any) {
      toast.error('Erro ao processar candidatura: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEvaluation = async () => {
    if (!selectedProject) return;
    
    try {
      setLoading(true);
      const { error } = await evaluationsService.submitEvaluation({
        ...evaluationData,
        project_id: selectedProject.id
      } as any);
      
      if (error) throw error;

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#ec4899']
      });

      toast.success('Avaliação submetida com sucesso!');
      setSelectedProject(null);
      setIsFocusMode(false);
      setEvaluationData({ scores: {}, criterion_feedback: {}, feedback: '', is_conflict_declared: false });
    } catch (error: any) {
      toast.error('Erro ao submeter avaliação: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = allUsers.filter(u => 
    u.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <EvaluatorSkeleton />;
  }

  if (selectedProject) {
    return (
      <div className={cn(
        "p-4 lg:p-8 max-w-4xl mx-auto space-y-6 lg:space-y-8 transition-all duration-500",
        isFocusMode && "max-w-5xl"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => {
              setSelectedProject(null);
              setIsFocusMode(false);
            }} className="text-slate-400 dark:text-app-muted hover:text-primary transition-colors">
              <ShieldAlert className="w-6 h-6 rotate-180" />
            </button>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-app-fg">Avaliar Projeto</h2>
          </div>
          <button 
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={cn(
              "px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all",
              isFocusMode 
                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                : "bg-slate-100 dark:bg-app-surface text-slate-600 dark:text-app-muted border border-slate-200 dark:border-app-border"
            )}
          >
            <Maximize2 className="w-4 h-4" />
            {isFocusMode ? 'Sair do Modo Foco' : 'Modo Foco'}
          </button>
        </div>

        <div className={cn(
          "bg-white dark:bg-app-card elevation-1 rounded-2xl p-6 lg:p-8 space-y-8 transition-all duration-500",
          isFocusMode && "shadow-2xl ring-1 ring-primary/10"
        )}>
          {/* Project Details (Blind Review implementation) */}
          <div className="space-y-4 pb-6 border-b border-slate-100 dark:border-app-border">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full">
                    {selectedProject.category}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-app-muted uppercase tracking-wider bg-slate-100 dark:bg-app-surface px-2 py-0.5 rounded-full">
                    {selectedProject.modality}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-app-fg">{selectedProject.title}</h3>
              </div>
            </div>
            
            {selectedProject.abstract && (
              <div className="bg-slate-50 dark:bg-app-surface p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase mb-2">Resumo do Projeto</h4>
                <p className="text-sm text-slate-600 dark:text-app-fg leading-relaxed">{selectedProject.abstract}</p>
              </div>
            )}

            {!isBlindMode && (
              <div className="flex flex-wrap gap-6 pt-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase mb-2">Integrantes</h4>
                  <div className="flex -space-x-2">
                    {selectedProject.members?.map((member, i) => (
                      <div 
                        key={i} 
                        className="w-8 h-8 rounded-full bg-primary/10 border-2 border-white dark:border-app-card flex items-center justify-center text-[10px] font-bold text-primary" 
                        title={`${member.name} (${member.role})`}
                      >
                        {member.name.charAt(0)}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase mb-2">Instituição</h4>
                  <p className="text-sm font-bold text-slate-700 dark:text-app-fg">ID: {selectedProject.institution_id}</p>
                </div>
              </div>
            )}
          </div>

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
              {/* Criteria (RF04, RF08, Rubrics Scoring) */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2 dark:text-app-fg">
                  <Star className="w-5 h-5 text-primary" />
                  Critérios de Avaliação (RF04)
                </h3>
                <div className="grid gap-8">
                  {realCriteria.length > 0 ? realCriteria.map(criterion => (
                    <div key={criterion.id} className="space-y-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-app-surface/30 border border-slate-100 dark:border-app-border">
                      <div className="flex justify-between items-start">
                        <div className="max-w-[70%]">
                          <label className="text-sm font-bold text-slate-700 dark:text-app-fg block mb-1">{criterion.name}</label>
                          {criterion.description && <p className="text-xs text-slate-400 dark:text-app-muted leading-relaxed">{criterion.description}</p>}
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-primary">{evaluationData.scores?.[criterion.name] || 0}</span>
                          <span className="text-xs font-bold text-slate-400 dark:text-app-muted ml-1">/ {criterion.max_score}</span>
                        </div>
                      </div>

                      {criterion.scale_type === 'rubric' && criterion.rubrics ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {Object.entries(criterion.rubrics).sort(([a], [b]) => Number(a) - Number(b)).map(([score, desc]) => (
                            <button
                              key={score}
                              onClick={() => setEvaluationData({
                                ...evaluationData,
                                scores: { ...evaluationData.scores, [criterion.name]: Number(score) }
                              })}
                              className={cn(
                                "p-4 rounded-xl text-left transition-all border group relative",
                                evaluationData.scores?.[criterion.name] === Number(score)
                                  ? "bg-primary/10 border-primary text-primary shadow-sm"
                                  : "bg-white dark:bg-app-surface border-slate-200 dark:border-app-border text-slate-600 dark:text-app-muted hover:border-primary/50"
                              )}
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider">Nível {score}</span>
                                {evaluationData.scores?.[criterion.name] === Number(score) && <CheckCircle2 className="w-4 h-4" />}
                              </div>
                              <p className="text-xs leading-relaxed font-medium">{desc}</p>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
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
                          <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-app-muted uppercase">
                            <span>0</span>
                            <span>{criterion.max_score / 2}</span>
                            <span>{criterion.max_score}</span>
                          </div>
                        </div>
                      )}

                      {/* Per-criterion Feedback (Structured Feedback) */}
                      <div className="pt-2">
                        <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-app-muted">
                          <MessageSquare className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Observação Específica</span>
                        </div>
                        <textarea 
                          value={evaluationData.criterion_feedback?.[criterion.name] || ''}
                          onChange={e => setEvaluationData({
                            ...evaluationData,
                            criterion_feedback: { ...evaluationData.criterion_feedback, [criterion.name]: e.target.value }
                          })}
                          className="w-full bg-white dark:bg-app-surface border border-slate-200 dark:border-app-border rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-primary/20 h-20 dark:text-app-fg resize-none" 
                          placeholder={`O que você achou da ${criterion.name.toLowerCase()}?`}
                        />
                      </div>
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

              {/* General Feedback (RF12) */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 dark:text-app-fg">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Feedback Geral (RF12)
                </h3>
                <textarea 
                  value={evaluationData.feedback}
                  onChange={e => setEvaluationData({...evaluationData, feedback: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-app-surface border border-slate-200 dark:border-app-border rounded-xl p-4 outline-none focus:ring-2 focus:ring-primary/20 h-32 dark:text-app-fg" 
                  placeholder="Escreva sugestões e observações gerais para os autores..." 
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
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-background-light dark:bg-app-bg transition-colors duration-300">
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
          <div className="lg:col-span-2 space-y-6">
            {/* Pending Applications Section */}
            {applications.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-app-fg">Solicitações de Avaliadores</h3>
                  <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {applications.length} Pendentes
                  </span>
                </div>
                <div className="grid gap-4">
                  {applications.map(app => (
                    <motion.div 
                      key={app.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-l-4 border-amber-400"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 font-bold">
                          {app.user?.display_name?.charAt(0) || app.user?.email?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-app-fg">{app.user?.display_name || 'Usuário Desconhecido'}</p>
                          <p className="text-xs text-slate-500 dark:text-app-muted">{app.user?.email}</p>
                          <p className="text-[10px] font-bold text-primary mt-1 uppercase tracking-wider">Feira: {app.fair?.name || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                          onClick={() => handleUpdateApplicationStatus(app.id, 'rejeitado')}
                          className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-app-muted hover:bg-slate-100 dark:hover:bg-app-surface transition-colors"
                        >
                          Rejeitar
                        </button>
                        <button 
                          onClick={() => handleUpdateApplicationStatus(app.id, 'aprovado')}
                          className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm shadow-emerald-200 dark:shadow-none transition-all active:scale-95"
                        >
                          Aprovar
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <UserSearch className="w-5 h-5 text-slate-400 dark:text-app-muted" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-app-fg">Base de Usuários</h3>
              </div>
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
                              {user.display_name?.charAt(0) || user.email?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-app-fg">{user.display_name}</p>
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
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-background-light dark:bg-app-bg transition-colors duration-300">
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
