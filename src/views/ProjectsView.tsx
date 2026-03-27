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
  const [allFairs, setAllFairs] = useState<Fair[]>([]);
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
    fair_id: '',
    members: [],
    evidence: {
      files: [],
      links: []
    },
    custom_data: {}
  });

  useEffect(() => {
    const unsubscribeProjects = projectsService.subscribeToProjects((event) => {
      const filterProject = (p: Project) => {
        if (userRole === 'admin') return true;
        if (userRole === 'manager') return p.institution_id === profile?.institution_id;
        if (userRole === 'student' || userRole === 'advisor') return p.creator_id === userId || p.members.some(m => m.email === profile?.email);
        return true;
      };

      if (event.type === 'INITIAL') {
        setProjects(event.data.filter(filterProject));
      } else if (event.type === 'INSERT') {
        if (filterProject(event.newItem)) {
          setProjects(prev => [...prev, event.newItem]);
        }
      } else if (event.type === 'UPDATE') {
        if (filterProject(event.newItem)) {
          setProjects(prev => {
            const exists = prev.some(p => p.id === event.newItem.id);
            if (exists) return prev.map(p => p.id === event.newItem.id ? event.newItem : p);
            return [...prev, event.newItem];
          });
        } else {
          setProjects(prev => prev.filter(p => p.id !== event.newItem.id));
        }
      } else if (event.type === 'DELETE') {
        setProjects(prev => prev.filter(p => p.id !== event.oldItem.id));
      }
      setLoading(false);
    });
    
    const unsubscribeFairs = fairsService.subscribeToFairs((event) => {
      const filterFair = (f: Fair) => {
        if (userRole === 'manager') {
          return f.organizer_id === userId || f.organizer_id === null;
        } else if (userRole === 'student' || userRole === 'advisor') {
          return f.status === 'publicado';
        }
        return true;
      };

      const isActive = (f: Fair) => {
        const now = new Date();
        const isStatusOk = f.status === 'publicado';
        if (!f.dates?.registration_start || !f.dates?.registration_end) return isStatusOk;
        const start = new Date(f.dates.registration_start);
        start.setHours(0, 0, 0, 0);
        const end = new Date(f.dates.registration_end);
        end.setHours(23, 59, 59, 999);
        return isStatusOk && now >= start && now <= end;
      };

      if (event.type === 'INITIAL') {
        setAllFairs(event.data);
        setFairs(event.data.filter(filterFair).filter(isActive));
      } else if (event.type === 'INSERT') {
        setAllFairs(prev => [...prev, event.newItem]);
        if (filterFair(event.newItem) && isActive(event.newItem)) {
          setFairs(prev => [...prev, event.newItem]);
        }
      } else if (event.type === 'UPDATE') {
        setAllFairs(prev => prev.map(f => f.id === event.newItem.id ? event.newItem : f));
        if (filterFair(event.newItem) && isActive(event.newItem)) {
          setFairs(prev => {
            const exists = prev.some(f => f.id === event.newItem.id);
            if (exists) return prev.map(f => f.id === event.newItem.id ? event.newItem : f);
            return [...prev, event.newItem];
          });
        } else {
          setFairs(prev => prev.filter(f => f.id !== event.newItem.id));
        }
      } else if (event.type === 'DELETE') {
        setAllFairs(prev => prev.filter(f => f.id !== event.oldItem.id));
        setFairs(prev => prev.filter(f => f.id !== event.oldItem.id));
      }
    });

    return () => {
      unsubscribeProjects();
      unsubscribeFairs();
    };
  }, [userRole, userId, profile?.email, profile?.institution_id]);

  useEffect(() => {
    const fetchVersions = async () => {
      if (selectedProject) {
        const { data, error } = await projectsService.getProjectVersions(selectedProject.id);
        if (error) {
          toast.error('Erro ao carregar versões: ' + error.message);
          return;
        }
        setVersions(data || []);
      } else {
        setVersions([]);
      }
    };
    fetchVersions();
  }, [selectedProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fair_id || !formData.title || !formData.abstract) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await projectsService.submitProject({
        ...formData,
        creator_id: userId,
        institution_id: profile?.institution_id
      } as any);
      
      if (error) {
        toast.error(`Erro ao submeter projeto: ${error.message}`);
        return;
      }

      toast.success('Projeto submetido com sucesso!');
      setIsSubmitting(false);
      setFormData({
        title: '',
        abstract: '',
        category: '',
        modality: '',
        fair_id: '',
        members: [],
        evidence: { files: [], links: [] },
        custom_data: {}
      });
    } catch (error: any) {
      console.error('Error submitting project:', error);
      toast.error('Erro inesperado ao submeter projeto.');
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
                value={formData.fair_id}
                onChange={e => setFormData({...formData, fair_id: e.target.value, category: '', modality: ''})}
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
                disabled={!formData.fair_id}
                className={cn(
                  "w-full bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg",
                  !formData.fair_id && "opacity-50 cursor-not-allowed"
                )}
              >
                <option value="" className="dark:bg-app-surface">{formData.fair_id ? 'Selecione uma categoria...' : 'Selecione uma feira primeiro'}</option>
                {formData.fair_id && fairs.find(f => f.id === formData.fair_id)?.structure?.categories.map(cat => (
                  <option key={cat} value={cat} className="dark:bg-app-surface">{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase">Modalidade</label>
              <select 
                value={formData.modality}
                onChange={e => setFormData({...formData, modality: e.target.value})}
                disabled={!formData.fair_id}
                className={cn(
                  "w-full bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg",
                  !formData.fair_id && "opacity-50 cursor-not-allowed"
                )}
              >
                <option value="" className="dark:bg-app-surface">{formData.fair_id ? 'Selecione uma modalidade...' : 'Selecione uma feira primeiro'}</option>
                {formData.fair_id && fairs.find(f => f.id === formData.fair_id)?.structure?.modalities.map(mod => (
                  <option key={mod} value={mod} className="dark:bg-app-surface">{mod}</option>
                ))}
              </select>
            </div>

            {/* Custom Form Fields */}
            {formData.fair_id && fairs.find(f => f.id === formData.fair_id)?.structure?.custom_form?.map(field => (
              <div key={field.id} className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                {field.type === 'textarea' ? (
                  <textarea 
                    value={formData.custom_data?.[field.id] || ''}
                    onChange={e => setFormData({
                      ...formData, 
                      custom_data: { ...formData.custom_data, [field.id]: e.target.value }
                    })}
                    required={field.required}
                    placeholder={field.placeholder}
                    className="w-full bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 h-32 dark:text-app-fg"
                  />
                ) : field.type === 'select' ? (
                  <select 
                    value={formData.custom_data?.[field.id] || ''}
                    onChange={e => setFormData({
                      ...formData, 
                      custom_data: { ...formData.custom_data, [field.id]: e.target.value }
                    })}
                    required={field.required}
                    className="w-full bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg"
                  >
                    <option value="">Selecione uma opção...</option>
                    {field.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {field.options?.map(opt => (
                      <label key={opt} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-app-surface rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-app-surface/80 transition-colors">
                        <input 
                          type="checkbox"
                          checked={(formData.custom_data?.[field.id] || []).includes(opt)}
                          onChange={e => {
                            const current = formData.custom_data?.[field.id] || [];
                            const next = e.target.checked 
                              ? [...current, opt]
                              : current.filter((a: string) => a !== opt);
                            setFormData({
                              ...formData, 
                              custom_data: { ...formData.custom_data, [field.id]: next }
                            });
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span className="text-xs font-medium dark:text-app-fg">{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <input 
                    type={field.type === 'link' ? 'url' : field.type}
                    value={formData.custom_data?.[field.id] || ''}
                    onChange={e => setFormData({
                      ...formData, 
                      custom_data: { ...formData.custom_data, [field.id]: e.target.value }
                    })}
                    required={field.required}
                    placeholder={field.placeholder}
                    className="w-full bg-slate-50 dark:bg-app-surface border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 dark:text-app-fg"
                  />
                )}
                {field.helpText && <p className="text-[10px] text-slate-400 dark:text-app-muted italic">{field.helpText}</p>}
              </div>
            ))}
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
    const projectFair = allFairs.find(f => f.id === selectedProject.fair_id);

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

            {/* Custom Data Display */}
            {projectFair?.structure?.custom_form && projectFair.structure.custom_form.length > 0 && (
              <div className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-4 lg:p-6 space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 dark:text-app-fg">
                  <AlertCircle className="w-5 h-5 text-primary" />
                  Informações Adicionais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projectFair.structure.custom_form.map(field => {
                    const value = selectedProject.custom_data?.[field.id];
                    if (value === undefined || value === null || value === '') return null;

                    return (
                      <div key={field.id} className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-app-muted uppercase">{field.label}</p>
                        <div className="text-sm text-slate-700 dark:text-app-fg bg-slate-50 dark:bg-app-surface p-3 rounded-xl">
                          {Array.isArray(value) ? (
                            <div className="flex flex-wrap gap-1">
                              {value.map((v, i) => (
                                <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">
                                  {v}
                                </span>
                              ))}
                            </div>
                          ) : field.type === 'link' ? (
                            <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                              {value} <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            value
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
