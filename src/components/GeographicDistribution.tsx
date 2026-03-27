import React from 'react';
import { motion } from 'motion/react';
import { MapPin } from 'lucide-react';

interface RegionData {
  region: string;
  count: number;
  percentage: number;
}

interface GeographicDistributionProps {
  data: RegionData[];
  title?: string;
}

export function GeographicDistribution({ data, title = "Distribuição Geográfica" }: GeographicDistributionProps) {
  return (
    <div className="bg-white dark:bg-app-card elevation-1 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <MapPin className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-bold text-slate-500 dark:text-app-muted uppercase tracking-widest">
          {title}
        </h3>
      </div>

      <div className="space-y-4">
        {data.map((item, i) => (
          <div key={item.region} className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
              <span className="text-slate-600 dark:text-app-fg">{item.region}</span>
              <span className="text-primary">{item.count} projetos ({item.percentage}%)</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-app-surface rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.percentage}%` }}
                transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-slate-50 dark:border-app-border">
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-[10px] text-slate-400 dark:text-app-muted font-bold uppercase mb-1">Total Estados</p>
            <p className="text-xl font-black text-slate-800 dark:text-app-fg">{data.length}</p>
          </div>
          <div className="w-px h-8 bg-slate-100 dark:bg-app-border" />
          <div className="text-center">
            <p className="text-[10px] text-slate-400 dark:text-app-muted font-bold uppercase mb-1">Alcance Regional</p>
            <p className="text-xl font-black text-slate-800 dark:text-app-fg">85%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
