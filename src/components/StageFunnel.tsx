import React from 'react';
import { Stage } from '../types';
import { cn } from '../lib/utils';
import { Check } from 'lucide-react';

export function StageFunnel({ stages }: { stages: Stage[] }) {
  return (
    <div className="bg-white dark:bg-app-card elevation-1 rounded-xl p-6 transition-colors duration-300">
      <h3 className="text-lg font-bold mb-8 text-slate-900 dark:text-app-fg">Funil de Etapas</h3>
      
      <div className="flex items-center w-full px-4">
        {stages.map((stage, index) => (
          <React.Fragment key={stage.id}>
            <div className="flex flex-col items-center relative z-10">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300",
                stage.status === 'completed' && "bg-primary text-white",
                stage.status === 'active' && "bg-primary/20 dark:bg-primary/30 text-primary ring-2 ring-primary/40",
                stage.status === 'pending' && "bg-primary/10 dark:bg-primary/20 text-primary/40 dark:text-app-muted/40"
              )}>
                {stage.status === 'completed' ? <Check className="w-5 h-5" /> : stage.id}
              </div>
              <span className={cn(
                "text-xs font-bold mt-2 whitespace-nowrap",
                stage.status === 'pending' ? "text-slate-400 dark:text-app-muted" : "text-slate-900 dark:text-app-fg"
              )}>
                {stage.label}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-app-muted whitespace-nowrap">
                {stage.count}
              </span>
            </div>
            
            {index < stages.length - 1 && (
              <div className="flex-1 h-1 mx-2 mb-6">
                <div className={cn(
                  "h-full w-full rounded-full transition-all duration-500",
                  stages[index].status === 'completed' && stages[index + 1].status !== 'pending' 
                    ? "bg-primary" 
                    : "bg-primary/10 dark:bg-primary/20"
                )} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
