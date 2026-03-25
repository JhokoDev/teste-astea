import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, History, Users, FileText, ExternalLink, ChevronRight, CheckCircle2, Loader2, Plus, Upload, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { projectsService, fairsService } from '../services/supabaseService';
import { Project, Fair } from '../types';
import { toast } from 'sonner';

export function ProjectsView() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [fairs, setFairs] = useState<Fair[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setProjects(data);
      setLoading(false);
    });
    
    const unsubscribeFairs = fairsService.subscribeToFairs((data) => {
      console.log('Fairs received in ProjectsView:', data);
      const now = new Date();
      
      const activeFairs = data.filter(f => {
        // Only show published fairs
        const isStatusOk = f.status === 'publicado';
        
        // If dates are not set, we show it if status is ok
        if (!f.dates?.registration_start || !f.dates?.registration_end) return isStatusOk;
        
        const start = new Date(f.dates.registration_start);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(f.dates.registration_end);
        end.setHours(23, 59, 59, 999);
        
        const inRegistrationPeriod = now >= start && now <= end;
        
        console.log(`Fair ${f.name}: status=${f.status}, inPeriod=${inRegistrationPeriod}, start=${start}, end=${end}, now=${now}`);
        
        return isStatusOk && inRegistrationPeriod;
      });
      
      console.log('Filtered active fairs:', activeFairs);
      setFairs(activeFairs);
    });

    return () => {
      unsubscribeProjects();
      unsubscribeFairs();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fairId || !formData.title || !formData.abstract) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    try {
      setLoading(true);
      await projectsService.submitProject(formData as any);
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
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setIsSubmitting(false)} className="text-slate-400 hover:text-primary transition-colors">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Submeter Novo Projeto (RF05)</h2>
        </div>

        <form onSubmit={handleSubmit} className="bg-white elevation-1 rounded-2xl p-6 lg:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Selecione a Feira</label>
              <select 
                value={formData.fairId}
                onChange={e => setFormData({...formData, fairId: e.target.value, category: '', modality: ''})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Escolha uma feira ativa...</option>
                {fairs.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Título do Projeto</label>
              <input 
                type="text" 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20" 
                placeholder="Ex: Sistema de Purificação de Água com Grafeno" 
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Resumo (Abstract)</label>
              <textarea 
                value={formData.abstract}
                onChange={e => setFormData({...formData, abstract: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 h-40" 
                placeholder="Descreva seu projeto detalhadamente..." 
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Categoria</label>
              <select 
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                disabled={!formData.fairId}
                className={cn(
                  "w-full bg-slate-50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20",
                  !formData.fairId && "opacity-50 cursor-not-allowed"
                )}
              >
                <option value="">{formData.fairId ? 'Selecione uma categoria...' : 'Selecione uma feira primeiro'}</option>
                {formData.fairId && fairs.find(f => f.id === formData.fairId)?.structure?.categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Modalidade</label>
              <select 
                value={formData.modality}
                onChange={e => setFormData({...formData, modality: e.target.value})}
                disabled={!formData.fairId}
                className={cn(
                  "w-full bg-slate-50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20",
                  !formData.fairId && "opacity-50 cursor-not-allowed"
                )}
              >
                <option value="">{formData.fairId ? 'Selecione uma modalidade...' : 'Selecione uma feira primeiro'}</option>
                {formData.fairId && fairs.find(f => f.id === formData.fairId)?.structure?.modalities.map(mod => (
                  <option key={mod} value={mod}>{mod}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-4">
            <button 
              type="button"
              onClick={() => setIsSubmitting(false)}
              className="px-6 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50"
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
      <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6 lg:space-y-8">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedProject(null)} className="text-slate-400 hover:text-primary transition-colors">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-900">{selectedProject.title}</h2>
            <p className="text-xs lg:text-sm text-slate-500">ID: {selectedProject.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            <div className="bg-white elevation-1 rounded-2xl p-4 lg:p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Resumo do Projeto (RF05)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {selectedProject.abstract || "Nenhum resumo fornecido."}
              </p>
            </div>

            <div className="bg-white elevation-1 rounded-2xl p-4 lg:p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Histórico de Versões (RF06)
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl border border-primary bg-primary/5">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-sm font-bold">v{selectedProject.current_version}</span>
                    <span className="text-xs text-slate-400">Atual</span>
                  </div>
                  <button className="text-xs font-bold text-primary hover:underline">Ver Arquivos</button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:space-y-6">
            <div className="bg-white elevation-1 rounded-2xl p-4 lg:p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Equipe (RF07)
              </h3>
              <div className="space-y-4">
                {selectedProject.members?.map((member: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {member.name?.[0] || 'M'}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{member.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{member.role}</p>
                    </div>
                  </div>
                ))}
                <button className="w-full py-2 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-xs font-bold hover:border-primary/20 hover:text-primary transition-all">
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
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Projetos Submetidos</h2>
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
        <div className="bg-white elevation-1 rounded-2xl overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 lg:px-6 py-4 text-xs font-bold text-slate-400 uppercase">Projeto</th>
                <th className="px-4 lg:px-6 py-4 text-xs font-bold text-slate-400 uppercase">Categoria</th>
                <th className="px-4 lg:px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                <th className="px-4 lg:px-6 py-4 text-xs font-bold text-slate-400 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-primary/5 transition-colors group">
                  <td className="px-4 lg:px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{project.title}</p>
                    <p className="text-[10px] text-slate-400">ID: {project.id}</p>
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-sm text-slate-600">{project.category}</td>
                  <td className="px-4 lg:px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                      project.status === 'aprovado' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {project.status || 'Pendente'}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <button 
                      onClick={() => setSelectedProject(project)}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 lg:px-6 py-20 text-center text-slate-400">
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
