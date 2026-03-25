import React from 'react';
import { Project } from '../types';
import { cn } from '../lib/utils';

export function ProjectTable({ projects }: { projects: Project[] }) {
  return (
    <div className="mt-10 overflow-x-auto">
      <h4 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Top 5 Projetos</h4>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-primary/5">
            <th className="py-3 text-xs font-bold text-slate-400">NOME DO PROJETO</th>
            <th className="py-3 text-xs font-bold text-slate-400">CATEGORIA</th>
            <th className="py-3 text-xs font-bold text-slate-400">AVALIAÇÃO</th>
            <th className="py-3 text-xs font-bold text-slate-400">STATUS</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {projects.map((project) => (
            <tr 
              key={project.id} 
              className="border-b border-primary/5 hover:bg-primary/5 transition-colors group"
            >
              <td className="py-4 font-semibold text-slate-900 group-hover:text-primary transition-colors">
                {project.name}
              </td>
              <td className="py-4 text-slate-600">
                {project.fair_id}
              </td>
              <td className="py-4 font-bold text-slate-900">
                {project.current_version}
              </td>
              <td className="py-4">
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold",
                  project.status === 'avaliado' && "bg-emerald-100 text-emerald-700",
                  project.status === 'em_avaliacao' && "bg-amber-100 text-amber-700",
                  project.status === 'submetido' && "bg-blue-100 text-blue-700",
                  project.status === 'rascunho' && "bg-slate-100 text-slate-700"
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
