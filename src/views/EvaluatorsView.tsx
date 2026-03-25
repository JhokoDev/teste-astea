import React, { useState, useEffect } from 'react';
import { UserSearch, ShieldCheck, ShieldAlert, EyeOff, Eye, UserPlus, CheckCircle2, AlertCircle, Loader2, Star, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { supabase } from '../supabase';
import { evaluationsService, projectsService } from '../services/supabaseService';
import { Project, Evaluation } from '../types';
import { toast } from 'sonner';

export function EvaluatorsView() {
  const [isBlindMode, setIsBlindMode] = useState(true);
  const [evaluators, setEvaluators] = useState<any[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Evaluation Form State
  const [evaluationData, setEvaluationData] = useState<Partial<Evaluation>>({
    scores: {},
    feedback: '',
    is_conflict_declared: false
  });

  useEffect(() => {
    // Initial fetch for evaluators
    supabase.from('users').select('*').eq('role', 'evaluator').then(({ data, error }) => {
      if (error) console.error('Supabase Error:', error);
      if (data) setEvaluators(data);
      setLoading(false);
    });

    // Fetch projects assigned to the current evaluator (mocked for now)
    projectsService.subscribeToProjects((data) => {
      setAssignedProjects(data.slice(0, 3)); // Mocking assignments
    });

    // Real-time subscription for evaluators
    const subscription = supabase
      .channel('evaluators_changes')
      .on('postgres_changes' as any, { event: '*', table: 'users', filter: "role=eq.evaluator" }, async () => {
        const { data, error } = await supabase.from('users').select('*').eq('role', 'evaluator');
        if (error) console.error('Supabase Error:', error);
        if (data) setEvaluators(data);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

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

  if (selectedProject) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6 lg:space-y-8">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedProject(null)} className="text-slate-400 hover:text-primary transition-colors">
            <ShieldAlert className="w-6 h-6 rotate-180" />
          </button>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Avaliar: {selectedProject.title}</h2>
        </div>

        <div className="bg-white elevation-1 rounded-2xl p-6 lg:p-8 space-y-8">
          {/* Conflict Declaration (RF09) */}
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-bold text-amber-900">Declaração de Conflito (RF09)</p>
                <p className="text-xs text-amber-700">Você possui algum vínculo com este projeto ou seus autores?</p>
              </div>
            </div>
            <button 
              onClick={() => setEvaluationData({...evaluationData, is_conflict_declared: !evaluationData.is_conflict_declared})}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                evaluationData.is_conflict_declared ? "bg-amber-600 text-white" : "bg-white text-amber-600 border border-amber-200"
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
                  {['Inovação', 'Metodologia', 'Apresentação', 'Viabilidade'].map(criterion => (
                    <div key={criterion} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-slate-700">{criterion}</label>
                        <span className="text-sm font-bold text-primary">{(evaluationData.scores as any)[criterion] || 0}/10</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="10" 
                        step="0.5"
                        value={(evaluationData.scores as any)[criterion] || 0}
                        onChange={e => setEvaluationData({
                          ...evaluationData, 
                          scores: { ...evaluationData.scores, [criterion]: parseFloat(e.target.value) }
                        })}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback (RF12) */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Feedback Construtivo (RF12)
                </h3>
                <textarea 
                  value={evaluationData.feedback}
                  onChange={e => setEvaluationData({...evaluationData, feedback: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-xl p-4 outline-none focus:ring-2 focus:ring-primary/20 h-32" 
                  placeholder="Escreva sugestões e observações para os autores..." 
                />
              </div>
            </>
          )}

          <div className="pt-6 flex justify-end gap-4">
            <button 
              onClick={() => setSelectedProject(null)}
              className="px-6 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50"
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

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Minhas Avaliações</h2>
          <p className="text-xs lg:text-sm text-slate-500">Projetos atribuídos para sua análise.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setIsBlindMode(!isBlindMode)}
            className={cn(
              "px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all",
              isBlindMode ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-slate-100 text-slate-600 border border-slate-200"
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
            <div key={project.id} className="bg-white elevation-1 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-bold text-slate-900">{project.title}</h3>
                <p className="text-xs text-slate-400 uppercase font-bold">{project.category}</p>
              </div>
              <button 
                onClick={() => setSelectedProject(project)}
                className="w-full sm:w-auto px-6 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 shadow-sm"
              >
                Avaliar Agora
              </button>
            </div>
          ))}
          {assignedProjects.length === 0 && (
            <div className="py-20 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
              Nenhum projeto atribuído no momento.
            </div>
          )}
        </div>

        <div className="space-y-4 lg:space-y-6">
          <div className="bg-white elevation-1 rounded-2xl p-4 lg:p-6 space-y-4">
            <h3 className="text-lg font-bold">Resumo do Progresso</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Concluído</span>
                  <span className="text-primary">0/3</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '0%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 lg:p-6 space-y-3">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="w-5 h-5" />
              <h4 className="font-bold text-sm">Integridade (RF09)</h4>
            </div>
            <p className="text-xs text-amber-600 leading-relaxed">
              Lembre-se de declarar conflitos de interesse antes de iniciar qualquer avaliação.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
