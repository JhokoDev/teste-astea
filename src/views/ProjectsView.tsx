import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, History, Users, FileText, ExternalLink, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { projectsService } from '../services/firestoreService';

export function ProjectsView() {
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = projectsService.subscribeToProjects((data) => {
      setProjects(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (selectedProject) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedProject(null)} className="text-slate-400 hover:text-primary transition-colors">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{selectedProject.name}</h2>
            <p className="text-sm text-slate-500">ID: {selectedProject.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-6">
            <div className="bg-white elevation-1 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Resumo do Projeto (RF05)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {selectedProject.abstract || "Nenhum resumo fornecido."}
              </p>
            </div>

            <div className="bg-white elevation-1 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Histórico de Versões (RF06)
              </h3>
              <div className="space-y-3">
                {[
                  { v: 'v1.0', date: 'Recente', user: 'Autor', active: true },
                ].map((version) => (
                  <div key={version.v} className={cn(
                    "flex items-center justify-between p-3 rounded-xl border",
                    version.active ? "border-primary bg-primary/5" : "border-slate-100"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-2 h-2 rounded-full", version.active ? "bg-primary" : "bg-slate-300")} />
                      <span className="text-sm font-bold">{version.v}</span>
                      <span className="text-xs text-slate-400">{version.date}</span>
                    </div>
                    <button className="text-xs font-bold text-primary hover:underline">Ver Arquivos</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white elevation-1 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Equipe (RF07)
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">U</div>
                  <div>
                    <p className="text-sm font-bold">Usuário</p>
                    <p className="text-[10px] text-slate-400 uppercase">Estudante</p>
                  </div>
                </div>
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
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Projetos Submetidos</h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl flex items-center gap-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
            <Filter className="w-4 h-4" />
            Filtrar
          </button>
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl flex items-center gap-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="bg-white elevation-1 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Projeto</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Categoria</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-primary/5 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{project.name}</p>
                    <p className="text-[10px] text-slate-400">ID: {project.id}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{project.category}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700"
                    )}>
                      {project.status || 'Ativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
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
                  <td colSpan={4} className="px-6 py-20 text-center text-slate-400">
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
