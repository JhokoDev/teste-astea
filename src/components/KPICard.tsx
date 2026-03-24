import React from 'react';
import { Rocket, GraduationCap, Search as UserSearch, Timer, TrendingUp, TrendingDown } from 'lucide-react';
import { KPI } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

const iconMap = {
  Rocket,
  GraduationCap,
  UserSearch,
  Timer,
};

interface KPICardProps {
  kpi: KPI;
}

export const KPICard: React.FC<KPICardProps> = ({ kpi }) => {
  const Icon = iconMap[kpi.icon as keyof typeof iconMap];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white elevation-1 p-6 rounded-xl flex flex-col gap-2 hover:scale-[1.02] transition-transform cursor-default"
    >
      <div className="flex justify-between items-start">
        <p className="text-slate-500 text-sm font-medium">{kpi.label}</p>
        <div className="bg-primary/10 p-2 rounded-lg">
          <Icon className="text-primary w-5 h-5" />
        </div>
      </div>
      
      <p className="text-3xl font-bold text-slate-900">{kpi.value}</p>
      
      {kpi.trend && (
        <div className={cn(
          "flex items-center gap-1 text-xs font-bold",
          kpi.trend.isPositive ? "text-emerald-600" : "text-red-500"
        )}>
          {kpi.trend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{kpi.trend.value}</span>
        </div>
      )}

      {kpi.status === 'Crítico' && (
        <div className="flex items-center gap-1 text-red-500 text-xs font-bold">
          <Timer className="w-3 h-3" />
          <span>Crítico</span>
        </div>
      )}
    </motion.div>
  );
}
