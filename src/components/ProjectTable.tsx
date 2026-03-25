import React from 'react';
import { Project } from '../types';
import { cn } from '../lib/utils';

export function ProjectTable({ projects }: { projects: Project[] }) {
  return (
    <div className="mt-10 overflow-x-auto">
      <h4 className="text-sm font-bold text-slate-500 dark:text-app-muted mb-4 uppercase tracking-wider">Top 5 Projetos</h4>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-primary/5 dark:border-primary/10">
            <th className="py-3 text-xs font-bold text-slate-400 dark:text-app-muted/60">NOME DO PROJETO</th>
            <th className="py-3 text-xs font-bold text-slate-400 dark:text-app-muted/60">CATEGORIA</th>
            <th className="py-3 text-xs font-bold text-slate-400 dark:text-app-muted/60">AVALIAÇÃO</th>
            <th className="py-3 text-xs font-bold text-slate-400 dark:text-app-muted/60">STATUS</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {projects.map((project) => (
            <tr 
              key={project.id} 
              className="border-b border-primary/5 dark:border-primary/10 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group"
            >
              <td className="py-4 font-semibold text-slate-900 dark:text-app-fg group-hover:text-primary transition-colors">
                {project.title}
              </td>
              <td className="py-4 text-slate-600 dark:text-app-muted">
                {project.category}
              </td>
              <td className="py-4 font-bold text-slate-900 dark:text-app-fg">
                v{project.current_version}
              </td>
              <td className="py-4">
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase",
                  project.status === 'aprovado' && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
                  project.status === 'em_avaliacao' && "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
                  project.status === 'submetido' && "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
                  project.status === 'rascunho' && "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400",
                  project.status === 'rejeitado' && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                )}>
                  {project.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
