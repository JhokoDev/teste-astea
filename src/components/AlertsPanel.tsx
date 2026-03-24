import React from 'react';
import { Alert } from '../types';
import { AlertCircle, UserX, Mail, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

const iconMap = {
  error: AlertCircle,
  warning: UserX,
  info: Mail,
};

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="bg-white elevation-1 rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">Alertas Críticos</h3>
        <AlertTriangle className="text-red-500 w-5 h-5" />
      </div>

      <div className="space-y-4 flex-1">
        {alerts.map((alert) => {
          const Icon = iconMap[alert.type];
          return (
            <div 
              key={alert.id}
              className={cn(
                "flex gap-4 p-3 rounded-xl border transition-all hover:scale-[1.02]",
                alert.type === 'error' && "border-red-100 bg-red-50",
                alert.type === 'warning' && "border-amber-100 bg-amber-50",
                alert.type === 'info' && "border-primary/10 bg-primary/5"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 shrink-0",
                alert.type === 'error' && "text-red-500",
                alert.type === 'warning' && "text-amber-500",
                alert.type === 'info' && "text-primary"
              )} />
              <div>
                <p className={cn(
                  "text-xs font-bold",
                  alert.type === 'error' && "text-red-700",
                  alert.type === 'warning' && "text-amber-700",
                  alert.type === 'info' && "text-slate-700"
                )}>
                  {alert.title}
                </p>
                <p className={cn(
                  "text-[10px] mt-0.5",
                  alert.type === 'error' && "text-red-600",
                  alert.type === 'warning' && "text-amber-600",
                  alert.type === 'info' && "text-slate-600"
                )}>
                  {alert.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <button className="w-full mt-6 py-2.5 border border-primary/20 rounded-xl text-primary text-sm font-bold hover:bg-primary/5 transition-colors">
        Ver Todos os Alertas
      </button>
    </div>
  );
}
