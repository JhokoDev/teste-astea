import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface HeatmapData {
  category: string;
  count: number;
  intensity: number; // 0 to 1
}

interface EvaluationHeatmapProps {
  data: HeatmapData[];
  title?: string;
}

export function EvaluationHeatmap({ data, title = "Mapa de Calor de Avaliações" }: EvaluationHeatmapProps) {
  return (
    <div className="bg-white dark:bg-app-card elevation-1 rounded-xl p-6">
      <h3 className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase tracking-widest mb-6">
        {title}
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {data.map((item, i) => (
          <motion.div
            key={item.category}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="relative group cursor-help"
          >
            <div 
              className={cn(
                "h-16 rounded-lg border border-white/10 flex flex-col items-center justify-center transition-all duration-300",
                item.intensity > 0.8 ? "bg-primary text-white shadow-lg shadow-primary/20" :
                item.intensity > 0.5 ? "bg-primary/60 text-white" :
                item.intensity > 0.2 ? "bg-primary/30 text-primary-dark dark:text-primary-light" :
                "bg-slate-50 dark:bg-app-surface text-slate-400 dark:text-app-muted"
              )}
            >
              <span className="text-[10px] font-bold uppercase tracking-tighter text-center px-2 line-clamp-1">
                {item.category}
              </span>
              <span className="text-lg font-black leading-none mt-1">
                {item.count}
              </span>
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-xl">
              <p className="font-bold">{item.category}</p>
              <p>{item.count} avaliações concluídas</p>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between text-[10px] text-slate-400 dark:text-app-muted font-medium uppercase tracking-widest">
        <span>Menos Atividade</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded bg-slate-50 dark:bg-app-surface border border-slate-100 dark:border-app-border" />
          <div className="w-3 h-3 rounded bg-primary/30" />
          <div className="w-3 h-3 rounded bg-primary/60" />
          <div className="w-3 h-3 rounded bg-primary" />
        </div>
        <span>Mais Atividade</span>
      </div>
    </div>
  );
}
