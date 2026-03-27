import React from 'react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Tooltip
} from 'recharts';

interface EvaluationRadarChartProps {
  data: {
    subject: string;
    A: number;
    fullMark: number;
  }[];
  title?: string;
}

export function EvaluationRadarChart({ data, title = "Perfil de Avaliação" }: EvaluationRadarChartProps) {
  return (
    <div className="bg-white dark:bg-app-card elevation-1 rounded-2xl p-6 h-[400px] flex flex-col">
      <h3 className="text-sm font-bold text-slate-900 dark:text-app-fg mb-4 uppercase tracking-wider">
        {title}
      </h3>
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 10]} 
              tick={{ fill: '#94a3b8', fontSize: 8 }}
            />
            <Radar
              name="Pontuação"
              dataKey="A"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.6}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: 'none', 
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px'
              }}
              itemStyle={{ color: '#fff' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex justify-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary/60" />
          <span className="text-[10px] font-bold text-slate-500 dark:text-app-muted uppercase">Desempenho Atual</span>
        </div>
      </div>
    </div>
  );
}
