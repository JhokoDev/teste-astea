import React from 'react';
import { motion } from 'motion/react';
import { Calendar, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface FairPhase {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: 'past' | 'current' | 'future';
}

interface FairTimelineProps {
  phases: FairPhase[];
  currentDate?: Date;
}

export function FairTimeline({ phases, currentDate = new Date() }: FairTimelineProps) {
  return (
    <div className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-6 overflow-hidden relative">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-app-fg flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Cronograma da Feira
        </h3>
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5 text-emerald-600">
            <CheckCircle2 className="w-3 h-3" />
            Concluído
          </div>
          <div className="flex items-center gap-1.5 text-primary">
            <PlayCircle className="w-3 h-3" />
            Em Andamento
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-app-muted">
            <Clock className="w-3 h-3" />
            Próximo
          </div>
        </div>
      </div>

      <div className="relative pt-4 pb-12">
        {/* Progress Line Background */}
        <div className="absolute top-9 left-0 w-full h-1 bg-slate-100 dark:bg-app-surface rounded-full" />
        
        {/* Active Progress Line */}
        <motion.div 
          className="absolute top-9 left-0 h-1 bg-primary rounded-full z-10"
          initial={{ width: 0 }}
          animate={{ 
            width: `${Math.min(100, (phases.findIndex(p => p.status === 'current' || p.status === 'future') / (phases.length - 1)) * 100)}%` 
          }}
          transition={{ duration: 1, ease: "easeOut" }}
        />

        <div className="relative z-20 flex justify-between items-center px-2">
          {phases.map((phase, index) => (
            <div key={phase.id} className="flex flex-col items-center gap-3 group relative">
              {/* Node */}
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 shadow-sm z-30",
                  phase.status === 'past' && "bg-emerald-500 border-emerald-100 dark:border-emerald-900/30 text-white",
                  phase.status === 'current' && "bg-primary border-primary/20 text-white ring-4 ring-primary/10",
                  phase.status === 'future' && "bg-white dark:bg-app-surface border-slate-100 dark:border-app-border text-slate-400 dark:text-app-muted"
                )}
              >
                {phase.status === 'past' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : phase.status === 'current' ? (
                  <PlayCircle className="w-5 h-5 animate-pulse" />
                ) : (
                  <span className="text-xs font-bold">{index + 1}</span>
                )}
              </motion.div>

              {/* Label */}
              <div className="text-center absolute top-12 w-24 left-1/2 -translate-x-1/2">
                <p className={cn(
                  "text-[10px] font-bold uppercase tracking-tight transition-colors whitespace-nowrap",
                  phase.status === 'past' && "text-emerald-600",
                  phase.status === 'current' && "text-primary",
                  phase.status === 'future' && "text-slate-400 dark:text-app-muted"
                )}>
                  {phase.label}
                </p>
                <p className="text-[9px] text-slate-400 dark:text-app-muted font-medium whitespace-nowrap">
                  {new Date(phase.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - {new Date(phase.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
