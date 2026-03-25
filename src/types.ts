export type ProjectStatus = 'rascunho' | 'submetido' | 'aprovado' | 'rejeitado' | 'em_avaliacao' | 'avaliado';
export type FairStatus = 'rascunho' | 'publicado' | 'pausado' | 'encerrado';
export type UserRole = 'admin' | 'manager' | 'advisor' | 'evaluator' | 'student';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
  institutionId: string;
}

export interface Institution {
  id: string;
  name: string;
  settings: {
    dataIsolation: boolean;
    autoAnonymization: boolean;
  };
}

export interface Fair {
  id: string;
  name: string;
  description?: string;
  status: FairStatus;
  institutionId: string;
  organizerId: string;
  dates: {
    registration_start: string | null;
    registration_end: string | null;
    evaluation_start: string | null;
    evaluation_end: string | null;
    results_date: string | null;
  };
  structure: {
    categories: string[];
    modalities: string[];
  };
  rules: {
    blind_evaluation: boolean;
    min_evaluators_per_project: number;
    tie_breaker_hierarchy: string[];
  };
  created_at: string;
}

export interface EvaluationCriteria {
  id: string;
  fairId: string;
  category?: string;
  name: string;
  description?: string;
  weight: number;
  scale_type: 'numeric' | 'rubric';
  max_score: number;
}

export interface Project {
  id: string;
  title: string;
  abstract?: string;
  category: string;
  modality: string;
  status: ProjectStatus;
  fairId: string;
  institutionId: string;
  creatorId: string;
  members: ProjectMember[];
  evidence: {
    files: EvidenceFile[];
    links: EvidenceLink[];
  };
  current_version: number;
  created_at: string;
}

export interface ProjectMember {
  name: string;
  email: string;
  role: string;
  justification?: string;
}

export interface EvidenceFile {
  name: string;
  url: string;
  type: string;
}

export interface EvidenceLink {
  label: string;
  url: string;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  version_number: number;
  data: any;
  created_by: string;
  created_at: string;
}

export interface Evaluation {
  id: string;
  projectId: string;
  evaluatorId: string;
  scores: Record<string, number>;
  feedback?: string;
  status: 'rascunho' | 'finalizado';
  is_conflict_declared: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName?: string; // Joined
  action: string;
  target_table: string;
  target_id: string;
  old_data?: any;
  new_data?: any;
  institutionId: string;
  timestamp: string;
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

export interface EvaluatorApplication {
  id: string;
  fairId: string;
  userId: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  created_at: string;
  institutionId: string;
}
