import React from 'react';
import { motion } from 'motion/react';
import { Project } from '../types';
import { cn } from '../lib/utils';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ProjectKanbanProps {
  projects: Project[];
  onStatusChange?: (projectId: string, newStatus: Project['status']) => void;
}

const STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: FileText },
  submetido: { label: 'Submetido', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: AlertCircle },
  em_avaliacao: { label: 'Em Avaliação', color: 'bg-amber-50 text-amber-600 border-amber-100', icon: Clock },
  avaliado: { label: 'Avaliado', color: 'bg-indigo-50 text-indigo-600 border-indigo-100', icon: CheckCircle },
  aprovado: { label: 'Aprovado', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: CheckCircle },
  rejeitado: { label: 'Rejeitado', color: 'bg-rose-50 text-rose-600 border-rose-100', icon: XCircle },
};

export function ProjectKanban({ projects }: ProjectKanbanProps) {
  const columns: Project['status'][] = ['submetido', 'em_avaliacao', 'avaliado', 'aprovado'];

  return (
    <div className="flex gap-6 overflow-x-auto pb-6 min-h-[500px]">
      {columns.map((status) => {
        const columnProjects = projects.filter((p) => p.status === status);
        const config = STATUS_CONFIG[status];
        const Icon = config.icon;

        return (
          <div key={status} className="flex-shrink-0 w-80 flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", config.color.split(' ')[0])} />
                <h3 className="text-sm font-bold text-slate-700 dark:text-app-fg uppercase tracking-wider">
                  {config.label}
                </h3>
              </div>
              <span className="text-[10px] font-bold bg-slate-100 dark:bg-app-surface text-slate-500 dark:text-app-muted px-2 py-0.5 rounded-full">
                {columnProjects.length}
              </span>
            </div>

            <div className="flex-1 bg-slate-50/50 dark:bg-app-surface/20 rounded-2xl p-3 border border-slate-100 dark:border-app-border space-y-3">
              {columnProjects.map((project) => (
                <motion.div
                  layout
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-app-card p-4 rounded-xl shadow-sm border border-slate-200 dark:border-app-border hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-tighter bg-primary/5 px-2 py-0.5 rounded">
                      {project.category}
                    </span>
                    <Icon className={cn("w-3 h-3", config.color.split(' ')[1])} />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-app-fg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {project.title}
                  </h4>
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50 dark:border-app-border">
                    <div className="flex -space-x-1.5">
                      {project.members.slice(0, 3).map((m, i) => (
                        <div key={i} className="w-5 h-5 rounded-full bg-slate-100 dark:bg-app-surface border border-white dark:border-app-card flex items-center justify-center text-[8px] font-bold text-slate-500" title={m.name}>
                          {m.name.charAt(0)}
                        </div>
                      ))}
                      {project.members.length > 3 && (
                        <div className="w-5 h-5 rounded-full bg-primary/10 border border-white dark:border-app-card flex items-center justify-center text-[8px] font-bold text-primary">
                          +{project.members.length - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 dark:text-app-muted font-medium">
                      ID: {project.id.slice(0, 4)}
                    </span>
                  </div>
                </motion.div>
              ))}
              {columnProjects.length === 0 && (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-app-border rounded-xl">
                  <span className="text-[10px] text-slate-400 dark:text-app-muted font-medium italic">Vazio</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
