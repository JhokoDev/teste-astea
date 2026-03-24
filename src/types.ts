export type ProjectStatus = 'Concluído' | 'Em Revisão' | 'Em Aberto' | 'Pendente';

export interface Project {
  id: string;
  name: string;
  category: string;
  score: number;
  status: ProjectStatus;
}

export interface KPI {
  label: string;
  value: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon: string;
  status?: 'Crítico' | 'Normal' | 'Atenção';
}

export interface Stage {
  id: number;
  label: string;
  count: string;
  status: 'completed' | 'active' | 'pending';
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  type: 'error' | 'warning' | 'info';
}
