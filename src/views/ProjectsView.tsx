import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, History, Users, FileText, ExternalLink, ChevronRight, CheckCircle2, Loader2, Plus, Upload, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { projectsService, fairsService } from '../services/supabaseService';
import { Project, Fair, User } from '../types';
import { toast } from 'sonner';

interface ProjectsViewProps {
  profile?: User | null;
}

export function ProjectsView({ profile }: ProjectsViewProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [fairs, setFairs] = useState<Fair[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);

  const userRole = profile?.role || 'student';
  const userId = profile?.uid;

  // Submission Form State
  const [formData, setFormData] = useState<Partial<Project>>({
    title: '',
    abstract: '',
    category: '',
    modality: '',
    fairId: '',
    members: [],
    evidence: {
      files: [],
      links: []
    }
  });

  useEffect(() => {
    const unsubscribeProjects = projectsService.subscribeToProjects((data) => {
      // Filter projects based on role
      if (userRole === 'admin') {
        setProjects(data);
      } else if (userRole === 'manager') {
        // We'll filter this after fairs are loaded or use institutionId
        setProjects(data.filter(p => p.institutionId === profile?.institutionId));
      } else if (userRole === 'student' || userRole === 'advisor') {
        setProjects(data.filter(p => p.creatorId === userId || p.members.some(m => m.email === profile?.email)));
      } else {
        setProjects(data);
      }
      setLoading(false);
    });
    
    const unsubscribeFairs = fairsService.subscribeToFairs((data) => {
      console.log('Fairs received in ProjectsView:', data);
      const now = new Date();
      
      // Filter fairs for the submission form
      let filteredFairs = data;
      if (userRole === 'manager') {
        filteredFairs = data.filter(f => f.organizerId === userId || f.organizerId === null);
      } else if (userRole === 'student' || userRole === 'advisor') {
        // Students can only see published fairs in registration period
        filteredFairs = data.filter(f => f.status === 'publicado');
      }

      const activeFairs = filteredFairs.filter(f => {
        // Only show published fairs for submission
        const isStatusOk = f.status === 'publicado';
        
        // If dates are not set, we show it if status is ok
        if (!f.dates?.registration_start || !f.dates?.registration_end) return isStatusOk;
        
        const start = new Date(f.dates.registration_start);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(f.dates.registration_end);
        end.setHours(23, 59, 59, 999);
        
        const inRegistrationPeriod = now >= start && now <= end;
        
        return isStatusOk && inRegistrationPeriod;
      });
      
      setFairs(activeFairs);
    });

    return () => {
      unsubscribeProjects();
      unsubscribeFairs();
    };
  }, [userRole, userId, profile?.email, profile?.institutionId]);

  useEffect(() => {
    if (selectedProject) {
      projectsService.getProjectVersions(selectedProject.id).then(setVersions);
    } else {
      setVersions([]);
    }
  }, [selectedProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fairId || !formData.title || !formData.abstract) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    try {
      setLoading(true);
      await projectsService.submitProject({
        ...formData,
        creatorId: userId,
        institutionId: profile?.institutionId
      } as any);
      toast.success('Projeto submetido com sucesso!');
      setIsSubmitting(false);
      setFormData({
        title: '',
        abstract: '',
        category: '',
        modality: '',
        fairId: '',
        members: [],
        evidence: { files: [], links: [] }
      });
    } catch (error) {
      toast.error('Erro ao submeter projeto.');
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitting) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto bg-background-light dark:bg-app-bg min-h-full transition-colors duration-300">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setIsSubmitting(false)} className="text-slate-400 dark:text-app-muted hover:text-primary transition-colors">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-app-fg">Submeter Novo Projeto (RF05)</h2>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-6 lg:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Selecione a Feira</label>
              <select 
                value={formData.fairId}
                onChange={e => setFormData({...formData, fairId: e.target.value, category: '', modality: ''})}
                className="w-full bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg"
              >
                <option value="" className="dark:bg-app-surface">Escolha uma feira ativa...</option>
                {fairs.map(f => (
                  <option key={f.id} value={f.id} className="dark:bg-app-surface">{f.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Título do Projeto</label>
              <input 
                type="text" 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg" 
                placeholder="Ex: Sistema de Purificação de Água com Grafeno" 
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Resumo (Abstract)</label>
              <textarea 
                value={formData.abstract}
                onChange={e => setFormData({...formData, abstract: e.target.value})}
                className="w-full bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 h-40 dark:text-app-fg" 
                placeholder="Descreva seu projeto detalhadamente..." 
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Categoria</label>
              <select 
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                disabled={!formData.fairId}
                className={cn(
                  "w-full bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg",
                  !formData.fairId && "opacity-50 cursor-not-allowed"
                )}
              >
                <option value="" className="dark:bg-app-surface">{formData.fairId ? 'Selecione uma categoria...' : 'Selecione uma feira primeiro'}</option>
                {formData.fairId && fairs.find(f => f.id === formData.fairId)?.structure?.categories.map(cat => (
                  <option key={cat} value={cat} className="dark:bg-app-surface">{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Modalidade</label>
              <select 
                value={formData.modality}
                onChange={e => setFormData({...formData, modality: e.target.value})}
                disabled={!formData.fairId}
                className={cn(
                  "w-full bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg",
                  !formData.fairId && "opacity-50 cursor-not-allowed"
                )}
              >
                <option value="" className="dark:bg-app-surface">{formData.fairId ? 'Selecione uma modalidade...' : 'Selecione uma feira primeiro'}</option>
                {formData.fairId && fairs.find(f => f.id === formData.fairId)?.structure?.modalities.map(mod => (
                  <option key={mod} value={mod} className="dark:bg-app-surface">{mod}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-4">
            <button 
              type="button"
              onClick={() => setIsSubmitting(false)}
              className="px-6 py-2 rounded-xl border border-slate-200 dark:border-app-border text-slate-600 dark:text-app-muted font-bold text-sm hover:bg-slate-50 dark:hover:bg-app-surface"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 shadow-md flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Submeter Projeto
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (selectedProject) {
    return (
      <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6 lg:space-y-8 bg-background-light dark:bg-app-bg min-h-full transition-colors duration-300">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedProject(null)} className="text-slate-400 dark:text-app-muted hover:text-primary transition-colors">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-app-fg">{selectedProject.title}</h2>
            <p className="text-xs lg:text-sm text-slate-500 dark:text-app-muted">ID: {selectedProject.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            <div className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-4 lg:p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2 dark:text-app-fg">
                <FileText className="w-5 h-5 text-primary" />
                Resumo do Projeto (RF05)
              </h3>
              <p className="text-sm text-slate-600 dark:text-app-muted leading-relaxed">
                {selectedProject.abstract || "Nenhum resumo fornecido."}
              </p>
            </div>

            <div className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-4 lg:p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2 dark:text-app-fg">
                <History className="w-5 h-5 text-primary" />
                Histórico de Versões (RF06)
              </h3>
              <div className="space-y-3">
                {versions.length > 0 ? versions.map((v, idx) => (
                  <div key={v.id} className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-colors",
                    idx === 0 
                      ? "border-primary bg-primary/5 dark:bg-primary/10" 
                      : "border-slate-100 dark:border-app-border bg-slate-50 dark:bg-app-surface"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-2 h-2 rounded-full", idx === 0 ? "bg-primary" : "bg-slate-300")} />
                      <span className="text-sm font-bold dark:text-app-fg">v{v.version_number}</span>
                      <span className="text-xs text-slate-400 dark:text-app-muted">
                        {new Date(v.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      {idx === 0 && <span className="text-[10px] font-bold text-primary uppercase">Atual</span>}
                    </div>
                    <button className="text-xs font-bold text-primary dark:text-primary-light hover:underline">Ver Arquivos</button>
                  </div>
                )) : (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-primary bg-primary/5 dark:bg-primary/10">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm font-bold dark:text-app-fg">v{selectedProject.current_version}</span>
                      <span className="text-xs text-slate-400 dark:text-app-muted">Atual</span>
                    </div>
                    <button className="text-xs font-bold text-primary dark:text-primary-light hover:underline">Ver Arquivos</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:space-y-6">
            <div className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-4 lg:p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2 dark:text-app-fg">
                <Users className="w-5 h-5 text-primary" />
                Equipe (RF07)
              </h3>
              <div className="space-y-4">
                {selectedProject.members?.map((member: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary dark:text-primary-light font-bold text-xs">
                      {member.name?.[0] || 'M'}
                    </div>
                    <div>
                      <p className="text-sm font-bold dark:text-app-fg">{member.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-app-muted uppercase">{member.role}</p>
                    </div>
                  </div>
                ))}
                <button className="w-full py-2 border-2 border-dashed border-slate-100 dark:border-app-border rounded-xl text-slate-400 dark:text-app-muted text-xs font-bold hover:border-primary/20 hover:text-primary dark:hover:text-primary-light transition-all">
                  + Solicitar Alteração
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-background-light dark:bg-app-bg min-h-full transition-colors duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-app-fg">Projetos Submetidos</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setIsSubmitting(true)}
            className="flex-1 sm:flex-none px-6 py-3 bg-primary text-white rounded-xl flex items-center justify-center gap-2 font-bold shadow-md hover:scale-105 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Submeter Projeto</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-app-card elevation-1 rounded-2xl overflow-x-auto border border-transparent dark:border-app-border">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-app-surface border-b border-slate-100 dark:border-app-border">
                <th className="px-4 lg:px-6 py-4 text-xs font-bold text-slate-400 dark:text-app-muted uppercase">Projeto</th>
                <th className="px-4 lg:px-6 py-4 text-xs font-bold text-slate-400 dark:text-app-muted uppercase">Categoria</th>
                <th className="px-4 lg:px-6 py-4 text-xs font-bold text-slate-400 dark:text-app-muted uppercase">Status</th>
                <th className="px-4 lg:px-6 py-4 text-xs font-bold text-slate-400 dark:text-app-muted uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-app-border">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group">
                  <td className="px-4 lg:px-6 py-4">
                    <p className="text-sm font-bold text-slate-900 dark:text-app-fg">{project.title}</p>
                    <p className="text-[10px] text-slate-400 dark:text-app-muted">ID: {project.id}</p>
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-sm text-slate-600 dark:text-app-muted">{project.category}</td>
                  <td className="px-4 lg:px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                      project.status === 'aprovado' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                    )}>
                      {project.status || 'Pendente'}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <button 
                      onClick={() => setSelectedProject(project)}
                      className="text-xs font-bold text-primary dark:text-primary-light hover:underline"
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 lg:px-6 py-20 text-center text-slate-400 dark:text-app-muted">
                    Nenhum projeto submetido até o momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
